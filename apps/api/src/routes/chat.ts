/**
 * Chat API Routes
 *
 * Handles chat message processing with RAG and tool calling.
 * Public endpoint (no auth required) - uses rate limiting instead.
 */

import { Router, Request, Response } from "express";
import { chatRateLimiter, getRateLimitStatus } from "../middleware/rate-limit";
import {
  processChat,
  validateChatInput,
  ChatError,
} from "../services/chat-engine";
import { supabaseAdmin } from "../lib/supabase";

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
  chatRateLimiter,
  async (req: Request, res: Response) => {
    const startTime = Date.now();

    try {
      // Validate input
      const input = validateChatInput(req.body);

      // Process the chat message
      const result = await processChat(input);

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
      });
    } catch (error) {
      console.error("Chat error:", error);

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
    console.error("Get conversation error:", error);
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
    console.error("List conversations error:", error);
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
