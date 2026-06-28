#!/usr/bin/env node
// Proves protected tables are NOT readable through the Supabase anon data API.
// Run BEFORE the security_hardening migration: conversation_insights should return 200 (the
// vulnerability). Run AFTER: every listed table must be denied (401/403/permission denied).
//
// Usage:
//   SUPABASE_URL=... SUPABASE_ANON_KEY=... node scripts/security/probe-supabase-anon.mjs
// Never prints the key. Exit codes: 0 = all denied, 1 = a table was readable, 2 = misconfig.

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anon) {
  console.error("Missing SUPABASE_URL and SUPABASE_ANON_KEY (or NEXT_PUBLIC_* equivalents).");
  process.exit(2);
}

const protectedTables = [
  "conversation_insights",
  "message_feedback",
  "pulse_responses",
  "pulse_summaries",
  "pulse_campaigns",
  "qualified_leads",
  "lead_captures",
  "conversations",
  "messages",
  "customers",
  "projects",
  "project_client_keys",
  "api_keys",
  "knowledge_chunks",
];

let failed = false;

for (const table of protectedTables) {
  const response = await fetch(`${url}/rest/v1/${table}?select=*&limit=1`, {
    headers: { apikey: anon, Authorization: `Bearer ${anon}` },
  });
  const body = await response.text();
  if (response.status === 200) {
    console.error(`FAIL ${table}: anon read returned 200 — ${body.slice(0, 120)}`);
    failed = true;
  } else {
    console.log(`ok   ${table}: denied (${response.status})`);
  }
}

if (failed) {
  console.error("\nAt least one protected table is anon-readable. Apply the security_hardening migration.");
  process.exit(1);
}
console.log("\nAll protected tables denied to anon.");
process.exit(0);
