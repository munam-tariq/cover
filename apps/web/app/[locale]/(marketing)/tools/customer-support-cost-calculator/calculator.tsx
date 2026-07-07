"use client";

import { Calculator, DollarSign, TrendingUp, Users } from "lucide-react";
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

export function SupportCostCalculator() {
  const t = useTranslations("marketing.calculators.cost.ui");
  const [agents, setAgents] = useState(5);
  const [salary, setSalary] = useState(55000);
  const [benefitsMultiplier, setBenefitsMultiplier] = useState(1.3);
  const [toolsPerAgent, setToolsPerAgent] = useState(150);
  const [monthlyTickets, setMonthlyTickets] = useState(1000);

  const result = useMemo(() => {
    const fullyLoadedAnnual = agents * salary * benefitsMultiplier + agents * toolsPerAgent * 12;
    const costPerTicketMonthly = monthlyTickets > 0 ? (fullyLoadedAnnual / 12) / monthlyTickets : 0;
    const costPerAgent = fullyLoadedAnnual / Math.max(1, agents);
    return { fullyLoadedAnnual, costPerTicketMonthly, costPerAgent };
  }, [agents, salary, benefitsMultiplier, toolsPerAgent, monthlyTickets]);

  const sliders = [
    { label: t("fieldAgents"), value: agents, min: 1, max: 50, step: 1, fmt: (v: number) => t("agentCount", { count: v }), set: setAgents },
    { label: t("fieldSalary"), value: salary, min: 30000, max: 150000, step: 5000, fmt: (v: number) => money(v), set: setSalary },
    { label: t("fieldMultiplier"), value: benefitsMultiplier, min: 1.0, max: 1.6, step: 0.05, fmt: (v: number) => `×${v.toFixed(2)}`, set: setBenefitsMultiplier },
    { label: t("fieldTools"), value: toolsPerAgent, min: 0, max: 500, step: 10, fmt: (v: number) => t("perMonthShort", { amount: money(v) }), set: setToolsPerAgent },
    { label: t("fieldVolume"), value: monthlyTickets, min: 100, max: 10000, step: 100, fmt: (v: number) => t("ticketCount", { count: v.toLocaleString() }), set: setMonthlyTickets },
  ];

  return (
    <section
      aria-label={t("aria")}
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(0,.92fr) minmax(320px,1.08fr)",
        gap: 22,
        alignItems: "stretch",
      }}
      className="ff-tool-grid"
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
            <Calculator size={19} />
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

        <div style={{ display: "grid", gap: 18 }}>
          {sliders.map((f) => (
            <label key={f.label}>
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
          position: "relative",
          overflow: "hidden",
          borderRadius: 20,
          background: "linear-gradient(155deg,#11151b,#1d2633 62%,#0d1117)",
          color: "#fff",
          padding: "clamp(24px,4vw,36px)",
          boxShadow: "0 26px 70px -38px rgba(16,24,40,.55)",
        }}
      >
        <div
          className="lattice"
          style={{
            position: "absolute",
            inset: 0,
            ["--lt" as string]: "rgba(255,255,255,.055)",
            ["--lt-size" as string]: "48px",
            maskImage: "radial-gradient(100% 80% at 70% 0%, #000 26%, transparent 78%)",
            WebkitMaskImage: "radial-gradient(100% 80% at 70% 0%, #000 26%, transparent 78%)",
          }}
        />
        <div style={{ position: "relative" }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: ".12em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,.58)",
            }}
          >
            {t("resultKicker")}
          </div>
          <div
            style={{
              fontSize: "clamp(38px,6vw,64px)",
              fontWeight: 850,
              letterSpacing: "-.04em",
              lineHeight: 0.95,
              marginTop: 18,
            }}
          >
            {money(result.fullyLoadedAnnual)}
          </div>
          <div style={{ fontSize: 16, color: "rgba(255,255,255,.68)", marginTop: 8 }}>
            {t("resultUnit", { count: agents })}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2,minmax(0,1fr))",
              gap: 12,
              marginTop: 28,
            }}
            className="ff-tool-result-grid"
          >
            {[
              { icon: DollarSign, label: t("metricPerTicket"), value: money(result.costPerTicketMonthly) },
              { icon: Users, label: t("metricPerAgent"), value: money(result.costPerAgent) },
              { icon: TrendingUp, label: t("metricTools"), value: money(agents * toolsPerAgent * 12) },
              { icon: Calculator, label: t("metricMonthly"), value: money(result.fullyLoadedAnnual / 12) },
            ].map((m) => {
              const Icon = m.icon;
              return (
                <div
                  key={m.label}
                  style={{
                    border: "1px solid rgba(255,255,255,.11)",
                    borderRadius: 14,
                    background: "rgba(255,255,255,.055)",
                    padding: "16px 15px",
                  }}
                >
                  <Icon size={17} color="rgba(255,255,255,.68)" />
                  <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-.025em", marginTop: 12 }}>
                    {m.value}
                  </div>
                  <div style={{ fontSize: 12.5, color: "rgba(255,255,255,.55)", marginTop: 3 }}>
                    {m.label}
                  </div>
                </div>
              );
            })}
          </div>

          <p
            style={{
              fontSize: 13.5,
              lineHeight: 1.65,
              color: "rgba(255,255,255,.62)",
              marginTop: 22,
              marginBottom: 0,
            }}
          >
            {t("formulaNote")}
          </p>
        </div>
      </div>
    </section>
  );
}
