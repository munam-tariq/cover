/**
 * Rate Limiting Middleware
 *
 * Pluggable store: in-memory by default, Redis when REDIS_URL is set.
 *
 * Security: chatRateLimiter enforces a parallel per-IP ceiling so an attacker
 * cannot bypass limits by cycling the client-supplied visitorId.
 */

import type { NextFunction, Request, Response } from "express";
import type RedisClient from "ioredis";

// ---------------------------------------------------------------------------
// Store interface
// ---------------------------------------------------------------------------

interface CheckResult {
  count: number;
  resetAt: number;
}

export interface RateLimitStore {
  increment(key: string, windowMs: number): Promise<CheckResult>;
  peek(key: string, windowMs: number, maxRequests: number): Promise<{ remaining: number; resetAt: number }>;
  clear(pattern?: string): Promise<void>;
}

// ---------------------------------------------------------------------------
// Memory store (default — single-process, resets on restart)
// ---------------------------------------------------------------------------

class MemoryStore implements RateLimitStore {
  private entries = new Map<string, { count: number; resetAt: number }>();
  private timer: ReturnType<typeof setInterval>;

  constructor() {
    this.timer = setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.entries) {
        if (entry.resetAt < now) this.entries.delete(key);
      }
    }, 5 * 60_000);
    if (this.timer.unref) this.timer.unref();
  }

  async increment(key: string, windowMs: number): Promise<CheckResult> {
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

// ---------------------------------------------------------------------------
// Redis store (distributed — survives restarts, shares across replicas)
// ---------------------------------------------------------------------------

const REDIS_LUA_INCREMENT = `
local count = redis.call('INCR', KEYS[1])
if count == 1 then
  redis.call('PEXPIRE', KEYS[1], ARGV[1])
end
local ttl = redis.call('PTTL', KEYS[1])
return {count, ttl}
`;

class RedisStore implements RateLimitStore {
  private client: RedisClient;
  private constructor(client: RedisClient) { this.client = client; }

  static async create(url: string): Promise<RedisStore | null> {
    try {
      const { default: Redis } = await import("ioredis");
      const client = new Redis(url, { maxRetriesPerRequest: 1, lazyConnect: true });
      await client.connect();
      console.log("[RateLimit] Redis store connected");
      return new RedisStore(client);
    } catch (err) {
      console.warn("[RateLimit] Redis unavailable, using in-memory store:", err);
      return null;
    }
  }

  async increment(key: string, windowMs: number): Promise<CheckResult> {
    const prefixed = `rl:${key}`;
    const result = await this.client.eval(
      REDIS_LUA_INCREMENT, 1, prefixed, windowMs
    );
    if (!Array.isArray(result) || result.length !== 2) {
      throw new Error("Unexpected Redis rate-limit response");
    }
    const count = Number(result[0]);
    const ttl = Number(result[1]);
    const resetAt = ttl > 0 ? Date.now() + ttl : Date.now() + windowMs;
    return { count, resetAt };
  }

  async peek(key: string, windowMs: number, maxRequests: number) {
    const prefixed = `rl:${key}`;
    const [countStr, ttl] = await Promise.all([
      this.client.get(prefixed),
      this.client.pttl(prefixed),
    ]);
    const count = countStr ? parseInt(countStr, 10) : 0;
    const resetAt = ttl > 0 ? Date.now() + ttl : Date.now() + windowMs;
    return { remaining: Math.max(0, maxRequests - count), resetAt };
  }

  async clear(pattern?: string) {
    if (!pattern) return;
    const keys: string[] = [];
    const stream = this.client.scanStream({ match: `rl:*${pattern}*`, count: 100 });
    for await (const batch of stream) keys.push(...batch);
    if (keys.length > 0) await this.client.del(...keys);
  }
}

// ---------------------------------------------------------------------------
// Global store (auto-selects based on REDIS_URL)
// ---------------------------------------------------------------------------

let store: RateLimitStore = new MemoryStore();

if (process.env.REDIS_URL) {
  RedisStore.create(process.env.REDIS_URL).then((redis) => {
    if (redis) store = redis;
  });
}

/** Swap the global store (for testing). Returns the previous store. */
export function setStore(s: RateLimitStore): RateLimitStore {
  const prev = store;
  store = s;
  return prev;
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyPrefix: string;
}

export const CHAT_RATE_LIMITS = {
  perMinute: {
    windowMs: 60 * 1000,
    maxRequests: parseInt(process.env.RATE_LIMIT_MESSAGES_PER_MINUTE || "15", 10),
    keyPrefix: "chat:minute",
  },
  perHour: {
    windowMs: 60 * 60 * 1000,
    maxRequests: parseInt(process.env.RATE_LIMIT_MESSAGES_PER_HOUR || "100", 10),
    keyPrefix: "chat:hour",
  },
  perDay: {
    windowMs: 24 * 60 * 60 * 1000,
    maxRequests: parseInt(process.env.RATE_LIMIT_MESSAGES_PER_DAY || "500", 10),
    keyPrefix: "chat:day",
  },
} as const;

// Per-IP ceiling: generous multiplier so NAT/office users aren't penalised,
// but prevents a single attacker from cycling visitorIds to bypass limits.
const IP_CEILING_MULTIPLIER = parseInt(process.env.RATE_LIMIT_IP_MULTIPLIER || "5", 10);
const IDENTIFY_REQUESTS_PER_MINUTE = 10;

export const IDENTIFY_RATE_LIMITS = {
  perVisitor: {
    windowMs: 60_000,
    maxRequests: IDENTIFY_REQUESTS_PER_MINUTE,
  },
  perIp: {
    windowMs: 60_000,
    maxRequests: IDENTIFY_REQUESTS_PER_MINUTE * IP_CEILING_MULTIPLIER,
  },
} as const;

// ---------------------------------------------------------------------------
// Core check helpers
// ---------------------------------------------------------------------------

/**
 * Reusable single-limit check against the shared pluggable store (memory or
 * Redis, per REDIS_URL). Callers outside the chat/API-key rate limiters
 * (e.g. the WhatsApp per-sender limiter) should use this instead of
 * rolling their own store, so limits stay distributed-safe together.
 */
export async function checkSingleLimit(
  key: string,
  config: RateLimitConfig
): Promise<{
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfter: number;
}> {
  const fullKey = `${config.keyPrefix}:${key}`;
  const { count, resetAt } = await store.increment(fullKey, config.windowMs);

  if (count > config.maxRequests) {
    const retryAfter = Math.ceil((resetAt - Date.now()) / 1000);
    return { allowed: false, remaining: 0, resetAt, retryAfter: Math.max(retryAfter, 1) };
  }

  return {
    allowed: true,
    remaining: config.maxRequests - count,
    resetAt,
    retryAfter: 0,
  };
}

async function applyMultipleRateLimits(
  key: string,
  limits: RateLimitConfig[]
): Promise<{
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfter: number;
  limitType: string;
}> {
  for (const limit of limits) {
    const result = await checkSingleLimit(key, limit);
    if (!result.allowed) return { ...result, limitType: limit.keyPrefix };
  }

  // All passed — peek at the most restrictive remaining count
  const peeks = await Promise.all(
    limits.map(async (limit) => {
      const fullKey = `${limit.keyPrefix}:${key}`;
      const p = await store.peek(fullKey, limit.windowMs, limit.maxRequests);
      return { ...p, limitType: limit.keyPrefix };
    })
  );
  const most = peeks.reduce((min, cur) => (cur.remaining < min.remaining ? cur : min));
  return { allowed: true, remaining: most.remaining, resetAt: most.resetAt, retryAfter: 0, limitType: most.limitType };
}

// ---------------------------------------------------------------------------
// IP extraction
// ---------------------------------------------------------------------------

// Only trust X-Forwarded-For when the API sits behind a proxy that overwrites
// it (Vercel, Cloudflare, nginx, ALB, etc.). Without a trusted proxy an attacker
// can rotate the header to bypass the per-IP ceiling.
const TRUST_PROXY = ["1", "true", "yes"].includes(
  (process.env.TRUST_PROXY || "").toLowerCase()
);

export function extractClientIp(req: Request): string {
  if (TRUST_PROXY) {
    const forwarded = req.headers["x-forwarded-for"];
    if (typeof forwarded === "string") {
      const first = forwarded.split(",")[0].trim();
      if (first) return first;
    }
  }
  return req.ip || "unknown";
}

// ---------------------------------------------------------------------------
// Chat rate limiter (main middleware)
// ---------------------------------------------------------------------------

export async function chatRateLimiter(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const visitorId =
      req.body?.visitorId ||
      (req.headers["x-visitor-id"] as string) ||
      req.ip ||
      "anonymous";

    const rateLimitKey = req.clientKey
      ? `key:${req.clientKey.keyId}:${visitorId}`
      : visitorId;

    // 1) Per-visitor limits (existing UX — honest visitors see their quota)
    const visitorResult = await applyMultipleRateLimits(rateLimitKey, [
      CHAT_RATE_LIMITS.perMinute,
      CHAT_RATE_LIMITS.perHour,
      CHAT_RATE_LIMITS.perDay,
    ]);

    if (!visitorResult.allowed) {
      res.setHeader("X-RateLimit-Remaining", "0");
      res.setHeader("X-RateLimit-Reset", Math.ceil(visitorResult.resetAt / 1000).toString());
      res.setHeader("Retry-After", visitorResult.retryAfter.toString());
      res.status(429).json({
        error: {
          code: "RATE_LIMITED",
          message: "Too many messages. Please wait before sending more.",
          retryAfter: visitorResult.retryAfter,
        },
      });
      return;
    }

    // 2) Per-IP ceiling (security — catches visitorId forgery)
    const clientIp = extractClientIp(req);
    const ipResult = await applyMultipleRateLimits(`ip:${clientIp}`, [
      { ...CHAT_RATE_LIMITS.perMinute, maxRequests: CHAT_RATE_LIMITS.perMinute.maxRequests * IP_CEILING_MULTIPLIER, keyPrefix: "ip:minute" },
      { ...CHAT_RATE_LIMITS.perHour, maxRequests: CHAT_RATE_LIMITS.perHour.maxRequests * IP_CEILING_MULTIPLIER, keyPrefix: "ip:hour" },
      { ...CHAT_RATE_LIMITS.perDay, maxRequests: CHAT_RATE_LIMITS.perDay.maxRequests * IP_CEILING_MULTIPLIER, keyPrefix: "ip:day" },
    ]);

    if (!ipResult.allowed) {
      res.setHeader("X-RateLimit-Remaining", "0");
      res.setHeader("X-RateLimit-Reset", Math.ceil(ipResult.resetAt / 1000).toString());
      res.setHeader("Retry-After", ipResult.retryAfter.toString());
      res.status(429).json({
        error: {
          code: "RATE_LIMITED",
          message: "Too many requests from this network. Please wait.",
          retryAfter: ipResult.retryAfter,
        },
      });
      return;
    }

    // Set informative headers (visitor-scoped — matches getRateLimitStatus)
    res.setHeader("X-RateLimit-Remaining", visitorResult.remaining.toString());
    res.setHeader("X-RateLimit-Reset", Math.ceil(visitorResult.resetAt / 1000).toString());

    next();
  } catch (err) {
    // Fail open — rate-limit store failure must not block traffic
    console.error("[RateLimit] check failed, allowing request:", err);
    next();
  }
}

// ---------------------------------------------------------------------------
// Generic rate limiter factory
// ---------------------------------------------------------------------------

export function rateLimit(options: {
  windowMs: number;
  maxRequests: number;
  keyFn?: (req: Request) => string;
}) {
  const { windowMs, maxRequests, keyFn } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const key = (keyFn ? keyFn(req) : req.ip) || "unknown";
      const config: RateLimitConfig = { windowMs, maxRequests, keyPrefix: "api" };

      const result = await checkSingleLimit(key, config);

      res.setHeader("X-RateLimit-Remaining", result.remaining.toString());
      res.setHeader("X-RateLimit-Reset", Math.ceil(result.resetAt / 1000).toString());

      if (!result.allowed) {
        res.setHeader("Retry-After", result.retryAfter.toString());
        res.status(429).json({
          error: {
            code: "RATE_LIMITED",
            message: "Too many requests",
            retryAfter: result.retryAfter,
          },
        });
        return;
      }

      next();
    } catch (err) {
      console.error("[RateLimit] check failed, allowing request:", err);
      next();
    }
  };
}

function requestBodyString(req: Request, key: string): string {
  const value = req.body?.[key];
  return typeof value === "string" && value.length > 0 ? value : "unknown";
}

export const identifyRateLimiters = [
  rateLimit({
    ...IDENTIFY_RATE_LIMITS.perIp,
    keyFn: (req) =>
      `identify:ip:${requestBodyString(req, "projectId")}:${extractClientIp(req)}`,
  }),
  rateLimit({
    ...IDENTIFY_RATE_LIMITS.perVisitor,
    keyFn: (req) =>
      `identify:visitor:${requestBodyString(req, "projectId")}:${requestBodyString(req, "visitorId")}`,
  }),
] as const;

// ---------------------------------------------------------------------------
// Public status query (for widget UI)
// ---------------------------------------------------------------------------

export async function getRateLimitStatus(visitorId: string): Promise<{
  minute: { remaining: number; resetAt: number };
  hour: { remaining: number; resetAt: number };
  day: { remaining: number; resetAt: number };
}> {
  const [minute, hour, day] = await Promise.all([
    store.peek(`${CHAT_RATE_LIMITS.perMinute.keyPrefix}:${visitorId}`, CHAT_RATE_LIMITS.perMinute.windowMs, CHAT_RATE_LIMITS.perMinute.maxRequests),
    store.peek(`${CHAT_RATE_LIMITS.perHour.keyPrefix}:${visitorId}`, CHAT_RATE_LIMITS.perHour.windowMs, CHAT_RATE_LIMITS.perHour.maxRequests),
    store.peek(`${CHAT_RATE_LIMITS.perDay.keyPrefix}:${visitorId}`, CHAT_RATE_LIMITS.perDay.windowMs, CHAT_RATE_LIMITS.perDay.maxRequests),
  ]);
  return { minute, hour, day };
}

// ---------------------------------------------------------------------------
// Testing utilities
// ---------------------------------------------------------------------------

export async function resetRateLimits(visitorId: string): Promise<void> {
  await store.clear(visitorId);
}

// Legacy exports
export const chatRateLimit = chatRateLimiter;
export const apiRateLimit = rateLimit({ windowMs: 60_000, maxRequests: 100 });
