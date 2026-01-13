import { Metadata } from "next";
import Link from "next/link";
import { Header } from "../components/header";
import { Footer } from "../components/footer";
import { Code, ExternalLink } from "lucide-react";

export const metadata: Metadata = {
  title: "Integrations | Connect AI Chatbot with Your Tools | SupportBase",
  description:
    "Integrate SupportBase with Cursor, Claude, MCP, Slack, Zapier, and more. Connect your AI chatbot with your existing workflow and tools.",
  keywords: [
    "AI chatbot integrations",
    "MCP integration",
    "Cursor integration",
    "Claude integration",
    "Slack chatbot",
    "Zapier integration",
    "chatbot API",
  ],
  openGraph: {
    title: "SupportBase Integrations",
    description: "Connect your AI chatbot with your favorite tools.",
    url: "https://supportbase.app/integrations",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "SupportBase Integrations",
    description: "Connect your AI chatbot with your favorite tools.",
  },
  alternates: {
    canonical: "https://supportbase.app/integrations",
  },
};

const featuredIntegrations = [
  {
    name: "MCP Protocol",
    description:
      "Native Model Context Protocol support. Give any MCP-compatible AI assistant access to manage your chatbots.",
    category: "AI Tools",
    status: "Available",
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
      </svg>
    ),
  },
  {
    name: "Cursor",
    description:
      "Use natural language in Cursor to create chatbots, upload knowledge, and manage your support - without leaving your IDE.",
    category: "AI Tools",
    status: "Available",
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M7 8h10M7 12h6M7 16h8" stroke="white" strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    name: "Claude",
    description:
      "Connect Claude to SupportBase via MCP. Ask Claude to help configure your chatbot, analyze conversations, or improve responses.",
    category: "AI Tools",
    status: "Available",
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
        <circle cx="12" cy="12" r="10" />
        <path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01" stroke="white" strokeWidth="1.5" />
      </svg>
    ),
  },
];

const integrations = [
  {
    name: "REST API",
    description:
      "Full-featured REST API for custom integrations. Manage chatbots, knowledge bases, and conversations programmatically.",
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
    name: "JavaScript SDK",
    description:
      "Embed widget with full customization. React, Vue, and vanilla JS support.",
    category: "Developer",
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
    name: "Zapier",
    description:
      "Connect SupportBase to 5,000+ apps. Automate lead capture, notifications, and more.",
    category: "Automation",
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
    name: "Salesforce",
    description:
      "Enterprise CRM integration. Push leads and conversation data to Salesforce automatically.",
    category: "CRM",
    status: "Coming Soon",
  },
  {
    name: "Intercom",
    description:
      "Seamless handoff to Intercom for human support. Combine AI efficiency with human empathy.",
    category: "Support",
    status: "Coming Soon",
  },
  {
    name: "Zendesk",
    description:
      "Create Zendesk tickets from chatbot escalations. Maintain your existing support workflow.",
    category: "Support",
    status: "Coming Soon",
  },
  {
    name: "Notion",
    description:
      "Import knowledge directly from Notion. Keep your chatbot in sync with your team documentation.",
    category: "Knowledge",
    status: "Coming Soon",
  },
  {
    name: "Confluence",
    description:
      "Pull knowledge from Confluence spaces. Enterprise documentation made accessible to customers.",
    category: "Knowledge",
    status: "Coming Soon",
  },
  {
    name: "Google Analytics",
    description:
      "Track chatbot engagement in GA4. Understand how AI support impacts your conversion funnel.",
    category: "Analytics",
    status: "Coming Soon",
  },
];

const categories = ["All", "AI Tools", "Developer", "Communication", "CRM", "Support", "Knowledge", "Automation", "Analytics"];

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
            Connect With Your Stack
          </h1>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
            SupportBase works with your existing tools. From AI assistants to
            CRMs, integrate seamlessly with your workflow.
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
              Growing ecosystem of integrations to connect SupportBase with your
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

        {/* API Section */}
        <section className="max-w-6xl mx-auto px-6 py-20">
          <div className="bg-slate-900 rounded-2xl p-12 md:flex items-center gap-12">
            <div className="md:w-1/2 mb-8 md:mb-0">
              <span className="inline-block px-3 py-1 text-sm font-medium text-blue-400 bg-blue-500/20 rounded-full mb-4">
                For Developers
              </span>
              <h2 className="text-3xl font-bold text-white mb-4">
                Build Custom Integrations
              </h2>
              <p className="text-slate-400 leading-relaxed mb-6">
                Our REST API and MCP server give you complete control. Build
                custom integrations, automate workflows, and extend SupportBase
                to fit your exact needs.
              </p>
              <Link
                href="/login"
                className="inline-flex items-center text-blue-400 font-medium hover:text-blue-300 transition-colors"
              >
                View API Documentation
                <ExternalLink className="w-4 h-4 ml-2" />
              </Link>
            </div>
            <div className="md:w-1/2">
              <div className="bg-slate-800 rounded-xl p-6 font-mono text-sm">
                <div className="text-slate-500 mb-2">
                  # Create a chatbot with MCP
                </div>
                <div className="text-green-400">
                  claude &quot;Create a support chatbot
                </div>
                <div className="text-green-400">
                  for my SaaS product using
                </div>
                <div className="text-green-400">SupportBase&quot;</div>
                <div className="text-slate-500 mt-4 mb-2"># Or use the API</div>
                <div className="text-blue-400">
                  curl -X POST /api/projects \
                </div>
                <div className="text-slate-400 pl-4">
                  -H &quot;Authorization: Bearer $API_KEY&quot; \
                </div>
                <div className="text-slate-400 pl-4">
                  -d &apos;&#123;&quot;name&quot;: &quot;My Chatbot&quot;&#125;&apos;
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-gradient-to-r from-blue-600 to-purple-600 py-20">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <h2 className="text-3xl font-bold text-white mb-4">
              Need a Custom Integration?
            </h2>
            <p className="text-blue-100 mb-8 text-lg">
              We&apos;re always adding new integrations. Let us know what you
              need.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/login"
                className="px-8 py-4 bg-white text-blue-600 font-semibold rounded-lg hover:bg-blue-50 transition-colors shadow-lg"
              >
                Get Started Free
              </Link>
              <a
                href="mailto:hello@supportbase.app"
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
