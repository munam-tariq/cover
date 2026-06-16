import { LOGOS } from "../landing-data";

import { WRAP } from "./marketing-kit";

export function LogoStrip() {
  // repeat the small logo set, then double for a seamless -50% marquee loop
  const base = [...LOGOS, ...LOGOS, ...LOGOS, ...LOGOS];
  const row = [...base, ...base];
  return (
    <section style={{ padding: "8px 0 40px", overflow: "hidden" }}>
      <div style={{ ...WRAP, textAlign: "center" }}>
        <div
          className="reveal"
          style={{
            fontSize: 12.5,
            fontWeight: 600,
            letterSpacing: ".1em",
            color: "var(--ff-muted)",
            textTransform: "uppercase",
            marginBottom: 22,
          }}
        >
          Trusted by support &amp; growth teams
        </div>
      </div>
      <div
        className="reveal"
        style={{
          position: "relative",
          maskImage: "linear-gradient(90deg,transparent,#000 12%,#000 88%,transparent)",
          WebkitMaskImage: "linear-gradient(90deg,transparent,#000 12%,#000 88%,transparent)",
        }}
      >
        <div style={{ display: "flex", gap: 56, width: "max-content", animation: "ff-marquee 30s linear infinite", padding: "0 28px" }}>
          {row.map((l, i) => (
            <span key={i} style={{ fontSize: 21, fontWeight: 800, letterSpacing: "-.02em", color: "var(--ff-faint)", whiteSpace: "nowrap" }}>
              {l}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
