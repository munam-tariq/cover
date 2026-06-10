"use client";

import { cn } from "@chatbot/ui";
import {
  Bot,
  Headphones,
  User,
  Sparkles,
  Clock,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import ReactMarkdown from "react-markdown";

export interface ChatMessageSource {
  id: string;
  name: string;
  relevance: number;
}

export interface ChatMessageToolCall {
  name: string;
  success: boolean;
  duration: number;
}

export interface ChatMessageProps {
  role: "user" | "assistant" | "agent" | "system";
  content: string;
  sources?: ChatMessageSource[];
  toolCalls?: ChatMessageToolCall[];
  isLoading?: boolean;
  processingTime?: number;
  timestamp?: Date;
  /** Optional accent color for the assistant avatar (used by the public page). */
  accentColor?: string;
  /** Display name for human-agent messages (handoff). */
  senderName?: string;
}

export function ChatMessage({
  role,
  content,
  sources,
  toolCalls,
  isLoading,
  processingTime,
  timestamp,
  accentColor,
  senderName,
}: ChatMessageProps) {
  const isUser = role === "user";
  const isAgent = role === "agent";

  // System messages ("Agent joined", "Conversation resolved") render as a muted divider line.
  if (role === "system") {
    return (
      <div className="text-muted-foreground py-3 text-center text-xs">
        {content}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "-mx-4 flex gap-3 px-4 py-4",
        isUser ? "bg-transparent" : "bg-muted/30"
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full",
          isUser
            ? "bg-primary text-primary-foreground"
            : accentColor
              ? "text-white"
              : "bg-gradient-to-br from-violet-500 to-purple-600 text-white"
        )}
        style={
          !isUser && accentColor ? { backgroundColor: accentColor } : undefined
        }
      >
        {isUser ? (
          <User className="h-4 w-4" />
        ) : isAgent ? (
          <Headphones className="h-4 w-4" />
        ) : (
          <Bot className="h-4 w-4" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 space-y-2 overflow-hidden">
        {/* Message header */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">
            {isUser
              ? "You"
              : isAgent
                ? senderName || "Support agent"
                : "Assistant"}
          </span>
          {timestamp && (
            <span className="text-muted-foreground text-xs">
              {timestamp.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          )}
          {processingTime && !isUser && (
            <span className="text-muted-foreground flex items-center gap-1 text-xs">
              <Clock className="h-3 w-3" />
              {processingTime}ms
            </span>
          )}
        </div>

        {/* Message content */}
        {isLoading ? (
          <div className="flex items-center gap-2">
            <TypingIndicator />
          </div>
        ) : (
          <div className="prose prose-sm dark:prose-invert prose-p:leading-relaxed prose-pre:bg-muted prose-pre:text-sm prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none max-w-none">
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        )}

        {/* Tool calls */}
        {toolCalls && toolCalls.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2">
            {toolCalls.map((tool, index) => (
              <div
                key={index}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs",
                  tool.success
                    ? "bg-green-500/10 text-green-700 dark:text-green-400"
                    : "bg-red-500/10 text-red-700 dark:text-red-400"
                )}
              >
                {tool.success ? (
                  <CheckCircle2 className="h-3 w-3" />
                ) : (
                  <XCircle className="h-3 w-3" />
                )}
                <span className="font-medium">{formatToolName(tool.name)}</span>
                <span className="opacity-60">({tool.duration}ms)</span>
              </div>
            ))}
          </div>
        )}

        {/* Sources */}
        {sources && sources.length > 0 && (
          <div className="border-border/50 mt-3 border-t pt-2">
            <div className="text-muted-foreground mb-2 flex items-center gap-1.5 text-xs">
              <Sparkles className="h-3 w-3" />
              <span>Sources used</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {sources.map((source) => (
                <div
                  key={source.id}
                  className="bg-secondary text-secondary-foreground inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs"
                >
                  <span>{source.name}</span>
                  <span className="opacity-50">({source.relevance}%)</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1">
      <div className="bg-muted-foreground/40 h-2 w-2 animate-bounce rounded-full [animation-delay:-0.3s]" />
      <div className="bg-muted-foreground/40 h-2 w-2 animate-bounce rounded-full [animation-delay:-0.15s]" />
      <div className="bg-muted-foreground/40 h-2 w-2 animate-bounce rounded-full" />
    </div>
  );
}

function formatToolName(name: string): string {
  // Convert ID-like names to human readable
  return name
    .replace(/[-_]/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}
