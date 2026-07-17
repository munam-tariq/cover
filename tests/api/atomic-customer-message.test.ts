import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";

const read = (path: string) => readFile(new URL(path, import.meta.url), "utf8");

async function migrationSql(): Promise<string> {
  const directory = new URL("../../supabase/migrations/", import.meta.url);
  const files = (await readdir(directory)).filter((name) => name.endsWith(".sql"));
  return (
    await Promise.all(files.map((name) => readFile(new URL(name, directory), "utf8")))
  ).join("\n");
}

test("customer message insertion locks, reopens, and inserts in one database transaction", async () => {
  const sql = await migrationSql();
  const start = sql.lastIndexOf(
    "create or replace function public.append_customer_message"
  );
  assert.ok(start > -1, "append_customer_message RPC is missing");
  const body = sql.slice(start, sql.indexOf("$function$;", start));
  const reopenStart = sql.lastIndexOf(
    "create or replace function public.reopen_conversation",
    start
  );
  const reopenBody = sql.slice(
    reopenStart,
    sql.indexOf("$function$;", reopenStart)
  );

  const reopen = body.indexOf("reopen_conversation");
  const insert = body.indexOf("insert into messages");
  assert.ok(reopen > -1 && insert > reopen);
  assert.match(reopenBody, /for update/);
  assert.match(body, /customer_last_seen_at\s*=\s*now\(\)/);
  assert.match(body, /customer_presence\s*=\s*'online'/);
});

test("the privileged customer-message RPC is service-role only", async () => {
  const sql = await migrationSql();
  assert.match(
    sql,
    /revoke all on function public\.append_customer_message\(uuid, text, jsonb, uuid\) from public, anon, authenticated/
  );
  assert.match(
    sql,
    /grant execute on function public\.append_customer_message\(uuid, text, jsonb, uuid\) to service_role/
  );
});

test("all live customer message writers use the shared append service", async () => {
  const conversation = await read("../../apps/api/src/services/conversation.ts");
  const chatEngine = await read("../../apps/api/src/services/chat-engine.ts");

  assert.match(conversation, /export async function appendCustomerMessage/);
  assert.match(conversation, /rpc\(\s*"append_customer_message"/);
  assert.match(chatEngine, /await appendCustomerMessage\(/);
  assert.doesNotMatch(
    chatEngine,
    /sender_type:\s*"customer"/,
    "chat-engine must not bypass the atomic append path"
  );
});

test("conversation lookup no longer performs a racy pre-message reopen", async () => {
  const conversation = await read("../../apps/api/src/services/conversation.ts");
  const lookup = conversation.slice(
    conversation.indexOf("export async function getOrCreateConversation"),
    conversation.indexOf("export async function getConversationLanguage")
  );

  assert.doesNotMatch(lookup, /reopen_conversation/);
});

test("normal chat waits for durable message logging before returning", async () => {
  const chatEngine = await read("../../apps/api/src/services/chat-engine.ts");
  const calls = [...chatEngine.matchAll(/(?:^|\n)(\s*)(await\s+)?logConversation\(/g)];
  assert.ok(calls.length >= 4);
  for (const call of calls) {
    assert.equal(call[2], "await ", "logConversation call is still fire-and-forget");
  }
});
