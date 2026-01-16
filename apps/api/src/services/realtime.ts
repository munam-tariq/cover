/**
 * Realtime Service
 *
 * Utility functions for broadcasting events to Supabase Realtime channels.
 * Uses the Supabase Admin client to broadcast to channels that clients subscribe to.
 *
 * Channel naming conventions:
 * - `conversation:{id}` - Messages, typing, presence for a specific conversation
 * - `project:{id}:queue` - Queue updates for agents of a project
 * - `project:{id}:agents` - Agent status updates
 * - `agent:{id}` - Personal notifications for an agent
 */

import { supabaseAdmin } from "../lib/supabase";

// ============================================================================
// Types
// ============================================================================

export type RealtimeEventType =
  // Conversation events
  | "message:new"
  | "message:updated"
  | "typing:start"
  | "typing:stop"
  | "presence:update"
  // Handoff events
  | "conversation:status_changed"
  | "conversation:assigned"
  | "conversation:transferred"
  | "conversation:resolved"
  // Queue events
  | "queue:conversation_added"
  | "queue:conversation_removed"
  | "queue:position_updated"
  // Agent events
  | "agent:status_changed"
  | "agent:new_assignment"
  | "agent:conversation_claimed";

export interface RealtimePayload {
  type: RealtimeEventType;
  data: Record<string, unknown>;
  timestamp: string;
}

// ============================================================================
// Channel Builders
// ============================================================================

/**
 * Get channel name for a conversation
 */
export function getConversationChannel(conversationId: string): string {
  return `conversation:${conversationId}`;
}

/**
 * Get channel name for a project's queue
 */
export function getProjectQueueChannel(projectId: string): string {
  return `project:${projectId}:queue`;
}

/**
 * Get channel name for a project's agent updates
 */
export function getProjectAgentsChannel(projectId: string): string {
  return `project:${projectId}:agents`;
}

/**
 * Get channel name for an agent's personal notifications
 */
export function getAgentChannel(userId: string): string {
  return `agent:${userId}`;
}

// ============================================================================
// Broadcast Functions
// ============================================================================

/**
 * Broadcast an event to a Supabase Realtime channel
 */
async function broadcast(
  channel: string,
  type: RealtimeEventType,
  data: Record<string, unknown>
): Promise<void> {
  try {
    const payload: RealtimePayload = {
      type,
      data,
      timestamp: new Date().toISOString(),
    };

    // Use Supabase Realtime broadcast
    const channelInstance = supabaseAdmin.channel(channel);

    await channelInstance.send({
      type: "broadcast",
      event: type,
      payload,
    });

    // Clean up channel instance
    await supabaseAdmin.removeChannel(channelInstance);

    console.log(`[Realtime] Broadcasted ${type} to ${channel}`);
  } catch (error) {
    console.error(`[Realtime] Failed to broadcast ${type} to ${channel}:`, error);
    // Don't throw - realtime is best-effort
  }
}

// ============================================================================
// Conversation Events
// ============================================================================

/**
 * Broadcast a new message to a conversation channel
 */
export async function broadcastNewMessage(
  conversationId: string,
  message: {
    id: string;
    senderType: string;
    senderId?: string;
    content: string;
    createdAt: string;
    metadata?: Record<string, unknown>;
  }
): Promise<void> {
  await broadcast(getConversationChannel(conversationId), "message:new", {
    message,
  });
}

/**
 * Broadcast message update (e.g., edit, reaction)
 */
export async function broadcastMessageUpdated(
  conversationId: string,
  messageId: string,
  updates: Record<string, unknown>
): Promise<void> {
  await broadcast(getConversationChannel(conversationId), "message:updated", {
    messageId,
    updates,
  });
}

/**
 * Broadcast typing indicator
 */
export async function broadcastTyping(
  conversationId: string,
  participant: { type: "customer" | "agent" | "ai"; id?: string; name?: string },
  isTyping: boolean
): Promise<void> {
  await broadcast(
    getConversationChannel(conversationId),
    isTyping ? "typing:start" : "typing:stop",
    { participant }
  );
}

/**
 * Broadcast presence update for a conversation
 */
export async function broadcastPresenceUpdate(
  conversationId: string,
  presence: {
    customerOnline: boolean;
    agentOnline: boolean;
    lastSeenAt?: string;
  }
): Promise<void> {
  await broadcast(getConversationChannel(conversationId), "presence:update", {
    presence,
  });
}

/**
 * Broadcast conversation status change
 */
export async function broadcastConversationStatusChanged(
  conversationId: string,
  projectId: string,
  status: string,
  details?: Record<string, unknown>
): Promise<void> {
  const eventData = {
    conversationId,
    status,
    ...details,
  };

  // Broadcast to conversation channel
  await broadcast(
    getConversationChannel(conversationId),
    "conversation:status_changed",
    eventData
  );

  // Also broadcast to project queue for agents
  await broadcast(
    getProjectQueueChannel(projectId),
    "conversation:status_changed",
    eventData
  );
}

// ============================================================================
// Handoff Events
// ============================================================================

/**
 * Broadcast conversation assignment to an agent
 */
export async function broadcastConversationAssigned(
  conversationId: string,
  projectId: string,
  agentId: string,
  agent: { name?: string; email?: string }
): Promise<void> {
  // Broadcast to conversation
  await broadcast(getConversationChannel(conversationId), "conversation:assigned", {
    conversationId,
    agentId,
    agent,
  });

  // Notify the agent
  await broadcast(getAgentChannel(agentId), "agent:new_assignment", {
    conversationId,
    projectId,
  });

  // Update queue
  await broadcast(getProjectQueueChannel(projectId), "queue:conversation_removed", {
    conversationId,
    reason: "assigned",
    agentId,
  });
}

/**
 * Broadcast conversation transferred back to queue
 */
export async function broadcastConversationTransferred(
  conversationId: string,
  projectId: string,
  queuePosition: number
): Promise<void> {
  // Broadcast to conversation
  await broadcast(getConversationChannel(conversationId), "conversation:transferred", {
    conversationId,
    queuePosition,
  });

  // Update queue
  await broadcast(getProjectQueueChannel(projectId), "queue:conversation_added", {
    conversationId,
    queuePosition,
  });
}

/**
 * Broadcast conversation resolved
 */
export async function broadcastConversationResolved(
  conversationId: string,
  projectId: string,
  resolution: "resolved" | "closed" | "ai_active"
): Promise<void> {
  // Broadcast to conversation
  await broadcast(getConversationChannel(conversationId), "conversation:resolved", {
    conversationId,
    resolution,
  });

  // Update queue (in case it was in queue)
  await broadcast(getProjectQueueChannel(projectId), "queue:conversation_removed", {
    conversationId,
    reason: resolution,
  });
}

// ============================================================================
// Queue Events
// ============================================================================

/**
 * Broadcast queue position updates to all waiting conversations
 */
export async function broadcastQueuePositions(
  projectId: string,
  positions: Array<{ conversationId: string; position: number }>
): Promise<void> {
  // Broadcast to project queue channel
  await broadcast(getProjectQueueChannel(projectId), "queue:position_updated", {
    positions,
  });

  // Also broadcast to each conversation individually
  for (const { conversationId, position } of positions) {
    await broadcast(getConversationChannel(conversationId), "queue:position_updated", {
      position,
    });
  }
}

// ============================================================================
// Agent Events
// ============================================================================

/**
 * Broadcast agent status change to project
 */
export async function broadcastAgentStatusChanged(
  projectId: string,
  agentId: string,
  status: "online" | "away" | "offline",
  details?: { currentChatCount?: number; maxConcurrentChats?: number }
): Promise<void> {
  await broadcast(getProjectAgentsChannel(projectId), "agent:status_changed", {
    agentId,
    status,
    ...details,
  });
}

/**
 * Broadcast that an agent claimed a conversation
 */
export async function broadcastAgentClaimed(
  projectId: string,
  agentId: string,
  conversationId: string
): Promise<void> {
  await broadcast(getProjectQueueChannel(projectId), "agent:conversation_claimed", {
    agentId,
    conversationId,
  });
}
