import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import Script from "next/script";

import "./globals.css";

const inter = Inter({ subsets: ["latin"], display: "swap" });
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
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
    default: "FrontFace — AI Support Agent That Knows Your Product",
    template: "%s | FrontFace",
  },
  description:
    "FrontFace is an AI support agent trained on your knowledge base. It answers customers instantly with cited sources, captures leads, and hands off to your team — on your site or anywhere. Free during beta.",
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
    title: "FrontFace — AI Support Agent That Knows Your Product",
    description:
      "An AI support agent trained on your knowledge base — answering customers instantly with cited sources, capturing leads, and handing off to your team. Free during beta.",
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
    card: "summary_large_image",
    title: "FrontFace — AI Support Agent That Knows Your Product",
    description:
      "An AI support agent trained on your knowledge base — instant, cited answers, lead capture, and human handoff. Free during beta.",
    images: ["https://frontface.app/og-image.png"],
    creator: "@frontface",
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
  logo: "https://frontface.app/logo.png",
  description:
    "AI support agent for your website that answers customers from your knowledge base with cited sources, captures leads, and hands off to your team 24/7.",
  foundingDate: "2025",
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
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
    description: "Free during beta",
  },
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "4.9",
    ratingCount: "50",
    bestRating: "5",
    worstRating: "1",
  },
  featureList: [
    "Knowledge base Q&A with cited sources",
    "RAG-grounded AI answers",
    "Lead capture & qualification",
    "Human handoff & queues",
    "One-line website widget",
    "Hosted public agent page",
    "Multi-channel (WhatsApp, Slack, email)",
    "Conversation analytics",
  ],
};

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
        {/* Google Analytics */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-YLCW8JGB3W"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-YLCW8JGB3W');
          `}
        </Script>
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
      <body className={`${inter.className} ${jetbrainsMono.variable}`}>
        {children}
      </body>
    </html>
  );
}
