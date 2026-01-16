"use client";

/**
 * Inbox Realtime Hook
 *
 * Manages Supabase Realtime subscriptions for the inbox page:
 * - Queue updates (new items, claimed items, position changes)
 * - Conversation updates (new messages, status changes)
 * - Agent assignment notifications
 *
 * Provides real-time updates without page refresh.
 */

import { useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { RealtimeChannel } from "@supabase/supabase-js";

// ============================================================================
// Types
// ============================================================================

export interface QueueUpdate {
  type: "added" | "removed" | "claimed" | "position_updated";
  conversationId: string;
  position?: number;
  agentId?: string;
}

export interface ConversationUpdate {
  type: "message" | "status_changed" | "assigned" | "resolved";
  conversationId: string;
  data?: {
    message?: {
      id: string;
      senderType: string;
      content: string;
      createdAt: string;
    };
    status?: string;
    agentId?: string;
    agentName?: string;
  };
}

export interface InboxRealtimeHandlers {
  onQueueUpdate?: (update: QueueUpdate) => void;
  onConversationUpdate?: (update: ConversationUpdate) => void;
  onAgentStatusChanged?: (data: { agentId: string; status: string }) => void;
  onRefreshNeeded?: () => void;
}

// ============================================================================
// Hook
// ============================================================================

export function useInboxRealtime(
  projectId: string | null,
  handlers: InboxRealtimeHandlers
) {
  const supabase = createClient();
  const queueChannelRef = useRef<RealtimeChannel | null>(null);
  const handlersRef = useRef(handlers);

  // Keep handlers ref up to date
  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  // Subscribe to project queue channel
  const subscribeToQueue = useCallback(
    (projectId: string) => {
      // Unsubscribe from existing channel if any
      if (queueChannelRef.current) {
        supabase.removeChannel(queueChannelRef.current);
      }

      const channelName = `project:${projectId}:queue`;

      const channel = supabase.channel(channelName, {
        config: {
          broadcast: { self: false },
        },
      });

      // Listen for queue item added
      channel.on("broadcast", { event: "queue:item_added" }, (payload) => {
        console.log("[Inbox Realtime] Queue item added:", payload);
        handlersRef.current.onQueueUpdate?.({
          type: "added",
          conversationId: payload.payload?.data?.conversationId,
          position: payload.payload?.data?.position,
        });
        // Trigger refresh to get full data
        handlersRef.current.onRefreshNeeded?.();
      });

      // Listen for queue item claimed
      channel.on("broadcast", { event: "queue:item_claimed" }, (payload) => {
        console.log("[Inbox Realtime] Queue item claimed:", payload);
        handlersRef.current.onQueueUpdate?.({
          type: "claimed",
          conversationId: payload.payload?.data?.conversationId,
          agentId: payload.payload?.data?.agentId,
        });
      });

      // Listen for queue item removed
      channel.on("broadcast", { event: "queue:conversation_removed" }, (payload) => {
        console.log("[Inbox Realtime] Queue item removed:", payload);
        handlersRef.current.onQueueUpdate?.({
          type: "removed",
          conversationId: payload.payload?.data?.conversationId,
        });
      });

      // Listen for position updates
      channel.on("broadcast", { event: "queue:positions_updated" }, (payload) => {
        console.log("[Inbox Realtime] Queue positions updated:", payload);
        // Trigger refresh to get updated positions
        handlersRef.current.onRefreshNeeded?.();
      });

      // Subscribe
      channel.subscribe((status) => {
        console.log(`[Inbox Realtime] Queue channel ${channelName}: ${status}`);
      });

      queueChannelRef.current = channel;

      return channel;
    },
    [supabase]
  );

  // Main effect for subscriptions
  useEffect(() => {
    if (!projectId) return;

    // Subscribe to queue channel
    subscribeToQueue(projectId);

    // Cleanup
    return () => {
      if (queueChannelRef.current) {
        supabase.removeChannel(queueChannelRef.current);
        queueChannelRef.current = null;
      }
    };
  }, [projectId, subscribeToQueue, supabase]);

  return {
    isSubscribed: !!queueChannelRef.current,
  };
}

// ============================================================================
// Conversation Detail Hook
// ============================================================================

export interface ConversationRealtimeHandlers {
  onNewMessage?: (message: {
    id: string;
    senderType: string;
    senderId?: string;
    senderName?: string;
    content: string;
    createdAt: string;
  }) => void;
  onStatusChanged?: (status: string) => void;
  onTyping?: (data: { participant: { type: string; name?: string }; isTyping: boolean }) => void;
  onPresenceUpdate?: (data: { customerOnline?: boolean; agentOnline?: boolean; lastSeenAt?: string }) => void;
}

export function useConversationRealtime(
  conversationId: string | null,
  handlers: ConversationRealtimeHandlers
) {
  const supabase = createClient();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const handlersRef = useRef(handlers);

  // Keep handlers ref up to date
  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  // Subscribe to conversation channel
  const subscribe = useCallback(
    (conversationId: string) => {
      // Unsubscribe from existing channel if any
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }

      const channelName = `conversation:${conversationId}`;

      const channel = supabase.channel(channelName, {
        config: {
          broadcast: { self: false },
        },
      });

      // Listen for new messages
      channel.on("broadcast", { event: "message:new" }, (payload) => {
        console.log("[Conversation Realtime] New message:", payload);
        const message = payload.payload?.data?.message;
        if (message) {
          handlersRef.current.onNewMessage?.({
            id: message.id,
            senderType: message.senderType,
            senderId: message.senderId,
            senderName: message.senderName,
            content: message.content,
            createdAt: message.createdAt,
          });
        }
      });

      // Listen for status changes
      channel.on("broadcast", { event: "conversation:status_changed" }, (payload) => {
        console.log("[Conversation Realtime] Status changed:", payload);
        const status = payload.payload?.data?.status;
        if (status) {
          handlersRef.current.onStatusChanged?.(status);
        }
      });

      // Listen for resolved/closed
      channel.on("broadcast", { event: "conversation:resolved" }, (payload) => {
        console.log("[Conversation Realtime] Resolved:", payload);
        const resolution = payload.payload?.data?.resolution;
        if (resolution) {
          handlersRef.current.onStatusChanged?.(resolution);
        }
      });

      // Listen for typing start
      channel.on("broadcast", { event: "typing:start" }, (payload) => {
        const data = payload.payload?.data;
        if (data?.participant) {
          handlersRef.current.onTyping?.({
            participant: data.participant,
            isTyping: true,
          });
        }
      });

      // Listen for typing stop
      channel.on("broadcast", { event: "typing:stop" }, (payload) => {
        const data = payload.payload?.data;
        if (data?.participant) {
          handlersRef.current.onTyping?.({
            participant: data.participant,
            isTyping: false,
          });
        }
      });

      // Listen for presence updates
      channel.on("broadcast", { event: "presence:update" }, (payload) => {
        console.log("[Conversation Realtime] Presence update:", payload);
        const presence = payload.payload?.data?.presence;
        if (presence) {
          handlersRef.current.onPresenceUpdate?.({
            customerOnline: presence.customerOnline,
            agentOnline: presence.agentOnline,
            lastSeenAt: presence.lastSeenAt,
          });
        }
      });

      // Subscribe
      channel.subscribe((status) => {
        console.log(`[Conversation Realtime] Channel ${channelName}: ${status}`);
      });

      channelRef.current = channel;

      return channel;
    },
    [supabase]
  );

  // Main effect for subscriptions
  useEffect(() => {
    if (!conversationId) return;

    // Subscribe to conversation channel
    subscribe(conversationId);

    // Cleanup
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [conversationId, subscribe, supabase]);

  return {
    isSubscribed: !!channelRef.current,
  };
}
