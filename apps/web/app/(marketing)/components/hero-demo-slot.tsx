"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const LiveDemo = dynamic(
  () => import("./live-demo").then((m) => ({ default: m.LiveDemo })),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          height: 480,
          borderRadius: 24,
          background: "var(--ff-card)",
          border: "1px solid var(--ff-line)",
        }}
      />
    ),
  },
);

export function HeroDemoSlot() {
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    const mobile = window.matchMedia("(max-width: 767px)");

    if (!mobile.matches) {
      setShouldLoad(true);
      return;
    }

    const load = () => setShouldLoad(true);
    const onScroll = () => {
      if (window.scrollY > 220) load();
    };

    if (window.location.hash === "#demo" || window.scrollY > 220) {
      load();
      return;
    }

    window.addEventListener("scroll", onScroll, { passive: true, once: true });
    window.addEventListener("hashchange", load, { once: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("hashchange", load);
    };
  }, []);

  if (!shouldLoad) {
    return (
      <div
        aria-hidden="true"
        style={{
          height: 480,
          borderRadius: 24,
          background: "var(--ff-card)",
          border: "1px solid var(--ff-line)",
          boxShadow: "0 50px 100px -45px rgba(16,24,40,.26)",
        }}
      />
    );
  }

  return <LiveDemo />;
}
