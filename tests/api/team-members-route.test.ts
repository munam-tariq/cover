import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path: string) => readFile(new URL(path, import.meta.url), "utf8");

test("project members expose authenticated user IDs separately from membership IDs", async () => {
  const route = await read("../../apps/api/src/routes/team.ts");
  const start = route.indexOf('router.get("/:id/members"');
  const end = route.indexOf('router.post("/:id/members/invite"', start);
  const list = route.slice(start, end);

  assert.ok(start >= 0 && end > start);
  assert.match(list, /id: member\.id,[\s\S]*userId: member\.user_id/);
  assert.match(list, /id: project\.user_id,[\s\S]*userId: project\.user_id/);
});
