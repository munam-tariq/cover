import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path: string) => readFile(new URL(path, import.meta.url), "utf8");

test("conversation cleanup throws when either state-machine RPC fails", async () => {
  const presence = await read("../../apps/api/src/services/presence.ts");
  const cleanup = presence.slice(
    presence.indexOf("export async function closeAbandonedConversations"),
    presence.indexOf("async function deliverCronMessage")
  );

  assert.match(cleanup, /if \(warnError\) \{\s*throw new Error/);
  assert.match(cleanup, /if \(closeError\) \{\s*throw new Error/);
  assert.doesNotMatch(
    cleanup,
    /catch \(error\)[\s\S]*return \{ warned/,
    "a failed database transition must not be reported as a successful zero-row sweep"
  );
});

test("insights cron returns a failure when any project classification failed", async () => {
  const cron = await read("../../apps/api/src/routes/cron.ts");
  const route = cron.slice(
    cron.indexOf('cronRouter.post("/classify-insights"'),
    cron.indexOf('cronRouter.get("/health"')
  );

  assert.match(route, /result\.errors\.length\s*>\s*0/);
  assert.match(route, /throw new Error/);
});
