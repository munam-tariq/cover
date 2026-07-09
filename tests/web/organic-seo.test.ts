import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";

import { blogPosts } from "../../apps/web/app/[locale]/(marketing)/blog/blog-data.ts";

test("sitemap includes the organic tools cluster", () => {
  const source = readFileSync(
    path.join(process.cwd(), "apps/web/app/sitemap.ts"),
    "utf8",
  );

  assert.match(source, /`\$\{baseUrl\}\/tools`/);
  assert.match(source, /tools as toolPages/);
  assert.match(source, /`\$\{baseUrl\}\/tools\/\$\{tool\.slug\}`/);
});

test("robots advertises both regular and image sitemaps", () => {
  const source = readFileSync(
    path.join(process.cwd(), "apps/web/app/robots.ts"),
    "utf8",
  );

  assert.match(source, /sitemap:\s*\[/);
  assert.match(source, /\$\{baseUrl\}\/sitemap\.xml/);
  assert.match(source, /\$\{baseUrl\}\/image-sitemap\.xml/);
});

test("IndexNow ownership key is hosted as a public root file", () => {
  const publicDir = path.join(process.cwd(), "apps/web/public");
  const keyFiles = ["frontface-indexnow-key.txt"];

  for (const keyFile of keyFiles) {
    const fullPath = path.join(publicDir, keyFile);
    assert.equal(existsSync(fullPath), true, `${keyFile} should exist`);

    const key = readFileSync(fullPath, "utf8").trim();
    assert.match(key, /^[a-z0-9-]{8,128}$/i);
  }
});

test("the first free tool has a shareable OG image asset", () => {
  const imagePath = path.join(
    process.cwd(),
    "apps/web/public/blog-og/support-ticket-calculator.png",
  );

  assert.equal(existsSync(imagePath), true);
});

test("blog renderer supports AEO comparison tables", () => {
  const source = readFileSync(
    path.join(process.cwd(), "apps/web/app/[locale]/(marketing)/blog/[slug]/page.tsx"),
    "utf8",
  );

  assert.match(source, /remark-gfm/);
  assert.match(source, /remarkPlugins=\{\[remarkGfm\]\}/);
  assert.match(source, /relatedResourceLinks/);
  assert.match(source, /support-ticket-deflection-calculator/);
});

test("comparison post has table, FAQ, source, and contextual link sections", () => {
  const comparison = blogPosts.find(
    (post) => post.slug === "frontface-vs-chatbase-vs-intercom",
  );

  assert.ok(comparison, "comparison post should exist");
  assert.match(comparison.content, /\| Factor \| FrontFace \| Chatbase \| Intercom Fin \|/);
  assert.match(comparison.content, /## Frequently asked questions/);
  assert.match(comparison.content, /## Sources and citations/);
  assert.match(comparison.content, /\[support ticket deflection calculator\]/i);
});

test("llms file exposes the organic growth assets", () => {
  const llms = readFileSync(
    path.join(process.cwd(), "apps/web/public/llms.txt"),
    "utf8",
  );

  assert.match(llms, /Support Ticket Deflection Calculator/i);
  assert.match(llms, /IndexNow/);
  assert.match(llms, /AI customer support for small teams/i);
});

test("Microsoft Clarity is configured behind analytics consent", () => {
  const layout = readFileSync(
    path.join(process.cwd(), "apps/web/app/[locale]/layout.tsx"),
    "utf8",
  );
  const consent = readFileSync(
    path.join(process.cwd(), "apps/web/components/analytics-consent.tsx"),
    "utf8",
  );
  // The consent key is owned by lib/analytics (single source of truth); the
  // consent banner imports it to gate the Clarity tag behind the same value.
  const analytics = readFileSync(
    path.join(process.cwd(), "apps/web/lib/analytics.ts"),
    "utf8",
  );

  assert.match(layout, /AnalyticsConsent/);
  assert.match(consent, /NEXT_PUBLIC_CLARITY_PROJECT_ID/);
  assert.match(analytics, /frontface-analytics-consent/);
  assert.match(consent, /CONSENT_KEY/);
  assert.match(consent, /clarity\.ms\/tag/);
});
