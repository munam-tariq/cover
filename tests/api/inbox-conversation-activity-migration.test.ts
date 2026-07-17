import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path: string) => readFile(new URL(path, import.meta.url), "utf8");
const stripComments = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*--.*$/gm, "");

const migration = async () =>
  stripComments(
    await read(
      "../../supabase/migrations/20260716074341_inbox_conversation_activity.sql"
    )
  );

const indexOrderMigration = async () =>
  stripComments(
    await read(
      "../../supabase/migrations/20260716080000_inbox_activity_index_order.sql"
    )
  );

const automatedEventMigration = async () =>
  stripComments(
    await read(
      "../../supabase/migrations/20260716090000_inbox_exclude_automated_events.sql"
    )
  );

const activityNotNullMigration = async () =>
  stripComments(
    await read(
      "../../supabase/migrations/20260716091000_inbox_meaningful_activity_not_null.sql"
    )
  );

test("conversation activity columns exclude system messages by contract", async () => {
  const sql = await migration();

  assert.match(
    sql,
    /add column if not exists needs_reply boolean not null default false/
  );
  assert.match(
    sql,
    /add column if not exists last_conversation_message_at timestamptz/
  );
  assert.match(sql, /add column if not exists last_conversation_preview text/);
  assert.match(
    sql,
    /add column if not exists last_conversation_sender_type text/
  );
  assert.match(sql, /generated always as[\s\S]*greatest[\s\S]*stored/);
  assert.match(sql, /when new\.sender_type = 'customer' then true/);
  assert.match(sql, /when new\.sender_type in \('ai', 'agent'\) then false/);
  assert.match(sql, /else needs_reply/);
});

test("activity backfill is deterministic and set based", async () => {
  const sql = await migration();

  assert.match(sql, /where sender_type in \('customer', 'ai', 'agent'\)/);
  assert.match(sql, /order by conversation_id, created_at desc, id desc/);
  assert.doesNotMatch(sql, /for\s+\w+\s+in\s+select/i);

  const disable = sql.indexOf(
    "alter table public.conversations disable trigger update_conversations_updated_at"
  );
  const update = sql.indexOf("update public.conversations conversation");
  const enable = sql.indexOf(
    "alter table public.conversations enable trigger update_conversations_updated_at"
  );
  assert.ok(disable >= 0 && disable < update);
  assert.ok(enable > update);
});

test("activity migration preserves trigger hardening and adds ordered indexes", async () => {
  const sql = await migration();

  assert.match(
    sql,
    /function public\.update_conversation_message_count\(\)[\s\S]*set search_path to 'public', 'pg_temp'/
  );
  assert.match(
    sql,
    /idx_conversations_project_meaningful_activity[\s\S]*project_id, meaningful_activity_at desc, id/
  );
  assert.match(
    sql,
    /idx_conversations_agent_needs_reply[\s\S]*project_id, last_customer_message_at, id[\s\S]*where status = 'agent_active' and needs_reply/
  );
  assert.match(
    sql,
    /idx_conversations_waiting_queue[\s\S]*project_id, queue_entered_at, id[\s\S]*where status = 'waiting'/
  );
});

test("recent activity index matches the RPC null ordering", async () => {
  const sql = await indexOrderMigration();

  assert.match(
    sql,
    /drop index if exists public\.idx_conversations_project_meaningful_activity/
  );
  assert.match(
    sql,
    /idx_conversations_project_meaningful_activity[\s\S]*project_id,\s*meaningful_activity_at desc nulls last,\s*id/
  );
});

test("automated event metadata cannot replace conversational inbox state", async () => {
  const sql = await automatedEventMigration();

  assert.match(
    sql,
    /is_conversation_message boolean :=[\s\S]*new\.sender_type in \('customer', 'ai', 'agent'\)[\s\S]*not \(new\.metadata \? 'event'\)/
  );
  assert.match(
    sql,
    /when is_conversation_message then new\.created_at[\s\S]*else last_conversation_message_at/
  );
  assert.match(
    sql,
    /when is_conversation_message and new\.sender_type = 'customer' then true[\s\S]*when is_conversation_message and new\.sender_type in \('ai', 'agent'\) then false[\s\S]*else needs_reply/
  );
});

test("automated event repair is deterministic, set based, and clears event-only rows", async () => {
  const sql = await automatedEventMigration();

  assert.match(
    sql,
    /where sender_type in \('customer', 'ai', 'agent'\)[\s\S]*and not \(metadata \? 'event'\)/
  );
  assert.match(sql, /order by conversation_id, created_at desc, id desc/);
  assert.match(
    sql,
    /from public\.conversations conversation[\s\S]*left join latest_conversation_message latest/
  );
  assert.match(
    sql,
    /update public\.conversations conversation[\s\S]*from reconciled[\s\S]*where conversation\.id = reconciled\.conversation_id/
  );
  assert.doesNotMatch(sql, /for\s+\w+\s+in\s+select/i);
});

test("the generated meaningful activity type is non-null in the database contract", async () => {
  const sql = await activityNotNullMigration();

  assert.match(
    sql,
    /alter table public\.conversations[\s\S]*alter column meaningful_activity_at set not null/
  );
});
