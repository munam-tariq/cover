"use client";

import { cn } from "@chatbot/ui";
import { Bot, User, Sparkles, Clock, CheckCircle2, XCircle } from "lucide-react";

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
  role: "user" | "assistant";
  content: string;
  sources?: ChatMessageSource[];
  toolCalls?: ChatMessageToolCall[];
  isLoading?: boolean;
  processingTime?: number;
  timestamp?: Date;
}

export function ChatMessage({
  role,
  content,
  sources,
  toolCalls,
  isLoading,
  processingTime,
  timestamp,
}: ChatMessageProps) {
  const isUser = role === "user";

  return (
    <div
      className={cn(
        "flex gap-3 py-4 px-4 -mx-4",
        isUser ? "bg-transparent" : "bg-muted/30"
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
          isUser ? "bg-primary text-primary-foreground" : "bg-gradient-to-br from-violet-500 to-purple-600 text-white"
        )}
      >
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>

      {/* Content */}
      <div className="flex-1 space-y-2 overflow-hidden">
        {/* Message header */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">
            {isUser ? "You" : "Assistant"}
          </span>
          {timestamp && (
            <span className="text-xs text-muted-foreground">
              {timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
          {processingTime && !isUser && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" />
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
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <p className="whitespace-pre-wrap break-words leading-relaxed">{content}</p>
          </div>
        )}

        {/* Tool calls */}
        {toolCalls && toolCalls.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2">
            {toolCalls.map((tool, index) => (
              <div
                key={index}
                className={cn(
                  "inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs",
                  tool.success
                    ? "bg-green-500/10 text-green-700 dark:text-green-400"
                    : "bg-red-500/10 text-red-700 dark:text-red-400"
                )}
              >
                {tool.success ? (
                  <CheckCircle2 className="w-3 h-3" />
                ) : (
                  <XCircle className="w-3 h-3" />
                )}
                <span className="font-medium">{formatToolName(tool.name)}</span>
                <span className="opacity-60">({tool.duration}ms)</span>
              </div>
            ))}
          </div>
        )}

        {/* Sources */}
        {sources && sources.length > 0 && (
          <div className="pt-2 border-t border-border/50 mt-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
              <Sparkles className="w-3 h-3" />
              <span>Sources used</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {sources.map((source) => (
                <div
                  key={source.id}
                  className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-secondary text-secondary-foreground text-xs"
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
      <div className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:-0.3s]" />
      <div className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:-0.15s]" />
      <div className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" />
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
