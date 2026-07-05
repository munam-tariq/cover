const { withSentryConfig } = require("@sentry/nextjs");

const isProduction = process.env.NODE_ENV === "production";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@chatbot/ui", "@chatbot/db", "@chatbot/shared"],
  async redirects() {
    return [
      {
        source: "/blog/vibe-coding-building-apps-with-ai",
        destination: "/blog/ai-customer-support-guide-startups",
        permanent: true,
      },
      {
        source: "/blog/mcp-protocol-future-ai-integration",
        destination: "/blog/rag-vs-traditional-chatbots",
        permanent: true,
      },
    ];
  },
  async headers() {
    const staticCacheControl = isProduction
      ? "public, max-age=31536000, immutable"
      : "no-store";
    const pageCacheControl = isProduction
      ? "public, s-maxage=3600, must-revalidate"
      : "no-store";

    return [
      {
        // Versioned static assets are cacheable in production. In dev, route chunk
        // filenames are stable, so immutable caching can keep stale client code alive.
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: staticCacheControl,
          },
        ],
      },
      {
        // All HTML pages — 1-hour shared cache in production, no-store in dev.
        source: "/((?!_next/static).*)",
        headers: [
          {
            key: "Cache-Control",
            value: pageCacheControl,
          },
        ],
      },
    ];
  },
};

module.exports = withSentryConfig(nextConfig, {
  // Source-map upload runs at build time only when these are set; the build
  // succeeds without them (upload is simply skipped).
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  webpack: {
    treeshake: {
      removeDebugLogging: true,
    },
  },
});
