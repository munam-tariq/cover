import { checkSingleLimit, type RateLimitConfig } from "../../../middleware/rate-limit";

// Reuses the shared rate-limit store (in-memory by default, Redis when
// REDIS_URL is set) so the per-sender limit stays correct across multiple
// API instances instead of resetting per-process.
const WA_SENDER_RATE_LIMIT: RateLimitConfig = {
  windowMs: 60_000,
  maxRequests: 30,
  keyPrefix: "wa:sender",
};

/** Returns true when the sender should be dropped (rate-limited). */
export async function checkSenderRateLimit(senderKey: string): Promise<boolean> {
  const result = await checkSingleLimit(senderKey, WA_SENDER_RATE_LIMIT);
  return !result.allowed;
}
