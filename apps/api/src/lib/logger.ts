/**
 * Pretty Console Logger
 *
 * Human-readable, colorized console output for development.
 * Each log entry is easy to scan with:
 * - Color-coded log levels
 * - Timestamp as HH:MM:SS (not full ISO)
 * - Key-value context on a single clean line
 * - Dimmed metadata (requestId, etc.)
 */

import { randomUUID } from "crypto";

export interface LogContext {
  requestId?: string;
  projectId?: string;
  sessionId?: string;
  visitorId?: string;
  step?: string;
  duration?: number;
  [key: string]: unknown;
}

type LogLevel = "debug" | "info" | "warn" | "error";

// ANSI color codes
const colors = {
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  bold: "\x1b[1m",
  // Levels
  debug: "\x1b[36m",    // cyan
  info: "\x1b[32m",     // green
  warn: "\x1b[33m",     // yellow
  error: "\x1b[31m",    // red
  // Parts
  timestamp: "\x1b[2m", // dim
  key: "\x1b[36m",      // cyan
  value: "\x1b[37m",    // white
  separator: "\x1b[2m", // dim
};

const LEVEL_LABELS: Record<LogLevel, string> = {
  debug: "DBG",
  info: "INF",
  warn: "WRN",
  error: "ERR",
};

/** Keys to skip in context output (internal tracking, not useful for humans) */
const HIDDEN_KEYS = new Set(["requestId", "step"]);

/** Max length for a single value before truncation */
const MAX_VALUE_LENGTH = 120;

class Logger {
  private formatValue(val: unknown): string {
    if (val === null || val === undefined) return "null";
    if (typeof val === "string") {
      if (val.length > MAX_VALUE_LENGTH) {
        return `"${val.substring(0, MAX_VALUE_LENGTH)}…" (${val.length} chars)`;
      }
      return `"${val}"`;
    }
    if (typeof val === "number" || typeof val === "boolean") return String(val);
    if (typeof val === "object") {
      const json = JSON.stringify(val);
      if (json.length > MAX_VALUE_LENGTH) {
        return json.substring(0, MAX_VALUE_LENGTH) + "…";
      }
      return json;
    }
    return String(val);
  }

  private formatContext(context?: LogContext): string {
    if (!context) return "";

    const parts: string[] = [];
    for (const [key, val] of Object.entries(context)) {
      if (HIDDEN_KEYS.has(key)) continue;
      if (val === undefined || val === null) continue;
      parts.push(`${colors.key}${key}${colors.reset}=${this.formatValue(val)}`);
    }

    return parts.length > 0 ? " " + parts.join(" ") : "";
  }

  private formatTime(): string {
    const now = new Date();
    const h = now.getHours().toString().padStart(2, "0");
    const m = now.getMinutes().toString().padStart(2, "0");
    const s = now.getSeconds().toString().padStart(2, "0");
    return `${h}:${m}:${s}`;
  }

  private print(level: LogLevel, message: string, context?: LogContext): void {
    const time = this.formatTime();
    const levelColor = colors[level];
    const label = LEVEL_LABELS[level];
    const ctx = this.formatContext(context);

    const line = `${colors.timestamp}${time}${colors.reset} ${levelColor}${label}${colors.reset} ${message}${ctx}`;

    if (level === "error") {
      console.error(line);
    } else if (level === "warn") {
      console.warn(line);
    } else {
      console.log(line);
    }
  }

  debug(message: string, context?: LogContext): void {
    if (process.env.LOG_LEVEL === "debug") {
      this.print("debug", message, context);
    }
  }

  info(message: string, context?: LogContext): void {
    this.print("info", message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.print("warn", message, context);
  }

  error(message: string, error?: Error | unknown, context?: LogContext): void {
    const errorContext: LogContext = { ...context };

    if (error instanceof Error) {
      errorContext.error = error.message;
      // Print stack trace on a separate line for readability
      this.print("error", message, errorContext);
      if (error.stack) {
        console.error(`${colors.dim}${error.stack}${colors.reset}`);
      }
      return;
    } else if (error !== undefined) {
      errorContext.error = error;
    }

    this.print("error", message, errorContext);
  }

  /**
   * Create a child logger with pre-bound context
   */
  child(baseContext: LogContext): ChildLogger {
    return new ChildLogger(this, baseContext);
  }
}

class ChildLogger {
  constructor(
    private parent: Logger,
    private baseContext: LogContext
  ) {}

  private mergeContext(context?: LogContext): LogContext {
    return { ...this.baseContext, ...context };
  }

  debug(message: string, context?: LogContext): void {
    this.parent.debug(message, this.mergeContext(context));
  }

  info(message: string, context?: LogContext): void {
    this.parent.info(message, this.mergeContext(context));
  }

  warn(message: string, context?: LogContext): void {
    this.parent.warn(message, this.mergeContext(context));
  }

  error(message: string, error?: Error | unknown, context?: LogContext): void {
    this.parent.error(message, error, this.mergeContext(context));
  }
}

export const logger = new Logger();

/**
 * Generate a unique request ID for tracing
 */
export function generateRequestId(): string {
  return `req_${Date.now()}_${randomUUID().slice(0, 8)}`;
}
