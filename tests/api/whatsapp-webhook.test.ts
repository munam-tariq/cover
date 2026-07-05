import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

const routePath = new URL(
  "../../apps/api/src/routes/channels/whatsapp.ts",
  import.meta.url
);
const indexPath = new URL(
  "../../apps/api/src/index.ts",
  import.meta.url
);

describe("whatsapp webhook route source", () => {
  let src: string;

  it("loads source", async () => {
    src = await readFile(routePath, "utf-8");
    assert.ok(src.length > 0);
  });

  it("has GET handler for verification", () => {
    assert.ok(
      src.includes("router.get(") || src.includes('.get("/'),
      "Must have GET route for webhook verification"
    );
  });

  it("has POST handler for receiving messages", () => {
    assert.ok(
      src.includes("router.post(") || src.includes('.post("/'),
      "Must have POST route for receiving webhooks"
    );
  });

  it("returns 200 after verification in POST (fast ACK)", () => {
    assert.ok(
      src.includes("200"),
      "Must respond 200 to Meta quickly after cheap verification"
    );
  });

  it("verifies HMAC signature before processing", () => {
    assert.ok(
      src.includes("selectVerifiedPhoneNumberIds"),
      "Must verify HMAC signature (batch-aware, multi-secret) before processing"
    );
  });

  it("verifies HMAC before sending the 200 ACK", () => {
    const verifyIdx = src.indexOf("selectVerifiedPhoneNumberIds(");
    const ackIdx = src.indexOf("// Fast ACK only after HMAC verification");
    assert.ok(verifyIdx !== -1 && ackIdx !== -1);
    assert.ok(
      verifyIdx < ackIdx,
      "Invalid signatures must return 401, so verification must happen before ACK"
    );
  });

  it("handles batched webhook deliveries (multiple entries/changes/messages)", () => {
    assert.ok(
      src.includes("extractPhoneNumberIds") &&
        src.includes("parseInboundMessages") &&
        src.includes("processInboundBatch"),
      "Must process every phone_number_id and message in a batched POST, not just the first"
    );
  });

  it("skips messages whose connection's secret did not verify", () => {
    assert.ok(
      src.includes("verifiedPhoneNumberIds.has(phoneNumberId)"),
      "A connection present in the payload but with a non-verifying secret must not be processed"
    );
  });

  it("returns 5xx (not 200) when connection lookup throws, so Meta retries", () => {
    const tryIdx = src.indexOf("try {");
    const lookupIdx = src.indexOf("getConnectionsByExternalIds(");
    const catchIdx = src.indexOf("} catch (err)");
    const serviceUnavailableIdx = src.indexOf("res.sendStatus(503)");
    assert.ok(
      tryIdx !== -1 && lookupIdx !== -1 && catchIdx !== -1 && serviceUnavailableIdx !== -1,
      "Connection lookup must be wrapped so a DB error returns 5xx instead of silently ACKing 200"
    );
    assert.ok(
      tryIdx < lookupIdx && lookupIdx < catchIdx && catchIdx < serviceUnavailableIdx,
      "try must wrap the lookup, and the catch block must respond with a retryable status"
    );
  });

  it("uses rawBody for signature verification", () => {
    assert.ok(
      src.includes("rawBody"),
      "Must use rawBody for HMAC verification"
    );
  });

  it("calls handleInbound for processing", () => {
    assert.ok(
      src.includes("handleInbound"),
      "Must call handleInbound orchestrator"
    );
  });

  it("does not use requirePublicWidgetAccess", () => {
    assert.ok(
      !src.includes("requirePublicWidgetAccess"),
      "Webhook must NOT be gated by widget access middleware"
    );
  });

  it("exports the router", () => {
    assert.ok(
      src.includes("export") && src.includes("Router"),
      "Must export the Express router"
    );
  });
});

describe("index.ts webhook mounting", () => {
  let src: string;

  it("loads source", async () => {
    src = await readFile(indexPath, "utf-8");
    assert.ok(src.length > 0);
  });

  it("imports whatsapp webhook router", () => {
    assert.ok(
      src.includes("whatsappWebhookRouter") || src.includes("channels/whatsapp"),
      "Must import whatsapp webhook router"
    );
  });

  it("mounts webhook route at /api/channels/whatsapp", () => {
    assert.ok(
      src.includes("/api/channels/whatsapp"),
      "Must mount at /api/channels/whatsapp"
    );
  });

  it("captures rawBody in express.json verify callback", () => {
    assert.ok(
      src.includes("rawBody") && src.includes("verify"),
      "Must add rawBody capture via verify callback"
    );
  });
});
