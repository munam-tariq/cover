import { getLocale, getTranslations } from "next-intl/server";

import { LocaleSwitcher } from "@/components/locale-switcher";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

import { getLandingData } from "../landing-data";

import { Logo, WRAP } from "./marketing-kit";

export async function Footer() {
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("marketing.footer");
  const { footCols } = getLandingData(locale);
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
          gridTemplateColumns: "1.8fr 1fr 1fr 1fr 1fr",
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
            {t("tagline")}
          </p>
        </div>
        {footCols.map(([title, links]) => (
          <div key={title}>
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: ".08em",
                color: "rgba(255,255,255,.55)",
                textTransform: "uppercase",
                marginBottom: 16,
              }}
            >
              {title}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
              {links.map(([label, href]) => (
                <Link
                  key={href}
                  href={href}
                  className="ff-foot-link"
                  style={{ fontSize: 14, color: "rgba(255,255,255,.6)", transition: "color .15s" }}
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
        <span style={{ fontSize: 13, color: "rgba(255,255,255,.55)" }}>
          {t("copyright", { year: new Date().getFullYear() })}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ fontSize: 13, color: "rgba(255,255,255,.55)" }}>
            {t("builtFor")}
          </span>
          <LocaleSwitcher className="ff-foot-locale-switcher" />
        </div>
      </div>

      <style>{`
        .ff-foot-link:hover { color: #fff !important; }
        .ff-foot-locale-switcher {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          color: rgba(255,255,255,.55);
        }
        .ff-foot-locale-switcher .ff-locale-btn[aria-current="true"] { color: #fff; }
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
