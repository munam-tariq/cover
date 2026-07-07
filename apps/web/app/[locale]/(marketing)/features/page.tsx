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
import { getTranslations } from "next-intl/server";

import { type Locale } from "@/i18n/routing";
import { localizedAlternates, ogLocale } from "@/lib/seo";

import { Eyebrow, WRAP } from "../components/marketing-kit";
import { DarkCta, PageHero } from "../components/page-kit";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "marketing.features.meta" });
  return {
    title: t("title"),
    description: t("description"),
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
      title: t("ogTitle"),
      description: t("ogDescription"),
      url: "https://frontface.app/features",
      type: "website",
      siteName: "FrontFace",
      locale: ogLocale(locale as Locale),
      images: [
        {
          url: "https://frontface.app/blog-og/features.png",
          width: 1200,
          height: 630,
          alt: t("ogImageAlt"),
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      site: "@frontface",
      creator: "@frontface",
      title: t("twitterTitle"),
      description: t("twitterDescription"),
      images: [
        {
          url: "https://frontface.app/blog-og/features.png",
          width: 1200,
          height: 630,
          alt: t("ogImageAlt"),
        },
      ],
    },
    alternates: localizedAlternates("/features"),
  };
}

const coreIcons = [
  <Brain key="brain" className="w-5 h-5" />,
  <Users key="users" className="w-5 h-5" />,
  <Upload key="upload" className="w-5 h-5" />,
  <Sparkles key="sparkles" className="w-5 h-5" />,
];

const additionalIcons = [
  <Globe key="globe" className="w-5 h-5" />,
  <Zap key="zap" className="w-5 h-5" />,
  <BarChart3 key="chart" className="w-5 h-5" />,
  <Palette key="palette" className="w-5 h-5" />,
  <Shield key="shield" className="w-5 h-5" />,
  <MessageSquare key="message" className="w-5 h-5" />,
  <Workflow key="workflow" className="w-5 h-5" />,
  <Code key="code" className="w-5 h-5" />,
];

// SEO schemas stay English — they target the EN-indexed canonical.
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

export default async function FeaturesPage() {
  const t = await getTranslations("marketing.features");
  const coreFeatures = t.raw("core") as { title: string; description: string; highlight: string }[];
  const additionalFeatures = t.raw("additional") as { title: string; description: string }[];
  const steps = t.raw("steps") as { title: string; description: string }[];
  return (
    <>
      <script id="features-howto-schema" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(howToSchema) }} />
      <script id="features-breadcrumb-schema" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <main>
      <PageHero
        eyebrow={t("hero.eyebrow")}
        title={t("hero.title")}
        sub={t("hero.sub")}
      />

      {/* Core features */}
      <section style={{ ...WRAP, padding: "clamp(32px,5vh,64px) clamp(20px,5vw,40px)" }}>
        <div className="reveal" style={{ marginBottom: 36 }}>
          <Eyebrow>{t("coreEyebrow")}</Eyebrow>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 18 }}>
          {coreFeatures.map((f, i) => (
            <div key={f.title} className={"reveal d" + ((i % 2) + 1)} style={cardStyle}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
                <span style={inkChip}>{coreIcons[i]}</span>
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
            {t("additionalTitle")}
          </h2>
          <p style={{ fontSize: 16.5, lineHeight: 1.55, color: "var(--ff-soft)", marginTop: 14, textWrap: "pretty" }}>
            {t("additionalSub")}
          </p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 18 }}>
          {additionalFeatures.map((f, i) => (
            <div key={f.title} className={"reveal ff-cap-card d" + ((i % 4) + 1)} style={cardStyle}>
              <span style={softChip}>{additionalIcons[i]}</span>
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
            {t("stepsTitle")}
          </h2>
          <p style={{ fontSize: 16.5, lineHeight: 1.55, color: "var(--ff-soft)", marginTop: 14, textWrap: "pretty" }}>
            {t("stepsSub")}
          </p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 18 }}>
          {steps.map((s, i) => (
            <div key={s.title} className={"reveal d" + (i + 1)} style={{ ...cardStyle, padding: "26px 24px" }}>
              <div style={{ ...inkChip, width: 46, height: 46, borderRadius: 13, fontWeight: 800, fontSize: 16, marginBottom: 16 }} className="mono">
                {`0${i + 1}`}
              </div>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: "var(--ff-ink)", letterSpacing: "-.01em", marginBottom: 8 }}>{s.title}</h3>
              <p style={{ fontSize: 14, lineHeight: 1.6, color: "var(--ff-soft)", textWrap: "pretty" }}>{s.description}</p>
            </div>
          ))}
        </div>
      </section>

      <DarkCta
        title={t("ctaTitle")}
        sub={t("ctaSub")}
        secondaryLabel={t("ctaSecondary")}
        secondaryHref="/use-cases"
      />
    </main>
    </>
  );
}
