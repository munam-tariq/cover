"use client";

import { motion } from "framer-motion";

const integrations = [
  {
    name: "Cursor",
    description: "MCP Integration",
    logo: (
      <svg viewBox="0 0 24 24" className="w-8 h-8" fill="currentColor">
        <path d="M12 2L2 19.5h20L12 2zm0 4l6.5 11.5h-13L12 6z"/>
      </svg>
    ),
  },
  {
    name: "Claude",
    description: "MCP Integration",
    logo: (
      <svg viewBox="0 0 24 24" className="w-8 h-8" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15v-4H7l5-7v4h4l-5 7z"/>
      </svg>
    ),
  },
  {
    name: "OpenAI",
    description: "Chat Intelligence",
    logo: (
      <svg viewBox="0 0 24 24" className="w-8 h-8" fill="currentColor">
        <path d="M22.28 9.84c.41-1.24.23-2.6-.49-3.69a4.17 4.17 0 0 0-3.54-1.93c-.95.01-1.87.35-2.6.94a4.21 4.21 0 0 0-3.3-1.61c-1.4 0-2.7.7-3.47 1.87a4.19 4.19 0 0 0-2.71-1.01 4.2 4.2 0 0 0-3.86 2.6 4.21 4.21 0 0 0 .59 4.65A4.21 4.21 0 0 0 2.4 15c-.01 1.13.44 2.21 1.24 3.01a4.17 4.17 0 0 0 3.31 1.34c.95-.01 1.87-.35 2.6-.94.78 1.04 2 1.65 3.3 1.64 1.4 0 2.7-.7 3.47-1.87.78.64 1.76 1 2.78 1.01a4.2 4.2 0 0 0 3.86-2.6 4.21 4.21 0 0 0-.59-4.65 4.2 4.2 0 0 0-.09-4.1z"/>
      </svg>
    ),
  },
  {
    name: "Any Website",
    description: "React, Next.js, HTML",
    logo: (
      <svg viewBox="0 0 24 24" className="w-8 h-8" fill="currentColor">
        <path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/>
      </svg>
    ),
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
  show: { opacity: 1, y: 0 },
};

export function WorksWith() {
  return (
    <section className="py-24 bg-white border-t border-slate-100">
      <div className="max-w-5xl mx-auto px-6">
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center text-slate-500 mb-12"
        >
          Works with your favorite AI tools
        </motion.p>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="grid grid-cols-2 md:grid-cols-4 gap-8"
        >
          {integrations.map((integration) => (
            <motion.div
              key={integration.name}
              variants={item}
              className="flex flex-col items-center gap-3 p-6 rounded-xl bg-slate-50 border border-slate-100 hover:border-slate-200 hover:shadow-lg transition-all duration-300"
            >
              <div className="text-slate-700">{integration.logo}</div>
              <div className="text-center">
                <p className="text-slate-900 font-medium">{integration.name}</p>
                <p className="text-sm text-slate-500">{integration.description}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
