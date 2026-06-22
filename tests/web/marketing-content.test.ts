import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";

import { blogPosts } from "../../apps/web/app/(marketing)/blog/blog-data.ts";

const require = createRequire(import.meta.url);

test("marketing blog posts are ordered newest first", () => {
  const timestamps = blogPosts.map((post) => Date.parse(post.date));

  assert.deepEqual(
    timestamps,
    [...timestamps].sort((a, b) => b - a),
    "blogPosts should be kept newest-first because the blog index features posts[0]",
  );
});

test("blog post metadata images resolve to public assets", () => {
  for (const post of blogPosts) {
    assert.match(post.image, /^\//, `${post.slug} image should be root-relative`);

    const imagePath = path.join(process.cwd(), "apps/web/public", post.image);
    assert.equal(existsSync(imagePath), true, `${post.slug} image is missing at ${imagePath}`);
  }
});

test("blog posts define varied visual cover directions", () => {
  const coverKinds = blogPosts.map((post) => post.coverKind);
  const coverCounts = new Map<string, number>();

  for (const coverKind of coverKinds) {
    assert.equal(typeof coverKind, "string", "every blog post should have an explicit coverKind");
    assert.ok(coverKind.length > 0, "coverKind should not be empty");
    coverCounts.set(coverKind, (coverCounts.get(coverKind) ?? 0) + 1);
  }

  assert.ok(coverCounts.size >= 10, "blog index should not repeat the same small set of cover scenes");
  assert.ok(Math.max(...coverCounts.values()) <= 2, "no cover scene should dominate the blog grid");
});

test("blog filter cards are visible immediately after category changes", () => {
  const source = readFileSync(path.join(process.cwd(), "apps/web/app/(marketing)/blog/blog-index.tsx"), "utf8");

  assert.match(source, /className=\{"reveal in d" \+ \(\(i % 3\) \+ 1\)\}/);
  assert.match(source, /aria-pressed=\{on\}/);
});

test("marketing third-party scripts wait for consent or user intent", () => {
  const rootLayout = readFileSync(path.join(process.cwd(), "apps/web/app/layout.tsx"), "utf8");
  const marketingLayout = readFileSync(path.join(process.cwd(), "apps/web/app/(marketing)/layout.tsx"), "utf8");
  const widgetLauncher = readFileSync(path.join(process.cwd(), "apps/web/app/(marketing)/components/marketing-widget-launcher.tsx"), "utf8");
  const analyticsConsent = readFileSync(path.join(process.cwd(), "apps/web/components/analytics-consent.tsx"), "utf8");

  assert.doesNotMatch(rootLayout, /googletagmanager\.com\/gtag\/js/);
  assert.match(analyticsConsent, /googletagmanager\.com\/gtag\/js/);
  assert.doesNotMatch(marketingLayout, /storage\/v1\/object\/public\/assets\/widget\.js/);
  assert.match(marketingLayout, /MarketingWidgetLauncher/);
  assert.match(widgetLauncher, /document\.createElement\("script"\)/);
  // The hosted widget is injected only once the browser is idle (with a short
  // fallback), so the third-party script never competes with the initial render.
  assert.match(widgetLauncher, /requestIdleCallback/);
});

test("homepage LCP hero renders static headline server-side", () => {
  const heroSection = readFileSync(path.join(process.cwd(), "apps/web/app/(marketing)/components/hero-section.tsx"), "utf8");
  const heroDemoSlot = readFileSync(path.join(process.cwd(), "apps/web/app/(marketing)/components/hero-demo-slot.tsx"), "utf8");

  assert.doesNotMatch(heroSection, /^"use client";/);
  assert.match(heroSection, /HeroDemoSlot/);
  assert.match(heroDemoSlot, /^"use client";/);
  assert.match(heroDemoSlot, /dynamic\(/);
});

test("retired blog slugs redirect to relevant live posts", async () => {
  const nextConfig = require("../../apps/web/next.config.js");
  const redirects = await nextConfig.redirects();
  const bySource = new Map(redirects.map((redirect: { source: string; destination: string }) => [redirect.source, redirect.destination]));

  assert.equal(bySource.get("/blog/vibe-coding-building-apps-with-ai"), "/blog/ai-customer-support-guide-startups");
  assert.equal(bySource.get("/blog/mcp-protocol-future-ai-integration"), "/blog/rag-vs-traditional-chatbots");
});

test("comparison post does not overstate coming-soon channel support", () => {
  const comparison = blogPosts.find((post) => post.slug === "frontface-vs-chatbase-vs-intercom");

  assert.ok(comparison, "comparison post should exist");
  assert.equal(
    comparison.content.includes("FrontFace: website, plus WhatsApp, Slack, and email."),
    false,
    "comparison post should not present coming-soon channels as fully available",
  );
});

test("public SEO and LLM files use the current support-resolution positioning", () => {
  const checkedFiles = [
    "apps/web/app/layout.tsx",
    "apps/web/public/manifest.json",
    "apps/web/public/llms.txt",
  ];

  for (const file of checkedFiles) {
    const content = readFileSync(path.join(process.cwd(), file), "utf8");

    assert.equal(
      content.includes("AI support agent that knows your product"),
      false,
      `${file} should not use the retired headline framing`,
    );
  }

  const llms = readFileSync(path.join(process.cwd(), "apps/web/public/llms.txt"), "utf8");

  assert.match(llms, /resolves customer questions instantly/i);
  assert.equal(
    llms.includes("built for developers using AI coding tools"),
    false,
    "llms.txt should not position FrontFace as developer-first",
  );
});
