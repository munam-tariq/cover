import { TESTI } from "../landing-data";

import { Eyebrow, WRAP } from "./marketing-kit";

export function SocialProof() {
  return (
    <section style={{ ...WRAP, padding: "clamp(40px,7vh,90px) clamp(20px,5vw,40px)" }}>
      <div className="reveal" style={{ textAlign: "center", maxWidth: 560, margin: "0 auto 48px" }}>
        <Eyebrow center>Why teams switch</Eyebrow>
        <h2
          style={{
            fontSize: "clamp(28px,4vw,44px)",
            fontWeight: 800,
            letterSpacing: "-.03em",
            color: "var(--ff-ink)",
            lineHeight: 1.08,
            textWrap: "balance",
          }}
        >
          Fewer tickets. Faster answers. Warmer leads.
        </h2>
      </div>
      <div className="ff-testi-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 18 }}>
        {TESTI.map((t, i) => (
          <figure
            key={t.co}
            className={"reveal d" + (i + 1)}
            style={{
              background: "var(--ff-card)",
              border: "1px solid var(--ff-line)",
              borderRadius: 20,
              padding: "26px 24px",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 2px 12px -8px rgba(16,24,40,.1)",
              margin: 0,
            }}
          >
            <div style={{ fontWeight: 800, fontSize: 16, letterSpacing: "-.01em", color: "var(--ff-ink)", marginBottom: 14 }}>{t.co}</div>
            <blockquote
              style={{ fontSize: 16, lineHeight: 1.55, color: "var(--ff-text)", fontWeight: 450, letterSpacing: "-.01em", textWrap: "pretty", flex: 1, margin: 0 }}
            >
              &ldquo;{t.quote}&rdquo;
            </blockquote>
            <figcaption style={{ marginTop: 22, display: "flex", alignItems: "center", gap: 11 }}>
              <span
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 99,
                  background: "linear-gradient(150deg,var(--ff-ink),var(--ff-ink-3))",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700,
                  fontSize: 13.5,
                  flexShrink: 0,
                }}
              >
                {t.who
                  .split(" ")
                  .map((w) => w[0])
                  .slice(0, 2)
                  .join("")}
              </span>
              <span>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--ff-ink)" }}>{t.who}</div>
                <div style={{ fontSize: 12.5, color: "var(--ff-muted)" }}>
                  {t.role}, {t.co}
                </div>
              </span>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
