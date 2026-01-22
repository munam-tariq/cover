import { Metadata } from "next";
import Link from "next/link";
import { Header } from "../components/header";
import { Footer } from "../components/footer";
import { Target, Users, Zap, Heart } from "lucide-react";

export const metadata: Metadata = {
  title: "About SupportBase | AI Customer Support for Small Business",
  description:
    "SupportBase helps small businesses stop answering the same questions. AI chatbot that answers 89% of customer questions automatically.",
  keywords: [
    "about SupportBase",
    "AI chatbot company",
    "small business customer support",
    "automated customer service",
  ],
  openGraph: {
    title: "About SupportBase",
    description: "AI customer support for small businesses.",
    url: "https://supportbase.app/about",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "About SupportBase",
    description: "AI customer support for small businesses.",
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
      "Your time is valuable. That's why SupportBase takes 5 minutes to set up—not days or weeks. No consultants, no complicated setup.",
  },
  {
    icon: <Target className="w-6 h-6" />,
    title: "Simple By Design",
    description:
      "You shouldn't need to be technical to use AI. Upload your FAQs, paste one line of code, and you're live. That's it.",
  },
  {
    icon: <Users className="w-6 h-6" />,
    title: "Built for Small Business",
    description:
      "We know small business owners are stretched thin. SupportBase handles the repetitive questions so you can focus on what you do best.",
  },
  {
    icon: <Heart className="w-6 h-6" />,
    title: "Customer Obsession",
    description:
      "Every feature we build starts with a customer problem. We talk to users constantly and iterate based on real feedback.",
  },
];

const stats = [
  { value: "5 min", label: "Setup time" },
  { value: "89%", label: "Questions answered by AI" },
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
            AI Customer Support for Small Business
          </h1>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
            SupportBase exists because we believe every small business deserves
            great customer support—without hiring a team or spending thousands
            on enterprise software.
          </p>
        </section>

        {/* Story */}
        <section className="max-w-4xl mx-auto px-6 py-16">
          <h2 className="text-3xl font-bold text-slate-900 mb-8 text-center">
            Our Story
          </h2>
          <div className="prose prose-lg prose-slate max-w-none">
            <p className="text-slate-700 leading-relaxed mb-6">
              SupportBase started with a simple observation: small business
              owners spend hours every week answering the same questions over
              and over. &quot;What are your hours?&quot; &quot;What&apos;s your return policy?&quot;
              &quot;Where&apos;s my order?&quot;
            </p>
            <p className="text-slate-700 leading-relaxed mb-6">
              For consultants and professionals, every hour spent on basic
              questions is an hour not spent on billable work. For store owners,
              slow responses mean lost sales. The problem was clear—but the
              solutions weren&apos;t.
            </p>
            <p className="text-slate-700 leading-relaxed mb-6">
              Enterprise chatbots cost thousands per month. Simple FAQ pages
              don&apos;t actually answer questions. And hiring support staff
              isn&apos;t realistic when you&apos;re running a small team.
            </p>
            <p className="text-slate-700 leading-relaxed">
              We built SupportBase to change that. An AI chatbot that actually
              learns from YOUR content, answers 89% of questions automatically,
              and takes just 5 minutes to set up. No technical skills required.
              No enterprise pricing. Just upload your FAQs and go.
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
              We believe small businesses deserve the same quality customer
              support as the big companies—without the big company budget.
              AI should handle the routine stuff so you can focus on what
              actually matters: your customers, your craft, your business.
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
              Join the businesses saving hours every week with AI customer support.
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
