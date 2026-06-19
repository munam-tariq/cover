import Link from "next/link";

import { NAV } from "../landing-data";

import { Btn } from "./marketing-button";
import { Ic, Logo, WRAP } from "./marketing-kit";

export function Header() {
  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        background: "rgba(246,247,249,.88)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        borderBottom: "1px solid var(--ff-line)",
      }}
    >
      <nav
        style={{
          ...WRAP,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          height: 68,
        }}
      >
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10 }} aria-label="FrontFace home">
          <Logo />
          <span
            aria-hidden="true"
            style={{
              fontSize: 10.5,
              fontWeight: 700,
              letterSpacing: ".06em",
              color: "var(--ff-soft)",
              border: "1px solid var(--ff-line-2)",
              borderRadius: 6,
              padding: "2px 7px",
            }}
          >
            BETA
          </span>
        </Link>

        <div className="ff-nav-links" style={{ display: "flex", alignItems: "center", gap: 30 }}>
          {NAV.map(([label, href]) => (
            <Link key={label} href={href} className="ff-nav-link" style={{ fontSize: 14.5, fontWeight: 500, color: "var(--ff-soft)", transition: "color .15s" }}>
              {label}
            </Link>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span className="ff-cta-desktop">
            <Btn kind="primary" size="sm" href="/login">
              Build your agent {Ic("arrowR", { size: 15 })}
            </Btn>
          </span>

          <details className="ff-nav-details">
            <summary aria-label="Open menu">
              <span aria-hidden="true" />
              <span aria-hidden="true" />
              <span aria-hidden="true" />
            </summary>
            <div className="ff-nav-mobile">
              {NAV.map(([label, href]) => (
                <Link key={label} href={href} style={{ padding: "12px 4px", fontSize: 15, fontWeight: 500, color: "var(--ff-soft)", borderBottom: "1px solid var(--ff-line)" }}>
                  {label}
                </Link>
              ))}
              <div style={{ marginTop: 12 }}>
                <Btn kind="primary" size="md" href="/login" style={{ width: "100%" }}>
                  Build your agent {Ic("arrowR", { size: 16 })}
                </Btn>
              </div>
            </div>
          </details>
        </div>
      </nav>

      <style>{`
        .ff-nav-link:hover { color: var(--ff-ink) !important; }
        .ff-nav-details {
          position: relative;
          display: none;
        }
        .ff-nav-details summary {
          width: 40px;
          height: 40px;
          display: inline-flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 4px;
          border-radius: 10px;
          border: 1px solid var(--ff-line-2);
          background: #fff;
          color: var(--ff-ink);
          cursor: pointer;
          list-style: none;
        }
        .ff-nav-details summary::-webkit-details-marker { display: none; }
        .ff-nav-details summary span {
          width: 18px;
          height: 2px;
          border-radius: 99px;
          background: var(--ff-ink);
        }
        .ff-nav-mobile {
          position: absolute;
          top: 50px;
          right: 0;
          width: min(300px, calc(100vw - 40px));
          padding: 12px 16px 18px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          border: 1px solid var(--ff-line);
          border-radius: 16px;
          background: rgba(246,247,249,.98);
          box-shadow: 0 24px 70px -38px rgba(16,24,40,.48);
        }
        @media (max-width: 860px) {
          .ff-nav-links { display: none !important; }
          .ff-nav-details { display: block !important; }
        }
        @media (max-width: 520px) {
          .ff-cta-desktop { display: none !important; }
        }
      `}</style>
    </header>
  );
}
