/**
 * Handoff Utilities
 *
 * Handles human handoff functionality for the widget:
 * - Check handoff availability
 * - Trigger handoff
 * - Track queue position
 * - Handle conversation state changes
 */

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
}

export type ConversationStatus =
  | "ai_active"
  | "waiting"
  | "agent_active"
  | "resolved"
  | "closed";

/**
 * Check if handoff is available for a project
 */
export async function checkHandoffAvailability(
  apiUrl: string,
  projectId: string
): Promise<HandoffAvailability> {
  try {
    const response = await fetch(
      `${apiUrl}/api/projects/${projectId}/handoff-availability`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
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
    reason: "low_confidence" | "keyword" | "customer_request" | "button_click";
    confidence?: number;
    triggerKeyword?: string;
    customerEmail?: string;
    customerName?: string;
  }
): Promise<HandoffResult> {
  try {
    const response = await fetch(
      `${apiUrl}/api/conversations/${conversationId}/handoff`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(options),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || "Failed to trigger handoff");
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
  }
): Promise<{ success: boolean; message: string; conversationId?: string }> {
  try {
    const response = await fetch(
      `${apiUrl}/api/projects/${projectId}/offline-messages`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
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
  return lowConfidencePatterns.some((pattern) => lowerResponse.includes(pattern));
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

/**
 * Get conversation status from API
 */
export async function getConversationStatus(
  apiUrl: string,
  conversationId: string
): Promise<{
  id: string;
  status: ConversationStatus;
  assignedAgent?: { id: string; name: string };
  queuePosition?: number;
} | null> {
  try {
    const response = await fetch(
      `${apiUrl}/api/conversations/${conversationId}/status`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error("[Widget] Failed to get conversation status:", error);
    return null;
  }
}

/**
 * Fetch new messages from the conversation
 */
export async function fetchNewMessages(
  apiUrl: string,
  conversationId: string,
  afterTimestamp?: string
): Promise<Array<{
  id: string;
  senderType: "customer" | "agent" | "ai" | "system";
  senderName?: string;
  content: string;
  createdAt: string;
}>> {
  try {
    let url = `${apiUrl}/api/conversations/${conversationId}/messages/public`;
    if (afterTimestamp) {
      url += `?after=${encodeURIComponent(afterTimestamp)}`;
    }

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    return data.messages || [];
  } catch (error) {
    console.error("[Widget] Failed to fetch messages:", error);
    return [];
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
    await fetch(`${apiUrl}/api/conversations/${conversationId}/typing`, {
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
      const url = `${apiUrl}/api/conversations/${conversationId}/presence`;
      const data = JSON.stringify({ status, visitorId });
      navigator.sendBeacon(url, data);
      return;
    }

    await fetch(`${apiUrl}/api/conversations/${conversationId}/presence`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status, visitorId }),
    });
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
    sendPresenceUpdate(this.apiUrl, this.conversationId, status, this.visitorId);
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
      document.addEventListener(event, () => {
        this.recordActivity();
      }, { passive: true });
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
      } else if (document.visibilityState === "visible" && this.conversationId) {
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
