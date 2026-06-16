import * as Sentry from "@sentry/nextjs";

/**
 * Next.js instrumentation hook. Loads the correct Sentry config for the active
 * runtime. Both configs are DSN-guarded, so this is a no-op until
 * NEXT_PUBLIC_SENTRY_DSN is set.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

// Captures errors thrown in App Router server components / route handlers.
export const onRequestError = Sentry.captureRequestError;
