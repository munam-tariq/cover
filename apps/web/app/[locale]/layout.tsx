import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_Arabic, Inter, JetBrains_Mono } from "next/font/google";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { AnalyticsConsent } from "@/components/analytics-consent";
import { AuthSessionCleanup } from "@/components/auth-session-cleanup";
import { routing, type Locale } from "@/i18n/routing";
import { ogLocale } from "@/lib/seo";

import "../globals.css";

const inter = Inter({ subsets: ["latin"], display: "swap" });
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "optional",
  weight: ["400", "500", "600"],
  variable: "--font-mono",
});
const plexArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-arabic",
  display: "swap",
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#f6f7f9",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "common.meta" });
  return {
  metadataBase: new URL("https://frontface.app"),
  title: {
    default: t("title"),
    template: t("titleTemplate"),
  },
  description: t("description"),
  keywords: [
    "AI support agent",
    "AI customer support",
    "knowledge base AI",
    "RAG chatbot",
    "grounded AI answers",
    "AI help desk",
    "self-service support AI",
    "customer support automation",
    "AI agent for website",
    "answer engine",
    "human handoff chatbot",
    "AI lead capture",
    "knowledge base chatbot",
    "no-code AI agent",
    "embed AI agent",
  ],
  authors: [{ name: "FrontFace Team" }],
  creator: "FrontFace",
  publisher: "FrontFace",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
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
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    // Add when available
    // google: "google-site-verification-code",
    // yandex: "yandex-verification-code",
  },
  category: "technology",
  };
}

// Organization Schema
const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "FrontFace",
  url: "https://frontface.app",
  logo: {
    "@type": "ImageObject",
    url: "https://frontface.app/logo.png",
    width: 512,
    height: 512,
  },
  description:
    "AI support agent that resolves customer questions instantly from your knowledge base, with cited answers, lead capture, and human handoff.",
  foundingDate: "2025",
  knowsAbout: [
    "AI customer support",
    "RAG chatbot",
    "Knowledge base AI",
    "Customer support automation",
    "AI lead capture",
    "Human handoff",
    "Retrieval-Augmented Generation",
    "AI support agent",
  ],
  sameAs: [
    "https://twitter.com/frontface",
    "https://github.com/frontface",
  ],
};

// Software Application Schema
const softwareSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "FrontFace",
  description:
    "FrontFace resolves customer questions instantly from your knowledge base, so small teams can support more customers without hiring.",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
    description: "Free during beta",
  },
  featureList: [
    "Knowledge base Q&A with cited sources",
    "RAG-grounded AI answers",
    "Lead capture & qualification",
    "Human handoff & queues",
    "One-line website widget",
    "Hosted public agent page",
    "Handoff alerts and workflow integrations",
    "Conversation analytics",
  ],
};

const hasAnalyticsConsent = Boolean(process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID || process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN);

export default async function LocaleLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);

  return (
    <html
      lang={locale}
      dir={locale === "ar" ? "rtl" : "ltr"}
      className="scroll-smooth"
    >
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="icon" href="/favicon/favicon-32.png" type="image/png" sizes="32x32" />
        <link rel="icon" href="/favicon/favicon-16.png" type="image/png" sizes="16x16" />
        <link rel="apple-touch-icon" href="/favicon/apple-touch-icon-180.png" sizes="180x180" />
        <link rel="manifest" href="/manifest.json" />
        <script
          id="organization-schema"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        <script
          id="software-schema"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }}
        />
      </head>
      <body className={`${inter.className} ${jetbrainsMono.variable} ${plexArabic.variable}`} suppressHydrationWarning>
        <NextIntlClientProvider>
          <AuthSessionCleanup />
          {children}
          {hasAnalyticsConsent && <AnalyticsConsent />}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
