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

    // Get current period stats
    const { data: currentSessions, error: currentError } = await supabaseAdmin
      .from("chat_sessions")
      .select("id, message_count, messages")
      .eq("project_id", projectId)
      .gte("created_at", currentPeriodStart.toISOString());

    if (currentError) throw currentError;

    // Get previous period stats for trend calculation
    const { data: previousSessions, error: previousError } = await supabaseAdmin
      .from("chat_sessions")
      .select("id, message_count, messages")
      .eq("project_id", projectId)
      .gte("created_at", previousPeriodStart.toISOString())
      .lt("created_at", previousPeriodEnd.toISOString());

    if (previousError) throw previousError;

    // Calculate metrics for current period
    const currentConversations = currentSessions?.length || 0;
    let currentMessages = 0;
    for (const session of currentSessions || []) {
      // Count actual user messages (not system/assistant messages)
      if (session.messages && Array.isArray(session.messages)) {
        currentMessages += session.messages.filter(
          (m: any) => m && m.role === "user"
        ).length;
      }
    }

    // Calculate metrics for previous period
    const previousConversations = previousSessions?.length || 0;
    let previousMessages = 0;
    for (const session of previousSessions || []) {
      if (session.messages && Array.isArray(session.messages)) {
        previousMessages += session.messages.filter(
          (m: any) => m && m.role === "user"
        ).length;
      }
    }

    // Calculate trend percentages
    const messagesChange = previousMessages > 0
      ? Math.round(((currentMessages - previousMessages) / previousMessages) * 100)
      : currentMessages > 0 ? 100 : 0;

    const conversationsChange = previousConversations > 0
      ? Math.round(((currentConversations - previousConversations) / previousConversations) * 100)
      : currentConversations > 0 ? 100 : 0;

    res.json({
      totalMessages: currentMessages,
      totalConversations: currentConversations,
      period,
      periodStart: currentPeriodStart.toISOString(),
      periodEnd: new Date().toISOString(),
      trends: {
        messagesChange,
        conversationsChange,
      },
    });
  } catch (error) {
    console.error("Analytics summary error:", error);
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
    console.error("Top questions error:", error);
    res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Failed to get top questions" },
    });
  }
});

/**
 * GET /api/analytics/timeline
 *
 * Returns daily message and conversation counts for charting.
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

    // Get all sessions in the date range
    const { data: sessions, error } = await supabaseAdmin
      .from("chat_sessions")
      .select("created_at, messages")
      .eq("project_id", projectId)
      .gte("created_at", startDate.toISOString())
      .order("created_at", { ascending: true });

    if (error) throw error;

    // Initialize timeline with all dates in range
    const timeline: Record<string, { messages: number; conversations: number }> = {};
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split("T")[0];
      timeline[dateStr] = { messages: 0, conversations: 0 };
    }

    // Aggregate data by date
    for (const session of sessions || []) {
      const dateStr = new Date(session.created_at).toISOString().split("T")[0];
      if (timeline[dateStr]) {
        timeline[dateStr].conversations++;
        // Count user messages
        if (session.messages && Array.isArray(session.messages)) {
          timeline[dateStr].messages += session.messages.filter(
            (m: any) => m && m.role === "user"
          ).length;
        }
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
    console.error("Timeline error:", error);
    res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Failed to get timeline" },
    });
  }
});
