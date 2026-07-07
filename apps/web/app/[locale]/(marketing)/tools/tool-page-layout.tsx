import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

import { Link } from "@/i18n/navigation";

import { Eyebrow, Ic, WRAP } from "../components/marketing-kit";
import { DarkCta, PageHero } from "../components/page-kit";

import type { ToolPage } from "./tools-data";

export interface Citation {
  id: number;
  label: string;
  url: string;
  note: string;
}

interface ToolPageLayoutProps {
  tool: ToolPage;
  eyebrow?: string;
  schema: Record<string, unknown>;
  citations: Citation[];
  faqs: { q: string; a: string }[];
  resourceLinks: { href: string; label: string }[];
  explanationEyebrow?: string;
  explanationTitle: ReactNode;
  explanationBody: ReactNode;
  ctaTitle: ReactNode;
  ctaSub: ReactNode;
  ctaSecondaryLabel?: string;
  ctaSecondaryHref?: string;
  children: ReactNode;
}

export async function ToolPageLayout({
  tool,
  eyebrow,
  schema,
  citations,
  faqs,
  resourceLinks,
  explanationEyebrow,
  explanationTitle,
  explanationBody,
  ctaTitle,
  ctaSub,
  ctaSecondaryLabel,
  ctaSecondaryHref,
  children,
}: ToolPageLayoutProps) {
  const t = await getTranslations("marketing.toolLayout");
  const tCopy = await getTranslations("marketing.toolCopy");
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://frontface.app" },
      { "@type": "ListItem", position: 2, name: "Tools", item: "https://frontface.app/tools" },
      { "@type": "ListItem", position: 3, name: tool.name, item: tool.canonical },
    ],
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.q,
      acceptedAnswer: { "@type": "Answer", text: faq.a },
    })),
  };

  return (
    <>
      <script
        id={`${tool.slug}-web-app-schema`}
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <script
        id={`${tool.slug}-breadcrumb-schema`}
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <script
        id={`${tool.slug}-faq-schema`}
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <main style={{ overflowX: "hidden" }}>
        <PageHero
          eyebrow={eyebrow ?? t("freeTool")}
          title={tCopy(`${tool.slug}.title`)}
          sub={tCopy(`${tool.slug}.description`)}
        />

        <section style={{ ...WRAP, padding: "clamp(28px,5vh,58px) clamp(20px,5vw,40px)" }}>
          {children}
        </section>

        <section
          className="ff-tool-explain-grid"
          style={{
            ...WRAP,
            padding: "clamp(32px,6vh,72px) clamp(20px,5vw,40px)",
            display: "grid",
            gridTemplateColumns: "minmax(0,1fr) minmax(300px,.7fr)",
            gap: 26,
          }}
        >
          <div>
            <Eyebrow>{explanationEyebrow ?? t("howToRead")}</Eyebrow>
            <h2
              style={{
                fontSize: "clamp(28px,4vw,44px)",
                fontWeight: 850,
                letterSpacing: "-.035em",
                lineHeight: 1.05,
                color: "var(--ff-ink)",
                textWrap: "balance",
                margin: 0,
              }}
            >
              {explanationTitle}
            </h2>
            <div className="prose-ff" style={{ maxWidth: 720, margin: "22px 0 0" }}>
              {explanationBody}
            </div>
          </div>

          <aside
            style={{
              border: "1px solid var(--ff-line)",
              borderRadius: 18,
              background: "#fff",
              padding: 22,
              alignSelf: "start",
            }}
          >
            <h3
              style={{
                fontSize: 18,
                fontWeight: 800,
                letterSpacing: "-.015em",
                color: "var(--ff-ink)",
                margin: "0 0 14px",
              }}
            >
              {t("learnMore")}
            </h3>
            <div style={{ display: "grid", gap: 10 }}>
              {resourceLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    color: "var(--ff-ink)",
                    fontSize: 14,
                    fontWeight: 650,
                    textDecoration: "none",
                  }}
                >
                  <span
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 7,
                      background: "var(--ff-accent-soft)",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    {Ic("arrowR", { size: 13, sw: 2 })}
                  </span>
                  {link.label}
                </Link>
              ))}
            </div>
          </aside>
        </section>

        <section
          style={{
            ...WRAP,
            padding: "0 clamp(20px,5vw,40px) clamp(32px,5vh,56px)",
          }}
        >
          <div style={{ maxWidth: 760, margin: "0 auto" }}>
            <details
              style={{
                border: "1px solid var(--ff-line)",
                borderRadius: 14,
                background: "#fff",
              }}
            >
              <summary
                style={{
                  padding: "16px 20px",
                  fontSize: 15,
                  fontWeight: 800,
                  color: "var(--ff-ink)",
                  cursor: "pointer",
                  userSelect: "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  listStyle: "none",
                }}
              >
                <span>{t("sourcesMethodology")}</span>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: "var(--ff-muted)",
                  }}
                >
                  {t("sourceCount", { count: citations.length })}
                </span>
              </summary>
              <div
                style={{
                  padding: "12px 20px 20px",
                  borderTop: "1px solid var(--ff-line)",
                  display: "grid",
                  gap: 14,
                }}
              >
                {citations.map((c) => (
                  <div
                    key={c.id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "32px 1fr",
                      gap: 10,
                      alignItems: "start",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 800,
                        color: "var(--ff-muted)",
                        background: "var(--ff-soft-bg, #f3f4f6)",
                        borderRadius: 5,
                        padding: "2px 5px",
                        textAlign: "center",
                        marginTop: 3,
                        display: "block",
                      }}
                    >
                      [{c.id}]
                    </span>
                    <div>
                      <a
                        href={c.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          color: "var(--ff-ink)",
                          fontWeight: 700,
                          fontSize: 14,
                          textDecoration: "underline",
                          textDecorationColor: "var(--ff-line-2)",
                          textUnderlineOffset: 2,
                        }}
                      >
                        {c.label}
                      </a>
                      <p
                        style={{
                          margin: "4px 0 0",
                          fontSize: 13,
                          color: "var(--ff-soft)",
                          lineHeight: 1.6,
                        }}
                      >
                        {c.note}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </details>
          </div>
        </section>

        <section style={{ ...WRAP, padding: "clamp(24px,5vh,58px) clamp(20px,5vw,40px)" }}>
          <div style={{ maxWidth: 760, margin: "0 auto" }}>
            <Eyebrow center>{t("faqEyebrow")}</Eyebrow>
            <h2
              style={{
                fontSize: "clamp(26px,3.8vw,42px)",
                fontWeight: 850,
                letterSpacing: "-.03em",
                lineHeight: 1.08,
                textAlign: "center",
                color: "var(--ff-ink)",
                margin: 0,
              }}
            >
              {t("faqTitle")}
            </h2>
            <dl style={{ display: "grid", gap: 14, marginTop: 30 }}>
              {faqs.map((item) => (
                <div
                  key={item.q}
                  style={{
                    border: "1px solid var(--ff-line)",
                    borderRadius: 14,
                    background: "#fff",
                    padding: "18px 20px",
                  }}
                >
                  <dt
                    style={{
                      fontSize: 16,
                      fontWeight: 800,
                      color: "var(--ff-ink)",
                      marginBottom: 8,
                    }}
                  >
                    {item.q}
                  </dt>
                  <dd
                    style={{
                      margin: 0,
                      color: "var(--ff-soft)",
                      fontSize: 14.5,
                      lineHeight: 1.65,
                    }}
                  >
                    {item.a}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <DarkCta
          title={ctaTitle}
          sub={ctaSub}
          secondaryLabel={ctaSecondaryLabel}
          secondaryHref={ctaSecondaryHref}
        />
      </main>
    </>
  );
}
