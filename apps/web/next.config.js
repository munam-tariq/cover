const { withSentryConfig } = require("@sentry/nextjs");

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
