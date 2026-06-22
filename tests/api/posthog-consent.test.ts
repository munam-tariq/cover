import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const leadCapturePath = new URL(
  "../../apps/api/src/routes/lead-capture.ts",
  import.meta.url
);
const handoffPath = new URL(
  "../../apps/api/src/routes/handoff.ts",
  import.meta.url
);
const posthogLibPath = new URL(
  "../../apps/api/src/lib/posthog.ts",
  import.meta.url
);
const apiIndexPath = new URL("../../apps/api/src/index.ts", import.meta.url);
const apiEnvExamplePath = new URL(
  "../../apps/api/.env.example",
  import.meta.url
);

// ─── server events key on domain identifiers, not forwarded headers ─────────

test("lead capture keys its PostHog event on the visitor id", async () => {
  const source = await readFile(leadCapturePath, "utf8");
  assert.match(source, /distinctId:\s*visitorId\b/);
  assert.doesNotMatch(source, /distinctIdFrom/);
});

test("handoff keys its PostHog event on the conversation visitor id with id fallback", async () => {
  const source = await readFile(handoffPath, "utf8");
  assert.match(source, /distinctId:\s*conversation\.visitor_id\s*\?\?\s*id\b/);
  assert.doesNotMatch(source, /distinctIdFrom/);
});

test("server PostHog lib no longer reads client-forwarded identity headers", async () => {
  const source = await readFile(posthogLibPath, "utf8");
  assert.doesNotMatch(source, /distinctIdFrom/);
  assert.doesNotMatch(source, /X-POSTHOG/i);
});

// ─── widget CORS boundary advertises no PostHog headers ─────────────────────

test("widget CORS does not advertise PostHog headers", async () => {
  const source = await readFile(apiIndexPath, "utf8");
  const widgetCors = source.match(/const widgetCors = cors\(\{[\s\S]*?\}\);/);
  assert.ok(widgetCors, "expected to find the widgetCors definition");
  assert.doesNotMatch(widgetCors[0], /X-POSTHOG/i);
});

// ─── api env example documents PostHog ──────────────────────────────────────

test("api .env.example documents PostHog settings", async () => {
  const source = await readFile(apiEnvExamplePath, "utf8");
  assert.match(source, /POSTHOG_PROJECT_TOKEN/);
  assert.match(source, /POSTHOG_HOST/);
});
