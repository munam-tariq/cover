import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";

const read = (path: string) => readFile(new URL(path, import.meta.url), "utf8");

async function migrationSql(): Promise<string> {
  const directory = new URL("../../supabase/migrations/", import.meta.url);
  const names = (await readdir(directory)).filter((name) =>
    name.endsWith(".sql")
  );
  return (
    await Promise.all(
      names.map((name) => readFile(new URL(name, directory), "utf8"))
    )
  ).join("\n");
}

test("capacity misses fall back to the queue instead of becoming server errors", async () => {
  const capacity = await read("../../apps/api/src/services/agent-capacity.ts");
  assert.match(capacity, /export function isQueueableClaimResult/);
  for (const result of ["AT_CAPACITY", "NOT_ONLINE", "NO_AVAILABILITY_ROW"]) {
    assert.match(capacity, new RegExp(`case ["']${result}["']`));
  }
  assert.match(capacity, /return true/);
  assert.match(capacity, /default:[\s\S]{0,80}return false/);
});

test("claim validates the conversation project while holding its row lock", async () => {
  const sql = await migrationSql();
  const start = sql.lastIndexOf(
    "create or replace function public.claim_conversation"
  );
  const body = sql.slice(start, sql.indexOf("$function$;", start));

  assert.ok(start > -1);
  assert.match(body, /project_id[\s\S]*into[\s\S]*for update/);
  assert.match(body, /v_project_id\s*<>\s*p_project_id/);
  assert.match(body, /return 'WRONG_PROJECT'/);
});

test("agent release changes status and capacity in one locked transaction", async () => {
  const sql = await migrationSql();
  const start = sql.lastIndexOf(
    "create or replace function public.transition_agent_conversation"
  );
  assert.ok(start > -1, "transition_agent_conversation RPC is missing");
  const body = sql.slice(start, sql.indexOf("$function$;", start));

  const availabilityLock = body.indexOf("from agent_availability");
  const conversationLock = body.indexOf("from conversations", availabilityLock);
  assert.ok(availabilityLock > -1 && conversationLock > availabilityLock);
  assert.match(
    body,
    /current_chat_count\s*=\s*greatest\(current_chat_count - 1, 0\)/
  );
  assert.match(body, /status = p_next_status/);
});

test("resolve and transfer routes use the atomic release transition", async () => {
  const handoff = await read("../../apps/api/src/routes/handoff.ts");
  const transferStart = handoff.indexOf('"/conversations/:id/transfer"');
  const resolveStart = handoff.indexOf('"/conversations/:id/resolve"');
  const resolveEnd = handoff.indexOf('"/projects/:id/inbox-summary"');

  assert.ok(transferStart > -1 && resolveStart > transferStart);
  assert.ok(resolveEnd > resolveStart);

  const transfer = handoff.slice(transferStart, resolveStart);
  const resolve = handoff.slice(resolveStart, resolveEnd);

  assert.match(transfer, /transitionAgentConversation\(/);
  assert.match(resolve, /transitionAgentConversation\(/);
  assert.doesNotMatch(transfer, /decrementChatCount\(/);
  assert.doesNotMatch(resolve, /decrementChatCount\(/);
});

test("auto-offline never erases capacity held by active assignments", async () => {
  const presence = await read("../../apps/api/src/services/presence.ts");
  const statuses = presence.slice(
    presence.indexOf("export async function checkAndUpdateAgentStatuses"),
    presence.indexOf("// Conversation Cleanup")
  );
  assert.doesNotMatch(statuses, /current_chat_count/);
});

test("capacity RPC wrappers throw on database errors and missing rows", async () => {
  const capacity = await read("../../apps/api/src/services/agent-capacity.ts");
  assert.doesNotMatch(capacity, /if \(error\) \{[\s\S]{0,180}console\.error/);
  assert.match(capacity, /if \(error\)[\s\S]{0,120}throw new Error/);
  assert.match(capacity, /data == null[\s\S]{0,120}throw new Error/);
});

test("capacity reconciliation stores the exact active assignment count", async () => {
  const sql = await read(
    "../../supabase/migrations/20260716031200_exact_agent_capacity_reconciliation.sql"
  );

  assert.match(
    sql,
    /drop constraint if exists agent_availability_check/i,
    "the historical max-capacity CHECK prevents representing an already-over-capacity agent"
  );
  assert.match(
    sql,
    /select count\(\*\)::integer[\s\S]*status = 'agent_active'/i
  );
  assert.doesNotMatch(sql, /\bleast\s*\(/i);
});
