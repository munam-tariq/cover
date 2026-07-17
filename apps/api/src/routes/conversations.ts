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

import { INBOX_CONFIG } from "@chatbot/shared/constants";
import { Router, Request, Response } from "express";
import { z } from "zod";

import { supabaseAdmin } from "../lib/supabase";
import { authMiddleware, AuthenticatedRequest } from "../middleware/auth";
import { requirePublicWidgetAccess } from "../middleware/public-widget-gate";
import { requireWidgetSession } from "../middleware/require-widget-session";
import { dispatchToChannel } from "../services/channels/outbound-dispatcher";
import {
  getInboxConversationPage,
  type InboxStatus,
} from "../services/inbox-list";
import {
  buildMessageCursorFilter,
  pageDescendingMessages,
} from "../services/message-pagination";
import { getCustomerPresenceStatus } from "../services/presence";
import {
  broadcastNewMessage,
  broadcastTyping,
  broadcastPresenceUpdate,
} from "../services/realtime";
import {
  isRealtimePrivateEnabled,
  buildRealtimeTokenResponse,
} from "../services/realtime-jwt";
import {
  issueWidgetSessionToken,
  verifyWidgetSessionToken,
} from "../services/widget-session-token";

const router = Router();

// ============================================================================
// Validation Schemas
// ============================================================================

const CreateConversationSchema = z.object({
  projectId: z.string().uuid("Invalid project ID"),
  visitorId: z.string().min(1).max(100),
  source: z
    .enum(["widget", "playground", "mcp", "api", "voice", "public", "mobile"])
    .default("widget"),
  metadata: z.record(z.unknown()).optional(),
});

const SendMessageSchema = z.object({
  content: z.string().min(1).max(10000),
  senderType: z.enum(["customer", "agent"]),
  metadata: z.record(z.unknown()).optional(),
});

// Mirrors the conversations_satisfaction_rating_check DB constraint, so an out-of-range rating is
// a clean 400 rather than a constraint violation surfacing as a 500.
const SubmitCsatSchema = z.object({
  rating: z.number().int().min(1).max(5),
  feedback: z.string().trim().max(1000).optional(),
});

const UpdateConversationSchema = z.object({
  customerEmail: z.string().email().optional(),
  customerName: z.string().max(100).optional(),
  customerPresence: z.enum(["online", "idle", "offline", "typing"]).optional(),
  metadata: z.record(z.unknown()).optional(),
});

const OptionalQueryBooleanSchema = z
  .enum(["true", "false"])
  .optional()
  .transform((value) => value === "true");

const InboxListQuerySchema = z.object({
  projectId: z.string().uuid("Invalid project ID"),
  scope: z.enum(["mine", "all"]).default("mine"),
  status: z.enum(INBOX_CONFIG.STATUS_VALUES).default("active"),
  source: z.enum(INBOX_CONFIG.SOURCE_VALUES).optional(),
  sort: z.enum(INBOX_CONFIG.SORT_VALUES).default("attention"),
  needsReply: OptionalQueryBooleanSchema,
  voiceUsed: OptionalQueryBooleanSchema,
  assignedAgent: z
    .union([z.string().uuid(), z.enum(["unassigned", "me"])])
    .optional(),
  handoffReason: z.enum(INBOX_CONFIG.HANDOFF_REASON_VALUES).optional(),
  activityPeriod: z.enum(INBOX_CONFIG.ACTIVITY_PERIOD_VALUES).optional(),
  flagged: OptionalQueryBooleanSchema,
  page: z.coerce.number().int().min(1).max(INBOX_CONFIG.MAX_PAGE).default(1),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(INBOX_CONFIG.MAX_PAGE_SIZE)
    .default(INBOX_CONFIG.DEFAULT_PAGE_SIZE),
});

const TERMINAL_INBOX_STATUSES = new Set<InboxStatus>([
  "resolved",
  "closed",
  "auto_closed",
]);

const ListMessagesSchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(100).default(50),
    before: z.string().uuid().optional(),
    after: z.string().datetime({ offset: true }).optional(),
    afterId: z.string().uuid().optional(),
  })
  .refine(({ before, after }) => !(before && after), {
    message: "before and after cannot be combined",
  })
  .refine(({ after, afterId }) => !afterId || Boolean(after), {
    message: "afterId requires after",
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
 * Get agent display name - prioritizes stored name in project_members,
 * falls back to user metadata, then email
 */
async function getAgentName(
  userId: string,
  projectId?: string
): Promise<string> {
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
  const { data: agentUser } =
    await supabaseAdmin.auth.admin.getUserById(userId);
  if (agentUser?.user) {
    return (
      agentUser.user.user_metadata?.name ||
      agentUser.user.email?.split("@")[0] ||
      "Agent"
    );
  }

  return "Agent";
}

/**
 * Get multiple agent names at once for efficiency
 */
async function getAgentNames(
  agentIds: string[],
  projectId: string
): Promise<Record<string, string>> {
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

  // Do not turn a list page into one Auth Admin request per missing name. Project-member names are
  // the dashboard's stored display-name source; rows without one get a stable generic fallback.
  for (const agentId of agentIds) names[agentId] ??= "Agent";

  return names;
}

interface InboxCustomerRow {
  id: string;
  email: string | null;
  name: string | null;
  phone: string | null;
  is_flagged: boolean;
}

interface InboxConversationRow {
  id: string;
  visitor_id: string;
  customer_email: string | null;
  customer_name: string | null;
  status: "ai_active" | "waiting" | "agent_active" | "resolved" | "closed";
  customer_presence: string | null;
  assigned_agent_id: string | null;
  handoff_reason: string | null;
  source: string;
  message_count: number;
  created_at: string;
  updated_at: string;
  last_conversation_message_at: string | null;
  last_conversation_preview: string | null;
  last_conversation_sender_type: string | null;
  last_voice_activity_at: string | null;
  meaningful_activity_at: string;
  needs_reply: boolean;
  queue_entered_at: string | null;
  claimed_at: string | null;
  resolved_at: string | null;
  metadata: Record<string, unknown> | null;
  voice_ended_reason: string | null;
  customers: InboxCustomerRow | InboxCustomerRow[] | null;
}

type InboxOrderItem = Awaited<
  ReturnType<typeof getInboxConversationPage>
>["items"][number];

function formatInboxConversation(
  conv: InboxConversationRow,
  orderItem: InboxOrderItem,
  agentNames: Record<string, string>
) {
  const customer = Array.isArray(conv.customers)
    ? conv.customers[0]
    : conv.customers;
  const hasLastMessage =
    conv.last_conversation_preview != null &&
    conv.last_conversation_sender_type != null &&
    conv.last_conversation_message_at != null;

  return {
    id: conv.id,
    visitorId: conv.visitor_id,
    customerEmail: customer?.email ?? conv.customer_email ?? null,
    customerName: customer?.name ?? conv.customer_name ?? null,
    customerPhone: customer?.phone ?? null,
    customer: customer
      ? {
          id: customer.id,
          email: customer.email,
          name: customer.name,
          phone: customer.phone,
          isFlagged: customer.is_flagged,
        }
      : conv.customer_email || conv.customer_name
        ? {
            email: conv.customer_email,
            name: conv.customer_name,
            phone: null,
            isFlagged: false,
          }
        : null,
    status: conv.status,
    customerPresence: conv.customer_presence,
    assignedAgent: conv.assigned_agent_id
      ? {
          id: conv.assigned_agent_id,
          name: agentNames[conv.assigned_agent_id] ?? "Agent",
        }
      : null,
    handoffReason: conv.handoff_reason,
    source: conv.source,
    messageCount: conv.message_count,
    createdAt: conv.created_at,
    updatedAt: conv.updated_at,
    lastMessageAt: conv.last_conversation_message_at,
    queueEnteredAt: conv.queue_entered_at,
    claimedAt: conv.claimed_at,
    resolvedAt: conv.resolved_at,
    lastMessage: hasLastMessage
      ? {
          content: conv.last_conversation_preview,
          senderType: conv.last_conversation_sender_type,
          createdAt: conv.last_conversation_message_at,
        }
      : null,
    closeReason: conv.metadata?.close_reason ?? null,
    needsReply: conv.needs_reply,
    meaningfulActivityAt: conv.meaningful_activity_at,
    hasVoiceActivity:
      conv.last_voice_activity_at != null || conv.voice_ended_reason != null,
    priorityReason: orderItem.priority_reason,
    priorityAt: orderItem.priority_at,
  };
}

async function getMessageCursor(conversationId: string, messageId: string) {
  const { data, error } = await supabaseAdmin
    .from("messages")
    .select("id, created_at")
    .eq("conversation_id", conversationId)
    .eq("id", messageId)
    .maybeSingle();

  return error ? null : data;
}

// ============================================================================
// Dashboard Routes (authenticated)
// ============================================================================

/**
 * GET /api/conversations
 * List conversations for dashboard
 * Query params: project, scope, status, sort, filters, and pagination
 */
router.get("/", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { userId } = req as AuthenticatedRequest;

    if (!userId) {
      return res.status(401).json({
        error: { code: "UNAUTHORIZED", message: "User not authenticated" },
      });
    }

    const validation = InboxListQuerySchema.safeParse(req.query);
    if (!validation.success) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid query parameters",
          details: validation.error.flatten().fieldErrors,
        },
      });
    }

    const {
      projectId,
      scope,
      status,
      source,
      sort,
      needsReply,
      voiceUsed,
      assignedAgent,
      handoffReason,
      activityPeriod,
      flagged,
      page,
      limit,
    } = validation.data;

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

    if (!isOwner && scope === "all" && status !== "waiting") {
      return res.status(403).json({
        error: {
          code: "FORBIDDEN",
          message: "Members can only view their assigned conversations",
        },
      });
    }

    if (!isOwner && assignedAgent) {
      return res.status(403).json({
        error: {
          code: "FORBIDDEN",
          message: "Assigned-agent filtering is owner-only",
        },
      });
    }

    if (isOwner && assignedAgent && (scope !== "all" || status === "waiting")) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Assigned-agent filtering requires the All scope",
        },
      });
    }

    if (needsReply && status !== "agent_active") {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Needs reply requires the Agent active status",
        },
      });
    }

    const effectiveScope = status === "waiting" ? "all" : scope;
    const effectiveSort = TERMINAL_INBOX_STATUSES.has(status) ? "recent" : sort;
    const orderPage = await getInboxConversationPage(
      {
        projectId,
        viewerId: userId,
        scope: effectiveScope,
        status,
        source,
        sort: effectiveSort,
        needsReply,
        voiceUsed,
        assignedAgent,
        handoffReason,
        activityPeriod,
        flaggedOnly: flagged,
        page,
        limit,
      },
      (args) => supabaseAdmin.rpc("get_inbox_conversation_page", args)
    );

    if (orderPage.items.length === 0) {
      return res.json({
        conversations: [],
        pagination: {
          page,
          limit,
          total: orderPage.total,
          totalPages: Math.ceil(orderPage.total / limit),
        },
        isOwner,
      });
    }

    const conversationIds = orderPage.items.map(
      ({ conversation_id }) => conversation_id
    );
    const { data: conversationData, error: convError } = await supabaseAdmin
      .from("conversations")
      .select(
        "id, visitor_id, customer_email, customer_name, status, customer_presence, assigned_agent_id, handoff_reason, source, message_count, created_at, updated_at, queue_entered_at, claimed_at, resolved_at, last_conversation_message_at, last_conversation_preview, last_conversation_sender_type, last_voice_activity_at, meaningful_activity_at, needs_reply, metadata, voice_ended_reason, customers(id, email, name, phone, is_flagged)"
      )
      .eq("project_id", projectId)
      .in("id", conversationIds);

    if (convError) {
      console.error("Error fetching conversations:", convError);
      return res.status(500).json({
        error: {
          code: "FETCH_ERROR",
          message: "Failed to fetch conversations",
        },
      });
    }

    const conversations = (conversationData ?? []) as InboxConversationRow[];
    const conversationById = new Map(
      conversations.map((conversation) => [conversation.id, conversation])
    );
    const agentIds = [
      ...new Set(
        conversations
          .filter((c) => c.assigned_agent_id)
          .map((c) => c.assigned_agent_id as string)
      ),
    ];
    const agentNames = await getAgentNames(agentIds, projectId);
    const conversationsResponse = orderPage.items.flatMap((orderItem) => {
      const conversation = conversationById.get(orderItem.conversation_id);
      return conversation
        ? [formatInboxConversation(conversation, orderItem, agentNames)]
        : [];
    });

    res.json({
      conversations: conversationsResponse,
      pagination: {
        page,
        limit,
        total: orderPage.total,
        totalPages: Math.ceil(orderPage.total / limit),
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
        error: {
          code: "INVALID_ID",
          message: "Invalid conversation ID format",
        },
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

    type VoiceMetricsRow = {
      voice_call_count: number | string | null;
      voice_talk_seconds: number | string | null;
    };
    const { data: voiceMetricsData, error: voiceMetricsError } =
      await supabaseAdmin
        .rpc("get_voice_metrics", {
          p_project_id: conversation.project_id,
          p_start: null,
          p_end: null,
          p_source: null,
          p_conversation_id: conversation.id,
        })
        .single();
    if (voiceMetricsError) {
      console.error(
        "Error fetching conversation voice metrics:",
        voiceMetricsError
      );
      return res.status(500).json({
        error: {
          code: "FETCH_ERROR",
          message: "Failed to fetch conversation metrics",
        },
      });
    }
    const voiceMetrics = voiceMetricsData as VoiceMetricsRow | null;

    // Get assigned agent info (uses project_members.name, falls back to user metadata)
    let assignedAgent = null;
    if (conversation.assigned_agent_id) {
      const agentName = await getAgentName(
        conversation.assigned_agent_id,
        conversation.project_id
      );
      const { data: agentUser } = await supabaseAdmin.auth.admin.getUserById(
        conversation.assigned_agent_id
      );
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
        customerEmail: conversation.customers?.email ?? null,
        customerName: conversation.customers?.name ?? null,
        customerPhone: conversation.customers?.phone ?? null,
        customer: conversation.customers
          ? {
              id: conversation.customers.id,
              email: conversation.customers.email,
              name: conversation.customers.name,
              phone: conversation.customers.phone,
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
        // Why an auto-close reads differently from a manual one in the inbox.
        closeReason:
          (conversation.metadata as Record<string, unknown> | null)
            ?.close_reason ?? null,
        // A conversation is hybrid text+voice, so this means "has had a call", not "is a call".
        hasVoiceActivity: conversation.voice_ended_reason != null,
        voiceCallCount: Number(voiceMetrics?.voice_call_count ?? 0),
        voiceTalkSeconds: Number(voiceMetrics?.voice_talk_seconds ?? 0),
        voiceEndedReason: conversation.voice_ended_reason || null,
        // NOTE: only the LAST call's duration — session-end overwrites it per call. Per-call figures
        // come from messages tagged metadata.voice_summary.
        lastVoiceDurationSeconds: conversation.voice_duration_seconds || null,
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
        error: {
          code: "INVALID_ID",
          message: "Invalid conversation ID format",
        },
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
    const { customerEmail, customerName, customerPresence, metadata } =
      validation.data;

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
        error: {
          code: "UPDATE_ERROR",
          message: "Failed to update conversation",
        },
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
router.get(
  "/:id/messages",
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

      const validation = ListMessagesSchema.safeParse(req.query);
      if (!validation.success) {
        return res.status(400).json({
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid message pagination",
            details: validation.error.flatten().fieldErrors,
          },
        });
      }
      const { limit, before, after, afterId } = validation.data;

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
        .select(
          "id, conversation_id, sender_type, sender_id, content, metadata, created_at",
          { count: "exact" }
        )
        .eq("conversation_id", id)
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .limit(limit + 1);

      if (before) {
        const cursor = await getMessageCursor(id, before);
        if (!cursor) {
          return res.status(400).json({
            error: {
              code: "INVALID_CURSOR",
              message: "Invalid message cursor",
            },
          });
        }
        query = query.or(
          buildMessageCursorFilter("before", cursor.created_at, cursor.id)
        );
      } else if (afterId) {
        const cursor = await getMessageCursor(id, afterId);
        if (!cursor) {
          return res.status(400).json({
            error: {
              code: "INVALID_CURSOR",
              message: "Invalid message cursor",
            },
          });
        }
        query = query.or(
          buildMessageCursorFilter("after", cursor.created_at, cursor.id)
        );
      } else if (after) {
        query = query.gt("created_at", after);
      }

      const { data: messages, error: msgError, count } = await query;

      if (msgError) {
        console.error("Error fetching messages:", msgError);
        return res.status(500).json({
          error: { code: "FETCH_ERROR", message: "Failed to fetch messages" },
        });
      }

      const page = pageDescendingMessages(messages || [], limit);

      // Get sender names for agent messages (uses project_members.name, falls back to user metadata)
      const agentIds = [
        ...new Set(
          page.messages
            .filter((m) => m.sender_type === "agent" && m.sender_id)
            .map((m) => m.sender_id)
        ),
      ];
      const agentNames = await getAgentNames(agentIds, conversation.project_id);

      const messagesResponse = page.messages.map((msg) => ({
        id: msg.id,
        conversationId: msg.conversation_id,
        senderType: msg.sender_type,
        senderId: msg.sender_id,
        senderName:
          msg.sender_type === "agent" && msg.sender_id
            ? agentNames[msg.sender_id]
            : null,
        content: msg.content,
        metadata: msg.metadata,
        createdAt: msg.created_at,
      }));

      res.json({
        messages: messagesResponse,
        pagination: {
          total: count || 0,
          limit,
          hasMore: page.hasMore,
          nextCursor: page.nextCursor,
        },
      });
    } catch (error) {
      console.error("Error in GET /conversations/:id/messages:", error);
      res.status(500).json({
        error: { code: "INTERNAL_ERROR", message: "Internal server error" },
      });
    }
  }
);

/**
 * POST /api/conversations/:id/messages
 * Send a message to a conversation (agent sending)
 */
router.post(
  "/:id/messages",
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
        .select(
          "id, project_id, status, assigned_agent_id, first_response_at, source, visitor_id"
        )
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
            error: {
              code: "INVALID_STATUS",
              message: "Conversation is not in agent_active status",
            },
          });
        }

        if (conversation.assigned_agent_id !== userId) {
          return res.status(403).json({
            error: {
              code: "NOT_ASSIGNED",
              message: "You are not assigned to this conversation",
            },
          });
        }
      }

      // WhatsApp: validate 24h service window before insert/broadcast.
      // dispatchToChannel re-derives the window itself, so a single call
      // covers both the "reject before send" check and the actual send —
      // no separate canSendFreeForm pre-check/DB round-trip needed.
      if (conversation.source === "whatsapp" && senderType === "agent") {
        const dispatchResult = await dispatchToChannel(id, content);
        if (!dispatchResult.ok) {
          const status = dispatchResult.reason === "WINDOW_CLOSED" ? 409 : 502;
          return res.status(status).json({
            error: {
              code: dispatchResult.reason,
              message:
                dispatchResult.reason === "WINDOW_CLOSED"
                  ? "The WhatsApp 24-hour service window is closed. Re-engagement templates are not available in v1."
                  : "Failed to deliver the WhatsApp message.",
            },
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
  }
);

// ============================================================================
// Widget Routes (public - uses project API key)
// ============================================================================

/**
 * POST /api/conversations
 * Create a new conversation (from widget)
 * No auth required - uses project API key header
 */
router.post(
  "/",
  requirePublicWidgetAccess({
    action: "conversation-create",
    projectIdSource: "body",
  }),
  async (req: Request, res: Response) => {
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
          sessionToken: issueWidgetSessionToken({
            projectId,
            visitorId,
            conversationId: existingConversation.id,
          }),
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
          error: {
            code: "CREATE_ERROR",
            message: "Failed to create conversation",
          },
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
        sessionToken: issueWidgetSessionToken({
          projectId: conversation.project_id,
          visitorId: conversation.visitor_id,
          conversationId: conversation.id,
        }),
      });
    } catch (error) {
      console.error("Error in POST /conversations:", error);
      res.status(500).json({
        error: { code: "INTERNAL_ERROR", message: "Internal server error" },
      });
    }
  }
);

/**
 * GET /api/conversations/:id/status
 * Get conversation status (for widget - public endpoint)
 * Returns minimal info for widget to understand current state
 */
router.get(
  "/:id/status",
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

      // Get conversation with minimal fields
      const { data: conversation, error: convError } = await supabaseAdmin
        .from("conversations")
        .select(
          "id, project_id, status, assigned_agent_id, queue_position, queue_entered_at, satisfaction_rating"
        )
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
        const agentName = await getAgentName(
          conversation.assigned_agent_id,
          conversation.project_id
        );
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
        satisfactionRating: conversation.satisfaction_rating,
      });
    } catch (error) {
      console.error("Error in GET /conversations/:id/status:", error);
      res.status(500).json({
        error: { code: "INTERNAL_ERROR", message: "Internal server error" },
      });
    }
  }
);

/**
 * GET /api/conversations/:id/messages/public
 * Get messages for widget (public endpoint)
 * Returns messages with sender info for display
 */
router.get(
  "/:id/messages/public",
  requireWidgetSession(),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const after = req.query.after as string; // ISO timestamp to get new messages

      if (!isValidUUID(id)) {
        return res.status(400).json({
          error: {
            code: "INVALID_ID",
            message: "Invalid conversation ID format",
          },
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
      const agentIds = [
        ...new Set(
          (messages || [])
            .filter((m) => m.sender_type === "agent" && m.sender_id)
            .map((m) => m.sender_id)
        ),
      ];
      const agentNames = await getAgentNames(agentIds, conversation.project_id);

      // Format messages
      const messagesResponse = (messages || []).map((msg) => ({
        id: msg.id,
        senderType: msg.sender_type,
        senderName:
          msg.sender_type === "agent" && msg.sender_id
            ? agentNames[msg.sender_id]
            : null,
        content: msg.content,
        createdAt: msg.created_at,
        metadata: msg.metadata ?? null,
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
  }
);

/**
 * POST /api/conversations/:id/csat
 *
 * Record the customer's satisfaction rating for the conversation (service quality, 1–5). Distinct
 * from message_feedback, which rates a single AI answer.
 *
 * Gated fail-closed: this is a service-role write on a caller-named conversation, so the gate's
 * default monitor mode would leave a cross-tenant write wide open.
 */
router.post(
  "/:id/csat",
  requireWidgetSession({ enforce: true }),
  async (req: Request, res: Response) => {
    const { id } = req.params;

    if (!isValidUUID(id)) {
      return res.status(400).json({
        error: {
          code: "INVALID_ID",
          message: "Invalid conversation ID format",
        },
      });
    }

    const parsed = SubmitCsatSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: parsed.error.errors[0]?.message ?? "Invalid rating",
        },
      });
    }

    try {
      // UPDATE, never upsert — the columns live on the conversation row, there is nothing to
      // insert. Deliberately not gated on status: the customer rates *as* the chat closes, so by
      // the time this lands the cron has usually already closed it.
      //
      // Only the satisfaction_* columns are touched. A rating means "I'm finished", not "I'm still
      // here" — writing any activity column here would reset the countdown the warning just
      // started and make the conversation immortal.
      const update: {
        satisfaction_rating: number;
        satisfaction_feedback?: string;
      } = { satisfaction_rating: parsed.data.rating };
      // Absent feedback on a re-rate must not wipe text the customer already left.
      if (parsed.data.feedback !== undefined) {
        update.satisfaction_feedback = parsed.data.feedback;
      }

      const { data, error } = await supabaseAdmin
        .from("conversations")
        .update(update)
        .eq("id", id)
        .select("id")
        .maybeSingle();

      if (error) {
        console.error("Error saving CSAT:", error);
        return res.status(500).json({
          error: { code: "UPDATE_ERROR", message: "Failed to save rating" },
        });
      }

      if (!data) {
        return res.status(404).json({
          error: { code: "NOT_FOUND", message: "Conversation not found" },
        });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error in POST /conversations/:id/csat:", error);
      res.status(500).json({
        error: { code: "INTERNAL_ERROR", message: "Internal server error" },
      });
    }
  }
);

/**
 * POST /api/conversations/:id/realtime-token
 * Issue a short-lived Supabase JWT for private Realtime channel subscription.
 * Gated by REALTIME_PRIVATE_ENABLED feature flag and requireWidgetSession.
 */
router.post(
  "/:id/realtime-token",
  requireWidgetSession(),
  async (req: Request, res: Response) => {
    if (!isRealtimePrivateEnabled()) {
      return res.status(404).json({
        error: {
          code: "NOT_AVAILABLE",
          message: "Private realtime not enabled",
        },
      });
    }

    const { id } = req.params;

    if (!isValidUUID(id)) {
      return res.status(400).json({
        error: {
          code: "INVALID_ID",
          message: "Invalid conversation ID format",
        },
      });
    }

    try {
      // Always enforce session ownership — never honour monitor mode for token issuance.
      const raw = req.headers["x-frontface-session"];
      const sessionToken =
        typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : undefined;
      let sessionClaims;
      try {
        sessionClaims = verifyWidgetSessionToken(sessionToken);
      } catch {
        return res.status(403).json({
          error: {
            code: "SESSION_INVALID",
            message: "Valid widget session required",
          },
        });
      }
      if (sessionClaims.conversationId !== id) {
        return res.status(403).json({
          error: {
            code: "FORBIDDEN",
            message: "Session not authorized for this conversation",
          },
        });
      }

      const { data: conversation, error: convError } = await supabaseAdmin
        .from("conversations")
        .select("id, project_id, visitor_id")
        .eq("id", id)
        .eq("project_id", sessionClaims.projectId)
        .eq("visitor_id", sessionClaims.visitorId)
        .single();

      if (convError || !conversation) {
        return res.status(403).json({
          error: {
            code: "FORBIDDEN",
            message: "Session not authorized for this conversation",
          },
        });
      }

      if (
        sessionClaims.conversationId !== id ||
        sessionClaims.visitorId !== conversation.visitor_id ||
        sessionClaims.projectId !== conversation.project_id
      ) {
        return res.status(403).json({
          error: {
            code: "FORBIDDEN",
            message: "Session not authorized for this conversation",
          },
        });
      }

      const result = buildRealtimeTokenResponse({
        conversationId: id,
        projectId: conversation.project_id,
        visitorId: conversation.visitor_id,
      });

      if (!result) {
        return res.status(503).json({
          error: {
            code: "TOKEN_UNAVAILABLE",
            message: "Could not issue realtime token",
          },
        });
      }

      res.json(result);
    } catch (error) {
      console.error("Error in POST /conversations/:id/realtime-token:", error);
      res.status(500).json({
        error: { code: "INTERNAL_ERROR", message: "Internal server error" },
      });
    }
  }
);

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
        error: {
          code: "INVALID_ID",
          message: "Invalid conversation ID format",
        },
      });
    }

    // Validate isTyping
    if (typeof isTyping !== "boolean") {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "isTyping must be a boolean",
        },
      });
    }

    // Validate participantType
    const validTypes = ["customer", "agent"];
    if (!participantType || !validTypes.includes(participantType)) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "participantType must be 'customer' or 'agent'",
        },
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
        error: {
          code: "INVALID_ID",
          message: "Invalid conversation ID format",
        },
      });
    }

    // Validate status
    const validStatuses = ["online", "idle", "offline"];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "status must be 'online', 'idle', or 'offline'",
        },
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
    }).catch((err) =>
      console.error("[Realtime] Presence broadcast error:", err)
    );

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
        error: {
          code: "INVALID_ID",
          message: "Invalid conversation ID format",
        },
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
    const customerPresence = getCustomerPresenceStatus(
      conversation.customer_last_seen_at
    );

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
