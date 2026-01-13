import { Metadata } from "next";
import Link from "next/link";
import { Header } from "../components/header";
import { Footer } from "../components/footer";
import {
  Brain,
  Upload,
  Code,
  BarChart3,
  Users,
  Globe,
  Zap,
  Shield,
  Palette,
  MessageSquare,
  Workflow,
  Sparkles,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Features | AI Chatbot Capabilities | SupportBase",
  description:
    "Explore SupportBase features: RAG-powered AI, knowledge base upload, API tool calling, lead capture, analytics dashboard, MCP integration, and more.",
  keywords: [
    "AI chatbot features",
    "RAG chatbot",
    "knowledge base chatbot",
    "chatbot analytics",
    "lead capture chatbot",
    "MCP integration",
    "API tool calling",
  ],
  openGraph: {
    title: "SupportBase Features",
    description: "Everything you need to add AI support to your app.",
    url: "https://supportbase.app/features",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "SupportBase Features",
    description: "Everything you need to add AI support to your app.",
  },
  alternates: {
    canonical: "https://supportbase.app/features",
  },
};

const coreFeatures = [
  {
    icon: <Brain className="w-6 h-6" />,
    title: "RAG-Powered AI",
    description:
      "Advanced Retrieval-Augmented Generation ensures responses are accurate and grounded in your actual content. No hallucinations, no made-up answers.",
    highlight: "Powered by GPT-4",
  },
  {
    icon: <Upload className="w-6 h-6" />,
    title: "Knowledge Base Upload",
    description:
      "Upload documents, paste text, or crawl your website. Your chatbot learns from your content and stays up-to-date automatically.",
    highlight: "Multiple formats",
  },
  {
    icon: <Workflow className="w-6 h-6" />,
    title: "API Tool Calling",
    description:
      "Connect your chatbot to external APIs. Check order status, fetch real-time data, or trigger actions based on user requests.",
    highlight: "Unlimited APIs",
  },
  {
    icon: <Users className="w-6 h-6" />,
    title: "Lead Capture",
    description:
      "Turn conversations into leads. Capture emails, qualify prospects, and integrate with your CRM for seamless follow-up.",
    highlight: "CRM integration",
  },
];

const additionalFeatures = [
  {
    icon: <BarChart3 className="w-5 h-5" />,
    title: "Analytics Dashboard",
    description:
      "Understand user behavior with conversation analytics, popular questions, and satisfaction metrics.",
  },
  {
    icon: <Code className="w-5 h-5" />,
    title: "One-Line Embed",
    description:
      "Add to any website with a single script tag. No complex setup or development time required.",
  },
  {
    icon: <Globe className="w-5 h-5" />,
    title: "MCP Integration",
    description:
      "Native support for Model Context Protocol. Works seamlessly with Cursor, Claude, and other AI tools.",
  },
  {
    icon: <Palette className="w-5 h-5" />,
    title: "Custom Branding",
    description:
      "Match your brand with customizable colors, logos, and welcome messages.",
  },
  {
    icon: <Zap className="w-5 h-5" />,
    title: "Instant Responses",
    description:
      "Sub-second response times ensure your users never wait for answers.",
  },
  {
    icon: <Shield className="w-5 h-5" />,
    title: "Enterprise Security",
    description:
      "SOC 2 compliant infrastructure with encrypted data storage and secure API access.",
  },
  {
    icon: <MessageSquare className="w-5 h-5" />,
    title: "Multi-Project Support",
    description:
      "Manage multiple chatbots from a single dashboard. Perfect for agencies and multi-product companies.",
  },
  {
    icon: <Sparkles className="w-5 h-5" />,
    title: "Human Handoff",
    description:
      "Seamlessly escalate complex issues to human agents when AI can't help.",
  },
];

export default function FeaturesPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white pt-24">
        {/* Hero */}
        <section className="max-w-6xl mx-auto px-6 py-16 text-center">
          <span className="inline-block px-3 py-1 text-sm font-medium text-blue-600 bg-blue-50 rounded-full mb-4">
            Features
          </span>
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6">
            Everything You Need for AI Support
          </h1>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
            From knowledge base management to advanced analytics, SupportBase
            gives you the complete toolkit for delivering exceptional customer
            support.
          </p>
        </section>

        {/* Core Features */}
        <section className="max-w-6xl mx-auto px-6 py-16">
          <h2 className="text-2xl font-bold text-slate-900 mb-8 text-center">
            Core Capabilities
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            {coreFeatures.map((feature, index) => (
              <div
                key={index}
                className="bg-white rounded-2xl border border-slate-200 p-8 hover:shadow-xl transition-all duration-300"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white flex-shrink-0">
                    {feature.icon}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-xl font-bold text-slate-900">
                        {feature.title}
                      </h3>
                      <span className="px-2 py-0.5 text-xs font-medium bg-blue-50 text-blue-600 rounded-full">
                        {feature.highlight}
                      </span>
                    </div>
                    <p className="text-slate-600 leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Additional Features Grid */}
        <section className="bg-slate-50 py-20">
          <div className="max-w-6xl mx-auto px-6">
            <h2 className="text-2xl font-bold text-slate-900 mb-4 text-center">
              And Much More
            </h2>
            <p className="text-slate-600 text-center mb-12 max-w-2xl mx-auto">
              Every feature designed to make your life easier and your customers
              happier.
            </p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {additionalFeatures.map((feature, index) => (
                <div
                  key={index}
                  className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-lg transition-shadow"
                >
                  <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600 mb-4">
                    {feature.icon}
                  </div>
                  <h3 className="font-bold text-slate-900 mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-slate-600">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="max-w-6xl mx-auto px-6 py-20">
          <h2 className="text-3xl font-bold text-slate-900 mb-4 text-center">
            How It Works
          </h2>
          <p className="text-slate-600 text-center mb-12 max-w-2xl mx-auto">
            From sign-up to live chatbot in three simple steps.
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                title: "Upload Your Knowledge",
                description:
                  "Add your documentation, FAQs, and product information. We handle the rest.",
              },
              {
                step: "02",
                title: "Customize & Configure",
                description:
                  "Set your branding, welcome messages, and lead capture rules.",
              },
              {
                step: "03",
                title: "Embed & Go Live",
                description:
                  "Copy one line of code to your website. Your AI support is now live.",
              },
            ].map((item, index) => (
              <div key={index} className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">
                  {item.step}
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">
                  {item.title}
                </h3>
                <p className="text-slate-600">{item.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="bg-gradient-to-r from-blue-600 to-purple-600 py-20">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <h2 className="text-3xl font-bold text-white mb-4">
              Ready to Experience These Features?
            </h2>
            <p className="text-blue-100 mb-8 text-lg">
              Start free during beta. No credit card required.
            </p>
            <Link
              href="/login"
              className="inline-block px-8 py-4 bg-white text-blue-600 font-semibold rounded-lg hover:bg-blue-50 transition-colors shadow-lg"
            >
              Get Started Free
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
