/**
 * Lead Capture Service
 *
 * Handles capturing emails when the chatbot can't answer questions.
 * Includes:
 * - Email extraction from messages
 * - Decline pattern detection
 * - Session state management
 * - Lead storage
 */

import { supabaseAdmin } from "../lib/supabase";

// Cache for lead capture settings to avoid repeated DB calls
const leadSettingsCache = new Map<string, { data: LeadCaptureSettings; timestamp: number }>();
const CACHE_TTL = 60000; // 1 minute cache

/**
 * Settings for lead capture from project.settings JSON
 */
export interface LeadCaptureSettings {
  lead_capture_enabled?: boolean;
  lead_capture_email?: string;
  lead_notifications_enabled?: boolean;
  last_lead_digest_at?: string;
}

/**
 * Session state for lead capture
 */
export interface LeadCaptureSessionState {
  awaiting_email: boolean;
  last_message_at: Date | null;
  pending_question: string | null;
  email_asked: boolean;
}

/**
 * Result from processing lead capture flow
 */
export interface LeadCaptureResult {
  type: "email_captured" | "declined" | "ask_for_email" | "no_action";
  email?: string;
  shouldAppendToResponse: boolean;
  responseAppendix?: string;
}

/**
 * Stored lead capture record
 */
export interface LeadCapture {
  id: string;
  project_id: string;
  session_id: string | null;
  question: string;
  user_email: string | null;
  created_at: string;
  notified_at: string | null;
}

const CONVERSATION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Extract email address from user message
 */
export function extractEmailFromMessage(message: string): string | null {
  // Standard email regex
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi;
  const matches = message.match(emailRegex);

  if (matches && matches.length > 0) {
    // Return first valid email, lowercase
    return matches[0].toLowerCase();
  }

  return null;
}

/**
 * Check if user message is declining email capture
 */
export function isDeclineResponse(message: string): boolean {
  const normalizedMessage = message.trim().toLowerCase();

  const declinePatterns = [
    /^no$/,
    /^nope$/,
    /^no thanks?$/,
    /^no,? thanks?$/,
    /^nah$/,
    /^skip$/,
    /^never ?mind$/,
    /^not now$/,
    /^maybe later$/,
    /^i'?m (good|ok|okay)$/,
    /^pass$/,
    /^not interested$/,
    /^don'?t want to$/,
    /^i'd rather not$/,
  ];

  return declinePatterns.some((pattern) => pattern.test(normalizedMessage));
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
}

/**
 * Check if this is a new conversation (session timeout)
 */
export function isNewConversation(lastMessageAt: Date | null): boolean {
  if (!lastMessageAt) return true;

  const timeSinceLastMessage = Date.now() - lastMessageAt.getTime();
  return timeSinceLastMessage > CONVERSATION_TIMEOUT_MS;
}

/**
 * Get session state for lead capture
 */
export async function getSessionState(
  sessionId: string
): Promise<LeadCaptureSessionState | null> {
  const { data: session, error } = await supabaseAdmin
    .from("chat_sessions")
    .select("awaiting_email, last_message_at, pending_question, email_asked")
    .eq("id", sessionId)
    .single();

  if (error || !session) {
    return null;
  }

  return {
    awaiting_email: session.awaiting_email || false,
    last_message_at: session.last_message_at
      ? new Date(session.last_message_at)
      : null,
    pending_question: session.pending_question || null,
    email_asked: session.email_asked || false,
  };
}

/**
 * Update session to await email
 */
export async function setAwaitingEmailState(
  sessionId: string,
  question: string
): Promise<void> {
  await supabaseAdmin
    .from("chat_sessions")
    .update({
      awaiting_email: true,
      pending_question: question,
      email_asked: true,
      last_message_at: new Date().toISOString(),
    })
    .eq("id", sessionId);
}

/**
 * Clear awaiting email state
 */
export async function clearAwaitingEmailState(sessionId: string): Promise<void> {
  await supabaseAdmin
    .from("chat_sessions")
    .update({
      awaiting_email: false,
      pending_question: null,
      last_message_at: new Date().toISOString(),
    })
    .eq("id", sessionId);
}

/**
 * Reset session state (on timeout)
 */
export async function resetSessionState(sessionId: string): Promise<void> {
  await supabaseAdmin
    .from("chat_sessions")
    .update({
      awaiting_email: false,
      pending_question: null,
      email_asked: false,
      last_message_at: new Date().toISOString(),
    })
    .eq("id", sessionId);
}

/**
 * Update last message timestamp
 */
export async function updateLastMessageAt(sessionId: string): Promise<void> {
  await supabaseAdmin
    .from("chat_sessions")
    .update({
      last_message_at: new Date().toISOString(),
    })
    .eq("id", sessionId);
}

/**
 * Store a lead capture record
 */
export async function storeLead(
  projectId: string,
  sessionId: string | null,
  question: string,
  email: string | null
): Promise<void> {
  const { error } = await supabaseAdmin.from("lead_captures").insert({
    project_id: projectId,
    session_id: sessionId,
    question,
    user_email: email,
  });

  if (error) {
    console.error("Failed to store lead:", error);
    throw new Error("Failed to store lead capture");
  }
}

/**
 * Get pending leads for a project (not yet notified)
 */
export async function getPendingLeads(
  projectId: string
): Promise<LeadCapture[]> {
  const { data, error } = await supabaseAdmin
    .from("lead_captures")
    .select("*")
    .eq("project_id", projectId)
    .is("notified_at", null)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Failed to get pending leads:", error);
    return [];
  }

  return data || [];
}

/**
 * Mark leads as notified
 */
export async function markLeadsAsNotified(leadIds: string[]): Promise<void> {
  if (leadIds.length === 0) return;

  await supabaseAdmin
    .from("lead_captures")
    .update({ notified_at: new Date().toISOString() })
    .in("id", leadIds);
}

/**
 * Get lead capture settings for a project (with caching)
 */
export async function getLeadCaptureSettings(
  projectId: string
): Promise<LeadCaptureSettings> {
  // Check cache first
  const cached = leadSettingsCache.get(projectId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  const { data: project, error } = await supabaseAdmin
    .from("projects")
    .select("settings")
    .eq("id", projectId)
    .single();

  if (error || !project) {
    const emptySettings: LeadCaptureSettings = {};
    leadSettingsCache.set(projectId, { data: emptySettings, timestamp: Date.now() });
    return emptySettings;
  }

  const settings = (project.settings as Record<string, unknown>) || {};
  const leadSettings: LeadCaptureSettings = {
    lead_capture_enabled: settings.lead_capture_enabled as boolean | undefined,
    lead_capture_email: settings.lead_capture_email as string | undefined,
    lead_notifications_enabled: settings.lead_notifications_enabled as
      | boolean
      | undefined,
    last_lead_digest_at: settings.last_lead_digest_at as string | undefined,
  };

  // Cache the result
  leadSettingsCache.set(projectId, { data: leadSettings, timestamp: Date.now() });

  return leadSettings;
}

/**
 * Handle lead capture flow in chat engine
 *
 * This function is called during chat processing to determine if we should:
 * 1. Ask for email (bot couldn't answer)
 * 2. Capture provided email
 * 3. Handle decline
 * 4. Do nothing
 */
export async function handleLeadCaptureFlow(
  sessionId: string,
  projectId: string,
  userMessage: string,
  foundAnswer: boolean,
  settings: LeadCaptureSettings
): Promise<LeadCaptureResult> {
  // Lead capture disabled - do nothing
  if (!settings.lead_capture_enabled) {
    return { type: "no_action", shouldAppendToResponse: false };
  }

  // Get current session state
  let state = await getSessionState(sessionId);

  // If no session state, create default
  if (!state) {
    state = {
      awaiting_email: false,
      last_message_at: null,
      pending_question: null,
      email_asked: false,
    };
  }

  // Check if conversation timed out - reset state
  if (isNewConversation(state.last_message_at)) {
    await resetSessionState(sessionId);
    state.awaiting_email = false;
    state.email_asked = false;
    state.pending_question = null;
  }

  // If we were awaiting email from previous turn
  if (state.awaiting_email && state.pending_question) {
    const email = extractEmailFromMessage(userMessage);

    if (email && isValidEmail(email)) {
      // User provided valid email - capture lead with email
      await storeLead(projectId, sessionId, state.pending_question, email);
      await clearAwaitingEmailState(sessionId);

      return {
        type: "email_captured",
        email,
        shouldAppendToResponse: true,
        responseAppendix: `Thanks! I've noted your email (${email}). Our team will get back to you soon.`,
      };
    }

    if (isDeclineResponse(userMessage)) {
      // User declined - store lead without email, clear state
      await storeLead(projectId, sessionId, state.pending_question, null);
      await clearAwaitingEmailState(sessionId);

      return {
        type: "declined",
        shouldAppendToResponse: false,
      };
    }

    // User asked different question - store lead without email, process new question
    await storeLead(projectId, sessionId, state.pending_question, null);
    await clearAwaitingEmailState(sessionId);

    // Continue with normal flow for new question
  }

  // Update last message timestamp
  await updateLastMessageAt(sessionId);

  // Check if we should ask for email (chatbot couldn't answer)
  if (!foundAnswer && !state.email_asked) {
    // Set state to await email
    await setAwaitingEmailState(sessionId, userMessage);

    return {
      type: "ask_for_email",
      shouldAppendToResponse: true,
      responseAppendix:
        "\n\nWould you like to leave your email? Someone from our team can follow up with the answer.",
    };
  }

  return { type: "no_action", shouldAppendToResponse: false };
}

/**
 * Check if LLM response indicates it couldn't answer the question
 *
 * Analyzes the response text for patterns indicating the bot doesn't have
 * the information to answer.
 */
export function detectNoAnswer(response: string): boolean {
  const noAnswerPatterns = [
    /i don'?t have (specific |that )?information/i,
    /i'?m not sure/i,
    /i couldn'?t find/i,
    /i don'?t know/i,
    /i'?m unable to (help|answer|find)/i,
    /not in my knowledge base/i,
    /no relevant information/i,
    /i'?m sorry,? (but )?i (can'?t|don'?t)/i,
    /please contact (our |the )?support/i,
    /please reach out to/i,
    /i apologize,? (but )?i (can'?t|don'?t)/i,
    /unfortunately,? i (can'?t|don'?t)/i,
  ];

  return noAnswerPatterns.some((pattern) => pattern.test(response));
}
