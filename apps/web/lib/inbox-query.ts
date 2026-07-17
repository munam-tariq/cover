import { INBOX_CONFIG } from "@chatbot/shared/constants";

export type InboxSort = (typeof INBOX_CONFIG.SORT_VALUES)[number];

export type InboxStatus = (typeof INBOX_CONFIG.STATUS_VALUES)[number];

export type InboxActivityPeriod =
  (typeof INBOX_CONFIG.ACTIVITY_PERIOD_VALUES)[number];

export type InboxHandoffReason =
  (typeof INBOX_CONFIG.HANDOFF_REASON_VALUES)[number];

export interface InboxAssignableMember {
  userId: string;
  name: string;
}

export type InboxSecondaryFilter =
  | "needsReply"
  | "voiceUsed"
  | "assignedAgent"
  | "handoffReason"
  | "activityPeriod"
  | "flagged";

export interface InboxQueryState {
  scope: "mine" | "all";
  status: InboxStatus;
  source: string | null;
  sort: InboxSort;
  needsReply: boolean;
  voiceUsed: boolean;
  assignedAgent: string | null;
  handoffReason: InboxHandoffReason | null;
  activityPeriod: InboxActivityPeriod | null;
  flagged: boolean;
  page: number;
}

export const INBOX_SORT_OPTIONS = [
  {
    value: "attention",
    labelKey: "sort.attention.label",
    descriptionKey: "sort.attention.description",
    timestampMode: "priority",
  },
  {
    value: "recent",
    labelKey: "sort.recent.label",
    descriptionKey: "sort.recent.description",
    timestampMode: "activity",
  },
] as const;

const HANDOFF_LABEL_KEYS: Record<InboxHandoffReason, string> = {
  low_confidence: "filters.handoff.lowConfidence",
  keyword: "filters.handoff.keyword",
  button_click: "filters.handoff.buttonClick",
  offline_form: "filters.handoff.offlineForm",
};

const ACTIVITY_PERIOD_LABEL_KEYS: Record<InboxActivityPeriod, string> = {
  "24h": "filters.activity.last24Hours",
  "7d": "filters.activity.last7Days",
  "30d": "filters.activity.last30Days",
};

export const INBOX_HANDOFF_OPTIONS = INBOX_CONFIG.HANDOFF_REASON_VALUES.map(
  (value) => ({ value, labelKey: HANDOFF_LABEL_KEYS[value] })
);

export const INBOX_ACTIVITY_PERIOD_OPTIONS =
  INBOX_CONFIG.ACTIVITY_PERIOD_VALUES.map((value) => ({
    value,
    labelKey: ACTIVITY_PERIOD_LABEL_KEYS[value],
  }));

const INBOX_STATUSES = new Set<InboxStatus>(INBOX_CONFIG.STATUS_VALUES);
const TERMINAL_STATUSES = new Set<InboxStatus>([
  "resolved",
  "closed",
  "auto_closed",
]);
const MEMBER_INACCESSIBLE_STATUSES = new Set<InboxStatus>([
  "ai_active",
  "auto_closed",
]);
const HANDOFF_REASONS = new Set<InboxHandoffReason>(
  INBOX_HANDOFF_OPTIONS.map(({ value }) => value)
);
const ACTIVITY_PERIODS = new Set<InboxActivityPeriod>(
  INBOX_ACTIVITY_PERIOD_OPTIONS.map(({ value }) => value)
);
const ASSIGNEE_ALIASES = new Set(["unassigned", "me"]);
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isInboxStatus(value: string | null): value is InboxStatus {
  return value != null && INBOX_STATUSES.has(value as InboxStatus);
}

export function isTerminalInboxStatus(status: InboxStatus): boolean {
  return TERMINAL_STATUSES.has(status);
}

function isActivityPeriod(value: string | null): value is InboxActivityPeriod {
  return value != null && ACTIVITY_PERIODS.has(value as InboxActivityPeriod);
}

function isHandoffReason(value: string | null): value is InboxHandoffReason {
  return value != null && HANDOFF_REASONS.has(value as InboxHandoffReason);
}

function parsePage(value: string | null): number {
  if (!value || !/^[1-9]\d*$/.test(value)) return 1;
  const page = Number(value);
  return Number.isSafeInteger(page) && page <= INBOX_CONFIG.MAX_PAGE ? page : 1;
}

function isAssignee(value: string | null): value is string {
  return (
    value != null && (ASSIGNEE_ALIASES.has(value) || UUID_PATTERN.test(value))
  );
}

export function normalizeInboxQuery(
  state: InboxQueryState,
  isOwner: boolean
): InboxQueryState {
  const status =
    !isOwner && MEMBER_INACCESSIBLE_STATUSES.has(state.status)
      ? "active"
      : state.status;
  const scope = status === "waiting" ? "all" : isOwner ? state.scope : "mine";
  const assignedAgent =
    isOwner && scope === "all" && status !== "waiting"
      ? state.assignedAgent
      : null;

  return {
    ...state,
    scope,
    status,
    sort: isTerminalInboxStatus(status) ? "recent" : state.sort,
    needsReply: status === "agent_active" && state.needsReply,
    assignedAgent,
    page: Number.isSafeInteger(state.page) && state.page > 0 ? state.page : 1,
  };
}

export function parseInboxQuery(
  params: URLSearchParams,
  isOwner: boolean,
  supportedChannels: readonly string[]
): InboxQueryState {
  const rawStatus = params.get("status");
  const rawSource = params.get("channel");
  const rawSort = params.get("sort");
  const rawAssignee = params.get("assignedAgent");
  const rawHandoffReason = params.get("handoffReason");
  const rawActivityPeriod = params.get("activityPeriod");

  return normalizeInboxQuery(
    {
      scope: params.get("scope") === "all" ? "all" : "mine",
      status: isInboxStatus(rawStatus) ? rawStatus : "active",
      source:
        rawSource != null && supportedChannels.includes(rawSource)
          ? rawSource
          : null,
      sort: rawSort === "recent" ? "recent" : "attention",
      needsReply: params.get("needsReply") === "true",
      voiceUsed: params.get("voiceUsed") === "true",
      assignedAgent: isAssignee(rawAssignee) ? rawAssignee : null,
      handoffReason: isHandoffReason(rawHandoffReason)
        ? rawHandoffReason
        : null,
      activityPeriod: isActivityPeriod(rawActivityPeriod)
        ? rawActivityPeriod
        : null,
      flagged: params.get("flagged") === "true",
      page: parsePage(params.get("page")),
    },
    isOwner
  );
}

export function serializeInboxQuery(state: InboxQueryState): URLSearchParams {
  const params = new URLSearchParams();

  if (state.scope === "all" && state.status !== "waiting") {
    params.set("scope", "all");
  }
  if (state.status !== "active") params.set("status", state.status);
  if (state.source) params.set("channel", state.source);
  if (state.sort === "recent" && !isTerminalInboxStatus(state.status)) {
    params.set("sort", "recent");
  }
  if (state.needsReply) params.set("needsReply", "true");
  if (state.voiceUsed) params.set("voiceUsed", "true");
  if (state.assignedAgent) params.set("assignedAgent", state.assignedAgent);
  if (state.handoffReason) params.set("handoffReason", state.handoffReason);
  if (state.activityPeriod) params.set("activityPeriod", state.activityPeriod);
  if (state.flagged) params.set("flagged", "true");
  if (state.page > 1) params.set("page", String(state.page));

  return params;
}

export function buildInboxApiParams(
  state: InboxQueryState,
  projectId: string,
  limit = INBOX_CONFIG.DEFAULT_PAGE_SIZE
): URLSearchParams {
  const params = new URLSearchParams({
    projectId,
    scope: state.scope,
    status: state.status,
    sort: state.sort,
    page: String(state.page),
    limit: String(limit),
  });

  if (state.source) params.set("source", state.source);
  if (state.needsReply) params.set("needsReply", "true");
  if (state.voiceUsed) params.set("voiceUsed", "true");
  if (state.assignedAgent) params.set("assignedAgent", state.assignedAgent);
  if (state.handoffReason) params.set("handoffReason", state.handoffReason);
  if (state.activityPeriod) params.set("activityPeriod", state.activityPeriod);
  if (state.flagged) params.set("flagged", "true");

  return params;
}

export function getActiveInboxFilters(
  state: InboxQueryState
): InboxSecondaryFilter[] {
  const filters: InboxSecondaryFilter[] = [];
  if (state.needsReply) filters.push("needsReply");
  if (state.voiceUsed) filters.push("voiceUsed");
  if (state.assignedAgent) filters.push("assignedAgent");
  if (state.handoffReason) filters.push("handoffReason");
  if (state.activityPeriod) filters.push("activityPeriod");
  if (state.flagged) filters.push("flagged");
  return filters;
}

export function clearSecondaryInboxFilters(
  state: InboxQueryState
): InboxQueryState {
  return {
    ...state,
    needsReply: false,
    voiceUsed: false,
    assignedAgent: null,
    handoffReason: null,
    activityPeriod: null,
    flagged: false,
  };
}

export function removeInboxFilter(
  state: InboxQueryState,
  filter: InboxSecondaryFilter
): InboxQueryState {
  if (
    filter === "needsReply" ||
    filter === "voiceUsed" ||
    filter === "flagged"
  ) {
    return { ...state, [filter]: false };
  }

  return { ...state, [filter]: null };
}
