import { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Clock, Calendar } from "lucide-react";
import { Header } from "../components/header";
import { Footer } from "../components/footer";
import { blogPosts } from "./blog-data";

export const metadata: Metadata = {
  title: "Blog | AI Chatbot & Customer Support Insights",
  description:
    "Expert insights on AI chatbots, customer support automation, RAG technology, and building better customer experiences. Practical guides for developers and businesses.",
  keywords: [
    "AI chatbot blog",
    "customer support insights",
    "RAG technology",
    "chatbot development",
    "AI customer service",
    "vibe coding",
    "MCP protocol",
  ],
  openGraph: {
    title: "SupportBase Blog | AI Chatbot Insights",
    description:
      "Expert insights on AI chatbots and customer support automation.",
    url: "https://supportbase.app/blog",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "SupportBase Blog",
    description: "Expert insights on AI chatbots and customer support automation.",
  },
  alternates: {
    canonical: "https://supportbase.app/blog",
  },
};

const categoryColors: Record<string, string> = {
  Tutorial: "bg-blue-100 text-blue-700",
  Strategy: "bg-green-100 text-green-700",
  Technology: "bg-purple-100 text-purple-700",
  Trends: "bg-orange-100 text-orange-700",
};

export default function BlogPage() {
  const featuredPost = blogPosts[0];
  const otherPosts = blogPosts.slice(1);

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white pt-24">
        {/* Hero Section */}
        <section className="max-w-6xl mx-auto px-6 pb-16">
          <div className="text-center mb-12">
            <span className="inline-block px-3 py-1 text-sm font-medium text-blue-600 bg-blue-50 rounded-full mb-4">
              Blog
            </span>
            <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
              Insights & Guides
            </h1>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Expert insights on AI chatbots, customer support automation, and
              building better customer experiences.
            </p>
          </div>

          {/* Featured Post */}
          <Link href={`/blog/${featuredPost.slug}`} className="group block">
            <article className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300">
              <div className="md:flex">
                <div className="md:w-1/2 bg-gradient-to-br from-blue-500 to-purple-600 p-8 md:p-12 flex items-center justify-center min-h-[300px]">
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
                    <span className="text-sm font-medium opacity-80">
                      Featured Article
                    </span>
                  </div>
                </div>
                <div className="md:w-1/2 p-8 md:p-12">
                  <div className="flex items-center gap-3 mb-4">
                    <span
                      className={`px-3 py-1 text-xs font-medium rounded-full ${categoryColors[featuredPost.category]}`}
                    >
                      {featuredPost.category}
                    </span>
                    <span className="flex items-center text-sm text-slate-500">
                      <Clock className="w-4 h-4 mr-1" />
                      {featuredPost.readTime}
                    </span>
                  </div>
                  <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-4 group-hover:text-blue-600 transition-colors">
                    {featuredPost.title}
                  </h2>
                  <p className="text-slate-600 mb-6 line-clamp-3">
                    {featuredPost.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center text-sm text-slate-500">
                      <Calendar className="w-4 h-4 mr-1" />
                      {new Date(featuredPost.date).toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                    <span className="flex items-center text-blue-600 font-medium group-hover:gap-2 transition-all">
                      Read article
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </span>
                  </div>
                </div>
              </div>
            </article>
          </Link>
        </section>

        {/* Other Posts Grid */}
        <section className="max-w-6xl mx-auto px-6 pb-24">
          <h2 className="text-2xl font-bold text-slate-900 mb-8">
            More Articles
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {otherPosts.map((post) => (
              <Link key={post.slug} href={`/blog/${post.slug}`} className="group">
                <article className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 h-full flex flex-col">
                  <div className="h-48 bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                    <div className="w-16 h-16 bg-white rounded-xl shadow-sm flex items-center justify-center">
                      <svg
                        className="w-8 h-8 text-slate-400"
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
                  <div className="p-6 flex-1 flex flex-col">
                    <div className="flex items-center gap-3 mb-3">
                      <span
                        className={`px-2.5 py-0.5 text-xs font-medium rounded-full ${categoryColors[post.category]}`}
                      >
                        {post.category}
                      </span>
                      <span className="text-xs text-slate-500">
                        {post.readTime}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors line-clamp-2">
                      {post.title}
                    </h3>
                    <p className="text-sm text-slate-600 mb-4 line-clamp-2 flex-1">
                      {post.description}
                    </p>
                    <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-100">
                      <span className="text-xs text-slate-500">
                        {new Date(post.date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                      <span className="text-sm text-blue-600 font-medium flex items-center group-hover:gap-1 transition-all">
                        Read
                        <ArrowRight className="w-3 h-3 ml-0.5" />
                      </span>
                    </div>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        </section>

        {/* Newsletter CTA */}
        <section className="bg-gradient-to-r from-blue-600 to-purple-600 py-16">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <h2 className="text-3xl font-bold text-white mb-4">
              Stay Updated
            </h2>
            <p className="text-blue-100 mb-8 text-lg">
              Get the latest insights on AI chatbots and customer support
              delivered to your inbox.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 px-4 py-3 rounded-lg text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-white"
              />
              <button className="px-6 py-3 bg-white text-blue-600 font-semibold rounded-lg hover:bg-blue-50 transition-colors">
                Subscribe
              </button>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
