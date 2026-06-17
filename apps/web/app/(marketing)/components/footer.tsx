"use client";

import Link from "next/link";

import { Logo, WRAP } from "./marketing-kit";

const FOOT_COLS: [string, [string, string][]][] = [
  [
    "Product",
    [
      ["Features", "/#capabilities"],
      ["How it works", "/#how"],
      ["Pricing", "/#pricing"],
      ["Blog", "/blog"],
    ],
  ],
  [
    "Company",
    [
      ["About", "/about"],
      ["Use cases", "/use-cases"],
      ["Integrations", "/integrations"],
    ],
  ],
  [
    "Legal",
    [
      ["Privacy", "/privacy"],
      ["Terms", "/terms"],
    ],
  ],
];

export function Footer() {
  return (
    <footer
      style={{
        background: "#0c0f14",
        color: "rgba(255,255,255,.6)",
        borderTop: "1px solid rgba(255,255,255,.08)",
      }}
    >
      <div
        className="ff-foot-grid"
        style={{
          ...WRAP,
          padding: "56px clamp(20px,5vw,40px) 40px",
          display: "grid",
          gridTemplateColumns: "2fr 1fr 1fr 1fr",
          gap: 32,
        }}
      >
        <div>
          <Logo light />
          <p
            style={{
              fontSize: 13.5,
              lineHeight: 1.6,
              marginTop: 16,
              maxWidth: 260,
              color: "rgba(255,255,255,.5)",
              textWrap: "pretty",
            }}
          >
            FrontFace resolves customer questions instantly from your knowledge base — capturing leads and
            handing off to your team, 24/7.
          </p>
        </div>
        {FOOT_COLS.map(([title, links]) => (
          <div key={title}>
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: ".08em",
                color: "rgba(255,255,255,.4)",
                textTransform: "uppercase",
                marginBottom: 16,
              }}
            >
              {title}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
              {links.map(([label, href]) => (
                <Link
                  key={label}
                  href={href}
                  style={{ fontSize: 14, color: "rgba(255,255,255,.6)", transition: "color .15s" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#fff")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,.6)")}
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div
        style={{
          ...WRAP,
          padding: "20px clamp(20px,5vw,40px) 32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderTop: "1px solid rgba(255,255,255,.07)",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <span style={{ fontSize: 13, color: "rgba(255,255,255,.4)" }}>
          &copy; {new Date().getFullYear()} FrontFace. All rights reserved.
        </span>
        <span style={{ fontSize: 13, color: "rgba(255,255,255,.4)" }}>
          Built for support teams that move fast.
        </span>
      </div>

      <style>{`
        @media (max-width: 920px) {
          .ff-foot-grid { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 520px) {
          .ff-foot-grid { grid-template-columns: 1fr 1fr !important; }
        }
      `}</style>
    </footer>
  );
}
