import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { getConversationDisplayName } from "../../apps/web/lib/conversation-identity.ts";

describe("getConversationDisplayName", () => {
  it("prefers known name, email, then phone", () => {
    assert.equal(
      getConversationDisplayName({
        visitorId: "whatsapp:923323146585",
        source: "whatsapp",
        customerName: "Ayesha",
        customerEmail: "ayesha@example.com",
        customerPhone: "923323146585",
      }),
      "Ayesha"
    );

    assert.equal(
      getConversationDisplayName({
        visitorId: "whatsapp:923323146585",
        source: "whatsapp",
        customerEmail: "ayesha@example.com",
        customerPhone: "923323146585",
      }),
      "ayesha@example.com"
    );

    assert.equal(
      getConversationDisplayName({
        visitorId: "whatsapp:923323146585",
        source: "whatsapp",
        customerPhone: "923323146585",
      }),
      "+923323146585"
    );
  });

  it("derives WhatsApp phone from visitorId when customer phone is absent", () => {
    assert.equal(
      getConversationDisplayName({
        visitorId: "whatsapp:923323146585",
        source: "whatsapp",
      }),
      "+923323146585"
    );
  });

  it("falls back to visitor prefix for non-WhatsApp anonymous conversations", () => {
    assert.equal(
      getConversationDisplayName({
        visitorId: "vis_mr1z6aqi_4ymv5nkj1",
        source: "widget",
      }),
      "Visitor vis_mr1z"
    );
  });
});
