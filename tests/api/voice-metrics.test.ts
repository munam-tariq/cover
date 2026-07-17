/**
 * Voice metrics
 *
 * "Is a voice call" was never a property of a conversation — conversations are hybrid text+voice,
 * and multi-call is the norm (staging has single conversations with 27, 19 and 11 calls). The KPI
 * was built on `conversations.is_voice_call`, a column written by no code at all, so on staging it
 * reported 0 for the one project holding all 79 real calls and phantom 4/3 for two projects that
 * have never had one. Calls are counted from the per-call summary message session-end writes.
 */

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (p: string) => readFile(new URL(p, import.meta.url), "utf8");

const stripComments = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

test("no reader is left on the is_voice_call fossil", async () => {
  for (const path of [
    "../../apps/api/src/routes/analytics.ts",
    "../../apps/api/src/routes/conversations.ts",
    "../../apps/api/src/services/conversation-insights.ts",
  ]) {
    const src = stripComments(await read(path));
    assert.ok(
      !/is_voice_call/.test(src),
      `${path} still reads is_voice_call, which nothing writes`
    );
  }
});

test("voice metrics use one database aggregate instead of a capped row fetch", async () => {
  const analytics = stripComments(await read("../../apps/api/src/routes/analytics.ts"));
  const start = analytics.indexOf('analyticsRouter.get("/leads-summary"');
  const route = analytics.slice(start, analytics.indexOf('analyticsRouter.get("/timeline"'));

  assert.match(route, /\.rpc\(\s*"get_voice_metrics"/);
  assert.match(route, /p_project_id:\s*projectId/);
  assert.match(route, /p_start:/);
  assert.match(route, /p_end:/);
  assert.match(route, /p_source:\s*source/);
  assert.doesNotMatch(
    route,
    /\.from\("messages"\)[\s\S]*metadata->>voice_summary/,
    "fetching summary rows is capped by the Data API row limit"
  );
  assert.match(route, /if \(voiceError\) throw voiceError/);
});

test("the SQL aggregate counts every call and safely sums numeric duration metadata", async () => {
  const sql = stripComments(
    await read("../../supabase/migrations/20260716025815_voice_analytics_aggregate.sql")
  );

  assert.match(sql, /function public\.get_voice_metrics/);
  assert.match(sql, /count\(\*\)/);
  assert.match(sql, /metadata\s*@>\s*'\{"voice_summary":\s*true\}'::jsonb/);
  assert.match(sql, /jsonb_typeof\(m\.metadata->'durationSeconds'\)\s*=\s*'number'/);
  assert.match(sql, /sum\(/);
  assert.match(sql, /m\.created_at\s*>=\s*p_start/);
  assert.match(sql, /m\.created_at\s*<\s*p_end/);
  assert.match(sql, /p_source is null or c\.source = p_source/);
  assert.match(sql, /p_conversation_id is null or m\.conversation_id = p_conversation_id/);
  assert.match(sql, /set search_path = ''/);
  assert.match(sql, /grant execute[\s\S]*service_role/);
});

test("conversation detail reuses the same aggregate for complete per-thread totals", async () => {
  const conversations = stripComments(
    await read("../../apps/api/src/routes/conversations.ts")
  );
  const start = conversations.indexOf('router.get("/:id"');
  const detail = conversations.slice(start, conversations.indexOf('router.patch("/:id"'));

  assert.match(detail, /rpc\(\s*"get_voice_metrics"/);
  assert.match(detail, /p_conversation_id:\s*conversation\.id/);
  assert.match(detail, /voiceCallCount:/);
  assert.match(detail, /voiceTalkSeconds:/);
  assert.match(detail, /if \(voiceMetricsError\)/);
});

test("the forward writer records the duration the metric reads", async () => {
  const voice = stripComments(await read("../../apps/api/src/routes/voice.ts"));
  // The backfill fixed 79 rows of history; without this every NEW call writes {voice_summary:true}
  // only and the metric is incomplete from day one. Rounded to match the backfill's integers.
  assert.match(voice, /voice_summary:\s*true/);
  assert.match(voice, /durationSeconds:[\s\S]{0,80}Math\.round\(durationSeconds\)/);
});
