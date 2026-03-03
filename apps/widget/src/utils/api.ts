/**
 * Widget API Client
 *
 * Handles communication with the chat API, including:
 * - Sending messages with proper request format
 * - Handling rate limiting responses
 * - Error handling and retry logic
 */

import { getDeviceInfo } from "./device-info";

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
  handoff?: {
    triggered: boolean;
    reason?: string;
    queuePosition?: number;
    estimatedWait?: string;
    conversationId?: string;
  };
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

  // Collect device and page context for analytics
  const deviceInfo = getDeviceInfo();

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
      // Device and page context for analytics
      context: {
        pageUrl: deviceInfo.pageUrl,
        pageTitle: deviceInfo.pageTitle,
        referrer: deviceInfo.referrer,
        browser: deviceInfo.browser,
        browserVersion: deviceInfo.browserVersion,
        os: deviceInfo.os,
        osVersion: deviceInfo.osVersion,
        device: deviceInfo.device,
        screenWidth: deviceInfo.screenWidth,
        screenHeight: deviceInfo.screenHeight,
        timezone: deviceInfo.timezone,
        language: deviceInfo.language,
      },
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

// ─── Lead Capture V2 API ────────────────────────────────────────────────────

export interface LeadCaptureFormData {
  email: string;
  field_2?: { label: string; value: string };
  field_3?: { label: string; value: string };
}

export interface LeadCaptureSubmitResponse {
  success: boolean;
  leadId?: string;
  nextAction: "qualifying_question" | "none";
  qualifyingQuestion?: string;
  assembledGreeting?: string;
  sessionId?: string;
}

export interface LeadCaptureStatusResponse {
  hasCompletedForm: boolean;
  hasCompletedQualifying: boolean;
  leadCaptureState: Record<string, unknown> | null;
}

/**
 * Submit lead capture form
 */
export async function submitLeadCaptureForm(
  apiUrl: string,
  projectId: string,
  visitorId: string,
  sessionId: string | null,
  formData: LeadCaptureFormData,
  firstMessage: string
): Promise<LeadCaptureSubmitResponse> {
  const response = await fetch(`${apiUrl}/api/chat/lead-capture/submit-form`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Visitor-Id": visitorId,
    },
    body: JSON.stringify({
      projectId,
      visitorId,
      sessionId,
      formData,
      firstMessage,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new ChatApiError(
      errorData.error?.code || "FORM_SUBMIT_ERROR",
      errorData.error?.message || "Failed to submit form"
    );
  }

  return response.json();
}

/**
 * Skip lead capture form
 * @param skipType - "permanent" for terminal skip, "deferred" for re-askable skip
 */
export async function skipLeadCaptureForm(
  apiUrl: string,
  projectId: string,
  visitorId: string,
  skipType: "permanent" | "deferred" = "permanent"
): Promise<void> {
  await fetch(`${apiUrl}/api/chat/lead-capture/skip`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Visitor-Id": visitorId,
    },
    body: JSON.stringify({ projectId, visitorId, skipType }),
  });
}

/**
 * Submit inline email capture (lightweight, no form fields)
 */
export async function submitInlineEmail(
  apiUrl: string,
  projectId: string,
  visitorId: string,
  sessionId: string | null,
  email: string,
  captureSource: string = "inline_email"
): Promise<LeadCaptureSubmitResponse> {
  const response = await fetch(`${apiUrl}/api/chat/lead-capture/submit-inline`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Visitor-Id": visitorId,
    },
    body: JSON.stringify({
      projectId,
      visitorId,
      sessionId,
      email,
      captureSource,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new ChatApiError(
      errorData.error?.code || "INLINE_EMAIL_ERROR",
      errorData.error?.message || "Failed to submit email"
    );
  }

  return response.json();
}

/**
 * Check lead capture status for returning users
 */
export async function getLeadCaptureStatus(
  apiUrl: string,
  projectId: string,
  visitorId: string
): Promise<LeadCaptureStatusResponse> {
  try {
    const response = await fetch(
      `${apiUrl}/api/chat/lead-capture/status?projectId=${encodeURIComponent(projectId)}&visitorId=${encodeURIComponent(visitorId)}`
    );

    if (!response.ok) {
      return { hasCompletedForm: false, hasCompletedQualifying: false, leadCaptureState: null };
    }

    return response.json();
  } catch {
    return { hasCompletedForm: false, hasCompletedQualifying: false, leadCaptureState: null };
  }
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
