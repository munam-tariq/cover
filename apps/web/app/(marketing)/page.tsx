import { Metadata } from "next";
import { Hero } from "./components/hero";
import { WorksWith } from "./components/works-with";
import { VibeDemo } from "./components/vibe-demo";
import { HowItWorks } from "./components/how-it-works";
import { FeaturesBento } from "./components/features-bento";
import { BuiltWith } from "./components/built-with";
import { FAQ } from "./components/faq";
import { FinalCTA } from "./components/final-cta";
import { Footer } from "./components/footer";

export const metadata: Metadata = {
  title: "SupportBase - AI Chatbot for Vibe Coders",
  description:
    "Add an AI chatbot to your app in one line. Works with Cursor, Claude, and your favorite AI tools. Upload docs, get embed code, ship support.",
  keywords: [
    "AI chatbot",
    "customer support",
    "vibe coding",
    "MCP",
    "Cursor",
    "Claude",
  ],
  openGraph: {
    title: "SupportBase - AI Chatbot for Vibe Coders",
    description: "Add an AI chatbot to your app in one line.",
    url: "https://supportbase.app",
    siteName: "SupportBase",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "SupportBase",
    description: "Add an AI chatbot to your app in one line.",
  },
};

export default function LandingPage() {
  return (
    <main>
      <Hero />
      <WorksWith />
      <section id="demo">
        <VibeDemo />
      </section>
      <section id="how-it-works">
        <HowItWorks />
      </section>
      <section id="features">
        <FeaturesBento />
      </section>
      <BuiltWith />
      <section id="faq">
        <FAQ />
      </section>
      <FinalCTA />
      <Footer />
    </main>
  );
}
