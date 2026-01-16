/**
 * Presence Service
 *
 * Handles presence tracking for customers and agents.
 * - Customer presence: Tracks if customer is actively in conversation
 * - Agent presence: Tracks agent availability status via heartbeats
 *
 * Thresholds:
 * - Customer considered "away" after 2 minutes of inactivity
 * - Customer considered "offline" after 5 minutes of inactivity
 * - Agent auto-set to "away" after 15 minutes without heartbeat
 * - Agent auto-set to "offline" after 30 minutes without heartbeat
 */

import { supabaseAdmin } from "../lib/supabase";
import { broadcastPresenceUpdate, broadcastAgentStatusChanged } from "./realtime";

// ============================================================================
// Constants
// ============================================================================

// Customer presence thresholds (in milliseconds)
export const CUSTOMER_AWAY_THRESHOLD_MS = 2 * 60 * 1000; // 2 minutes
export const CUSTOMER_OFFLINE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

// Agent presence thresholds (in milliseconds)
export const AGENT_AWAY_THRESHOLD_MS = 15 * 60 * 1000; // 15 minutes
export const AGENT_OFFLINE_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes

// Auto-close threshold for inactive conversations
export const CONVERSATION_AUTO_CLOSE_THRESHOLD_MS = 24 * 60 * 60 * 1000; // 24 hours

// ============================================================================
// Types
// ============================================================================

export type CustomerPresenceStatus = "online" | "away" | "offline";
export type AgentPresenceStatus = "online" | "away" | "offline";

export interface PresenceInfo {
  status: CustomerPresenceStatus | AgentPresenceStatus;
  lastSeenAt: string;
  isActive: boolean;
}

// ============================================================================
// Customer Presence
// ============================================================================

/**
 * Update customer presence for a conversation
 * Called when customer sends a message or heartbeat
 */
export async function updateCustomerPresence(
  conversationId: string
): Promise<void> {
  try {
    const now = new Date().toISOString();

    // Update conversation's customer last seen
    await supabaseAdmin
      .from("conversations")
      .update({
        customer_last_seen_at: now,
        customer_presence: "online",
      })
      .eq("id", conversationId);

    // Broadcast presence update
    await broadcastPresenceUpdate(conversationId, {
      customerOnline: true,
      agentOnline: false, // Will be updated separately
      lastSeenAt: now,
    });
  } catch (error) {
    console.error("[Presence] Failed to update customer presence:", error);
  }
}

/**
 * Get customer presence status based on last activity
 */
export function getCustomerPresenceStatus(lastSeenAt: string | null): PresenceInfo {
  if (!lastSeenAt) {
    return {
      status: "offline",
      lastSeenAt: "",
      isActive: false,
    };
  }

  const lastSeen = new Date(lastSeenAt).getTime();
  const now = Date.now();
  const elapsed = now - lastSeen;

  if (elapsed < CUSTOMER_AWAY_THRESHOLD_MS) {
    return {
      status: "online",
      lastSeenAt,
      isActive: true,
    };
  } else if (elapsed < CUSTOMER_OFFLINE_THRESHOLD_MS) {
    return {
      status: "away",
      lastSeenAt,
      isActive: true,
    };
  } else {
    return {
      status: "offline",
      lastSeenAt,
      isActive: false,
    };
  }
}

/**
 * Check and update customer presence status for a conversation
 * Returns true if the customer is considered abandoned (offline for too long)
 */
export async function checkCustomerPresence(
  conversationId: string
): Promise<{ status: CustomerPresenceStatus; abandoned: boolean }> {
  try {
    const { data: conversation } = await supabaseAdmin
      .from("conversations")
      .select("customer_last_seen_at, customer_presence, status")
      .eq("id", conversationId)
      .single();

    if (!conversation) {
      return { status: "offline", abandoned: false };
    }

    const presence = getCustomerPresenceStatus(conversation.customer_last_seen_at);

    // Update presence if changed
    if (presence.status !== conversation.customer_presence) {
      await supabaseAdmin
        .from("conversations")
        .update({ customer_presence: presence.status })
        .eq("id", conversationId);
    }

    // Check if conversation should be considered abandoned
    // Only for active conversations (ai_active, waiting, agent_active)
    const activeStatuses = ["ai_active", "waiting", "agent_active"];
    const lastSeen = conversation.customer_last_seen_at
      ? new Date(conversation.customer_last_seen_at).getTime()
      : 0;
    const elapsed = Date.now() - lastSeen;

    const abandoned =
      activeStatuses.includes(conversation.status) &&
      elapsed > CONVERSATION_AUTO_CLOSE_THRESHOLD_MS;

    return { status: presence.status, abandoned };
  } catch (error) {
    console.error("[Presence] Failed to check customer presence:", error);
    return { status: "offline", abandoned: false };
  }
}

// ============================================================================
// Agent Presence
// ============================================================================

/**
 * Update agent presence via heartbeat
 * Called from the agent heartbeat endpoint
 */
export async function updateAgentPresence(
  userId: string,
  projectId: string
): Promise<PresenceInfo> {
  try {
    const now = new Date().toISOString();

    const { data: availability, error } = await supabaseAdmin
      .from("agent_availability")
      .update({ last_seen_at: now })
      .eq("user_id", userId)
      .eq("project_id", projectId)
      .select("status, current_chat_count, max_concurrent_chats")
      .single();

    if (error || !availability) {
      return {
        status: "offline",
        lastSeenAt: now,
        isActive: false,
      };
    }

    return {
      status: availability.status as AgentPresenceStatus,
      lastSeenAt: now,
      isActive: availability.status === "online",
    };
  } catch (error) {
    console.error("[Presence] Failed to update agent presence:", error);
    return {
      status: "offline",
      lastSeenAt: new Date().toISOString(),
      isActive: false,
    };
  }
}

/**
 * Get agent presence status based on last activity
 */
export function getAgentPresenceStatus(
  lastSeenAt: string | null,
  currentStatus: string
): PresenceInfo {
  if (!lastSeenAt || currentStatus === "offline") {
    return {
      status: "offline",
      lastSeenAt: lastSeenAt || "",
      isActive: false,
    };
  }

  const lastSeen = new Date(lastSeenAt).getTime();
  const now = Date.now();
  const elapsed = now - lastSeen;

  if (elapsed < AGENT_AWAY_THRESHOLD_MS) {
    return {
      status: currentStatus as AgentPresenceStatus,
      lastSeenAt,
      isActive: currentStatus === "online",
    };
  } else if (elapsed < AGENT_OFFLINE_THRESHOLD_MS) {
    return {
      status: "away",
      lastSeenAt,
      isActive: false,
    };
  } else {
    return {
      status: "offline",
      lastSeenAt,
      isActive: false,
    };
  }
}

/**
 * Check and auto-update agent statuses based on heartbeat
 * This is typically called by a cron job
 */
export async function checkAndUpdateAgentStatuses(): Promise<{
  updated: number;
  details: Array<{ userId: string; projectId: string; newStatus: string }>;
}> {
  const results: Array<{ userId: string; projectId: string; newStatus: string }> = [];

  try {
    // Get all agents who are not offline
    const { data: activeAgents } = await supabaseAdmin
      .from("agent_availability")
      .select("user_id, project_id, status, last_seen_at")
      .neq("status", "offline");

    if (!activeAgents || activeAgents.length === 0) {
      return { updated: 0, details: [] };
    }

    const now = Date.now();

    for (const agent of activeAgents) {
      const lastSeen = agent.last_seen_at
        ? new Date(agent.last_seen_at).getTime()
        : 0;
      const elapsed = now - lastSeen;

      let newStatus: AgentPresenceStatus | null = null;

      // Check if should go offline
      if (elapsed > AGENT_OFFLINE_THRESHOLD_MS && agent.status !== "offline") {
        newStatus = "offline";
      }
      // Check if should go away
      else if (
        elapsed > AGENT_AWAY_THRESHOLD_MS &&
        agent.status === "online"
      ) {
        newStatus = "away";
      }

      if (newStatus) {
        // Update status
        await supabaseAdmin
          .from("agent_availability")
          .update({
            status: newStatus,
            status_changed_at: new Date().toISOString(),
            // Reset chat count when going offline
            current_chat_count: newStatus === "offline" ? 0 : undefined,
          })
          .eq("user_id", agent.user_id)
          .eq("project_id", agent.project_id);

        // Broadcast status change
        await broadcastAgentStatusChanged(
          agent.project_id,
          agent.user_id,
          newStatus
        );

        results.push({
          userId: agent.user_id,
          projectId: agent.project_id,
          newStatus,
        });
      }
    }

    return { updated: results.length, details: results };
  } catch (error) {
    console.error("[Presence] Failed to check agent statuses:", error);
    return { updated: 0, details: [] };
  }
}

// ============================================================================
// Conversation Cleanup
// ============================================================================

/**
 * Find and close abandoned conversations
 * This is typically called by a cron job
 */
export async function closeAbandonedConversations(): Promise<{
  closed: number;
  conversations: string[];
}> {
  const closedConversations: string[] = [];

  try {
    const threshold = new Date(
      Date.now() - CONVERSATION_AUTO_CLOSE_THRESHOLD_MS
    ).toISOString();

    // Find abandoned conversations
    const { data: abandoned } = await supabaseAdmin
      .from("conversations")
      .select("id, project_id")
      .in("status", ["ai_active", "waiting", "agent_active"])
      .lt("customer_last_seen_at", threshold);

    if (!abandoned || abandoned.length === 0) {
      return { closed: 0, conversations: [] };
    }

    // Close each abandoned conversation
    for (const conv of abandoned) {
      await supabaseAdmin
        .from("conversations")
        .update({
          status: "closed",
          resolved_at: new Date().toISOString(),
          assigned_agent_id: null,
        })
        .eq("id", conv.id);

      // Add system message
      await supabaseAdmin.from("messages").insert({
        conversation_id: conv.id,
        sender_type: "system",
        content: "This conversation was automatically closed due to inactivity.",
        metadata: { event: "auto_closed", reason: "customer_abandoned" },
      });

      closedConversations.push(conv.id);
    }

    return { closed: closedConversations.length, conversations: closedConversations };
  } catch (error) {
    console.error("[Presence] Failed to close abandoned conversations:", error);
    return { closed: 0, conversations: [] };
  }
}

// ============================================================================
// Batch Presence Check
// ============================================================================

/**
 * Get presence status for multiple conversations at once
 * Useful for displaying presence in conversation lists
 */
export async function batchGetPresence(
  conversationIds: string[]
): Promise<
  Map<string, { customerPresence: CustomerPresenceStatus; agentOnline: boolean }>
> {
  const result = new Map<
    string,
    { customerPresence: CustomerPresenceStatus; agentOnline: boolean }
  >();

  if (conversationIds.length === 0) {
    return result;
  }

  try {
    const { data: conversations } = await supabaseAdmin
      .from("conversations")
      .select("id, customer_last_seen_at, customer_presence, assigned_agent_id")
      .in("id", conversationIds);

    if (!conversations) {
      return result;
    }

    // Get agent IDs and check their status
    const agentIds = conversations
      .map((c) => c.assigned_agent_id)
      .filter((id): id is string => !!id);

    const { data: agentStatuses } = await supabaseAdmin
      .from("agent_availability")
      .select("user_id, status")
      .in("user_id", agentIds);

    const agentStatusMap = new Map(
      (agentStatuses || []).map((a) => [a.user_id, a.status])
    );

    for (const conv of conversations) {
      const customerPresence = getCustomerPresenceStatus(
        conv.customer_last_seen_at
      );
      const agentStatus = conv.assigned_agent_id
        ? agentStatusMap.get(conv.assigned_agent_id)
        : null;

      result.set(conv.id, {
        customerPresence: customerPresence.status,
        agentOnline: agentStatus === "online",
      });
    }

    return result;
  } catch (error) {
    console.error("[Presence] Failed to batch get presence:", error);
    return result;
  }
}
