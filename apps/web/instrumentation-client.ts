import { parseSampleRate } from "@chatbot/shared";
import * as Sentry from "@sentry/nextjs";

import { initAnalytics } from "@/lib/analytics";

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

/**
 * Client-side PostHog init (browser). Delegated to the shared analytics module,
 * which loads PostHog only when the user has granted consent (see
 * `lib/analytics` and `components/analytics-consent`). Fire-and-forget: the
 * banner re-triggers init the moment consent is granted.
 */
void initAnalytics();

// Instruments client-side navigations for tracing/error context.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
