"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

const words = ["Stop", "losing", "leads", "to", "silence."];

export function CTASection() {
  return (
    <section className="py-32 md:py-48 relative overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-500/[0.06] rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
        <h2 className="text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight leading-[0.95] mb-8">
          {words.map((word, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{
                duration: 0.5,
                delay: i * 0.1,
                ease: [0.25, 0.4, 0, 1],
              }}
              className={`inline-block mr-[0.25em] ${
                word === "silence." ? "text-zinc-300" : "text-zinc-900"
              }`}
            >
              {word}
            </motion.span>
          ))}
        </h2>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <Link
            href="/login"
            className="group inline-flex items-center gap-2 bg-zinc-900 text-white px-10 py-4 rounded-full font-medium text-sm hover:bg-zinc-800 transition-colors"
          >
            Start Free
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.7 }}
          className="mt-6 text-xs tracking-[0.15em] uppercase text-zinc-400"
        >
          5-min setup &nbsp;·&nbsp; Works on any website &nbsp;·&nbsp; Human
          handoff included
        </motion.p>
      </div>
    </section>
  );
}
