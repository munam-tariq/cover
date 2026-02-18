import { Metadata } from "next";
import Link from "next/link";
import { Header } from "../components/header";
import { Footer } from "../components/footer";
import { Code, ExternalLink } from "lucide-react";

export const metadata: Metadata = {
  title: "Integrations | Works on Any Website | FrontFace",
  description:
    "Add FrontFace to Shopify, WordPress, Wix, Squarespace, or any website. One line of code, 5-minute setup. Connect with Slack, HubSpot, and more.",
  keywords: [
    "Shopify chatbot",
    "WordPress chatbot",
    "Wix chatbot",
    "ecommerce chatbot",
    "website chatbot integration",
    "Slack chatbot",
    "HubSpot integration",
  ],
  openGraph: {
    title: "FrontFace Integrations",
    description: "Works on any website. Shopify, WordPress, Wix, and more.",
    url: "https://frontface.app/integrations",
    type: "website",
    images: [
      {
        url: "https://frontface.app/og-image.png",
        width: 1200,
        height: 630,
        alt: "FrontFace — AI Lead Capture & Sales Agent",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "FrontFace Integrations",
    description: "Works on any website. Shopify, WordPress, Wix, and more.",
    images: ["https://frontface.app/og-image.png"],
  },
  alternates: {
    canonical: "https://frontface.app/integrations",
  },
};

const featuredIntegrations = [
  {
    name: "Shopify",
    description:
      "Add AI customer support to your Shopify store. Answer product questions, track orders, and handle returns automatically.",
    category: "Ecommerce",
    status: "Available",
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
        <path d="M15.5 2.5L14 3l-1 4-2 1v11l6.5-3V5.5l-2-3z" />
        <path d="M11 8l-4.5 2v10l4.5-2V8z" />
        <path d="M6.5 10L4 11v8l2.5-1V10z" />
      </svg>
    ),
  },
  {
    name: "WordPress",
    description:
      "Works with any WordPress site. Install with a simple plugin or paste one line of code. Compatible with WooCommerce too.",
    category: "Website",
    status: "Available",
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.94-.49-7-3.85-7-7.93s3.05-7.44 7-7.93v15.86zm2 0V4.07c3.94.49 7 3.85 7 7.93s-3.05 7.44-7 7.93z" stroke="white" strokeWidth="0.5" />
      </svg>
    ),
  },
  {
    name: "Wix",
    description:
      "Add to your Wix website in minutes. No coding required—just paste the embed code in your site settings.",
    category: "Website",
    status: "Available",
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
        <path d="M4 6l4 12 4-8 4 8 4-12" stroke="white" strokeWidth="2" fill="none" />
      </svg>
    ),
  },
];

const integrations = [
  {
    name: "Squarespace",
    description:
      "Add to any Squarespace site. Just paste the embed code in your site's code injection settings.",
    category: "Website",
    status: "Available",
  },
  {
    name: "Custom Website",
    description:
      "Works on any website. Just paste one line of code before the closing body tag.",
    category: "Website",
    status: "Available",
  },
  {
    name: "WooCommerce",
    description:
      "Full support for WooCommerce stores. Answer product questions and check order status.",
    category: "Ecommerce",
    status: "Available",
  },
  {
    name: "Slack",
    description:
      "Get notified of new leads and escalations directly in Slack. Reply from Slack threads.",
    category: "Communication",
    status: "Coming Soon",
  },
  {
    name: "Email",
    description:
      "Receive daily summaries and instant alerts for conversations that need your attention.",
    category: "Communication",
    status: "Coming Soon",
  },
  {
    name: "HubSpot",
    description:
      "Sync leads directly to HubSpot CRM. Track chatbot-generated leads through your sales pipeline.",
    category: "CRM",
    status: "Coming Soon",
  },
  {
    name: "Zapier",
    description:
      "Connect FrontFace to 5,000+ apps. Automate lead capture, notifications, and more.",
    category: "Automation",
    status: "Coming Soon",
  },
  {
    name: "Google Analytics",
    description:
      "Track chatbot engagement in GA4. Understand how AI support impacts your conversion funnel.",
    category: "Analytics",
    status: "Coming Soon",
  },
  {
    name: "REST API",
    description:
      "Full-featured REST API for custom integrations. Manage chatbots, knowledge bases, and conversations.",
    category: "Developer",
    status: "Available",
  },
  {
    name: "Webhook",
    description:
      "Receive real-time notifications for new conversations, leads, and escalations.",
    category: "Developer",
    status: "Available",
  },
  {
    name: "MCP Protocol",
    description:
      "For developers: Native Model Context Protocol support. Works with Cursor, Claude, and other AI tools.",
    category: "Developer",
    status: "Available",
  },
  {
    name: "JavaScript SDK",
    description:
      "For developers: Advanced embed customization with React, Vue, and vanilla JS support.",
    category: "Developer",
    status: "Available",
  },
];

const categories = ["All", "Website", "Ecommerce", "Communication", "CRM", "Automation", "Analytics", "Developer"];

export default function IntegrationsPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white pt-24">
        {/* Hero */}
        <section className="max-w-6xl mx-auto px-6 py-16 text-center">
          <span className="inline-block px-3 py-1 text-sm font-medium text-blue-600 bg-blue-50 rounded-full mb-4">
            Integrations
          </span>
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6">
            Works on Any Website
          </h1>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
            Shopify, WordPress, Wix, Squarespace, or custom site—FrontFace
            works everywhere. Just paste one line of code and you&apos;re live.
          </p>
        </section>

        {/* Featured Integrations */}
        <section className="max-w-6xl mx-auto px-6 py-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-8 text-center">
            Featured Integrations
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {featuredIntegrations.map((integration, index) => (
              <div
                key={index}
                className="bg-white rounded-2xl border border-slate-200 p-8 hover:shadow-xl transition-all duration-300 relative overflow-hidden"
              >
                <div className="absolute top-4 right-4">
                  <span className="px-2.5 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                    {integration.status}
                  </span>
                </div>
                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white mb-4">
                  {integration.icon}
                </div>
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                  {integration.category}
                </span>
                <h3 className="text-xl font-bold text-slate-900 mt-1 mb-2">
                  {integration.name}
                </h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  {integration.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* All Integrations */}
        <section className="bg-slate-50 py-20">
          <div className="max-w-6xl mx-auto px-6">
            <h2 className="text-2xl font-bold text-slate-900 mb-4 text-center">
              All Integrations
            </h2>
            <p className="text-slate-600 text-center mb-8 max-w-2xl mx-auto">
              Growing ecosystem of integrations to connect FrontFace with your
              entire stack.
            </p>

            {/* Category Pills */}
            <div className="flex flex-wrap gap-2 justify-center mb-12">
              {categories.map((category) => (
                <button
                  key={category}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    category === "All"
                      ? "bg-blue-600 text-white"
                      : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>

            {/* Integrations Grid */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {integrations.map((integration, index) => (
                <div
                  key={index}
                  className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                      <Code className="w-5 h-5 text-slate-600" />
                    </div>
                    <span
                      className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                        integration.status === "Available"
                          ? "bg-green-100 text-green-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {integration.status}
                    </span>
                  </div>
                  <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                    {integration.category}
                  </span>
                  <h3 className="font-bold text-slate-900 mt-1 mb-2">
                    {integration.name}
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    {integration.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Easy Setup Section */}
        <section className="max-w-6xl mx-auto px-6 py-20">
          <div className="bg-slate-900 rounded-2xl p-12 md:flex items-center gap-12">
            <div className="md:w-1/2 mb-8 md:mb-0">
              <span className="inline-block px-3 py-1 text-sm font-medium text-blue-400 bg-blue-500/20 rounded-full mb-4">
                Simple Setup
              </span>
              <h2 className="text-3xl font-bold text-white mb-4">
                One Line of Code
              </h2>
              <p className="text-slate-400 leading-relaxed mb-6">
                Adding FrontFace to your website is as simple as copying and
                pasting one line of code. No technical skills required. Works
                with any website builder or custom site.
              </p>
              <Link
                href="/login"
                className="inline-flex items-center text-blue-400 font-medium hover:text-blue-300 transition-colors"
              >
                Get Started Free
                <ExternalLink className="w-4 h-4 ml-2" />
              </Link>
            </div>
            <div className="md:w-1/2">
              <div className="bg-slate-800 rounded-xl p-6 font-mono text-sm">
                <div className="text-slate-500 mb-2">
                  {/* Add this before &lt;/body&gt; */}
                </div>
                <div className="text-green-400">
                  &lt;script
                </div>
                <div className="text-green-400 pl-4">
                  src=&quot;https://frontface.app/widget.js&quot;
                </div>
                <div className="text-green-400 pl-4">
                  data-id=&quot;your-chatbot-id&quot;
                </div>
                <div className="text-green-400">
                  &gt;&lt;/script&gt;
                </div>
                <div className="text-slate-500 mt-4">
                  {/* That&apos;s it! Your AI chatbot is live. */}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-gradient-to-r from-blue-600 to-purple-600 py-20">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <h2 className="text-3xl font-bold text-white mb-4">
              Ready to Add AI Support to Your Website?
            </h2>
            <p className="text-blue-100 mb-8 text-lg">
              Works with any website. Setup takes 5 minutes. Free during beta.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/login"
                className="px-8 py-4 bg-white text-blue-600 font-semibold rounded-lg hover:bg-blue-50 transition-colors shadow-lg"
              >
                Get Started Free
              </Link>
              <a
                href="mailto:hello@frontface.app"
                className="px-8 py-4 bg-blue-500/30 text-white font-semibold rounded-lg hover:bg-blue-500/40 transition-colors border border-white/20"
              >
                Request Integration
              </a>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
