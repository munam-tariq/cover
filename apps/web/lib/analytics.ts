/**
 * Browser analytics initialization, gated on explicit consent.
 *
 * PostHog must never load before the user grants analytics consent, so init is
 * routed through this single idempotent entry point. Both the instrumentation
 * hook (on page load) and the consent banner (on grant) call `initAnalytics`;
 * it self-guards so calling it more than once is safe.
 *
 * `posthog-js` is imported lazily inside `initAnalytics` so that, without a
 * stored grant, the module is never even loaded — no remote configuration is
 * fetched, no persistence is created, and no PostHog request is sent.
 */

export const CONSENT_KEY = "frontface-analytics-consent";

/**
 * Pure consent policy: PostHog may initialize only when a project token is
 * configured AND the stored consent value is an explicit `granted`. Exported so
 * the gate can be unit-tested without touching the browser SDK.
 */
export function shouldInitAnalytics(
  consent: string | null,
  token: string | undefined
): boolean {
  return Boolean(token) && consent === "granted";
}

let initialized = false;

/**
 * Idempotently initialize PostHog in the browser when — and only when — the
 * user has granted analytics consent. A no-op on the server, without a token,
 * or without a stored grant. Capture calls made before this resolves are
 * harmless: PostHog treats them as no-ops until initialized.
 */
export async function initAnalytics(): Promise<void> {
  if (initialized) return;
  if (typeof window === "undefined") return;

  const token = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
  const consent = window.localStorage.getItem(CONSENT_KEY);
  if (!shouldInitAnalytics(consent, token)) return;

  // Guard before the await so a second call can't race a duplicate init.
  initialized = true;

  const { default: posthog } = await import("posthog-js");
  posthog.init(token as string, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    defaults: "2026-01-30", // auto pageviews + pageleave + SPA nav + autocapture
    persistence: "localStorage+cookie",
    session_recording: {
      maskAllInputs: true,
      maskTextSelector: "[data-ph-mask]",
    },
  });
}
