"use client";

import { motion } from "framer-motion";
import { Brain, Mail, BarChart3, Folders, Plug } from "lucide-react";

const features = [
  {
    title: "RAG-Powered Intelligence",
    description:
      "Your chatbot answers from YOUR documentation. Semantic search finds the right info every time. No hallucinations, just accurate answers.",
    icon: Brain,
    className: "md:col-span-2 md:row-span-2",
    gradient: "from-blue-500/10 via-blue-500/5 to-transparent",
    iconGradient: "from-blue-500 to-cyan-500",
  },
  {
    title: "Lead Capture",
    description:
      "When the chatbot can't answer, it captures emails. Never lose a potential customer.",
    icon: Mail,
    className: "md:col-span-1",
    gradient: "from-green-500/10 via-green-500/5 to-transparent",
    iconGradient: "from-green-500 to-emerald-500",
  },
  {
    title: "API Tool Calling",
    description:
      "Connect your APIs. Let the chatbot check order status, look up accounts, fetch real-time data.",
    icon: Plug,
    className: "md:col-span-1",
    gradient: "from-purple-500/10 via-purple-500/5 to-transparent",
    iconGradient: "from-purple-500 to-pink-500",
  },
  {
    title: "Analytics Dashboard",
    description:
      "See what customers ask. Find gaps in your docs. Improve over time.",
    icon: BarChart3,
    className: "md:col-span-1",
    gradient: "from-orange-500/10 via-orange-500/5 to-transparent",
    iconGradient: "from-orange-500 to-red-500",
  },
  {
    title: "Multi-Project Support",
    description:
      "One account, unlimited chatbots. Perfect for agencies and multi-product companies.",
    icon: Folders,
    className: "md:col-span-1",
    gradient: "from-pink-500/10 via-pink-500/5 to-transparent",
    iconGradient: "from-pink-500 to-rose-500",
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
            Everything you need. Nothing you don't.
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

                {/* Large Card Extra Visual (RAG) */}
                {index === 0 && (
                  <div className="mt-6 pt-6 border-t border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="flex -space-x-2">
                        {[1, 2, 3].map((i) => (
                          <div
                            key={i}
                            className="w-8 h-8 rounded-lg bg-slate-100 border-2 border-white flex items-center justify-center shadow-sm"
                          >
                            <div className="w-4 h-4 bg-gradient-to-r from-blue-400 to-cyan-400 rounded" />
                          </div>
                        ))}
                      </div>
                      <div className="text-sm text-slate-500">
                        Chunks retrieved from your docs
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
