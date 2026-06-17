import { Target, Users, Zap, Heart } from "lucide-react";
import { Metadata } from "next";

import { Btn } from "../components/marketing-button";
import { Ic, WRAP } from "../components/marketing-kit";
import { DarkCta, PageHero } from "../components/page-kit";

export const metadata: Metadata = {
  title: "About — AI Support That Resolves Customer Questions Instantly",
  description:
    "FrontFace resolves customer questions instantly from your knowledge base — with cited sources — so you support more customers without hiring more agents. Lead capture and human handoff included.",
  keywords: [
    "about FrontFace",
    "AI support agent",
    "AI customer support",
    "knowledge base AI",
    "RAG chatbot",
  ],
  openGraph: {
    title: "About FrontFace",
    description:
      "Resolve customer questions instantly from your knowledge base — with cited sources, lead capture, and human handoff. Built for lean teams.",
    url: "https://frontface.app/about",
    type: "website",
    siteName: "FrontFace",
    locale: "en_US",
    images: [
      {
        url: "https://frontface.app/blog-og/about.png",
        width: 1200,
        height: 630,
        alt: "About FrontFace — AI support agent that resolves customer questions instantly",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@frontface",
    creator: "@frontface",
    title: "About FrontFace",
    description:
      "Resolve customer questions instantly from your knowledge base — cited answers, lead capture, and human handoff.",
    images: [
      {
        url: "https://frontface.app/blog-og/about.png",
        width: 1200,
        height: 630,
        alt: "About FrontFace — AI support agent that resolves customer questions instantly",
      },
    ],
  },
  alternates: {
    canonical: "https://frontface.app/about",
  },
};

const values = [
  {
    icon: <Zap className="w-5 h-5" />,
    title: "Speed Over Everything",
    description:
      "Your time is valuable. That's why FrontFace takes 5 minutes to set up — not days or weeks. No consultants, no complicated setup.",
  },
  {
    icon: <Target className="w-5 h-5" />,
    title: "Simple By Design",
    description:
      "You shouldn't need to be technical to use AI. Point it at your site or upload your docs, paste one line of code, and you're live.",
  },
  {
    icon: <Users className="w-5 h-5" />,
    title: "Built for Lean Teams",
    description:
      "We know support and growth teams are stretched thin. FrontFace handles the repetitive questions so you can focus on what matters.",
  },
  {
    icon: <Heart className="w-5 h-5" />,
    title: "Customer Obsession",
    description:
      "Every feature we build starts with a customer problem. We talk to users constantly and iterate based on real feedback.",
  },
];

const stats = [
  { value: "5 min", label: "Setup time" },
  { value: "89%", label: "Questions answered by AI" },
  { value: "24/7", label: "Always-on availability" },
  { value: "Free", label: "During beta" },
];

const story = [
  "FrontFace started with a simple observation: teams spend hours every week answering the same questions over and over. “What are your hours?” “What's your return policy?” “Do you support SSO?”",
  "Every hour spent on basic questions is an hour not spent on real work. Slow responses mean lost customers and missed leads. The problem was clear — but the solutions weren't.",
  "Enterprise chatbots cost thousands per month. Static FAQ pages don't actually answer questions. And generic AI confidently makes things up about your product.",
  "We built FrontFace to change that: an AI support agent that's trained on YOUR content, answers from it with cited sources, captures leads, and hands off cleanly to a human — live in 5 minutes, no technical skills required.",
];

const cardStyle = {
  background: "var(--ff-card)",
  border: "1px solid var(--ff-line)",
  borderRadius: 18,
  padding: "26px 24px",
  boxShadow: "0 2px 10px -6px rgba(16,24,40,.08)",
} as const;

const iconChip = {
  width: 46,
  height: 46,
  borderRadius: 13,
  background: "var(--ff-accent-soft)",
  color: "var(--ff-accent-2)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  marginBottom: 16,
} as const;

export default function AboutPage() {
  return (
    <main>
      <PageHero
        eyebrow="About us"
        title="Great support shouldn't need a big team."
        sub="FrontFace exists because every business deserves great customer support — without hiring a team or spending thousands on enterprise software."
      />

      {/* Story */}
      <section style={{ ...WRAP, maxWidth: 760, padding: "clamp(32px,5vh,56px) clamp(20px,5vw,40px)" }}>
        <h2
          className="reveal"
          style={{ fontSize: "clamp(26px,3.4vw,38px)", fontWeight: 800, letterSpacing: "-.03em", color: "var(--ff-ink)", lineHeight: 1.1, marginBottom: 24, textWrap: "balance" }}
        >
          Our story
        </h2>
        <div className="reveal d1">
          {story.map((p, i) => (
            <p key={i} style={{ fontSize: 17.5, lineHeight: 1.72, color: "#2a323d", marginBottom: 20, textWrap: "pretty" }}>
              {p}
            </p>
          ))}
        </div>
      </section>

      {/* Stats */}
      <section style={{ ...WRAP, padding: "clamp(8px,2vh,24px) clamp(20px,5vw,40px) clamp(32px,5vh,56px)" }}>
        <div
          className="reveal"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))",
            gap: 1,
            background: "var(--ff-line)",
            borderRadius: 20,
            overflow: "hidden",
            border: "1px solid var(--ff-line)",
          }}
        >
          {stats.map((s) => (
            <div key={s.label} style={{ background: "var(--ff-card)", padding: "30px 26px", textAlign: "center" }}>
              <div style={{ fontSize: "clamp(30px,4vw,44px)", fontWeight: 800, letterSpacing: "-.03em", color: "var(--ff-ink)", lineHeight: 1 }}>
                {s.value}
              </div>
              <div style={{ fontSize: 13.5, color: "var(--ff-soft)", marginTop: 10, fontWeight: 500 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Values */}
      <section style={{ ...WRAP, padding: "clamp(40px,6vh,80px) clamp(20px,5vw,40px)" }}>
        <div className="reveal" style={{ textAlign: "center", maxWidth: 560, margin: "0 auto 40px" }}>
          <h2 style={{ fontSize: "clamp(26px,3.8vw,42px)", fontWeight: 800, letterSpacing: "-.03em", color: "var(--ff-ink)", lineHeight: 1.08, textWrap: "balance" }}>
            What we believe
          </h2>
          <p style={{ fontSize: 16.5, lineHeight: 1.55, color: "var(--ff-soft)", marginTop: 14, textWrap: "pretty" }}>
            These principles guide every decision we make — from product features to customer conversations.
          </p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 18 }}>
          {values.map((v, i) => (
            <div key={v.title} className={"reveal d" + ((i % 4) + 1)} style={cardStyle}>
              <span style={iconChip}>{v.icon}</span>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: "var(--ff-ink)", letterSpacing: "-.01em", marginBottom: 8 }}>{v.title}</h3>
              <p style={{ fontSize: 14, lineHeight: 1.6, color: "var(--ff-soft)", textWrap: "pretty" }}>{v.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Vision */}
      <section style={{ ...WRAP, padding: "clamp(8px,2vh,24px) clamp(20px,5vw,40px) clamp(40px,6vh,72px)" }}>
        <div
          className="reveal"
          style={{ position: "relative", overflow: "hidden", borderRadius: 24, border: "1px solid var(--ff-line)", background: "var(--ff-card)", padding: "clamp(36px,5vw,64px)", textAlign: "center", boxShadow: "0 2px 14px -8px rgba(16,24,40,.1)" }}
        >
          <span style={{ ...iconChip, margin: "0 auto 18px", width: 52, height: 52, borderRadius: 15, background: "var(--ff-ink)", color: "#fff" }}>
            {Ic("target", { size: 26 })}
          </span>
          <h2 style={{ fontSize: "clamp(24px,3.4vw,36px)", fontWeight: 800, letterSpacing: "-.03em", color: "var(--ff-ink)", lineHeight: 1.1, textWrap: "balance" }}>
            Our vision
          </h2>
          <p style={{ fontSize: 18, lineHeight: 1.6, color: "var(--ff-soft)", marginTop: 16, maxWidth: 640, marginInline: "auto", textWrap: "pretty" }}>
            Every business should give customers the same instant, accurate support as the biggest companies — without the
            big-company budget. AI should handle the routine so you can focus on what actually matters. We&apos;re just
            getting started.
          </p>
          <div style={{ marginTop: 26, display: "flex", justifyContent: "center" }}>
            <Btn kind="primary" size="lg" href="/login">
              Start free {Ic("arrowR", { size: 18 })}
            </Btn>
          </div>
        </div>
      </section>

      <DarkCta
        title="Ready to give every customer an answer?"
        sub="5-minute setup. 89% of questions answered automatically. Free during beta."
        secondaryLabel="See features"
        secondaryHref="/features"
      />
    </main>
  );
}
