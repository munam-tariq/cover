/**
 * Widget Session Token
 *
 * Short-lived HMAC-signed token that binds a widget session to a (projectId, visitorId,
 * conversationId). Issued when a conversation is created/ensured/messaged, and enforced by
 * requireWidgetSession on the public conversation-id routes it currently guards:
 *   GET /api/widget/conversations/:id/status
 *   GET /api/widget/conversations/:id/messages/public
 *   POST /api/conversations/:id/handoff
 * so a caller cannot read or act on a conversation it was not handed — closing that IDOR.
 * NOTE: the conversation typing/presence write routes are NOT yet session-gated (deferred);
 * feedback is gated by origin/client-key, not by this token.
 *
 * Format: base64url(JSON(claims)) "." base64url(HMAC-SHA256(payload, secret)).
 * Self-contained (node:crypto only) so the signing/verification is unit-testable in isolation.
 */

import crypto from "node:crypto";

export interface WidgetSessionClaims {
  projectId: string;
  visitorId: string;
  conversationId: string;
  /** Unix seconds. */
  exp: number;
}

export type WidgetSessionDenyReason =
  | "SESSION_INVALID"
  | "SESSION_PROJECT_MISMATCH"
  | "SESSION_VISITOR_MISMATCH"
  | "SESSION_CONVERSATION_MISMATCH";

export type WidgetMessageContinuationAuthorization =
  | { ok: true; requiresToken: boolean }
  | { ok: false; denyReason: WidgetSessionDenyReason };

function resolveSecret(provided?: string): string {
  const value =
    provided ||
    process.env.WIDGET_SESSION_SECRET ||
    process.env.ENCRYPTION_KEY;
  if (!value) {
    throw new Error(
      "WIDGET_SESSION_SECRET (or ENCRYPTION_KEY) is required to sign widget session tokens"
    );
  }
  return value;
}

function sign(payload: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("base64url");
}

export function signWidgetSessionToken(
  claims: WidgetSessionClaims,
  providedSecret?: string
): string {
  const secret = resolveSecret(providedSecret);
  const payload = Buffer.from(JSON.stringify(claims)).toString("base64url");
  return `${payload}.${sign(payload, secret)}`;
}

const DEFAULT_TTL_SECONDS = 60 * 60 * 24; // 24h

/**
 * Mint a session token for a freshly created/ensured conversation. Defensive: if no signing
 * secret is configured it logs and returns undefined rather than throwing, so issuing a token
 * can never break conversation creation during rollout.
 */
export function issueWidgetSessionToken(
  input: {
    projectId: string;
    visitorId: string;
    conversationId: string;
    ttlSeconds?: number;
  },
  providedSecret?: string
): string | undefined {
  try {
    const exp =
      Math.floor(Date.now() / 1000) + (input.ttlSeconds ?? DEFAULT_TTL_SECONDS);
    return signWidgetSessionToken(
      {
        projectId: input.projectId,
        visitorId: input.visitorId,
        conversationId: input.conversationId,
        exp,
      },
      providedSecret
    );
  } catch (err) {
    console.warn(
      "[widget-session-token] could not issue token:",
      (err as Error).message
    );
    return undefined;
  }
}

export function verifyWidgetSessionToken(
  token: string | undefined,
  providedSecret?: string
): WidgetSessionClaims {
  if (!token) throw new Error("Missing widget session token");

  const [payload, signature] = token.split(".");
  if (!payload || !signature) throw new Error("Invalid widget session token");

  const expected = sign(payload, resolveSecret(providedSecret));
  const signatureBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expected);
  if (
    signatureBuf.length !== expectedBuf.length ||
    !crypto.timingSafeEqual(signatureBuf, expectedBuf)
  ) {
    throw new Error("Invalid widget session token");
  }

  let claims: WidgetSessionClaims;
  try {
    claims = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8")
    ) as WidgetSessionClaims;
  } catch {
    throw new Error("Invalid widget session token");
  }

  if (!claims.exp || claims.exp < Math.floor(Date.now() / 1000)) {
    throw new Error("Expired widget session token");
  }

  return claims;
}

export type WidgetSessionGateDecision =
  | { allow: true }
  | { allow: false; denyCode: WidgetSessionDenyReason };

/**
 * Does this token authorize acting on this conversation? Pure decision, separate from how a route
 * chooses to respond to it (monitor vs fail-closed) — same split as
 * evaluatePublicWidgetAccess/requirePublicWidgetAccess.
 */
export function evaluateWidgetSessionGate(input: {
  conversationId: string;
  token?: string;
  secret?: string;
}): WidgetSessionGateDecision {
  let claims: WidgetSessionClaims;
  try {
    claims = verifyWidgetSessionToken(input.token, input.secret);
  } catch {
    return { allow: false, denyCode: "SESSION_INVALID" };
  }

  if (claims.conversationId !== input.conversationId) {
    return { allow: false, denyCode: "SESSION_CONVERSATION_MISMATCH" };
  }

  return { allow: true };
}

export function authorizeWidgetMessageContinuation(input: {
  projectId: string;
  visitorId: string;
  sessionId?: string | null;
  conversationExists: boolean;
  sessionToken?: string;
  secret?: string;
}): WidgetMessageContinuationAuthorization {
  if (!input.sessionId || !input.conversationExists) {
    return { ok: true, requiresToken: false };
  }

  let claims: WidgetSessionClaims;
  try {
    claims = verifyWidgetSessionToken(input.sessionToken, input.secret);
  } catch {
    return { ok: false, denyReason: "SESSION_INVALID" };
  }

  if (claims.projectId !== input.projectId) {
    return { ok: false, denyReason: "SESSION_PROJECT_MISMATCH" };
  }

  if (claims.visitorId !== input.visitorId) {
    return { ok: false, denyReason: "SESSION_VISITOR_MISMATCH" };
  }

  if (claims.conversationId !== input.sessionId) {
    return { ok: false, denyReason: "SESSION_CONVERSATION_MISMATCH" };
  }

  return { ok: true, requiresToken: true };
}
