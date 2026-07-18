/**
 * Identity JWT Verification
 *
 * Verifies the HS256 identity tokens tenants sign on their own backend with
 * their project's verification secret (services/identity-secret.ts) and sends
 * through the SDK/widget to POST /api/customers/identify.
 *
 * Token contract: payload requires `user_id` (or `sub`), plus the standard
 * time claims `exp` + `iat` and a unique `jti` (single-use — the route consumes
 * it via consumed_identity_jti to stop replay). Optional contact fields `email`,
 * `name`, `phonenumber`, `custom_attributes`, `nbf`, and `visitor_id`. A contact
 * field that is present (including explicit null) drives contact sync; an omitted
 * field leaves the stored value untouched — so the verified claims deliberately
 * preserve the omitted-vs-null distinction.
 *
 * Self-contained HS256 like services/realtime-jwt.ts (node:crypto only), with
 * hardening: the header `alg` is allow-listed (blocks `alg: none`/key-confusion),
 * `exp`/`iat` are required with a bounded lifetime + clock-skew leeway, and `nbf`
 * is honored. Replay resistance (jti single-use, visitor binding) is enforced by
 * the route, which has the DB + request context this pure verifier lacks.
 */

import crypto from "node:crypto";

import { z } from "zod";

export type IdentityTokenErrorCode =
  | "TOKEN_INVALID"
  | "TOKEN_EXPIRED"
  | "TOKEN_CLAIMS_INVALID"
  | "TOKEN_REPLAYED";

export class IdentityTokenError extends Error {
  readonly code: IdentityTokenErrorCode;

  constructor(code: IdentityTokenErrorCode, message: string) {
    super(message);
    this.name = "IdentityTokenError";
    this.code = code;
  }
}

// Abuse caps on the verified custom-attributes blob (stored as JSONB).
const MAX_CUSTOM_ATTRIBUTE_KEYS = 50;
const MAX_CUSTOM_ATTRIBUTES_BYTES = 8 * 1024;

// Clock-skew leeway (seconds) applied to exp/nbf/iat comparisons.
const CLOCK_SKEW_LEEWAY_SECONDS = 60;
// Maximum accepted token lifetime (exp - iat). Tokens are minted per login and
// used immediately, so this stays short to bound the replay window.
const MAX_TOKEN_LIFETIME_SECONDS = 15 * 60;

const IdentityClaimsSchema = z.object({
  user_id: z.string().trim().min(1).max(255).optional(),
  sub: z.string().trim().min(1).max(255).optional(),
  email: z.string().trim().email().max(255).nullable().optional(),
  // Required (non-empty): every verified customer must have a name so the inbox
  // always shows a name next to the verified badge.
  name: z.string().trim().min(1).max(200),
  phonenumber: z.string().trim().max(50).nullable().optional(),
  custom_attributes: z.record(z.unknown()).nullable().optional(),
  exp: z.number().int(),
  iat: z.number().int(),
  nbf: z.number().int().optional(),
  jti: z.string().trim().min(1).max(255),
  visitor_id: z.string().trim().min(1).max(100).optional(),
});

/**
 * Verified claims. For contact fields `undefined` = claim omitted (preserve
 * stored value), `null` = explicit delete, value = upsert. `jti` and
 * `visitorIdClaim` are consumed by the route for replay/binding enforcement.
 */
export interface VerifiedIdentityClaims {
  userId: string;
  jti: string;
  expiresAt: number;
  visitorIdClaim?: string;
  email?: string | null;
  name: string; // required — always present
  phonenumber?: string | null;
  customAttributes?: Record<string, unknown> | null;
}

function decodeBase64UrlJson(segment: string): unknown {
  try {
    return JSON.parse(Buffer.from(segment, "base64url").toString("utf8"));
  } catch {
    throw new IdentityTokenError("TOKEN_INVALID", "Malformed identity token");
  }
}

/**
 * Verify an identity token's signature, expiry, and claims. Throws
 * IdentityTokenError; never returns unverified data.
 */
export function verifyIdentityToken(
  token: string,
  secret: string
): VerifiedIdentityClaims {
  const parts = token.split(".");
  if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) {
    throw new IdentityTokenError(
      "TOKEN_INVALID",
      "Identity token must be a signed JWT (header.payload.signature)"
    );
  }
  const [headerPart, payloadPart, signaturePart] = parts;

  const header = decodeBase64UrlJson(headerPart) as {
    alg?: unknown;
    typ?: unknown;
  };
  if (header?.alg !== "HS256" || (header.typ != null && header.typ !== "JWT")) {
    throw new IdentityTokenError(
      "TOKEN_INVALID",
      "Identity token must be signed with HS256"
    );
  }

  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${headerPart}.${payloadPart}`)
    .digest("base64url");
  const signatureBuf = Buffer.from(signaturePart);
  const expectedBuf = Buffer.from(expected);
  if (
    signatureBuf.length !== expectedBuf.length ||
    !crypto.timingSafeEqual(signatureBuf, expectedBuf)
  ) {
    throw new IdentityTokenError(
      "TOKEN_INVALID",
      "Identity token signature verification failed"
    );
  }

  const payload = decodeBase64UrlJson(payloadPart);
  const parsed = IdentityClaimsSchema.safeParse(payload);
  if (!parsed.success) {
    throw new IdentityTokenError(
      "TOKEN_CLAIMS_INVALID",
      `Invalid identity claims: ${parsed.error.issues
        .map((issue) => `${issue.path.join(".") || "payload"}: ${issue.message}`)
        .join("; ")}`
    );
  }
  const claims = parsed.data;
  const now = Math.floor(Date.now() / 1000);

  // Time-claim validation (leeway-tolerant): reject expired, not-yet-valid,
  // future-issued, inverted (exp <= iat), and over-long-lived tokens.
  if (claims.exp <= now - CLOCK_SKEW_LEEWAY_SECONDS) {
    throw new IdentityTokenError("TOKEN_EXPIRED", "Identity token has expired");
  }
  if (claims.iat > now + CLOCK_SKEW_LEEWAY_SECONDS) {
    throw new IdentityTokenError(
      "TOKEN_CLAIMS_INVALID",
      "Identity token iat is in the future"
    );
  }
  if (claims.exp <= claims.iat) {
    throw new IdentityTokenError(
      "TOKEN_CLAIMS_INVALID",
      "Identity token exp must be after iat"
    );
  }
  if (claims.exp - claims.iat > MAX_TOKEN_LIFETIME_SECONDS) {
    throw new IdentityTokenError(
      "TOKEN_CLAIMS_INVALID",
      `Identity token lifetime must not exceed ${MAX_TOKEN_LIFETIME_SECONDS} seconds`
    );
  }
  if (
    claims.nbf !== undefined &&
    claims.nbf > now + CLOCK_SKEW_LEEWAY_SECONDS
  ) {
    throw new IdentityTokenError(
      "TOKEN_CLAIMS_INVALID",
      "Identity token is not yet valid (nbf)"
    );
  }

  if (
    claims.user_id !== undefined &&
    claims.sub !== undefined &&
    claims.user_id !== claims.sub
  ) {
    throw new IdentityTokenError(
      "TOKEN_CLAIMS_INVALID",
      "Identity token has conflicting user_id and sub"
    );
  }
  const userId = claims.user_id ?? claims.sub;
  if (!userId) {
    throw new IdentityTokenError(
      "TOKEN_CLAIMS_INVALID",
      "Identity token payload must include user_id (or sub)"
    );
  }

  if (claims.custom_attributes) {
    const keyCount = Object.keys(claims.custom_attributes).length;
    if (keyCount > MAX_CUSTOM_ATTRIBUTE_KEYS) {
      throw new IdentityTokenError(
        "TOKEN_CLAIMS_INVALID",
        `custom_attributes may have at most ${MAX_CUSTOM_ATTRIBUTE_KEYS} keys`
      );
    }
    if (
      Buffer.byteLength(JSON.stringify(claims.custom_attributes), "utf8") >
      MAX_CUSTOM_ATTRIBUTES_BYTES
    ) {
      throw new IdentityTokenError(
        "TOKEN_CLAIMS_INVALID",
        `custom_attributes must serialize to at most ${MAX_CUSTOM_ATTRIBUTES_BYTES} bytes`
      );
    }
  }

  return {
    userId,
    jti: claims.jti,
    expiresAt: claims.exp,
    ...(claims.visitor_id === undefined
      ? {}
      : { visitorIdClaim: claims.visitor_id }),
    email: claims.email,
    name: claims.name,
    phonenumber: claims.phonenumber,
    customAttributes: claims.custom_attributes,
  };
}
