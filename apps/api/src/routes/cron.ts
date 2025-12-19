/**
 * Cron Routes
 *
 * Endpoints called by external cron schedulers (e.g., Vercel Cron, pg_cron).
 * All endpoints require CRON_SECRET for authentication.
 */

import { Router } from "express";
import { sendLeadDigests } from "../jobs/lead-digest";

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
 * POST /api/cron/lead-digest
 *
 * Send daily lead capture digest emails.
 * Should be called daily (e.g., 9 AM UTC).
 */
cronRouter.post("/lead-digest", verifyCronSecret, async (_req, res) => {
  try {
    console.log("[Cron] Starting lead digest job");
    const startTime = Date.now();

    const result = await sendLeadDigests();

    const duration = Date.now() - startTime;
    console.log(
      `[Cron] Lead digest complete: processed=${result.processed}, sent=${result.sent}, errors=${result.errors.length}, duration=${duration}ms`
    );

    res.json({
      success: true,
      processed: result.processed,
      sent: result.sent,
      errors: result.errors,
      duration,
    });
  } catch (error) {
    console.error("[Cron] Lead digest job failed:", error);
    res.status(500).json({
      error: "Lead digest job failed",
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
