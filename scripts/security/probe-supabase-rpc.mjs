#!/usr/bin/env node
// Proves the SECURITY DEFINER helper RPCs are NOT executable by client roles.
// Always probes the anon role. If SUPABASE_AUTH_TEST_JWT is set (a real signed-in user's
// access token), also probes the authenticated role — the role the migration revokes.
//
// A denied call is anything >= 400 (PostgREST returns 404 PGRST202 / 401 / 403 for a function
// the role cannot execute). A < 400 response means the role could invoke the function.
//
// Usage:
//   SUPABASE_URL=... SUPABASE_ANON_KEY=... [SUPABASE_AUTH_TEST_JWT=...] \
//     node scripts/security/probe-supabase-rpc.mjs
// Exit codes: 0 = all denied, 1 = something was executable, 2 = misconfig.

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const authJwt = process.env.SUPABASE_AUTH_TEST_JWT || null;

if (!url || !anon) {
  console.error("Missing SUPABASE_URL and SUPABASE_ANON_KEY (or NEXT_PUBLIC_* equivalents).");
  process.exit(2);
}

const ZERO = "00000000-0000-0000-0000-000000000000";
const calls = [
  { name: "append_late_answer", body: { lead_id: ZERO, late_answer: {} } },
  { name: "mark_late_answer_promoted", body: { lead_id: ZERO, answer_index: 0 } },
  { name: "get_available_agents", body: { p_project_id: ZERO } },
  { name: "get_queue_position", body: { p_conversation_id: ZERO } },
  { name: "get_project_role", body: { p_project_id: ZERO, p_user_id: ZERO } },
  { name: "has_project_access", body: { p_project_id: ZERO, p_user_id: ZERO } },
  { name: "is_project_agent", body: { p_project_id: ZERO, p_user_id: ZERO } },
  { name: "is_project_owner", body: { p_project_id: ZERO, p_user_id: ZERO } },
];

const roles = [{ role: "anon", token: anon }];
if (authJwt) roles.push({ role: "authenticated", token: authJwt });
else console.log("(SUPABASE_AUTH_TEST_JWT not set — skipping the authenticated-role probe)\n");

let failed = false;

for (const { role, token } of roles) {
  for (const call of calls) {
    const response = await fetch(`${url}/rest/v1/rpc/${call.name}`, {
      method: "POST",
      headers: { apikey: anon, Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(call.body),
    });
    if (response.status < 400) {
      console.error(`FAIL [${role}] ${call.name}: executable (${response.status})`);
      failed = true;
    } else {
      console.log(`ok   [${role}] ${call.name}: denied (${response.status})`);
    }
  }
}

if (failed) {
  console.error("\nA client role can execute a privileged RPC. Apply the security_hardening migration.");
  process.exit(1);
}
console.log("\nAll privileged RPCs denied to client roles.");
process.exit(0);
