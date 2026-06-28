import assert from "node:assert/strict";
import test from "node:test";

import {
  issueVoiceSessionToken,
  signVoiceSessionToken,
  verifyVoiceSessionToken,
} from "../../apps/api/src/services/voice-session-token.ts";

const SECRET = "voice-test-secret-0123456789";
const baseClaims = () => ({
  projectId: "project-1",
  visitorId: "visitor-1",
  sessionId: "conversation-1",
  exp: Math.floor(Date.now() / 1000) + 600,
});

test("round-trips matching project, visitor, and session claims", () => {
  const claims = baseClaims();
  const token = signVoiceSessionToken(claims, SECRET);
  assert.deepEqual(verifyVoiceSessionToken(token, SECRET), claims);
});

test("rejects a tampered token", () => {
  const token = signVoiceSessionToken(baseClaims(), SECRET);
  assert.throws(
    () => verifyVoiceSessionToken(`${token}x`, SECRET),
    /Invalid voice session token/
  );
});

test("rejects a token signed with a different secret", () => {
  const token = signVoiceSessionToken(baseClaims(), SECRET);
  assert.throws(
    () => verifyVoiceSessionToken(token, "another-secret"),
    /Invalid voice session token/
  );
});

test("rejects an expired token", () => {
  const claims = { ...baseClaims(), exp: Math.floor(Date.now() / 1000) - 1 };
  const token = signVoiceSessionToken(claims, SECRET);
  assert.throws(() => verifyVoiceSessionToken(token, SECRET), /expired/i);
});

test("rejects a missing/malformed token", () => {
  assert.throws(
    () => verifyVoiceSessionToken(undefined, SECRET),
    /Missing voice session token/
  );
  assert.throws(
    () => verifyVoiceSessionToken("garbage", SECRET),
    /Invalid voice session token/
  );
});

test("sessionId is optional (voice can start before a conversation exists)", () => {
  const claims = {
    projectId: "p1",
    visitorId: "v1",
    exp: Math.floor(Date.now() / 1000) + 600,
  };
  const token = signVoiceSessionToken(claims, SECRET);
  assert.deepEqual(verifyVoiceSessionToken(token, SECRET), claims);
});

test("issueVoiceSessionToken mints a verifiable token and never throws without a secret", () => {
  const token = issueVoiceSessionToken(
    { projectId: "p1", visitorId: "v1", sessionId: "c1", ttlSeconds: 300 },
    SECRET
  );
  assert.ok(token);
  assert.equal(verifyVoiceSessionToken(token, SECRET).projectId, "p1");

  const savedVoice = process.env.VOICE_SESSION_SECRET;
  const savedWidget = process.env.WIDGET_SESSION_SECRET;
  const savedEnc = process.env.ENCRYPTION_KEY;
  delete process.env.VOICE_SESSION_SECRET;
  delete process.env.WIDGET_SESSION_SECRET;
  delete process.env.ENCRYPTION_KEY;
  try {
    assert.equal(
      issueVoiceSessionToken({ projectId: "p1", visitorId: "v1" }),
      undefined
    );
  } finally {
    if (savedVoice !== undefined) process.env.VOICE_SESSION_SECRET = savedVoice;
    if (savedWidget !== undefined) process.env.WIDGET_SESSION_SECRET = savedWidget;
    if (savedEnc !== undefined) process.env.ENCRYPTION_KEY = savedEnc;
  }
});
