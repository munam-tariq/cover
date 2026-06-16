import type { CSSProperties } from "react";

import { Eyebrow, Ic, WRAP } from "./marketing-kit";

const CHANNELS: [Parameters<typeof Ic>[0], string, string, boolean][] = [
  ["channels", "Website chat", "Connected", true],
  ["whatsapp", "WhatsApp", "Connected", true],
  ["slack", "Slack", "Connected", true],
  ["mail", "Email", "Connect", false],
];

export function DeployAnywhere() {
  return (
    <section
      style={{
        position: "relative",
        overflow: "hidden",
        background: "linear-gradient(180deg,#11151b,#0d1117)",
        color: "#fff",
        padding: "clamp(64px,10vh,120px) 0",
      }}
    >
      <div
        className="lattice"
        style={
          {
            position: "absolute",
            inset: 0,
            "--lt": "rgba(255,255,255,.045)",
            "--lt-size": "70px",
            maskImage: "radial-gradient(120% 80% at 50% 0%, #000 30%, transparent 78%)",
            WebkitMaskImage: "radial-gradient(120% 80% at 50% 0%, #000 30%, transparent 78%)",
          } as CSSProperties
        }
      />
      <div
        style={{
          position: "absolute",
          top: "-10%",
          right: "-8%",
          width: 500,
          height: 500,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(var(--ff-accent-rgb),.16), transparent 66%)",
          pointerEvents: "none",
        }}
      />

      <div style={{ ...WRAP, position: "relative" }}>
        <div className="reveal" style={{ maxWidth: 660, marginBottom: 52 }}>
          <Eyebrow light>Deploy anywhere</Eyebrow>
          <h2 style={{ fontSize: "clamp(30px,4.4vw,50px)", fontWeight: 800, letterSpacing: "-.03em", lineHeight: 1.06, textWrap: "balance" }}>
            Live in one line — or with no website at all.
          </h2>
          <p style={{ fontSize: 17, lineHeight: 1.55, color: "rgba(255,255,255,.62)", marginTop: 16, textWrap: "pretty" }}>
            Embed it, host it, or connect it to the channels your customers already use. Same agent, same knowledge,
            everywhere.
          </p>
        </div>

        <div className="ff-deploy-grid" style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr 1fr", gap: 18 }}>
          {/* widget embed */}
          <div
            className="reveal"
            style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 18, padding: "24px", display: "flex", flexDirection: "column" }}
          >
            <span style={iconBox}>{Ic("code", { size: 21 })}</span>
            <h3 style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-.01em" }}>Website widget</h3>
            <p style={{ fontSize: 13.5, lineHeight: 1.55, color: "rgba(255,255,255,.6)", marginTop: 8, marginBottom: 18, textWrap: "pretty" }}>
              One script tag. Works with React, Next.js, Shopify, WordPress or plain HTML. Shadow-DOM isolation, zero
              conflicts.
            </p>
            <div style={{ marginTop: "auto", borderRadius: 12, overflow: "hidden", border: "1px solid rgba(255,255,255,.1)", background: "#0b0e13" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 13px", borderBottom: "1px solid rgba(255,255,255,.08)" }}>
                {["#3a4150", "#2f3543", "#262b37"].map((c) => (
                  <span key={c} style={{ width: 9, height: 9, borderRadius: 99, background: c }} />
                ))}
                <span className="mono" style={{ marginLeft: 6, fontSize: 11, color: "rgba(255,255,255,.4)" }}>index.html</span>
              </div>
              <pre className="mono" style={{ margin: 0, padding: "14px 15px", fontSize: 12, lineHeight: 1.7, color: "rgba(255,255,255,.85)", overflowX: "auto" }}>
                <span style={{ color: "#6b7686" }}>&lt;!-- Add to your site --&gt;</span>
                {"\n"}
                <span style={{ color: "#7aa2f7" }}>&lt;script</span>
                {"\n  "}
                <span style={{ color: "#9ece6a" }}>src</span>=<span style={{ color: "#e0af68" }}>&quot;https://cdn.frontface.app/widget.js&quot;</span>
                {"\n  "}
                <span style={{ color: "#9ece6a" }}>data-agent-id</span>=<span style={{ color: "#e0af68" }}>&quot;your-agent-id&quot;</span>
                {"\n"}
                <span style={{ color: "#7aa2f7" }}>&gt;&lt;/script&gt;</span>
              </pre>
            </div>
          </div>

          {/* public page */}
          <div
            className="reveal d1"
            style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 18, padding: "24px", display: "flex", flexDirection: "column" }}
          >
            <span style={iconBox}>{Ic("monitor", { size: 21 })}</span>
            <h3 style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-.01em" }}>Public agent page</h3>
            <p style={{ fontSize: 13.5, lineHeight: 1.55, color: "rgba(255,255,255,.6)", marginTop: 8, marginBottom: 18, textWrap: "pretty" }}>
              No website? Get a hosted page — a shareable link that works as your online front desk.
            </p>
            <div style={{ marginTop: "auto", borderRadius: 12, overflow: "hidden", border: "1px solid rgba(255,255,255,.1)", background: "#fff", color: "var(--ff-text)" }}>
              <div style={{ padding: "14px 14px 12px", textAlign: "center", borderBottom: "1px solid var(--ff-line)" }}>
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 11,
                    background: "var(--ff-ink)",
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 9px",
                  }}
                >
                  {Ic("bot", { size: 20 })}
                </div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--ff-ink)" }}>Acme Assistant</div>
                <div className="mono" style={{ fontSize: 10.5, color: "var(--ff-muted)", marginTop: 3 }}>frontface.app/acme</div>
              </div>
              <div style={{ padding: "12px", display: "flex", flexDirection: "column", gap: 7 }}>
                <div style={{ alignSelf: "flex-start", maxWidth: "85%", padding: "8px 11px", borderRadius: "4px 11px 11px 11px", background: "#f4f5f7", fontSize: 11.5, color: "var(--ff-text)", lineHeight: 1.45 }}>
                  Hi! Ask me anything — I&apos;m here 24/7.
                </div>
                <div style={{ alignSelf: "flex-end", padding: "8px 11px", borderRadius: "11px 11px 4px 11px", background: "var(--ff-ink)", color: "#fff", fontSize: 11.5 }}>
                  What are your hours?
                </div>
              </div>
            </div>
          </div>

          {/* multichannel */}
          <div
            className="reveal d2"
            style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 18, padding: "24px", display: "flex", flexDirection: "column" }}
          >
            <span style={iconBox}>{Ic("channels", { size: 21 })}</span>
            <h3 style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-.01em" }}>Multi-channel</h3>
            <p style={{ fontSize: 13.5, lineHeight: 1.55, color: "rgba(255,255,255,.6)", marginTop: 8, marginBottom: 18, textWrap: "pretty" }}>
              Meet customers on the web, WhatsApp, Slack and Messenger — one brain across every channel.
            </p>
            <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 9 }}>
              {CHANNELS.map(([ic, name, status, connected]) => (
                <div
                  key={name}
                  style={{ display: "flex", alignItems: "center", gap: 11, padding: "10px 12px", borderRadius: 11, background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)" }}
                >
                  <span
                    style={{ width: 26, height: 26, borderRadius: 7, background: "rgba(255,255,255,.08)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
                  >
                    {Ic(ic, { size: 15 })}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>{name}</span>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                      fontSize: 11,
                      fontWeight: 600,
                      color: connected ? "rgba(255,255,255,.7)" : "#fff",
                    }}
                  >
                    {connected && <span style={{ width: 6, height: 6, borderRadius: 99, background: "rgba(255,255,255,.7)" }} />}
                    {status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const iconBox: CSSProperties = {
  width: 42,
  height: 42,
  borderRadius: 12,
  background: "rgba(255,255,255,.08)",
  border: "1px solid rgba(255,255,255,.12)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  marginBottom: 16,
};
