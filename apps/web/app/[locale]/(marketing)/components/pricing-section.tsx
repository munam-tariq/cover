import { getTranslations } from "next-intl/server";

import { Btn } from "./marketing-button";
import { Eyebrow, Ic, WRAP } from "./marketing-kit";

export async function PricingSection() {
  const t = await getTranslations("marketing.pricing");
  const planFeatures = t.raw("features") as string[];
  return (
    <section id="pricing" style={{ ...WRAP, padding: "clamp(56px,9vh,110px) clamp(20px,5vw,40px)", scrollMarginTop: 80 }}>
      <div className="reveal" style={{ textAlign: "center", maxWidth: 560, margin: "0 auto 44px" }}>
        <Eyebrow center>{t("eyebrow")}</Eyebrow>
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
          {t("title")}
        </h2>
        <p style={{ fontSize: 17, lineHeight: 1.55, color: "var(--ff-soft)", marginTop: 14, textWrap: "pretty" }}>
          {t("subtitle")}
        </p>
      </div>

      <div className="reveal" style={{ maxWidth: 460, margin: "0 auto", position: "relative" }}>
        <div
          style={{
            position: "absolute",
            inset: "-6% -4%",
            background: "radial-gradient(60% 60% at 50% 0%, rgba(var(--ff-accent-rgb),.12), transparent 70%)",
            filter: "blur(8px)",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "relative",
            background: "var(--ff-card)",
            border: "1px solid var(--ff-line)",
            borderRadius: 24,
            overflow: "hidden",
            boxShadow: "0 40px 80px -44px rgba(16,24,40,.34)",
          }}
        >
          <div style={{ padding: "32px 32px 26px", textAlign: "center", borderBottom: "1px solid var(--ff-line)" }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: ".04em",
                color: "var(--ff-accent-2)",
                background: "var(--ff-accent-soft)",
                borderRadius: 99,
                padding: "5px 12px",
                marginBottom: 18,
              }}
            >
              <span style={{ width: 6, height: 6, borderRadius: 99, background: "var(--ff-accent)" }} /> {t("betaAccess")}
            </span>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 8 }}>
              <span style={{ fontSize: 60, fontWeight: 800, letterSpacing: "-.04em", color: "var(--ff-ink)", lineHeight: 1 }}>$0</span>
              <span style={{ fontSize: 16, color: "var(--ff-muted)", fontWeight: 500 }}>{t("perMonth")}</span>
            </div>
            <div style={{ marginTop: 10, fontSize: 14, color: "var(--ff-soft)" }}>
              <span style={{ textDecoration: "line-through", color: "var(--ff-muted)" }}>{t("wasPrice")}</span> &nbsp;
              <span style={{ color: "var(--ff-ok)", fontWeight: 700 }}>{t("freeBeta")}</span>
            </div>
          </div>
          <div style={{ padding: "26px 32px 30px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 18px", marginBottom: 26 }}>
              {planFeatures.map((f) => (
                <div key={f} style={{ display: "flex", alignItems: "flex-start", gap: 9, fontSize: 13.5, color: "var(--ff-text)" }}>
                  <span
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 99,
                      background: "var(--ff-accent-soft)",
                      color: "var(--ff-accent-2)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      marginTop: 1,
                    }}
                  >
                    {Ic("check", { size: 12, sw: 2.6 })}
                  </span>
                  {f}
                </div>
              ))}
            </div>
            <Btn kind="primary" size="lg" href="/login" style={{ width: "100%" }}>
              {t("cta")} {Ic("arrowR", { size: 18 })}
            </Btn>
            <div style={{ textAlign: "center", marginTop: 16, fontSize: 12.5, color: "var(--ff-muted)" }}>
              {t("grandfathered")}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
