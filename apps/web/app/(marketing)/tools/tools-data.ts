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
];

export function getTool(slug: string): ToolPage | undefined {
  return tools.find((tool) => tool.slug === slug);
}
