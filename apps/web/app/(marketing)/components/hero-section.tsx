"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { AnimatedGridPattern } from "./animated-grid-pattern";

const words = ["Your", "website", "is", "leaking", "leads."];

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex flex-col justify-center overflow-hidden">
      {/* Animated grid pattern background */}
      <AnimatedGridPattern
        numSquares={30}
        maxOpacity={0.08}
        duration={3}
        className={cn(
          "text-blue-500/80 fill-blue-500/20 stroke-zinc-300/40",
          "[mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,white_20%,transparent_100%)]"
        )}
      />

      <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
        {/* Headline — word by word reveal */}
        <h1 className="text-5xl sm:text-7xl md:text-8xl lg:text-9xl font-bold tracking-tight leading-[0.95] mb-8">
          {words.map((word, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.6,
                delay: 0.3 + i * 0.12,
                ease: [0.25, 0.4, 0, 1],
              }}
              className={`inline-block mr-[0.25em] ${
                word === "leaking" ? "text-blue-500" : "text-zinc-900"
              }`}
            >
              {word}
            </motion.span>
          ))}
        </h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 1.2 }}
          className="text-lg md:text-xl text-zinc-500 max-w-2xl mx-auto leading-relaxed mb-12"
        >
          SupportBase puts an AI agent on every page — one that knows your
          product, captures intent, and turns browsers into buyers. Around the
          clock.
        </motion.p>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.5 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Link
            href="/login"
            className="group inline-flex items-center gap-2 bg-zinc-900 text-white px-8 py-4 rounded-full font-medium text-sm hover:bg-zinc-800 transition-colors"
          >
            Start Free
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
          <Link
            href="#showcase"
            className="inline-flex items-center gap-2 text-zinc-400 hover:text-zinc-900 px-6 py-4 text-sm font-medium transition-colors"
          >
            See it in action
          </Link>
        </motion.div>

        {/* Trust line */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 1.8 }}
          className="mt-8 text-xs tracking-[0.15em] uppercase text-zinc-400"
        >
          Free during beta &nbsp;·&nbsp; 5-min setup &nbsp;·&nbsp; No credit
          card
        </motion.p>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.2, duration: 0.6 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <ChevronDown className="w-5 h-5 text-zinc-300" />
        </motion.div>
      </motion.div>
    </section>
  );
}
