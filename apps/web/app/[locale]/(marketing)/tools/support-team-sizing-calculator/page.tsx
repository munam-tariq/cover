import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { localizedAlternates } from "@/lib/seo";

import { ToolPageLayout, type Citation } from "../tool-page-layout";
import { getTool } from "../tools-data";

import { TeamSizingCalculator } from "./calculator";

const tool = getTool("support-team-sizing-calculator")!;

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
      "support team sizing calculator",
      "how many support agents do I need",
      "support headcount calculator",
      "customer service staffing model",
      "support team capacity planning",
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
    description: "Free support team sizing calculator",
  },
};

// Citation labels are the sources' actual English titles; notes are localized.
const CITATION_SOURCES = [
  {
    id: 1,
    label: "ICMI — Contact Center Staffing Fundamentals",
    url: "https://www.icmi.com/resources/contact-center-management",
  },
  {
    id: 2,
    label: "HDI — Support Center Certification Framework",
    url: "https://www.thinkhdi.com/resources",
  },
  {
    id: 3,
    label: "Freshworks — Customer Service Benchmark Report 2024",
    url: "https://www.freshworks.com/freshdesk/resources/",
  },
];

const resourceLinks = [
  { href: "/blog/cut-support-tickets-without-hiring", label: "How to cut tickets without hiring" },
  { href: "/tools/support-ticket-deflection-calculator", label: "Support ticket deflection calculator" },
  { href: "/tools/customer-support-cost-calculator", label: "Customer support cost calculator" },
  { href: "/blog/ai-customer-support-guide-startups", label: "AI customer support for small teams" },
  { href: "/vs/zendesk", label: "FrontFace vs Zendesk" },
  { href: "/use-cases/saas", label: "AI support for SaaS teams" },
];

export default async function SupportTeamSizingCalculatorPage() {
  const t = await getTranslations("marketing.calculators.sizing");
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
      <TeamSizingCalculator />
    </ToolPageLayout>
  );
}
