"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { apiClient } from "@/lib/api-client";
import { useProject } from "@/contexts/project-context";
import { useAgent } from "@/contexts/agent-context";
import { useInboxPolling } from "@/contexts/inbox-polling-context";
import { useInboxRealtime, QueueUpdate, ConversationUpdate } from "@/hooks/use-inbox-realtime";
import { Button, Card, CardContent, Skeleton, Badge } from "@chatbot/ui";
import {
  AlertCircle,
  Inbox,
  Clock,
  MessageSquare,
  User,
  RefreshCw,
  CheckCircle2,
  Wifi,
  WifiOff,
} from "lucide-react";

// ============================================================================
// Types
// ============================================================================

interface Conversation {
  id: string;
  visitorId: string;
  customerEmail: string | null;
  customerName: string | null;
  status: "ai_active" | "waiting" | "agent_active" | "resolved" | "closed";
  assignedAgent: { id: string; name: string } | null;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string | null;
  queueEnteredAt: string | null;
  resolvedAt: string | null;
  lastMessage?: {
    content: string;
    senderType: string;
    createdAt: string;
  };
}

interface QueueItem {
  id: string;
  visitorId: string;
  customerEmail: string | null;
  customerName: string | null;
  position: number;
  waitingSince: string;
  messageCount: number;
}

// Helper to safely format dates
function formatTime(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// Helper to check if a date is today
function isToday(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false;
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return false;
  const today = new Date();
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}

// ============================================================================
// Conversation List Item
// ============================================================================

function ConversationListItem({ conversation, showAgent }: { conversation: Conversation; showAgent?: boolean }) {
  const statusConfig = {
    ai_active: { label: "AI", color: "bg-blue-500", textColor: "text-blue-600" },
    waiting: { label: "Waiting", color: "bg-yellow-500", textColor: "text-yellow-600" },
    agent_active: { label: "Active", color: "bg-green-500", textColor: "text-green-600" },
    resolved: { label: "Resolved", color: "bg-gray-400", textColor: "text-gray-600" },
    closed: { label: "Closed", color: "bg-gray-400", textColor: "text-gray-600" },
  };

  const config = statusConfig[conversation.status];
  const displayName = conversation.customerName || conversation.customerEmail || `Visitor ${conversation.visitorId.slice(0, 8)}`;
  const agentName = conversation.assignedAgent?.name;

  return (
    <Link
      href={`/inbox/${conversation.id}`}
      className="block p-4 border rounded-lg hover:bg-muted/50 transition-colors"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
            <User className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium truncate">{displayName}</span>
              <span className={`w-2 h-2 rounded-full ${config.color}`} />
            </div>
            <p className="text-sm text-muted-foreground truncate max-w-xs">
              {conversation.lastMessage?.content || "No messages yet"}
            </p>
            {showAgent && agentName && (
              <p className="text-xs text-muted-foreground mt-1">
                Assigned to: <span className="font-medium text-foreground">{agentName}</span>
              </p>
            )}
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">
            {formatTime(conversation.lastMessageAt) || formatTime(conversation.updatedAt) || formatTime(conversation.createdAt)}
          </p>
          <Badge variant="secondary" className={`text-xs mt-1 ${config.textColor}`}>
            {config.label}
          </Badge>
        </div>
      </div>
    </Link>
  );
}

// ============================================================================
// Queue Item
// ============================================================================

function QueueListItem({
  item,
  onClaim,
  claiming,
}: {
  item: QueueItem;
  onClaim: (id: string) => void;
  claiming: boolean;
}) {
  const displayName = item.customerName || item.customerEmail || `Visitor ${item.visitorId.slice(0, 8)}`;
  const waitingSince = item.waitingSince ? new Date(item.waitingSince).getTime() : Date.now();
  const waitTime = isNaN(waitingSince) ? 0 : Math.floor((Date.now() - waitingSince) / 60000);

  return (
    <div className="flex items-center justify-between p-4 border rounded-lg bg-yellow-500/5 border-yellow-500/20">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center text-yellow-600 font-medium text-sm">
          #{item.position}
        </div>
        <div>
          <p className="font-medium">{displayName}</p>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Waiting {waitTime}m • {item.messageCount} messages
          </p>
        </div>
      </div>
      <Button size="sm" onClick={() => onClaim(item.id)} disabled={claiming}>
        {claiming ? "Claiming..." : "Claim"}
      </Button>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

// Polling interval: 30 seconds (fallback for realtime)
const POLL_INTERVAL_MS = 30 * 1000;

export default function InboxPage() {
  const { currentProject, isLoading: projectLoading } = useProject();
  const { role, availability, agent } = useAgent();
  const { markAsSeen, pausePolling, resumePolling } = useInboxPolling();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [filter, setFilter] = useState<"active" | "waiting" | "mine" | "all">("mine");
  const [isOwner, setIsOwner] = useState(false);
  const [lastPolled, setLastPolled] = useState<Date | null>(null);

  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    if (!currentProject) return;

    setLoading(true);
    setError(null);

    try {
      // Fetch conversations
      const response = await apiClient<{ conversations: Conversation[]; pagination: unknown; isOwner: boolean }>(
        `/api/conversations?projectId=${currentProject.id}&limit=50`
      );
      setConversations(response.conversations || []);
      setIsOwner(response.isOwner || false);

      // Fetch queue
      const queueResponse = await apiClient<{ queue: QueueItem[]; count: number }>(
        `/api/projects/${currentProject.id}/queue`
      );
      setQueue(queueResponse.queue || []);
    } catch (err) {
      console.error("Failed to fetch conversations:", err);
      setError("Failed to load conversations");
    } finally {
      setLoading(false);
    }
  }, [currentProject]);

  // Realtime event handlers (memoized to prevent re-subscriptions)
  const realtimeHandlers = useMemo(
    () => ({
      onQueueUpdate: (update: QueueUpdate) => {
        console.log("[Inbox] Queue update received:", update);

        if (update.type === "added") {
          // New item in queue - refresh to get full data
          fetchConversations();
        } else if (update.type === "claimed") {
          // Item claimed - remove from queue
          setQueue((prev) => prev.filter((item) => item.id !== update.conversationId));
        } else if (update.type === "removed") {
          // Item removed - remove from queue
          setQueue((prev) => prev.filter((item) => item.id !== update.conversationId));
        }
      },
      onConversationUpdate: (update: ConversationUpdate) => {
        console.log("[Inbox] Conversation update received:", update);

        if (update.type === "status_changed" && update.data?.status) {
          // Update conversation status in list
          setConversations((prev) =>
            prev.map((conv) =>
              conv.id === update.conversationId
                ? { ...conv, status: update.data!.status as Conversation["status"] }
                : conv
            )
          );
        }
      },
      onRefreshNeeded: () => {
        console.log("[Inbox] Refresh triggered by realtime");
        fetchConversations();
      },
    }),
    [fetchConversations]
  );

  // Setup realtime subscriptions
  const { isSubscribed } = useInboxRealtime(
    currentProject?.id || null,
    realtimeHandlers
  );

  // Initial fetch when project changes
  useEffect(() => {
    if (currentProject) {
      fetchConversations();
    }
  }, [currentProject, fetchConversations]);

  // Poll for updates every 30 seconds as fallback for realtime
  useEffect(() => {
    if (!currentProject) return;

    const silentFetch = async () => {
      try {
        const response = await apiClient<{ conversations: Conversation[]; pagination: unknown; isOwner: boolean }>(
          `/api/conversations?projectId=${currentProject.id}&limit=50`
        );
        setConversations(response.conversations || []);
        setIsOwner(response.isOwner || false);

        const queueResponse = await apiClient<{ queue: QueueItem[]; count: number }>(
          `/api/projects/${currentProject.id}/queue`
        );
        setQueue(queueResponse.queue || []);
        setLastPolled(new Date());

        // Mark items as seen in global context since we're viewing inbox
        markAsSeen();

        if (process.env.NODE_ENV === "development") {
          console.log("[Inbox] Background poll completed");
        }
      } catch (err) {
        // Silent fail - don't show error for background polling
        console.error("[Inbox] Background poll failed:", err);
      }
    };

    const pollInterval = setInterval(silentFetch, POLL_INTERVAL_MS);

    return () => clearInterval(pollInterval);
  }, [currentProject, markAsSeen]);

  // Pause global polling while on inbox page (we handle our own refresh)
  useEffect(() => {
    pausePolling();
    markAsSeen();
    return () => resumePolling();
  }, [pausePolling, resumePolling, markAsSeen]);

  // Claim conversation from queue
  const handleClaim = async (conversationId: string) => {
    if (!currentProject) return;

    setClaiming(conversationId);

    try {
      await apiClient(`/api/conversations/${conversationId}/claim`, {
        method: "POST",
      });
      // Refresh data
      fetchConversations();
    } catch (err) {
      console.error("Failed to claim conversation:", err);
      setError("Failed to claim conversation");
    } finally {
      setClaiming(null);
    }
  };

  // Filter and sort conversations by recency
  const filteredConversations = conversations
    .filter((conv) => {
      switch (filter) {
        case "active":
          return conv.status === "agent_active";
        case "waiting":
          return conv.status === "waiting";
        case "mine":
          // For "My Chats", show only conversations assigned to current user
          return conv.assignedAgent?.id === agent?.id;
        case "all":
        default:
          return true;
      }
    })
    .sort((a, b) => {
      const dateA = new Date(a.lastMessageAt || a.updatedAt || a.createdAt).getTime() || 0;
      const dateB = new Date(b.lastMessageAt || b.updatedAt || b.createdAt).getTime() || 0;
      return dateB - dateA; // Most recent first
    });

  // Stats - count MY active chats
  const myActiveCount = conversations.filter(
    (c) => c.status === "agent_active" && c.assignedAgent?.id === agent?.id
  ).length;

  // Loading state
  if (projectLoading || loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-4 w-48 mt-2" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Card>
          <CardContent className="p-6 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!currentProject) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Inbox</h1>
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">No project selected</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if agent is online
  const isOnline = availability?.status === "online";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Inbox className="h-6 w-6" />
            Inbox
            {isSubscribed ? (
              <span className="text-xs font-normal text-green-600 flex items-center gap-1">
                <Wifi className="h-3 w-3" />
                Live
              </span>
            ) : (
              <span className="text-xs font-normal text-muted-foreground flex items-center gap-1">
                <WifiOff className="h-3 w-3" />
              </span>
            )}
          </h1>
          <p className="text-muted-foreground">
            {myActiveCount} active conversation{myActiveCount !== 1 ? "s" : ""}
            {lastPolled && (
              <span className="text-xs ml-2">
                · Updated {formatTime(lastPolled.toISOString())}
              </span>
            )}
          </p>
        </div>
        <Button variant="outline" onClick={fetchConversations}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Offline Warning */}
      {!isOnline && (
        <div className="flex items-center gap-2 p-4 rounded-md bg-yellow-500/10 text-yellow-600">
          <AlertCircle className="h-4 w-4" />
          <p>You are currently offline. Go online to receive new conversations.</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-4 rounded-md bg-destructive/10 text-destructive">
          <AlertCircle className="h-4 w-4" />
          <p>{error}</p>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <MessageSquare className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{myActiveCount}</p>
                <p className="text-xs text-muted-foreground">Active Chats</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-500/10">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{queue.length}</p>
                <p className="text-xs text-muted-foreground">In Queue</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <CheckCircle2 className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {conversations.filter((c) => c.status === "resolved" && isToday(c.resolvedAt)).length}
                </p>
                <p className="text-xs text-muted-foreground">Resolved Today</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Queue Section */}
      {queue.length > 0 && isOnline && (
        <Card>
          <CardContent className="p-6">
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-600" />
              Queue ({queue.length} waiting)
            </h2>
            <div className="space-y-3">
              {queue.slice(0, 5).map((item) => (
                <QueueListItem
                  key={item.id}
                  item={item}
                  onClaim={handleClaim}
                  claiming={claiming === item.id}
                />
              ))}
              {queue.length > 5 && (
                <p className="text-sm text-muted-foreground text-center">
                  +{queue.length - 5} more in queue
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Conversations List */}
      <Card>
        <CardContent className="p-6">
          {/* Filter Tabs */}
          <div className="flex items-center gap-2 mb-4 border-b pb-4">
            {[
              { key: "mine", label: "My Chats" },
              { key: "active", label: "Active" },
              { key: "waiting", label: "Waiting" },
              // Only show "All" tab for owners
              ...(isOwner ? [{ key: "all", label: "All" }] : []),
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key as typeof filter)}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  filter === tab.key
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Conversation List */}
          {filteredConversations.length === 0 ? (
            <div className="text-center py-8">
              <Inbox className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No conversations</p>
              {filter !== "all" && (
                <Button
                  variant="link"
                  onClick={() => setFilter("all")}
                  className="mt-2"
                >
                  View all conversations
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredConversations.map((conversation) => (
                <ConversationListItem
                  key={conversation.id}
                  conversation={conversation}
                  showAgent={isOwner && filter === "all"}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
