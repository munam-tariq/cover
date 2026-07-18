/**
 * Identity Verification Secret Service
 *
 * Per-project HS256 signing secret used to verify identity JWTs minted by the
 * tenant's own backend (POST /api/customers/identify). Unlike publishable
 * client keys (services/client-key.ts, `pk_`, cleartext), this is a SIGNING
 * SECRET: it is stored AES-256-GCM encrypted (services/encryption.ts) in
 * `project_identity_secrets`, a table with RLS enabled and no policies, so
 * only the service-role API can read it. The dashboard fetches it via
 * GET /api/projects/:id/identity-secret (owner/member gated).
 *
 * Rotation overwrites in place — tokens signed with the old secret stop
 * verifying immediately in this process and within the cache TTL elsewhere.
 */

import crypto from "crypto";

import { supabaseAdmin } from "../lib/supabase";

import { decrypt, encrypt } from "./encryption";

export interface IdentitySecretRecord {
  secret: string;
  createdAt: string;
  rotatedAt: string | null;
}

/** Generate a new verification secret: 64 hex chars (32 random bytes). */
export function generateIdentitySecret(): string {
  return crypto.randomBytes(32).toString("hex");
}

function toRecord(row: {
  secret_encrypted: string;
  created_at: string;
  rotated_at: string | null;
}): IdentitySecretRecord {
  return {
    secret: decrypt(row.secret_encrypted),
    createdAt: row.created_at,
    rotatedAt: row.rotated_at,
  };
}

async function fetchRow(projectId: string) {
  const { data, error } = await supabaseAdmin
    .from("project_identity_secrets")
    .select("secret_encrypted, created_at, rotated_at")
    .eq("project_id", projectId)
    .maybeSingle();

  if (error) {
    throw new Error(`identity secret lookup failed: ${error.message}`);
  }
  return data;
}

/**
 * Return the project's verification secret, lazily creating one on first
 * access (dashboard view). Returns null only on unexpected DB failure.
 */
export async function getOrCreateIdentitySecret(
  projectId: string
): Promise<IdentitySecretRecord | null> {
  try {
    const existing = await fetchRow(projectId);
    if (existing) return toRecord(existing);

    const { data: created, error } = await supabaseAdmin
      .from("project_identity_secrets")
      .insert({
        project_id: projectId,
        secret_encrypted: encrypt(generateIdentitySecret()),
      })
      .select("secret_encrypted, created_at, rotated_at")
      .single();

    if (created) {
      return toRecord(created);
    }

    // 23505 = another request created the row concurrently; use theirs.
    if (error?.code === "23505") {
      const raced = await fetchRow(projectId);
      return raced ? toRecord(raced) : null;
    }

    console.error("identity secret create failed:", error?.message);
    return null;
  } catch (err) {
    console.error("getOrCreateIdentitySecret:", (err as Error).message);
    return null;
  }
}

/**
 * Replace the project's secret (owner action). All previously issued identity
 * tokens become invalid. Returns the new record, or null on failure.
 */
export async function rotateIdentitySecret(
  projectId: string
): Promise<IdentitySecretRecord | null> {
  try {
    const now = new Date().toISOString();
    const { data, error } = await supabaseAdmin
      .from("project_identity_secrets")
      .upsert(
        {
          project_id: projectId,
          secret_encrypted: encrypt(generateIdentitySecret()),
          rotated_at: now,
        },
        { onConflict: "project_id" }
      )
      .select("secret_encrypted, created_at, rotated_at")
      .single();

    if (error || !data) {
      console.error("identity secret rotate failed:", error?.message);
      return null;
    }

    return toRecord(data);
  } catch (err) {
    console.error("rotateIdentitySecret:", (err as Error).message);
    return null;
  }
}

/**
 * Decrypted secret for verifying identify tokens. Not cached — the identify
 * endpoint is rate-limited (~10/min) so a per-request indexed row read + AES-GCM
 * decrypt is cheap, and it keeps rotations effective immediately across every
 * API instance (no cross-process staleness, no plaintext secret in a shared
 * cache). Returns null when the project has never configured identity
 * verification (callers map this to IDENTITY_NOT_CONFIGURED).
 */
export async function getDecryptedIdentitySecret(
  projectId: string
): Promise<string | null> {
  const row = await fetchRow(projectId);
  return row ? decrypt(row.secret_encrypted) : null;
}
