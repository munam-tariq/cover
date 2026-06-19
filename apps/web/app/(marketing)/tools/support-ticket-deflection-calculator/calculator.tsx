"use client";

import {
  Calculator,
  CheckCircle,
  Clock,
  DollarSign,
  TrendingUp,
} from "lucide-react";
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

function clampNumber(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function money(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function whole(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(value);
}

function formatAssumption(value: number, suffix: string) {
  if (suffix === "%") return `${value}%`;
  if (suffix === "/hr") return `${value}/hr`;
  return `${value} ${suffix}`;
}

export function SupportDeflectionCalculator() {
  const [monthlyTickets, setMonthlyTickets] = useState(600);
  const [repetitivePercent, setRepetitivePercent] = useState(68);
  const [deflectionPercent, setDeflectionPercent] = useState(60);
  const [minutesPerTicket, setMinutesPerTicket] = useState(7);
  const [hourlyCost, setHourlyCost] = useState(28);

  const result = useMemo(() => {
    const repetitiveTickets =
      monthlyTickets * (repetitivePercent / 100);
    const deflectedTickets =
      repetitiveTickets * (deflectionPercent / 100);
    const hoursSaved = (deflectedTickets * minutesPerTicket) / 60;
    const monthlySavings = hoursSaved * hourlyCost;
    const annualSavings = monthlySavings * 12;

    return {
      repetitiveTickets,
      deflectedTickets,
      hoursSaved,
      monthlySavings,
      annualSavings,
    };
  }, [
    monthlyTickets,
    repetitivePercent,
    deflectionPercent,
    minutesPerTicket,
    hourlyCost,
  ]);

  const fields = [
    {
      label: "Monthly support tickets",
      value: monthlyTickets,
      min: 25,
      max: 10000,
      step: 25,
      suffix: "tickets",
      onChange: setMonthlyTickets,
    },
    {
      label: "Repetitive / documentable tickets",
      value: repetitivePercent,
      min: 10,
      max: 95,
      step: 1,
      suffix: "%",
      onChange: setRepetitivePercent,
    },
    {
      label: "Expected AI deflection rate",
      value: deflectionPercent,
      min: 10,
      max: 90,
      step: 1,
      suffix: "%",
      onChange: setDeflectionPercent,
    },
    {
      label: "Minutes spent per routine ticket",
      value: minutesPerTicket,
      min: 1,
      max: 45,
      step: 1,
      suffix: "min",
      onChange: setMinutesPerTicket,
    },
    {
      label: "Loaded support cost per hour",
      value: hourlyCost,
      min: 10,
      max: 150,
      step: 1,
      suffix: "/hr",
      onChange: setHourlyCost,
    },
  ];

  return (
    <section
      aria-label="Support ticket deflection calculator"
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(0, 0.92fr) minmax(320px, 1.08fr)",
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
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 24,
          }}
        >
          <span
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: "var(--ff-ink)",
              color: "#fff",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Calculator size={19} />
          </span>
          <div>
            <div
              style={{
                fontSize: 16,
                fontWeight: 800,
                color: "var(--ff-ink)",
              }}
            >
              Estimate your support drag
            </div>
            <div style={{ fontSize: 13, color: "var(--ff-muted)" }}>
              Adjust the assumptions to match your team.
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gap: 18 }}>
          {fields.map((field) => (
            <label key={field.label}>
              <span style={labelStyle}>
                <span>{field.label}</span>
                <span style={{ color: "var(--ff-muted)", fontWeight: 650 }}>
                  {formatAssumption(field.value, field.suffix)}
                </span>
              </span>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 92px",
                  gap: 10,
                  alignItems: "center",
                }}
              >
                <input
                  type="range"
                  min={field.min}
                  max={field.max}
                  step={field.step}
                  value={field.value}
                  onChange={(event) =>
                    field.onChange(Number(event.currentTarget.value))
                  }
                  aria-label={field.label}
                />
                <input
                  type="number"
                  min={field.min}
                  max={field.max}
                  step={field.step}
                  value={field.value}
                  onChange={(event) =>
                    field.onChange(
                      clampNumber(
                        Number(event.currentTarget.value),
                        field.min,
                        field.max,
                      ),
                    )
                  }
                  style={fieldStyle}
                  aria-label={`${field.label} value`}
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
          background:
            "linear-gradient(155deg,#11151b,#1d2633 62%,#0d1117)",
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
            maskImage:
              "radial-gradient(100% 80% at 70% 0%, #000 26%, transparent 78%)",
            WebkitMaskImage:
              "radial-gradient(100% 80% at 70% 0%, #000 26%, transparent 78%)",
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
            Estimated monthly impact
          </div>
          <div
            style={{
              fontSize: "clamp(44px,7vw,72px)",
              fontWeight: 850,
              letterSpacing: "-.04em",
              lineHeight: 0.95,
              marginTop: 18,
            }}
          >
            {whole(result.deflectedTickets)}
          </div>
          <div
            style={{
              fontSize: 16,
              color: "rgba(255,255,255,.68)",
              marginTop: 8,
            }}
          >
            tickets deflected per month
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
              {
                icon: Clock,
                label: "Hours returned",
                value: whole(result.hoursSaved),
              },
              {
                icon: DollarSign,
                label: "Monthly savings",
                value: money(result.monthlySavings),
              },
              {
                icon: TrendingUp,
                label: "Annualized savings",
                value: money(result.annualSavings),
              },
              {
                icon: CheckCircle,
                label: "Routine queue",
                value: whole(result.repetitiveTickets),
              },
            ].map((metric) => {
              const Icon = metric.icon;
              return (
                <div
                  key={metric.label}
                  style={{
                    border: "1px solid rgba(255,255,255,.11)",
                    borderRadius: 14,
                    background: "rgba(255,255,255,.055)",
                    padding: "16px 15px",
                  }}
                >
                  <Icon size={17} color="rgba(255,255,255,.68)" />
                  <div
                    style={{
                      fontSize: 22,
                      fontWeight: 800,
                      letterSpacing: "-.025em",
                      marginTop: 12,
                    }}
                  >
                    {metric.value}
                  </div>
                  <div
                    style={{
                      fontSize: 12.5,
                      color: "rgba(255,255,255,.55)",
                      marginTop: 3,
                    }}
                  >
                    {metric.label}
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
            Formula: monthly tickets x repetitive share x expected AI deflection
            rate x minutes per ticket. Treat this as a planning estimate, then
            validate it against real conversation analytics after launch.
          </p>
        </div>
      </div>
    </section>
  );
}
