import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";

import "./globals.css";

const inter = Inter({ subsets: ["latin"], display: "swap" });

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#ffffff",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://supportbase.app"),
  title: {
    default: "SupportBase - AI Chatbot for Vibe Coders | Add Support in One Line",
    template: "%s | SupportBase",
  },
  description:
    "Add an AI chatbot to your app in one line. SupportBase works with Cursor, Claude, and MCP. Upload docs, get embed code, ship 24/7 customer support in 15 minutes. Free during beta.",
  keywords: [
    "AI chatbot",
    "customer support chatbot",
    "AI customer service",
    "chatbot for website",
    "vibe coding",
    "MCP integration",
    "Cursor AI",
    "Claude chatbot",
    "RAG chatbot",
    "knowledge base chatbot",
    "embed chatbot",
    "chatbot widget",
    "AI support automation",
    "no-code chatbot",
    "chatbot for developers",
  ],
  authors: [{ name: "SupportBase Team" }],
  creator: "SupportBase",
  publisher: "SupportBase",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: "https://supportbase.app",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://supportbase.app",
    siteName: "SupportBase",
    title: "SupportBase - AI Chatbot for Vibe Coders",
    description:
      "Add an AI chatbot to your app in one line. Works with Cursor, Claude, and MCP. Ship 24/7 customer support in 15 minutes.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "SupportBase - AI Chatbot Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "SupportBase - AI Chatbot for Vibe Coders",
    description:
      "Add an AI chatbot to your app in one line. Works with Cursor, Claude, and MCP.",
    images: ["/og-image.png"],
    creator: "@supportbase",
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
  name: "SupportBase",
  url: "https://supportbase.app",
  logo: "https://supportbase.app/logo.png",
  description:
    "AI chatbot platform for vibe coders. Add customer support to your app in one line.",
  foundingDate: "2025",
  sameAs: [
    "https://twitter.com/supportbase",
    "https://github.com/supportbase",
  ],
};

// Software Application Schema
const softwareSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "SupportBase",
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
    "AI-powered chatbot",
    "RAG knowledge base",
    "MCP integration",
    "API tool calling",
    "Lead capture",
    "Analytics dashboard",
    "Multi-project support",
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
        <link rel="icon" href="/logo.png" type="image/png" />
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
      <body className={inter.className}>{children}</body>
    </html>
  );
}
