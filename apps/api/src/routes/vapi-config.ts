/**
 * Vapi Configuration Endpoint
 *
 * Serves voice configuration to the widget including the dynamically-built
 * system prompt with personality, qualifying questions, and voice guidelines.
 *
 * The widget calls this endpoint before each voice call to get fresh config,
 * then passes it as assistantOverrides to vapi.start().
 *
 * GET /api/vapi/config/:projectId - Returns voice config + assistant overrides
 */

import { Router, Request, Response } from "express";
import { supabaseAdmin } from "../lib/supabase";
import { logger } from "../lib/logger";
import { getCustomerByVisitorId, type LeadCaptureState } from "../services/lead-capture-v2";
import {
  buildVoiceSystemPrompt as buildVoicePrompt,
  buildVoiceQualifyingSection,
} from "../services/prompts";

const router = Router();

/**
 * Extract enabled qualifying questions from settings and build the voice prompt sections.
 * Business logic (settings parsing, question filtering) stays here — prompt text is in prompts.ts.
 */
function buildQualifyingQuestionsPrompt(
  settings: Record<string, unknown>,
  answeredQuestions?: string[]
): string {
  const lcV2 = settings.lead_capture_v2 as Record<string, unknown> | undefined;
  if (!lcV2?.enabled) return "";

  const questions = lcV2.qualifying_questions as Array<{ question: string; enabled: boolean }> | undefined;
  if (!questions || questions.length === 0) return "";

  const enabledQuestions = questions.filter(q => q.enabled && q.question?.trim());
  if (enabledQuestions.length === 0) return "";

  // Filter out already-answered questions
  const answeredSet = new Set((answeredQuestions || []).map(q => q.toLowerCase().trim()));
  const unansweredQuestions = enabledQuestions.filter(
    q => !answeredSet.has(q.question.toLowerCase().trim())
  );

  if (unansweredQuestions.length === 0) return "";

  return buildVoiceQualifyingSection({
    unansweredQuestions,
    answeredQuestions: answeredQuestions?.length ? answeredQuestions : undefined,
  });
}

/**
 * Build the complete voice system prompt with personality, guidelines, and qualifying questions.
 * Delegates to prompts.ts for the actual prompt text.
 */
function buildVoiceSystemPrompt(
  projectName: string,
  settings: Record<string, unknown>,
  answeredQuestions?: string[]
): string {
  const basePrompt = ((settings.systemPrompt as string) || (settings.system_prompt as string) || "").trim();
  const qualifyingQuestionsPrompt = buildQualifyingQuestionsPrompt(settings, answeredQuestions);

  return buildVoicePrompt({
    projectName,
    personality: basePrompt || undefined,
    qualifyingQuestionsSection: qualifyingQuestionsPrompt || undefined,
  });
}

/**
 * GET /api/vapi/config/:projectId
 *
 * Returns voice configuration including:
 * - vapiPublicKey, assistantId (for SDK init)
 * - greeting (first message)
 * - assistantOverrides (system prompt, greeting, metadata)
 *
 * The widget calls this before each call and passes the overrides to vapi.start().
 */
router.get("/config/:projectId", async (req: Request, res: Response) => {
  const { projectId } = req.params;

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(projectId)) {
    return res.status(400).json({
      error: { code: "INVALID_ID", message: "Invalid project ID format" },
    });
  }

  try {
    // Fetch project settings
    const { data: project, error } = await supabaseAdmin
      .from("projects")
      .select("id, name, settings, plan")
      .eq("id", projectId)
      .is("deleted_at", null)
      .single();

    if (error || !project) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Project not found" },
      });
    }

    const settings = (project.settings as Record<string, unknown>) || {};
    const voiceEnabled = settings.voice_enabled === true;
    const widgetEnabled = settings.widget_enabled !== false;

    // Voice requires pro plan (defense-in-depth — dashboard should prevent toggling)
    if (project.plan !== "pro") {
      return res.json({
        voiceEnabled: false,
      });
    }

    // Voice requires widget to be enabled
    if (!voiceEnabled || !widgetEnabled) {
      return res.json({
        voiceEnabled: false,
      });
    }

    // Look up already-answered qualifying questions if visitorId provided
    const visitorId = req.query.visitorId as string | undefined;
    let answeredQuestions: string[] = [];

    if (visitorId) {
      try {
        const customer = await getCustomerByVisitorId(projectId, visitorId);
        if (customer?.lead_capture_state) {
          const state = customer.lead_capture_state as LeadCaptureState;
          answeredQuestions = (state.qualifying_answers || [])
            .filter(a => a.answer !== "[skipped]")
            .map(a => a.question);
        }
      } catch (err) {
        logger.warn("[Vapi Config] Failed to look up visitor qualifying state", { projectId, visitorId });
      }
    }

    // Build the full dynamic system prompt
    const voiceSystemPrompt = buildVoiceSystemPrompt(project.name, settings, answeredQuestions);
    const voiceGreeting = (settings.voice_greeting as string) || "Hi! How can I help you today?";

    const basePrompt = ((settings.systemPrompt as string) || (settings.system_prompt as string) || "").trim();
    const hasQualifyingQuestions = !!buildQualifyingQuestionsPrompt(settings);

    logger.info("[Vapi Config] Voice config served", {
      projectId,
      hasPersonality: !!basePrompt,
      hasQualifyingQuestions,
      promptLength: voiceSystemPrompt.length,
    });

    res.json({
      voiceEnabled: true,
      vapiPublicKey: process.env.VAPI_PUBLIC_KEY || "",
      assistantId: process.env.VAPI_ASSISTANT_ID || "",
      greeting: voiceGreeting,
      // Full assistant overrides for the widget to pass to vapi.start()
      assistantOverrides: {
        // Override the first message (greeting)
        firstMessage: voiceGreeting,
        // Override the system prompt with our dynamic version
        // provider + model are required when overriding the model object
        model: {
          provider: process.env.VAPI_LLM_PROVIDER || "openai",
          model: process.env.VAPI_LLM_MODEL || "gpt-4o-mini",
          messages: [
            {
              role: "system" as const,
              content: voiceSystemPrompt,
            },
          ],
        },
        // Pass project metadata as variable values (used by webhook for context)
        variableValues: {
          companyName: project.name,
          projectId: project.id,
          greeting: voiceGreeting,
        },
      },
    });
  } catch (error) {
    logger.error("Failed to fetch voice config", error as Error, {
      projectId,
      step: "vapi_config",
    });
    res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Internal server error" },
    });
  }
});

export { router as vapiConfigRouter };
