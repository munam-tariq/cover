/* landing-data.ts — content for the FrontFace landing page.
   Faithful port of the data exports in redesign/landing-icons.jsx. */

import type { IconName } from "./components/marketing-kit";

export interface Demo {
  name: string;
  domain: string;
  mono: string;
  tag: string;
  pages: string[];
  greeting: string;
  q: string;
  cites: string[];
  a: string;
  q2: string;
  a2: string;
}

/* rotating demo businesses for the hero answer-engine */
export const DEMOS: Demo[] = [
  {
    name: "HofMigration",
    domain: "hofmigration.com",
    mono: "HM",
    tag: "Migration support",
    pages: ["/services", "/visa-types", "/process", "/pricing", "/faq", "/contact"],
    greeting: "Hi! I'm the HofMigration assistant — ask me anything about your move.",
    q: "What visa options do you support for skilled workers?",
    cites: ["/visa-types", "/process"],
    a: "HofMigration supports skilled-worker visas, family reunification, student permits, and permanent residency applications — with end-to-end case management and document review.",
    q2: "Can someone guide our team of 12 through the relocation process?",
    a2: "Absolutely — I'll connect you with a relocation specialist for a tailored plan. What's the best email to reach you?",
  },
  {
    name: "OneGo",
    domain: "onego.ae",
    mono: "OG",
    tag: "Car marketplace",
    pages: ["/buy", "/finance", "/inspection", "/warranty", "/locations", "/faq"],
    greeting: "Welcome to OneGo! How can I help with your car today?",
    q: "Do you inspect cars before delivery?",
    cites: ["/inspection", "/warranty"],
    a: "Every OneGo car passes a 200-point inspection before delivery, and comes with a warranty plus free home delivery in most GCC cities.",
    q2: "Can someone help me sell my Land Cruiser?",
    a2: "Of course — I'll connect you with a OneGo specialist for a quick valuation. What's the best email to reach you?",
  },
  {
    name: "Sleet",
    domain: "sleet.io",
    mono: "SL",
    tag: "Logistics",
    pages: ["/shipping", "/tracking", "/freight", "/warehousing", "/coverage", "/pricing"],
    greeting: "Hi, I'm the Sleet assistant. What can I help you ship?",
    q: "Do you handle cross-border freight with tracking?",
    cites: ["/freight", "/tracking", "/coverage"],
    a: "Yes — Sleet manages cross-border freight across 40+ countries with real-time tracking on every shipment, plus warehousing and last-mile delivery from one dashboard.",
    q2: "Can someone set up shipping for 500 orders a day?",
    a2: "Happy to help at that volume — I'll connect you with a logistics specialist. What's the best email to reach you?",
  },
];

/* capabilities grid — [icon, title, description, featured?] */
export type Cap = [IconName, string, string, boolean?];
export const CAPS: Cap[] = [
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
];

/* how-it-works steps — [icon, title, description] */
export type Step = [IconName, string, string];
export const STEPS: Step[] = [
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
];

/* stats — [value, label] */
export const STATS: [string, string][] = [
  ["89%", "Questions answered automatically"],
  ["12s", "Average time to first answer"],
  ["5 min", "From signup to live agent"],
  ["24/7", "Always-on availability"],
];

/* testimonials (fictional) */
export interface Testimonial {
  co: string;
  quote: string;
  who: string;
  role: string;
}
export const TESTI: Testimonial[] = [
  {
    co: "HofMigration",
    quote:
      "We deflect 68% of support tickets now. Clients get instant answers on visa requirements and our consultants finally have room to breathe.",
    who: "Maya Okonkwo",
    role: "Head of CX",
  },
  {
    co: "OneGo",
    quote:
      "It read our help center and just knew the answers. Setup took an afternoon — and it quietly captures leads while it's at it.",
    who: "Daniel Reyes",
    role: "Operations Lead",
  },
  {
    co: "Sleet",
    quote:
      "Handoff is seamless. Customers never feel stuck, and our reps only step in when it actually matters.",
    who: "Priya Anand",
    role: "Support Manager",
  },
];

export const LOGOS = ["HofMigration", "OneGo", "Sleet"];

/* nav — [label, href]. Anchors are prefixed with "/" so they navigate to the
   landing page first when clicked from another marketing route. */
export const NAV: [string, string][] = [
  ["Product", "/#capabilities"],
  ["How it works", "/#how"],
  ["Pricing", "/#pricing"],
  ["Blog", "/blog"],
];
