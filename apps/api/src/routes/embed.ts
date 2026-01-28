import { Router } from "express";
import { domainWhitelistMiddleware } from "../middleware/domain-whitelist";
import { supabaseAdmin } from "../lib/supabase";
import { logger } from "../lib/logger";

export const embedRouter = Router();

// Get embed code for a project
embedRouter.get("/code/:projectId", async (req, res) => {
  const { projectId } = req.params;

  const embedCode = `<script src="${process.env.CDN_URL || "https://cdn.chatbot.example"}/widget.js" data-chatbot-id="${projectId}"></script>`;

  res.json({
    projectId,
    embedCode,
    cdnUrl: process.env.CDN_URL || "https://cdn.chatbot.example",
  });
});

// Get widget configuration
embedRouter.get(
  "/config/:projectId",
  domainWhitelistMiddleware({ requireDomain: false, projectIdSource: 'params' }),
  async (req, res) => {
  const { projectId } = req.params;

  try {
    // Check if widget is enabled for this project
    const { data: project, error } = await supabaseAdmin
      .from("projects")
      .select("settings")
      .eq("id", projectId)
      .single();

    if (error) {
      logger.error("Failed to fetch project settings for widget config", error, { projectId });
      // On error, default to enabled (fail-open for better UX)
    }

    // Check widget_enabled setting (default to true if not set)
    const settings = (project?.settings as Record<string, unknown>) || {};
    const widgetEnabled = settings.widget_enabled !== false;

    // Build lead capture V2 config if enabled
    const lcV2 = settings.lead_capture_v2 as Record<string, unknown> | undefined;
    const leadCaptureConfig = lcV2?.enabled ? {
      enabled: true,
      formFields: lcV2.form_fields,
      hasQualifyingQuestions: Array.isArray(lcV2.qualifying_questions)
        ? (lcV2.qualifying_questions as Array<{ enabled: boolean; question: string }>).some(q => q.enabled && q.question?.trim())
        : false,
    } : { enabled: false };

    // Return widget config including enabled status
    res.json({
      projectId,
      enabled: widgetEnabled,
      config: {
        primaryColor: "#000000",
        position: "bottom-right",
        greeting: "Hello! How can I help you today?",
        placeholder: "Type a message...",
      },
      // Supabase credentials for realtime (public anon key is safe to expose)
      realtime: {
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "",
        supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "",
      },
      // Lead capture V2 config
      leadCapture: leadCaptureConfig,
    });
  } catch (err) {
    logger.error("Widget config error", err, { projectId });
    // On error, return config with enabled=true (fail-open)
    res.json({
      projectId,
      enabled: true,
      config: {
        primaryColor: "#000000",
        position: "bottom-right",
        greeting: "Hello! How can I help you today?",
        placeholder: "Type a message...",
      },
      realtime: {
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "",
        supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "",
      },
      leadCapture: { enabled: false },
    });
  }
});

// Validate project ID (for widget initialization)
embedRouter.get("/validate/:projectId", async (req, res) => {
  const { projectId } = req.params;

  // TODO: Implement project validation in widget feature
  res.json({
    valid: true,
    projectId,
  });
});
