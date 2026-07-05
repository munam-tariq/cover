import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const migrationPath = path.join(
  process.cwd(),
  "supabase/migrations/20260706000001_create_auth_link_codes.sql"
);

test("migration creates auth_link_codes with required columns", async () => {
  const sql = await readFile(migrationPath, "utf8");
  assert.match(sql, /create table if not exists public\.auth_link_codes/i);
  assert.match(sql, /display_code text primary key/i);
  assert.match(sql, /auth_code text not null/i);
  assert.match(sql, /expires_at timestamptz not null/i);
});

test("migration enables RLS and defines no policies (deny-all)", async () => {
  const sql = await readFile(migrationPath, "utf8");
  assert.match(
    sql,
    /alter table public\.auth_link_codes enable row level security/i
  );
  assert.doesNotMatch(sql, /create policy/i);
});

test("migration revokes access from anon and authenticated", async () => {
  const sql = await readFile(migrationPath, "utf8");
  assert.match(
    sql,
    /revoke all on table public\.auth_link_codes from anon, authenticated/i
  );
});
