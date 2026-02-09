"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";

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

export function PricingSection() {
  return (
    <section id="pricing" className="py-24 md:py-40">
      <div className="max-w-4xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-400 mb-4">
            Pricing
          </p>
          <h2 className="text-3xl md:text-5xl font-bold text-zinc-900 tracking-tight mb-4">
            Free while we build.
          </h2>
          <p className="text-zinc-500 max-w-lg mx-auto">
            Full access. No credit card. Help us shape the product and lock in
            early adopter pricing forever.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="max-w-md mx-auto"
        >
          <div className="rounded-2xl border border-black/[0.08] bg-white overflow-hidden shadow-xl shadow-black/[0.04]">
            <div className="p-8 text-center border-b border-black/[0.06]">
              <div className="flex items-baseline justify-center gap-1 mb-1">
                <span className="text-5xl font-bold text-zinc-900">$0</span>
                <span className="text-zinc-400 text-sm">/mo</span>
              </div>
              <p className="text-zinc-400 text-sm">
                <span className="line-through">$49/mo</span>
                <span className="text-emerald-600 ml-2">Free during beta</span>
              </p>
            </div>

            <div className="p-8 space-y-4">
              {features.map((feature, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Check className="w-4 h-4 text-blue-500 flex-shrink-0" />
                  <span className="text-sm text-zinc-600">{feature}</span>
                </div>
              ))}
            </div>

            <div className="p-8 pt-0">
              <Link
                href="/login"
                className="group flex items-center justify-center gap-2 w-full bg-zinc-900 text-white py-3.5 rounded-full font-medium text-sm hover:bg-zinc-800 transition-colors"
              >
                Start Free
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>

            <div className="px-8 pb-6">
              <p className="text-[11px] text-zinc-400 text-center">
                Early adopters get grandfathered pricing at launch.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
