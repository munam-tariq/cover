import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);

function loadNextConfig(nodeEnv: string) {
  const previousNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = nodeEnv;

  const configPath = require.resolve("../../apps/web/next.config.js");
  delete require.cache[configPath];
  const nextConfig = require("../../apps/web/next.config.js");

  if (previousNodeEnv === undefined) {
    delete process.env.NODE_ENV;
  } else {
    process.env.NODE_ENV = previousNodeEnv;
  }

  return nextConfig;
}

function getCacheHeaderValue(
  headers: Array<{ source: string; headers: Array<{ key: string; value: string }> }>,
  source: string
) {
  const rule = headers.find((candidate) => candidate.source === source);
  return rule?.headers.find((header) => header.key.toLowerCase() === "cache-control")
    ?.value;
}

test("web next config does not cache stable static chunk URLs immutably in development", async () => {
  const nextConfig = loadNextConfig("development");
  const headers = await nextConfig.headers();
  const cacheControl = getCacheHeaderValue(headers, "/_next/static/:path*");

  assert.equal(cacheControl, "no-store");
});

test("web next config keeps immutable static asset caching in production", async () => {
  const nextConfig = loadNextConfig("production");
  const headers = await nextConfig.headers();
  const cacheControl = getCacheHeaderValue(headers, "/_next/static/:path*");

  assert.equal(cacheControl, "public, max-age=31536000, immutable");
});
