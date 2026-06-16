/**
 * Slack webhook sender (shared)
 *
 * A small, dependency-free helper for posting Block Kit messages to a Slack
 * incoming webhook. Used by both the API (onboarding notifications + error
 * alerts) and the web app (server-side error alerts).
 *
 * Design notes:
 * - Best-effort: never throws. A Slack outage must not break the caller or
 *   mask the original error/flow.
 * - No-op when no webhook URL is configured, so features stay dormant until
 *   `SLACK_WEBHOOK_URL` is set.
 * - Optional dedup/throttle so a crash loop can't flood the channel.
 */

// ============================================================================
// Block Kit types + builders
// ============================================================================

/** A loose Slack Block Kit block. We only use a handful of block types. */
export type SlackBlock = Record<string, unknown>;

export interface SlackMessage {
  /** Fallback text shown in notifications and by clients that can't render blocks. */
  text: string;
  blocks?: SlackBlock[];
}

const HEADER_TEXT_LIMIT = 150;
const SECTION_TEXT_LIMIT = 3000;
const FIELD_TEXT_LIMIT = 2000;
const FALLBACK_TEXT_LIMIT = 4000;

/** A bold header block (max 150 chars, plain_text only per Slack). */
export function slackHeader(text: string): SlackBlock {
  return {
    type: "header",
    text: {
      type: "plain_text",
      text: truncateText(text, HEADER_TEXT_LIMIT),
      emoji: true,
    },
  };
}

/** A markdown section block. */
export function slackSection(markdown: string): SlackBlock {
  return {
    type: "section",
    text: {
      type: "mrkdwn",
      text: truncateText(markdown, SECTION_TEXT_LIMIT),
    },
  };
}

/**
 * A section with up to 10 two-column fields. Pairs are rendered as
 * `*Label*\nvalue`. Dynamic values are escaped by default; set `mrkdwn` only
 * for markup assembled from trusted code.
 */
export function slackFields(
  pairs: Array<{
    label: string;
    value: string | null | undefined;
    mrkdwn?: boolean;
  }>
): SlackBlock {
  const fields = pairs
    .filter((p) => p.value !== null && p.value !== undefined && p.value !== "")
    .slice(0, 10)
    .map((p) => {
      const label = escapeSlackMrkdwn(p.label);
      const value = p.mrkdwn
        ? String(p.value)
        : escapeSlackMrkdwn(String(p.value));

      return {
        type: "mrkdwn",
        text: truncateText(`*${label}*\n${value}`, FIELD_TEXT_LIMIT),
      };
    });
  return { type: "section", fields };
}

/** A dim context line (e.g. timestamps, ids). */
export function slackContext(markdown: string): SlackBlock {
  return {
    type: "context",
    elements: [
      {
        type: "mrkdwn",
        text: truncateText(markdown, SECTION_TEXT_LIMIT),
      },
    ],
  };
}

export function slackDivider(): SlackBlock {
  return { type: "divider" };
}

export interface SlackErrorAlert {
  title: string;
  where: string;
  user?: string;
  requestId?: string;
  environment?: string;
  code?: string;
  message?: string;
  footer?: string;
}

export function buildSlackErrorMessage(alert: SlackErrorAlert): SlackMessage {
  const safeWhere = escapeSlackMrkdwn(alert.where).replace(/`/g, "'");
  const errorLine =
    [alert.code, alert.message]
      .filter(Boolean)
      .map((part) => escapeSlackMrkdwn(String(part)))
      .join(" - ") || "_no detail_";

  return {
    text: escapeSlackMrkdwn(`${alert.title}: ${alert.where}`),
    blocks: [
      slackHeader(alert.title),
      slackSection(`*Where*\n\`${safeWhere}\``),
      slackFields([
        {
          label: "User",
          value: alert.user || "unauthenticated / unknown",
        },
        { label: "Request ID", value: alert.requestId },
        { label: "Environment", value: alert.environment },
      ]),
      slackSection(`*Error*\n${errorLine}`),
      slackDivider(),
      slackContext(
        escapeSlackMrkdwn(
          alert.footer || "Full stack trace and context are available in Sentry"
        )
      ),
    ],
  };
}

export async function sendSlackErrorAlert(
  webhookUrl: string | undefined,
  alert: SlackErrorAlert,
  options: SendSlackOptions = {}
): Promise<boolean> {
  return sendSlackWebhook(webhookUrl, buildSlackErrorMessage(alert), options);
}

export function escapeSlackMrkdwn(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 1) + "…";
}

// ============================================================================
// Sender
// ============================================================================

export interface SendSlackOptions {
  /** When set with `throttleMs`, repeated sends with the same key inside the window are dropped. */
  dedupeKey?: string;
  /** Throttle window in milliseconds for `dedupeKey`. */
  throttleMs?: number;
  /** Abort the request after this many ms (default 5000). */
  timeoutMs?: number;
}

/** Tracks the last send time per dedupe key for throttling. */
const lastSentAt = new Map<string, number>();

/**
 * Post a message to a Slack incoming webhook. Best-effort and never throws.
 *
 * @returns `true` if the message was sent, `false` if skipped (no URL,
 *   throttled) or failed.
 */
export async function sendSlackWebhook(
  webhookUrl: string | undefined,
  message: SlackMessage,
  opts: SendSlackOptions = {}
): Promise<boolean> {
  if (!webhookUrl) return false;

  // Throttle repeats of the same alert.
  if (opts.dedupeKey && opts.throttleMs) {
    const now = Date.now();
    const last = lastSentAt.get(opts.dedupeKey);
    if (last !== undefined && now - last < opts.throttleMs) return false;
    lastSentAt.set(opts.dedupeKey, now);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    opts.timeoutMs ?? 5000
  );

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: truncateText(message.text, FALLBACK_TEXT_LIMIT),
        blocks: message.blocks,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      releaseThrottleKey(opts.dedupeKey);
      // eslint-disable-next-line no-console
      console.error(
        `[Slack] Webhook responded ${response.status} ${response.statusText}`
      );
      return false;
    }
    return true;
  } catch (error) {
    releaseThrottleKey(opts.dedupeKey);
    // eslint-disable-next-line no-console
    console.error("[Slack] Failed to send webhook message:", error);
    return false;
  } finally {
    clearTimeout(timeoutId);
  }
}

function releaseThrottleKey(dedupeKey: string | undefined): void {
  if (dedupeKey) {
    lastSentAt.delete(dedupeKey);
  }
}
