import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Script from "next/script";
import ReactMarkdown from "react-markdown";
import { ArrowLeft, Clock, Calendar, Share2 } from "lucide-react";
import { Header } from "../../components/header";
import { Footer } from "../../components/footer";
import { blogPosts, getBlogPost, getAllBlogSlugs } from "../blog-data";

interface BlogPostPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return getAllBlogSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPost(slug);

  if (!post) {
    return {
      title: "Post Not Found",
    };
  }

  return {
    title: post.title,
    description: post.description,
    keywords: [
      post.category.toLowerCase(),
      "AI chatbot",
      "customer support",
      "FrontFace",
    ],
    authors: [{ name: "FrontFace Team" }],
    openGraph: {
      title: post.title,
      description: post.description,
      url: `https://frontface.app/blog/${post.slug}`,
      type: "article",
      publishedTime: post.date,
      authors: ["FrontFace Team"],
      images: [
        {
          url: post.image,
          width: 1200,
          height: 630,
          alt: post.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description,
      images: [post.image],
    },
    alternates: {
      canonical: `https://frontface.app/blog/${post.slug}`,
    },
  };
}

const categoryColors: Record<string, string> = {
  Tutorial: "bg-blue-100 text-blue-700",
  Strategy: "bg-green-100 text-green-700",
  Technology: "bg-purple-100 text-purple-700",
  Trends: "bg-orange-100 text-orange-700",
};

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const post = getBlogPost(slug);

  if (!post) {
    notFound();
  }

  // Get related posts (same category or random)
  const relatedPosts = blogPosts
    .filter((p) => p.slug !== post.slug)
    .sort((a, b) => (a.category === post.category ? -1 : 1))
    .slice(0, 3);

  // Article Schema
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    image: `https://frontface.app${post.image}`,
    datePublished: post.date,
    dateModified: post.date,
    author: {
      "@type": "Organization",
      name: "FrontFace",
      url: "https://frontface.app",
    },
    publisher: {
      "@type": "Organization",
      name: "FrontFace",
      logo: {
        "@type": "ImageObject",
        url: "https://frontface.app/logo.png",
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `https://frontface.app/blog/${post.slug}`,
    },
  };

  // BreadcrumbList Schema
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: "https://frontface.app",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Blog",
        item: "https://frontface.app/blog",
      },
      {
        "@type": "ListItem",
        position: 3,
        name: post.title,
        item: `https://frontface.app/blog/${post.slug}`,
      },
    ],
  };

  return (
    <>
      <Script
        id="article-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <Script
        id="breadcrumb-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <Header />
      <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white pt-24">
        <article className="max-w-4xl mx-auto px-6 pb-16">
          {/* Breadcrumb */}
          <nav className="mb-8">
            <Link
              href="/blog"
              className="inline-flex items-center text-sm text-slate-600 hover:text-blue-600 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Blog
            </Link>
          </nav>

          {/* Header */}
          <header className="mb-12">
            <div className="flex items-center gap-3 mb-4">
              <span
                className={`px-3 py-1 text-sm font-medium rounded-full ${categoryColors[post.category]}`}
              >
                {post.category}
              </span>
              <span className="flex items-center text-sm text-slate-500">
                <Clock className="w-4 h-4 mr-1" />
                {post.readTime}
              </span>
              <span className="flex items-center text-sm text-slate-500">
                <Calendar className="w-4 h-4 mr-1" />
                {new Date(post.date).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </div>

            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-slate-900 mb-6 leading-tight">
              {post.title}
            </h1>

            <p className="text-xl text-slate-600 leading-relaxed">
              {post.description}
            </p>
          </header>

          {/* Featured Image Placeholder */}
          <div className="mb-12 rounded-2xl overflow-hidden bg-gradient-to-br from-blue-500 to-purple-600 h-64 md:h-96 flex items-center justify-center">
            <div className="text-white text-center">
              <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-10 h-10"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                  />
                </svg>
              </div>
            </div>
          </div>

          {/* Content */}
          <article className="prose prose-lg prose-slate max-w-none prose-headings:font-bold prose-headings:text-slate-900 prose-h2:text-2xl prose-h2:mt-12 prose-h2:mb-6 prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-4 prose-p:text-slate-700 prose-p:leading-relaxed prose-p:mb-6 prose-li:text-slate-700 prose-li:my-2 prose-strong:text-slate-900 prose-strong:font-semibold prose-ul:my-6 prose-ol:my-6 prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline">
            <ReactMarkdown
              components={{
                h2: ({ children }) => (
                  <h2 className="text-2xl font-bold text-slate-900 mt-12 mb-6 pb-2 border-b border-slate-200">
                    {children}
                  </h2>
                ),
                h3: ({ children }) => (
                  <h3 className="text-xl font-bold text-slate-900 mt-8 mb-4">
                    {children}
                  </h3>
                ),
                p: ({ children }) => (
                  <p className="text-slate-700 leading-relaxed mb-6">
                    {children}
                  </p>
                ),
                ul: ({ children }) => (
                  <ul className="list-disc pl-6 my-6 space-y-3 text-slate-700">
                    {children}
                  </ul>
                ),
                ol: ({ children }) => (
                  <ol className="list-decimal pl-6 my-6 space-y-3 text-slate-700">
                    {children}
                  </ol>
                ),
                li: ({ children }) => (
                  <li className="leading-relaxed">{children}</li>
                ),
                strong: ({ children }) => (
                  <strong className="font-semibold text-slate-900">{children}</strong>
                ),
              }}
            >
              {post.content}
            </ReactMarkdown>
          </article>

          {/* Share Section */}
          <div className="mt-12 pt-8 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-slate-600 font-medium">Share:</span>
                <button className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors">
                  <Share2 className="w-5 h-5" />
                </button>
              </div>
              <Link
                href="/login"
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium rounded-lg transition-all shadow-md hover:shadow-lg"
              >
                Try FrontFace Free
              </Link>
            </div>
          </div>
        </article>

        {/* Related Posts */}
        <section className="bg-slate-50 py-16">
          <div className="max-w-6xl mx-auto px-6">
            <h2 className="text-2xl font-bold text-slate-900 mb-8">
              Related Articles
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              {relatedPosts.map((relatedPost) => (
                <Link
                  key={relatedPost.slug}
                  href={`/blog/${relatedPost.slug}`}
                  className="group"
                >
                  <article className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300">
                    <div className="h-40 bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                      <div className="w-12 h-12 bg-white rounded-lg shadow-sm flex items-center justify-center">
                        <svg
                          className="w-6 h-6 text-slate-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
                          />
                        </svg>
                      </div>
                    </div>
                    <div className="p-5">
                      <span
                        className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${categoryColors[relatedPost.category]} mb-2`}
                      >
                        {relatedPost.category}
                      </span>
                      <h3 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-2">
                        {relatedPost.title}
                      </h3>
                      <p className="text-sm text-slate-500 mt-2">
                        {relatedPost.readTime}
                      </p>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="bg-gradient-to-r from-blue-600 to-purple-600 py-16">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <h2 className="text-3xl font-bold text-white mb-4">
              Ready to Add AI Support?
            </h2>
            <p className="text-blue-100 mb-8 text-lg">
              Get started with FrontFace in minutes. No credit card required.
            </p>
            <Link
              href="/login"
              className="inline-block px-8 py-4 bg-white text-blue-600 font-semibold rounded-lg hover:bg-blue-50 transition-colors shadow-lg"
            >
              Start Free Today
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
