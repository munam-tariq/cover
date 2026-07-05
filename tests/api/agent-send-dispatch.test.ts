import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

const routePath = new URL(
  "../../apps/api/src/routes/conversations.ts",
  import.meta.url
);

describe("conversations.ts agent send dispatch wiring", () => {
  let src: string;

  it("loads source", async () => {
    src = await readFile(routePath, "utf-8");
    assert.ok(src.length > 0);
  });

  it("imports dispatchToChannel", () => {
    assert.ok(
      src.includes("dispatchToChannel"),
      "Must import dispatchToChannel from outbound-dispatcher"
    );
  });

  it("selects source and visitor_id from conversation", () => {
    const postStart = src.indexOf("Send a message to a conversation");
    const postBlock = src.slice(postStart, postStart + 5000);
    assert.ok(
      postBlock.includes("source") && postBlock.includes("visitor_id"),
      "Must select source and visitor_id in POST /:id/messages"
    );
  });

  it("dispatches whatsapp before message creation and broadcast", () => {
    const postStart = src.indexOf("Send a message to a conversation");
    const postBlock = src.slice(postStart, postStart + 6000);
    const dispatchIdx = postBlock.indexOf("await dispatchToChannel");
    const insertIdx = postBlock.indexOf(".insert({");
    const broadcastIdx = postBlock.indexOf("broadcastNewMessage");

    assert.ok(dispatchIdx !== -1, "Must await dispatchToChannel");
    assert.ok(insertIdx !== -1, "Must insert message after dispatch");
    assert.ok(broadcastIdx !== -1, "Must broadcast after dispatch");
    assert.ok(
      dispatchIdx < insertIdx,
      "Failed WhatsApp dispatch must not create a message row"
    );
    assert.ok(
      dispatchIdx < broadcastIdx,
      "Failed WhatsApp dispatch must not broadcast a sent message"
    );
  });

  it("checks 24h window for whatsapp source", () => {
    const postStart = src.indexOf("Send a message to a conversation");
    const postBlock = src.slice(postStart, postStart + 6000);
    assert.ok(
      postBlock.includes('conversation.source === "whatsapp"') &&
        postBlock.includes("WINDOW_CLOSED"),
      "Must check free-form window for WhatsApp conversations"
    );
  });

  it("checks the 24h window before inserting the message", () => {
    const postStart = src.indexOf("Send a message to a conversation");
    const postBlock = src.slice(postStart, postStart + 6000);
    const dispatchIdx = postBlock.indexOf("await dispatchToChannel");
    const insertIdx = postBlock.indexOf(".insert({");
    assert.ok(dispatchIdx !== -1 && insertIdx !== -1);
    assert.ok(
      dispatchIdx < insertIdx,
      "WINDOW_CLOSED must be rejected before message insert/broadcast"
    );
  });

  it("awaits dispatch instead of fire-and-forget then/catch", () => {
    const postStart = src.indexOf("Send a message to a conversation");
    const postBlock = src.slice(postStart, postStart + 6000);
    assert.ok(postBlock.includes("await dispatchToChannel"));
    assert.ok(!postBlock.includes("dispatchToChannel(id, content).then"));
  });
});
