import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const read = (path: string) => readFile(new URL(path, import.meta.url), "utf8");

test("runtime code no longer falls back to the frozen chat_sessions table", async () => {
  const handoff = await read("../../apps/api/src/routes/handoff.ts");
  const dbIndex = await read("../../packages/db/src/index.ts");

  assert.doesNotMatch(handoff, /\.from\("chat_sessions"\)/);
  assert.doesNotMatch(dbIndex, /queries\/chat/);
  assert.doesNotMatch(dbIndex, /ChatSession/);
});

test("the unused legacy chat query module is gone", async () => {
  await assert.rejects(
    access(new URL("../../packages/db/src/queries/chat.ts", import.meta.url))
  );
});
