import { Metadata } from "next";
import { Hero } from "./components/hero";
import { StatsBar } from "./components/stats-bar";
import { HowItWorks } from "./components/how-it-works";
import { FeaturesBento } from "./components/features-bento";
import { Pricing } from "./components/pricing";
import { FAQ } from "./components/faq";
import { TrustSection } from "./components/trust-section";
import { FinalCTA } from "./components/final-cta";
import { Footer } from "./components/footer";

export const metadata: Metadata = {
  title: "SupportBase - AI Customer Support for Small Business | Live in 5 Minutes",
  description:
    "Train an AI chatbot on your FAQ and docs. Answer customer questions 24/7. Human handoff when needed. Free to start. Setup in 5 minutes.",
  keywords: [
    "AI chatbot",
    "customer support chatbot",
    "AI customer service",
    "chatbot for website",
    "small business chatbot",
    "customer support automation",
    "AI support for ecommerce",
    "shopify chatbot",
    "human handoff chatbot",
  ],
  openGraph: {
    title: "SupportBase - AI Customer Support for Small Business",
    description: "Train an AI chatbot on your FAQ and docs. Answer customer questions 24/7. Human handoff when needed. Free to start.",
    url: "https://supportbase.app",
    siteName: "SupportBase",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "SupportBase - AI Customer Support for Small Business",
    description: "Train an AI chatbot on your FAQ and docs. Answer customer questions 24/7. Human handoff when needed.",
  },
};

export default function LandingPage() {
  return (
    <main>
      <Hero />
      <StatsBar />
      <section id="how-it-works">
        <HowItWorks />
      </section>
      <section id="features">
        <FeaturesBento />
      </section>
      <Pricing />
      <section id="faq">
        <FAQ />
      </section>
      <TrustSection />
      <FinalCTA />
      <Footer />
    </main>
  );
}
