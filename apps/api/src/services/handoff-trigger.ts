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
import {
  broadcastNewMessage,
  broadcastConversationAssigned,
  broadcastConversationStatusChanged,
} from "./realtime";

// Cache for handoff settings to avoid repeated DB calls
const settingsCache = new Map<string, { data: HandoffSettings | null; timestamp: number }>();
const CACHE_TTL = 60000; // 1 minute cache

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

  console.log(
    `[Handoff] Low confidence trigger: maxScore=${maxScore.toFixed(2)}, threshold=${settings.auto_triggers.low_confidence_threshold}`
  );

  // Check business hours
  const withinBusinessHours = isWithinBusinessHours(settings);

  if (!withinBusinessHours) {
    return {
      triggered: true,
      reason: "low_confidence",
      message:
        "I'm not sure I can fully help with this question. Our support team is currently offline, but please leave your message and we'll get back to you during business hours.",
    };
  }

  // Check agent availability
  const availability = await checkAgentAvailability(projectId);

  if (!availability.available) {
    return {
      triggered: true,
      reason: "low_confidence",
      message:
        "I'm not sure I can fully help with this question. Our support team is currently unavailable, but please leave your message and we'll respond as soon as possible.",
    };
  }

  // Create handoff conversation (with same-agent preference)
  let handoffResult: HandoffConversationResult;
  try {
    handoffResult = await createHandoffConversation(
      projectId,
      visitorId,
      sessionId
    );
  } catch (error) {
    console.error("Failed to create handoff conversation:", error);
    return {
      triggered: true,
      reason: "low_confidence",
      message:
        "I'm not confident I can answer this properly. Please try again in a moment or leave your contact information.",
    };
  }

  // Return with appropriate message based on direct assignment or queue
  if (handoffResult.directAssignment) {
    // Direct assignment to previous agent (context continuity)
    return {
      triggered: true,
      reason: "low_confidence",
      message: "I'm not sure I can fully answer this question. Let me reconnect you with your previous support agent who has the context of your conversation.",
      queuePosition: 1,
      estimatedWait: "less than a minute",
      conversationId: handoffResult.conversationId,
    };
  }

  // Queued - return queue info
  const queuePosition = handoffResult.queuePosition || availability.queuePosition || 1;
  const estimatedWait =
    queuePosition === 1 ? "less than a minute" : `about ${queuePosition} minutes`;

  return {
    triggered: true,
    reason: "low_confidence",
    message: `I'm not sure I can fully answer this question. Let me connect you with a human agent who can help better. ${queuePosition === 1 ? "You're next in line!" : `You're #${queuePosition} in the queue.`} Estimated wait: ${estimatedWait}.`,
    queuePosition,
    estimatedWait,
    conversationId: handoffResult.conversationId,
  };
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
          console.log(
            `[Handoff] Re-assigning to previous agent ${existing.assigned_agent_id} for context continuity`
          );

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
            }).catch((err) => console.error("[Realtime] Broadcast error:", err));
          }

          // Broadcast assignment to channels (fire-and-forget)
          broadcastConversationAssigned(
            sessionId,
            projectId,
            existing.assigned_agent_id,
            { name: "Support Agent" } // Agent name will be resolved by the dashboard
          ).catch((err) => console.error("[Realtime] Broadcast error:", err));

          return {
            conversationId: existing.id,
            directAssignment: true,
            assignedAgentId: existing.assigned_agent_id,
          };
        } else {
          // Previous agent not available - clear assignment and put in queue
          console.log(
            `[Handoff] Previous agent ${existing.assigned_agent_id} not available, putting in queue`
          );

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
          ).catch((err) => console.error("[Realtime] Broadcast error:", err));

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
        ).catch((err) => console.error("[Realtime] Broadcast error:", err));

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
    console.error("Failed to create handoff conversation:", error);
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
  ).catch((err) => console.error("[Realtime] Broadcast error:", err));

  return {
    conversationId: conversation.id,
    directAssignment: false,
    queuePosition,
  };
}

/**
 * Main function: Check if a message should trigger handoff
 */
export async function checkHandoffTrigger(
  projectId: string,
  message: string,
  visitorId: string,
  sessionId?: string
): Promise<HandoffTriggerResult> {
  // 1. Get handoff settings
  const settings = await getHandoffSettings(projectId);

  // If handoff not enabled, don't trigger
  if (!settings || !settings.enabled) {
    return {
      triggered: false,
      message: "",
    };
  }

  // 2. Check for keyword trigger (if enabled)
  let triggered = false;
  let reason: HandoffTriggerResult["reason"];

  if (
    settings.auto_triggers.keywords_enabled &&
    settings.auto_triggers.keywords.length > 0
  ) {
    const keywordResult = checkKeywordTrigger(
      message,
      settings.auto_triggers.keywords
    );

    if (keywordResult.triggered) {
      triggered = true;
      reason = "keyword";
      console.log(
        `[Handoff] Keyword trigger detected: "${keywordResult.matchedKeyword}"`
      );
    }
  }

  // If no trigger detected, return early
  if (!triggered) {
    return {
      triggered: false,
      message: "",
    };
  }

  // 3. Check business hours
  const withinBusinessHours = isWithinBusinessHours(settings);

  if (!withinBusinessHours) {
    return {
      triggered: true,
      reason,
      message:
        "Our support team is currently offline. Please leave your message and we'll get back to you during business hours, or try again later.",
    };
  }

  // 4. Check agent availability
  const availability = await checkAgentAvailability(projectId);

  if (!availability.available) {
    return {
      triggered: true,
      reason,
      message:
        "Our support team is currently unavailable. Please leave your message and we'll get back to you as soon as possible.",
    };
  }

  // 5. Create handoff conversation (with same-agent preference)
  let handoffResult: HandoffConversationResult;
  try {
    handoffResult = await createHandoffConversation(
      projectId,
      visitorId,
      sessionId
    );
  } catch (error) {
    console.error("Failed to create handoff conversation:", error);
    // If we can't create the conversation, inform the user gracefully
    return {
      triggered: true,
      reason,
      message:
        "I'd like to connect you with a human agent, but we're experiencing technical difficulties. Please try again in a moment or leave your contact information and we'll reach out to you.",
    };
  }

  // 6. Return success with appropriate message based on direct assignment or queue
  if (handoffResult.directAssignment) {
    // Direct assignment to previous agent (context continuity)
    return {
      triggered: true,
      reason,
      message: "You're now reconnected with your previous support agent. They'll be with you shortly.",
      queuePosition: 1,
      estimatedWait: "less than a minute",
      conversationId: handoffResult.conversationId,
    };
  }

  // Queued - return queue info
  const queuePosition = handoffResult.queuePosition || availability.queuePosition || 1;
  const estimatedWait =
    queuePosition === 1 ? "less than a minute" : `about ${queuePosition} minutes`;

  return {
    triggered: true,
    reason,
    message: `I'm connecting you with a human agent now. ${queuePosition === 1 ? "You're next in line!" : `You're #${queuePosition} in the queue.`} Estimated wait: ${estimatedWait}. Please stay on this page.`,
    queuePosition,
    estimatedWait,
    conversationId: handoffResult.conversationId,
  };
}
