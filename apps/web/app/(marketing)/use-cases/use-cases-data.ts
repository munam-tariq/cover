export interface UseCasePage {
  slug: string;
  name: string;
  heroEyebrow: string;
  heroTitle: string;
  heroSub: string;
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string[];
  canonical: string;
  ogImage: string;
  ogImageAlt: string;
  stat1: { value: string; label: string };
  stat2: { value: string; label: string };
  stat3: { value: string; label: string };
  painPoints: Array<{ problem: string; solution: string }>;
  faqs: Array<{ q: string; a: string }>;
}

export const useCases: UseCasePage[] = [
  {
    slug: "saas",
    name: "SaaS & Startups",
    heroEyebrow: "For SaaS & Startups",
    heroTitle: "AI Support for SaaS — Deflect 68% of Tickets",
    heroSub:
      "You're building product and doing support at the same time. FrontFace resolves how-to questions from your docs, qualifies trial users, and routes high-intent conversations to sales — without hiring.",
    metaTitle: "AI Support for SaaS & Startups",
    metaDescription:
      "FrontFace deflects 68% of support tickets automatically for SaaS teams. RAG-grounded answers from your docs, trial user qualification, and human handoff. Free during beta.",
    metaKeywords: [
      "AI support for SaaS",
      "SaaS customer support AI",
      "AI chatbot for SaaS",
      "startup support automation",
      "SaaS helpdesk alternative",
      "AI knowledge base SaaS",
    ],
    canonical: "https://frontface.app/use-cases/saas",
    ogImage: "https://frontface.app/blog-og/use-case-saas.png",
    ogImageAlt: "FrontFace — AI support for SaaS teams and startups",
    stat1: { value: "68%", label: "tickets deflected automatically" },
    stat2: { value: "5 min", label: "setup — no developer needed" },
    stat3: { value: "24/7", label: "coverage without extra headcount" },
    painPoints: [
      {
        problem: "Repeating the same answers",
        solution:
          "Your agent reads your docs and answers 'How do I…?' questions automatically — freeing you for product work.",
      },
      {
        problem: "Trial users who ghost",
        solution:
          "Capture trial user intent mid-conversation, qualify them, and route high-intent prospects directly to you.",
      },
      {
        problem: "Growing ticket volume, flat headcount",
        solution:
          "Deflect routine questions at scale. The agent handles the repetitive 80% so your team can focus on the complex 20%.",
      },
      {
        problem: "Knowledge that lives in Slack, not your docs",
        solution:
          "Upload Slack exports, Notion pages, or PDFs. FrontFace turns any content into a grounded knowledge base in minutes.",
      },
    ],
    faqs: [
      {
        q: "How long does setup take for a SaaS product?",
        a: "Most SaaS teams are live in under 5 minutes. Point FrontFace at your documentation site or upload your onboarding docs, and paste one script tag. No engineering work required.",
      },
      {
        q: "Can it answer technical product questions?",
        a: "Yes. FrontFace uses RAG (Retrieval-Augmented Generation) to answer from your own docs with cited sources. If the answer isn't in your knowledge base, it says so and routes to a human — rather than guessing.",
      },
      {
        q: "Will it replace my support team?",
        a: "No — it deflects the repetitive 60-80% of questions so your team can focus on complex issues and high-value customers. Human handoff is built in for conversations that need a real person.",
      },
      {
        q: "Can I use it to qualify trial users?",
        a: "Yes. The agent captures context during trial user conversations — use case, team size, pain points — and routes high-intent users to your sales team with full conversation context.",
      },
      {
        q: "Does it integrate with my existing support tools?",
        a: "FrontFace works standalone with a web widget. API and webhook integrations for passing leads and conversations to CRMs are available for connected workflows.",
      },
    ],
  },
  {
    slug: "ecommerce",
    name: "Ecommerce",
    heroEyebrow: "For Ecommerce Stores",
    heroTitle: "AI Customer Support for Ecommerce — 89% Questions Answered",
    heroSub:
      "Answer product questions, order status, and return queries automatically from your own policies. Reduce cart abandonment, capture leads, and give shoppers 24/7 support — without extra headcount.",
    metaTitle: "AI Customer Support for Ecommerce",
    metaDescription:
      "FrontFace answers 89% of ecommerce customer questions automatically — product queries, order status, returns. Works on Shopify, WooCommerce, and more. Free during beta.",
    metaKeywords: [
      "ecommerce AI customer support",
      "AI chatbot for ecommerce",
      "Shopify customer support AI",
      "WooCommerce chatbot",
      "ecommerce support automation",
      "ecommerce live chat alternative",
    ],
    canonical: "https://frontface.app/use-cases/ecommerce",
    ogImage: "https://frontface.app/blog-og/use-case-ecommerce.png",
    ogImageAlt: "FrontFace — AI customer support for ecommerce stores",
    stat1: { value: "89%", label: "questions answered automatically" },
    stat2: { value: "24/7", label: "availability without extra staff" },
    stat3: { value: "< 1 sec", label: "response time" },
    painPoints: [
      {
        problem: '"Where\'s my order?" — every hour of every day',
        solution:
          "Your agent answers order status and shipping questions instantly from your fulfillment policies — without a human touching it.",
      },
      {
        problem: "Product questions killing conversions",
        solution:
          "Answer size, compatibility, and specification questions in real-time. Shoppers get accurate answers and buy with confidence.",
      },
      {
        problem: "Return requests clogging your inbox",
        solution:
          "Handle returns and refund policy questions automatically from your documented policies. Reduce email volume by up to 70%.",
      },
      {
        problem: "Shoppers who abandon without buying",
        solution:
          "The agent identifies high-intent shoppers mid-conversation, captures their contact info, and routes them to the right product or offer.",
      },
    ],
    faqs: [
      {
        q: "Does it work with Shopify?",
        a: "Yes. Add FrontFace to your Shopify store with one line of code in your theme editor. No Shopify app required. See our Shopify integration page for step-by-step instructions.",
      },
      {
        q: "Can it answer questions about specific products?",
        a: "Yes. Feed FrontFace your product catalog, specification sheets, and FAQs. It answers questions about specific products with cited sources from your own content.",
      },
      {
        q: "What about order status and returns?",
        a: "FrontFace answers returns and shipping questions from your documented policies. For real-time order status from your order management system, that requires an API integration.",
      },
      {
        q: "Does it work 24/7?",
        a: "Yes. Your agent handles questions around the clock — including nights, weekends, and peak shopping periods — without requiring additional staffing.",
      },
      {
        q: "Will it work during peak shopping seasons?",
        a: "Yes. FrontFace scales automatically. During Black Friday or other peak periods, it handles the same volume without degraded response times.",
      },
    ],
  },
  {
    slug: "agencies",
    name: "Agencies",
    heroEyebrow: "For Agencies",
    heroTitle: "White-Label AI Chatbot for Agencies",
    heroSub:
      "Manage AI support agents for multiple clients from one dashboard. Each agent runs on its own knowledge base with custom branding — and your clients self-serve without burning your team's time.",
    metaTitle: "White-Label AI Chatbot for Agencies",
    metaDescription:
      "FrontFace lets agencies deploy branded AI support agents for multiple clients from one dashboard. Custom branding, separate knowledge bases, centralized analytics. Free during beta.",
    metaKeywords: [
      "white-label AI chatbot for agencies",
      "agency AI customer support",
      "multi-client chatbot management",
      "AI chatbot reseller",
      "agency support automation",
      "client AI agent platform",
    ],
    canonical: "https://frontface.app/use-cases/agencies",
    ogImage: "https://frontface.app/blog-og/use-case-agencies.png",
    ogImageAlt: "FrontFace — White-label AI chatbot for digital agencies",
    stat1: { value: "10x", label: "efficiency gain across clients" },
    stat2: { value: "1", label: "dashboard for all clients" },
    stat3: { value: "∞", label: "custom-branded agents" },
    painPoints: [
      {
        problem: "Repeating client onboarding questions",
        solution:
          "Each client gets their own knowledge base. Their agent answers onboarding, process, and FAQ questions automatically — before they email you.",
      },
      {
        problem: "Client support consuming your team's time",
        solution:
          "Deflect routine questions across all clients from a single dashboard. Your team handles strategic work, not repetitive how-tos.",
      },
      {
        problem: "No scalable way to add AI support for clients",
        solution:
          "Deploy a custom-branded agent for each client in minutes. Separate knowledge bases, separate branding, one login for you.",
      },
      {
        problem: "Clients want a premium support experience",
        solution:
          "Give each client a fully branded support agent — their logo, their colors, their voice — backed by FrontFace's RAG engine.",
      },
    ],
    faqs: [
      {
        q: "Can I manage multiple clients from one account?",
        a: "Yes. FrontFace's dashboard lets you create and manage multiple agents — one per client — from a single login. Each has its own knowledge base and branding.",
      },
      {
        q: "Can I white-label the chatbot with my client's branding?",
        a: "Yes. Each agent can be customized with a logo, brand colors, and a custom welcome message. Your client's end-users see their brand, not FrontFace.",
      },
      {
        q: "How do I set up a new client agent?",
        a: "Create a new agent, point it at the client's website or upload their docs, customize the branding, and paste the embed code on their site. Most agency setups take under 30 minutes per client.",
      },
      {
        q: "Can clients access their own agent's analytics?",
        a: "You can share analytics data with clients directly from the dashboard. Conversation logs, resolution rates, and top questions are all tracked per agent.",
      },
      {
        q: "Is there a reseller or partner program?",
        a: "We're building our agency program now. Email hello@frontface.app to be early in line for partnership pricing and co-marketing opportunities.",
      },
    ],
  },
  {
    slug: "professional-services",
    name: "Professional Services",
    heroEyebrow: "For Professional Services",
    heroTitle: "AI Support for Professional Services — 2+ Hours Saved Daily",
    heroSub:
      "Stop answering the same questions 50+ times a month. Let your agent handle pricing, process and FAQ questions automatically — and capture leads while you focus on billable work.",
    metaTitle: "AI Support for Professional Services",
    metaDescription:
      "FrontFace saves professional services firms 2+ hours daily by answering common client questions automatically. Works for consultants, lawyers, accountants, and agencies. Free during beta.",
    metaKeywords: [
      "AI support for professional services",
      "AI chatbot for consultants",
      "lawyer chatbot",
      "accountant AI support",
      "professional services automation",
      "client inquiry automation",
    ],
    canonical: "https://frontface.app/use-cases/professional-services",
    ogImage: "https://frontface.app/blog-og/use-case-professional-services.png",
    ogImageAlt:
      "FrontFace — AI support for consultants, lawyers and professional services",
    stat1: { value: "2+ hrs", label: "saved per day on client FAQs" },
    stat2: { value: "24/7", label: "lead capture — even outside office hours" },
    stat3: { value: "0", label: "repeated questions to your inbox" },
    painPoints: [
      {
        problem: '"What are your fees?" — 10 times a week',
        solution:
          "Your agent answers pricing, process, and scope questions from your own content — consistently and at any hour, without draining your time.",
      },
      {
        problem: "Prospects who email and ghost",
        solution:
          "The agent captures contact info and intent during every conversation. Warm leads are routed to you with context — cold ones are answered and moved on.",
      },
      {
        problem: "After-hours inquiries going to voicemail",
        solution:
          "Prospects reach your agent at 11pm on a Sunday. It answers their questions, captures their details, and you follow up in the morning.",
      },
      {
        problem: "Client onboarding questions taking up partner time",
        solution:
          "Clients ask onboarding and process questions to the agent, not your inbox. Your time stays on billable work.",
      },
    ],
    faqs: [
      {
        q: "What kind of questions can it answer for professional services?",
        a: "FrontFace answers questions about your services, pricing structure, process, timelines, credentials, and common client FAQs — grounded in your own content, not generic responses.",
      },
      {
        q: "How do I prevent it from answering sensitive legal or financial questions?",
        a: "You control what's in the knowledge base. Only add content you're comfortable having answered automatically. The agent cites its source for every answer, so clients know what they're getting.",
      },
      {
        q: "Can it book consultations?",
        a: "Yes — when integrated with a calendar booking tool. The agent can direct prospects to your Calendly or similar booking page as part of the lead capture flow.",
      },
      {
        q: "Will it sound too robotic for professional services?",
        a: "You customize the agent's tone and persona. Most professional services firms set a formal, professional tone that matches their brand voice — the agent adopts it for every response.",
      },
      {
        q: "Is client conversation data private?",
        a: "Yes. Conversation data is encrypted and stored securely. FrontFace does not use your clients' conversation data to train models.",
      },
    ],
  },
];
