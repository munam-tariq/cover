import { Metadata } from "next";
import Script from "next/script";

import { CapabilitiesSection } from "./components/capabilities-section";
import { DeployAnywhere } from "./components/deploy-anywhere";
import { FinalCta } from "./components/final-cta";
import { HeroSection } from "./components/hero-section";
import { HowItWorks } from "./components/how-it-works";
import { LogoStrip } from "./components/logo-strip";
import { PricingSection } from "./components/pricing-section";
import { SocialProof } from "./components/social-proof";
import { StatsBar } from "./components/stats-bar";

export const metadata: Metadata = {
  title: "FrontFace — AI Support Agent That Knows Your Product",
  description:
    "FrontFace is an AI support agent trained on your knowledge base. It answers customers instantly with cited sources, captures leads, and hands off to your team — on your site or anywhere. Free during beta.",
  keywords: [
    "AI support agent",
    "AI customer support",
    "knowledge base AI",
    "RAG chatbot",
    "grounded AI answers",
    "AI help desk",
    "answer engine",
    "human handoff chatbot",
    "AI lead capture",
    "knowledge base chatbot",
  ],
  openGraph: {
    images: [
      {
        url: "https://frontface.app/og-image.png",
        width: 1200,
        height: 630,
        alt: "FrontFace — AI support agent that knows your product",
      },
    ],
  },
  twitter: {
    creator: "@frontface",
    images: ["https://frontface.app/og-image.png"],
  },
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What is FrontFace?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "FrontFace is an AI support agent you embed on your website. Trained on your knowledge base, it answers customer questions instantly with cited sources, captures leads, and hands off to your team 24/7 — no coding required.",
      },
    },
    {
      "@type": "Question",
      name: "How does FrontFace answer questions from my knowledge base?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "FrontFace uses retrieval-augmented generation (RAG). It indexes your website, docs, PDFs and FAQs, retrieves the most relevant pages for each question, and grounds its answer in that content — so replies are accurate and never made up.",
      },
    },
    {
      "@type": "Question",
      name: "Does FrontFace cite its sources?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. Every answer shows the knowledge-base pages it was grounded in, so customers and your team can verify exactly where the information came from.",
      },
    },
    {
      "@type": "Question",
      name: "Can a human take over the conversation?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. FrontFace includes human handoff — when a chat is complex or high-intent, it routes to your team in real time with the full conversation and context, including queues and business hours.",
      },
    },
    {
      "@type": "Question",
      name: "Does FrontFace capture leads?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. Without pop-ups, the agent earns trust through conversation, then collects contact details and qualifies intent — routing warm leads to your CRM or inbox automatically.",
      },
    },
    {
      "@type": "Question",
      name: "How long does setup take?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Most businesses go live in under 5 minutes. Point FrontFace at your website or upload your content, add one line of code, and your AI support agent is live.",
      },
    },
    {
      "@type": "Question",
      name: "Does FrontFace work on Shopify, WordPress, and other platforms?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. FrontFace works on any website with one line of code — including Shopify, WordPress, Wix, Squarespace, Webflow and custom-built sites — or as a hosted public agent page if you have no website at all.",
      },
    },
  ],
};

export default function LandingPage() {
  return (
    <main>
      <Script
        id="faq-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <HeroSection />
      <LogoStrip />
      <StatsBar />
      <HowItWorks />
      <CapabilitiesSection />
      <DeployAnywhere />
      <SocialProof />
      <PricingSection />
      <FinalCta />
    </main>
  );
}
