import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readMigration = (name: string) =>
  readFile(
    new URL(`../../supabase/migrations/${name}`, import.meta.url),
    "utf8"
  );

test("legacy chat reconciliation is set-based, idempotent, and non-destructive", async () => {
  const sql = await readMigration(
    "20260716031000_reconcile_legacy_chat_sessions.sql"
  );

  assert.match(sql, /unnest\(cs\.messages\).*with ordinality/is);
  assert.match(sql, /on conflict \(project_id, visitor_id\)/i);
  assert.match(sql, /on conflict \(id\) do nothing/i);
  assert.match(sql, /not exists\s*\(\s*select 1\s+from public\.messages/is);
  assert.doesNotMatch(sql, /\bloop\b|\bwhile\b|\bfor\s+\w+\s+in\b/i);
  assert.doesNotMatch(sql, /drop\s+(table|column)/i);
});

test("post-deploy cleanup guards reconciliation and drops dependent storage first", async () => {
  const sql = await readMigration(
    "20260716032000_post_deploy_drop_legacy_conversation_storage.sql"
  );

  assert.match(sql, /raise exception.*unreconciled legacy chat sessions/is);

  const leadsDrop = sql.search(/drop table[^;]*lead_captures/i);
  const sessionsDrop = sql.search(/drop table[^;]*chat_sessions/i);
  assert.ok(leadsDrop >= 0, "lead_captures must be dropped");
  assert.ok(
    sessionsDrop > leadsDrop,
    "lead_captures must be dropped before chat_sessions"
  );

  for (const column of [
    "is_voice",
    "is_voice_call",
    "voice_call_id",
    "voice_cost",
    "voice_recording_url",
    "voice_transcript",
    "awaiting_email",
    "pending_question",
    "email_asked",
    "handoff_requested_at",
  ]) {
    assert.match(sql, new RegExp(`drop column if exists ${column}`, "i"));
  }
});
