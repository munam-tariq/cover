/**
 * Slack Notifier (API)
 *
 * Builds and sends the two kinds of Slack messages this service emits:
 * 1. `notifyCustomerOnboarded` — a "new customer onboarded" card when a
 *    customer finishes (or skips) onboarding.
 * 2. `reportServerError` — a "server error" alert for 5xx responses, wired
 *    from the error-reporter middleware.
 *
 * The low-level webhook POST + throttling lives in `@chatbot/shared`; this file
 * only does API-specific data fetching and message formatting. All sends are
 * best-effort and never throw.
 */

import {
  escapeSlackMrkdwn,
  sendSlackErrorAlert,
  sendSlackWebhook,
  slackHeader,
  slackSection,
  slackFields,
  slackContext,
  type SlackMessage,
} from "@chatbot/shared";

import { logger } from "../lib/logger";
import { supabaseAdmin } from "../lib/supabase";

// ============================================================================
// New customer onboarded
// ============================================================================

/**
 * Post a "new customer onboarded" message to Slack. Self-contained: given only
 * a project id it fetches the company details + owner email and formats the
 * card. Safe to call fire-and-forget — failures only warn, never throw.
 */
export async function notifyCustomerOnboarded(
  projectId: string
): Promise<void> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) return;

  try {
    const { data: project, error: projectError } = await supabaseAdmin
      .from("projects")
      .select("name, company_name, user_id, settings")
      .eq("id", projectId)
      .single();

    if (projectError || !project) {
      throw projectError || new Error("Project not found");
    }

    const settings = (project.settings as Record<string, unknown>) || {};
    const onboarding = (settings.onboarding as Record<string, unknown>) || {};

    // Resolve the owner's email from Supabase auth.
    let email = "unknown";
    if (project.user_id) {
      const { data, error } = await supabaseAdmin.auth.admin.getUserById(
        project.user_id as string
      );
      if (error) {
        logger.warn("Failed to resolve onboarding customer email", {
          projectId,
          userId: project.user_id,
          error: error.message,
        });
      } else {
        email = data.user?.email || "unknown";
      }
    }

    const website = (onboarding.company_website as string) || null;
    const skipped = Boolean(onboarding.skipped);

    const message = buildOnboardingMessage({
      companyName: (project.company_name as string) || "Unknown company",
      agentName: (project.name as string) || "—",
      email,
      website,
      hear: (onboarding.hear as string) || null,
      size: (onboarding.size as string) || null,
      goal: (onboarding.goal as string) || null,
      tone: (onboarding.tone as string) || null,
      pagesImported:
        typeof onboarding.pages_imported === "number"
          ? onboarding.pages_imported
          : null,
      skipped,
    });

    await sendSlackWebhook(webhookUrl, message);
  } catch (error) {
    logger.warn("Failed to send onboarding Slack notification", {
      projectId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

interface OnboardingCard {
  companyName: string;
  agentName: string;
  email: string;
  website: string | null;
  hear: string | null;
  size: string | null;
  goal: string | null;
  tone: string | null;
  pagesImported: number | null;
  skipped: boolean;
}

function buildOnboardingMessage(info: OnboardingCard): SlackMessage {
  const websiteValue = formatWebsite(info.website);

  // Company preferences captured during onboarding.
  const preferences = [
    info.goal ? `Goal: ${info.goal}` : null,
    info.tone ? `Tone: ${info.tone}` : null,
    info.size ? `Size: ${info.size}` : null,
    info.hear ? `Heard via: ${info.hear}` : null,
  ]
    .filter(Boolean)
    .map((preference) => escapeSlackMrkdwn(String(preference)))
    .join("  •  ");

  return {
    text: `New customer onboarded: ${escapeSlackMrkdwn(info.companyName)}`,
    blocks: [
      slackHeader("🎉 New customer onboarded"),
      slackFields([
        { label: "Company", value: info.companyName },
        { label: "Email", value: info.email },
        { label: "Website", value: websiteValue, mrkdwn: true },
        { label: "Agent name", value: info.agentName },
      ]),
      slackSection(`*Preferences*\n${preferences || "_none provided_"}`),
      slackContext(
        [
          info.skipped ? "Onboarding skipped" : "Onboarding completed",
          info.pagesImported !== null
            ? `${info.pagesImported} pages imported`
            : null,
        ]
          .filter(Boolean)
          .join("  •  ")
      ),
    ],
  };
}

function formatWebsite(website: string | null): string {
  if (!website) {
    return "_not provided_";
  }

  try {
    const url = new URL(website);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return escapeSlackMrkdwn(website);
    }

    const href = escapeSlackMrkdwn(url.toString());
    const label = escapeSlackMrkdwn(url.toString().replace(/^https?:\/\//, ""));
    return `<${href}|${label}>`;
  } catch {
    return escapeSlackMrkdwn(website);
  }
}

// ============================================================================
// Server error alert
// ============================================================================

export interface ServerErrorReport {
  method?: string;
  path?: string;
  status?: number;
  requestId?: string;
  userId?: string;
  userEmail?: string;
  code?: string;
  message?: string;
}

/**
 * Post a "server error" alert to Slack. Deduped/throttled per route+code so a
 * failing endpoint can't flood the channel.
 * Best-effort — never throws.
 */
export async function reportServerError(
  report: ServerErrorReport
): Promise<void> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) return;

  const dedupeKey = `${report.method ?? "?"} ${report.path ?? "?"} ${report.code ?? report.status ?? "500"}`;

  const userLine =
    report.userEmail || report.userId || "unauthenticated / unknown";
  const location = `${report.method ?? "?"} ${report.path ?? "?"} -> ${report.status ?? 500}`;

  await sendSlackErrorAlert(
    webhookUrl,
    {
      title: "🚨 Server error",
      where: location,
      user: userLine,
      requestId: report.requestId,
      environment:
        process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || "development",
      code: report.code,
      message: report.message,
    },
    {
      dedupeKey,
      throttleMs: 60_000,
    }
  );
}
