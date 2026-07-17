import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path: string) => readFile(new URL(path, import.meta.url), "utf8");

test("voice callbacks fail closed through the shared exact-binding guard", async () => {
  const route = await read("../../apps/api/src/routes/voice.ts");

  assert.match(route, /assertVoiceSessionBinding\(claims,\s*\{[\s\S]*?projectId,[\s\S]*?visitorId,[\s\S]*?sessionId/);
  assert.doesNotMatch(route, /Voice LLM:monitor/);
  assert.doesNotMatch(route, /WIDGET_GATE_ENFORCE/);
});

test("voice config verifies a supplied conversation before signing it", async () => {
  const route = await read("../../apps/api/src/routes/voice.ts");
  const configRoute = route.slice(
    route.indexOf('"/config/:projectId"'),
    route.indexOf("// Route B:")
  );

  assert.match(configRoute, /from\("conversations"\)/);
  assert.match(configRoute, /project_id/);
  assert.match(configRoute, /visitor_id/);
  assert.match(configRoute, /assertVoiceConversationOwnership/);
});

test("session-end requires and verifies the same voice session token", async () => {
  const route = await read("../../apps/api/src/routes/voice.ts");
  const sessionEnd = route.slice(route.indexOf('router.post("/session-end"'));

  assert.match(sessionEnd, /voiceSessionToken/);
  assert.match(sessionEnd, /verifyVoiceSessionToken\(voiceSessionToken\)/);
  assert.match(sessionEnd, /assertVoiceSessionBinding\(claims/);
});

test("both browser clients return the issued token to session-end", async () => {
  for (const path of [
    "../../apps/widget/src/components/chat-window.ts",
    "../../apps/web/app/[locale]/c/[handle]/use-voice-call.ts",
  ]) {
    const source = await read(path);
    assert.match(source, /voiceSessionToken/);
  }
});
