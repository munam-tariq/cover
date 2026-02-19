/**
 * Conversations API Routes
 *
 * Handles conversation management for both widget and dashboard:
 * - POST /api/conversations - Create conversation (widget)
 * - GET /api/conversations - List conversations (dashboard)
 * - GET /api/conversations/:id - Get conversation details
 * - GET /api/conversations/:id/messages - Get messages (paginated)
 * - POST /api/conversations/:id/messages - Send message
 * - PATCH /api/conversations/:id - Update conversation (status, etc.)
 */

import { Router, Request, Response } from "express";
import { z } from "zod";
import { supabaseAdmin } from "../lib/supabase";
import { authMiddleware, AuthenticatedRequest } from "../middleware/auth";
import { broadcastNewMessage, broadcastTyping, broadcastPresenceUpdate } from "../services/realtime";
import { updateCustomerPresence, getCustomerPresenceStatus } from "../services/presence";

const router = Router();

// ============================================================================
// Validation Schemas
// ============================================================================

const CreateConversationSchema = z.object({
  projectId: z.string().uuid("Invalid project ID"),
  visitorId: z.string().min(1).max(100),
  source: z.enum(["widget", "playground", "mcp", "api"]).default("widget"),
  metadata: z.record(z.unknown()).optional(),
});

const SendMessageSchema = z.object({
  content: z.string().min(1).max(10000),
  senderType: z.enum(["customer", "agent"]),
  metadata: z.record(z.unknown()).optional(),
});

const UpdateConversationSchema = z.object({
  customerEmail: z.string().email().optional(),
  customerName: z.string().max(100).optional(),
  customerPresence: z.enum(["online", "idle", "offline", "typing"]).optional(),
  metadata: z.record(z.unknown()).optional(),
});

const ListConversationsSchema = z.object({
  projectId: z.string().uuid("Invalid project ID"),
  status: z.enum(["ai_active", "waiting", "agent_active", "resolved", "closed"]).optional(),
  assignedToMe: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// ============================================================================
// Helpers
// ============================================================================

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUUID(id: string): boolean {
  return UUID_REGEX.test(id);
}

/**
 * Get agent display name - prioritizes stored name in project_members,
 * falls back to user metadata, then email
 */
async function getAgentName(userId: string, projectId?: string): Promise<string> {
  // First try to get name from project_members (if projectId provided)
  if (projectId) {
    const { data: member } = await supabaseAdmin
      .from("project_members")
      .select("name")
      .eq("user_id", userId)
      .eq("project_id", projectId)
      .eq("status", "active")
      .single();

    if (member?.name) {
      return member.name;
    }
  }

  // Fall back to user metadata
  const { data: agentUser } = await supabaseAdmin.auth.admin.getUserById(userId);
  if (agentUser?.user) {
    return agentUser.user.user_metadata?.name || agentUser.user.email?.split("@")[0] || "Agent";
  }

  return "Agent";
}

/**
 * Get multiple agent names at once for efficiency
 */
async function getAgentNames(agentIds: string[], projectId: string): Promise<Record<string, string>> {
  const names: Record<string, string> = {};

  if (agentIds.length === 0) return names;

  // First get names from project_members
  const { data: members } = await supabaseAdmin
    .from("project_members")
    .select("user_id, name")
    .eq("project_id", projectId)
    .in("user_id", agentIds)
    .eq("status", "active");

  if (members) {
    for (const member of members) {
      if (member.name) {
        names[member.user_id] = member.name;
      }
    }
  }

  // For agents without names in project_members, get from user metadata
  const missingIds = agentIds.filter((id) => !names[id]);
  for (const agentId of missingIds) {
    const { data: agentUser } = await supabaseAdmin.auth.admin.getUserById(agentId);
    if (agentUser?.user) {
      names[agentId] = agentUser.user.user_metadata?.name || agentUser.user.email?.split("@")[0] || "Agent";
    } else {
      names[agentId] = "Agent";
    }
  }

  return names;
}

// ============================================================================
// Dashboard Routes (authenticated)
// ============================================================================

/**
 * GET /api/conversations
 * List conversations for dashboard
 * Query params: projectId, status, assignedToMe, page, limit
 */
router.get("/", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { userId } = req as AuthenticatedRequest;

    // Validate query params
    const validation = ListConversationsSchema.safeParse(req.query);
    if (!validation.success) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid query parameters",
          details: validation.error.flatten().fieldErrors,
        },
      });
    }

    const { projectId, status, assignedToMe, page, limit } = validation.data;

    // Verify user has access to the project (owner or agent)
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

    // Build query
    let query = supabaseAdmin
      .from("conversations")
      .select("*, customers(id, email, name, is_flagged)", { count: "exact" })
      .eq("project_id", projectId)
      .order("last_message_at", { ascending: false });

    if (status) {
      query = query.eq("status", status);
    } else {
      // Default: exclude closed
      query = query.neq("status", "closed");
    }

    // For non-owners (agents), only show their assigned chats + waiting queue
    if (!isOwner && !assignedToMe) {
      // Agents see: their assigned chats OR waiting conversations (queue)
      query = query.or(`assigned_agent_id.eq.${userId},status.eq.waiting`);
    } else if (assignedToMe) {
      query = query.eq("assigned_agent_id", userId);
    }

    // Pagination
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    const { data: conversations, error: convError, count } = await query;

    if (convError) {
      console.error("Error fetching conversations:", convError);
      return res.status(500).json({
        error: { code: "FETCH_ERROR", message: "Failed to fetch conversations" },
      });
    }

    // Get assigned agent names (uses project_members.name, falls back to user metadata)
    const agentIds = [...new Set((conversations || []).filter(c => c.assigned_agent_id).map(c => c.assigned_agent_id))];
    const agentNames = await getAgentNames(agentIds, projectId);

    // Format response
    const conversationsResponse = (conversations || []).map((conv) => ({
      id: conv.id,
      visitorId: conv.visitor_id,
      customer: conv.customers
        ? {
            id: conv.customers.id,
            email: conv.customers.email,
            name: conv.customers.name,
            isFlagged: conv.customers.is_flagged,
          }
        : conv.customer_email || conv.customer_name
        ? {
            email: conv.customer_email,
            name: conv.customer_name,
          }
        : null,
      status: conv.status,
      customerPresence: conv.customer_presence,
      assignedAgent: conv.assigned_agent_id
        ? {
            id: conv.assigned_agent_id,
            name: agentNames[conv.assigned_agent_id] || "Unknown",
          }
        : null,
      handoffReason: conv.handoff_reason,
      source: conv.source,
      messageCount: conv.message_count,
      createdAt: conv.created_at,
      lastMessageAt: conv.last_message_at,
      queueEnteredAt: conv.queue_entered_at,
      claimedAt: conv.claimed_at,
      resolvedAt: conv.resolved_at,
    }));

    res.json({
      conversations: conversationsResponse,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
      isOwner,
    });
  } catch (error) {
    console.error("Error in GET /conversations:", error);
    res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Internal server error" },
    });
  }
});

/**
 * GET /api/conversations/:id
 * Get conversation details with messages
 */
router.get("/:id", authMiddleware, async (req: Request, res: Response) => {
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
      .select("*, customers(*)")
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

    // Get assigned agent info (uses project_members.name, falls back to user metadata)
    let assignedAgent = null;
    if (conversation.assigned_agent_id) {
      const agentName = await getAgentName(conversation.assigned_agent_id, conversation.project_id);
      const { data: agentUser } = await supabaseAdmin.auth.admin.getUserById(conversation.assigned_agent_id);
      assignedAgent = {
        id: conversation.assigned_agent_id,
        email: agentUser?.user?.email || null,
        name: agentName,
      };
    }

    res.json({
      conversation: {
        id: conversation.id,
        projectId: conversation.project_id,
        visitorId: conversation.visitor_id,
        customer: conversation.customers
          ? {
              id: conversation.customers.id,
              email: conversation.customers.email,
              name: conversation.customers.name,
              isFlagged: conversation.customers.is_flagged,
              firstSeenAt: conversation.customers.first_seen_at,
              totalConversations: conversation.customers.total_conversations,
              lastBrowser: conversation.customers.last_browser,
              lastDevice: conversation.customers.last_device,
              lastOs: conversation.customers.last_os,
              lastPageUrl: conversation.customers.last_page_url,
              lastLocation: conversation.customers.last_location,
              internalNotes: conversation.customers.internal_notes,
            }
          : null,
        status: conversation.status,
        customerPresence: conversation.customer_presence,
        customerLastSeenAt: conversation.customer_last_seen_at,
        assignedAgent,
        handoffReason: conversation.handoff_reason,
        handoffTriggeredAt: conversation.handoff_triggered_at,
        aiConfidenceAtHandoff: conversation.ai_confidence_at_handoff,
        triggerKeyword: conversation.trigger_keyword,
        queueEnteredAt: conversation.queue_entered_at,
        queuePosition: conversation.queue_position,
        claimedAt: conversation.claimed_at,
        firstResponseAt: conversation.first_response_at,
        resolvedAt: conversation.resolved_at,
        satisfactionRating: conversation.satisfaction_rating,
        satisfactionFeedback: conversation.satisfaction_feedback,
        source: conversation.source,
        metadata: conversation.metadata,
        messageCount: conversation.message_count,
        createdAt: conversation.created_at,
        updatedAt: conversation.updated_at,
        lastMessageAt: conversation.last_message_at,
      },
    });
  } catch (error) {
    console.error("Error in GET /conversations/:id:", error);
    res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Internal server error" },
    });
  }
});

/**
 * PATCH /api/conversations/:id
 * Update conversation details
 */
router.patch("/:id", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { userId } = req as AuthenticatedRequest;
    const { id } = req.params;

    if (!isValidUUID(id)) {
      return res.status(400).json({
        error: { code: "INVALID_ID", message: "Invalid conversation ID format" },
      });
    }

    // Validate body
    const validation = UpdateConversationSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid request body",
          details: validation.error.flatten().fieldErrors,
        },
      });
    }

    // Get conversation
    const { data: conversation, error: convError } = await supabaseAdmin
      .from("conversations")
      .select("id, project_id")
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

    // Build updates
    const updates: Record<string, unknown> = {};
    const { customerEmail, customerName, customerPresence, metadata } = validation.data;

    if (customerEmail !== undefined) updates.customer_email = customerEmail;
    if (customerName !== undefined) updates.customer_name = customerName;
    if (customerPresence !== undefined) {
      updates.customer_presence = customerPresence;
      updates.customer_last_seen_at = new Date().toISOString();
    }
    if (metadata !== undefined) updates.metadata = metadata;

    // Update conversation
    const { data: updated, error: updateError } = await supabaseAdmin
      .from("conversations")
      .update(updates)
      .eq("id", id)
      .select("*")
      .single();

    if (updateError) {
      console.error("Error updating conversation:", updateError);
      return res.status(500).json({
        error: { code: "UPDATE_ERROR", message: "Failed to update conversation" },
      });
    }

    res.json({
      conversation: {
        id: updated.id,
        status: updated.status,
        customerEmail: updated.customer_email,
        customerName: updated.customer_name,
        customerPresence: updated.customer_presence,
        updatedAt: updated.updated_at,
      },
    });
  } catch (error) {
    console.error("Error in PATCH /conversations/:id:", error);
    res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Internal server error" },
    });
  }
});

/**
 * GET /api/conversations/:id/messages
 * Get messages for a conversation (paginated)
 */
router.get("/:id/messages", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { userId } = req as AuthenticatedRequest;
    const { id } = req.params;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const before = req.query.before as string; // cursor for pagination

    if (!isValidUUID(id)) {
      return res.status(400).json({
        error: { code: "INVALID_ID", message: "Invalid conversation ID format" },
      });
    }

    // Get conversation to verify access
    const { data: conversation, error: convError } = await supabaseAdmin
      .from("conversations")
      .select("id, project_id")
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

    // Build query
    let query = supabaseAdmin
      .from("messages")
      .select("*", { count: "exact" })
      .eq("conversation_id", id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (before && isValidUUID(before)) {
      // Get the timestamp of the cursor message
      const { data: cursorMsg } = await supabaseAdmin
        .from("messages")
        .select("created_at")
        .eq("id", before)
        .single();

      if (cursorMsg) {
        query = query.lt("created_at", cursorMsg.created_at);
      }
    }

    const { data: messages, error: msgError, count } = await query;

    if (msgError) {
      console.error("Error fetching messages:", msgError);
      return res.status(500).json({
        error: { code: "FETCH_ERROR", message: "Failed to fetch messages" },
      });
    }

    // Get sender names for agent messages (uses project_members.name, falls back to user metadata)
    const agentIds = [...new Set((messages || []).filter(m => m.sender_type === "agent" && m.sender_id).map(m => m.sender_id))];
    const agentNames = await getAgentNames(agentIds, conversation.project_id);

    // Format and reverse to get chronological order
    const messagesResponse = (messages || [])
      .reverse()
      .map((msg) => ({
        id: msg.id,
        conversationId: msg.conversation_id,
        senderType: msg.sender_type,
        senderId: msg.sender_id,
        senderName: msg.sender_type === "agent" && msg.sender_id ? agentNames[msg.sender_id] : null,
        content: msg.content,
        metadata: msg.metadata,
        createdAt: msg.created_at,
      }));

    res.json({
      messages: messagesResponse,
      pagination: {
        total: count || 0,
        limit,
        hasMore: (messages || []).length === limit,
        nextCursor: messages && messages.length > 0 ? messages[messages.length - 1].id : null,
      },
    });
  } catch (error) {
    console.error("Error in GET /conversations/:id/messages:", error);
    res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Internal server error" },
    });
  }
});

/**
 * POST /api/conversations/:id/messages
 * Send a message to a conversation (agent sending)
 */
router.post("/:id/messages", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { userId } = req as AuthenticatedRequest;
    const { id } = req.params;

    if (!isValidUUID(id)) {
      return res.status(400).json({
        error: { code: "INVALID_ID", message: "Invalid conversation ID format" },
      });
    }

    // Validate body
    const validation = SendMessageSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid request body",
          details: validation.error.flatten().fieldErrors,
        },
      });
    }

    const { content, senderType, metadata } = validation.data;

    // Get conversation
    const { data: conversation, error: convError } = await supabaseAdmin
      .from("conversations")
      .select("id, project_id, status, assigned_agent_id, first_response_at")
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

    // For agent messages, verify they're assigned to this conversation
    if (senderType === "agent") {
      if (conversation.status !== "agent_active") {
        return res.status(400).json({
          error: { code: "INVALID_STATUS", message: "Conversation is not in agent_active status" },
        });
      }

      if (conversation.assigned_agent_id !== userId) {
        return res.status(403).json({
          error: { code: "NOT_ASSIGNED", message: "You are not assigned to this conversation" },
        });
      }
    }

    // Create message
    const { data: message, error: msgError } = await supabaseAdmin
      .from("messages")
      .insert({
        conversation_id: id,
        sender_type: senderType,
        sender_id: senderType === "agent" ? userId : null,
        content,
        metadata: metadata || {},
      })
      .select("*")
      .single();

    if (msgError) {
      console.error("Error creating message:", msgError);
      return res.status(500).json({
        error: { code: "CREATE_ERROR", message: "Failed to send message" },
      });
    }

    // Update first_response_at if this is the first agent message
    if (senderType === "agent" && !conversation.first_response_at) {
      await supabaseAdmin
        .from("conversations")
        .update({ first_response_at: new Date().toISOString() })
        .eq("id", id);
    }

    // Broadcast message to real-time channel (fire-and-forget)
    broadcastNewMessage(id, {
      id: message.id,
      senderType: message.sender_type,
      senderId: message.sender_id,
      content: message.content,
      createdAt: message.created_at,
      metadata: message.metadata,
    }).catch((err) => console.error("[Realtime] Broadcast error:", err));

    res.status(201).json({
      message: {
        id: message.id,
        conversationId: message.conversation_id,
        senderType: message.sender_type,
        senderId: message.sender_id,
        content: message.content,
        metadata: message.metadata,
        createdAt: message.created_at,
      },
    });
  } catch (error) {
    console.error("Error in POST /conversations/:id/messages:", error);
    res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Internal server error" },
    });
  }
});

// ============================================================================
// Widget Routes (public - uses project API key)
// ============================================================================

/**
 * POST /api/conversations
 * Create a new conversation (from widget)
 * No auth required - uses project API key header
 */
router.post("/", async (req: Request, res: Response) => {
  try {
    // Validate body
    const validation = CreateConversationSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid request body",
          details: validation.error.flatten().fieldErrors,
        },
      });
    }

    const { projectId, visitorId, source, metadata } = validation.data;

    // Verify project exists
    const { data: project, error: projectError } = await supabaseAdmin
      .from("projects")
      .select("id")
      .eq("id", projectId)
      .is("deleted_at", null)
      .single();

    if (projectError || !project) {
      return res.status(404).json({
        error: { code: "PROJECT_NOT_FOUND", message: "Project not found" },
      });
    }

    // Check for existing active conversation with this visitor
    const { data: existingConversation } = await supabaseAdmin
      .from("conversations")
      .select("id, status")
      .eq("project_id", projectId)
      .eq("visitor_id", visitorId)
      .in("status", ["ai_active", "waiting", "agent_active"])
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (existingConversation) {
      // Return existing conversation
      return res.json({
        conversation: {
          id: existingConversation.id,
          status: existingConversation.status,
          isExisting: true,
        },
      });
    }

    // Get or create customer
    let customerId = null;
    const { data: existingCustomer } = await supabaseAdmin
      .from("customers")
      .select("id")
      .eq("project_id", projectId)
      .eq("visitor_id", visitorId)
      .single();

    if (existingCustomer) {
      customerId = existingCustomer.id;
      // Update last seen
      await supabaseAdmin
        .from("customers")
        .update({ last_seen_at: new Date().toISOString() })
        .eq("id", customerId);
    } else {
      // Create new customer
      const { data: newCustomer } = await supabaseAdmin
        .from("customers")
        .insert({
          project_id: projectId,
          visitor_id: visitorId,
          first_seen_at: new Date().toISOString(),
          last_seen_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (newCustomer) {
        customerId = newCustomer.id;
      }
    }

    // Create conversation
    const { data: conversation, error: convError } = await supabaseAdmin
      .from("conversations")
      .insert({
        project_id: projectId,
        visitor_id: visitorId,
        customer_id: customerId,
        source,
        status: "ai_active",
        customer_presence: "online",
        customer_last_seen_at: new Date().toISOString(),
        metadata: metadata || {},
      })
      .select("*")
      .single();

    if (convError) {
      console.error("Error creating conversation:", convError);
      return res.status(500).json({
        error: { code: "CREATE_ERROR", message: "Failed to create conversation" },
      });
    }

    res.status(201).json({
      conversation: {
        id: conversation.id,
        projectId: conversation.project_id,
        visitorId: conversation.visitor_id,
        status: conversation.status,
        source: conversation.source,
        createdAt: conversation.created_at,
        isExisting: false,
      },
    });
  } catch (error) {
    console.error("Error in POST /conversations:", error);
    res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Internal server error" },
    });
  }
});

/**
 * GET /api/conversations/:id/status
 * Get conversation status (for widget - public endpoint)
 * Returns minimal info for widget to understand current state
 */
router.get("/:id/status", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!isValidUUID(id)) {
      return res.status(400).json({
        error: { code: "INVALID_ID", message: "Invalid conversation ID format" },
      });
    }

    // Get conversation with minimal fields
    const { data: conversation, error: convError } = await supabaseAdmin
      .from("conversations")
      .select("id, project_id, status, assigned_agent_id, queue_position, queue_entered_at")
      .eq("id", id)
      .single();

    if (convError || !conversation) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Conversation not found" },
      });
    }

    // Get assigned agent name if applicable (uses project_members.name, falls back to user metadata)
    let assignedAgent = null;
    if (conversation.assigned_agent_id) {
      const agentName = await getAgentName(conversation.assigned_agent_id, conversation.project_id);
      assignedAgent = {
        id: conversation.assigned_agent_id,
        name: agentName,
      };
    }

    // Calculate queue position if waiting
    let queuePosition = null;
    if (conversation.status === "waiting" && conversation.queue_entered_at) {
      const { count } = await supabaseAdmin
        .from("conversations")
        .select("*", { count: "exact", head: true })
        .eq("project_id", conversation.project_id)
        .eq("status", "waiting")
        .lt("queue_entered_at", conversation.queue_entered_at);
      queuePosition = (count || 0) + 1;
    }

    res.json({
      id: conversation.id,
      status: conversation.status,
      assignedAgent,
      queuePosition,
    });
  } catch (error) {
    console.error("Error in GET /conversations/:id/status:", error);
    res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Internal server error" },
    });
  }
});

/**
 * GET /api/conversations/:id/messages/public
 * Get messages for widget (public endpoint)
 * Returns messages with sender info for display
 */
router.get("/:id/messages/public", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const after = req.query.after as string; // ISO timestamp to get new messages

    if (!isValidUUID(id)) {
      return res.status(400).json({
        error: { code: "INVALID_ID", message: "Invalid conversation ID format" },
      });
    }

    // Verify conversation exists and get project_id for agent name lookup
    const { data: conversation, error: convError } = await supabaseAdmin
      .from("conversations")
      .select("id, project_id")
      .eq("id", id)
      .single();

    if (convError || !conversation) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Conversation not found" },
      });
    }

    // Build query
    let query = supabaseAdmin
      .from("messages")
      .select("*")
      .eq("conversation_id", id)
      .order("created_at", { ascending: true });

    if (after) {
      query = query.gt("created_at", after);
    }

    const { data: messages, error: msgError } = await query;

    if (msgError) {
      console.error("Error fetching messages:", msgError);
      return res.status(500).json({
        error: { code: "FETCH_ERROR", message: "Failed to fetch messages" },
      });
    }

    // Get agent names (uses project_members.name, falls back to user metadata)
    const agentIds = [...new Set((messages || []).filter(m => m.sender_type === "agent" && m.sender_id).map(m => m.sender_id))];
    const agentNames = await getAgentNames(agentIds, conversation.project_id);

    // Format messages
    const messagesResponse = (messages || []).map((msg) => ({
      id: msg.id,
      senderType: msg.sender_type,
      senderName: msg.sender_type === "agent" && msg.sender_id ? agentNames[msg.sender_id] : null,
      content: msg.content,
      createdAt: msg.created_at,
    }));

    res.json({
      messages: messagesResponse,
    });
  } catch (error) {
    console.error("Error in GET /conversations/:id/messages/public:", error);
    res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Internal server error" },
    });
  }
});

// ============================================================================
// Typing Indicator Endpoints
// ============================================================================

/**
 * POST /api/conversations/:id/typing
 * Broadcast typing indicator for a conversation
 * Can be called by agents (authenticated) or customers (public with conversation ID)
 */
router.post("/:id/typing", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { isTyping, participantType, participantName } = req.body;

    // Validate conversation ID
    if (!UUID_REGEX.test(id)) {
      return res.status(400).json({
        error: { code: "INVALID_ID", message: "Invalid conversation ID format" },
      });
    }

    // Validate isTyping
    if (typeof isTyping !== "boolean") {
      return res.status(400).json({
        error: { code: "VALIDATION_ERROR", message: "isTyping must be a boolean" },
      });
    }

    // Validate participantType
    const validTypes = ["customer", "agent"];
    if (!participantType || !validTypes.includes(participantType)) {
      return res.status(400).json({
        error: { code: "VALIDATION_ERROR", message: "participantType must be 'customer' or 'agent'" },
      });
    }

    // Verify conversation exists
    const { data: conversation, error: convError } = await supabaseAdmin
      .from("conversations")
      .select("id, status")
      .eq("id", id)
      .single();

    if (convError || !conversation) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Conversation not found" },
      });
    }

    // Broadcast typing indicator (fire-and-forget)
    broadcastTyping(
      id,
      {
        type: participantType as "customer" | "agent",
        name: participantName,
      },
      isTyping
    ).catch((err) => console.error("[Realtime] Typing broadcast error:", err));

    res.json({ success: true });
  } catch (error) {
    console.error("Error in POST /conversations/:id/typing:", error);
    res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Internal server error" },
    });
  }
});

// ============================================================================
// Presence
// ============================================================================

/**
 * POST /api/conversations/:id/presence
 * Update customer presence for a conversation (heartbeat)
 * Public endpoint - called by widget
 */
router.post("/:id/presence", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, visitorId } = req.body;

    // Validate conversation ID
    if (!UUID_REGEX.test(id)) {
      return res.status(400).json({
        error: { code: "INVALID_ID", message: "Invalid conversation ID format" },
      });
    }

    // Validate status
    const validStatuses = ["online", "idle", "offline"];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        error: { code: "VALIDATION_ERROR", message: "status must be 'online', 'idle', or 'offline'" },
      });
    }

    // Verify conversation exists and belongs to this visitor
    const { data: conversation, error: convError } = await supabaseAdmin
      .from("conversations")
      .select("id, visitor_id, project_id, assigned_agent_id")
      .eq("id", id)
      .single();

    if (convError || !conversation) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Conversation not found" },
      });
    }

    // Optionally verify visitor ID matches
    if (visitorId && conversation.visitor_id !== visitorId) {
      return res.status(403).json({
        error: { code: "FORBIDDEN", message: "Visitor ID mismatch" },
      });
    }

    const now = new Date().toISOString();

    // Update presence in database
    const { error: updateError } = await supabaseAdmin
      .from("conversations")
      .update({
        customer_last_seen_at: now,
        customer_presence: status,
      })
      .eq("id", id);

    if (updateError) {
      console.error("[Presence] Update error:", updateError);
    }

    // Broadcast presence update (fire-and-forget)
    broadcastPresenceUpdate(id, {
      customerOnline: status === "online",
      agentOnline: false, // Will be updated by agent presence
      lastSeenAt: now,
    }).catch((err) => console.error("[Realtime] Presence broadcast error:", err));

    res.json({ success: true });
  } catch (error) {
    console.error("Error in POST /conversations/:id/presence:", error);
    res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Internal server error" },
    });
  }
});

/**
 * GET /api/conversations/:id/presence
 * Get current presence status for a conversation
 * Public endpoint - called by widget and dashboard
 */
router.get("/:id/presence", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Validate conversation ID
    if (!UUID_REGEX.test(id)) {
      return res.status(400).json({
        error: { code: "INVALID_ID", message: "Invalid conversation ID format" },
      });
    }

    // Get conversation with presence data
    const { data: conversation, error: convError } = await supabaseAdmin
      .from("conversations")
      .select("id, customer_last_seen_at, customer_presence, assigned_agent_id")
      .eq("id", id)
      .single();

    if (convError || !conversation) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Conversation not found" },
      });
    }

    // Calculate current presence based on last seen
    const customerPresence = getCustomerPresenceStatus(conversation.customer_last_seen_at);

    // Get agent presence if assigned
    let agentPresence = { status: "offline", isActive: false };
    if (conversation.assigned_agent_id) {
      const { data: agent } = await supabaseAdmin
        .from("agent_availability")
        .select("status, last_seen_at")
        .eq("user_id", conversation.assigned_agent_id)
        .single();

      if (agent) {
        agentPresence = {
          status: agent.status || "offline",
          isActive: agent.status === "online",
        };
      }
    }

    res.json({
      customer: {
        status: customerPresence.status,
        lastSeenAt: customerPresence.lastSeenAt,
        isActive: customerPresence.isActive,
      },
      agent: agentPresence,
    });
  } catch (error) {
    console.error("Error in GET /conversations/:id/presence:", error);
    res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Internal server error" },
    });
  }
});

export { router as conversationsRouter };
