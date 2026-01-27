/**
 * Handoff Trigger Service
 *
 * Handles detection of handoff triggers in user messages:
 * - Keyword matching
 * - Low confidence detection (future)
 * - Business hours checking
 * - Agent availability checking
 */

import { supabaseAdmin } from "../lib/supabase";
import { logger, type LogContext } from "../lib/logger";
import {
  broadcastNewMessage,
  broadcastConversationAssigned,
  broadcastConversationStatusChanged,
} from "./realtime";

// Cache for handoff settings to avoid repeated DB calls
const settingsCache = new Map<string, { data: HandoffSettings | null; timestamp: number }>();
const CACHE_TTL = 60000; // 1 minute cache

/**
 * Default keywords for detecting human intent
 * These are used when no handoff settings exist for a project
 * This ensures users can always express their desire to speak to a human
 */
const DEFAULT_HUMAN_INTENT_KEYWORDS = [
  "human",
  "agent",
  "person",
  "representative",
  "operator",
  "speak to someone",
  "talk to someone",
  "talk to human",
  "real person",
  "live agent",
  "customer service",
  "support agent",
  "human support",
  "live support",
  "speak to a human",
  "talk to a human",
  "speak with someone",
  "talk with someone",
];

/**
 * Handoff settings from database
 */
export interface HandoffSettings {
  enabled: boolean;
  trigger_mode: "keyword" | "button" | "both";
  show_human_button: boolean;
  auto_triggers: {
    keywords: string[];
    keywords_enabled: boolean;
    low_confidence_enabled: boolean;
    low_confidence_threshold: number;
  };
  business_hours_enabled: boolean;
  timezone: string;
  business_hours: Record<
    string,
    { start: string; end: string; enabled: boolean }
  >;
  default_max_concurrent_chats: number;
}

/**
 * Result of checking for handoff trigger
 */
export interface HandoffTriggerResult {
  triggered: boolean;
  reason?: "keyword" | "button" | "low_confidence";
  message: string;
  queuePosition?: number;
  estimatedWait?: string;
  conversationId?: string;
}

/**
 * Message templates for different handoff trigger types
 * This avoids duplicating messages across keyword and low-confidence triggers
 */
interface HandoffMessageTemplates {
  offline: string;
  unavailable: string;
  technicalError: string;
  directAssignment: string;
  queued: (position: number, estimatedWait: string) => string;
}

const KEYWORD_MESSAGES: HandoffMessageTemplates = {
  offline:
    "Our support team is currently offline. Please leave your message and we'll get back to you during business hours, or try again later.",
  unavailable:
    "Our support team is currently unavailable. Please leave your message and we'll get back to you as soon as possible.",
  technicalError:
    "I'd like to connect you with a human agent, but we're experiencing technical difficulties. Please try again in a moment or leave your contact information and we'll reach out to you.",
  directAssignment:
    "You're now reconnected with your previous support agent. They'll be with you shortly.",
  queued: (pos, wait) =>
    `I'm connecting you with a human agent now. ${pos === 1 ? "You're next in line!" : `You're #${pos} in the queue.`} Estimated wait: ${wait}. Please stay on this page.`,
};

const LOW_CONFIDENCE_MESSAGES: HandoffMessageTemplates = {
  offline:
    "I'm not sure I can fully help with this question. Our support team is currently offline, but please leave your message and we'll get back to you during business hours.",
  unavailable:
    "I'm not sure I can fully help with this question. Our support team is currently unavailable, but please leave your message and we'll respond as soon as possible.",
  technicalError:
    "I'm not confident I can answer this properly. Please try again in a moment or leave your contact information.",
  directAssignment:
    "I'm not sure I can fully answer this question. Let me reconnect you with your previous support agent who has the context of your conversation.",
  queued: (pos, wait) =>
    `I'm not sure I can fully answer this question. Let me connect you with a human agent who can help better. ${pos === 1 ? "You're next in line!" : `You're #${pos} in the queue.`} Estimated wait: ${wait}.`,
};

/**
 * Parameters for executing the handoff flow
 */
interface ExecuteHandoffParams {
  projectId: string;
  visitorId: string;
  sessionId?: string;
  reason: "keyword" | "low_confidence" | "button";
  messages: HandoffMessageTemplates;
  settings: HandoffSettings;
}

/**
 * Unified handoff execution flow
 * Used by both keyword and low-confidence triggers to avoid code duplication
 */
async function executeHandoffFlow(
  params: ExecuteHandoffParams
): Promise<HandoffTriggerResult> {
  const { projectId, visitorId, sessionId, reason, messages, settings } = params;

  // Step 1: Check business hours
  const withinBusinessHours = isWithinBusinessHours(settings);
  if (!withinBusinessHours) {
    logger.info("Handoff blocked: outside business hours", {
      projectId,
      visitorId,
      sessionId,
      reason,
      step: "handoff_business_hours",
    });
    return {
      triggered: true,
      reason,
      message: messages.offline,
    };
  }

  // Step 2: Check agent availability
  const availability = await checkAgentAvailability(projectId);
  if (!availability.available) {
    logger.info("Handoff blocked: no agents available", {
      projectId,
      visitorId,
      sessionId,
      reason,
      step: "handoff_agent_availability",
    });
    return {
      triggered: true,
      reason,
      message: messages.unavailable,
    };
  }

  // Step 3: Create handoff conversation
  let handoffResult: HandoffConversationResult;
  try {
    handoffResult = await createHandoffConversation(projectId, visitorId, sessionId);
  } catch (error) {
    logger.error("Failed to create handoff conversation", error, {
      projectId,
      visitorId,
      sessionId,
      reason,
      step: "handoff_create_conversation",
    });
    return {
      triggered: true,
      reason,
      message: messages.technicalError,
    };
  }

  // Step 4: Format response based on assignment type
  if (handoffResult.directAssignment) {
    logger.info("Handoff: direct assignment to previous agent", {
      projectId,
      visitorId,
      sessionId,
      reason,
      agentId: handoffResult.assignedAgentId,
      step: "handoff_direct_assign",
    });
    return {
      triggered: true,
      reason,
      message: messages.directAssignment,
      queuePosition: 1,
      estimatedWait: "less than a minute",
      conversationId: handoffResult.conversationId,
    };
  }

  // Queued assignment
  const queuePosition = handoffResult.queuePosition || availability.queuePosition || 1;
  const estimatedWait = queuePosition === 1 ? "less than a minute" : `about ${queuePosition} minutes`;

  logger.info("Handoff: queued", {
    projectId,
    visitorId,
    sessionId,
    reason,
    queuePosition,
    step: "handoff_queued",
  });

  return {
    triggered: true,
    reason,
    message: messages.queued(queuePosition, estimatedWait),
    queuePosition,
    estimatedWait,
    conversationId: handoffResult.conversationId,
  };
}

/**
 * Get handoff settings for a project (with caching)
 */
export async function getHandoffSettings(
  projectId: string
): Promise<HandoffSettings | null> {
  // Check cache first
  const cached = settingsCache.get(projectId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  const { data, error } = await supabaseAdmin
    .from("handoff_settings")
    .select("*")
    .eq("project_id", projectId)
    .single();

  if (error || !data) {
    // Cache null result too to avoid repeated failed queries
    settingsCache.set(projectId, { data: null, timestamp: Date.now() });
    return null;
  }

  const settings: HandoffSettings = {
    enabled: data.enabled,
    trigger_mode: data.trigger_mode,
    show_human_button: data.show_human_button,
    auto_triggers: data.auto_triggers as HandoffSettings["auto_triggers"],
    business_hours_enabled: data.business_hours_enabled,
    timezone: data.timezone,
    business_hours: data.business_hours as HandoffSettings["business_hours"],
    default_max_concurrent_chats: data.default_max_concurrent_chats,
  };

  // Cache the result
  settingsCache.set(projectId, { data: settings, timestamp: Date.now() });

  return settings;
}

/**
 * Get time components in a specific timezone
 * Returns hours (0-23) and minutes (0-59)
 */
function getTimeInTimezone(
  date: Date,
  timezone: string
): { hours: number; minutes: number; dayName: string } {
  // Use Intl.DateTimeFormat to get reliable timezone-aware components
  const options: Intl.DateTimeFormatOptions = {
    timeZone: timezone,
    hour: "numeric",
    minute: "numeric",
    weekday: "long",
    hour12: false,
  };

  const parts = new Intl.DateTimeFormat("en-US", options).formatToParts(date);

  let hours = 0;
  let minutes = 0;
  let dayName = "";

  for (const part of parts) {
    if (part.type === "hour") {
      hours = parseInt(part.value, 10);
    } else if (part.type === "minute") {
      minutes = parseInt(part.value, 10);
    } else if (part.type === "weekday") {
      dayName = part.value.toLowerCase();
    }
  }

  return { hours, minutes, dayName };
}

/**
 * Parse time string "HH:MM" to minutes since midnight
 */
function parseTimeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(":").map((s) => parseInt(s, 10));
  return hours * 60 + minutes;
}

/**
 * Check if current time is within business hours
 */
function isWithinBusinessHours(settings: HandoffSettings): boolean {
  if (!settings.business_hours_enabled) {
    return true; // If business hours not enabled, always available
  }

  const now = new Date();
  const timezone = settings.timezone || "UTC";

  // Get current time components in the project's timezone
  const { hours, minutes, dayName } = getTimeInTimezone(now, timezone);

  const dayHours = settings.business_hours[dayName];
  if (!dayHours || !dayHours.enabled) {
    return false;
  }

  // Convert current time and business hours to minutes since midnight for comparison
  const currentMinutes = hours * 60 + minutes;
  const startMinutes = parseTimeToMinutes(dayHours.start);
  const endMinutes = parseTimeToMinutes(dayHours.end);

  // Check if current time is within range
  return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
}

/**
 * Check if any agents are available
 */
async function checkAgentAvailability(
  projectId: string
): Promise<{ available: boolean; queuePosition?: number }> {
  // Get online agents with capacity
  const { data: agents, error } = await supabaseAdmin
    .from("agent_availability")
    .select("user_id, status, current_chat_count, max_concurrent_chats")
    .eq("project_id", projectId)
    .eq("status", "online");

  if (error || !agents || agents.length === 0) {
    return { available: false };
  }

  // Check if any agent has capacity
  const availableAgent = agents.find(
    (a) => a.current_chat_count < a.max_concurrent_chats
  );

  if (availableAgent) {
    return { available: true, queuePosition: 1 };
  }

  // All agents at capacity - calculate queue position
  // Count waiting conversations
  const { count } = await supabaseAdmin
    .from("conversations")
    .select("*", { count: "exact", head: true })
    .eq("project_id", projectId)
    .eq("status", "waiting");

  return {
    available: true, // Agents exist but busy
    queuePosition: (count || 0) + 1,
  };
}

/**
 * Check if a message contains handoff trigger keywords
 */
function checkKeywordTrigger(
  message: string,
  keywords: string[]
): { triggered: boolean; matchedKeyword?: string } {
  const lowerMessage = message.toLowerCase();

  for (const keyword of keywords) {
    const lowerKeyword = keyword.toLowerCase().trim();
    if (lowerKeyword && lowerMessage.includes(lowerKeyword)) {
      return { triggered: true, matchedKeyword: keyword };
    }
  }

  return { triggered: false };
}

/**
 * Check if RAG retrieval confidence is too low
 * Used to trigger handoff when the bot can't answer confidently
 */
export interface RagConfidenceCheck {
  chunks: Array<{ combinedScore: number }>;
  threshold: number;
}

export function checkLowConfidence(
  ragResult: RagConfidenceCheck
): { isLowConfidence: boolean; maxScore: number } {
  if (!ragResult.chunks || ragResult.chunks.length === 0) {
    return { isLowConfidence: true, maxScore: 0 };
  }

  // Get the highest score from retrieved chunks
  const maxScore = Math.max(...ragResult.chunks.map((c) => c.combinedScore));

  // If the best chunk is below threshold, confidence is low
  return {
    isLowConfidence: maxScore < ragResult.threshold,
    maxScore,
  };
}

/**
 * Check if low confidence should trigger handoff
 * This is called after RAG retrieval but before LLM call
 */
export async function checkLowConfidenceHandoff(
  projectId: string,
  visitorId: string,
  ragChunks: Array<{ combinedScore: number }>,
  sessionId?: string
): Promise<HandoffTriggerResult> {
  // Get settings (will use cache if available)
  const settings = await getHandoffSettings(projectId);

  // Check if low confidence trigger is enabled
  if (
    !settings ||
    !settings.enabled ||
    !settings.auto_triggers.low_confidence_enabled
  ) {
    return { triggered: false, message: "" };
  }

  // Check if confidence is low
  const { isLowConfidence, maxScore } = checkLowConfidence({
    chunks: ragChunks,
    threshold: settings.auto_triggers.low_confidence_threshold,
  });

  if (!isLowConfidence) {
    return { triggered: false, message: "" };
  }

  logger.info("Handoff low confidence trigger", {
    projectId,
    visitorId,
    sessionId,
    step: "handoff_low_confidence",
    maxScore,
    threshold: settings.auto_triggers.low_confidence_threshold,
  });

  // Use unified handoff flow
  return executeHandoffFlow({
    projectId,
    visitorId,
    sessionId,
    reason: "low_confidence",
    messages: LOW_CONFIDENCE_MESSAGES,
    settings,
  });
}

/**
 * Result of creating/updating a handoff conversation
 */
interface HandoffConversationResult {
  conversationId: string;
  directAssignment: boolean; // true if assigned directly to previous agent
  assignedAgentId?: string;
  queuePosition?: number;
}

/**
 * Check if a specific agent is online and has capacity
 */
async function checkAgentIsAvailable(
  projectId: string,
  agentId: string
): Promise<boolean> {
  const { data: agent } = await supabaseAdmin
    .from("agent_availability")
    .select("status, current_chat_count, max_concurrent_chats")
    .eq("project_id", projectId)
    .eq("user_id", agentId)
    .eq("status", "online")
    .single();

  if (!agent) {
    return false;
  }

  // Check if agent has capacity
  return agent.current_chat_count < agent.max_concurrent_chats;
}

/**
 * Create a conversation for handoff
 * If conversation already exists with a previous agent, prefer that agent if still available
 */
async function createHandoffConversation(
  projectId: string,
  visitorId: string,
  sessionId?: string
): Promise<HandoffConversationResult> {
  const now = new Date().toISOString();

  // Check if conversation already exists
  if (sessionId) {
    const { data: existing } = await supabaseAdmin
      .from("conversations")
      .select("id, assigned_agent_id")
      .eq("id", sessionId)
      .single();

    if (existing) {
      // Check if there was a previously assigned agent
      if (existing.assigned_agent_id) {
        // Check if that agent is still online and has capacity
        const agentAvailable = await checkAgentIsAvailable(
          projectId,
          existing.assigned_agent_id
        );

        if (agentAvailable) {
          // Assign directly to the same agent (context continuity)
          logger.info("Handoff re-assigning to previous agent", {
            projectId,
            visitorId,
            sessionId,
            agentId: existing.assigned_agent_id,
            step: "handoff_reassign",
          });

          await supabaseAdmin
            .from("conversations")
            .update({
              status: "agent_active",
              handoff_requested_at: now,
              claimed_at: now,
              queue_entered_at: null,
            })
            .eq("id", sessionId);

          // Increment agent's chat count
          const { data: agentAvail } = await supabaseAdmin
            .from("agent_availability")
            .select("current_chat_count")
            .eq("user_id", existing.assigned_agent_id)
            .eq("project_id", projectId)
            .single();

          if (agentAvail) {
            await supabaseAdmin
              .from("agent_availability")
              .update({
                current_chat_count: (agentAvail.current_chat_count || 0) + 1,
                last_assigned_at: now,
              })
              .eq("user_id", existing.assigned_agent_id)
              .eq("project_id", projectId);
          }

          // Add system message and broadcast it
          const { data: systemMsg } = await supabaseAdmin
            .from("messages")
            .insert({
              conversation_id: sessionId,
              sender_type: "system",
              content: "You're now reconnected with your previous support agent.",
              metadata: { event: "handoff_reconnected", agent_id: existing.assigned_agent_id },
            })
            .select("id, created_at")
            .single();

          // Broadcast system message (fire-and-forget)
          if (systemMsg) {
            broadcastNewMessage(sessionId, {
              id: systemMsg.id,
              senderType: "system",
              content: "You're now reconnected with your previous support agent.",
              createdAt: systemMsg.created_at,
              metadata: { event: "handoff_reconnected", agent_id: existing.assigned_agent_id },
            }).catch((err) => logger.error("Realtime broadcast error", err, { step: "realtime_broadcast" }));
          }

          // Broadcast assignment to channels (fire-and-forget)
          broadcastConversationAssigned(
            sessionId,
            projectId,
            existing.assigned_agent_id,
            { name: "Support Agent" } // Agent name will be resolved by the dashboard
          ).catch((err) => logger.error("Realtime broadcast error", err, { step: "realtime_broadcast" }));

          return {
            conversationId: existing.id,
            directAssignment: true,
            assignedAgentId: existing.assigned_agent_id,
          };
        } else {
          // Previous agent not available - clear assignment and put in queue
          logger.info("Handoff previous agent not available, queueing", {
            projectId,
            visitorId,
            sessionId,
            previousAgentId: existing.assigned_agent_id,
            step: "handoff_queue",
          });

          await supabaseAdmin
            .from("conversations")
            .update({
              status: "waiting",
              assigned_agent_id: null,
              claimed_at: null,
              queue_entered_at: now,
              handoff_requested_at: now,
            })
            .eq("id", sessionId);

          // Calculate queue position
          const { count } = await supabaseAdmin
            .from("conversations")
            .select("*", { count: "exact", head: true })
            .eq("project_id", projectId)
            .eq("status", "waiting")
            .lt("queue_entered_at", now);

          const queuePosition = (count || 0) + 1;

          // Broadcast status change to channels (fire-and-forget)
          broadcastConversationStatusChanged(
            sessionId,
            projectId,
            "waiting",
            { queuePosition }
          ).catch((err) => logger.error("Realtime broadcast error", err, { step: "realtime_broadcast" }));

          return {
            conversationId: existing.id,
            directAssignment: false,
            queuePosition,
          };
        }
      } else {
        // No previous agent - put in queue normally
        await supabaseAdmin
          .from("conversations")
          .update({
            status: "waiting",
            queue_entered_at: now,
            handoff_requested_at: now,
          })
          .eq("id", sessionId);

        // Calculate queue position
        const { count } = await supabaseAdmin
          .from("conversations")
          .select("*", { count: "exact", head: true })
          .eq("project_id", projectId)
          .eq("status", "waiting")
          .lt("queue_entered_at", now);

        const queuePosition = (count || 0) + 1;

        // Broadcast status change to channels (fire-and-forget)
        broadcastConversationStatusChanged(
          sessionId,
          projectId,
          "waiting",
          { queuePosition }
        ).catch((err) => logger.error("Realtime broadcast error", err, { step: "realtime_broadcast" }));

        return {
          conversationId: existing.id,
          directAssignment: false,
          queuePosition,
        };
      }
    }
  }

  // Create new conversation with waiting status
  const { data: conversation, error } = await supabaseAdmin
    .from("conversations")
    .insert({
      project_id: projectId,
      visitor_id: visitorId,
      status: "waiting",
      source: "widget",
      queue_entered_at: now,
      handoff_requested_at: now,
    })
    .select("id")
    .single();

  if (error) {
    logger.error("Failed to create handoff conversation", error, {
      projectId,
      visitorId,
      step: "handoff_create_conversation",
    });
    throw error;
  }

  // Calculate queue position for new conversation
  const { count } = await supabaseAdmin
    .from("conversations")
    .select("*", { count: "exact", head: true })
    .eq("project_id", projectId)
    .eq("status", "waiting")
    .lt("queue_entered_at", now);

  const queuePosition = (count || 0) + 1;

  // Broadcast status change to channels (fire-and-forget)
  broadcastConversationStatusChanged(
    conversation.id,
    projectId,
    "waiting",
    { queuePosition }
  ).catch((err) => logger.error("Realtime broadcast error", err, { step: "realtime_broadcast" }));

  return {
    conversationId: conversation.id,
    directAssignment: false,
    queuePosition,
  };
}

/**
 * Main function: Check if a message should trigger handoff
 *
 * IMPORTANT: This function ALWAYS checks for human intent keywords, even if
 * handoff settings don't exist or are disabled. This ensures users can always
 * express their desire to speak to a human and receive an appropriate response.
 *
 * Flow:
 * 1. Get handoff settings (may be null)
 * 2. Determine if keywords are enabled (defaults to true)
 * 3. Get keywords to check (use defaults if none configured)
 * 4. Check for human intent
 * 5. If detected:
 *    - If handoff enabled: execute full handoff flow
 *    - If handoff disabled/unavailable: return acknowledgment message
 */
export async function checkHandoffTrigger(
  projectId: string,
  message: string,
  visitorId: string,
  sessionId?: string
): Promise<HandoffTriggerResult> {
  // 1. Get handoff settings (may be null if not configured)
  const settings = await getHandoffSettings(projectId);

  // 2. Determine if keyword checking is enabled
  // Default to true if no settings exist (always detect human intent)
  const keywordsEnabled = settings?.auto_triggers?.keywords_enabled ?? true;

  if (!keywordsEnabled) {
    // Keywords explicitly disabled by project settings
    return { triggered: false, message: "" };
  }

  // 3. Get keywords to check - use configured keywords or defaults
  const keywords =
    settings?.auto_triggers?.keywords?.length
      ? settings.auto_triggers.keywords
      : DEFAULT_HUMAN_INTENT_KEYWORDS;

  // 4. Check for human intent
  const keywordResult = checkKeywordTrigger(message, keywords);

  if (!keywordResult.triggered) {
    return { triggered: false, message: "" };
  }

  // Human intent detected!
  logger.info("Handoff keyword trigger detected", {
    projectId,
    visitorId,
    sessionId,
    matchedKeyword: keywordResult.matchedKeyword,
    step: "handoff_keyword",
    hasSettings: !!settings,
    handoffEnabled: settings?.enabled ?? false,
  });

  // 5. Handle based on handoff availability
  if (!settings || !settings.enabled) {
    // Handoff not available - acknowledge the request gracefully
    return {
      triggered: true,
      reason: "keyword",
      message:
        "I understand you'd like to speak with a human agent. Unfortunately, live support isn't available right now. I'll do my best to help you - what can I assist you with?",
    };
  }

  // Handoff is available - execute the full handoff flow
  return executeHandoffFlow({
    projectId,
    visitorId,
    sessionId,
    reason: "keyword",
    messages: KEYWORD_MESSAGES,
    settings,
  });
}
