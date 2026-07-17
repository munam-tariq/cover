/**
 * Analytics API Routes
 *
 * Provides analytics data for chatbot usage including:
 * - Message counts with trends (ANA-001)
 * - Top questions asked (ANA-002)
 * - Messages over time timeline (ANA-003)
 */

import { Router, Request, Response, NextFunction } from "express";

import { logger } from "../lib/logger";
import { supabaseAdmin } from "../lib/supabase";
import { authMiddleware, AuthenticatedRequest } from "../middleware/auth";
import {
  aggregateGaps,
  aggregateSentimentTimeline,
  aggregateTopics,
  type InsightRow,
} from "../services/conversation-insights-core";
import { getTopQuestions } from "../services/question-clustering";

export const analyticsRouter = Router();

// All analytics routes require authentication
analyticsRouter.use(authMiddleware);

/**
 * Authorize the caller against the requested project. Every analytics endpoint reads
 * `projectId` from the query string but the routes previously trusted it blindly — any
 * signed-in user could read another tenant's metrics. This guard verifies the caller owns
 * the project or is a member before any handler runs.
 */
async function requireProjectAccess(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const projectId = req.query.projectId as string | undefined;
  // Missing projectId is a 400 the individual handlers already return — let them.
  if (!projectId) {
    next();
    return;
  }

  const userId = (req as AuthenticatedRequest).userId;
  if (!userId) {
    res.status(401).json({
      error: { code: "UNAUTHORIZED", message: "Authentication required" },
    });
    return;
  }

  try {
    const { data: owned } = await supabaseAdmin
      .from("projects")
      .select("id")
      .eq("id", projectId)
      .eq("user_id", userId)
      .maybeSingle();

    if (!owned) {
      // Only *active* members — removal sets status='removed' (the row is kept), so a plain
      // membership check would let removed members keep reading analytics.
      const { data: member } = await supabaseAdmin
        .from("project_members")
        .select("user_id")
        .eq("project_id", projectId)
        .eq("user_id", userId)
        .eq("status", "active")
        .maybeSingle();

      if (!member) {
        res.status(403).json({
          error: { code: "FORBIDDEN", message: "No access to this project" },
        });
        return;
      }
    }

    next();
  } catch (error) {
    logger.error("Analytics access check failed", error, { projectId });
    res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Authorization check failed",
      },
    });
  }
}

analyticsRouter.use(requireProjectAccess);

const ANALYTICS_SOURCES = [
  "widget",
  "playground",
  "mcp",
  "api",
  "voice",
  "public",
  "mobile",
  "whatsapp",
];

/** Optional ?source= filter — slices metrics by chat source; invalid values are ignored. */
function parseSourceFilter(req: Request): string | null {
  const source = req.query.source as string | undefined;
  return source && ANALYTICS_SOURCES.includes(source) ? source : null;
}

/**
 * GET /api/analytics/summary
 *
 * Returns overview metrics including total messages, conversations,
 * and trend comparisons to previous period.
 * Uses conversations and messages tables (single source of truth).
 *
 * Query params:
 * - projectId: string (required)
 * - period: '24h' | '7d' | '30d' (default: '30d')
 */
analyticsRouter.get("/summary", async (req: Request, res: Response) => {
  try {
    const projectId = req.query.projectId as string;
    const period = (req.query.period as string) || "30d";
    const source = parseSourceFilter(req);

    if (!projectId) {
      return res.status(400).json({
        error: { code: "INVALID_INPUT", message: "projectId is required" },
      });
    }

    // Calculate date ranges based on period
    const periodDays = period === "24h" ? 1 : period === "7d" ? 7 : 30;
    const currentPeriodStart = new Date();
    currentPeriodStart.setDate(currentPeriodStart.getDate() - periodDays);

    const previousPeriodStart = new Date();
    previousPeriodStart.setDate(previousPeriodStart.getDate() - periodDays * 2);
    const previousPeriodEnd = new Date();
    previousPeriodEnd.setDate(previousPeriodEnd.getDate() - periodDays);

    // Get current period conversation count
    let currentConvCountQuery = supabaseAdmin
      .from("conversations")
      .select("id", { count: "exact", head: true })
      .eq("project_id", projectId)
      .gte("created_at", currentPeriodStart.toISOString());
    if (source)
      currentConvCountQuery = currentConvCountQuery.eq("source", source);
    const { count: currentConversations, error: currentConvError } =
      await currentConvCountQuery;

    if (currentConvError) throw currentConvError;

    // Get current period conversation IDs for message count
    let currentConvIdsQuery = supabaseAdmin
      .from("conversations")
      .select("id")
      .eq("project_id", projectId)
      .gte("created_at", currentPeriodStart.toISOString());
    if (source) currentConvIdsQuery = currentConvIdsQuery.eq("source", source);
    const { data: currentConvIds } = await currentConvIdsQuery;

    // Get current period user message count
    let currentMessages = 0;
    if (currentConvIds && currentConvIds.length > 0) {
      const { count: msgCount, error: msgError } = await supabaseAdmin
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("sender_type", "customer")
        .in(
          "conversation_id",
          currentConvIds.map((c) => c.id)
        );

      if (msgError) throw msgError;
      currentMessages = msgCount || 0;
    }

    // Get previous period conversation count
    let prevConvCountQuery = supabaseAdmin
      .from("conversations")
      .select("id", { count: "exact", head: true })
      .eq("project_id", projectId)
      .gte("created_at", previousPeriodStart.toISOString())
      .lt("created_at", previousPeriodEnd.toISOString());
    if (source) prevConvCountQuery = prevConvCountQuery.eq("source", source);
    const { count: previousConversations, error: prevConvError } =
      await prevConvCountQuery;

    if (prevConvError) throw prevConvError;

    // Get previous period conversation IDs for message count
    let prevConvIdsQuery = supabaseAdmin
      .from("conversations")
      .select("id")
      .eq("project_id", projectId)
      .gte("created_at", previousPeriodStart.toISOString())
      .lt("created_at", previousPeriodEnd.toISOString());
    if (source) prevConvIdsQuery = prevConvIdsQuery.eq("source", source);
    const { data: prevConvIds } = await prevConvIdsQuery;

    // Get previous period user message count
    let previousMessages = 0;
    if (prevConvIds && prevConvIds.length > 0) {
      const { count: prevMsgCount, error: prevMsgError } = await supabaseAdmin
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("sender_type", "customer")
        .in(
          "conversation_id",
          prevConvIds.map((c) => c.id)
        );

      if (prevMsgError) throw prevMsgError;
      previousMessages = prevMsgCount || 0;
    }

    // Calculate trend percentages
    const messagesChange =
      previousMessages > 0
        ? Math.round(
            ((currentMessages - previousMessages) / previousMessages) * 100
          )
        : currentMessages > 0
          ? 100
          : 0;

    const conversationsChange =
      (previousConversations || 0) > 0
        ? Math.round(
            (((currentConversations || 0) - (previousConversations || 0)) /
              (previousConversations || 1)) *
              100
          )
        : (currentConversations || 0) > 0
          ? 100
          : 0;

    res.json({
      totalMessages: currentMessages,
      totalConversations: currentConversations || 0,
      period,
      periodStart: currentPeriodStart.toISOString(),
      periodEnd: new Date().toISOString(),
      trends: {
        messagesChange,
        conversationsChange,
      },
    });
  } catch (error) {
    logger.error("Analytics summary error", error, {
      requestId: req.requestId,
    });
    res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to get analytics summary",
      },
    });
  }
});

/**
 * GET /api/analytics/top-questions
 *
 * Returns the most frequently asked questions, clustered by similarity.
 *
 * Query params:
 * - projectId: string (required)
 * - limit: number (default: 10, max: 20)
 * - days: number (default: 30, max: 90)
 */
analyticsRouter.get("/top-questions", async (req: Request, res: Response) => {
  try {
    const projectId = req.query.projectId as string;
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 20);
    const days = Math.min(parseInt(req.query.days as string) || 30, 90);
    const source = parseSourceFilter(req);

    if (!projectId) {
      return res.status(400).json({
        error: { code: "INVALID_INPUT", message: "projectId is required" },
      });
    }

    const topQuestions = await getTopQuestions(
      projectId,
      days,
      limit,
      source || undefined
    );

    res.json({
      questions: topQuestions,
      days,
      limit,
    });
  } catch (error) {
    logger.error("Top questions error", error, { requestId: req.requestId });
    res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Failed to get top questions" },
    });
  }
});

/**
 * GET /api/analytics/feedback/summary
 *
 * Returns feedback summary metrics including helpful/unhelpful counts
 * and satisfaction rate with trends.
 *
 * Query params:
 * - projectId: string (required)
 * - period: '24h' | '7d' | '30d' (default: '30d')
 */
analyticsRouter.get(
  "/feedback/summary",
  async (req: Request, res: Response) => {
    try {
      const projectId = req.query.projectId as string;
      const period = (req.query.period as string) || "30d";

      if (!projectId) {
        return res.status(400).json({
          error: { code: "INVALID_INPUT", message: "projectId is required" },
        });
      }

      // Calculate date ranges based on period
      const periodDays = period === "24h" ? 1 : period === "7d" ? 7 : 30;
      const currentPeriodStart = new Date();
      currentPeriodStart.setDate(currentPeriodStart.getDate() - periodDays);

      const previousPeriodStart = new Date();
      previousPeriodStart.setDate(
        previousPeriodStart.getDate() - periodDays * 2
      );
      const previousPeriodEnd = new Date();
      previousPeriodEnd.setDate(previousPeriodEnd.getDate() - periodDays);

      // Get current period feedback
      const { data: currentFeedback, error: currentError } = await supabaseAdmin
        .from("message_feedback")
        .select("rating")
        .eq("project_id", projectId)
        .gte("created_at", currentPeriodStart.toISOString());

      if (currentError) throw currentError;

      // Get previous period feedback for trend calculation
      const { data: previousFeedback, error: previousError } =
        await supabaseAdmin
          .from("message_feedback")
          .select("rating")
          .eq("project_id", projectId)
          .gte("created_at", previousPeriodStart.toISOString())
          .lt("created_at", previousPeriodEnd.toISOString());

      if (previousError) throw previousError;

      // Calculate current period metrics
      const currentHelpful =
        currentFeedback?.filter((f) => f.rating === "helpful").length || 0;
      const currentUnhelpful =
        currentFeedback?.filter((f) => f.rating === "unhelpful").length || 0;
      const currentTotal = currentHelpful + currentUnhelpful;
      const currentSatisfaction =
        currentTotal > 0
          ? Math.round((currentHelpful / currentTotal) * 1000) / 10
          : 0;

      // Calculate previous period metrics
      const previousHelpful =
        previousFeedback?.filter((f) => f.rating === "helpful").length || 0;
      const previousUnhelpful =
        previousFeedback?.filter((f) => f.rating === "unhelpful").length || 0;
      const previousTotal = previousHelpful + previousUnhelpful;
      const previousSatisfaction =
        previousTotal > 0
          ? Math.round((previousHelpful / previousTotal) * 1000) / 10
          : 0;

      // Calculate trend percentages
      const helpfulChange =
        previousHelpful > 0
          ? Math.round(
              ((currentHelpful - previousHelpful) / previousHelpful) * 100
            )
          : currentHelpful > 0
            ? 100
            : 0;

      const unhelpfulChange =
        previousUnhelpful > 0
          ? Math.round(
              ((currentUnhelpful - previousUnhelpful) / previousUnhelpful) * 100
            )
          : currentUnhelpful > 0
            ? 100
            : 0;

      const satisfactionChange =
        previousSatisfaction > 0
          ? Math.round((currentSatisfaction - previousSatisfaction) * 10) / 10
          : currentSatisfaction > 0
            ? currentSatisfaction
            : 0;

      res.json({
        totalFeedback: currentTotal,
        helpfulCount: currentHelpful,
        unhelpfulCount: currentUnhelpful,
        satisfactionRate: currentSatisfaction,
        period,
        periodStart: currentPeriodStart.toISOString(),
        periodEnd: new Date().toISOString(),
        trends: {
          helpfulChange,
          unhelpfulChange,
          satisfactionChange,
        },
      });
    } catch (error) {
      logger.error("Feedback summary error", error, {
        requestId: req.requestId,
      });
      res.status(500).json({
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to get feedback summary",
        },
      });
    }
  }
);

/**
 * GET /api/analytics/feedback/timeline
 *
 * Returns daily feedback counts for charting.
 *
 * Query params:
 * - projectId: string (required)
 * - days: number (default: 30, max: 90)
 */
analyticsRouter.get(
  "/feedback/timeline",
  async (req: Request, res: Response) => {
    try {
      const projectId = req.query.projectId as string;
      const days = Math.min(parseInt(req.query.days as string) || 30, 90);

      if (!projectId) {
        return res.status(400).json({
          error: { code: "INVALID_INPUT", message: "projectId is required" },
        });
      }

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      startDate.setHours(0, 0, 0, 0);

      // Get all feedback in the date range
      const { data: feedback, error } = await supabaseAdmin
        .from("message_feedback")
        .select("created_at, rating")
        .eq("project_id", projectId)
        .gte("created_at", startDate.toISOString())
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Initialize timeline with all dates in range
      const timeline: Record<string, { helpful: number; unhelpful: number }> =
        {};
      for (let i = 0; i < days; i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        const dateStr = date.toISOString().split("T")[0];
        timeline[dateStr] = { helpful: 0, unhelpful: 0 };
      }

      // Aggregate data by date
      for (const item of feedback || []) {
        const dateStr = new Date(item.created_at).toISOString().split("T")[0];
        if (timeline[dateStr]) {
          if (item.rating === "helpful") {
            timeline[dateStr].helpful++;
          } else {
            timeline[dateStr].unhelpful++;
          }
        }
      }

      // Convert to array format for frontend
      const timelineArray = Object.entries(timeline).map(([date, data]) => ({
        date,
        helpful: data.helpful,
        unhelpful: data.unhelpful,
      }));

      res.json({
        data: timelineArray,
        days,
      });
    } catch (error) {
      logger.error("Feedback timeline error", error, {
        requestId: req.requestId,
      });
      res.status(500).json({
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to get feedback timeline",
        },
      });
    }
  }
);

/**
 * GET /api/analytics/feedback/issues
 *
 * Returns questions with the most negative feedback (needs attention).
 * Groups by question text similarity and returns the most problematic ones.
 *
 * Query params:
 * - projectId: string (required)
 * - limit: number (default: 10, max: 50)
 * - period: '24h' | '7d' | '30d' (default: '30d')
 */
analyticsRouter.get("/feedback/issues", async (req: Request, res: Response) => {
  try {
    const projectId = req.query.projectId as string;
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
    const period = (req.query.period as string) || "30d";

    if (!projectId) {
      return res.status(400).json({
        error: { code: "INVALID_INPUT", message: "projectId is required" },
      });
    }

    // Calculate date range
    const periodDays = period === "24h" ? 1 : period === "7d" ? 7 : 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);

    // Get unhelpful feedback with question/answer text
    const { data: unhelpfulFeedback, error } = await supabaseAdmin
      .from("message_feedback")
      .select("question_text, answer_text, created_at")
      .eq("project_id", projectId)
      .eq("rating", "unhelpful")
      .gte("created_at", startDate.toISOString())
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Group by similar questions (simple grouping by exact match for now)
    // A more sophisticated approach would use embeddings/clustering
    const issueMap = new Map<
      string,
      {
        questionText: string;
        sampleAnswer: string;
        unhelpfulCount: number;
        lastOccurred: string;
      }
    >();

    for (const item of unhelpfulFeedback || []) {
      const key = item.question_text?.toLowerCase().trim() || "unknown";
      const existing = issueMap.get(key);

      if (existing) {
        existing.unhelpfulCount++;
        if (new Date(item.created_at) > new Date(existing.lastOccurred)) {
          existing.lastOccurred = item.created_at;
        }
      } else {
        issueMap.set(key, {
          questionText: item.question_text || "Unknown question",
          sampleAnswer: item.answer_text
            ? item.answer_text.length > 200
              ? item.answer_text.substring(0, 200) + "..."
              : item.answer_text
            : "No answer recorded",
          unhelpfulCount: 1,
          lastOccurred: item.created_at,
        });
      }
    }

    // Sort by unhelpful count and take top N
    const issues = Array.from(issueMap.values())
      .sort((a, b) => b.unhelpfulCount - a.unhelpfulCount)
      .slice(0, limit);

    res.json({
      issues,
      period,
      totalUnhelpful: unhelpfulFeedback?.length || 0,
    });
  } catch (error) {
    logger.error("Feedback issues error", error, { requestId: req.requestId });
    res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to get feedback issues",
      },
    });
  }
});

/**
 * GET /api/analytics/leads-summary
 *
 * Returns lead qualification metrics including counts, rates, and trends.
 *
 * Query params:
 * - projectId: string (required)
 * - period: '24h' | '7d' | '30d' (default: '30d')
 */
analyticsRouter.get("/leads-summary", async (req: Request, res: Response) => {
  try {
    const projectId = req.query.projectId as string;
    const period = (req.query.period as string) || "30d";
    const source = parseSourceFilter(req);

    if (!projectId) {
      return res.status(400).json({
        error: { code: "INVALID_INPUT", message: "projectId is required" },
      });
    }

    const periodDays = period === "24h" ? 1 : period === "7d" ? 7 : 30;
    const currentPeriodEnd = new Date();
    const currentPeriodStart = new Date(currentPeriodEnd);
    currentPeriodStart.setDate(currentPeriodStart.getDate() - periodDays);

    const previousPeriodEnd = new Date(currentPeriodStart);
    const previousPeriodStart = new Date(previousPeriodEnd);
    previousPeriodStart.setDate(previousPeriodStart.getDate() - periodDays);

    // When a source filter is active, scope leads to that source by inner-joining their
    // conversation and filtering on the conversation's `source` — NOT on the conversation's
    // created_at. The lead's own created_at defines the period; a lead captured today on an
    // older, resumed public conversation must still count. Leads with no conversation_id are
    // excluded under a source filter (a source-less lead can't be attributed to a source).
    // Typed as `string` (not a literal) so supabase-js doesn't try to compile-time-parse the
    // embedded-resource select and error on it.
    const leadSelect: string = source
      ? "qualification_status, conversations!inner(source)"
      : "qualification_status";
    type LeadStatusRow = { qualification_status: string };

    // Current period leads
    let currentLeadsQuery = supabaseAdmin
      .from("qualified_leads")
      .select(leadSelect)
      .eq("project_id", projectId)
      .gte("created_at", currentPeriodStart.toISOString());
    if (source)
      currentLeadsQuery = currentLeadsQuery.eq("conversations.source", source);
    const { data: currentLeads, error: currentError } =
      await currentLeadsQuery.returns<LeadStatusRow[]>();

    if (currentError) throw currentError;

    // Previous period leads
    let previousLeadsQuery = supabaseAdmin
      .from("qualified_leads")
      .select(leadSelect)
      .eq("project_id", projectId)
      .gte("created_at", previousPeriodStart.toISOString())
      .lt("created_at", previousPeriodEnd.toISOString());
    if (source)
      previousLeadsQuery = previousLeadsQuery.eq(
        "conversations.source",
        source
      );
    const { data: previousLeads, error: previousError } =
      await previousLeadsQuery.returns<LeadStatusRow[]>();

    if (previousError) throw previousError;

    // Current period conversations count
    let currentConvQuery = supabaseAdmin
      .from("conversations")
      .select("id", { count: "exact", head: true })
      .eq("project_id", projectId)
      .gte("created_at", currentPeriodStart.toISOString());
    if (source) currentConvQuery = currentConvQuery.eq("source", source);
    const { count: currentConversations } = await currentConvQuery;

    // Previous period conversations count
    let prevConvQuery = supabaseAdmin
      .from("conversations")
      .select("id", { count: "exact", head: true })
      .eq("project_id", projectId)
      .gte("created_at", previousPeriodStart.toISOString())
      .lt("created_at", previousPeriodEnd.toISOString());
    if (source) prevConvQuery = prevConvQuery.eq("source", source);
    const { count: previousConversations } = await prevConvQuery;

    // Voice calls, counted from the per-call summary messages session-end writes.
    //
    // Not from conversations: a conversation is hybrid text+voice and multi-call is the norm, not an
    // edge case (staging has single conversations with 27, 19 and 11 calls), so counting
    // conversations reports 19 where the truth is 79 — a 4x undercount. The retired boolean flag
    // was never written by the live application, so it could not serve as an analytics source.
    //
    // The summary message's created_at is when the call ended, which is also the period the call
    // belongs to — the conversation's created_at would misattribute today's call to the week the
    // thread started. Aggregate in Postgres: fetching rows to sum in JS is subject to the Data API
    // row cap and eventually undercounts successful projects.
    type VoiceMetricsRow = {
      voice_call_count: number | string | null;
      voice_talk_seconds: number | string | null;
    };
    const { data: voiceMetricsData, error: voiceError } = await supabaseAdmin
      .rpc("get_voice_metrics", {
        p_project_id: projectId,
        p_start: currentPeriodStart.toISOString(),
        p_end: currentPeriodEnd.toISOString(),
        p_source: source,
        p_conversation_id: null,
      })
      .single();
    // A silent read failure here would show a zero, which is exactly how the old metric hid.
    if (voiceError) throw voiceError;

    const voiceMetrics = voiceMetricsData as VoiceMetricsRow | null;
    const voiceCallCount = Number(voiceMetrics?.voice_call_count ?? 0);
    const voiceTalkSeconds = Number(voiceMetrics?.voice_talk_seconds ?? 0);

    // Calculate current metrics
    const totalLeads = currentLeads?.length || 0;
    const qualifiedCount =
      currentLeads?.filter((l) => l.qualification_status === "qualified")
        .length || 0;
    const notQualifiedCount =
      currentLeads?.filter((l) => l.qualification_status === "not_qualified")
        .length || 0;
    const terminalLeads = qualifiedCount + notQualifiedCount;
    const completionRate =
      totalLeads > 0 ? Math.round((terminalLeads / totalLeads) * 100) : 0;
    const qualificationRate =
      terminalLeads > 0
        ? Math.round((qualifiedCount / terminalLeads) * 100)
        : 0;
    const disqualificationRate =
      terminalLeads > 0
        ? Math.round((notQualifiedCount / terminalLeads) * 100)
        : 0;

    // Calculate previous metrics for trends
    const prevTotal = previousLeads?.length || 0;
    const prevQualified =
      previousLeads?.filter((l) => l.qualification_status === "qualified")
        .length || 0;

    const leadsChange =
      prevTotal > 0
        ? Math.round(((totalLeads - prevTotal) / prevTotal) * 100)
        : totalLeads > 0
          ? 100
          : 0;

    const qualifiedChange =
      prevQualified > 0
        ? Math.round(((qualifiedCount - prevQualified) / prevQualified) * 100)
        : qualifiedCount > 0
          ? 100
          : 0;

    const conversationsChange =
      (previousConversations || 0) > 0
        ? Math.round(
            (((currentConversations || 0) - (previousConversations || 0)) /
              (previousConversations || 1)) *
              100
          )
        : (currentConversations || 0) > 0
          ? 100
          : 0;

    res.json({
      totalConversations: currentConversations || 0,
      totalLeads,
      qualifiedCount,
      notQualifiedCount,
      completionRate,
      qualificationRate,
      disqualificationRate,
      voiceCallCount,
      voiceTalkSeconds,
      period,
      periodStart: currentPeriodStart.toISOString(),
      periodEnd: currentPeriodEnd.toISOString(),
      trends: {
        conversationsChange,
        leadsChange,
        qualifiedChange,
      },
    });
  } catch (error) {
    logger.error("Leads summary error", error, { requestId: req.requestId });
    res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Failed to get leads summary" },
    });
  }
});

/**
 * GET /api/analytics/timeline
 *
 * Returns daily message and conversation counts for charting.
 * Uses conversations and messages tables (single source of truth).
 *
 * Query params:
 * - projectId: string (required)
 * - days: number (default: 30, max: 90)
 */
analyticsRouter.get("/timeline", async (req: Request, res: Response) => {
  try {
    const projectId = req.query.projectId as string;
    const days = Math.min(parseInt(req.query.days as string) || 30, 90);
    const source = parseSourceFilter(req);

    if (!projectId) {
      return res.status(400).json({
        error: { code: "INVALID_INPUT", message: "projectId is required" },
      });
    }

    // Window of `days` days *including today*, computed in UTC. Bucket keys come from
    // `created_at.toISOString()` (UTC), so the window/loop must use UTC setters too — otherwise a
    // server in a non-UTC zone shifts local-midnight to a different UTC date key and today's
    // bucket is dropped (the chart ends "yesterday" while summary counts include today).
    const startDate = new Date();
    startDate.setUTCDate(startDate.getUTCDate() - (days - 1));
    startDate.setUTCHours(0, 0, 0, 0);

    // Get all conversations in the date range
    let timelineConvQuery = supabaseAdmin
      .from("conversations")
      .select("id, created_at")
      .eq("project_id", projectId)
      .gte("created_at", startDate.toISOString())
      .order("created_at", { ascending: true });
    if (source) timelineConvQuery = timelineConvQuery.eq("source", source);
    const { data: conversations, error: convError } = await timelineConvQuery;

    if (convError) throw convError;

    // Get all customer messages in the date range for these conversations
    const conversationIds = (conversations || []).map((c) => c.id);
    let messages: { conversation_id: string; created_at: string }[] = [];

    if (conversationIds.length > 0) {
      const { data: msgData, error: msgError } = await supabaseAdmin
        .from("messages")
        .select("conversation_id, created_at")
        .eq("sender_type", "customer")
        .in("conversation_id", conversationIds)
        .gte("created_at", startDate.toISOString())
        .order("created_at", { ascending: true });

      if (msgError) throw msgError;
      messages = msgData || [];
    }

    // Initialize timeline with all dates in range
    const timeline: Record<
      string,
      { messages: number; conversations: number }
    > = {};
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setUTCDate(date.getUTCDate() + i);
      const dateStr = date.toISOString().split("T")[0];
      timeline[dateStr] = { messages: 0, conversations: 0 };
    }

    // Aggregate conversations by date
    for (const conv of conversations || []) {
      const dateStr = new Date(conv.created_at).toISOString().split("T")[0];
      if (timeline[dateStr]) {
        timeline[dateStr].conversations++;
      }
    }

    // Aggregate messages by date
    for (const msg of messages) {
      const dateStr = new Date(msg.created_at).toISOString().split("T")[0];
      if (timeline[dateStr]) {
        timeline[dateStr].messages++;
      }
    }

    // Convert to array format for frontend
    const timelineArray = Object.entries(timeline).map(([date, data]) => ({
      date,
      messages: data.messages,
      conversations: data.conversations,
    }));

    res.json({
      timeline: timelineArray,
      days,
    });
  } catch (error) {
    logger.error("Timeline error", error, { requestId: req.requestId });
    res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Failed to get timeline" },
    });
  }
});

// ─── Conversation Insights (gap 1) ──────────────────────────────────────────────
// Read from conversation_insights, written nightly by the classifier. Aggregation lives in
// the unit-tested pure helpers in services/conversation-insights-core.ts. Rows are filtered by
// the insight's created_at, which — under steady nightly runs over the prior 24h — tracks the
// conversation date within a day.

const INSIGHT_COLUMNS = "topic, sentiment, resolved, answer_gap_question, created_at";

/** Fetch a project's insight rows within the last `days`. */
async function fetchInsightRows(
  projectId: string,
  days: number
): Promise<InsightRow[]> {
  const cutoff = new Date();
  cutoff.setUTCDate(cutoff.getUTCDate() - (days - 1));
  cutoff.setUTCHours(0, 0, 0, 0);

  const { data, error } = await supabaseAdmin
    .from("conversation_insights")
    .select(INSIGHT_COLUMNS)
    .eq("project_id", projectId)
    .gte("created_at", cutoff.toISOString());

  if (error) throw error;
  return (data as InsightRow[]) ?? [];
}

/**
 * GET /api/analytics/topics — ranked conversation topics with counts.
 * Query: projectId (required), days (default 30, max 90).
 */
analyticsRouter.get("/topics", async (req: Request, res: Response) => {
  try {
    const projectId = req.query.projectId as string;
    const days = Math.min(parseInt(req.query.days as string) || 30, 90);
    if (!projectId) {
      return res.status(400).json({
        error: { code: "INVALID_INPUT", message: "projectId is required" },
      });
    }

    const rows = await fetchInsightRows(projectId, days);
    res.json({ topics: aggregateTopics(rows), days });
  } catch (error) {
    logger.error("Topics insight error", error, { requestId: req.requestId });
    res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Failed to get topics" },
    });
  }
});

/**
 * GET /api/analytics/sentiment — sentiment totals + daily breakdown.
 * Query: projectId (required), days (default 30, max 90).
 */
analyticsRouter.get("/sentiment", async (req: Request, res: Response) => {
  try {
    const projectId = req.query.projectId as string;
    const days = Math.min(parseInt(req.query.days as string) || 30, 90);
    if (!projectId) {
      return res.status(400).json({
        error: { code: "INVALID_INPUT", message: "projectId is required" },
      });
    }

    const rows = await fetchInsightRows(projectId, days);
    res.json({ ...aggregateSentimentTimeline(rows, days), days });
  } catch (error) {
    logger.error("Sentiment insight error", error, { requestId: req.requestId });
    res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Failed to get sentiment" },
    });
  }
});

/**
 * GET /api/analytics/gaps — unanswered-question rollup (answer gaps).
 * Query: projectId (required), days (default 30, max 90), limit (default 10, max 50).
 */
analyticsRouter.get("/gaps", async (req: Request, res: Response) => {
  try {
    const projectId = req.query.projectId as string;
    const days = Math.min(parseInt(req.query.days as string) || 30, 90);
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
    if (!projectId) {
      return res.status(400).json({
        error: { code: "INVALID_INPUT", message: "projectId is required" },
      });
    }

    const rows = await fetchInsightRows(projectId, days);
    res.json({ gaps: aggregateGaps(rows, limit), days, limit });
  } catch (error) {
    logger.error("Gaps insight error", error, { requestId: req.requestId });
    res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Failed to get gaps" },
    });
  }
});
