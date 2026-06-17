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
    title: "FrontFace Blog",
    description: "Field notes on AI customer support, RAG-grounded answers, lead capture and human handoff.",
    images: ["https://frontface.app/og-image.png"],
  },
  alternates: {
    canonical: "https://frontface.app/blog",
  },
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
