import { Code } from "lucide-react";
import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import type { CSSProperties, ReactNode } from "react";

import { Link } from "@/i18n/navigation";
import { type Locale } from "@/i18n/routing";
import { localizedAlternates, ogLocale } from "@/lib/seo";

import { Eyebrow, Ic, WRAP } from "../components/marketing-kit";
import { DarkCta, PageHero } from "../components/page-kit";

import { integrations as integrationPages } from "./integrations-data";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "marketing.integrationsIndex.meta" });
  return {
    title: t("title"),
    description: t("description"),
    keywords: [
      "Shopify chatbot",
      "WordPress chatbot",
      "Wix chatbot",
      "website chatbot integration",
      "Slack integration",
      "HubSpot integration",
      "MCP protocol",
    ],
    openGraph: {
      title: t("ogTitle"),
      description: t("ogDescription"),
      url: "https://frontface.app/integrations",
      type: "website",
      siteName: "FrontFace",
      locale: ogLocale(locale as Locale),
      images: [
        {
          url: "https://frontface.app/blog-og/integrations.png",
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
      description: t("twitterDescription"),
      images: [
        {
          url: "https://frontface.app/blog-og/integrations.png",
          width: 1200,
          height: 630,
          alt: t("ogImageAlt"),
        },
      ],
    },
    alternates: localizedAlternates("/integrations"),
  };
}

const slugMap: Record<string, string> = Object.fromEntries(
  integrationPages.map((p) => [p.name, p.slug])
);

/* Names/categories/statuses are structural; display copy comes from
   marketing.integrationsIndex. Order must match the `featured`/`items`
   arrays in the message files. */
const FEATURED: { name: string; category: string; available: boolean; icon: ReactNode }[] = [
  {
    name: "Shopify",
    category: "Ecommerce",
    available: true,
    icon: (
      <svg className="w-7 h-7" viewBox="0 0 24 24" fill="currentColor">
        <path d="M15.5 2.5L14 3l-1 4-2 1v11l6.5-3V5.5l-2-3z" />
        <path d="M11 8l-4.5 2v10l4.5-2V8z" />
        <path d="M6.5 10L4 11v8l2.5-1V10z" />
      </svg>
    ),
  },
  {
    name: "WordPress",
    category: "Website",
    available: true,
    icon: (
      <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <circle cx="12" cy="12" r="9" />
        <path d="M5 8l4 11M12 4v16M19 8l-4 11" />
      </svg>
    ),
  },
  {
    name: "Wix",
    category: "Website",
    available: true,
    icon: (
      <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 7l3.5 10L10 9l3.5 8L17 7" />
        <path d="M19 7v10" />
      </svg>
    ),
  },
];

const ITEMS: { name: string; category: string; available: boolean; localizedName?: boolean }[] = [
  { name: "Squarespace", category: "Website", available: true },
  { name: "Custom Website", category: "Website", available: true, localizedName: true },
  { name: "WooCommerce", category: "Ecommerce", available: true },
  { name: "Slack", category: "Communication", available: false },
  { name: "Email", category: "Communication", available: false },
  { name: "HubSpot", category: "CRM", available: false },
  { name: "Zapier", category: "Automation", available: false },
  { name: "Google Analytics", category: "Analytics", available: false },
  { name: "REST API", category: "Developer", available: true },
  { name: "Webhooks", category: "Developer", available: true },
  { name: "MCP Protocol", category: "Developer", available: true },
  { name: "JavaScript SDK", category: "Developer", available: true },
];

const CATEGORY_KEYS = ["All", "Website", "Ecommerce", "Communication", "CRM", "Automation", "Analytics", "Developer"] as const;

function StatusBadge({ available, label }: { available: boolean; label: string }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: ".02em",
        padding: "4px 9px",
        borderRadius: 99,
        color: available ? "#fff" : "var(--ff-soft)",
        background: available ? "var(--ff-ink)" : "transparent",
        border: available ? "1px solid var(--ff-ink)" : "1px solid var(--ff-line-2)",
      }}
    >
      {available && <span style={{ width: 5, height: 5, borderRadius: 99, background: "#fff" }} />}
      {label}
    </span>
  );
}

const cardStyle: CSSProperties = {
  background: "var(--ff-card)",
  border: "1px solid var(--ff-line)",
  borderRadius: 18,
  padding: "24px 22px",
};

export default async function IntegrationsPage() {
  const t = await getTranslations("marketing.integrationsIndex");
  const featuredCopy = t.raw("featured") as { description: string }[];
  const itemsCopy = t.raw("items") as { description: string }[];
  const statusLabel = (available: boolean) =>
    available ? t("statusAvailable") : t("statusComingSoon");
  return (
    <main>
      <PageHero
        eyebrow={t("hero.eyebrow")}
        title={t("hero.title")}
        sub={t("hero.sub")}
      />

      {/* Featured */}
      <section style={{ ...WRAP, padding: "clamp(24px,4vh,48px) clamp(20px,5vw,40px)" }}>
        <div className="reveal" style={{ marginBottom: 28 }}>
          <Eyebrow>{t("featuredEyebrow")}</Eyebrow>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 18 }}>
          {FEATURED.map((it, i) => (
            <div key={it.name} className={"reveal ff-cap-card d" + ((i % 3) + 1)} style={{ ...cardStyle, position: "relative" }}>
              {slugMap[it.name] && (
                <Link href={`/integrations/${slugMap[it.name]}`} aria-label={`${it.name} integration`} style={{ position: "absolute", inset: 0, zIndex: 0 }} />
              )}
              <div style={{ position: "absolute", top: 18, insetInlineEnd: 18 }}>
                <StatusBadge available={it.available} label={statusLabel(it.available)} />
              </div>
              <span style={{ width: 52, height: 52, borderRadius: 14, background: "var(--ff-ink)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                {it.icon}
              </span>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".06em", color: "var(--ff-muted)", textTransform: "uppercase" }}>{t(`categories.${it.category}`)}</span>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: "var(--ff-ink)", letterSpacing: "-.01em", marginTop: 4, marginBottom: 8 }}>{it.name}</h3>
              <p style={{ fontSize: 13.5, lineHeight: 1.55, color: "var(--ff-soft)", textWrap: "pretty" }}>{featuredCopy[i]?.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* All integrations */}
      <section style={{ ...WRAP, padding: "clamp(24px,4vh,48px) clamp(20px,5vw,40px)" }}>
        <div className="reveal" style={{ textAlign: "center", maxWidth: 560, margin: "0 auto 28px" }}>
          <h2 style={{ fontSize: "clamp(26px,3.8vw,42px)", fontWeight: 800, letterSpacing: "-.03em", color: "var(--ff-ink)", lineHeight: 1.08, textWrap: "balance" }}>
            {t("allTitle")}
          </h2>
          <p style={{ fontSize: 16.5, lineHeight: 1.55, color: "var(--ff-soft)", marginTop: 14, textWrap: "pretty" }}>
            {t("allSub")}
          </p>
        </div>

        <div className="reveal" style={{ display: "flex", flexWrap: "wrap", gap: 9, justifyContent: "center", marginBottom: 36 }}>
          {CATEGORY_KEYS.map((c, i) => {
            const on = i === 0;
            return (
              <span
                key={c}
                style={{
                  padding: "8px 15px",
                  borderRadius: 99,
                  fontSize: 13,
                  fontWeight: 600,
                  border: "1px solid " + (on ? "var(--ff-ink)" : "var(--ff-line-2)"),
                  background: on ? "var(--ff-ink)" : "#fff",
                  color: on ? "#fff" : "var(--ff-soft)",
                }}
              >
                {t(`categories.${c}`)}
              </span>
            );
          })}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 18 }}>
          {ITEMS.map((it, i) => (
            <div key={it.name} className={"reveal ff-cap-card d" + ((i % 3) + 1)} style={{ ...cardStyle, position: "relative" }}>
              {slugMap[it.name] && (
                <Link href={`/integrations/${slugMap[it.name]}`} aria-label={`${it.name} integration`} style={{ position: "absolute", inset: 0, zIndex: 0 }} />
              )}
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
                <span style={{ width: 40, height: 40, borderRadius: 11, background: "var(--ff-accent-soft)", color: "var(--ff-accent-2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Code className="w-5 h-5" />
                </span>
                <StatusBadge available={it.available} label={statusLabel(it.available)} />
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".06em", color: "var(--ff-muted)", textTransform: "uppercase" }}>{t(`categories.${it.category}`)}</span>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--ff-ink)", letterSpacing: "-.01em", marginTop: 4, marginBottom: 7 }}>
                {it.localizedName ? t("customName") : it.name}
              </h3>
              <p style={{ fontSize: 13.5, lineHeight: 1.55, color: "var(--ff-soft)", textWrap: "pretty" }}>{itemsCopy[i]?.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* One line of code (dark) */}
      <section style={{ ...WRAP, padding: "clamp(32px,5vh,64px) clamp(20px,5vw,40px)" }}>
        <div
          className="reveal ff-code-split"
          style={{
            position: "relative",
            overflow: "hidden",
            borderRadius: 24,
            background: "linear-gradient(160deg,#11151b,#0d1117)",
            color: "#fff",
            padding: "clamp(32px,4vw,56px)",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "clamp(28px,4vw,48px)",
            alignItems: "center",
          }}
        >
          <div
            className="lattice"
            style={
              {
                position: "absolute",
                inset: 0,
                "--lt": "rgba(255,255,255,.045)",
                "--lt-size": "60px",
                maskImage: "radial-gradient(120% 100% at 0% 0%, #000 30%, transparent 80%)",
                WebkitMaskImage: "radial-gradient(120% 100% at 0% 0%, #000 30%, transparent 80%)",
              } as CSSProperties
            }
          />
          <div style={{ position: "relative" }}>
            <Eyebrow light>{t("setupEyebrow")}</Eyebrow>
            <h2 style={{ fontSize: "clamp(26px,3.4vw,38px)", fontWeight: 800, letterSpacing: "-.03em", lineHeight: 1.08, textWrap: "balance" }}>
              {t("setupTitle")}
            </h2>
            <p style={{ fontSize: 15.5, lineHeight: 1.6, color: "rgba(255,255,255,.62)", marginTop: 14, marginBottom: 22, textWrap: "pretty" }}>
              {t("setupBody")}
            </p>
            <Link href="/login" style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 14.5, fontWeight: 600, color: "#fff" }}>
              {t("getStartedFree")} {Ic("arrowR", { size: 16 })}
            </Link>
          </div>
          <div style={{ position: "relative", borderRadius: 14, overflow: "hidden", border: "1px solid rgba(255,255,255,.1)", background: "#0b0e13" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "10px 14px", borderBottom: "1px solid rgba(255,255,255,.08)" }}>
              {["#3a4150", "#2f3543", "#262b37"].map((c) => (
                <span key={c} style={{ width: 9, height: 9, borderRadius: 99, background: c }} />
              ))}
              <span className="mono" style={{ marginInlineStart: 6, fontSize: 11, color: "rgba(255,255,255,.4)" }}>index.html</span>
            </div>
            <pre className="mono" dir="ltr" style={{ margin: 0, padding: "16px 16px", fontSize: 12.5, lineHeight: 1.75, color: "rgba(255,255,255,.85)", overflowX: "auto" }}>
              <span style={{ color: "#6b7686" }}>&lt;!-- Add before &lt;/body&gt; --&gt;</span>
              {"\n"}
              <span style={{ color: "#7aa2f7" }}>&lt;script</span>
              {"\n  "}
              <span style={{ color: "#9ece6a" }}>src</span>=<span style={{ color: "#e0af68" }}>&quot;https://cdn.frontface.app/widget.js&quot;</span>
              {"\n  "}
              <span style={{ color: "#9ece6a" }}>data-agent-id</span>=<span style={{ color: "#e0af68" }}>&quot;your-agent-id&quot;</span>
              {"\n"}
              <span style={{ color: "#7aa2f7" }}>&gt;&lt;/script&gt;</span>
            </pre>
          </div>
        </div>
      </section>

      <DarkCta
        title={t("ctaTitle")}
        sub={t("ctaSub")}
        secondaryLabel={t("ctaSecondary")}
        secondaryHref="mailto:hello@frontface.app"
      />
    </main>
  );
}
