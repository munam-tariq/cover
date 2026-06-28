import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const openApiPath = new URL("../../mobile-sdk/openapi.yaml", import.meta.url);
const guidePath = new URL("../../mobile-sdk/INTEGRATION_GUIDE.md", import.meta.url);

test("OpenAPI documents session token headers on continued chat and handoff", async () => {
  const source = await readFile(openApiPath, "utf8");

  const chatStart = source.indexOf("  /api/chat/message:");
  const chatEnd = source.indexOf("  /api/chat/ensure-conversation:", chatStart);
  const handoffStart = source.indexOf("  /api/conversations/{conversationId}/handoff:");
  const handoffEnd = source.indexOf("  /api/widget/conversations/{conversationId}/status:", handoffStart);

  assert.notEqual(chatStart, -1, "expected chat message path");
  assert.notEqual(chatEnd, -1, "expected chat message section boundary");
  assert.notEqual(handoffStart, -1, "expected handoff path");
  assert.notEqual(handoffEnd, -1, "expected handoff section boundary");

  assert.match(source.slice(chatStart, chatEnd), /SessionTokenHeader/);
  assert.match(source.slice(handoffStart, handoffEnd), /SessionTokenHeader/);
});

test("OpenAPI documents sessionToken returned by ensure-conversation and chat message", async () => {
  const source = await readFile(openApiPath, "utf8");

  const ensureStart = source.indexOf("  /api/chat/ensure-conversation:");
  const ensureEnd = source.indexOf("  /api/projects/{projectId}/handoff-availability:", ensureStart);
  const responseStart = source.indexOf("    ChatMessageResponse:");
  const responseEnd = source.indexOf("    HandoffAvailability:", responseStart);

  assert.notEqual(ensureStart, -1, "expected ensure-conversation path");
  assert.notEqual(ensureEnd, -1, "expected ensure-conversation boundary");
  assert.notEqual(responseStart, -1, "expected chat response schema");
  assert.notEqual(responseEnd, -1, "expected chat response boundary");

  assert.match(source.slice(ensureStart, ensureEnd), /sessionToken/);
  assert.match(source.slice(responseStart, responseEnd), /sessionToken/);
});

test("mobile integration guide tells clients to send the session token on continued messages", async () => {
  const source = await readFile(guidePath, "utf8");
  assert.match(
    source,
    /Subsequent messages:[\s\S]*X-FrontFace-Session: <sessionToken>/
  );
  assert.match(
    source,
    /sessionToken[\s\S]*authorizes continued chat messages/
  );
});
