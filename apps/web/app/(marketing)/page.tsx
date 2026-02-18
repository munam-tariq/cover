import { Metadata } from "next";
import Script from "next/script";
import { HeroSection } from "./components/hero-section";
import { MetricsBar } from "./components/metrics-bar";
import { ShowcaseSection } from "./components/showcase-section";
import { CapabilitiesSection } from "./components/capabilities-section";
import { CodeSection } from "./components/code-section";
import { PricingSection } from "./components/pricing-section";
import { CTASection } from "./components/cta-section";
import { Footer } from "./components/footer";

export const metadata: Metadata = {
  title: "FrontFace — AI Lead Capture & Sales Agent",
  description:
    "Deploy an AI agent on your website that captures leads, qualifies visitors, and answers product questions 24/7 using your knowledge base. Free to start.",
  keywords: [
    "AI lead capture",
    "AI sales agent",
    "website AI agent",
    "lead generation chatbot",
    "AI SDR",
    "conversational lead capture",
    "knowledge base chatbot",
    "lead qualification AI",
  ],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://frontface.app",
    siteName: "FrontFace",
    title: "FrontFace — AI Lead Capture & Sales Agent",
    description:
      "Deploy an AI agent on your website that captures leads, qualifies visitors, and answers product questions 24/7 using your knowledge base. Free to start.",
    images: [
      {
        url: "https://frontface.app/og-image.png",
        width: 1200,
        height: 630,
        alt: "FrontFace — AI Lead Capture & Sales Agent",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "FrontFace — AI Lead Capture & Sales Agent",
    description:
      "Deploy an AI agent on your website that captures leads, qualifies visitors, and answers product questions 24/7.",
    images: ["https://frontface.app/og-image.png"],
    creator: "@frontface",
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
        text: "FrontFace is an AI agent you embed on your website that captures leads, qualifies visitors, and answers product questions 24/7 using your knowledge base — no coding required.",
      },
    },
    {
      "@type": "Question",
      name: "How does AI lead capture work?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "FrontFace engages visitors in conversation, asks qualifying questions, collects contact details, and routes high-intent leads to your CRM or inbox — automatically, around the clock.",
      },
    },
    {
      "@type": "Question",
      name: "Can FrontFace answer questions from my knowledge base?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. Upload your docs, FAQs, or product pages and FrontFace will answer visitor questions accurately using that content. It's not just lead capture — it's a full AI agent that knows your product.",
      },
    },
    {
      "@type": "Question",
      name: "How long does setup take?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Most businesses go live in under 5 minutes. Add one line of code to your website, upload your content, and your AI agent is live.",
      },
    },
    {
      "@type": "Question",
      name: "Is FrontFace free?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "FrontFace is free to start during beta. No credit card required.",
      },
    },
    {
      "@type": "Question",
      name: "Does FrontFace work on Shopify, WordPress, and other platforms?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. FrontFace works on any website with one line of code — including Shopify, WordPress, Wix, Squarespace, Webflow, and custom-built sites.",
      },
    },
    {
      "@type": "Question",
      name: "Can a human take over the conversation?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. FrontFace includes human handoff — when a visitor needs to speak with a person, the conversation is routed to your team in real time.",
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
      <MetricsBar />
      <ShowcaseSection />
      <CapabilitiesSection />
      <CodeSection />
      <PricingSection />
      <CTASection />
      <Footer />
    </main>
  );
}
