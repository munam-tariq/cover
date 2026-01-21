"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Check, Sparkles, ArrowRight } from "lucide-react";

const features = [
  "Unlimited chatbots",
  "Unlimited knowledge sources",
  "Connect to your tools",
  "Lead capture",
  "Analytics dashboard",
  "Human handoff to your team",
  "Custom branding",
  "Priority support",
];

export function Pricing() {
  return (
    <section id="pricing" className="py-32 bg-gradient-to-b from-slate-50 to-white border-t border-slate-100">
      <div className="max-w-4xl mx-auto px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 mb-6 rounded-full bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-100">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-700">Limited Time Offer</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
            Free while we're in beta
          </h2>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            Get full access to all features at no cost. Help us build the perfect chatbot platform,
            and lock in early adopter benefits.
          </p>
        </motion.div>

        {/* Pricing Card */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="relative"
        >
          {/* Glow effect */}
          <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 rounded-3xl blur-xl" />

          <div className="relative bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xl">
            {/* Beta Badge */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white text-center py-3">
              <p className="text-sm font-medium">
                Beta Access • No Credit Card Required
              </p>
            </div>

            <div className="p-8 md:p-12">
              <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-8 mb-10">
                <div>
                  <p className="text-slate-500 text-sm font-medium uppercase tracking-wider mb-2">
                    Beta Pricing
                  </p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-6xl font-bold text-slate-900">$0</span>
                    <span className="text-slate-500">/month</span>
                  </div>
                  <p className="text-slate-500 mt-2">
                    <span className="line-through">$49/month</span>
                    <span className="ml-2 text-green-600 font-medium">100% off during beta</span>
                  </p>
                </div>

                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Link
                    href="/login"
                    className="group inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium rounded-xl transition-all shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40"
                  >
                    Get Started Free
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </motion.div>
              </div>

              {/* Features Grid */}
              <div className="grid sm:grid-cols-2 gap-4">
                {features.map((feature, index) => (
                  <motion.div
                    key={feature}
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.1 + index * 0.05 }}
                    className="flex items-center gap-3"
                  >
                    <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                      <Check className="w-3 h-3 text-green-600" />
                    </div>
                    <span className="text-slate-700">{feature}</span>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Footer note */}
            <div className="px-8 md:px-12 py-6 bg-slate-50 border-t border-slate-100">
              <p className="text-sm text-slate-500 text-center">
                No commitments. Cancel anytime. Early adopters get grandfathered pricing when we launch.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
