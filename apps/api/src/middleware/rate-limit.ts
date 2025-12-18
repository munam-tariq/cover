/**
 * Rate Limiting Middleware
 *
 * Implements a sliding window rate limiter using in-memory storage.
 * Tracks requests per visitor ID with configurable limits per time window.
 *
 * For production, consider using Redis for distributed rate limiting.
 */

import { NextFunction, Request, Response } from "express";

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyPrefix: string;
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// In-memory store for rate limiting
const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt < now) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Rate limits for chat API - tiered protection
 */
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

/**
 * Check rate limit for a single window
 */
function checkSingleLimit(
  key: string,
  config: RateLimitConfig
): {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfter: number;
} {
  const now = Date.now();
  const fullKey = `${config.keyPrefix}:${key}`;
  const entry = rateLimitStore.get(fullKey);

  // No entry or expired - create new window
  if (!entry || entry.resetAt < now) {
    rateLimitStore.set(fullKey, {
      count: 1,
      resetAt: now + config.windowMs,
    });
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetAt: now + config.windowMs,
      retryAfter: 0,
    };
  }

  // Check if limit exceeded
  if (entry.count >= config.maxRequests) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
      retryAfter,
    };
  }

  // Increment and allow
  entry.count++;
  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetAt: entry.resetAt,
    retryAfter: 0,
  };
}

/**
 * Apply multiple rate limits - fails on first exceeded limit
 */
function applyMultipleRateLimits(
  visitorId: string,
  limits: RateLimitConfig[]
): {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfter: number;
  limitType: string;
} {
  for (const limit of limits) {
    const result = checkSingleLimit(visitorId, limit);
    if (!result.allowed) {
      return { ...result, limitType: limit.keyPrefix };
    }
  }

  // All passed - return most restrictive remaining count
  const results = limits.map((limit) => {
    const fullKey = `${limit.keyPrefix}:${visitorId}`;
    const entry = rateLimitStore.get(fullKey);
    return {
      remaining: entry ? limit.maxRequests - entry.count : limit.maxRequests,
      resetAt: entry?.resetAt || Date.now() + limit.windowMs,
      limitType: limit.keyPrefix,
    };
  });

  const mostRestrictive = results.reduce((min, curr) =>
    curr.remaining < min.remaining ? curr : min
  );

  return {
    allowed: true,
    remaining: mostRestrictive.remaining,
    resetAt: mostRestrictive.resetAt,
    retryAfter: 0,
    limitType: mostRestrictive.limitType,
  };
}

/**
 * Chat-specific rate limiter middleware
 * Uses visitor ID from body/header for tracking
 */
export function chatRateLimiter(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Get visitor ID - prefer body, then header, then IP
  const visitorId =
    req.body?.visitorId ||
    (req.headers["x-visitor-id"] as string) ||
    req.ip ||
    "anonymous";

  const result = applyMultipleRateLimits(visitorId, [
    CHAT_RATE_LIMITS.perMinute,
    CHAT_RATE_LIMITS.perHour,
    CHAT_RATE_LIMITS.perDay,
  ]);

  // Set informative headers
  res.setHeader("X-RateLimit-Remaining", result.remaining.toString());
  res.setHeader("X-RateLimit-Reset", Math.ceil(result.resetAt / 1000).toString());

  if (!result.allowed) {
    res.setHeader("Retry-After", result.retryAfter.toString());
    res.status(429).json({
      error: {
        code: "RATE_LIMITED",
        message: "Too many messages. Please wait before sending more.",
        retryAfter: result.retryAfter,
      },
    });
    return;
  }

  next();
}

/**
 * Generic rate limiter factory
 */
export function rateLimit(options: { windowMs: number; maxRequests: number }) {
  const { windowMs, maxRequests } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip || "unknown";
    const config: RateLimitConfig = {
      windowMs,
      maxRequests,
      keyPrefix: "api",
    };

    const result = checkSingleLimit(key, config);

    res.setHeader("X-RateLimit-Remaining", result.remaining.toString());
    res.setHeader("X-RateLimit-Reset", Math.ceil(result.resetAt / 1000).toString());

    if (!result.allowed) {
      res.setHeader("Retry-After", result.retryAfter.toString());
      return res.status(429).json({
        error: {
          code: "RATE_LIMITED",
          message: "Too many requests",
          retryAfter: result.retryAfter,
        },
      });
    }

    next();
  };
}

/**
 * Get rate limit status for a visitor (useful for UI feedback)
 */
export function getRateLimitStatus(visitorId: string): {
  minute: { remaining: number; resetAt: number };
  hour: { remaining: number; resetAt: number };
  day: { remaining: number; resetAt: number };
} {
  const now = Date.now();

  const getStatus = (config: RateLimitConfig) => {
    const fullKey = `${config.keyPrefix}:${visitorId}`;
    const entry = rateLimitStore.get(fullKey);

    if (!entry || entry.resetAt < now) {
      return { remaining: config.maxRequests, resetAt: now + config.windowMs };
    }

    return {
      remaining: Math.max(0, config.maxRequests - entry.count),
      resetAt: entry.resetAt,
    };
  };

  return {
    minute: getStatus(CHAT_RATE_LIMITS.perMinute),
    hour: getStatus(CHAT_RATE_LIMITS.perHour),
    day: getStatus(CHAT_RATE_LIMITS.perDay),
  };
}

/**
 * Reset rate limits for a visitor (useful for testing)
 */
export function resetRateLimits(visitorId: string): void {
  for (const key of rateLimitStore.keys()) {
    if (key.includes(visitorId)) {
      rateLimitStore.delete(key);
    }
  }
}

// Legacy exports for backward compatibility
export const chatRateLimit = chatRateLimiter;
export const apiRateLimit = rateLimit({
  windowMs: 60 * 1000,
  maxRequests: 100,
});
