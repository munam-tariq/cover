import { Router } from "express";
import { domainWhitelistMiddleware } from "../middleware/domain-whitelist";
import { supabaseAdmin } from "../lib/supabase";
import { logger } from "../lib/logger";

export const embedRouter = Router();

export function buildGreeting(
  agentName?: string | null,
  companyName?: string | null,
): { full: string; intro: string } {
  const templates = [
    (name?: string | null) => ({
      intro: name && companyName
        ? `Hi, I'm ${name} from ${companyName} 👋 I'm really glad you reached out.`
        : name
          ? `Hi, I'm ${name} 👋 I'm really glad you reached out.`
          : `Hi 👋 I'm really glad you reached out.`,
      full: name && companyName
        ? `Hi, I'm ${name} from ${companyName} 👋 I'm really glad you reached out. Take your time and let me know what you're looking for.`
        : name
          ? `Hi, I'm ${name} 👋 I'm really glad you reached out. Take your time and let me know what you're looking for.`
          : `Hi 👋 I'm really glad you reached out. Take your time and let me know what you're looking for.`,
    }),

    (name?: string | null) => ({
      intro: name && companyName
        ? `Hello, I'm ${name} from ${companyName}. It's great to have you here.`
        : name
          ? `Hello, I'm ${name}. It's great to have you here.`
          : `Hello. It's great to have you here.`,
      full: name && companyName
        ? `Hello, I'm ${name} from ${companyName}. It's great to have you here. What would you like to talk about?`
        : name
          ? `Hello, I'm ${name}. It's great to have you here. What would you like to talk about?`
          : `Hello. It's great to have you here. What would you like to talk about?`,
    }),

    (name?: string | null) => ({
      intro: name && companyName
        ? `Hey — ${name} here from ${companyName} 👋.`
        : name
          ? `Hey — ${name} here 👋.`
          : `Hey 👋`,
      full: name && companyName
        ? `Hey — ${name} here from ${companyName} 👋. What's been on your mind?`
        : name
          ? `Hey — ${name} here 👋. What's been on your mind?`
          : `Hey 👋. What's been on your mind?`,
    }),

    (name?: string | null) => ({
      intro: name && companyName
        ? `Hi, I'm ${name} from ${companyName}. Thanks for stopping by.`
        : name
          ? `Hi, I'm ${name}. Thanks for stopping by.`
          : `Hi there 👋 Thanks for stopping by.`,
      full: name && companyName
        ? `Hi, I'm ${name} from ${companyName}. Thanks for stopping by. How can I make things easier for you today?`
        : name
          ? `Hi, I'm ${name}. Thanks for stopping by. How can I make things easier for you today?`
          : `Hi there 👋 Thanks for stopping by. How can I make things easier for you today?`,
    }),

    (name?: string | null) => ({
      intro: name && companyName
        ? `Welcome — I'm ${name} from ${companyName}. I'm here with you.`
        : name
          ? `Welcome — I'm ${name}. I'm here with you.`
          : `Welcome 👋 I'm here with you.`,
      full: name && companyName
        ? `Welcome — I'm ${name} from ${companyName}. I'm here with you. Tell me a little about what you need and we'll figure it out together.`
        : name
          ? `Welcome — I'm ${name}. I'm here with you. Tell me a little about what you need and we'll figure it out together.`
          : `Welcome 👋 I'm here with you. Tell me a little about what you need and we'll figure it out together.`,
    }),
  ];

  const selected = templates[Math.floor(Math.random() * templates.length)];
  return selected(agentName);
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
      .select("settings, plan, name, company_name, voice_enabled, voice_greeting")
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

    // Build greeting once so both parts share the same randomly-selected template
    const greeting = buildGreeting(project?.name, project?.company_name);

    // Return widget config including enabled status
    res.json({
      projectId,
      enabled: widgetEnabled,
      config: {
        primaryColor: (settings?.primary_color as string) || "#0a0a0a",
        position: "bottom-right",
        greeting: greeting.full,
        greetingIntro: greeting.intro,
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
      // Voice config — credentials are fetched at call time from /api/voice/config/:projectId
      voice: project?.voice_enabled === true
        ? { enabled: true }
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
