"use client";

import { INBOX_CONFIG } from "@chatbot/shared/constants";
import {
  Badge,
  Button,
  Card,
  CardContent,
  Skeleton,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@chatbot/ui";
import {
  AlertCircle,
  Inbox,
  Clock,
  MessageSquare,
  Phone,
  RefreshCw,
  CheckCircle2,
  Flag,
  SlidersHorizontal,
  User,
  WifiOff,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";

import {
  ChannelChip,
  ConversationMetadataChip,
} from "@/components/inbox/conversation-metadata-chip";
import { InboxFilterChips } from "@/components/inbox/inbox-filter-chips";
import { InboxFiltersPanel } from "@/components/inbox/inbox-filters-panel";
import { InboxSortMenu } from "@/components/inbox/inbox-sort-menu";
import { useAgent } from "@/contexts/agent-context";
import { useInboxPolling } from "@/contexts/inbox-polling-context";
import { useProject } from "@/contexts/project-context";
import { useInboxRealtime } from "@/hooks/use-inbox-realtime";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { apiClient } from "@/lib/api-client";
import { getChannelMeta, getChannelOptions } from "@/lib/channels";
import { getConversationDisplayName } from "@/lib/conversation-identity";
import {
  getConversationStatusMeta,
  getStatusFilterOption,
  getStatusFilterOptions,
} from "@/lib/conversation-status";
import {
  buildInboxApiParams,
  clearSecondaryInboxFilters,
  getActiveInboxFilters,
  isTerminalInboxStatus,
  normalizeInboxQuery,
  parseInboxQuery,
  serializeInboxQuery,
  type InboxAssignableMember,
  type InboxQueryState,
  type InboxSort,
  type InboxStatus,
} from "@/lib/inbox-query";
import { formatInboxTime } from "@/lib/inbox-time";

// ============================================================================
// Types
// ============================================================================

interface Conversation {
  id: string;
  visitorId: string;
  customerEmail: string | null;
  customerName: string | null;
  customerPhone: string | null;
  status: "ai_active" | "waiting" | "agent_active" | "resolved" | "closed";
  assignedAgent: { id: string; name: string } | null;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string | null;
  queueEnteredAt: string | null;
  resolvedAt: string | null;
  source?: string;
  /** A conversation can be both text and voice, so this is "has had a call", not "is a call". */
  hasVoiceActivity?: boolean;
  closeReason?: string | null;
  customer?: {
    isFlagged: boolean;
  } | null;
  needsReply: boolean;
  meaningfulActivityAt: string;
  priorityReason: "waiting" | "customer_reply" | "activity";
  priorityAt: string;
  lastMessage?: {
    content: string;
    senderType: string;
    createdAt: string;
  } | null;
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
function formatHeaderTime(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/**
 * Attributes a list preview to its author. Customer messages get no prefix — they are the default
 * voice of the list. Only sender_type is denormalized, so an agent message cannot name the agent.
 */
function messagePreviewPrefix(
  senderType: string,
  t: (key: string) => string
): string {
  if (senderType === "customer") return "";
  return t(`preview.${senderType}`);
}

// ============================================================================
// Conversation List Item
// ============================================================================

function ConversationListItem({
  conversation,
  sort,
}: {
  conversation: Conversation;
  sort: InboxSort;
}) {
  const t = useTranslations("dashboard.pages.inbox");
  const locale = useLocale();
  // Shared with the detail header and previous-conversations, so a status reads the same everywhere.
  const status = getConversationStatusMeta(conversation.status, {
    agentName: conversation.assignedAgent?.name,
    closeReason: conversation.closeReason,
  });
  const displayName = getConversationDisplayName(conversation);
  const activityTime = formatInboxTime({
    sort,
    priorityReason: conversation.priorityReason,
    priorityAt: conversation.priorityAt,
    meaningfulActivityAt: conversation.meaningfulActivityAt,
    locale,
    labels: {
      lessThanMinute: t("time.lessThanMinute"),
      waitingFor: (values) => t("time.waitingFor", values),
      customerReplied: (values) => t("time.customerReplied", values),
      yesterdayAt: (values) => t("time.yesterdayAt", values),
    },
  });
  const displayedAt =
    sort === "attention" && conversation.priorityReason !== "activity"
      ? conversation.priorityAt
      : conversation.meaningfulActivityAt;

  return (
    <Link
      href={`/inbox/${conversation.id}`}
      className="hover:bg-muted/50 block rounded-lg border p-4 transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="bg-muted flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
            <User className="text-muted-foreground h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
              <span className="min-w-0 max-w-full truncate font-medium">
                {displayName}
              </span>
              {conversation.source && (
                <ChannelChip
                  source={conversation.source}
                  label={t(getChannelMeta(conversation.source).labelKey)}
                />
              )}
              {conversation.hasVoiceActivity && (
                <ConversationMetadataChip
                  icon={Phone}
                  label={t("metadata.voiceUsed")}
                />
              )}
              {conversation.customer?.isFlagged && (
                <ConversationMetadataChip
                  icon={Flag}
                  label={t("metadata.flagged")}
                />
              )}
            </div>
            <p className="text-muted-foreground max-w-xs truncate text-sm">
              {conversation.lastMessage
                ? `${messagePreviewPrefix(conversation.lastMessage.senderType, t)}${conversation.lastMessage.content}`
                : t("noMessagesYet")}
            </p>
            {/* The assigned agent used to get its own "Assigned to: X" line; the status badge now
                says "With X", so a second line would just repeat it. */}
          </div>
        </div>
        <div className="shrink-0 text-end">
          <Tooltip>
            <TooltipTrigger asChild>
              <time
                dateTime={displayedAt}
                aria-label={`${t("time.fullLabel")}: ${activityTime.full}`}
                className="text-muted-foreground me-2 text-xs"
              >
                {activityTime.text}
              </time>
            </TooltipTrigger>
            <TooltipContent>{activityTime.full}</TooltipContent>
          </Tooltip>
          <Badge
            variant={status.badgeVariant}
            className={`mt-1 text-xs ${status.textColor}`}
          >
            {t(status.labelKey, status.labelValues)}
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
  const t = useTranslations("dashboard.pages.inbox");
  const displayName =
    item.customerName ||
    item.customerEmail ||
    `Visitor ${item.visitorId.slice(0, 8)}`;
  const waitingSince = item.waitingSince
    ? new Date(item.waitingSince).getTime()
    : Date.now();
  const waitTime = isNaN(waitingSince)
    ? 0
    : Math.floor((Date.now() - waitingSince) / 60000);

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-4">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-yellow-500/20 text-sm font-medium text-yellow-600">
          #{item.position}
        </div>
        <div className="min-w-0">
          <p className="truncate font-medium">{displayName}</p>
          <p className="text-muted-foreground flex items-center gap-1 text-xs">
            <Clock className="h-3 w-3" />
            {t("waitingSummary", {
              minutes: waitTime,
              count: item.messageCount,
            })}
          </p>
        </div>
      </div>
      <Button
        size="sm"
        onClick={() => onClaim(item.id)}
        disabled={claiming}
        className="shrink-0"
      >
        {claiming ? t("claiming") : t("claim")}
      </Button>
    </div>
  );
}

function ConversationListSkeleton({ label }: { label: string }) {
  return (
    <div
      className="space-y-3"
      role="status"
      aria-label={label}
      aria-busy="true"
    >
      {Array.from({ length: 5 }, (_, index) => (
        <div
          key={index}
          className="flex items-start justify-between gap-3 rounded-lg border p-4"
          aria-hidden="true"
        >
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-40 max-w-full" />
              <Skeleton className="h-3 w-64 max-w-full" />
            </div>
          </div>
          <div className="shrink-0 space-y-2">
            <Skeleton className="ms-auto h-3 w-12" />
            <Skeleton className="h-5 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

// Polling interval: 30 seconds (fallback for realtime)
const POLL_INTERVAL_MS = 30 * 1000;
const PAGE_SIZE = INBOX_CONFIG.DEFAULT_PAGE_SIZE;

interface InboxPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface InboxResponse {
  conversations: Conversation[];
  pagination: InboxPagination;
}

interface InboxSummary {
  isOwner: boolean;
  openCount: number;
  queueCount: number;
  assignedCount: number;
  resolvedTodayCount: number;
  totalPending: number;
  timestamp: string;
}

interface TeamMemberResponse {
  userId: string | null;
  email: string;
  name?: string | null;
  status: "pending" | "active" | "suspended" | "removed";
}

const EMPTY_INBOX_SUMMARY: InboxSummary = {
  isOwner: false,
  openCount: 0,
  queueCount: 0,
  assignedCount: 0,
  resolvedTodayCount: 0,
  totalPending: 0,
  timestamp: "",
};

export default function InboxPage() {
  const t = useTranslations("dashboard.pages.inbox");
  const actionsT = useTranslations("dashboard.actions");
  const statesT = useTranslations("dashboard.states");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { currentProject, isLoading: projectLoading } = useProject();
  const {
    availability,
    refreshAvailability,
    role,
    isLoading: agentLoading,
  } = useAgent();
  const { markAsSeen, pausePolling, resumePolling } = useInboxPolling();

  const supportedChannels = useMemo(
    () => getChannelOptions().map(({ source }) => source),
    []
  );
  const searchString = searchParams?.toString() ?? "";
  const isOwner = role?.isOwner ?? false;
  const knownOwnerRole = role?.isOwner;
  const inboxQuery = useMemo(
    () =>
      parseInboxQuery(
        new URLSearchParams(searchString),
        isOwner,
        supportedChannels
      ),
    [isOwner, searchString, supportedChannels]
  );
  const canonicalQueryString = useMemo(
    () => serializeInboxQuery(inboxQuery).toString(),
    [inboxQuery]
  );
  const inboxQueryRef = useRef(inboxQuery);
  inboxQueryRef.current = inboxQuery;

  const replaceInboxQuery = useCallback(
    (next: InboxQueryState) => {
      const nextSearch = serializeInboxQuery(next).toString();
      router.replace(nextSearch ? `${pathname}?${nextSearch}` : pathname, {
        scroll: false,
      });
    },
    [pathname, router]
  );

  const updateInboxQuery = useCallback(
    (
      next: InboxQueryState,
      { preservePage = false }: { preservePage?: boolean } = {}
    ) => {
      replaceInboxQuery(
        normalizeInboxQuery(
          { ...next, page: preservePage ? next.page : 1 },
          isOwner
        )
      );
    },
    [isOwner, replaceInboxQuery]
  );

  // Wait for the current-project role before canonicalizing. Otherwise an owner's bookmarked All
  // view would briefly be treated as a member view and destructively rewritten to Mine.
  useEffect(() => {
    if (!currentProject || agentLoading || !role) return;
    if (canonicalQueryString === searchString) return;

    router.replace(
      canonicalQueryString ? `${pathname}?${canonicalQueryString}` : pathname,
      { scroll: false }
    );
  }, [
    agentLoading,
    canonicalQueryString,
    currentProject,
    pathname,
    role,
    router,
    searchString,
  ]);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [assignableMembers, setAssignableMembers] = useState<
    InboxAssignableMember[]
  >([]);
  const latestListRequestIdRef = useRef(0);
  const latestOverviewRequestIdRef = useRef(0);
  const latestMembersRequestIdRef = useRef(0);
  const listReadyProjectIdRef = useRef<string | null>(null);
  const overviewReadyProjectIdRef = useRef<string | null>(null);
  const [listReadyProjectId, setListReadyProjectId] = useState<string | null>(
    null
  );
  const [overviewReadyProjectId, setOverviewReadyProjectId] = useState<
    string | null
  >(null);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [overviewError, setOverviewError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [summary, setSummary] = useState<InboxSummary>(EMPTY_INBOX_SUMMARY);
  const [lastPolled, setLastPolled] = useState<Date | null>(null);
  const [pagination, setPagination] = useState<InboxPagination>({
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    totalPages: 0,
  });

  const conversationsUrl = useMemo(() => {
    if (!currentProject || knownOwnerRole === undefined) return null;
    const params = buildInboxApiParams(
      inboxQuery,
      currentProject.id,
      PAGE_SIZE
    );
    return `/api/conversations?${params.toString()}`;
  }, [currentProject, inboxQuery, knownOwnerRole]);

  const fetchConversationPage = useCallback(
    async ({ background = false }: { background?: boolean } = {}) => {
      if (!currentProject || !conversationsUrl) return;

      const projectId = currentProject.id;
      const requestId = ++latestListRequestIdRef.current;

      if (!background) {
        setListLoading(true);
        setListError(null);
        if (listReadyProjectIdRef.current !== projectId) setConversations([]);
      }

      try {
        const response = await apiClient<InboxResponse>(conversationsUrl);
        if (requestId !== latestListRequestIdRef.current) return;

        const { pagination: responsePagination } = response;
        if (
          response.conversations.length === 0 &&
          responsePagination.total > 0 &&
          inboxQueryRef.current.page > responsePagination.totalPages &&
          responsePagination.totalPages > 0
        ) {
          setConversations([]);
          setPagination(responsePagination);
          updateInboxQuery(
            {
              ...inboxQueryRef.current,
              page: response.pagination.totalPages,
            },
            { preservePage: true }
          );
          return;
        }

        setConversations(response.conversations || []);
        setPagination(responsePagination);
      } catch (err) {
        if (requestId !== latestListRequestIdRef.current) return;
        if (background) {
          console.error("Background inbox list refresh failed:", err);
        } else {
          console.error("Failed to fetch inbox conversations:", err);
          setConversations([]);
          setListError(t("filters.loadFailed"));
        }
      } finally {
        if (requestId === latestListRequestIdRef.current) {
          listReadyProjectIdRef.current = projectId;
          setListReadyProjectId(projectId);
          setListLoading(false);
        }
      }
    },
    [conversationsUrl, currentProject, t, updateInboxQuery]
  );

  const fetchInboxOverview = useCallback(
    async ({ background = false }: { background?: boolean } = {}) => {
      if (!currentProject) return;

      const projectId = currentProject.id;
      const requestId = ++latestOverviewRequestIdRef.current;
      if (!background) {
        setOverviewError(null);
        if (overviewReadyProjectIdRef.current !== projectId) {
          setQueue([]);
          setSummary(EMPTY_INBOX_SUMMARY);
        }
      }

      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const resolvedSince = today.toISOString();
        const [queueResponse, summaryResponse] = await Promise.all([
          apiClient<{ queue: QueueItem[]; count: number }>(
            `/api/projects/${projectId}/queue`
          ),
          apiClient<InboxSummary>(
            `/api/projects/${projectId}/inbox-summary?resolvedSince=${encodeURIComponent(resolvedSince)}`
          ),
          refreshAvailability(),
        ]);

        if (requestId !== latestOverviewRequestIdRef.current) return;
        setQueue(queueResponse.queue || []);
        setSummary(summaryResponse);
        setLastPolled(new Date());
        markAsSeen();
      } catch (err) {
        if (requestId !== latestOverviewRequestIdRef.current) return;
        if (background) {
          console.error("Background inbox overview refresh failed:", err);
        } else {
          console.error("Failed to fetch inbox overview:", err);
          setOverviewError(t("loadError"));
        }
      } finally {
        if (requestId === latestOverviewRequestIdRef.current) {
          overviewReadyProjectIdRef.current = projectId;
          setOverviewReadyProjectId(projectId);
        }
      }
    },
    [currentProject, markAsSeen, refreshAvailability, t]
  );

  const fetchAssignableMembers = useCallback(async () => {
    if (!currentProject || !role?.isOwner) {
      setAssignableMembers([]);
      return;
    }

    const requestId = ++latestMembersRequestIdRef.current;
    try {
      const response = await apiClient<{ members: TeamMemberResponse[] }>(
        `/api/projects/${currentProject.id}/members`
      );
      if (requestId !== latestMembersRequestIdRef.current) return;

      const uniqueMembers = new Map<string, InboxAssignableMember>();
      for (const member of response.members) {
        if (member.status !== "active" || !member.userId) continue;
        uniqueMembers.set(member.userId, {
          userId: member.userId,
          name: member.name?.trim() || member.email,
        });
      }
      setAssignableMembers([...uniqueMembers.values()]);
    } catch (err) {
      if (requestId !== latestMembersRequestIdRef.current) return;
      console.error("Failed to fetch assignable inbox members:", err);
      setAssignableMembers([]);
    }
  }, [currentProject, role?.isOwner]);

  const refreshInbox = useCallback(async () => {
    await Promise.all([
      fetchConversationPage(),
      fetchInboxOverview(),
      ...(isOwner ? [fetchAssignableMembers()] : []),
    ]);
  }, [
    fetchAssignableMembers,
    fetchConversationPage,
    fetchInboxOverview,
    isOwner,
  ]);

  const refreshInboxQuietly = useCallback(async () => {
    await Promise.all([
      fetchConversationPage({ background: true }),
      fetchInboxOverview({ background: true }),
    ]);
  }, [fetchConversationPage, fetchInboxOverview]);

  const realtimeHandlers = useMemo(
    () => ({
      onQueueUpdate: (update: { type: string }) => {
        // Added/position events also emit onRefreshNeeded; the remaining events need their own
        // server refresh. Never guess a new filtered position from a partial realtime payload.
        if (update.type === "claimed" || update.type === "removed") {
          void refreshInboxQuietly();
        }
      },
      onConversationUpdate: () => {
        void fetchConversationPage({ background: true });
      },
      onRefreshNeeded: () => {
        void refreshInboxQuietly();
      },
    }),
    [fetchConversationPage, refreshInboxQuietly]
  );

  // Setup realtime subscriptions
  const { isSubscribed } = useInboxRealtime(
    currentProject?.id || null,
    realtimeHandlers
  );

  // URL changes (scope/status/channel/sort/filter/page) only refresh the result page.
  useEffect(() => {
    if (conversationsUrl) void fetchConversationPage();
  }, [conversationsUrl, fetchConversationPage]);

  useEffect(() => {
    if (currentProject) void fetchInboxOverview();
  }, [currentProject, fetchInboxOverview]);

  useEffect(() => {
    if (!currentProject || knownOwnerRole === undefined) return;
    if (knownOwnerRole) void fetchAssignableMembers();
    else setAssignableMembers([]);
  }, [currentProject, fetchAssignableMembers, knownOwnerRole]);

  // Poll for updates every 30 seconds as fallback for realtime
  useEffect(() => {
    if (!currentProject) return;

    const silentFetch = () => refreshInboxQuietly();

    const pollInterval = setInterval(silentFetch, POLL_INTERVAL_MS);

    return () => clearInterval(pollInterval);
  }, [currentProject, refreshInboxQuietly]);

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
    setActionError(null);

    try {
      await apiClient(`/api/conversations/${conversationId}/claim`, {
        method: "POST",
      });
      await Promise.all([fetchConversationPage(), fetchInboxOverview()]);
    } catch (err) {
      console.error("Failed to claim conversation:", err);
      setActionError(t("claimError"));
    } finally {
      setClaiming(null);
    }
  };

  const scopeExcludesSelectedStatus =
    inboxQuery.scope === "mine" &&
    getStatusFilterOption(inboxQuery.status)?.unassigned === true;
  const attentionSortDisabled = isTerminalInboxStatus(inboxQuery.status);
  const activeFilterCount = getActiveInboxFilters(inboxQuery).length;
  const primaryCount = isOwner ? summary.openCount : summary.assignedCount;
  const primaryLabel = isOwner
    ? "stats.openConversations"
    : "stats.myActiveChats";
  const queueLabel = isOwner
    ? "stats.waitingInQueue"
    : "stats.availableToClaim";
  const resolvedLabel = isOwner
    ? "stats.resolvedToday"
    : "stats.resolvedByYouToday";

  const isInitialLoading =
    projectLoading ||
    agentLoading ||
    (currentProject !== null &&
      (role === null ||
        listReadyProjectId !== currentProject.id ||
        overviewReadyProjectId !== currentProject.id));

  if (isInitialLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-32" />
            <Skeleton className="mt-2 h-4 w-48" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Card>
          <CardContent className="space-y-4 p-6">
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
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">{t("noProjectSelected")}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if agent is online
  const isOnline = availability?.status === "online";

  return (
    <TooltipProvider delayDuration={300}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold">
              <Inbox className="h-6 w-6" />
              {t("title")}
              {/* Websocket health, not conversation state — "Live" next to the Inbox title read as
                "these chats are live". Silence now means connected; only a problem speaks. */}
              {!isSubscribed && (
                <span className="flex items-center gap-1 text-xs font-normal text-amber-600">
                  <WifiOff className="h-3 w-3" />
                  {t("reconnecting")}
                </span>
              )}
            </h1>
            <p className="text-muted-foreground">
              {t(isOwner ? "ownerSubtitle" : "memberSubtitle", {
                count: primaryCount,
              })}
              {lastPolled && (
                <span className="ms-2 text-xs">
                  ·{" "}
                  {t("updatedAt", {
                    time: formatHeaderTime(lastPolled.toISOString()),
                  })}
                </span>
              )}
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              setActionError(null);
              void refreshInbox();
            }}
          >
            <RefreshCw className="me-2 h-4 w-4" />
            {actionsT("refresh")}
          </Button>
        </div>

        {/* Offline Warning */}
        {!isOnline && (
          <div className="flex items-center gap-2 rounded-md bg-yellow-500/10 p-4 text-yellow-600">
            <AlertCircle className="h-4 w-4" />
            <p>{t("offlineWarning")}</p>
          </div>
        )}

        {/* Overview/action errors do not replace the independently healthy conversation list. */}
        {(actionError || overviewError) && (
          <div className="bg-destructive/10 text-destructive flex items-center gap-2 rounded-md p-4">
            <AlertCircle className="h-4 w-4" />
            <p>{actionError || overviewError}</p>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="p-4">
              <div className="flex min-w-0 items-center gap-3">
                <div className="shrink-0 rounded-lg bg-green-500/10 p-2">
                  <MessageSquare className="h-5 w-5 text-green-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-2xl font-bold">{primaryCount}</p>
                  <p className="text-muted-foreground text-xs">
                    {t(primaryLabel)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex min-w-0 items-center gap-3">
                <div className="shrink-0 rounded-lg bg-yellow-500/10 p-2">
                  <Clock className="h-5 w-5 text-yellow-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-2xl font-bold">{summary.queueCount}</p>
                  <p className="text-muted-foreground text-xs">
                    {t(queueLabel)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex min-w-0 items-center gap-3">
                <div className="shrink-0 rounded-lg bg-blue-500/10 p-2">
                  <CheckCircle2 className="h-5 w-5 text-blue-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-2xl font-bold">
                    {summary.resolvedTodayCount}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {t(resolvedLabel)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Queue Section */}
        {queue.length > 0 && isOnline && (
          <Card>
            <CardContent className="p-6">
              <h2 className="mb-4 flex items-center gap-2 font-semibold">
                <Clock className="h-5 w-5 text-yellow-600" />
                {t("queue.title")} (
                {t("queue.waiting", { count: summary.queueCount })})
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
                {summary.queueCount > queue.length && (
                  <p className="text-muted-foreground text-center text-sm">
                    {t("queue.more", {
                      count: summary.queueCount - queue.length,
                    })}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Conversations List */}
        <Card>
          <CardContent className="p-6">
            <div className="mb-4 space-y-3 border-b pb-4">
              <div className="flex flex-col gap-2 xl:flex-row xl:items-center">
                {inboxQuery.status !== "waiting" && (
                  <div className="flex flex-wrap items-center gap-2">
                    {[
                      { key: "mine", labelKey: "mine" },
                      ...(isOwner ? [{ key: "all", labelKey: "all" }] : []),
                    ].map((tab) => (
                      <button
                        key={tab.key}
                        onClick={() =>
                          updateInboxQuery({
                            ...inboxQuery,
                            scope: tab.key as InboxQueryState["scope"],
                          })
                        }
                        className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                          inboxQuery.scope === tab.key
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        {t(`tabs.${tab.labelKey}`)}
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-2 xl:ms-auto">
                  <select
                    id="inbox-status"
                    name="inbox-status"
                    value={inboxQuery.status}
                    onChange={(event) => {
                      const status = event.target.value as InboxStatus;
                      updateInboxQuery({
                        ...inboxQuery,
                        status,
                        needsReply:
                          status === "agent_active"
                            ? inboxQuery.needsReply
                            : false,
                      });
                    }}
                    aria-label={t("filters.label")}
                    className="bg-background h-9 min-w-36 flex-1 rounded-md border px-2 text-sm sm:flex-none"
                  >
                    {getStatusFilterOptions(isOwner).map((option) => (
                      <option key={option.value} value={option.value}>
                        {t(option.labelKey)}
                      </option>
                    ))}
                  </select>

                  <select
                    id="inbox-source"
                    name="inbox-source"
                    value={inboxQuery.source ?? "all"}
                    onChange={(event) =>
                      updateInboxQuery({
                        ...inboxQuery,
                        source:
                          event.target.value === "all"
                            ? null
                            : event.target.value,
                      })
                    }
                    aria-label={t("sources.all")}
                    className="bg-background h-9 min-w-36 flex-1 rounded-md border px-2 text-sm sm:flex-none"
                  >
                    <option value="all">{t("sources.all")}</option>
                    {getChannelOptions().map((channel) => (
                      <option key={channel.source} value={channel.source}>
                        {t(channel.labelKey)}
                      </option>
                    ))}
                  </select>

                  <InboxSortMenu
                    value={inboxQuery.sort}
                    attentionDisabled={attentionSortDisabled}
                    onChange={(sort) =>
                      updateInboxQuery({ ...inboxQuery, sort })
                    }
                  />

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    aria-expanded={filtersOpen}
                    aria-controls="inbox-filters-panel"
                    onClick={() => setFiltersOpen((open) => !open)}
                  >
                    <SlidersHorizontal aria-hidden="true" className="h-4 w-4" />
                    {t("filters.trigger", { count: activeFilterCount })}
                  </Button>
                </div>
              </div>

              {filtersOpen && (
                <InboxFiltersPanel
                  value={inboxQuery}
                  isOwner={isOwner}
                  members={assignableMembers}
                  onChange={updateInboxQuery}
                />
              )}

              <InboxFilterChips
                value={inboxQuery}
                isOwner={isOwner}
                members={assignableMembers}
                onChange={updateInboxQuery}
              />
            </div>

            {/* Conversation results */}
            {listError ? (
              <div className="py-8 text-center" role="alert" aria-live="polite">
                <AlertCircle className="text-destructive mx-auto mb-3 h-8 w-8" />
                <p className="text-muted-foreground">{listError}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => void fetchConversationPage()}
                >
                  {t("filters.retry")}
                </Button>
              </div>
            ) : listLoading ? (
              <ConversationListSkeleton label={statesT("loading")} />
            ) : (
              <>
                {conversations.length === 0 ? (
                  <div className="py-8 text-center">
                    <Inbox className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
                    {scopeExcludesSelectedStatus ? (
                      <>
                        <p className="text-muted-foreground">
                          {t("empty.unassignedScopeTitle")}
                        </p>
                        <p className="text-muted-foreground mt-1 text-sm">
                          {t("empty.unassignedScopeHint")}
                        </p>
                      </>
                    ) : inboxQuery.status === "waiting" ? (
                      <>
                        <p className="text-muted-foreground">
                          {t("empty.waitingTitle")}
                        </p>
                        <p className="text-muted-foreground mt-1 text-sm">
                          {t("empty.waitingHint")}
                        </p>
                      </>
                    ) : activeFilterCount > 0 ? (
                      <p className="text-muted-foreground">
                        {t("empty.filteredTitle")}
                      </p>
                    ) : (
                      <p className="text-muted-foreground">
                        {t("empty.title")}
                      </p>
                    )}
                    {activeFilterCount > 0 ? (
                      <Button
                        variant="link"
                        onClick={() =>
                          updateInboxQuery(
                            clearSecondaryInboxFilters(inboxQuery)
                          )
                        }
                        className="mt-2"
                      >
                        {t("empty.clearFilters")}
                      </Button>
                    ) : (
                      isOwner &&
                      inboxQuery.scope === "mine" &&
                      inboxQuery.status !== "waiting" && (
                        <Button
                          variant="link"
                          onClick={() =>
                            updateInboxQuery({ ...inboxQuery, scope: "all" })
                          }
                          className="mt-2"
                        >
                          {t("empty.showAll")}
                        </Button>
                      )
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {conversations.map((conversation) => (
                      <ConversationListItem
                        key={conversation.id}
                        conversation={conversation}
                        sort={inboxQuery.sort}
                      />
                    ))}
                  </div>
                )}

                {pagination.totalPages > 1 && (
                  <div className="mt-5 flex items-center justify-between gap-3 border-t pt-4">
                    <p className="text-muted-foreground text-sm">
                      {t("pagination.summary", {
                        page: pagination.page,
                        totalPages: pagination.totalPages,
                        total: pagination.total,
                      })}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={inboxQuery.page <= 1}
                        onClick={() =>
                          updateInboxQuery(
                            { ...inboxQuery, page: inboxQuery.page - 1 },
                            { preservePage: true }
                          )
                        }
                      >
                        {t("pagination.previous")}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={inboxQuery.page >= pagination.totalPages}
                        onClick={() =>
                          updateInboxQuery(
                            { ...inboxQuery, page: inboxQuery.page + 1 },
                            { preservePage: true }
                          )
                        }
                      >
                        {t("pagination.next")}
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}
