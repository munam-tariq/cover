import { getLocale } from "next-intl/server";

import type { Locale } from "@/i18n/routing";

import { getLandingData } from "../landing-data";

import { WRAP } from "./marketing-kit";

export async function StatsBar() {
  const { stats } = getLandingData((await getLocale()) as Locale);
  return (
    <section style={{ ...WRAP, padding: "clamp(40px,6vh,72px) clamp(20px,5vw,40px)" }}>
      <div
        className="reveal"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))",
          gap: 1,
          background: "var(--ff-line)",
          borderRadius: 20,
          overflow: "hidden",
          border: "1px solid var(--ff-line)",
        }}
      >
        {stats.map(([num, label]) => (
          <div key={label} style={{ background: "var(--ff-card)", padding: "30px 26px", textAlign: "center" }}>
            <div style={{ fontSize: "clamp(34px,4vw,46px)", fontWeight: 800, letterSpacing: "-.03em", color: "var(--ff-ink)", lineHeight: 1 }}>
              {num}
            </div>
            <div style={{ fontSize: 13.5, color: "var(--ff-soft)", marginTop: 10, fontWeight: 500 }}>{label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
