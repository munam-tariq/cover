/**
 * Verified Customer Identity Application
 *
 * Thin wrapper over the atomic `merge_customer_identity` PL/pgSQL function
 * (SECURITY DEFINER, service-role only), which owns all identity writes: it
 * find-or-creates the customer anchored on external_id, merges anonymous rows
 * into it under advisory locks, syncs contact fields, and writes the verified
 * assertion into the service-role-only `customer_identities` table. This layer
 * only marshals params, applies a bounded retry, and shapes the response into
 * the explicit contact-vs-verified provenance model the inbox consumes.
 */

import { supabaseAdmin } from "../lib/supabase";

import type { VerifiedIdentityClaims } from "./identity-jwt";

/** Mutable, agent-editable current contact info. */
export interface CustomerContact {
  customerId: string;
  visitorId: string;
  email: string | null;
  name: string | null;
  phone: string | null;
}

/** Service-managed verified assertion (a signed-token snapshot). */
export interface VerifiedIdentity {
  externalId: string;
  verifiedAt: string;
  email: string | null;
  name: string | null;
  phone: string | null;
  customAttributes: Record<string, unknown> | null;
}

export interface ApplyIdentityResult {
  contact: CustomerContact;
  verifiedIdentity: VerifiedIdentity | null;
  warnings: string[];
}

// Postgres codes worth one retry: unique violation and serialization failure.
const RETRYABLE_CODES = new Set(["23505", "40001"]);

interface ApplyIdentityInput {
  projectId: string;
  visitorId: string;
  claims: VerifiedIdentityClaims;
}

async function callMergeRpc(
  input: ApplyIdentityInput
): Promise<{ customerId: string; warnings: string[] }> {
  const { projectId, visitorId, claims } = input;
  const { data, error } = await supabaseAdmin.rpc("merge_customer_identity", {
    p_project_id: projectId,
    p_visitor_id: visitorId,
    p_external_id: claims.userId,
    p_email: claims.email ?? null,
    p_email_set: claims.email !== undefined,
    p_name: claims.name ?? null,
    p_name_set: claims.name !== undefined,
    p_phone: claims.phonenumber ?? null,
    p_phone_set: claims.phonenumber !== undefined,
    p_custom_attributes: claims.customAttributes ?? null,
    p_custom_attributes_set: claims.customAttributes !== undefined,
  });

  if (error) {
    const err = new Error(`merge_customer_identity failed: ${error.message}`);
    (err as { code?: string }).code = error.code;
    throw err;
  }

  const result = data as { customer_id: string; warnings: string[] } | null;
  if (!result?.customer_id) {
    throw new Error("merge_customer_identity returned no customer_id");
  }
  return { customerId: result.customer_id, warnings: result.warnings ?? [] };
}

/**
 * Apply verified identity claims for a visitor. Returns the shaped contact +
 * verified-identity result. The RPC serializes concurrent identifies via
 * advisory locks; the single retry backstops the rare unique/serialization race.
 */
export async function applyVerifiedIdentity(
  input: ApplyIdentityInput
): Promise<ApplyIdentityResult> {
  let merged: { customerId: string; warnings: string[] };
  try {
    merged = await callMergeRpc(input);
  } catch (err) {
    if (!RETRYABLE_CODES.has((err as { code?: string }).code ?? "")) throw err;
    merged = await callMergeRpc(input);
  }
  return loadIdentityResult(merged.customerId, merged.warnings);
}

/**
 * Shape a customer + its verified identity into the response model. Exported so
 * the idempotent-replay path (same jti + same visitor) can return the original
 * result without re-running the merge.
 */
export async function loadIdentityResult(
  customerId: string,
  warnings: string[] = []
): Promise<ApplyIdentityResult> {
  const [{ data: customer }, { data: identity }] = await Promise.all([
    supabaseAdmin
      .from("customers")
      .select("id, visitor_id, email, name, phone")
      .eq("id", customerId)
      .single(),
    supabaseAdmin
      .from("customer_identities")
      .select(
        "external_id, verified_at, verified_email, verified_name, verified_phone, custom_attributes"
      )
      .eq("customer_id", customerId)
      .maybeSingle(),
  ]);

  if (!customer) {
    throw new Error("identity applied but customer row not found");
  }

  return {
    contact: {
      customerId: customer.id,
      visitorId: customer.visitor_id,
      email: customer.email,
      name: customer.name,
      phone: customer.phone,
    },
    verifiedIdentity: identity
      ? {
          externalId: identity.external_id,
          verifiedAt: identity.verified_at,
          email: identity.verified_email,
          name: identity.verified_name,
          phone: identity.verified_phone,
          customAttributes: identity.custom_attributes ?? null,
        }
      : null,
    warnings,
  };
}

/**
 * Follow the `merged_into_customer_id` redirect chain to the surviving customer
 * id. Find-then-write callers (lead capture, conversation creation) call this
 * right before a mutating write so a row tombstoned by a concurrent identity
 * merge is never resurrected. Bounded to avoid cycles.
 */
export async function resolveCanonicalCustomerId(
  customerId: string
): Promise<string> {
  let id = customerId;
  for (let i = 0; i < 5; i++) {
    const { data } = await supabaseAdmin
      .from("customers")
      .select("merged_into_customer_id")
      .eq("id", id)
      .maybeSingle();
    const next = data?.merged_into_customer_id;
    if (!next || next === id) break;
    id = next;
  }
  return id;
}
