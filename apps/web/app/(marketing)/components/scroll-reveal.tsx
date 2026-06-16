"use client";

/* scroll-reveal.tsx — toggles `.in` on `.reveal` elements as they scroll into
   view (replaces the rAF scanner in the redesign prototype). Mounted once in
   the marketing layout; re-scans on route change so newly-rendered pages animate. */

import { usePathname } from "next/navigation";
import { useEffect } from "react";

export function ScrollReveal() {
  const pathname = usePathname();

  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>(".reveal:not(.in)"));
    if (els.length === 0) return;

    // If the browser can't observe, just show everything.
    if (typeof IntersectionObserver === "undefined") {
      els.forEach((el) => el.classList.add("in"));
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            io.unobserve(entry.target);
          }
        }
      },
      // fire when the element's top crosses ~90% of the viewport height
      { rootMargin: "0px 0px -10% 0px", threshold: 0 },
    );

    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [pathname]);

  return null;
}
