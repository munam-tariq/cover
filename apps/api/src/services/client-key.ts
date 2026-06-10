/**
 * Publishable Client Key Service
 *
 * Generates and resolves per-project publishable client keys (`pk_<32 alnum>`) used by native
 * SDKs (mobile, etc.). Unlike account API keys (services/api-key.ts, `ck_`, scrypt-hashed for MCP
 * auth), these are PUBLISHABLE and stored cleartext — they ship inside app binaries. Security
 * comes from per-project scoping, rate limiting, and revocation, not from secrecy.
 *
 * DB access uses the service-role client (bypasses RLS), mirroring middleware/domain-whitelist.ts.
 */

import crypto from "crypto";

import { supabaseAdmin } from "../lib/supabase";

const KEY_PREFIX = "pk_";
const KEY_LENGTH = 32; // random chars after the prefix
const KEY_CHARS = "abcdefghijklmnopqrstuvwxyz0123456789";

export type ClientKeyPlatform = "mobile" | "web" | "all";

/** What the middleware resolves a valid key down to. */
export interface ResolvedClientKey {
  keyId: string;
  projectId: string;
  platform: ClientKeyPlatform;
}

/** A key as returned to the dashboard (full cleartext key — it is publishable). */
export interface ClientKeyRecord {
  id: string;
  key: string;
  platform: ClientKeyPlatform;
  name: string | null;
  active: boolean;
  lastUsedAt: string | null;
  createdAt: string;
  revokedAt: string | null;
}

/**
 * Generate a cryptographically random publishable key: `pk_` + 32 alphanumeric chars.
 */
export function generateClientKey(): string {
  const bytes = crypto.randomBytes(KEY_LENGTH);
  let randomPart = "";
  for (let i = 0; i < KEY_LENGTH; i++) {
    randomPart += KEY_CHARS[bytes[i] % KEY_CHARS.length];
  }
  return `${KEY_PREFIX}${randomPart}`;
}

/**
 * Cheap format pre-check so obviously-malformed keys are rejected before any DB lookup.
 */
export function isValidClientKeyFormat(key: unknown): key is string {
  if (typeof key !== "string") return false;
  if (!key.startsWith(KEY_PREFIX)) return false;
  if (key.length !== KEY_PREFIX.length + KEY_LENGTH) return false;
  return /^[a-z0-9]+$/.test(key.slice(KEY_PREFIX.length));
}

function toRecord(row: {
  id: string;
  key: string;
  platform: string;
  name: string | null;
  active: boolean;
  last_used_at: string | null;
  created_at: string;
  revoked_at: string | null;
}): ClientKeyRecord {
  return {
    id: row.id,
    key: row.key,
    platform: row.platform as ClientKeyPlatform,
    name: row.name,
    active: row.active,
    lastUsedAt: row.last_used_at,
    createdAt: row.created_at,
    revokedAt: row.revoked_at,
  };
}

/**
 * Resolve an active (non-revoked) key to its project/platform. Returns null when the key is
 * unknown, inactive, or revoked. Callers (the middleware) cache this result.
 */
export async function findActiveClientKey(
  key: string
): Promise<ResolvedClientKey | null> {
  const { data, error } = await supabaseAdmin
    .from("project_client_keys")
    .select("id, project_id, platform, active, revoked_at")
    .eq("key", key)
    .maybeSingle();

  if (error || !data) return null;
  if (!data.active || data.revoked_at) return null;

  return {
    keyId: data.id,
    projectId: data.project_id,
    platform: data.platform as ClientKeyPlatform,
  };
}

/** List a project's keys (newest first) for the dashboard. */
export async function listClientKeys(
  projectId: string
): Promise<ClientKeyRecord[]> {
  const { data, error } = await supabaseAdmin
    .from("project_client_keys")
    .select(
      "id, key, platform, name, active, last_used_at, created_at, revoked_at"
    )
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data.map(toRecord);
}

/** Mint a new key for a project. Overlapping (multiple active) keys are allowed for rotation. */
export async function createClientKey(
  projectId: string,
  platform: ClientKeyPlatform = "mobile",
  name?: string | null
): Promise<ClientKeyRecord | null> {
  const { data, error } = await supabaseAdmin
    .from("project_client_keys")
    .insert({
      project_id: projectId,
      key: generateClientKey(),
      platform,
      name: name ?? null,
    })
    .select(
      "id, key, platform, name, active, last_used_at, created_at, revoked_at"
    )
    .single();

  if (error || !data) return null;
  return toRecord(data);
}

/**
 * Soft-revoke a key (active=false + revoked_at). Scoped to the project so one project can't revoke
 * another's key. Returns the revoked key string (so the caller can bust the middleware cache), or
 * null if no matching active row was found.
 */
export async function revokeClientKey(
  projectId: string,
  keyId: string
): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from("project_client_keys")
    .update({ active: false, revoked_at: new Date().toISOString() })
    .eq("id", keyId)
    .eq("project_id", projectId)
    .select("key")
    .maybeSingle();

  if (error || !data) return null;
  return data.key;
}
