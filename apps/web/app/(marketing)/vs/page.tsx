import { Metadata } from "next";
import Link from "next/link";

import { Eyebrow, WRAP } from "../components/marketing-kit";
import { DarkCta, PageHero } from "../components/page-kit";

import { vsPages } from "./vs-data";

export const metadata: Metadata = {
  title: "FrontFace vs Competitors — AI Support Comparisons",
  description:
    "Honest comparisons of FrontFace vs Chatbase, Intercom, Zendesk, Tidio, and more — setup time, AI accuracy, pricing, and which teams each tool fits.",
  keywords: [
    "FrontFace vs Chatbase",
    "FrontFace vs Intercom",
    "FrontFace vs Zendesk",
    "AI support tool comparison",
    "best Intercom alternative",
    "best Zendesk alternative for small teams",
  ],
  openGraph: {
    title: "FrontFace vs Competitors — AI Support Comparisons",
    description: "Honest comparisons of FrontFace against Chatbase, Intercom, Zendesk, Tidio, and more.",
    url: "https://frontface.app/vs",
    type: "website",
    siteName: "FrontFace",
    locale: "en_US",
    images: [{ url: "https://frontface.app/blog-og/vs-index.png", width: 1200, height: 630, alt: "FrontFace competitor comparisons" }],
  },
  twitter: {
    card: "summary_large_image",
    site: "@frontface",
    creator: "@frontface",
    title: "FrontFace vs Competitors",
    description: "Honest AI support tool comparisons.",
    images: [{ url: "https://frontface.app/blog-og/vs-index.png", width: 1200, height: 630, alt: "FrontFace competitor comparisons" }],
  },
  alternates: { canonical: "https://frontface.app/vs" },
};

const cardStyle = {
  background: "var(--ff-card)",
  border: "1px solid var(--ff-line)",
  borderRadius: 18,
  padding: "24px 22px",
} as const;

export default function VsIndexPage() {
  return (
    <main>
      <PageHero
        eyebrow="Compare"
        title="FrontFace vs the alternatives."
        sub="Honest, structured comparisons against the tools buyers actually consider. See setup time, AI accuracy, pricing, and who each is really for."
      />

      <section style={{ ...WRAP, padding: "clamp(32px,5vh,64px) clamp(20px,5vw,40px)" }}>
        <div className="reveal" style={{ marginBottom: 28 }}>
          <Eyebrow>All comparisons</Eyebrow>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: 18,
          }}
        >
          {vsPages.map((vs, i) => (
            <Link
              key={vs.slug}
              href={"/vs/" + vs.slug}
              className={"reveal ff-cap-card d" + ((i % 3) + 1)}
              style={{
                ...cardStyle,
                display: "flex",
                flexDirection: "column",
                gap: 10,
                textDecoration: "none",
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: ".06em",
                  textTransform: "uppercase",
                  color: "var(--ff-muted)",
                }}
              >
                FrontFace vs
              </div>
              <h2
                style={{
                  fontSize: 20,
                  fontWeight: 800,
                  letterSpacing: "-.02em",
                  color: "var(--ff-ink)",
                  lineHeight: 1.1,
                  margin: 0,
                }}
              >
                {vs.competitorName}
              </h2>
              <p
                style={{
                  fontSize: 13.5,
                  lineHeight: 1.55,
                  color: "var(--ff-soft)",
                  textWrap: "pretty",
                  margin: 0,
                  flex: 1,
                }}
              >
                {vs.heroSub.split(".")[0]}.
              </p>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 650,
                  color: "var(--ff-accent-2)",
                  marginTop: 4,
                }}
              >
                See comparison →
              </div>
            </Link>
          ))}
        </div>
      </section>

      <DarkCta
        title="See grounded answers on your own content."
        sub="Point FrontFace at your site and watch it answer a real question in minutes. Free during beta."
      />
    </main>
  );
}
