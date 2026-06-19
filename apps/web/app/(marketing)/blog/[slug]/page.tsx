import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Script from "next/script";
import type { CSSProperties } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { Btn } from "../../components/marketing-button";
import { Ic, WRAP } from "../../components/marketing-kit";
import { blogPosts, getBlogPost, getAllBlogSlugs } from "../blog-data";
import { Cover, coverKindFor } from "../cover-scene";

interface BlogPostPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return getAllBlogSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPost(slug);

  if (!post) {
    return { title: "Post Not Found" };
  }

  return {
    title: post.title,
    description: post.description,
    keywords: [post.category.toLowerCase(), "AI support agent", "knowledge base AI", "RAG chatbot", "FrontFace"],
    authors: [{ name: "FrontFace Team" }],
    openGraph: {
      title: post.title,
      description: post.description,
      url: `https://frontface.app/blog/${post.slug}`,
      siteName: "FrontFace",
      locale: "en_US",
      type: "article",
      publishedTime: post.date,
      modifiedTime: post.date,
      section: post.category,
      authors: ["FrontFace Team"],
      images: [{ url: post.image, width: 1200, height: 630, alt: post.title }],
    },
    twitter: {
      card: "summary_large_image",
      site: "@frontface",
      creator: "@frontface",
      title: post.title,
      description: post.description,
      images: [{ url: post.image, width: 1200, height: 630, alt: post.title }],
    },
    alternates: {
      canonical: `https://frontface.app/blog/${post.slug}`,
    },
  };
}

function fmt(date: string) {
  return new Date(date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const post = getBlogPost(slug);

  if (!post) {
    notFound();
  }

  const relatedPosts = blogPosts
    .filter((p) => p.slug !== post.slug)
    .sort((a, b) => Number(b.category === post.category) - Number(a.category === post.category))
    .slice(0, 3);
  const relatedResourceLinks = [
    {
      href: "/tools/support-ticket-deflection-calculator",
      label: "Support ticket deflection calculator",
    },
    {
      href: "/blog/cut-support-tickets-without-hiring",
      label: "How to cut support tickets without hiring",
    },
    {
      href: "/use-cases/saas",
      label: "AI support for SaaS and startups",
    },
    {
      href: "/integrations/shopify",
      label: "Shopify AI chatbot setup",
    },
    {
      href: "/blog/frontface-vs-chatbase-vs-intercom",
      label: "FrontFace vs Chatbase vs Intercom Fin",
    },
  ].filter((link) => link.href !== `/blog/${post.slug}`);

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    image: `https://frontface.app${post.image}`,
    datePublished: post.date,
    dateModified: post.date,
    author: { "@type": "Organization", name: "FrontFace", url: "https://frontface.app" },
    publisher: {
      "@type": "Organization",
      name: "FrontFace",
      logo: { "@type": "ImageObject", url: "https://frontface.app/logo.png" },
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": `https://frontface.app/blog/${post.slug}` },
    about: [
      { "@type": "Thing", name: "AI customer support" },
      { "@type": "Thing", name: post.category },
    ],
    keywords: `${post.category}, AI support agent, knowledge base AI, RAG chatbot, FrontFace`,
  };

  // HowTo schema for step-by-step tutorial posts
  const isTutorial = post.slug.startsWith("how-to") || post.slug.startsWith("add-ai-support");
  const howToSchema = isTutorial
    ? {
        "@context": "https://schema.org",
        "@type": "HowTo",
        name: post.title,
        description: post.description,
        image: `https://frontface.app${post.image}`,
        totalTime: "PT5M",
        supply: [{ "@type": "HowToSupply", name: "Your website or knowledge base content" }],
        tool: [{ "@type": "HowToTool", name: "FrontFace account (free during beta)" }],
        step: [
          {
            "@type": "HowToStep",
            position: 1,
            name: "Choose your AI chatbot platform",
            text: "Select an AI support platform that supports RAG (Retrieval-Augmented Generation) for knowledge-based responses, easy integration, and lead capture.",
          },
          {
            "@type": "HowToStep",
            position: 2,
            name: "Prepare and upload your knowledge base",
            text: "Gather your FAQ documents, product documentation, support articles, and pricing information. Upload them to FrontFace to create your grounded knowledge base.",
          },
          {
            "@type": "HowToStep",
            position: 3,
            name: "Configure and customize your agent",
            text: "Set your brand colors, logo, and welcome message. Test the agent against real customer questions before going live.",
          },
          {
            "@type": "HowToStep",
            position: 4,
            name: "Embed on your website",
            text: "Copy the one-line embed script and paste it into your website — works on Shopify, WordPress, Wix, Squarespace, or any custom site.",
          },
        ],
      }
    : null;

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://frontface.app" },
      { "@type": "ListItem", position: 2, name: "Blog", item: "https://frontface.app/blog" },
      { "@type": "ListItem", position: 3, name: post.title, item: `https://frontface.app/blog/${post.slug}` },
    ],
  };

  const shareBtn: CSSProperties = {
    width: 38,
    height: 38,
    borderRadius: 10,
    border: "1px solid var(--ff-line-2)",
    background: "#fff",
    color: "var(--ff-soft)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };

  return (
    <>
      <Script id="article-schema" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />
      <Script id="breadcrumb-schema" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      {howToSchema && <Script id="howto-schema" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(howToSchema) }} />}

      <main style={{ overflowX: "hidden" }}>
        {/* header */}
        <header style={{ position: "relative", overflow: "hidden", paddingTop: "clamp(36px,5vh,56px)", paddingBottom: "clamp(28px,4vh,40px)" }}>
          <div
            className="lattice"
            style={
              {
                position: "absolute",
                inset: 0,
                "--lt": "rgba(17,21,27,.04)",
                "--lt-size": "70px",
                maskImage: "radial-gradient(120% 70% at 50% 0%, #000 30%, transparent 78%)",
                WebkitMaskImage: "radial-gradient(120% 70% at 50% 0%, #000 30%, transparent 78%)",
              } as CSSProperties
            }
          />
          <div style={{ ...WRAP, position: "relative", maxWidth: 760 }}>
            <div className="reveal in" style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--ff-muted)", marginBottom: 22 }}>
              <Link href="/blog" style={{ fontWeight: 600, color: "var(--ff-soft)" }}>
                Blog
              </Link>
              {Ic("chevron", { size: 14, style: { transform: "rotate(-90deg)" } })}
              <span style={{ fontWeight: 600, color: "var(--ff-ink)" }}>{post.category}</span>
            </div>
            <h1 className="reveal in d1" style={{ fontSize: "clamp(32px,5vw,52px)", fontWeight: 800, letterSpacing: "-.03em", color: "var(--ff-ink)", lineHeight: 1.06, textWrap: "balance" }}>
              {post.title}
            </h1>
            <p className="reveal in d2" style={{ fontSize: "clamp(17px,2vw,21px)", lineHeight: 1.55, color: "var(--ff-soft)", marginTop: 18, maxWidth: 640, textWrap: "pretty" }}>
              {post.description}
            </p>
            <div className="reveal in d3" style={{ display: "flex", alignItems: "center", gap: 13, marginTop: 28, flexWrap: "wrap" }}>
              <span style={{ width: 42, height: 42, borderRadius: 99, background: "linear-gradient(150deg,var(--ff-ink),var(--ff-ink-3))", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14 }}>
                FF
              </span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ff-ink)" }}>The FrontFace Team</div>
                <div style={{ fontSize: 12.5, color: "var(--ff-muted)" }}>
                  {fmt(post.date)} · {post.readTime}
                </div>
              </div>
              <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                <span style={shareBtn} aria-hidden>
                  {Ic("link", { size: 16 })}
                </span>
                <span style={shareBtn} aria-hidden>
                  {Ic("mail", { size: 16 })}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* cover */}
        <div style={{ ...WRAP, maxWidth: 760 }}>
          <div className="reveal" style={{ borderRadius: 20, overflow: "hidden", border: "1px solid var(--ff-line)" }}>
            <Cover kind={coverKindFor(post)} height={300} />
          </div>
        </div>

        {/* body */}
        <article className="prose-ff" style={{ padding: "clamp(32px,5vh,52px) clamp(20px,5vw,40px) 0" }}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{post.content}</ReactMarkdown>

          <div
            className="reveal"
            style={{
              margin: "34px auto 0",
              maxWidth: 720,
              border: "1px solid var(--ff-line)",
              borderRadius: 16,
              background: "#fff",
              padding: "20px 22px",
            }}
          >
            <h2
              style={{
                fontSize: 19,
                fontWeight: 800,
                letterSpacing: "-.015em",
                color: "var(--ff-ink)",
                margin: "0 0 12px",
              }}
            >
              Useful next steps
            </h2>
            <div style={{ display: "grid", gap: 9 }}>
              {relatedResourceLinks.slice(0, 4).map((resource) => (
                <Link
                  key={resource.href}
                  href={resource.href}
                  style={{
                    fontSize: 14,
                    fontWeight: 650,
                    color: "var(--ff-ink)",
                    textDecoration: "underline",
                    textUnderlineOffset: 3,
                  }}
                >
                  {resource.label}
                </Link>
              ))}
            </div>
          </div>

          {/* article CTA */}
          <div
            className="reveal"
            style={{
              position: "relative",
              overflow: "hidden",
              margin: "48px auto 0",
              maxWidth: 720,
              borderRadius: 20,
              background: "linear-gradient(150deg,#11151b,#1b2230 70%,#10141b)",
              color: "#fff",
              padding: "clamp(28px,4vw,40px)",
            }}
          >
            <div
              className="lattice"
              style={
                {
                  position: "absolute",
                  inset: 0,
                  "--lt": "rgba(255,255,255,.05)",
                  "--lt-size": "44px",
                  maskImage: "radial-gradient(120% 90% at 80% 0%, #000 30%, transparent 80%)",
                  WebkitMaskImage: "radial-gradient(120% 90% at 80% 0%, #000 30%, transparent 80%)",
                } as CSSProperties
              }
            />
            <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 240 }}>
                <h3 style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-.02em", lineHeight: 1.15, color: "#fff" }}>
                  See grounded answers on your own content.
                </h3>
                <p style={{ fontSize: 15, lineHeight: 1.55, color: "rgba(255,255,255,.66)", marginTop: 10, textWrap: "pretty" }}>
                  Point FrontFace at your site and watch it answer a real question — with sources — in minutes.
                </p>
              </div>
              <Btn kind="lightPrimary" size="lg" href="/login">
                Build your agent {Ic("arrowR", { size: 18 })}
              </Btn>
            </div>
          </div>
        </article>

        {/* related */}
        <section style={{ ...WRAP, padding: "clamp(56px,8vh,90px) clamp(20px,5vw,40px) clamp(56px,8vh,90px)", maxWidth: 1100 }}>
          <h2 className="reveal" style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-.02em", color: "var(--ff-ink)", marginBottom: 24 }}>
            Keep reading
          </h2>
          <div className="ff-rel-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 18 }}>
            {relatedPosts.map((rp, i) => (
              <Link
                key={rp.slug}
                href={`/blog/${rp.slug}`}
                className={"reveal d" + (i + 1)}
                style={{ display: "flex", flexDirection: "column", background: "var(--ff-card)", border: "1px solid var(--ff-line)", borderRadius: 16, overflow: "hidden" }}
              >
                <Cover kind={coverKindFor(rp)} height={130} />
                <div style={{ padding: "16px 18px 20px" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".05em", color: "var(--ff-muted)", textTransform: "uppercase", marginBottom: 8 }}>{rp.category}</div>
                  <div style={{ fontSize: 16.5, fontWeight: 700, letterSpacing: "-.01em", color: "var(--ff-ink)", lineHeight: 1.25 }}>{rp.title}</div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
