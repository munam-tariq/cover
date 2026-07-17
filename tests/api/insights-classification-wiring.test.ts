import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path: string) => readFile(new URL(path, import.meta.url), "utf8");
const stripComments = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*--.*$/gm, "").replace(/^\s*\/\/.*$/gm, "");

test("the classifier reads one bounded cross-project batch", async () => {
  const source = stripComments(
    await read("../../apps/api/src/services/conversation-insights.ts")
  );

  assert.match(source, /rpc\(\s*"get_insight_classification_batch"/);
  assert.match(source, /p_project_ids:\s*eligibleProjectIds/);
  assert.match(source, /p_message_limit:\s*MAX_MESSAGES_PER_CONVERSATION/);
  assert.doesNotMatch(source, /function classifyProject\(/);
  assert.doesNotMatch(
    source,
    /\.from\("messages"\)[\s\S]*\.in\("conversation_id"/,
    "a raw message fetch is both unbounded and capped by PostgREST"
  );
});

test("the database batch uses the terminal cursor and limits messages per conversation", async () => {
  const sql = stripComments(
    await read("../../supabase/migrations/20260716030254_insights_classification_batch.sql")
  );

  assert.match(sql, /function public\.get_insight_classification_batch/);
  assert.match(sql, /c\.status in \('resolved', 'closed'\)/);
  assert.match(sql, /c\.last_customer_message_at is not null/);
  assert.match(sql, /not exists[\s\S]*conversation_insights/);
  assert.match(sql, /row_number\(\) over[\s\S]*partition by m\.conversation_id/);
  assert.match(sql, /message_rank <= p_message_limit/);
  assert.match(sql, /not coalesce\(m\.metadata \? 'event', false\)/);
  assert.match(sql, /limit p_limit/);
  assert.match(sql, /set search_path = ''/);
  assert.match(sql, /grant execute[\s\S]*service_role/);
});

test("topic normalization labels are fetched in one per-project-bounded query", async () => {
  const service = stripComments(
    await read("../../apps/api/src/services/conversation-insights.ts")
  );
  const sql = stripComments(
    await read("../../supabase/migrations/20260716030254_insights_classification_batch.sql")
  );

  assert.match(service, /rpc\(\s*"get_recent_insight_topics"/);
  assert.match(sql, /function public\.get_recent_insight_topics/);
  assert.match(sql, /row_number\(\) over[\s\S]*partition by (?:\w+\.)?project_id/);
  assert.match(sql, /topic_rank <= p_limit/);
});
