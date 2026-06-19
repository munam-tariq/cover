import type { Metadata } from "next";
import Link from "next/link";
import Script from "next/script";

import { Eyebrow, Ic, WRAP } from "../../components/marketing-kit";
import { DarkCta, PageHero } from "../../components/page-kit";
import { getTool } from "../tools-data";

import { SupportDeflectionCalculator } from "./calculator";

const tool = getTool("support-ticket-deflection-calculator")!;

export const metadata: Metadata = {
  title: "Support Ticket Deflection Calculator",
  description: tool.description,
  keywords: [
    "support ticket deflection calculator",
    "customer support ROI calculator",
    "AI support calculator",
    "support automation ROI",
    "ticket deflection rate",
  ],
  alternates: { canonical: tool.canonical },
  openGraph: {
    title: tool.title,
    description: tool.description,
    url: tool.canonical,
    type: "website",
    siteName: "FrontFace",
    images: [{ url: tool.ogImage, width: 1200, height: 630, alt: tool.ogImageAlt }],
  },
  twitter: {
    card: "summary_large_image",
    title: tool.title,
    description: tool.description,
    images: [{ url: tool.ogImage, width: 1200, height: 630, alt: tool.ogImageAlt }],
  },
};

const schema = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: tool.name,
  url: tool.canonical,
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  description: tool.description,
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
    description: "Free support planning calculator",
  },
};

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: "https://frontface.app" },
    { "@type": "ListItem", position: 2, name: "Tools", item: "https://frontface.app/tools" },
    { "@type": "ListItem", position: 3, name: tool.name, item: tool.canonical },
  ],
};

const resourceLinks = [
  {
    href: "/blog/cut-support-tickets-without-hiring",
    label: "How to cut support tickets without hiring",
  },
  {
    href: "/blog/ai-customer-support-guide-startups",
    label: "AI customer support for small teams",
  },
  {
    href: "/use-cases/ecommerce",
    label: "AI customer support for ecommerce",
  },
  {
    href: "/integrations/shopify",
    label: "Shopify AI chatbot setup",
  },
  {
    href: "/blog/frontface-vs-chatbase-vs-intercom",
    label: "FrontFace vs Chatbase vs Intercom Fin",
  },
];

export default function SupportTicketDeflectionCalculatorPage() {
  return (
    <>
      <Script
        id="support-deflection-calculator-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <Script
        id="support-deflection-calculator-breadcrumb-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      <main style={{ overflowX: "hidden" }}>
        <PageHero
          eyebrow="Free support tool"
          title="Support ticket deflection calculator"
          sub="Estimate how many repetitive tickets an AI support agent can resolve, how many hours your team gets back, and what that means for monthly support cost."
        />

        <section style={{ ...WRAP, padding: "clamp(28px,5vh,58px) clamp(20px,5vw,40px)" }}>
          <SupportDeflectionCalculator />
        </section>

        <section
          style={{
            ...WRAP,
            padding: "clamp(32px,6vh,72px) clamp(20px,5vw,40px)",
            display: "grid",
            gridTemplateColumns: "minmax(0,1fr) minmax(300px,.7fr)",
            gap: 26,
          }}
          className="ff-tool-explain-grid"
        >
          <div>
            <Eyebrow>How to read the result</Eyebrow>
            <h2
              style={{
                fontSize: "clamp(28px,4vw,44px)",
                fontWeight: 850,
                letterSpacing: "-.035em",
                lineHeight: 1.05,
                color: "var(--ff-ink)",
                textWrap: "balance",
                margin: 0,
              }}
            >
              Deflection only works when the answer already exists.
            </h2>
            <div
              className="prose-ff"
              style={{ maxWidth: 720, margin: "22px 0 0" }}
            >
              <p>
                A realistic AI support estimate starts with your repetitive,
                documentable questions. Shipping policies, plan limits, setup
                steps, pricing details, refund rules, and product specs are good
                candidates because an agent can answer from source material.
              </p>
              <p>
                Account-specific, emotional, billing-exception, or legal-risk
                conversations should route to a person. FrontFace is strongest
                when it handles the repeatable queue and gives your team clean
                handoff context for everything else.
              </p>
            </div>
          </div>

          <aside
            style={{
              border: "1px solid var(--ff-line)",
              borderRadius: 18,
              background: "#fff",
              padding: 22,
              alignSelf: "start",
            }}
          >
            <h3
              style={{
                fontSize: 18,
                fontWeight: 800,
                letterSpacing: "-.015em",
                color: "var(--ff-ink)",
                margin: "0 0 14px",
              }}
            >
              Related FrontFace guides
            </h3>
            <div style={{ display: "grid", gap: 10 }}>
              {resourceLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    color: "var(--ff-ink)",
                    fontSize: 14,
                    fontWeight: 650,
                    textDecoration: "none",
                  }}
                >
                  <span
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 7,
                      background: "var(--ff-accent-soft)",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    {Ic("arrowR", { size: 13, sw: 2 })}
                  </span>
                  {link.label}
                </Link>
              ))}
            </div>
          </aside>
        </section>

        <section style={{ ...WRAP, padding: "clamp(24px,5vh,58px) clamp(20px,5vw,40px)" }}>
          <div style={{ maxWidth: 760, margin: "0 auto" }}>
            <Eyebrow center>FAQ</Eyebrow>
            <h2
              style={{
                fontSize: "clamp(26px,3.8vw,42px)",
                fontWeight: 850,
                letterSpacing: "-.03em",
                lineHeight: 1.08,
                textAlign: "center",
                color: "var(--ff-ink)",
                margin: 0,
              }}
            >
              Frequently asked questions
            </h2>
            <dl style={{ display: "grid", gap: 14, marginTop: 30 }}>
              {[
                {
                  q: "What is a realistic ticket deflection rate?",
                  a: "For small teams with a useful knowledge base, 40-70% of repetitive questions is a reasonable planning range. The real number depends on how much of your support queue is answered by existing docs, product pages, policies, and FAQs.",
                },
                {
                  q: "Should I include all customer messages in the calculator?",
                  a: "No. Count only support questions that can be answered from written source material. Exclude refunds that need judgment, angry customers, legal or medical advice, custom account work, and anything where a wrong answer creates real risk.",
                },
                {
                  q: "How do I improve deflection after launch?",
                  a: "Review unanswered questions every week, add missing answers to your knowledge base, and connect related pages with internal links. The agent improves when the source material becomes clearer and more complete.",
                },
              ].map((item) => (
                <div
                  key={item.q}
                  style={{
                    border: "1px solid var(--ff-line)",
                    borderRadius: 14,
                    background: "#fff",
                    padding: "18px 20px",
                  }}
                >
                  <dt
                    style={{
                      fontSize: 16,
                      fontWeight: 800,
                      color: "var(--ff-ink)",
                      marginBottom: 8,
                    }}
                  >
                    {item.q}
                  </dt>
                  <dd
                    style={{
                      margin: 0,
                      color: "var(--ff-soft)",
                      fontSize: 14.5,
                      lineHeight: 1.65,
                    }}
                  >
                    {item.a}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <DarkCta
          title="Turn the estimate into live answers."
          sub="Point FrontFace at your docs and let the agent answer real customer questions with cited sources."
          secondaryLabel="Read the ticket deflection guide"
          secondaryHref="/blog/cut-support-tickets-without-hiring"
        />
      </main>
    </>
  );
}
