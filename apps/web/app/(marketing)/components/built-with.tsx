"use client";

import { motion } from "framer-motion";

const techStack = [
  {
    name: "OpenAI",
    description: "Chat intelligence & embeddings",
    logo: (
      <svg viewBox="0 0 24 24" className="w-10 h-10" fill="currentColor">
        <path d="M22.28 9.84c.41-1.24.23-2.6-.49-3.69a4.17 4.17 0 0 0-3.54-1.93c-.95.01-1.87.35-2.6.94a4.21 4.21 0 0 0-3.3-1.61c-1.4 0-2.7.7-3.47 1.87a4.19 4.19 0 0 0-2.71-1.01 4.2 4.2 0 0 0-3.86 2.6 4.21 4.21 0 0 0 .59 4.65A4.21 4.21 0 0 0 2.4 15c-.01 1.13.44 2.21 1.24 3.01a4.17 4.17 0 0 0 3.31 1.34c.95-.01 1.87-.35 2.6-.94.78 1.04 2 1.65 3.3 1.64 1.4 0 2.7-.7 3.47-1.87.78.64 1.76 1 2.78 1.01a4.2 4.2 0 0 0 3.86-2.6 4.21 4.21 0 0 0-.59-4.65 4.2 4.2 0 0 0-.09-4.1z"/>
      </svg>
    ),
  },
  {
    name: "Supabase",
    description: "Database & authentication",
    logo: (
      <svg viewBox="0 0 109 113" className="w-10 h-10" fill="currentColor">
        <path d="M63.71 110.67c-2.25 2.81-6.74.64-6.58-3.18l1.84-44.78H92.6c4.45 0 6.77 5.32 3.81 8.7L63.71 110.67z" fillOpacity="0.6"/>
        <path d="M63.71 110.67c-2.25 2.81-6.74.64-6.58-3.18l1.84-44.78H92.6c4.45 0 6.77 5.32 3.81 8.7L63.71 110.67z"/>
        <path d="M45.23 2.56c2.25-2.81 6.74-.64 6.58 3.18l-.84 44.78H16.41c-4.45 0-6.77-5.32-3.81-8.7L45.23 2.56z"/>
      </svg>
    ),
  },
  {
    name: "pgvector",
    description: "Semantic search",
    logo: (
      <svg viewBox="0 0 24 24" className="w-10 h-10" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
        <circle cx="12" cy="12" r="3"/>
        <path d="M12 6v2M12 16v2M6 12h2M16 12h2"/>
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

export function BuiltWith() {
  return (
    <section className="py-24 bg-[#050505] border-t border-white/5">
      <div className="max-w-5xl mx-auto px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Built on technology you trust
          </h2>
          <p className="text-lg text-gray-400">
            Powered by the same tools that run the best products on the internet.
          </p>
        </motion.div>

        {/* Tech Stack */}
        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-3 gap-8"
        >
          {techStack.map((tech) => (
            <motion.div
              key={tech.name}
              variants={item}
              className="flex flex-col items-center text-center p-8 rounded-2xl bg-white/[0.02] border border-white/5"
            >
              <div className="text-gray-400 mb-4">{tech.logo}</div>
              <h3 className="text-xl font-semibold text-white mb-2">
                {tech.name}
              </h3>
              <p className="text-gray-500">{tech.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
