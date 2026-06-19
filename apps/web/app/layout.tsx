import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import Script from "next/script";

import { AnalyticsConsent } from "../components/analytics-consent";

import "./globals.css";

const inter = Inter({ subsets: ["latin"], display: "optional" });
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "optional",
  weight: ["400", "500", "600"],
  variable: "--font-mono",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#f6f7f9",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://frontface.app"),
  title: {
    default: "FrontFace — AI Support Agent That Resolves Questions Instantly",
    template: "%s | FrontFace",
  },
  description:
    "FrontFace resolves customer questions instantly from your knowledge base — so small teams can support more customers without hiring. Cited answers, lead capture, and human handoff. Free during beta.",
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
  alternates: {
    canonical: "https://frontface.app",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://frontface.app",
    siteName: "FrontFace",
    title: "FrontFace — AI Support Agent That Resolves Questions Instantly",
    description:
      "Resolve customer questions instantly from your knowledge base — with cited answers, lead capture, and human handoff. Free during beta.",
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
      "Resolve customer questions instantly from your knowledge base — with cited answers, lead capture, and human handoff. Free during beta.",
    images: [
      {
        url: "https://frontface.app/og-image.png",
        width: 1200,
        height: 630,
        alt: "FrontFace — AI support agent that resolves customer questions instantly",
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

const hasAnalyticsConsent = Boolean(process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID || process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID);

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="icon" href="/logo.png" type="image/png" sizes="any" />
        <link rel="apple-touch-icon" href="/logo.png" />
        <link rel="manifest" href="/manifest.json" />
        <Script
          id="organization-schema"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        <Script
          id="software-schema"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }}
        />
      </head>
      <body className={`${inter.className} ${jetbrainsMono.variable}`} suppressHydrationWarning>
        {children}
        {hasAnalyticsConsent && <AnalyticsConsent />}
      </body>
    </html>
  );
}
