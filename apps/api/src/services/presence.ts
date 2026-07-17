/**
 * Presence Service
 *
 * Handles presence tracking for customers and agents.
 * - Customer presence: Tracks if customer is actively in conversation
 * - Agent presence: Tracks agent availability status via heartbeats
 *
 * Thresholds:
 * - Customer considered "away" after 2 minutes of inactivity
 * - Customer considered "offline" after 5 minutes of inactivity
 * - Agent auto-set to "away" after 15 minutes without heartbeat
 * - Agent auto-set to "offline" after 30 minutes without heartbeat
 */

import { supabaseAdmin } from "../lib/supabase";

import { dispatchToChannel } from "./channels/outbound-dispatcher";
import {
  broadcastPresenceUpdate,
  broadcastAgentStatusChanged,
  broadcastNewMessage,
} from "./realtime";

// ============================================================================
// Constants
// ============================================================================

// Customer presence thresholds (in milliseconds)
export const CUSTOMER_AWAY_THRESHOLD_MS = 2 * 60 * 1000; // 2 minutes
export const CUSTOMER_OFFLINE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

// Agent presence thresholds (in milliseconds)
export const AGENT_AWAY_THRESHOLD_MS = 15 * 60 * 1000; // 15 minutes
export const AGENT_OFFLINE_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Auto-close timing is per-project (`handoff_settings.inactivity_timeout_minutes` /
 * `auto_close_after_warning_minutes`, defaulting to 10/5) and is evaluated inside the
 * claim_and_warn_inactive / close_inactive_conversations RPCs, not here.
 *
 * This 24h constant is retained ONLY for `checkCustomerPresence`'s `abandoned` flag, which is a
 * read-only UI hint. It is deliberately no longer a close threshold: the old cron keyed off
 * `customer_last_seen_at`, which is NULL for every AI-handled conversation, so `.lt()` matched
 * nothing and the feature closed nothing for its entire lifetime.
 */
export const CONVERSATION_ABANDONED_HINT_THRESHOLD_MS = 24 * 60 * 60 * 1000; // 24 hours

/** Rows per cron tick, per phase. The cron runs every 5 minutes. */
const AUTO_CLOSE_BATCH_LIMIT = 200;

// ============================================================================
// Types
// ============================================================================

export type CustomerPresenceStatus = "online" | "away" | "offline";
export type AgentPresenceStatus = "online" | "away" | "offline";

export interface PresenceInfo {
  status: CustomerPresenceStatus | AgentPresenceStatus;
  lastSeenAt: string;
  isActive: boolean;
}

// ============================================================================
// Customer Presence
// ============================================================================

/**
 * Update customer presence for a conversation
 * Called when customer sends a message or heartbeat
 */
export async function updateCustomerPresence(
  conversationId: string
): Promise<void> {
  try {
    const now = new Date().toISOString();

    // Update conversation's customer last seen
    await supabaseAdmin
      .from("conversations")
      .update({
        customer_last_seen_at: now,
        customer_presence: "online",
      })
      .eq("id", conversationId);

    // Broadcast presence update
    await broadcastPresenceUpdate(conversationId, {
      customerOnline: true,
      agentOnline: false, // Will be updated separately
      lastSeenAt: now,
    });
  } catch (error) {
    console.error("[Presence] Failed to update customer presence:", error);
  }
}

/**
 * Get customer presence status based on last activity
 */
export function getCustomerPresenceStatus(lastSeenAt: string | null): PresenceInfo {
  if (!lastSeenAt) {
    return {
      status: "offline",
      lastSeenAt: "",
      isActive: false,
    };
  }

  const lastSeen = new Date(lastSeenAt).getTime();
  const now = Date.now();
  const elapsed = now - lastSeen;

  if (elapsed < CUSTOMER_AWAY_THRESHOLD_MS) {
    return {
      status: "online",
      lastSeenAt,
      isActive: true,
    };
  } else if (elapsed < CUSTOMER_OFFLINE_THRESHOLD_MS) {
    return {
      status: "away",
      lastSeenAt,
      isActive: true,
    };
  } else {
    return {
      status: "offline",
      lastSeenAt,
      isActive: false,
    };
  }
}

/**
 * Check and update customer presence status for a conversation
 * Returns true if the customer is considered abandoned (offline for too long)
 */
export async function checkCustomerPresence(
  conversationId: string
): Promise<{ status: CustomerPresenceStatus; abandoned: boolean }> {
  try {
    const { data: conversation } = await supabaseAdmin
      .from("conversations")
      .select("customer_last_seen_at, customer_presence, status")
      .eq("id", conversationId)
      .single();

    if (!conversation) {
      return { status: "offline", abandoned: false };
    }

    const presence = getCustomerPresenceStatus(conversation.customer_last_seen_at);

    // Update presence if changed
    if (presence.status !== conversation.customer_presence) {
      await supabaseAdmin
        .from("conversations")
        .update({ customer_presence: presence.status })
        .eq("id", conversationId);
    }

    // Read-only "looks abandoned" hint for the UI. NOT a close decision — closing is the cron's
    // job, keyed off customer/voice activity rather than presence.
    //
    // A NULL customer_last_seen_at means "we never recorded presence", not "last seen at the epoch".
    // Treating it as 0 (as this did) marks every AI-handled conversation abandoned the instant it is
    // created, since nothing on the AI path writes that column. Absent data => no claim.
    const activeStatuses = ["ai_active", "waiting", "agent_active"];
    const abandoned =
      conversation.customer_last_seen_at != null &&
      activeStatuses.includes(conversation.status) &&
      Date.now() - new Date(conversation.customer_last_seen_at).getTime() >
        CONVERSATION_ABANDONED_HINT_THRESHOLD_MS;

    return { status: presence.status, abandoned };
  } catch (error) {
    console.error("[Presence] Failed to check customer presence:", error);
    return { status: "offline", abandoned: false };
  }
}

// ============================================================================
// Agent Presence
// ============================================================================

/**
 * Update agent presence via heartbeat
 * Called from the agent heartbeat endpoint
 */
export async function updateAgentPresence(
  userId: string,
  projectId: string
): Promise<PresenceInfo> {
  try {
    const now = new Date().toISOString();

    const { data: availability, error } = await supabaseAdmin
      .from("agent_availability")
      .update({ last_seen_at: now })
      .eq("user_id", userId)
      .eq("project_id", projectId)
      .select("status, current_chat_count, max_concurrent_chats")
      .single();

    if (error || !availability) {
      return {
        status: "offline",
        lastSeenAt: now,
        isActive: false,
      };
    }

    return {
      status: availability.status as AgentPresenceStatus,
      lastSeenAt: now,
      isActive: availability.status === "online",
    };
  } catch (error) {
    console.error("[Presence] Failed to update agent presence:", error);
    return {
      status: "offline",
      lastSeenAt: new Date().toISOString(),
      isActive: false,
    };
  }
}

/**
 * Get agent presence status based on last activity
 */
export function getAgentPresenceStatus(
  lastSeenAt: string | null,
  currentStatus: string
): PresenceInfo {
  if (!lastSeenAt || currentStatus === "offline") {
    return {
      status: "offline",
      lastSeenAt: lastSeenAt || "",
      isActive: false,
    };
  }

  const lastSeen = new Date(lastSeenAt).getTime();
  const now = Date.now();
  const elapsed = now - lastSeen;

  if (elapsed < AGENT_AWAY_THRESHOLD_MS) {
    return {
      status: currentStatus as AgentPresenceStatus,
      lastSeenAt,
      isActive: currentStatus === "online",
    };
  } else if (elapsed < AGENT_OFFLINE_THRESHOLD_MS) {
    return {
      status: "away",
      lastSeenAt,
      isActive: false,
    };
  } else {
    return {
      status: "offline",
      lastSeenAt,
      isActive: false,
    };
  }
}

/**
 * Check and auto-update agent statuses based on heartbeat
 * This is typically called by a cron job
 */
export async function checkAndUpdateAgentStatuses(): Promise<{
  updated: number;
  details: Array<{ userId: string; projectId: string; newStatus: string }>;
}> {
  const results: Array<{ userId: string; projectId: string; newStatus: string }> = [];

  try {
    // Get all agents who are not offline
    const { data: activeAgents } = await supabaseAdmin
      .from("agent_availability")
      .select("user_id, project_id, status, last_seen_at")
      .neq("status", "offline");

    if (!activeAgents || activeAgents.length === 0) {
      return { updated: 0, details: [] };
    }

    const now = Date.now();

    for (const agent of activeAgents) {
      const lastSeen = agent.last_seen_at
        ? new Date(agent.last_seen_at).getTime()
        : 0;
      const elapsed = now - lastSeen;

      let newStatus: AgentPresenceStatus | null = null;

      // Check if should go offline
      if (elapsed > AGENT_OFFLINE_THRESHOLD_MS && agent.status !== "offline") {
        newStatus = "offline";
      }
      // Check if should go away
      else if (
        elapsed > AGENT_AWAY_THRESHOLD_MS &&
        agent.status === "online"
      ) {
        newStatus = "away";
      }

      if (newStatus) {
        // Update status
        await supabaseAdmin
          .from("agent_availability")
          .update({
            status: newStatus,
            status_changed_at: new Date().toISOString(),
          })
          .eq("user_id", agent.user_id)
          .eq("project_id", agent.project_id);

        // Broadcast status change
        await broadcastAgentStatusChanged(
          agent.project_id,
          agent.user_id,
          newStatus
        );

        results.push({
          userId: agent.user_id,
          projectId: agent.project_id,
          newStatus,
        });
      }
    }

    return { updated: results.length, details: results };
  } catch (error) {
    console.error("[Presence] Failed to check agent statuses:", error);
    return { updated: 0, details: [] };
  }
}

// ============================================================================
// Conversation Cleanup
// ============================================================================

/**
 * Warning copy, per locale. Templates: {mins} is substituted per-row inside the RPC against that
 * conversation's own `auto_close_after_warning_minutes`, because one batch spans many projects and
 * each may configure a different grace.
 */
const INACTIVITY_WARNING_TEXTS: Record<string, string> = {
  en: "Still there? I'll close this chat in about {mins} minutes if I don't hear back — just reply and I'll keep it open.",
  ar: "هل ما زلت هناك؟ سأغلق هذه المحادثة خلال {mins} دقائق تقريبًا إذا لم أتلقَّ ردًا — ما عليك سوى الرد وسأبقيها مفتوحة.",
};

const AUTO_CLOSE_TEXTS: Record<string, string> = {
  en: "This conversation was automatically closed due to inactivity.",
  ar: "تم إغلاق هذه المحادثة تلقائيًا بسبب عدم النشاط.",
};

interface WarnedRow {
  conversation_id: string;
  project_id: string;
  source: string;
  message_id: string;
  warning_text: string;
}

interface ClosedRow {
  conversation_id: string;
  project_id: string;
  source: string;
  message_id: string;
  close_text: string;
}

/**
 * Warn AI-handled conversations that have gone quiet, then close the ones whose grace has elapsed.
 * Called by the conversation-cleanup cron.
 *
 * The state machine lives in two Postgres functions rather than here: the Data API cannot express
 * `metadata || jsonb`, DB-side now(), dynamic intervals, or GREATEST() in a predicate, and doing it
 * as read-then-write would reintroduce the check-then-act races that made the original version
 * close nothing at all. Each RPC claims its rows under FOR UPDATE ... SKIP LOCKED and returns only
 * the rows it actually mutated, so the side effects below can never fire for a row we didn't claim
 * (or twice, when two cron ticks overlap).
 */
export async function closeAbandonedConversations(): Promise<{
  warned: number;
  closed: number;
  conversations: string[];
}> {
  let warned = 0;
  const closedConversations: string[] = [];

  // ---- WARN ------------------------------------------------------------
  const { data: warnedRows, error: warnError } = await supabaseAdmin.rpc(
    "claim_and_warn_inactive",
    { p_limit: AUTO_CLOSE_BATCH_LIMIT, p_texts: INACTIVITY_WARNING_TEXTS }
  );

  if (warnError) {
    throw new Error(`claim_and_warn_inactive failed: ${warnError.message}`);
  }
  const warnedResult = (warnedRows ?? []) as WarnedRow[];
  warned = warnedResult.length;
  await Promise.all(warnedResult.map((row) => deliverInactivityWarning(row)));

  // ---- CLOSE -----------------------------------------------------------
  const { data: closedRows, error: closeError } = await supabaseAdmin.rpc(
    "close_inactive_conversations",
    { p_limit: AUTO_CLOSE_BATCH_LIMIT, p_texts: AUTO_CLOSE_TEXTS }
  );

  if (closeError) {
    throw new Error(`close_inactive_conversations failed: ${closeError.message}`);
  }
  const closedResult = (closedRows ?? []) as ClosedRow[];
  for (const row of closedResult) closedConversations.push(row.conversation_id);
  await Promise.all(closedResult.map((row) => deliverAutoClose(row)));

  return {
    warned,
    closed: closedConversations.length,
    conversations: closedConversations,
  };
}

/**
 * Get a cron-written message in front of the customer. The message row already exists (written
 * atomically with the claim/close), so both hops here are best-effort delivery on top of a durable
 * record — neither failing changes whether the conversation closes.
 *
 * The text always comes from the RPC, never re-derived here: the row's language lives in the
 * database, so picking copy in JS would broadcast English over a conversation whose stored message
 * is Arabic.
 */
async function deliverCronMessage(input: {
  conversationId: string;
  source: string;
  messageId: string;
  text: string;
  senderType: "ai" | "system";
  metadata: Record<string, unknown>;
  label: string;
}): Promise<void> {
  // Realtime, for an open widget. Failures are swallowed by realtime.ts and reported as success,
  // so this is a nudge, not a guarantee — the message row is the source of truth.
  await broadcastNewMessage(input.conversationId, {
    id: input.messageId,
    senderType: input.senderType,
    content: input.text,
    createdAt: new Date().toISOString(),
    metadata: input.metadata,
  }).catch((err) =>
    console.error(`[Presence] ${input.label} broadcast failed:`, err)
  );

  // WhatsApp needs an actual outbound send; inserting a row delivers nothing there. Non-WhatsApp
  // sources short-circuit to { transport: "realtime" }, so this is a no-op for them.
  try {
    const result = await dispatchToChannel(input.conversationId, input.text);
    if (!result.ok) {
      // WINDOW_CLOSED / NO_ACTIVE_CONNECTION / SEND_FAILED: the customer won't see it, but we still
      // close on schedule. Retrying against a failing Graph API would re-send every tick.
      console.warn(
        `[Presence] ${input.label} not delivered to ${input.source} conversation ${input.conversationId}: ${result.reason}`
      );
    }
  } catch (err) {
    console.error("[Presence] dispatchToChannel threw:", err);
  }
}

function deliverInactivityWarning(row: WarnedRow): Promise<void> {
  return deliverCronMessage({
    conversationId: row.conversation_id,
    source: row.source,
    messageId: row.message_id,
    text: row.warning_text,
    senderType: "ai",
    metadata: { event: "inactivity_warning", csat_prompt: true },
    label: "warning",
  });
}

function deliverAutoClose(row: ClosedRow): Promise<void> {
  return deliverCronMessage({
    conversationId: row.conversation_id,
    source: row.source,
    messageId: row.message_id,
    text: row.close_text,
    senderType: "system",
    metadata: { event: "auto_closed", reason: "inactivity" },
    label: "auto-close",
  });
}

// ============================================================================
// Batch Presence Check
// ============================================================================

/**
 * Get presence status for multiple conversations at once
 * Useful for displaying presence in conversation lists
 */
export async function batchGetPresence(
  conversationIds: string[]
): Promise<
  Map<string, { customerPresence: CustomerPresenceStatus; agentOnline: boolean }>
> {
  const result = new Map<
    string,
    { customerPresence: CustomerPresenceStatus; agentOnline: boolean }
  >();

  if (conversationIds.length === 0) {
    return result;
  }

  try {
    const { data: conversations } = await supabaseAdmin
      .from("conversations")
      .select("id, customer_last_seen_at, customer_presence, assigned_agent_id")
      .in("id", conversationIds);

    if (!conversations) {
      return result;
    }

    // Get agent IDs and check their status
    const agentIds = conversations
      .map((c) => c.assigned_agent_id)
      .filter((id): id is string => !!id);

    const { data: agentStatuses } = await supabaseAdmin
      .from("agent_availability")
      .select("user_id, status")
      .in("user_id", agentIds);

    const agentStatusMap = new Map(
      (agentStatuses || []).map((a) => [a.user_id, a.status])
    );

    for (const conv of conversations) {
      const customerPresence = getCustomerPresenceStatus(
        conv.customer_last_seen_at
      );
      const agentStatus = conv.assigned_agent_id
        ? agentStatusMap.get(conv.assigned_agent_id)
        : null;

      result.set(conv.id, {
        customerPresence: customerPresence.status,
        agentOnline: agentStatus === "online",
      });
    }

    return result;
  } catch (error) {
    console.error("[Presence] Failed to batch get presence:", error);
    return result;
  }
}
