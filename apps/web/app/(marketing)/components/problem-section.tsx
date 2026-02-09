"use client";

import { motion } from "framer-motion";
import { X, Check } from "lucide-react";

export function ProblemSection() {
  return (
    <section className="py-32 bg-[#050505]">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <p className="text-blue-400 text-sm font-medium tracking-wider mb-4 uppercase">
            THE PROBLEM
          </p>
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
            You're losing leads you never knew existed.
          </h2>
          <p className="text-lg text-zinc-400 leading-relaxed max-w-2xl mx-auto mb-16">
            Your website gets traffic. People browse, read, maybe even add
            something to their cart. Then they leave. No conversation. No email.
            No way to follow up.
            <br />
            <br />
            Traditional chatbots don't help — they answer FAQs and dead-end.
            They weren't built to sell. They were built to deflect.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {/* BEFORE Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="bg-[#111] border border-white/[0.08] rounded-2xl p-8 opacity-60"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                <X className="w-5 h-5 text-red-400" />
              </div>
              <h3 className="text-xl font-semibold text-white">
                Traditional Chatbot
              </h3>
            </div>
            <ul className="space-y-3">
              <li className="flex items-start gap-3 text-zinc-500">
                <X className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span>Answers generic FAQs</span>
              </li>
              <li className="flex items-start gap-3 text-zinc-500">
                <X className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span>Visitor leaves — gone forever</span>
              </li>
              <li className="flex items-start gap-3 text-zinc-500">
                <X className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span>No lead captured</span>
              </li>
              <li className="flex items-start gap-3 text-zinc-500">
                <X className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span>Support cost center</span>
              </li>
            </ul>
          </motion.div>

          {/* AFTER Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="bg-[#111] border border-blue-500/30 rounded-2xl p-8 shadow-[0_0_30px_rgba(59,130,246,0.1)]"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                <Check className="w-5 h-5 text-green-400" />
              </div>
              <h3 className="text-xl font-semibold text-white">
                SupportBase AI Agent
              </h3>
            </div>
            <ul className="space-y-3">
              <li className="flex items-start gap-3 text-zinc-200">
                <Check className="w-5 h-5 flex-shrink-0 mt-0.5 text-green-400" />
                <span>Knows your product deeply</span>
              </li>
              <li className="flex items-start gap-3 text-zinc-200">
                <Check className="w-5 h-5 flex-shrink-0 mt-0.5 text-green-400" />
                <span>Qualifies visitor intent</span>
              </li>
              <li className="flex items-start gap-3 text-zinc-200">
                <Check className="w-5 h-5 flex-shrink-0 mt-0.5 text-green-400" />
                <span>Captures leads naturally</span>
              </li>
              <li className="flex items-start gap-3 text-zinc-200">
                <Check className="w-5 h-5 flex-shrink-0 mt-0.5 text-green-400" />
                <span>Revenue generator</span>
              </li>
            </ul>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
