import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

// Static regression guard: public, service-role-backed routes must stay behind a gate, and the
// removed IDOR endpoints must not come back. Reads source rather than booting the app.

const read = (p: string) => readFileSync(p, "utf8");

test("public widget route files use the shared public widget gate", () => {
  for (const f of [
    "apps/api/src/routes/lead-capture.ts",
    "apps/api/src/routes/pulse.ts",
    "apps/api/src/routes/handoff.ts",
    "apps/api/src/routes/chat.ts",
    "apps/api/src/routes/conversations.ts",
  ]) {
    assert.match(
      read(f),
      /requirePublicWidgetAccess/,
      `${f} must gate its public routes with requirePublicWidgetAccess`
    );
  }
});

test("chat message route uses the enforced public widget gate, not the legacy domain shortcut", () => {
  const src = read("apps/api/src/routes/chat.ts");
  const messageRoute = src.match(
    /chatRouter\.post\(\s*"\/message",[\s\S]*?chatRateLimiter,/
  )?.[0];

  assert.ok(messageRoute, "chat message route should exist");
  assert.match(messageRoute, /requirePublicWidgetAccess\(/);
  assert.doesNotMatch(messageRoute, /requireClientKeyOrDomain/);
});

test("legacy public chat-history endpoints stay removed (IDOR)", () => {
  const src = read("apps/api/src/routes/chat.ts");
  assert.doesNotMatch(src, /chatRouter\.get\("\/conversations"/);
  assert.doesNotMatch(src, /chatRouter\.get\("\/conversations\/:id"/);
});

test("widget per-conversation reads are session-token gated", () => {
  const src = read("apps/api/src/routes/conversations.ts");
  assert.match(src, /"\/:id\/status",\s*requireWidgetSession\(\)/);
  assert.match(src, /"\/:id\/messages\/public",\s*requireWidgetSession\(\)/);
});

test("the conversation handoff trigger is session-token gated", () => {
  const src = read("apps/api/src/routes/handoff.ts");
  assert.match(src, /"\/conversations\/:id\/handoff",\s*requireWidgetSession\(\)/);
});
