export interface ToolPage {
  slug: string;
  name: string;
  title: string;
  description: string;
  category: string;
  canonical: string;
  ogImage: string;
  ogImageAlt: string;
  lastModified: string;
}

export const tools: ToolPage[] = [
  {
    slug: "support-ticket-deflection-calculator",
    name: "Support Ticket Deflection Calculator",
    title: "Support Ticket Deflection Calculator",
    description:
      "Estimate how many repetitive support tickets an AI support agent can deflect, how many hours your team gets back, and what that means for monthly support cost.",
    category: "Calculator",
    canonical:
      "https://frontface.app/tools/support-ticket-deflection-calculator",
    ogImage: "https://frontface.app/blog-og/support-ticket-calculator.png",
    ogImageAlt:
      "FrontFace support ticket deflection calculator for small teams",
    lastModified: "2026-06-19",
  },
  {
    slug: "customer-support-cost-calculator",
    name: "Customer Support Cost Calculator",
    title: "Customer Support Cost Calculator",
    description:
      "Calculate your true fully-loaded support team cost — salary, benefits, tools, and overhead — and find your real cost per ticket.",
    category: "Calculator",
    canonical:
      "https://frontface.app/tools/customer-support-cost-calculator",
    ogImage: "https://frontface.app/blog-og/customer-support-cost-calculator.png",
    ogImageAlt:
      "FrontFace customer support cost calculator for small teams",
    lastModified: "2026-06-19",
  },
  {
    slug: "support-team-sizing-calculator",
    name: "Support Team Sizing Calculator",
    title: "Support Team Sizing Calculator",
    description:
      "Find out how many support agents you need for your ticket volume and coverage hours, using the industry-standard 80% utilization model.",
    category: "Calculator",
    canonical:
      "https://frontface.app/tools/support-team-sizing-calculator",
    ogImage: "https://frontface.app/blog-og/support-team-sizing-calculator.png",
    ogImageAlt:
      "FrontFace support team sizing calculator for growing teams",
    lastModified: "2026-06-19",
  },
  {
    slug: "ai-vs-human-support-calculator",
    name: "AI vs Human Support Cost Comparison",
    title: "AI vs Human Support Cost Comparison",
    description:
      "Compare the monthly cost of an AI support agent versus a human support team and find the ticket volume where AI starts paying off.",
    category: "Calculator",
    canonical:
      "https://frontface.app/tools/ai-vs-human-support-calculator",
    ogImage: "https://frontface.app/blog-og/ai-vs-human-support-calculator.png",
    ogImageAlt:
      "FrontFace AI vs human support cost comparison calculator",
    lastModified: "2026-06-19",
  },
  {
    slug: "knowledge-base-health-scorer",
    name: "Knowledge Base Health Scorer",
    title: "Knowledge Base Health Scorer",
    description:
      "Score your support knowledge base across coverage, freshness, findability, and feedback loop — and get a prioritized improvement recommendation.",
    category: "Scorer",
    canonical:
      "https://frontface.app/tools/knowledge-base-health-scorer",
    ogImage: "https://frontface.app/blog-og/knowledge-base-health-scorer.png",
    ogImageAlt:
      "FrontFace knowledge base health scorer for support teams",
    lastModified: "2026-06-19",
  },
];

export function getTool(slug: string): ToolPage | undefined {
  return tools.find((tool) => tool.slug === slug);
}
