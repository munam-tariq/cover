"use client";

import { Button, Card, CardContent, Skeleton, Badge } from "@chatbot/ui";
import {
  AlertCircle,
  ArrowLeft,
  BadgeCheck,
  Send,
  User,
  Bot,
  Mail,
  MoreHorizontal,
  CheckCircle,
  ArrowRightLeft,
  Info,
  Loader2,
  Phone,
  Flag,
  WifiOff,
} from "lucide-react";
import { useParams, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";

import { ChannelChip } from "@/components/inbox/conversation-metadata-chip";
import { MobileDrawer } from "@/components/mobile-drawer";
import { useAgent } from "@/contexts/agent-context";
import { useConversationRealtime } from "@/hooks/use-inbox-realtime";
import {
  useMessagePolling,
  Message as PollingMessage,
} from "@/hooks/use-message-polling";
import { Link, useRouter } from "@/i18n/navigation";
import { apiClient } from "@/lib/api-client";
import { getChannelMeta } from "@/lib/channels";
import { getConversationDisplayName } from "@/lib/conversation-identity";
import {
  getConversationStatusMeta,
  getHandoffReasonLabelKey,
  type ConversationStatus,
} from "@/lib/conversation-status";

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

interface PreviousConversation {
  id: string;
  status: string;
  createdAt: string;
  resolvedAt: string | null;
  messageCount: number;
  closeReason?: string | null;
  assignedAgent?: { id: string; name: string } | null;
}

interface Conversation {
  id: string;
  visitorId: string;
  customerEmail: string | null;
  customerName: string | null;
  customerPhone: string | null;
  status: "ai_active" | "waiting" | "agent_active" | "resolved" | "closed";
  /**
   * The API has always sent this (conversations.ts GET /:id) — the page previously declared a
   * non-existent `assignedAgentId` instead and dropped the name on the floor, which is why the
   * header could never say who had the chat.
   */
  assignedAgent: { id: string; name: string } | null;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
  /** Terminal timestamp. Use this for "closed at" — `updatedAt` moves on any touch (e.g. a rating). */
  resolvedAt?: string | null;
  /** Distinguishes an inactivity auto-close from a manual one. */
  closeReason?: string | null;
  handoffReason?: string;
  handoffTriggeredAt?: string;
  source?: string;
  metadata?: Record<string, unknown>;
  voiceCallCount: number;
  voiceTalkSeconds: number;
  satisfactionRating: number | null;
  satisfactionFeedback: string | null;
}

interface VerifiedIdentity {
  externalId: string;
  verifiedAt: string;
  email: string | null;
  name: string | null;
  phone: string | null;
  customAttributes: Record<string, unknown> | null;
}

interface Customer {
  id: string;
  // Mutable, agent-/lead-editable current contact info.
  email: string | null;
  name: string | null;
  phone: string | null;
  // Service-managed verified assertion (null until identified). The verified
  // badge derives from `verified`, never from a mutable contact field.
  verified: boolean;
  verifiedIdentity: VerifiedIdentity | null;
  conversationCount: number;
  totalMessageCount: number;
  firstSeenAt: string;
  lastSeenAt: string;
  isFlagged: boolean;
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
  firstMessage: string | null;
  formSubmittedAt: string;
}

// Configured questions from project settings (shown even if not answered)
type ConfiguredQuestions = string[];

function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
    : `${minutes}:${String(seconds).padStart(2, "0")}`;
}

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
      <div className="my-4 flex justify-center">
        <div className="bg-muted text-muted-foreground rounded-full px-4 py-2 text-sm">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex ${isCustomer ? "justify-start" : "justify-end"} mb-4`}
    >
      <div
        className={`max-w-[70%] ${
          isCustomer
            ? "bg-muted rounded-lg rounded-bl-none"
            : isAI
              ? "rounded-lg rounded-br-none bg-blue-500/10 text-blue-900 dark:text-blue-100"
              : "bg-primary text-primary-foreground rounded-lg rounded-br-none"
        } px-4 py-3`}
      >
        {/* Sender Label */}
        <div className="mb-1 flex items-center gap-2">
          {isCustomer ? (
            <User className="h-3 w-3" />
          ) : isAI ? (
            <Bot className="h-3 w-3" />
          ) : (
            <User className="h-3 w-3" />
          )}
          <span className="text-xs font-medium">
            {isCustomer
              ? t("customerLabel")
              : isAI
                ? t("aiAssistant")
                : t("agent")}
          </span>
        </div>
        {/* Content */}
        <p className="whitespace-pre-wrap text-sm">{message.content}</p>
        {/* Timestamp */}
        <p
          className={`mt-1 text-xs ${
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
  onToggleFlag,
  flagPending,
  flagError,
}: {
  conversation: Conversation;
  customer: Customer | null;
  previousConversations: PreviousConversation[];
  leadData: LeadData | null;
  configuredQuestions: ConfiguredQuestions;
  onToggleFlag?: () => void;
  flagPending?: boolean;
  flagError?: boolean;
}) {
  const t = useTranslations("dashboard.pages.inbox.detail");
  // Rooted where getConversationStatusMeta's keys ("status.*") resolve, as in the inbox list.
  const inboxStatusT = useTranslations("dashboard.pages.inbox");
  const leadStatusT = useTranslations("dashboard.pages.leads.statuses");
  const displayName = getConversationDisplayName({
    visitorId: conversation.visitorId,
    source: conversation.source,
    customerName: conversation.customerName || customer?.name,
    customerEmail: conversation.customerEmail || customer?.email,
    customerPhone: conversation.customerPhone || customer?.phone,
  });
  const phone = conversation.customerPhone || customer?.phone;
  const contactEmail = conversation.customerEmail || customer?.email;
  // Provenance split: the verified snapshot (service-managed, unforgeable) vs.
  // the mutable current contact. Only fields the JWT actually asserted get the
  // verified badge; a mutable contact value is never presented as verified.
  const verifiedIdentity = customer?.verifiedIdentity ?? null;
  const verifiedName = verifiedIdentity?.name ?? null;
  const verifiedEmail = verifiedIdentity?.email ?? null;
  const primaryName = verifiedName ?? displayName;
  const showCurrentEmail = !!contactEmail && contactEmail !== verifiedEmail;
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
  // The block is both a live prompt of what to ask (configuredQuestions — the API sends these only
  // while lead capture is enabled) and a record of what this conversation actually captured. Union
  // them so a project that later turns lead capture off still shows the real historical answers,
  // while an enabled project stops rendering questions no conversation ever answered.
  const answeredQuestions = [
    ...(leadData?.qualifyingAnswers.map((qa) => qa.question) ?? []),
    ...(leadData?.lateQualifyingAnswers.map((lqa) => lqa.question_text) ?? []),
  ].filter((question): question is string => Boolean(question?.trim()));
  const questionsToShow = Array.from(
    new Set([...configuredQuestions, ...answeredQuestions])
  );
  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        {/* Contact
            One section, not "Customer" stacked on "Lead Profile" — they described the same person
            and repeated the same email up to four times (header h1, name, email row, lead email),
            because getConversationDisplayName falls back to the email when there's no name. Each
            line below renders only if it adds something not already on screen. */}
        <div>
          <div className="mb-2 flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">{t("contact")}</h3>
            {customer && onToggleFlag && (
              <Button
                variant={customer.isFlagged ? "default" : "outline"}
                size="sm"
                onClick={onToggleFlag}
                disabled={flagPending}
                aria-pressed={customer.isFlagged}
                className="h-7 gap-1.5 px-2 text-xs"
              >
                <Flag
                  className={`h-3.5 w-3.5 ${customer.isFlagged ? "fill-current" : ""}`}
                />
                {customer.isFlagged ? t("unflagCustomer") : t("flagCustomer")}
              </Button>
            )}
          </div>
          {flagError && (
            <p className="text-destructive mb-2 text-xs" role="alert">
              {t("flagError")}
            </p>
          )}
          <div className="flex items-center gap-3">
            <div className="bg-muted flex h-10 w-10 items-center justify-center rounded-full">
              <User className="text-muted-foreground h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 truncate font-medium">
                <span className="truncate">{primaryName}</span>
                {/* Badge beside the name only when the token asserted a name. */}
                {verifiedName && (
                  <span
                    className="inline-flex shrink-0 items-center gap-0.5 text-xs font-normal text-green-600"
                    title={t("verifiedHint")}
                  >
                    <BadgeCheck className="h-3.5 w-3.5" />
                    {t("verified")}
                  </span>
                )}
              </p>
              {/* Verified email (asserted by the signed token). */}
              {verifiedEmail && (
                <p className="flex items-center gap-1 text-xs text-green-600">
                  <Mail className="h-3 w-3 shrink-0" />
                  <span className="truncate">{verifiedEmail}</span>
                  <BadgeCheck className="h-3 w-3 shrink-0" />
                </p>
              )}
              {/* Current (mutable, unverified) contact email, when different. */}
              {showCurrentEmail && contactEmail !== displayName && (
                <p className="text-muted-foreground flex items-center gap-1 text-xs">
                  <Mail className="h-3 w-3 shrink-0" />
                  <span className="truncate">{contactEmail}</span>
                  <span className="shrink-0">({t("currentContact")})</span>
                </p>
              )}
              {phone && phone !== displayName && (
                <p className="text-muted-foreground flex items-center gap-1 text-xs">
                  <Phone className="h-3 w-3 shrink-0" />
                  {phone}
                </p>
              )}
              {verifiedIdentity?.externalId && (
                <p className="text-muted-foreground flex items-center gap-1 truncate text-xs">
                  {/* If the name wasn't verified, surface the badge on the id. */}
                  {!verifiedName && (
                    <BadgeCheck className="h-3 w-3 shrink-0 text-green-600" />
                  )}
                  <span className="truncate">
                    {t("userId")}: {verifiedIdentity.externalId}
                  </span>
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Verified custom attributes (from the signed identity token). */}
        {verifiedIdentity?.customAttributes &&
          Object.keys(verifiedIdentity.customAttributes).length > 0 && (
            <div className="border-t pt-4">
              <h3 className="mb-2 text-sm font-semibold">
                {t("customAttributes")}
              </h3>
              <div className="space-y-2">
                {Object.entries(verifiedIdentity.customAttributes).map(
                  ([key, value]) => (
                    <div key={key} className="flex items-start gap-2">
                      <Info className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-muted-foreground text-xs">{key}</p>
                        <p className="break-words text-sm font-medium">
                          {typeof value === "object" && value !== null
                            ? JSON.stringify(value)
                            : String(value)}
                        </p>
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>
          )}

        {/* Lead Data */}
        {leadData && (
          <div className="border-t pt-4">
            <h3 className="mb-2 text-sm font-semibold">{t("leadProfile")}</h3>
            <div className="space-y-3">
              {/* Only when the lead gave a DIFFERENT address than the one shown above. */}
              {leadData.email &&
                leadData.email !== contactEmail &&
                leadData.email !== displayName && (
                  <div className="flex items-start gap-2">
                    <Mail className="text-muted-foreground mt-0.5 h-4 w-4" />
                    <div>
                      <p className="text-muted-foreground text-xs">
                        {t("email")}
                      </p>
                      <p className="text-sm font-medium">{leadData.email}</p>
                    </div>
                  </div>
                )}

              {/* Custom Fields */}
              {leadData.formData.field_2 && (
                <div className="flex items-start gap-2">
                  <User className="text-muted-foreground mt-0.5 h-4 w-4" />
                  <div>
                    <p className="text-muted-foreground text-xs">
                      {leadData.formData.field_2.label}
                    </p>
                    <p className="text-sm font-medium">
                      {leadData.formData.field_2.value}
                    </p>
                  </div>
                </div>
              )}
              {leadData.formData.field_3 && (
                <div className="flex items-start gap-2">
                  <User className="text-muted-foreground mt-0.5 h-4 w-4" />
                  <div>
                    <p className="text-muted-foreground text-xs">
                      {leadData.formData.field_3.label}
                    </p>
                    <p className="text-sm font-medium">
                      {leadData.formData.field_3.value}
                    </p>
                  </div>
                </div>
              )}

              {/* Status Badge */}
              <div className="flex items-center gap-2 pt-2">
                <Badge
                  variant={
                    leadData.qualificationStatus === "qualified"
                      ? "default"
                      : "secondary"
                  }
                  className="text-xs"
                >
                  {qualificationStatus}
                </Badge>
              </div>
            </div>
          </div>
        )}

        {/* Qualifying questions: configured prompts (only while lead capture is on) plus any answers
            this conversation historically captured, so disabling lead capture never hides real data. */}
        {questionsToShow.length > 0 && (
          <div className="border-t pt-4">
            <h3 className="mb-2 text-sm font-semibold">
              {t("qualifyingQuestions")}
            </h3>
            <div className="space-y-2">
              {questionsToShow.map((question, idx) => {
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
                  <div key={idx} className="bg-muted/50 rounded p-2 text-sm">
                    <p className="text-muted-foreground mb-1 text-xs">
                      {t("questionLine", { question })}
                    </p>
                    {answer ? (
                      <>
                        <p className="font-medium">
                          {t("answerLine", { answer })}
                          {isLateCapture && (
                            <Badge variant="secondary" className="ms-2 text-xs">
                              {t("autoDetected")}
                            </Badge>
                          )}
                        </p>
                        {directAnswer?.answer_reasoning && (
                          <p className="text-muted-foreground mt-1 text-xs italic">
                            {directAnswer.answer_reasoning}
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="text-muted-foreground italic">
                        {t("notAnswered")}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {leadData?.qualificationReasoning && (
          <div className="border-t pt-4">
            <h3 className="mb-2 text-sm font-semibold">
              {t("qualificationNotes")}
            </h3>
            <p className="text-muted-foreground whitespace-pre-line text-xs">
              {leadData.qualificationReasoning}
            </p>
          </div>
        )}

        {/* Stats */}
        {customer && (
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-muted rounded p-2">
              <p className="text-lg font-semibold">
                {customer.conversationCount}
              </p>
              <p className="text-muted-foreground text-xs">
                {t("conversations")}
              </p>
            </div>
            <div className="bg-muted rounded p-2">
              <p className="text-lg font-semibold">
                {customer.totalMessageCount}
              </p>
              <p className="text-muted-foreground text-xs">{t("messages")}</p>
            </div>
          </div>
        )}

        {/* Current Conversation */}
        <div>
          <h3 className="mb-2 text-sm font-semibold">
            {t("thisConversation")}
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("started")}</span>
              <span>{new Date(conversation.createdAt).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("messages")}</span>
              <span>{conversation.messageCount}</span>
            </div>
            {conversation.voiceCallCount > 0 && (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {t("voiceCalls")}
                  </span>
                  <span>{conversation.voiceCallCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {t("totalTalkTime")}
                  </span>
                  <span>{formatDuration(conversation.voiceTalkSeconds)}</span>
                </div>
              </>
            )}
            {conversation.handoffReason && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {t("handoffReason")}
                </span>
                <Badge variant="secondary">
                  {t(getHandoffReasonLabelKey(conversation.handoffReason))}
                </Badge>
              </div>
            )}
            {conversation.satisfactionRating && (
              <div className="space-y-1 border-t pt-2">
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">
                    {t("customerSatisfaction")}
                  </span>
                  <span
                    className="font-medium"
                    aria-label={t("ratingOutOfFive", {
                      rating: conversation.satisfactionRating,
                    })}
                  >
                    {conversation.satisfactionRating}/5
                  </span>
                </div>
                {conversation.satisfactionFeedback && (
                  <p className="text-muted-foreground whitespace-pre-wrap text-xs">
                    {conversation.satisfactionFeedback}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Previous Conversations */}
        {previousConversations.length > 0 && (
          <div>
            <h3 className="mb-2 text-sm font-semibold">
              {t("previous", { count: previousConversations.length })}
            </h3>
            <div className="space-y-2">
              {previousConversations.slice(0, 3).map((conv) => {
                const status = getConversationStatusMeta(
                  conv.status as ConversationStatus,
                  {
                    agentName: conv.assignedAgent?.name,
                    closeReason: conv.closeReason,
                  }
                );
                return (
                  <Link
                    key={conv.id}
                    href={`/inbox/${conv.id}`}
                    className="bg-muted hover:bg-muted/80 block rounded p-2 text-sm transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-muted-foreground">
                        {new Date(
                          conv.resolvedAt || conv.createdAt
                        ).toLocaleDateString()}
                      </span>
                      <Badge
                        variant={status.badgeVariant}
                        className={`text-xs ${status.textColor}`}
                      >
                        {inboxStatusT(status.labelKey, status.labelValues)}
                      </Badge>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
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
  // Rooted at the same namespace the inbox list uses, so shared channel and status keys resolve
  // identically in both places.
  const inboxT = useTranslations("dashboard.pages.inbox");
  const statusT = useTranslations("dashboard.status");
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const conversationId = String(params?.id ?? "");
  const fromLeads = searchParams?.get("from") === "leads";
  const backHref = fromLeads ? "/leads" : "/inbox";
  const backLabel = fromLeads ? t("backToLeads") : t("backToInbox");
  const { agent, refreshAvailability } = useAgent();

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [previousConversations, setPreviousConversations] = useState<
    PreviousConversation[]
  >([]);
  const [leadData, setLeadData] = useState<LeadData | null>(null);
  const [configuredQuestions, setConfiguredQuestions] =
    useState<ConfiguredQuestions>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [customerPanelOpen, setCustomerPanelOpen] = useState(false);
  const [flagPending, setFlagPending] = useState(false);
  const [flagError, setFlagError] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [customerTyping, setCustomerTyping] = useState(false);
  const [customerPresence, setCustomerPresence] = useState<
    "online" | "idle" | "offline"
  >("offline");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<Message[]>([]);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const updateMessages = useCallback(
    (update: Message[] | ((previous: Message[]) => Message[])) => {
      const next =
        typeof update === "function" ? update(messagesRef.current) : update;
      messagesRef.current = next;
      setMessages(next);
    },
    []
  );

  const adjustMessageCounts = useCallback((delta: number) => {
    setConversation((previous) =>
      previous
        ? {
            ...previous,
            messageCount: Math.max(0, previous.messageCount + delta),
          }
        : null
    );
    setCustomer((previous) =>
      previous
        ? {
            ...previous,
            totalMessageCount: Math.max(0, previous.totalMessageCount + delta),
          }
        : null
    );
  }, []);

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
      updateMessages(msgResponse.messages || []);

      // Fetch customer context
      try {
        const customerResponse = await apiClient<{
          customer: Customer | null;
          previousConversations: PreviousConversation[];
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
  }, [conversationId, t, updateMessages]);

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
        const previous = messagesRef.current;
        if (previous.some((item) => item.id === message.id)) return;

        // Our own agent message was counted when it was added optimistically. Replace its temporary
        // identity without incrementing either counter a second time.
        const optimisticAgentMessage =
          message.senderType === "agent"
            ? previous.find(
                (item) =>
                  item.senderType === "agent" &&
                  item.content === message.content &&
                  item.id.startsWith("temp-")
              )
            : undefined;

        if (optimisticAgentMessage) {
          updateMessages((items) =>
            items.map((item) =>
              item.id === optimisticAgentMessage.id
                ? { ...item, id: message.id, createdAt: message.createdAt }
                : item
            )
          );
        } else {
          updateMessages((items) => [
            ...items,
            {
              id: message.id,
              senderType: message.senderType as Message["senderType"],
              senderId: message.senderId,
              content: message.content,
              createdAt: message.createdAt,
            },
          ]);
          adjustMessageCounts(1);
        }

        // Scroll to bottom for new messages
        setTimeout(scrollToBottom, 100);
      },
      onStatusChanged: (status: string) => {
        setConversation((prev) =>
          prev ? { ...prev, status: status as Conversation["status"] } : null
        );
      },
      onTyping: (data: {
        participant: { type: string; name?: string };
        isTyping: boolean;
      }) => {
        // Show customer typing indicator
        if (data.participant.type === "customer") {
          setCustomerTyping(data.isTyping);
        }
      },
      onPresenceUpdate: (data: {
        customerOnline?: boolean;
        agentOnline?: boolean;
        lastSeenAt?: string;
      }) => {
        // Update customer presence indicator
        if (data.customerOnline !== undefined) {
          setCustomerPresence(data.customerOnline ? "online" : "offline");
        }
      },
    }),
    [adjustMessageCounts, updateMessages]
  );

  // Setup realtime subscription for this conversation
  const { isSubscribed } = useConversationRealtime(
    conversationId,
    realtimeHandlers
  );

  // Get the last message for polling reference
  const lastMessage = messages[messages.length - 1];

  // Message polling as fallback for realtime (30 second interval)
  useMessagePolling(conversationId, {
    interval: 30000,
    enabled: true, // Always enabled as fallback
    lastMessageId: lastMessage?.id,
    lastMessageTime: lastMessage?.createdAt,
    onNewMessages: useCallback(
      (newMessages: PollingMessage[]) => {
        const existingIds = new Set(
          messagesRef.current.map((message) => message.id)
        );
        const uniqueNew = newMessages.filter(
          (message) => !existingIds.has(message.id)
        );

        if (uniqueNew.length > 0) {
          console.log(
            `[Conversation] Poll found ${uniqueNew.length} new messages`
          );
          updateMessages((previous) => [
            ...previous,
            ...uniqueNew.map(
              (message): Message => ({
                id: message.id,
                senderType: message.senderType as Message["senderType"],
                senderId: message.senderId ?? undefined,
                content: message.content,
                createdAt: message.createdAt,
                metadata: message.metadata,
              })
            ),
          ]);
          adjustMessageCounts(uniqueNew.length);
          setTimeout(scrollToBottom, 100);
        }
      },
      [adjustMessageCounts, updateMessages]
    ),
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
    updateMessages((previous) => [...previous, optimisticMessage]);
    adjustMessageCounts(1);

    // Scroll to bottom immediately
    setTimeout(scrollToBottom, 50);

    setSending(true);

    try {
      const response = await apiClient<{
        message: { id: string; createdAt: string };
      }>(`/api/conversations/${conversationId}/messages`, {
        method: "POST",
        body: JSON.stringify({
          content: messageContent,
          senderType: "agent",
        }),
      });

      // Update the optimistic message with the real ID from server
      if (response.message) {
        updateMessages((previous) =>
          previous.map((message) =>
            message.id === optimisticMessage.id
              ? {
                  ...message,
                  id: response.message.id,
                  createdAt: response.message.createdAt,
                }
              : message
          )
        );
      }

      // Don't call fetchConversation() - rely on realtime for other updates
    } catch (err) {
      console.error("Failed to send message:", err);
      updateMessages((previous) =>
        previous.filter((message) => message.id !== optimisticMessage.id)
      );
      adjustMessageCounts(-1);
      setNewMessage(messageContent);
      const errMsg = err instanceof Error ? err.message : String(err);
      const isWindowClosed =
        errMsg.includes("24-hour service window") ||
        errMsg.includes("24h window");
      setError(isWindowClosed ? t("windowClosed") : t("sendError"));
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
      await refreshAvailability();
      router.push(backHref);
    } catch (err) {
      console.error("Failed to resolve:", err);
      setError(t("resolveError"));
    } finally {
      setActionLoading(null);
    }
  };

  // Flag / unflag the customer. Optimistic — the toggle is cheap and reversible, so we flip the
  // badge immediately and roll back only if the write fails. A failure is scoped to the toggle (an
  // inline message + the visual revert); it must NOT set the page-level error, which would replace
  // the whole conversation and lose the agent's place in a live chat.
  const handleToggleFlag = useCallback(async () => {
    if (!customer) return;
    const next = !customer.isFlagged;
    setFlagPending(true);
    setFlagError(false);
    setCustomer((prev) => (prev ? { ...prev, isFlagged: next } : prev));
    try {
      await apiClient(`/api/customers/${customer.id}`, {
        method: "PUT",
        body: JSON.stringify({ isFlagged: next }),
      });
    } catch (err) {
      console.error("Failed to update customer flag:", err);
      setCustomer((prev) => (prev ? { ...prev, isFlagged: !next } : prev));
      setFlagError(true);
    } finally {
      setFlagPending(false);
    }
  }, [customer]);

  // Handle transfer
  const handleTransfer = async () => {
    setActionLoading("transfer");
    try {
      await apiClient(`/api/conversations/${conversationId}/transfer`, {
        method: "POST",
      });
      await refreshAvailability();
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
      await refreshAvailability();
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
            <Skeleton className="mt-1 h-4 w-32" />
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
        <Link
          href={backHref}
          className="text-muted-foreground hover:text-foreground flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4 rtl:-scale-x-100" />
          {backLabel}
        </Link>
        <Card>
          <CardContent className="p-6 text-center">
            <AlertCircle className="text-destructive mx-auto mb-4 h-12 w-12" />
            <p className="text-destructive">
              {error || t("conversationNotFound")}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const displayName = getConversationDisplayName(conversation);
  const headerStatus = getConversationStatusMeta(conversation.status, {
    agentName: conversation.assignedAgent?.name,
    closeReason: conversation.closeReason,
  });
  const isWhatsApp = conversation.source === "whatsapp";
  const windowOpen = isWhatsApp
    ? isWhatsAppWindowOpen(conversation.metadata)
    : true;
  const canSendMessage = conversation.status === "agent_active" && windowOpen;

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 border-b pb-4">
        <div className="flex min-w-0 items-center gap-4">
          <Link
            href={backHref}
            className="text-muted-foreground hover:text-foreground shrink-0"
          >
            <ArrowLeft className="h-5 w-5 rtl:-scale-x-100" />
          </Link>
          <div className="flex min-w-0 items-center gap-3">
            {/* Avatar with presence indicator */}
            <div className="relative shrink-0">
              <div className="bg-muted flex h-10 w-10 items-center justify-center rounded-full">
                <User className="text-muted-foreground h-5 w-5" />
              </div>
              {/* Presence dot */}
              <span
                className={`border-background absolute bottom-0 end-0 h-3 w-3 rounded-full border-2 ${
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
              <h1 className="flex min-w-0 items-center gap-2 font-semibold">
                <span className="truncate">{displayName}</span>
                {conversation.source && (
                  <ChannelChip
                    source={conversation.source}
                    label={inboxT(getChannelMeta(conversation.source).labelKey)}
                  />
                )}
              </h1>
              {/* Same source of truth as the inbox list, so a status reads identically in both.
                  Previously a bare "AI" here — which told an agent nothing about whether the chat
                  was live, and stayed "AI" even on a conversation the cron had closed. */}
              <Badge
                variant={headerStatus.badgeVariant}
                className={headerStatus.textColor}
              >
                {inboxT(headerStatus.labelKey, headerStatus.labelValues)}
              </Badge>
              {/* Metadata reads as one wrapped line (bullet-separated) instead of
                  several independently-wrapping fragments, which looked disjointed
                  on narrow screens. */}
              <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-1.5 text-xs">
                <span>
                  {t("messages")}: {conversation.messageCount}
                </span>
                {conversation.resolvedAt &&
                  (conversation.status === "resolved" ||
                    conversation.status === "closed") && (
                    <>
                      <span aria-hidden="true">&bull;</span>
                      <span>
                        {t("closedAt", {
                          time: new Date(
                            conversation.resolvedAt
                          ).toLocaleString(),
                        })}
                      </span>
                    </>
                  )}
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
                    className={`h-1.5 w-1.5 rounded-full ${
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
                {/* Connection health, not conversation state. It used to shout a green "Live" when
                    everything was fine and show a bare unlabelled icon when the socket dropped —
                    i.e. loud on success, cryptic on failure, and easily read as "this chat is live".
                    Now silence means connected; only a problem speaks. */}
                {!isSubscribed && (
                  <>
                    <span aria-hidden="true">&bull;</span>
                    <span className="flex items-center gap-1 text-amber-600">
                      <WifiOff className="h-3 w-3" />
                      {t("reconnecting")}
                    </span>
                  </>
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
              <div className="bg-card absolute end-0 top-full z-10 mt-2 w-48 rounded-lg border py-1 shadow-lg">
                <button
                  onClick={handleResolve}
                  disabled={!!actionLoading}
                  className="hover:bg-muted flex w-full items-center gap-2 px-4 py-2 text-start text-sm"
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
                  className="hover:bg-muted flex w-full items-center gap-2 px-4 py-2 text-start text-sm"
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
                  className="hover:bg-muted flex w-full items-center gap-2 px-4 py-2 text-start text-sm"
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
      <div className="flex flex-1 flex-col gap-4 overflow-hidden pt-4 md:grid md:grid-cols-3">
        {/* Messages */}
        <div className="bg-card flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border md:col-span-2">
          {/* Messages List */}
          <div className="flex-1 overflow-y-auto p-4">
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
            {/* Customer Typing Indicator */}
            {customerTyping && (
              <div className="mb-4 flex justify-start">
                <div className="bg-muted rounded-lg rounded-bl-none px-4 py-3">
                  <div className="text-muted-foreground flex items-center gap-2 text-sm">
                    <User className="h-3 w-3" />
                    <span>{t("customerTyping")}</span>
                    <span className="flex gap-1">
                      <span
                        className="bg-muted-foreground h-1.5 w-1.5 animate-bounce rounded-full"
                        style={{ animationDelay: "0ms" }}
                      />
                      <span
                        className="bg-muted-foreground h-1.5 w-1.5 animate-bounce rounded-full"
                        style={{ animationDelay: "150ms" }}
                      />
                      <span
                        className="bg-muted-foreground h-1.5 w-1.5 animate-bounce rounded-full"
                        style={{ animationDelay: "300ms" }}
                      />
                    </span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          {canSendMessage ? (
            <div className="border-t p-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => {
                    setNewMessage(e.target.value);
                    handleAgentTyping();
                  }}
                  onKeyDown={(e) =>
                    e.key === "Enter" && !e.shiftKey && handleSendMessage()
                  }
                  placeholder={t("typeYourMessage")}
                  disabled={sending}
                  className="border-input focus:ring-ring flex-1 rounded-md border px-3 py-2 focus:outline-none focus:ring-2"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={sending || !newMessage.trim()}
                >
                  {sending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <div className="bg-muted/50 border-t p-4 text-center">
              <p className="text-muted-foreground text-sm">
                {isWhatsApp &&
                conversation.status === "agent_active" &&
                !windowOpen
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
            onToggleFlag={handleToggleFlag}
            flagPending={flagPending}
            flagError={flagError}
          />
        </div>
      </div>

      <MobileDrawer
        open={customerPanelOpen}
        onOpenChange={setCustomerPanelOpen}
        side="end"
        title={t("contact")}
        description={t("customerInfoDescription")}
        closeLabel={t("closeCustomerInfo")}
      >
        <CustomerContextPanel
          conversation={conversation}
          customer={customer}
          previousConversations={previousConversations}
          leadData={leadData}
          configuredQuestions={configuredQuestions}
          onToggleFlag={handleToggleFlag}
          flagPending={flagPending}
          flagError={flagError}
        />
      </MobileDrawer>
    </div>
  );
}
