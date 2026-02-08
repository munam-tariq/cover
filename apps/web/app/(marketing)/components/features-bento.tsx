"use client";

import { motion } from "framer-motion";
import { Brain, UserPlus, Filter, Users, BarChart3, Code2 } from "lucide-react";

const features = [
  {
    icon: Brain,
    iconColor: "blue-500",
    title: "Knows Your Product Inside Out",
    description:
      "Upload docs, FAQs, or a website URL. RAG-powered retrieval ensures accurate answers — no hallucinations, no making things up.",
    colSpan: "md:col-span-2",
  },
  {
    icon: UserPlus,
    iconColor: "green-500",
    title: "Captures Leads Naturally",
    description:
      "No annoying popups. The AI earns trust first, then asks for contact info at the right moment. Progressive capture, not form spam.",
    colSpan: "",
  },
  {
    icon: Filter,
    iconColor: "blue-400",
    title: "Qualifies Before Handoff",
    description:
      "Configurable qualifying questions identify high-intent visitors. Your team gets warm leads with full context, not cold emails.",
    colSpan: "",
  },
  {
    icon: Users,
    iconColor: "purple-400",
    title: "Human Handoff When It Matters",
    description:
      "Complex questions get routed to your team with full conversation history. Queue management, agent assignment, business hours — built in.",
    colSpan: "",
  },
  {
    icon: BarChart3,
    iconColor: "amber-400",
    title: "Analytics That Matter",
    description:
      "See what visitors ask, where the AI struggles, and which conversations convert. Improve your knowledge base based on real gaps.",
    colSpan: "",
  },
  {
    icon: Code2,
    iconColor: "zinc-400",
    title: "One-Line Install",
    description:
      "Copy one script tag. Works on any website. Shadow DOM isolation means zero conflicts with your existing styles.",
    colSpan: "",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
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

const getIconColorClasses = (color: string) => {
  const colorMap: Record<string, { bg: string; text: string }> = {
    "blue-500": { bg: "bg-blue-500/10", text: "text-blue-500" },
    "green-500": { bg: "bg-green-500/10", text: "text-green-500" },
    "blue-400": { bg: "bg-blue-400/10", text: "text-blue-400" },
    "purple-400": { bg: "bg-purple-400/10", text: "text-purple-400" },
    "amber-400": { bg: "bg-amber-400/10", text: "text-amber-400" },
    "zinc-400": { bg: "bg-zinc-400/10", text: "text-zinc-400" },
  };
  return colorMap[color] || colorMap["blue-500"];
};

export function FeaturesBento() {
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
            FEATURES
          </motion.p>
          <motion.h2
            variants={itemVariants}
            className="text-3xl md:text-5xl font-bold text-white mb-4"
          >
            Everything you need to turn visitors into customers.
          </motion.h2>
          <motion.p variants={itemVariants} className="text-lg text-zinc-400">
            Powerful features without the enterprise complexity.
          </motion.p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={containerVariants}
          className="grid md:grid-cols-3 gap-4"
        >
          {features.map((feature) => {
            const Icon = feature.icon;
            const colors = getIconColorClasses(feature.iconColor);

            return (
              <motion.div
                key={feature.title}
                variants={itemVariants}
                className={`bg-[#111] border border-white/[0.08] rounded-2xl p-6 hover:border-white/[0.15] transition-all duration-300 ${feature.colSpan}`}
              >
                <div
                  className={`w-10 h-10 rounded-xl ${colors.bg} flex items-center justify-center mb-4`}
                >
                  <Icon className={`w-5 h-5 ${colors.text}`} />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-zinc-400 text-sm leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
