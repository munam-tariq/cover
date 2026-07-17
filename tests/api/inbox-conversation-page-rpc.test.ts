import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path: string) => readFile(new URL(path, import.meta.url), "utf8");
const stripComments = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*--.*$/gm, "");

const migration = async () =>
  stripComments(
    await read(
      "../../supabase/migrations/20260716074557_inbox_conversation_page_rpc.sql"
    )
  );

test("inbox page RPC has a fixed safe service-role-only contract", async () => {
  const sql = await migration();

  assert.match(
    sql,
    /function public\.get_inbox_conversation_page\(\s*p_project_id uuid,\s*p_viewer_id uuid,\s*p_scope text default 'mine'/
  );
  assert.match(sql, /returns jsonb/);
  assert.match(sql, /language sql/);
  assert.match(sql, /stable/);
  assert.match(sql, /security invoker/);
  assert.match(sql, /set search_path = ''/);
  assert.doesNotMatch(sql, /\bexecute\b\s+(format|v_sql)/i);
  assert.doesNotMatch(sql, /security definer/i);

  for (const role of ["public", "anon", "authenticated"]) {
    assert.match(
      sql,
      new RegExp(
        `revoke all on function public\\.get_inbox_conversation_page\\([\\s\\S]*?from ${role}`
      )
    );
  }
  assert.match(
    sql,
    /grant execute on function public\.get_inbox_conversation_page\([\s\S]*to service_role/
  );
});

test("inbox page RPC applies every approved filter before pagination", async () => {
  const sql = await migration();

  assert.match(sql, /conversation\.project_id = p_project_id/);
  assert.match(
    sql,
    /when 'active' then conversation\.status in \('ai_active', 'agent_active'\)/
  );
  assert.match(
    sql,
    /p_status = 'waiting'\s*or p_scope = 'all'\s*or conversation\.assigned_agent_id = p_viewer_id/
  );
  assert.match(sql, /p_source is null or conversation\.source = p_source/);
  assert.match(sql, /not p_needs_reply[\s\S]*conversation\.needs_reply/);
  assert.match(
    sql,
    /not p_voice_used[\s\S]*last_voice_activity_at is not null[\s\S]*voice_ended_reason is not null/
  );
  assert.match(sql, /p_assigned_agent = 'unassigned'/);
  assert.match(sql, /p_assigned_agent = 'me'/);
  assert.match(
    sql,
    /p_handoff_reason is null[\s\S]*or conversation\.handoff_reason = p_handoff_reason/
  );
  assert.match(sql, /when '24h' then interval '24 hours'/);
  assert.match(sql, /not p_flagged_only or customer\.is_flagged is true/);
});

test("inbox page RPC owns stable mixed-direction ordering and exact totals", async () => {
  const sql = await migration();

  assert.match(
    sql,
    /case when p_sort = 'attention' then priority_rank end asc/
  );
  assert.match(
    sql,
    /status = 'waiting'[\s\S]*priority_at[\s\S]*asc nulls last/
  );
  assert.match(
    sql,
    /status = 'agent_active'[\s\S]*and needs_reply[\s\S]*priority_at[\s\S]*asc nulls last/
  );
  assert.match(
    sql,
    /p_sort = 'recent'[\s\S]*meaningful_activity_at[\s\S]*desc nulls last/
  );
  assert.match(sql, /id asc/);
  assert.match(
    sql,
    /jsonb_build_object\([\s\S]*'total'[\s\S]*count\(\*\) from filtered[\s\S]*'items'/
  );
  assert.match(sql, /offset \(p_page::bigint - 1\) \* p_limit::bigint/);
  assert.match(sql, /limit p_limit/);
});
