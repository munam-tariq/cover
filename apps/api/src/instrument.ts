/**
 * Sentry instrumentation (API)
 *
 * This module MUST be preloaded before the application entrypoint so Sentry
 * can patch libraries as they load. The package scripts do that with Node's
 * `--import` flag in both development and production.
 *
 * It loads env first (so SENTRY_DSN is available) and only initializes Sentry
 * when a DSN is configured — the app runs normally with Sentry dormant until
 * the env var is added.
 *
 * Coverage strategy:
 * - `captureConsoleIntegration` turns every `console.error(...)` across the
 *   codebase into a Sentry event, so existing error logging is captured with
 *   no per-call-site changes.
 * - `setupExpressErrorHandler` (wired in index.ts) captures errors that
 *   propagate to Express.
 * - Default integrations capture uncaught exceptions and unhandled rejections.
 *
 * Static ESM imports are not sufficient for reliable preload ordering because
 * dependencies are instantiated before module bodies execute.
 */
import "dotenv/config";

import { parseSampleRate, sendSlackErrorAlert } from "@chatbot/shared";
import * as Sentry from "@sentry/node";

const dsn = process.env.SENTRY_DSN;
let fatalSlackSend: Promise<boolean> | undefined;

if (dsn) {
  Sentry.init({
    dsn,
    environment:
      process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || "development",
    tracesSampleRate: parseSampleRate(process.env.SENTRY_TRACES_SAMPLE_RATE),
    integrations: [
      Sentry.captureConsoleIntegration({ levels: ["error"] }),
      Sentry.onUncaughtExceptionIntegration({
        exitEvenIfOtherHandlersAreRegistered: true,
        onFatalError(error) {
          fatalSlackSend = sendProcessError(
            "auto.node.onuncaughtexception",
            error.name,
            error.message
          );
          void flushAndExit();
        },
      }),
    ],
    async beforeSend(event) {
      const exception = event.exception?.values?.[0];
      const mechanism = exception?.mechanism?.type;

      if (mechanism === "auto.node.onunhandledrejection") {
        await sendProcessError(
          mechanism,
          exception?.type,
          exception?.value,
          String(
            event.user?.email || event.user?.id || "unauthenticated / unknown"
          )
        );
      }

      return event;
    },
  });
}

function sendProcessError(
  mechanism: string,
  code?: string,
  message?: string,
  user = "unauthenticated / unknown"
): Promise<boolean> {
  return sendSlackErrorAlert(
    process.env.SLACK_WEBHOOK_URL,
    {
      title: "🚨 Server process error",
      where: mechanism,
      user,
      environment:
        process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || "development",
      code,
      message,
    },
    {
      dedupeKey: `api-process:${mechanism}:${code ?? "Error"}:${message ?? ""}`,
      throttleMs: 60_000,
      timeoutMs: 1_500,
    }
  );
}

async function flushAndExit(): Promise<void> {
  await Promise.allSettled([
    fatalSlackSend ?? Promise.resolve(false),
    Sentry.flush(2_000),
  ]);
  process.exit(1);
}
