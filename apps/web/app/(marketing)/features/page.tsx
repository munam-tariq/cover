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
  title: "Features | AI Customer Support for Small Business | SupportBase",
  description:
    "SupportBase features: AI that answers from your docs, human handoff when needed, lead capture, and 5-minute setup. Perfect for small businesses, consultants, and ecommerce stores.",
  keywords: [
    "AI chatbot for small business",
    "customer support automation",
    "AI FAQ chatbot",
    "ecommerce chatbot",
    "Shopify chatbot",
    "lead capture chatbot",
    "human handoff chatbot",
  ],
  openGraph: {
    title: "SupportBase Features",
    description: "Everything you need to automate customer support for your small business.",
    url: "https://supportbase.app/features",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "SupportBase Features",
    description: "Everything you need to automate customer support for your small business.",
  },
  alternates: {
    canonical: "https://supportbase.app/features",
  },
};

const coreFeatures = [
  {
    icon: <Brain className="w-6 h-6" />,
    title: "Answers From Your Docs",
    description:
      "Upload your FAQs, policies, and product info. AI answers accurately from YOUR knowledge—no making things up, no wrong information.",
    highlight: "89% accuracy",
  },
  {
    icon: <Users className="w-6 h-6" />,
    title: "Human Handoff",
    description:
      "When questions get complex, customers connect to a real person instantly. AI handles the routine stuff, you handle what matters.",
    highlight: "Seamless transition",
  },
  {
    icon: <Upload className="w-6 h-6" />,
    title: "Upload FAQs & Policies",
    description:
      "Add your documents, paste text, or point to your website. Your chatbot learns from your content and stays current automatically.",
    highlight: "Multiple formats",
  },
  {
    icon: <Sparkles className="w-6 h-6" />,
    title: "Never Miss a Lead",
    description:
      "When AI can't answer, it captures customer emails so you can follow up. Turn every conversation into an opportunity.",
    highlight: "Lead capture",
  },
];

const additionalFeatures = [
  {
    icon: <Globe className="w-5 h-5" />,
    title: "Works on Any Website",
    description:
      "Shopify, WordPress, Wix, Squarespace, or custom site—just paste one line of code and you're live.",
  },
  {
    icon: <Zap className="w-5 h-5" />,
    title: "24/7 Availability",
    description:
      "Your AI chatbot never sleeps. Customers get instant answers any time of day or night.",
  },
  {
    icon: <BarChart3 className="w-5 h-5" />,
    title: "Analytics Dashboard",
    description:
      "See which questions customers ask most, track conversations, and understand what content to improve.",
  },
  {
    icon: <Palette className="w-5 h-5" />,
    title: "Custom Branding",
    description:
      "Match your brand with customizable colors, logos, and welcome messages.",
  },
  {
    icon: <Shield className="w-5 h-5" />,
    title: "Secure & Private",
    description:
      "Your data stays safe with encrypted storage and secure infrastructure.",
  },
  {
    icon: <MessageSquare className="w-5 h-5" />,
    title: "Conversation History",
    description:
      "Review all customer conversations. See what's working and where customers need more help.",
  },
  {
    icon: <Workflow className="w-5 h-5" />,
    title: "Order Status Lookup",
    description:
      "Connect to your systems so customers can check order status, appointments, or account info.",
  },
  {
    icon: <Code className="w-5 h-5" />,
    title: "Developer API",
    description:
      "Full REST API for custom integrations. Build exactly what you need.",
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
            Everything You Need to Stop Answering the Same Questions
          </h1>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
            Upload your FAQs, let AI handle 89% of questions automatically, and
            focus on what matters—growing your business.
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
            Live in 5 Minutes
          </h2>
          <p className="text-slate-600 text-center mb-12 max-w-2xl mx-auto">
            Three simple steps. No technical skills required.
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                title: "Upload Your FAQs",
                description:
                  "Add your frequently asked questions, policies, and product info. Just paste the text or upload files.",
              },
              {
                step: "02",
                title: "Customize Your Chatbot",
                description:
                  "Add your logo, pick your colors, write a welcome message. Make it feel like your brand.",
              },
              {
                step: "03",
                title: "Go Live in 5 Minutes",
                description:
                  "Copy one line of code to your website. Works with Shopify, WordPress, Wix, and any website.",
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
