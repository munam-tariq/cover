import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { localizedAlternates } from "@/lib/seo";

import { ToolPageLayout, type Citation } from "../tool-page-layout";
import { getTool } from "../tools-data";

import { SupportCostCalculator } from "./calculator";

const tool = getTool("customer-support-cost-calculator")!;

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
      "customer support cost calculator",
      "support team cost",
      "cost per support ticket",
      "support team budget",
      "fully loaded support cost",
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
    description: "Free customer support cost calculator",
  },
};

// Citation labels are the sources' actual English titles; notes are localized.
const CITATION_SOURCES = [
  {
    id: 1,
    label: "Bureau of Labor Statistics — Employer Costs for Employee Compensation",
    url: "https://www.bls.gov/news.release/ecec.toc.htm",
  },
  {
    id: 2,
    label: "Gartner — IT Service Desk Tool Spending (2023)",
    url: "https://www.gartner.com/en/information-technology/research",
  },
  {
    id: 3,
    label: "HDI — Technical Support Industry Benchmark Report (2023)",
    url: "https://www.thinkhdi.com/resources",
  },
];

const resourceLinks = [
  { href: "/blog/cut-support-tickets-without-hiring", label: "How to cut support tickets without hiring" },
  { href: "/blog/ai-customer-support-guide-startups", label: "AI customer support for small teams" },
  { href: "/tools/support-ticket-deflection-calculator", label: "Support ticket deflection calculator" },
  { href: "/tools/ai-vs-human-support-calculator", label: "AI vs human support cost comparison" },
  { href: "/vs/zendesk", label: "FrontFace vs Zendesk" },
  { href: "/use-cases/saas", label: "AI support for SaaS teams" },
];

export default async function CustomerSupportCostCalculatorPage() {
  const t = await getTranslations("marketing.calculators.cost");
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
      ctaSecondaryHref="/blog/cut-support-tickets-without-hiring"
    >
      <SupportCostCalculator />
    </ToolPageLayout>
  );
}
