"use client";

/**
 * Onboarding UI primitives — split-screen shell, proof panel, progress rail,
 * buttons and shared field bits. Ported from the reference design.
 */
import { useLocale, useTranslations } from "next-intl";
import React, { useState } from "react";

import { WindowMark } from "@/components/window-mark";

import { Ic, RAIL_STEPS, TESTIMONIALS, LOGOS, FEATURES } from "./onboarding-kit";

export function Logo({ size = 30 }: { size?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ width: size, height: size, borderRadius: size * 0.3, background: "var(--ink)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <WindowMark size={size} />
      </div>
      <span style={{ fontWeight: 800, fontSize: size * 0.57, letterSpacing: "-.02em", color: "var(--ink)" }}>FrontFace</span>
    </div>
  );
}

interface BtnProps {
  kind?: "primary" | "secondary";
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  style?: React.CSSProperties;
  full?: boolean;
}

export function Btn({ kind = "primary", children, onClick, disabled, style, full }: BtnProps) {
  const [h, setH] = useState(false);
  const base: React.CSSProperties = {
    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 9,
    height: 48, padding: full ? 0 : "0 22px", width: full ? "100%" : "auto",
    borderRadius: 12, fontSize: 15, fontWeight: 600, border: "1px solid transparent",
    transition: "background .16s, transform .12s, border-color .16s, box-shadow .16s",
    transform: h && !disabled ? "translateY(-1px)" : "none",
  };
  const skins: Record<string, React.CSSProperties> = {
    primary: { background: disabled ? "#c2c7cf" : h ? "var(--ink-2)" : "var(--ink)", color: "#fff", boxShadow: disabled ? "none" : "0 6px 16px -8px rgba(17,21,27,.5)" },
    secondary: { background: "#fff", color: "var(--soft)", borderColor: "var(--line-2)", boxShadow: h ? "0 2px 8px -4px rgba(16,24,40,.18)" : "none" },
  };
  return (
    <button
      onClick={disabled ? undefined : onClick}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{ ...base, ...skins[kind], cursor: disabled ? "default" : "pointer", ...style }}
    >
      {children}
    </button>
  );
}

function ProgressRail({ index }: { index: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
      <div style={{ display: "flex", gap: 5 }}>
        {RAIL_STEPS.map((_, i) => {
          const done = i < index, cur = i === index;
          return (
            <span key={i} style={{
              width: cur ? 26 : 18, height: 5, borderRadius: 3,
              background: done ? "var(--ink)" : cur ? "var(--accent)" : "var(--line-2)",
              transition: "all .3s cubic-bezier(.4,0,.2,1)",
            }} />
          );
        })}
      </div>
      <span className="mono" style={{ fontSize: 11.5, color: "var(--muted)", letterSpacing: ".02em" }}>{index + 1}/{RAIL_STEPS.length}</span>
    </div>
  );
}

function TestimonialView({ index }: { index: number }) {
  const t = useTranslations("onboarding");
  const item = TESTIMONIALS[Math.floor(index / 2) % TESTIMONIALS.length];
  return (
    <div key={"t" + index} style={{ animation: "ff-up .5s cubic-bezier(.2,.7,.2,1) both" }}>
      <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".14em", color: "rgba(255,255,255,.5)", marginBottom: 26 }}>{t("ui.trustedBy")}</div>
      <div style={{ background: "rgba(255,255,255,.045)", border: "1px solid rgba(255,255,255,.10)", borderRadius: 20, padding: "30px 30px 26px", maxWidth: 460, backdropFilter: "blur(6px)", boxShadow: "0 30px 60px -30px rgba(0,0,0,.6)" }}>
        <div style={{ fontWeight: 800, fontSize: 17, letterSpacing: ".01em", marginBottom: 16, color: "#fff", opacity: 0.92 }}>{item.co}</div>
        <p style={{ fontSize: 18.5, lineHeight: 1.55, fontWeight: 500, letterSpacing: "-.01em", color: "rgba(255,255,255,.95)" }}>&ldquo;{t(`testimonials.${item.id}.quote`)}&rdquo;</p>
        <div style={{ marginTop: 22, display: "flex", alignItems: "center", gap: 11 }}>
          <div style={{ width: 38, height: 38, borderRadius: 99, background: "linear-gradient(145deg,#39414e,#11151b)", border: "1px solid rgba(255,255,255,.14)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14, color: "#fff" }}>
            {item.who.split(" ").map((w) => w[0]).slice(0, 2).join("")}
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>{item.who}</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,.55)" }}>{t(`testimonials.${item.id}.role`)}, {item.co}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeaturesView() {
  const t = useTranslations("onboarding");
  return (
    <div key="features" style={{ animation: "ff-up .5s cubic-bezier(.2,.7,.2,1) both", maxWidth: 470 }}>
      <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".14em", color: "rgba(255,255,255,.5)", marginBottom: 26 }}>{t("ui.whatAgentDoes")}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {FEATURES.map(([id, ic]) => (
          <div key={id} style={{ display: "flex", gap: 15, alignItems: "flex-start", padding: "15px 16px", borderRadius: 16, background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.09)" }}>
            <div style={{ width: 38, height: 38, borderRadius: 11, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.12)", color: "#fff" }}>{Ic(ic, { size: 19 })}</div>
            <div>
              <div style={{ fontSize: 15.5, fontWeight: 700, color: "#fff", letterSpacing: "-.01em" }}>{t(`features.${id}.title`)}</div>
              <div style={{ fontSize: 13.5, lineHeight: 1.5, color: "rgba(255,255,255,.6)", marginTop: 3 }}>{t(`features.${id}.desc`)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProofPanel({ index }: { index: number }) {
  const showFeatures = index % 2 === 0;
  return (
    <div style={{ position: "relative", height: "100%", overflow: "hidden", background: "linear-gradient(160deg,#11151b 0%,#161c27 54%,#10141b 100%)", color: "#fff", display: "flex", flexDirection: "column" }}>
      <div className="lattice" style={{ position: "absolute", inset: 0, ["--lt" as string]: "rgba(255,255,255,.05)", ["--lt-size" as string]: "62px", maskImage: "radial-gradient(120% 90% at 70% 18%, #000 30%, transparent 78%)", WebkitMaskImage: "radial-gradient(120% 90% at 70% 18%, #000 30%, transparent 78%)" }} />
      <div style={{ position: "absolute", top: "-14%", insetInlineEnd: "-12%", width: 440, height: 440, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,255,255,.12), transparent 66%)", filter: "blur(6px)" }} />
      <div style={{ position: "relative", flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 clamp(40px,5vw,76px)" }}>
        {showFeatures ? <FeaturesView /> : <TestimonialView index={index} />}
      </div>
      <div style={{ position: "relative", padding: "22px clamp(40px,5vw,76px) 30px", borderTop: "1px solid rgba(255,255,255,.08)" }}>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${LOGOS.length},1fr)`, gap: "14px 24px", alignItems: "center" }}>
          {LOGOS.map((l) => (
            <div key={l} style={{ fontSize: 14.5, fontWeight: 800, letterSpacing: "-.01em", color: "rgba(255,255,255,.42)", textAlign: "center", whiteSpace: "nowrap" }}>{l}</div>
          ))}
        </div>
      </div>
    </div>
  );
}

export interface NavConfig {
  onBack?: () => void;
  onNext?: () => void;
  can?: boolean;
  label?: string;
  full?: boolean;
}

export function SplitShell({
  railIndex, stepKey, children, nav,
}: {
  railIndex: number;
  stepKey: string;
  children: React.ReactNode;
  nav?: NavConfig;
}) {
  const t = useTranslations("onboarding.nav");
  const isRtl = useLocale() === "ar";
  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,0.82fr)", height: "100%", background: "#fff" }}>
      <div style={{ position: "relative", display: "flex", flexDirection: "column", padding: "clamp(32px,4.4vh,46px) clamp(40px,6vw,92px)", minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "clamp(20px,4vh,40px)" }}>
          <Logo />
          <ProgressRail index={railIndex} />
        </div>
        <div className="scroll" style={{ flex: 1, display: "flex", flexDirection: "column", overflowY: "auto", minHeight: 0 }}>
          <div key={stepKey} style={{ animation: "ff-up .42s cubic-bezier(.2,.7,.2,1) both", maxWidth: 520, width: "100%", margin: "auto 0" }}>
            {children}
          </div>
        </div>
        {nav && (
          <div style={{ paddingTop: "clamp(16px,3vh,28px)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {nav.onBack && <Btn kind="secondary" onClick={nav.onBack}>{Ic(isRtl ? "arrowR" : "arrowL", { size: 17 })} {t("back")}</Btn>}
              <Btn kind="primary" onClick={nav.onNext} disabled={!nav.can} full={nav.full} style={nav.full ? {} : { flex: nav.onBack ? "none" : 1, minWidth: 170 }}>
                {nav.label || t("continue")} {Ic(isRtl ? "arrowL" : "arrowR", { size: 17 })}
              </Btn>
            </div>
          </div>
        )}
      </div>
      <div style={{ minWidth: 0 }}><ProofPanel index={railIndex} /></div>
    </div>
  );
}

export function Heading({ eyebrow, title, sub }: { eyebrow?: string; title: string; sub?: string }) {
  return (
    <div style={{ marginBottom: 26 }}>
      {eyebrow && <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".13em", color: "var(--accent)", marginBottom: 12 }}>{eyebrow}</div>}
      <h1 style={{ fontSize: "clamp(26px,3vw,33px)", fontWeight: 800, letterSpacing: "-.025em", color: "var(--ink)", lineHeight: 1.12 }}>{title}</h1>
      {sub && <p style={{ fontSize: 15.5, lineHeight: 1.55, color: "var(--soft)", marginTop: 13 }}>{sub}</p>}
    </div>
  );
}

export function SelectChip({ on, children, onClick }: { on: boolean; children: React.ReactNode; onClick: () => void }) {
  const [h, setH] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{
        display: "inline-flex", alignItems: "center", gap: 8, padding: "11px 17px", borderRadius: 11, fontSize: 14.5, fontWeight: 500,
        cursor: "pointer", transition: "all .15s",
        border: on ? "1.5px solid var(--ink)" : "1.5px solid var(--line-2)",
        background: on ? "var(--ink)" : h ? "#f7f8fa" : "#fff",
        color: on ? "#fff" : "var(--text)",
      }}
    >
      {on && Ic("check", { size: 15 })}
      {children}
    </button>
  );
}
