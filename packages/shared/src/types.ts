/**
 * Shared type definitions
 */

/**
 * API response wrapper
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  limit?: number;
  offset?: number;
  cursor?: string;
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  hasMore: boolean;
  nextCursor?: string;
}

/**
 * Chat message role
 */
export type MessageRole = "user" | "assistant" | "system";

/**
 * Chat message structure for API
 */
export interface ChatMessage {
  role: MessageRole;
  content: string;
  timestamp?: string;
}

/**
 * Chat response from API
 */
export interface ChatResponse {
  response: string;
  conversationId: string;
  sources?: {
    title: string;
    content: string;
  }[];
  toolCalls?: {
    tool: string;
    result: unknown;
  }[];
}

/**
 * Knowledge source types
 */
export type KnowledgeSourceType = "pdf" | "txt" | "url" | "markdown";

/**
 * Knowledge source status
 */
export type KnowledgeSourceStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed";

/**
 * API endpoint HTTP methods
 */
export type HttpMethod = "GET" | "POST";

/**
 * Widget position options
 */
export type WidgetPosition = "bottom-right" | "bottom-left";

/**
 * Widget configuration
 */
export interface WidgetConfig {
  chatbotId: string;
  apiUrl?: string;
  position?: WidgetPosition;
  primaryColor?: string;
  greeting?: string;
  placeholder?: string;
}

/**
 * Error codes
 */
export enum ErrorCode {
  // Auth errors
  UNAUTHORIZED = "UNAUTHORIZED",
  FORBIDDEN = "FORBIDDEN",
  INVALID_TOKEN = "INVALID_TOKEN",

  // Validation errors
  INVALID_INPUT = "INVALID_INPUT",
  MISSING_FIELD = "MISSING_FIELD",

  // Resource errors
  NOT_FOUND = "NOT_FOUND",
  ALREADY_EXISTS = "ALREADY_EXISTS",

  // Rate limit errors
  RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED",

  // Server errors
  INTERNAL_ERROR = "INTERNAL_ERROR",
  SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE",
}
