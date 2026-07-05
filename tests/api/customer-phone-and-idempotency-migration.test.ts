import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const migrationsDir = path.join(process.cwd(), "supabase/migrations");

test("customers table has phone column migration", async () => {
  const files = await readdir(migrationsDir);
  const migration = files
    .filter((f) => f.includes("add_customer_phone"))
    .sort()
    .at(-1);
  assert.ok(migration, "expected a customer phone migration file");

  const sql = await readFile(path.join(migrationsDir, migration), "utf8");
  assert.match(sql, /ALTER TABLE customers ADD COLUMN/i);
  assert.match(sql, /phone\s+text/i);
});

test("wa_message_id idempotency index migration exists", async () => {
  const files = await readdir(migrationsDir);
  const migration = files
    .filter((f) => f.includes("wa_message_id_idempotency"))
    .sort()
    .at(-1);
  assert.ok(migration, "expected a wa_message_id idempotency migration file");

  const sql = await readFile(path.join(migrationsDir, migration), "utf8");
  assert.match(sql, /CREATE UNIQUE INDEX/i);
  assert.match(sql, /wa_message_id/);
  assert.match(sql, /WHERE\s+metadata\s*\?\s*'wa_message_id'/i);
});
