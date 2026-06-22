import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Eyebrow, WRAP } from "../../components/marketing-kit";
import { DarkCta, PageHero } from "../../components/page-kit";
import { integrations } from "../../integrations/integrations-data";
import { useCases } from "../../use-cases/use-cases-data";
import { vsPages } from "../vs-data";

export function generateStaticParams() {
  return vsPages.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const d = vsPages.find((p) => p.slug === slug);
  if (!d) return {};
  return {
    // `absolute` skips the "%s | FrontFace" template — these titles already
    // start with "FrontFace vs …", so the suffix would be redundant and push
    // them past the 70-char limit.
    title: { absolute: d.metaTitle },
    description: d.metaDescription,
    keywords: d.metaKeywords,
    openGraph: {
      title: d.metaTitle,
      description: d.metaDescription,
      url: d.canonical,
      type: "website",
      siteName: "FrontFace",
      locale: "en_US",
      images: [{ url: d.ogImage, width: 1200, height: 630, alt: d.ogImageAlt }],
    },
    twitter: {
      card: "summary_large_image",
      site: "@frontface",
      creator: "@frontface",
      title: d.metaTitle,
      description: d.metaDescription,
      images: [{ url: d.ogImage, width: 1200, height: 630, alt: d.ogImageAlt }],
    },
    alternates: { canonical: d.canonical },
  };
}

const cardStyle = {
  background: "var(--ff-card)",
  border: "1px solid var(--ff-line)",
  borderRadius: 18,
  padding: "24px 22px",
} as const;

const winnerBadge = (winner: "frontface" | "competitor" | "tie", side: "frontface" | "competitor") => {
  if (winner === "tie") return null;
  if (winner !== side) return null;
  return (
    <span
      style={{
        display: "inline-block",
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: ".04em",
        textTransform: "uppercase",
        color: "var(--ff-accent-2)",
        background: "var(--ff-accent-soft)",
        borderRadius: 6,
        padding: "2px 7px",
        marginLeft: 6,
        verticalAlign: "middle",
      }}
    >
      ✓
    </span>
  );
};

export default async function VsSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const d = vsPages.find((p) => p.slug === slug);
  if (!d) notFound();

  const relatedUseCase = d.relatedUseCaseSlug ? useCases.find((u) => u.slug === d.relatedUseCaseSlug) : null;
  const relatedIntegration = d.relatedIntegrationSlug ? integrations.find((i) => i.slug === d.relatedIntegrationSlug) : null;

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: d.faqs.map((faq) => ({
      "@type": "Question",
      name: faq.q,
      acceptedAnswer: { "@type": "Answer", text: faq.a },
    })),
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://frontface.app" },
      { "@type": "ListItem", position: 2, name: "Compare", item: "https://frontface.app/vs" },
      { "@type": "ListItem", position: 3, name: d.heroTitle, item: d.canonical },
    ],
  };

  return (
    <>
      <script
        id={"vs-" + d.slug + "-faq-schema"}
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <script
        id={"vs-" + d.slug + "-breadcrumb-schema"}
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <main>
        <PageHero
          eyebrow={"FrontFace vs " + d.competitorName}
          title={d.heroTitle}
          sub={d.heroSub}
        />

        {/* Comparison table */}
        <section style={{ ...WRAP, padding: "clamp(32px,5vh,64px) clamp(20px,5vw,40px)" }}>
          <div className="reveal" style={{ marginBottom: 28 }}>
            <Eyebrow>Feature comparison</Eyebrow>
          </div>
          <div
            className="reveal"
            style={{
              maxWidth: 860,
              margin: "0 auto",
              border: "1px solid var(--ff-line)",
              borderRadius: 18,
              overflow: "hidden",
            }}
          >
            {/* Table header */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                background: "var(--ff-ink)",
                color: "#fff",
                padding: "14px 20px",
                gap: 16,
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: ".01em", color: "rgba(255,255,255,.55)" }}>
                Feature
              </div>
              <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: "-.01em" }}>FrontFace</div>
              <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: "-.01em", color: "rgba(255,255,255,.75)" }}>
                {d.competitorName}
              </div>
            </div>
            {/* Table rows */}
            {d.comparison.map((row, i) => (
              <div
                key={row.feature}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  padding: "14px 20px",
                  gap: 16,
                  background: i % 2 === 0 ? "var(--ff-card)" : "#fff",
                  borderTop: "1px solid var(--ff-line)",
                  alignItems: "start",
                }}
              >
                <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ff-soft)" }}>
                  {row.feature}
                </div>
                <div style={{ fontSize: 13.5, color: "var(--ff-ink)", fontWeight: row.winner === "frontface" ? 700 : 400 }}>
                  {row.frontface}
                  {winnerBadge(row.winner, "frontface")}
                </div>
                <div style={{ fontSize: 13.5, color: row.winner === "competitor" ? "var(--ff-ink)" : "var(--ff-soft)", fontWeight: row.winner === "competitor" ? 700 : 400 }}>
                  {row.competitor}
                  {winnerBadge(row.winner, "competitor")}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Verdict cards */}
        <section style={{ ...WRAP, padding: "clamp(24px,4vh,48px) clamp(20px,5vw,40px)" }}>
          <div className="reveal" style={{ marginBottom: 28 }}>
            <Eyebrow>Which one is right for you?</Eyebrow>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
              gap: 18,
              maxWidth: 860,
              margin: "0 auto",
            }}
          >
            {/* FrontFace verdict */}
            <div
              className="reveal d1"
              style={{
                ...cardStyle,
                borderColor: "var(--ff-accent-2)",
                background: "var(--ff-accent-soft)",
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 800,
                  letterSpacing: ".06em",
                  textTransform: "uppercase",
                  color: "var(--ff-accent-2)",
                  marginBottom: 12,
                }}
              >
                Choose FrontFace if…
              </div>
              <p style={{ fontSize: 15, lineHeight: 1.65, color: "var(--ff-ink)", margin: 0, textWrap: "pretty" }}>
                {d.verdictFrontface}
              </p>
              <div style={{ marginTop: 18 }}>
                <Link
                  href="/login"
                  style={{
                    display: "inline-block",
                    fontSize: 13.5,
                    fontWeight: 700,
                    color: "#fff",
                    background: "var(--ff-ink)",
                    borderRadius: 10,
                    padding: "9px 18px",
                    textDecoration: "none",
                  }}
                >
                  Try FrontFace free →
                </Link>
              </div>
            </div>
            {/* Competitor verdict */}
            <div className="reveal d2" style={cardStyle}>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 800,
                  letterSpacing: ".06em",
                  textTransform: "uppercase",
                  color: "var(--ff-muted)",
                  marginBottom: 12,
                }}
              >
                Choose {d.competitorName} if…
              </div>
              <p style={{ fontSize: 15, lineHeight: 1.65, color: "var(--ff-soft)", margin: 0, textWrap: "pretty" }}>
                {d.verdictCompetitor}
              </p>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section style={{ ...WRAP, padding: "clamp(32px,5vh,64px) clamp(20px,5vw,40px)" }}>
          <div
            className="reveal"
            style={{ textAlign: "center", maxWidth: 560, margin: "0 auto 44px" }}
          >
            <h2
              style={{
                fontSize: "clamp(26px,3.8vw,42px)",
                fontWeight: 800,
                letterSpacing: "-.03em",
                color: "var(--ff-ink)",
                lineHeight: 1.08,
                textWrap: "balance",
              }}
            >
              Have questions about FrontFace vs {d.competitorName}?
            </h2>
          </div>
          <dl
            style={{
              maxWidth: 720,
              margin: "0 auto",
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            {d.faqs.map((faq, i) => (
              <div
                key={i}
                className="reveal"
                style={{ ...cardStyle, padding: "20px 24px" }}
              >
                <dt
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: "var(--ff-ink)",
                    letterSpacing: "-.01em",
                    marginBottom: 10,
                  }}
                >
                  {faq.q}
                </dt>
                <dd
                  style={{
                    fontSize: 14.5,
                    lineHeight: 1.65,
                    color: "var(--ff-soft)",
                    margin: 0,
                    textWrap: "pretty",
                  }}
                >
                  {faq.a}
                </dd>
              </div>
            ))}
          </dl>

          {/* Related resources */}
          {(d.relatedBlogSlug || relatedUseCase || relatedIntegration) && (
            <div
              className="reveal"
              style={{
                maxWidth: 720,
                margin: "24px auto 0",
                border: "1px solid var(--ff-line)",
                borderRadius: 16,
                background: "#fff",
                padding: "20px 22px",
              }}
            >
              <h3
                style={{
                  fontSize: 17,
                  fontWeight: 800,
                  color: "var(--ff-ink)",
                  letterSpacing: "-.01em",
                  margin: "0 0 12px",
                }}
              >
                Related resources
              </h3>
              <div style={{ display: "grid", gap: 9 }}>
                {d.relatedBlogSlug && (
                  <Link
                    href={"/blog/" + d.relatedBlogSlug}
                    style={{ fontSize: 14, fontWeight: 650, color: "var(--ff-ink)", textDecoration: "underline", textUnderlineOffset: 3 }}
                  >
                    Read our in-depth {d.heroTitle} analysis
                  </Link>
                )}
                {relatedUseCase && (
                  <Link
                    href={"/use-cases/" + d.relatedUseCaseSlug}
                    style={{ fontSize: 14, fontWeight: 650, color: "var(--ff-ink)", textDecoration: "underline", textUnderlineOffset: 3 }}
                  >
                    AI support for {relatedUseCase.name}
                  </Link>
                )}
                {relatedIntegration && (
                  <Link
                    href={"/integrations/" + d.relatedIntegrationSlug}
                    style={{ fontSize: 14, fontWeight: 650, color: "var(--ff-ink)", textDecoration: "underline", textUnderlineOffset: 3 }}
                  >
                    {relatedIntegration.name} AI chatbot integration
                  </Link>
                )}
                <Link
                  href="/tools/support-ticket-deflection-calculator"
                  style={{ fontSize: 14, fontWeight: 650, color: "var(--ff-ink)", textDecoration: "underline", textUnderlineOffset: 3 }}
                >
                  Support ticket deflection calculator
                </Link>
              </div>
            </div>
          )}

          <div className="reveal" style={{ textAlign: "center", marginTop: 32 }}>
            <Link
              href="/vs"
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: "var(--ff-accent-2)",
                textDecoration: "underline",
                textUnderlineOffset: 3,
              }}
            >
              ← See all comparisons
            </Link>
          </div>
        </section>

        <DarkCta
          title={"See how FrontFace compares to " + d.competitorName + " on your own questions."}
          sub="Free during beta. No credit card required."
        />
      </main>
    </>
  );
}
