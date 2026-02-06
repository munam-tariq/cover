"use client";

/**
 * Message Polling Hook
 *
 * Fallback polling for conversation messages.
 * Works alongside realtime subscriptions as a backup when realtime fails.
 *
 * Features:
 * - Only fetches messages after the last known message (efficient)
 * - Configurable polling interval (default 30s)
 * - Callbacks for new messages
 * - Automatic cleanup on unmount
 */

import { useEffect, useRef, useCallback, useState } from "react";
import { apiClient } from "@/lib/api-client";

// ============================================================================
// Types
// ============================================================================

export interface Message {
  id: string;
  conversationId: string;
  senderType: "customer" | "agent" | "ai" | "system";
  senderId?: string | null;
  senderName?: string | null;
  content: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export interface UseMessagePollingOptions {
  /** Polling interval in milliseconds (default: 30000) */
  interval?: number;
  /** Whether polling is enabled (default: true) */
  enabled?: boolean;
  /** ID of last known message - only fetch messages after this */
  lastMessageId?: string;
  /** Timestamp of last known message - fallback for filtering */
  lastMessageTime?: string;
  /** Callback when new messages arrive */
  onNewMessages?: (messages: Message[]) => void;
  /** Callback on error */
  onError?: (error: Error) => void;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_INTERVAL_MS = 30 * 1000;

// ============================================================================
// Hook
// ============================================================================

export function useMessagePolling(
  conversationId: string | null,
  options: UseMessagePollingOptions = {}
) {
  const {
    interval = DEFAULT_INTERVAL_MS,
    enabled = true,
    lastMessageId,
    lastMessageTime,
    onNewMessages,
    onError,
  } = options;

  const [isPolling, setIsPolling] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastMessageIdRef = useRef(lastMessageId);
  const lastMessageTimeRef = useRef(lastMessageTime);
  const onNewMessagesRef = useRef(onNewMessages);
  const onErrorRef = useRef(onError);

  // Keep refs up to date
  useEffect(() => {
    lastMessageIdRef.current = lastMessageId;
    lastMessageTimeRef.current = lastMessageTime;
    onNewMessagesRef.current = onNewMessages;
    onErrorRef.current = onError;
  }, [lastMessageId, lastMessageTime, onNewMessages, onError]);

  /**
   * Fetch messages after the last known message
   */
  const fetchNewMessages = useCallback(async (): Promise<Message[]> => {
    if (!conversationId) return [];

    try {
      // Build query params
      let url = `/api/conversations/${conversationId}/messages?limit=50`;

      // Add after parameter to only get new messages
      if (lastMessageTimeRef.current) {
        url += `&after=${encodeURIComponent(lastMessageTimeRef.current)}`;
      }

      const response = await apiClient<{ messages: Message[] }>(url);

      // Filter out messages we already have (by ID)
      const messages = response.messages || [];

      if (lastMessageIdRef.current) {
        const lastIndex = messages.findIndex((m) => m.id === lastMessageIdRef.current);
        if (lastIndex >= 0) {
          return messages.slice(lastIndex + 1);
        }
      }

      return messages;
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to fetch messages");
      console.error("[useMessagePolling] Fetch error:", error);
      throw error;
    }
  }, [conversationId]);

  /**
   * Poll and check for new messages
   */
  const poll = useCallback(async () => {
    if (!conversationId || !enabled) return;

    setIsPolling(true);
    setError(null);

    try {
      const newMessages = await fetchNewMessages();

      setLastUpdated(new Date());

      if (newMessages.length > 0) {
        // Update our tracking refs with the newest message
        const newestMessage = newMessages[newMessages.length - 1];
        lastMessageIdRef.current = newestMessage.id;
        lastMessageTimeRef.current = newestMessage.createdAt;

        // Notify callback
        onNewMessagesRef.current?.(newMessages);

        if (process.env.NODE_ENV === "development") {
          console.log(`[useMessagePolling] Found ${newMessages.length} new messages`);
        }
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Poll failed");
      setError(error);
      onErrorRef.current?.(error);
    } finally {
      setIsPolling(false);
    }
  }, [conversationId, enabled, fetchNewMessages]);

  /**
   * Force immediate refresh
   */
  const refresh = useCallback(async () => {
    await poll();
  }, [poll]);

  /**
   * Start polling
   */
  const startPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Don't do initial poll - let the page load messages first
    // Just set up the interval for subsequent polls

    intervalRef.current = setInterval(poll, interval);

    if (process.env.NODE_ENV === "development") {
      console.log(`[useMessagePolling] Started polling every ${interval / 1000}s`);
    }
  }, [poll, interval]);

  /**
   * Stop polling
   */
  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;

      if (process.env.NODE_ENV === "development") {
        console.log("[useMessagePolling] Stopped polling");
      }
    }
  }, []);

  // Start/stop polling based on conversation and enabled state
  useEffect(() => {
    if (conversationId && enabled) {
      startPolling();
    } else {
      stopPolling();
    }

    return () => {
      stopPolling();
    };
  }, [conversationId, enabled, startPolling, stopPolling]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  return {
    isPolling,
    lastUpdated,
    error,
    refresh,
    startPolling,
    stopPolling,
  };
}
