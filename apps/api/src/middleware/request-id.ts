/**
 * Request ID Middleware
 *
 * Adds a unique request ID to every incoming request for tracing.
 * The ID is:
 * - Generated fresh if not provided
 * - Taken from X-Request-ID header if provided (for distributed tracing)
 * - Added to response headers for client reference
 * - Available on req.requestId for use in handlers
 */

import { Request, Response, NextFunction } from "express";
import { generateRequestId, logger } from "../lib/logger";

// Extend Express Request type to include requestId
declare global {
  namespace Express {
    interface Request {
      requestId: string;
      requestStartTime: number;
    }
  }
}

export function requestIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Use provided request ID or generate new one
  const requestId =
    (req.headers["x-request-id"] as string) || generateRequestId();

  // Attach to request object for use in handlers
  req.requestId = requestId;
  req.requestStartTime = Date.now();

  // Add to response headers for client reference
  res.setHeader("X-Request-ID", requestId);

  // Log request start (debug level to avoid noise)
  logger.debug("Request started", {
    requestId,
    method: req.method,
    path: req.path,
    userAgent: req.headers["user-agent"],
  });

  // Log request completion on finish
  res.on("finish", () => {
    const duration = Date.now() - req.requestStartTime;
    const logContext = {
      requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
    };

    // Log at different levels based on status code
    if (res.statusCode >= 500) {
      logger.error("Request failed", undefined, logContext);
    } else if (res.statusCode >= 400) {
      logger.warn("Request client error", logContext);
    } else {
      logger.debug("Request completed", logContext);
    }
  });

  next();
}
