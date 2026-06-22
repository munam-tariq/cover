import Link from "next/link";
import { Fragment } from "react";

import { blogPosts } from "../blog/blog-data";
import { Cover, coverKindFor } from "../blog/cover-scene";
import { NAV, RESOURCE_LINKS } from "../landing-data";

import { Btn } from "./marketing-button";
import { Ic, Logo, WRAP } from "./marketing-kit";

function ResourcesMenu() {
  const latest = blogPosts[0];

  return (
    <div className="ff-resources">
      <button type="button" className="ff-nav-link ff-resources-trigger" aria-haspopup="true">
        Resources
        <span aria-hidden="true" className="ff-resources-chev">
          {Ic("chevron", { size: 15 })}
        </span>
      </button>

      <div className="ff-resources-panel" role="menu">
        <div className="ff-resources-grid">
          <div>
            <div className="ff-resources-label">Quick links</div>
            {RESOURCE_LINKS.map(([label, href, desc, icon]) => (
              <Link key={label} href={href} className="ff-resources-item" role="menuitem">
                <span className="ff-resources-ic">{Ic(icon, { size: 18 })}</span>
                <span>
                  <span className="ff-resources-item-title">{label}</span>
                  <span className="ff-resources-item-desc">{desc}</span>
                </span>
              </Link>
            ))}
          </div>

          {latest && (
            <Link href={"/blog/" + latest.slug} className="ff-resources-feature" role="menuitem">
              <div className="ff-resources-label">Recent update</div>
              <div className="ff-resources-cover">
                <Cover kind={coverKindFor(latest)} height={140} />
              </div>
              <div className="ff-resources-feature-title">{latest.title}</div>
              <div className="ff-resources-feature-desc">{latest.description}</div>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

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
            <Fragment key={label}>
              <Link href={href} className="ff-nav-link" style={{ fontSize: 14.5, fontWeight: 500, color: "var(--ff-soft)", transition: "color .15s" }}>
                {label}
              </Link>
              {label === "How it works" && <ResourcesMenu />}
            </Fragment>
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
              <div className="ff-nav-mobile-label">Resources</div>
              {RESOURCE_LINKS.map(([label, href]) => (
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

        /* Resources mega-dropdown — CSS-only (hover + focus-within) so the
           header stays a server component. */
        .ff-resources { position: relative; display: inline-flex; }
        .ff-resources-trigger {
          display: inline-flex;
          align-items: center;
          gap: 3px;
          margin: 0;
          padding: 0;
          border: 0;
          background: none;
          font: inherit;
          font-size: 14.5px;
          font-weight: 500;
          color: var(--ff-soft);
          cursor: pointer;
          transition: color .15s;
        }
        .ff-resources-chev { display: inline-flex; transition: transform .2s; }
        .ff-resources:hover .ff-resources-chev,
        .ff-resources:focus-within .ff-resources-chev { transform: rotate(180deg); }

        .ff-resources-panel {
          position: absolute;
          top: calc(100% + 22px);
          left: 50%;
          width: min(640px, calc(100vw - 32px));
          padding: 18px;
          background: #fff;
          border: 1px solid var(--ff-line);
          border-radius: 18px;
          box-shadow: 0 30px 80px -42px rgba(16,24,40,.5);
          opacity: 0;
          visibility: hidden;
          pointer-events: none;
          transform: translateX(-50%) translateY(8px);
          transition: opacity .18s ease, transform .18s ease, visibility .18s;
          z-index: 60;
        }
        /* invisible bridge so the cursor can travel from trigger to panel */
        .ff-resources-panel::before {
          content: "";
          position: absolute;
          top: -22px;
          left: 0;
          right: 0;
          height: 22px;
        }
        .ff-resources:hover .ff-resources-panel,
        .ff-resources:focus-within .ff-resources-panel {
          opacity: 1;
          visibility: visible;
          pointer-events: auto;
          transform: translateX(-50%) translateY(0);
        }

        .ff-resources-grid { display: grid; grid-template-columns: 1.12fr 1fr; gap: 18px; }
        .ff-resources-label {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: .1em;
          text-transform: uppercase;
          color: var(--ff-muted);
          margin-bottom: 10px;
        }
        .ff-resources-item {
          display: flex;
          gap: 12px;
          align-items: flex-start;
          padding: 9px 10px;
          border-radius: 12px;
          transition: background .15s;
        }
        .ff-resources-item:hover { background: var(--ff-card); }
        .ff-resources-ic {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 34px;
          height: 34px;
          flex-shrink: 0;
          border-radius: 9px;
          border: 1px solid var(--ff-line);
          background: var(--ff-card);
          color: var(--ff-ink);
        }
        .ff-resources-item:hover .ff-resources-ic { background: #fff; }
        .ff-resources-item-title { display: block; font-size: 14px; font-weight: 650; color: var(--ff-ink); }
        .ff-resources-item-desc { display: block; font-size: 12.5px; color: var(--ff-soft); margin-top: 1px; }

        .ff-resources-feature {
          display: block;
          padding: 14px;
          border-radius: 14px;
          border: 1px solid var(--ff-line);
          background: var(--ff-card);
          transition: border-color .15s;
        }
        .ff-resources-feature:hover { border-color: var(--ff-line-2); }
        .ff-resources-cover {
          margin-bottom: 10px;
          border-radius: 10px;
          overflow: hidden;
        }
        .ff-resources-feature-title { font-size: 14px; font-weight: 700; line-height: 1.3; letter-spacing: -.01em; color: var(--ff-ink); }
        .ff-resources-feature-desc {
          margin-top: 6px;
          font-size: 12.5px;
          line-height: 1.5;
          color: var(--ff-soft);
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

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
          max-height: calc(100vh - 80px);
          overflow-y: auto;
        }
        .ff-nav-mobile-label {
          margin-top: 12px;
          padding: 0 4px 4px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: .1em;
          text-transform: uppercase;
          color: var(--ff-muted);
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
