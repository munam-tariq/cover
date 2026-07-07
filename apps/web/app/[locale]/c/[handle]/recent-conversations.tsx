"use client";

import { cn } from "@chatbot/ui";
import { MessageSquare } from "lucide-react";

import type { ConversationSummary } from "./lib/public-api";

/**
 * Sidebar list of this visitor's past public-page conversations (server-persisted,
 * keyed by visitorId). Clicking one rehydrates the thread.
 */
export function RecentConversations({
  conversations,
  activeId,
  onSelect,
}: {
  conversations: ConversationSummary[];
  activeId: string | null;
  onSelect: (id: string) => void;
}) {
  if (conversations.length === 0) {
    return (
      <div className="text-muted-foreground px-4 py-2 text-xs">
        Your conversations will appear here.
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-0.5 overflow-y-auto px-2 py-1">
      {conversations.map((c) => (
        <button
          key={c.id}
          onClick={() => onSelect(c.id)}
          className={cn(
            "hover:bg-muted flex w-full items-start gap-2 rounded-md px-2 py-2 text-left text-xs transition",
            activeId === c.id && "bg-muted"
          )}
        >
          <MessageSquare className="text-muted-foreground mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span className="min-w-0 flex-1">
            <span className="block truncate">
              {c.snippet || "Conversation"}
            </span>
            <span className="text-muted-foreground block text-[10px]">
              {c.lastMessageAt
                ? new Date(c.lastMessageAt).toLocaleDateString()
                : ""}
              {c.status === "waiting" || c.status === "agent_active"
                ? " · with support"
                : ""}
            </span>
          </span>
        </button>
      ))}
    </div>
  );
}
