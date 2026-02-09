"use client";

import { motion } from "framer-motion";

export function SocialProof() {
  const metrics = [
    {
      value: "89%",
      label: "of questions answered automatically",
    },
    {
      value: "5 min",
      label: "setup time",
    },
    {
      value: "24/7",
      label: "availability",
    },
    {
      value: "Zero",
      label: "hallucinations",
    },
  ];

  return (
    <section className="bg-[#111] border-y border-white/[0.08] py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="max-w-5xl mx-auto px-6"
      >
        {/* Desktop: Horizontal Row */}
        <div className="hidden md:flex items-center justify-between">
          {metrics.map((metric, index) => (
            <div key={index} className="flex items-center">
              <div className="text-center px-8">
                <div className="text-2xl font-bold text-white mb-1">
                  {metric.value}
                </div>
                <div className="text-sm text-zinc-400">{metric.label}</div>
              </div>
              {index < metrics.length - 1 && (
                <div className="h-12 w-px bg-white/[0.08]" />
              )}
            </div>
          ))}
        </div>

        {/* Mobile: 2x2 Grid */}
        <div className="grid grid-cols-2 gap-6 md:hidden">
          {metrics.map((metric, index) => (
            <div key={index} className="text-center">
              <div className="text-2xl font-bold text-white mb-1">
                {metric.value}
              </div>
              <div className="text-sm text-zinc-400">{metric.label}</div>
            </div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}
