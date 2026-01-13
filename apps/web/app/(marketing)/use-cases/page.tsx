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
} from "lucide-react";

export const metadata: Metadata = {
  title: "Use Cases | AI Chatbot for Every Industry | SupportBase",
  description:
    "Discover how SupportBase AI chatbot helps SaaS companies, e-commerce stores, startups, agencies, education platforms, and healthcare providers deliver better support.",
  keywords: [
    "AI chatbot use cases",
    "SaaS customer support",
    "e-commerce chatbot",
    "startup support",
    "agency chatbot",
    "education chatbot",
    "healthcare chatbot",
  ],
  openGraph: {
    title: "SupportBase Use Cases",
    description: "AI chatbot solutions for every industry.",
    url: "https://supportbase.app/use-cases",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "SupportBase Use Cases",
    description: "AI chatbot solutions for every industry.",
  },
  alternates: {
    canonical: "https://supportbase.app/use-cases",
  },
};

const useCases = [
  {
    icon: <Code2 className="w-8 h-8" />,
    title: "SaaS Companies",
    subtitle: "Product Support & Onboarding",
    description:
      "Help users navigate your product, answer technical questions, and reduce support ticket volume by up to 70%.",
    benefits: [
      "Instant answers to product questions",
      "Reduce onboarding friction",
      "Scale support without scaling team",
      "24/7 technical assistance",
    ],
    stats: { value: "70%", label: "ticket deflection" },
    color: "from-blue-500 to-cyan-500",
  },
  {
    icon: <ShoppingCart className="w-8 h-8" />,
    title: "E-commerce",
    subtitle: "Sales & Customer Service",
    description:
      "Answer product questions, track orders, process returns, and convert visitors into customers with AI-powered shopping assistance.",
    benefits: [
      "Product recommendations",
      "Order status tracking",
      "Return & refund handling",
      "Upselling & cross-selling",
    ],
    stats: { value: "35%", label: "conversion lift" },
    color: "from-green-500 to-emerald-500",
  },
  {
    icon: <Rocket className="w-8 h-8" />,
    title: "Startups",
    subtitle: "Ship Fast, Support Better",
    description:
      "Deliver enterprise-grade support on a bootstrap budget. Focus on building product while AI handles customer questions.",
    benefits: [
      "No support team needed initially",
      "Setup in 15 minutes",
      "Free during beta",
      "Scale as you grow",
    ],
    stats: { value: "15 min", label: "time to value" },
    color: "from-orange-500 to-red-500",
  },
  {
    icon: <Building2 className="w-8 h-8" />,
    title: "Agencies",
    subtitle: "Multi-Client Support",
    description:
      "Manage support chatbots for multiple clients from a single dashboard. White-label solution for your portfolio.",
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
      "Provide information about services, appointment scheduling, and general health inquiries while maintaining compliance.",
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
            AI Support for Every Industry
          </h1>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
            From startups to enterprises, SupportBase adapts to your unique
            needs. See how businesses like yours are transforming customer
            support.
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
              SupportBase is flexible enough to work with any business that
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
              Ready to Transform Your Support?
            </h2>
            <p className="text-blue-100 mb-8 text-lg">
              Join thousands of businesses delivering better customer
              experiences with AI.
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
