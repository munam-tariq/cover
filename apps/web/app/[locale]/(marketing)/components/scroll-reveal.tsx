"use client";

/* scroll-reveal.tsx — toggles `.in` on `.reveal` elements as they scroll into
   view (replaces the rAF scanner in the redesign prototype). Mounted once in
   the marketing layout; re-scans on route change so newly-rendered pages animate. */

import { useEffect } from "react";

import { usePathname } from "@/i18n/navigation";

export function ScrollReveal() {
  const pathname = usePathname();

  useEffect(() => {
    let cancelled = false;
    let observer: IntersectionObserver | null = null;
    let idleId: number | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const scan = () => {
      if (cancelled) return;

      const els = Array.from(document.querySelectorAll<HTMLElement>(".reveal:not(.in)"));
      if (els.length === 0) return;

      // If the browser can't observe, just show everything.
      if (typeof IntersectionObserver === "undefined") {
        els.forEach((el) => el.classList.add("in"));
        return;
      }

      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              entry.target.classList.add("in");
              observer?.unobserve(entry.target);
            }
          }
        },
        // fire when the element's top crosses ~90% of the viewport height
        { rootMargin: "0px 0px -10% 0px", threshold: 0 },
      );

      els.forEach((el) => observer?.observe(el));
    };

    if ("requestIdleCallback" in window) {
      idleId = window.requestIdleCallback(scan, { timeout: 1200 });
    } else {
      timeoutId = setTimeout(scan, 200);
    }

    return () => {
      cancelled = true;
      if (idleId !== null) window.cancelIdleCallback(idleId);
      if (timeoutId) clearTimeout(timeoutId);
      observer?.disconnect();
    };
  }, [pathname]);

  return null;
}
