"use client";

/* marketing-button.tsx — the interactive Btn primitive (hover state).
   Kept separate from marketing-kit so the icon/logo/text primitives there
   stay server-safe and callable from server components. */

import { useState, type CSSProperties, type ReactNode } from "react";

type BtnKind = "primary" | "accent" | "secondary" | "ghost" | "lightPrimary";
type BtnSize = "lg" | "md" | "sm";

export function Btn({
  kind = "primary",
  children,
  onClick,
  href,
  style,
  size = "md",
  light = false,
  ariaLabel,
}: {
  kind?: BtnKind;
  children: ReactNode;
  onClick?: () => void;
  href?: string;
  style?: CSSProperties;
  size?: BtnSize;
  light?: boolean;
  ariaLabel?: string;
}) {
  const [h, setH] = useState(false);
  const dims =
    size === "lg"
      ? { height: 54, padding: "0 28px", fontSize: 16, radius: 14 }
      : size === "sm"
        ? { height: 38, padding: "0 16px", fontSize: 13.5, radius: 10 }
        : { height: 48, padding: "0 22px", fontSize: 15, radius: 12 };
  const base: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    height: dims.height,
    padding: dims.padding,
    borderRadius: dims.radius,
    fontSize: dims.fontSize,
    fontWeight: 600,
    border: "1px solid transparent",
    whiteSpace: "nowrap",
    transition: "background .16s, transform .14s, border-color .16s, box-shadow .16s, color .16s",
    transform: h ? "translateY(-1px)" : "none",
  };
  const skins: Record<BtnKind, CSSProperties> = {
    primary: {
      background: h ? "var(--ff-ink-2)" : "var(--ff-ink)",
      color: "#fff",
      boxShadow: h ? "0 14px 30px -12px rgba(17,21,27,.5)" : "0 6px 16px -8px rgba(17,21,27,.45)",
    },
    accent: {
      background: h ? "var(--ff-accent-2)" : "var(--ff-accent)",
      color: "#fff",
      boxShadow: h
        ? "0 14px 32px -12px rgba(var(--ff-accent-rgb),.55)"
        : "0 6px 18px -8px rgba(var(--ff-accent-rgb),.5)",
    },
    secondary: {
      background: light ? "rgba(255,255,255,.07)" : "#fff",
      color: light ? "#fff" : "var(--ff-soft)",
      borderColor: light ? "rgba(255,255,255,.18)" : "var(--ff-line-2)",
      boxShadow: h ? "0 2px 10px -4px rgba(16,24,40,.18)" : "none",
    },
    ghost: { background: "transparent", color: light ? "rgba(255,255,255,.8)" : "var(--ff-soft)", borderColor: "transparent" },
    lightPrimary: {
      background: "#fff",
      color: "var(--ff-ink)",
      boxShadow: h ? "0 14px 30px -12px rgba(0,0,0,.5)" : "0 6px 16px -8px rgba(0,0,0,.4)",
    },
  };
  const common = {
    onMouseEnter: () => setH(true),
    onMouseLeave: () => setH(false),
    style: { ...base, ...skins[kind], ...style },
    "aria-label": ariaLabel,
  } as const;
  if (href) {
    return (
      <a href={href} onClick={onClick} {...common}>
        {children}
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} {...common}>
      {children}
    </button>
  );
}
