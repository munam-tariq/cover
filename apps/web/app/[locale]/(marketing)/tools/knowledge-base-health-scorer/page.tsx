import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { localizedAlternates } from "@/lib/seo";

import { ToolPageLayout, type Citation } from "../tool-page-layout";
import { getTool } from "../tools-data";

import { KbHealthScorer } from "./scorer";

const tool = getTool("knowledge-base-health-scorer")!;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "marketing.toolCopy" });
  const title = t(`${tool.slug}.title`);
  const description = t(`${tool.slug}.description`);
  return {
    title,
    description,
    keywords: [
      "knowledge base health check",
      "knowledge base quality score",
      "support knowledge base audit",
      "KB health checker",
      "help center audit tool",
    ],
    alternates: localizedAlternates(`/tools/${tool.slug}`),
    openGraph: {
      title,
      description,
      url: tool.canonical,
      type: "website",
      siteName: "FrontFace",
      images: [{ url: tool.ogImage, width: 1200, height: 630, alt: tool.ogImageAlt }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [{ url: tool.ogImage, width: 1200, height: 630, alt: tool.ogImageAlt }],
    },
  };
}

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

// Citation labels are the sources' actual English titles; notes are localized.
const CITATION_SOURCES = [
  {
    id: 1,
    label: "HDI — Knowledge Management in the Support Center (2023)",
    url: "https://www.thinkhdi.com/resources",
  },
  {
    id: 2,
    label: "Gartner — Knowledge Management Best Practices for Customer Service (2024)",
    url: "https://www.gartner.com/en/customer-service-support",
  },
  {
    id: 3,
    label: "SupportOps Community — KB Health Benchmarks (2023)",
    url: "https://supportops.co",
  },
];

const resourceLinks = [
  { href: "/blog/ai-customer-support-guide-startups", label: "AI customer support for small teams" },
  { href: "/blog/cut-support-tickets-without-hiring", label: "How to cut tickets without hiring" },
  { href: "/tools/support-ticket-deflection-calculator", label: "Support ticket deflection calculator" },
  { href: "/use-cases/ecommerce", label: "AI customer support for ecommerce" },
  { href: "/blog/rag-vs-traditional-chatbots", label: "RAG vs traditional chatbots" },
  { href: "/use-cases/saas", label: "AI support for SaaS teams" },
];

export default async function KnowledgeBaseHealthScorerPage() {
  const t = await getTranslations("marketing.calculators.kbScorer");
  const explanationBody = t.raw("explanationBody") as string[];
  const faqs = t.raw("faqs") as { q: string; a: string }[];
  const citationNotes = t.raw("citationNotes") as string[];
  const citations: Citation[] = CITATION_SOURCES.map((c, i) => ({
    ...c,
    note: citationNotes[i],
  }));
  return (
    <ToolPageLayout
      tool={tool}
      eyebrow={t("eyebrow")}
      schema={schema}
      citations={citations}
      faqs={faqs}
      resourceLinks={resourceLinks}
      explanationEyebrow={t("explanationEyebrow")}
      explanationTitle={t("explanationTitle")}
      explanationBody={
        <>
          {explanationBody.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </>
      }
      ctaTitle={t("ctaTitle")}
      ctaSub={t("ctaSub")}
      ctaSecondaryLabel={t("ctaSecondaryLabel")}
      ctaSecondaryHref="/blog/ai-customer-support-guide-startups"
    >
      <KbHealthScorer />
    </ToolPageLayout>
  );
}
