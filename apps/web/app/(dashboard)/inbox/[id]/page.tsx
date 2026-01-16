"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { apiClient } from "@/lib/api-client";
import { useProject } from "@/contexts/project-context";
import { useAgent } from "@/contexts/agent-context";
import { useConversationRealtime } from "@/hooks/use-inbox-realtime";
import { Button, Card, CardContent, Skeleton, Badge } from "@chatbot/ui";
import {
  AlertCircle,
  ArrowLeft,
  Send,
  User,
  Bot,
  Clock,
  Mail,
  MessageSquare,
  MoreHorizontal,
  CheckCircle,
  ArrowRightLeft,
  X,
  Loader2,
  Wifi,
  WifiOff,
} from "lucide-react";

// ============================================================================
// Types
// ============================================================================

interface Message {
  id: string;
  senderType: "customer" | "agent" | "ai" | "system";
  senderId?: string;
  content: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

interface Conversation {
  id: string;
  visitorId: string;
  customerEmail: string | null;
  customerName: string | null;
  status: "ai_active" | "waiting" | "agent_active" | "resolved" | "closed";
  assignedAgentId: string | null;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
  handoffReason?: string;
  handoffTriggeredAt?: string;
}

interface Customer {
  id: string;
  email: string | null;
  name: string | null;
  conversationCount: number;
  totalMessageCount: number;
  firstSeenAt: string;
  lastSeenAt: string;
}

// ============================================================================
// Message Component
// ============================================================================

function MessageBubble({ message }: { message: Message }) {
  const isCustomer = message.senderType === "customer";
  const isSystem = message.senderType === "system";
  const isAI = message.senderType === "ai";

  if (isSystem) {
    return (
      <div className="flex justify-center my-4">
        <div className="bg-muted px-4 py-2 rounded-full text-sm text-muted-foreground">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex ${isCustomer ? "justify-start" : "justify-end"} mb-4`}>
      <div
        className={`max-w-[70%] ${
          isCustomer
            ? "bg-muted rounded-lg rounded-bl-none"
            : isAI
            ? "bg-blue-500/10 text-blue-900 dark:text-blue-100 rounded-lg rounded-br-none"
            : "bg-primary text-primary-foreground rounded-lg rounded-br-none"
        } px-4 py-3`}
      >
        {/* Sender Label */}
        <div className="flex items-center gap-2 mb-1">
          {isCustomer ? (
            <User className="h-3 w-3" />
          ) : isAI ? (
            <Bot className="h-3 w-3" />
          ) : (
            <User className="h-3 w-3" />
          )}
          <span className="text-xs font-medium">
            {isCustomer ? "Customer" : isAI ? "AI Assistant" : "Agent"}
          </span>
        </div>
        {/* Content */}
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        {/* Timestamp */}
        <p
          className={`text-xs mt-1 ${
            isCustomer ? "text-muted-foreground" : "opacity-70"
          }`}
        >
          {new Date(message.createdAt).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// Customer Context Panel
// ============================================================================

function CustomerContextPanel({
  conversation,
  customer,
  previousConversations,
}: {
  conversation: Conversation;
  customer: Customer | null;
  previousConversations: Array<{
    id: string;
    status: string;
    createdAt: string;
    messageCount: number;
  }>;
}) {
  const displayName =
    conversation.customerName ||
    conversation.customerEmail ||
    customer?.name ||
    customer?.email ||
    `Visitor ${conversation.visitorId.slice(0, 8)}`;

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        {/* Customer Info */}
        <div>
          <h3 className="font-semibold text-sm mb-2">Customer</h3>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
              <User className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium">{displayName}</p>
              {(conversation.customerEmail || customer?.email) && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  {conversation.customerEmail || customer?.email}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Stats */}
        {customer && (
          <div className="grid grid-cols-2 gap-3">
            <div className="p-2 bg-muted rounded">
              <p className="text-lg font-semibold">{customer.conversationCount}</p>
              <p className="text-xs text-muted-foreground">Conversations</p>
            </div>
            <div className="p-2 bg-muted rounded">
              <p className="text-lg font-semibold">{customer.totalMessageCount}</p>
              <p className="text-xs text-muted-foreground">Messages</p>
            </div>
          </div>
        )}

        {/* Current Conversation */}
        <div>
          <h3 className="font-semibold text-sm mb-2">This Conversation</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Started</span>
              <span>{new Date(conversation.createdAt).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Messages</span>
              <span>{conversation.messageCount}</span>
            </div>
            {conversation.handoffReason && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Handoff Reason</span>
                <Badge variant="secondary">{conversation.handoffReason}</Badge>
              </div>
            )}
          </div>
        </div>

        {/* Previous Conversations */}
        {previousConversations.length > 0 && (
          <div>
            <h3 className="font-semibold text-sm mb-2">
              Previous ({previousConversations.length})
            </h3>
            <div className="space-y-2">
              {previousConversations.slice(0, 3).map((conv) => (
                <Link
                  key={conv.id}
                  href={`/inbox/${conv.id}`}
                  className="block p-2 bg-muted rounded text-sm hover:bg-muted/80 transition-colors"
                >
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">
                      {new Date(conv.createdAt).toLocaleDateString()}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {conv.status}
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function ConversationPage() {
  const params = useParams();
  const router = useRouter();
  const conversationId = params.id as string;
  const { currentProject } = useProject();
  const { agent } = useAgent();

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [previousConversations, setPreviousConversations] = useState<
    Array<{ id: string; status: string; createdAt: string; messageCount: number }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [customerTyping, setCustomerTyping] = useState(false);
  const [customerPresence, setCustomerPresence] = useState<"online" | "idle" | "offline">("offline");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Fetch conversation data
  const fetchConversation = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch conversation details
      const convResponse = await apiClient<{ conversation: Conversation }>(
        `/api/conversations/${conversationId}`
      );
      setConversation(convResponse.conversation);

      // Fetch messages
      const msgResponse = await apiClient<{
        messages: Message[];
        pagination: unknown;
      }>(`/api/conversations/${conversationId}/messages?limit=100`);
      setMessages(msgResponse.messages || []);

      // Fetch customer context
      try {
        const customerResponse = await apiClient<{
          customer: Customer | null;
          previousConversations: Array<{
            id: string;
            status: string;
            createdAt: string;
            messageCount: number;
          }>;
        }>(`/api/conversations/${conversationId}/customer`);
        setCustomer(customerResponse.customer);
        setPreviousConversations(customerResponse.previousConversations || []);
      } catch {
        // Customer context is optional
      }
    } catch (err) {
      console.error("Failed to fetch conversation:", err);
      setError("Failed to load conversation");
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    fetchConversation();
  }, [fetchConversation]);

  // Realtime event handlers (memoized to prevent re-subscriptions)
  const realtimeHandlers = useMemo(
    () => ({
      onNewMessage: (message: {
        id: string;
        senderType: string;
        senderId?: string;
        senderName?: string;
        content: string;
        createdAt: string;
      }) => {
        // Add new message to state
        setMessages((prev) => {
          // Skip if we already have this message (by ID)
          if (prev.some((m) => m.id === message.id)) return prev;

          // Skip if this is our own agent message (we already added it optimistically)
          // Check by matching content and recent timestamp for agent messages
          if (message.senderType === "agent") {
            const recentAgentMsg = prev.find(
              (m) =>
                m.senderType === "agent" &&
                m.content === message.content &&
                m.id.startsWith("temp-") // It's an optimistic message
            );
            if (recentAgentMsg) {
              // Update the temp message with the real ID instead of adding duplicate
              return prev.map((m) =>
                m.id === recentAgentMsg.id
                  ? { ...m, id: message.id, createdAt: message.createdAt }
                  : m
              );
            }
          }

          return [
            ...prev,
            {
              id: message.id,
              senderType: message.senderType as Message["senderType"],
              senderId: message.senderId,
              content: message.content,
              createdAt: message.createdAt,
            },
          ];
        });

        // Scroll to bottom for new messages
        setTimeout(scrollToBottom, 100);
      },
      onStatusChanged: (status: string) => {
        setConversation((prev) =>
          prev ? { ...prev, status: status as Conversation["status"] } : null
        );
      },
      onTyping: (data: { participant: { type: string; name?: string }; isTyping: boolean }) => {
        // Show customer typing indicator
        if (data.participant.type === "customer") {
          setCustomerTyping(data.isTyping);
        }
      },
      onPresenceUpdate: (data: { customerOnline?: boolean; agentOnline?: boolean; lastSeenAt?: string }) => {
        // Update customer presence indicator
        if (data.customerOnline !== undefined) {
          setCustomerPresence(data.customerOnline ? "online" : "offline");
        }
      },
    }),
    [] // No dependencies - handlers use setState callbacks which always get latest state
  );

  // Setup realtime subscription for this conversation
  const { isSubscribed } = useConversationRealtime(conversationId, realtimeHandlers);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Send typing indicator
  const sendTypingIndicator = async (typing: boolean) => {
    try {
      await apiClient(`/api/conversations/${conversationId}/typing`, {
        method: "POST",
        body: JSON.stringify({
          isTyping: typing,
          participantType: "agent",
        }),
      });
    } catch {
      // Silently fail - typing indicators are not critical
    }
  };

  // Handle agent typing
  const handleAgentTyping = () => {
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Send typing:start if not already typing
    if (!isTyping) {
      setIsTyping(true);
      sendTypingIndicator(true);
    }

    // Set timeout to send typing:stop after inactivity
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      sendTypingIndicator(false);
    }, 3000);
  };

  // Stop typing indicator
  const stopTypingIndicator = () => {
    if (isTyping) {
      setIsTyping(false);
      sendTypingIndicator(false);
    }
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  };

  // Send message
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !conversation) return;

    const messageContent = newMessage.trim();

    // Stop typing indicator when sending
    stopTypingIndicator();

    // Clear input immediately for better UX
    setNewMessage("");

    // Add message optimistically to local state
    const optimisticMessage: Message = {
      id: `temp-${Date.now()}`,
      senderType: "agent",
      senderId: agent?.id,
      content: messageContent,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMessage]);

    // Scroll to bottom immediately
    setTimeout(scrollToBottom, 50);

    setSending(true);

    try {
      const response = await apiClient<{ message: { id: string; createdAt: string } }>(
        `/api/conversations/${conversationId}/messages`,
        {
          method: "POST",
          body: JSON.stringify({
            content: messageContent,
            senderType: "agent",
          }),
        }
      );

      // Update the optimistic message with the real ID from server
      if (response.message) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === optimisticMessage.id
              ? { ...m, id: response.message.id, createdAt: response.message.createdAt }
              : m
          )
        );
      }

      // Don't call fetchConversation() - rely on realtime for other updates
    } catch (err) {
      console.error("Failed to send message:", err);
      // Remove the optimistic message on error
      setMessages((prev) => prev.filter((m) => m.id !== optimisticMessage.id));
      // Restore the message in input so user can retry
      setNewMessage(messageContent);
      setError("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  // Handle resolve
  const handleResolve = async () => {
    setActionLoading("resolve");
    try {
      await apiClient(`/api/conversations/${conversationId}/resolve`, {
        method: "POST",
        body: JSON.stringify({ resolution: "resolved" }),
      });
      router.push("/inbox");
    } catch (err) {
      console.error("Failed to resolve:", err);
      setError("Failed to resolve conversation");
    } finally {
      setActionLoading(null);
    }
  };

  // Handle transfer
  const handleTransfer = async () => {
    setActionLoading("transfer");
    try {
      await apiClient(`/api/conversations/${conversationId}/transfer`, {
        method: "POST",
      });
      router.push("/inbox");
    } catch (err) {
      console.error("Failed to transfer:", err);
      setError("Failed to transfer conversation");
    } finally {
      setActionLoading(null);
    }
  };

  // Handle return to AI
  const handleReturnToAI = async () => {
    setActionLoading("return");
    try {
      await apiClient(`/api/conversations/${conversationId}/resolve`, {
        method: "POST",
        body: JSON.stringify({ resolution: "resolved", returnToAI: true }),
      });
      router.push("/inbox");
    } catch (err) {
      console.error("Failed to return to AI:", err);
      setError("Failed to return to AI");
    } finally {
      setActionLoading(null);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32 mt-1" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2">
            <Skeleton className="h-[500px] w-full" />
          </div>
          <Skeleton className="h-[500px] w-full" />
        </div>
      </div>
    );
  }

  if (error || !conversation) {
    return (
      <div className="space-y-4">
        <Link href="/inbox" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Back to Inbox
        </Link>
        <Card>
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <p className="text-destructive">{error || "Conversation not found"}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const displayName =
    conversation.customerName ||
    conversation.customerEmail ||
    `Visitor ${conversation.visitorId.slice(0, 8)}`;
  const canSendMessage = conversation.status === "agent_active";

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b">
        <div className="flex items-center gap-4">
          <Link href="/inbox" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex items-center gap-3">
            {/* Avatar with presence indicator */}
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                <User className="h-5 w-5 text-muted-foreground" />
              </div>
              {/* Presence dot */}
              <span
                className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-background ${
                  customerPresence === "online"
                    ? "bg-green-500"
                    : customerPresence === "idle"
                    ? "bg-yellow-500"
                    : "bg-gray-400"
                }`}
                title={`Customer is ${customerPresence}`}
              />
            </div>
            <div>
              <h1 className="font-semibold">{displayName}</h1>
              <div className="flex items-center gap-2">
                <Badge
                  variant={
                    conversation.status === "agent_active" ? "default" : "secondary"
                  }
                >
                  {conversation.status.replace("_", " ")}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {conversation.messageCount} messages
                </span>
                {/* Customer presence text */}
                <span
                  className={`text-xs flex items-center gap-1 ${
                    customerPresence === "online"
                      ? "text-green-600"
                      : customerPresence === "idle"
                      ? "text-yellow-600"
                      : "text-muted-foreground"
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      customerPresence === "online"
                        ? "bg-green-500"
                        : customerPresence === "idle"
                        ? "bg-yellow-500"
                        : "bg-gray-400"
                    }`}
                  />
                  {customerPresence === "online"
                    ? "Online"
                    : customerPresence === "idle"
                    ? "Away"
                    : "Offline"}
                </span>
                {isSubscribed ? (
                  <span className="text-xs text-green-600 flex items-center gap-1">
                    <Wifi className="h-3 w-3" />
                    Live
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <WifiOff className="h-3 w-3" />
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="relative">
          <Button
            variant="outline"
            onClick={() => setShowActions(!showActions)}
            disabled={!!actionLoading}
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>

          {showActions && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-card border rounded-lg shadow-lg py-1 z-10">
              <button
                onClick={handleResolve}
                disabled={!!actionLoading}
                className="w-full px-4 py-2 text-sm text-left hover:bg-muted flex items-center gap-2"
              >
                {actionLoading === "resolve" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
                Mark Resolved
              </button>
              <button
                onClick={handleTransfer}
                disabled={!!actionLoading}
                className="w-full px-4 py-2 text-sm text-left hover:bg-muted flex items-center gap-2"
              >
                {actionLoading === "transfer" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowRightLeft className="h-4 w-4" />
                )}
                Transfer to Queue
              </button>
              <button
                onClick={handleReturnToAI}
                disabled={!!actionLoading}
                className="w-full px-4 py-2 text-sm text-left hover:bg-muted flex items-center gap-2"
              >
                {actionLoading === "return" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Bot className="h-4 w-4" />
                )}
                Return to AI
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 grid grid-cols-3 gap-4 pt-4 overflow-hidden">
        {/* Messages */}
        <div className="col-span-2 flex flex-col bg-card border rounded-lg overflow-hidden">
          {/* Messages List */}
          <div className="flex-1 overflow-y-auto p-4">
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
            {/* Customer Typing Indicator */}
            {customerTyping && (
              <div className="flex justify-start mb-4">
                <div className="bg-muted rounded-lg rounded-bl-none px-4 py-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <User className="h-3 w-3" />
                    <span>Customer is typing</span>
                    <span className="flex gap-1">
                      <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          {canSendMessage ? (
            <div className="p-4 border-t">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => {
                    setNewMessage(e.target.value);
                    handleAgentTyping();
                  }}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendMessage()}
                  placeholder="Type your message..."
                  disabled={sending}
                  className="flex-1 px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <Button onClick={handleSendMessage} disabled={sending || !newMessage.trim()}>
                  {sending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <div className="p-4 border-t bg-muted/50 text-center">
              <p className="text-sm text-muted-foreground">
                This conversation is{" "}
                {conversation.status === "waiting"
                  ? "waiting for an agent"
                  : conversation.status === "resolved"
                  ? "resolved"
                  : "closed"}
              </p>
            </div>
          )}
        </div>

        {/* Customer Context */}
        <div className="overflow-y-auto">
          <CustomerContextPanel
            conversation={conversation}
            customer={customer}
            previousConversations={previousConversations}
          />
        </div>
      </div>
    </div>
  );
}
