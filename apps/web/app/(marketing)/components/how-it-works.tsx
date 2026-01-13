"use client";

import { motion } from "framer-motion";
import { Upload, Code2, Rocket } from "lucide-react";

const steps = [
  {
    number: "01",
    title: "Upload Your Knowledge",
    description:
      "PDFs, text files, or just paste your FAQ. We'll train your chatbot automatically.",
    icon: Upload,
    gradient: "from-blue-500 to-cyan-500",
  },
  {
    number: "02",
    title: "Get Your Embed Code",
    description:
      "One script tag. Works on any website—React, Next.js, plain HTML, anywhere.",
    icon: Code2,
    gradient: "from-purple-500 to-pink-500",
  },
  {
    number: "03",
    title: "Ship Support",
    description:
      "Your AI chatbot goes live instantly. Answering questions 24/7 while you sleep.",
    icon: Rocket,
    gradient: "from-orange-500 to-red-500",
  },
];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export function HowItWorks() {
  return (
    <section className="py-32 bg-white border-t border-slate-100">
      <div className="max-w-6xl mx-auto px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-20"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
            Live in 15 minutes. Seriously.
          </h2>
          <p className="text-xl text-slate-600">
            Three steps. No complexity. Just results.
          </p>
        </motion.div>

        {/* Steps */}
        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
          className="relative grid md:grid-cols-3 gap-8"
        >
          {/* Connecting Line (desktop only) */}
          <div className="hidden md:block absolute top-24 left-[16%] right-[16%] h-0.5 bg-gradient-to-r from-blue-200 via-purple-200 to-orange-200" />

          {steps.map((step, index) => (
            <motion.div
              key={step.number}
              variants={item}
              className="relative"
            >
              <div className="flex flex-col items-center text-center">
                {/* Icon Container */}
                <div className="relative mb-6">
                  <div className={`absolute -inset-4 bg-gradient-to-r ${step.gradient} rounded-full blur-xl opacity-20`} />
                  <div className="relative w-20 h-20 bg-white border-2 border-slate-100 rounded-2xl flex items-center justify-center shadow-lg">
                    <step.icon className="w-8 h-8 text-slate-700" />
                  </div>
                  {/* Step Number */}
                  <span className={`absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-r ${step.gradient} rounded-full flex items-center justify-center text-sm font-bold text-white shadow-lg`}>
                    {index + 1}
                  </span>
                </div>

                {/* Content */}
                <h3 className="text-xl font-semibold text-slate-900 mb-3">
                  {step.title}
                </h3>
                <p className="text-slate-600 leading-relaxed max-w-xs">
                  {step.description}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
