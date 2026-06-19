import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Script from "next/script";
import type { CSSProperties } from "react";

import { Eyebrow, Ic, WRAP } from "../../components/marketing-kit";
import { DarkCta, PageHero } from "../../components/page-kit";
import { useCases } from "../use-cases-data";

export function generateStaticParams() {
  return useCases.map((u) => ({ slug: u.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const d = useCases.find((u) => u.slug === slug);
  if (!d) return {};
  return {
    title: d.metaTitle,
    description: d.metaDescription,
    keywords: d.metaKeywords,
    openGraph: {
      title: d.name + " | FrontFace",
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
      title: d.name + " | FrontFace",
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

function relatedResourcesFor(slug: string) {
  const shared = [
    {
      href: "/tools/support-ticket-deflection-calculator",
      label: "Support ticket deflection calculator",
    },
    {
      href: "/blog/cut-support-tickets-without-hiring",
      label: "How to cut support tickets without hiring",
    },
    {
      href: "/blog/frontface-vs-chatbase-vs-intercom",
      label: "FrontFace vs Chatbase vs Intercom Fin",
    },
  ];

  if (slug === "ecommerce") {
    return [
      { href: "/integrations/shopify", label: "Shopify AI chatbot integration" },
      {
        href: "/blog/add-ai-support-to-shopify-store",
        label: "How to add AI support to Shopify",
      },
      ...shared,
    ];
  }

  if (slug === "saas") {
    return [
      {
        href: "/blog/ai-customer-support-guide-startups",
        label: "AI customer support guide for startups",
      },
      {
        href: "/blog/best-ai-customer-support-tools-startups",
        label: "Best AI support tools for startups",
      },
      ...shared,
    ];
  }

  if (slug === "agencies") {
    return [
      { href: "/integrations/wordpress", label: "WordPress AI chatbot integration" },
      { href: "/integrations/webflow", label: "Webflow AI chatbot integration" },
      ...shared,
    ];
  }

  return [
    {
      href: "/blog/chatbot-for-small-business",
      label: "AI chatbot for small business",
    },
    {
      href: "/blog/how-to-add-ai-chatbot-to-website",
      label: "How to add an AI chatbot to your website",
    },
    ...shared,
  ];
}

export default async function UseCaseSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const d = useCases.find((u) => u.slug === slug);
  if (!d) notFound();

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: d.faqs.map((faq) => ({
      "@type": "Question",
      name: faq.q,
      acceptedAnswer: { "@type": "Answer", text: faq.a },
    })),
  };
  const relatedResources = relatedResourcesFor(d.slug);

  return (
    <>
      <Script
        id={"use-case-" + d.slug + "-faq-schema"}
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <main>
        <PageHero eyebrow={d.heroEyebrow} title={d.heroTitle} sub={d.heroSub} />

        {/* Stats bar */}
        <section style={{ ...WRAP, padding: "clamp(24px,4vh,48px) clamp(20px,5vw,40px)" }}>
          <div
            className="reveal"
            style={{
              position: "relative",
              overflow: "hidden",
              borderRadius: 20,
              background: "linear-gradient(160deg,#11151b,#0d1117)",
              color: "#fff",
              padding: "clamp(28px,4vw,48px)",
              display: "grid",
              gridTemplateColumns: "repeat(3,1fr)",
              gap: 24,
              textAlign: "center",
            }}
          >
            <div
              className="lattice"
              style={
                {
                  position: "absolute",
                  inset: 0,
                  "--lt": "rgba(255,255,255,.05)",
                  "--lt-size": "44px",
                  maskImage:
                    "radial-gradient(120% 80% at 50% 0%, #000 30%, transparent 82%)",
                  WebkitMaskImage:
                    "radial-gradient(120% 80% at 50% 0%, #000 30%, transparent 82%)",
                } as CSSProperties
              }
            />
            {[d.stat1, d.stat2, d.stat3].map((stat) => (
              <div key={stat.value + stat.label} style={{ position: "relative" }}>
                <div
                  style={{
                    fontSize: "clamp(36px,5vw,52px)",
                    fontWeight: 800,
                    letterSpacing: "-.03em",
                    lineHeight: 1,
                  }}
                >
                  {stat.value}
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: "rgba(255,255,255,.6)",
                    marginTop: 8,
                  }}
                >
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Pain points */}
        <section style={{ ...WRAP, padding: "clamp(32px,5vh,64px) clamp(20px,5vw,40px)" }}>
          <div className="reveal" style={{ marginBottom: 36 }}>
            <Eyebrow>How FrontFace helps</Eyebrow>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))",
              gap: 18,
            }}
          >
            {d.painPoints.map((point, i) => (
              <div
                key={i}
                className={"reveal d" + ((i % 2) + 1)}
                style={cardStyle}
              >
                <h3
                  style={{
                    fontSize: 17,
                    fontWeight: 700,
                    color: "var(--ff-ink)",
                    letterSpacing: "-.01em",
                    marginBottom: 14,
                  }}
                >
                  {point.problem}
                </h3>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 10,
                  }}
                >
                  <span
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 99,
                      background: "var(--ff-accent-soft)",
                      color: "var(--ff-accent-2)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    {Ic("check", { size: 12, sw: 2.6 })}
                  </span>
                  <div
                    style={{
                      height: 1,
                      flex: 1,
                      background: "var(--ff-line)",
                    }}
                  />
                </div>
                <p
                  style={{
                    fontSize: 14,
                    lineHeight: 1.65,
                    color: "var(--ff-soft)",
                    textWrap: "pretty",
                    margin: 0,
                  }}
                >
                  {point.solution}
                </p>
              </div>
            ))}
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
              Frequently asked questions
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
              Related resources for {d.name}
            </h3>
            <div style={{ display: "grid", gap: 9 }}>
              {relatedResources.map((resource) => (
                <Link
                  key={resource.href}
                  href={resource.href}
                  style={{
                    fontSize: 14,
                    fontWeight: 650,
                    color: "var(--ff-ink)",
                    textDecoration: "underline",
                    textUnderlineOffset: 3,
                  }}
                >
                  {resource.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="reveal" style={{ textAlign: "center", marginTop: 32 }}>
            <Link
              href="/use-cases"
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: "var(--ff-accent-2)",
                textDecoration: "underline",
                textUnderlineOffset: 3,
              }}
            >
              ← See all use cases
            </Link>
          </div>
        </section>

        <DarkCta
          title={"AI support for " + d.name + "."}
          sub="Free during beta. No credit card required."
        />
      </main>
    </>
  );
}
