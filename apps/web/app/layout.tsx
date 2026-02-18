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
    default: "FrontFace — AI Lead Capture & Sales Agent",
    template: "%s | FrontFace",
  },
  description:
    "Deploy an AI agent on your website that captures leads, qualifies visitors, and answers product questions 24/7 using your knowledge base. Free to start.",
  keywords: [
    "AI lead capture",
    "AI sales agent",
    "website AI agent",
    "lead generation chatbot",
    "conversational AI for sales",
    "AI SDR",
    "knowledge base chatbot",
    "website chatbot",
    "AI agent for business",
    "lead capture automation",
    "AI qualifier",
    "chatbot for lead generation",
    "no-code AI agent",
    "AI for small business",
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
    title: "FrontFace — AI Lead Capture & Sales Agent",
    description:
      "Deploy an AI agent on your website that captures leads, qualifies visitors, and answers product questions 24/7 using your knowledge base. Free to start.",
    images: [
      {
        url: "https://frontface.app/og-image.png",
        width: 1200,
        height: 630,
        alt: "FrontFace — AI Lead Capture & Sales Agent",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "FrontFace — AI Lead Capture & Sales Agent",
    description:
      "Deploy an AI agent on your website that captures leads, qualifies visitors, and answers product questions 24/7.",
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
    "AI lead capture and sales agent for your website. Captures leads, qualifies visitors, and answers product questions 24/7 using your knowledge base.",
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
    "AI lead capture",
    "Lead qualification",
    "Knowledge base Q&A",
    "AI sales agent",
    "API tool calling",
    "Human handoff",
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
