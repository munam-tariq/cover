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
import { supabaseAdmin } from "../lib/supabase";
import { authMiddleware, AuthenticatedRequest } from "../middleware/auth";
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
  reason: z.enum(["low_confidence", "keyword", "customer_request", "button_click"]),
  confidence: z.number().min(0).max(1).optional(),
  triggerKeyword: z.string().max(50).optional(),
  customerEmail: z.string().email().optional(),
  customerName: z.string().max(100).optional(),
});

const ResolveSchema = z.object({
  resolution: z.enum(["resolved", "closed"]).default("resolved"),
  returnToAI: z.boolean().default(false),
});

// ============================================================================
// Helpers
// ============================================================================

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUUID(id: string): boolean {
  return UUID_REGEX.test(id);
}

/**
 * Check if we're within business hours
 */
function isWithinBusinessHours(
  settings: { business_hours_enabled: boolean; timezone: string; business_hours: Record<string, unknown> }
): boolean {
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
    const weekday = parts.find((p) => p.type === "weekday")?.value?.toLowerCase();
    const hour = parseInt(parts.find((p) => p.type === "hour")?.value || "0");
    const minute = parseInt(parts.find((p) => p.type === "minute")?.value || "0");

    if (!weekday) return false;

    const dayConfig = (settings.business_hours as Record<string, { start: string; end: string; enabled: boolean }>)[
      weekday
    ];

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
    .select("user_id, current_chat_count, max_concurrent_chats, last_assigned_at")
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
router.get("/projects/:id/handoff-availability", async (req: Request, res: Response) => {
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
    const showButton = settings.show_human_button &&
      (settings.trigger_mode === "manual" || settings.trigger_mode === "both");

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
});

/**
 * POST /api/conversations/:id/handoff
 * Trigger handoff for a conversation
 * Can be called by widget (no auth) or dashboard (with auth)
 */
router.post("/conversations/:id/handoff", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!isValidUUID(id)) {
      return res.status(400).json({
        error: { code: "INVALID_ID", message: "Invalid conversation ID format" },
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

    const { reason, confidence, triggerKeyword, customerEmail, customerName } = validation.data;

    // Get conversation - first try conversations table, then chat_sessions
    let conversation = null;
    let fromChatSessions = false;

    const { data: convData, error: convError } = await supabaseAdmin
      .from("conversations")
      .select("*")
      .eq("id", id)
      .single();

    if (convData) {
      conversation = convData;
    } else {
      // Try chat_sessions table (legacy/widget creates sessions here)
      const { data: sessionData, error: sessionError } = await supabaseAdmin
        .from("chat_sessions")
        .select("*")
        .eq("id", id)
        .single();

      if (sessionData) {
        fromChatSessions = true;
        // Create a conversation record from the chat session
        const { data: newConv, error: createError } = await supabaseAdmin
          .from("conversations")
          .insert({
            id: sessionData.id, // Use same ID for consistency
            project_id: sessionData.project_id,
            visitor_id: sessionData.visitor_id,
            status: "ai_active",
            source: "widget",
            message_count: sessionData.message_count || 0,
            created_at: sessionData.created_at,
            metadata: sessionData.metadata || {},
          })
          .select("*")
          .single();

        if (createError) {
          console.error("Error creating conversation from chat_session:", createError);
          return res.status(500).json({
            error: { code: "CREATE_ERROR", message: "Failed to initialize handoff" },
          });
        }

        conversation = newConv;
        console.log(`[Handoff] Created conversation ${id} from chat_session`);
      }
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
        error: { code: "HANDOFF_DISABLED", message: "Human handoff is not enabled" },
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

    // Update customer info if provided
    const customerUpdates: Record<string, unknown> = {};
    if (customerEmail) customerUpdates.customer_email = customerEmail;
    if (customerName) customerUpdates.customer_name = customerName;

    if (availableAgentId) {
      // Direct assignment - agent available
      const { data: updated, error: updateError } = await supabaseAdmin
        .from("conversations")
        .update({
          status: "agent_active",
          assigned_agent_id: availableAgentId,
          handoff_reason: reason,
          handoff_triggered_at: now,
          ai_confidence_at_handoff: confidence,
          trigger_keyword: triggerKeyword,
          claimed_at: now,
          ...customerUpdates,
        })
        .eq("id", id)
        .select("*")
        .single();

      if (updateError) {
        console.error("Error updating conversation:", updateError);
        return res.status(500).json({
          error: { code: "UPDATE_ERROR", message: "Failed to trigger handoff" },
        });
      }

      // Increment agent's chat count
      await supabaseAdmin
        .from("agent_availability")
        .update({
          current_chat_count: supabaseAdmin.rpc("increment_chat_count"),
          last_assigned_at: now,
        })
        .eq("user_id", availableAgentId)
        .eq("project_id", conversation.project_id);

      // Workaround: Manually increment since RPC might not be set up
      const { data: agentAvail } = await supabaseAdmin
        .from("agent_availability")
        .select("current_chat_count")
        .eq("user_id", availableAgentId)
        .eq("project_id", conversation.project_id)
        .single();

      if (agentAvail) {
        await supabaseAdmin
          .from("agent_availability")
          .update({
            current_chat_count: (agentAvail.current_chat_count || 0) + 1,
            last_assigned_at: now,
          })
          .eq("user_id", availableAgentId)
          .eq("project_id", conversation.project_id);
      }

      // Get agent info
      const { data: agentUser } = await supabaseAdmin.auth.admin.getUserById(availableAgentId);
      const agentName = agentUser?.user?.user_metadata?.name || agentUser?.user?.email || "Support Agent";

      // Format agent joined message using settings or default
      const agentJoinedTemplate = settings.agent_joined_message || "You're now connected with {agent_name}.";
      const agentJoinedContent = formatAgentJoinedMessage(agentJoinedTemplate, agentName);

      // Add system message and broadcast it
      const { data: systemMsg } = await supabaseAdmin.from("messages").insert({
        conversation_id: id,
        sender_type: "system",
        content: agentJoinedContent,
        metadata: { event: "handoff_completed", agent_id: availableAgentId },
      }).select("id, created_at").single();

      // Broadcast the system message so widget receives it (fire-and-forget)
      if (systemMsg) {
        broadcastNewMessage(id, {
          id: systemMsg.id,
          senderType: "system",
          content: agentJoinedContent,
          createdAt: systemMsg.created_at,
          metadata: { event: "handoff_completed", agent_id: availableAgentId },
        }).catch((err) => console.error("[Realtime] Broadcast system message error:", err));
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
    } else {
      // No agent available - add to queue
      const { data: updated, error: updateError } = await supabaseAdmin
        .from("conversations")
        .update({
          status: "waiting",
          handoff_reason: reason,
          handoff_triggered_at: now,
          ai_confidence_at_handoff: confidence,
          trigger_keyword: triggerKeyword,
          queue_entered_at: now,
          ...customerUpdates,
        })
        .eq("id", id)
        .select("*")
        .single();

      if (updateError) {
        console.error("Error updating conversation:", updateError);
        return res.status(500).json({
          error: { code: "UPDATE_ERROR", message: "Failed to trigger handoff" },
        });
      }

      // Calculate queue position
      const queuePosition = await calculateQueuePosition(conversation.project_id, now);

      // Format queue message using settings or default
      const queueMessageTemplate = settings.queue_message || "Please wait while we connect you with an agent. You are number {position} in the queue.";
      const queueMessageContent = formatQueueMessage(queueMessageTemplate, queuePosition);

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
      broadcastQueuePositions(
        conversation.project_id,
        [{ conversationId: id, position: queuePosition }]
      ).catch((err) => console.error("[Realtime] Broadcast error:", err));

      return res.json({
        status: "waiting",
        queuePosition,
        estimatedWaitMinutes: queuePosition * 2, // Rough estimate
      });
    }
  } catch (error) {
    console.error("Error in POST /conversations/:id/handoff:", error);
    res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Internal server error" },
    });
  }
});

/**
 * POST /api/conversations/:id/claim
 * Agent claims a waiting conversation
 */
router.post("/conversations/:id/claim", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { userId } = req as AuthenticatedRequest;
    const { id } = req.params;

    if (!isValidUUID(id)) {
      return res.status(400).json({
        error: { code: "INVALID_ID", message: "Invalid conversation ID format" },
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
          error: { code: "ALREADY_CLAIMED", message: "This conversation was claimed by another agent" },
        });
      }

      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Conversation not found or not in queue" },
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

    // Check agent capacity
    const { data: availability } = await supabaseAdmin
      .from("agent_availability")
      .select("status, current_chat_count, max_concurrent_chats")
      .eq("user_id", userId)
      .eq("project_id", conversation.project_id)
      .single();

    if (!availability || availability.status !== "online") {
      return res.status(400).json({
        error: { code: "NOT_ONLINE", message: "You must be online to claim conversations" },
      });
    }

    if (availability.current_chat_count >= availability.max_concurrent_chats) {
      return res.status(400).json({
        error: { code: "AT_CAPACITY", message: "You are at maximum chat capacity" },
      });
    }

    const now = new Date().toISOString();

    // Claim the conversation
    const { data: updated, error: updateError } = await supabaseAdmin
      .from("conversations")
      .update({
        status: "agent_active",
        assigned_agent_id: userId,
        claimed_at: now,
      })
      .eq("id", id)
      .eq("status", "waiting") // Double-check status to prevent race condition
      .is("assigned_agent_id", null)
      .select("*")
      .single();

    if (updateError || !updated) {
      return res.status(409).json({
        success: false,
        error: { code: "CLAIM_FAILED", message: "Failed to claim conversation - it may have been claimed by another agent" },
      });
    }

    // Increment agent's chat count
    await supabaseAdmin
      .from("agent_availability")
      .update({
        current_chat_count: availability.current_chat_count + 1,
        last_assigned_at: now,
      })
      .eq("user_id", userId)
      .eq("project_id", conversation.project_id);

    // Get handoff settings for custom messages
    const { data: settings } = await supabaseAdmin
      .from("handoff_settings")
      .select("agent_joined_message")
      .eq("project_id", conversation.project_id)
      .single();

    // Add system message and broadcast it
    const { data: agentUser } = await supabaseAdmin.auth.admin.getUserById(userId);
    const agentName = agentUser?.user?.user_metadata?.name || "An agent";

    // Format agent joined message using settings or default
    const agentJoinedTemplate = settings?.agent_joined_message || "You're now connected with {agent_name}.";
    const agentJoinedContent = formatAgentJoinedMessage(agentJoinedTemplate, agentName);

    const { data: systemMsg } = await supabaseAdmin.from("messages").insert({
      conversation_id: id,
      sender_type: "system",
      content: agentJoinedContent,
      metadata: { event: "agent_joined", agent_id: userId },
    }).select("id, created_at").single();

    // Broadcast the system message so widget receives it (fire-and-forget)
    if (systemMsg) {
      broadcastNewMessage(id, {
        id: systemMsg.id,
        senderType: "system",
        content: agentJoinedContent,
        createdAt: systemMsg.created_at,
        metadata: { event: "agent_joined", agent_id: userId },
      }).catch((err) => console.error("[Realtime] Broadcast system message error:", err));
    }

    // Broadcast to conversation and queue channels (fire-and-forget)
    if (userId) {
      broadcastAgentClaimed(
        conversation.project_id,
        userId,
        id
      ).catch((err) => console.error("[Realtime] Broadcast error:", err));

      broadcastConversationAssigned(
        id,
        conversation.project_id,
        userId,
        {
          name: agentName,
          email: agentUser?.user?.email,
        }
      ).catch((err) => console.error("[Realtime] Broadcast error:", err));
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
});

/**
 * POST /api/conversations/:id/transfer
 * Transfer conversation back to queue
 */
router.post("/conversations/:id/transfer", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { userId } = req as AuthenticatedRequest;
    const { id } = req.params;

    if (!isValidUUID(id)) {
      return res.status(400).json({
        error: { code: "INVALID_ID", message: "Invalid conversation ID format" },
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
        error: { code: "FORBIDDEN", message: "You cannot transfer this conversation" },
      });
    }

    if (conversation.status !== "agent_active") {
      return res.status(400).json({
        error: { code: "INVALID_STATUS", message: "Conversation is not in agent_active status" },
      });
    }

    const now = new Date().toISOString();

    // Transfer to queue
    const { data: updated, error: updateError } = await supabaseAdmin
      .from("conversations")
      .update({
        status: "waiting",
        assigned_agent_id: null,
        queue_entered_at: now,
        claimed_at: null,
        first_response_at: null,
      })
      .eq("id", id)
      .select("*")
      .single();

    if (updateError) {
      console.error("Error transferring conversation:", updateError);
      return res.status(500).json({
        error: { code: "UPDATE_ERROR", message: "Failed to transfer conversation" },
      });
    }

    // Decrement previous agent's chat count
    if (conversation.assigned_agent_id) {
      const { data: agentAvail } = await supabaseAdmin
        .from("agent_availability")
        .select("current_chat_count")
        .eq("user_id", conversation.assigned_agent_id)
        .eq("project_id", conversation.project_id)
        .single();

      if (agentAvail && agentAvail.current_chat_count > 0) {
        await supabaseAdmin
          .from("agent_availability")
          .update({ current_chat_count: agentAvail.current_chat_count - 1 })
          .eq("user_id", conversation.assigned_agent_id)
          .eq("project_id", conversation.project_id);
      }
    }

    // Calculate queue position
    const queuePosition = await calculateQueuePosition(conversation.project_id, now);

    // Add system message
    await supabaseAdmin.from("messages").insert({
      conversation_id: id,
      sender_type: "system",
      content: `The conversation has been transferred to another agent. Queue position: ${queuePosition}`,
      metadata: { event: "transferred_to_queue", queue_position: queuePosition },
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
});

/**
 * POST /api/conversations/:id/resolve
 * Resolve or close a conversation
 */
router.post("/conversations/:id/resolve", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { userId } = req as AuthenticatedRequest;
    const { id } = req.params;

    if (!isValidUUID(id)) {
      return res.status(400).json({
        error: { code: "INVALID_ID", message: "Invalid conversation ID format" },
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

    const now = new Date().toISOString();
    let newStatus = resolution;

    // If returning to AI, set status back to ai_active
    if (returnToAI) {
      newStatus = "ai_active";
    }

    // Update conversation
    const { data: updated, error: updateError } = await supabaseAdmin
      .from("conversations")
      .update({
        status: newStatus,
        resolved_at: returnToAI ? null : now,
        assigned_agent_id: returnToAI ? null : conversation.assigned_agent_id,
      })
      .eq("id", id)
      .select("*")
      .single();

    if (updateError) {
      console.error("Error resolving conversation:", updateError);
      return res.status(500).json({
        error: { code: "UPDATE_ERROR", message: "Failed to resolve conversation" },
      });
    }

    // Decrement agent's chat count if they were assigned
    if (conversation.assigned_agent_id && conversation.status === "agent_active") {
      const { data: agentAvail } = await supabaseAdmin
        .from("agent_availability")
        .select("current_chat_count")
        .eq("user_id", conversation.assigned_agent_id)
        .eq("project_id", conversation.project_id)
        .single();

      if (agentAvail && agentAvail.current_chat_count > 0) {
        await supabaseAdmin
          .from("agent_availability")
          .update({ current_chat_count: agentAvail.current_chat_count - 1 })
          .eq("user_id", conversation.assigned_agent_id)
          .eq("project_id", conversation.project_id);
      }
    }

    // Add system message and broadcast it
    const message = returnToAI
      ? "This chat has been returned to AI. Feel free to continue asking questions!"
      : resolution === "resolved"
      ? "This conversation has been resolved. Thank you!"
      : "This conversation has been closed.";

    const { data: systemMsg } = await supabaseAdmin.from("messages").insert({
      conversation_id: id,
      sender_type: "system",
      content: message,
      metadata: { event: returnToAI ? "returned_to_ai" : resolution },
    }).select("id, created_at").single();

    // Broadcast the system message so widget receives it
    if (systemMsg) {
      broadcastNewMessage(id, {
        id: systemMsg.id,
        senderType: "system",
        content: message,
        createdAt: systemMsg.created_at,
        metadata: { event: returnToAI ? "returned_to_ai" : resolution },
      }).catch((err) => console.error("[Realtime] Broadcast system message error:", err));
    }

    // Broadcast resolution to channels (fire-and-forget)
    const broadcastResolution: "resolved" | "closed" | "ai_active" = returnToAI ? "ai_active" : resolution;
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
});

/**
 * GET /api/projects/:id/inbox-summary
 * Lightweight endpoint for polling - returns just counts for badge display
 */
router.get("/projects/:id/inbox-summary", authMiddleware, async (req: Request, res: Response) => {
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

    // Get counts in parallel for efficiency
    const [queueResult, assignedResult] = await Promise.all([
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
    ]);

    const queueCount = queueResult.count || 0;
    const assignedCount = assignedResult.count || 0;
    const totalPending = queueCount + assignedCount;

    res.json({
      queueCount,
      assignedCount,
      totalPending,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error in GET /projects/:id/inbox-summary:", error);
    res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Internal server error" },
    });
  }
});

/**
 * GET /api/projects/:id/queue
 * Get queue status for a project
 */
router.get("/projects/:id/queue", authMiddleware, async (req: Request, res: Response) => {
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
    const { data: queue, error: queueError } = await supabaseAdmin
      .from("conversations")
      .select("id, visitor_id, customer_email, customer_name, queue_entered_at, created_at, message_count")
      .eq("project_id", projectId)
      .eq("status", "waiting")
      .order("queue_entered_at", { ascending: true });

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
      count: (queue || []).length,
    });
  } catch (error) {
    console.error("Error in GET /projects/:id/queue:", error);
    res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Internal server error" },
    });
  }
});

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
            message: parseResult.error.errors[0]?.message || "Validation failed",
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
          source: "widget",
          handoff_reason: "offline_form",
          metadata: {
            offlineMessage: true,
            submittedAt: new Date().toISOString(),
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
      const { error: msgError } = await supabaseAdmin
        .from("messages")
        .insert({
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
        content: "This message was submitted via the offline form while no agents were available.",
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
