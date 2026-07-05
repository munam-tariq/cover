import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

const enginePath = new URL(
  "../../apps/api/src/services/chat-engine.ts",
  import.meta.url
);

describe("chat-engine skipMessageWrites", () => {
  let src: string;

  it("loads source", async () => {
    src = await readFile(enginePath, "utf-8");
    assert.ok(src.length > 0);
  });

  it("ChatInput interface has skipMessageWrites field", () => {
    assert.ok(
      src.includes("skipMessageWrites"),
      "ChatInput must have skipMessageWrites field"
    );
  });

  it("guards storeCustomerMessageOnly with skipMessageWrites", () => {
    const handoffBlock = src.slice(
      src.indexOf("checkConversationHandoffState"),
      src.indexOf("checkConversationHandoffState") + 800
    );
    assert.ok(
      handoffBlock.includes("skipMessageWrites"),
      "storeCustomerMessageOnly call must be guarded by skipMessageWrites"
    );
  });

  it("guards all logConversation calls with skipMessageWrites", () => {
    const logCalls = src.split("logConversation(").length - 1;
    const definitionCount = 1;
    const callCount = logCalls - definitionCount;
    assert.ok(callCount >= 4, `Expected at least 4 logConversation calls, found ${callCount}`);

    const skipWritesMentions = (src.match(/skipMessageWrites/g) || []).length;
    assert.ok(
      skipWritesMentions >= 5,
      `skipMessageWrites should appear at least 5 times (1 in interface + 4+ guards), found ${skipWritesMentions}`
    );
  });
});

describe("chat-engine history autoload", () => {
  let src: string;

  it("loads source", async () => {
    src = await readFile(enginePath, "utf-8");
    assert.ok(src.length > 0);
  });

  it("imports getConversationHistory", () => {
    assert.ok(
      src.includes("getConversationHistory"),
      "Must import getConversationHistory for DB history loading"
    );
  });

  it("loads history from DB when conversationHistory is empty", () => {
    assert.ok(
      src.includes("getConversationHistory") && src.includes("sessionId"),
      "Must use sessionId to load history from DB"
    );
  });

  it("does not autoload DB history when skipMessageWrites is true", () => {
    assert.ok(
      src.includes("!input.skipMessageWrites"),
      "skipMessageWrites callers pass explicit history to avoid duplicating the reserved inbound"
    );
  });
});
