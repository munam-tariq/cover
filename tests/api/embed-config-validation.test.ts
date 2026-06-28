import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const embedPath = new URL(
  "../../apps/api/src/routes/embed.ts",
  import.meta.url
);

function extractConfigRoute(source: string) {
  const start = source.indexOf('"/config/:projectId"');
  assert.notEqual(start, -1, "embed config route should exist");

  const validateStart = source.indexOf('"/validate/:projectId"', start);
  assert.notEqual(validateStart, -1, "validate route should follow config route");

  return source.slice(start, validateStart);
}

test("embed config rejects malformed project ids instead of returning fallback config", async () => {
  const source = await readFile(embedPath, "utf8");
  const route = extractConfigRoute(source);

  assert.match(route, /INVALID_ID/);
  assert.match(route, /Invalid project ID format/);
});
