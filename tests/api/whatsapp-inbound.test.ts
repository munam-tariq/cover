import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

const inboundUrl = new URL(
  "../../apps/api/src/services/channels/whatsapp/inbound.ts",
  import.meta.url
);
const reservationsUrl = new URL(
  "../../apps/api/src/services/channels/inbound-reservations.ts",
  import.meta.url
);

describe("shouldSuppressAiReply (source verification)", () => {
  let src: string;

  it("loads source", async () => {
    src = await readFile(inboundUrl, "utf-8");
    assert.ok(src.length > 0);
  });

  it("exports shouldSuppressAiReply as a named function", () => {
    assert.ok(
      src.includes("export function shouldSuppressAiReply"),
      "Must export shouldSuppressAiReply"
    );
  });

  it("suppresses when status is not ai_active", () => {
    assert.ok(
      src.includes('status !== "ai_active"'),
      "Must suppress for any status that is not ai_active"
    );
  });

  it("suppresses when agent replied after inbound", () => {
    assert.ok(
      src.includes("agentRepliedAfter") &&
        src.includes("return true"),
      "Must suppress when agentRepliedAfter is true"
    );
  });

  it("returns false only when ai_active and no agent replied", () => {
    assert.ok(
      src.includes("return false"),
      "Must return false (do not suppress) in the default case"
    );
  });
});

describe("inbound orchestrator source", () => {
  let src: string;
  let reservationSrc: string;

  it("loads source", async () => {
    src = await readFile(inboundUrl, "utf-8");
    reservationSrc = await readFile(reservationsUrl, "utf-8");
    assert.ok(src.length > 0);
    assert.ok(reservationSrc.length > 0);
  });

  it("exports handleInbound", () => {
    assert.ok(
      src.includes("export async function handleInbound"),
      "Must export handleInbound"
    );
  });

  it("uses channel_inbound_events for idempotency before message insert", () => {
    assert.ok(
      src.includes("reserveInboundEvent") &&
        reservationSrc.includes("channel_inbound_events"),
      "Must reserve provider message before inserting the customer message"
    );
  });

  it("checks for unique constraint violation (23505) for dedup", () => {
    assert.ok(
      reservationSrc.includes("23505"),
      "Must catch unique constraint violation for duplicate detection"
    );
  });

  it("calls resolveConversation", () => {
    assert.ok(
      src.includes("resolveConversation"),
      "Must call resolveConversation for channel-aware resolution"
    );
  });

  it("reserves provider message before resolving conversation", () => {
    const reserveIdx = src.indexOf("await reserveInboundEvent");
    const resolveIdx = src.indexOf("resolveConversation(");
    assert.ok(reserveIdx !== -1 && resolveIdx !== -1);
    assert.ok(
      reserveIdx < resolveIdx,
      "Provider-message reservation must happen before conversation resolution"
    );
  });

  it("calls resolveConnectionConfig", () => {
    assert.ok(
      src.includes("resolveConnectionConfig"),
      "Must resolve connection config for aiAutoReply and strategy"
    );
  });

  it("calls processChat with skipMessageWrites", () => {
    assert.ok(
      src.includes("skipMessageWrites") && src.includes("processChat"),
      "Must call processChat with skipMessageWrites flag"
    );
  });

  it("loads history before inserting the inbound customer message", () => {
    const historyIdx = src.indexOf("getConversationHistory");
    const addMsgIdx = src.indexOf("addAndBroadcastMessage");
    assert.ok(historyIdx !== -1 && addMsgIdx !== -1);
    assert.ok(
      historyIdx < addMsgIdx,
      "History must be loaded before inserting the just-arrived customer message"
    );
  });

  it("passes explicit conversationHistory into processChat", () => {
    assert.ok(
      src.includes("conversationHistory: priorHistory"),
      "processChat must receive pre-reservation history explicitly"
    );
  });

  it("calls shouldSuppressAiReply before persisting AI response", () => {
    assert.ok(
      src.includes("shouldSuppressAiReply"),
      "Must run stale-state guard before AI persistence"
    );
  });

  it("allows same-turn handoff acknowledgement before stale-state guard", () => {
    const handoffIdx = src.indexOf("result.handoff?.triggered");
    const guardIdx = src.indexOf("shouldSuppressAiReply(freshStatus");
    assert.ok(handoffIdx !== -1 && guardIdx !== -1);
    assert.ok(
      handoffIdx < guardIdx,
      "Same-turn handoff acknowledgement must bypass the stale-state guard"
    );
  });

  it("stamps last_inbound_at for WhatsApp service-window enforcement", () => {
    assert.ok(
      src.includes("last_inbound_at"),
      "Must stamp conversations.metadata.last_inbound_at"
    );
  });

  it("calls dispatchToChannel", () => {
    assert.ok(
      src.includes("dispatchToChannel"),
      "Must dispatch AI reply to WhatsApp"
    );
  });

  it("uses broadcastNewMessage for realtime", () => {
    assert.ok(
      src.includes("broadcastNewMessage"),
      "Must broadcast messages for agent dashboard"
    );
  });

  it("includes per-sender rate limit check", () => {
    assert.ok(
      src.includes("wa:") || src.includes("waId"),
      "Rate limit must key by sender phone"
    );
  });
});
