/**
 * Server-side PostHog client (API).
 *
 * Token-guarded so it stays dormant until POSTHOG_PROJECT_TOKEN is configured —
 * mirrors the Sentry pattern in `instrument.ts`. The app runs normally with
 * PostHog disabled (the singleton is `null`) until the env var is added.
 *
 * `flushAt: 1` / `flushInterval: 0` send events immediately rather than
 * batching, which suits short-lived request handlers. `void posthog?.shutdown()`
 * is wired into the server's exit path (index.ts) to flush anything in flight.
 *
 * Server events key on domain identifiers already present in each flow (e.g. a
 * lead's visitor id, a conversation's visitor id) rather than client-forwarded
 * headers, so widget callers need not send — and widget CORS need not allow —
 * any PostHog identity headers.
 */
import { PostHog } from "posthog-node";

const token = process.env.POSTHOG_PROJECT_TOKEN;

export const posthog = token
  ? new PostHog(token, {
      host: process.env.POSTHOG_HOST,
      flushAt: 1,
      flushInterval: 0,
    })
  : null;
