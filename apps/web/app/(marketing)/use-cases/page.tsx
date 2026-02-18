import { Metadata } from "next";
import Link from "next/link";
import { Header } from "../components/header";
import { Footer } from "../components/footer";
import {
  ShoppingCart,
  Code2,
  Rocket,
  Building2,
  GraduationCap,
  HeartPulse,
  ArrowRight,
  Briefcase,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Use Cases | AI Lead Capture & Sales Agent for Every Industry | FrontFace",
  description:
    "See how consultants, lawyers, ecommerce stores, and small businesses use FrontFace to capture leads, qualify visitors, and answer product questions automatically.",
  keywords: [
    "AI lead capture for consultants",
    "AI agent for lawyers",
    "e-commerce lead capture",
    "small business AI agent",
    "lead generation for professional services",
    "knowledge base chatbot for business",
  ],
  openGraph: {
    title: "FrontFace Use Cases — AI Lead Capture for Every Industry",
    description: "Capture leads, qualify visitors, and answer product questions automatically — for consultants, ecommerce, and small businesses.",
    url: "https://frontface.app/use-cases",
    type: "website",
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
    title: "FrontFace Use Cases — AI Lead Capture for Every Industry",
    description: "Capture leads, qualify visitors, and answer product questions automatically — for consultants, ecommerce, and small businesses.",
    images: ["https://frontface.app/og-image.png"],
  },
  alternates: {
    canonical: "https://frontface.app/use-cases",
  },
};

const useCases = [
  // PRIMARY ICPs
  {
    icon: <Briefcase className="w-8 h-8" />,
    title: "Professional Services",
    subtitle: "Consultants, Lawyers, Accountants",
    description:
      "Stop answering the same 10 questions 50+ times a month. Let AI handle 'What are your fees?', 'How do I get started?', and 'What documents do I need?' so you can focus on billable work.",
    benefits: [
      "Free up 2+ hours every day",
      "Never miss a client inquiry",
      "24/7 availability for prospects",
      "Capture leads while you sleep",
    ],
    stats: { value: "2+ hrs", label: "saved daily" },
    color: "from-blue-500 to-indigo-500",
  },
  {
    icon: <ShoppingCart className="w-8 h-8" />,
    title: "E-commerce Stores",
    subtitle: "Shopify, WooCommerce, Custom Stores",
    description:
      "Answer 'Where's my order?', 'What's your return policy?', and product questions instantly. Reduce cart abandonment and turn browsers into buyers.",
    benefits: [
      "Instant order status updates",
      "Return & refund policy answers",
      "Product recommendations",
      "24/7 customer support",
    ],
    stats: { value: "89%", label: "questions answered" },
    color: "from-green-500 to-emerald-500",
  },
  {
    icon: <Rocket className="w-8 h-8" />,
    title: "Small SaaS & Startups",
    subtitle: "Technical Founders Stretched Thin",
    description:
      "You're building product AND doing support. Let AI handle the 'How do I...?' questions so you can ship faster and grow your business.",
    benefits: [
      "No support team needed yet",
      "5-minute setup",
      "Free during beta",
      "Scale support as you grow",
    ],
    stats: { value: "5 min", label: "setup time" },
    color: "from-orange-500 to-red-500",
  },
  // SECONDARY USE CASES
  {
    icon: <Building2 className="w-8 h-8" />,
    title: "Agencies",
    subtitle: "Multi-Client Support",
    description:
      "Manage support chatbots for multiple clients from a single dashboard. Custom branding for each client.",
    benefits: [
      "Multi-project management",
      "Custom branding per client",
      "Centralized analytics",
      "Client self-service",
    ],
    stats: { value: "10x", label: "efficiency gain" },
    color: "from-purple-500 to-pink-500",
  },
  {
    icon: <GraduationCap className="w-8 h-8" />,
    title: "Education",
    subtitle: "Student & Faculty Support",
    description:
      "Answer questions about courses, admissions, schedules, and policies. Free up staff to focus on education.",
    benefits: [
      "24/7 student assistance",
      "Admissions inquiries",
      "Course information",
      "Policy explanations",
    ],
    stats: { value: "60%", label: "inquiry automation" },
    color: "from-indigo-500 to-blue-500",
  },
  {
    icon: <HeartPulse className="w-8 h-8" />,
    title: "Healthcare",
    subtitle: "Patient Engagement",
    description:
      "Provide information about services, appointment scheduling, and general health inquiries.",
    benefits: [
      "Appointment booking",
      "Service information",
      "Insurance questions",
      "After-hours support",
    ],
    stats: { value: "40%", label: "call reduction" },
    color: "from-teal-500 to-cyan-500",
  },
];

export default function UseCasesPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white pt-24">
        {/* Hero */}
        <section className="max-w-6xl mx-auto px-6 py-16 text-center">
          <span className="inline-block px-3 py-1 text-sm font-medium text-blue-600 bg-blue-50 rounded-full mb-4">
            Use Cases
          </span>
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6">
            Stop Answering the Same Questions
          </h1>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
            Whether you&apos;re a consultant, store owner, or founder—FrontFace
            handles 89% of customer questions automatically so you can focus
            on what matters.
          </p>
        </section>

        {/* Use Cases */}
        <section className="max-w-6xl mx-auto px-6 py-8">
          <div className="space-y-8">
            {useCases.map((useCase, index) => (
              <div
                key={index}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-xl transition-all duration-300"
              >
                <div className="md:flex">
                  {/* Left side - Icon and stats */}
                  <div
                    className={`md:w-1/3 bg-gradient-to-br ${useCase.color} p-8 flex flex-col items-center justify-center text-white min-h-[250px]`}
                  >
                    <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-4">
                      {useCase.icon}
                    </div>
                    <div className="text-4xl font-bold mb-1">
                      {useCase.stats.value}
                    </div>
                    <div className="text-sm opacity-80">
                      {useCase.stats.label}
                    </div>
                  </div>

                  {/* Right side - Content */}
                  <div className="md:w-2/3 p-8">
                    <div className="mb-4">
                      <h2 className="text-2xl font-bold text-slate-900 mb-1">
                        {useCase.title}
                      </h2>
                      <p className="text-blue-600 font-medium">
                        {useCase.subtitle}
                      </p>
                    </div>
                    <p className="text-slate-600 mb-6 leading-relaxed">
                      {useCase.description}
                    </p>
                    <div className="grid sm:grid-cols-2 gap-3 mb-6">
                      {useCase.benefits.map((benefit, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <svg
                              className="w-3 h-3 text-green-600"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </div>
                          <span className="text-sm text-slate-700">
                            {benefit}
                          </span>
                        </div>
                      ))}
                    </div>
                    <Link
                      href="/login"
                      className="inline-flex items-center text-blue-600 font-medium hover:gap-2 transition-all"
                    >
                      Get started for {useCase.title.toLowerCase()}
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Custom Solution CTA */}
        <section className="max-w-6xl mx-auto px-6 py-20">
          <div className="bg-slate-900 rounded-2xl p-12 text-center">
            <h2 className="text-3xl font-bold text-white mb-4">
              Don&apos;t See Your Industry?
            </h2>
            <p className="text-slate-400 mb-8 max-w-2xl mx-auto">
              FrontFace is flexible enough to work with any business that
              needs intelligent customer support. Our RAG technology adapts to
              your unique content and use case.
            </p>
            <Link
              href="/login"
              className="inline-block px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-lg transition-all shadow-lg"
            >
              Try It Free
            </Link>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-gradient-to-r from-blue-600 to-purple-600 py-20">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <h2 className="text-3xl font-bold text-white mb-4">
              Ready to Stop Answering the Same Questions?
            </h2>
            <p className="text-blue-100 mb-8 text-lg">
              5-minute setup. 89% of questions answered automatically. Free during beta.
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
