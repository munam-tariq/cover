import { Metadata } from "next";
import Script from "next/script";

import { blogPosts } from "./blog-data";
import { BlogIndex } from "./blog-index";

export const metadata: Metadata = {
  title: "Blog — AI Support Agent Playbooks & Guides",
  description:
    "Field notes on AI customer support: RAG-grounded answers, lead capture, human handoff, and deploying AI agents that actually know your product. Practical guides for support and growth teams.",
  keywords: [
    "AI support blog",
    "AI customer support insights",
    "RAG chatbot",
    "knowledge base AI",
    "lead capture",
    "human handoff",
    "AI agent deployment",
  ],
  openGraph: {
    title: "FrontFace Blog — AI Support Agent Playbooks",
    description: "Field notes on AI customer support, RAG-grounded answers, lead capture and human handoff.",
    url: "https://frontface.app/blog",
    type: "website",
    siteName: "FrontFace",
    locale: "en_US",
    images: [
      {
        url: "https://frontface.app/blog-og/blog.png",
        width: 1200,
        height: 630,
        alt: "FrontFace Blog — AI support agent playbooks and guides",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@frontface",
    creator: "@frontface",
    title: "FrontFace Blog",
    description: "Field notes on AI customer support, RAG-grounded answers, lead capture and human handoff.",
    images: [
      {
        url: "https://frontface.app/blog-og/blog.png",
        width: 1200,
        height: 630,
        alt: "FrontFace Blog — AI support agent playbooks and guides",
      },
    ],
  },
  alternates: {
    canonical: "https://frontface.app/blog",
  },
};

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: "https://frontface.app" },
    { "@type": "ListItem", position: 2, name: "Blog", item: "https://frontface.app/blog" },
  ],
};

const blogSchema = {
  "@context": "https://schema.org",
  "@type": "Blog",
  name: "FrontFace Blog",
  url: "https://frontface.app/blog",
  description: "Field notes on AI customer support, RAG-grounded answers, lead capture and human handoff.",
  blogPost: blogPosts.map((p) => ({
    "@type": "BlogPosting",
    headline: p.title,
    description: p.description,
    datePublished: p.date,
    url: `https://frontface.app/blog/${p.slug}`,
  })),
};

export default function BlogPage() {
  return (
    <>
      <Script id="blog-breadcrumb-schema" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <Script
        id="blog-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(blogSchema) }}
      />
      <main style={{ minHeight: "100vh" }}>
        <BlogIndex posts={blogPosts} />
      </main>
    </>
  );
}
