import type { Metadata } from "next";

import { ToolPageLayout, type Citation } from "../tool-page-layout";
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

const citations: Citation[] = [
  {
    id: 1,
    label: "Zendesk Customer Experience Trends Report 2024",
    url: "https://www.zendesk.com/customer-experience/trends/",
    note: "Source for the AI deflection rate benchmark range of 40–70% used as the default slider bounds.",
  },
  {
    id: 2,
    label: "ICMI — Average Handle Time Benchmarks",
    url: "https://www.icmi.com/resources/contact-center-management",
    note: "Industry-average handle time of 6–9 minutes per email ticket used to calibrate the 7-minute default.",
  },
  {
    id: 3,
    label: "Bureau of Labor Statistics — Employer Costs for Employee Compensation",
    url: "https://www.bls.gov/news.release/ecec.toc.htm",
    note: "Loaded hourly cost includes employer-paid benefits averaging 30–40% on top of base wages for service roles.",
  },
];

const faqs = [
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
];

const resourceLinks = [
  { href: "/blog/cut-support-tickets-without-hiring", label: "How to cut support tickets without hiring" },
  { href: "/blog/ai-customer-support-guide-startups", label: "AI customer support for small teams" },
  { href: "/use-cases/ecommerce", label: "AI customer support for ecommerce" },
  { href: "/integrations/shopify", label: "Shopify AI chatbot setup" },
  { href: "/blog/frontface-vs-chatbase-vs-intercom", label: "FrontFace vs Chatbase vs Intercom Fin" },
];

export default function SupportTicketDeflectionCalculatorPage() {
  return (
    <ToolPageLayout
      tool={tool}
      eyebrow="Free support tool"
      schema={schema}
      citations={citations}
      faqs={faqs}
      resourceLinks={resourceLinks}
      explanationTitle="Deflection only works when the answer already exists."
      explanationBody={
        <>
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
        </>
      }
      ctaTitle="Turn the estimate into live answers."
      ctaSub="Point FrontFace at your docs and let the agent answer real customer questions with cited sources."
      ctaSecondaryLabel="Read the ticket deflection guide"
      ctaSecondaryHref="/blog/cut-support-tickets-without-hiring"
    >
      <SupportDeflectionCalculator />
    </ToolPageLayout>
  );
}
