/**
 * Pulse Routes — Micro-Survey Popups
 *
 * Dashboard routes (auth required):
 *   GET    /api/projects/:id/pulse/campaigns          - List campaigns
 *   GET    /api/projects/:id/pulse/campaigns/:cid      - Get campaign detail
 *   POST   /api/projects/:id/pulse/campaigns           - Create campaign
 *   PUT    /api/projects/:id/pulse/campaigns/:cid      - Update campaign
 *   DELETE /api/projects/:id/pulse/campaigns/:cid      - Delete campaign
 *   GET    /api/projects/:id/pulse/campaigns/:cid/responses - List responses
 *   GET    /api/projects/:id/pulse/campaigns/:cid/analytics - Get analytics
 *   POST   /api/projects/:id/pulse/campaigns/:cid/summary   - Generate AI summary
 *
 * Widget routes (public, widgetCors):
 *   GET    /api/pulse/campaigns/:projectId   - Get active campaigns for widget
 *   POST   /api/pulse/responses              - Submit a response
 */

import { Router, Request, Response } from "express";
import { authMiddleware, AuthenticatedRequest } from "../middleware/auth";
import { chatRateLimiter } from "../middleware/rate-limit";
import { supabaseAdmin } from "../lib/supabase";
import { logger } from "../lib/logger";
import { chatCompletion } from "../lib/openai";

// ─── Dashboard Routes (authenticated) ───────────────────────────────────────

export const pulseRouter = Router();

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const VALID_TYPES = ["nps", "poll", "sentiment", "feedback"];
const VALID_STATUSES = ["draft", "active", "paused", "completed"];

/**
 * Verify project ownership and return project id, or send error response.
 */
async function verifyProjectOwnership(
  projectId: string,
  userId: string,
  res: Response
): Promise<string | null> {
  if (!UUID_REGEX.test(projectId)) {
    res
      .status(400)
      .json({ error: { code: "INVALID_ID", message: "Invalid project ID" } });
    return null;
  }

  const { data: project, error } = await supabaseAdmin
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("user_id", userId)
    .is("deleted_at", null)
    .single();

  if (error || !project) {
    res
      .status(404)
      .json({ error: { code: "PROJECT_NOT_FOUND", message: "Project not found" } });
    return null;
  }

  return project.id;
}

/**
 * GET /api/projects/:id/pulse/campaigns
 * List campaigns for a project.
 * Query: status?, type?, limit?, offset?
 */
pulseRouter.get(
  "/:id/pulse/campaigns",
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const projectId = await verifyProjectOwnership(
        req.params.id,
        req.userId!,
        res
      );
      if (!projectId) return;

      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const offset = parseInt(req.query.offset as string) || 0;
      const status = req.query.status as string;
      const type = req.query.type as string;

      let query = supabaseAdmin
        .from("pulse_campaigns")
        .select("*", { count: "exact" })
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (status && VALID_STATUSES.includes(status)) {
        query = query.eq("status", status);
      }
      if (type && VALID_TYPES.includes(type)) {
        query = query.eq("type", type);
      }

      const { data: campaigns, error, count } = await query;

      if (error) throw error;

      res.json({
        campaigns: campaigns || [],
        total: count || 0,
        limit,
        offset,
      });
    } catch (error) {
      logger.error("List pulse campaigns error", error, {
        requestId: req.requestId,
      });
      res.status(500).json({
        error: { code: "INTERNAL_ERROR", message: "Failed to list campaigns" },
      });
    }
  }
);

/**
 * GET /api/projects/:id/pulse/campaigns/:cid
 * Get a single campaign with its latest summary.
 */
pulseRouter.get(
  "/:id/pulse/campaigns/:cid",
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const projectId = await verifyProjectOwnership(
        req.params.id,
        req.userId!,
        res
      );
      if (!projectId) return;

      const campaignId = req.params.cid;
      if (!UUID_REGEX.test(campaignId)) {
        return res.status(400).json({
          error: { code: "INVALID_ID", message: "Invalid campaign ID" },
        });
      }

      const [campaignResult, summaryResult] = await Promise.all([
        supabaseAdmin
          .from("pulse_campaigns")
          .select("*")
          .eq("id", campaignId)
          .eq("project_id", projectId)
          .single(),
        supabaseAdmin
          .from("pulse_summaries")
          .select("*")
          .eq("campaign_id", campaignId)
          .order("generated_at", { ascending: false })
          .limit(1),
      ]);

      if (campaignResult.error || !campaignResult.data) {
        return res.status(404).json({
          error: { code: "NOT_FOUND", message: "Campaign not found" },
        });
      }

      res.json({
        campaign: campaignResult.data,
        summary: summaryResult.data?.[0] || null,
      });
    } catch (error) {
      logger.error("Get pulse campaign error", error, {
        requestId: req.requestId,
      });
      res.status(500).json({
        error: { code: "INTERNAL_ERROR", message: "Failed to get campaign" },
      });
    }
  }
);

/**
 * POST /api/projects/:id/pulse/campaigns
 * Create a new campaign.
 * Body: { type, question, config?, targeting?, styling?, status?, response_goal?, starts_at?, ends_at? }
 */
pulseRouter.post(
  "/:id/pulse/campaigns",
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const projectId = await verifyProjectOwnership(
        req.params.id,
        req.userId!,
        res
      );
      if (!projectId) return;

      const {
        type,
        question,
        config,
        targeting,
        styling,
        status,
        response_goal,
        starts_at,
        ends_at,
      } = req.body;

      // Validate required fields
      if (!type || !VALID_TYPES.includes(type)) {
        return res.status(400).json({
          error: {
            code: "INVALID_INPUT",
            message: `type must be one of: ${VALID_TYPES.join(", ")}`,
          },
        });
      }

      if (!question || typeof question !== "string" || question.trim().length === 0) {
        return res.status(400).json({
          error: {
            code: "INVALID_INPUT",
            message: "question is required",
          },
        });
      }

      if (question.length > 500) {
        return res.status(400).json({
          error: {
            code: "INVALID_INPUT",
            message: "question must be under 500 characters",
          },
        });
      }

      // Validate poll options if type is poll
      if (type === "poll") {
        const opts = config?.options;
        if (
          !opts ||
          !Array.isArray(opts) ||
          opts.length < 2 ||
          opts.length > 5 ||
          opts.some((o: unknown) => typeof o !== "string" || (o as string).trim().length === 0)
        ) {
          return res.status(400).json({
            error: {
              code: "INVALID_INPUT",
              message: "Poll campaigns require 2-5 non-empty options in config.options",
            },
          });
        }
      }

      const campaignStatus =
        status && VALID_STATUSES.includes(status) ? status : "draft";

      const { data: campaign, error } = await supabaseAdmin
        .from("pulse_campaigns")
        .insert({
          project_id: projectId,
          type,
          question: question.trim(),
          config: config || {},
          targeting: targeting || {},
          styling: styling || {},
          status: campaignStatus,
          response_goal: response_goal || null,
          starts_at: starts_at || null,
          ends_at: ends_at || null,
        })
        .select("*")
        .single();

      if (error) throw error;

      res.status(201).json({ campaign });
    } catch (error) {
      logger.error("Create pulse campaign error", error, {
        requestId: req.requestId,
      });
      res.status(500).json({
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to create campaign",
        },
      });
    }
  }
);

/**
 * PUT /api/projects/:id/pulse/campaigns/:cid
 * Update a campaign.
 * Body: any subset of campaign fields (except id, project_id, response_count, created_at)
 */
pulseRouter.put(
  "/:id/pulse/campaigns/:cid",
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const projectId = await verifyProjectOwnership(
        req.params.id,
        req.userId!,
        res
      );
      if (!projectId) return;

      const campaignId = req.params.cid;
      if (!UUID_REGEX.test(campaignId)) {
        return res.status(400).json({
          error: { code: "INVALID_ID", message: "Invalid campaign ID" },
        });
      }

      // Build update object from allowed fields
      const allowedFields = [
        "question",
        "config",
        "targeting",
        "styling",
        "status",
        "response_goal",
        "starts_at",
        "ends_at",
      ];

      const updates: Record<string, unknown> = {};
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          updates[field] = req.body[field];
        }
      }

      // Validate status if provided
      if (updates.status && !VALID_STATUSES.includes(updates.status as string)) {
        return res.status(400).json({
          error: {
            code: "INVALID_INPUT",
            message: `status must be one of: ${VALID_STATUSES.join(", ")}`,
          },
        });
      }

      // Validate question if provided
      if (updates.question !== undefined) {
        if (
          typeof updates.question !== "string" ||
          (updates.question as string).trim().length === 0
        ) {
          return res.status(400).json({
            error: { code: "INVALID_INPUT", message: "question cannot be empty" },
          });
        }
        if ((updates.question as string).length > 500) {
          return res.status(400).json({
            error: {
              code: "INVALID_INPUT",
              message: "question must be under 500 characters",
            },
          });
        }
        updates.question = (updates.question as string).trim();
      }

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({
          error: { code: "INVALID_INPUT", message: "No valid fields to update" },
        });
      }

      const { data: campaign, error } = await supabaseAdmin
        .from("pulse_campaigns")
        .update(updates)
        .eq("id", campaignId)
        .eq("project_id", projectId)
        .select("*")
        .single();

      if (error || !campaign) {
        return res.status(404).json({
          error: { code: "NOT_FOUND", message: "Campaign not found" },
        });
      }

      res.json({ campaign });
    } catch (error) {
      logger.error("Update pulse campaign error", error, {
        requestId: req.requestId,
      });
      res.status(500).json({
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to update campaign",
        },
      });
    }
  }
);

/**
 * DELETE /api/projects/:id/pulse/campaigns/:cid
 * Delete a campaign and its responses/summaries (CASCADE).
 */
pulseRouter.delete(
  "/:id/pulse/campaigns/:cid",
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const projectId = await verifyProjectOwnership(
        req.params.id,
        req.userId!,
        res
      );
      if (!projectId) return;

      const campaignId = req.params.cid;
      if (!UUID_REGEX.test(campaignId)) {
        return res.status(400).json({
          error: { code: "INVALID_ID", message: "Invalid campaign ID" },
        });
      }

      const { error } = await supabaseAdmin
        .from("pulse_campaigns")
        .delete()
        .eq("id", campaignId)
        .eq("project_id", projectId);

      if (error) throw error;

      res.json({ success: true });
    } catch (error) {
      logger.error("Delete pulse campaign error", error, {
        requestId: req.requestId,
      });
      res.status(500).json({
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to delete campaign",
        },
      });
    }
  }
);

/**
 * GET /api/projects/:id/pulse/campaigns/:cid/responses
 * List responses for a campaign.
 * Query: limit?, offset?
 */
pulseRouter.get(
  "/:id/pulse/campaigns/:cid/responses",
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const projectId = await verifyProjectOwnership(
        req.params.id,
        req.userId!,
        res
      );
      if (!projectId) return;

      const campaignId = req.params.cid;
      if (!UUID_REGEX.test(campaignId)) {
        return res.status(400).json({
          error: { code: "INVALID_ID", message: "Invalid campaign ID" },
        });
      }

      const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
      const offset = parseInt(req.query.offset as string) || 0;

      const { data: responses, error, count } = await supabaseAdmin
        .from("pulse_responses")
        .select("*", { count: "exact" })
        .eq("campaign_id", campaignId)
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      res.json({
        responses: responses || [],
        total: count || 0,
        limit,
        offset,
      });
    } catch (error) {
      logger.error("List pulse responses error", error, {
        requestId: req.requestId,
      });
      res.status(500).json({
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to list responses",
        },
      });
    }
  }
);

/**
 * GET /api/projects/:id/pulse/campaigns/:cid/analytics
 * Get analytics for a campaign (type-specific aggregations).
 */
pulseRouter.get(
  "/:id/pulse/campaigns/:cid/analytics",
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const projectId = await verifyProjectOwnership(
        req.params.id,
        req.userId!,
        res
      );
      if (!projectId) return;

      const campaignId = req.params.cid;
      if (!UUID_REGEX.test(campaignId)) {
        return res.status(400).json({
          error: { code: "INVALID_ID", message: "Invalid campaign ID" },
        });
      }

      // Get campaign to know the type
      const { data: campaign, error: campaignError } = await supabaseAdmin
        .from("pulse_campaigns")
        .select("id, type, response_count, config")
        .eq("id", campaignId)
        .eq("project_id", projectId)
        .single();

      if (campaignError || !campaign) {
        return res.status(404).json({
          error: { code: "NOT_FOUND", message: "Campaign not found" },
        });
      }

      // Get responses for aggregation (cap at 10K for memory safety)
      const { data: responses, error: responsesError } = await supabaseAdmin
        .from("pulse_responses")
        .select("answer, created_at")
        .eq("campaign_id", campaignId)
        .order("created_at", { ascending: true })
        .limit(10000);

      if (responsesError) throw responsesError;

      const allResponses = responses || [];
      const analytics: Record<string, unknown> = {
        total_responses: campaign.response_count,
        type: campaign.type,
      };

      if (campaign.type === "nps") {
        // Calculate NPS score
        const scores = allResponses
          .map((r) => (r.answer as { score?: number })?.score)
          .filter((s): s is number => typeof s === "number");

        if (scores.length > 0) {
          const promoters = scores.filter((s) => s >= 9).length;
          const detractors = scores.filter((s) => s <= 6).length;
          const npsScore = Math.round(
            ((promoters - detractors) / scores.length) * 100
          );

          analytics.nps_score = npsScore;
          analytics.promoters = promoters;
          analytics.passives = scores.filter((s) => s >= 7 && s <= 8).length;
          analytics.detractors = detractors;
          analytics.score_distribution = Array.from({ length: 11 }, (_, i) => ({
            score: i,
            count: scores.filter((s) => s === i).length,
          }));
        }
      } else if (campaign.type === "poll") {
        // Poll option counts
        const optionCounts: Record<string, number> = {};
        let otherCount = 0;

        for (const r of allResponses) {
          const answer = r.answer as { option?: string; other_text?: string };
          const opt = answer?.option || "unknown";
          if (answer?.other_text) {
            otherCount++;
          }
          optionCounts[opt] = (optionCounts[opt] || 0) + 1;
        }

        analytics.option_counts = optionCounts;
        analytics.other_count = otherCount;
      } else if (campaign.type === "sentiment") {
        // Emoji counts
        const emojiCounts: Record<string, number> = {};

        for (const r of allResponses) {
          const emoji = (r.answer as { emoji?: string })?.emoji || "unknown";
          emojiCounts[emoji] = (emojiCounts[emoji] || 0) + 1;
        }

        analytics.emoji_counts = emojiCounts;
      } else if (campaign.type === "feedback") {
        // Just response count for feedback — AI summary handles analysis
        analytics.has_text_responses = allResponses.length > 0;
      }

      // Daily response trend (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const dailyCounts: Record<string, number> = {};
      for (const r of allResponses) {
        const day = r.created_at.split("T")[0];
        if (new Date(day) >= thirtyDaysAgo) {
          dailyCounts[day] = (dailyCounts[day] || 0) + 1;
        }
      }

      analytics.daily_trend = Object.entries(dailyCounts)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date));

      res.json({ analytics });
    } catch (error) {
      logger.error("Pulse analytics error", error, {
        requestId: req.requestId,
      });
      res.status(500).json({
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to compute analytics",
        },
      });
    }
  }
);

/**
 * POST /api/projects/:id/pulse/campaigns/:cid/summary
 * Generate an AI summary of campaign responses.
 * Requires at least 5 responses.
 */
pulseRouter.post(
  "/:id/pulse/campaigns/:cid/summary",
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const projectId = await verifyProjectOwnership(
        req.params.id,
        req.userId!,
        res
      );
      if (!projectId) return;

      const campaignId = req.params.cid;
      if (!UUID_REGEX.test(campaignId)) {
        return res.status(400).json({
          error: { code: "INVALID_ID", message: "Invalid campaign ID" },
        });
      }

      // Get campaign
      const { data: campaign, error: campaignError } = await supabaseAdmin
        .from("pulse_campaigns")
        .select("id, type, question, config, response_count")
        .eq("id", campaignId)
        .eq("project_id", projectId)
        .single();

      if (campaignError || !campaign) {
        return res.status(404).json({
          error: { code: "NOT_FOUND", message: "Campaign not found" },
        });
      }

      if (campaign.response_count < 5) {
        return res.status(400).json({
          error: {
            code: "INSUFFICIENT_DATA",
            message: "Need at least 5 responses to generate a summary",
          },
        });
      }

      // Get responses (up to 200 most recent for summary)
      const { data: responses, error: responsesError } = await supabaseAdmin
        .from("pulse_responses")
        .select("answer, page_url, created_at")
        .eq("campaign_id", campaignId)
        .order("created_at", { ascending: false })
        .limit(200);

      if (responsesError) throw responsesError;

      // Build prompt based on campaign type
      const answersText = (responses || [])
        .map((r, i) => {
          const a = r.answer as Record<string, unknown>;
          if (campaign.type === "nps") {
            return `${i + 1}. Score: ${a.score}${a.follow_up ? `, Comment: "${a.follow_up}"` : ""}`;
          } else if (campaign.type === "poll") {
            return `${i + 1}. ${a.option}${a.other_text ? ` (Other: "${a.other_text}")` : ""}`;
          } else if (campaign.type === "sentiment") {
            const labels: Record<string, string> = {
              "1": "Very Unhappy",
              "2": "Unhappy",
              "3": "Neutral",
              "4": "Happy",
              "5": "Very Happy",
            };
            return `${i + 1}. ${labels[String(a.emoji)] || a.emoji}${a.follow_up ? `, Comment: "${a.follow_up}"` : ""}`;
          } else {
            return `${i + 1}. "${a.text}"`;
          }
        })
        .join("\n");

      const systemPrompt = `You are an analytics assistant. Analyze micro-survey responses and provide actionable insights. Return a JSON object with:
- "summary": A concise 2-3 sentence summary of the key findings
- "themes": An array of objects with "label" (short theme name), "count" (how many responses match), and optionally "sentiment" ("positive", "negative", or "neutral")

Return ONLY valid JSON, no markdown.`;

      const userPrompt = `Campaign type: ${campaign.type}
Question: "${campaign.question}"
Total responses: ${campaign.response_count}

Responses:
${answersText}`;

      const completion = await chatCompletion(
        [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        { temperature: 0.3, maxTokens: 800 }
      );

      const rawContent = completion.choices[0]?.message?.content || "{}";

      let parsed: { summary?: string; themes?: unknown[] };
      try {
        parsed = JSON.parse(rawContent);
      } catch {
        parsed = { summary: rawContent, themes: [] };
      }

      // Delete old summaries for this campaign, then insert new one
      await supabaseAdmin
        .from("pulse_summaries")
        .delete()
        .eq("campaign_id", campaignId);

      const { data: summary, error: insertError } = await supabaseAdmin
        .from("pulse_summaries")
        .insert({
          campaign_id: campaignId,
          summary_text: parsed.summary || "Unable to generate summary.",
          themes: parsed.themes || [],
          response_count: campaign.response_count,
          generated_at: new Date().toISOString(),
        })
        .select("*")
        .single();

      if (insertError) throw insertError;

      res.json({ summary });
    } catch (error) {
      logger.error("Generate pulse summary error", error, {
        requestId: req.requestId,
      });
      res.status(500).json({
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to generate summary",
        },
      });
    }
  }
);

// ─── Widget Routes (public) ─────────────────────────────────────────────────

export const pulseWidgetRouter = Router();

/**
 * GET /api/pulse/campaigns/:projectId
 * Get active campaigns for a project (called by widget on load).
 * Returns only active campaigns matching the current page/timing.
 */
pulseWidgetRouter.get(
  "/campaigns/:projectId",
  async (req: Request, res: Response) => {
    try {
      const { projectId } = req.params;

      if (!UUID_REGEX.test(projectId)) {
        return res.status(400).json({
          error: { code: "INVALID_ID", message: "Invalid project ID" },
        });
      }

      const now = new Date().toISOString();

      // Get active campaigns that are within their date range
      const { data: campaigns, error } = await supabaseAdmin
        .from("pulse_campaigns")
        .select(
          "id, type, question, config, targeting, styling, response_count, response_goal"
        )
        .eq("project_id", projectId)
        .eq("status", "active")
        .or(`starts_at.is.null,starts_at.lte.${now}`)
        .or(`ends_at.is.null,ends_at.gte.${now}`);

      if (error) throw error;

      // Filter out campaigns that have hit their response goal
      const activeCampaigns = (campaigns || []).filter(
        (c) => !c.response_goal || c.response_count < c.response_goal
      );

      res.json({ campaigns: activeCampaigns });
    } catch (error) {
      logger.error("Widget get pulse campaigns error", error, {
        requestId: (req as any).requestId,
      });
      res.status(500).json({
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to get campaigns",
        },
      });
    }
  }
);

/**
 * POST /api/pulse/responses
 * Submit a response from the widget.
 * Body: { campaign_id, project_id, answer, page_url?, visitor_id?, session_id?, metadata? }
 */
pulseWidgetRouter.post(
  "/responses",
  chatRateLimiter,
  async (req: Request, res: Response) => {
    try {
      const {
        campaign_id,
        project_id,
        answer,
        page_url,
        visitor_id,
        session_id,
        metadata,
      } = req.body;

      // Validate required fields
      if (!campaign_id || !project_id || !answer) {
        return res.status(400).json({
          error: {
            code: "INVALID_INPUT",
            message: "campaign_id, project_id, and answer are required",
          },
        });
      }

      if (!UUID_REGEX.test(campaign_id) || !UUID_REGEX.test(project_id)) {
        return res.status(400).json({
          error: { code: "INVALID_ID", message: "Invalid ID format" },
        });
      }

      // Verify campaign exists and is active
      const { data: campaign, error: campaignError } = await supabaseAdmin
        .from("pulse_campaigns")
        .select("id, status")
        .eq("id", campaign_id)
        .eq("project_id", project_id)
        .eq("status", "active")
        .single();

      if (campaignError || !campaign) {
        return res.status(404).json({
          error: {
            code: "CAMPAIGN_NOT_ACTIVE",
            message: "Campaign not found or not active",
          },
        });
      }

      const { data: response, error } = await supabaseAdmin
        .from("pulse_responses")
        .insert({
          campaign_id,
          project_id,
          answer,
          page_url: page_url || null,
          visitor_id: visitor_id || null,
          session_id: session_id || null,
          metadata: metadata || {},
        })
        .select("id, created_at")
        .single();

      if (error) throw error;

      res.status(201).json({ success: true, response_id: response.id });
    } catch (error) {
      logger.error("Widget submit pulse response error", error, {
        requestId: (req as any).requestId,
      });
      res.status(500).json({
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to submit response",
        },
      });
    }
  }
);
