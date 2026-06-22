import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  shouldInitAnalytics,
  CONSENT_KEY,
} from "../../apps/web/lib/analytics.ts";

const instrumentationPath = new URL(
  "../../apps/web/instrumentation-client.ts",
  import.meta.url
);
const consentPath = new URL(
  "../../apps/web/components/analytics-consent.tsx",
  import.meta.url
);
const apiClientPath = new URL(
  "../../apps/web/lib/api-client.ts",
  import.meta.url
);
const webEnvExamplePath = new URL(
  "../../apps/web/.env.example",
  import.meta.url
);

// ─── Browser init is gated by explicit granted consent ──────────────────────

test("analytics initializes only when consent is explicitly granted", () => {
  assert.equal(shouldInitAnalytics("granted", "phc_test_token"), true);
});

test("analytics stays dormant without an explicit grant", () => {
  const token = "phc_test_token";
  assert.equal(shouldInitAnalytics(null, token), false);
  assert.equal(shouldInitAnalytics("denied", token), false);
  assert.equal(shouldInitAnalytics("pending", token), false);
});

test("analytics stays dormant when no PostHog token is configured", () => {
  assert.equal(shouldInitAnalytics("granted", undefined), false);
  assert.equal(shouldInitAnalytics("granted", ""), false);
});

test("the consent storage key is shared from one source of truth", () => {
  assert.equal(CONSENT_KEY, "frontface-analytics-consent");
});

// ─── instrumentation-client delegates to the analytics module ───────────────

test("instrumentation-client initializes analytics via the shared module, not posthog.init", async () => {
  const source = await readFile(instrumentationPath, "utf8");
  assert.match(source, /initAnalytics\s*\(\s*\)/);
  assert.doesNotMatch(source, /posthog\.init\s*\(/);
  assert.doesNotMatch(source, /opt_out_capturing_by_default/);
});

// ─── consent banner initializes analytics on grant, no opt-in/out plumbing ──

test("consent banner triggers analytics init on grant and drops opt-in/opt-out", async () => {
  const source = await readFile(consentPath, "utf8");
  assert.match(source, /initAnalytics/);
  assert.match(source, /CONSENT_KEY/);
  assert.doesNotMatch(source, /opt_in_capturing/);
  assert.doesNotMatch(source, /opt_out_capturing/);
});

// ─── shared API client no longer forwards PostHog identity headers ──────────

test("api-client sends no PostHog headers", async () => {
  const source = await readFile(apiClientPath, "utf8");
  assert.doesNotMatch(source, /X-POSTHOG/i);
  assert.doesNotMatch(source, /posthogHeaders/);
  assert.doesNotMatch(source, /from\s+["']posthog-js["']/);
});

// ─── web env example documents PostHog ──────────────────────────────────────

test("web .env.example documents PostHog settings", async () => {
  const source = await readFile(webEnvExamplePath, "utf8");
  assert.match(source, /NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN/);
  assert.match(source, /NEXT_PUBLIC_POSTHOG_HOST/);
});
