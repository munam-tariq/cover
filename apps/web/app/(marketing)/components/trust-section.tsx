"use client";

import { motion } from "framer-motion";
import { Shield, Lock, Brain } from "lucide-react";

const trustItems = [
  {
    icon: Shield,
    title: "Your data stays yours",
    description: "We never use your data to train AI models. Your knowledge base is yours alone.",
    gradient: "from-blue-500 to-cyan-500",
  },
  {
    icon: Lock,
    title: "Encrypted & secure",
    description: "All data encrypted at rest and in transit. Enterprise-grade security by default.",
    gradient: "from-purple-500 to-pink-500",
  },
  {
    icon: Brain,
    title: "No AI hallucinations",
    description: "Answers come only from YOUR documents. If it's not in your knowledge base, we say so.",
    gradient: "from-green-500 to-emerald-500",
  },
];

export function TrustSection() {
  return (
    <section className="py-20 bg-slate-900 text-white">
      <div className="max-w-5xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Built on trust
          </h2>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Your customers trust you. You can trust us.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {trustItems.map((item, index) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="text-center"
            >
              <div
                className={`w-14 h-14 mx-auto mb-4 rounded-xl bg-gradient-to-r ${item.gradient} flex items-center justify-center shadow-lg`}
              >
                <item.icon className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                {item.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
