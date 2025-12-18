"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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
import { ChatMessage, type ChatMessageProps } from "@/components/chat/chat-message";
import { ChatInput } from "@/components/chat/chat-input";
import { apiClient } from "@/lib/api-client";

interface Message extends Omit<ChatMessageProps, "isLoading"> {
  id: string;
}

interface ProjectInfo {
  id: string;
  name: string;
  knowledgeCount: number;
  endpointCount: number;
}

interface ProjectResponse {
  project: ProjectInfo;
}

interface ChatResponse {
  response: string;
  sessionId: string;
  sources: Array<{ id: string; name: string; relevance: number }>;
  toolCalls: Array<{ name: string; success: boolean; duration: number }>;
  processingTime: number;
}

export default function PlaygroundPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [projectInfo, setProjectInfo] = useState<ProjectInfo | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch project info on mount
  useEffect(() => {
    async function fetchProjectInfo() {
      try {
        // Use API with include_stats to get knowledge/endpoint counts
        const data = await apiClient<ProjectResponse>("/api/projects?include_stats=true");
        setProjectInfo({
          id: data.project.id,
          name: data.project.name,
          knowledgeCount: data.project.knowledgeCount || 0,
          endpointCount: data.project.endpointCount || 0,
        });
      } catch (err) {
        console.error("Failed to fetch project info:", err);
      }
    }

    fetchProjectInfo();
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = useCallback(async (content: string) => {
    if (!projectInfo) {
      setError("No project found. Please create a project first.");
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
          projectId: projectInfo.id,
          message: content,
          sessionId,
          conversationHistory,
          visitorId: `playground-${projectInfo.id}`,
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
      setError(err instanceof Error ? err.message : "Failed to send message");

      // Add error message
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: "assistant",
        content: "I'm sorry, I encountered an error processing your message. Please try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [projectInfo, sessionId, messages]);

  const clearChat = () => {
    setMessages([]);
    setSessionId(null);
    setError(null);
  };

  const hasSetup = projectInfo && (projectInfo.knowledgeCount > 0 || projectInfo.endpointCount > 0);

  return (
    <TooltipProvider>
      <div className="flex flex-col h-[calc(100vh-8rem)]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-violet-500" />
              Chat Playground
            </h1>
            <p className="text-muted-foreground">
              Test your chatbot with real-time RAG and tool calling
            </p>
          </div>
          <div className="flex items-center gap-2">
            {sessionId && (
              <Badge variant="outline" className="text-xs">
                Session: {sessionId.slice(0, 8)}...
              </Badge>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={clearChat}
              disabled={messages.length === 0}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear
            </Button>
          </div>
        </div>

        <div className="flex-1 flex gap-4 pt-4 min-h-0">
          {/* Chat area */}
          <Card className="flex-1 flex flex-col overflow-hidden">
            {/* Status bar */}
            {projectInfo && (
              <div className="flex items-center gap-4 px-4 py-2 border-b bg-muted/30 text-sm">
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-muted-foreground" />
                  <span>{projectInfo.knowledgeCount} knowledge sources</span>
                </div>
                <div className="flex items-center gap-2">
                  <Plug className="h-4 w-4 text-muted-foreground" />
                  <span>{projectInfo.endpointCount} API endpoints</span>
                </div>
              </div>
            )}

            {/* Messages area */}
            <ScrollArea className="flex-1">
              <div className="p-4">
                {messages.length === 0 ? (
                  <EmptyState hasSetup={!!hasSetup} projectName={projectInfo?.name} />
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
              disabled={!projectInfo}
              placeholder={
                projectInfo
                  ? "Ask me anything about your knowledge base..."
                  : "Loading project..."
              }
            />
          </Card>

          {/* Info sidebar */}
          <div className="w-72 space-y-4 hidden lg:block">
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Info className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-medium">How it works</h3>
              </div>
              <ol className="space-y-2 text-sm text-muted-foreground">
                <li className="flex gap-2">
                  <span className="font-bold text-foreground">1.</span>
                  Your message is embedded and searched against your knowledge base
                </li>
                <li className="flex gap-2">
                  <span className="font-bold text-foreground">2.</span>
                  Relevant context is retrieved using vector similarity
                </li>
                <li className="flex gap-2">
                  <span className="font-bold text-foreground">3.</span>
                  If needed, API tools are called for real-time data
                </li>
                <li className="flex gap-2">
                  <span className="font-bold text-foreground">4.</span>
                  GPT-4o-mini generates a response using the context
                </li>
              </ol>
            </Card>

            <Card className="p-4">
              <h3 className="font-medium mb-3">Try asking</h3>
              <div className="space-y-2">
                {[
                  "What do you know about?",
                  "Tell me about your return policy",
                  "Where is my order #12345?",
                  "What services do you offer?",
                ].map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => sendMessage(suggestion)}
                    disabled={isLoading || !projectInfo}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-md text-sm",
                      "bg-muted/50 hover:bg-muted transition-colors",
                      "disabled:opacity-50 disabled:cursor-not-allowed"
                    )}
                  >
                    "{suggestion}"
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
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center">
      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-500/20 to-purple-600/20 flex items-center justify-center mb-4">
        <MessageSquare className="h-8 w-8 text-violet-500" />
      </div>
      <h3 className="text-lg font-medium mb-2">
        {hasSetup
          ? `Start chatting with ${projectName || "your assistant"}`
          : "Set up your knowledge base first"}
      </h3>
      <p className="text-muted-foreground max-w-sm">
        {hasSetup
          ? "Type a message below to test your chatbot's RAG capabilities and tool calling features."
          : "Add knowledge sources and configure API endpoints to enable your chatbot to answer questions."}
      </p>
      {!hasSetup && (
        <div className="mt-4 flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <a href="/knowledge">Add Knowledge</a>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a href="/api-endpoints">Configure APIs</a>
          </Button>
        </div>
      )}
    </div>
  );
}
