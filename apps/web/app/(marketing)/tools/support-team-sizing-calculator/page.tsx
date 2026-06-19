import type { Metadata } from "next";

import { ToolPageLayout, type Citation } from "../tool-page-layout";
import { getTool } from "../tools-data";

import { TeamSizingCalculator } from "./calculator";

const tool = getTool("support-team-sizing-calculator")!;

export const metadata: Metadata = {
  title: "Support Team Sizing Calculator",
  description: tool.description,
  keywords: [
    "support team sizing calculator",
    "how many support agents do I need",
    "support headcount calculator",
    "customer service staffing model",
    "support team capacity planning",
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
    description: "Free support team sizing calculator",
  },
};

const citations: Citation[] = [
  {
    id: 1,
    label: "ICMI — Contact Center Staffing Fundamentals",
    url: "https://www.icmi.com/resources/contact-center-management",
    note: "80% target utilization is the ICMI industry standard; the remaining 20% covers training, meetings, coaching, and ticket spikes without burning out agents.",
  },
  {
    id: 2,
    label: "HDI — Support Center Certification Framework",
    url: "https://www.thinkhdi.com/resources",
    note: "4.33 working weeks per month used as the baseline multiplier for monthly capacity calculations (52 weeks ÷ 12 months).",
  },
  {
    id: 3,
    label: "Freshworks — Customer Service Benchmark Report 2024",
    url: "https://www.freshworks.com/freshdesk/resources/",
    note: "Average handle time benchmarks: email support 6–10 minutes, live chat 4–8 minutes. The 8-minute default reflects a mixed-channel small-team average.",
  },
];

const faqs = [
  {
    q: "Why use 80% utilization and not 100%?",
    a: "At 100% utilization there is no slack for meetings, training, sick days, or unexpected volume spikes. A team running at full capacity burns out quickly and response times collapse the moment volume increases. 80% is the ICMI standard for sustainable operations — the remaining 20% is where coaching, onboarding, and process improvement happen.",
  },
  {
    q: "What counts as 'handle time'?",
    a: "Handle time is the total time a ticket occupies an agent — reading, responding, internal notes, follow-up, and any post-resolution wrap-up. For email support, 6–10 minutes is common. For chat, 4–8 minutes. If you track this in your helpdesk, use your actual P50 (median) handle time for a more accurate result.",
  },
  {
    q: "How does AI change this calculation?",
    a: "If an AI agent deflects 50% of your tickets before they reach the queue, your effective monthly volume for this calculator drops by half. A team currently needing 8 agents could get by with 4 — or maintain the same headcount and absorb 2× the growth. The deflection calculator above shows the deflection estimate; this tool shows what that means for headcount.",
  },
];

const resourceLinks = [
  { href: "/blog/cut-support-tickets-without-hiring", label: "How to cut tickets without hiring" },
  { href: "/tools/support-ticket-deflection-calculator", label: "Support ticket deflection calculator" },
  { href: "/tools/customer-support-cost-calculator", label: "Customer support cost calculator" },
  { href: "/blog/ai-customer-support-guide-startups", label: "AI customer support for small teams" },
];

export default function SupportTeamSizingCalculatorPage() {
  return (
    <ToolPageLayout
      tool={tool}
      eyebrow="Free support tool"
      schema={schema}
      citations={citations}
      faqs={faqs}
      resourceLinks={resourceLinks}
      explanationTitle="80% utilization is the planning target, not the ceiling."
      explanationBody={
        <>
          <p>
            The formula divides your total monthly handle hours by the available
            agent hours at 80% utilization. That 20% slack is not wasted — it is
            where training, coaching, process improvements, and unexpected spikes
            get absorbed without SLA breaches.
          </p>
          <p>
            The spike buffer result shows the headcount you need to handle a 20%
            surge in volume. For fast-growing teams or seasonal businesses, that is
            the number to hire toward — not the 80% utilization baseline.
          </p>
        </>
      }
      ctaTitle="Skip the next hire with AI-handled routine questions."
      ctaSub="FrontFace deflects 40–70% of repetitive tickets so your team can grow without headcount scaling linearly."
      ctaSecondaryLabel="How to scale support without more hires"
      ctaSecondaryHref="/blog/cut-support-tickets-without-hiring"
    >
      <TeamSizingCalculator />
    </ToolPageLayout>
  );
}
