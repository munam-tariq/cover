import { CheckCircle } from "lucide-react";
import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Script from "next/script";

import { Eyebrow, WRAP } from "../../components/marketing-kit";
import { DarkCta, PageHero } from "../../components/page-kit";
import { integrations } from "../integrations-data";

export async function generateStaticParams() {
  return integrations.map((i) => ({ slug: i.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const d = integrations.find((i) => i.slug === slug);
  if (!d) return {};
  return {
    title: d.metaTitle,
    description: d.metaDescription,
    keywords: d.metaKeywords,
    openGraph: {
      title: d.name + " AI Chatbot | FrontFace",
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
      title: d.name + " AI Chatbot | FrontFace",
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

const inkChip = {
  width: 46,
  height: 46,
  borderRadius: 13,
  background: "var(--ff-ink)",
  color: "#fff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
  fontWeight: 800,
  fontSize: 16,
  marginBottom: 16,
} as const;

const steps = [
  {
    step: "01",
    title: "Feed it your knowledge",
    description:
      "Point FrontFace at your website or upload docs, PDFs and FAQs. It reads everything and builds a grounded knowledge base in minutes.",
  },
  {
    step: "02",
    title: "Make it yours",
    description:
      "Add your logo, pick your colors, write a welcome message. Test it against real questions before it goes live.",
  },
  {
    step: "03",
    title: "Go live in 5 minutes",
    description:
      "Drop one line of code on any site — Shopify, WordPress, Wix or custom — or share a hosted public agent page.",
  },
];


export default async function IntegrationSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const d = integrations.find((i) => i.slug === slug);
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
  const relatedResources = d.relatedLinks;

  return (
    <>
      <Script
        id={"integration-" + d.slug + "-faq-schema"}
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <main>
        <PageHero eyebrow={d.heroEyebrow} title={d.heroTitle} sub={d.heroSub} />

        {/* Benefits */}
        <section style={{ ...WRAP, padding: "clamp(32px,5vh,64px) clamp(20px,5vw,40px)" }}>
          <div className="reveal" style={{ marginBottom: 36 }}>
            <Eyebrow>{"Why FrontFace for " + d.name}</Eyebrow>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))",
              gap: 18,
            }}
          >
            {d.benefits.map((b, i) => (
              <div
                key={b.title}
                className={"reveal d" + ((i % 2) + 1)}
                style={cardStyle}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                  <span
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 12,
                      background: "var(--ff-accent-soft)",
                      color: "var(--ff-accent-2)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      marginTop: 2,
                    }}
                  >
                    <CheckCircle className="w-5 h-5" />
                  </span>
                  <div>
                    <h3
                      style={{
                        fontSize: 17,
                        fontWeight: 700,
                        color: "var(--ff-ink)",
                        letterSpacing: "-.01em",
                        marginBottom: 8,
                      }}
                    >
                      {b.title}
                    </h3>
                    <p
                      style={{
                        fontSize: 14,
                        lineHeight: 1.6,
                        color: "var(--ff-soft)",
                        textWrap: "pretty",
                      }}
                    >
                      {b.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section style={{ ...WRAP, padding: "clamp(40px,6vh,80px) clamp(20px,5vw,40px)" }}>
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
              Live in 5 minutes
            </h2>
            <p
              style={{
                fontSize: 16.5,
                lineHeight: 1.55,
                color: "var(--ff-soft)",
                marginTop: 14,
                textWrap: "pretty",
              }}
            >
              Three simple steps. No technical skills required.
            </p>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))",
              gap: 18,
            }}
          >
            {steps.map((s, i) => (
              <div
                key={s.step}
                className={"reveal d" + (i + 1)}
                style={{ ...cardStyle, padding: "26px 24px" }}
              >
                <div style={inkChip} className="mono">
                  {s.step}
                </div>
                <h3
                  style={{
                    fontSize: 17,
                    fontWeight: 700,
                    color: "var(--ff-ink)",
                    letterSpacing: "-.01em",
                    marginBottom: 8,
                  }}
                >
                  {s.title}
                </h3>
                <p
                  style={{
                    fontSize: 14,
                    lineHeight: 1.6,
                    color: "var(--ff-soft)",
                    textWrap: "pretty",
                  }}
                >
                  {s.description}
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
                style={{
                  ...cardStyle,
                  padding: "20px 24px",
                }}
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
          <div
            className="reveal"
            style={{ textAlign: "center", marginTop: 32 }}
          >
            <Link
              href="/integrations"
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: "var(--ff-accent-2)",
                textDecoration: "underline",
                textUnderlineOffset: 3,
              }}
            >
              ← See all integrations
            </Link>
          </div>
        </section>

        <DarkCta
          title={"Add FrontFace to " + d.name + " free."}
          sub="Free during beta. No credit card required."
        />
      </main>
    </>
  );
}
