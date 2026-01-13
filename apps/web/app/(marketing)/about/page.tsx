import { Metadata } from "next";
import Link from "next/link";
import { Header } from "../components/header";
import { Footer } from "../components/footer";
import { Target, Users, Zap, Heart } from "lucide-react";

export const metadata: Metadata = {
  title: "About SupportBase | AI Chatbot for Modern Developers",
  description:
    "SupportBase is on a mission to democratize AI customer support. Learn about our story, values, and vision for the future of customer experience.",
  keywords: [
    "about SupportBase",
    "AI chatbot company",
    "customer support startup",
    "vibe coding platform",
  ],
  openGraph: {
    title: "About SupportBase",
    description: "Democratizing AI customer support for developers.",
    url: "https://supportbase.app/about",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "About SupportBase",
    description: "Democratizing AI customer support for developers.",
  },
  alternates: {
    canonical: "https://supportbase.app/about",
  },
};

const values = [
  {
    icon: <Zap className="w-6 h-6" />,
    title: "Speed Over Everything",
    description:
      "We believe great products should be fast to implement. One line of code, 15 minutes to value. No enterprise sales cycles needed.",
  },
  {
    icon: <Users className="w-6 h-6" />,
    title: "Developer-First",
    description:
      "Built by developers, for developers. Clean APIs, great DX, and tools that work with your existing workflow.",
  },
  {
    icon: <Target className="w-6 h-6" />,
    title: "Simplicity Wins",
    description:
      "Complex problems deserve simple solutions. We strip away unnecessary features to focus on what actually matters.",
  },
  {
    icon: <Heart className="w-6 h-6" />,
    title: "Customer Obsession",
    description:
      "Every feature we build starts with a customer problem. We use our own product daily and iterate constantly.",
  },
];

const stats = [
  { value: "15 min", label: "Average setup time" },
  { value: "1 line", label: "Code to integrate" },
  { value: "24/7", label: "AI availability" },
  { value: "Free", label: "During beta" },
];

export default function AboutPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white pt-24">
        {/* Hero */}
        <section className="max-w-6xl mx-auto px-6 py-16 text-center">
          <span className="inline-block px-3 py-1 text-sm font-medium text-blue-600 bg-blue-50 rounded-full mb-4">
            About Us
          </span>
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6">
            Democratizing AI Customer Support
          </h1>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
            SupportBase exists because we believe every developer should have
            access to enterprise-grade AI support tools. No more choosing
            between great customer experience and shipping speed.
          </p>
        </section>

        {/* Story */}
        <section className="max-w-4xl mx-auto px-6 py-16">
          <h2 className="text-3xl font-bold text-slate-900 mb-8 text-center">
            Our Story
          </h2>
          <div className="prose prose-lg prose-slate max-w-none">
            <p className="text-slate-700 leading-relaxed mb-6">
              SupportBase started with a frustration. As developers building
              products, we kept facing the same problem: adding customer support
              was either expensive, complicated, or both.
            </p>
            <p className="text-slate-700 leading-relaxed mb-6">
              Enterprise solutions cost thousands per month. DIY approaches took
              months to build. And in the age of AI, why were we still relying
              on decision trees and keyword matching?
            </p>
            <p className="text-slate-700 leading-relaxed mb-6">
              We built SupportBase to solve this. A tool that understands your
              product, answers questions accurately, and takes 15 minutes to
              set up. No sales calls. No complex integrations. Just upload
              your docs and paste one line of code.
            </p>
            <p className="text-slate-700 leading-relaxed">
              Today, we&apos;re building the AI support platform we wished
              existed. For indie hackers, startups, and growing teams who
              refuse to compromise on customer experience.
            </p>
          </div>
        </section>

        {/* Stats */}
        <section className="bg-gradient-to-r from-blue-600 to-purple-600 py-16">
          <div className="max-w-6xl mx-auto px-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {stats.map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="text-4xl md:text-5xl font-bold text-white mb-2">
                    {stat.value}
                  </div>
                  <div className="text-blue-100">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Values */}
        <section className="max-w-6xl mx-auto px-6 py-20">
          <h2 className="text-3xl font-bold text-slate-900 mb-4 text-center">
            Our Values
          </h2>
          <p className="text-slate-600 text-center mb-12 max-w-2xl mx-auto">
            These principles guide every decision we make, from product features
            to customer interactions.
          </p>
          <div className="grid md:grid-cols-2 gap-8">
            {values.map((value, index) => (
              <div
                key={index}
                className="bg-white rounded-xl border border-slate-200 p-8 hover:shadow-lg transition-shadow"
              >
                <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 mb-4">
                  {value.icon}
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">
                  {value.title}
                </h3>
                <p className="text-slate-600">{value.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Vision */}
        <section className="bg-slate-50 py-20">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <h2 className="text-3xl font-bold text-slate-900 mb-6">
              Our Vision
            </h2>
            <p className="text-xl text-slate-600 leading-relaxed mb-8">
              We envision a world where every digital product has intelligent,
              helpful customer support. Where AI augments human teams instead
              of replacing them. Where great customer experience is accessible
              to companies of all sizes.
            </p>
            <p className="text-slate-600 leading-relaxed">
              We&apos;re just getting started. Join us on this journey.
            </p>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">
              Ready to Get Started?
            </h2>
            <p className="text-slate-600 mb-8">
              Join the developers who are shipping AI support in minutes.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/login"
                className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-lg transition-all shadow-lg hover:shadow-xl"
              >
                Start Free Today
              </Link>
              <Link
                href="/#features"
                className="px-8 py-4 bg-white border border-slate-200 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 transition-colors"
              >
                See Features
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
