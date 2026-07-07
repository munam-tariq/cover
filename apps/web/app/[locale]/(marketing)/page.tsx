import { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { type Locale } from "@/i18n/routing";
import { localizedAlternates, ogLocale } from "@/lib/seo";

import { CapabilitiesSection } from "./components/capabilities-section";
import { DeployAnywhere } from "./components/deploy-anywhere";
import { FinalCta } from "./components/final-cta";
import { HeroSection } from "./components/hero-section";
import { HowItWorks } from "./components/how-it-works";
import { PricingSection } from "./components/pricing-section";
import { StatsBar } from "./components/stats-bar";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "common.meta" });
  return {
    title: { absolute: t("title") },
    description: t("description"),
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
    alternates: localizedAlternates("/"),
    openGraph: {
      type: "website",
      locale: ogLocale(locale as Locale),
      url: "https://frontface.app",
      siteName: "FrontFace",
      title: t("title"),
      description: t("description"),
      images: [
        {
          url: "https://frontface.app/og-image.png",
          width: 1200,
          height: 630,
          alt: t("ogImageAlt"),
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      site: "@frontface",
      creator: "@frontface",
      title: t("title"),
      description: t("description"),
      images: [
        {
          url: "https://frontface.app/og-image.png",
          width: 1200,
          height: 630,
          alt: t("ogImageAlt"),
        },
      ],
    },
  };
}

export default function LandingPage() {
  return (
    <main>
      <HeroSection />
      <StatsBar />
      <HowItWorks />
      <CapabilitiesSection />
      <DeployAnywhere />
      <PricingSection />
      <FinalCta />
    </main>
  );
}
