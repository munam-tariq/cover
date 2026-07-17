import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path: string) => readFile(new URL(path, import.meta.url), "utf8");
const stripComments = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*--.*$/gm, "");

test("legacy voice conversations become widget conversations with voice activity", async () => {
  const sql = stripComments(
    await read(
      "../../supabase/migrations/20260716033000_normalize_legacy_voice_conversations.sql"
    )
  );

  assert.match(sql, /update public\.conversations/);
  assert.match(sql, /where source = 'voice'/);
  assert.match(sql, /source = 'widget'/);
  assert.match(
    sql,
    /voice_ended_reason = coalesce\(voice_ended_reason, 'legacy_voice_source'\)/,
    "an existing end reason is evidence and must not be overwritten"
  );
});

test("normalization preserves historical conversation timestamps", async () => {
  const sql = stripComments(
    await read(
      "../../supabase/migrations/20260716033000_normalize_legacy_voice_conversations.sql"
    )
  );

  const disable = sql.indexOf(
    "alter table public.conversations disable trigger update_conversations_updated_at"
  );
  const update = sql.indexOf("update public.conversations");
  const enable = sql.indexOf(
    "alter table public.conversations enable trigger update_conversations_updated_at"
  );

  assert.ok(disable >= 0 && disable < update);
  assert.ok(enable > update);
});
