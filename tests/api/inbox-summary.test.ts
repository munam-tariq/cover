import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path: string) => readFile(new URL(path, import.meta.url), "utf8");
const stripComments = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

test("inbox summary validates the viewer-local resolved boundary", async () => {
  const handoff = stripComments(
    await read("../../apps/api/src/routes/handoff.ts")
  );

  assert.match(
    handoff,
    /const InboxSummaryQuerySchema = z\.object\(\{\s*resolvedSince: z\.string\(\)\.datetime\(\{ offset: true \}\)\.optional\(\)/
  );
  assert.match(handoff, /InboxSummaryQuerySchema\.safeParse\(req\.query\)/);
  assert.match(handoff, /return res\.status\(400\)\.json/);
});

test("inbox summary owns all exact headline counts", async () => {
  const handoff = stripComments(
    await read("../../apps/api/src/routes/handoff.ts")
  );
  const summary = handoff.slice(
    handoff.indexOf('"/projects/:id/inbox-summary"'),
    handoff.indexOf('"/projects/:id/queue"')
  );

  assert.match(
    summary,
    /const \[queueResult, assignedResult, openResult, resolvedResult\] =\s*await Promise\.all\(/
  );
  assert.ok(
    summary.match(/select\("id", \{ count: "exact", head: true \}\)/g)
      ?.length === 4,
    "all four headline values must be exact count-only queries"
  );
  assert.match(
    summary,
    /\.in\("status", \["ai_active", "waiting", "agent_active"\]\)/
  );
  assert.match(summary, /\.gte\("resolved_at", resolvedSince\)/);
  assert.match(
    summary,
    /if \(!isOwner\) \{\s*resolvedQuery = resolvedQuery\.eq\("assigned_agent_id", userId\)/,
    "members' completed-work count must be personal"
  );
  assert.match(summary, /isOwner,\s*openCount,\s*queueCount,\s*assignedCount,/);
  assert.match(summary, /resolvedTodayCount,/);
  assert.match(summary, /const totalPending = queueCount \+ assignedCount/);
});

test("conversation listing no longer duplicates summary queries", async () => {
  const conversations = stripComments(
    await read("../../apps/api/src/routes/conversations.ts")
  );
  const list = conversations.slice(
    conversations.indexOf('router.get("/"'),
    conversations.indexOf('router.get("/:id"')
  );

  assert.doesNotMatch(list, /resolvedTodayQuery/);
  assert.doesNotMatch(list, /stats: \{ resolvedToday:/);
  assert.doesNotMatch(list, /resolvedSince/);
});
