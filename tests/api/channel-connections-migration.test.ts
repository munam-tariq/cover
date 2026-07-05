import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const migrationsDir = path.join(process.cwd(), "supabase/migrations");

async function loadMigration(): Promise<string> {
  const files = await readdir(migrationsDir);
  const migration = files
    .filter((f) => f.includes("create_channel_connections"))
    .sort()
    .at(-1);
  assert.ok(migration, "expected a channel_connections migration file");
  return readFile(path.join(migrationsDir, migration), "utf8");
}

test("channel_connections table has required columns", async () => {
  const sql = await loadMigration();
  assert.match(sql, /CREATE TABLE channel_connections/i);
  assert.match(sql, /project_id\s+uuid\s+NOT NULL/i);
  assert.match(sql, /provider\s+text\s+NOT NULL/i);
  assert.match(sql, /external_id\s+text\s+NOT NULL/i);
  assert.match(sql, /credentials\s+text\s+NOT NULL/i);
  assert.match(sql, /status\s+text\s+NOT NULL/i);
});

test("channel_connections has global (provider, external_id) uniqueness", async () => {
  const sql = await loadMigration();
  assert.match(sql, /UNIQUE\s*\(provider,\s*external_id\)/i);
});

test("channel_connections has partial unique index for one-active-per-project", async () => {
  const sql = await loadMigration();
  assert.match(
    sql,
    /CREATE UNIQUE INDEX.*channel_connections.*project_id.*provider.*WHERE\s+status\s*=\s*'active'/i
  );
});

test("channel_connections RLS is enabled", async () => {
  const sql = await loadMigration();
  assert.match(sql, /ENABLE ROW LEVEL SECURITY/i);
});

test("channel_connections revokes anon and authenticated", async () => {
  const sql = await loadMigration();
  assert.match(sql, /REVOKE ALL ON TABLE.*channel_connections.*FROM anon/i);
  assert.match(sql, /REVOKE ALL ON TABLE.*channel_connections.*FROM authenticated/i);
});

test("channel_connections has owner-only defense-in-depth policies", async () => {
  const sql = await loadMigration();
  assert.match(sql, /CREATE POLICY.*Project owners can read channel connections/i);
  assert.match(sql, /CREATE POLICY.*Project owners can manage channel connections/i);
  assert.match(sql, /auth\.uid\(\)/i);
});

test("channel_connections revokes TRUNCATE, REFERENCES, TRIGGER", async () => {
  const sql = await loadMigration();
  assert.match(sql, /REVOKE TRUNCATE.*REFERENCES.*TRIGGER.*channel_connections/i);
});
