"use client";

import { motion } from "framer-motion";
import {
  Brain,
  UserPlus,
  ArrowRightLeft,
  BarChart3,
  Code2,
  Shield,
} from "lucide-react";

const capabilities = [
  {
    icon: Brain,
    title: "Trained on your product",
    description:
      "Upload docs, FAQs, or a website URL. RAG-powered retrieval ensures accurate answers from your content — no hallucinations.",
  },
  {
    icon: UserPlus,
    title: "Captures leads naturally",
    description:
      "No popups. No forms. The AI earns trust first, then asks for contact info at the right moment through conversation.",
  },
  {
    icon: ArrowRightLeft,
    title: "Human handoff built in",
    description:
      "Complex questions get routed to your team with full conversation history. Queue management, agent assignment, business hours.",
  },
  {
    icon: BarChart3,
    title: "Analytics that matter",
    description:
      "See what visitors ask, where the AI struggles, and which conversations convert. Improve based on real gaps.",
  },
  {
    icon: Code2,
    title: "One-line install",
    description:
      "Copy one script tag. Works on any website. Shadow DOM isolation means zero conflicts with your existing styles.",
  },
  {
    icon: Shield,
    title: "Qualifies before handoff",
    description:
      "Configurable qualifying questions identify high-intent visitors. Your team gets warm leads with context, not cold emails.",
  },
];

export function CapabilitiesSection() {
  return (
    <section className="py-24 md:py-40">
      <div className="max-w-4xl mx-auto px-6">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="mb-20"
        >
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-400 mb-4">
            Capabilities
          </p>
          <h2 className="text-3xl md:text-5xl font-bold text-zinc-900 tracking-tight leading-tight">
            Everything you need.
            <br />
            <span className="text-zinc-300">Nothing you don't.</span>
          </h2>
        </motion.div>

        {/* Capability list */}
        <div className="space-y-0">
          {capabilities.map((cap, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
              className="group py-8 border-t border-black/[0.06] first:border-t-0"
            >
              <div className="flex gap-6 items-start">
                <div className="w-10 h-10 rounded-lg bg-zinc-50 border border-black/[0.06] flex items-center justify-center flex-shrink-0 group-hover:border-blue-200 group-hover:bg-blue-50 transition-colors duration-300">
                  <cap.icon className="w-4 h-4 text-zinc-400 group-hover:text-blue-500 transition-colors duration-300" />
                </div>
                <div>
                  <h3 className="text-zinc-900 font-medium mb-1.5">{cap.title}</h3>
                  <p className="text-zinc-400 text-sm leading-relaxed max-w-xl">
                    {cap.description}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
