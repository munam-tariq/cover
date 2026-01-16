"use client";

import { useState, useRef, useEffect } from "react";
import { useAgent, type AgentStatus } from "@/contexts/agent-context";

const statusConfig: Record<
  AgentStatus,
  { label: string; color: string; bgColor: string; description: string }
> = {
  online: {
    label: "Online",
    color: "bg-green-500",
    bgColor: "bg-green-500/10",
    description: "Accepting new conversations",
  },
  away: {
    label: "Away",
    color: "bg-yellow-500",
    bgColor: "bg-yellow-500/10",
    description: "Not accepting new conversations",
  },
  offline: {
    label: "Offline",
    color: "bg-gray-400",
    bgColor: "bg-gray-500/10",
    description: "Not available for chat",
  },
};

export function AgentStatusDropdown() {
  const { availability, updateStatus, isLoading, role } = useAgent();
  const [isOpen, setIsOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Don't show if user is not an agent
  if (!role?.isAgent) {
    return null;
  }

  const currentStatus = availability?.status || "offline";
  const config = statusConfig[currentStatus];

  const handleStatusChange = async (status: AgentStatus) => {
    if (status === currentStatus || isUpdating) return;

    setIsUpdating(true);
    try {
      await updateStatus(status);
      setIsOpen(false);
    } catch (err) {
      console.error("Failed to update status:", err);
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted animate-pulse">
        <div className="w-2 h-2 rounded-full bg-gray-400" />
        <span className="text-sm text-muted-foreground">Loading...</span>
      </div>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Status Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isUpdating}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-colors ${config.bgColor} hover:opacity-80 disabled:opacity-50`}
      >
        <span className={`w-2 h-2 rounded-full ${config.color}`} />
        <span className="text-sm font-medium">{config.label}</span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-64 bg-card border rounded-lg shadow-lg py-1 z-50">
          {/* Header */}
          <div className="px-4 py-2 border-b">
            <p className="text-sm font-medium">Agent Status</p>
            <p className="text-xs text-muted-foreground">
              {availability?.currentChatCount || 0} / {availability?.maxConcurrentChats || 5} active
              chats
            </p>
          </div>

          {/* Status Options */}
          <div className="py-1">
            {(Object.entries(statusConfig) as [AgentStatus, typeof config][]).map(
              ([status, statusInfo]) => (
                <button
                  key={status}
                  onClick={() => handleStatusChange(status)}
                  disabled={isUpdating}
                  className={`w-full px-4 py-2 text-left hover:bg-muted transition-colors flex items-center gap-3 ${
                    status === currentStatus ? "bg-muted" : ""
                  }`}
                >
                  <span className={`w-3 h-3 rounded-full ${statusInfo.color}`} />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{statusInfo.label}</p>
                    <p className="text-xs text-muted-foreground">{statusInfo.description}</p>
                  </div>
                  {status === currentStatus && (
                    <svg className="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </button>
              )
            )}
          </div>

          {/* Quick Actions */}
          {currentStatus === "online" && (availability?.currentChatCount || 0) > 0 && (
            <div className="px-4 py-2 border-t">
              <p className="text-xs text-muted-foreground">
                Tip: Set to &quot;Away&quot; to stop receiving new conversations while finishing
                current chats.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
