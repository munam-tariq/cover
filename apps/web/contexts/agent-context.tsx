"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import { useProject } from "./project-context";
import { apiClient } from "@/lib/api-client";

// ============================================================================
// Types
// ============================================================================

export type AgentStatus = "online" | "away" | "offline";

export interface AgentInfo {
  id: string;
  email: string;
  name: string | null;
}

export interface AgentAvailability {
  projectId: string;
  status: AgentStatus;
  maxConcurrentChats: number;
  currentChatCount: number;
  lastSeenAt: string | null;
}

export interface AgentRole {
  role: "owner" | "admin" | "agent";
  isOwner: boolean;
  isAgent: boolean;
}

interface AgentContextValue {
  // Current user's agent info
  agent: AgentInfo | null;
  // Role in current project
  role: AgentRole | null;
  // Availability status in current project
  availability: AgentAvailability | null;
  // Loading state
  isLoading: boolean;
  // Error state
  error: string | null;
  // Actions
  updateStatus: (status: AgentStatus) => Promise<void>;
  refreshAvailability: () => Promise<void>;
}

// ============================================================================
// Context
// ============================================================================

const AgentContext = createContext<AgentContextValue | null>(null);

/**
 * Hook to access the agent context
 */
export function useAgent() {
  const context = useContext(AgentContext);
  if (!context) {
    throw new Error("useAgent must be used within an AgentProvider");
  }
  return context;
}

// ============================================================================
// Provider
// ============================================================================

interface AgentProviderProps {
  children: React.ReactNode;
}

// Heartbeat interval (30 seconds)
const HEARTBEAT_INTERVAL_MS = 30 * 1000;

/**
 * AgentProvider - Manages agent state for human handoff
 *
 * Responsibilities:
 * - Tracks user's role in the current project (owner/admin/agent)
 * - Manages agent availability status (online/away/offline)
 * - Sends periodic heartbeats when online
 * - Provides methods to update status
 */
export function AgentProvider({ children }: AgentProviderProps) {
  const { currentProject } = useProject();
  const [agent, setAgent] = useState<AgentInfo | null>(null);
  const [role, setRole] = useState<AgentRole | null>(null);
  const [availability, setAvailability] = useState<AgentAvailability | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Fetch agent info and role
   */
  const fetchAgentInfo = useCallback(async () => {
    if (!currentProject) {
      setAgent(null);
      setRole(null);
      setAvailability(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Get current user's agent info
      const response = await apiClient<{
        agent: AgentInfo;
        summary: {
          ownedProjects: number;
          agentMemberships: number;
          totalOnline: number;
          totalActiveChats: number;
        };
        projects: Array<{
          project_id: string;
          status: AgentStatus;
          current_chat_count: number;
          max_concurrent_chats: number;
          last_seen_at: string | null;
        }>;
      }>("/api/agent/me");

      setAgent(response.agent);

      // Find availability for current project
      const projectAvailability = response.projects.find(
        (p) => p.project_id === currentProject.id
      );

      if (projectAvailability) {
        setAvailability({
          projectId: currentProject.id,
          status: projectAvailability.status,
          maxConcurrentChats: projectAvailability.max_concurrent_chats,
          currentChatCount: projectAvailability.current_chat_count,
          lastSeenAt: projectAvailability.last_seen_at,
        });
      } else {
        // No availability record yet - user hasn't set status
        setAvailability({
          projectId: currentProject.id,
          status: "offline",
          maxConcurrentChats: 5,
          currentChatCount: 0,
          lastSeenAt: null,
        });
      }

      // Determine role - check if owner or team member
      // We need to fetch project to check ownership
      const projectResponse = await apiClient<{
        project: { user_id: string };
        role?: "owner" | "admin" | "agent";
      }>(`/api/projects/${currentProject.id}`);

      const isOwner = response.agent.id === projectResponse.project.user_id;
      const projectRole = projectResponse.role || (isOwner ? "owner" : "agent");

      setRole({
        role: projectRole,
        isOwner,
        isAgent: projectRole === "agent" || projectRole === "admin" || isOwner,
      });
    } catch (err) {
      console.error("Failed to fetch agent info:", err);
      setError("Failed to load agent info");
      // Set defaults
      setRole({ role: "owner", isOwner: true, isAgent: true });
    } finally {
      setIsLoading(false);
    }
  }, [currentProject]);

  /**
   * Update agent status
   */
  const updateStatus = useCallback(
    async (status: AgentStatus) => {
      if (!currentProject) return;

      try {
        const response = await apiClient<{
          availability: {
            id: string;
            projectId: string;
            status: AgentStatus;
            maxConcurrentChats: number;
            currentChatCount: number;
            lastSeenAt: string;
            statusChangedAt: string;
          };
        }>("/api/agent/status", {
          method: "PUT",
          body: JSON.stringify({
            projectId: currentProject.id,
            status,
          }),
        });

        setAvailability({
          projectId: currentProject.id,
          status: response.availability.status,
          maxConcurrentChats: response.availability.maxConcurrentChats,
          currentChatCount: response.availability.currentChatCount,
          lastSeenAt: response.availability.lastSeenAt,
        });

        // Start or stop heartbeat based on status
        if (status === "online" || status === "away") {
          startHeartbeat();
        } else {
          stopHeartbeat();
        }
      } catch (err) {
        console.error("Failed to update status:", err);
        throw err;
      }
    },
    [currentProject]
  );

  /**
   * Refresh availability
   */
  const refreshAvailability = useCallback(async () => {
    await fetchAgentInfo();
  }, [fetchAgentInfo]);

  /**
   * Send heartbeat
   */
  const sendHeartbeat = useCallback(async () => {
    if (!currentProject || !availability || availability.status === "offline") {
      return;
    }

    try {
      await apiClient("/api/agent/heartbeat", {
        method: "POST",
        body: JSON.stringify({
          projectId: currentProject.id,
        }),
      });
    } catch (err) {
      console.error("Heartbeat failed:", err);
    }
  }, [currentProject, availability]);

  /**
   * Start heartbeat interval
   */
  const startHeartbeat = useCallback(() => {
    // Clear any existing heartbeat
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
    }

    // Start new heartbeat interval
    heartbeatRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);

    // Send initial heartbeat
    sendHeartbeat();
  }, [sendHeartbeat]);

  /**
   * Stop heartbeat interval
   */
  const stopHeartbeat = useCallback(() => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
  }, []);

  // Initialize on project change
  useEffect(() => {
    fetchAgentInfo();
  }, [fetchAgentInfo]);

  // Start heartbeat if agent is online
  useEffect(() => {
    if (availability && (availability.status === "online" || availability.status === "away")) {
      startHeartbeat();
    }

    return () => {
      stopHeartbeat();
    };
  }, [availability?.status, startHeartbeat, stopHeartbeat]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopHeartbeat();
    };
  }, [stopHeartbeat]);

  const value: AgentContextValue = {
    agent,
    role,
    availability,
    isLoading,
    error,
    updateStatus,
    refreshAvailability,
  };

  return <AgentContext.Provider value={value}>{children}</AgentContext.Provider>;
}
