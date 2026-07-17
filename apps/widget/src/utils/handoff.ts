/**
 * Handoff Utilities
 *
 * Handles human handoff functionality for the widget:
 * - Check handoff availability
 * - Trigger handoff
 * - Track queue position
 * - Handle conversation state changes
 */

import { widgetHeaders } from "./request";

/** A message as returned by the public messages endpoint. */
export interface FetchedMessage {
  id: string;
  senderType: "customer" | "agent" | "ai" | "system";
  senderName?: string;
  content: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export interface HandoffAvailability {
  available: boolean;
  showButton: boolean;
  buttonText?: string;
  showOfflineForm: boolean;
  reason?: string;
  triggerMode?: "auto" | "manual" | "both";
  autoTriggers?: {
    lowConfidence?: { enabled: boolean; threshold: number };
    keywords?: { enabled: boolean; keywords: string[] };
    customerRequest?: { enabled: boolean };
  };
}

export interface HandoffResult {
  status: "agent_active" | "waiting" | "offline";
  queuePosition?: number;
  estimatedWaitMinutes?: number;
  assignedAgent?: {
    id: string;
    name: string;
  };
  message?: string;
  showOfflineForm?: boolean;
  staleSession?: boolean;
}

export type ConversationStatus =
  | "ai_active"
  | "waiting"
  | "agent_active"
  | "resolved"
  | "closed";

const SESSION_DENY_CODES = new Set([
  "SESSION_INVALID",
  "SESSION_PROJECT_MISMATCH",
  "SESSION_VISITOR_MISMATCH",
  "SESSION_CONVERSATION_MISMATCH",
]);

export type SessionAwareResult<T> =
  | { ok: true; data: T }
  | { ok: false; staleSession: true }
  | { ok: false; staleSession: false };

export function isWidgetSessionDenied(status: number, body: unknown): boolean {
  if (status !== 403) return false;
  const code =
    body &&
    typeof body === "object" &&
    "error" in body &&
    body.error &&
    typeof body.error === "object" &&
    "code" in body.error
      ? body.error.code
      : null;
  return typeof code === "string" && SESSION_DENY_CODES.has(code);
}

/**
 * Build headers for a widget conversation read, including the session token (issued at
 * conversation create) so the request is authorized for this conversation.
 */
function widgetReadHeaders(sessionToken?: string): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (sessionToken) headers["X-FrontFace-Session"] = sessionToken;
  return headers;
}

/**
 * Submit a rating for the conversation as a whole (CSAT, 1-5).
 *
 * The endpoint is fail-closed on the session token, so this is a no-op without one. Rating a
 * conversation is not activity: it does not stop an inactivity close, by design — the customer is
 * telling us they're done.
 */
export async function submitCsat(
  apiUrl: string,
  conversationId: string,
  rating: number,
  sessionToken?: string,
  clientKey?: string
): Promise<boolean> {
  try {
    const response = await fetch(
      `${apiUrl}/api/widget/conversations/${conversationId}/csat`,
      {
        method: "POST",
        headers: widgetHeaders({ sessionToken, clientKey }),
        body: JSON.stringify({ rating }),
      }
    );
    return response.ok;
  } catch (error) {
    console.error("[Widget] Failed to submit conversation rating:", error);
    return false;
  }
}

/**
 * Check if handoff is available for a project
 */
export async function checkHandoffAvailability(
  apiUrl: string,
  projectId: string,
  clientKey?: string
): Promise<HandoffAvailability> {
  try {
    const response = await fetch(
      `${apiUrl}/api/projects/${projectId}/handoff-availability`,
      {
        method: "GET",
        headers: widgetHeaders({ clientKey }),
      }
    );

    if (!response.ok) {
      throw new Error("Failed to check handoff availability");
    }

    return await response.json();
  } catch (error) {
    console.error("[Widget] Failed to check handoff availability:", error);
    return {
      available: false,
      showButton: false,
      showOfflineForm: false,
      reason: "error",
    };
  }
}

/**
 * Trigger handoff for a conversation
 */
export async function triggerHandoff(
  apiUrl: string,
  conversationId: string,
  options: {
    reason: "low_confidence" | "keyword" | "button_click";
    confidence?: number;
    triggerKeyword?: string;
    customerEmail?: string;
    customerName?: string;
  },
  sessionToken?: string
): Promise<HandoffResult> {
  try {
    const response = await fetch(
      `${apiUrl}/api/conversations/${conversationId}/handoff`,
      {
        method: "POST",
        headers: widgetHeaders({ sessionToken }),
        body: JSON.stringify(options),
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => null);
      if (isWidgetSessionDenied(response.status, error)) {
        return {
          status: "offline",
          staleSession: true,
          showOfflineForm: false,
          message: error?.error?.message,
        };
      }
      throw new Error(error?.error?.message || "Failed to trigger handoff");
    }

    return await response.json();
  } catch (error) {
    console.error("[Widget] Failed to trigger handoff:", error);
    return {
      status: "offline",
      message: "Unable to connect to support at this time.",
      showOfflineForm: true,
    };
  }
}

/**
 * Submit offline message when no agents are available
 */
export async function submitOfflineMessage(
  apiUrl: string,
  projectId: string,
  data: {
    name: string;
    email: string;
    message: string;
    visitorId?: string;
  },
  clientKey?: string
): Promise<{ success: boolean; message: string; conversationId?: string }> {
  try {
    const response = await fetch(
      `${apiUrl}/api/projects/${projectId}/offline-messages`,
      {
        method: "POST",
        headers: widgetHeaders({ visitorId: data.visitorId, clientKey }),
        body: JSON.stringify(data),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || "Failed to submit message");
    }

    return await response.json();
  } catch (error) {
    console.error("[Widget] Failed to submit offline message:", error);
    throw error;
  }
}

/**
 * Check for trigger keywords in a message
 */
export function checkForTriggerKeywords(
  message: string,
  keywords: string[]
): string | null {
  const lowerMessage = message.toLowerCase();

  for (const keyword of keywords) {
    if (lowerMessage.includes(keyword.toLowerCase())) {
      return keyword;
    }
  }

  return null;
}

/**
 * Check if AI response indicates low confidence or inability to help
 */
export function checkForLowConfidenceIndicators(response: string): boolean {
  const lowConfidencePatterns = [
    "i don't know",
    "i'm not sure",
    "i cannot help",
    "unable to assist",
    "beyond my capabilities",
    "speak to a human",
    "contact support",
    "i apologize, but i",
  ];

  const lowerResponse = response.toLowerCase();
  return lowConfidencePatterns.some((pattern) =>
    lowerResponse.includes(pattern)
  );
}

/**
 * Format queue position message
 */
export function formatQueueMessage(
  position: number,
  estimatedMinutes?: number
): string {
  let message = `You are #${position} in the queue.`;

  if (estimatedMinutes !== undefined && estimatedMinutes > 0) {
    message += ` Estimated wait: ${estimatedMinutes} minute${
      estimatedMinutes !== 1 ? "s" : ""
    }.`;
  }

  return message;
}

/**
 * Format agent joined message
 */
export function formatAgentJoinedMessage(agentName: string): string {
  return `${agentName} has joined the conversation.`;
}

export interface ConversationStatusPayload {
  id: string;
  status: ConversationStatus;
  assignedAgent?: { id: string; name: string };
  queuePosition?: number;
  satisfactionRating: number | null;
}

/** Get conversation status from API. */
export async function getConversationStatus(
  apiUrl: string,
  conversationId: string,
  sessionToken?: string
): Promise<ConversationStatusPayload | null> {
  const result = await getConversationStatusResult(
    apiUrl,
    conversationId,
    sessionToken
  );
  return result.ok ? result.data : null;
}

export async function getConversationStatusResult(
  apiUrl: string,
  conversationId: string,
  sessionToken?: string
): Promise<SessionAwareResult<ConversationStatusPayload>> {
  try {
    const response = await fetch(
      `${apiUrl}/api/widget/conversations/${conversationId}/status`,
      {
        method: "GET",
        headers: widgetReadHeaders(sessionToken),
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => null);
      if (isWidgetSessionDenied(response.status, error)) {
        return { ok: false, staleSession: true };
      }
      return { ok: false, staleSession: false };
    }

    return { ok: true, data: await response.json() };
  } catch (error) {
    console.error("[Widget] Failed to get conversation status:", error);
    return { ok: false, staleSession: false };
  }
}

/**
 * Fetch new messages from the conversation
 */
export async function fetchNewMessages(
  apiUrl: string,
  conversationId: string,
  afterTimestamp?: string,
  sessionToken?: string
): Promise<FetchedMessage[]> {
  const result = await fetchNewMessagesResult(
    apiUrl,
    conversationId,
    afterTimestamp,
    sessionToken
  );
  return result.ok ? result.data : [];
}

export async function fetchNewMessagesResult(
  apiUrl: string,
  conversationId: string,
  afterTimestamp?: string,
  sessionToken?: string
): Promise<SessionAwareResult<FetchedMessage[]>> {
  try {
    let url = `${apiUrl}/api/widget/conversations/${conversationId}/messages/public`;
    if (afterTimestamp) {
      url += `?after=${encodeURIComponent(afterTimestamp)}`;
    }

    const response = await fetch(url, {
      method: "GET",
      headers: widgetReadHeaders(sessionToken),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => null);
      if (isWidgetSessionDenied(response.status, error)) {
        return { ok: false, staleSession: true };
      }
      return { ok: false, staleSession: false };
    }

    const data = await response.json();
    return { ok: true, data: data.messages || [] };
  } catch (error) {
    console.error("[Widget] Failed to fetch messages:", error);
    return { ok: false, staleSession: false };
  }
}

/**
 * Conversation state machine
 */
/**
 * Send typing indicator
 */
export async function sendTypingIndicator(
  apiUrl: string,
  conversationId: string,
  isTyping: boolean
): Promise<void> {
  try {
    await fetch(`${apiUrl}/api/widget/conversations/${conversationId}/typing`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        isTyping,
        participantType: "customer",
      }),
    });
  } catch (error) {
    // Silently fail - typing indicators are not critical
    if (process.env.NODE_ENV === "development") {
      console.error("[Widget] Failed to send typing indicator:", error);
    }
  }
}

/**
 * Send presence update to API
 */
export async function sendPresenceUpdate(
  apiUrl: string,
  conversationId: string,
  status: "online" | "idle" | "offline",
  visitorId?: string
): Promise<void> {
  try {
    // Use sendBeacon for offline status to ensure delivery
    if (status === "offline" && navigator.sendBeacon) {
      const url = `${apiUrl}/api/widget/conversations/${conversationId}/presence`;
      const data = JSON.stringify({ status, visitorId });
      navigator.sendBeacon(url, data);
      return;
    }

    await fetch(
      `${apiUrl}/api/widget/conversations/${conversationId}/presence`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status, visitorId }),
      }
    );
  } catch (error) {
    // Silently fail - presence updates are not critical
    if (process.env.NODE_ENV === "development") {
      console.error("[Widget] Failed to send presence update:", error);
    }
  }
}

/**
 * Presence manager for widget
 * Handles heartbeat, idle detection, and offline notification
 */
export class PresenceManager {
  private conversationId: string | null = null;
  private apiUrl: string;
  private visitorId: string;
  private heartbeatInterval: number | null = null;
  private idleTimeout: number | null = null;
  private currentStatus: "online" | "idle" | "offline" = "offline";
  private lastActivityTime: number = Date.now();

  // Thresholds
  private readonly HEARTBEAT_INTERVAL_MS = 30000; // 30 seconds
  private readonly IDLE_THRESHOLD_MS = 2 * 60 * 1000; // 2 minutes

  constructor(apiUrl: string, visitorId: string) {
    this.apiUrl = apiUrl;
    this.visitorId = visitorId;

    // Setup beforeunload handler to send offline status
    this.setupBeforeUnload();
  }

  /**
   * Start presence tracking for a conversation
   */
  start(conversationId: string): void {
    this.conversationId = conversationId;
    this.currentStatus = "online";
    this.lastActivityTime = Date.now();

    // Send initial online status
    this.sendStatus("online");

    // Start heartbeat
    this.startHeartbeat();

    // Setup idle detection
    this.setupIdleDetection();
  }

  /**
   * Stop presence tracking
   */
  stop(): void {
    // Send offline status
    if (this.conversationId) {
      this.sendStatus("offline");
    }

    // Clear intervals
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (this.idleTimeout) {
      clearTimeout(this.idleTimeout);
      this.idleTimeout = null;
    }

    this.conversationId = null;
  }

  /**
   * Record user activity (call on message send, typing, etc.)
   */
  recordActivity(): void {
    this.lastActivityTime = Date.now();

    // If was idle, go back to online
    if (this.currentStatus === "idle") {
      this.currentStatus = "online";
      this.sendStatus("online");
    }

    // Reset idle timeout
    this.resetIdleTimeout();
  }

  private sendStatus(status: "online" | "idle" | "offline"): void {
    if (!this.conversationId) return;
    sendPresenceUpdate(
      this.apiUrl,
      this.conversationId,
      status,
      this.visitorId
    );
  }

  private startHeartbeat(): void {
    // Clear existing interval
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    // Send heartbeat every 30 seconds
    this.heartbeatInterval = window.setInterval(() => {
      if (this.currentStatus !== "offline") {
        this.sendStatus(this.currentStatus);
      }
    }, this.HEARTBEAT_INTERVAL_MS);
  }

  private setupIdleDetection(): void {
    // Listen for user activity events
    const activityEvents = ["mousedown", "keydown", "touchstart", "scroll"];

    activityEvents.forEach((event) => {
      document.addEventListener(
        event,
        () => {
          this.recordActivity();
        },
        { passive: true }
      );
    });

    // Start idle timeout
    this.resetIdleTimeout();
  }

  private resetIdleTimeout(): void {
    if (this.idleTimeout) {
      clearTimeout(this.idleTimeout);
    }

    this.idleTimeout = window.setTimeout(() => {
      if (this.currentStatus === "online") {
        this.currentStatus = "idle";
        this.sendStatus("idle");
      }
    }, this.IDLE_THRESHOLD_MS);
  }

  private setupBeforeUnload(): void {
    window.addEventListener("beforeunload", () => {
      if (this.conversationId) {
        this.sendStatus("offline");
      }
    });

    // Also handle visibilitychange for mobile
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden" && this.conversationId) {
        this.currentStatus = "idle";
        this.sendStatus("idle");
      } else if (
        document.visibilityState === "visible" &&
        this.conversationId
      ) {
        this.recordActivity();
      }
    });
  }
}

export class ConversationStateMachine {
  private state: ConversationStatus = "ai_active";
  private listeners: Set<(state: ConversationStatus) => void> = new Set();

  getState(): ConversationStatus {
    return this.state;
  }

  setState(newState: ConversationStatus): void {
    if (this.state !== newState) {
      this.state = newState;
      this.notifyListeners();
    }
  }

  subscribe(listener: (state: ConversationStatus) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener(this.state));
  }

  // Helper methods for state checks
  isAIActive(): boolean {
    return this.state === "ai_active";
  }

  isWaiting(): boolean {
    return this.state === "waiting";
  }

  isAgentActive(): boolean {
    return this.state === "agent_active";
  }

  isResolved(): boolean {
    return this.state === "resolved" || this.state === "closed";
  }

  canTriggerHandoff(): boolean {
    return this.state === "ai_active";
  }

  canSendMessage(): boolean {
    return this.state === "ai_active" || this.state === "agent_active";
  }
}
