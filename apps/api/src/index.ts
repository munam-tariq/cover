import "dotenv/config";
import * as Sentry from "@sentry/node";
import cors from "cors";
import express from "express";
import helmet from "helmet";

import { logger } from "./lib/logger";
import { posthog } from "./lib/posthog";
import { clientKeyMiddleware } from "./middleware/client-key";
import { errorReporterMiddleware } from "./middleware/error-reporter";
import { requestIdMiddleware } from "./middleware/request-id";
import { accountRouter } from "./routes/account";
import { agentRouter } from "./routes/agent";
import { analyticsRouter } from "./routes/analytics";
import { authRouter } from "./routes/auth";
import { authLinkCodeRouter } from "./routes/auth-link-code";
import { chatRouter } from "./routes/chat";
import { conversationsRouter } from "./routes/conversations";
import { cronRouter } from "./routes/cron";
import { customersRouter } from "./routes/customers";
import { embedRouter } from "./routes/embed";
import { endpointsRouter } from "./routes/endpoints";
import { handoffRouter } from "./routes/handoff";
import { handoffSettingsRouter } from "./routes/handoff-settings";
import { knowledgeRouter } from "./routes/knowledge";
import { leadCaptureRouter, leadsRouter } from "./routes/lead-capture";
import { mcpRouter } from "./routes/mcp";
import { onboardingRouter } from "./routes/onboarding";
import { projectsRouter } from "./routes/projects";
import {
  publicPageRouter,
  publicPageSettingsRouter,
} from "./routes/public-page";
import { pulseRouter, pulseWidgetRouter } from "./routes/pulse";
import { teamRouter } from "./routes/team";
import { voiceRouter } from "./routes/voice";
import { whatsappWebhookRouter } from "./routes/channels/whatsapp";

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());

// Request ID middleware (must be early for tracing)
app.use(requestIdMiddleware);

// Mirror 5xx responses to Slack (must wrap routes, so register early)
app.use(errorReporterMiddleware);

// CORS Configuration
// Dashboard endpoints: Restricted to specific origins (web app + local widget testing)
// CORS_ORIGIN may be a comma-separated list, e.g. "https://frontface.app,https://ksa.frontface.app"
const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:3000")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean)
  .concat("http://localhost:7001"); // Local widget testing

// Trust the whole frontface.app apex + its subdomains (e.g. region hosts like
// ksa.frontface.app) so new subdomains don't need a CORS_ORIGIN env update —
// mirrors the cookie-sharing trust boundary in apps/web/lib/region-hosts.ts.
const PROD_APEX = "frontface.app";
function isTrustedProdOrigin(origin: string): boolean {
  try {
    const host = new URL(origin).hostname.toLowerCase();
    return host === PROD_APEX || host.endsWith(`.${PROD_APEX}`);
  } catch {
    return false;
  }
}

const dashboardCors = cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin) || isTrustedProdOrigin(origin)) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  },
  credentials: true,
});

// Widget/Public endpoints: Open CORS (widget can be embedded anywhere)
// Protection comes from rate limiting, not CORS
const widgetCors = cors({
  origin: "*",
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "X-Visitor-Id",
    "X-FrontFace-Key",
    "X-FrontFace-Session",
    "Authorization",
  ],
});

// Body parsing
app.use(
  express.json({
    limit: "10mb",
    verify: (req, _res, buf) => {
      (req as any).rawBody = buf;
    },
  })
);
app.use(express.urlencoded({ extended: true }));

// Resolve the publishable client key (X-FrontFace-Key) onto req.clientKey for native SDKs.
// Optional-resolve: requests without a key (e.g. the web widget) pass through untouched.
app.use(clientKeyMiddleware);

// Health check (public)
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Dashboard API routes with specific paths (must come BEFORE generic widget routes)
// These use restricted CORS and may need PUT/DELETE methods
app.use("/api/account", dashboardCors, accountRouter);
app.use("/api/analytics", dashboardCors, analyticsRouter);
app.use("/api/auth/link-code", dashboardCors, authLinkCodeRouter);
app.use("/api/auth", dashboardCors, authRouter);
app.use("/api/agent", dashboardCors, agentRouter); // Agent routes: /api/agent/*
app.use("/api/conversations", dashboardCors, conversationsRouter); // Dashboard conversation routes
app.use("/api/knowledge", dashboardCors, knowledgeRouter);
app.use("/api/endpoints", dashboardCors, endpointsRouter);
app.use("/api/embed", widgetCors, embedRouter); // Widget config (open CORS for widget embedding)
app.use("/api/projects", dashboardCors, projectsRouter);
app.use("/api/projects", dashboardCors, handoffSettingsRouter); // Handoff settings routes: /api/projects/:id/handoff-settings
app.use("/api/projects", dashboardCors, publicPageSettingsRouter); // Public page settings: /api/projects/:id/public-page
app.use("/api/projects", dashboardCors, teamRouter); // Team routes: /api/projects/:id/members/*
app.use("/api/projects", dashboardCors, leadsRouter); // Leads routes: /api/projects/:id/leads
app.use("/api/projects", dashboardCors, pulseRouter); // Pulse dashboard routes: /api/projects/:id/pulse/*
app.use("/api/onboarding", dashboardCors, onboardingRouter); // Onboarding routes for new users

// ElevenLabs Voice Agent routes (open CORS - config called from widget, LLM called from ElevenLabs servers)
app.use("/api/voice", widgetCors, voiceRouter);

// Widget/Public API routes (open CORS - can be called from any domain)
// These come AFTER specific dashboard routes to avoid blocking PUT/DELETE
app.use("/api/chat", widgetCors, chatRouter);
app.use("/api/chat", widgetCors, leadCaptureRouter); // Lead capture V2 widget routes: submit-form, skip, status
app.use("/api/public", widgetCors, publicPageRouter); // Public hosted page config (open CORS, field-limited)
app.use("/api/pulse", widgetCors, pulseWidgetRouter); // Pulse widget routes: get campaigns, submit responses
app.use("/api/widget/conversations", widgetCors, conversationsRouter); // Widget conversation routes (POST to create)
app.use("/api", widgetCors, handoffRouter); // Widget handoff routes: handoff-availability, trigger handoff
app.use("/api/customers", widgetCors, customersRouter); // Widget customer routes: identify

// Additional dashboard routes that use generic /api paths
app.use("/api", dashboardCors, teamRouter); // Invitation routes: /api/invitations/:token/*
app.use("/api", dashboardCors, agentRouter); // Agent project routes: /api/projects/:id/agents
app.use("/api/customers", dashboardCors, customersRouter); // Customer routes: get, update
app.use("/api", dashboardCors, customersRouter); // Customer routes nested under projects/conversations

// MCP endpoint (open CORS - called from AI platforms like Cursor, Claude Code)
// Uses X-API-Key header for account-level authentication
const mcpCors = cors({
  origin: "*",
  methods: ["GET", "POST", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "X-API-Key",
    "Mcp-Session-Id",
    "MCP-Protocol-Version",
    "Accept",
    "Last-Event-ID",
  ],
  exposedHeaders: ["Mcp-Session-Id"],
});
app.use("/mcp", mcpCors, mcpRouter);

// Cron endpoints (no CORS - server-to-server only)
// Protected by CRON_SECRET bearer token
app.use("/api/cron", cronRouter);

// WhatsApp webhook (called by Meta servers, no auth middleware)
app.use("/api/channels/whatsapp", widgetCors, whatsappWebhookRouter);

// Sentry error handler — captures errors that propagate to Express.
// Must come after all routes and before our own error handler.
Sentry.setupExpressErrorHandler(app);

// Error handler
app.use(
  (
    err: Error,
    req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    res.locals.reportedError = err;
    logger.error("Unhandled error", err, {
      requestId: req.requestId,
      method: req.method,
      path: req.path,
    });
    res.status(500).json({
      error: "Internal server error",
      message: process.env.NODE_ENV === "development" ? err.message : undefined,
      requestId: req.requestId,
    });
  }
);

// Start server
const server = app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
});

// Graceful shutdown — flush any queued PostHog events before exiting.
async function shutdown(signal: string): Promise<void> {
  logger.info(`Received ${signal}, shutting down`);
  server.close();
  await posthog?.shutdown();
  process.exit(0);
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));

export default app;
