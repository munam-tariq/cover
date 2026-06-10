/**
 * Client Key Middleware
 *
 * Resolves the publishable client key (`X-FrontFace-Key: pk_...`) sent by native SDKs onto
 * `req.clientKey`. This is the credential that lets a non-browser client (which sends no Origin)
 * use POST /api/chat/message, and it is the primary rate-limit key for that client.
 *
 * Design:
 * - Optional-resolve: absent/malformed/unknown/revoked keys pass through (req.clientKey stays
 *   undefined). The web widget sends no key and is unaffected.
 * - Cross-project guard: a resolved key whose project differs from the request body's projectId is
 *   rejected — a key minted for one project must never act on another.
 * - 5-minute lookup cache (positive + negative), mirroring middleware/domain-whitelist.ts; revoke
 *   busts it via clearClientKeyCache().
 */

import { Request, Response, NextFunction } from "express";

import {
  findActiveClientKey,
  isValidClientKeyFormat,
  type ResolvedClientKey,
} from "../services/client-key";

import { domainWhitelistMiddleware } from "./domain-whitelist";

// Extend Express Request type to include the resolved client key
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      clientKey?: ResolvedClientKey;
    }
  }
}

const HEADER = "x-frontface-key";
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_ENTRIES = 10000; // bound memory against floods of well-formed-but-invalid keys

const cache = new Map<
  string,
  { value: ResolvedClientKey | null; expires: number }
>();

async function resolveKey(key: string): Promise<ResolvedClientKey | null> {
  const cached = cache.get(key);
  if (cached && cached.expires > Date.now()) return cached.value;

  const resolved = await findActiveClientKey(key);

  if (cache.size >= MAX_CACHE_ENTRIES) cache.clear();
  cache.set(key, { value: resolved, expires: Date.now() + CACHE_TTL_MS });
  return resolved;
}

/**
 * Drop cached lookups. Call on revoke so a revoked key stops authorizing immediately rather than
 * living until its cache entry expires. No argument clears the whole cache.
 */
export function clearClientKeyCache(key?: string): void {
  if (key) cache.delete(key);
  else cache.clear();
}

/**
 * Resolve X-FrontFace-Key onto req.clientKey (optional). Mount ahead of the public routers.
 */
export async function clientKeyMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const raw = req.headers[HEADER];
  const key =
    typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : undefined;

  if (key && isValidClientKeyFormat(key)) {
    const resolved = await resolveKey(key);
    if (resolved) {
      const bodyProjectId = req.body?.projectId;
      if (
        typeof bodyProjectId === "string" &&
        bodyProjectId.length > 0 &&
        bodyProjectId !== resolved.projectId
      ) {
        res.status(403).json({
          error: {
            code: "KEY_PROJECT_MISMATCH",
            message:
              "This client key is not authorized for the requested project",
          },
        });
        return;
      }
      req.clientKey = resolved;
    }
  }

  next();
}

const chatDomainGate = domainWhitelistMiddleware({
  requireDomain: true,
  projectIdSource: "body",
});

/**
 * Gate for POST /api/chat/message: a resolved client key satisfies the gate (native clients send
 * no Origin); otherwise fall back to the browser domain whitelist (the web widget path is
 * unchanged). Requires clientKeyMiddleware to have run first.
 */
export function requireClientKeyOrDomain(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // clientKeyMiddleware already verified the key matches the body projectId.
  if (req.clientKey) {
    next();
    return;
  }
  chatDomainGate(req, res, next);
}
