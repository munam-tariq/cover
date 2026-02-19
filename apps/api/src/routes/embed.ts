import { Router } from "express";
import { domainWhitelistMiddleware } from "../middleware/domain-whitelist";
import { supabaseAdmin } from "../lib/supabase";
import { logger } from "../lib/logger";

export const embedRouter = Router();

function buildGreeting(agentName?: string | null): string {
  if (agentName) {
    return `Hi! I'm ${agentName}. How can I help you today?`;
  }
  return "Hi! How can I help you today?";
}

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
      .select("settings, plan, name")
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
      // V3: Capture mode and conversational re-ask config
      capture_mode: lcV2.capture_mode || "email_after",
      conversational_reask: lcV2.conversational_reask || { enabled: false },
    } : { enabled: false };

    // Build proactive engagement config if enabled
    const proactiveSettings = settings.proactive_engagement as Record<string, unknown> | undefined;
    const proactiveEngagementConfig = proactiveSettings?.enabled
      ? proactiveSettings
      : { enabled: false };

    // Return widget config including enabled status
    res.json({
      projectId,
      enabled: widgetEnabled,
      config: {
        primaryColor: (settings?.primary_color as string) || "#0a0a0a",
        position: "bottom-right",
        greeting: buildGreeting(project?.name),
        title: project?.name || "Chat with us",
        placeholder: "Type a message...",
      },
      // Supabase credentials for realtime (public anon key is safe to expose)
      realtime: {
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "",
        supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "",
      },
      // Lead capture V2 config
      leadCapture: leadCaptureConfig,
      // Proactive engagement config
      proactiveEngagement: proactiveEngagementConfig,
      // Lead recovery config (V3)
      leadRecovery: (() => {
        const lr = settings.lead_recovery as Record<string, unknown> | undefined;
        return lr?.enabled ? lr : { enabled: false };
      })(),
      // Voice config (requires pro plan)
      voice: settings.voice_enabled === true && project?.plan === "pro"
        ? {
            enabled: true,
            vapiPublicKey: process.env.VAPI_PUBLIC_KEY || "",
            assistantId: process.env.VAPI_ASSISTANT_ID || "",
            greeting: (settings.voice_greeting as string) || "Hi! How can I help you today?",
          }
        : { enabled: false },
    });
  } catch (err) {
    logger.error("Widget config error", err, { projectId });
    // On error, return config with enabled=true (fail-open)
    res.json({
      projectId,
      enabled: true,
      config: {
        primaryColor: "#0a0a0a",
        position: "bottom-right",
        greeting: "Hi! How can I help you today?",
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
