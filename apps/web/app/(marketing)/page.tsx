import { Metadata } from "next";

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
  title: {
    absolute: "FrontFace — AI Support Agent That Resolves Questions Instantly",
  },
  description:
    "FrontFace AI resolves customer questions instantly from your knowledge base — support more customers without hiring. Free during beta.",
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
    type: "website",
    locale: "en_US",
    url: "https://frontface.app",
    siteName: "FrontFace",
    title: "FrontFace — AI Support Agent That Resolves Questions Instantly",
    description:
      "FrontFace AI resolves customer questions instantly from your knowledge base — support more customers without hiring. Free during beta.",
    images: [
      {
        url: "https://frontface.app/og-image.png",
        width: 1200,
        height: 630,
        alt: "FrontFace — AI support agent that resolves customer questions instantly",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@frontface",
    creator: "@frontface",
    title: "FrontFace — AI Support Agent That Resolves Questions Instantly",
    description:
      "FrontFace AI resolves customer questions instantly from your knowledge base — support more customers without hiring. Free during beta.",
    images: [
      {
        url: "https://frontface.app/og-image.png",
        width: 1200,
        height: 630,
        alt: "FrontFace — AI support agent that resolves customer questions instantly",
      },
    ],
  },
};

export default function LandingPage() {
  return (
    <main>
      <HeroSection />
      <LogoStrip />
      <StatsBar />
      <HowItWorks />
      <SocialProof />
      <CapabilitiesSection />
      <DeployAnywhere />
      <PricingSection />
      <FinalCta />
    </main>
  );
}
