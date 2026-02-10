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
  metadataBase: new URL("https://frontface.app"),
  title: {
    default: "FrontFace - AI Customer Support for Small Business | Live in 5 Minutes",
    template: "%s | FrontFace",
  },
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
    "RAG chatbot",
    "knowledge base chatbot",
    "embed chatbot",
    "chatbot widget",
    "AI support automation",
    "no-code chatbot",
    "human handoff chatbot",
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
    title: "FrontFace - AI Customer Support for Small Business",
    description:
      "Train an AI chatbot on your FAQ and docs. Answer customer questions 24/7. Human handoff when needed. Free to start.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "FrontFace - AI Chatbot Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "FrontFace - AI Customer Support for Small Business",
    description:
      "Train an AI chatbot on your FAQ and docs. Answer customer questions 24/7. Human handoff when needed.",
    images: ["/og-image.png"],
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
    "AI customer support for small businesses. Answer questions 24/7 with human handoff when needed.",
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
    "AI-powered chatbot",
    "RAG knowledge base",
    "Human handoff",
    "API tool calling",
    "Lead capture",
    "Analytics dashboard",
    "Works on any website",
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
