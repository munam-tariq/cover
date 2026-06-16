/**
 * Error Reporter Middleware
 *
 * The single Slack chokepoint for request-scoped server errors. It wraps
 * `res.json` to remember the response body, then on `finish` mirrors any 5xx
 * response to Slack via `reportServerError` — including errors that route
 * handlers catch and return directly as `res.status(500).json(...)`, which
 * never reach Express's error handler.
 *
 * Sentry captures errors separately (console integration + Express error
 * handler + default integrations); this file is purely the Slack side.
 */

import type { NextFunction, Request, Response } from "express";

import { reportServerError } from "../services/slack-notifier";

import type { AuthenticatedRequest } from "./auth";
import { getErrorDetail } from "./error-detail";

type ResponseWithBody = Response & { __errorBody?: unknown };

export function errorReporterMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const originalJson = res.json.bind(res);
  // Stash the JSON body so the finish hook can read error details from it.
  res.json = ((body: unknown) => {
    (res as ResponseWithBody).__errorBody = body;
    return originalJson(body);
  }) as Response["json"];

  res.on("finish", () => {
    if (res.statusCode < 500) return;

    const areq = req as AuthenticatedRequest;
    const { code, message } = getErrorDetail(
      (res as ResponseWithBody).__errorBody,
      res.locals.reportedError
    );

    void reportServerError({
      method: req.method,
      path: req.path,
      status: res.statusCode,
      requestId: req.requestId,
      userId: areq.userId,
      userEmail: areq.userEmail,
      code,
      message,
    });
  });

  next();
}
