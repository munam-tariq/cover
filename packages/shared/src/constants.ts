/**
 * Application-wide constants
 */

// API Configuration
export const API_VERSION = "v1";
export const DEFAULT_API_URL = "http://localhost:3001";
export const DEFAULT_CDN_URL = "http://localhost:3002";

// Rate Limits
export const RATE_LIMITS = {
  MESSAGES_PER_MINUTE: 10,
  MESSAGES_PER_HOUR: 50,
  UPLOADS_PER_DAY: 20,
  API_CALLS_PER_MINUTE: 100,
} as const;

// File Upload Limits
export const FILE_LIMITS = {
  MAX_FILE_SIZE_MB: 10,
  MAX_FILE_SIZE_BYTES: 10 * 1024 * 1024,
  ALLOWED_EXTENSIONS: ["pdf", "txt", "md", "doc", "docx"],
  ALLOWED_MIME_TYPES: [
    "application/pdf",
    "text/plain",
    "text/markdown",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ],
} as const;

// Chat Configuration
export const CHAT_CONFIG = {
  MAX_MESSAGE_LENGTH: 4000,
  MAX_CONTEXT_CHUNKS: 5,
  EMBEDDING_DIMENSIONS: 1536,
  CHUNK_SIZE_TOKENS: 500,
  CHUNK_OVERLAP_TOKENS: 50,
} as const;

// Inbox pagination must remain inside PostgreSQL's `integer` argument range. Shared by the URL
// parser and API schema so an invalid bookmark is normalized before it reaches the database.
export const INBOX_CONFIG = {
  DEFAULT_PAGE_SIZE: 25,
  MAX_PAGE_SIZE: 100,
  MAX_PAGE: 2_147_483_647,
  STATUS_VALUES: [
    "active",
    "ai_active",
    "agent_active",
    "waiting",
    "resolved",
    "closed",
    "auto_closed",
  ],
  SORT_VALUES: ["attention", "recent"],
  ACTIVITY_PERIOD_VALUES: ["24h", "7d", "30d"],
  // customer_request deliberately excluded: no client has ever sent it as a trigger reason (the
  // "talk to a human" button hardcodes button_click), so it could never be written and the filter
  // option was always empty.
  HANDOFF_REASON_VALUES: [
    "low_confidence",
    "keyword",
    "button_click",
    "offline_form",
  ],
  SOURCE_VALUES: [
    "widget",
    "playground",
    "mcp",
    "api",
    "public",
    "mobile",
    "whatsapp",
  ],
} as const;

// LLM Configuration
export const LLM_CONFIG = {
  MODEL: "gpt-4o-mini",
  EMBEDDING_MODEL: "text-embedding-3-small",
  MAX_TOKENS: 1000,
  TEMPERATURE: 0.7,
} as const;

// Project Configuration
export const PROJECT_CONFIG = {
  MAX_SYSTEM_PROMPT_LENGTH: 7000,
} as const;

// Widget Configuration
export const WIDGET_CONFIG = {
  DEFAULT_POSITION: "bottom-right",
  DEFAULT_PRIMARY_COLOR: "#000000",
  DEFAULT_GREETING: "Hello! How can I help you today?",
  DEFAULT_PLACEHOLDER: "Type a message...",
} as const;
