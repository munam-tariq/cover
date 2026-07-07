import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { type Locale } from "@/i18n/routing";
import { localizedAlternates, ogLocale } from "@/lib/seo";

import { Eyebrow, Ic, WRAP } from "../components/marketing-kit";
import { DarkCta, PageHero } from "../components/page-kit";

import { tools } from "./tools-data";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "marketing.toolsIndex.meta" });
  return {
    title: t("title"),
    description: t("description"),
    alternates: localizedAlternates("/tools"),
    openGraph: {
      title: t("ogTitle"),
      description: t("ogDescription"),
      url: "https://frontface.app/tools",
      type: "website",
      siteName: "FrontFace",
      locale: ogLocale(locale as Locale),
      images: [
        {
          url: "https://frontface.app/og-image.png",
          width: 1200,
          height: 630,
          alt: t("ogImageAlt"),
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: t("ogTitle"),
      description: t("ogDescription"),
      images: ["https://frontface.app/og-image.png"],
    },
  };
}

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: "https://frontface.app" },
    { "@type": "ListItem", position: 2, name: "Tools", item: "https://frontface.app/tools" },
  ],
};

const collectionSchema = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: "Free AI Support Tools",
  url: "https://frontface.app/tools",
  description:
    "Free calculators, checklists, and planning tools for AI customer support.",
  hasPart: tools.map((tool) => ({
    "@type": "WebApplication",
    name: tool.name,
    url: tool.canonical,
    applicationCategory: "BusinessApplication",
    description: tool.description,
  })),
};

export default async function ToolsPage() {
  const t = await getTranslations("marketing.toolsIndex");
  const tCopy = await getTranslations("marketing.toolCopy");
  return (
    <>
      <script id="tools-breadcrumb-schema" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <script
        id="tools-collection-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema) }}
      />
      <main style={{ overflowX: "hidden" }}>
        <PageHero
          eyebrow={t("hero.eyebrow")}
          title={t("hero.title")}
          sub={t("hero.sub")}
        />

        <section style={{ ...WRAP, padding: "clamp(28px,6vh,72px) clamp(20px,5vw,40px)" }}>
          <div className="reveal">
            <Eyebrow>{t("startHere")}</Eyebrow>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))",
              gap: 18,
              marginTop: 20,
            }}
          >
            {tools.map((tool) => (
              <Link
                key={tool.slug}
                href={`/tools/${tool.slug}`}
                className="reveal d1"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  minHeight: 240,
                  border: "1px solid var(--ff-line)",
                  borderRadius: 18,
                  background: "#fff",
                  padding: 24,
                  textDecoration: "none",
                  color: "inherit",
                  boxShadow: "0 18px 48px -34px rgba(16,24,40,.28)",
                }}
              >
                <span
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: 14,
                    background: "var(--ff-ink)",
                    color: "#fff",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 18,
                  }}
                >
                  {Ic("chart", { size: 21 })}
                </span>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 800,
                    letterSpacing: ".1em",
                    textTransform: "uppercase",
                    color: "var(--ff-muted)",
                  }}
                >
                  {t(`categoryLabels.${tool.category}`)}
                </span>
                <h2
                  style={{
                    fontSize: 24,
                    fontWeight: 850,
                    letterSpacing: "-.025em",
                    lineHeight: 1.12,
                    color: "var(--ff-ink)",
                    margin: "10px 0 10px",
                    textWrap: "balance",
                  }}
                >
                  {tCopy(`${tool.slug}.title`)}
                </h2>
                <p
                  style={{
                    fontSize: 14.5,
                    lineHeight: 1.6,
                    color: "var(--ff-soft)",
                    margin: 0,
                    textWrap: "pretty",
                  }}
                >
                  {tCopy(`${tool.slug}.description`)}
                </p>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    marginTop: "auto",
                    paddingTop: 22,
                    fontSize: 14,
                    fontWeight: 750,
                    color: "var(--ff-ink)",
                  }}
                >
                  {t("openCalculator")} {Ic("arrowR", { size: 15, sw: 2 })}
                </span>
              </Link>
            ))}
          </div>
        </section>

        <DarkCta
          title={t("ctaTitle")}
          sub={t("ctaSub")}
        />
      </main>
    </>
  );
}
