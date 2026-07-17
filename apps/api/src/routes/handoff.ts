/**
 * Handoff API Routes
 *
 * Handles handoff operations for conversations:
 * - POST /api/conversations/:id/handoff - Trigger handoff
 * - POST /api/conversations/:id/claim - Agent claims conversation
 * - POST /api/conversations/:id/transfer - Transfer to queue
 * - POST /api/conversations/:id/resolve - Mark resolved
 * - GET /api/projects/:id/handoff-availability - Check availability (widget)
 */

import { Router, Request, Response } from "express";
import { z } from "zod";

import { posthog } from "../lib/posthog";
import { supabaseAdmin } from "../lib/supabase";
import { authMiddleware, AuthenticatedRequest } from "../middleware/auth";
import { requirePublicWidgetAccess } from "../middleware/public-widget-gate";
import { requireWidgetSession } from "../middleware/require-widget-session";
import {
  claimConversation,
  isQueueableClaimResult,
  transitionAgentConversation,
} from "../services/agent-capacity";
import {
  broadcastConversationAssigned,
  broadcastConversationStatusChanged,
  broadcastConversationTransferred,
  broadcastConversationResolved,
  broadcastAgentClaimed,
  broadcastQueuePositions,
  broadcastNewMessage,
} from "../services/realtime";

const router = Router();

// ============================================================================
// Validation Schemas
// ============================================================================

const TriggerHandoffSchema = z.object({
  // customer_request excluded: no client has ever sent it (the "talk to a human" button hardcodes
  // button_click), so accepting it would write data the inbox filter can never surface.
  reason: z.enum(["low_confidence", "keyword", "button_click"]),
  confidence: z.number().min(0).max(1).optional(),
  triggerKeyword: z.string().max(50).optional(),
  customerEmail: z.string().email().optional(),
  customerName: z.string().max(100).optional(),
});

const ResolveSchema = z.object({
  resolution: z.enum(["resolved", "closed"]).default("resolved"),
  returnToAI: z.boolean().default(false),
});

const InboxSummaryQuerySchema = z.object({
  resolvedSince: z.string().datetime({ offset: true }).optional(),
});

// ============================================================================
// Helpers
// ============================================================================

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUUID(id: string): boolean {
  return UUID_REGEX.test(id);
}

/**
 * Check if we're within business hours
 */
function isWithinBusinessHours(settings: {
  business_hours_enabled: boolean;
  timezone: string;
  business_hours: Record<string, unknown>;
}): boolean {
  if (!settings.business_hours_enabled) {
    return true; // Business hours not enabled, always available
  }

  try {
    // Get current time in the configured timezone
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: settings.timezone,
      weekday: "long",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    const parts = formatter.formatToParts(now);
    const weekday = parts
      .find((p) => p.type === "weekday")
      ?.value?.toLowerCase();
    const hour = parseInt(parts.find((p) => p.type === "hour")?.value || "0");
    const minute = parseInt(
      parts.find((p) => p.type === "minute")?.value || "0"
    );

    if (!weekday) return false;

    const dayConfig = (
      settings.business_hours as Record<
        string,
        { start: string; end: string; enabled: boolean }
      >
    )[weekday];

    if (!dayConfig || !dayConfig.enabled) {
      return false;
    }

    const [startHour, startMinute] = dayConfig.start.split(":").map(Number);
    const [endHour, endMinute] = dayConfig.end.split(":").map(Number);

    const currentMinutes = hour * 60 + minute;
    const startMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;

    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  } catch {
    return true; // On error, assume available
  }
}

/**
 * Format queue message with placeholders
 */
function formatQueueMessage(template: string, position: number): string {
  return template
    .replace(/\{position\}/gi, String(position))
    .replace(/\{queue_position\}/gi, String(position));
}

/**
 * Format agent joined message with placeholders
 */
function formatAgentJoinedMessage(template: string, agentName: string): string {
  return template
    .replace(/\{agent_name\}/gi, agentName)
    .replace(/\{agentName\}/gi, agentName);
}

/**
 * Get the best available agent using balanced assignment
 */
async function getAvailableAgent(projectId: string): Promise<string | null> {
  // Get all online agents with capacity
  const { data: agents } = await supabaseAdmin
    .from("agent_availability")
    .select(
      "user_id, current_chat_count, max_concurrent_chats, last_assigned_at"
    )
    .eq("project_id", projectId)
    .eq("status", "online")
    .order("current_chat_count", { ascending: true })
    .order("last_assigned_at", { ascending: true, nullsFirst: true });

  // Find agent with capacity
  const availableAgent = (agents || []).find(
    (a) => a.current_chat_count < a.max_concurrent_chats
  );

  return availableAgent?.user_id || null;
}

/**
 * Calculate queue position for a conversation
 */
async function calculateQueuePosition(
  projectId: string,
  queueEnteredAt: string
): Promise<number> {
  const { count } = await supabaseAdmin
    .from("conversations")
    .select("*", { count: "exact", head: true })
    .eq("project_id", projectId)
    .eq("status", "waiting")
    .lt("queue_entered_at", queueEnteredAt);

  return (count || 0) + 1;
}

// ============================================================================
// Routes
// ============================================================================

/**
 * GET /api/projects/:id/handoff-availability
 * Check if handoff is available (for widget)
 * No auth required - public endpoint
 */
router.get(
  "/projects/:id/handoff-availability",
  requirePublicWidgetAccess({
    action: "handoff-availability",
    projectIdSource: "params",
    projectIdParam: "id",
  }),
  async (req: Request, res: Response) => {
    try {
      const { id: projectId } = req.params;

      if (!isValidUUID(projectId)) {
        return res.status(400).json({
          error: { code: "INVALID_ID", message: "Invalid project ID format" },
        });
      }

      // Get project and handoff settings
      const { data: project } = await supabaseAdmin
        .from("projects")
        .select("id")
        .eq("id", projectId)
        .is("deleted_at", null)
        .single();

      if (!project) {
        return res.status(404).json({
          error: { code: "NOT_FOUND", message: "Project not found" },
        });
      }

      // Get handoff settings
      const { data: settings } = await supabaseAdmin
        .from("handoff_settings")
        .select("*")
        .eq("project_id", projectId)
        .single();

      // If no settings or handoff not enabled
      if (!settings || !settings.enabled) {
        return res.json({
          available: false,
          showButton: false,
          showOfflineForm: false,
          reason: "handoff_disabled",
        });
      }

      // Check if any agents exist
      const { count: agentCount } = await supabaseAdmin
        .from("project_members")
        .select("*", { count: "exact", head: true })
        .eq("project_id", projectId)
        .eq("status", "active");

      // Also check if owner has set themselves as available
      const { data: ownerAvailability } = await supabaseAdmin
        .from("agent_availability")
        .select("id")
        .eq("project_id", projectId)
        .eq("status", "online")
        .single();

      const hasAgents = (agentCount || 0) > 0 || !!ownerAvailability;

      if (!hasAgents) {
        return res.json({
          available: false,
          showButton: false,
          showOfflineForm: false,
          reason: "no_agents",
        });
      }

      // Check business hours
      const withinHours = isWithinBusinessHours(settings);

      if (!withinHours) {
        return res.json({
          available: false,
          showButton: false,
          showOfflineForm: true,
          reason: "outside_business_hours",
          businessHours: {
            timezone: settings.timezone,
            hours: settings.business_hours,
          },
        });
      }

      // Check if any agent is online
      const { count: onlineCount } = await supabaseAdmin
        .from("agent_availability")
        .select("*", { count: "exact", head: true })
        .eq("project_id", projectId)
        .eq("status", "online");

      if ((onlineCount || 0) === 0) {
        return res.json({
          available: false,
          showButton: false,
          showOfflineForm: settings.business_hours_enabled,
          reason: "no_agents_online",
        });
      }

      // Handoff is available
      // Only show button if trigger_mode allows manual trigger (manual or both)
      const showButton =
        settings.show_human_button &&
        (settings.trigger_mode === "manual" ||
          settings.trigger_mode === "both");

      return res.json({
        available: true,
        showButton,
        buttonText: settings.button_text || "Talk to a human",
        showOfflineForm: false,
        triggerMode: settings.trigger_mode,
        autoTriggers: settings.auto_triggers,
      });
    } catch (error) {
      console.error("Error in GET /projects/:id/handoff-availability:", error);
      res.status(500).json({
        error: { code: "INTERNAL_ERROR", message: "Internal server error" },
      });
    }
  }
);

/**
 * POST /api/conversations/:id/handoff
 * Trigger handoff for a conversation (widget / hosted public page only).
 * Gated by requireWidgetSession — callers must present X-FrontFace-Session.
 */
router.post(
  "/conversations/:id/handoff",
  requireWidgetSession(),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      if (!isValidUUID(id)) {
        return res.status(400).json({
          error: {
            code: "INVALID_ID",
            message: "Invalid conversation ID format",
          },
        });
      }

      // Validate body
      const validation = TriggerHandoffSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid request body",
            details: validation.error.flatten().fieldErrors,
          },
        });
      }

      const {
        reason,
        confidence,
        triggerKeyword,
        customerEmail,
        customerName,
      } = validation.data;

      const { data: conversation, error: convError } = await supabaseAdmin
        .from("conversations")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (convError) {
        console.error("Error fetching conversation:", convError);
        return res.status(500).json({
          error: {
            code: "FETCH_ERROR",
            message: "Failed to fetch conversation",
          },
        });
      }

      if (!conversation) {
        return res.status(404).json({
          error: { code: "NOT_FOUND", message: "Conversation not found" },
        });
      }

      // Check if conversation is in a valid state for handoff
      // Allow handoff from: ai_active (normal), resolved (customer came back)
      const allowedStatesForHandoff = ["ai_active", "resolved"];
      if (!allowedStatesForHandoff.includes(conversation.status)) {
        return res.status(400).json({
          error: {
            code: "INVALID_STATUS",
            message: "Conversation cannot be handed off in current state",
            currentStatus: conversation.status,
          },
        });
      }

      // Check handoff availability
      const { data: settings } = await supabaseAdmin
        .from("handoff_settings")
        .select("*")
        .eq("project_id", conversation.project_id)
        .single();

      if (!settings || !settings.enabled) {
        return res.status(400).json({
          error: {
            code: "HANDOFF_DISABLED",
            message: "Human handoff is not enabled",
          },
        });
      }

      // Check business hours
      const withinHours = isWithinBusinessHours(settings);
      if (!withinHours) {
        return res.json({
          status: "offline",
          message: "Our team is currently offline",
          showOfflineForm: true,
          businessHours: {
            timezone: settings.timezone,
            hours: settings.business_hours,
          },
        });
      }

      // Try to find an available agent
      const availableAgentId = await getAvailableAgent(conversation.project_id);
      const now = new Date().toISOString();

      // Track the handoff request once, for both outcomes (assigned vs queued).
      // Widget visitors aren't PostHog clients, so key on the conversation's
      // visitor id, falling back to the conversation id.
      posthog?.capture({
        distinctId: conversation.visitor_id ?? id,
        event: "human_handoff_requested",
        properties: {
          project_id: conversation.project_id,
          conversation_id: id,
          reason,
          source: conversation.source,
          agent_available: Boolean(availableAgentId),
        },
      });

      // Update customer info if provided
      const customerUpdates: Record<string, unknown> = {};
      if (customerEmail) customerUpdates.customer_email = customerEmail;
      if (customerName) customerUpdates.customer_name = customerName;

      if (availableAgentId) {
        // Direct assignment - agent available.
        //
        // Assignment, the handoff metadata and the capacity increment commit together. The previous
        // shape passed an unevaluated supabaseAdmin.rpc() builder in the PATCH body: PostgREST
        // rejected it as invalid input for an integer, so the whole update failed silently (including
        // its last_assigned_at write) and a "workaround" read-modify-write incremented instead —
        // unchecked, unlocked, and the source of the count drift.
        const claimResult = await claimConversation({
          conversationId: id,
          userId: availableAgentId,
          projectId: conversation.project_id,
          handoffReason: reason,
          aiConfidence: confidence,
          triggerKeyword,
          customerEmail,
          customerName,
        });

        if (claimResult !== "CLAIMED") {
          // AT_CAPACITY/NOT_ONLINE are reachable despite findAvailableAgent having just checked both:
          // the agent can fill up between that read and this lock. Queueing is the expected fallback,
          // while structural failures still surface instead of silently losing the handoff.
          if (!isQueueableClaimResult(claimResult)) {
            console.error("Error assigning conversation:", claimResult);
            return res.status(500).json({
              error: {
                code: "UPDATE_ERROR",
                message: "Failed to trigger handoff",
              },
            });
          }
        } else {
          // Get agent info - first check project_members.name, then fall back to auth.users
          const { data: memberRecord } = await supabaseAdmin
            .from("project_members")
            .select("name")
            .eq("project_id", conversation.project_id)
            .eq("user_id", availableAgentId)
            .eq("status", "active")
            .single();

          const { data: agentUser } =
            await supabaseAdmin.auth.admin.getUserById(availableAgentId);
          const agentName =
            memberRecord?.name ||
            agentUser?.user?.user_metadata?.name ||
            agentUser?.user?.email ||
            "Support Agent";

          // Format agent joined message using settings or default
          const agentJoinedTemplate =
            settings.agent_joined_message ||
            "You're now connected with {agent_name}.";
          const agentJoinedContent = formatAgentJoinedMessage(
            agentJoinedTemplate,
            agentName
          );

          // Add system message and broadcast it
          const { data: systemMsg } = await supabaseAdmin
            .from("messages")
            .insert({
              conversation_id: id,
              sender_type: "system",
              content: agentJoinedContent,
              metadata: {
                event: "handoff_completed",
                agent_id: availableAgentId,
              },
            })
            .select("id, created_at")
            .single();

          // Broadcast the system message so widget receives it (fire-and-forget)
          if (systemMsg) {
            broadcastNewMessage(id, {
              id: systemMsg.id,
              senderType: "system",
              content: agentJoinedContent,
              createdAt: systemMsg.created_at,
              metadata: {
                event: "handoff_completed",
                agent_id: availableAgentId,
              },
            }).catch((err) =>
              console.error("[Realtime] Broadcast system message error:", err)
            );
          }

          // Broadcast assignment to real-time channels (fire-and-forget)
          broadcastConversationAssigned(
            id,
            conversation.project_id,
            availableAgentId,
            {
              name: agentName,
              email: agentUser?.user?.email,
            }
          ).catch((err) => console.error("[Realtime] Broadcast error:", err));

          return res.json({
            status: "agent_active",
            assignedAgent: {
              id: availableAgentId,
              name: agentName,
            },
          });
        }
      }

      // No agent available (or the selected agent filled up before the locked claim) - add to queue
      const { error: updateError } = await supabaseAdmin
        .from("conversations")
        .update({
          status: "waiting",
          assigned_agent_id: null,
          claimed_at: null,
          resolved_at: null,
          handoff_reason: reason,
          handoff_triggered_at: now,
          ai_confidence_at_handoff: confidence,
          trigger_keyword: triggerKeyword,
          queue_entered_at: now,
          ...customerUpdates,
        })
        .eq("id", id);

      if (updateError) {
        console.error("Error updating conversation:", updateError);
        return res.status(500).json({
          error: { code: "UPDATE_ERROR", message: "Failed to trigger handoff" },
        });
      }

      // Calculate queue position
      const queuePosition = await calculateQueuePosition(
        conversation.project_id,
        now
      );

      // Format queue message using settings or default
      const queueMessageTemplate =
        settings.queue_message ||
        "Please wait while we connect you with an agent. You are number {position} in the queue.";
      const queueMessageContent = formatQueueMessage(
        queueMessageTemplate,
        queuePosition
      );

      // Add system message
      await supabaseAdmin.from("messages").insert({
        conversation_id: id,
        sender_type: "system",
        content: queueMessageContent,
        metadata: { event: "handoff_queued", queue_position: queuePosition },
      });

      // Broadcast status change and queue update (fire-and-forget)
      broadcastConversationStatusChanged(
        id,
        conversation.project_id,
        "waiting",
        { queuePosition }
      ).catch((err) => console.error("[Realtime] Broadcast error:", err));

      // Update queue positions for all waiting conversations
      broadcastQueuePositions(conversation.project_id, [
        { conversationId: id, position: queuePosition },
      ]).catch((err) => console.error("[Realtime] Broadcast error:", err));

      return res.json({
        status: "waiting",
        queuePosition,
        estimatedWaitMinutes: queuePosition * 2, // Rough estimate
      });
    } catch (error) {
      console.error("Error in POST /conversations/:id/handoff:", error);
      res.status(500).json({
        error: { code: "INTERNAL_ERROR", message: "Internal server error" },
      });
    }
  }
);

/**
 * POST /api/conversations/:id/claim
 * Agent claims a waiting conversation
 */
router.post(
  "/conversations/:id/claim",
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const { userId } = req as AuthenticatedRequest;
      const { id } = req.params;

      if (!userId) {
        return res.status(401).json({
          error: { code: "UNAUTHORIZED", message: "User not authenticated" },
        });
      }

      if (!isValidUUID(id)) {
        return res.status(400).json({
          error: {
            code: "INVALID_ID",
            message: "Invalid conversation ID format",
          },
        });
      }

      // Get conversation with lock to prevent race conditions
      // Note: In production, use FOR UPDATE SKIP LOCKED in a transaction
      const { data: conversation, error: convError } = await supabaseAdmin
        .from("conversations")
        .select("*")
        .eq("id", id)
        .eq("status", "waiting")
        .is("assigned_agent_id", null)
        .single();

      if (convError || !conversation) {
        // Check if it was already claimed
        const { data: claimed } = await supabaseAdmin
          .from("conversations")
          .select("assigned_agent_id, status")
          .eq("id", id)
          .single();

        if (claimed?.assigned_agent_id) {
          return res.status(409).json({
            success: false,
            error: {
              code: "ALREADY_CLAIMED",
              message: "This conversation was claimed by another agent",
            },
          });
        }

        return res.status(404).json({
          error: {
            code: "NOT_FOUND",
            message: "Conversation not found or not in queue",
          },
        });
      }

      // Verify user has access to the project
      const { data: project } = await supabaseAdmin
        .from("projects")
        .select("id, user_id")
        .eq("id", conversation.project_id)
        .single();

      const isOwner = project?.user_id === userId;

      if (!isOwner) {
        const { data: membership } = await supabaseAdmin
          .from("project_members")
          .select("id")
          .eq("project_id", conversation.project_id)
          .eq("user_id", userId)
          .eq("status", "active")
          .single();

        if (!membership) {
          return res.status(403).json({
            error: { code: "FORBIDDEN", message: "Access denied" },
          });
        }
      }

      // Capacity check, assignment and count increment are ONE transaction. Read-then-write here was
      // a check-then-act race: at 4/5, two concurrent claims both passed the capacity read, both
      // conversations became agent_active, and the second increment either violated
      // agent_availability_check or left six real chats against a stored five.
      const claimResult = await claimConversation({
        conversationId: id,
        userId,
        projectId: conversation.project_id,
      });

      switch (claimResult) {
        case "CLAIMED":
          break;
        case "NO_AVAILABILITY_ROW":
        case "NOT_ONLINE":
          return res.status(400).json({
            error: {
              code: "NOT_ONLINE",
              message: "You must be online to claim conversations",
            },
          });
        case "AT_CAPACITY":
          return res.status(400).json({
            error: {
              code: "AT_CAPACITY",
              message: "You are at maximum chat capacity",
            },
          });
        case "NOT_FOUND":
          return res.status(404).json({
            error: { code: "NOT_FOUND", message: "Conversation not found" },
          });
        default:
          return res.status(409).json({
            success: false,
            error: {
              code: "CLAIM_FAILED",
              message:
                "Failed to claim conversation - it may have been claimed by another agent",
            },
          });
      }

      const { data: updated } = await supabaseAdmin
        .from("conversations")
        .select("*")
        .eq("id", id)
        .single();

      // Get handoff settings for custom messages
      const { data: settings } = await supabaseAdmin
        .from("handoff_settings")
        .select("agent_joined_message")
        .eq("project_id", conversation.project_id)
        .single();

      // Get agent info - first check project_members.name, then fall back to auth.users
      const { data: memberRecord } = await supabaseAdmin
        .from("project_members")
        .select("name")
        .eq("project_id", conversation.project_id)
        .eq("user_id", userId)
        .eq("status", "active")
        .single();

      const { data: agentUser } =
        await supabaseAdmin.auth.admin.getUserById(userId);
      const agentName =
        memberRecord?.name ||
        agentUser?.user?.user_metadata?.name ||
        "An agent";

      // Format agent joined message using settings or default
      const agentJoinedTemplate =
        settings?.agent_joined_message ||
        "You're now connected with {agent_name}.";
      const agentJoinedContent = formatAgentJoinedMessage(
        agentJoinedTemplate,
        agentName
      );

      const { data: systemMsg } = await supabaseAdmin
        .from("messages")
        .insert({
          conversation_id: id,
          sender_type: "system",
          content: agentJoinedContent,
          metadata: { event: "agent_joined", agent_id: userId },
        })
        .select("id, created_at")
        .single();

      // Broadcast the system message so widget receives it (fire-and-forget)
      if (systemMsg) {
        broadcastNewMessage(id, {
          id: systemMsg.id,
          senderType: "system",
          content: agentJoinedContent,
          createdAt: systemMsg.created_at,
          metadata: { event: "agent_joined", agent_id: userId },
        }).catch((err) =>
          console.error("[Realtime] Broadcast system message error:", err)
        );
      }

      // Broadcast to conversation and queue channels (fire-and-forget)
      if (userId) {
        broadcastAgentClaimed(conversation.project_id, userId, id).catch(
          (err) => console.error("[Realtime] Broadcast error:", err)
        );

        broadcastConversationAssigned(id, conversation.project_id, userId, {
          name: agentName,
          email: agentUser?.user?.email,
        }).catch((err) => console.error("[Realtime] Broadcast error:", err));
      }

      res.json({
        success: true,
        conversation: {
          id: updated.id,
          status: updated.status,
          assignedAgentId: updated.assigned_agent_id,
          claimedAt: updated.claimed_at,
        },
      });
    } catch (error) {
      console.error("Error in POST /conversations/:id/claim:", error);
      res.status(500).json({
        error: { code: "INTERNAL_ERROR", message: "Internal server error" },
      });
    }
  }
);

/**
 * POST /api/conversations/:id/transfer
 * Transfer conversation back to queue
 */
router.post(
  "/conversations/:id/transfer",
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const { userId } = req as AuthenticatedRequest;
      const { id } = req.params;

      if (!isValidUUID(id)) {
        return res.status(400).json({
          error: {
            code: "INVALID_ID",
            message: "Invalid conversation ID format",
          },
        });
      }

      // Get conversation
      const { data: conversation, error: convError } = await supabaseAdmin
        .from("conversations")
        .select("*")
        .eq("id", id)
        .single();

      if (convError || !conversation) {
        return res.status(404).json({
          error: { code: "NOT_FOUND", message: "Conversation not found" },
        });
      }

      // Verify user is the assigned agent or has access
      const { data: project } = await supabaseAdmin
        .from("projects")
        .select("id, user_id")
        .eq("id", conversation.project_id)
        .single();

      const isOwner = project?.user_id === userId;
      const isAssigned = conversation.assigned_agent_id === userId;

      if (!isOwner && !isAssigned) {
        return res.status(403).json({
          error: {
            code: "FORBIDDEN",
            message: "You cannot transfer this conversation",
          },
        });
      }

      if (conversation.status !== "agent_active") {
        return res.status(400).json({
          error: {
            code: "INVALID_STATUS",
            message: "Conversation is not in agent_active status",
          },
        });
      }

      const transitionResult = await transitionAgentConversation({
        conversationId: id,
        projectId: conversation.project_id,
        nextStatus: "waiting",
      });
      if (transitionResult !== "TRANSITIONED") {
        return res.status(409).json({
          error: {
            code: "TRANSITION_FAILED",
            message: `Conversation could not be transferred (${transitionResult})`,
          },
        });
      }

      const { data: updated, error: updateError } = await supabaseAdmin
        .from("conversations")
        .select("*")
        .eq("id", id)
        .single();
      if (updateError || !updated)
        throw updateError ?? new Error("Missing conversation");

      // Calculate queue position
      const queuePosition = await calculateQueuePosition(
        conversation.project_id,
        updated.queue_entered_at
      );

      // Add system message
      await supabaseAdmin.from("messages").insert({
        conversation_id: id,
        sender_type: "system",
        content: `The conversation has been transferred to another agent. Queue position: ${queuePosition}`,
        metadata: {
          event: "transferred_to_queue",
          queue_position: queuePosition,
        },
      });

      // Broadcast transfer to channels (fire-and-forget)
      broadcastConversationTransferred(
        id,
        conversation.project_id,
        queuePosition
      ).catch((err) => console.error("[Realtime] Broadcast error:", err));

      res.json({
        success: true,
        conversation: {
          id: updated.id,
          status: updated.status,
          queuePosition,
        },
      });
    } catch (error) {
      console.error("Error in POST /conversations/:id/transfer:", error);
      res.status(500).json({
        error: { code: "INTERNAL_ERROR", message: "Internal server error" },
      });
    }
  }
);

/**
 * POST /api/conversations/:id/resolve
 * Resolve or close a conversation
 */
router.post(
  "/conversations/:id/resolve",
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const { userId } = req as AuthenticatedRequest;
      const { id } = req.params;

      if (!isValidUUID(id)) {
        return res.status(400).json({
          error: {
            code: "INVALID_ID",
            message: "Invalid conversation ID format",
          },
        });
      }

      // Validate body
      const validation = ResolveSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid request body",
            details: validation.error.flatten().fieldErrors,
          },
        });
      }

      const { resolution, returnToAI } = validation.data;

      // Get conversation
      const { data: conversation, error: convError } = await supabaseAdmin
        .from("conversations")
        .select("*")
        .eq("id", id)
        .single();

      if (convError || !conversation) {
        return res.status(404).json({
          error: { code: "NOT_FOUND", message: "Conversation not found" },
        });
      }

      // Verify user has access
      const { data: project } = await supabaseAdmin
        .from("projects")
        .select("id, user_id")
        .eq("id", conversation.project_id)
        .single();

      const isOwner = project?.user_id === userId;
      const isAssigned = conversation.assigned_agent_id === userId;

      if (!isOwner && !isAssigned) {
        const { data: membership } = await supabaseAdmin
          .from("project_members")
          .select("id")
          .eq("project_id", conversation.project_id)
          .eq("user_id", userId)
          .eq("status", "active")
          .single();

        if (!membership) {
          return res.status(403).json({
            error: { code: "FORBIDDEN", message: "Access denied" },
          });
        }
      }

      const newStatus: "resolved" | "closed" | "ai_active" = returnToAI
        ? "ai_active"
        : resolution;

      const transitionResult = await transitionAgentConversation({
        conversationId: id,
        projectId: conversation.project_id,
        nextStatus: newStatus,
      });
      if (transitionResult !== "TRANSITIONED") {
        return res.status(409).json({
          error: {
            code: "TRANSITION_FAILED",
            message: `Conversation could not be resolved (${transitionResult})`,
          },
        });
      }

      const { data: updated, error: updateError } = await supabaseAdmin
        .from("conversations")
        .select("*")
        .eq("id", id)
        .single();
      if (updateError || !updated)
        throw updateError ?? new Error("Missing conversation");

      // Add system message and broadcast it
      const message = returnToAI
        ? "This chat has been returned to AI. Feel free to continue asking questions!"
        : resolution === "resolved"
          ? "This conversation has been resolved. Thank you!"
          : "This conversation has been closed.";

      // The rating prompt rides on a message the customer already receives, so it needs no delivery
      // path of its own. Returning to AI is not the end of the conversation — only a terminal
      // resolve earns the prompt.
      const messageMetadata = {
        event: returnToAI ? "returned_to_ai" : resolution,
        ...(returnToAI ? {} : { csat_prompt: true }),
      };

      const { data: systemMsg } = await supabaseAdmin
        .from("messages")
        .insert({
          conversation_id: id,
          sender_type: "system",
          content: message,
          metadata: messageMetadata,
        })
        .select("id, created_at")
        .single();

      // Broadcast the system message so widget receives it
      if (systemMsg) {
        broadcastNewMessage(id, {
          id: systemMsg.id,
          senderType: "system",
          content: message,
          createdAt: systemMsg.created_at,
          metadata: messageMetadata,
        }).catch((err) =>
          console.error("[Realtime] Broadcast system message error:", err)
        );
      }

      // Broadcast resolution to channels (fire-and-forget)
      const broadcastResolution: "resolved" | "closed" | "ai_active" =
        returnToAI ? "ai_active" : resolution;
      broadcastConversationResolved(
        id,
        conversation.project_id,
        broadcastResolution
      ).catch((err) => console.error("[Realtime] Broadcast error:", err));

      res.json({
        success: true,
        conversation: {
          id: updated.id,
          status: updated.status,
          resolvedAt: updated.resolved_at,
        },
      });
    } catch (error) {
      console.error("Error in POST /conversations/:id/resolve:", error);
      res.status(500).json({
        error: { code: "INTERNAL_ERROR", message: "Internal server error" },
      });
    }
  }
);

/**
 * GET /api/projects/:id/inbox-summary
 * Lightweight endpoint for polling - returns just counts for badge display
 */
router.get(
  "/projects/:id/inbox-summary",
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const { userId } = req as AuthenticatedRequest;
      const { id: projectId } = req.params;

      if (!isValidUUID(projectId)) {
        return res.status(400).json({
          error: { code: "INVALID_ID", message: "Invalid project ID format" },
        });
      }

      const validation = InboxSummaryQuerySchema.safeParse(req.query);
      if (!validation.success) {
        return res.status(400).json({
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid query parameters",
            details: validation.error.flatten().fieldErrors,
          },
        });
      }

      const utcMidnight = new Date();
      utcMidnight.setUTCHours(0, 0, 0, 0);
      const resolvedSince =
        validation.data.resolvedSince ?? utcMidnight.toISOString();

      // Verify user has access
      const { data: project } = await supabaseAdmin
        .from("projects")
        .select("id, user_id")
        .eq("id", projectId)
        .is("deleted_at", null)
        .single();

      if (!project) {
        return res.status(404).json({
          error: { code: "NOT_FOUND", message: "Project not found" },
        });
      }

      const isOwner = project.user_id === userId;

      if (!isOwner) {
        const { data: membership } = await supabaseAdmin
          .from("project_members")
          .select("id")
          .eq("project_id", projectId)
          .eq("user_id", userId)
          .eq("status", "active")
          .single();

        if (!membership) {
          return res.status(403).json({
            error: { code: "FORBIDDEN", message: "Access denied" },
          });
        }
      }

      let resolvedQuery = supabaseAdmin
        .from("conversations")
        .select("id", { count: "exact", head: true })
        .eq("project_id", projectId)
        .eq("status", "resolved")
        .gte("resolved_at", resolvedSince);

      if (!isOwner) {
        resolvedQuery = resolvedQuery.eq("assigned_agent_id", userId);
      }

      // One summary request owns all headline counts. These are independent, count-only queries and
      // run concurrently; the list and queue payloads never need to be over-fetched to derive them.
      const [queueResult, assignedResult, openResult, resolvedResult] =
        await Promise.all([
          // Count waiting conversations (queue)
          supabaseAdmin
            .from("conversations")
            .select("id", { count: "exact", head: true })
            .eq("project_id", projectId)
            .eq("status", "waiting"),
          // Count conversations assigned to this user
          supabaseAdmin
            .from("conversations")
            .select("id", { count: "exact", head: true })
            .eq("project_id", projectId)
            .eq("assigned_agent_id", userId)
            .eq("status", "agent_active"),
          // Count every project conversation that still needs AI or human handling.
          supabaseAdmin
            .from("conversations")
            .select("id", { count: "exact", head: true })
            .eq("project_id", projectId)
            .in("status", ["ai_active", "waiting", "agent_active"]),
          resolvedQuery,
        ]);

      const countError =
        queueResult.error ??
        assignedResult.error ??
        openResult.error ??
        resolvedResult.error;
      if (countError) {
        console.error("Error fetching inbox summary:", countError);
        return res.status(500).json({
          error: {
            code: "FETCH_ERROR",
            message: "Failed to fetch inbox summary",
          },
        });
      }

      const queueCount = queueResult.count ?? 0;
      const assignedCount = assignedResult.count ?? 0;
      const openCount = openResult.count ?? 0;
      const resolvedTodayCount = resolvedResult.count ?? 0;
      const totalPending = queueCount + assignedCount;

      res.json({
        isOwner,
        openCount,
        queueCount,
        assignedCount,
        resolvedTodayCount,
        totalPending,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error in GET /projects/:id/inbox-summary:", error);
      res.status(500).json({
        error: { code: "INTERNAL_ERROR", message: "Internal server error" },
      });
    }
  }
);

/**
 * GET /api/projects/:id/queue
 * Get queue status for a project
 */
router.get(
  "/projects/:id/queue",
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const { userId } = req as AuthenticatedRequest;
      const { id: projectId } = req.params;

      if (!isValidUUID(projectId)) {
        return res.status(400).json({
          error: { code: "INVALID_ID", message: "Invalid project ID format" },
        });
      }

      // Verify user has access
      const { data: project } = await supabaseAdmin
        .from("projects")
        .select("id, user_id")
        .eq("id", projectId)
        .is("deleted_at", null)
        .single();

      if (!project) {
        return res.status(404).json({
          error: { code: "NOT_FOUND", message: "Project not found" },
        });
      }

      const isOwner = project.user_id === userId;

      if (!isOwner) {
        const { data: membership } = await supabaseAdmin
          .from("project_members")
          .select("id")
          .eq("project_id", projectId)
          .eq("user_id", userId)
          .eq("status", "active")
          .single();

        if (!membership) {
          return res.status(403).json({
            error: { code: "FORBIDDEN", message: "Access denied" },
          });
        }
      }

      // Get queue conversations
      const {
        data: queue,
        error: queueError,
        count: queueCount,
      } = await supabaseAdmin
        .from("conversations")
        .select(
          "id, visitor_id, customer_email, customer_name, queue_entered_at, created_at, message_count",
          { count: "exact" }
        )
        .eq("project_id", projectId)
        .eq("status", "waiting")
        .order("queue_entered_at", { ascending: true })
        .range(0, 4);

      if (queueError) {
        console.error("Error fetching queue:", queueError);
        return res.status(500).json({
          error: { code: "FETCH_ERROR", message: "Failed to fetch queue" },
        });
      }

      res.json({
        queue: (queue || []).map((conv, index) => ({
          id: conv.id,
          visitorId: conv.visitor_id,
          customerEmail: conv.customer_email,
          customerName: conv.customer_name,
          position: index + 1,
          waitingSince: conv.queue_entered_at,
          createdAt: conv.created_at,
          messageCount: conv.message_count,
        })),
        count: queueCount ?? 0,
      });
    } catch (error) {
      console.error("Error in GET /projects/:id/queue:", error);
      res.status(500).json({
        error: { code: "INTERNAL_ERROR", message: "Internal server error" },
      });
    }
  }
);

// ============================================================================
// Offline Messages
// ============================================================================

const OfflineMessageSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: z.string().email("Invalid email address"),
  message: z.string().min(1, "Message is required").max(5000),
  visitorId: z.string().max(100).optional(),
});

/**
 * POST /api/projects/:id/offline-messages
 * Submit an offline message when no agents are available
 * Public endpoint - called by widget
 */
router.post(
  "/projects/:id/offline-messages",
  requirePublicWidgetAccess({
    action: "offline-message",
    projectIdSource: "params",
    projectIdParam: "id",
  }),
  async (req: Request, res: Response) => {
    try {
      const projectId = req.params.id;

      // Validate project ID
      if (!isValidUUID(projectId)) {
        return res.status(400).json({
          error: { code: "INVALID_ID", message: "Invalid project ID format" },
        });
      }

      // Validate request body
      const parseResult = OfflineMessageSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          error: {
            code: "VALIDATION_ERROR",
            message:
              parseResult.error.errors[0]?.message || "Validation failed",
            details: parseResult.error.errors,
          },
        });
      }

      const { name, email, message, visitorId } = parseResult.data;

      // Verify project exists
      const { data: project, error: projectError } = await supabaseAdmin
        .from("projects")
        .select("id, name")
        .eq("id", projectId)
        .single();

      if (projectError || !project) {
        return res.status(404).json({
          error: { code: "NOT_FOUND", message: "Project not found" },
        });
      }

      // Create offline message as a conversation with status "offline_message"
      // This allows it to appear in the inbox for follow-up
      const { data: conversation, error: convError } = await supabaseAdmin
        .from("conversations")
        .insert({
          project_id: projectId,
          visitor_id: visitorId || `offline-${Date.now()}`,
          customer_email: email,
          customer_name: name,
          status: "closed", // Closed until agent follows up
          // Born terminal, so resolved_at must be set at birth: the inbox renders it as "closed at"
          // and the insights classifier bounds its backlog on it.
          resolved_at: new Date().toISOString(),
          source: "widget",
          handoff_reason: "offline_form",
          metadata: {
            offlineMessage: true,
            submittedAt: new Date().toISOString(),
            // Safe to set here (an insert builds metadata rather than replacing it) — keeps this
            // out of the "Closed - inactive" bucket in the inbox.
            close_reason: "offline_form",
          },
        })
        .select("id")
        .single();

      if (convError || !conversation) {
        console.error("Error creating offline conversation:", convError);
        return res.status(500).json({
          error: { code: "CREATE_ERROR", message: "Failed to save message" },
        });
      }

      // Add the message
      const { error: msgError } = await supabaseAdmin.from("messages").insert({
        conversation_id: conversation.id,
        sender_type: "customer",
        content: message,
        metadata: {
          offlineMessage: true,
          customerName: name,
          customerEmail: email,
        },
      });

      if (msgError) {
        console.error("Error saving offline message:", msgError);
        // Don't fail the request - the conversation was created
      }

      // Add system message about offline submission
      await supabaseAdmin.from("messages").insert({
        conversation_id: conversation.id,
        sender_type: "system",
        content:
          "This message was submitted via the offline form while no agents were available.",
        metadata: { event: "offline_form_submission" },
      });

      console.log(
        `[Handoff] Offline message received for project ${projectId} from ${email}`
      );

      res.status(201).json({
        success: true,
        message: "Your message has been received. We'll get back to you soon.",
        conversationId: conversation.id,
      });
    } catch (error) {
      console.error("Error in POST /projects/:id/offline-messages:", error);
      res.status(500).json({
        error: { code: "INTERNAL_ERROR", message: "Internal server error" },
      });
    }
  }
);

export { router as handoffRouter };
