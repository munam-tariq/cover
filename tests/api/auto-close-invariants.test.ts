/**
 * Auto-close invariants
 *
 * These guard the specific bugs this feature shipped with, each of which was silent and each of
 * which cost a real customer conversation. The state machine itself lives in SQL and is exercised
 * against a real database; what is guarded here is the wiring that has to stay true around it.
 */

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (p: string) => readFile(new URL(p, import.meta.url), "utf8");

const stripComments = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const rpcSql = () => read("../../supabase/migrations/20260715000003_auto_close_rpcs.sql");

// ---------------------------------------------------------------------------
// The voice reply flag — the bug that closed customers mid-sentence
// ---------------------------------------------------------------------------

test("a voice utterance sets the reply flag, not just the activity timestamp", async () => {
  const sql = await rpcSql();
  const fn = sql.slice(sql.indexOf("function public.touch_voice_activity"));
  const body = fn.slice(0, fn.indexOf("$function$;"));

  assert.match(body, /last_voice_activity_at = now\(\)/);
  // CLOSE branch (b) reads the flag and never looks at activity. Without this, a customer warned at
  // 12:00 who starts talking at 12:03 is closed at 12:06 — the flag is the only thing that tells
  // that branch they came back, and voice writes no message to trigger it.
  assert.match(
    body,
    /customer_replied_since_warning\s*=\s*case[\s\S]*auto_close_warning_sent_at is not null[\s\S]*then true/,
    "touch_voice_activity must set the reply flag, mirroring the messages trigger"
  );
});

test("the voice route touches activity through the RPC, awaited, after the silence gate", async () => {
  const voice = await read("../../apps/api/src/routes/voice.ts");
  const stripped = stripComments(voice);

  // DB-side now(): the app clock must never enter the state machine.
  assert.match(stripped, /await supabaseAdmin\.rpc\(\s*"touch_voice_activity"/);
  assert.ok(
    !/last_voice_activity_at:\s*new Date\(\)/.test(stripped),
    "the app clock must not write last_voice_activity_at"
  );

  // Placement: touching before the silence interceptor would record ElevenLabs' synthetic "..."
  // turns as activity and make an idle or crashed call immortal.
  const silenceGate = stripped.indexOf("silenceCounters.delete(sessionId)");
  const touch = stripped.indexOf('"touch_voice_activity"');
  assert.ok(silenceGate > -1 && touch > -1);
  assert.ok(
    touch > silenceGate,
    "activity must be touched AFTER the silence interceptor, or silence counts as activity"
  );
});

// ---------------------------------------------------------------------------
// Localization
// ---------------------------------------------------------------------------

test("copy is chosen by BCP-47 tag with a base-language fallback", async () => {
  const sql = await rpcSql();
  // conversations.metadata.language carries regional tags ('ar-SA'), while p_texts is keyed by base
  // language ('ar'). An exact-key lookup alone silently serves English to every regional tag.
  assert.match(sql, /split_part\(coalesce\(p_language, 'en'\), '-', 1\)/);

  // Neither RPC may hand-roll the lookup again.
  const lookups = sql.match(/p_texts ->> coalesce\(c\.metadata/g) ?? [];
  assert.equal(lookups.length, 0, "use pick_localized_text, not an exact-key lookup");
});

test("the cron broadcasts the text the RPC produced, never re-derived English", async () => {
  const presence = stripComments(
    await read("../../apps/api/src/services/presence.ts")
  );
  // The row's language lives in the database; picking copy in JS broadcasts English over a
  // conversation whose durable message is Arabic.
  assert.ok(
    !/content:\s*AUTO_CLOSE_TEXTS\.en/.test(presence),
    "the close broadcast must use the RPC's close_text"
  );
  assert.ok(
    !/content:\s*INACTIVITY_WARNING_TEXTS\.en/.test(presence),
    "the warning broadcast must use the RPC's warning_text"
  );
});

// ---------------------------------------------------------------------------
// Sticky warning lifecycle
// ---------------------------------------------------------------------------

test("returning a conversation to AI clears the sticky warning", async () => {
  const transition = await read(
    "../../supabase/migrations/20260716024555_atomic_agent_transitions.sql"
  );
  const idx = transition.indexOf(
    "function public.transition_agent_conversation"
  );
  assert.ok(idx > -1);
  const update = transition.slice(idx, transition.indexOf("$function$;", idx));

  // auto_close_warning_sent_at is sticky so a second lapse closes without re-warning. A chat handed
  // back to AI still carrying one would close on its first quiet spell with no warning at all.
  assert.match(
    update,
    /auto_close_warning_sent_at\s*=\s*case[\s\S]*p_next_status = 'ai_active'[\s\S]*then null/
  );
  assert.match(
    update,
    /customer_replied_since_warning\s*=\s*case[\s\S]*p_next_status = 'ai_active'[\s\S]*then false/
  );
});

// ---------------------------------------------------------------------------
// Reopen vs. the in-flight classifier
// ---------------------------------------------------------------------------

test("an insight can only be written against the close it was classified from", async () => {
  const sql = await rpcSql();
  const fn = sql.slice(sql.indexOf("function public.insert_conversation_insights"));
  const body = fn.slice(0, fn.indexOf("$function$;"));

  // resolved_at is the generation token: reopen_conversation() nulls it, a later close stamps a new
  // one. Checking status alone is not enough — a conversation that reopened and re-closed inside the
  // OpenAI window is terminal again, and would swallow the stale verdict.
  assert.match(
    body,
    /c\.resolved_at is not distinct from cd\.resolved_at/,
    "the insert must revalidate the terminal generation, not just the status"
  );
  assert.match(body, /c\.status in \('resolved', 'closed'\)/);

  // Without the lock this is a snapshot read with no re-check, so a reopen committing mid-statement
  // is still overwritten — the race narrows from seconds to milliseconds and survives. The lock is
  // what forces EvalPlanQual to re-check the WHERE against the reopened row.
  assert.match(
    body,
    /for update of c/,
    "the conversations row must be locked, or the WHERE is only a snapshot read"
  );

  // Two overlapping runs can both pass the NOT EXISTS cursor; a bare insert would abort the whole
  // batch rather than the losing row.
  assert.match(body, /on conflict \(conversation_id\) do nothing/);
});

test("the classifier persists through the RPC, carrying the resolved_at it selected", async () => {
  const insights = stripComments(
    await read("../../apps/api/src/services/conversation-insights.ts")
  );

  assert.match(insights, /rpc\(\s*\n?\s*"insert_conversation_insights"/);
  assert.ok(
    !/from\("conversation_insights"\)\s*\.upsert\(/.test(insights),
    "a direct upsert bypasses the generation guard entirely"
  );

  // The bounded batch RPC must return resolved_at and the insert must send that captured value.
  // Re-reading it at write time would read the post-reopen value and defeat the check.
  assert.match(insights, /rpc\(\s*\n?\s*"get_insight_classification_batch"/);
  assert.match(insights, /resolved_at:\s*string/);
  assert.match(insights, /resolvedAt:\s*resolvedAtById\.get\(r\.conversation_id\)/);
  assert.match(insights, /resolved_at:\s*insight\.resolvedAt/);
});

// ---------------------------------------------------------------------------
// Agent capacity
// ---------------------------------------------------------------------------

test("no route hand-rolls a read-modify-write on the chat count", async () => {
  for (const path of [
    "../../apps/api/src/routes/handoff.ts",
    "../../apps/api/src/services/handoff-trigger.ts",
  ]) {
    const src = stripComments(await read(path));
    assert.ok(
      !/current_chat_count:\s*\(?agent(Avail|ail)?/.test(src) &&
        !/current_chat_count:\s*availability\.current_chat_count/.test(src),
      `${path} still increments the chat count by read-modify-write`
    );
    // The builder-in-a-PATCH-body bug: PostgREST rejects it and the whole update fails silently.
    assert.ok(
      !/current_chat_count:\s*supabaseAdmin\.rpc\(/.test(src),
      `${path} passes an unevaluated rpc() builder as a column value`
    );
  }
});

test("claim reserves capacity in the same transaction as the assignment", async () => {
  const sql = await rpcSql();
  const fn = sql.slice(sql.indexOf("function public.claim_conversation"));
  const body = fn.slice(0, fn.indexOf("$function$;"));

  // Locking availability FIRST is what serialises concurrent claims; atomic increments alone would
  // still let two claims pass the capacity read at 4/5 and produce 6 chats against a stored 5.
  const lock = body.indexOf("for update");
  const capacityCheck = body.indexOf("current_chat_count >= v_avail.max_concurrent_chats");
  assert.ok(lock > -1 && capacityCheck > lock, "capacity must be checked under the row lock");
  assert.match(body, /v_avail\.status <> 'online'/, "an offline agent must not be assigned");
});

test("both assignment paths go through the claim RPC", async () => {
  const handoff = stripComments(await read("../../apps/api/src/routes/handoff.ts"));
  const claims = handoff.match(/claimConversation\(/g) ?? [];
  assert.ok(
    claims.length >= 2,
    `expected /claim and direct assignment to both use claimConversation, found ${claims.length}`
  );
});
