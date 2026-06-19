/* marketing-button.tsx - server-safe marketing button primitive. */

import type { CSSProperties, ReactNode } from "react";

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
  };
  const skins: Record<BtnKind, CSSProperties> = {
    primary: {
      background: "var(--ff-ink)",
      color: "#fff",
      boxShadow: "0 6px 16px -8px rgba(17,21,27,.45)",
    },
    accent: {
      background: "var(--ff-accent)",
      color: "#fff",
      boxShadow: "0 6px 18px -8px rgba(var(--ff-accent-rgb),.5)",
    },
    secondary: {
      background: light ? "rgba(255,255,255,.07)" : "#fff",
      color: light ? "#fff" : "var(--ff-soft)",
      borderColor: light ? "rgba(255,255,255,.18)" : "var(--ff-line-2)",
      boxShadow: "none",
    },
    ghost: { background: "transparent", color: light ? "rgba(255,255,255,.8)" : "var(--ff-soft)", borderColor: "transparent" },
    lightPrimary: {
      background: "#fff",
      color: "var(--ff-ink)",
      boxShadow: "0 6px 16px -8px rgba(0,0,0,.4)",
    },
  };
  const common = {
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
