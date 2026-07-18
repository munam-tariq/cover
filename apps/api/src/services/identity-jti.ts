/**
 * Identity Token Single-Use Enforcement (replay protection)
 *
 * Each identity JWT carries a unique `jti`. We reserve it in
 * `consumed_identity_jti` (service-role-only table) before applying identity so
 * a token cannot be replayed. Consumption is idempotent per visitor: replaying
 * the exact same `jti` from the same `visitorId` returns the original result;
 * reuse with a different `visitorId` is rejected. Expired reservations are
 * pruned opportunistically, at most once per interval per API process.
 */

import { supabaseAdmin } from "../lib/supabase";

import {
  createIntervalGate,
  decideExistingIdentityJti,
} from "./identity-jti-policy";
import { IdentityTokenError } from "./identity-jwt";

const UNIQUE_VIOLATION = "23505";
const JTI_PRUNE_INTERVAL_MS = 5 * 60 * 1000;
const shouldPruneExpiredJtis = createIntervalGate(JTI_PRUNE_INTERVAL_MS);

export type JtiReservation =
  | { status: "reserved" }
  | { status: "replay"; customerId: string };

/**
 * Reserve a jti for this identify attempt. Throws IdentityTokenError
 * (TOKEN_REPLAYED) when the token was already consumed by a different visitor.
 * An incomplete reservation is resumable only by its original visitor.
 */
export async function reserveIdentityJti(input: {
  projectId: string;
  jti: string;
  visitorId: string;
  expiresAt: number;
}): Promise<JtiReservation> {
  const expiresAtIso = new Date(input.expiresAt * 1000).toISOString();

  const { data: inserted, error } = await supabaseAdmin
    .from("consumed_identity_jti")
    .insert({
      project_id: input.projectId,
      jti: input.jti,
      visitor_id: input.visitorId,
      expires_at: expiresAtIso,
    })
    .select("jti")
    .maybeSingle();

  if (inserted) {
    // Best-effort prune of expired reservations, throttled per API process.
    if (shouldPruneExpiredJtis()) {
      void supabaseAdmin
        .from("consumed_identity_jti")
        .delete()
        .lt("expires_at", new Date().toISOString())
        .then(undefined, () => undefined);
    }
    return { status: "reserved" };
  }

  if (error && error.code !== UNIQUE_VIOLATION) {
    throw new Error(`jti reservation failed: ${error.message}`);
  }

  // Already reserved — decide idempotent replay vs. rejection.
  const { data: existing } = await supabaseAdmin
    .from("consumed_identity_jti")
    .select("visitor_id, customer_id")
    .eq("project_id", input.projectId)
    .eq("jti", input.jti)
    .maybeSingle();

  const decision = decideExistingIdentityJti(
    existing
      ? {
          visitorId: existing.visitor_id,
          customerId: existing.customer_id,
        }
      : null,
    input.visitorId
  );

  if (decision.status === "replay") {
    return { status: "replay", customerId: decision.customerId };
  }
  if (decision.status === "resume") {
    return { status: "reserved" };
  }

  throw new IdentityTokenError(
    "TOKEN_REPLAYED",
    "Identity token has already been used"
  );
}

/** Record the customer this jti resolved to, enabling idempotent replay. */
export async function recordIdentityJtiResult(input: {
  projectId: string;
  jti: string;
  customerId: string;
}): Promise<void> {
  const { error } = await supabaseAdmin
    .from("consumed_identity_jti")
    .update({ customer_id: input.customerId })
    .eq("project_id", input.projectId)
    .eq("jti", input.jti);
  if (error) {
    // Non-fatal: identity already applied; idempotency degrades to reject-on-replay.
    console.error("recordIdentityJtiResult:", error.message);
  }
}
