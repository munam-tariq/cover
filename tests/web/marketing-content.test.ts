import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { existsSync } from "node:fs";
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
