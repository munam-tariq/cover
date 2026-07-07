import type { ReactNode } from "react";

import { WRAP } from "./marketing-kit";
import { PageHero } from "./page-kit";

export type LegalBlock =
  | { type: "p"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "h3"; text: string };

export type LegalSection = { heading: string; blocks: LegalBlock[] };

const SUPPORT_EMAIL = "hello@frontface.app";

/** Auto-links the support email address inside a plain-text segment. */
function linkifyEmail(text: string, key: string): ReactNode {
  const idx = text.indexOf(SUPPORT_EMAIL);
  if (idx === -1) return text;
  return (
    <span key={key}>
      {text.slice(0, idx)}
      <a href={`mailto:${SUPPORT_EMAIL}`} className="text-blue-600 hover:underline">
        {SUPPORT_EMAIL}
      </a>
      {text.slice(idx + SUPPORT_EMAIL.length)}
    </span>
  );
}

/** Minimal inline renderer: supports **bold** spans plus auto-linked support email. */
function renderInline(text: string): ReactNode {
  return text
    .split(/(\*\*[^*]+\*\*)/g)
    .filter(Boolean)
    .map((part, i) => {
      const key = `${i}-${part.slice(0, 8)}`;
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={key}>{linkifyEmail(part.slice(2, -2), key)}</strong>;
      }
      return linkifyEmail(part, key);
    });
}

export function LegalPage({
  eyebrow,
  title,
  sub,
  lastUpdated,
  legalNotice,
  sections,
}: {
  eyebrow: string;
  title: string;
  sub: string;
  lastUpdated: string;
  legalNotice?: string;
  sections: LegalSection[];
}) {
  return (
    <main>
      <PageHero eyebrow={eyebrow} title={title} sub={sub} />
      <article
        style={{
          ...WRAP,
          maxWidth: 820,
          padding: "clamp(8px,2vh,24px) clamp(20px,5vw,40px) clamp(40px,6vh,80px)",
        }}
      >
        <p style={{ fontSize: 13.5, color: "var(--ff-muted)", marginBottom: 28 }}>{lastUpdated}</p>
        {legalNotice && (
          <p
            style={{
              fontSize: 13.5,
              color: "var(--ff-muted)",
              marginBottom: 28,
              padding: "12px 16px",
              background: "var(--ff-soft-bg, #f9fafb)",
              borderRadius: 10,
              border: "1px solid var(--ff-line)",
            }}
          >
            {legalNotice}
          </p>
        )}
        <div className="prose-ff" style={{ maxWidth: "none" }}>
          {sections.map((section) => (
            <section className="mb-10" key={section.heading}>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">{section.heading}</h2>
              {section.blocks.map((block, i) => {
                if (block.type === "h3") {
                  return (
                    <h3 key={i} className="text-xl font-semibold text-slate-800 mb-3">
                      {block.text}
                    </h3>
                  );
                }
                if (block.type === "ul") {
                  return (
                    <ul key={i} className="list-disc ps-6 mb-4 text-slate-700 space-y-2">
                      {block.items.map((item, j) => (
                        <li key={j}>{renderInline(item)}</li>
                      ))}
                    </ul>
                  );
                }
                return (
                  <p key={i} className="text-slate-700 leading-relaxed mb-4">
                    {renderInline(block.text)}
                  </p>
                );
              })}
            </section>
          ))}
        </div>
      </article>
    </main>
  );
}
