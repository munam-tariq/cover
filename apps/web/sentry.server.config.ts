import { parseSampleRate, sendSlackErrorAlert } from "@chatbot/shared";
import * as Sentry from "@sentry/nextjs";
import type { ErrorEvent } from "@sentry/nextjs";

/**
 * Sentry init for the Node server runtime (App Router server components, route
 * handlers, server actions). DSN-guarded; stays dormant until
 * NEXT_PUBLIC_SENTRY_DSN is configured.
 *
 * `beforeSend` mirrors only *unhandled* server errors to Slack (matching the
 * API's "unhandled / 5xx only" policy), including Sentry user context when it
 * is available. Sentry still records every error regardless.
 */
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment:
      process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || "development",
    tracesSampleRate: parseSampleRate(process.env.SENTRY_TRACES_SAMPLE_RATE),
    async beforeSend(event) {
      const handled = event.exception?.values?.[0]?.mechanism?.handled;
      if (handled === false) {
        await forwardErrorToSlack(event);
      }
      return event;
    },
  });
}

async function forwardErrorToSlack(event: ErrorEvent): Promise<void> {
  const exc = event.exception?.values?.[0];
  const user = String(
    event.user?.email || event.user?.id || "unauthenticated / unknown"
  );
  const where = event.transaction || event.request?.url || "web (server)";

  await sendSlackErrorAlert(
    process.env.SLACK_WEBHOOK_URL,
    {
      title: "🚨 Web app error",
      where,
      user,
      environment:
        process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || "development",
      code: exc?.type,
      message: exc?.value,
    },
    {
      dedupeKey: `web:${where}:${exc?.type ?? "Error"}:${exc?.value ?? ""}`,
      throttleMs: 60_000,
      timeoutMs: 1_500,
    }
  );
}
