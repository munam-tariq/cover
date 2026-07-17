/**
 * Conversation CSAT
 *
 * Covers the two things that make this endpoint safe rather than merely working:
 *  - it is fail-closed (it is a service-role write on a caller-named conversation, so the gate's
 *    default monitor mode would be an unauthenticated cross-tenant write), and
 *  - a rating is not activity (writing an activity column here would reset the countdown the
 *    inactivity warning just started and make the conversation immortal).
 *
 * Plus the metadata plumbing the rating prompt rides on — the prompt is attached to a message's
 * metadata, and every layer between the DB and the render used to drop it.
 */

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  evaluateWidgetSessionGate,
  signWidgetSessionToken,
} from "../../apps/api/src/services/widget-session-token.ts";

const SECRET = "csat-test-secret";
const CONVERSATION = "33333333-3333-3333-3333-333333333333";
const OTHER_CONVERSATION = "44444444-4444-4444-4444-444444444444";

const conversationsRoutePath = new URL(
  "../../apps/api/src/routes/conversations.ts",
  import.meta.url
);
const middlewarePath = new URL(
  "../../apps/api/src/middleware/require-widget-session.ts",
  import.meta.url
);

const read = (p: string) => readFile(new URL(p, import.meta.url), "utf8");

/** Comments explain the invariants below; only the code can violate them. */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

function tokenFor(conversationId: string): string {
  return signWidgetSessionToken(
    {
      projectId: "11111111-1111-1111-1111-111111111111",
      visitorId: "vis_test",
      conversationId,
      exp: Math.floor(Date.now() / 1000) + 600,
    },
    SECRET
  );
}

test.before(() => {
  process.env.WIDGET_SESSION_SECRET = SECRET;
  delete process.env.WIDGET_GATE_ENFORCE;
});

// ---------------------------------------------------------------------------
// Session binding (the BOLA tests)
// ---------------------------------------------------------------------------

test("a missing token is denied — the caller proved nothing", () => {
  assert.deepEqual(
    evaluateWidgetSessionGate({ conversationId: CONVERSATION, secret: SECRET }),
    { allow: false, denyCode: "SESSION_INVALID" }
  );
});

test("a token bound to a DIFFERENT conversation is denied", () => {
  // The BOLA case: a real, correctly-signed session for a conversation the caller does own must
  // not authorize a write to someone else's.
  assert.deepEqual(
    evaluateWidgetSessionGate({
      conversationId: CONVERSATION,
      token: tokenFor(OTHER_CONVERSATION),
      secret: SECRET,
    }),
    { allow: false, denyCode: "SESSION_CONVERSATION_MISMATCH" }
  );
});

test("a forged/garbage token is denied", () => {
  assert.deepEqual(
    evaluateWidgetSessionGate({
      conversationId: CONVERSATION,
      token: "not.atoken",
      secret: SECRET,
    }),
    { allow: false, denyCode: "SESSION_INVALID" }
  );
});

test("a token bound to this conversation is allowed", () => {
  assert.deepEqual(
    evaluateWidgetSessionGate({
      conversationId: CONVERSATION,
      token: tokenFor(CONVERSATION),
      secret: SECRET,
    }),
    { allow: true }
  );
});

test("an expired token is denied", () => {
  const expired = signWidgetSessionToken(
    {
      projectId: "11111111-1111-1111-1111-111111111111",
      visitorId: "vis_test",
      conversationId: CONVERSATION,
      exp: Math.floor(Date.now() / 1000) - 1,
    },
    SECRET
  );
  assert.deepEqual(
    evaluateWidgetSessionGate({
      conversationId: CONVERSATION,
      token: expired,
      secret: SECRET,
    }),
    { allow: false, denyCode: "SESSION_INVALID" }
  );
});

// ---------------------------------------------------------------------------
// Fail-closed wiring
// ---------------------------------------------------------------------------

test("the gate fails closed when a route opts in, independently of WIDGET_GATE_ENFORCE", async () => {
  const source = await readFile(middlewarePath, "utf8");
  assert.match(
    source,
    /options\.enforce\s*\|\|\s*process\.env\.WIDGET_GATE_ENFORCE === "true"/,
    "enforce:true must deny on its own; the env var is only the global rollout switch"
  );
  // Monitor mode must remain the default so the read routes keep working during rollout.
  assert.match(source, /\[WidgetSession:monitor\] would-deny/);
});

// ---------------------------------------------------------------------------
// Route wiring
// ---------------------------------------------------------------------------

test("the CSAT route is mounted with the enforcing gate", async () => {
  const source = await readFile(conversationsRoutePath, "utf8");
  const csatIndex = source.indexOf('"/:id/csat"');
  assert.ok(csatIndex > -1, "POST /:id/csat should exist");

  const mount = source.slice(csatIndex, csatIndex + 200);
  assert.match(
    mount,
    /requireWidgetSession\(\{\s*enforce:\s*true\s*\}\)/,
    "CSAT must be fail-closed; the default gate is monitor mode"
  );
});

test("CSAT writes only the satisfaction columns — a rating is not activity", async () => {
  const source = stripComments(await readFile(conversationsRoutePath, "utf8"));
  const csatIndex = source.indexOf('"/:id/csat"');
  const body = source.slice(csatIndex, source.indexOf('"/:id/realtime-token"'));

  // Touching any activity column here would reset the countdown the warning just started.
  for (const forbidden of [
    "last_customer_message_at",
    "last_voice_activity_at",
    "customer_last_seen_at",
    "customer_replied_since_warning",
    "auto_close_warning_sent_at",
    "status:",
  ]) {
    assert.ok(
      !body.includes(forbidden),
      `CSAT must not write ${forbidden} — a rating means "I'm finished", not "I'm still here"`
    );
  }

  assert.ok(body.includes("satisfaction_rating"));
  // UPDATE, never upsert: the columns live on an existing conversation row.
  assert.ok(body.includes(".update("), "CSAT should UPDATE");
  assert.ok(!body.includes(".upsert("), "CSAT must not upsert");
});

test("CSAT is not gated on conversation status — the customer rates as it closes", async () => {
  const source = stripComments(await readFile(conversationsRoutePath, "utf8"));
  const csatIndex = source.indexOf('"/:id/csat"');
  const body = source.slice(csatIndex, source.indexOf('"/:id/realtime-token"'));

  // By the time a rating lands, the cron has usually already closed the conversation.
  assert.ok(
    !body.includes('.in("status"') && !body.includes('.eq("status"'),
    "CSAT must accept ratings on closed/resolved conversations"
  );
});

// ---------------------------------------------------------------------------
// Metadata plumbing — the prompt rides on message metadata
// ---------------------------------------------------------------------------

test("the public messages API emits message metadata", async () => {
  const source = await readFile(conversationsRoutePath, "utf8");
  const mapIndex = source.indexOf("const messagesResponse");
  assert.ok(mapIndex > -1);
  const mapping = source.slice(mapIndex, mapIndex + 400);
  assert.match(
    mapping,
    /metadata:\s*msg\.metadata/,
    "csat_prompt lives in message metadata; dropping it here makes the prompt unrenderable"
  );
});

test("the widget converts server messages through one mapper that preserves metadata", async () => {
  const converter = await readFile(
    new URL("../../apps/widget/src/utils/messages.ts", import.meta.url),
    "utf8"
  );
  assert.match(converter, /metadata/);

  // All three sources (fetch-all, poll, realtime) must go through it — the duplication is what
  // dropped metadata in three places to begin with.
  const chatWindow = stripComments(
    await readFile(
      new URL(
        "../../apps/widget/src/components/chat-window.ts",
        import.meta.url
      ),
      "utf8"
    )
  );
  // One import + the three conversion sites (fetch-all passes it by reference to .map).
  const references = chatWindow.match(/toStoredMessage/g) ?? [];
  assert.ok(
    references.length >= 4,
    `expected all 3 conversion sites to use toStoredMessage, found ${references.length - 1}`
  );

  // No hand-rolled conversion may survive alongside it, or metadata silently drops again.
  assert.ok(
    !/role:\s*msg\.senderType === "customer"/.test(chatWindow),
    "an inline message conversion is still present; route it through toStoredMessage"
  );
});

test("the hosted public page maps metadata onto its own message model", async () => {
  const publicChat = await readFile(
    new URL(
      "../../apps/web/app/[locale]/c/[handle]/public-chat.tsx",
      import.meta.url
    ),
    "utf8"
  );
  const mapIndex = publicChat.indexOf("function mapServerMessage");
  assert.ok(mapIndex > -1);
  assert.match(
    publicChat.slice(mapIndex, mapIndex + 400),
    /metadata:\s*m\.metadata/,
    "the public page has its own DTO; it needs the same plumbing as the widget"
  );
});

test("both prompt-carrying messages can render the control on the public page", async () => {
  // The two triggers do NOT share a sender_type: the inactivity warning is 'ai', the resolve notice
  // is 'system'. The widget can't see the difference — its mapper collapses every non-customer
  // sender to "assistant" — but the public page keeps them distinct, so a gate on "assistant" drops
  // the resolve prompt silently while the warning prompt keeps working.
  const handoff = stripComments(
    await read("../../apps/api/src/routes/handoff.ts")
  );
  const resolveInsert = handoff.slice(handoff.indexOf("const messageMetadata"));
  assert.match(
    resolveInsert.slice(0, 400),
    /sender_type:\s*"system"/,
    "if resolve stops being a system message, the gate below needs revisiting"
  );

  const publicChat = stripComments(
    await read("../../apps/web/app/[locale]/c/[handle]/public-chat.tsx")
  );
  assert.ok(
    !/m\.role === "assistant" && m\.metadata\?\.csat_prompt/.test(publicChat),
    "gating on assistant drops the resolve prompt — its role maps from sender_type 'system'"
  );
  assert.match(
    publicChat,
    /m\.role !== "user" && m\.metadata\?\.csat_prompt === true/
  );

  // ...and the renderer must actually reach the footer for a system message, which returns early.
  // Bounded slice, not a slice to some later marker: comments are stripped first, so a JSX marker
  // like {/* Avatar */} is gone and indexOf would return -1 — slicing to the file end, where the
  // MAIN body's {footer} would satisfy this and hide the early return.
  const chatMessage = stripComments(
    await read("../../apps/web/components/chat/chat-message.tsx")
  );
  const systemBranchStart = chatMessage.indexOf('if (role === "system")');
  assert.ok(systemBranchStart > -1, "the system early-return moved");
  assert.match(
    chatMessage.slice(systemBranchStart, systemBranchStart + 400),
    /\{footer/,
    "the system early-return must render the footer, or the resolve prompt never mounts"
  );
});

test("both surfaces read the same csat_prompt key the server writes", async () => {
  // The metadata key is the contract between the WARN/resolve writers and two independently
  // implemented clients. If one surface renames it, that surface silently stops prompting — the
  // plumbing all still "works" and nothing throws.
  const server = await read(
    "../../supabase/migrations/20260715000003_auto_close_rpcs.sql"
  );
  assert.match(
    server,
    /'csat_prompt'\s*,\s*true/,
    "the WARN message must carry the prompt"
  );

  const widget = await read("../../apps/widget/src/components/message.ts");
  assert.match(widget, /metadata\?\.csat_prompt === true/);

  const publicChat = await read(
    "../../apps/web/app/[locale]/c/[handle]/public-chat.tsx"
  );
  assert.match(publicChat, /m\.metadata\?\.csat_prompt === true/);
});

test("the hosted public page renders the rating control and posts it", async () => {
  const publicChat = stripComments(
    await read("../../apps/web/app/[locale]/c/[handle]/public-chat.tsx")
  );
  // Plumbing metadata through five layers achieves nothing if nothing renders it — the whole point
  // of the feature is a control the customer can actually click.
  assert.match(publicChat, /<CsatControl/, "the control must be mounted");
  assert.match(
    publicChat,
    /shouldPromptCsat\(m\)/,
    "the control must be gated on the server's prompt, not shown on every message"
  );
  assert.match(
    publicChat,
    /await submitCsat\(/,
    "the rating must reach the API"
  );

  const api = stripComments(
    await read("../../apps/web/app/[locale]/c/[handle]/lib/public-api.ts")
  );
  assert.match(api, /conversations\/\$\{conversationId\}\/csat/);
  assert.match(
    api,
    /"X-FrontFace-Session":\s*sessionToken/,
    "the session token is the authorization; without it the route is a BOLA hole"
  );

  const control = await read(
    "../../apps/web/app/[locale]/c/[handle]/csat-control.tsx"
  );
  // 1→5 must not mirror to 5→1 under RTL, which would invert every rating an Arabic customer gives.
  assert.match(control, /dir="ltr"/, "the scale must not mirror under RTL");
  assert.ok(
    !/[1-5]\s*(?:stars?|thumbs)/i.test(control),
    "the DB CHECK is 1..5 — this is a 5-point scale, not thumbs"
  );
});

test("a persisted conversation rating survives rehydration on both customer surfaces", async () => {
  const server = stripComments(
    await read("../../apps/api/src/routes/conversations.ts")
  );
  const statusStart = server.indexOf('"/:id/status"');
  const statusRoute = server.slice(
    statusStart,
    server.indexOf('"/:id/messages/public"')
  );
  assert.match(statusRoute, /satisfaction_rating/);
  assert.match(
    statusRoute,
    /satisfactionRating:\s*conversation\.satisfaction_rating/
  );

  const publicApi = await read(
    "../../apps/web/app/[locale]/c/[handle]/lib/public-api.ts"
  );
  assert.match(publicApi, /satisfactionRating:\s*number\s*\|\s*null/);

  const publicHandoff = await read(
    "../../apps/web/app/[locale]/c/[handle]/use-public-handoff.ts"
  );
  assert.match(publicHandoff, /setSatisfactionRating\(s\.satisfactionRating\)/);

  const publicChat = await read(
    "../../apps/web/app/[locale]/c/[handle]/public-chat.tsx"
  );
  assert.match(
    publicChat,
    /submitted=\{m\.csat\s*\?\?\s*handoff\.satisfactionRating\}/
  );

  const widget = await read("../../apps/widget/src/components/chat-window.ts");
  assert.match(
    widget,
    /applyConversationCsat\(status\.data\.satisfactionRating\)/
  );
  assert.match(widget, /message\.metadata\?\.csat_prompt\s*===\s*true/);
});
