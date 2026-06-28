/**
 * Realtime JWT Service
 *
 * Mints short-lived, Supabase-compatible JWTs for widget visitors to subscribe
 * to private Realtime channels. These tokens use `role: "anon"` — the June 2026
 * security hardening revoked all anon table privileges, so the JWT cannot access
 * any table via PostgREST. RLS policies on `realtime.messages` check the custom
 * claims (conversation_id, project_id, scope) to authorize channel subscriptions.
 *
 * Format: standard JWT (header.payload.signature) signed with HS256 using the
 * project's SUPABASE_JWT_SECRET. Self-contained (node:crypto only).
 *
 * SENSITIVE: SUPABASE_JWT_SECRET can mint Supabase-compatible JWTs. Server-side
 * only — never expose via NEXT_PUBLIC_* or browser bundles.
 */

import crypto from "node:crypto";

export interface RealtimeVisitorClaims {
  sub: string;
  role: "anon";
  iss: "supabase";
  iat: number;
  exp: number;
  conversation_id: string;
  project_id: string;
  scope: "widget_realtime";
}

const DEFAULT_TTL_SECONDS = 5 * 60; // 5 minutes

const JWT_HEADER = Buffer.from(
  JSON.stringify({ alg: "HS256", typ: "JWT" })
).toString("base64url");

function resolveSecret(provided?: string): string {
  const value = provided || process.env.SUPABASE_JWT_SECRET;
  if (!value) {
    throw new Error(
      "SUPABASE_JWT_SECRET is required to sign Realtime visitor JWTs"
    );
  }
  return value;
}

function hmacSign(input: string, secret: string): string {
  return crypto
    .createHmac("sha256", secret)
    .update(input)
    .digest("base64url");
}

function isJwtLike(value: string | undefined): value is string {
  if (!value) return false;
  return value.split(".").length === 3;
}

function isJwtSignedBySecret(token: string, secret: string): boolean {
  const [header, payload, signature] = token.split(".");
  if (!header || !payload || !signature) return false;

  const expected = hmacSign(`${header}.${payload}`, secret);
  const sigBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expected);
  return (
    sigBuf.length === expectedBuf.length &&
    crypto.timingSafeEqual(sigBuf, expectedBuf)
  );
}

interface RealtimeJwtEnv {
  SUPABASE_JWT_SECRET?: string;
  SUPABASE_SERVICE_KEY?: string;
}

export function canIssueRealtimeTokens(env: RealtimeJwtEnv = process.env): boolean {
  const secret = env.SUPABASE_JWT_SECRET;
  if (!secret) return false;

  const serviceKey = env.SUPABASE_SERVICE_KEY;
  if (isJwtLike(serviceKey) && !isJwtSignedBySecret(serviceKey, secret)) {
    console.warn(
      "[realtime-jwt] SUPABASE_JWT_SECRET does not verify SUPABASE_SERVICE_KEY; private realtime disabled"
    );
    return false;
  }

  return true;
}

export function issueRealtimeToken(
  input: {
    projectId: string;
    visitorId: string;
    conversationId: string;
    ttlSeconds?: number;
  },
  providedSecret?: string
): string | undefined {
  try {
    const secret = resolveSecret(providedSecret);
    const iat = Math.floor(Date.now() / 1000);
    const exp = iat + (input.ttlSeconds ?? DEFAULT_TTL_SECONDS);

    const claims: RealtimeVisitorClaims = {
      sub: input.visitorId,
      role: "anon",
      iss: "supabase",
      iat,
      exp,
      conversation_id: input.conversationId,
      project_id: input.projectId,
      scope: "widget_realtime",
    };

    const payload = Buffer.from(JSON.stringify(claims)).toString("base64url");
    const signingInput = `${JWT_HEADER}.${payload}`;
    const signature = hmacSign(signingInput, secret);

    return `${signingInput}.${signature}`;
  } catch (err) {
    console.warn(
      "[realtime-jwt] could not issue token:",
      (err as Error).message
    );
    return undefined;
  }
}

export function verifyRealtimeToken(
  token: string | undefined | null,
  providedSecret?: string
): RealtimeVisitorClaims {
  if (!token) throw new Error("Missing realtime token");

  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Invalid realtime token");

  const [header, payload, signature] = parts;
  if (!header || !payload || !signature) throw new Error("Invalid realtime token");

  const secret = resolveSecret(providedSecret);
  const expected = hmacSign(`${header}.${payload}`, secret);

  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expected);
  if (
    sigBuf.length !== expBuf.length ||
    !crypto.timingSafeEqual(sigBuf, expBuf)
  ) {
    throw new Error("Invalid realtime token");
  }

  let claims: RealtimeVisitorClaims;
  try {
    claims = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8")
    ) as RealtimeVisitorClaims;
  } catch {
    throw new Error("Invalid realtime token");
  }

  if (!claims.exp || claims.exp < Math.floor(Date.now() / 1000)) {
    throw new Error("Expired realtime token");
  }

  return claims;
}

export function isRealtimePrivateEnabled(): boolean {
  return process.env.REALTIME_PRIVATE_ENABLED === "true";
}

export function buildRealtimeTokenResponse(
  input: {
    conversationId: string;
    projectId: string;
    visitorId: string;
  },
  providedSecret?: string
): { token: string; expiresAt: number } | undefined {
  if (
    !canIssueRealtimeTokens({
      SUPABASE_JWT_SECRET: providedSecret || process.env.SUPABASE_JWT_SECRET,
      SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY,
    })
  ) {
    return undefined;
  }

  const token = issueRealtimeToken(
    {
      projectId: input.projectId,
      visitorId: input.visitorId,
      conversationId: input.conversationId,
    },
    providedSecret
  );
  if (!token) return undefined;

  const payload = token.split(".")[1];
  const claims = JSON.parse(
    Buffer.from(payload, "base64url").toString("utf8")
  ) as RealtimeVisitorClaims;

  return { token, expiresAt: claims.exp };
}
