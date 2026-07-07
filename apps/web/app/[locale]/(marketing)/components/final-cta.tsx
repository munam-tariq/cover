import { getTranslations } from "next-intl/server";
import type { CSSProperties } from "react";

import { Btn } from "./marketing-button";
import { Ic, WRAP } from "./marketing-kit";

export async function FinalCta() {
  const t = await getTranslations("marketing.finalCta");
  return (
    <section
      style={{
        position: "relative",
        overflow: "hidden",
        background: "linear-gradient(180deg,#11151b,#0c0f14)",
        color: "#fff",
        padding: "clamp(72px,12vh,140px) 0",
      }}
    >
      <div
        className="lattice"
        style={
          {
            position: "absolute",
            inset: 0,
            "--lt": "rgba(255,255,255,.05)",
            "--lt-size": "64px",
            maskImage: "radial-gradient(80% 80% at 50% 50%, #000 28%, transparent 76%)",
            WebkitMaskImage: "radial-gradient(80% 80% at 50% 50%, #000 28%, transparent 76%)",
          } as CSSProperties
        }
      />
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%,-50%)",
          width: 640,
          height: 640,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(255,255,255,.12), transparent 64%)",
          pointerEvents: "none",
        }}
      />
      <div style={{ ...WRAP, position: "relative", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div className="reveal" style={{ position: "relative", width: 72, height: 72, marginBottom: 28 }}>
          <span style={{ position: "absolute", inset: 0, borderRadius: 20, border: "2px solid rgba(255,255,255,.65)", animation: "ff-ring 2.2s ease-out infinite" }} />
          <span style={{ position: "absolute", inset: 0, borderRadius: 20, border: "2px solid rgba(255,255,255,.65)", animation: "ff-ring 2.2s ease-out infinite 1.1s" }} />
          <div
            style={{
              position: "relative",
              width: 72,
              height: 72,
              borderRadius: 20,
              background: "#fff",
              color: "var(--ff-ink)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 20px 50px -16px rgba(0,0,0,.6)",
            }}
          >
            {Ic("bot", { size: 36 })}
          </div>
        </div>
        <h2
          className="reveal d1"
          style={{ fontSize: "clamp(34px,5.6vw,68px)", fontWeight: 800, letterSpacing: "-.03em", lineHeight: 1.04, textWrap: "balance", maxWidth: 760 }}
        >
          {t("title")} <span style={{ color: "#fff" }}>{t("titleAccent")}</span>
        </h2>
        <p className="reveal d2" style={{ fontSize: 18, lineHeight: 1.55, color: "rgba(255,255,255,.66)", marginTop: 20, maxWidth: 520, textWrap: "pretty" }}>
          {t("subtitle")}
        </p>
        <div className="reveal d3" style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 34, flexWrap: "wrap", justifyContent: "center" }}>
          <Btn kind="lightPrimary" size="lg" href="/login">
            {t("ctaPrimary")} {Ic("arrowR", { size: 18 })}
          </Btn>
          <Btn kind="secondary" size="lg" light href="#demo">
            {Ic("play", { size: 16 })} {t("ctaSecondary")}
          </Btn>
        </div>
        <div
          className="reveal d4"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 18,
            marginTop: 26,
            fontSize: 12.5,
            fontWeight: 600,
            letterSpacing: ".04em",
            color: "rgba(255,255,255,.45)",
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          {(t.raw("badges") as string[]).map((badge, i) => (
            <span key={badge} style={{ display: "inline-flex", alignItems: "center", gap: 18 }}>
              {i > 0 && <span style={{ width: 3, height: 3, borderRadius: 99, background: "rgba(255,255,255,.3)" }} />}
              {badge}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
