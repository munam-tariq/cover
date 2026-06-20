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
import { Metadata } from "next";

import { Eyebrow, WRAP } from "../components/marketing-kit";
import { DarkCta, PageHero } from "../components/page-kit";

export const metadata: Metadata = {
  title: "Features | Knowledge-Base Answers, Lead Capture & Handoff",
  description:
    "Resolve customer questions instantly — RAG-grounded answers, lead capture, multi-channel, and analytics. 5-minute setup on any website. Free during beta.",
  keywords: [
    "AI support agent features",
    "knowledge base AI",
    "RAG chatbot",
    "cited AI answers",
    "lead capture",
    "human handoff chatbot",
    "AI customer support",
  ],
  openGraph: {
    title: "FrontFace Features — Grounded Answers, Lead Capture & Handoff",
    description:
      "Resolve questions instantly with RAG-grounded answers from your knowledge base — cited sources, lead capture, and analytics. 5-minute setup on any website.",
    url: "https://frontface.app/features",
    type: "website",
    siteName: "FrontFace",
    locale: "en_US",
    images: [
      {
        url: "https://frontface.app/blog-og/features.png",
        width: 1200,
        height: 630,
        alt: "FrontFace Features — Grounded answers, lead capture, and human handoff",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@frontface",
    creator: "@frontface",
    title: "FrontFace Features",
    description: "Grounded answers from your knowledge base, lead capture, and human handoff.",
    images: [
      {
        url: "https://frontface.app/blog-og/features.png",
        width: 1200,
        height: 630,
        alt: "FrontFace Features — Grounded answers, lead capture, and human handoff",
      },
    ],
  },
  alternates: {
    canonical: "https://frontface.app/features",
  },
};

const coreFeatures = [
  {
    icon: <Brain className="w-5 h-5" />,
    title: "Answers From Your Knowledge",
    description:
      "Point it at your site or upload your docs, FAQs and policies. RAG-grounded retrieval means accurate answers with sources — never made up.",
    highlight: "Cited sources",
  },
  {
    icon: <Users className="w-5 h-5" />,
    title: "Human Handoff",
    description:
      "When a chat gets complex, customers reach a real person instantly — with the full conversation and context. AI handles routine, you handle what matters.",
    highlight: "Seamless",
  },
  {
    icon: <Upload className="w-5 h-5" />,
    title: "Feed It Your Content",
    description:
      "Add documents, paste text, or point to your website. Your agent learns from your content and stays current — no retraining required.",
    highlight: "Any format",
  },
  {
    icon: <Sparkles className="w-5 h-5" />,
    title: "Lead Capture & Qualification",
    description:
      "No pop-ups. The agent earns trust through conversation, then collects contact details and qualifies intent. Turn every conversation into an opportunity.",
    highlight: "No forms",
  },
];

const additionalFeatures = [
  { icon: <Globe className="w-5 h-5" />, title: "Works on Any Website", description: "Shopify, WordPress, Wix, Squarespace, or custom — one line of code and you're live." },
  { icon: <Zap className="w-5 h-5" />, title: "24/7 Availability", description: "Your agent never sleeps. Customers get instant answers any time of day or night." },
  { icon: <BarChart3 className="w-5 h-5" />, title: "Analytics That Matter", description: "See what customers ask, where the agent struggles, and which conversations convert." },
  { icon: <Palette className="w-5 h-5" />, title: "Custom Branding", description: "Match your brand with customizable colors, logo, and welcome messages." },
  { icon: <Shield className="w-5 h-5" />, title: "Secure & Private", description: "Your data stays safe with encrypted storage and secure infrastructure." },
  { icon: <MessageSquare className="w-5 h-5" />, title: "Conversation History", description: "Review every conversation. See what's working and where customers need more help." },
  { icon: <Workflow className="w-5 h-5" />, title: "Multi-Channel", description: "One agent across web, WhatsApp, Slack and email — same brain, same knowledge, everywhere." },
  { icon: <Code className="w-5 h-5" />, title: "Developer API & MCP", description: "Full REST API plus native Model Context Protocol. Build exactly what you need." },
];

const steps = [
  { step: "01", title: "Feed it your knowledge", description: "Point FrontFace at your website or upload docs, PDFs and FAQs. It reads everything and builds a grounded knowledge base in minutes." },
  { step: "02", title: "Make it yours", description: "Add your logo, pick your colors, write a welcome message. Test it against real questions before it goes live." },
  { step: "03", title: "Go live in 5 minutes", description: "Drop one line of code on any site — Shopify, WordPress, Wix or custom — or share a hosted public agent page." },
];

const howToSchema = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  name: "How to Add an AI Support Agent to Your Website in 5 Minutes",
  description:
    "Set up FrontFace — an AI support agent that resolves customer questions from your knowledge base — on any website in three steps, no coding required.",
  totalTime: "PT5M",
  supply: [{ "@type": "HowToSupply", name: "Your website or knowledge base content" }],
  tool: [{ "@type": "HowToTool", name: "FrontFace account (free during beta)" }],
  step: [
    {
      "@type": "HowToStep",
      position: 1,
      name: "Feed it your knowledge",
      text: "Point FrontFace at your website or upload docs, PDFs and FAQs. It reads everything and builds a grounded knowledge base in minutes.",
    },
    {
      "@type": "HowToStep",
      position: 2,
      name: "Make it yours",
      text: "Add your logo, pick your colors, write a welcome message. Test it against real questions before it goes live.",
    },
    {
      "@type": "HowToStep",
      position: 3,
      name: "Go live in 5 minutes",
      text: "Drop one line of code on any site — Shopify, WordPress, Wix or custom — or share a hosted public agent page.",
    },
  ],
};

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: "https://frontface.app" },
    { "@type": "ListItem", position: 2, name: "Features", item: "https://frontface.app/features" },
  ],
};

const cardStyle = {
  background: "var(--ff-card)",
  border: "1px solid var(--ff-line)",
  borderRadius: 18,
  padding: "24px 22px",
} as const;

const inkChip = {
  width: 44,
  height: 44,
  borderRadius: 12,
  background: "var(--ff-ink)",
  color: "#fff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
} as const;

const softChip = {
  width: 42,
  height: 42,
  borderRadius: 12,
  background: "var(--ff-accent-soft)",
  color: "var(--ff-accent-2)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  marginBottom: 16,
} as const;

export default function FeaturesPage() {
  return (
    <>
      <script id="features-howto-schema" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(howToSchema) }} />
      <script id="features-breadcrumb-schema" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <main>
      <PageHero
        eyebrow="Features"
        title="Everything support needs. One agent."
        sub="FrontFace resolves customer questions instantly from your own content — answering with cited sources, capturing leads, and handing off cleanly when a human's needed."
      />

      {/* Core features */}
      <section style={{ ...WRAP, padding: "clamp(32px,5vh,64px) clamp(20px,5vw,40px)" }}>
        <div className="reveal" style={{ marginBottom: 36 }}>
          <Eyebrow>Core capabilities</Eyebrow>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 18 }}>
          {coreFeatures.map((f, i) => (
            <div key={f.title} className={"reveal d" + ((i % 2) + 1)} style={cardStyle}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
                <span style={inkChip}>{f.icon}</span>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
                    <h3 style={{ fontSize: 17.5, fontWeight: 700, color: "var(--ff-ink)", letterSpacing: "-.01em" }}>{f.title}</h3>
                    <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".03em", color: "var(--ff-accent-2)", background: "var(--ff-accent-soft)", borderRadius: 99, padding: "3px 9px" }}>
                      {f.highlight}
                    </span>
                  </div>
                  <p style={{ fontSize: 14, lineHeight: 1.6, color: "var(--ff-soft)", textWrap: "pretty" }}>{f.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Additional features */}
      <section style={{ ...WRAP, padding: "clamp(24px,4vh,48px) clamp(20px,5vw,40px)" }}>
        <div className="reveal" style={{ textAlign: "center", maxWidth: 560, margin: "0 auto 40px" }}>
          <h2 style={{ fontSize: "clamp(26px,3.8vw,42px)", fontWeight: 800, letterSpacing: "-.03em", color: "var(--ff-ink)", lineHeight: 1.08, textWrap: "balance" }}>
            What else does FrontFace include?
          </h2>
          <p style={{ fontSize: 16.5, lineHeight: 1.55, color: "var(--ff-soft)", marginTop: 14, textWrap: "pretty" }}>
            Every feature designed to make your team&apos;s life easier and your customers happier.
          </p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 18 }}>
          {additionalFeatures.map((f, i) => (
            <div key={f.title} className={"reveal ff-cap-card d" + ((i % 4) + 1)} style={cardStyle}>
              <span style={softChip}>{f.icon}</span>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--ff-ink)", letterSpacing: "-.01em", marginBottom: 7 }}>{f.title}</h3>
              <p style={{ fontSize: 13.5, lineHeight: 1.55, color: "var(--ff-soft)", textWrap: "pretty" }}>{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section style={{ ...WRAP, padding: "clamp(40px,6vh,80px) clamp(20px,5vw,40px)" }}>
        <div className="reveal" style={{ textAlign: "center", maxWidth: 560, margin: "0 auto 44px" }}>
          <h2 style={{ fontSize: "clamp(26px,3.8vw,42px)", fontWeight: 800, letterSpacing: "-.03em", color: "var(--ff-ink)", lineHeight: 1.08, textWrap: "balance" }}>
            How quickly can you get started?
          </h2>
          <p style={{ fontSize: 16.5, lineHeight: 1.55, color: "var(--ff-soft)", marginTop: 14, textWrap: "pretty" }}>
            Three simple steps. No technical skills required.
          </p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 18 }}>
          {steps.map((s, i) => (
            <div key={s.step} className={"reveal d" + (i + 1)} style={{ ...cardStyle, padding: "26px 24px" }}>
              <div style={{ ...inkChip, width: 46, height: 46, borderRadius: 13, fontWeight: 800, fontSize: 16, marginBottom: 16 }} className="mono">
                {s.step}
              </div>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: "var(--ff-ink)", letterSpacing: "-.01em", marginBottom: 8 }}>{s.title}</h3>
              <p style={{ fontSize: 14, lineHeight: 1.6, color: "var(--ff-soft)", textWrap: "pretty" }}>{s.description}</p>
            </div>
          ))}
        </div>
      </section>

      <DarkCta
        title="Ready to put it to work?"
        sub="Start free during beta. No credit card required."
        secondaryLabel="See use cases"
        secondaryHref="/use-cases"
      />
    </main>
    </>
  );
}
