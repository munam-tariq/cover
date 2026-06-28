import assert from "node:assert/strict";
import test from "node:test";

import {
  canIssueRealtimeTokens,
  issueRealtimeToken,
  verifyRealtimeToken,
  type RealtimeVisitorClaims,
} from "../../apps/api/src/services/realtime-jwt.ts";

const SECRET = "test-supabase-jwt-secret-0123456789abcdef";

test("issueRealtimeToken returns a three-part JWT string", () => {
  const token = issueRealtimeToken(
    { projectId: "p1", visitorId: "v1", conversationId: "c1" },
    SECRET
  );
  assert.ok(token, "expected a token");
  const parts = token.split(".");
  assert.equal(parts.length, 3, "JWT must have header.payload.signature");
});

test("minted JWT has role: anon (not authenticated)", () => {
  const token = issueRealtimeToken(
    { projectId: "p1", visitorId: "v1", conversationId: "c1" },
    SECRET
  )!;
  const claims = verifyRealtimeToken(token, SECRET);
  assert.equal(claims.role, "anon");
});

test("minted JWT has iss: supabase", () => {
  const token = issueRealtimeToken(
    { projectId: "p1", visitorId: "v1", conversationId: "c1" },
    SECRET
  )!;
  const claims = verifyRealtimeToken(token, SECRET);
  assert.equal(claims.iss, "supabase");
});

test("minted JWT has scope: widget_realtime", () => {
  const token = issueRealtimeToken(
    { projectId: "p1", visitorId: "v1", conversationId: "c1" },
    SECRET
  )!;
  const claims = verifyRealtimeToken(token, SECRET);
  assert.equal(claims.scope, "widget_realtime");
});

test("claims contain sub, conversation_id, and project_id from input", () => {
  const token = issueRealtimeToken(
    { projectId: "proj-abc", visitorId: "vis-xyz", conversationId: "conv-123" },
    SECRET
  )!;
  const claims = verifyRealtimeToken(token, SECRET);
  assert.equal(claims.sub, "vis-xyz");
  assert.equal(claims.project_id, "proj-abc");
  assert.equal(claims.conversation_id, "conv-123");
});

test("JWT expires in approximately 5 minutes", () => {
  const before = Math.floor(Date.now() / 1000);
  const token = issueRealtimeToken(
    { projectId: "p1", visitorId: "v1", conversationId: "c1" },
    SECRET
  )!;
  const after = Math.floor(Date.now() / 1000);
  const claims = verifyRealtimeToken(token, SECRET);
  const expectedMin = before + 5 * 60;
  const expectedMax = after + 5 * 60;
  assert.ok(claims.exp >= expectedMin, `exp ${claims.exp} should be >= ${expectedMin}`);
  assert.ok(claims.exp <= expectedMax, `exp ${claims.exp} should be <= ${expectedMax}`);
});

test("JWT has iat set to approximately now", () => {
  const before = Math.floor(Date.now() / 1000);
  const token = issueRealtimeToken(
    { projectId: "p1", visitorId: "v1", conversationId: "c1" },
    SECRET
  )!;
  const after = Math.floor(Date.now() / 1000);
  const claims = verifyRealtimeToken(token, SECRET);
  assert.ok(claims.iat >= before, `iat ${claims.iat} should be >= ${before}`);
  assert.ok(claims.iat <= after, `iat ${claims.iat} should be <= ${after}`);
});

test("verifyRealtimeToken round-trips a valid token", () => {
  const token = issueRealtimeToken(
    { projectId: "p1", visitorId: "v1", conversationId: "c1" },
    SECRET
  )!;
  const claims = verifyRealtimeToken(token, SECRET);
  assert.equal(claims.sub, "v1");
  assert.equal(claims.role, "anon");
  assert.equal(claims.iss, "supabase");
  assert.equal(claims.scope, "widget_realtime");
  assert.equal(claims.project_id, "p1");
  assert.equal(claims.conversation_id, "c1");
});

test("verifyRealtimeToken rejects a token signed with a different secret", () => {
  const token = issueRealtimeToken(
    { projectId: "p1", visitorId: "v1", conversationId: "c1" },
    SECRET
  )!;
  assert.throws(
    () => verifyRealtimeToken(token, "wrong-secret"),
    /invalid.*token/i
  );
});

test("verifyRealtimeToken rejects an expired token", () => {
  const token = issueRealtimeToken(
    { projectId: "p1", visitorId: "v1", conversationId: "c1", ttlSeconds: -1 },
    SECRET
  )!;
  assert.throws(
    () => verifyRealtimeToken(token, SECRET),
    /expired/i
  );
});

test("verifyRealtimeToken rejects a tampered token", () => {
  const token = issueRealtimeToken(
    { projectId: "p1", visitorId: "v1", conversationId: "c1" },
    SECRET
  )!;
  assert.throws(
    () => verifyRealtimeToken(`${token}x`, SECRET),
    /invalid.*token/i
  );
});

test("verifyRealtimeToken rejects undefined / empty input", () => {
  assert.throws(
    () => verifyRealtimeToken(undefined as unknown as string, SECRET),
    /missing.*token/i
  );
  assert.throws(
    () => verifyRealtimeToken("", SECRET),
    /missing.*token/i
  );
});

test("verifyRealtimeToken rejects malformed non-JWT strings", () => {
  assert.throws(
    () => verifyRealtimeToken("not-a-jwt", SECRET),
    /invalid.*token/i
  );
  assert.throws(
    () => verifyRealtimeToken("two.parts", SECRET),
    /invalid.*token/i
  );
});

test("issueRealtimeToken returns undefined when no secret is available", () => {
  const savedJwt = process.env.SUPABASE_JWT_SECRET;
  const savedEnc = process.env.ENCRYPTION_KEY;
  delete process.env.SUPABASE_JWT_SECRET;
  delete process.env.ENCRYPTION_KEY;
  try {
    assert.equal(
      issueRealtimeToken({ projectId: "p1", visitorId: "v1", conversationId: "c1" }),
      undefined
    );
  } finally {
    if (savedJwt !== undefined) process.env.SUPABASE_JWT_SECRET = savedJwt;
    if (savedEnc !== undefined) process.env.ENCRYPTION_KEY = savedEnc;
  }
});

test("custom ttlSeconds overrides the default 5-minute expiry", () => {
  const before = Math.floor(Date.now() / 1000);
  const token = issueRealtimeToken(
    { projectId: "p1", visitorId: "v1", conversationId: "c1", ttlSeconds: 120 },
    SECRET
  )!;
  const claims = verifyRealtimeToken(token, SECRET);
  assert.ok(claims.exp >= before + 120, "exp should reflect custom TTL");
  assert.ok(claims.exp <= before + 121, "exp should be approximately iat + ttlSeconds");
});

test("JWT header uses alg: HS256 and typ: JWT", () => {
  const token = issueRealtimeToken(
    { projectId: "p1", visitorId: "v1", conversationId: "c1" },
    SECRET
  )!;
  const headerB64 = token.split(".")[0];
  const header = JSON.parse(Buffer.from(headerB64, "base64url").toString("utf8"));
  assert.equal(header.alg, "HS256");
  assert.equal(header.typ, "JWT");
});

test("canIssueRealtimeTokens rejects a JWT secret that does not verify the service key", () => {
  const serviceKey = issueRealtimeToken(
    { projectId: "p1", visitorId: "service", conversationId: "c1" },
    "actual-project-secret"
  )!;

  assert.equal(
    canIssueRealtimeTokens({
      SUPABASE_JWT_SECRET: "wrong-project-secret",
      SUPABASE_SERVICE_KEY: serviceKey,
    }),
    false
  );
});

test("canIssueRealtimeTokens accepts a service key signed by the configured JWT secret", () => {
  const secret = "actual-project-secret";
  const serviceKey = issueRealtimeToken(
    { projectId: "p1", visitorId: "service", conversationId: "c1" },
    secret
  )!;

  assert.equal(
    canIssueRealtimeTokens({
      SUPABASE_JWT_SECRET: secret,
      SUPABASE_SERVICE_KEY: serviceKey,
    }),
    true
  );
});
