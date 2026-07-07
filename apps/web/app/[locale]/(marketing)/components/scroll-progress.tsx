"use client";

import { useEffect, useRef } from "react";

export function ScrollProgress() {
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;
    // transform-origin has no logical keyword, so fill from the reading
    // direction's start (right in RTL) rather than always physical-left.
    bar.style.transformOrigin = document.documentElement.dir === "rtl" ? "right" : "left";
    const update = () => {
      const total = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.transform = `scaleX(${total > 0 ? window.scrollY / total : 0})`;
    };
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  return (
    <div
      ref={barRef}
      style={{
        position: "fixed",
        top: 0,
        insetInline: 0,
        height: 2,
        background: "var(--ff-ink)",
        transform: "scaleX(0)",
        zIndex: 100,
        pointerEvents: "none",
        willChange: "transform",
      }}
    />
  );
}
