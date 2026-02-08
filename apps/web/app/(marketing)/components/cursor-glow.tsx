"use client";

import { useEffect, useRef } from "react";

export function CursorGlow() {
  const glowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const glow = glowRef.current;
    if (!glow) return;

    let x = 0;
    let y = 0;
    let currentX = 0;
    let currentY = 0;
    let animationFrame: number;

    const lerp = (start: number, end: number, factor: number) =>
      start + (end - start) * factor;

    const animate = () => {
      currentX = lerp(currentX, x, 0.1);
      currentY = lerp(currentY, y, 0.1);
      glow.style.transform = `translate(${currentX - 300}px, ${currentY - 300}px)`;
      animationFrame = requestAnimationFrame(animate);
    };

    const handleMouse = (e: MouseEvent) => {
      x = e.clientX;
      y = e.clientY;
    };

    window.addEventListener("mousemove", handleMouse);
    animationFrame = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("mousemove", handleMouse);
      cancelAnimationFrame(animationFrame);
    };
  }, []);

  return (
    <div
      ref={glowRef}
      className="pointer-events-none fixed top-0 left-0 z-30 hidden md:block"
      style={{
        width: 600,
        height: 600,
        background:
          "radial-gradient(circle, rgba(59,130,246,0.05) 0%, transparent 70%)",
        willChange: "transform",
      }}
    />
  );
}
