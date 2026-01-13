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
        <path d="M22.28 9.84c.41-1.24.23-2.6-.49-3.69a4.17 4.17 0 0 0-3.54-1.93c-.95.01-1.87.35-2.6.94a4.21 4.21 0 0 0-3.3-1.61c-1.4 0-2.7.7-3.47 1.87a4.19 4.19 0 0 0-2.71-1.01 4.2 4.2 0 0 0-3.86 2.6 4.21 4.21 0 0 0 .59 4.65A4.21 4.21 0 0 0 2.4 15c-.01 1.13.44 2.21 1.24 3.01a4.17 4.17 0 0 0 3.31 1.34c.95-.01 1.87-.35 2.6-.94.78 1.04 2 1.65 3.3 1.64 1.4 0 2.7-.7 3.47-1.87.78.64 1.76 1 2.78 1.01a4.2 4.2 0 0 0 3.86-2.6 4.21 4.21 0 0 0-.59-4.65 4.2 4.2 0 0 0-.09-4.1zm-6.13 10.43a2.8 2.8 0 0 1-1.96-.76l.1-.05 3.24-1.87c.16-.1.26-.28.26-.46V11l1.37.79v6.23a2.8 2.8 0 0 1-3.01 2.25zM5.1 17.4a2.79 2.79 0 0 1-.34-1.87l.1.06 3.24 1.87c.17.1.37.1.54 0l3.96-2.29v1.58l-3.28 1.9a2.8 2.8 0 0 1-4.22-1.25zm-.89-6.34c.39-.67.99-1.17 1.7-1.44v3.85c0 .19.1.36.27.46l3.95 2.28-1.37.79-3.28-1.89a2.8 2.8 0 0 1-1.27-3.05zm13.27 3.09l-3.96 2.29-1.37-.79 3.28-1.89a.53.53 0 0 0 .27-.46V7.45l1.37.79v6.23a2.8 2.8 0 0 1 .41-.32zm1.86-3.55l-.1-.06-3.24-1.87a.53.53 0 0 0-.54 0L11.5 11V9.42l3.28-1.9a2.8 2.8 0 0 1 4.56 3.08zm-8.57 2.82L9.4 12.63v-1.58l3.28-1.89c.17-.1.26-.28.26-.46V5l1.37.79v3.86c0 .18-.1.36-.26.46l-3.28 2.31z"/>
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
    <section className="py-24 bg-[#050505] border-t border-white/5">
      <div className="max-w-5xl mx-auto px-6">
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center text-gray-500 mb-12"
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
              className="flex flex-col items-center gap-3 p-6 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-colors"
            >
              <div className="text-gray-400">{integration.logo}</div>
              <div className="text-center">
                <p className="text-white font-medium">{integration.name}</p>
                <p className="text-sm text-gray-500">{integration.description}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
