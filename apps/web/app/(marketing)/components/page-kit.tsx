import type { CSSProperties, ReactNode } from "react";

import { Btn } from "./marketing-button";
import { Eyebrow, Ic, WRAP } from "./marketing-kit";

/* page-kit.tsx — server-safe section primitives shared by the secondary
   marketing pages (about, features, use-cases, integrations, …): a themed
   lattice hero and a dark gradient CTA band, in the FrontFace ink palette. */

const latticeHero: CSSProperties = {
  position: "absolute",
  inset: 0,
  ["--lt" as string]: "rgba(17,21,27,.045)",
  ["--lt-size" as string]: "70px",
  maskImage: "radial-gradient(120% 80% at 50% 10%, #000 30%, transparent 76%)",
  WebkitMaskImage: "radial-gradient(120% 80% at 50% 10%, #000 30%, transparent 76%)",
};

/** Centered hero with eyebrow + headline + subhead over a lattice backdrop. */
export function PageHero({
  eyebrow,
  title,
  sub,
}: {
  eyebrow: string;
  title: ReactNode;
  sub: ReactNode;
}) {
  return (
    <section
      style={{
        position: "relative",
        overflow: "hidden",
        paddingTop: "clamp(52px,8vh,92px)",
        paddingBottom: "clamp(24px,4vh,44px)",
      }}
    >
      <div className="lattice" style={latticeHero} />
      <div
        style={{
          ...WRAP,
          position: "relative",
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <div className="reveal in">
          <Eyebrow center>{eyebrow}</Eyebrow>
        </div>
        <h1
          className="reveal in d1"
          style={{
            fontSize: "clamp(34px,5.4vw,60px)",
            fontWeight: 800,
            letterSpacing: "-.03em",
            color: "var(--ff-ink)",
            lineHeight: 1.04,
            textWrap: "balance",
            maxWidth: 840,
          }}
        >
          {title}
        </h1>
        <p
          className="reveal in d2"
          style={{
            fontSize: "clamp(16px,1.7vw,19px)",
            lineHeight: 1.55,
            color: "var(--ff-soft)",
            maxWidth: 640,
            marginTop: 18,
            textWrap: "pretty",
          }}
        >
          {sub}
        </p>
      </div>
    </section>
  );
}

/** Dark gradient CTA band closing a page. */
export function DarkCta({
  title,
  sub,
  primaryLabel = "Build your agent",
  primaryHref = "/login",
  secondaryLabel,
  secondaryHref,
}: {
  title: ReactNode;
  sub: ReactNode;
  primaryLabel?: string;
  primaryHref?: string;
  secondaryLabel?: string;
  secondaryHref?: string;
}) {
  return (
    <section
      style={{
        position: "relative",
        overflow: "hidden",
        background: "linear-gradient(180deg,#11151b,#0c0f14)",
        color: "#fff",
        padding: "clamp(64px,10vh,120px) 0",
        marginTop: "clamp(40px,6vh,80px)",
      }}
    >
      <div
        className="lattice"
        style={
          {
            position: "absolute",
            inset: 0,
            "--lt": "rgba(255,255,255,.05)",
            "--lt-size": "64px",
            maskImage: "radial-gradient(80% 85% at 50% 40%, #000 28%, transparent 76%)",
            WebkitMaskImage: "radial-gradient(80% 85% at 50% 40%, #000 28%, transparent 76%)",
          } as CSSProperties
        }
      />
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%,-50%)",
          width: 560,
          height: 560,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(var(--ff-accent-rgb),.18), transparent 64%)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          ...WRAP,
          position: "relative",
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <h2
          className="reveal"
          style={{
            fontSize: "clamp(28px,4.4vw,46px)",
            fontWeight: 800,
            letterSpacing: "-.03em",
            lineHeight: 1.06,
            textWrap: "balance",
            maxWidth: 660,
          }}
        >
          {title}
        </h2>
        <p
          className="reveal d1"
          style={{ fontSize: 17, lineHeight: 1.55, color: "rgba(255,255,255,.66)", marginTop: 18, maxWidth: 520, textWrap: "pretty" }}
        >
          {sub}
        </p>
        <div
          className="reveal d2"
          style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 32, flexWrap: "wrap", justifyContent: "center" }}
        >
          <Btn kind="lightPrimary" size="lg" href={primaryHref}>
            {primaryLabel} {Ic("arrowR", { size: 18 })}
          </Btn>
          {secondaryLabel && secondaryHref && (
            <Btn kind="secondary" size="lg" light href={secondaryHref}>
              {secondaryLabel}
            </Btn>
          )}
        </div>
      </div>
    </section>
  );
}
