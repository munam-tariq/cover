import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path: string) => readFile(new URL(path, import.meta.url), "utf8");
const stripComments = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const listRoute = async () => {
  const route = stripComments(
    await read("../../apps/api/src/routes/conversations.ts")
  );
  return route.slice(
    route.indexOf('router.get("/"'),
    route.indexOf('router.get("/:id"')
  );
};

test("conversation list validates the complete inbox query without boolean coercion", async () => {
  const route = await read("../../apps/api/src/routes/conversations.ts");
  const list = await listRoute();

  assert.match(
    route,
    /const OptionalQueryBooleanSchema = z[\s\S]*value === "true"/
  );
  assert.match(list, /InboxListQuerySchema\.safeParse\(req\.query\)/);
  assert.doesNotMatch(list, /z\.coerce\.boolean/);
  assert.match(list, /needsReply/);
  assert.match(list, /voiceUsed/);
  assert.match(list, /assignedAgent/);
  assert.match(list, /handoffReason/);
  assert.match(list, /activityPeriod/);
  assert.match(list, /flagged/);
  assert.match(
    route,
    /page: z\.coerce\.number\(\)\.int\(\)\.min\(1\)\.max\(INBOX_CONFIG\.MAX_PAGE\)/
  );
});

test("conversation list enforces role and incompatible-filter boundaries", async () => {
  const list = await listRoute();

  assert.match(
    list,
    /if \(!isOwner && scope === "all" && status !== "waiting"\)/
  );
  assert.match(list, /if \(!isOwner && assignedAgent\)/);
  assert.match(
    list,
    /if \([\s\S]*isOwner &&[\s\S]*assignedAgent &&[\s\S]*\(scope !== "all" \|\| status === "waiting"\)[\s\S]*\)/
  );
  assert.match(list, /status === "waiting" \? "all" : scope/);
  assert.match(
    list,
    /TERMINAL_INBOX_STATUSES\.has\(status\)[\s\S]*\? "recent"[\s\S]*: sort/
  );
});

test("conversation list uses one ordered RPC, one bounded detail read, and one agent batch", async () => {
  const list = await listRoute();

  assert.match(list, /getInboxConversationPage\(/);
  assert.match(list, /if \(orderPage\.items\.length === 0\)/);
  assert.match(list, /\.in\("id", conversationIds\)/);
  assert.match(list, /const conversationById = new Map/);
  assert.match(list, /orderPage\.items\.flatMap/);
  assert.match(list, /getAgentNames\(agentIds, projectId\)/);
  assert.doesNotMatch(list, /\.order\("last_message_at"/);
  assert.doesNotMatch(list, /\.range\(/);
});

test("conversation list returns truthful non-system activity fields", async () => {
  const list = await read("../../apps/api/src/routes/conversations.ts");

  assert.match(list, /last_conversation_preview/);
  assert.match(list, /last_conversation_sender_type/);
  assert.match(list, /last_conversation_message_at/);
  assert.match(list, /meaningful_activity_at/);
  assert.match(list, /needsReply: conv\.needs_reply/);
  assert.match(
    list,
    /conv\.last_voice_activity_at != null \|\| conv\.voice_ended_reason != null/
  );
  assert.match(list, /priorityReason: orderItem\.priority_reason/);
  assert.match(list, /priorityAt: orderItem\.priority_at/);
});
