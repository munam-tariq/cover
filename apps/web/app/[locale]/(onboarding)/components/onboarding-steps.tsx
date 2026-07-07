"use client";

/**
 * Onboarding form steps: welcome, how-did-you-hear, company size, primary goal,
 * name + tone. Ported from the reference design.
 */
import { useTranslations } from "next-intl";
import React, { useState } from "react";

import { Ic, HEAR_OPTIONS, SIZE_OPTIONS, GOAL_OPTIONS, field } from "./onboarding-kit";
import { Heading, SelectChip } from "./onboarding-ui";

export function WelcomeStep() {
  const t = useTranslations("onboarding.steps.welcome");
  const checklist: [string, string][] = [
    ["users", t("checklist.team")],
    ["globe", t("checklist.train")],
    ["play", t("checklist.watch")],
  ];
  return (
    <div>
      <div style={{ width: 54, height: 54, borderRadius: 15, background: "var(--ink)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 22, boxShadow: "0 12px 28px -12px rgba(17,21,27,.6)" }}>
        {Ic("spark", { size: 27 })}
      </div>
      <Heading title={t("title")} sub={t("sub")} />
      <div style={{ border: "1px solid var(--line)", borderRadius: 16, padding: "18px 20px", background: "#fbfbfc" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--soft)", marginBottom: 14, letterSpacing: ".01em" }}>{t("intro")}</div>
        {checklist.map(([ic, txt], i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 13, padding: "9px 0" }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: "#fff", border: "1px solid var(--line-2)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ink)", flexShrink: 0 }}>{Ic(ic, { size: 17 })}</div>
            <span style={{ fontSize: 14.5, color: "var(--text)", fontWeight: 500 }}>{txt}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function HearStep({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const t = useTranslations("onboarding");
  return (
    <div>
      <Heading title={t("steps.hear.title")} sub={t("steps.hear.sub")} />
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        {HEAR_OPTIONS.map((id) => (
          <SelectChip key={id} on={value === id} onClick={() => onChange(id)}>{t(`options.hear.${id}`)}</SelectChip>
        ))}
      </div>
    </div>
  );
}

export function SizeStep({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const t = useTranslations("onboarding");
  return (
    <div>
      <Heading title={t("steps.size.title")} sub={t("steps.size.sub")} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 11 }}>
        {SIZE_OPTIONS.map(([id, range]) => {
          const on = value === id;
          return (
            <button key={id} onClick={() => onChange(id)} style={{
              textAlign: "start", padding: "16px 17px", borderRadius: 14, cursor: "pointer", transition: "all .15s",
              border: on ? "1.5px solid var(--ink)" : "1.5px solid var(--line-2)", background: on ? "#fafbfc" : "#fff",
              boxShadow: on ? "0 6px 18px -10px rgba(16,24,40,.22)" : "none",
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 15.5, fontWeight: 700, color: "var(--ink)" }}>{t(`options.size.${id}`)}</span>
                <span style={{ width: 20, height: 20, borderRadius: 99, border: on ? "6px solid var(--ink)" : "2px solid var(--line-2)", transition: "all .15s" }} />
              </div>
              <div className="mono" style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 6 }}>{range} {t("steps.size.peopleUnit")}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function GoalStep({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const t = useTranslations("onboarding");
  return (
    <div>
      <Heading title={t("steps.goal.title")} sub={t("steps.goal.sub")} />
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {GOAL_OPTIONS.map(([id, ic]) => {
          const on = value === id;
          return (
            <button key={id} onClick={() => onChange(id)} style={{
              display: "flex", alignItems: "center", gap: 14, textAlign: "start", padding: "15px 16px", borderRadius: 14, cursor: "pointer", transition: "all .15s",
              border: on ? "1.5px solid var(--ink)" : "1.5px solid var(--line-2)", background: on ? "#fafbfc" : "#fff",
              boxShadow: on ? "0 6px 18px -10px rgba(16,24,40,.22)" : "none",
            }}>
              <div style={{ width: 40, height: 40, borderRadius: 11, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: on ? "var(--ink)" : "#f1f3f5", color: on ? "#fff" : "var(--ink)", transition: "all .15s" }}>{Ic(ic, { size: 20 })}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)" }}>{t(`options.goal.${id}.title`)}</div>
                <div style={{ fontSize: 13, color: "var(--soft)", marginTop: 2 }}>{t(`options.goal.${id}.desc`)}</div>
              </div>
              <span style={{ width: 20, height: 20, flexShrink: 0, borderRadius: 99, border: on ? "6px solid var(--ink)" : "2px solid var(--line-2)", transition: "all .15s" }} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

const TONES = ["friendly", "professional", "playful"] as const;

export function NameStep({
  name, tone, onName, onTone, companyName,
}: {
  name: string;
  tone: string;
  onName: (v: string) => void;
  onTone: (v: string) => void;
  companyName: string;
}) {
  const t = useTranslations("onboarding");
  const [f, setF] = useState(false);
  const initials =
    (name || companyName || "A").trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase() || "A";
  const previewCo = companyName || "us";
  const tone_ = (TONES as readonly string[]).includes(tone) ? tone : "professional";
  return (
    <div>
      <Heading title={t("steps.name.title")} sub={t("steps.name.sub")} />
      <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "16px 18px", borderRadius: 16, border: "1px solid var(--line)", background: "#fbfbfc", marginBottom: 18 }}>
        <div style={{ width: 52, height: 52, borderRadius: 14, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 18, background: "linear-gradient(150deg,var(--ink),var(--ink-3))" }}>{initials}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: ".04em", color: "var(--muted)", marginBottom: 4 }}>{t("steps.name.preview")}</div>
          <div style={{ fontSize: 14, color: "var(--text)", lineHeight: 1.45 }}>{t(`tonePreview.${tone_}`, { company: previewCo })}</div>
        </div>
      </div>
      <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", display: "block", marginBottom: 8 }}>{t("steps.name.agentNameLabel")}</label>
      <input
        value={name}
        onChange={(e) => onName(e.target.value)}
        onFocus={() => setF(true)}
        onBlur={() => setF(false)}
        placeholder={t("steps.name.agentNamePlaceholder")}
        maxLength={40}
        style={{ ...field(f), marginBottom: 20 }}
      />
      <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", display: "block", marginBottom: 8 }}>{t("steps.name.toneLabel")}</label>
      <div style={{ display: "inline-flex", background: "#eef0f3", borderRadius: 11, padding: 4, gap: 4 }}>
        {TONES.map((id) => {
          const on = tone === id;
          return (
            <button key={id} onClick={() => onTone(id)} style={{ padding: "9px 18px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13.5, fontWeight: on ? 600 : 500, color: on ? "var(--ink)" : "var(--soft)", background: on ? "#fff" : "transparent", boxShadow: on ? "0 1px 3px rgba(16,24,40,.12)" : "none", transition: "all .15s" }}>{t(`options.tones.${id}`)}</button>
          );
        })}
      </div>
    </div>
  );
}
