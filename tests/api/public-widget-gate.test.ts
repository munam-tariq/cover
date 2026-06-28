import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  evaluatePublicWidgetAccess,
  isAlwaysAllowedDomain,
  matchesConfiguredDomain,
  requirePublicWidgetAccess,
} from "../../apps/api/src/middleware/public-widget-gate.ts";

const PROJECT = "11111111-1111-1111-1111-111111111111";
const OTHER_PROJECT = "22222222-2222-2222-2222-222222222222";
const embedRoutePath = new URL(
  "../../apps/api/src/routes/embed.ts",
  import.meta.url
);

// ---------------------------------------------------------------------------
// Domain helpers (single-sourced from isDomainAllowed)
// ---------------------------------------------------------------------------

test("isAlwaysAllowedDomain matches dev and first-party hosts only", () => {
  assert.equal(isAlwaysAllowedDomain("localhost"), true);
  assert.equal(isAlwaysAllowedDomain("app.localhost"), true);
  assert.equal(isAlwaysAllowedDomain("myapp.local"), true);
  assert.equal(isAlwaysAllowedDomain("frontface.app"), true);
  assert.equal(isAlwaysAllowedDomain("tenant.frontface.app"), true);
  assert.equal(isAlwaysAllowedDomain("example.com"), false);
});

test("matchesConfiguredDomain checks the configured list, not the empty-list shortcut", () => {
  assert.equal(matchesConfiguredDomain("example.com", ["example.com"]), true);
  assert.equal(matchesConfiguredDomain("www.example.com", ["example.com"]), true);
  assert.equal(matchesConfiguredDomain("app.example.com", ["*.example.com"]), true);
  assert.equal(matchesConfiguredDomain("example.com", ["*.example.com"]), true);
  assert.equal(matchesConfiguredDomain("evil.com", ["example.com"]), false);
  // An empty list is NOT a match here — the "allow all when unconfigured" behavior
  // lives only in isDomainAllowed, never in the gate's strict path.
  assert.equal(matchesConfiguredDomain("example.com", []), false);
});

// ---------------------------------------------------------------------------
// Pure gate decision
// ---------------------------------------------------------------------------

test("a valid client key for the project is allowed (client-key mode)", () => {
  const outcome = evaluatePublicWidgetAccess({
    projectId: PROJECT,
    clientKeyProjectId: PROJECT,
    clientKeyId: "key-1",
    domain: null,
    allowedDomains: [],
  });
  assert.deepEqual(outcome, {
    allow: true,
    access: { projectId: PROJECT, mode: "client-key", keyId: "key-1" },
  });
});

test("a client key for a different project is ignored and falls through to origin", () => {
  const outcome = evaluatePublicWidgetAccess({
    projectId: PROJECT,
    clientKeyProjectId: OTHER_PROJECT,
    clientKeyId: "key-1",
    domain: null,
    allowedDomains: [],
  });
  assert.equal(outcome.allow, false);
  assert.equal((outcome as { code: string }).code, "MISSING_ORIGIN");
});

test("an origin in the project's configured allowlist is allowed (browser-origin mode)", () => {
  const outcome = evaluatePublicWidgetAccess({
    projectId: PROJECT,
    domain: "shop.example.com",
    allowedDomains: ["*.example.com"],
  });
  assert.deepEqual(outcome, {
    allow: true,
    access: { projectId: PROJECT, mode: "browser-origin", domain: "shop.example.com" },
  });
});

test("an always-allowed dev/first-party host is allowed even with no configured domains", () => {
  const outcome = evaluatePublicWidgetAccess({
    projectId: PROJECT,
    domain: "localhost",
    allowedDomains: [],
  });
  assert.equal(outcome.allow, true);
});

test("no origin header is denied with MISSING_ORIGIN", () => {
  const outcome = evaluatePublicWidgetAccess({
    projectId: PROJECT,
    domain: null,
    allowedDomains: ["example.com"],
  });
  assert.equal(outcome.allow, false);
  assert.equal((outcome as { code: string }).code, "MISSING_ORIGIN");
});

test("an origin on a project with no allowlist configured is denied DOMAIN_NOT_CONFIGURED", () => {
  // This is the population that monitor mode surfaces for backfill before enforcement.
  const outcome = evaluatePublicWidgetAccess({
    projectId: PROJECT,
    domain: "shop.example.com",
    allowedDomains: [],
  });
  assert.equal(outcome.allow, false);
  assert.equal((outcome as { code: string }).code, "DOMAIN_NOT_CONFIGURED");
});

test("an origin not in a configured allowlist is denied DOMAIN_NOT_ALLOWED", () => {
  const outcome = evaluatePublicWidgetAccess({
    projectId: PROJECT,
    domain: "evil.com",
    allowedDomains: ["example.com"],
  });
  assert.equal(outcome.allow, false);
  assert.equal((outcome as { code: string }).code, "DOMAIN_NOT_ALLOWED");
});

// ---------------------------------------------------------------------------
// Express factory: monitor vs enforce
// ---------------------------------------------------------------------------

function fakeReqRes(overrides: Record<string, unknown> = {}) {
  const req: any = {
    body: {},
    query: {},
    params: {},
    headers: {},
    ...overrides,
  };
  const res: any = {
    statusCode: undefined,
    payload: undefined,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(body: unknown) {
      this.payload = body;
      return this;
    },
  };
  let nextCalled = false;
  const next = () => {
    nextCalled = true;
  };
  return { req, res, next: next as any, nextCalled: () => nextCalled };
}

const stubDomains = (domains: string[]) => async () => domains;

test("enforce off (monitor): a would-deny request passes through and is marked monitor", async () => {
  delete process.env.WIDGET_GATE_ENFORCE;
  const gate = requirePublicWidgetAccess({
    projectIdSource: "query",
    action: "lead-status",
    resolveAllowedDomains: stubDomains([]), // unconfigured project
  });
  const { req, res, next, nextCalled } = fakeReqRes({
    query: { projectId: PROJECT },
    headers: { origin: "https://shop.example.com" },
  });

  await gate(req, res, next);

  assert.equal(nextCalled(), true);
  assert.equal(res.statusCode, undefined); // no 403
  assert.equal(req.publicWidgetAccess.mode, "monitor");
  assert.equal(req.publicWidgetAccess.denyCode, "DOMAIN_NOT_CONFIGURED");
  assert.equal(req.publicWidgetAccess.projectId, PROJECT);
});

test("enforce on: a would-deny request is rejected with 403 and next is not called", async () => {
  process.env.WIDGET_GATE_ENFORCE = "true";
  const gate = requirePublicWidgetAccess({
    projectIdSource: "query",
    action: "lead-status",
    resolveAllowedDomains: stubDomains([]),
  });
  const { req, res, next, nextCalled } = fakeReqRes({
    query: { projectId: PROJECT },
    headers: { origin: "https://shop.example.com" },
  });

  await gate(req, res, next);

  assert.equal(nextCalled(), false);
  assert.equal(res.statusCode, 403);
  assert.equal(res.payload.error.code, "DOMAIN_NOT_CONFIGURED");
  delete process.env.WIDGET_GATE_ENFORCE;
});

test("an allowed request passes and records normalized access regardless of enforce flag", async () => {
  process.env.WIDGET_GATE_ENFORCE = "true";
  const gate = requirePublicWidgetAccess({
    projectIdSource: "body",
    action: "feedback",
    resolveAllowedDomains: stubDomains(["example.com"]),
  });
  const { req, res, next, nextCalled } = fakeReqRes({
    body: { projectId: PROJECT },
    headers: { origin: "https://example.com" },
  });

  await gate(req, res, next);

  assert.equal(nextCalled(), true);
  assert.equal(res.statusCode, undefined);
  assert.equal(req.publicWidgetAccess.mode, "browser-origin");
  assert.equal(req.publicWidgetAccess.domain, "example.com");
  delete process.env.WIDGET_GATE_ENFORCE;
});

test("a valid client key authorizes without doing the allowlist lookup", async () => {
  delete process.env.WIDGET_GATE_ENFORCE;
  let resolverCalled = false;
  const gate = requirePublicWidgetAccess({
    projectIdSource: "body",
    action: "chat-message",
    resolveAllowedDomains: async () => {
      resolverCalled = true;
      throw new Error("should not be called when a client key matches");
    },
  });
  const { req, res, next, nextCalled } = fakeReqRes({
    body: { projectId: PROJECT },
    clientKey: { keyId: "key-1", projectId: PROJECT },
  });

  await gate(req, res, next);

  assert.equal(resolverCalled, false, "client-key path must skip the DB lookup");
  assert.equal(nextCalled(), true);
  assert.equal(req.publicWidgetAccess.mode, "client-key");
  assert.equal(req.publicWidgetAccess.keyId, "key-1");
});

test("an allowlist-lookup failure passes through in monitor mode (never hangs)", async () => {
  delete process.env.WIDGET_GATE_ENFORCE;
  const gate = requirePublicWidgetAccess({
    projectIdSource: "body",
    action: "feedback",
    resolveAllowedDomains: async () => {
      throw new Error("db down");
    },
  });
  const { req, res, next, nextCalled } = fakeReqRes({
    body: { projectId: PROJECT },
    headers: { origin: "https://shop.example.com" },
  });

  await gate(req, res, next);

  assert.equal(nextCalled(), true);
  assert.equal(res.statusCode, undefined);
});

test("an allowlist-lookup failure fails closed (503) when enforcing", async () => {
  process.env.WIDGET_GATE_ENFORCE = "true";
  const gate = requirePublicWidgetAccess({
    projectIdSource: "body",
    action: "feedback",
    resolveAllowedDomains: async () => {
      throw new Error("db down");
    },
  });
  const { req, res, next, nextCalled } = fakeReqRes({
    body: { projectId: PROJECT },
    headers: { origin: "https://shop.example.com" },
  });

  await gate(req, res, next);

  assert.equal(nextCalled(), false);
  assert.equal(res.statusCode, 503);
  delete process.env.WIDGET_GATE_ENFORCE;
});

test("missing projectId passes through in monitor mode (zero behavior change)", async () => {
  delete process.env.WIDGET_GATE_ENFORCE;
  const gate = requirePublicWidgetAccess({
    projectIdSource: "query",
    action: "lead-status",
    resolveAllowedDomains: stubDomains(["example.com"]),
  });
  const { req, res, next, nextCalled } = fakeReqRes({ query: {} });

  await gate(req, res, next);

  // The route's own validation handles a missing projectId; the gate must not block it.
  assert.equal(nextCalled(), true);
  assert.equal(res.statusCode, undefined);
});

test("missing projectId is a 400 only when enforcing", async () => {
  process.env.WIDGET_GATE_ENFORCE = "true";
  const gate = requirePublicWidgetAccess({
    projectIdSource: "query",
    action: "lead-status",
    resolveAllowedDomains: stubDomains(["example.com"]),
  });
  const { req, res, next, nextCalled } = fakeReqRes({ query: {} });

  await gate(req, res, next);

  assert.equal(nextCalled(), false);
  assert.equal(res.statusCode, 400);
  delete process.env.WIDGET_GATE_ENFORCE;
});

test("embed config route uses the shared public widget gate", async () => {
  const source = await readFile(embedRoutePath, "utf8");
  const start = source.indexOf('embedRouter.get(\n  "/config/:projectId"');
  const end = source.indexOf("// Validate project ID", start);

  assert.notEqual(start, -1, "expected embed config route");
  assert.notEqual(end, -1, "expected embed config route boundary");

  const routeSource = source.slice(start, end);
  assert.match(routeSource, /requirePublicWidgetAccess\(\{\s*action:\s*"embed-config"/);
  assert.match(routeSource, /projectIdSource:\s*"params"/);
  assert.match(routeSource, /projectIdParam:\s*"projectId"/);
  assert.doesNotMatch(routeSource, /domainWhitelistMiddleware/);
});

test("embed config never exposes Supabase anon key in realtime config", async () => {
  const source = await readFile(embedRoutePath, "utf8");
  const start = source.indexOf("export function buildRealtimeClientConfig");
  assert.notEqual(start, -1, "expected buildRealtimeClientConfig helper");

  // Find the function body
  let depth = 0, end = start, started = false;
  for (let i = start; i < source.length; i++) {
    if (source[i] === "{") { depth++; started = true; }
    if (source[i] === "}") depth--;
    if (started && depth === 0) { end = i + 1; break; }
  }
  const fnBody = source.slice(start, end);

  assert.ok(
    !fnBody.includes("supabaseAnonKey"),
    "buildRealtimeClientConfig must never return supabaseAnonKey"
  );
  assert.ok(
    fnBody.includes("enabled: false"),
    "must have a disabled fallback path"
  );
});
