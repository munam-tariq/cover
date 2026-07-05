# Omnichannel Batch 2: CHAN-002 + CHAN-003 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the WhatsApp inbound pipeline (CHAN-002) and outbound dispatcher (CHAN-003) — the message flow backbone of FrontFace omnichannel. When done, a customer can text a WhatsApp number, receive an AI reply, get handed off to an agent, and the agent can reply — all routed through the same conversation.

**Architecture:** The webhook parses and verifies HMAC before ACKing valid message events, then hands off to an async orchestrator. The orchestrator first reserves the provider message in `channel_inbound_events` (before conversation resolution), resolves the conversation, loads DB history before inserting the just-arrived customer message, inserts the customer message, runs `processChat` in compute-only mode (`skipMessageWrites: true`), handles same-turn handoff acknowledgements, then applies the stale-state guard before normal AI persistence + dispatch. The outbound dispatcher is a thin send primitive with typed results; agent sends validate the WhatsApp 24h window before any message insert/broadcast.

**Tech Stack:** Express (TypeScript), Supabase (Postgres via `supabaseAdmin`), Meta WhatsApp Cloud API (Graph API v21.0), `node:crypto` for HMAC

## Global Constraints

- **Security baseline:** HMAC verification uses `crypto.timingSafeEqual` (matching `voice-session-token.ts` pattern). Credentials accessed only via `supabaseAdmin` (service role). Credentials never returned to client or logged.
- **Webhook must NOT be wrapped in `requirePublicWidgetAccess`.** Rate-limit by sender phone (`wa_id`), NOT by source IP.
- **Webhook POST ordering:** extract `phone_number_id` → connection lookup → HMAC verify → parse message → `200` ACK → async processing. Invalid signatures return `401`; unknown phone numbers still return `200`.
- **Inbound idempotency ordering:** reserve `provider + external_message_id` before conversation resolution. Do NOT use the customer message row as the first reservation point for first-message races.
- **WhatsApp agent-send ordering:** validate the 24h window before persisting or broadcasting an agent message. No ghost messages on `WINDOW_CLOSED`.
- **No widget session token for server-side WhatsApp channels.** The orchestrator authenticates via HMAC, not session tokens.
- **v1 ownership scope:** FrontFace is sole sender/receiver on the connected number. No external inbox coexistence. Do not build shared-inbox logic.
- **Test runner:** `node --experimental-strip-types --test <file>`. Tests use `node:test` + `node:assert/strict`.
- **No auto-commit.** Every "Commit" step is a **STOP — user reviews and commits in IDE**. Do NOT run `git add` or `git commit`.
- **Encryption helpers accept `object`** (not narrow interfaces). See `feedback-ownership-guard-and-types.md`.
- **Upsert on globally-unique keys must check project ownership.** See `connection-ownership.ts` pattern.

---

## File Structure

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `apps/api/src/services/channels/whatsapp/adapter.ts` | Pure functions: HMAC verify, parse inbound, send text |
| Create | `apps/api/src/services/channels/config.ts` | `resolveConnectionConfig` — apply WhatsApp config defaults |
| Create | `apps/api/src/services/channels/conversation-resolver.ts` | `resolveConversation` — channel-aware strategy (latest_open vs ai_active_only) |
| Create | `apps/api/src/services/channels/inbound-reservations.ts` | Provider-message reservation + completion markers |
| Create | `apps/api/src/services/channels/outbound-dispatcher.ts` | `dispatchToChannel`, `canSendFreeForm`, `isWithin24hWindow` |
| Create | `apps/api/src/services/channels/whatsapp/inbound.ts` | `handleInbound` orchestrator + `shouldSuppressAiReply` predicate |
| Create | `apps/api/src/routes/channels/whatsapp.ts` | Webhook route: GET verify + POST receive with fast ACK |
| Create | `apps/api/src/types/express.d.ts` | Type augmentation: `rawBody` on Express Request |
| Create | `supabase/migrations/20260629000006_create_channel_inbound_events.sql` | Durable provider message reservation table |
| Modify | `apps/api/src/types/channels.ts` | Add `ChannelConnectionConfig`, `ResolutionStrategy` |
| Modify | `apps/api/src/services/conversation.ts:156` | Export `getOrCreateCustomer` |
| Modify | `apps/api/src/services/chat-engine.ts:104` | Add `skipMessageWrites` to `ChatInput`; guard 5 write sites; DB history autoload |
| Modify | `apps/api/src/index.ts:83` | rawBody capture via `verify` callback on `express.json`; mount webhook route |
| Modify | `apps/api/src/routes/conversations.ts:750` | Add `source, visitor_id` to select; wire `dispatchToChannel` + window check |
| Create | `tests/api/whatsapp-adapter.test.ts` | Pure tests: HMAC, parse, challenge |
| Create | `tests/api/channel-config.test.ts` | Pure tests: config resolution defaults |
| Create | `tests/api/conversation-resolver.test.ts` | Source inspection: strategy → query |
| Create | `tests/api/chat-engine-skip-writes.test.ts` | Source inspection: skipMessageWrites guards |
| Create | `tests/api/outbound-dispatcher.test.ts` | Pure test: 24h window; source inspection: dispatch |
| Create | `tests/api/whatsapp-inbound.test.ts` | Pure test: suppression predicate; source inspection: orchestrator |
| Create | `tests/api/whatsapp-webhook.test.ts` | Source inspection: route structure |
| Create | `tests/api/agent-send-dispatch.test.ts` | Source inspection: dispatch wiring in agent send |

---

### Task 1: WhatsApp Adapter (Pure Functions)

**Files:**
- Create: `apps/api/src/services/channels/whatsapp/adapter.ts`
- Create: `tests/api/whatsapp-adapter.test.ts`

**Interfaces:**
- Consumes: nothing (pure module, no internal imports)
- Produces: `verifyWebhookChallenge(mode, token, challenge, expectedToken) → string | null`, `verifySignature(rawBody: Buffer, signatureHeader: string | undefined, appSecret: string) → boolean`, `extractPhoneNumberId(body: unknown) → string | null`, `parseInbound(body: unknown) → ParsedInbound | null`, `sendTextMessage(phoneNumberId, accessToken, to, text) → Promise<{ waMessageId: string }>`, `ParsedInbound` type

- [ ] **Step 1: Write the adapter tests**

```typescript
// tests/api/whatsapp-adapter.test.ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --experimental-strip-types --test tests/api/whatsapp-adapter.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Create the adapter module**

```typescript
// apps/api/src/services/channels/whatsapp/adapter.ts
import crypto from "crypto";

export interface ParsedInbound {
  type: "text" | "unsupported";
  waMessageId: string;
  waId: string;
  phoneNumberId: string;
  text: string;
  displayName: string;
  timestamp: number;
}

export function verifyWebhookChallenge(
  mode: string | undefined,
  token: string | undefined,
  challenge: string | undefined,
  expectedToken: string
): string | null {
  if (mode === "subscribe" && token === expectedToken) {
    return challenge ?? null;
  }
  return null;
}

export function verifySignature(
  rawBody: Buffer,
  signatureHeader: string | undefined,
  appSecret: string
): boolean {
  if (!signatureHeader) return false;

  const expectedSig = crypto
    .createHmac("sha256", appSecret)
    .update(rawBody)
    .digest("hex");

  const receivedSig = signatureHeader.replace("sha256=", "");

  const expected = Buffer.from(expectedSig, "hex");
  const received = Buffer.from(receivedSig, "hex");

  if (expected.length !== received.length) return false;
  return crypto.timingSafeEqual(expected, received);
}

function getFirstChangeValue(body: unknown): Record<string, unknown> | null {
  if (!body || typeof body !== "object") return null;
  const obj = body as Record<string, unknown>;
  if (obj.object !== "whatsapp_business_account") return null;

  const entries = obj.entry as Array<Record<string, unknown>> | undefined;
  if (!entries?.length) return null;

  const changes = entries[0].changes as
    | Array<Record<string, unknown>>
    | undefined;
  if (!changes?.length) return null;

  const value = changes[0].value as Record<string, unknown> | undefined;
  if (!value) return null;
  return value;
}

export function extractPhoneNumberId(body: unknown): string | null {
  const value = getFirstChangeValue(body);
  if (!value) return null;

  const metadata = value.metadata as Record<string, string> | undefined;
  const phoneNumberId = metadata?.phone_number_id;
  return typeof phoneNumberId === "string" ? phoneNumberId : null;
}

export function parseInbound(body: unknown): ParsedInbound | null {
  const value = getFirstChangeValue(body);
  if (!value) return null;

  const phoneNumberId = extractPhoneNumberId(body);
  if (!phoneNumberId) return null;

  const messages = value.messages as
    | Array<Record<string, unknown>>
    | undefined;
  if (!messages?.length) return null;

  const msg = messages[0];
  const waMessageId = msg.id as string;
  const from = msg.from as string;
  const timestamp = parseInt(msg.timestamp as string, 10);
  const msgType = msg.type as string;

  const contacts = value.contacts as
    | Array<Record<string, unknown>>
    | undefined;
  const displayName =
    (contacts?.[0]?.profile as Record<string, string> | undefined)?.name ?? "";

  if (msgType === "text") {
    const textBody =
      (msg.text as Record<string, string> | undefined)?.body ?? "";
    return {
      type: "text",
      waMessageId,
      waId: from,
      phoneNumberId,
      text: textBody,
      displayName,
      timestamp,
    };
  }

  return {
    type: "unsupported",
    waMessageId,
    waId: from,
    phoneNumberId,
    text: "",
    displayName,
    timestamp,
  };
}

export async function sendTextMessage(
  phoneNumberId: string,
  accessToken: string,
  to: string,
  text: string
): Promise<{ waMessageId: string }> {
  const url = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "text",
      text: { body: text },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`WhatsApp API ${response.status}: ${errorBody}`);
  }

  const data = (await response.json()) as {
    messages: Array<{ id: string }>;
  };
  return { waMessageId: data.messages[0].id };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --experimental-strip-types --test tests/api/whatsapp-adapter.test.ts`
Expected: All tests PASS (12 tests)

- [ ] **Step 5: Commit**

STOP — user reviews and commits in IDE.

---

### Task 2: Connection Config Types + Conversation Resolver

**Files:**
- Modify: `apps/api/src/types/channels.ts`
- Create: `apps/api/src/services/channels/config.ts`
- Create: `apps/api/src/services/channels/conversation-resolver.ts`
- Modify: `apps/api/src/services/conversation.ts:156` (export `getOrCreateCustomer`)
- Create: `tests/api/channel-config.test.ts`
- Create: `tests/api/conversation-resolver.test.ts`

**Interfaces:**
- Consumes: `getOrCreateCustomer` from `conversation.ts`, `ChatSource` from `chat-engine.ts`, `supabaseAdmin`
- Produces: `ChannelConnectionConfig` type, `ResolutionStrategy` type, `resolveConnectionConfig(raw) → ChannelConnectionConfig`, `resolveConversation(projectId, visitorId, source, strategy) → Promise<string>`

- [ ] **Step 1: Write the config resolution tests**

```typescript
// tests/api/channel-config.test.ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";

const configUrl = new URL(
  "../../apps/api/src/services/channels/config.ts",
  import.meta.url
);

describe("resolveConnectionConfig", () => {
  it("returns WhatsApp defaults when config is undefined", async () => {
    const mod = await import(configUrl.href);
    const result = mod.resolveConnectionConfig(undefined);
    assert.deepEqual(result, {
      aiAutoReply: true,
      resolutionStrategy: "latest_open",
      humanTakeoverPolicy: "pause_ai",
      resumePolicy: "on_new_inbound",
    });
  });

  it("returns WhatsApp defaults when config is empty", async () => {
    const mod = await import(configUrl.href);
    const result = mod.resolveConnectionConfig({});
    assert.deepEqual(result, {
      aiAutoReply: true,
      resolutionStrategy: "latest_open",
      humanTakeoverPolicy: "pause_ai",
      resumePolicy: "on_new_inbound",
    });
  });

  it("respects explicit overrides", async () => {
    const mod = await import(configUrl.href);
    const result = mod.resolveConnectionConfig({
      aiAutoReply: false,
      resolutionStrategy: "ai_active_only",
      humanTakeoverPolicy: "stop_ai",
      resumePolicy: "manual",
    });
    assert.deepEqual(result, {
      aiAutoReply: false,
      resolutionStrategy: "ai_active_only",
      humanTakeoverPolicy: "stop_ai",
      resumePolicy: "manual",
    });
  });

  it("ignores invalid enum values and falls back to defaults", async () => {
    const mod = await import(configUrl.href);
    const result = mod.resolveConnectionConfig({
      aiAutoReply: "yes",
      resolutionStrategy: "invalid",
      humanTakeoverPolicy: 42,
      resumePolicy: null,
    });
    assert.deepEqual(result, {
      aiAutoReply: true,
      resolutionStrategy: "latest_open",
      humanTakeoverPolicy: "pause_ai",
      resumePolicy: "on_new_inbound",
    });
  });
});
```

- [ ] **Step 2: Write the conversation resolver source inspection test**

```typescript
// tests/api/conversation-resolver.test.ts
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

const resolverPath = new URL(
  "../../apps/api/src/services/channels/conversation-resolver.ts",
  import.meta.url
);

describe("conversation-resolver source", () => {
  let src: string;

  it("loads source", async () => {
    src = await readFile(resolverPath, "utf-8");
    assert.ok(src.length > 0);
  });

  it("queries with latest_open statuses for that strategy", async () => {
    assert.ok(
      src.includes('"ai_active"') &&
        src.includes('"waiting"') &&
        src.includes('"agent_active"'),
      "latest_open must include ai_active, waiting, and agent_active"
    );
  });

  it("uses .in() for status matching in latest_open", async () => {
    assert.ok(
      src.includes('.in("status"'),
      "Should use .in() for multi-status query"
    );
  });

  it("filters by source to avoid cross-channel reuse", async () => {
    assert.ok(
      src.includes('.eq("source"'),
      "Must filter by source column"
    );
  });

  it("orders by created_at descending and limits to 1", async () => {
    assert.ok(src.includes("ascending: false"));
    assert.ok(src.includes(".limit(1)"));
  });

  it("creates new conversation with ai_active status", async () => {
    assert.ok(
      src.includes('status: "ai_active"'),
      "New conversations must start ai_active"
    );
  });

  it("exports resolveConversation", async () => {
    assert.ok(
      src.includes("export async function resolveConversation"),
      "Must export resolveConversation"
    );
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `node --experimental-strip-types --test tests/api/channel-config.test.ts tests/api/conversation-resolver.test.ts`
Expected: FAIL — modules not found

- [ ] **Step 4: Add types to channels.ts**

Add to the end of `apps/api/src/types/channels.ts`:

```typescript
export type ResolutionStrategy = "latest_open" | "ai_active_only";

export interface ChannelConnectionConfig {
  aiAutoReply: boolean;
  resolutionStrategy: ResolutionStrategy;
  humanTakeoverPolicy: "pause_ai" | "stop_ai";
  resumePolicy: "on_new_inbound" | "manual";
}
```

- [ ] **Step 5: Create config.ts**

```typescript
// apps/api/src/services/channels/config.ts
import type { ChannelConnectionConfig } from "../../types/channels";

const WHATSAPP_DEFAULTS: ChannelConnectionConfig = {
  aiAutoReply: true,
  resolutionStrategy: "latest_open",
  humanTakeoverPolicy: "pause_ai",
  resumePolicy: "on_new_inbound",
};

export function resolveConnectionConfig(
  raw: Record<string, unknown> | undefined
): ChannelConnectionConfig {
  if (!raw) return { ...WHATSAPP_DEFAULTS };
  return {
    aiAutoReply:
      typeof raw.aiAutoReply === "boolean"
        ? raw.aiAutoReply
        : WHATSAPP_DEFAULTS.aiAutoReply,
    resolutionStrategy:
      raw.resolutionStrategy === "latest_open" ||
      raw.resolutionStrategy === "ai_active_only"
        ? raw.resolutionStrategy
        : WHATSAPP_DEFAULTS.resolutionStrategy,
    humanTakeoverPolicy:
      raw.humanTakeoverPolicy === "pause_ai" ||
      raw.humanTakeoverPolicy === "stop_ai"
        ? raw.humanTakeoverPolicy
        : WHATSAPP_DEFAULTS.humanTakeoverPolicy,
    resumePolicy:
      raw.resumePolicy === "on_new_inbound" ||
      raw.resumePolicy === "manual"
        ? raw.resumePolicy
        : WHATSAPP_DEFAULTS.resumePolicy,
  };
}
```

- [ ] **Step 6: Export getOrCreateCustomer from conversation.ts**

In `apps/api/src/services/conversation.ts`, line 156, change:

```typescript
async function getOrCreateCustomer(
```

to:

```typescript
export async function getOrCreateCustomer(
```

- [ ] **Step 7: Create conversation-resolver.ts**

```typescript
// apps/api/src/services/channels/conversation-resolver.ts
import { supabaseAdmin } from "../../lib/supabase";
import type { ChatSource } from "../chat-engine";
import type { ResolutionStrategy } from "../../types/channels";
import { getOrCreateCustomer } from "../conversation";

export async function resolveConversation(
  projectId: string,
  visitorId: string,
  source: ChatSource,
  strategy: ResolutionStrategy
): Promise<string> {
  const statuses =
    strategy === "latest_open"
      ? ["ai_active", "waiting", "agent_active"]
      : ["ai_active"];

  const { data: existing } = await supabaseAdmin
    .from("conversations")
    .select("id")
    .eq("project_id", projectId)
    .eq("visitor_id", visitorId)
    .eq("source", source)
    .in("status", statuses)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) return existing.id;

  const customerId = await getOrCreateCustomer(projectId, visitorId);

  const { data: newConv, error } = await supabaseAdmin
    .from("conversations")
    .insert({
      project_id: projectId,
      visitor_id: visitorId,
      customer_id: customerId,
      status: "ai_active",
      source,
      message_count: 0,
    })
    .select("id")
    .single();

  if (error)
    throw new Error(`Failed to create conversation: ${error.message}`);
  return newConv.id;
}
```

- [ ] **Step 8: Run tests to verify they pass**

Run: `node --experimental-strip-types --test tests/api/channel-config.test.ts tests/api/conversation-resolver.test.ts`
Expected: All tests PASS

- [ ] **Step 9: Commit**

STOP — user reviews and commits in IDE.

---

### Task 3: Engine Changes (skipMessageWrites + History Autoload)

**Files:**
- Modify: `apps/api/src/services/chat-engine.ts`
- Create: `tests/api/chat-engine-skip-writes.test.ts`

**Interfaces:**
- Consumes: `getConversationHistory` from `conversation.ts` (already exported)
- Produces: `ChatInput.skipMessageWrites?: boolean` — when true, `processChat` performs RAG + LLM but writes no messages (customer or AI). History is autoloaded from DB only when `conversationHistory` is empty, `sessionId` is provided, and `skipMessageWrites` is false.

**Design note:** The existing handoff short-circuit (`checkConversationHandoffState` at line 213) handles "conversation is already in handoff when processChat starts." The stale-state guard in the orchestrator (Task 5) handles "conversation became handoff during the LLM call." These are complementary, not redundant.

- [ ] **Step 1: Write the source inspection test**

```typescript
// tests/api/chat-engine-skip-writes.test.ts
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
    const definitionCount = 1; // the function definition itself
    const callCount = logCalls - definitionCount;
    assert.ok(callCount >= 4, `Expected at least 4 logConversation calls, found ${callCount}`);

    const guardCount = (src.match(/skipMessageWrites[\s\S]{0,200}logConversation\(/g) || []).length +
      (src.match(/logConversation\([\s\S]{0,5}[\s\S]*?skipMessageWrites/g) || []).length;

    // Alternative: count how many times skipMessageWrites appears near logConversation
    // The key requirement: every logConversation call site must check the flag
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --experimental-strip-types --test tests/api/chat-engine-skip-writes.test.ts`
Expected: FAIL on skipMessageWrites checks (field doesn't exist yet)

- [ ] **Step 3: Add skipMessageWrites to ChatInput**

In `apps/api/src/services/chat-engine.ts`, after line 112 (`requestId?: string;`), add:

```typescript
  skipMessageWrites?: boolean;
```

- [ ] **Step 4: Add getConversationHistory import**

In `apps/api/src/services/chat-engine.ts`, after the existing import from `./conversation`:

```typescript
import { getConversationHistory } from "./conversation";
```

If `conversation` is already imported (check for `import { ... } from "./conversation"`), add `getConversationHistory` to the existing import's destructured list.

- [ ] **Step 5: Add DB history autoload before LLM message building**

In `apps/api/src/services/chat-engine.ts`, find the line where `conversationHistory` is first used for building LLM messages. This is around the `truncateHistoryToFit` call or where `messages` are assembled. Before that usage, add:

Find the line (approximately line 460-470) that reads:

```typescript
    const truncatedHistory = truncateHistoryToFit(
```

Just before that line, add:

```typescript
    // Load conversation history from DB for non-skipMessageWrites server-side
    // channels that don't pass conversationHistory from the client.
    // When skipMessageWrites is true (e.g. WhatsApp), the orchestrator loads
    // history before reserveInbound and passes it explicitly — autoloading
    // here would include the just-reserved customer message, duplicating it.
    let dbHistory = input.conversationHistory || [];
    if (!dbHistory.length && input.sessionId && !input.skipMessageWrites) {
      dbHistory = await getConversationHistory(input.sessionId);
    }
```

Then update the `truncateHistoryToFit` call to use `dbHistory` instead of `input.conversationHistory || []`:

Replace:

```typescript
    const truncatedHistory = truncateHistoryToFit(
      systemPrompt,
      input.conversationHistory || [],
```

with:

```typescript
    const truncatedHistory = truncateHistoryToFit(
      systemPrompt,
      dbHistory,
```

- [ ] **Step 6: Guard storeCustomerMessageOnly in handoff path**

In `apps/api/src/services/chat-engine.ts`, at the handoff path (around line 215-217), change:

```typescript
        // Store the customer message in the messages table
        await storeCustomerMessageOnly(input.sessionId, sanitizedMessage);
```

to:

```typescript
        if (!input.skipMessageWrites) {
          await storeCustomerMessageOnly(input.sessionId, sanitizedMessage);
        }
```

- [ ] **Step 7: Guard logConversation in lead capture V2 path**

At line ~254-268, change:

```typescript
      // Skip DB writes for voice — transcripts are batch-saved at session end
      if (input.source !== "voice") {
        logConversation(
```

to:

```typescript
      if (!input.skipMessageWrites && input.source !== "voice") {
        logConversation(
```

- [ ] **Step 8: Guard logConversation in handoff trigger path**

At line ~330-342, change:

```typescript
      // Log the user message that triggered handoff
      logConversation(
```

to:

```typescript
      if (!input.skipMessageWrites) {
        logConversation(
```

Ensure the `.catch(...)` is also inside the `if` block.

- [ ] **Step 9: Guard logConversation in low-confidence handoff path**

At line ~420-430, change:

```typescript
      // Log the user message that triggered low confidence handoff
      logConversation(
```

to:

```typescript
      if (!input.skipMessageWrites) {
        logConversation(
```

Ensure the `.catch(...)` is also inside the `if` block.

- [ ] **Step 10: Guard logConversation in main response path**

At line ~690-702, change:

```typescript
    // 12. Log conversation asynchronously (skip for voice — transcripts are batch-saved at session end)
    if (input.source !== "voice") {
      logConversation(
```

to:

```typescript
    if (!input.skipMessageWrites && input.source !== "voice") {
      logConversation(
```

- [ ] **Step 11: Run tests to verify they pass**

Run: `node --experimental-strip-types --test tests/api/chat-engine-skip-writes.test.ts`
Expected: All tests PASS

- [ ] **Step 12: Run existing tests to verify no regressions**

Run: `node --experimental-strip-types --test tests/api/rate-limit.test.ts tests/api/embed-config-validation.test.ts tests/api/channel-connection-ownership.test.ts`
Expected: All PASS (existing behavior unchanged — the flag defaults to undefined/falsy)

- [ ] **Step 13: Commit**

STOP — user reviews and commits in IDE.

---

### Task 4: Outbound Dispatcher

**Files:**
- Create: `apps/api/src/services/channels/outbound-dispatcher.ts`
- Create: `tests/api/outbound-dispatcher.test.ts`

**Interfaces:**
- Consumes: `sendTextMessage` from `whatsapp/adapter.ts`, `getActiveConnection` from `connections.ts`, `decryptCredentials` from `connections.ts`, `supabaseAdmin`
- Produces: `DispatchResult`, `dispatchToChannel(conversationId, text) → Promise<DispatchResult>`, `canSendFreeForm(conversationId) → Promise<boolean>`, `isWithin24hWindow(lastInboundAt: Date, now?: Date) → boolean`

- [ ] **Step 1: Write the tests**

```typescript
// tests/api/outbound-dispatcher.test.ts
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

const dispatcherUrl = new URL(
  "../../apps/api/src/services/channels/outbound-dispatcher.ts",
  import.meta.url
);

describe("isWithin24hWindow (pure)", () => {
  it("returns true when last inbound is 1 hour ago", async () => {
    const mod = await import(dispatcherUrl.href);
    const now = new Date("2026-06-29T12:00:00Z");
    const lastInbound = new Date("2026-06-29T11:00:00Z");
    assert.equal(mod.isWithin24hWindow(lastInbound, now), true);
  });

  it("returns true at exactly 23h59m59s", async () => {
    const mod = await import(dispatcherUrl.href);
    const now = new Date("2026-06-30T11:59:59Z");
    const lastInbound = new Date("2026-06-29T12:00:00Z");
    assert.equal(mod.isWithin24hWindow(lastInbound, now), true);
  });

  it("returns false when last inbound is 25 hours ago", async () => {
    const mod = await import(dispatcherUrl.href);
    const now = new Date("2026-06-30T13:00:00Z");
    const lastInbound = new Date("2026-06-29T12:00:00Z");
    assert.equal(mod.isWithin24hWindow(lastInbound, now), false);
  });

  it("returns false when last inbound is exactly 24h ago", async () => {
    const mod = await import(dispatcherUrl.href);
    const now = new Date("2026-06-30T12:00:00Z");
    const lastInbound = new Date("2026-06-29T12:00:00Z");
    assert.equal(mod.isWithin24hWindow(lastInbound, now), false);
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --experimental-strip-types --test tests/api/outbound-dispatcher.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Create the outbound dispatcher**

```typescript
// apps/api/src/services/channels/outbound-dispatcher.ts
import { logger } from "../../lib/logger";
import { supabaseAdmin } from "../../lib/supabase";
import type { WhatsAppCredentials } from "../../types/channels";
import { getActiveConnection, decryptCredentials } from "./connections";
import { sendTextMessage } from "./whatsapp/adapter";

const WINDOW_MS = 24 * 60 * 60 * 1000;

export type DispatchResult =
  | { ok: true; transport: "whatsapp" | "realtime" }
  | {
      ok: false;
      reason:
        | "WINDOW_CLOSED"
        | "SEND_FAILED"
        | "CONVERSATION_NOT_FOUND"
        | "NO_ACTIVE_CONNECTION";
      detail?: string;
    };

interface ConversationForDispatch {
  project_id: string;
  source: string;
  visitor_id: string;
  metadata: Record<string, unknown> | null;
}

export function isWithin24hWindow(lastInboundAt: Date, now?: Date): boolean {
  const currentTime = now ?? new Date();
  return currentTime.getTime() - lastInboundAt.getTime() < WINDOW_MS;
}

function getLastInboundAt(
  conversation: Pick<ConversationForDispatch, "metadata">
): Date | null {
  const raw = conversation.metadata?.last_inbound_at;
  if (typeof raw !== "string") return null;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export async function canSendFreeForm(
  conversationId: string
): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from("conversations")
    .select("metadata")
    .eq("id", conversationId)
    .maybeSingle();

  if (!data) return false;
  const lastInboundAt = getLastInboundAt({
    metadata: data.metadata as Record<string, unknown> | null,
  });
  return lastInboundAt ? isWithin24hWindow(lastInboundAt) : false;
}

export async function dispatchToChannel(
  conversationId: string,
  text: string
): Promise<DispatchResult> {
  const { data: conversation } = await supabaseAdmin
    .from("conversations")
    .select("project_id, source, visitor_id, metadata")
    .eq("id", conversationId)
    .single();

  if (!conversation) return { ok: false, reason: "CONVERSATION_NOT_FOUND" };
  const convo = conversation as ConversationForDispatch;

  if (convo.source !== "whatsapp") return { ok: true, transport: "realtime" };

  const lastInboundAt = getLastInboundAt(convo);
  if (!lastInboundAt || !isWithin24hWindow(lastInboundAt)) {
    return { ok: false, reason: "WINDOW_CLOSED" };
  }

  const conn = await getActiveConnection(
    convo.project_id,
    "whatsapp"
  );
  if (!conn) return { ok: false, reason: "NO_ACTIVE_CONNECTION" };

  const creds = decryptCredentials<WhatsAppCredentials>(
    conn.encryptedCredentials
  );

  // Extract phone from visitor_id (format: "whatsapp:<wa_id>")
  const waId = convo.visitor_id.replace(/^whatsapp:/, "");

  try {
    await sendTextMessage(conn.externalId, creds.accessToken, waId, text);
    return { ok: true, transport: "whatsapp" };
  } catch (error) {
    logger.error("WhatsApp dispatch failed", error, { conversationId });
    return {
      ok: false,
      reason: "SEND_FAILED",
      detail: error instanceof Error ? error.message : String(error),
    };
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --experimental-strip-types --test tests/api/outbound-dispatcher.test.ts`
Expected: All tests PASS

- [ ] **Step 5: Commit**

STOP — user reviews and commits in IDE.

---

### Task 5: Inbound Orchestrator + Rate Limit

**Files:**
- Create: `supabase/migrations/20260629000006_create_channel_inbound_events.sql`
- Create: `apps/api/src/services/channels/inbound-reservations.ts`
- Create: `apps/api/src/services/channels/whatsapp/inbound.ts`
- Create: `apps/api/src/services/channels/whatsapp/rate-limit.ts`
- Create: `tests/api/whatsapp-inbound.test.ts`

**Interfaces:**
- Consumes: `resolveConnectionConfig` from `config.ts`, `resolveConversation` from `conversation-resolver.ts`, `reserveInboundEvent` / `completeInboundEvent` from `inbound-reservations.ts`, `processChat` from `chat-engine.ts`, `addMessage` and `getConversationHistory` from `conversation.ts`, `broadcastNewMessage` from `realtime.ts`, `dispatchToChannel` from `outbound-dispatcher.ts`, `ParsedInbound` from `whatsapp/adapter.ts`, `ChannelConnection` type, rate-limit helper from `rate-limit.ts`
- Produces: `handleInbound(conn, parsed) → Promise<void>`, `shouldSuppressAiReply(status, agentRepliedAfter) → boolean`

- [ ] **Step 1: Write the tests**

```typescript
// tests/api/whatsapp-inbound.test.ts
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

describe("shouldSuppressAiReply (pure)", () => {
  it("does not suppress when ai_active and no agent replied", async () => {
    const mod = await import(inboundUrl.href);
    assert.equal(mod.shouldSuppressAiReply("ai_active", false), false);
  });

  it("suppresses when status changed to agent_active", async () => {
    const mod = await import(inboundUrl.href);
    assert.equal(mod.shouldSuppressAiReply("agent_active", false), true);
  });

  it("suppresses when status changed to waiting", async () => {
    const mod = await import(inboundUrl.href);
    assert.equal(mod.shouldSuppressAiReply("waiting", false), true);
  });

  it("suppresses when status is resolved", async () => {
    const mod = await import(inboundUrl.href);
    assert.equal(mod.shouldSuppressAiReply("resolved", false), true);
  });

  it("suppresses when status is closed", async () => {
    const mod = await import(inboundUrl.href);
    assert.equal(mod.shouldSuppressAiReply("closed", false), true);
  });

  it("suppresses when ai_active but agent replied after inbound", async () => {
    const mod = await import(inboundUrl.href);
    assert.equal(mod.shouldSuppressAiReply("ai_active", true), true);
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
    const addCustomerIdx = src.indexOf('conversationId,\n      "customer"');
    assert.ok(historyIdx !== -1 && addCustomerIdx !== -1);
    assert.ok(
      historyIdx < addCustomerIdx,
      "History must be loaded before inserting the just-arrived customer message"
    );
  });

  it("passes explicit conversationHistory into processChat", () => {
    assert.ok(
      src.includes("conversationHistory") && src.includes("priorHistory"),
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --experimental-strip-types --test tests/api/whatsapp-inbound.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Create the inbound reservation migration**

```sql
-- supabase/migrations/20260629000006_create_channel_inbound_events.sql
CREATE TABLE IF NOT EXISTS public.channel_inbound_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL CHECK (provider IN ('whatsapp')),
  external_message_id TEXT NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'processing'
    CHECK (status IN ('processing', 'processed', 'failed')),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_channel_inbound_events_provider_message
  ON public.channel_inbound_events(provider, external_message_id);

CREATE INDEX IF NOT EXISTS idx_channel_inbound_events_project_created
  ON public.channel_inbound_events(project_id, created_at DESC);

ALTER TABLE public.channel_inbound_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.channel_inbound_events FROM anon;
REVOKE ALL ON TABLE public.channel_inbound_events FROM authenticated;
REVOKE TRUNCATE, REFERENCES, TRIGGER ON TABLE public.channel_inbound_events FROM anon, authenticated;
```

- [ ] **Step 4: Create the inbound reservation helper**

```typescript
// apps/api/src/services/channels/inbound-reservations.ts
import { supabaseAdmin } from "../../lib/supabase";
import type { ChannelProvider } from "../../types/channels";

export interface InboundReservation {
  id: string;
  createdAt: string;
}

export async function reserveInboundEvent(
  provider: ChannelProvider,
  externalMessageId: string,
  projectId: string,
  payload: Record<string, unknown>
): Promise<InboundReservation | null> {
  const { data, error } = await supabaseAdmin
    .from("channel_inbound_events")
    .insert({
      provider,
      external_message_id: externalMessageId,
      project_id: projectId,
      payload,
    })
    .select("id, created_at")
    .single();

  if (error) {
    if (error.code === "23505") return null;
    throw error;
  }

  return data ? { id: data.id, createdAt: data.created_at } : null;
}

export async function completeInboundEvent(
  reservationId: string,
  conversationId: string
): Promise<void> {
  const { error } = await supabaseAdmin
    .from("channel_inbound_events")
    .update({
      conversation_id: conversationId,
      status: "processed",
      processed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", reservationId);

  if (error) throw error;
}

export async function failInboundEvent(
  reservationId: string,
  errorMessage: string
): Promise<void> {
  await supabaseAdmin
    .from("channel_inbound_events")
    .update({
      status: "failed",
      error: errorMessage,
      updated_at: new Date().toISOString(),
    })
    .eq("id", reservationId);
}
```

- [ ] **Step 5: Create the inbound orchestrator**

```typescript
// apps/api/src/services/channels/whatsapp/inbound.ts
import { logger } from "../../../lib/logger";
import { supabaseAdmin } from "../../../lib/supabase";
import type { ChannelConnection } from "../../../types/channels";
import { processChat } from "../../chat-engine";
import { addMessage, getConversationHistory } from "../../conversation";
import { broadcastNewMessage } from "../../realtime";
import { resolveConnectionConfig } from "../config";
import { resolveConversation } from "../conversation-resolver";
import {
  completeInboundEvent,
  failInboundEvent,
  reserveInboundEvent,
} from "../inbound-reservations";
import { dispatchToChannel } from "../outbound-dispatcher";
import type { ParsedInbound } from "./adapter";
import { checkSenderRateLimit } from "./rate-limit";

const UNSUPPORTED_NOTICE =
  "I can read text messages right now — please type your question.";

export function shouldSuppressAiReply(
  status: string,
  agentRepliedAfter: boolean
): boolean {
  if (status !== "ai_active") return true;
  if (agentRepliedAfter) return true;
  return false;
}

async function getConversationStatus(
  conversationId: string,
): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from("conversations")
    .select("status")
    .eq("id", conversationId)
    .single();

  if (error) throw error;
  return data?.status ?? null;
}

async function stampLastInboundAt(
  conversationId: string
): Promise<string> {
  const inboundAt = new Date().toISOString();
  const { data } = await supabaseAdmin
    .from("conversations")
    .select("metadata")
    .eq("id", conversationId)
    .single();

  const existingMetadata =
    data?.metadata && typeof data.metadata === "object"
      ? (data.metadata as Record<string, unknown>)
      : {};

  const { error } = await supabaseAdmin
    .from("conversations")
    .update({
      metadata: {
        ...existingMetadata,
        last_inbound_at: inboundAt,
      },
    })
    .eq("id", conversationId);

  if (error) throw error;
  return inboundAt;
}

async function hasAgentMessageAfter(
  conversationId: string,
  afterIso: string
): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from("messages")
    .select("id")
    .eq("conversation_id", conversationId)
    .eq("sender_type", "agent")
    .gt("created_at", afterIso)
    .limit(1)
    .maybeSingle();
  return data !== null;
}

async function upsertCustomerPhone(
  projectId: string,
  visitorId: string,
  phone: string
): Promise<void> {
  await supabaseAdmin
    .from("customers")
    .update({ phone })
    .eq("project_id", projectId)
      .eq("visitor_id", visitorId);
}

async function addAndBroadcastMessage(
  conversationId: string,
  senderType: "customer" | "ai",
  content: string,
  metadata: Record<string, unknown>,
  logCtx: Record<string, unknown>
): Promise<{ id: string; createdAt: string }> {
  const id = await addMessage(conversationId, senderType, content, metadata);
  const createdAt = new Date().toISOString();

  broadcastNewMessage(conversationId, {
    id,
    senderType,
    content,
    createdAt,
    metadata,
  }).catch((err) => logger.error("Realtime broadcast error", err, logCtx));

  return { id, createdAt };
}

async function persistAndDispatchAiMessage(
  conversationId: string,
  content: string,
  metadata: Record<string, unknown>,
  logCtx: Record<string, unknown>
): Promise<void> {
  await addAndBroadcastMessage(conversationId, "ai", content, metadata, logCtx);

  const dispatchResult = await dispatchToChannel(conversationId, content);
  if (!dispatchResult.ok) {
    logger.error("WhatsApp dispatch failed", dispatchResult, logCtx);
  }
}

export async function handleInbound(
  conn: ChannelConnection & { encryptedCredentials: string },
  parsed: ParsedInbound
): Promise<void> {
  const logCtx = {
    projectId: conn.projectId,
    waMessageId: parsed.waMessageId,
    waId: parsed.waId,
  };

  // Per-sender rate limit — drop silently if exceeded
  const senderKey = `wa:${parsed.waId}`;
  if (checkSenderRateLimit(senderKey)) {
    logger.warn("Sender rate-limited, dropping", logCtx);
    return;
  }

  // Durable idempotency reservation in channel_inbound_events. This must run
  // before resolveConversation so concurrent first-message retries cannot
  // create duplicate empty conversations.
  const reservation = await reserveInboundEvent("whatsapp", parsed.waMessageId, conn.projectId, {
    phoneNumberId: parsed.phoneNumberId,
    waId: parsed.waId,
    type: parsed.type,
  });
  if (!reservation) {
    logger.info("Duplicate inbound event, skipping", logCtx);
    return;
  }

  const config = resolveConnectionConfig(
    conn.config as Record<string, unknown>
  );
  const visitorId = `whatsapp:${parsed.waId}`;

  try {
    const conversationId = await resolveConversation(
      conn.projectId,
      visitorId,
      "whatsapp",
      config.resolutionStrategy
    );

    // Load history before inserting this inbound message. With
    // skipMessageWrites=true, processChat will not autoload DB history, because
    // that would include this just-inserted customer message and duplicate it
    // in the LLM context.
    const priorHistory = await getConversationHistory(conversationId);

    const inboundAt = await stampLastInboundAt(conversationId);
    const customerContent =
      parsed.type === "text" ? parsed.text : "[unsupported WhatsApp message]";

    await addAndBroadcastMessage(
      conversationId,
      "customer",
      customerContent,
      { wa_message_id: parsed.waMessageId, phone: parsed.waId },
      logCtx
    );

    await completeInboundEvent(reservation.id, conversationId);

    upsertCustomerPhone(conn.projectId, visitorId, parsed.waId).catch((err) =>
      logger.error("Customer phone upsert error", err, logCtx)
    );

    if (parsed.type === "unsupported") {
      await persistAndDispatchAiMessage(
        conversationId,
        UNSUPPORTED_NOTICE,
        { source: "whatsapp", unsupported: true },
        logCtx
      );
      return;
    }

    // If AI auto-reply is disabled, stop after persisting customer message.
    if (!config.aiAutoReply) return;

    const result = await processChat({
      projectId: conn.projectId,
      visitorId,
      message: parsed.text,
      sessionId: conversationId,
      source: "whatsapp",
      conversationHistory: priorHistory,
      skipMessageWrites: true,
    });

    if (!result.response) return;

    // If this processChat call itself triggered handoff, the conversation is
    // expected to be waiting now. Persist and send the "agent will join" ack;
    // do not run the stale-state guard against the status change we caused.
    if (result.handoff?.triggered) {
      await persistAndDispatchAiMessage(
        conversationId,
        result.response,
        { source: "whatsapp", handoff: true },
        logCtx
      );
      return;
    }

    // Stale-state guard: re-read conversation + check for agent activity.
    const freshStatus = await getConversationStatus(conversationId);
    const agentRepliedAfter = await hasAgentMessageAfter(
      conversationId,
      inboundAt
    );

    if (
      shouldSuppressAiReply(freshStatus ?? "ai_active", agentRepliedAfter)
    ) {
      logger.info("AI reply suppressed by stale-state guard", {
        ...logCtx,
        freshStatus,
        agentRepliedAfter,
      });
      return;
    }

    await persistAndDispatchAiMessage(
      conversationId,
      result.response,
      { source: "whatsapp" },
      logCtx
    );
  } catch (err) {
    await failInboundEvent(
      reservation.id,
      err instanceof Error ? err.message : String(err)
    );
    throw err;
  }
}
```

- [ ] **Step 6: Create the per-sender rate limit helper**

```typescript
// apps/api/src/services/channels/whatsapp/rate-limit.ts
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 30;

const senderCounts = new Map<
  string,
  { count: number; resetAt: number }
>();

/**
 * Returns true if the sender should be rate-limited (drop the message).
 * Standalone in-memory counter keyed by sender phone — does not share
 * state with the HTTP middleware rate limiter.
 */
export function checkSenderRateLimit(senderKey: string): boolean {
  const now = Date.now();
  const entry = senderCounts.get(senderKey);

  if (!entry || entry.resetAt < now) {
    senderCounts.set(senderKey, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }

  entry.count++;
  return entry.count > MAX_REQUESTS;
}

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of senderCounts) {
    if (entry.resetAt < now) senderCounts.delete(key);
  }
}, 5 * 60_000).unref();
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `node --experimental-strip-types --test tests/api/whatsapp-inbound.test.ts`
Expected: All tests PASS

- [ ] **Step 8: Commit**

STOP — user reviews and commits in IDE.

---

### Task 6: Webhook Route + rawBody + Mount

**Files:**
- Create: `apps/api/src/types/express.d.ts`
- Create: `apps/api/src/routes/channels/whatsapp.ts`
- Modify: `apps/api/src/index.ts`
- Create: `tests/api/whatsapp-webhook.test.ts`

**Interfaces:**
- Consumes: `verifyWebhookChallenge` and `verifySignature` from `whatsapp/adapter.ts`, `parseInbound` from `whatsapp/adapter.ts`, `getConnectionByExternalId` and `decryptCredentials` from `connections.ts`, `handleInbound` from `whatsapp/inbound.ts`, `WhatsAppCredentials` type
- Produces: `GET /api/channels/whatsapp/webhook` (verification), `POST /api/channels/whatsapp/webhook` (receive), `whatsappWebhookRouter` Express router

- [ ] **Step 1: Write the source inspection test**

```typescript
// tests/api/whatsapp-webhook.test.ts
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
      src.includes("verifySignature"),
      "Must verify HMAC signature"
    );
  });

  it("verifies HMAC before sending the 200 ACK", () => {
    const verifyIdx = src.indexOf("verifySignature(rawBody");
    const ackIdx = src.indexOf("// Fast ACK only after HMAC verification");
    assert.ok(verifyIdx !== -1 && ackIdx !== -1);
    assert.ok(
      verifyIdx < ackIdx,
      "Invalid signatures must return 401, so verification must happen before ACK"
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --experimental-strip-types --test tests/api/whatsapp-webhook.test.ts`
Expected: FAIL

- [ ] **Step 3: Create Express type augmentation for rawBody**

```typescript
// apps/api/src/types/express.d.ts
declare namespace Express {
  interface Request {
    rawBody?: Buffer;
  }
}
```

- [ ] **Step 4: Add rawBody capture to index.ts**

In `apps/api/src/index.ts`, change line 83:

```typescript
app.use(express.json({ limit: "10mb" }));
```

to:

```typescript
app.use(
  express.json({
    limit: "10mb",
    verify: (req, _res, buf) => {
      (req as any).rawBody = buf;
    },
  })
);
```

- [ ] **Step 5: Create the webhook route**

```typescript
// apps/api/src/routes/channels/whatsapp.ts
import { Router } from "express";
import type { Request, Response } from "express";

import { logger } from "../../lib/logger";
import type { WhatsAppCredentials } from "../../types/channels";
import {
  verifyWebhookChallenge,
  verifySignature,
  extractPhoneNumberId,
  parseInbound,
} from "../../services/channels/whatsapp/adapter";
import {
  getConnectionByExternalId,
  decryptCredentials,
} from "../../services/channels/connections";
import { handleInbound } from "../../services/channels/whatsapp/inbound";

export const whatsappWebhookRouter = Router();

// GET /api/channels/whatsapp/webhook — Meta verification challenge
whatsappWebhookRouter.get("/webhook", (req: Request, res: Response) => {
  const mode = req.query["hub.mode"] as string | undefined;
  const token = req.query["hub.verify_token"] as string | undefined;
  const challenge = req.query["hub.challenge"] as string | undefined;

  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;
  if (!verifyToken) {
    logger.error("WHATSAPP_VERIFY_TOKEN not configured");
    return res.sendStatus(403);
  }

  const result = verifyWebhookChallenge(mode, token, challenge, verifyToken);
  if (result !== null) {
    return res.status(200).send(result);
  }

  return res.sendStatus(403);
});

// POST /api/channels/whatsapp/webhook — Receive inbound messages
whatsappWebhookRouter.post("/webhook", async (req: Request, res: Response) => {
  const phoneNumberId = extractPhoneNumberId(req.body);
  if (!phoneNumberId) return res.sendStatus(200); // malformed/irrelevant event; ACK and drop

  const conn = await getConnectionByExternalId(
    "whatsapp",
    phoneNumberId
  );
  if (!conn) {
    logger.warn("No active connection for phone_number_id", {
      phoneNumberId,
    });
    return res.sendStatus(200); // unknown number → ACK to avoid retry storms
  }

  const rawBody = req.rawBody;
  if (!rawBody) {
    logger.error("rawBody not available for HMAC verification");
    return res.sendStatus(401);
  }

  const creds = decryptCredentials<WhatsAppCredentials>(
    conn.encryptedCredentials
  );
  const signature = req.headers["x-hub-signature-256"] as string | undefined;
  if (!verifySignature(rawBody, signature, creds.appSecret)) {
    logger.warn("Invalid webhook signature", {
      phoneNumberId,
    });
    return res.sendStatus(401);
  }

  const parsed = parseInbound(req.body);
  if (!parsed) return res.sendStatus(200); // status-only webhook; verified, ACK and drop

  // Fast ACK only after HMAC verification. RAG/LLM work happens async.
  res.sendStatus(200);
  void handleInbound(conn, parsed).catch((err) =>
    logger.error("Webhook processing error", err)
  );
});
```

- [ ] **Step 6: Mount webhook route in index.ts**

In `apps/api/src/index.ts`, add the import near the top with other route imports:

```typescript
import { whatsappWebhookRouter } from "./routes/channels/whatsapp";
```

Then add the route mount. Place it after the cron routes (line ~151) and before the Sentry error handler (line ~155):

```typescript
// WhatsApp webhook (open CORS — called by Meta servers, no auth middleware)
app.use("/api/channels/whatsapp", widgetCors, whatsappWebhookRouter);
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `node --experimental-strip-types --test tests/api/whatsapp-webhook.test.ts`
Expected: All tests PASS

- [ ] **Step 8: Commit**

STOP — user reviews and commits in IDE.

---

### Task 7: Agent Send Path Wiring

**Files:**
- Modify: `apps/api/src/routes/conversations.ts`
- Create: `tests/api/agent-send-dispatch.test.ts`

**Interfaces:**
- Consumes: `dispatchToChannel` from `outbound-dispatcher.ts`, `canSendFreeForm` from `outbound-dispatcher.ts`
- Produces: Agent replies to WhatsApp conversations are dispatched to the customer's phone via the Graph API

- [ ] **Step 1: Write the source inspection test**

```typescript
// tests/api/agent-send-dispatch.test.ts
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

  it("imports canSendFreeForm", () => {
    assert.ok(
      src.includes("canSendFreeForm"),
      "Must import canSendFreeForm for 24h window check"
    );
  });

  it("selects source and visitor_id from conversation", () => {
    const postBlock = src.slice(
      src.indexOf("/:id/messages"),
      src.indexOf("/:id/messages") + 3000
    );
    assert.ok(
      postBlock.includes("source") && postBlock.includes("visitor_id"),
      "Must select source and visitor_id in POST /:id/messages"
    );
  });

  it("calls dispatchToChannel after message creation", () => {
    const postBlock = src.slice(
      src.indexOf("/:id/messages"),
      src.indexOf("/:id/messages") + 4000
    );
    assert.ok(
      postBlock.includes("dispatchToChannel"),
      "Must call dispatchToChannel after agent message insert"
    );
  });

  it("checks 24h window for whatsapp source", () => {
    const postBlock = src.slice(
      src.indexOf("/:id/messages"),
      src.indexOf("/:id/messages") + 4000
    );
    assert.ok(
      postBlock.includes("canSendFreeForm") || postBlock.includes("whatsapp"),
      "Must check free-form window for WhatsApp conversations"
    );
  });

  it("checks the 24h window before inserting the message", () => {
    const postBlock = src.slice(
      src.indexOf("/:id/messages"),
      src.indexOf("/:id/messages") + 5000
    );
    const windowIdx = postBlock.indexOf("canSendFreeForm");
    const insertIdx = postBlock.indexOf(".insert({");
    assert.ok(windowIdx !== -1 && insertIdx !== -1);
    assert.ok(
      windowIdx < insertIdx,
      "WINDOW_CLOSED must be rejected before message insert/broadcast"
    );
  });

  it("awaits dispatch instead of fire-and-forget then/catch", () => {
    const postBlock = src.slice(
      src.indexOf("/:id/messages"),
      src.indexOf("/:id/messages") + 5000
    );
    assert.ok(postBlock.includes("await dispatchToChannel"));
    assert.ok(!postBlock.includes("canSendFreeForm(id).then"));
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --experimental-strip-types --test tests/api/agent-send-dispatch.test.ts`
Expected: FAIL — no dispatchToChannel import found

- [ ] **Step 3: Add imports to conversations.ts**

At the top of `apps/api/src/routes/conversations.ts`, add:

```typescript
import {
  dispatchToChannel,
  canSendFreeForm,
} from "../services/channels/outbound-dispatcher";
```

- [ ] **Step 4: Add source and visitor_id to conversation select**

In `apps/api/src/routes/conversations.ts`, at the POST `/:id/messages` handler, find the conversation select (around line 750):

```typescript
        .select("id, project_id, status, assigned_agent_id, first_response_at")
```

Change to:

```typescript
        .select("id, project_id, status, assigned_agent_id, first_response_at, source, visitor_id")
```

- [ ] **Step 5: Add pre-insert 24h window check and awaited dispatch**

Before the `// Create message` block (after the existing agent assignment/status checks), add:

```typescript
      // WhatsApp free-form messages must be inside the 24h service window.
      // Check before insert/broadcast so WINDOW_CLOSED does not create a ghost
      // "sent" message in the inbox.
      if (conversation.source === "whatsapp" && senderType === "agent") {
        const allowed = await canSendFreeForm(id);
        if (!allowed) {
          return res.status(409).json({
            error: {
              code: "WINDOW_CLOSED",
              message:
                "The WhatsApp 24-hour service window is closed. Re-engagement templates are not available in v1.",
            },
          });
        }
      }
```

After the message insert succeeds, but before `broadcastNewMessage` and before the response, add:

```typescript
      if (conversation.source === "whatsapp" && senderType === "agent") {
        const dispatchResult = await dispatchToChannel(id, content);
        if (!dispatchResult.ok) {
          const status =
            dispatchResult.reason === "WINDOW_CLOSED" ? 409 : 502;
          return res.status(status).json({
            error: {
              code: dispatchResult.reason,
              message:
                dispatchResult.reason === "WINDOW_CLOSED"
                  ? "The WhatsApp 24-hour service window is closed."
                  : "Failed to deliver the WhatsApp message.",
            },
          });
        }
      }
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `node --experimental-strip-types --test tests/api/agent-send-dispatch.test.ts`
Expected: All tests PASS

- [ ] **Step 7: Run the full test suite**

Run: `node --experimental-strip-types --test tests/api/*.test.ts tests/widget/*.test.ts tests/web/*.test.ts tests/shared/*.test.ts`
Expected: All tests PASS (no regressions)

- [ ] **Step 8: Commit**

STOP — user reviews and commits in IDE.

---

## Post-Implementation Checklist

After all 7 tasks are done:

1. **Environment variables needed** (user must set before testing):
   - `WHATSAPP_VERIFY_TOKEN` — arbitrary string registered with Meta webhook config
   - WhatsApp connection credentials are per-project (stored encrypted in `channel_connections`)

2. **Manual integration test flow** (requires Meta test number):
   - Configure a WhatsApp Business test number in Meta developer console
   - Create a channel connection via the existing CHAN-001 dashboard UI
   - Send a text message from a test phone to the connected number
   - Verify: AI reply arrives, conversation appears in dashboard, agent can reply

3. **What's NOT in this batch** (future work):
   - Template messages (for outside 24h window)
   - Media message handling (images, audio, documents)
   - Read receipts / delivery status tracking
   - Multi-number / shared inbox support
   - WhatsApp-specific UI in the agent dashboard
