import type { CSSProperties } from "react";

import { CAPS } from "../landing-data";

import { Eyebrow, Ic, WRAP } from "./marketing-kit";

export function CapabilitiesSection() {
  const [feat, ...rest] = CAPS;
  return (
    <section id="capabilities" style={{ ...WRAP, padding: "clamp(60px,9vh,110px) clamp(20px,5vw,40px)", scrollMarginTop: 80 }}>
      <div
        className="reveal"
        style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 24, marginBottom: 48 }}
      >
        <div style={{ maxWidth: 640 }}>
          <Eyebrow>Capabilities</Eyebrow>
          <h2
            style={{
              fontSize: "clamp(30px,4.4vw,50px)",
              fontWeight: 800,
              letterSpacing: "-.03em",
              color: "var(--ff-ink)",
              lineHeight: 1.06,
              textWrap: "balance",
            }}
          >
            One agent. Everything support needs.
          </h2>
        </div>
        <p style={{ fontSize: 16, lineHeight: 1.55, color: "var(--ff-soft)", maxWidth: 360, textWrap: "pretty" }}>
          It starts with accurate answers from your knowledge — then captures, routes, and reaches customers wherever
          they are.
        </p>
      </div>

      <div className="ff-cap-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 18 }}>
        {/* featured KB card */}
        <article
          className="reveal ff-cap-feature"
          style={{
            gridColumn: "span 1",
            gridRow: "span 2",
            position: "relative",
            overflow: "hidden",
            background: "linear-gradient(165deg,#11151b,#1b2230 70%,#10141b)",
            color: "#fff",
            border: "1px solid var(--ff-ink)",
            borderRadius: 20,
            padding: "28px 26px",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            className="lattice"
            style={
              {
                position: "absolute",
                inset: 0,
                "--lt": "rgba(255,255,255,.05)",
                "--lt-size": "46px",
                maskImage: "radial-gradient(120% 70% at 70% 0%, #000 30%, transparent 80%)",
                WebkitMaskImage: "radial-gradient(120% 70% at 70% 0%, #000 30%, transparent 80%)",
              } as CSSProperties
            }
          />
          <div style={{ position: "relative", display: "flex", flexDirection: "column", height: "100%" }}>
            <span
              style={{
                width: 50,
                height: 50,
                borderRadius: 14,
                background: "var(--ff-accent)",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 12px 28px -10px rgba(var(--ff-accent-rgb),.6)",
              }}
            >
              {Ic(feat[0], { size: 25 })}
            </span>
            <span style={{ marginTop: 18, fontSize: 11, fontWeight: 800, letterSpacing: ".1em", color: "rgba(255,255,255,.45)" }}>
              THE CORE
            </span>
            <h3 style={{ fontSize: 23, fontWeight: 800, letterSpacing: "-.02em", marginTop: 8, lineHeight: 1.15 }}>{feat[1]}</h3>
            <p style={{ fontSize: 14.5, lineHeight: 1.6, color: "rgba(255,255,255,.66)", marginTop: 12, textWrap: "pretty" }}>{feat[2]}</p>
            {/* mini RAG visual */}
            <div style={{ marginTop: "auto", paddingTop: 22, display: "flex", flexDirection: "column", gap: 7 }}>
              {([["/docs", true], ["/pricing", true], ["/faq", false]] as [string, boolean][]).map(([p, hot]) => (
                <div
                  key={p}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 9,
                    padding: "8px 11px",
                    borderRadius: 9,
                    background: hot ? "rgba(var(--ff-accent-rgb),.16)" : "rgba(255,255,255,.04)",
                    border: "1px solid " + (hot ? "rgba(var(--ff-accent-rgb),.45)" : "rgba(255,255,255,.08)"),
                  }}
                >
                  {Ic(hot ? "check" : "file", { size: 13, style: { color: hot ? "#fff" : "rgba(255,255,255,.4)" }, sw: hot ? 2.4 : 1.7 })}
                  <span className="mono" style={{ fontSize: 11.5, color: hot ? "#fff" : "rgba(255,255,255,.55)", fontWeight: hot ? 600 : 400 }}>
                    {p}
                  </span>
                  {hot && (
                    <span style={{ marginLeft: "auto", fontSize: 9, fontWeight: 800, color: "#fff", background: "var(--ff-accent)", padding: "2px 6px", borderRadius: 99 }}>
                      CITED
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </article>

        {rest.map(([ic, title, desc], i) => (
          <article
            key={title}
            className={"reveal ff-cap-card d" + ((i % 3) + 1)}
            style={{ background: "var(--ff-card)", border: "1px solid var(--ff-line)", borderRadius: 18, padding: "24px 22px" }}
          >
            <span
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                background: "var(--ff-accent-soft)",
                color: "var(--ff-accent-2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 16,
              }}
            >
              {Ic(ic, { size: 21 })}
            </span>
            <h3 style={{ fontSize: 16.5, fontWeight: 700, color: "var(--ff-ink)", letterSpacing: "-.01em", marginBottom: 7 }}>{title}</h3>
            <p style={{ fontSize: 13.5, lineHeight: 1.55, color: "var(--ff-soft)", textWrap: "pretty" }}>{desc}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
