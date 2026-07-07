import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { localizedAlternates } from "@/lib/seo";

import { ToolPageLayout, type Citation } from "../tool-page-layout";
import { getTool } from "../tools-data";

import { AiVsHumanCalculator } from "./calculator";

const tool = getTool("ai-vs-human-support-calculator")!;

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
      "AI vs human customer support cost",
      "AI support agent ROI",
      "chatbot vs live agent cost",
      "customer support automation savings",
      "AI customer service calculator",
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
    description: "Free AI vs human support cost comparison tool",
  },
};

// Citation labels are the sources' actual English titles; notes are localized.
const CITATION_SOURCES = [
  {
    id: 1,
    label: "IBM — The Business Value of AI in Customer Service",
    url: "https://www.ibm.com/think/topics/ai-customer-service",
  },
  {
    id: 2,
    label: "Salesforce State of Service Report 2024",
    url: "https://www.salesforce.com/resources/research-reports/state-of-service/",
  },
  {
    id: 3,
    label: "ICMI — Contact Center Staffing Fundamentals",
    url: "https://www.icmi.com/resources/contact-center-management",
  },
];

const resourceLinks = [
  { href: "/tools/support-ticket-deflection-calculator", label: "Support ticket deflection calculator" },
  { href: "/tools/customer-support-cost-calculator", label: "Customer support cost calculator" },
  { href: "/tools/support-team-sizing-calculator", label: "Support team sizing calculator" },
  { href: "/blog/frontface-vs-chatbase-vs-intercom", label: "FrontFace vs Chatbase vs Intercom Fin" },
  { href: "/vs/zendesk", label: "FrontFace vs Zendesk" },
  { href: "/vs/chatbase", label: "FrontFace vs Chatbase" },
];

export default async function AiVsHumanSupportCalculatorPage() {
  const t = await getTranslations("marketing.calculators.aiVsHuman");
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
      ctaSecondaryHref="/blog/frontface-vs-chatbase-vs-intercom"
    >
      <AiVsHumanCalculator />
    </ToolPageLayout>
  );
}
