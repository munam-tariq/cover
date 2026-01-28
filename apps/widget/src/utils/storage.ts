/**
 * Widget Storage Utilities
 *
 * Handles persistence of:
 * - Visitor ID (localStorage - persists across sessions)
 * - Session ID (sessionStorage - persists during page session)
 * - Messages (sessionStorage - persists during page session)
 */

const VISITOR_ID_KEY = "chatbot_visitor_id";
const SESSION_PREFIX = "chatbot_session_";
const MESSAGES_PREFIX = "chatbot_messages_";
const LEAD_STATE_PREFIX = "chatbot_lead_state_";

export interface StoredMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  isError?: boolean;
  feedback?: "helpful" | "unhelpful" | null;
  agentName?: string;
}

/**
 * Generate a unique visitor ID
 */
function generateVisitorId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 11);
  return `vis_${timestamp}_${random}`;
}

/**
 * Get or create a persistent visitor ID
 * Stored in localStorage to persist across browser sessions
 */
export function getVisitorId(): string {
  try {
    let visitorId = localStorage.getItem(VISITOR_ID_KEY);
    if (!visitorId) {
      visitorId = generateVisitorId();
      localStorage.setItem(VISITOR_ID_KEY, visitorId);
    }
    return visitorId;
  } catch {
    // localStorage not available, generate temporary ID
    return generateVisitorId();
  }
}

/**
 * Get session ID for a project (persists across page refreshes)
 * Uses localStorage to maintain conversation across refreshes
 */
export function getSessionId(projectId: string): string | null {
  try {
    return localStorage.getItem(`${SESSION_PREFIX}${projectId}`);
  } catch {
    return null;
  }
}

/**
 * Save session ID for a project
 * Uses localStorage to persist across page refreshes
 */
export function setSessionId(projectId: string, sessionId: string): void {
  try {
    localStorage.setItem(`${SESSION_PREFIX}${projectId}`, sessionId);
  } catch {
    // localStorage not available
  }
}

/**
 * Get stored messages for a project (persists across page refreshes)
 */
export function getStoredMessages(projectId: string): StoredMessage[] {
  try {
    const data = localStorage.getItem(`${MESSAGES_PREFIX}${projectId}`);
    if (!data) return [];
    return JSON.parse(data);
  } catch {
    return [];
  }
}

/**
 * Save messages for a project
 */
export function setStoredMessages(projectId: string, messages: StoredMessage[]): void {
  try {
    // Keep only the last 50 messages to avoid storage limits
    const messagesToStore = messages.slice(-50);
    localStorage.setItem(`${MESSAGES_PREFIX}${projectId}`, JSON.stringify(messagesToStore));
  } catch {
    // localStorage not available or quota exceeded
  }
}

/**
 * Get lead capture state for a project
 */
export interface LeadCaptureLocalState {
  hasCompletedForm: boolean;
  hasCompletedQualifying: boolean;
  firstMessage?: string;
}

export function getLeadCaptureState(projectId: string): LeadCaptureLocalState | null {
  try {
    const data = localStorage.getItem(`${LEAD_STATE_PREFIX}${projectId}`);
    if (!data) return null;
    return JSON.parse(data);
  } catch {
    return null;
  }
}

/**
 * Save lead capture state for a project
 */
export function setLeadCaptureState(projectId: string, state: LeadCaptureLocalState): void {
  try {
    localStorage.setItem(`${LEAD_STATE_PREFIX}${projectId}`, JSON.stringify(state));
  } catch {
    // localStorage not available
  }
}

/**
 * Clear all stored data for a project
 */
export function clearProjectData(projectId: string): void {
  try {
    localStorage.removeItem(`${SESSION_PREFIX}${projectId}`);
    localStorage.removeItem(`${MESSAGES_PREFIX}${projectId}`);
    localStorage.removeItem(`${LEAD_STATE_PREFIX}${projectId}`);
  } catch {
    // Storage not available
  }
}

/**
 * Check if storage is available
 */
export function isStorageAvailable(): boolean {
  try {
    const testKey = "__storage_test__";
    localStorage.setItem(testKey, testKey);
    localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}
