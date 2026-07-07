import { Target, Users, Zap, Heart } from "lucide-react";
import { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { type Locale } from "@/i18n/routing";
import { localizedAlternates, ogLocale } from "@/lib/seo";

import { Btn } from "../components/marketing-button";
import { Ic, WRAP } from "../components/marketing-kit";
import { DarkCta, PageHero } from "../components/page-kit";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "marketing.about.meta" });
  return {
    title: t("title"),
    description: t("description"),
    keywords: [
      "about FrontFace",
      "AI support agent",
      "AI customer support",
      "knowledge base AI",
      "RAG chatbot",
    ],
    openGraph: {
      title: t("ogTitle"),
      description: t("ogDescription"),
      url: "https://frontface.app/about",
      type: "website",
      siteName: "FrontFace",
      locale: ogLocale(locale as Locale),
      images: [
        {
          url: "https://frontface.app/blog-og/about.png",
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
      title: t("ogTitle"),
      description: t("ogDescription"),
      images: [
        {
          url: "https://frontface.app/blog-og/about.png",
          width: 1200,
          height: 630,
          alt: t("ogImageAlt"),
        },
      ],
    },
    alternates: localizedAlternates("/about"),
  };
}

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: "https://frontface.app" },
    { "@type": "ListItem", position: 2, name: "About", item: "https://frontface.app/about" },
  ],
};

const valueIcons = [
  <Zap key="zap" className="w-5 h-5" />,
  <Target key="target" className="w-5 h-5" />,
  <Users key="users" className="w-5 h-5" />,
  <Heart key="heart" className="w-5 h-5" />,
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

export default async function AboutPage() {
  const t = await getTranslations("marketing.about");
  const story = t.raw("story") as string[];
  const stats = t.raw("stats") as { value: string; label: string }[];
  const values = t.raw("values") as { title: string; description: string }[];
  return (
    <>
      <script id="about-breadcrumb-schema" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
    <main>
      <PageHero
        eyebrow={t("hero.eyebrow")}
        title={t("hero.title")}
        sub={t("hero.sub")}
      />

      {/* Story */}
      <section style={{ ...WRAP, maxWidth: 760, padding: "clamp(32px,5vh,56px) clamp(20px,5vw,40px)" }}>
        <h2
          className="reveal"
          style={{ fontSize: "clamp(26px,3.4vw,38px)", fontWeight: 800, letterSpacing: "-.03em", color: "var(--ff-ink)", lineHeight: 1.1, marginBottom: 24, textWrap: "balance" }}
        >
          {t("storyTitle")}
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
            {t("valuesTitle")}
          </h2>
          <p style={{ fontSize: 16.5, lineHeight: 1.55, color: "var(--ff-soft)", marginTop: 14, textWrap: "pretty" }}>
            {t("valuesSub")}
          </p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 18 }}>
          {values.map((v, i) => (
            <div key={v.title} className={"reveal d" + ((i % 4) + 1)} style={cardStyle}>
              <span style={iconChip}>{valueIcons[i]}</span>
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
            {t("visionTitle")}
          </h2>
          <p style={{ fontSize: 18, lineHeight: 1.6, color: "var(--ff-soft)", marginTop: 16, maxWidth: 640, marginInline: "auto", textWrap: "pretty" }}>
            {t("visionBody")}
          </p>
          <div style={{ marginTop: 26, display: "flex", justifyContent: "center" }}>
            <Btn kind="primary" size="lg" href="/login">
              {t("startFree")} {Ic("arrowR", { size: 18 })}
            </Btn>
          </div>
        </div>
      </section>

      <DarkCta
        title={t("ctaTitle")}
        sub={t("ctaSub")}
        secondaryLabel={t("ctaSecondary")}
        secondaryHref="/features"
      />
    </main>
    </>
  );
}
