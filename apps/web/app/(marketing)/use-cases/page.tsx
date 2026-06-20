import {
  ShoppingCart,
  Rocket,
  Building2,
  GraduationCap,
  HeartPulse,
  Briefcase,
} from "lucide-react";
import { Metadata } from "next";
import Link from "next/link";
import type { CSSProperties } from "react";

import { Ic, WRAP } from "../components/marketing-kit";
import { DarkCta, PageHero } from "../components/page-kit";

export const metadata: Metadata = {
  title: "Use Cases | AI Support Agent for Every Industry",
  description:
    "See how SaaS teams, ecommerce stores, and agencies use FrontFace to resolve customer questions instantly — deflecting tickets and capturing leads.",
  keywords: [
    "AI support for SaaS",
    "ecommerce AI support",
    "AI agent for professional services",
    "AI customer support by industry",
    "knowledge base chatbot",
    "RAG chatbot",
  ],
  openGraph: {
    title: "FrontFace Use Cases — AI Support for Every Industry",
    description:
      "Resolve customer questions instantly from your own content — deflect tickets and capture leads. For SaaS, ecommerce, professional services, and more.",
    url: "https://frontface.app/use-cases",
    type: "website",
    siteName: "FrontFace",
    locale: "en_US",
    images: [
      {
        url: "https://frontface.app/blog-og/use-cases.png",
        width: 1200,
        height: 630,
        alt: "FrontFace Use Cases — AI support for SaaS, ecommerce, and services",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@frontface",
    creator: "@frontface",
    title: "FrontFace Use Cases",
    description: "AI support that resolves customer questions instantly — deflects tickets, captures leads, and hands off to humans.",
    images: [
      {
        url: "https://frontface.app/blog-og/use-cases.png",
        width: 1200,
        height: 630,
        alt: "FrontFace Use Cases — AI support for SaaS, ecommerce, and services",
      },
    ],
  },
  alternates: {
    canonical: "https://frontface.app/use-cases",
  },
};

const titleToSlug: Record<string, string> = {
  "SaaS & Startups": "saas",
  "E-commerce Stores": "ecommerce",
  "Agencies": "agencies",
  "Professional Services": "professional-services",
};

const useCases = [
  {
    icon: <Rocket className="w-7 h-7" />,
    title: "SaaS & Startups",
    subtitle: "Technical founders stretched thin",
    description:
      "You're building product AND doing support. Let the agent answer the 'How do I…?' questions from your docs, qualify trials, and route high-intent chats straight to sales.",
    benefits: ["Deflect repetitive tickets", "5-minute setup", "Qualify trial users", "Scale support as you grow"],
    stats: { value: "68%", label: "tickets deflected" },
  },
  {
    icon: <ShoppingCart className="w-7 h-7" />,
    title: "E-commerce Stores",
    subtitle: "Shopify, WooCommerce, custom",
    description:
      "Answer 'Where's my order?', returns and product questions instantly from your own policies. Reduce cart abandonment and turn browsers into buyers.",
    benefits: ["Instant order & returns answers", "Product guidance", "Capture high-intent leads", "24/7 coverage"],
    stats: { value: "89%", label: "questions answered" },
  },
  {
    icon: <Briefcase className="w-7 h-7" />,
    title: "Professional Services",
    subtitle: "Consultants, lawyers, accountants",
    description:
      "Stop answering the same questions 50+ times a month. Let the agent handle 'What are your fees?' and 'How do I get started?' — and capture leads while you focus on billable work.",
    benefits: ["Free up hours every day", "Never miss an inquiry", "24/7 for prospects", "Capture leads automatically"],
    stats: { value: "2+ hrs", label: "saved daily" },
  },
  {
    icon: <Building2 className="w-7 h-7" />,
    title: "Agencies",
    subtitle: "Multi-client support",
    description:
      "Manage agents for multiple clients from a single dashboard, each grounded in its own knowledge base with custom branding.",
    benefits: ["Multi-project management", "Custom branding per client", "Centralized analytics", "Client self-service"],
    stats: { value: "10x", label: "efficiency gain" },
  },
  {
    icon: <GraduationCap className="w-7 h-7" />,
    title: "Education",
    subtitle: "Student & faculty support",
    description:
      "Answer questions about courses, admissions, schedules and policies from your own content. Free up staff to focus on education.",
    benefits: ["24/7 student assistance", "Admissions inquiries", "Course information", "Policy explanations"],
    stats: { value: "60%", label: "inquiry automation" },
  },
  {
    icon: <HeartPulse className="w-7 h-7" />,
    title: "Healthcare",
    subtitle: "Patient engagement",
    description:
      "Provide information about services, scheduling and general inquiries, with clean handoff to a person whenever it's needed.",
    benefits: ["Appointment guidance", "Service information", "Insurance questions", "After-hours support"],
    stats: { value: "40%", label: "call reduction" },
  },
];

const darkPanel: CSSProperties = {
  position: "relative",
  overflow: "hidden",
  background: "linear-gradient(160deg,#11151b,#1b2230 70%,#10141b)",
  color: "#fff",
  padding: "32px 28px",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  textAlign: "center",
  minHeight: 230,
};

export default function UseCasesPage() {
  return (
    <main>
      <PageHero
        eyebrow="Use cases"
        title="One agent. Every kind of customer conversation."
        sub="Whether you run a SaaS, a store, or a services firm, FrontFace resolves customer questions instantly from your own content — capturing leads and handing off cleanly when a human's needed."
      />

      <section style={{ ...WRAP, padding: "clamp(24px,4vh,48px) clamp(20px,5vw,40px)" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {useCases.map((u, i) => (
            <div
              key={u.title}
              className={"reveal ff-uc-card d" + ((i % 3) + 1)}
              style={{
                position: "relative",
                background: "var(--ff-card)",
                border: "1px solid var(--ff-line)",
                borderRadius: 20,
                overflow: "hidden",
                boxShadow: "0 2px 12px -8px rgba(16,24,40,.1)",
                display: "grid",
                gridTemplateColumns: "minmax(0,300px) minmax(0,1fr)",
              }}
            >
              {titleToSlug[u.title] && (
                <Link href={`/use-cases/${titleToSlug[u.title]}`} aria-label={`Learn more about ${u.title}`} style={{ position: "absolute", inset: 0, zIndex: 0 }} />
              )}
              <div className="ff-uc-panel" style={darkPanel}>
                <div
                  className="lattice"
                  style={
                    {
                      position: "absolute",
                      inset: 0,
                      "--lt": "rgba(255,255,255,.05)",
                      "--lt-size": "44px",
                      maskImage: "radial-gradient(120% 80% at 50% 0%, #000 30%, transparent 82%)",
                      WebkitMaskImage: "radial-gradient(120% 80% at 50% 0%, #000 30%, transparent 82%)",
                    } as CSSProperties
                  }
                />
                <div style={{ position: "relative" }}>
                  <span style={{ width: 56, height: 56, borderRadius: 16, background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.14)", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                    {u.icon}
                  </span>
                  <div style={{ fontSize: 40, fontWeight: 800, letterSpacing: "-.03em", lineHeight: 1 }}>{u.stats.value}</div>
                  <div style={{ fontSize: 12.5, color: "rgba(255,255,255,.6)", marginTop: 6 }}>{u.stats.label}</div>
                </div>
              </div>

              <div style={{ padding: "clamp(26px,3vw,36px)" }}>
                <h2 style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-.02em", color: "var(--ff-ink)", lineHeight: 1.15 }}>{u.title}</h2>
                <p style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ff-accent-2)", marginTop: 4 }}>{u.subtitle}</p>
                <p style={{ fontSize: 15, lineHeight: 1.6, color: "var(--ff-soft)", marginTop: 14, textWrap: "pretty" }}>{u.description}</p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: "10px 18px", marginTop: 20 }}>
                  {u.benefits.map((b) => (
                    <div key={b} style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 13.5, color: "var(--ff-text)" }}>
                      <span style={{ width: 18, height: 18, borderRadius: 99, background: "var(--ff-accent-soft)", color: "var(--ff-accent-2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        {Ic("check", { size: 12, sw: 2.6 })}
                      </span>
                      {b}
                    </div>
                  ))}
                </div>
                <Link
                  href="/login"
                  style={{ position: "relative", zIndex: 1, display: "inline-flex", alignItems: "center", gap: 7, marginTop: 22, fontSize: 14, fontWeight: 600, color: "var(--ff-ink)" }}
                >
                  Get started for {u.title.toLowerCase()} {Ic("arrowR", { size: 15 })}
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Custom solution */}
      <section style={{ ...WRAP, padding: "clamp(24px,4vh,48px) clamp(20px,5vw,40px)" }}>
        <div
          className="reveal"
          style={{ position: "relative", overflow: "hidden", borderRadius: 22, border: "1px solid var(--ff-line)", background: "var(--ff-card)", padding: "clamp(32px,4vw,56px)", textAlign: "center", boxShadow: "0 2px 14px -8px rgba(16,24,40,.1)" }}
        >
          <h2 style={{ fontSize: "clamp(24px,3.4vw,36px)", fontWeight: 800, letterSpacing: "-.03em", color: "var(--ff-ink)", lineHeight: 1.1, textWrap: "balance" }}>
            Don&apos;t see your industry?
          </h2>
          <p style={{ fontSize: 16.5, lineHeight: 1.55, color: "var(--ff-soft)", marginTop: 14, maxWidth: 560, marginInline: "auto", textWrap: "pretty" }}>
            FrontFace works for any business that needs intelligent support. Its RAG retrieval adapts to your unique content
            and use case — point it at what you already have.
          </p>
        </div>
      </section>

      <DarkCta
        title="Stop answering the same questions."
        sub="5-minute setup. 89% of questions answered automatically. Free during beta."
      />
    </main>
  );
}
