"use client";

import { motion } from "framer-motion";
import { Bot, Clock, Zap } from "lucide-react";

const stats = [
  {
    icon: Bot,
    value: "89%",
    label: "of questions answered by AI",
    gradient: "from-blue-500 to-cyan-500",
  },
  {
    icon: Clock,
    value: "5 min",
    label: "setup time",
    gradient: "from-purple-500 to-pink-500",
  },
  {
    icon: Zap,
    value: "24/7",
    label: "availability",
    gradient: "from-orange-500 to-red-500",
  },
];

export function StatsBar() {
  return (
    <section className="py-12 bg-white border-y border-slate-100">
      <div className="max-w-5xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-3 gap-8"
        >
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="flex items-center justify-center gap-4"
            >
              <div
                className={`w-12 h-12 rounded-xl bg-gradient-to-r ${stat.gradient} flex items-center justify-center shadow-lg`}
              >
                <stat.icon className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                <p className="text-sm text-slate-500">{stat.label}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
