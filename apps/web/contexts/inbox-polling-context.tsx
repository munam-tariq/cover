"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import { usePathname } from "next/navigation";
import { useProject } from "./project-context";
import { apiClient } from "@/lib/api-client";

// ============================================================================
// Types
// ============================================================================

interface InboxSummary {
  queueCount: number;
  assignedCount: number;
  totalPending: number;
  timestamp: string;
}

interface InboxPollingState {
  queueCount: number;
  assignedCount: number;
  totalPending: number;
  hasUnread: boolean;
  lastUpdated: Date | null;
  isPolling: boolean;
  error: string | null;
}

interface InboxPollingContextValue extends InboxPollingState {
  /** Force an immediate refresh */
  refresh: () => Promise<void>;
  /** Mark current items as "seen" to clear unread indicator */
  markAsSeen: () => void;
  /** Pause polling (e.g., when inbox page handles its own refresh) */
  pausePolling: () => void;
  /** Resume polling */
  resumePolling: () => void;
}

// ============================================================================
// Constants
// ============================================================================

// Default polling interval: 30 seconds
const DEFAULT_POLLING_INTERVAL_MS = 30 * 1000;

// Allow override via environment variable for testing
const POLLING_INTERVAL_MS =
  typeof window !== "undefined" && process.env.NEXT_PUBLIC_POLLING_INTERVAL
    ? parseInt(process.env.NEXT_PUBLIC_POLLING_INTERVAL, 10)
    : DEFAULT_POLLING_INTERVAL_MS;

// ============================================================================
// Context
// ============================================================================

const InboxPollingContext = createContext<InboxPollingContextValue | null>(null);

/**
 * Hook to access inbox polling state and actions
 */
export function useInboxPolling() {
  const context = useContext(InboxPollingContext);
  if (!context) {
    throw new Error("useInboxPolling must be used within an InboxPollingProvider");
  }
  return context;
}

/**
 * Optional hook that doesn't throw if used outside provider
 * Useful for components that may or may not be within the provider
 */
export function useInboxPollingOptional(): InboxPollingContextValue | null {
  return useContext(InboxPollingContext);
}

// ============================================================================
// Provider
// ============================================================================

interface InboxPollingProviderProps {
  children: React.ReactNode;
}

/**
 * InboxPollingProvider - Global polling for inbox updates
 *
 * Features:
 * - Polls /inbox-summary every 30 seconds when user is on non-inbox pages
 * - Provides badge count for sidebar
 * - Tracks "unread" state when new items appear
 * - Pauses automatically when user is on /inbox/* routes (page handles its own refresh)
 */
export function InboxPollingProvider({ children }: InboxPollingProviderProps) {
  const { currentProject } = useProject();
  const pathname = usePathname();

  // State
  const [state, setState] = useState<InboxPollingState>({
    queueCount: 0,
    assignedCount: 0,
    totalPending: 0,
    hasUnread: false,
    lastUpdated: null,
    isPolling: false,
    error: null,
  });

  // Refs
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const pausedRef = useRef(false);
  const lastSeenCountRef = useRef(0);
  const isOnInboxRef = useRef(false);

  // Detect if we're on an inbox page
  useEffect(() => {
    isOnInboxRef.current = pathname?.startsWith("/inbox") ?? false;
  }, [pathname]);

  /**
   * Fetch inbox summary from API
   */
  const fetchSummary = useCallback(async (): Promise<InboxSummary | null> => {
    if (!currentProject?.id) return null;

    try {
      const data = await apiClient<InboxSummary>(
        `/api/projects/${currentProject.id}/inbox-summary`
      );
      return data;
    } catch (err) {
      console.error("[InboxPolling] Failed to fetch summary:", err);
      return null;
    }
  }, [currentProject?.id]);

  /**
   * Poll and update state
   */
  const poll = useCallback(async () => {
    // Skip if paused or on inbox page (page handles its own refresh)
    if (pausedRef.current || isOnInboxRef.current) {
      return;
    }

    setState((prev) => ({ ...prev, isPolling: true }));

    const summary = await fetchSummary();

    if (summary) {
      setState((prev) => {
        // Check if we have new items compared to what user last "saw"
        const hasNewItems = summary.totalPending > lastSeenCountRef.current;

        return {
          queueCount: summary.queueCount,
          assignedCount: summary.assignedCount,
          totalPending: summary.totalPending,
          hasUnread: hasNewItems,
          lastUpdated: new Date(),
          isPolling: false,
          error: null,
        };
      });

      if (process.env.NODE_ENV === "development") {
        console.log("[InboxPolling] Updated:", {
          queue: summary.queueCount,
          assigned: summary.assignedCount,
          total: summary.totalPending,
          lastSeen: lastSeenCountRef.current,
        });
      }
    } else {
      setState((prev) => ({
        ...prev,
        isPolling: false,
        error: "Failed to fetch inbox summary",
      }));
    }
  }, [fetchSummary]);

  /**
   * Force immediate refresh
   */
  const refresh = useCallback(async () => {
    await poll();
  }, [poll]);

  /**
   * Mark current count as "seen" - clears unread indicator
   */
  const markAsSeen = useCallback(() => {
    lastSeenCountRef.current = state.totalPending;
    setState((prev) => ({ ...prev, hasUnread: false }));
  }, [state.totalPending]);

  /**
   * Pause polling (e.g., when inbox page manages its own updates)
   */
  const pausePolling = useCallback(() => {
    pausedRef.current = true;
  }, []);

  /**
   * Resume polling
   */
  const resumePolling = useCallback(() => {
    pausedRef.current = false;
  }, []);

  /**
   * Start the polling interval
   */
  const startPolling = useCallback(() => {
    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Initial poll
    poll();

    // Set up interval
    intervalRef.current = setInterval(poll, POLLING_INTERVAL_MS);

    if (process.env.NODE_ENV === "development") {
      console.log(`[InboxPolling] Started polling every ${POLLING_INTERVAL_MS / 1000}s`);
    }
  }, [poll]);

  /**
   * Stop the polling interval
   */
  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;

      if (process.env.NODE_ENV === "development") {
        console.log("[InboxPolling] Stopped polling");
      }
    }
  }, []);

  // Start/stop polling based on project
  useEffect(() => {
    if (currentProject?.id) {
      startPolling();
    } else {
      stopPolling();
      // Reset state when no project
      setState({
        queueCount: 0,
        assignedCount: 0,
        totalPending: 0,
        hasUnread: false,
        lastUpdated: null,
        isPolling: false,
        error: null,
      });
      lastSeenCountRef.current = 0;
    }

    return () => {
      stopPolling();
    };
  }, [currentProject?.id, startPolling, stopPolling]);

  // When user navigates to inbox, mark items as seen
  useEffect(() => {
    if (pathname?.startsWith("/inbox")) {
      markAsSeen();
    }
  }, [pathname, markAsSeen]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  const value: InboxPollingContextValue = {
    ...state,
    refresh,
    markAsSeen,
    pausePolling,
    resumePolling,
  };

  return (
    <InboxPollingContext.Provider value={value}>
      {children}
    </InboxPollingContext.Provider>
  );
}
