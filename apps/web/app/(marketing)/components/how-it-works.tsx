"use client";

import { motion } from "framer-motion";
import { Brain, Code2, UserPlus } from "lucide-react";

const steps = [
  {
    icon: Brain,
    title: "Train",
    description:
      "Upload your docs, FAQ, or website URL. The AI learns your product, pricing, and policies automatically.",
  },
  {
    icon: Code2,
    title: "Deploy",
    description:
      "Add one line of code to your website. Works on Shopify, WordPress, Wix, or any site.",
  },
  {
    icon: UserPlus,
    title: "Capture",
    description:
      "Your AI agent talks to every visitor, qualifies interest, and captures leads — around the clock.",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
    },
  },
};

export function HowItWorks() {
  return (
    <section className="bg-[#050505] py-32">
      <div className="max-w-6xl mx-auto px-6">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={containerVariants}
          className="text-center mb-16"
        >
          <motion.p
            variants={itemVariants}
            className="text-blue-400 text-sm font-medium tracking-wider uppercase mb-4"
          >
            HOW IT WORKS
          </motion.p>
          <motion.h2
            variants={itemVariants}
            className="text-3xl md:text-5xl font-bold text-white mb-4"
          >
            Live in 5 minutes. No code required.
          </motion.h2>
          <motion.p variants={itemVariants} className="text-lg text-zinc-400">
            Three steps to start capturing leads.
          </motion.p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={containerVariants}
          className="grid md:grid-cols-3 gap-8 relative"
        >
          {/* Connecting lines */}
          <div className="hidden md:block absolute top-8 left-[16.66%] right-[16.66%] h-px bg-white/[0.08]" />

          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={step.title}
                variants={itemVariants}
                className="flex flex-col items-center text-center"
              >
                <div className="relative mb-6">
                  <div className="w-16 h-16 rounded-2xl bg-[#111] border border-white/[0.08] flex items-center justify-center">
                    <Icon className="w-7 h-7 text-blue-500" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center text-sm font-bold text-white">
                    {index + 1}
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">
                  {step.title}
                </h3>
                <p className="text-zinc-400 leading-relaxed max-w-xs">
                  {step.description}
                </p>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
