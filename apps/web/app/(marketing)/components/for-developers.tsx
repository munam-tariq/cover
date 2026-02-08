"use client";

import { motion } from "framer-motion";
import { useState, useEffect, useRef } from "react";

export function ForDevelopers() {
  const [visibleLines, setVisibleLines] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  const codeLines = [
    { text: "> Add a SupportBase chatbot to my Next.js app", color: "text-white" },
    { text: "", color: "text-white" },
    { text: "  Creating project \"My App Support\"...", color: "text-zinc-400" },
    { text: "  Uploading docs from ./docs...", color: "text-zinc-400" },
    { text: "  Generating embed code...", color: "text-zinc-400" },
    { text: "", color: "text-white" },
    { text: "  Done! Add this to your layout:", color: "text-zinc-400" },
    { text: "  <script src=\"https://cdn.supportbase.app/widget.js\"", color: "text-green-400" },
    { text: "         data-project-id=\"abc123\"></script>", color: "text-green-400" },
  ];

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isAnimating) {
          setIsAnimating(true);
          setVisibleLines(0);

          // Animate lines one by one
          let currentLine = 0;
          const interval = setInterval(() => {
            currentLine++;
            setVisibleLines(currentLine);

            if (currentLine >= codeLines.length) {
              clearInterval(interval);
              // Reset after animation completes
              setTimeout(() => {
                setIsAnimating(false);
              }, 2000);
            }
          }, 500);
        }
      },
      { threshold: 0.3 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, [isAnimating]);

  return (
    <section ref={sectionRef} className="py-32 bg-[#050505]">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left side - Animated code block */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="order-2 lg:order-1"
          >
            <div className="bg-[#0a0a0a] border border-white/[0.08] rounded-2xl overflow-hidden">
              {/* Header bar */}
              <div className="bg-[#111] border-b border-white/[0.08] px-4 py-3 flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
                </div>
                <div className="text-sm text-zinc-400 ml-2">Terminal</div>
              </div>

              {/* Code content */}
              <div className="p-6 font-mono text-sm leading-relaxed min-h-[300px]">
                {codeLines.map((line, index) => (
                  <div
                    key={index}
                    className={`${line.color} transition-opacity duration-300 ${
                      index < visibleLines ? "opacity-100" : "opacity-0"
                    }`}
                  >
                    {line.text || "\u00A0"}
                  </div>
                ))}
                {visibleLines < codeLines.length && (
                  <span className="inline-block w-2 h-4 bg-blue-400 animate-pulse"></span>
                )}
              </div>
            </div>
          </motion.div>

          {/* Right side - Copy */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="order-1 lg:order-2"
          >
            <div className="text-blue-400 text-sm font-medium tracking-wider uppercase mb-4">
              FOR DEVELOPERS
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
              Deploy from your editor. Literally.
            </h2>
            <p className="text-lg text-zinc-400 leading-relaxed mb-6">
              SupportBase is the only AI agent platform with native MCP integration.
              Ask Cursor or Claude to add a chatbot — it creates the project, uploads
              your docs, and gives you the embed code. No dashboard required.
            </p>
            <p className="text-sm text-zinc-500">
              Works with Cursor, Claude, and Windsurf.
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
