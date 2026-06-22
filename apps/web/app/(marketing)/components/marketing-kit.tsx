/* marketing-kit.tsx — shared, server-safe primitives for the FrontFace
   marketing pages: icon set, Logo, Eyebrow, Pill, and the WRAP container.
   Faithful port of redesign/landing-icons.jsx, typed and using the
   --ff-* design tokens (see globals.css → .marketing-light).
   NOTE: the interactive Btn lives in ./marketing-button ("use client") so
   these primitives stay callable from server components. */

import { type CSSProperties, type ReactNode } from "react";

import { WindowMark } from "@/components/window-mark";

/* ---------------- icons ---------------- */
export const LD_ICONS = {
  bot: "M8 8h8a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2ZM12 4v4M9 13h.01M15 13h.01M4 12v3M20 12v3",
  globe:
    "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM3 12h18M12 3c2.4 2.5 3.6 6 3.6 9s-1.2 6.5-3.6 9c-2.4-2.5-3.6-6-3.6-9s1.2-6.5 3.6-9Z",
  file: "M7 3h7l4 4v14H7zM14 3v4h4",
  text: "M6 7h12M6 12h12M6 17h7",
  spark: "M12 4.5l1.7 4.3 4.3 1.7-4.3 1.7L12 16.5l-1.7-4.3L6 10.5l4.3-1.7zM18.5 4v2.6M19.8 5.3h-2.6",
  arrowR: "M5 12h14M13 6l6 6-6 6",
  arrowL: "M19 12H5M11 6l-6 6 6 6",
  arrowDown: "M12 5v14M6 13l6 6 6-6",
  check: "M5 13l4 4 10-11",
  users: "M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7 0a3 3 0 1 0 0-6M3 20c0-3 3-5 6-5s6 2 6 5m1-5c2 0 5 1.4 5 5",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 21c0-4 3.6-6 8-6s8 2 8 6",
  shield: "M12 3l7 3v5c0 4.6-3 7.7-7 9-4-1.3-7-4.4-7-9V6z",
  bolt: "M13 3L5 13h5l-1 8 8-10h-5z",
  grid: "M4 4h6.5v6.5H4zM13.5 4H20v6.5h-6.5zM4 13.5h6.5V20H4zM13.5 13.5H20V20h-6.5z",
  play: "M8 5.5v13l11-6.5z",
  scan: "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14ZM20 20l-3.6-3.6",
  search: "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14ZM20 20l-3.6-3.6",
  link: "M9 15l6-6M8 12l-2 2a3 3 0 0 0 4 4l2-2M16 12l2-2a3 3 0 0 0-4-4l-2 2",
  plus: "M12 5v14M5 12h14",
  x: "M6 6l12 12M18 6L6 18",
  chevron: "M6 9l6 6 6-6",
  book: "M4 5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v15l-6-3-6 3V5z M8 3v14",
  database:
    "M12 3c4.4 0 8 1.3 8 3s-3.6 3-8 3-8-1.3-8-3 3.6-3 8-3ZM4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3",
  send: "M5 12l15-7-7 15-2-6-6-2Z",
  mail: "M3 6h18v12H3zM3 7l9 6 9-6",
  doc: "M7 3h7l4 4v14H7zM14 3v4h4M9.5 12h5M9.5 15h5",
  sliders: "M4 8h10M18 8h2M4 16h2M10 16h10M14 6v4M8 14v4",
  handoff: "M7 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM2 19c0-2.6 2.2-4.5 5-4.5M14 13l3 3 5-5M16 7h6M19 4l3 3-3 3",
  chart: "M5 21V10M12 21V4M19 21v-7M3 21h18",
  code: "M9 8l-5 4 5 4M15 8l5 4-5 4",
  broadcast: "M5 12a7 7 0 0 1 14 0M8 12a4 4 0 0 1 8 0M12 12v8M9 20h6",
  channels:
    "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM3.5 9h17M3.5 15h17M12 3c2.5 2.6 3.7 6 3.7 9S14.5 18.4 12 21M12 3c-2.5 2.6-3.7 6-3.7 9S9.5 18.4 12 21",
  monitor: "M3 5h18v11H3zM8 21h8M12 16v5",
  layers: "M12 3l9 5-9 5-9-5 9-5ZM3 13l9 5 9-5M3 17l9 5 9-5",
  target:
    "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM12 11.5a.5.5 0 1 0 0 1 .5.5 0 0 0 0-1Z",
  clock: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM12 7v5l3.5 2",
  thumbUp: "M7 10.5V20H4v-9.5zM7 10.5l3.6-6.6c1.2 0 2 .8 2 2v3.1h4.7a2 2 0 0 1 2 2.3l-1 5.4a2 2 0 0 1-2 1.7H7",
  zap: "M13 3L5 13h5l-1 8 8-10h-5z",
  whatsapp:
    "M12 3a9 9 0 0 0-7.7 13.6L3 21l4.6-1.2A9 9 0 1 0 12 3ZM8.5 8c.2 0 .5 0 .7.5l.8 1.8c0 .3 0 .5-.2.7l-.5.6c-.2.2-.2.4 0 .7.5.8 1.4 1.6 2.3 2 .3.2.5.2.7 0l.6-.7c.2-.2.4-.3.7-.2l1.8.8c.3.2.4.4.4.6 0 1-.8 2-1.7 2-2.6 0-6.7-3.4-6.7-6.4 0-1 .8-2 1.8-2.7Z",
  slack:
    "M9 13a2 2 0 1 1-4 0 2 2 0 0 1 2-2h2v2ZM11 13a2 2 0 0 1 4 0v5a2 2 0 0 1-4 0v-5ZM11 7a2 2 0 1 1 0-4 2 2 0 0 1 2 2v2h-2ZM11 9a2 2 0 0 1 0 4H6a2 2 0 0 1 0-4h5ZM17 11a2 2 0 1 1 0 4h-2v-2a2 2 0 0 1 2-2ZM15 11a2 2 0 0 1-4 0V6a2 2 0 0 1 4 0v5ZM15 17a2 2 0 1 1 0 4 2 2 0 0 1-2-2v-2h2ZM13 15a2 2 0 0 1 0-4h5a2 2 0 0 1 0 4h-5Z",
} as const;

export type IconName = keyof typeof LD_ICONS;

export function Icon({
  d,
  size = 18,
  sw = 1.7,
  fill = "none",
  style,
}: {
  d: string;
  size?: number;
  sw?: number;
  fill?: string;
  style?: CSSProperties;
}) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill={fill} style={style} aria-hidden="true">
      <path
        d={d}
        fill={fill === "none" ? "none" : "currentColor"}
        stroke="currentColor"
        strokeWidth={sw}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type IcProps = { size?: number; sw?: number; fill?: string; style?: CSSProperties };
export const Ic = (key: IconName, p: IcProps = {}) => <Icon d={LD_ICONS[key]} {...p} />;

/* ---------------- logo ---------------- */
export function Logo({ size = 28, light = false }: { size?: number; light?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
      <div
        style={{
          width: size,
          height: size,
          borderRadius: size * 0.3,
          background: light ? "#fff" : "var(--ff-ink)",
          color: light ? "var(--ff-ink)" : "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <WindowMark size={size} />
      </div>
      <span
        style={{
          fontWeight: 800,
          fontSize: size * 0.62,
          letterSpacing: "-.02em",
          color: light ? "#fff" : "var(--ff-ink)",
        }}
      >
        FrontFace
      </span>
    </div>
  );
}

/* ---------------- small bits ---------------- */
export function Eyebrow({
  children,
  light = false,
  center = false,
}: {
  children: ReactNode;
  light?: boolean;
  center?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 9,
        justifyContent: center ? "center" : "flex-start",
        marginBottom: 18,
      }}
    >
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: 99,
          background: "var(--ff-accent)",
          boxShadow: "0 0 0 4px rgba(var(--ff-accent-rgb),.16)",
        }}
      />
      <span
        style={{
          fontSize: 12.5,
          fontWeight: 700,
          letterSpacing: ".14em",
          color: light ? "rgba(255,255,255,.6)" : "var(--ff-accent)",
          textTransform: "uppercase",
        }}
      >
        {children}
      </span>
    </div>
  );
}

export function Pill({
  children,
  light = false,
  style,
}: {
  children: ReactNode;
  light?: boolean;
  style?: CSSProperties;
}) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        padding: "6px 13px",
        borderRadius: 99,
        fontSize: 12.5,
        fontWeight: 600,
        border: `1px solid ${light ? "rgba(255,255,255,.16)" : "var(--ff-line-2)"}`,
        background: light ? "rgba(255,255,255,.06)" : "#fff",
        color: light ? "rgba(255,255,255,.85)" : "var(--ff-soft)",
        ...style,
      }}
    >
      {children}
    </span>
  );
}

/* shared container width */
export const WRAP: CSSProperties = {
  width: "100%",
  maxWidth: 1180,
  margin: "0 auto",
  padding: "0 clamp(20px,5vw,40px)",
};
