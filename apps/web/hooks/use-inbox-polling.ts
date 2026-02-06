"use client";

/**
 * Inbox Polling Hook
 *
 * Fallback polling for inbox page updates.
 * Works alongside realtime subscriptions as a backup when realtime fails.
 *
 * Features:
 * - Configurable polling interval (default 30s)
 * - Callbacks for queue and conversation updates
 * - Automatic cleanup on unmount
 */

import { useEffect, useRef, useCallback, useState } from "react";
import { apiClient } from "@/lib/api-client";

// ============================================================================
// Types
// ============================================================================

export interface QueueItem {
  id: string;
  visitorId: string;
  customerEmail: string | null;
  customerName: string | null;
  position: number;
  waitingSince: string;
  createdAt: string;
  messageCount: number;
}

export interface ConversationItem {
  id: string;
  status: string;
  visitorId: string;
  customerEmail: string | null;
  customerName: string | null;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  unreadCount: number;
  assignedAgentId: string | null;
  createdAt: string;
}

export interface InboxData {
  queue: QueueItem[];
  conversations: ConversationItem[];
  queueCount: number;
  conversationCount: number;
}

export interface UseInboxPollingOptions {
  /** Polling interval in milliseconds (default: 30000) */
  interval?: number;
  /** Whether polling is enabled (default: true) */
  enabled?: boolean;
  /** Callback when data is updated */
  onUpdate?: (data: InboxData) => void;
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

export function useInboxPolling(
  projectId: string | null,
  options: UseInboxPollingOptions = {}
) {
  const {
    interval = DEFAULT_INTERVAL_MS,
    enabled = true,
    onUpdate,
    onError,
  } = options;

  const [isPolling, setIsPolling] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const onUpdateRef = useRef(onUpdate);
  const onErrorRef = useRef(onError);

  // Keep callback refs up to date
  useEffect(() => {
    onUpdateRef.current = onUpdate;
    onErrorRef.current = onError;
  }, [onUpdate, onError]);

  /**
   * Fetch inbox data
   */
  const fetchData = useCallback(async (): Promise<InboxData | null> => {
    if (!projectId) return null;

    try {
      // Fetch queue and conversations in parallel
      const [queueResponse, conversationsResponse] = await Promise.all([
        apiClient<{ queue: QueueItem[]; count: number }>(
          `/api/projects/${projectId}/queue`
        ),
        apiClient<{ conversations: ConversationItem[]; total: number }>(
          `/api/conversations?project_id=${projectId}&status=agent_active&limit=50`
        ),
      ]);

      return {
        queue: queueResponse.queue || [],
        conversations: conversationsResponse.conversations || [],
        queueCount: queueResponse.count || 0,
        conversationCount: conversationsResponse.total || 0,
      };
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to fetch inbox data");
      console.error("[useInboxPolling] Fetch error:", error);
      return null;
    }
  }, [projectId]);

  /**
   * Poll and update
   */
  const poll = useCallback(async () => {
    if (!projectId || !enabled) return;

    setIsPolling(true);
    setError(null);

    try {
      const data = await fetchData();

      if (data) {
        setLastUpdated(new Date());
        onUpdateRef.current?.(data);

        if (process.env.NODE_ENV === "development") {
          console.log("[useInboxPolling] Updated:", {
            queue: data.queueCount,
            conversations: data.conversationCount,
          });
        }
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Poll failed");
      setError(error);
      onErrorRef.current?.(error);
    } finally {
      setIsPolling(false);
    }
  }, [projectId, enabled, fetchData]);

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

    // Initial fetch
    poll();

    // Set up interval
    intervalRef.current = setInterval(poll, interval);

    if (process.env.NODE_ENV === "development") {
      console.log(`[useInboxPolling] Started polling every ${interval / 1000}s`);
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
        console.log("[useInboxPolling] Stopped polling");
      }
    }
  }, []);

  // Start/stop polling based on project and enabled state
  useEffect(() => {
    if (projectId && enabled) {
      startPolling();
    } else {
      stopPolling();
    }

    return () => {
      stopPolling();
    };
  }, [projectId, enabled, startPolling, stopPolling]);

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
