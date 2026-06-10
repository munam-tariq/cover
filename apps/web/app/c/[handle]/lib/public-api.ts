/**
 * Typed fetch helpers for the public hosted page.
 *
 * All endpoints are the same public, no-auth, open-CORS routes the embeddable widget uses
 * (mirrors apps/widget/src/utils/handoff.ts). The conversation UUID is the bearer for a
 * thread; the visitorId is the bearer for the visitor's history.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.frontface.app";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ConversationStatus =
  | "ai_active"
  | "waiting"
  | "agent_active"
  | "resolved"
  | "closed";

export interface HandoffAvailability {
  available: boolean;
  showButton: boolean;
  buttonText?: string;
  showOfflineForm: boolean;
  reason?: string;
}

export interface HandoffResult {
  status: "agent_active" | "waiting" | "offline";
  queuePosition?: number;
  estimatedWaitMinutes?: number;
  assignedAgent?: { id: string; name: string };
  message?: string;
  showOfflineForm?: boolean;
}

export interface PublicMessage {
  id: string;
  senderType: "customer" | "agent" | "ai" | "system";
  senderName?: string;
  content: string;
  createdAt: string;
}

export interface ConversationSummary {
  id: string;
  snippet: string;
  status: ConversationStatus;
  messageCount: number;
  lastMessageAt: string | null;
  createdAt: string;
}

export interface LeadFormFieldConfig {
  enabled?: boolean;
  label?: string;
  required?: boolean;
}

export interface LeadCaptureClientConfig {
  enabled: boolean;
  formFields?: {
    email?: { required?: boolean };
    field_2?: LeadFormFieldConfig;
    field_3?: LeadFormFieldConfig;
  };
  hasQualifyingQuestions?: boolean;
  captureMode?: "email_after" | "email_first" | "email_required";
}

export interface LeadFormData {
  email: string;
  field_2?: { label: string; value: string };
  field_3?: { label: string; value: string };
}

export interface LeadFormSubmitResponse {
  success: boolean;
  leadId?: string;
  nextAction: "qualifying_question" | "none";
  qualifyingQuestion?: string;
  assembledGreeting?: string;
  /** Conversation id; set when a qualifying question was persisted server-side. */
  sessionId?: string | null;
}

// ---------------------------------------------------------------------------
// Conversation / handoff
// ---------------------------------------------------------------------------

export async function ensureConversation(
  projectId: string,
  visitorId: string
): Promise<string | null> {
  try {
    const res = await fetch(`${API_URL}/api/chat/ensure-conversation`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, visitorId, source: "public" }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.conversationId || null;
  } catch {
    return null;
  }
}

export async function checkHandoffAvailability(
  projectId: string
): Promise<HandoffAvailability> {
  try {
    const res = await fetch(
      `${API_URL}/api/projects/${projectId}/handoff-availability`
    );
    if (!res.ok) throw new Error(`status ${res.status}`);
    return await res.json();
  } catch {
    return {
      available: false,
      showButton: false,
      showOfflineForm: false,
      reason: "error",
    };
  }
}

export async function triggerHandoff(
  conversationId: string,
  options: { reason: "customer_request" | "button_click" }
): Promise<HandoffResult> {
  try {
    const res = await fetch(
      `${API_URL}/api/conversations/${conversationId}/handoff`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(options),
      }
    );
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.error?.message || "Failed to trigger handoff");
    }
    return await res.json();
  } catch {
    return {
      status: "offline",
      message: "Unable to connect to support at this time.",
      showOfflineForm: true,
    };
  }
}

export async function getConversationStatus(conversationId: string): Promise<{
  id: string;
  status: ConversationStatus;
  assignedAgent?: { id: string; name: string };
  queuePosition?: number;
} | null> {
  try {
    const res = await fetch(
      `${API_URL}/api/widget/conversations/${conversationId}/status`
    );
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/** Without `after` the endpoint returns the full ascending history (thread rehydration). */
export async function fetchMessages(
  conversationId: string,
  afterTimestamp?: string
): Promise<PublicMessage[]> {
  try {
    let url = `${API_URL}/api/widget/conversations/${conversationId}/messages/public`;
    if (afterTimestamp) url += `?after=${encodeURIComponent(afterTimestamp)}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return data.messages || [];
  } catch {
    return [];
  }
}

export async function sendTypingIndicator(
  conversationId: string,
  isTyping: boolean
): Promise<void> {
  try {
    await fetch(
      `${API_URL}/api/widget/conversations/${conversationId}/typing`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isTyping, participantType: "customer" }),
      }
    );
  } catch {
    // Typing indicators are best-effort.
  }
}

export async function sendPresenceUpdate(
  conversationId: string,
  status: "online" | "idle" | "offline",
  visitorId: string
): Promise<void> {
  try {
    const url = `${API_URL}/api/widget/conversations/${conversationId}/presence`;
    if (status === "offline" && navigator.sendBeacon) {
      navigator.sendBeacon(url, JSON.stringify({ status, visitorId }));
      return;
    }
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, visitorId }),
    });
  } catch {
    // Presence updates are best-effort.
  }
}

// ---------------------------------------------------------------------------
// History
// ---------------------------------------------------------------------------

export async function getRecentConversations(
  projectId: string,
  visitorId: string
): Promise<ConversationSummary[]> {
  try {
    const res = await fetch(
      `${API_URL}/api/public/conversations?projectId=${encodeURIComponent(projectId)}&visitorId=${encodeURIComponent(visitorId)}`
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data.conversations || [];
  } catch {
    return [];
  }
}

/** Close the current AI conversation so "New chat" starts a genuinely fresh thread. */
export async function closePublicConversation(
  projectId: string,
  visitorId: string,
  conversationId: string
): Promise<void> {
  try {
    await fetch(`${API_URL}/api/public/conversations/close`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, visitorId, conversationId }),
    });
  } catch {
    // Best-effort — worst case the old thread can still be resumed.
  }
}

// ---------------------------------------------------------------------------
// Lead capture
// ---------------------------------------------------------------------------

export async function getLeadCaptureStatus(
  projectId: string,
  visitorId: string
): Promise<{ hasCompletedForm: boolean } | null> {
  try {
    const res = await fetch(
      `${API_URL}/api/chat/lead-capture/status?projectId=${encodeURIComponent(projectId)}&visitorId=${encodeURIComponent(visitorId)}`
    );
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function submitLeadForm(params: {
  projectId: string;
  visitorId: string;
  sessionId: string | null;
  formData: LeadFormData;
  firstMessage: string;
}): Promise<LeadFormSubmitResponse | null> {
  try {
    const res = await fetch(`${API_URL}/api/chat/lead-capture/submit-form`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...params, source: "public" }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/** V3 recovery: count this visit so deferred capture can re-engage returning visitors. */
export async function recordLeadCaptureVisit(
  projectId: string,
  visitorId: string
): Promise<void> {
  try {
    await fetch(`${API_URL}/api/chat/lead-capture/visit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, visitorId }),
    });
  } catch {
    // Best-effort.
  }
}

// ---------------------------------------------------------------------------
// Voice
// ---------------------------------------------------------------------------

export async function getVoiceConfig(projectId: string): Promise<{
  voiceEnabled: boolean;
  signedUrl?: string;
  greeting?: string;
} | null> {
  try {
    const res = await fetch(`${API_URL}/api/voice/config/${projectId}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function endVoiceSession(params: {
  projectId: string;
  visitorId: string;
  sessionId: string;
  durationSeconds: number;
  transcript: Array<{ role: string; content: string }>;
}): Promise<void> {
  try {
    await fetch(`${API_URL}/api/voice/session-end`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
  } catch {
    // The call already ended client-side; transcript persistence is best-effort.
  }
}

export { API_URL };
