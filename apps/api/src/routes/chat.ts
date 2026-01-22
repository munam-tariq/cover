/**
 * Chat API Routes
 *
 * Handles chat message processing with RAG and tool calling.
 * Public endpoint (no auth required) - uses rate limiting instead.
 */

import { Router, Request, Response } from "express";
import { chatRateLimiter, getRateLimitStatus } from "../middleware/rate-limit";
import { domainWhitelistMiddleware } from "../middleware/domain-whitelist";
import {
  processChat,
  validateChatInput,
  ChatError,
} from "../services/chat-engine";
import { supabaseAdmin } from "../lib/supabase";
import { getGeoFromIP } from "../services/ip-geo";
import { logger } from "../lib/logger";

export const chatRouter = Router();

/**
 * POST /api/chat/message
 *
 * Process a chat message and return AI response.
 * This is the main public endpoint called by the widget.
 *
 * Request body:
 * - projectId: string (required) - The chatbot project ID
 * - message: string (required) - User's message (max 2000 chars)
 * - visitorId: string (optional) - Unique visitor identifier
 * - sessionId: string (optional) - Existing session ID to continue
 * - conversationHistory: array (optional) - Previous messages for context
 *
 * Response:
 * - response: string - AI-generated response
 * - sessionId: string - Session ID for continuity
 * - sources: array - Knowledge sources used
 * - toolCalls: array - External API calls made
 * - processingTime: number - Total processing time in ms
 */
chatRouter.post(
  "/message",
  domainWhitelistMiddleware({ requireDomain: true, projectIdSource: 'body' }),
  chatRateLimiter,
  async (req: Request, res: Response) => {
    const startTime = Date.now();

    try {
      // Validate input
      const input = validateChatInput(req.body);

      // Capture IP address (handle proxies)
      const forwardedFor = req.headers["x-forwarded-for"];
      const ipAddress =
        typeof forwardedFor === "string"
          ? forwardedFor.split(",")[0].trim()
          : req.ip || "";

      // Get geolocation from IP (non-blocking - use cached or fetched)
      const geo = await getGeoFromIP(ipAddress);

      // Merge context from widget with server-side data
      const context = req.body.context || {};
      const fullContext = {
        ...context,
        ipAddress,
        country: geo?.country || context.country,
        city: geo?.city || context.city,
        countryCode: geo?.countryCode,
      };

      // Process the chat message with full context and request ID for tracing
      const result = await processChat({
        ...input,
        context: fullContext,
        requestId: req.requestId,
      });

      // Return successful response
      res.json({
        response: result.response,
        sessionId: result.sessionId,
        sources: result.sources,
        toolCalls: result.toolCalls.map((tc) => ({
          name: tc.name,
          success: tc.success,
          duration: tc.duration,
        })),
        processingTime: result.processingTime,
        requestId: result.requestId, // Include for client-side tracing
        // Include handoff info if triggered
        ...(result.handoff && {
          handoff: result.handoff,
        }),
      });
    } catch (error) {
      logger.error("Chat error", error, {
        requestId: req.requestId,
        projectId: req.body?.projectId,
      });

      if (error instanceof ChatError) {
        const statusMap: Record<string, number> = {
          INVALID_INPUT: 400,
          MESSAGE_TOO_LONG: 400,
          EMPTY_MESSAGE: 400,
          PROJECT_NOT_FOUND: 404,
          TIMEOUT: 504,
        };

        const status = statusMap[error.code] || 500;
        return res.status(status).json({
          error: {
            code: error.code,
            message: error.message,
          },
        });
      }

      res.status(500).json({
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to process message",
        },
      });
    }
  }
);

/**
 * GET /api/chat/conversations/:id
 *
 * Get a specific conversation/session by ID.
 * Requires project authentication.
 */
chatRouter.get("/conversations/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const projectId = req.query.projectId as string;

    if (!projectId) {
      return res.status(400).json({
        error: { code: "INVALID_INPUT", message: "projectId is required" },
      });
    }

    const { data: session, error } = await supabaseAdmin
      .from("chat_sessions")
      .select("*")
      .eq("id", id)
      .eq("project_id", projectId)
      .single();

    if (error || !session) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Conversation not found" },
      });
    }

    res.json({
      id: session.id,
      projectId: session.project_id,
      visitorId: session.visitor_id,
      messages: session.messages || [],
      messageCount: session.message_count || 0,
      createdAt: session.created_at,
      updatedAt: session.updated_at,
    });
  } catch (error) {
    logger.error("Get conversation error", error, { requestId: req.requestId });
    res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Failed to get conversation" },
    });
  }
});

/**
 * GET /api/chat/conversations
 *
 * List conversations for a project.
 * Used by conversation-history feature.
 */
chatRouter.get("/conversations", async (req: Request, res: Response) => {
  try {
    const projectId = req.query.projectId as string;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    if (!projectId) {
      return res.status(400).json({
        error: { code: "INVALID_INPUT", message: "projectId is required" },
      });
    }

    // Get conversations with pagination
    const { data: conversations, error } = await supabaseAdmin
      .from("chat_sessions")
      .select("id, visitor_id, message_count, created_at, updated_at")
      .eq("project_id", projectId)
      .order("updated_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw error;
    }

    // Get total count
    const { count } = await supabaseAdmin
      .from("chat_sessions")
      .select("*", { count: "exact", head: true })
      .eq("project_id", projectId);

    res.json({
      conversations: (conversations || []).map((c) => ({
        id: c.id,
        visitorId: c.visitor_id,
        messageCount: c.message_count || 0,
        createdAt: c.created_at,
        updatedAt: c.updated_at,
      })),
      total: count || 0,
      limit,
      offset,
    });
  } catch (error) {
    logger.error("List conversations error", error, { requestId: req.requestId });
    res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to list conversations",
      },
    });
  }
});

/**
 * GET /api/chat/rate-limit-status
 *
 * Get current rate limit status for a visitor.
 * Useful for UI to show remaining messages.
 */
chatRouter.get("/rate-limit-status", (req: Request, res: Response) => {
  const visitorId =
    (req.query.visitorId as string) ||
    (req.headers["x-visitor-id"] as string) ||
    req.ip ||
    "anonymous";

  const status = getRateLimitStatus(visitorId);

  res.json({
    visitorId,
    limits: {
      perMinute: {
        remaining: status.minute.remaining,
        resetsAt: new Date(status.minute.resetAt).toISOString(),
      },
      perHour: {
        remaining: status.hour.remaining,
        resetsAt: new Date(status.hour.resetAt).toISOString(),
      },
      perDay: {
        remaining: status.day.remaining,
        resetsAt: new Date(status.day.resetAt).toISOString(),
      },
    },
  });
});

/**
 * POST /api/chat/feedback
 *
 * Submit feedback (thumbs up/down) for an AI response.
 * Public endpoint called by the widget.
 *
 * Request body:
 * - messageId: string (optional) - The message ID if using new messages table
 * - conversationId: string (required) - The conversation ID
 * - projectId: string (required) - The project ID
 * - rating: 'helpful' | 'unhelpful' (required) - The feedback rating
 * - visitorId: string (required) - Visitor ID for deduplication
 * - questionText: string (optional) - The user's question that triggered the response
 * - answerText: string (optional) - The AI response being rated
 */
chatRouter.post(
  "/feedback",
  domainWhitelistMiddleware({ requireDomain: false, projectIdSource: 'body' }),
  async (req: Request, res: Response) => {
  try {
    const {
      messageId,
      conversationId,
      projectId,
      rating,
      visitorId,
      questionText,
      answerText,
    } = req.body;

    // Validate required fields
    if (!conversationId || !projectId || !rating || !visitorId) {
      return res.status(400).json({
        error: {
          code: "INVALID_INPUT",
          message: "conversationId, projectId, rating, and visitorId are required",
        },
      });
    }

    // Validate rating value
    if (!["helpful", "unhelpful"].includes(rating)) {
      return res.status(400).json({
        error: {
          code: "INVALID_INPUT",
          message: "rating must be 'helpful' or 'unhelpful'",
        },
      });
    }

    // Check if feedback already exists for this message/visitor
    let existingQuery = supabaseAdmin
      .from("message_feedback")
      .select("id, rating")
      .eq("visitor_id", visitorId)
      .eq("conversation_id", conversationId);

    // Match by message_id if provided, otherwise by answer_text
    if (messageId) {
      existingQuery = existingQuery.eq("message_id", messageId);
    } else if (answerText) {
      existingQuery = existingQuery.eq("answer_text", answerText);
    }

    const { data: existing } = await existingQuery.maybeSingle();

    let feedbackId: string;
    let updated = false;

    if (existing) {
      // Update existing feedback
      const { data: updatedFeedback, error: updateError } = await supabaseAdmin
        .from("message_feedback")
        .update({ rating })
        .eq("id", existing.id)
        .select("id")
        .single();

      if (updateError) {
        throw updateError;
      }

      feedbackId = updatedFeedback.id;
      updated = true;
    } else {
      // Insert new feedback
      const { data: newFeedback, error: insertError } = await supabaseAdmin
        .from("message_feedback")
        .insert({
          message_id: messageId || null,
          conversation_id: conversationId,
          project_id: projectId,
          rating,
          visitor_id: visitorId,
          question_text: questionText || null,
          answer_text: answerText || null,
        })
        .select("id")
        .single();

      if (insertError) {
        throw insertError;
      }

      feedbackId = newFeedback.id;
    }

    res.json({
      success: true,
      feedbackId,
      updated,
    });
  } catch (error) {
    logger.error("Feedback submission error", error, { requestId: req.requestId });
    res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to submit feedback",
      },
    });
  }
});

/**
 * GET /api/chat/feedback
 *
 * Get feedback submitted by a visitor for a conversation.
 * Used by widget to restore feedback state after page refresh.
 *
 * Query params:
 * - conversationId: string (required) - The conversation ID
 * - visitorId: string (required) - Visitor ID
 */
chatRouter.get("/feedback", async (req: Request, res: Response) => {
  try {
    const conversationId = req.query.conversationId as string;
    const visitorId = req.query.visitorId as string;

    if (!conversationId || !visitorId) {
      return res.status(400).json({
        error: {
          code: "INVALID_INPUT",
          message: "conversationId and visitorId are required",
        },
      });
    }

    // Get all feedback for this conversation by this visitor
    const { data: feedback, error } = await supabaseAdmin
      .from("message_feedback")
      .select("id, message_id, rating, answer_text")
      .eq("conversation_id", conversationId)
      .eq("visitor_id", visitorId);

    if (error) {
      throw error;
    }

    // Return feedback mapped by message_id or answer_text for easy lookup
    res.json({
      feedback: (feedback || []).map((f) => ({
        id: f.id,
        messageId: f.message_id,
        rating: f.rating,
        answerText: f.answer_text,
      })),
    });
  } catch (error) {
    logger.error("Get feedback error", error, { requestId: req.requestId });
    res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to get feedback",
      },
    });
  }
});

/**
 * GET /api/chat/health
 *
 * Health check for the chat service.
 */
chatRouter.get("/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    service: "chat-engine",
    timestamp: new Date().toISOString(),
  });
});
