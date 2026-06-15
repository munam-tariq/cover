/**
 * Cron Routes
 *
 * Endpoints called by external cron schedulers (e.g., Vercel Cron, pg_cron).
 * All endpoints require CRON_SECRET for authentication.
 */

import { Router } from "express";

import { classifyAllProjects } from "../services/conversation-insights";
import {
  checkAndUpdateAgentStatuses,
  closeAbandonedConversations,
} from "../services/presence";

export const cronRouter = Router();

/**
 * Verify cron secret middleware
 */
function verifyCronSecret(
  req: { headers: { authorization?: string } },
  res: { status: (code: number) => { json: (body: object) => void } },
  next: () => void
) {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error("CRON_SECRET not configured");
    return res.status(500).json({ error: "Cron not configured" });
  }

  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  next();
}

/**
 * POST /api/cron/agent-presence
 *
 * Check and update agent presence statuses.
 * Marks agents as "away" or "offline" based on heartbeat timing.
 * Should be called every 5 minutes.
 */
cronRouter.post("/agent-presence", verifyCronSecret, async (_req, res) => {
  try {
    console.log("[Cron] Starting agent presence check");
    const startTime = Date.now();

    const result = await checkAndUpdateAgentStatuses();

    const duration = Date.now() - startTime;
    console.log(
      `[Cron] Agent presence check complete: updated=${result.updated}, duration=${duration}ms`
    );

    res.json({
      success: true,
      updated: result.updated,
      details: result.details,
      duration,
    });
  } catch (error) {
    console.error("[Cron] Agent presence check failed:", error);
    res.status(500).json({
      error: "Agent presence check failed",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * POST /api/cron/conversation-cleanup
 *
 * Close abandoned conversations where customer has been offline for too long.
 * Should be called every hour.
 */
cronRouter.post("/conversation-cleanup", verifyCronSecret, async (_req, res) => {
  try {
    console.log("[Cron] Starting conversation cleanup");
    const startTime = Date.now();

    const result = await closeAbandonedConversations();

    const duration = Date.now() - startTime;
    console.log(
      `[Cron] Conversation cleanup complete: closed=${result.closed}, duration=${duration}ms`
    );

    res.json({
      success: true,
      closed: result.closed,
      conversations: result.conversations,
      duration,
    });
  } catch (error) {
    console.error("[Cron] Conversation cleanup failed:", error);
    res.status(500).json({
      error: "Conversation cleanup failed",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * POST /api/cron/classify-insights
 *
 * Classify recent conversations (topic / sentiment / resolution / answer-gap) for every
 * eligible project and write them to conversation_insights. Idempotent per conversation.
 * Should be called nightly (e.g. 3 AM UTC).
 */
cronRouter.post("/classify-insights", verifyCronSecret, async (_req, res) => {
  try {
    console.log("[Cron] Starting conversation insights classification");
    const startTime = Date.now();

    const result = await classifyAllProjects();

    const duration = Date.now() - startTime;
    console.log(
      `[Cron] Insights classification complete: processed=${result.processed}, classified=${result.classified}, errors=${result.errors.length}, duration=${duration}ms`
    );

    res.json({
      success: true,
      processed: result.processed,
      classified: result.classified,
      errors: result.errors,
      duration,
    });
  } catch (error) {
    console.error("[Cron] Insights classification failed:", error);
    res.status(500).json({
      error: "Insights classification failed",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * GET /api/cron/health
 *
 * Health check for cron service.
 */
cronRouter.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "cron",
    timestamp: new Date().toISOString(),
  });
});
