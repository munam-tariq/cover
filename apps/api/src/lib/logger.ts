/**
 * Structured Logger Utility
 *
 * Provides JSON-formatted logging with request tracing capabilities.
 * All logs include timestamp, level, and optional context for debugging.
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

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  [key: string]: unknown;
}

class Logger {
  private format(level: LogLevel, message: string, context?: LogContext): string {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...context,
    };
    return JSON.stringify(entry);
  }

  debug(message: string, context?: LogContext): void {
    if (process.env.LOG_LEVEL === "debug") {
      console.log(this.format("debug", message, context));
    }
  }

  info(message: string, context?: LogContext): void {
    console.log(this.format("info", message, context));
  }

  warn(message: string, context?: LogContext): void {
    console.warn(this.format("warn", message, context));
  }

  error(message: string, error?: Error | unknown, context?: LogContext): void {
    const errorContext: LogContext = {
      ...context,
    };

    if (error instanceof Error) {
      errorContext.error = {
        message: error.message,
        stack: error.stack,
        name: error.name,
      };
    } else if (error !== undefined) {
      errorContext.error = error;
    }

    console.error(this.format("error", message, errorContext));
  }

  /**
   * Create a child logger with pre-bound context
   * Useful for adding requestId to all logs in a request
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
 * Format: req_{timestamp}_{random8chars}
 */
export function generateRequestId(): string {
  return `req_${Date.now()}_${randomUUID().slice(0, 8)}`;
}
