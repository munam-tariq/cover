/**
 * Require Widget Session
 *
 * Gates the public per-conversation read routes (status, messages/public) with a session token
 * bound to the conversation in the path, closing the conversation-id IDOR.
 *
 * Monitor mode by default: if the token is missing/invalid/mismatched it logs the would-be
 * denial and allows the request, so clients that have not yet shipped the X-FrontFace-Session
 * header keep working during rollout. Set WIDGET_GATE_ENFORCE=true to fail closed.
 */

import type { NextFunction, Request, RequestHandler, Response } from "express";

import { verifyWidgetSessionToken } from "../services/widget-session-token";

const HEADER = "x-frontface-session";

export function requireWidgetSession(
  options: { conversationIdParam?: string } = {}
): RequestHandler {
  const param = options.conversationIdParam ?? "id";

  return (req: Request, res: Response, next: NextFunction) => {
    const conversationId = req.params[param];
    const raw = req.headers[HEADER];
    const token =
      typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : undefined;

    let denyCode: string | undefined;
    try {
      const claims = verifyWidgetSessionToken(token);
      if (claims.conversationId !== conversationId) {
        denyCode = "SESSION_CONVERSATION_MISMATCH";
      }
    } catch {
      denyCode = "SESSION_INVALID";
    }

    if (!denyCode) {
      next();
      return;
    }

    if (process.env.WIDGET_GATE_ENFORCE === "true") {
      res.status(403).json({
        error: { code: denyCode, message: "Invalid or missing widget session" },
      });
      return;
    }

    console.warn(
      `[WidgetSession:monitor] would-deny conversation=${conversationId} code=${denyCode}`
    );
    next();
  };
}
