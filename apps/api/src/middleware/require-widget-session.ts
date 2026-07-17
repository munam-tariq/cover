/**
 * Require Widget Session
 *
 * Gates the public per-conversation read routes (status, messages/public) with a session token
 * bound to the conversation in the path, closing the conversation-id IDOR.
 *
 * Monitor mode by default: if the token is missing/invalid/mismatched it logs the would-be
 * denial and allows the request, so clients that have not yet shipped the X-FrontFace-Session
 * header keep working during rollout. Set WIDGET_GATE_ENFORCE=true to fail closed.
 *
 * `enforce: true` opts a route out of monitor mode unconditionally. Routes that perform a
 * service-role write on a caller-named conversation must use it: defaulting open there is not a
 * rollout concession, it is an unauthenticated cross-tenant write.
 */

import type { NextFunction, Request, RequestHandler, Response } from "express";

import { evaluateWidgetSessionGate } from "../services/widget-session-token";

const HEADER = "x-frontface-session";

export function requireWidgetSession(
  options: { conversationIdParam?: string; enforce?: boolean } = {}
): RequestHandler {
  const param = options.conversationIdParam ?? "id";

  return (req: Request, res: Response, next: NextFunction) => {
    const conversationId = req.params[param];
    const raw = req.headers[HEADER];
    const token =
      typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : undefined;

    const decision = evaluateWidgetSessionGate({ conversationId, token });

    if (decision.allow) {
      next();
      return;
    }

    if (options.enforce || process.env.WIDGET_GATE_ENFORCE === "true") {
      res.status(403).json({
        error: {
          code: decision.denyCode,
          message: "Invalid or missing widget session",
        },
      });
      return;
    }

    console.warn(
      `[WidgetSession:monitor] would-deny conversation=${conversationId} code=${decision.denyCode}`
    );
    next();
  };
}
