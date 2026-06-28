import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  isRealtimePrivateEnabled,
  buildRealtimeTokenResponse,
} from "../../apps/api/src/services/realtime-jwt.ts";

import { signWidgetSessionToken } from "../../apps/api/src/services/widget-session-token.ts";

const realtimeTokenRoutePath = new URL(
  "../../apps/api/src/routes/conversations.ts",
  import.meta.url
);

const JWT_SECRET = "test-supabase-jwt-secret-0123456789abcdef";
const SESSION_SECRET = "test-session-secret-0123456789";

// ---------------------------------------------------------------------------
// Feature flag: isRealtimePrivateEnabled
// ---------------------------------------------------------------------------

test("isRealtimePrivateEnabled returns false when env var is unset", () => {
  const saved = process.env.REALTIME_PRIVATE_ENABLED;
  delete process.env.REALTIME_PRIVATE_ENABLED;
  try {
    assert.equal(isRealtimePrivateEnabled(), false);
  } finally {
    if (saved !== undefined) process.env.REALTIME_PRIVATE_ENABLED = saved;
  }
});

test("isRealtimePrivateEnabled returns false when env var is 'false'", () => {
  const saved = process.env.REALTIME_PRIVATE_ENABLED;
  process.env.REALTIME_PRIVATE_ENABLED = "false";
  try {
    assert.equal(isRealtimePrivateEnabled(), false);
  } finally {
    if (saved !== undefined) process.env.REALTIME_PRIVATE_ENABLED = saved;
    else delete process.env.REALTIME_PRIVATE_ENABLED;
  }
});

test("isRealtimePrivateEnabled returns true when env var is 'true'", () => {
  const saved = process.env.REALTIME_PRIVATE_ENABLED;
  process.env.REALTIME_PRIVATE_ENABLED = "true";
  try {
    assert.equal(isRealtimePrivateEnabled(), true);
  } finally {
    if (saved !== undefined) process.env.REALTIME_PRIVATE_ENABLED = saved;
    else delete process.env.REALTIME_PRIVATE_ENABLED;
  }
});

// ---------------------------------------------------------------------------
// buildRealtimeTokenResponse
// ---------------------------------------------------------------------------

test("buildRealtimeTokenResponse returns token and expiresAt for valid input", () => {
  const result = buildRealtimeTokenResponse(
    {
      conversationId: "conv-1",
      projectId: "proj-1",
      visitorId: "vis-1",
    },
    JWT_SECRET
  );
  assert.ok(result, "expected a result");
  assert.ok(result.token, "expected a token");
  assert.ok(typeof result.expiresAt === "number", "expected numeric expiresAt");
  assert.ok(result.expiresAt > Math.floor(Date.now() / 1000), "expiresAt should be in the future");
});

test("buildRealtimeTokenResponse includes correct conversation_id in minted JWT", () => {
  const result = buildRealtimeTokenResponse(
    {
      conversationId: "conv-abc-123",
      projectId: "proj-xyz",
      visitorId: "vis-456",
    },
    JWT_SECRET
  )!;

  // Decode the JWT payload to check claims
  const payload = result.token.split(".")[1];
  const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  assert.equal(claims.conversation_id, "conv-abc-123");
  assert.equal(claims.project_id, "proj-xyz");
  assert.equal(claims.sub, "vis-456");
});

test("buildRealtimeTokenResponse expiresAt is approximately 5 minutes from now", () => {
  const before = Math.floor(Date.now() / 1000);
  const result = buildRealtimeTokenResponse(
    {
      conversationId: "conv-1",
      projectId: "proj-1",
      visitorId: "vis-1",
    },
    JWT_SECRET
  )!;
  const after = Math.floor(Date.now() / 1000);
  assert.ok(result.expiresAt >= before + 5 * 60);
  assert.ok(result.expiresAt <= after + 5 * 60);
});

test("buildRealtimeTokenResponse returns undefined when JWT secret is missing", () => {
  const result = buildRealtimeTokenResponse(
    {
      conversationId: "conv-1",
      projectId: "proj-1",
      visitorId: "vis-1",
    },
    // no secret passed, and env var not set
  );
  // Since the function catches internally, depends on env — test explicit undefined
  const savedJwt = process.env.SUPABASE_JWT_SECRET;
  delete process.env.SUPABASE_JWT_SECRET;
  try {
    const result2 = buildRealtimeTokenResponse({
      conversationId: "conv-1",
      projectId: "proj-1",
      visitorId: "vis-1",
    });
    assert.equal(result2, undefined);
  } finally {
    if (savedJwt !== undefined) process.env.SUPABASE_JWT_SECRET = savedJwt;
  }
});

// ---------------------------------------------------------------------------
// IDOR prevention: realtime-token route must enforce session ownership
// ---------------------------------------------------------------------------

test("realtime-token route verifies session visitor and project match the conversation", async () => {
  const source = await readFile(realtimeTokenRoutePath, "utf8");
  const start = source.indexOf('"/:id/realtime-token"');
  assert.notEqual(start, -1, "expected realtime-token route");

  const routeSource = source.slice(start, start + 2000);

  assert.ok(
    routeSource.includes("verifyWidgetSessionToken"),
    "route must call verifyWidgetSessionToken for explicit ownership check"
  );
  assert.ok(
    routeSource.includes("sessionClaims.visitorId !== conversation.visitor_id"),
    "route must compare session visitorId against conversation"
  );
  assert.ok(
    routeSource.includes("sessionClaims.projectId !== conversation.project_id"),
    "route must compare session projectId against conversation"
  );
  assert.ok(
    routeSource.includes("sessionClaims.conversationId !== id"),
    "route must compare session conversationId against route param"
  );
});

test("realtime-token route verifies the session before querying the conversation", async () => {
  const source = await readFile(realtimeTokenRoutePath, "utf8");
  const start = source.indexOf('"/:id/realtime-token"');
  assert.notEqual(start, -1, "expected realtime-token route");

  const routeSource = source.slice(start, start + 2600);
  const verifyIndex = routeSource.indexOf("verifyWidgetSessionToken");
  const queryIndex = routeSource.indexOf('.from("conversations")');

  assert.ok(verifyIndex !== -1, "route must verify widget session");
  assert.ok(queryIndex !== -1, "route must query the conversation");
  assert.ok(
    verifyIndex < queryIndex,
    "route must verify session before DB lookup to avoid conversation-id probing"
  );
});

test("realtime-token route scopes the conversation lookup to session claims", async () => {
  const source = await readFile(realtimeTokenRoutePath, "utf8");
  const start = source.indexOf('"/:id/realtime-token"');
  assert.notEqual(start, -1, "expected realtime-token route");

  const routeSource = source.slice(start, start + 2800);

  assert.ok(
    routeSource.includes('.eq("project_id", sessionClaims.projectId)'),
    "route must filter the conversation by the session project"
  );
  assert.ok(
    routeSource.includes('.eq("visitor_id", sessionClaims.visitorId)'),
    "route must filter the conversation by the session visitor"
  );
});
