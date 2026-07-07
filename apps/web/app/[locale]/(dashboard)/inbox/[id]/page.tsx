"use client";

import { Button, Card, CardContent, Skeleton, Badge } from "@chatbot/ui";
import {
  AlertCircle,
  ArrowLeft,
  Code,
  Globe,
  Send,
  User,
  Bot,
  Mail,
  MessageCircle,
  MessageSquare,
  MoreHorizontal,
  CheckCircle,
  ArrowRightLeft,
  Info,
  Loader2,
  Phone,
  Play,
  Smartphone,
  Terminal,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useParams, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { type ComponentType, type CSSProperties, useState, useEffect, useCallback, useRef, useMemo } from "react";

import { MobileDrawer } from "@/components/mobile-drawer";
import { useAgent } from "@/contexts/agent-context";
import { useConversationRealtime } from "@/hooks/use-inbox-realtime";
import { useMessagePolling, Message as PollingMessage } from "@/hooks/use-message-polling";
import { Link, useRouter } from "@/i18n/navigation";
import { apiClient } from "@/lib/api-client";
import { getChannelMeta } from "@/lib/channels";
import { getConversationDisplayName } from "@/lib/conversation-identity";


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
  customerPhone: string | null;
  status: "ai_active" | "waiting" | "agent_active" | "resolved" | "closed";
  assignedAgentId: string | null;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
  handoffReason?: string;
  handoffTriggeredAt?: string;
  source?: string;
  metadata?: Record<string, unknown>;
}

interface Customer {
  id: string;
  email: string | null;
  name: string | null;
  phone: string | null;
  conversationCount: number;
  totalMessageCount: number;
  firstSeenAt: string;
  lastSeenAt: string;
}

interface QualifyingAnswer {
  question: string;
  answer: string;
  raw_response?: string;
  answer_reasoning?: string;
}

interface LateQualifyingAnswer {
  question_index: number;
  question_text: string;
  answer: string;
  raw_message?: string;
  confidence?: number;
  capture_type?: string;
  captured_at?: string;
  promoted?: boolean;
}

interface LeadData {
  id: string;
  email: string;
  formData: {
    field_2?: { label: string; value: string };
    field_3?: { label: string; value: string };
  };
  qualifyingAnswers: QualifyingAnswer[];
  lateQualifyingAnswers: LateQualifyingAnswer[];
  qualificationStatus: string;
  qualificationReasoning: string | null;
  captureSource: string | null;
  firstMessage: string | null;
  formSubmittedAt: string;
}

// Configured questions from project settings (shown even if not answered)
type ConfiguredQuestions = string[];

// ============================================================================
// Message Component
// ============================================================================

function MessageBubble({ message }: { message: Message }) {
  const t = useTranslations("dashboard.pages.inbox.detail");
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
            {isCustomer ? t("customerLabel") : isAI ? t("aiAssistant") : t("agent")}
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
  leadData,
  configuredQuestions,
}: {
  conversation: Conversation;
  customer: Customer | null;
  previousConversations: Array<{
    id: string;
    status: string;
    createdAt: string;
    messageCount: number;
  }>;
  leadData: LeadData | null;
  configuredQuestions: ConfiguredQuestions;
}) {
  const t = useTranslations("dashboard.pages.inbox.detail");
  const inboxStatusT = useTranslations("dashboard.pages.inbox.status");
  const leadStatusT = useTranslations("dashboard.pages.leads.statuses");
  const leadSourceT = useTranslations("dashboard.pages.leads.sources");
  const displayName = getConversationDisplayName({
    visitorId: conversation.visitorId,
    source: conversation.source,
    customerName: conversation.customerName || customer?.name,
    customerEmail: conversation.customerEmail || customer?.email,
    customerPhone: conversation.customerPhone || customer?.phone,
  });
  const phone = conversation.customerPhone || customer?.phone;
  const qualificationStatus =
    leadData?.qualificationStatus === "qualified"
      ? leadStatusT("qualified")
      : leadData?.qualificationStatus === "not_qualified"
      ? leadStatusT("not_qualified")
      : leadData?.qualificationStatus === "qualifying"
      ? leadStatusT("qualifying")
      : leadData?.qualificationStatus === "form_completed"
      ? leadStatusT("form_completed")
      : leadData?.qualificationStatus === "skipped"
      ? leadStatusT("skipped")
      : leadData?.qualificationStatus === "deferred"
      ? leadStatusT("deferred")
      : leadData?.qualificationStatus;
  const captureSource =
    leadData?.captureSource === "form"
      ? leadSourceT("form")
      : leadData?.captureSource === "inline_email"
      ? leadSourceT("inline_email")
      : leadData?.captureSource === "conversational"
      ? leadSourceT("conversational")
      : leadData?.captureSource === "exit_overlay"
      ? leadSourceT("exit_overlay")
      : leadData?.captureSource === "summary_hook"
      ? leadSourceT("summary_hook")
      : leadData?.captureSource?.replace(/_/g, " ");

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        {/* Customer Info */}
        <div>
          <h3 className="font-semibold text-sm mb-2">{t("customer")}</h3>
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
              {phone && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  {phone}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Lead Data */}
        {leadData && (
          <div className="border-t pt-4">
            <h3 className="font-semibold text-sm mb-2">{t("leadProfile")}</h3>
            <div className="space-y-3">
              {/* Email */}
              <div className="flex items-start gap-2">
                <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">{t("email")}</p>
                  <p className="text-sm font-medium">{leadData.email}</p>
                </div>
              </div>

              {/* Custom Fields */}
              {leadData.formData.field_2 && (
                <div className="flex items-start gap-2">
                  <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">{leadData.formData.field_2.label}</p>
                    <p className="text-sm font-medium">{leadData.formData.field_2.value}</p>
                  </div>
                </div>
              )}
              {leadData.formData.field_3 && (
                <div className="flex items-start gap-2">
                  <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">{leadData.formData.field_3.label}</p>
                    <p className="text-sm font-medium">{leadData.formData.field_3.value}</p>
                  </div>
                </div>
              )}

              {/* Status Badge */}
              <div className="flex items-center gap-2 pt-2">
                <Badge
                  variant={leadData.qualificationStatus === "qualified" ? "default" : "secondary"}
                  className="text-xs"
                >
                  {qualificationStatus}
                </Badge>
                {leadData.captureSource && (
                  <Badge variant="outline" className="text-xs">
                    {captureSource}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Qualifying Questions - Always show if configured, so agent knows what to ask */}
        {configuredQuestions.length > 0 && (
          <div className="border-t pt-4">
            <h3 className="font-semibold text-sm mb-2">{t("qualifyingQuestions")}</h3>
            <div className="space-y-2">
              {configuredQuestions.map((question, idx) => {
                // Find answer from qualifyingAnswers or lateQualifyingAnswers
                const directAnswer = leadData?.qualifyingAnswers.find(
                  (qa) => qa.question === question
                );
                const lateAnswer = leadData?.lateQualifyingAnswers.find(
                  (lqa) => lqa.question_text === question
                );
                const answer = directAnswer?.answer || lateAnswer?.answer;
                const isLateCapture = !directAnswer && lateAnswer;

                return (
                  <div key={idx} className="p-2 bg-muted/50 rounded text-sm">
                    <p className="text-xs text-muted-foreground mb-1">
                      {t("questionLine", { question })}
                    </p>
                    {answer ? (
                      <>
                        <p className="font-medium">
                          {t("answerLine", { answer })}
                          {isLateCapture && (
                            <Badge variant="secondary" className="ms-2 text-xs">{t("autoDetected")}</Badge>
                          )}
                        </p>
                        {directAnswer?.answer_reasoning && (
                          <p className="text-xs text-muted-foreground italic mt-1">
                            {directAnswer.answer_reasoning}
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="text-muted-foreground italic">{t("notAnswered")}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {leadData?.qualificationReasoning && (
          <div className="border-t pt-4">
            <h3 className="font-semibold text-sm mb-2">{t("qualificationNotes")}</h3>
            <p className="text-xs text-muted-foreground whitespace-pre-line">
              {leadData.qualificationReasoning}
            </p>
          </div>
        )}

        {/* Stats */}
        {customer && (
          <div className="grid grid-cols-2 gap-3">
            <div className="p-2 bg-muted rounded">
              <p className="text-lg font-semibold">{customer.conversationCount}</p>
              <p className="text-xs text-muted-foreground">{t("conversations")}</p>
            </div>
            <div className="p-2 bg-muted rounded">
              <p className="text-lg font-semibold">{customer.totalMessageCount}</p>
              <p className="text-xs text-muted-foreground">{t("messages")}</p>
            </div>
          </div>
        )}

        {/* Current Conversation */}
        <div>
          <h3 className="font-semibold text-sm mb-2">{t("thisConversation")}</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("started")}</span>
              <span>{new Date(conversation.createdAt).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("messages")}</span>
              <span>{conversation.messageCount}</span>
            </div>
            {conversation.handoffReason && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("handoffReason")}</span>
                <Badge variant="secondary">{conversation.handoffReason}</Badge>
              </div>
            )}
          </div>
        </div>

        {/* Previous Conversations */}
        {previousConversations.length > 0 && (
          <div>
            <h3 className="font-semibold text-sm mb-2">
              {t("previous", { count: previousConversations.length })}
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
                      {conv.status === "ai_active"
                        ? inboxStatusT("ai_active")
                        : conv.status === "waiting"
                        ? inboxStatusT("waiting")
                        : conv.status === "agent_active"
                        ? inboxStatusT("agent_active")
                        : conv.status === "resolved"
                        ? inboxStatusT("resolved")
                        : conv.status === "closed"
                        ? inboxStatusT("closed")
                        : conv.status}
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
// Channel Icon Helper
// ============================================================================

const CHANNEL_ICONS: Record<string, ComponentType<{ className?: string; style?: CSSProperties }>> = {
  MessageCircle,
  MessageSquare,
  Globe,
  Phone,
  Smartphone,
  Play,
  Code,
  Terminal,
};

function ChannelIcon({ source, className }: { source: string; className?: string }) {
  const meta = getChannelMeta(source);
  const IconComponent = CHANNEL_ICONS[meta.icon] || MessageSquare;
  return <IconComponent className={className} style={{ color: meta.color }} />;
}

const WINDOW_MS = 24 * 60 * 60 * 1000;

function isWhatsAppWindowOpen(metadata?: Record<string, unknown>): boolean {
  const raw = metadata?.last_inbound_at;
  if (typeof raw !== "string") return false;
  const lastInbound = new Date(raw);
  if (Number.isNaN(lastInbound.getTime())) return false;
  return Date.now() - lastInbound.getTime() < WINDOW_MS;
}

// ============================================================================
// Main Component
// ============================================================================

export default function ConversationPage() {
  const t = useTranslations("dashboard.pages.inbox.detail");
  const conversationStatusT = useTranslations("dashboard.pages.inbox.status");
  const statusT = useTranslations("dashboard.status");
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const conversationId = String(params?.id ?? "");
  const fromLeads = searchParams?.get("from") === "leads";
  const backHref = fromLeads ? "/leads" : "/inbox";
  const backLabel = fromLeads ? t("backToLeads") : t("backToInbox");
  const { agent } = useAgent();

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [previousConversations, setPreviousConversations] = useState<
    Array<{ id: string; status: string; createdAt: string; messageCount: number }>
  >([]);
  const [leadData, setLeadData] = useState<LeadData | null>(null);
  const [configuredQuestions, setConfiguredQuestions] = useState<ConfiguredQuestions>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [customerPanelOpen, setCustomerPanelOpen] = useState(false);
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
          leadData: LeadData | null;
          configuredQuestions: ConfiguredQuestions;
        }>(`/api/conversations/${conversationId}/customer`);
        setCustomer(customerResponse.customer);
        setPreviousConversations(customerResponse.previousConversations || []);
        setLeadData(customerResponse.leadData);
        setConfiguredQuestions(customerResponse.configuredQuestions || []);
      } catch {
        // Customer context is optional
      }
    } catch (err) {
      console.error("Failed to fetch conversation:", err);
      setError(t("loadError"));
    } finally {
      setLoading(false);
    }
  }, [conversationId, t]);

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

  // Get the last message for polling reference
  const lastMessage = messages[messages.length - 1];

  // Message polling as fallback for realtime (30 second interval)
  useMessagePolling(conversationId, {
    interval: 30000,
    enabled: true, // Always enabled as fallback
    lastMessageId: lastMessage?.id,
    lastMessageTime: lastMessage?.createdAt,
    onNewMessages: useCallback((newMessages: PollingMessage[]) => {
      setMessages((prev) => {
        // Filter out messages we already have
        const existingIds = new Set(prev.map((m) => m.id));
        const uniqueNew = newMessages.filter((m) => !existingIds.has(m.id));

        if (uniqueNew.length > 0) {
          console.log(`[Conversation] Poll found ${uniqueNew.length} new messages`);
          // Scroll to bottom when new messages arrive
          setTimeout(scrollToBottom, 100);
          return [...prev, ...uniqueNew.map((m): Message => ({
            id: m.id,
            senderType: m.senderType as Message["senderType"],
            senderId: m.senderId ?? undefined,
            content: m.content,
            createdAt: m.createdAt,
            metadata: m.metadata,
          }))];
        }
        return prev;
      });
    }, []),
  });

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
    sendTypingIndicator(false); // unconditional — bypasses stale-closure guard in stopTypingIndicator
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
      setMessages((prev) => prev.filter((m) => m.id !== optimisticMessage.id));
      setNewMessage(messageContent);
      const errMsg = err instanceof Error ? err.message : String(err);
      const isWindowClosed =
        errMsg.includes("24-hour service window") ||
        errMsg.includes("24h window");
      setError(
        isWindowClosed
          ? t("windowClosed")
          : t("sendError")
      );
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
      router.push(backHref);
    } catch (err) {
      console.error("Failed to resolve:", err);
      setError(t("resolveError"));
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
      router.push(backHref);
    } catch (err) {
      console.error("Failed to transfer:", err);
      setError(t("transferError"));
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
      router.push(backHref);
    } catch (err) {
      console.error("Failed to return to AI:", err);
      setError(t("returnToAiError"));
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
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="md:col-span-2">
            <Skeleton className="h-[500px] w-full" />
          </div>
          <Skeleton className="hidden h-[500px] w-full md:block" />
        </div>
      </div>
    );
  }

  if (error || !conversation) {
    return (
      <div className="space-y-4">
        <Link href={backHref} className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4 rtl:-scale-x-100" />
          {backLabel}
        </Link>
        <Card>
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <p className="text-destructive">{error || t("conversationNotFound")}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const displayName = getConversationDisplayName(conversation);
  const isWhatsApp = conversation.source === "whatsapp";
  const windowOpen = isWhatsApp ? isWhatsAppWindowOpen(conversation.metadata) : true;
  const canSendMessage = conversation.status === "agent_active" && windowOpen;

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 pb-4 border-b">
        <div className="flex items-center gap-4 min-w-0">
          <Link href={backHref} className="text-muted-foreground hover:text-foreground shrink-0">
            <ArrowLeft className="h-5 w-5 rtl:-scale-x-100" />
          </Link>
          <div className="flex items-center gap-3 min-w-0">
            {/* Avatar with presence indicator */}
            <div className="relative shrink-0">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                <User className="h-5 w-5 text-muted-foreground" />
              </div>
              {/* Presence dot */}
              <span
                className={`absolute bottom-0 end-0 w-3 h-3 rounded-full border-2 border-background ${
                  customerPresence === "online"
                    ? "bg-green-500"
                    : customerPresence === "idle"
                    ? "bg-yellow-500"
                    : "bg-gray-400"
                }`}
                title={
                  customerPresence === "online"
                    ? statusT("online")
                    : customerPresence === "idle"
                    ? statusT("away")
                    : statusT("offline")
                }
              />
            </div>
            <div className="min-w-0">
              <h1 className="font-semibold flex items-center gap-2 min-w-0">
                <span className="truncate">{displayName}</span>
                {conversation.source && conversation.source !== "widget" && (
                  <span
                    className="inline-flex items-center gap-1 text-xs font-normal px-1.5 py-0.5 rounded-full bg-muted shrink-0"
                    title={getChannelMeta(conversation.source).label}
                  >
                    <ChannelIcon source={conversation.source} className="h-3 w-3" />
                    {getChannelMeta(conversation.source).label}
                  </span>
                )}
              </h1>
              <Badge
                variant={
                  conversation.status === "agent_active" ? "default" : "secondary"
                }
              >
                {conversation.status === "ai_active"
                  ? conversationStatusT("ai_active")
                  : conversation.status === "waiting"
                  ? conversationStatusT("waiting")
                  : conversation.status === "agent_active"
                  ? conversationStatusT("agent_active")
                  : conversation.status === "resolved"
                  ? conversationStatusT("resolved")
                  : conversationStatusT("closed")}
              </Badge>
              {/* Metadata reads as one wrapped line (bullet-separated) instead of
                  several independently-wrapping fragments, which looked disjointed
                  on narrow screens. */}
              <div className="flex items-center gap-1.5 flex-wrap text-xs text-muted-foreground mt-1">
                <span>
                  {t("messages")}: {conversation.messageCount}
                </span>
                <span aria-hidden="true">&bull;</span>
                <span
                  className={`flex items-center gap-1 ${
                    customerPresence === "online"
                      ? "text-green-600"
                      : customerPresence === "idle"
                      ? "text-yellow-600"
                      : ""
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
                    ? statusT("online")
                    : customerPresence === "idle"
                    ? statusT("away")
                    : statusT("offline")}
                </span>
                <span aria-hidden="true">&bull;</span>
                {isSubscribed ? (
                  <span className="text-green-600 flex items-center gap-1">
                    <Wifi className="h-3 w-3" />
                    {t("live")}
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <WifiOff className="h-3 w-3" />
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-2">
          {/* Customer info — inline on desktop (see grid below), a drawer on mobile */}
          <Button
            variant="outline"
            size="icon"
            className="md:hidden"
            onClick={() => setCustomerPanelOpen(true)}
            aria-label={t("openCustomerInfo")}
          >
            <Info className="h-4 w-4" />
          </Button>
          <div className="relative">
          <Button
            variant="outline"
            onClick={() => setShowActions(!showActions)}
            disabled={!!actionLoading}
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>

          {showActions && (
            <div className="absolute end-0 top-full mt-2 w-48 bg-card border rounded-lg shadow-lg py-1 z-10">
              <button
                onClick={handleResolve}
                disabled={!!actionLoading}
                className="w-full px-4 py-2 text-sm text-start hover:bg-muted flex items-center gap-2"
              >
                {actionLoading === "resolve" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
                {t("markResolved")}
              </button>
              <button
                onClick={handleTransfer}
                disabled={!!actionLoading}
                className="w-full px-4 py-2 text-sm text-start hover:bg-muted flex items-center gap-2"
              >
                {actionLoading === "transfer" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowRightLeft className="h-4 w-4" />
                )}
                {t("transferToQueue")}
              </button>
              <button
                onClick={handleReturnToAI}
                disabled={!!actionLoading}
                className="w-full px-4 py-2 text-sm text-start hover:bg-muted flex items-center gap-2"
              >
                {actionLoading === "return" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Bot className="h-4 w-4" />
                )}
                {t("returnToAi")}
              </button>
            </div>
          )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col gap-4 pt-4 overflow-hidden md:grid md:grid-cols-3">
        {/* Messages */}
        <div className="flex-1 min-h-0 md:col-span-2 flex flex-col bg-card border rounded-lg overflow-hidden">
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
                    <span>{t("customerTyping")}</span>
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
                  placeholder={t("typeYourMessage")}
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
                {isWhatsApp && conversation.status === "agent_active" && !windowOpen
                  ? t("windowClosedShort")
                  : conversation.status === "waiting"
                  ? t("waitingForAgent")
                  : conversation.status === "resolved"
                  ? t("conversationResolved")
                  : t("conversationClosed")}
              </p>
            </div>
          )}
        </div>

        {/* Customer Context — desktop only; mobile gets it in a drawer (see below) */}
        <div className="hidden overflow-y-auto md:block">
          <CustomerContextPanel
            conversation={conversation}
            customer={customer}
            previousConversations={previousConversations}
            leadData={leadData}
            configuredQuestions={configuredQuestions}
          />
        </div>
      </div>

      <MobileDrawer
        open={customerPanelOpen}
        onOpenChange={setCustomerPanelOpen}
        side="end"
        title={t("customer")}
        description={t("customerInfoDescription")}
        closeLabel={t("closeCustomerInfo")}
      >
        <CustomerContextPanel
          conversation={conversation}
          customer={customer}
          previousConversations={previousConversations}
          leadData={leadData}
          configuredQuestions={configuredQuestions}
        />
      </MobileDrawer>
    </div>
  );
}
