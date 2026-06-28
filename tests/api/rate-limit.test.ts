import assert from "node:assert/strict";
import test from "node:test";

import {
  CHAT_RATE_LIMITS,
  chatRateLimiter,
  getRateLimitStatus,
  resetRateLimits,
  setStore,
  type RateLimitStore,
} from "../../apps/api/src/middleware/rate-limit.ts";

// ---------------------------------------------------------------------------
// Minimal in-process MemoryStore for isolated testing
// ---------------------------------------------------------------------------

class TestStore implements RateLimitStore {
  entries = new Map<string, { count: number; resetAt: number }>();

  async increment(key: string, windowMs: number) {
    const now = Date.now();
    const entry = this.entries.get(key);
    if (!entry || entry.resetAt < now) {
      const resetAt = now + windowMs;
      this.entries.set(key, { count: 1, resetAt });
      return { count: 1, resetAt };
    }
    entry.count++;
    return { count: entry.count, resetAt: entry.resetAt };
  }

  async peek(key: string, windowMs: number, maxRequests: number) {
    const now = Date.now();
    const entry = this.entries.get(key);
    if (!entry || entry.resetAt < now) {
      return { remaining: maxRequests, resetAt: now + windowMs };
    }
    return { remaining: Math.max(0, maxRequests - entry.count), resetAt: entry.resetAt };
  }

  async clear(pattern?: string) {
    if (!pattern) { this.entries.clear(); return; }
    for (const key of this.entries.keys()) {
      if (key.includes(pattern)) this.entries.delete(key);
    }
  }
}

// Swap in a test store for each test
let testStore: TestStore;
test.beforeEach(() => {
  testStore = new TestStore();
  setStore(testStore);
});

// ---------------------------------------------------------------------------
// Mock Express req/res/next
// ---------------------------------------------------------------------------

function mockReq(overrides: Record<string, any> = {}): any {
  return {
    body: { visitorId: "vis_test", projectId: "proj_1" },
    headers: {},
    ip: "203.0.113.42",
    clientKey: null,
    ...overrides,
  };
}

function mockRes(): any {
  const headers: Record<string, string> = {};
  const res: any = {
    statusCode: 200,
    headers,
    body: null,
    setHeader(k: string, v: string) { headers[k] = v; },
    status(code: number) { res.statusCode = code; return res; },
    json(data: any) { res.body = data; },
  };
  return res;
}

// ---------------------------------------------------------------------------
// Per-visitor rate limiting
// ---------------------------------------------------------------------------

test("chatRateLimiter allows requests within the per-minute limit", async () => {
  const req = mockReq();
  const res = mockRes();
  let called = false;

  await chatRateLimiter(req, res, () => { called = true; });
  assert.ok(called, "next() should be called");
  assert.equal(res.statusCode, 200);
});

test("chatRateLimiter blocks after per-minute limit is exceeded", async () => {
  const limit = CHAT_RATE_LIMITS.perMinute.maxRequests;
  const req = mockReq();

  // Exhaust the per-minute limit
  for (let i = 0; i < limit; i++) {
    const res = mockRes();
    await chatRateLimiter(req, res, () => {});
    assert.equal(res.statusCode, 200, `request ${i + 1} should pass`);
  }

  // Next request should be blocked
  const res = mockRes();
  let nextCalled = false;
  await chatRateLimiter(req, res, () => { nextCalled = true; });
  assert.equal(res.statusCode, 429);
  assert.ok(!nextCalled, "next() must not be called on 429");
  assert.equal(res.body?.error?.code, "RATE_LIMITED");
});

// ---------------------------------------------------------------------------
// Per-IP ceiling (anti-forgery)
// ---------------------------------------------------------------------------

test("chatRateLimiter blocks after per-IP ceiling is exceeded even with unique visitorIds", async () => {
  // IP ceiling = perMinute.maxRequests × IP_CEILING_MULTIPLIER (default 5)
  const ipCeiling = CHAT_RATE_LIMITS.perMinute.maxRequests * 5;
  const sharedIp = "198.51.100.1";

  for (let i = 0; i < ipCeiling; i++) {
    const req = mockReq({
      body: { visitorId: `vis_forged_${i}` },
      ip: sharedIp,
    });
    const res = mockRes();
    await chatRateLimiter(req, res, () => {});
    assert.equal(res.statusCode, 200, `request ${i + 1} with unique visitorId should pass`);
  }

  // Next request from the same IP (new visitorId) should be blocked by the IP ceiling
  const req = mockReq({
    body: { visitorId: "vis_one_more" },
    ip: sharedIp,
  });
  const res = mockRes();
  let nextCalled = false;
  await chatRateLimiter(req, res, () => { nextCalled = true; });
  assert.equal(res.statusCode, 429, "IP ceiling should block the request");
  assert.ok(!nextCalled);
});

// ---------------------------------------------------------------------------
// X-Forwarded-For IP extraction
// ---------------------------------------------------------------------------

test("chatRateLimiter ignores X-Forwarded-For when TRUST_PROXY is not set", async () => {
  // Without TRUST_PROXY, req.ip is used — XFF header is untrusted
  const ipCeiling = CHAT_RATE_LIMITS.perMinute.maxRequests * 5;
  const fakeIp = "192.0.2.50";

  for (let i = 0; i < ipCeiling; i++) {
    const req = mockReq({
      body: { visitorId: `vis_no_trust_${i}` },
      ip: "203.0.113.1",
      headers: { "x-forwarded-for": `${fakeIp}` },
    });
    const res = mockRes();
    await chatRateLimiter(req, res, () => {});
  }

  // IP ceiling should be keyed on req.ip (203.0.113.1), not the XFF IP
  const req = mockReq({
    body: { visitorId: "vis_no_trust_extra" },
    ip: "203.0.113.1",
    headers: { "x-forwarded-for": `${fakeIp}` },
  });
  const res = mockRes();
  await chatRateLimiter(req, res, () => {});
  assert.equal(res.statusCode, 429, "should be blocked by req.ip ceiling");
});

// NOTE: TRUST_PROXY is read at module load time, so this test documents the
// behavior when it is NOT set (the default in test). A full integration test
// with TRUST_PROXY=true would require a process restart.
test("(docs) X-Forwarded-For first hop for IP ceiling requires TRUST_PROXY=true", async () => {
  const ipCeiling = CHAT_RATE_LIMITS.perMinute.maxRequests * 5;
  const realIp = "192.0.2.99";

  for (let i = 0; i < ipCeiling; i++) {
    const req = mockReq({
      body: { visitorId: `vis_xff_${i}` },
      ip: "127.0.0.1",
      headers: { "x-forwarded-for": `${realIp}, 10.0.0.1` },
    });
    const res = mockRes();
    await chatRateLimiter(req, res, () => {});
  }

  // Without TRUST_PROXY, these all keyed on req.ip "127.0.0.1", not the XFF IP.
  // So the IP ceiling applies to req.ip — this is correct secure behavior.
  const req = mockReq({
    body: { visitorId: "vis_xff_extra" },
    ip: "127.0.0.1",
    headers: { "x-forwarded-for": `${realIp}, 10.0.0.1` },
  });
  const res = mockRes();
  await chatRateLimiter(req, res, () => {});
  // Blocked because all requests used req.ip="127.0.0.1" (TRUST_PROXY is off)
  assert.equal(res.statusCode, 429);
});

// ---------------------------------------------------------------------------
// getRateLimitStatus
// ---------------------------------------------------------------------------

test("getRateLimitStatus returns full quota for a fresh visitor", async () => {
  const status = await getRateLimitStatus("vis_fresh");
  assert.equal(status.minute.remaining, CHAT_RATE_LIMITS.perMinute.maxRequests);
  assert.equal(status.hour.remaining, CHAT_RATE_LIMITS.perHour.maxRequests);
  assert.equal(status.day.remaining, CHAT_RATE_LIMITS.perDay.maxRequests);
});

test("getRateLimitStatus reflects consumed quota", async () => {
  const req = mockReq({ body: { visitorId: "vis_status" } });
  for (let i = 0; i < 3; i++) {
    await chatRateLimiter(req, mockRes(), () => {});
  }

  const status = await getRateLimitStatus("vis_status");
  assert.equal(status.minute.remaining, CHAT_RATE_LIMITS.perMinute.maxRequests - 3);
});

// ---------------------------------------------------------------------------
// Store failure = fail-open
// ---------------------------------------------------------------------------

test("chatRateLimiter fails open when the store throws", async () => {
  const broken: RateLimitStore = {
    async increment() { throw new Error("Redis down"); },
    async peek() { throw new Error("Redis down"); },
    async clear() {},
  };
  setStore(broken);

  const req = mockReq();
  const res = mockRes();
  let called = false;
  await chatRateLimiter(req, res, () => { called = true; });

  assert.ok(called, "next() should be called even when the store fails");
  assert.equal(res.statusCode, 200);
});

// ---------------------------------------------------------------------------
// Client-key namespacing
// ---------------------------------------------------------------------------

test("chatRateLimiter namespaces by clientKey so SDK traffic is isolated", async () => {
  const limit = CHAT_RATE_LIMITS.perMinute.maxRequests;

  // Exhaust limit for sdk visitor
  for (let i = 0; i < limit; i++) {
    const req = mockReq({
      body: { visitorId: "vis_sdk" },
      clientKey: { keyId: "pk_abc", projectId: "proj_1" },
    });
    await chatRateLimiter(req, mockRes(), () => {});
  }

  // Same visitorId but no clientKey should still have quota
  const req = mockReq({ body: { visitorId: "vis_sdk" } });
  const res = mockRes();
  let called = false;
  await chatRateLimiter(req, res, () => { called = true; });
  assert.ok(called, "web visitor should be unaffected by SDK limits");
});
