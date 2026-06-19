import type { Metadata } from "next";

import { ToolPageLayout, type Citation } from "../tool-page-layout";
import { getTool } from "../tools-data";

import { SupportCostCalculator } from "./calculator";

const tool = getTool("customer-support-cost-calculator")!;

export const metadata: Metadata = {
  title: "Customer Support Cost Calculator",
  description: tool.description,
  keywords: [
    "customer support cost calculator",
    "support team cost",
    "cost per support ticket",
    "support team budget",
    "fully loaded support cost",
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
    description: "Free customer support cost calculator",
  },
};

const citations: Citation[] = [
  {
    id: 1,
    label: "Bureau of Labor Statistics — Employer Costs for Employee Compensation",
    url: "https://www.bls.gov/news.release/ecec.toc.htm",
    note: "Benefits multiplier default of 1.30× reflects BLS findings that benefits average 30% of total compensation for office and service roles.",
  },
  {
    id: 2,
    label: "Gartner — IT Service Desk Tool Spending (2023)",
    url: "https://www.gartner.com/en/information-technology/research",
    note: "Per-agent software tooling benchmark of $100–$300/month used to calibrate the default of $150/agent (helpdesk, chat, knowledge base, reporting).",
  },
  {
    id: 3,
    label: "HDI — Technical Support Industry Benchmark Report (2023)",
    url: "https://www.thinkhdi.com/resources",
    note: "Industry-average cost per ticket of $22–$45 cited as a sanity check for calculator output. Lower values indicate high deflection or short handle times.",
  },
];

const faqs = [
  {
    q: "What is a 'fully-loaded' support cost?",
    a: "Fully-loaded cost includes base salary plus employer-paid payroll taxes, health insurance, retirement contributions, and other benefits — typically 25–40% on top of base pay — plus the monthly cost of tools your agents use (helpdesk software, chat tools, knowledge base platforms). This is the true cost of a support seat.",
  },
  {
    q: "What should I set the benefits multiplier to?",
    a: "For US employers, 1.25–1.35 is typical for most roles. The BLS reports benefits averaging 30% of total compensation for office and service workers. If your team is in a higher-cost country or you offer generous benefits (equity, generous PTO, fully-paid health), use 1.4–1.5.",
  },
  {
    q: "How do I lower my cost per ticket?",
    a: "The two levers are: deflecting repetitive tickets with AI (so the same team handles more total volume) and reducing average handle time with better tooling and a stronger knowledge base. A 50% deflection rate on your current volume effectively doubles your team's capacity without a new hire.",
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

export default function CustomerSupportCostCalculatorPage() {
  return (
    <ToolPageLayout
      tool={tool}
      eyebrow="Free support tool"
      schema={schema}
      citations={citations}
      faqs={faqs}
      resourceLinks={resourceLinks}
      explanationTitle="Your real support cost is 30–50% higher than the salary line."
      explanationBody={
        <>
          <p>
            Most support budgets are built around base salaries, but the fully-loaded
            cost includes payroll taxes, health and retirement benefits, and the
            monthly software stack every agent relies on. Those hidden layers add
            25–50% to the headline number.
          </p>
          <p>
            The cost per ticket is where this becomes actionable. If your cost per
            ticket is above $30, even modest AI deflection — handling the 40–60% of
            questions that repeat every week — brings that number down sharply without
            reducing team size or quality.
          </p>
        </>
      }
      ctaTitle="Reduce your cost per ticket without reducing your team."
      ctaSub="FrontFace handles the repetitive queue so your agents focus on conversations that actually need a human."
      ctaSecondaryLabel="See how teams cut support costs"
      ctaSecondaryHref="/blog/cut-support-tickets-without-hiring"
    >
      <SupportCostCalculator />
    </ToolPageLayout>
  );
}
