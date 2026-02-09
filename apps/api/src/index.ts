import "dotenv/config";
import cors from "cors";
import express from "express";
import helmet from "helmet";

import { requestIdMiddleware } from "./middleware/request-id";
import { accountRouter } from "./routes/account";
import { agentRouter } from "./routes/agent";
import { analyticsRouter } from "./routes/analytics";
import { authRouter } from "./routes/auth";
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
import { teamRouter } from "./routes/team";
import { pulseRouter, pulseWidgetRouter } from "./routes/pulse";
import { vapiRouter } from "./routes/vapi";
import { vapiConfigRouter } from "./routes/vapi-config";

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());

// Request ID middleware (must be early for tracing)
app.use(requestIdMiddleware);

// CORS Configuration
// Dashboard endpoints: Restricted to specific origins (web app + local widget testing)
const allowedOrigins = [
  process.env.CORS_ORIGIN || "http://localhost:3000",
  "http://localhost:7001", // Local widget testing
];
const dashboardCors = cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
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
  allowedHeaders: ["Content-Type", "X-Visitor-Id", "Authorization"],
});

// Body parsing
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Health check (public)
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Dashboard API routes with specific paths (must come BEFORE generic widget routes)
// These use restricted CORS and may need PUT/DELETE methods
app.use("/api/account", dashboardCors, accountRouter);
app.use("/api/analytics", dashboardCors, analyticsRouter);
app.use("/api/auth", dashboardCors, authRouter);
app.use("/api/agent", dashboardCors, agentRouter); // Agent routes: /api/agent/*
app.use("/api/conversations", dashboardCors, conversationsRouter); // Dashboard conversation routes
app.use("/api/knowledge", dashboardCors, knowledgeRouter);
app.use("/api/endpoints", dashboardCors, endpointsRouter);
app.use("/api/embed", widgetCors, embedRouter); // Widget config (open CORS for widget embedding)
app.use("/api/projects", dashboardCors, projectsRouter);
app.use("/api/projects", dashboardCors, handoffSettingsRouter); // Handoff settings routes: /api/projects/:id/handoff-settings
app.use("/api/projects", dashboardCors, teamRouter); // Team routes: /api/projects/:id/members/*
app.use("/api/projects", dashboardCors, leadsRouter); // Leads routes: /api/projects/:id/leads
app.use("/api/projects", dashboardCors, pulseRouter); // Pulse dashboard routes: /api/projects/:id/pulse/*
app.use("/api/onboarding", dashboardCors, onboardingRouter); // Onboarding routes for new users

// Vapi webhook routes (open CORS - called from Vapi servers)
app.use("/api/vapi", widgetCors, vapiRouter);
app.use("/api/vapi", widgetCors, vapiConfigRouter);

// Widget/Public API routes (open CORS - can be called from any domain)
// These come AFTER specific dashboard routes to avoid blocking PUT/DELETE
app.use("/api/chat", widgetCors, chatRouter);
app.use("/api/chat", widgetCors, leadCaptureRouter); // Lead capture V2 widget routes: submit-form, skip, status
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

// Error handler
app.use(
  (
    err: Error,
    req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    const { logger } = require("./lib/logger");
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
app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
});

export default app;
