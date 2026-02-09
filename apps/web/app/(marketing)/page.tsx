import { Metadata } from "next";
import { HeroSection } from "./components/hero-section";
import { MetricsBar } from "./components/metrics-bar";
import { ShowcaseSection } from "./components/showcase-section";
import { CapabilitiesSection } from "./components/capabilities-section";
import { CodeSection } from "./components/code-section";
import { PricingSection } from "./components/pricing-section";
import { CTASection } from "./components/cta-section";
import { Footer } from "./components/footer";

export const metadata: Metadata = {
  title: "SupportBase — AI Lead Capture for Your Website",
  description:
    "Put an AI agent on your website that knows your product, captures leads, and qualifies visitors 24/7. Free during beta.",
  keywords: [
    "AI lead capture",
    "AI sales agent",
    "website chatbot",
    "lead generation",
    "AI SDR",
    "conversational lead capture",
  ],
  openGraph: {
    title: "SupportBase — AI Lead Capture for Your Website",
    description:
      "Put an AI agent on your website that knows your product, captures leads, and qualifies visitors 24/7.",
    url: "https://supportbase.app",
    siteName: "SupportBase",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "SupportBase — AI Lead Capture for Your Website",
    description:
      "Put an AI agent on your website that knows your product, captures leads, and qualifies visitors 24/7.",
  },
};

export default function LandingPage() {
  return (
    <main>
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
