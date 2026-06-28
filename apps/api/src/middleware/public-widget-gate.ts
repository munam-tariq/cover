/**
 * Public Widget Gate
 *
 * One shared gate for service-role-backed public widget routes. A request is authorized by
 * EITHER a native client key bound to the project (X-FrontFace-Key, resolved upstream by
 * clientKeyMiddleware) OR an allowed browser Origin/Referer.
 *
 * This module is intentionally self-contained: it owns the pure domain-matching primitives
 * (shared with ./domain-whitelist) and pulls the Supabase-backed allowlist lookup lazily, so the
 * gate decision can be unit-tested without loading the Supabase client.
 *
 * Rollout: the gate runs in MONITOR mode by default (logs would-be denials, then allows) so
 * enabling it cannot break existing embeds whose projects have not configured allowed_domains.
 * Set WIDGET_GATE_ENFORCE=true to fail closed once domains/keys are backfilled.
 */

import type { NextFunction, Request, RequestHandler, Response } from "express";

// ---------------------------------------------------------------------------
// Domain matching primitives (pure; re-exported by ./domain-whitelist)
// ---------------------------------------------------------------------------

// Domains always allowed regardless of a project's configured allowlist: local dev hosts and
// the first-party hosted public page (so a tenant's own page is never blocked).
const FIRST_PARTY_HOST = (
  process.env.FIRST_PARTY_HOST || "frontface.app"
).toLowerCase();

const ALWAYS_ALLOWED_PATTERNS: (string | RegExp)[] = [
  "localhost",
  "127.0.0.1",
  /\.localhost$/,
  /\.local$/,
  FIRST_PARTY_HOST,
  new RegExp(`\\.${FIRST_PARTY_HOST.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`),
];

/** Extract the request domain from the Origin or Referer header. */
export function extractDomain(req: Request): string | null {
  const origin = req.headers.origin;
  if (origin) {
    try {
      return new URL(origin).hostname.toLowerCase();
    } catch {
      // fall through to referer
    }
  }
  const referer = req.headers.referer;
  if (referer) {
    try {
      return new URL(referer).hostname.toLowerCase();
    } catch {
      // invalid URL
    }
  }
  return null;
}

/** Whether a domain is a dev/first-party host that is always allowed. */
export function isAlwaysAllowedDomain(domain: string): boolean {
  for (const pattern of ALWAYS_ALLOWED_PATTERNS) {
    if (typeof pattern === "string") {
      if (domain === pattern) return true;
    } else if (pattern.test(domain)) {
      return true;
    }
  }
  return false;
}

/**
 * Whether a domain matches a project's *configured* allowlist (exact, www-variant, or wildcard).
 * Does NOT treat an empty list as "allow all" and does NOT consult the always-allowed patterns —
 * the strict check the gate uses to tell "unconfigured" from "configured-but-blocked".
 */
export function matchesConfiguredDomain(
  domain: string,
  allowedDomains: string[]
): boolean {
  if (!allowedDomains) return false;
  for (const allowed of allowedDomains) {
    const normalizedAllowed = allowed.toLowerCase().trim();
    if (domain === normalizedAllowed) return true;
    if (domain === `www.${normalizedAllowed}`) return true;
    if (normalizedAllowed.startsWith("*.")) {
      const baseDomain = normalizedAllowed.slice(2);
      if (domain === baseDomain || domain.endsWith(`.${baseDomain}`)) return true;
    }
  }
  return false;
}

/**
 * Opt-in domain check used by the legacy domainWhitelistMiddleware: dev/first-party hosts are
 * always allowed, and a project with no configured domains allows all (no breaking change).
 */
export function isDomainAllowed(
  domain: string,
  allowedDomains: string[]
): boolean {
  if (isAlwaysAllowedDomain(domain)) return true;
  if (!allowedDomains || allowedDomains.length === 0) return true;
  return matchesConfiguredDomain(domain, allowedDomains);
}

// ---------------------------------------------------------------------------
// Gate decision (pure)
// ---------------------------------------------------------------------------

export type PublicWidgetMode = "client-key" | "browser-origin" | "monitor";

export interface PublicWidgetAccess {
  projectId: string;
  mode: PublicWidgetMode;
  keyId?: string;
  domain?: string;
  /** Set only when mode === "monitor": the code/reason this would have been denied with. */
  denyCode?: string;
  denyReason?: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      publicWidgetAccess?: PublicWidgetAccess;
    }
  }
}

export interface GateDecisionInput {
  projectId: string;
  /** Project bound to the resolved client key, if any (from req.clientKey). */
  clientKeyProjectId?: string;
  clientKeyId?: string;
  /** Origin/Referer host, or null when absent. */
  domain: string | null;
  /** The project's configured allowed_domains (may be empty). */
  allowedDomains: string[];
}

export type GateOutcome =
  | { allow: true; access: PublicWidgetAccess }
  | { allow: false; code: string; reason: string };

/**
 * Pure authorization decision for a public widget request. No IO — the adapter gathers inputs.
 */
export function evaluatePublicWidgetAccess(input: GateDecisionInput): GateOutcome {
  const { projectId, clientKeyProjectId, clientKeyId, domain, allowedDomains } =
    input;

  // 1) A native client key bound to this project authorizes the request.
  if (clientKeyProjectId && clientKeyProjectId === projectId) {
    return {
      allow: true,
      access: { projectId, mode: "client-key", keyId: clientKeyId },
    };
  }

  // 2) Otherwise require an allowed browser origin.
  if (!domain) {
    return {
      allow: false,
      code: "MISSING_ORIGIN",
      reason: "Request must include an Origin or Referer header",
    };
  }

  if (isAlwaysAllowedDomain(domain)) {
    return { allow: true, access: { projectId, mode: "browser-origin", domain } };
  }

  if (!allowedDomains || allowedDomains.length === 0) {
    return {
      allow: false,
      code: "DOMAIN_NOT_CONFIGURED",
      reason: `Project has no allowed domains configured for ${domain}`,
    };
  }

  if (matchesConfiguredDomain(domain, allowedDomains)) {
    return { allow: true, access: { projectId, mode: "browser-origin", domain } };
  }

  return {
    allow: false,
    code: "DOMAIN_NOT_ALLOWED",
    reason: `This widget is not authorized for use on ${domain}`,
  };
}

// ---------------------------------------------------------------------------
// Express adapter
// ---------------------------------------------------------------------------

export interface PublicWidgetGateOptions {
  /** Short action name for rate-limit scoping and monitor logs (e.g. "lead-submit"). */
  action: string;
  projectIdSource?: "body" | "query" | "params";
  projectIdParam?: string;
  /** Injectable for tests; defaults to the cached Supabase project allowlist lookup. */
  resolveAllowedDomains?: (projectId: string) => Promise<string[]>;
}

function readProjectId(
  req: Request,
  source: "body" | "query" | "params",
  param: string
): string | undefined {
  const container =
    source === "body" ? req.body : source === "query" ? req.query : req.params;
  const value = container?.[param];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

// Lazily pulls the Supabase-backed lookup so importing this module (e.g. in unit tests that
// inject resolveAllowedDomains) never loads the Supabase client.
async function defaultResolveAllowedDomains(projectId: string): Promise<string[]> {
  const { getProjectAllowedDomains } = await import("./domain-whitelist");
  return getProjectAllowedDomains(projectId);
}

/**
 * Express middleware enforcing (or, by default, monitoring) public widget access. Requires
 * clientKeyMiddleware to have run upstream so req.clientKey is populated.
 */
export function requirePublicWidgetAccess(
  options: PublicWidgetGateOptions
): RequestHandler {
  const {
    action,
    projectIdSource = "body",
    projectIdParam = "projectId",
    resolveAllowedDomains = defaultResolveAllowedDomains,
  } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    const enforce = process.env.WIDGET_GATE_ENFORCE === "true";

    const projectId = readProjectId(req, projectIdSource, projectIdParam);
    if (!projectId) {
      // Monitor mode must not change behavior — let the route's own validation handle a
      // missing projectId. Only fail closed (with a 400) when enforcing.
      if (enforce) {
        res.status(400).json({
          error: {
            code: "PROJECT_ID_REQUIRED",
            message: "projectId is required",
          },
        });
        return;
      }
      console.warn(
        `[PublicWidgetGate:monitor] missing-projectId action=${action} ` +
          `source=${projectIdSource}:${projectIdParam}`
      );
      next();
      return;
    }

    // A native client key bound to this project authorizes without an allowlist lookup —
    // short-circuit before any DB call (avoids a wasted query and the hang surface for SDKs).
    if (req.clientKey?.projectId === projectId) {
      req.publicWidgetAccess = {
        projectId,
        mode: "client-key",
        keyId: req.clientKey.keyId,
      };
      next();
      return;
    }

    const domain = extractDomain(req);

    // Never let a lookup failure hang the request (this is async middleware on Express 4,
    // which does not catch rejected promises). Fail open in monitor mode, closed when enforcing.
    let allowedDomains: string[];
    try {
      allowedDomains = await resolveAllowedDomains(projectId);
    } catch (err) {
      if (enforce) {
        res.status(503).json({
          error: {
            code: "GATE_LOOKUP_FAILED",
            message: "Could not verify widget access",
          },
        });
        return;
      }
      console.warn(
        `[PublicWidgetGate:monitor] allowlist lookup failed action=${action} ` +
          `project=${projectId}: ${(err as Error).message}`
      );
      next();
      return;
    }

    const outcome = evaluatePublicWidgetAccess({
      projectId,
      clientKeyProjectId: req.clientKey?.projectId,
      clientKeyId: req.clientKey?.keyId,
      domain,
      allowedDomains,
    });

    if (outcome.allow) {
      req.publicWidgetAccess = outcome.access;
      next();
      return;
    }

    if (enforce) {
      res
        .status(403)
        .json({ error: { code: outcome.code, message: outcome.reason } });
      return;
    }

    // Monitor mode: record the would-be denial for backfill triage, then allow.
    console.warn(
      `[PublicWidgetGate:monitor] would-deny action=${action} project=${projectId} ` +
        `domain=${domain ?? "none"} code=${outcome.code}`
    );
    req.publicWidgetAccess = {
      projectId,
      mode: "monitor",
      domain: domain ?? undefined,
      denyCode: outcome.code,
      denyReason: outcome.reason,
    };
    next();
  };
}
