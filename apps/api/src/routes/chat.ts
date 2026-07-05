/**
 * Chat API Routes
 *
 * Handles chat message processing with RAG and tool calling.
 * Public endpoint (no auth required) - uses rate limiting instead.
 */

import { Router, Request, Response } from "express";

import { logger } from "../lib/logger";
import { supabaseAdmin } from "../lib/supabase";
import { requirePublicWidgetAccess } from "../middleware/public-widget-gate";
import { chatRateLimiter, getRateLimitStatus } from "../middleware/rate-limit";
import {
  processChat,
  validateChatInput,
  ChatError,
  type ChatSource,
} from "../services/chat-engine";
import { getOrCreateConversation } from "../services/conversation";
import { getGeoFromIP } from "../services/ip-geo";
import {
  authorizeWidgetMessageContinuation,
  issueWidgetSessionToken,
} from "../services/widget-session-token";

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
  requirePublicWidgetAccess({ action: "chat-message" }),
  chatRateLimiter,
  async (req: Request, res: Response) => {
    try {
      // Validate input
      const input = validateChatInput(req.body);
      if (input.source === "whatsapp") {
        return res.status(400).json({
          error: {
            code: "INVALID_SOURCE",
            message: "WhatsApp messages must enter through the WhatsApp webhook.",
          },
        });
      }

      // If the supplied id already exists, require a token binding this caller
      // to that conversation. A caller-generated id that does not exist yet is
      // allowed so public "New chat" can create its explicit fresh thread.
      if (input.sessionId) {
        const token = req.headers["x-frontface-session"];
        const raw = typeof token === "string" ? token : Array.isArray(token) ? token[0] : undefined;

        const { data: existingConversation, error: lookupError } = await supabaseAdmin
          .from("conversations")
          .select("id")
          .eq("id", input.sessionId)
          .maybeSingle();

        if (lookupError) {
          if (process.env.WIDGET_GATE_ENFORCE === "true") {
            res.status(503).json({
              error: {
                code: "SESSION_LOOKUP_FAILED",
                message: "Could not verify conversation session",
              },
            });
            return;
          }
          logger.warn("[ChatMessage:monitor] session lookup failed", {
            sessionId: input.sessionId,
            projectId: input.projectId,
            error: lookupError.message,
          });
        }

        const auth = authorizeWidgetMessageContinuation({
          projectId: input.projectId,
          visitorId: input.visitorId,
          sessionId: input.sessionId,
          conversationExists: Boolean(existingConversation),
          sessionToken: raw,
        });

        if (!auth.ok) {
          if (process.env.WIDGET_GATE_ENFORCE === "true") {
            res.status(403).json({
              error: { code: auth.denyReason, message: "Valid session token required to continue a conversation" },
            });
            return;
          }
          logger.warn(`[ChatMessage:monitor] would-deny session check: ${auth.denyReason}`, {
            sessionId: input.sessionId,
            projectId: input.projectId,
          });
        }
      }

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
        sessionToken: issueWidgetSessionToken({
          projectId: input.projectId,
          visitorId: input.visitorId,
          conversationId: result.sessionId,
        }),
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

// Removed (2026-06-26 security hardening): legacy public `GET /conversations` and
// `GET /conversations/:id`. They were unauthenticated, service-role-backed reads keyed
// only on projectId — IDOR over chat history — with no caller in the widget/web/mobile
// clients. Authenticated dashboard conversation access lives in routes/conversations.ts.

/**
 * GET /api/chat/rate-limit-status
 *
 * Get current rate limit status for a visitor.
 * Useful for UI to show remaining messages.
 */
chatRouter.get("/rate-limit-status", async (req: Request, res: Response) => {
  const visitorId =
    (req.query.visitorId as string) ||
    (req.headers["x-visitor-id"] as string) ||
    req.ip ||
    "anonymous";

  const status = await getRateLimitStatus(visitorId);

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
  requirePublicWidgetAccess({ action: "feedback", projectIdSource: "body" }),
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
            message:
              "conversationId, projectId, rating, and visitorId are required",
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
        const { data: updatedFeedback, error: updateError } =
          await supabaseAdmin
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
      logger.error("Feedback submission error", error, {
        requestId: req.requestId,
      });
      res.status(500).json({
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to submit feedback",
        },
      });
    }
  }
);

/**
 * GET /api/chat/feedback
 *
 * Get feedback submitted by a visitor for a conversation.
 * Used by widget to restore feedback state after page refresh.
 *
 * Query params:
 * - projectId: string (required) - The project ID (used by the widget gate)
 * - conversationId: string (required) - The conversation ID
 * - visitorId: string (required) - Visitor ID
 */
chatRouter.get(
  "/feedback",
  requirePublicWidgetAccess({ action: "feedback-read", projectIdSource: "query" }),
  async (req: Request, res: Response) => {
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
 * POST /api/chat/ensure-conversation
 *
 * Creates a conversation if one doesn't exist for this visitor.
 * Used by the widget before starting a voice call when no text messages
 * have been sent yet, to avoid orphaned voice conversations.
 *
 * Request body:
 * - projectId: string (required)
 * - visitorId: string (required)
 * - source: ChatSource (optional, defaults to "widget")
 *
 * Response:
 * - conversationId: string
 */
chatRouter.post(
  "/ensure-conversation",
  requirePublicWidgetAccess({ action: "ensure-conversation", projectIdSource: "body" }),
  async (req: Request, res: Response) => {
  try {
    const { projectId, visitorId, source } = req.body;

    if (!projectId || !visitorId) {
      return res.status(400).json({
        error: {
          code: "INVALID_INPUT",
          message: "projectId and visitorId are required",
        },
      });
    }

    const validSources: ChatSource[] = [
      "widget",
      "playground",
      "mcp",
      "api",
      "voice",
      "public",
      "mobile",
    ];
    if (source === "whatsapp") {
      return res.status(400).json({
        error: {
          code: "INVALID_SOURCE",
          message: "WhatsApp conversations are created by the WhatsApp webhook.",
        },
      });
    }

    const conversationSource: ChatSource = validSources.includes(
      source as ChatSource
    )
      ? (source as ChatSource)
      : "widget";

    const conversationId = await getOrCreateConversation(
      projectId,
      visitorId,
      undefined,
      conversationSource
    );

    res.json({
      conversationId,
      sessionToken: issueWidgetSessionToken({
        projectId,
        visitorId,
        conversationId,
      }),
    });
  } catch (error) {
    logger.error("Ensure conversation error", error, {
      requestId: req.requestId,
    });
    res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to ensure conversation",
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
