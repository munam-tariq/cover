"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";

function AnimatedNumber({ value, suffix = "" }: { value: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const [displayed, setDisplayed] = useState(0);

  useEffect(() => {
    if (!isInView) return;

    const duration = 1500;
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayed(Math.round(eased * value));
      if (progress < 1) requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
  }, [isInView, value]);

  return (
    <span ref={ref}>
      {displayed}
      {suffix}
    </span>
  );
}

const metrics = [
  { value: 89, suffix: "%", label: "Questions answered automatically" },
  { value: 5, suffix: " min", label: "Setup time" },
  { value: 24, suffix: "/7", label: "Availability" },
];

export function MetricsBar() {
  return (
    <section className="py-24 md:py-32">
      <div className="max-w-5xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-0">
          {metrics.map((metric, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: i * 0.15 }}
              className={`text-center ${
                i !== metrics.length - 1
                  ? "md:border-r md:border-black/[0.06]"
                  : ""
              }`}
            >
              <div className="text-5xl md:text-6xl font-bold text-zinc-900 tracking-tight mb-3">
                <AnimatedNumber value={metric.value} suffix={metric.suffix} />
              </div>
              <p className="text-sm text-zinc-400 tracking-wide">
                {metric.label}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
