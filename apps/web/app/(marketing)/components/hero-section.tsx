import { HeroDemoSlot } from "./hero-demo-slot";
import { Btn } from "./marketing-button";
import { Ic, Pill } from "./marketing-kit";

/* Hero — headline "Resolve customer questions instantly."
   (outcome-led; "knows your product" lives on as proof via the pill + grounded demo). */
export function HeroSection() {
  return (
    <section
      id="top"
      style={{
        position: "relative",
        overflow: "hidden",
        paddingTop: "clamp(48px,7vh,84px)",
        paddingBottom: "clamp(40px,6vh,72px)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 1180,
          margin: "0 auto",
          padding: "0 clamp(20px,5vw,40px)",
          position: "relative",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
        }}
      >
        <div style={{ marginBottom: 26 }}>
          <Pill style={{ padding: "7px 7px 7px 14px", gap: 10 }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
              <span style={{ width: 6, height: 6, borderRadius: 99, background: "var(--ff-ok)" }} /> AI customer support agent
            </span>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                fontSize: 11.5,
                fontWeight: 700,
                color: "var(--ff-accent-2)",
                background: "var(--ff-accent-soft)",
                borderRadius: 99,
                padding: "4px 10px",
              }}
            >
              Knows your knowledge base
            </span>
          </Pill>
        </div>

        <h1
          style={{
            fontSize: "clamp(40px,7.2vw,84px)",
            lineHeight: 1.02,
            fontWeight: 800,
            letterSpacing: "-.03em",
            color: "var(--ff-ink)",
            textWrap: "balance",
            maxWidth: 1000,
          }}
        >
          <span style={{ display: "block" }}>Resolve customer questions</span>
          <span style={{ display: "block", color: "var(--ff-accent)" }}>instantly.</span>
        </h1>

        <p
          style={{
            fontSize: "clamp(16px,1.7vw,19px)",
            lineHeight: 1.55,
            color: "var(--ff-soft)",
            maxWidth: 600,
            marginTop: 24,
            textWrap: "pretty",
          }}
        >
          Answers from your docs, captures qualified leads, and hands off complex chats to your team.
        </p>

        <div
          style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 32, flexWrap: "wrap", justifyContent: "center" }}
        >
          <Btn kind="primary" size="lg" href="/login">
            Build your agent {Ic("arrowR", { size: 18 })}
          </Btn>
          <Btn kind="secondary" size="lg" href="#demo">
            {Ic("play", { size: 16 })} See it answer
          </Btn>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 18,
            marginTop: 24,
            fontSize: 12.5,
            fontWeight: 600,
            letterSpacing: ".04em",
            color: "var(--ff-muted)",
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          {["FREE DURING BETA", "5-MIN SETUP", "NO CREDIT CARD"].map((t, i) => (
            <span key={t} style={{ display: "inline-flex", alignItems: "center", gap: 18 }}>
              {i > 0 && <span style={{ width: 3, height: 3, borderRadius: 99, background: "var(--ff-faint)" }} />}
              {t}
            </span>
          ))}
        </div>

        {/* hero demo */}
        <div id="demo" className="reveal in d5" style={{ width: "100%", marginTop: "clamp(44px,6vh,72px)", scrollMarginTop: 90 }}>
          <HeroDemoSlot />
        </div>
      </div>
    </section>
  );
}
