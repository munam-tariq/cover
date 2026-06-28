import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";

const migrationsDir = new URL("../../supabase/migrations/", import.meta.url);

test("database constraint allows offline_form handoff reason used by offline messages", async () => {
  const entries = await readdir(migrationsDir);
  const sql = (
    await Promise.all(
      entries
        .filter((entry) => entry.endsWith(".sql"))
        .map((entry) => readFile(new URL(entry, migrationsDir), "utf8"))
    )
  ).join("\n");

  assert.match(sql, /conversations_handoff_reason_check/);
  assert.match(sql, /offline_form/);
});
