import { getLocale, getTranslations } from "next-intl/server";

import type { Locale } from "@/i18n/routing";

import { getLandingData } from "../landing-data";

import { Eyebrow, Ic, WRAP } from "./marketing-kit";

export async function HowItWorks() {
  const t = await getTranslations("marketing.howItWorks");
  const { steps } = getLandingData((await getLocale()) as Locale);
  return (
    <section id="how" style={{ ...WRAP, padding: "clamp(60px,9vh,110px) clamp(20px,5vw,40px)", scrollMarginTop: 80 }}>
      <div className="reveal" style={{ maxWidth: 660, marginBottom: 56 }}>
        <Eyebrow>{t("eyebrow")}</Eyebrow>
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
        <p style={{ fontSize: 17, lineHeight: 1.55, color: "var(--ff-soft)", marginTop: 16, textWrap: "pretty" }}>
          {t("subtitle")}
        </p>
      </div>

      <div className="ff-how-grid" style={{ position: "relative", display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 20 }}>
        {/* connecting line */}
        <div
          className="ff-how-line"
          style={{
            position: "absolute",
            top: 27,
            left: "12%",
            right: "12%",
            height: 2,
            background: "repeating-linear-gradient(90deg,var(--ff-line-2) 0 7px,transparent 7px 14px)",
          }}
        />
        {steps.map(([ic, title, desc], i) => (
          <div
            key={title}
            className={"reveal d" + (i + 1)}
            style={{
              position: "relative",
              background: "var(--ff-card)",
              border: "1px solid var(--ff-line)",
              borderRadius: 18,
              padding: "24px 22px",
              boxShadow: "0 2px 10px -6px rgba(16,24,40,.08)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
              <span
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 13,
                  background: "var(--ff-ink)",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {Ic(ic, { size: 22 })}
              </span>
              <span className="mono" style={{ fontSize: 13, fontWeight: 600, color: "var(--ff-faint)" }}>
                0{i + 1}
              </span>
            </div>
            <div style={{ fontSize: 16.5, fontWeight: 700, color: "var(--ff-ink)", letterSpacing: "-.01em", marginBottom: 8 }}>
              {title}
            </div>
            <div style={{ fontSize: 13.5, lineHeight: 1.55, color: "var(--ff-soft)", textWrap: "pretty" }}>{desc}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
