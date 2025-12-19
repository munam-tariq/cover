import "dotenv/config";
import cors from "cors";
import express from "express";
import helmet from "helmet";

import { accountRouter } from "./routes/account";
import { analyticsRouter } from "./routes/analytics";
import { authRouter } from "./routes/auth";
import { chatRouter } from "./routes/chat";
import { cronRouter } from "./routes/cron";
import { embedRouter } from "./routes/embed";
import { endpointsRouter } from "./routes/endpoints";
import { knowledgeRouter } from "./routes/knowledge";
import { mcpRouter } from "./routes/mcp";
import { projectsRouter } from "./routes/projects";

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());

// CORS Configuration
// Dashboard endpoints: Restricted to specific origin (your web app)
const dashboardCors = cors({
  origin: process.env.CORS_ORIGIN || "http://localhost:3000",
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

// Dashboard API routes (restricted CORS)
app.use("/api/account", dashboardCors, accountRouter);
app.use("/api/analytics", dashboardCors, analyticsRouter);
app.use("/api/auth", dashboardCors, authRouter);
app.use("/api/projects", dashboardCors, projectsRouter);
app.use("/api/knowledge", dashboardCors, knowledgeRouter);
app.use("/api/endpoints", dashboardCors, endpointsRouter);
app.use("/api/embed", dashboardCors, embedRouter);

// Widget/Public API routes (open CORS - can be called from any domain)
app.use("/api/chat", widgetCors, chatRouter);

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
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error("Error:", err);
    res.status(500).json({
      error: "Internal server error",
      message: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
);

// Start server
app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
});

export default app;
