import type { CSSProperties } from "react";

import { Ic } from "../components/marketing-kit";

/* cover-scene.tsx — composed blog cover visuals built from the product's own
   UI vocabulary (no stock images). Port of redesign/blog-app.jsx CoverScene. */

export type CoverKind = "rag" | "lead" | "handoff" | "code" | "page" | "channels" | "saas" | "market" | "chart";

/** Deterministically map a post to a cover scene from its slug/category. */
export function coverKindFor(post: { slug: string; category?: string }): CoverKind {
  const s = post.slug.toLowerCase();
  if (/rag|grounded|hallucinat/.test(s)) return "rag";
  if (/lead|generation/.test(s)) return "lead";
  if (/handoff|escalat/.test(s)) return "handoff";
  if (/website|embed|widget|add-ai-chatbot|vibe|coding|build/.test(s)) return "code";
  if (/mcp|integration|channel|protocol/.test(s)) return "channels";
  if (/marketplace|market/.test(s)) return "market";
  if (/analytic|chart|insight|metric/.test(s)) return "chart";
  if (/support|saas|startup|ticket/.test(s)) return "saas";
  switch (post.category) {
    case "Tutorial":
      return "code";
    case "Strategy":
      return "saas";
    case "Technology":
      return "rag";
    case "Trends":
      return "chart";
    default:
      return "rag";
  }
}

const bcRow = (hot: boolean): CSSProperties => ({
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "7px 10px",
  borderRadius: 9,
  background: hot ? "rgba(255,255,255,.16)" : "rgba(255,255,255,.05)",
  border: "1px solid " + (hot ? "rgba(255,255,255,.3)" : "rgba(255,255,255,.1)"),
});
const bcMono: CSSProperties = { fontSize: 11.5, color: "#fff" };
const bcMatch: CSSProperties = {
  marginLeft: "auto",
  fontSize: 9,
  fontWeight: 800,
  letterSpacing: ".05em",
  color: "#11151b",
  background: "#fff",
  padding: "2px 7px",
  borderRadius: 99,
};

function CoverScene({ kind, big }: { kind: CoverKind; big?: boolean }) {
  const W = (k: Parameters<typeof Ic>[0]) => Ic(k, { size: 13, style: { color: "#fff" }, sw: 2 });
  switch (kind) {
    case "rag":
      return (
        <div style={{ width: "100%", maxWidth: big ? 380 : 300, display: "flex", flexDirection: "column", gap: 9 }}>
          <div
            style={{ display: "flex", alignItems: "center", gap: 9, color: "rgba(255,255,255,.55)", fontSize: 11.5, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase" }}
          >
            {Ic("database", { size: 15, style: { color: "#fff" } })} Knowledge base
          </div>
          {([["/security", true], ["/pricing", true], ["/faq", false]] as [string, boolean][]).map(([p, hot], i) => (
            <div key={p} style={{ ...bcRow(hot), position: "relative", overflow: "hidden", animation: "ff-up-sm .5s both", animationDelay: i * 0.08 + "s" }}>
              {hot && (
                <span
                  style={{ position: "absolute", top: 0, bottom: 0, width: "40%", background: "linear-gradient(90deg,transparent,rgba(255,255,255,.28),transparent)", animation: `ff-sweep 1.8s ${i * 0.2}s ease-in-out infinite` }}
                />
              )}
              <span style={{ position: "relative", color: hot ? "#fff" : "rgba(255,255,255,.4)" }}>{Ic(hot ? "check" : "file", { size: 13, sw: hot ? 2.4 : 1.7 })}</span>
              <span className="mono" style={{ ...bcMono, position: "relative", color: hot ? "#fff" : "rgba(255,255,255,.6)" }}>{p}</span>
              {hot && <span style={bcMatch}>MATCH</span>}
            </div>
          ))}
        </div>
      );
    case "lead":
      return (
        <div style={{ width: "100%", maxWidth: 280, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 11, fontWeight: 800, letterSpacing: ".05em", color: "rgba(255,255,255,.75)" }}>
            {W("user")} LEAD CAPTURE
          </div>
          <div style={{ ...bcRow(false), color: "rgba(255,255,255,.85)", fontSize: 12.5 }}>
            {Ic("mail", { size: 14, style: { color: "rgba(255,255,255,.7)" } })} <span className="mono">you@company.com</span>
            <span style={{ marginLeft: "auto", width: 1.5, height: 13, background: "#fff", animation: "ff-blink 1s steps(1) infinite" }} />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <span style={{ flex: 1, textAlign: "center", padding: "8px 0", borderRadius: 9, background: "#fff", color: "#11151b", fontSize: 12, fontWeight: 700 }}>Share &amp; continue</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,.7)" }}>{W("check")} Captured · routed to your team</div>
        </div>
      );
    case "handoff":
      return (
        <div style={{ width: "100%", maxWidth: 290, display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14 }}>
            <span style={{ width: 46, height: 46, borderRadius: 13, background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.14)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>{Ic("bot", { size: 22 })}</span>
            <span style={{ display: "flex", color: "rgba(255,255,255,.6)", animation: "ff-bob 1.8s ease-in-out infinite" }}>{Ic("arrowR", { size: 22, style: { color: "#fff" } })}</span>
            <span style={{ width: 46, height: 46, borderRadius: 99, background: "linear-gradient(150deg,#fff,#d8dbe1)", color: "#11151b", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 14 }}>DR</span>
          </div>
          <div style={{ ...bcRow(false), justifyContent: "center", color: "rgba(255,255,255,.82)", fontSize: 12, fontWeight: 600 }}>{W("handoff")} Routed with full context</div>
        </div>
      );
    case "code":
      return (
        <div style={{ width: "100%", maxWidth: 320, borderRadius: 12, overflow: "hidden", border: "1px solid rgba(255,255,255,.12)", background: "#0b0e13" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", borderBottom: "1px solid rgba(255,255,255,.08)" }}>
            {["#3a4150", "#2f3543", "#262b37"].map((c) => (
              <span key={c} style={{ width: 8, height: 8, borderRadius: 99, background: c }} />
            ))}
            <span className="mono" style={{ marginLeft: 5, fontSize: 10.5, color: "rgba(255,255,255,.4)" }}>index.html</span>
          </div>
          <pre className="mono" style={{ margin: 0, padding: "12px 13px", fontSize: 11.5, lineHeight: 1.65, color: "rgba(255,255,255,.85)" }}>
            <span style={{ color: "#7aa2f7" }}>&lt;script</span>
            {"\n  "}
            <span style={{ color: "#9ece6a" }}>src</span>=<span style={{ color: "#e0af68" }}>&quot;frontface.app/widget.js&quot;</span>
            {"\n  "}
            <span style={{ color: "#9ece6a" }}>data-agent-id</span>=<span style={{ color: "#e0af68" }}>&quot;you&quot;</span>
            {"\n"}
            <span style={{ color: "#7aa2f7" }}>&gt;&lt;/script&gt;</span>
            <span style={{ display: "inline-block", width: 7, height: 14, background: "#fff", marginLeft: 3, verticalAlign: "-2px", animation: "ff-blink 1s steps(1) infinite" }} />
          </pre>
        </div>
      );
    case "page":
      return (
        <div style={{ width: "100%", maxWidth: 230, borderRadius: 14, overflow: "hidden", background: "#fff", color: "#1c2530", boxShadow: "0 18px 40px -18px rgba(0,0,0,.6)" }}>
          <div style={{ padding: "13px 14px 11px", textAlign: "center", borderBottom: "1px solid #eef0f3" }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: "#11151b", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 7px" }}>{Ic("bot", { size: 18 })}</div>
            <div className="mono" style={{ fontSize: 10, color: "#8b95a1" }}>frontface.app/acme</div>
          </div>
          <div style={{ padding: 11, display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ alignSelf: "flex-start", maxWidth: "85%", padding: "7px 10px", borderRadius: "4px 10px 10px 10px", background: "#f4f5f7", fontSize: 11, lineHeight: 1.4 }}>Hi! Ask me anything — I&apos;m here 24/7.</div>
            <div style={{ alignSelf: "flex-end", padding: "7px 10px", borderRadius: "10px 10px 4px 10px", background: "#11151b", color: "#fff", fontSize: 11 }}>What are your hours?</div>
          </div>
        </div>
      );
    case "channels":
      return (
        <div style={{ width: "100%", maxWidth: 280, display: "flex", flexDirection: "column", gap: 9 }}>
          {([["channels", "Website chat"], ["whatsapp", "WhatsApp"], ["slack", "Slack"]] as [Parameters<typeof Ic>[0], string][]).map(([ic, name], i) => (
            <div key={name} style={{ ...bcRow(false), animation: "ff-up-sm .5s both", animationDelay: i * 0.08 + "s" }}>
              <span style={{ width: 24, height: 24, borderRadius: 7, background: "rgba(255,255,255,.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>{Ic(ic, { size: 14 })}</span>
              <span style={{ fontSize: 12.5, fontWeight: 600, color: "#fff" }}>{name}</span>
              <span style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 5, fontSize: 10.5, fontWeight: 600, color: "rgba(255,255,255,.7)" }}>
                <span style={{ width: 6, height: 6, borderRadius: 99, background: "#fff" }} /> Connected
              </span>
            </div>
          ))}
        </div>
      );
    case "saas":
      return (
        <div style={{ width: "100%", maxWidth: 280, display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span style={{ fontSize: 52, fontWeight: 800, letterSpacing: "-.03em", color: "#fff", lineHeight: 1 }}>
              68<span style={{ fontSize: 26 }}>%</span>
            </span>
          </div>
          <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,.7)", letterSpacing: ".02em" }}>tickets deflected automatically</div>
          <div style={{ width: "100%", height: 8, borderRadius: 99, background: "rgba(255,255,255,.1)", overflow: "hidden" }}>
            <div style={{ width: "68%", height: "100%", borderRadius: 99, background: "#fff" }} />
          </div>
        </div>
      );
    case "market":
      return (
        <div style={{ width: "100%", maxWidth: 300, display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ alignSelf: "flex-start", maxWidth: "82%", padding: "8px 11px", borderRadius: "4px 12px 12px 12px", background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.1)", color: "#fff", fontSize: 11.5, lineHeight: 1.45 }}>
            Is this car inspected before delivery?
          </div>
          <div style={{ alignSelf: "flex-end", maxWidth: "82%", padding: "8px 11px", borderRadius: "12px 12px 4px 12px", background: "#fff", color: "#11151b", fontSize: 11.5, lineHeight: 1.45, fontWeight: 500 }}>
            Yes — every car passes a 200-point check.
          </div>
          <div style={{ alignSelf: "flex-start", display: "inline-flex", alignItems: "center", gap: 5, fontSize: 10, color: "rgba(255,255,255,.6)" }}>
            <span className="mono" style={{ background: "rgba(255,255,255,.1)", padding: "2px 7px", borderRadius: 99 }}>/inspection</span>
          </div>
        </div>
      );
    case "chart":
      return (
        <div style={{ width: "100%", maxWidth: 280, display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 10, height: big ? 150 : 100 }}>
          {[42, 70, 55, 88, 64, 96].map((h, i) => (
            <div
              key={i}
              style={{ width: 22, height: h + "%", borderRadius: "6px 6px 0 0", background: i === 5 ? "#fff" : "rgba(255,255,255,.22)", animation: "ff-bar .8s cubic-bezier(.2,.7,.2,1) both", animationDelay: i * 0.08 + "s", transformOrigin: "bottom" }}
            />
          ))}
        </div>
      );
    default:
      return null;
  }
}

export function Cover({ kind, big = false, height }: { kind: CoverKind; big?: boolean; height?: number }) {
  return (
    <div
      style={{
        position: "relative",
        overflow: "hidden",
        background: "linear-gradient(150deg,#11151b,#1b2230 65%,#10141b)",
        height: height ?? (big ? "100%" : 184),
        minHeight: big ? 300 : height ?? 184,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: big ? "32px" : "24px",
      }}
    >
      <div
        className="lattice"
        style={
          {
            position: "absolute",
            inset: 0,
            "--lt": "rgba(255,255,255,.06)",
            "--lt-size": "40px",
            maskImage: "radial-gradient(120% 100% at 70% 20%, #000 30%, transparent 82%)",
            WebkitMaskImage: "radial-gradient(120% 100% at 70% 20%, #000 30%, transparent 82%)",
          } as CSSProperties
        }
      />
      <div style={{ position: "absolute", top: "-20%", right: "-15%", width: 280, height: 280, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,255,255,.1), transparent 66%)" }} />
      <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", width: "100%" }}>
        <CoverScene kind={kind} big={big} />
      </div>
    </div>
  );
}
