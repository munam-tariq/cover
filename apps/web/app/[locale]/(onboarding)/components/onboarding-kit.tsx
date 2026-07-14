"use client";

/**
 * Onboarding design kit — ported from the reference design in /onboarding.
 * Styles are scoped to the `.ff-onboard` wrapper so the design's generic CSS
 * variables (--ink, --bg, --card, --accent…) never leak into the app theme.
 */
import React from "react";

/* ---------------- scoped styles + keyframes ---------------- */
const ONBOARDING_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;450;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');

.ff-onboard{
  --ink:#11151b; --ink-2:#1b2230; --ink-3:#262f3d;
  --text:#1c2530; --soft:#5a6573; --muted:#8b95a1; --faint:#aeb6c0;
  --line:#e9ebef; --line-2:#e0e3e8; --bg:#f6f7f9; --card:#ffffff;
  --accent:#11151b; --accent-soft:#eef0f3; --field:#ffffff; --ok:#16a34a; --teal:#0d9488;
  font-family:'Inter',system-ui,-apple-system,sans-serif;
  -webkit-font-smoothing:antialiased; text-rendering:optimizeLegibility; color:var(--text);
}
.ff-onboard *{box-sizing:border-box}
.ff-onboard .mono{font-family:'JetBrains Mono',ui-monospace,monospace}
.ff-onboard textarea{resize:none}
.ff-onboard button{cursor:pointer;font-family:inherit}
.ff-onboard input,.ff-onboard textarea{font-family:inherit}
.ff-onboard .scroll{scrollbar-width:thin;scrollbar-color:#d3d7dd transparent}
.ff-onboard .scroll::-webkit-scrollbar{width:10px;height:10px}
.ff-onboard .scroll::-webkit-scrollbar-thumb{background:#d3d7dd;border-radius:6px;border:3px solid transparent;background-clip:content-box}
.ff-onboard .lattice{
  background-image:
    linear-gradient(45deg, var(--lt) 0 1px, transparent 1px),
    linear-gradient(-45deg, var(--lt) 0 1px, transparent 1px);
  background-size: var(--lt-size,68px) var(--lt-size,68px);
}
.ff-onboard .shimmer-text{
  background:linear-gradient(100deg,var(--muted) 30%,var(--ink) 50%,var(--muted) 70%);
  background-size:200% 100%;-webkit-background-clip:text;background-clip:text;color:transparent;
  animation:ff-shimmer 2.1s linear infinite;
}
@keyframes ff-fade{from{opacity:0}to{opacity:1}}
@keyframes ff-up{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
@keyframes ff-up-sm{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
@keyframes ff-in-right{from{opacity:0;transform:translateX(24px)}to{opacity:1;transform:none}}
@keyframes ff-in-left{from{opacity:0;transform:translateX(-24px)}to{opacity:1;transform:none}}
@keyframes ff-pop{0%{opacity:0;transform:scale(.92)}60%{transform:scale(1.015)}100%{opacity:1;transform:scale(1)}}
@keyframes ff-blink{0%,80%,100%{opacity:.28}40%{opacity:1}}
@keyframes ff-spin{to{transform:rotate(360deg)}}
@keyframes ff-shimmer{0%{background-position:-180% 0}100%{background-position:180% 0}}
@keyframes ff-ring{0%{transform:scale(.7);opacity:.55}100%{transform:scale(2.1);opacity:0}}
@keyframes ff-drawer-in{from{transform:translateX(100%)}to{transform:none}}
@keyframes ff-drawer-in-rtl{from{transform:translateX(-100%)}to{transform:none}}
@keyframes ff-backdrop{from{opacity:0}to{opacity:1}}
@media (prefers-reduced-motion: reduce){
  .ff-onboard *{animation-duration:.001ms!important;animation-iteration-count:1!important}
}
`;

export function OnboardingStyles() {
  return <style dangerouslySetInnerHTML={{ __html: ONBOARDING_CSS }} />;
}

/* ---------------- icons ---------------- */
const OB_ICONS: Record<string, string> = {
  bot: "M8 8h8a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2ZM12 4v4M9 13h.01M15 13h.01M4 12v3M20 12v3",
  globe:
    "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM3 12h18M12 3c2.4 2.5 3.6 6 3.6 9s-1.2 6.5-3.6 9c-2.4-2.5-3.6-6-3.6-9s1.2-6.5 3.6-9Z",
  file: "M7 3h7l4 4v14H7zM14 3v4h4",
  text: "M6 7h12M6 12h12M6 17h7",
  qa: "M3 5h12v8H8l-3 3v-3H3zM14 11h7v7l-2.5-2.5H14z",
  upload: "M12 16V4M7 9l5-5 5 5M5 20h14",
  spark:
    "M12 4.5l1.7 4.3 4.3 1.7-4.3 1.7L12 16.5l-1.7-4.3L6 10.5l4.3-1.7zM18.5 4v2.6M19.8 5.3h-2.6",
  arrowR: "M5 12h14M13 6l6 6-6 6",
  arrowL: "M19 12H5M11 6l-6 6 6 6",
  check: "M5 13l4 4 10-11",
  thumbUp:
    "M7 10.5V20H4v-9.5zM7 10.5l3.6-6.6c1.2 0 2 .8 2 2v3.1h4.7a2 2 0 0 1 2 2.3l-1 5.4a2 2 0 0 1-2 1.7H7",
  thumbDown:
    "M17 13.5V4h3v9.5zM17 13.5l-3.6 6.6c-1.2 0-2-.8-2-2v-3.1H6.7a2 2 0 0 1-2-2.3l1-5.4a2 2 0 0 1 2-1.7H17",
  users:
    "M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7 0a3 3 0 1 0 0-6M3 20c0-3 3-5 6-5s6 2 6 5m1-5c2 0 5 1.4 5 5",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 21c0-4 3.6-6 8-6s8 2 8 6",
  play: "M8 5.5v13l11-6.5z",
  scan: "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14ZM20 20l-3.6-3.6",
  link: "M9 15l6-6M8 12l-2 2a3 3 0 0 0 4 4l2-2M16 12l2-2a3 3 0 0 0-4-4l-2 2",
  plus: "M12 5v14M5 12h14",
  x: "M6 6l12 12M18 6L6 18",
  grid: "M4 4h6.5v6.5H4zM13.5 4H20v6.5h-6.5zM4 13.5h6.5V20H4zM13.5 13.5H20V20h-6.5z",
  cpu: "M9 3v2M15 3v2M9 19v2M15 19v2M3 9h2M3 15h2M19 9h2M19 15h2M7 7h10v10H7zM10 10h4v4h-4z",
  doc: "M7 3h7l4 4v14H7zM14 3v4h4M9.5 12h5M9.5 15h5",
  sliders: "M4 8h10M18 8h2M4 16h2M10 16h10M14 6v4M8 14v4",
  handoff:
    "M7 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM2 19c0-2.6 2.2-4.5 5-4.5M14 13l3 3 5-5M16 7h6M19 4l3 3-3 3",
  mail: "M3 6h18v12H3zM3 7l9 6 9-6",
  bolt: "M13 3L5 13h5l-1 8 8-10h-5z",
  sources:
    "M4 7a8 8 0 0 1 8 0 8 8 0 0 1 8 0v11a8 8 0 0 0-8 0 8 8 0 0 0-8 0zM12 7v11",
};

export interface IconProps {
  size?: number;
  sw?: number;
  fill?: string;
  style?: React.CSSProperties;
}

function Icon({
  d,
  size = 18,
  sw = 1.7,
  fill = "none",
  style,
}: IconProps & { d: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill={fill}
      style={style}
      aria-hidden="true"
    >
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

export const Ic = (key: string, p: IconProps = {}) => (
  <Icon d={OB_ICONS[key]} {...p} />
);

/* ---------------- step model ---------------- */
export const RAIL_STEPS = [
  "welcome",
  "hear",
  "size",
  "goal",
  "name",
  "train",
] as const;

/** Icon key per knowledge source type. */
export const sourceIcon: Record<string, string> = {
  website: "globe",
  file: "file",
  text: "text",
  qa: "qa",
  url: "globe",
};

/** Ids only — labels come from the `onboarding.options.hear` messages. */
export const HEAR_OPTIONS: string[] = [
  "search",
  "community",
  "linkedin",
  "x",
  "youtube",
  "friend",
  "ai",
  "other",
];

/** [id, range] — range is locale-invariant digits; label comes from `onboarding.options.size`. */
export const SIZE_OPTIONS: [string, string][] = [
  ["startup", "1–9"],
  ["small", "10–49"],
  ["mid", "50–499"],
  ["enterprise", "500+"],
];

/** [id, icon] — title/desc come from `onboarding.options.goal`. */
export const GOAL_OPTIONS: [string, string][] = [
  ["answer", "scan"],
  ["leads", "users"],
  ["handoff", "handoff"],
  ["all", "spark"],
];

/* Testimonials + logos use only the Nourish Co brand.
 * Company/person names are proper nouns and stay untranslated; quote/role
 * come from `onboarding.testimonials`. */
export const TESTIMONIALS = [
  { id: "nourishco", co: "The Nourish Co", who: "Waleed" },
];

export const LOGOS = ["The Nourish Co"];

/** [id, icon] — id doubles as the icon key; title/desc come from `onboarding.features`. */
export const FEATURES: [string, string][] = [
  ["sources", "sources"],
  ["users", "users"],
  ["handoff", "handoff"],
  ["bolt", "bolt"],
];

/* ---------------- shared style fragments ---------------- */
export const card: React.CSSProperties = {
  background: "#fff",
  border: "1px solid var(--line)",
  borderRadius: 16,
  padding: "16px 17px",
  boxShadow: "0 2px 8px -4px rgba(16,24,40,.08)",
};
export const cardLabel: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: ".1em",
  color: "var(--muted)",
  marginBottom: 12,
};
export const fullCanvas: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  background: "var(--bg)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  overflow: "hidden",
};
export const field = (focused: boolean): React.CSSProperties => ({
  width: "100%",
  height: 50,
  padding: "0 15px",
  borderRadius: 12,
  fontSize: 15,
  color: "var(--text)",
  background: "var(--field)",
  outline: "none",
  transition: "border-color .15s, box-shadow .15s",
  border: `1.5px solid ${focused ? "var(--ink)" : "var(--line-2)"}`,
  boxShadow: focused ? "0 0 0 4px rgba(17,21,27,.06)" : "none",
});

export function Lattice() {
  return (
    <div
      className="lattice"
      style={{
        position: "absolute",
        inset: 0,
        ["--lt" as string]: "rgba(17,21,27,.04)",
        ["--lt-size" as string]: "70px",
        maskImage:
          "radial-gradient(120% 100% at 50% 50%, #000 35%, transparent 82%)",
        WebkitMaskImage:
          "radial-gradient(120% 100% at 50% 50%, #000 35%, transparent 82%)",
      }}
    />
  );
}
