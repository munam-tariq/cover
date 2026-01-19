/**
 * Widget API Client
 *
 * Handles communication with the chat API, including:
 * - Sending messages with proper request format
 * - Handling rate limiting responses
 * - Error handling and retry logic
 */

export interface SendMessageOptions {
  apiUrl: string;
  projectId: string;
  message: string;
  visitorId: string;
  sessionId?: string | null;
  conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>;
}

export interface ChatSource {
  id: string;
  name: string;
  relevance: number;
}

export interface ToolCall {
  name: string;
  success: boolean;
  duration: number;
}

export interface SendMessageResponse {
  response: string;
  sessionId: string;
  sources: ChatSource[];
  toolCalls: ToolCall[];
  processingTime: number;
}

export interface ApiError {
  code: string;
  message: string;
}

export class ChatApiError extends Error {
  code: string;
  isRateLimited: boolean;
  isDomainBlocked: boolean;
  retryAfter?: number;

  constructor(code: string, message: string, retryAfter?: number) {
    super(message);
    this.code = code;
    this.name = "ChatApiError";
    this.isRateLimited = code === "RATE_LIMITED" || code === "TOO_MANY_REQUESTS";
    this.isDomainBlocked = code === "DOMAIN_NOT_ALLOWED";
    this.retryAfter = retryAfter;
  }
}

/**
 * Send a chat message to the API
 */
export async function sendMessage(
  options: SendMessageOptions
): Promise<SendMessageResponse> {
  const { apiUrl, projectId, message, visitorId, sessionId, conversationHistory } = options;

  const response = await fetch(`${apiUrl}/api/chat/message`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Visitor-Id": visitorId,
    },
    body: JSON.stringify({
      projectId,
      message,
      visitorId,
      sessionId: sessionId || undefined,
      conversationHistory: conversationHistory || [],
      source: "widget",
    }),
  });

  // Handle rate limiting
  if (response.status === 429) {
    const retryAfter = parseInt(response.headers.get("Retry-After") || "60", 10);
    throw new ChatApiError(
      "RATE_LIMITED",
      "Too many messages. Please wait a moment and try again.",
      retryAfter
    );
  }

  // Handle domain not allowed (403)
  if (response.status === 403) {
    const errorData = await response.json().catch(() => ({}));
    const error = errorData.error as ApiError | undefined;

    if (error?.code === "DOMAIN_NOT_ALLOWED") {
      throw new ChatApiError(
        "DOMAIN_NOT_ALLOWED",
        "This chat widget is not authorized for this website."
      );
    }

    throw new ChatApiError(
      error?.code || "FORBIDDEN",
      error?.message || "Access denied."
    );
  }

  // Handle other errors
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error = errorData.error as ApiError | undefined;

    throw new ChatApiError(
      error?.code || "UNKNOWN_ERROR",
      error?.message || "Something went wrong. Please try again."
    );
  }

  return response.json();
}

/**
 * Check rate limit status for a visitor
 */
export interface RateLimitStatus {
  perMinute: { remaining: number; resetsAt: string };
  perHour: { remaining: number; resetsAt: string };
  perDay: { remaining: number; resetsAt: string };
}

export async function getRateLimitStatus(
  apiUrl: string,
  visitorId: string
): Promise<RateLimitStatus | null> {
  try {
    const response = await fetch(
      `${apiUrl}/api/chat/rate-limit-status?visitorId=${encodeURIComponent(visitorId)}`,
      {
        headers: {
          "X-Visitor-Id": visitorId,
        },
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.limits;
  } catch {
    return null;
  }
}
