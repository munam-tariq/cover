import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

const dispatcherUrl = new URL(
  "../../apps/api/src/services/channels/outbound-dispatcher.ts",
  import.meta.url
);

describe("isWithin24hWindow (logic verification via source)", () => {
  let src: string;

  it("loads source", async () => {
    src = await readFile(dispatcherUrl, "utf-8");
    assert.ok(src.length > 0);
  });

  it("uses strict less-than for 24h boundary (not <=)", () => {
    assert.ok(
      src.includes("< WINDOW_MS"),
      "Must use strict < so exactly-24h returns false"
    );
  });

  it("defines WINDOW_MS as exactly 24 hours in milliseconds", () => {
    assert.ok(
      src.includes("24 * 60 * 60 * 1000"),
      "WINDOW_MS must be 24h in ms"
    );
  });

  it("accepts optional now parameter for testability", () => {
    assert.ok(
      src.includes("now?: Date") || src.includes("now: Date"),
      "isWithin24hWindow must accept optional now param"
    );
  });
});

describe("outbound-dispatcher source", () => {
  let src: string;

  it("loads source", async () => {
    src = await readFile(dispatcherUrl, "utf-8");
    assert.ok(src.length > 0);
  });

  it("imports sendTextMessage from adapter", () => {
    assert.ok(
      src.includes("sendTextMessage"),
      "Must use sendTextMessage from adapter"
    );
  });

  it("imports decryptCredentials from connections", () => {
    assert.ok(
      src.includes("decryptCredentials"),
      "Must decrypt credentials via connections service"
    );
  });

  it("looks up conversation source and visitor_id", () => {
    assert.ok(
      src.includes("source") && src.includes("visitor_id"),
      "Must query conversation to determine source and visitor"
    );
  });

  it("does not import broadcastNewMessage from realtime", () => {
    assert.ok(
      !src.includes("broadcastNewMessage"),
      "Dispatcher is a pure send primitive; callers handle dashboard broadcasts"
    );
  });

  it("exports dispatchToChannel", () => {
    assert.ok(
      src.includes("export async function dispatchToChannel"),
      "Must export dispatchToChannel"
    );
  });

  it("exports canSendFreeForm", () => {
    assert.ok(
      src.includes("export async function canSendFreeForm"),
      "Must export canSendFreeForm"
    );
  });

  it("queries conversation metadata last_inbound_at for 24h window", () => {
    assert.ok(
      src.includes("metadata") && src.includes("last_inbound_at"),
      "canSendFreeForm must use conversation.metadata.last_inbound_at"
    );
  });

  it("returns typed dispatch failures instead of throwing for expected send failures", () => {
    assert.ok(src.includes("DispatchResult"));
    assert.ok(src.includes("WINDOW_CLOSED"));
    assert.ok(src.includes("SEND_FAILED"));
  });
});
