"use client";

import { Calculator, Clock, TrendingUp, Users } from "lucide-react";
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

export function TeamSizingCalculator() {
  const [monthlyTickets, setMonthlyTickets] = useState(1000);
  const [handleMinutes, setHandleMinutes] = useState(8);
  const [hoursPerDay, setHoursPerDay] = useState(8);
  const [daysPerWeek, setDaysPerWeek] = useState(5);

  const result = useMemo(() => {
    const workingHoursPerMonth = hoursPerDay * daysPerWeek * 4.33;
    const totalHandleHours = (monthlyTickets * handleMinutes) / 60;
    const agentsAt80 = Math.ceil(totalHandleHours / (workingHoursPerMonth * 0.8));
    const agentsWithBuffer = Math.ceil(agentsAt80 * 1.2);
    const ticketsPerAgentPerDay = workingHoursPerMonth > 0
      ? Math.round((monthlyTickets / Math.max(1, agentsAt80)) / (daysPerWeek * 4.33))
      : 0;
    return { agentsAt80: Math.max(1, agentsAt80), agentsWithBuffer: Math.max(1, agentsWithBuffer), ticketsPerAgentPerDay };
  }, [monthlyTickets, handleMinutes, hoursPerDay, daysPerWeek]);

  const sliders = [
    { label: "Monthly ticket volume", value: monthlyTickets, min: 100, max: 20000, step: 100, fmt: (v: number) => `${v.toLocaleString()} tickets`, set: setMonthlyTickets },
    { label: "Avg handle time per ticket", value: handleMinutes, min: 2, max: 60, step: 1, fmt: (v: number) => `${v} min`, set: setHandleMinutes },
    { label: "Support hours covered per day", value: hoursPerDay, min: 4, max: 24, step: 1, fmt: (v: number) => `${v} hr`, set: setHoursPerDay },
    { label: "Days covered per week", value: daysPerWeek, min: 1, max: 7, step: 1, fmt: (v: number) => `${v} day${v !== 1 ? "s" : ""}`, set: setDaysPerWeek },
  ];

  return (
    <section
      aria-label="Support team sizing calculator"
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
            <Users size={19} />
          </span>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "var(--ff-ink)" }}>
              Team size estimate
            </div>
            <div style={{ fontSize: 13, color: "var(--ff-muted)" }}>
              Uses 80% utilization — the ICMI industry standard.
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
            Agents needed (80% utilization)
          </div>
          <div
            style={{
              fontSize: "clamp(64px,10vw,96px)",
              fontWeight: 850,
              letterSpacing: "-.04em",
              lineHeight: 0.95,
              marginTop: 18,
            }}
          >
            {result.agentsAt80}
          </div>
          <div style={{ fontSize: 16, color: "rgba(255,255,255,.68)", marginTop: 8 }}>
            agents at target utilization
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
              { icon: Users, label: "With 20% spike buffer", value: `${result.agentsWithBuffer} agents` },
              { icon: Clock, label: "Tickets / agent / day", value: `${result.ticketsPerAgentPerDay}` },
              { icon: TrendingUp, label: "Monthly capacity (80%)", value: `${monthlyTickets.toLocaleString()}` },
              { icon: Calculator, label: "Handle hrs / month", value: `${Math.round((monthlyTickets * handleMinutes) / 60)}h` },
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
            Formula: ⌈(monthly tickets × handle time / 60) ÷ (working hrs/month × 0.80)⌉. Spike buffer adds 20% headroom.
          </p>
        </div>
      </div>
    </section>
  );
}
