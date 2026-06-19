import type { Metadata } from "next";

import { ToolPageLayout, type Citation } from "../tool-page-layout";
import { getTool } from "../tools-data";

import { AiVsHumanCalculator } from "./calculator";

const tool = getTool("ai-vs-human-support-calculator")!;

export const metadata: Metadata = {
  title: "AI vs Human Support Cost Comparison",
  description: tool.description,
  keywords: [
    "AI vs human customer support cost",
    "AI support agent ROI",
    "chatbot vs live agent cost",
    "customer support automation savings",
    "AI customer service calculator",
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
    description: "Free AI vs human support cost comparison tool",
  },
};

const citations: Citation[] = [
  {
    id: 1,
    label: "IBM — The Business Value of AI in Customer Service",
    url: "https://www.ibm.com/think/topics/ai-customer-service",
    note: "IBM research cites $15–$20 fully-loaded cost per human-handled support ticket; AI-assisted handling at $0.10–$0.25 per conversation used to frame the breakeven model.",
  },
  {
    id: 2,
    label: "Salesforce State of Service Report 2024",
    url: "https://www.salesforce.com/resources/research-reports/state-of-service/",
    note: "61% of service teams report cost reduction as the primary AI adoption driver; average 28% reduction in cost per ticket after AI deployment.",
  },
  {
    id: 3,
    label: "ICMI — Contact Center Staffing Fundamentals",
    url: "https://www.icmi.com/resources/contact-center-management",
    note: "80% utilization model used to calculate agents needed from ticket volume and handle time — same standard used across all FrontFace staffing tools.",
  },
];

const faqs = [
  {
    q: "Does AI fully replace human support agents?",
    a: "No — and this calculator does not model that. AI handles the repetitive, document-answerable questions (40–70% of most support queues). Human agents handle account-specific, emotional, or high-stakes conversations. The comparison shows cost savings on the deflected portion, not a headcount elimination scenario.",
  },
  {
    q: "What does 'breakeven volume' mean?",
    a: "Breakeven volume is the monthly ticket count at which the AI monthly cost equals what you would spend on a single human agent handling those tickets. Below that threshold, the difference is small. Above it, AI savings compound with every additional ticket because the AI cost stays flat while the human cost grows with volume.",
  },
  {
    q: "Why does the AI cost stay flat while human cost grows?",
    a: "Human support costs scale with volume — more tickets mean more agent hours, and at some point a new hire. AI tools typically charge a flat monthly subscription or per-seat fee regardless of conversation volume, so the per-ticket cost drops continuously as volume grows.",
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

export default function AiVsHumanSupportCalculatorPage() {
  return (
    <ToolPageLayout
      tool={tool}
      eyebrow="Free ROI calculator"
      schema={schema}
      citations={citations}
      faqs={faqs}
      resourceLinks={resourceLinks}
      explanationTitle="The crossover point is lower than most teams expect."
      explanationBody={
        <>
          <p>
            Human support costs scale with every ticket added to the queue — more
            volume means more agent hours, and eventually a new hire. AI costs are
            flat: the same monthly subscription handles 200 conversations or 2,000.
            That asymmetry is where the savings emerge.
          </p>
          <p>
            The breakeven volume is the ticket count where AI monthly cost equals
            what you would spend on one agent at your volume. Below that point the
            difference is small. Above it, the gap widens with every additional
            ticket because AI cost does not move.
          </p>
        </>
      }
      ctaTitle="Start free and let the numbers speak."
      ctaSub="FrontFace's free plan handles real customer conversations. No card required — see actual deflection before you commit."
      ctaSecondaryLabel="FrontFace vs Chatbase vs Intercom Fin"
      ctaSecondaryHref="/blog/frontface-vs-chatbase-vs-intercom"
    >
      <AiVsHumanCalculator />
    </ToolPageLayout>
  );
}
