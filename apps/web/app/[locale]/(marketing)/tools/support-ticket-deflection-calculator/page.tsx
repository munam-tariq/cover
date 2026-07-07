import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { localizedAlternates } from "@/lib/seo";

import { ToolPageLayout, type Citation } from "../tool-page-layout";
import { getTool } from "../tools-data";

import { SupportDeflectionCalculator } from "./calculator";

const tool = getTool("support-ticket-deflection-calculator")!;

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
      "support ticket deflection calculator",
      "customer support ROI calculator",
      "AI support calculator",
      "support automation ROI",
      "ticket deflection rate",
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
    description: "Free support planning calculator",
  },
};

// Citation labels are the sources' actual English titles; notes are localized.
const CITATION_SOURCES = [
  {
    id: 1,
    label: "Zendesk Customer Experience Trends Report 2024",
    url: "https://www.zendesk.com/customer-experience/trends/",
  },
  {
    id: 2,
    label: "ICMI — Average Handle Time Benchmarks",
    url: "https://www.icmi.com/resources/contact-center-management",
  },
  {
    id: 3,
    label: "Bureau of Labor Statistics — Employer Costs for Employee Compensation",
    url: "https://www.bls.gov/news.release/ecec.toc.htm",
  },
];

const resourceLinks = [
  { href: "/blog/cut-support-tickets-without-hiring", label: "How to cut support tickets without hiring" },
  { href: "/blog/ai-customer-support-guide-startups", label: "AI customer support for small teams" },
  { href: "/use-cases/ecommerce", label: "AI customer support for ecommerce" },
  { href: "/integrations/shopify", label: "Shopify AI chatbot setup" },
  { href: "/blog/frontface-vs-chatbase-vs-intercom", label: "FrontFace vs Chatbase vs Intercom Fin" },
  { href: "/vs/zendesk", label: "FrontFace vs Zendesk" },
  { href: "/vs/chatbase", label: "FrontFace vs Chatbase" },
];

export default async function SupportTicketDeflectionCalculatorPage() {
  const t = await getTranslations("marketing.calculators.deflection");
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
      <SupportDeflectionCalculator />
    </ToolPageLayout>
  );
}
