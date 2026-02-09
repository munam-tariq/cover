"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Check, ArrowRight } from "lucide-react";

export function Pricing() {
  const features = [
    "Unlimited AI conversations",
    "Knowledge base (docs, URLs, files)",
    "Lead capture & qualification",
    "Human handoff",
    "Analytics dashboard",
    "Custom branding",
    "API & MCP access",
    "Priority support",
  ];

  return (
    <section id="pricing" className="py-32 bg-[#050505]">
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="text-blue-400 text-sm font-medium tracking-wider uppercase mb-4">
            PRICING
          </div>
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
            Free while we're in beta.
          </h2>
          <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
            Full access. No credit card. Help us build the perfect AI agent, and
            lock in early adopter pricing forever.
          </p>
        </div>

        {/* Pricing Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="max-w-lg mx-auto"
        >
          <div className="bg-[#111] border border-blue-500/30 rounded-2xl overflow-hidden shadow-[0_0_40px_rgba(59,130,246,0.1)]">
            {/* Top banner */}
            <div className="bg-blue-600 text-center py-2.5">
              <div className="text-sm font-medium text-white">
                Beta Access · No Credit Card Required
              </div>
            </div>

            {/* Price */}
            <div className="p-8 text-center border-b border-white/[0.08]">
              <div className="mb-2">
                <span className="text-6xl font-bold text-white">$0</span>
                <span className="text-zinc-500">/month</span>
              </div>
              <div className="flex items-center justify-center gap-3">
                <span className="line-through text-zinc-600">$49/month</span>
                <span className="text-green-400 text-sm font-medium">
                  100% off during beta
                </span>
              </div>
            </div>

            {/* CTA */}
            <div className="p-8 border-b border-white/[0.08]">
              <Link
                href="/login"
                className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-xl w-full text-center font-medium flex items-center justify-center gap-2 transition-colors"
              >
                Start Free
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>

            {/* Features */}
            <div className="p-8 border-b border-white/[0.08]">
              <div className="grid sm:grid-cols-2 gap-4">
                {features.map((feature, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                    <span className="text-zinc-300 text-sm">{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="py-4 text-center">
              <p className="text-sm text-zinc-500">
                Early adopters get grandfathered pricing at launch.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
