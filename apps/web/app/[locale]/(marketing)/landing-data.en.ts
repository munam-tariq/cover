/* landing-data.en.ts — English landing content. Structure lives in
   landing-data.ts; keep hrefs/icons/slugs in sync with landing-data.ar.ts. */

import type { LandingData } from "./landing-data";

export const LANDING_EN: LandingData = {
  /* rotating demo businesses for the hero answer-engine */
  demos: [
    {
      name: "The Nourish Co",
      domain: "nourishco.com",
      mono: "NC",
      tag: "Meal subscription support",
      pages: [
        "/menu",
        "/subscriptions",
        "/nutrition",
        "/pricing",
        "/faq",
        "/contact",
      ],
      greeting:
        "Hi! I'm the Nourish Co assistant — ask me anything about your plan.",
      q: "Do you have low-carb meal plans for a 5-day work week?",
      cites: ["/nutrition", "/menu"],
      a: "Yes — our low-carb plan covers Mon–Fri with 466±40 cal/meal, high protein, and easy swaps for allergies or dislikes. Delivery is free across Riyadh, Jeddah, and Dammam.",
      q2: "Can you set up a corporate plan for our office of 40 people?",
      a2: "Absolutely — I'll connect you with our corporate team for a tailored quote. What's the best email to reach you?",
    },
  ],

  caps: [
    [
      "database",
      "Answers from your knowledge base",
      "Trained on your site, docs, PDFs and FAQs. RAG-grounded retrieval means accurate answers with sources — never made up.",
      true,
    ],
    [
      "users",
      "Lead capture & qualification",
      "No pop-ups. The agent earns trust, then collects contact details and qualifies intent through natural conversation.",
    ],
    [
      "handoff",
      "Human handoff, built in",
      "Hands warm or complex chats to your team with full context — queues, assignment and business hours included.",
    ],
    [
      "code",
      "One-line website widget",
      "Drop a single script tag on any site. Shadow-DOM isolation means zero style conflicts, on any stack.",
    ],
    [
      "monitor",
      "Public agent page",
      "No website? Get a hosted page for your agent — a shareable link that works as your online front desk.",
    ],
    [
      "broadcast",
      "Proactive campaigns",
      "Trigger targeted messages by page, intent or audience to greet, convert and re-engage visitors.",
    ],
    [
      "channels",
      "Multi-channel",
      "One agent across web, WhatsApp, Slack and Messenger — same brain, same knowledge, everywhere.",
    ],
    [
      "chart",
      "Analytics that matter",
      "See what visitors ask, where the agent struggles and which conversations convert. Improve from real gaps.",
    ],
  ],

  steps: [
    [
      "database",
      "Feed it your knowledge",
      "Point FrontFace at your website, or upload docs, PDFs and FAQs. It reads everything and builds a grounded knowledge base in minutes.",
    ],
    [
      "bot",
      "It answers customers",
      "Visitors ask in plain language. Your agent replies instantly with accurate, sourced answers — in your brand voice, around the clock.",
    ],
    [
      "users",
      "It captures the lead",
      "When the moment's right, it collects contact details and qualifies intent — no forms, just conversation.",
    ],
    [
      "handoff",
      "It hands off cleanly",
      "Anything complex routes to your team with the full conversation, so a human picks up exactly where the agent left off.",
    ],
  ],

  stats: [
    ["89%", "Questions answered automatically"],
    ["12s", "Average time to first answer"],
    ["5 min", "From signup to live agent"],
    ["24/7", "Always-on availability"],
  ],

  nav: [
    ["Product", "/#capabilities"],
    ["How it works", "/#how"],
    ["Pricing", "/#pricing"],
  ],

  resourceLinks: [
    ["Blog", "/blog", "Playbooks, guides & product updates", "book"],
    ["Tools", "/tools", "Free calculators for support teams", "sliders"],
    ["Use cases", "/use-cases", "AI support for your industry", "layers"],
    ["Compare", "/vs", "FrontFace vs other support tools", "chart"],
    ["Integrations", "/integrations", "Works on any website", "grid"],
  ],

  footCols: [
    [
      "Product",
      [
        ["Features", "/#capabilities"],
        ["How it works", "/#how"],
        ["Pricing", "/#pricing"],
        ["Tools", "/tools"],
        ["Blog", "/blog"],
      ],
    ],
    [
      "Company",
      [
        ["About", "/about"],
        ["Use cases", "/use-cases"],
        ["Integrations", "/integrations"],
      ],
    ],
    [
      "Compare",
      [
        ["vs Chatbase", "/vs/chatbase"],
        ["vs Intercom", "/vs/intercom"],
        ["vs Zendesk", "/vs/zendesk"],
        ["vs Tidio", "/vs/tidio"],
        ["All comparisons", "/vs"],
      ],
    ],
    [
      "Legal",
      [
        ["Privacy", "/privacy"],
        ["Terms", "/terms"],
      ],
    ],
  ],
};
