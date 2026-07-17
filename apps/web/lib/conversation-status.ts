/**
 * Single source of truth for how a conversation's status is presented.
 *
 * Consumed by the inbox list, the conversation detail header, and the previous-conversations
 * widget, so a status reads identically everywhere. Follows the `getChannelMeta` pattern in
 * ./channels.ts: return shared presentation metadata and let the component call `t()`.
 *
 * The labels deliberately say what the state MEANS rather than naming the enum. "AI" and "Active"
 * don't tell an agent whether anyone is waiting on them; "AI handling" and "With Sarah" do.
 */

export type ConversationStatus =
  | "ai_active"
  | "waiting"
  | "agent_active"
  | "resolved"
  | "closed";

export type InboxStatusFilter = "active" | ConversationStatus | "auto_closed";

export interface ConversationStatusMeta {
  /** Key under `dashboard.pages.inbox.status`. */
  labelKey: string;
  /** ICU values for `labelKey`, when it interpolates. */
  labelValues?: Record<string, string>;
  /** Badge text tint. `@chatbot/ui` Badge has no semantic variants, so tone rides on className. */
  textColor: string;
  badgeVariant: "default" | "secondary" | "outline";
}

interface StatusOptions {
  /** Assigned agent's display name. The API already sends `assignedAgent.name`. */
  agentName?: string | null;
  /** `metadata.close_reason`. Only meaningful when status is `closed`. */
  closeReason?: string | null;
}

const BASE: Record<ConversationStatus, ConversationStatusMeta> = {
  ai_active: {
    labelKey: "status.ai_active",
    textColor: "text-blue-600",
    badgeVariant: "secondary",
  },
  waiting: {
    labelKey: "status.waiting",
    textColor: "text-yellow-600",
    badgeVariant: "secondary",
  },
  agent_active: {
    labelKey: "status.agent_active",
    textColor: "text-green-600",
    badgeVariant: "default",
  },
  resolved: {
    labelKey: "status.resolved",
    textColor: "text-gray-600",
    badgeVariant: "secondary",
  },
  closed: {
    labelKey: "status.closed",
    textColor: "text-gray-600",
    badgeVariant: "secondary",
  },
};

/**
 * `close_reason` -> label key. Only inactivity auto-closes are called out; a conversation closed by
 * the visitor, an agent, or the offline form is just "Closed". Anything unrecognised falls back to
 * the plain label rather than mislabelling it.
 */
const CLOSE_REASON_LABELS: Record<string, string> = {
  inactivity: "status.closed_inactivity",
};

export function getConversationStatusMeta(
  status: ConversationStatus,
  options: StatusOptions = {}
): ConversationStatusMeta {
  const base = BASE[status] ?? BASE.closed;

  if (status === "agent_active" && options.agentName) {
    return {
      ...base,
      labelKey: "status.agent_active_named",
      labelValues: { name: options.agentName },
    };
  }

  if (status === "closed" && options.closeReason) {
    const labelKey = CLOSE_REASON_LABELS[options.closeReason];
    if (labelKey) return { ...base, labelKey };
  }

  return base;
}

/**
 * Filter options for the inbox. `auto_closed` is a semantic API status that maps server-side to
 * `status=closed AND metadata.close_reason=inactivity`.
 * Server-driven: GET /conversations excludes closed by default, so a client-side filter would
 * render an empty list forever.
 */
export interface StatusFilterOption {
  value: InboxStatusFilter;
  labelKey: string;
  status: InboxStatusFilter;
  closeReason?: string;
  /**
   * True when every chat this option can return is, by definition, assigned to nobody: the AI
   * handles them and no agent ever claims them. Such an option can never return a row under the
   * "Mine" scope, and can never return one at all for a non-owner — the API caps them at
   * `assigned_agent_id = me OR status = waiting`.
   */
  unassigned?: boolean;
}

const ALL_STATUS_FILTER_OPTIONS: StatusFilterOption[] = [
  {
    value: "active",
    labelKey: "filters.activeChats",
    status: "active",
  },
  {
    value: "ai_active",
    labelKey: "status.ai_active",
    status: "ai_active",
    unassigned: true,
  },
  { value: "waiting", labelKey: "status.waiting", status: "waiting" },
  {
    value: "agent_active",
    labelKey: "status.agent_active",
    status: "agent_active",
  },
  { value: "resolved", labelKey: "status.resolved", status: "resolved" },
  // NOT `unassigned`: a plain close can come from an agent (assigned) or the visitor/offline form
  // (unassigned), so this one is genuinely mixed.
  { value: "closed", labelKey: "filters.allClosed", status: "closed" },
  {
    value: "auto_closed",
    labelKey: "status.closed_inactivity",
    status: "auto_closed",
    unassigned: true,
  },
];

/**
 * The options a given role can actually get results from. A non-owner is capped server-side at
 * their own chats plus the waiting queue, so offering them an unassigned-only filter is offering a
 * control with no reachable state — it isn't a permission they're being denied, it's a lie.
 */
export function getStatusFilterOptions(isOwner: boolean): StatusFilterOption[] {
  return isOwner
    ? ALL_STATUS_FILTER_OPTIONS
    : ALL_STATUS_FILTER_OPTIONS.filter((option) => !option.unassigned);
}

export function getStatusFilterOption(
  value: string
): StatusFilterOption | undefined {
  return ALL_STATUS_FILTER_OPTIONS.find((option) => option.value === value);
}

const HANDOFF_REASON_LABEL_KEYS: Record<string, string> = {
  low_confidence: "handoffReasons.lowConfidence",
  keyword: "handoffReasons.keyword",
  customer_request: "handoffReasons.customerRequest",
  button_click: "handoffReasons.buttonClick",
  // Kept for historical/app-side values even though persisted rows use button_click.
  button: "handoffReasons.buttonClick",
  offline_form: "handoffReasons.offlineForm",
};

/** Localized detail-label key for every persisted handoff reason. */
export function getHandoffReasonLabelKey(reason: string): string {
  return HANDOFF_REASON_LABEL_KEYS[reason] ?? "handoffReasons.other";
}
