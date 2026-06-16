import { parseSampleRate } from "@chatbot/shared";
import * as Sentry from "@sentry/nextjs";

/**
 * Client-side Sentry init (browser). DSN-guarded so it stays dormant until
 * NEXT_PUBLIC_SENTRY_DSN is configured.
 */
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment:
      process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ||
      process.env.NODE_ENV ||
      "development",
    tracesSampleRate: parseSampleRate(
      process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE
    ),
  });
}

// Instruments client-side navigations for tracing/error context.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
