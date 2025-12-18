/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@chatbot/ui", "@chatbot/db", "@chatbot/shared"],
};

module.exports = nextConfig;
