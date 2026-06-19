import type { Metadata } from "next";

import { ToolPageLayout, type Citation } from "../tool-page-layout";
import { getTool } from "../tools-data";

import { KbHealthScorer } from "./scorer";

const tool = getTool("knowledge-base-health-scorer")!;

export const metadata: Metadata = {
  title: "Knowledge Base Health Scorer",
  description: tool.description,
  keywords: [
    "knowledge base health check",
    "knowledge base quality score",
    "support knowledge base audit",
    "KB health checker",
    "help center audit tool",
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
    description: "Free knowledge base health scorer",
  },
};

const citations: Citation[] = [
  {
    id: 1,
    label: "HDI — Knowledge Management in the Support Center (2023)",
    url: "https://www.thinkhdi.com/resources",
    note: "KB coverage is positively correlated with self-service deflection rate. Organizations with 50+ articles see significantly higher first-contact resolution versus those with fewer than 20.",
  },
  {
    id: 2,
    label: "Gartner — Knowledge Management Best Practices for Customer Service (2024)",
    url: "https://www.gartner.com/en/customer-service-support",
    note: "Content older than 12 months shows a measurably higher error rate; the freshness scoring tiers in this tool reflect Gartner's content decay curve research.",
  },
  {
    id: 3,
    label: "SupportOps Community — KB Health Benchmarks (2023)",
    url: "https://supportops.co",
    note: "Teams that review unanswered questions weekly see 2× faster knowledge base improvement than those on a monthly review cycle, used to weight the feedback loop dimension.",
  },
];

const faqs = [
  {
    q: "What is a good KB health score?",
    a: "70 or above (B grade) means your knowledge base is functioning well and can support meaningful AI deflection. Below 50 means the coverage, freshness, or findability gaps will limit how much an AI agent can help — those gaps produce unanswered questions, not deflected tickets.",
  },
  {
    q: "Which dimension has the biggest impact on AI deflection?",
    a: "Coverage first, then freshness. An AI agent can only answer what exists in your knowledge base. A well-maintained library of 50+ articles covering your core question categories typically unlocks 40–60% deflection. Findability amplifies coverage — good content that isn't structured well gets retrieved less reliably.",
  },
  {
    q: "How often should I audit my knowledge base?",
    a: "A lightweight weekly review of unanswered questions (what did the AI fail to answer this week?) is more effective than a big monthly audit. The weekly signal tells you exactly what to write next. A full audit of existing content freshness makes sense quarterly, or whenever your product ships a significant update.",
  },
];

const resourceLinks = [
  { href: "/blog/ai-customer-support-guide-startups", label: "AI customer support for small teams" },
  { href: "/blog/cut-support-tickets-without-hiring", label: "How to cut tickets without hiring" },
  { href: "/tools/support-ticket-deflection-calculator", label: "Support ticket deflection calculator" },
  { href: "/use-cases/ecommerce", label: "AI customer support for ecommerce" },
];

export default function KnowledgeBaseHealthScorerPage() {
  return (
    <ToolPageLayout
      tool={tool}
      eyebrow="Free support tool"
      schema={schema}
      citations={citations}
      faqs={faqs}
      resourceLinks={resourceLinks}
      explanationEyebrow="How your score is calculated"
      explanationTitle="Coverage and freshness drive 80% of deflection quality."
      explanationBody={
        <>
          <p>
            A knowledge base scores well when it covers the main question categories,
            stays current, and gives customers a way to find answers. Coverage and
            freshness together determine whether the AI has accurate source material.
            A large library of outdated articles scores worse than a small, accurate one.
          </p>
          <p>
            Findability and feedback loop are multipliers. Good content that is hard to
            search or navigate gets retrieved less reliably by an AI agent. And without
            a weekly review of unanswered questions, coverage gaps compound silently
            until they show up as escalations.
          </p>
        </>
      }
      ctaTitle="Turn your knowledge base into an AI support agent."
      ctaSub="FrontFace reads your docs, policies, and FAQs and answers customer questions with cited sources."
      ctaSecondaryLabel="AI customer support guide for small teams"
      ctaSecondaryHref="/blog/ai-customer-support-guide-startups"
    >
      <KbHealthScorer />
    </ToolPageLayout>
  );
}
