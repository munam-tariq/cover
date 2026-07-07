"use client";

import { Button, Card, Badge, ScrollArea, cn, TooltipProvider } from "@chatbot/ui";
import {
  MessageSquare,
  Trash2,
  Info,
  Database,
  Plug,
  AlertCircle,
  Sparkles,
  RefreshCw
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useEffect, useRef, useCallback } from "react";

import { ChatInput } from "@/components/chat/chat-input";
import { ChatMessage, type ChatMessageProps } from "@/components/chat/chat-message";
import { useProject } from "@/contexts/project-context";
import { Link } from "@/i18n/navigation";
import { apiClient } from "@/lib/api-client";

interface Message extends Omit<ChatMessageProps, "isLoading"> {
  id: string;
}

interface ProjectStats {
  knowledgeCount: number;
  endpointCount: number;
}

interface ChatResponse {
  response: string;
  sessionId: string;
  sources: Array<{ id: string; name: string; relevance: number }>;
  toolCalls: Array<{ name: string; success: boolean; duration: number }>;
  processingTime: number;
}

export default function PlaygroundPage() {
  const t = useTranslations("dashboard.pages.playground");
  const { currentProject, isLoading: projectLoading } = useProject();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState<ProjectStats>({ knowledgeCount: 0, endpointCount: 0 });
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch project stats when project changes
  useEffect(() => {
    const projectId = currentProject?.id;
    if (!projectId) return;

    async function fetchStats() {
      try {
        const [knowledgeData, endpointsData] = await Promise.all([
          apiClient<{ sources: Array<{ id: string }> }>(`/api/knowledge?projectId=${projectId}`).catch(() => ({ sources: [] })),
          apiClient<{ endpoints: Array<{ id: string }> }>(`/api/endpoints?projectId=${projectId}`).catch(() => ({ endpoints: [] })),
        ]);

        setStats({
          knowledgeCount: knowledgeData.sources?.length || 0,
          endpointCount: endpointsData.endpoints?.length || 0,
        });
      } catch (err) {
        console.error("Failed to fetch project stats:", err);
      }
    }

    fetchStats();
    // Reset chat when project changes
    setMessages([]);
    setSessionId(null);
    setError(null);
  }, [currentProject?.id]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = useCallback(async (content: string) => {
    if (!currentProject) {
      setError(t("noProjectError"));
      return;
    }

    setError(null);
    setIsLoading(true);

    // Add user message immediately
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);

    try {
      // Build conversation history for context
      const conversationHistory = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      // Call chat API
      const response = await apiClient<ChatResponse>("/api/chat/message", {
        method: "POST",
        body: JSON.stringify({
          projectId: currentProject.id,
          message: content,
          sessionId,
          conversationHistory,
          visitorId: `playground-${currentProject.id}`,
          source: "playground",
        }),
      });

      // Update session ID
      if (response.sessionId) {
        setSessionId(response.sessionId);
      }

      // Add assistant message
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: response.response,
        sources: response.sources,
        toolCalls: response.toolCalls,
        processingTime: response.processingTime,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      console.error("Chat error:", err);
      setError(err instanceof Error ? err.message : t("sendError"));

      // Add error message
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: "assistant",
        content: t("assistantError"),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [currentProject, sessionId, messages, t]);

  const clearChat = () => {
    setMessages([]);
    setSessionId(null);
    setError(null);
  };

  const hasSetup = stats.knowledgeCount > 0 || stats.endpointCount > 0;

  // Show loading state while project is loading
  if (projectLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-2 text-muted-foreground">
          <RefreshCw className="h-5 w-5 animate-spin" />
          <span>{t("loadingProject")}</span>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="flex flex-col h-[calc(100vh-8rem)]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-violet-500" />
              {t("title")}
            </h1>
            <p className="text-muted-foreground">
              {t("subtitle")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {sessionId && (
              <Badge variant="outline" className="text-xs">
                {t("session", { id: sessionId.slice(0, 8) })}
              </Badge>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={clearChat}
              disabled={messages.length === 0}
            >
              <Trash2 className="h-4 w-4 me-2" />
              {t("clear")}
            </Button>
          </div>
        </div>

        <div className="flex-1 flex gap-4 pt-4 min-h-0">
          {/* Chat area */}
          <Card className="flex-1 flex flex-col overflow-hidden">
            {/* Status bar */}
            {currentProject && (
              <div className="flex items-center gap-4 px-4 py-2 border-b bg-muted/30 text-sm">
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-muted-foreground" />
                  <span>{t("knowledgeSources", { count: stats.knowledgeCount })}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Plug className="h-4 w-4 text-muted-foreground" />
                  <span>{t("apiEndpoints", { count: stats.endpointCount })}</span>
                </div>
              </div>
            )}

            {/* Messages area */}
            <ScrollArea className="flex-1">
              <div className="p-4">
                {messages.length === 0 ? (
                  <EmptyState hasSetup={hasSetup} projectName={currentProject?.name} />
                ) : (
                  <div className="space-y-2">
                    {messages.map((message) => (
                      <ChatMessage
                        key={message.id}
                        role={message.role}
                        content={message.content}
                        sources={message.sources}
                        toolCalls={message.toolCalls}
                        processingTime={message.processingTime}
                        timestamp={message.timestamp}
                      />
                    ))}
                    {isLoading && (
                      <ChatMessage
                        role="assistant"
                        content=""
                        isLoading={true}
                      />
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Error display */}
            {error && (
              <div className="px-4 py-2 bg-destructive/10 text-destructive text-sm flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}

            {/* Input area */}
            <ChatInput
              onSend={sendMessage}
              isLoading={isLoading}
              disabled={!currentProject}
              placeholder={
                currentProject
                  ? t("inputReady")
                  : t("loadingProject")
              }
            />
          </Card>

          {/* Info sidebar */}
          <div className="w-72 space-y-4 hidden lg:block">
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Info className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-medium">{t("howItWorks")}</h3>
              </div>
              <ol className="space-y-2 text-sm text-muted-foreground">
                <li className="flex gap-2">
                  <span className="font-bold text-foreground">1.</span>
                  {t("steps.embed")}
                </li>
                <li className="flex gap-2">
                  <span className="font-bold text-foreground">2.</span>
                  {t("steps.retrieve")}
                </li>
                <li className="flex gap-2">
                  <span className="font-bold text-foreground">3.</span>
                  {t("steps.tools")}
                </li>
                <li className="flex gap-2">
                  <span className="font-bold text-foreground">4.</span>
                  {t("steps.generate")}
                </li>
              </ol>
            </Card>

            <Card className="p-4">
              <h3 className="font-medium mb-3">{t("tryAsking")}</h3>
              <div className="space-y-2">
                {[
                  t("suggestions.one"),
                  t("suggestions.two"),
                  t("suggestions.three"),
                  t("suggestions.four"),
                ].map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => sendMessage(suggestion)}
                    disabled={isLoading || !currentProject}
                    className={cn(
                      "w-full text-start px-3 py-2 rounded-md text-sm",
                      "bg-muted/50 hover:bg-muted transition-colors",
                      "disabled:opacity-50 disabled:cursor-not-allowed"
                    )}
                  >
                    &quot;{suggestion}&quot;
                  </button>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}

function EmptyState({ hasSetup, projectName }: { hasSetup?: boolean; projectName?: string }) {
  const t = useTranslations("dashboard.pages.playground.empty");
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center">
      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-500/20 to-purple-600/20 flex items-center justify-center mb-4">
        <MessageSquare className="h-8 w-8 text-violet-500" />
      </div>
      <h3 className="text-lg font-medium mb-2">
        {hasSetup
          ? t("readyTitle", { name: projectName || t("fallbackName") })
          : t("setupTitle")}
      </h3>
      <p className="text-muted-foreground max-w-sm">
        {hasSetup
          ? t("readyDescription")
          : t("setupDescription")}
      </p>
      {!hasSetup && (
        <div className="mt-4 flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/knowledge">{t("addKnowledge")}</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/api-endpoints">{t("configureApis")}</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
