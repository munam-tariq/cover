/**
 * Widget Storage Utilities
 *
 * Handles persistence of:
 * - Visitor ID (localStorage - persists across sessions)
 * - Session ID (sessionStorage - persists during page session)
 * - Messages (sessionStorage - persists during page session)
 */

import { isBoolean, isNumber, isRecord, isString } from "./type-guards";

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

function isStoredMessage(value: unknown): value is StoredMessage {
  if (
    !isRecord(value) ||
    !isString(value.id) ||
    (value.role !== "user" && value.role !== "assistant") ||
    !isString(value.content) ||
    !isNumber(value.timestamp)
  ) {
    return false;
  }

  return (
    (value.isError === undefined || isBoolean(value.isError)) &&
    (value.feedback === undefined ||
      value.feedback === null ||
      value.feedback === "helpful" ||
      value.feedback === "unhelpful") &&
    (value.agentName === undefined || isString(value.agentName))
  );
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
    const parsed: unknown = JSON.parse(data);
    return Array.isArray(parsed) ? parsed.filter(isStoredMessage) : [];
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
  hasProvidedEmail?: boolean;
  captureSource?: string;
  firstMessage?: string;
}

function isLeadCaptureLocalState(value: unknown): value is LeadCaptureLocalState {
  return (
    isRecord(value) &&
    isBoolean(value.hasCompletedForm) &&
    isBoolean(value.hasCompletedQualifying) &&
    (value.hasProvidedEmail === undefined ||
      isBoolean(value.hasProvidedEmail)) &&
    (value.captureSource === undefined || isString(value.captureSource)) &&
    (value.firstMessage === undefined || isString(value.firstMessage))
  );
}

export function getLeadCaptureState(projectId: string): LeadCaptureLocalState | null {
  try {
    const data = localStorage.getItem(`${LEAD_STATE_PREFIX}${projectId}`);
    if (!data) return null;
    const parsed: unknown = JSON.parse(data);
    return isLeadCaptureLocalState(parsed) ? parsed : null;
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

// ─── Visit Count Tracking (V3 Recovery) ──────────────────────────────────────

const VISIT_COUNT_PREFIX = "chatbot_visit_count_";

/**
 * Get visit count for a project (persists across sessions)
 */
export function getVisitCount(projectId: string): number {
  try {
    const val = localStorage.getItem(`${VISIT_COUNT_PREFIX}${projectId}`);
    return val ? parseInt(val, 10) || 0 : 0;
  } catch {
    return 0;
  }
}

/**
 * Increment visit count for a project
 */
export function incrementVisitCount(projectId: string): number {
  try {
    const current = getVisitCount(projectId);
    const newCount = current + 1;
    localStorage.setItem(`${VISIT_COUNT_PREFIX}${projectId}`, String(newCount));
    return newCount;
  } catch {
    return 0;
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
