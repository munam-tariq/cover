/**
 * Voice Session Token
 *
 * Short-lived HMAC-signed token that binds an ElevenLabs voice session to a (projectId,
 * visitorId, optional sessionId). Issued by GET /api/voice/config/:projectId, passed by the
 * widget into the ElevenLabs `extra_body`, and verified on the POST /api/voice/llm/chat/completions
 * callback so the otherwise-open LLM endpoint cannot be driven for an arbitrary project.
 *
 * Format: base64url(JSON(claims)) "." base64url(HMAC-SHA256(payload, secret)). Self-contained
 * (node:crypto only) so it is unit-testable in isolation — the API test runner cannot resolve
 * extensionless relative imports, which is why this mirrors widget-session-token rather than
 * sharing a helper module.
 */

import crypto from "node:crypto";

export interface VoiceSessionClaims {
  projectId: string;
  visitorId: string;
  /** Conversation id, when one already exists. Voice can start before any conversation. */
  sessionId?: string;
  /** Unix seconds. */
  exp: number;
}

export interface VoiceSessionBinding {
  projectId: string;
  visitorId: string;
  sessionId?: string;
}

interface VoiceConversationOwner {
  id: string;
  project_id: string;
  visitor_id: string;
}

const DEFAULT_TTL_SECONDS = 10 * 60; // 10 min — a voice call is short-lived

function resolveSecret(provided?: string): string {
  const value =
    provided ||
    process.env.VOICE_SESSION_SECRET ||
    process.env.WIDGET_SESSION_SECRET ||
    process.env.ENCRYPTION_KEY;
  if (!value) {
    throw new Error(
      "VOICE_SESSION_SECRET (or WIDGET_SESSION_SECRET / ENCRYPTION_KEY) is required to sign voice session tokens"
    );
  }
  return value;
}

function sign(payload: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("base64url");
}

export function signVoiceSessionToken(
  claims: VoiceSessionClaims,
  providedSecret?: string
): string {
  const secret = resolveSecret(providedSecret);
  const payload = Buffer.from(JSON.stringify(claims)).toString("base64url");
  return `${payload}.${sign(payload, secret)}`;
}

/**
 * Mint a voice session token. Defensive: returns undefined (never throws) if no secret is
 * configured, so issuing a token can never break voice config delivery.
 */
export function issueVoiceSessionToken(
  input: {
    projectId: string;
    visitorId: string;
    sessionId?: string;
    ttlSeconds?: number;
  },
  providedSecret?: string
): string | undefined {
  try {
    const exp =
      Math.floor(Date.now() / 1000) + (input.ttlSeconds ?? DEFAULT_TTL_SECONDS);
    const claims: VoiceSessionClaims = {
      projectId: input.projectId,
      visitorId: input.visitorId,
      exp,
    };
    if (input.sessionId) claims.sessionId = input.sessionId;
    return signVoiceSessionToken(claims, providedSecret);
  } catch (err) {
    console.warn(
      "[voice-session-token] could not issue token:",
      (err as Error).message
    );
    return undefined;
  }
}

export function verifyVoiceSessionToken(
  token: string | undefined,
  providedSecret?: string
): VoiceSessionClaims {
  if (!token) throw new Error("Missing voice session token");

  const [payload, signature] = token.split(".");
  if (!payload || !signature) throw new Error("Invalid voice session token");

  const expected = sign(payload, resolveSecret(providedSecret));
  const signatureBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expected);
  if (
    signatureBuf.length !== expectedBuf.length ||
    !crypto.timingSafeEqual(signatureBuf, expectedBuf)
  ) {
    throw new Error("Invalid voice session token");
  }

  let claims: VoiceSessionClaims;
  try {
    claims = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8")
    ) as VoiceSessionClaims;
  } catch {
    throw new Error("Invalid voice session token");
  }

  if (!claims.exp || claims.exp < Math.floor(Date.now() / 1000)) {
    throw new Error("Expired voice session token");
  }

  return claims;
}

/**
 * Fail unless the caller is using the exact identity tuple the token was minted for.
 * An absent conversation id is meaningful: it permits a new voice conversation, but
 * cannot be upgraded into access to a caller-supplied existing conversation.
 */
export function assertVoiceSessionBinding(
  claims: VoiceSessionClaims,
  binding: VoiceSessionBinding
): void {
  if (claims.projectId !== binding.projectId) {
    throw new Error("voice session project mismatch");
  }
  if (claims.visitorId !== binding.visitorId) {
    throw new Error("voice session visitor mismatch");
  }
  if ((claims.sessionId ?? null) !== (binding.sessionId ?? null)) {
    throw new Error("voice session conversation mismatch");
  }
}

/** Verify a database conversation before its id is embedded in a privileged voice token. */
export function assertVoiceConversationOwnership(
  conversation: VoiceConversationOwner,
  binding: VoiceSessionBinding & { sessionId: string }
): void {
  if (
    conversation.id !== binding.sessionId ||
    conversation.project_id !== binding.projectId ||
    conversation.visitor_id !== binding.visitorId
  ) {
    throw new Error("Conversation does not belong to this voice session");
  }
}
