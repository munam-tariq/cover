import assert from "node:assert/strict";
import crypto from "node:crypto";
import { describe, it } from "node:test";

const adapterUrl = new URL(
  "../../apps/api/src/services/channels/whatsapp/adapter.ts",
  import.meta.url
);

describe("verifyWebhookChallenge", () => {
  it("returns challenge when mode and token match", async () => {
    const mod = await import(adapterUrl.href);
    const result = mod.verifyWebhookChallenge(
      "subscribe",
      "my_token",
      "challenge_123",
      "my_token"
    );
    assert.equal(result, "challenge_123");
  });

  it("returns null when token does not match", async () => {
    const mod = await import(adapterUrl.href);
    const result = mod.verifyWebhookChallenge(
      "subscribe",
      "wrong_token",
      "challenge_123",
      "my_token"
    );
    assert.equal(result, null);
  });

  it("returns null when mode is not subscribe", async () => {
    const mod = await import(adapterUrl.href);
    const result = mod.verifyWebhookChallenge(
      "unsubscribe",
      "my_token",
      "challenge_123",
      "my_token"
    );
    assert.equal(result, null);
  });
});

describe("verifySignature", () => {
  const APP_SECRET = "test_app_secret_value";

  it("returns true for valid HMAC-SHA256 signature", async () => {
    const mod = await import(adapterUrl.href);
    const body = Buffer.from('{"test":"payload"}');
    const expectedHmac = crypto
      .createHmac("sha256", APP_SECRET)
      .update(body)
      .digest("hex");

    assert.equal(
      mod.verifySignature(body, `sha256=${expectedHmac}`, APP_SECRET),
      true
    );
  });

  it("returns false for tampered body", async () => {
    const mod = await import(adapterUrl.href);
    const body = Buffer.from('{"test":"payload"}');
    const tampered = Buffer.from('{"test":"tampered"}');
    const hmac = crypto
      .createHmac("sha256", APP_SECRET)
      .update(body)
      .digest("hex");

    assert.equal(
      mod.verifySignature(tampered, `sha256=${hmac}`, APP_SECRET),
      false
    );
  });

  it("returns false when signature header is missing", async () => {
    const mod = await import(adapterUrl.href);
    assert.equal(
      mod.verifySignature(Buffer.from("body"), undefined, APP_SECRET),
      false
    );
  });

  it("returns false for wrong-length signature", async () => {
    const mod = await import(adapterUrl.href);
    assert.equal(
      mod.verifySignature(Buffer.from("body"), "sha256=abcd", APP_SECRET),
      false
    );
  });
});

describe("parseInbound", () => {
  const TEXT_PAYLOAD = {
    object: "whatsapp_business_account",
    entry: [
      {
        id: "WABA_ID",
        changes: [
          {
            value: {
              messaging_product: "whatsapp",
              metadata: {
                display_phone_number: "15551234567",
                phone_number_id: "106540352242922",
              },
              contacts: [
                {
                  profile: { name: "Test User" },
                  wa_id: "15559876543",
                },
              ],
              messages: [
                {
                  from: "15559876543",
                  id: "wamid.HBgLMTU1NTk4NzY1NDM=",
                  timestamp: "1677000000",
                  text: { body: "Hello there!" },
                  type: "text",
                },
              ],
            },
            field: "messages",
          },
        ],
      },
    ],
  };

  it("parses a text message correctly", async () => {
    const mod = await import(adapterUrl.href);
    const result = mod.parseInbound(TEXT_PAYLOAD);
    assert.deepEqual(result, {
      type: "text",
      waMessageId: "wamid.HBgLMTU1NTk4NzY1NDM=",
      waId: "15559876543",
      phoneNumberId: "106540352242922",
      text: "Hello there!",
      displayName: "Test User",
      timestamp: 1677000000,
    });
  });

  it("extracts phone_number_id from message payloads", async () => {
    const mod = await import(adapterUrl.href);
    assert.equal(mod.extractPhoneNumberId(TEXT_PAYLOAD), "106540352242922");
  });

  it("returns unsupported for image messages", async () => {
    const mod = await import(adapterUrl.href);
    const imagePayload = structuredClone(TEXT_PAYLOAD);
    imagePayload.entry[0].changes[0].value.messages[0].type = "image";
    delete (imagePayload.entry[0].changes[0].value.messages[0] as any).text;
    const result = mod.parseInbound(imagePayload);
    assert.equal(result?.type, "unsupported");
    assert.equal(result?.text, "");
  });

  it("returns null for status-only webhooks (no messages)", async () => {
    const mod = await import(adapterUrl.href);
    const statusPayload = {
      object: "whatsapp_business_account",
      entry: [
        {
          id: "WABA_ID",
          changes: [
            {
              value: {
                messaging_product: "whatsapp",
                metadata: {
                  display_phone_number: "15551234567",
                  phone_number_id: "106540352242922",
                },
                statuses: [
                  {
                    id: "wamid.xxx",
                    status: "delivered",
                    timestamp: "1677000000",
                    recipient_id: "15559876543",
                  },
                ],
              },
              field: "messages",
            },
          ],
        },
      ],
    };
    assert.equal(mod.extractPhoneNumberId(statusPayload), "106540352242922");
    assert.equal(mod.parseInbound(statusPayload), null);
  });

  it("returns null for non-WhatsApp payloads", async () => {
    const mod = await import(adapterUrl.href);
    assert.equal(mod.parseInbound({ object: "page" }), null);
    assert.equal(mod.parseInbound(null), null);
    assert.equal(mod.parseInbound(undefined), null);
  });
});

describe("batched webhook payloads", () => {
  function changeFor(phoneNumberId: string, messages: unknown[], contacts: unknown[]) {
    return {
      value: {
        messaging_product: "whatsapp",
        metadata: { display_phone_number: "1", phone_number_id: phoneNumberId },
        contacts,
        messages,
      },
      field: "messages",
    };
  }

  function textMsg(id: string, from: string, body: string) {
    return {
      from,
      id,
      timestamp: "1677000000",
      type: "text",
      text: { body },
    };
  }

  it("extractPhoneNumberIds returns all unique phone IDs across entries/changes", async () => {
    const mod = await import(adapterUrl.href);
    const payload = {
      object: "whatsapp_business_account",
      entry: [
        {
          id: "WABA_A",
          changes: [
            changeFor("PHONE_A", [textMsg("m1", "wa1", "hi")], [{ wa_id: "wa1", profile: { name: "A" } }]),
          ],
        },
        {
          id: "WABA_B",
          changes: [
            changeFor("PHONE_B", [textMsg("m2", "wa2", "hi")], [{ wa_id: "wa2", profile: { name: "B" } }]),
            changeFor("PHONE_A", [textMsg("m3", "wa3", "hi")], [{ wa_id: "wa3", profile: { name: "C" } }]),
          ],
        },
      ],
    };
    const ids = mod.extractPhoneNumberIds(payload);
    assert.deepEqual([...ids].sort(), ["PHONE_A", "PHONE_B"]);
  });

  it("parseInboundMessages returns every message across entries/changes/messages arrays", async () => {
    const mod = await import(adapterUrl.href);
    const payload = {
      object: "whatsapp_business_account",
      entry: [
        {
          id: "WABA_A",
          changes: [
            changeFor(
              "PHONE_A",
              [textMsg("m1", "wa1", "first"), textMsg("m2", "wa1", "second")],
              [{ wa_id: "wa1", profile: { name: "Alice" } }]
            ),
          ],
        },
        {
          id: "WABA_B",
          changes: [
            changeFor("PHONE_B", [textMsg("m3", "wa2", "third")], [{ wa_id: "wa2", profile: { name: "Bob" } }]),
          ],
        },
      ],
    };
    const results = mod.parseInboundMessages(payload);
    assert.equal(results.length, 3);
    assert.deepEqual(
      results.map((r: { waMessageId: string }) => r.waMessageId),
      ["m1", "m2", "m3"]
    );
    assert.equal(results[0].phoneNumberId, "PHONE_A");
    assert.equal(results[2].phoneNumberId, "PHONE_B");
  });

  it("matches display name by contacts[].wa_id, not always contacts[0]", async () => {
    const mod = await import(adapterUrl.href);
    const payload = {
      object: "whatsapp_business_account",
      entry: [
        {
          id: "WABA_A",
          changes: [
            changeFor(
              "PHONE_A",
              [textMsg("m1", "wa2", "hello")],
              [
                { wa_id: "wa1", profile: { name: "First Contact" } },
                { wa_id: "wa2", profile: { name: "Second Contact" } },
              ]
            ),
          ],
        },
      ],
    };
    const [result] = mod.parseInboundMessages(payload);
    assert.equal(result.displayName, "Second Contact");
  });

  it("extracts phone IDs from a status-only batch with zero parsed messages", async () => {
    const mod = await import(adapterUrl.href);
    const payload = {
      object: "whatsapp_business_account",
      entry: [
        {
          id: "WABA_A",
          changes: [
            {
              value: {
                messaging_product: "whatsapp",
                metadata: { display_phone_number: "1", phone_number_id: "PHONE_A" },
                statuses: [{ id: "wamid.x", status: "delivered", timestamp: "1", recipient_id: "wa1" }],
              },
              field: "messages",
            },
          ],
        },
      ],
    };
    assert.deepEqual(mod.extractPhoneNumberIds(payload), ["PHONE_A"]);
    assert.deepEqual(mod.parseInboundMessages(payload), []);
  });
});

describe("selectVerifiedPhoneNumberIds", () => {
  function sign(secret: string, body: Buffer): string {
    return (
      "sha256=" +
      crypto.createHmac("sha256", secret).update(body).digest("hex")
    );
  }

  it("verifies against the matching secret and 401-equivalent (empty set) when none match", async () => {
    const mod = await import(adapterUrl.href);
    const body = Buffer.from('{"object":"whatsapp_business_account"}');
    const signature = sign("correct-secret", body);

    const verified = mod.selectVerifiedPhoneNumberIds(
      [{ phoneNumberId: "PHONE_A", appSecret: "correct-secret" }],
      body,
      signature
    );
    assert.deepEqual([...verified], ["PHONE_A"]);

    const noneVerified = mod.selectVerifiedPhoneNumberIds(
      [{ phoneNumberId: "PHONE_A", appSecret: "wrong-secret" }],
      body,
      signature
    );
    assert.equal(noneVerified.size, 0);
  });

  it("only trusts connections whose own secret matches when a batch mixes secrets", async () => {
    const mod = await import(adapterUrl.href);
    const body = Buffer.from('{"object":"whatsapp_business_account"}');
    const signature = sign("real-app-secret", body);

    const verified = mod.selectVerifiedPhoneNumberIds(
      [
        { phoneNumberId: "PHONE_GOOD", appSecret: "real-app-secret" },
        { phoneNumberId: "PHONE_STALE", appSecret: "stale-or-wrong-secret" },
      ],
      body,
      signature
    );
    assert.deepEqual([...verified], ["PHONE_GOOD"]);
  });
});

describe("processInboundBatch", () => {
  it("processes messages in payload order", async () => {
    const mod = await import(adapterUrl.href);
    const order: string[] = [];
    const parsed = [
      { waMessageId: "m1", phoneNumberId: "P1" },
      { waMessageId: "m2", phoneNumberId: "P1" },
    ];
    await mod.processInboundBatch(
      parsed,
      () => "conn",
      async (_conn: string, msg: { waMessageId: string }) => {
        order.push(msg.waMessageId);
      },
      () => {},
      () => {}
    );
    assert.deepEqual(order, ["m1", "m2"]);
  });

  it("routes each message to its own resolved connection", async () => {
    const mod = await import(adapterUrl.href);
    const seen: Array<[string, string]> = [];
    const parsed = [
      { waMessageId: "m1", phoneNumberId: "P1" },
      { waMessageId: "m2", phoneNumberId: "P2" },
    ];
    await mod.processInboundBatch(
      parsed,
      (phoneNumberId: string) => `conn-${phoneNumberId}`,
      async (conn: string, msg: { waMessageId: string }) => {
        seen.push([conn, msg.waMessageId]);
      },
      () => {},
      () => {}
    );
    assert.deepEqual(seen, [
      ["conn-P1", "m1"],
      ["conn-P2", "m2"],
    ]);
  });

  it("skips a message with no resolved connection and continues the batch", async () => {
    const mod = await import(adapterUrl.href);
    const processed: string[] = [];
    const skipped: string[] = [];
    const parsed = [
      { waMessageId: "m1", phoneNumberId: "UNKNOWN" },
      { waMessageId: "m2", phoneNumberId: "KNOWN" },
    ];
    await mod.processInboundBatch(
      parsed,
      (phoneNumberId: string) => (phoneNumberId === "KNOWN" ? "conn" : undefined),
      async (_conn: string, msg: { waMessageId: string }) => {
        processed.push(msg.waMessageId);
      },
      (msg: { waMessageId: string }) => skipped.push(msg.waMessageId),
      () => {}
    );
    assert.deepEqual(processed, ["m2"]);
    assert.deepEqual(skipped, ["m1"]);
  });

  it("a thrown error for one message does not stop the rest of the batch", async () => {
    const mod = await import(adapterUrl.href);
    const processed: string[] = [];
    const errored: string[] = [];
    const parsed = [
      { waMessageId: "m1", phoneNumberId: "P1" },
      { waMessageId: "m2", phoneNumberId: "P1" },
    ];
    await mod.processInboundBatch(
      parsed,
      () => "conn",
      async (_conn: string, msg: { waMessageId: string }) => {
        if (msg.waMessageId === "m1") throw new Error("boom");
        processed.push(msg.waMessageId);
      },
      () => {},
      (msg: { waMessageId: string }) => errored.push(msg.waMessageId)
    );
    assert.deepEqual(processed, ["m2"]);
    assert.deepEqual(errored, ["m1"]);
  });
});
