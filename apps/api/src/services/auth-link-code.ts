/**
 * Cross-browser magic-link relay.
 *
 * When a magic link is opened in a browser without the PKCE code verifier
 * (e.g. Gmail's in-app browser), the callback page stashes the auth code here
 * under a 6-digit display code. The originating browser — which holds the
 * verifier — claims it and completes exchangeCodeForSession locally.
 *
 * A claimed auth code is useless without the verifier, so possession of the
 * display code alone never grants a session.
 */
import { randomInt } from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";

const CODE_TTL_MS = 5 * 60 * 1000;
const MAX_COLLISION_RETRIES = 3;

export function generateDisplayCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

export async function stashAuthCode(
  db: SupabaseClient,
  authCode: string
): Promise<{ displayCode: string; expiresAt: string }> {
  // Opportunistic cleanup keeps the table tiny without pg_cron.
  await db
    .from("auth_link_codes")
    .delete()
    .lt("expires_at", new Date().toISOString());

  for (let attempt = 0; attempt < MAX_COLLISION_RETRIES; attempt++) {
    const displayCode = generateDisplayCode();
    const expiresAt = new Date(Date.now() + CODE_TTL_MS).toISOString();

    const { error } = await db.from("auth_link_codes").insert({
      display_code: displayCode,
      auth_code: authCode,
      expires_at: expiresAt,
    });

    if (!error) {
      return { displayCode, expiresAt };
    }
    if (error.code !== "23505") {
      throw new Error(`auth_link_codes insert failed: ${error.message}`);
    }
  }

  throw new Error("Could not generate a unique display code");
}

export async function claimAuthCode(
  db: SupabaseClient,
  displayCode: string
): Promise<string | null> {
  // Delete-returning makes the claim atomic: a code can be redeemed once,
  // and only while unexpired.
  const { data, error } = await db
    .from("auth_link_codes")
    .delete()
    .eq("display_code", displayCode)
    .gt("expires_at", new Date().toISOString())
    .select("auth_code");

  if (error) {
    throw new Error(`auth_link_codes claim failed: ${error.message}`);
  }
  if (!data || data.length === 0) {
    return null;
  }
  return data[0].auth_code as string;
}
