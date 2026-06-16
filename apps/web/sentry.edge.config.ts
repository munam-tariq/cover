import { parseSampleRate } from "@chatbot/shared";
import * as Sentry from "@sentry/nextjs";

/**
 * Sentry init for the Edge runtime. DSN-guarded; stays dormant until
 * NEXT_PUBLIC_SENTRY_DSN is configured.
 */
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment:
      process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || "development",
    tracesSampleRate: parseSampleRate(process.env.SENTRY_TRACES_SAMPLE_RATE),
  });
}
