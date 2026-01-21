"use client";

import { motion } from "framer-motion";
import { Users, Brain, Mail, BarChart3, Plug, Globe } from "lucide-react";

const features = [
  {
    title: "Human Handoff",
    description:
      "AI handles the easy stuff. Your team handles the hard stuff. When questions get complex, customers connect to a real person instantly—with built-in queue management, agent assignment, and business hours. No one falls through the cracks.",
    icon: Users,
    className: "md:col-span-2 md:row-span-2",
    gradient: "from-blue-500/10 via-blue-500/5 to-transparent",
    iconGradient: "from-blue-500 to-cyan-500",
  },
  {
    title: "Answers From Your Docs",
    description:
      "Upload your FAQ, policies, product info. AI answers accurately from YOUR knowledge—no making things up.",
    icon: Brain,
    className: "md:col-span-1",
    gradient: "from-green-500/10 via-green-500/5 to-transparent",
    iconGradient: "from-green-500 to-emerald-500",
  },
  {
    title: "Never Miss a Lead",
    description:
      "When AI can't answer, it captures customer emails so you can follow up. No lead left behind.",
    icon: Mail,
    className: "md:col-span-1",
    gradient: "from-purple-500/10 via-purple-500/5 to-transparent",
    iconGradient: "from-purple-500 to-pink-500",
  },
  {
    title: "See What Customers Ask",
    description:
      "Analytics show common questions, gaps in your docs, and customer satisfaction. Improve over time.",
    icon: BarChart3,
    className: "md:col-span-1",
    gradient: "from-orange-500/10 via-orange-500/5 to-transparent",
    iconGradient: "from-orange-500 to-red-500",
  },
  {
    title: "Connect Your Tools",
    description:
      "Check order status, look up accounts, pull live data. Your chatbot can do more than just answer.",
    icon: Plug,
    className: "md:col-span-1",
    gradient: "from-pink-500/10 via-pink-500/5 to-transparent",
    iconGradient: "from-pink-500 to-rose-500",
  },
  {
    title: "Works on Any Website",
    description:
      "Shopify, WordPress, Wix, custom sites—one line of code and you're live.",
    icon: Globe,
    className: "md:col-span-1",
    gradient: "from-yellow-500/10 via-yellow-500/5 to-transparent",
    iconGradient: "from-yellow-500 to-amber-500",
  },
];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export function FeaturesBento() {
  return (
    <section className="py-32 bg-gradient-to-b from-slate-50 to-white border-t border-slate-100">
      <div className="max-w-6xl mx-auto px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
            Everything you need to stop answering the same questions
          </h2>
          <p className="text-xl text-slate-600">
            Powerful features without the enterprise complexity.
          </p>
        </motion.div>

        {/* Bento Grid */}
        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
          className="grid md:grid-cols-3 gap-4"
        >
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              variants={item}
              className={`group relative p-6 rounded-2xl bg-white border border-slate-100 hover:border-slate-200 hover:shadow-xl transition-all duration-300 ${feature.className}`}
            >
              {/* Gradient Background on Hover */}
              <div
                className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl`}
              />

              <div className="relative z-10 h-full flex flex-col">
                {/* Icon */}
                <div className={`w-12 h-12 bg-gradient-to-r ${feature.iconGradient} rounded-xl flex items-center justify-center mb-4 shadow-lg`}>
                  <feature.icon className="w-6 h-6 text-white" />
                </div>

                {/* Content */}
                <h3 className="text-xl font-semibold text-slate-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-slate-600 leading-relaxed flex-grow">
                  {feature.description}
                </p>

                {/* Large Card Extra Visual (Human Handoff) */}
                {index === 0 && (
                  <div className="mt-6 pt-6 border-t border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="flex -space-x-2">
                        {["S", "M", "A"].map((initial, i) => (
                          <div
                            key={i}
                            className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 border-2 border-white flex items-center justify-center shadow-sm text-white text-xs font-bold"
                          >
                            {initial}
                          </div>
                        ))}
                      </div>
                      <div className="text-sm text-slate-500">
                        Your team standing by to help
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
