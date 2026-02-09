"use client";

import { motion, useInView } from "framer-motion";
import { useEffect, useState, useRef } from "react";

const codeLines = [
  { text: "<!-- Add to your website -->", color: "text-zinc-400" },
  { text: '<script', color: "text-blue-600" },
  { text: '  src="https://cdn.supportbase.app/widget.js"', color: "text-emerald-600" },
  { text: '  data-project-id="your-project-id"', color: "text-amber-600" },
  { text: "></script>", color: "text-blue-600" },
  { text: "", color: "" },
  { text: "<!-- That's it. You're live. -->", color: "text-zinc-400" },
];

export function CodeSection() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const [visibleLines, setVisibleLines] = useState(0);

  useEffect(() => {
    if (!isInView) return;

    let lineIndex = 0;
    const interval = setInterval(() => {
      lineIndex++;
      setVisibleLines(lineIndex);
      if (lineIndex >= codeLines.length) clearInterval(interval);
    }, 200);

    return () => clearInterval(interval);
  }, [isInView]);

  return (
    <section ref={ref} className="py-24 md:py-40">
      <div className="max-w-4xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left: Copy */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-400 mb-4">
              For developers
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-zinc-900 tracking-tight mb-6">
              One line.
              <br />
              That&apos;s it.
            </h2>
            <p className="text-zinc-500 leading-relaxed mb-6">
              Add a single script tag to your website. Works with React,
              Next.js, Shopify, WordPress, or plain HTML. Shadow DOM isolation
              means zero style conflicts.
            </p>
            <p className="text-zinc-500 leading-relaxed">
              Or deploy entirely from your editor — SupportBase has native MCP
              integration for Cursor, Claude, and Windsurf.
            </p>
          </motion.div>

          {/* Right: Code window */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.15 }}
          >
            <div className="rounded-2xl border border-black/[0.08] bg-zinc-950 overflow-hidden shadow-xl shadow-black/[0.08]">
              {/* Window chrome */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06] bg-zinc-900">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
                  <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
                  <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
                </div>
                <span className="text-[11px] text-zinc-500 ml-2">
                  index.html
                </span>
              </div>

              {/* Code */}
              <div className="p-5 font-mono text-sm leading-7">
                {codeLines.map((line, i) => (
                  <div
                    key={i}
                    className={`transition-opacity duration-300 ${
                      i < visibleLines ? "opacity-100" : "opacity-0"
                    }`}
                  >
                    <span className="text-zinc-600 select-none mr-4 inline-block w-4 text-right text-xs">
                      {i + 1}
                    </span>
                    <span className={line.color}>{line.text}</span>
                    {i === visibleLines - 1 && (
                      <motion.span
                        className="inline-block w-[2px] h-4 bg-blue-400 ml-0.5 align-middle"
                        animate={{ opacity: [1, 0, 1] }}
                        transition={{ duration: 1, repeat: Infinity }}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
