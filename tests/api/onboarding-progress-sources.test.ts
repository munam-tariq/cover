import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const routeFile = path.join(process.cwd(), "apps/api/src/routes/projects.ts");

/**
 * Slice out just the onboarding handler. Elsewhere in the API a legacy
 * chat_sessions read is still a deliberate fallback, so scanning the whole
 * file would be wrong.
 */
async function loadOnboardingHandler(): Promise<string> {
  const src = await readFile(routeFile, "utf8");
  const start = src.indexOf('router.get("/:id/onboarding"');
  assert.ok(start !== -1, "expected a GET /:id/onboarding handler");
  const end = src.indexOf("router.", start + 1);
  return src.slice(start, end === -1 ? undefined : end);
}

test("onboarding progress never counts the frozen chat_sessions table", async () => {
  const handler = await loadOnboardingHandler();
  // chat_sessions stopped receiving writes at 20250115000003_migrate_chat_sessions.
  // Counting it pinned the playground and embed steps to incomplete forever, so
  // no project created after that migration could pass 2/4.
  assert.doesNotMatch(handler, /chat_sessions/);
  assert.match(handler, /\.from\("conversations"\)/);
});

test("playground step counts playground conversations", async () => {
  const handler = await loadOnboardingHandler();
  assert.match(handler, /\.eq\("source", "playground"\)/);
});

test("embed step counts every surface that reaches real end customers", async () => {
  const src = await readFile(routeFile, "utf8");
  const declaration = src.match(/LIVE_DEPLOYMENT_SOURCES\s*=\s*\[([^\]]*)\]/);
  assert.ok(declaration, "expected a LIVE_DEPLOYMENT_SOURCES declaration");

  const sources = [...declaration[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(sources.sort(), ["mobile", "public", "widget"]);

  const handler = await loadOnboardingHandler();
  assert.match(handler, /\.in\("source", LIVE_DEPLOYMENT_SOURCES\)/);
});
