import assert from "node:assert/strict";
import test from "node:test";

import * as widgetSessionToken from "../../apps/api/src/services/widget-session-token.ts";
import {
  issueWidgetSessionToken,
  signWidgetSessionToken,
  verifyWidgetSessionToken,
} from "../../apps/api/src/services/widget-session-token.ts";

const SECRET = "test-secret-0123456789";
const baseClaims = () => ({
  projectId: "project-1",
  visitorId: "visitor-1",
  conversationId: "conversation-1",
  exp: Math.floor(Date.now() / 1000) + 3600,
});

test("round-trips matching project, visitor, and conversation claims", () => {
  const claims = baseClaims();
  const token = signWidgetSessionToken(claims, SECRET);
  assert.deepEqual(verifyWidgetSessionToken(token, SECRET), claims);
});

test("rejects a tampered token", () => {
  const token = signWidgetSessionToken(baseClaims(), SECRET);
  assert.throws(
    () => verifyWidgetSessionToken(`${token}x`, SECRET),
    /Invalid widget session token/
  );
});

test("rejects a token signed with a different secret", () => {
  const token = signWidgetSessionToken(baseClaims(), SECRET);
  assert.throws(
    () => verifyWidgetSessionToken(token, "a-different-secret"),
    /Invalid widget session token/
  );
});

test("rejects an expired token", () => {
  const claims = { ...baseClaims(), exp: Math.floor(Date.now() / 1000) - 1 };
  const token = signWidgetSessionToken(claims, SECRET);
  assert.throws(
    () => verifyWidgetSessionToken(token, SECRET),
    /expired/i
  );
});

test("rejects a malformed token", () => {
  assert.throws(
    () => verifyWidgetSessionToken("not-a-valid-token", SECRET),
    /Invalid widget session token/
  );
  assert.throws(
    () => verifyWidgetSessionToken(undefined, SECRET),
    /Missing widget session token/
  );
});

test("a token for one conversation does not verify as another (claims are bound)", () => {
  const token = signWidgetSessionToken(baseClaims(), SECRET);
  const claims = verifyWidgetSessionToken(token, SECRET);
  // The caller compares these claims against the request's project/visitor/conversation.
  assert.equal(claims.projectId, "project-1");
  assert.equal(claims.visitorId, "visitor-1");
  assert.equal(claims.conversationId, "conversation-1");
});

test("issueWidgetSessionToken mints a verifiable token with a future expiry", () => {
  const token = issueWidgetSessionToken(
    { projectId: "p1", visitorId: "v1", conversationId: "c1", ttlSeconds: 600 },
    SECRET
  );
  assert.ok(token, "expected a token");
  const claims = verifyWidgetSessionToken(token, SECRET);
  assert.equal(claims.projectId, "p1");
  assert.equal(claims.conversationId, "c1");
  assert.ok(claims.exp > Math.floor(Date.now() / 1000), "exp should be in the future");
});

test("issueWidgetSessionToken returns undefined (never throws) when no secret is available", () => {
  const savedWidget = process.env.WIDGET_SESSION_SECRET;
  const savedEnc = process.env.ENCRYPTION_KEY;
  delete process.env.WIDGET_SESSION_SECRET;
  delete process.env.ENCRYPTION_KEY;
  try {
    // Must not throw — issuing a token can never break conversation creation.
    assert.equal(
      issueWidgetSessionToken({ projectId: "p1", visitorId: "v1", conversationId: "c1" }),
      undefined
    );
  } finally {
    if (savedWidget !== undefined) process.env.WIDGET_SESSION_SECRET = savedWidget;
    if (savedEnc !== undefined) process.env.ENCRYPTION_KEY = savedEnc;
  }
});

function authorizeWidgetMessageContinuation(input: {
  projectId: string;
  visitorId: string;
  sessionId?: string | null;
  conversationExists: boolean;
  sessionToken?: string;
}) {
  const authorize = (
    widgetSessionToken as typeof widgetSessionToken & {
      authorizeWidgetMessageContinuation?: (options: typeof input & { secret?: string }) => unknown;
    }
  ).authorizeWidgetMessageContinuation;

  assert.equal(typeof authorize, "function");
  return authorize({ ...input, secret: SECRET });
}

test("message continuation allows caller-generated fresh session ids without a token", () => {
  assert.deepEqual(
    authorizeWidgetMessageContinuation({
      projectId: "project-1",
      visitorId: "visitor-1",
      sessionId: "fresh-client-generated-id",
      conversationExists: false,
    }),
    { ok: true, requiresToken: false }
  );
});

test("message continuation requires a token for an existing conversation", () => {
  assert.deepEqual(
    authorizeWidgetMessageContinuation({
      projectId: "project-1",
      visitorId: "visitor-1",
      sessionId: "conversation-1",
      conversationExists: true,
    }),
    { ok: false, denyReason: "SESSION_INVALID" }
  );
});

test("message continuation accepts only tokens matching project, visitor, and conversation", () => {
  const sessionToken = signWidgetSessionToken(baseClaims(), SECRET);

  assert.deepEqual(
    authorizeWidgetMessageContinuation({
      projectId: "project-1",
      visitorId: "visitor-1",
      sessionId: "conversation-1",
      conversationExists: true,
      sessionToken,
    }),
    { ok: true, requiresToken: true }
  );

  assert.deepEqual(
    authorizeWidgetMessageContinuation({
      projectId: "another-project",
      visitorId: "visitor-1",
      sessionId: "conversation-1",
      conversationExists: true,
      sessionToken,
    }),
    { ok: false, denyReason: "SESSION_PROJECT_MISMATCH" }
  );

  assert.deepEqual(
    authorizeWidgetMessageContinuation({
      projectId: "project-1",
      visitorId: "another-visitor",
      sessionId: "conversation-1",
      conversationExists: true,
      sessionToken,
    }),
    { ok: false, denyReason: "SESSION_VISITOR_MISMATCH" }
  );

  assert.deepEqual(
    authorizeWidgetMessageContinuation({
      projectId: "project-1",
      visitorId: "visitor-1",
      sessionId: "another-conversation",
      conversationExists: true,
      sessionToken,
    }),
    { ok: false, denyReason: "SESSION_CONVERSATION_MISMATCH" }
  );
});
