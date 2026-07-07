"use client";

import { Bot, DollarSign, TrendingDown, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

const fieldStyle = {
  width: "100%",
  height: 46,
  borderRadius: 10,
  border: "1px solid var(--ff-line-2)",
  background: "#fff",
  color: "var(--ff-ink)",
  padding: "0 12px",
  fontSize: 15,
  outline: "none",
} as const;

const labelStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  fontSize: 13,
  fontWeight: 700,
  color: "var(--ff-ink)",
  marginBottom: 8,
} as const;

function clamp(v: number, min: number, max: number) {
  if (!Number.isFinite(v)) return min;
  return Math.min(max, Math.max(min, v));
}

function money(v: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);
}

const WORKING_HOURS_PER_MONTH = 8 * 22;

export function AiVsHumanCalculator() {
  const t = useTranslations("marketing.calculators.aiVsHuman.ui");
  const [monthlyTickets, setMonthlyTickets] = useState(1000);
  const [handleMinutes, setHandleMinutes] = useState(7);
  const [annualSalary, setAnnualSalary] = useState(55000);
  const [aiMonthlyCost, setAiMonthlyCost] = useState(49);

  const result = useMemo(() => {
    const agentsNeeded = Math.max(1, Math.ceil((monthlyTickets * handleMinutes / 60) / (WORKING_HOURS_PER_MONTH * 0.8)));
    const humanMonthlyCost = agentsNeeded * annualSalary / 12;
    const savings = humanMonthlyCost - aiMonthlyCost;
    const humanCostPerTicket = annualSalary / 12 / (WORKING_HOURS_PER_MONTH * 0.8 * 60 / handleMinutes);
    const breakevenTickets = humanCostPerTicket > 0 ? Math.round(aiMonthlyCost / humanCostPerTicket) : 0;
    return { agentsNeeded, humanMonthlyCost, savings, breakevenTickets };
  }, [monthlyTickets, handleMinutes, annualSalary, aiMonthlyCost]);

  const sliders = [
    { label: t("fieldVolume"), value: monthlyTickets, min: 50, max: 10000, step: 50, fmt: (v: number) => t("ticketCount", { count: v.toLocaleString() }), set: setMonthlyTickets },
    { label: t("fieldHandle"), value: handleMinutes, min: 2, max: 45, step: 1, fmt: (v: number) => t("minShort", { count: v }), set: setHandleMinutes },
    { label: t("fieldSalary"), value: annualSalary, min: 30000, max: 120000, step: 5000, fmt: (v: number) => money(v), set: setAnnualSalary },
    { label: t("fieldAiCost"), value: aiMonthlyCost, min: 0, max: 500, step: 1, fmt: (v: number) => t("perMonthShort", { amount: money(v) }), set: setAiMonthlyCost },
  ];

  const aiWins = result.savings > 0;

  return (
    <section
      aria-label={t("aria")}
      style={{ display: "grid", gap: 22 }}
    >
      <div
        style={{
          border: "1px solid var(--ff-line)",
          borderRadius: 18,
          background: "#fff",
          padding: "clamp(22px,3vw,30px)",
          boxShadow: "0 18px 48px -34px rgba(16,24,40,.32)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
          <span
            style={{
              width: 40, height: 40, borderRadius: 12,
              background: "var(--ff-ink)", color: "#fff",
              display: "inline-flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <Bot size={19} />
          </span>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "var(--ff-ink)" }}>
              {t("panelTitle")}
            </div>
            <div style={{ fontSize: 13, color: "var(--ff-muted)" }}>
              {t("panelSub")}
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }} className="ff-tool-form-grid">
          {sliders.map((f) => (
            <label key={f.label} style={{ display: "block" }}>
              <span style={labelStyle}>
                <span>{f.label}</span>
                <span style={{ color: "var(--ff-muted)", fontWeight: 650 }}>{f.fmt(f.value)}</span>
              </span>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 92px", gap: 10, alignItems: "center" }}>
                <input
                  type="range"
                  min={f.min}
                  max={f.max}
                  step={f.step}
                  value={f.value}
                  onChange={(e) => f.set(Number(e.currentTarget.value))}
                  aria-label={f.label}
                />
                <input
                  type="number"
                  min={f.min}
                  max={f.max}
                  step={f.step}
                  value={f.value}
                  onChange={(e) => f.set(clamp(Number(e.currentTarget.value), f.min, f.max))}
                  style={fieldStyle}
                  aria-label={`${f.label} value`}
                />
              </div>
            </label>
          ))}
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 16,
        }}
        className="ff-tool-compare-grid"
      >
        <div
          style={{
            border: "1px solid var(--ff-line)",
            borderRadius: 18,
            background: "#fff",
            padding: "clamp(20px,3vw,28px)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <Users size={18} color="var(--ff-muted)" />
            <span style={{ fontSize: 14, fontWeight: 700, color: "var(--ff-soft)" }}>{t("humanTeam")}</span>
          </div>
          <div
            style={{
              fontSize: "clamp(28px,4vw,40px)",
              fontWeight: 850,
              letterSpacing: "-.035em",
              color: "var(--ff-ink)",
              lineHeight: 1,
            }}
          >
            {money(result.humanMonthlyCost)}
          </div>
          <div style={{ fontSize: 13, color: "var(--ff-muted)", marginTop: 6 }}>{t("perMonth")}</div>
          <div
            style={{
              marginTop: 16,
              padding: "10px 14px",
              background: "var(--ff-soft-bg, #f9fafb)",
              borderRadius: 10,
              fontSize: 13,
              color: "var(--ff-soft)",
              lineHeight: 1.5,
            }}
          >
            {t("humanBreakdown", { count: result.agentsNeeded, salary: money(annualSalary) })}
          </div>
        </div>

        <div
          style={{
            border: `2px solid ${aiWins ? "var(--ff-accent)" : "var(--ff-line)"}`,
            borderRadius: 18,
            background: aiWins ? "var(--ff-accent-soft, #f0f9ff)" : "#fff",
            padding: "clamp(20px,3vw,28px)",
            position: "relative",
          }}
        >
          {aiWins && (
            <div
              style={{
                position: "absolute",
                top: -12,
                left: "50%",
                transform: "translateX(-50%)",
                background: "var(--ff-accent)",
                color: "#fff",
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: ".06em",
                textTransform: "uppercase",
                padding: "3px 10px",
                borderRadius: 99,
                whiteSpace: "nowrap",
              }}
            >
              {t("lowerCost")}
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <Bot size={18} color="var(--ff-muted)" />
            <span style={{ fontSize: 14, fontWeight: 700, color: "var(--ff-soft)" }}>{t("aiAgent")}</span>
          </div>
          <div
            style={{
              fontSize: "clamp(28px,4vw,40px)",
              fontWeight: 850,
              letterSpacing: "-.035em",
              color: "var(--ff-ink)",
              lineHeight: 1,
            }}
          >
            {money(aiMonthlyCost)}
          </div>
          <div style={{ fontSize: 13, color: "var(--ff-muted)", marginTop: 6 }}>{t("perMonth")}</div>
          <div
            style={{
              marginTop: 16,
              padding: "10px 14px",
              background: "rgba(255,255,255,.7)",
              borderRadius: 10,
              fontSize: 13,
              color: "var(--ff-soft)",
              lineHeight: 1.5,
            }}
          >
            {t("aiBreakdown")}
          </div>
        </div>
      </div>

      <div
        style={{
          position: "relative",
          overflow: "hidden",
          borderRadius: 18,
          background: "linear-gradient(135deg,#11151b,#1d2633 62%,#0d1117)",
          color: "#fff",
          padding: "clamp(22px,3vw,30px)",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 20,
          alignItems: "center",
        }}
        className="ff-tool-savings-grid"
      >
        <div
          className="lattice"
          style={{
            position: "absolute",
            inset: 0,
            ["--lt" as string]: "rgba(255,255,255,.055)",
            ["--lt-size" as string]: "48px",
            maskImage: "radial-gradient(100% 80% at 0% 0%, #000 26%, transparent 78%)",
            WebkitMaskImage: "radial-gradient(100% 80% at 0% 0%, #000 26%, transparent 78%)",
          }}
        />
        <div style={{ position: "relative" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <TrendingDown size={17} color="rgba(255,255,255,.68)" />
            <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".1em", textTransform: "uppercase", color: "rgba(255,255,255,.58)" }}>
              {t("monthlySavings")}
            </span>
          </div>
          <div
            style={{
              fontSize: "clamp(32px,5vw,52px)",
              fontWeight: 850,
              letterSpacing: "-.04em",
              lineHeight: 1,
              color: aiWins ? "#4ade80" : "#f87171",
            }}
          >
            {aiWins ? "+" : ""}{money(result.savings)}
          </div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,.55)", marginTop: 6 }}>
            {aiWins ? t("savedWithAi") : t("aiCostsMore")}
          </div>
        </div>
        <div style={{ position: "relative" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <DollarSign size={17} color="rgba(255,255,255,.68)" />
            <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".1em", textTransform: "uppercase", color: "rgba(255,255,255,.58)" }}>
              {t("breakevenVolume")}
            </span>
          </div>
          <div
            style={{
              fontSize: "clamp(32px,5vw,52px)",
              fontWeight: 850,
              letterSpacing: "-.04em",
              lineHeight: 1,
            }}
          >
            {result.breakevenTickets.toLocaleString()}
          </div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,.55)", marginTop: 6 }}>
            {t("breakevenUnit")}
          </div>
        </div>
      </div>
    </section>
  );
}
