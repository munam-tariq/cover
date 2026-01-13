"use client";

import { motion } from "framer-motion";
import Image from "next/image";

const integrations = [
  {
    name: "Cursor",
    description: "MCP Integration",
    logo: "/icons8-cursor-50.png",
  },
  {
    name: "Claude",
    description: "MCP Integration",
    logo: "/icons8-claude-ai-48.png",
  },
  {
    name: "Windsurf",
    description: "MCP Integration",
    logo: "/icons8-windsurf-editor-48.png",
  },
  {
    name: "Any Website",
    description: "React, Next.js, HTML",
    logo: null,
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
              <div className="w-10 h-10 flex items-center justify-center">
                {integration.logo ? (
                  <Image
                    src={integration.logo}
                    alt={integration.name}
                    width={40}
                    height={40}
                    className="object-contain"
                  />
                ) : (
                  <svg viewBox="0 0 512 512" className="w-10 h-10" fill="none">
                    <rect width="512" height="512" rx="128" fill="#1E293B"/>
                    <path d="M156 256L220 192M156 256L220 320M356 256L292 192M356 256L292 320" stroke="#fff" strokeWidth="36" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
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
