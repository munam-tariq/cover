"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function FinalCTA() {
  return (
    <section className="py-32 bg-[#050505] relative overflow-hidden">
      {/* Subtle accent glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-blue-500/[0.07] blur-[100px] rounded-full pointer-events-none"></div>

      <div className="max-w-4xl mx-auto px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center"
        >
          {/* Headline */}
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
            Stop losing leads to silence.
          </h2>

          {/* Subtitle */}
          <p className="text-xl text-zinc-400 mb-10 max-w-2xl mx-auto">
            Put an AI agent on your website today. Free during beta.
          </p>

          {/* CTA Button */}
          <div className="mb-8">
            <Link
              href="/login"
              className="bg-blue-600 hover:bg-blue-500 text-white text-lg font-medium px-10 py-5 rounded-xl inline-flex items-center gap-2 transition-colors"
            >
              Start Free — No Credit Card
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>

          {/* Trust line */}
          <div className="flex items-center justify-center gap-4 text-sm text-zinc-500 flex-wrap">
            <div className="flex items-center gap-1.5">
              <svg
                className="w-4 h-4 text-green-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <span>5-min setup</span>
            </div>
            <span className="text-zinc-700">·</span>
            <div className="flex items-center gap-1.5">
              <svg
                className="w-4 h-4 text-green-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <span>Works on any website</span>
            </div>
            <span className="text-zinc-700">·</span>
            <div className="flex items-center gap-1.5">
              <svg
                className="w-4 h-4 text-green-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <span>Human handoff included</span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
