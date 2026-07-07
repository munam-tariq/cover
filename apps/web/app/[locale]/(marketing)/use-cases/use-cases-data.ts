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
  relatedLinks: Array<{ href: string; label: string }>;
}

export const useCases: UseCasePage[] = [
  {
    slug: "saas",
    relatedLinks: [
      { href: "/vs/chatbase", label: "FrontFace vs Chatbase" },
      { href: "/vs/intercom", label: "FrontFace vs Intercom Fin" },
      { href: "/blog/ai-customer-support-guide-startups", label: "AI customer support guide for startups" },
      { href: "/tools/support-ticket-deflection-calculator", label: "Support ticket deflection calculator" },
      { href: "/tools/ai-vs-human-support-calculator", label: "AI vs human support cost comparison" },
    ],
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
    relatedLinks: [
      { href: "/integrations/shopify", label: "Shopify AI chatbot integration" },
      { href: "/vs/tidio", label: "FrontFace vs Tidio" },
      { href: "/blog/add-ai-support-to-shopify-store", label: "How to add AI support to Shopify" },
      { href: "/tools/support-ticket-deflection-calculator", label: "Support ticket deflection calculator" },
    ],
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
    relatedLinks: [
      { href: "/integrations/wordpress", label: "WordPress AI chatbot integration" },
      { href: "/integrations/webflow", label: "Webflow AI chatbot integration" },
      { href: "/vs/crisp", label: "FrontFace vs Crisp" },
      { href: "/tools/support-ticket-deflection-calculator", label: "Support ticket deflection calculator" },
    ],
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
    relatedLinks: [
      { href: "/integrations/wix", label: "Wix AI chatbot integration" },
      { href: "/vs/freshdesk", label: "FrontFace vs Freshdesk" },
      { href: "/blog/chatbot-for-small-business", label: "AI chatbot for small business" },
      { href: "/tools/support-ticket-deflection-calculator", label: "Support ticket deflection calculator" },
    ],
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
  {
    slug: "healthcare",
    relatedLinks: [
      { href: "/vs/zendesk", label: "FrontFace vs Zendesk" },
      { href: "/blog/chatbot-for-small-business", label: "AI chatbot for small business" },
      { href: "/tools/support-ticket-deflection-calculator", label: "Support ticket deflection calculator" },
    ],
    name: "Healthcare",
    heroEyebrow: "For Healthcare Providers",
    heroTitle: "AI Patient Support — Answer FAQs Without Staff Time",
    heroSub:
      "Let patients get instant answers to appointment, billing, and general health policy questions — 24/7 from your own content. Reduce front-desk call volume and after-hours inquiries automatically.",
    metaTitle: "AI Patient Support for Healthcare Providers",
    metaDescription:
      "FrontFace answers patient FAQ questions automatically — appointments, billing, insurance policies, and general inquiries. Reduces front-desk call volume. Free during beta.",
    metaKeywords: [
      "AI patient support healthcare",
      "healthcare chatbot",
      "medical office AI support",
      "patient FAQ automation",
      "healthcare customer support AI",
      "clinic chatbot",
    ],
    canonical: "https://frontface.app/use-cases/healthcare",
    ogImage: "https://frontface.app/blog-og/use-case-healthcare.png",
    ogImageAlt: "FrontFace — AI patient support for healthcare providers",
    stat1: { value: "73%", label: "of patients prefer self-service for appointment info" },
    stat2: { value: "40%", label: "reduction in front-desk call volume" },
    stat3: { value: "24/7", label: "patient inquiry coverage" },
    painPoints: [
      {
        problem: "Front desk overwhelmed with repeat appointment questions",
        solution:
          "Your agent answers 'What do I bring?', 'How do I reschedule?', and 'Do you accept my insurance?' automatically — from your own policies, around the clock.",
      },
      {
        problem: "After-hours patient questions with no coverage",
        solution:
          "Patients reaching out at 9pm about tomorrow's appointment get instant, accurate answers from your published content — not voicemail.",
      },
      {
        problem: "Insurance and billing FAQ clogging the phone",
        solution:
          "Handle co-pay, coverage, and billing questions from your published policy pages. Reduce calls about information already on your site.",
      },
      {
        problem: "New patient onboarding is manual and slow",
        solution:
          "Answer new patient intake questions, prep instructions, and paperwork FAQ automatically so staff can focus on care, not admin.",
      },
    ],
    faqs: [
      {
        q: "Can FrontFace answer HIPAA-sensitive questions?",
        a: "FrontFace answers from your published, non-sensitive content — general policies, appointment info, and FAQs. It doesn't access patient records or PHI. Keep sensitive patient-specific questions routed to staff, and only add content you're comfortable publishing publicly.",
      },
      {
        q: "What kinds of patient questions can it handle?",
        a: "FrontFace handles appointment prep questions, location and hours, accepted insurance plans, parking and access, general billing policies, and new patient onboarding FAQ — all from your own content.",
      },
      {
        q: "How do we control what the agent says?",
        a: "You control the knowledge base completely. The agent only answers from content you upload or link. You can limit it to specific FAQs and review all answers before going live.",
      },
      {
        q: "Can it be used on a medical practice website?",
        a: "Yes. FrontFace works on any website — WordPress, Wix, Squarespace, or a custom practice management site. One script tag adds the widget sitewide.",
      },
    ],
  },
  {
    slug: "real-estate",
    relatedLinks: [
      { href: "/vs/crisp", label: "FrontFace vs Crisp" },
      { href: "/blog/chatbot-lead-generation-guide", label: "Chatbot lead generation guide" },
      { href: "/tools/support-ticket-deflection-calculator", label: "Support ticket deflection calculator" },
    ],
    name: "Real Estate",
    heroEyebrow: "For Real Estate Agents & Brokerages",
    heroTitle: "AI Lead Qualification for Real Estate — 3x More Qualified Inquiries",
    heroSub:
      "Answer property questions, qualify buyer and seller intent, and capture leads 24/7 from your listings and content. Your agent works while you're showing homes.",
    metaTitle: "AI Support for Real Estate Agents and Brokerages",
    metaDescription:
      "FrontFace qualifies real estate leads and answers property questions automatically. Works on any real estate website. Free during beta.",
    metaKeywords: [
      "AI support real estate",
      "real estate chatbot",
      "property inquiry automation",
      "real estate lead qualification AI",
      "real estate website chatbot",
      "realtor AI support",
    ],
    canonical: "https://frontface.app/use-cases/real-estate",
    ogImage: "https://frontface.app/blog-og/use-case-real-estate.png",
    ogImageAlt: "FrontFace — AI lead qualification for real estate",
    stat1: { value: "67%", label: "of buyers research online before contacting an agent" },
    stat2: { value: "3x", label: "more leads captured vs contact form alone" },
    stat3: { value: "24/7", label: "property inquiry coverage" },
    painPoints: [
      {
        problem: "Listing inquiries arriving after hours with no response",
        solution:
          "Your agent answers property questions around the clock — bedroom count, neighborhood, school districts, HOA fees — and captures the buyer's contact info for morning follow-up.",
      },
      {
        problem: "Tire-kicker inquiries wasting showing time",
        solution:
          "The agent qualifies intent during the conversation — budget, timeline, pre-approval status — so you only follow up with buyers who are ready to move.",
      },
      {
        problem: "Sellers asking the same pre-listing questions",
        solution:
          "Handle 'What's my home worth?', 'How does your commission work?', and 'What's the process?' automatically from your content — freeing your time for closings.",
      },
      {
        problem: "Leads from property portals with no follow-up system",
        solution:
          "Capture buyer and seller email, phone, and intent from every chat conversation. Route hot leads to your CRM immediately — never miss a warm contact again.",
      },
    ],
    faqs: [
      {
        q: "Can it answer questions about specific property listings?",
        a: "Yes. Upload your listing data or point FrontFace at your listings pages. It answers questions about specific properties — features, pricing, availability — from the content you provide.",
      },
      {
        q: "How does it qualify leads?",
        a: "The agent asks conversational qualification questions — budget range, buying timeline, pre-approval status, property type — and routes high-intent buyers to you immediately with full conversation context.",
      },
      {
        q: "Does it work on IDX website platforms?",
        a: "FrontFace works on any website that accepts a JavaScript snippet — including IDX platforms that support custom code injection. Check your platform's custom code settings.",
      },
      {
        q: "Can a brokerage use it for multiple agents?",
        a: "Yes. FrontFace supports multiple agents and knowledge bases from one account. Assign each agent their own branded chatbot with their listings and contact routing.",
      },
    ],
  },
  {
    slug: "education",
    relatedLinks: [
      { href: "/vs/tidio", label: "FrontFace vs Tidio" },
      { href: "/blog/chatbot-for-small-business", label: "AI chatbot for small business" },
      { href: "/tools/support-ticket-deflection-calculator", label: "Support ticket deflection calculator" },
    ],
    name: "Education",
    heroEyebrow: "For Schools, Courses & EdTech",
    heroTitle: "AI Student Support — Answer Enrollment Questions Instantly",
    heroSub:
      "Handle admissions FAQ, course questions, and student onboarding automatically. Reduce pre-enrollment email volume and give prospective students instant answers — 24/7.",
    metaTitle: "AI Support for Education and Online Courses",
    metaDescription:
      "FrontFace answers student and enrollment questions automatically for schools, universities, and online course creators. Reduces pre-enrollment email volume. Free during beta.",
    metaKeywords: [
      "AI student support education",
      "education chatbot",
      "enrollment FAQ automation",
      "online course AI support",
      "university chatbot",
      "edtech customer support AI",
    ],
    canonical: "https://frontface.app/use-cases/education",
    ogImage: "https://frontface.app/blog-og/use-case-education.png",
    ogImageAlt: "FrontFace — AI student support for education providers",
    stat1: { value: "81%", label: "of prospective students want instant enrollment answers" },
    stat2: { value: "62%", label: "reduction in pre-enrollment email volume" },
    stat3: { value: "24/7", label: "admissions FAQ coverage" },
    painPoints: [
      {
        problem: "Admissions inbox flooded with the same FAQ",
        solution:
          "Answer 'What are the prerequisites?', 'When does the course start?', and 'Do you offer certificates?' automatically from your course pages — before they email.",
      },
      {
        problem: "Prospective students bouncing without enrolling",
        solution:
          "When a visitor is on the fence about enrolling, the agent answers their hesitation in real time and captures their email for a follow-up nudge.",
      },
      {
        problem: "Student onboarding questions eating instructor time",
        solution:
          "Handle 'How do I access the course?', 'Where are my downloads?', and 'How do I get my certificate?' automatically so instructors focus on teaching.",
      },
      {
        problem: "International students asking about applications across time zones",
        solution:
          "Your agent answers application deadlines, visa documentation questions, and program eligibility at any hour — so no inquiry goes unanswered overnight.",
      },
    ],
    faqs: [
      {
        q: "What kinds of education organizations use FrontFace?",
        a: "FrontFace works for online course creators, coding bootcamps, language schools, universities, private tutors, and corporate training programs — any organization with recurring student or prospective student FAQ.",
      },
      {
        q: "Can it handle course-specific questions?",
        a: "Yes. Upload your course syllabi, curriculum pages, and FAQ documents. The agent answers questions about specific courses — content, duration, prerequisites, and outcomes — from your content.",
      },
      {
        q: "Can it capture prospective student contact info?",
        a: "Yes. When a prospective student asks about enrollment but isn't ready to sign up, the agent can collect their email for follow-up — turning a chat into a warm lead.",
      },
      {
        q: "Does it work on learning management systems?",
        a: "FrontFace works on any website with a custom code option — including LMS platforms like Teachable, Thinkific, or Kajabi that allow header or footer script injection.",
      },
    ],
  },
  {
    slug: "fintech",
    relatedLinks: [
      { href: "/vs/intercom", label: "FrontFace vs Intercom Fin" },
      { href: "/vs/zendesk", label: "FrontFace vs Zendesk" },
      { href: "/tools/support-ticket-deflection-calculator", label: "Support ticket deflection calculator" },
      { href: "/tools/ai-vs-human-support-calculator", label: "AI vs human support cost comparison" },
    ],
    name: "Fintech",
    heroEyebrow: "For Fintech Products",
    heroTitle: "AI Support for Fintech — Accurate Answers, Zero Compliance Risk",
    heroSub:
      "Answer onboarding, feature, and policy questions from your own content — grounded in what you've actually published. No hallucinated compliance claims, no confabulated financial advice.",
    metaTitle: "AI Customer Support for Fintech Companies",
    metaDescription:
      "FrontFace answers fintech product questions accurately from your own docs — onboarding FAQ, feature explanations, compliance policies. Zero hallucination risk. Free during beta.",
    metaKeywords: [
      "fintech AI customer support",
      "fintech chatbot",
      "financial product support AI",
      "fintech onboarding automation",
      "compliance-safe chatbot",
      "fintech FAQ automation",
    ],
    canonical: "https://frontface.app/use-cases/fintech",
    ogImage: "https://frontface.app/blog-og/use-case-fintech.png",
    ogImageAlt: "FrontFace — AI customer support for fintech products",
    stat1: { value: "84%", label: "of fintech users prefer self-service for basic account FAQ" },
    stat2: { value: "60%", label: "reduction in repetitive onboarding support tickets" },
    stat3: { value: "0", label: "hallucinated compliance claims" },
    painPoints: [
      {
        problem: "Onboarding questions flooding support before users activate",
        solution:
          "Answer KYC steps, identity verification requirements, and account setup FAQ automatically from your onboarding docs — before users open a ticket.",
      },
      {
        problem: "Compliance-sensitive questions needing accurate answers",
        solution:
          "FrontFace retrieves from your published compliance and policy content only. It cites its source for every answer and says 'I don't know' rather than inventing a regulatory claim.",
      },
      {
        problem: "Feature education at scale",
        solution:
          "Explain how features work — transfers, limits, fees, integrations — from your product docs. Scale feature education without scaling the support team.",
      },
      {
        problem: "User questions about fees and pricing structure",
        solution:
          "Answer 'What are the transaction fees?', 'How are limits set?', and 'What's included in my plan?' accurately from your published pricing pages — not a generic LLM guess.",
      },
    ],
    faqs: [
      {
        q: "Is FrontFace safe to use for financial product support?",
        a: "FrontFace only answers from content you provide — it doesn't generate financial advice, make regulatory claims, or invent information. If the answer isn't in your knowledge base, it says so and routes to a human. You control the content; you control the answers.",
      },
      {
        q: "Can it handle KYC and verification questions?",
        a: "Yes — for the process and policy side. 'What documents do I need?', 'How long does verification take?', and 'What happens if verification fails?' are all answerable from your onboarding documentation.",
      },
      {
        q: "How do we ensure it doesn't give incorrect financial information?",
        a: "FrontFace is RAG-based — every answer is retrieved from your content and cited. It cannot generate information not in your knowledge base. Review your knowledge base content before going live to ensure accuracy.",
      },
      {
        q: "Can it work alongside a regulated financial support team?",
        a: "Yes. Set clear escalation rules: the agent handles FAQ from your docs, and routes anything that could constitute regulated financial advice or account-specific questions to a licensed human agent.",
      },
    ],
  },
  {
    slug: "restaurants",
    relatedLinks: [
      { href: "/integrations/wix", label: "Wix AI chatbot integration" },
      { href: "/integrations/squarespace", label: "Squarespace AI chatbot integration" },
      { href: "/blog/chatbot-for-small-business", label: "AI chatbot for small business" },
      { href: "/tools/support-ticket-deflection-calculator", label: "Support ticket deflection calculator" },
    ],
    name: "Restaurants & Hospitality",
    heroEyebrow: "For Restaurants & Hospitality",
    heroTitle: "AI Support for Restaurants — Answer Menu Questions Instantly",
    heroSub:
      "Handle menu, hours, reservations, and dietary questions automatically. Capture booking intent 24/7 and stop losing diners to unanswered questions before they visit.",
    metaTitle: "AI Customer Support for Restaurants and Hospitality",
    metaDescription:
      "FrontFace answers restaurant menu, hours, reservation, and dietary questions automatically. Works on any restaurant website. Free during beta.",
    metaKeywords: [
      "restaurant AI chatbot",
      "restaurant customer support AI",
      "menu FAQ automation",
      "hospitality chatbot",
      "restaurant website chatbot",
      "restaurant reservation AI",
    ],
    canonical: "https://frontface.app/use-cases/restaurants",
    ogImage: "https://frontface.app/blog-og/use-case-restaurants.png",
    ogImageAlt: "FrontFace — AI customer support for restaurants and hospitality",
    stat1: { value: "76%", label: "of diners check online before visiting" },
    stat2: { value: "43%", label: "of reservation calls are questions already on the website" },
    stat3: { value: "24/7", label: "dining inquiry coverage" },
    painPoints: [
      {
        problem: "Phone lines busy with menu and hours questions",
        solution:
          "Your agent answers 'What are your hours?', 'Do you have vegan options?', and 'Is the kitchen open late?' instantly from your menu and website — keeping the phone free for actual reservations.",
      },
      {
        problem: "Allergy and dietary questions creating liability risk",
        solution:
          "Answer allergen and dietary questions accurately from your published menu content. Every answer cites the source so diners know exactly what they're getting.",
      },
      {
        problem: "Private event inquiries going unanswered after hours",
        solution:
          "Capture private dining, corporate event, and large-party inquiry details at any hour. Route to your events team in the morning with full contact info and party size.",
      },
      {
        problem: "Reservation platform questions adding friction",
        solution:
          "Answer 'How do I book a table?', 'Can I modify my reservation?', and 'Do you take walk-ins?' automatically — reducing friction between interest and visit.",
      },
    ],
    faqs: [
      {
        q: "What types of restaurant questions can FrontFace answer?",
        a: "FrontFace answers hours, location, parking, menu items, dietary restrictions, allergen information, reservation policies, private event inquiries, and dress code questions — all from your published menu and website content.",
      },
      {
        q: "Does it integrate with our reservation system?",
        a: "FrontFace answers reservation policy questions from your content and can direct guests to your booking platform. Direct integration with reservation systems requires a custom webhook setup.",
      },
      {
        q: "Can it handle seasonal menu changes?",
        a: "Yes. Update your menu content in the FrontFace knowledge base and the agent immediately reflects the new information. No re-deployment needed.",
      },
      {
        q: "Does it work on a restaurant website built with Squarespace or Wix?",
        a: "Yes. FrontFace works on any website platform — Squarespace, Wix, WordPress, or a custom site — via a simple script tag. No plugin or developer needed.",
      },
    ],
  },
  {
    slug: "b2b",
    relatedLinks: [
      { href: "/vs/drift", label: "FrontFace vs Drift" },
      { href: "/vs/hubspot-chat", label: "FrontFace vs HubSpot Live Chat" },
      { href: "/blog/chatbot-lead-generation-guide", label: "Chatbot lead generation guide" },
      { href: "/tools/ai-vs-human-support-calculator", label: "AI vs human support cost comparison" },
    ],
    name: "B2B Companies",
    heroEyebrow: "For B2B Sales Teams",
    heroTitle: "AI Support for B2B — Qualify Prospects Before Sales Touches Them",
    heroSub:
      "Answer pre-sales questions, qualify intent, and capture ICP leads 24/7. Let your AI agent handle the research-phase questions so your sales team focuses on conversations that matter.",
    metaTitle: "AI Customer Support for B2B Companies",
    metaDescription:
      "FrontFace qualifies B2B prospects and answers pre-sales questions automatically. Captures ICP leads with context 24/7. Free during beta.",
    metaKeywords: [
      "B2B AI customer support",
      "B2B chatbot lead qualification",
      "B2B sales support automation",
      "pre-sales chatbot",
      "B2B prospect qualification AI",
      "B2B FAQ automation",
    ],
    canonical: "https://frontface.app/use-cases/b2b",
    ogImage: "https://frontface.app/blog-og/use-case-b2b.png",
    ogImageAlt: "FrontFace — AI support and lead qualification for B2B companies",
    stat1: { value: "57%", label: "of B2B buyers decide before talking to sales" },
    stat2: { value: "3.4x", label: "higher qualified lead rate vs contact form" },
    stat3: { value: "24/7", label: "prospect self-service coverage" },
    painPoints: [
      {
        problem: "Sales team answering the same pre-sales FAQ",
        solution:
          "Handle 'How does pricing work?', 'Do you integrate with X?', and 'What's the implementation timeline?' automatically — so sales only touches prospects who are ready.",
      },
      {
        problem: "Inbound leads arriving with no context",
        solution:
          "The agent qualifies company size, use case, timeline, and decision authority during every conversation — so your CRM gets enriched leads, not blank form submissions.",
      },
      {
        problem: "Prospects going dark after one website visit",
        solution:
          "When a high-intent prospect visits pricing and bounces, the agent can capture their email and use case before they leave — giving sales a warm re-engagement lead.",
      },
      {
        problem: "Demo requests from outside your ICP",
        solution:
          "Let the agent qualify before routing to a demo. It asks the right questions, filters out mismatches, and routes ideal customers directly to your calendar.",
      },
    ],
    faqs: [
      {
        q: "How does FrontFace qualify B2B prospects?",
        a: "The agent asks conversational qualification questions during support interactions — company size, use case, budget range, decision timeline, and authority. High-intent leads are routed immediately with full context.",
      },
      {
        q: "Can it book demos or discovery calls directly?",
        a: "Yes — when integrated with a calendar tool like Calendly. The agent can direct qualified prospects to your booking link as part of the lead capture flow.",
      },
      {
        q: "What B2B content should I add to the knowledge base?",
        a: "Add your pricing page, product feature pages, integration docs, case studies, and common objection FAQ. These cover the research-phase questions most B2B prospects ask before contacting sales.",
      },
      {
        q: "Does it work for SaaS, services, and physical product B2B companies?",
        a: "Yes. FrontFace works for any B2B company with a website and repeating pre-sales questions — SaaS, consulting firms, manufacturers, distributors, and agencies.",
      },
    ],
  },
  {
    slug: "developers",
    relatedLinks: [
      { href: "/integrations/nextjs", label: "Next.js AI chatbot integration" },
      { href: "/integrations/react", label: "React AI chatbot integration" },
      { href: "/vs/intercom", label: "FrontFace vs Intercom Fin" },
      { href: "/tools/support-ticket-deflection-calculator", label: "Support ticket deflection calculator" },
    ],
    name: "Developer Tools & APIs",
    heroEyebrow: "For Developer Products",
    heroTitle: "AI Docs Chatbot for Developer Tools — 4x Faster Onboarding",
    heroSub:
      "Let developers ask questions to your documentation directly. Answer integration questions, error codes, and API usage instantly from your docs — reduce support burden while improving developer experience.",
    metaTitle: "AI Documentation Chatbot for Developer Tools",
    metaDescription:
      "FrontFace answers developer integration questions, error codes, and API usage from your documentation. 4x faster developer onboarding. Free during beta.",
    metaKeywords: [
      "developer documentation chatbot",
      "API support AI",
      "developer tools AI support",
      "docs chatbot",
      "developer onboarding automation",
      "API FAQ chatbot",
    ],
    canonical: "https://frontface.app/use-cases/developers",
    ogImage: "https://frontface.app/blog-og/use-case-developers.png",
    ogImageAlt: "FrontFace — AI docs chatbot for developer tools and APIs",
    stat1: { value: "4x", label: "faster developer onboarding with docs AI" },
    stat2: { value: "72%", label: "of developer questions answered from documentation" },
    stat3: { value: "< 2 sec", label: "average response time" },
    painPoints: [
      {
        problem: "Developer support questions clogging Slack and Discord",
        solution:
          "Answer SDK usage questions, error codes, and configuration FAQ directly from your docs — so your Slack channel stays focused on strategic discussions, not setup troubleshooting.",
      },
      {
        problem: "The same integration questions answered by your team daily",
        solution:
          "Handle 'How do I authenticate?', 'What are the rate limits?', and 'Why am I getting error 422?' automatically from your API reference — freeing engineers for building.",
      },
      {
        problem: "Developers giving up during onboarding",
        solution:
          "When developers get stuck, they often churn silently rather than asking for help. A chatbot on your docs site catches them at the friction point and resolves it instantly.",
      },
      {
        problem: "Docs that are hard to search",
        solution:
          "Developers ask natural language questions — not keyword searches. FrontFace retrieves the right doc section for any question and explains it in context.",
      },
    ],
    faqs: [
      {
        q: "How do I add FrontFace to a documentation site?",
        a: "Add the FrontFace script tag to your docs site's base layout. Works with Docusaurus, ReadMe, GitBook, Mintlify, plain HTML, or any docs platform that accepts custom code. Point it at your docs URL and it indexes automatically.",
      },
      {
        q: "Can it answer questions about specific API endpoints?",
        a: "Yes. Upload your API reference, OpenAPI spec, or link to your docs URL. The agent answers questions about specific endpoints, parameters, authentication, and response formats from your actual documentation.",
      },
      {
        q: "Will it give wrong technical answers?",
        a: "FrontFace only answers from your documentation — it doesn't generate information beyond what you've provided. Every answer cites the specific doc section it used. If the answer isn't in your docs, it says so rather than guessing.",
      },
      {
        q: "Can it help with error messages and debugging?",
        a: "Yes. Add your error code reference and troubleshooting guides to the knowledge base. Developers can paste an error message and get the relevant troubleshooting steps from your docs instantly.",
      },
    ],
  },
  {
    slug: "nonprofits",
    relatedLinks: [
      { href: "/blog/chatbot-for-small-business", label: "AI chatbot for small business" },
      { href: "/vs/crisp", label: "FrontFace vs Crisp" },
      { href: "/tools/support-ticket-deflection-calculator", label: "Support ticket deflection calculator" },
    ],
    name: "Nonprofits",
    heroEyebrow: "For Nonprofits & Charities",
    heroTitle: "AI Support for Nonprofits — Handle Volunteer & Donor FAQ Automatically",
    heroSub:
      "Answer volunteer applications, donation questions, program eligibility, and event FAQ automatically — without spending staff time on information already on your website.",
    metaTitle: "AI Support for Nonprofits and Charities",
    metaDescription:
      "FrontFace answers volunteer, donor, and program FAQ automatically for nonprofits. Reduces staff time on repetitive inquiries. Free during beta.",
    metaKeywords: [
      "nonprofit AI support",
      "charity chatbot",
      "volunteer FAQ automation",
      "donor support AI",
      "nonprofit website chatbot",
      "charity support automation",
    ],
    canonical: "https://frontface.app/use-cases/nonprofits",
    ogImage: "https://frontface.app/blog-og/use-case-nonprofits.png",
    ogImageAlt: "FrontFace — AI support for nonprofits and charities",
    stat1: { value: "3x", label: "more donor FAQ answered per staff hour" },
    stat2: { value: "68%", label: "of volunteer questions handled automatically" },
    stat3: { value: "24/7", label: "program inquiry coverage" },
    painPoints: [
      {
        problem: "Staff time consumed by volunteer application questions",
        solution:
          "Answer 'How do I apply?', 'What are the requirements?', and 'When are your volunteer shifts?' automatically from your website — so staff time goes to mission delivery.",
      },
      {
        problem: "Donor FAQ going to the wrong inbox",
        solution:
          "Handle 'Is my donation tax-deductible?', 'Do you accept recurring donations?', and 'How do I update my payment method?' from your published donor FAQ — automatically.",
      },
      {
        problem: "Program eligibility questions repeating across channels",
        solution:
          "Answer eligibility requirements, application deadlines, and program details from your content consistently — across email, web, and social-referred visitors.",
      },
      {
        problem: "Event questions eating coordinator time",
        solution:
          "Handle 'Where is the event?', 'What should I bring?', and 'How do I register?' automatically in the weeks before your events — without flooding your coordinator's inbox.",
      },
    ],
    faqs: [
      {
        q: "Can FrontFace help with donation and giving questions?",
        a: "Yes. Add your donation FAQ — tax deductibility, accepted payment methods, recurring giving, matching gift programs — to the knowledge base. The agent answers these from your published content without manual handling.",
      },
      {
        q: "Does it work for volunteer recruitment?",
        a: "Yes. Add your volunteer application details, role requirements, shift schedules, and onboarding steps. Prospective volunteers get answers and can be directed to apply — without staff involvement for routine inquiries.",
      },
      {
        q: "How does FrontFace fit into a nonprofit's limited budget?",
        a: "FrontFace is free during beta and designed for lean teams. It reduces staff time spent on repetitive FAQ so your team can focus on the work that requires human judgment and relationship building.",
      },
      {
        q: "Can it answer questions about specific programs or beneficiaries?",
        a: "Yes — from content you provide. Upload program descriptions, eligibility guides, and impact reports. The agent answers from those documents with cited sources, ensuring consistency with your published information.",
      },
    ],
  },
];
