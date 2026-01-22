/**
 * Analytics API Routes
 *
 * Provides analytics data for chatbot usage including:
 * - Message counts with trends (ANA-001)
 * - Top questions asked (ANA-002)
 * - Messages over time timeline (ANA-003)
 */

import { Router, Request, Response } from "express";
import { supabaseAdmin } from "../lib/supabase";
import { logger } from "../lib/logger";
import { getTopQuestions } from "../services/question-clustering";
import { authMiddleware } from "../middleware/auth";

export const analyticsRouter = Router();

// All analytics routes require authentication
analyticsRouter.use(authMiddleware);

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
    const { count: currentConversations, error: currentConvError } = await supabaseAdmin
      .from("conversations")
      .select("id", { count: "exact", head: true })
      .eq("project_id", projectId)
      .gte("created_at", currentPeriodStart.toISOString());

    if (currentConvError) throw currentConvError;

    // Get current period conversation IDs for message count
    const { data: currentConvIds } = await supabaseAdmin
      .from("conversations")
      .select("id")
      .eq("project_id", projectId)
      .gte("created_at", currentPeriodStart.toISOString());

    // Get current period user message count
    let currentMessages = 0;
    if (currentConvIds && currentConvIds.length > 0) {
      const { count: msgCount, error: msgError } = await supabaseAdmin
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("sender_type", "customer")
        .in("conversation_id", currentConvIds.map(c => c.id));

      if (msgError) throw msgError;
      currentMessages = msgCount || 0;
    }

    // Get previous period conversation count
    const { count: previousConversations, error: prevConvError } = await supabaseAdmin
      .from("conversations")
      .select("id", { count: "exact", head: true })
      .eq("project_id", projectId)
      .gte("created_at", previousPeriodStart.toISOString())
      .lt("created_at", previousPeriodEnd.toISOString());

    if (prevConvError) throw prevConvError;

    // Get previous period conversation IDs for message count
    const { data: prevConvIds } = await supabaseAdmin
      .from("conversations")
      .select("id")
      .eq("project_id", projectId)
      .gte("created_at", previousPeriodStart.toISOString())
      .lt("created_at", previousPeriodEnd.toISOString());

    // Get previous period user message count
    let previousMessages = 0;
    if (prevConvIds && prevConvIds.length > 0) {
      const { count: prevMsgCount, error: prevMsgError } = await supabaseAdmin
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("sender_type", "customer")
        .in("conversation_id", prevConvIds.map(c => c.id));

      if (prevMsgError) throw prevMsgError;
      previousMessages = prevMsgCount || 0;
    }

    // Calculate trend percentages
    const messagesChange = previousMessages > 0
      ? Math.round(((currentMessages - previousMessages) / previousMessages) * 100)
      : currentMessages > 0 ? 100 : 0;

    const conversationsChange = (previousConversations || 0) > 0
      ? Math.round((((currentConversations || 0) - (previousConversations || 0)) / (previousConversations || 1)) * 100)
      : (currentConversations || 0) > 0 ? 100 : 0;

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
    logger.error("Analytics summary error", error, { requestId: req.requestId });
    res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Failed to get analytics summary" },
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

    if (!projectId) {
      return res.status(400).json({
        error: { code: "INVALID_INPUT", message: "projectId is required" },
      });
    }

    const topQuestions = await getTopQuestions(projectId, days, limit);

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
analyticsRouter.get("/feedback/summary", async (req: Request, res: Response) => {
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
    previousPeriodStart.setDate(previousPeriodStart.getDate() - periodDays * 2);
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
    const { data: previousFeedback, error: previousError } = await supabaseAdmin
      .from("message_feedback")
      .select("rating")
      .eq("project_id", projectId)
      .gte("created_at", previousPeriodStart.toISOString())
      .lt("created_at", previousPeriodEnd.toISOString());

    if (previousError) throw previousError;

    // Calculate current period metrics
    const currentHelpful = currentFeedback?.filter(f => f.rating === "helpful").length || 0;
    const currentUnhelpful = currentFeedback?.filter(f => f.rating === "unhelpful").length || 0;
    const currentTotal = currentHelpful + currentUnhelpful;
    const currentSatisfaction = currentTotal > 0
      ? Math.round((currentHelpful / currentTotal) * 1000) / 10
      : 0;

    // Calculate previous period metrics
    const previousHelpful = previousFeedback?.filter(f => f.rating === "helpful").length || 0;
    const previousUnhelpful = previousFeedback?.filter(f => f.rating === "unhelpful").length || 0;
    const previousTotal = previousHelpful + previousUnhelpful;
    const previousSatisfaction = previousTotal > 0
      ? Math.round((previousHelpful / previousTotal) * 1000) / 10
      : 0;

    // Calculate trend percentages
    const helpfulChange = previousHelpful > 0
      ? Math.round(((currentHelpful - previousHelpful) / previousHelpful) * 100)
      : currentHelpful > 0 ? 100 : 0;

    const unhelpfulChange = previousUnhelpful > 0
      ? Math.round(((currentUnhelpful - previousUnhelpful) / previousUnhelpful) * 100)
      : currentUnhelpful > 0 ? 100 : 0;

    const satisfactionChange = previousSatisfaction > 0
      ? Math.round((currentSatisfaction - previousSatisfaction) * 10) / 10
      : currentSatisfaction > 0 ? currentSatisfaction : 0;

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
    logger.error("Feedback summary error", error, { requestId: req.requestId });
    res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Failed to get feedback summary" },
    });
  }
});

/**
 * GET /api/analytics/feedback/timeline
 *
 * Returns daily feedback counts for charting.
 *
 * Query params:
 * - projectId: string (required)
 * - days: number (default: 30, max: 90)
 */
analyticsRouter.get("/feedback/timeline", async (req: Request, res: Response) => {
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
    const timeline: Record<string, { helpful: number; unhelpful: number }> = {};
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
    logger.error("Feedback timeline error", error, { requestId: req.requestId });
    res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Failed to get feedback timeline" },
    });
  }
});

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
    const issueMap = new Map<string, {
      questionText: string;
      sampleAnswer: string;
      unhelpfulCount: number;
      lastOccurred: string;
    }>();

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
            ? (item.answer_text.length > 200
                ? item.answer_text.substring(0, 200) + "..."
                : item.answer_text)
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
      error: { code: "INTERNAL_ERROR", message: "Failed to get feedback issues" },
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

    if (!projectId) {
      return res.status(400).json({
        error: { code: "INVALID_INPUT", message: "projectId is required" },
      });
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    // Get all conversations in the date range
    const { data: conversations, error: convError } = await supabaseAdmin
      .from("conversations")
      .select("id, created_at")
      .eq("project_id", projectId)
      .gte("created_at", startDate.toISOString())
      .order("created_at", { ascending: true });

    if (convError) throw convError;

    // Get all customer messages in the date range for these conversations
    const conversationIds = (conversations || []).map(c => c.id);
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
    const timeline: Record<string, { messages: number; conversations: number }> = {};
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
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
