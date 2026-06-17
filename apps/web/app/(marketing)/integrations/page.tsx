import { Code } from "lucide-react";
import { Metadata } from "next";
import Link from "next/link";
import type { CSSProperties } from "react";

import { Eyebrow, Ic, WRAP } from "../components/marketing-kit";
import { DarkCta, PageHero } from "../components/page-kit";

import { integrations as integrationPages } from "./integrations-data";

export const metadata: Metadata = {
  title: "Integrations | Works on Any Website",
  description:
    "Add FrontFace to Shopify, WordPress, Wix, Squarespace, or any website with one line of code. Connect Slack, HubSpot, Zapier, and more. 5-minute setup.",
  keywords: [
    "Shopify chatbot",
    "WordPress chatbot",
    "Wix chatbot",
    "website chatbot integration",
    "Slack integration",
    "HubSpot integration",
    "MCP protocol",
  ],
  openGraph: {
    title: "FrontFace Integrations",
    description: "Works on any website. Shopify, WordPress, Wix, and more — one line of code.",
    url: "https://frontface.app/integrations",
    type: "website",
    siteName: "FrontFace",
    locale: "en_US",
    images: [
      {
        url: "https://frontface.app/blog-og/integrations.png",
        width: 1200,
        height: 630,
        alt: "FrontFace Integrations — works on Shopify, WordPress, Wix, and more",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@frontface",
    creator: "@frontface",
    title: "FrontFace Integrations",
    description: "Works on any website. Shopify, WordPress, Wix, and more.",
    images: [
      {
        url: "https://frontface.app/blog-og/integrations.png",
        width: 1200,
        height: 630,
        alt: "FrontFace Integrations — works on Shopify, WordPress, Wix, and more",
      },
    ],
  },
  alternates: {
    canonical: "https://frontface.app/integrations",
  },
};

const slugMap: Record<string, string> = Object.fromEntries(
  integrationPages.map((p) => [p.name, p.slug])
);

const featuredIntegrations = [
  {
    name: "Shopify",
    description:
      "Add AI support to your Shopify store. Answer product questions, order status and returns automatically from your own policies.",
    category: "Ecommerce",
    status: "Available",
    icon: (
      <svg className="w-7 h-7" viewBox="0 0 24 24" fill="currentColor">
        <path d="M15.5 2.5L14 3l-1 4-2 1v11l6.5-3V5.5l-2-3z" />
        <path d="M11 8l-4.5 2v10l4.5-2V8z" />
        <path d="M6.5 10L4 11v8l2.5-1V10z" />
      </svg>
    ),
  },
  {
    name: "WordPress",
    description:
      "Works with any WordPress site. Install via plugin or paste one line of code. Fully compatible with WooCommerce.",
    category: "Website",
    status: "Available",
    icon: (
      <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <circle cx="12" cy="12" r="9" />
        <path d="M5 8l4 11M12 4v16M19 8l-4 11" />
      </svg>
    ),
  },
  {
    name: "Wix",
    description:
      "Add to your Wix site in minutes. No coding required — just paste the embed code in your site settings.",
    category: "Website",
    status: "Available",
    icon: (
      <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 7l3.5 10L10 9l3.5 8L17 7" />
        <path d="M19 7v10" />
      </svg>
    ),
  },
];

const integrations = [
  { name: "Squarespace", description: "Add to any Squarespace site via the code injection settings.", category: "Website", status: "Available" },
  { name: "Custom Website", description: "Works on any website — paste one line of code before the closing body tag.", category: "Website", status: "Available" },
  { name: "WooCommerce", description: "Full support for WooCommerce stores. Answer product and order questions.", category: "Ecommerce", status: "Available" },
  { name: "Slack", description: "Get notified of new leads and escalations in Slack. Reply from threads.", category: "Communication", status: "Coming Soon" },
  { name: "Email", description: "Receive daily summaries and instant alerts for conversations that need you.", category: "Communication", status: "Coming Soon" },
  { name: "HubSpot", description: "Sync leads directly to HubSpot CRM and track them through your pipeline.", category: "CRM", status: "Coming Soon" },
  { name: "Zapier", description: "Connect FrontFace to 5,000+ apps. Automate lead capture and notifications.", category: "Automation", status: "Coming Soon" },
  { name: "Google Analytics", description: "Track agent engagement in GA4 and its impact on your conversion funnel.", category: "Analytics", status: "Coming Soon" },
  { name: "REST API", description: "Full-featured REST API for custom integrations across agents and conversations.", category: "Developer", status: "Available" },
  { name: "Webhooks", description: "Real-time notifications for new conversations, leads and escalations.", category: "Developer", status: "Available" },
  { name: "MCP Protocol", description: "Native Model Context Protocol support. Works with Cursor, Claude and more.", category: "Developer", status: "Available" },
  { name: "JavaScript SDK", description: "Advanced embed customization with React, Vue and vanilla JS support.", category: "Developer", status: "Available" },
];

const categories = ["All", "Website", "Ecommerce", "Communication", "CRM", "Automation", "Analytics", "Developer"];

function StatusBadge({ status }: { status: string }) {
  const available = status === "Available";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: ".02em",
        padding: "4px 9px",
        borderRadius: 99,
        color: available ? "#fff" : "var(--ff-soft)",
        background: available ? "var(--ff-ink)" : "transparent",
        border: available ? "1px solid var(--ff-ink)" : "1px solid var(--ff-line-2)",
      }}
    >
      {available && <span style={{ width: 5, height: 5, borderRadius: 99, background: "#fff" }} />}
      {status}
    </span>
  );
}

const cardStyle: CSSProperties = {
  background: "var(--ff-card)",
  border: "1px solid var(--ff-line)",
  borderRadius: 18,
  padding: "24px 22px",
};

export default function IntegrationsPage() {
  return (
    <main>
      <PageHero
        eyebrow="Integrations"
        title="Works on any website."
        sub="Shopify, WordPress, Wix, Squarespace or a custom site — FrontFace works everywhere. Paste one line of code and you're live."
      />

      {/* Featured */}
      <section style={{ ...WRAP, padding: "clamp(24px,4vh,48px) clamp(20px,5vw,40px)" }}>
        <div className="reveal" style={{ marginBottom: 28 }}>
          <Eyebrow>Featured</Eyebrow>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 18 }}>
          {featuredIntegrations.map((it, i) => (
            <div key={it.name} className={"reveal ff-cap-card d" + ((i % 3) + 1)} style={{ ...cardStyle, position: "relative" }}>
              {slugMap[it.name] && (
                <Link href={`/integrations/${slugMap[it.name]}`} aria-label={`${it.name} integration`} style={{ position: "absolute", inset: 0, zIndex: 0 }} />
              )}
              <div style={{ position: "absolute", top: 18, right: 18 }}>
                <StatusBadge status={it.status} />
              </div>
              <span style={{ width: 52, height: 52, borderRadius: 14, background: "var(--ff-ink)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                {it.icon}
              </span>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".06em", color: "var(--ff-muted)", textTransform: "uppercase" }}>{it.category}</span>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: "var(--ff-ink)", letterSpacing: "-.01em", marginTop: 4, marginBottom: 8 }}>{it.name}</h3>
              <p style={{ fontSize: 13.5, lineHeight: 1.55, color: "var(--ff-soft)", textWrap: "pretty" }}>{it.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* All integrations */}
      <section style={{ ...WRAP, padding: "clamp(24px,4vh,48px) clamp(20px,5vw,40px)" }}>
        <div className="reveal" style={{ textAlign: "center", maxWidth: 560, margin: "0 auto 28px" }}>
          <h2 style={{ fontSize: "clamp(26px,3.8vw,42px)", fontWeight: 800, letterSpacing: "-.03em", color: "var(--ff-ink)", lineHeight: 1.08, textWrap: "balance" }}>
            All integrations
          </h2>
          <p style={{ fontSize: 16.5, lineHeight: 1.55, color: "var(--ff-soft)", marginTop: 14, textWrap: "pretty" }}>
            A growing ecosystem to connect FrontFace with your entire stack.
          </p>
        </div>

        <div className="reveal" style={{ display: "flex", flexWrap: "wrap", gap: 9, justifyContent: "center", marginBottom: 36 }}>
          {categories.map((c, i) => {
            const on = i === 0;
            return (
              <span
                key={c}
                style={{
                  padding: "8px 15px",
                  borderRadius: 99,
                  fontSize: 13,
                  fontWeight: 600,
                  border: "1px solid " + (on ? "var(--ff-ink)" : "var(--ff-line-2)"),
                  background: on ? "var(--ff-ink)" : "#fff",
                  color: on ? "#fff" : "var(--ff-soft)",
                }}
              >
                {c}
              </span>
            );
          })}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 18 }}>
          {integrations.map((it, i) => (
            <div key={it.name} className={"reveal ff-cap-card d" + ((i % 3) + 1)} style={{ ...cardStyle, position: "relative" }}>
              {slugMap[it.name] && (
                <Link href={`/integrations/${slugMap[it.name]}`} aria-label={`${it.name} integration`} style={{ position: "absolute", inset: 0, zIndex: 0 }} />
              )}
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
                <span style={{ width: 40, height: 40, borderRadius: 11, background: "var(--ff-accent-soft)", color: "var(--ff-accent-2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Code className="w-5 h-5" />
                </span>
                <StatusBadge status={it.status} />
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".06em", color: "var(--ff-muted)", textTransform: "uppercase" }}>{it.category}</span>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--ff-ink)", letterSpacing: "-.01em", marginTop: 4, marginBottom: 7 }}>{it.name}</h3>
              <p style={{ fontSize: 13.5, lineHeight: 1.55, color: "var(--ff-soft)", textWrap: "pretty" }}>{it.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* One line of code (dark) */}
      <section style={{ ...WRAP, padding: "clamp(32px,5vh,64px) clamp(20px,5vw,40px)" }}>
        <div
          className="reveal ff-code-split"
          style={{
            position: "relative",
            overflow: "hidden",
            borderRadius: 24,
            background: "linear-gradient(160deg,#11151b,#0d1117)",
            color: "#fff",
            padding: "clamp(32px,4vw,56px)",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "clamp(28px,4vw,48px)",
            alignItems: "center",
          }}
        >
          <div
            className="lattice"
            style={
              {
                position: "absolute",
                inset: 0,
                "--lt": "rgba(255,255,255,.045)",
                "--lt-size": "60px",
                maskImage: "radial-gradient(120% 100% at 0% 0%, #000 30%, transparent 80%)",
                WebkitMaskImage: "radial-gradient(120% 100% at 0% 0%, #000 30%, transparent 80%)",
              } as CSSProperties
            }
          />
          <div style={{ position: "relative" }}>
            <Eyebrow light>Simple setup</Eyebrow>
            <h2 style={{ fontSize: "clamp(26px,3.4vw,38px)", fontWeight: 800, letterSpacing: "-.03em", lineHeight: 1.08, textWrap: "balance" }}>
              One line of code.
            </h2>
            <p style={{ fontSize: 15.5, lineHeight: 1.6, color: "rgba(255,255,255,.62)", marginTop: 14, marginBottom: 22, textWrap: "pretty" }}>
              Adding FrontFace is as simple as pasting one line. No technical skills, no build step — works with any website
              builder or custom site.
            </p>
            <Link href="/login" style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 14.5, fontWeight: 600, color: "#fff" }}>
              Get started free {Ic("arrowR", { size: 16 })}
            </Link>
          </div>
          <div style={{ position: "relative", borderRadius: 14, overflow: "hidden", border: "1px solid rgba(255,255,255,.1)", background: "#0b0e13" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "10px 14px", borderBottom: "1px solid rgba(255,255,255,.08)" }}>
              {["#3a4150", "#2f3543", "#262b37"].map((c) => (
                <span key={c} style={{ width: 9, height: 9, borderRadius: 99, background: c }} />
              ))}
              <span className="mono" style={{ marginLeft: 6, fontSize: 11, color: "rgba(255,255,255,.4)" }}>index.html</span>
            </div>
            <pre className="mono" style={{ margin: 0, padding: "16px 16px", fontSize: 12.5, lineHeight: 1.75, color: "rgba(255,255,255,.85)", overflowX: "auto" }}>
              <span style={{ color: "#6b7686" }}>&lt;!-- Add before &lt;/body&gt; --&gt;</span>
              {"\n"}
              <span style={{ color: "#7aa2f7" }}>&lt;script</span>
              {"\n  "}
              <span style={{ color: "#9ece6a" }}>src</span>=<span style={{ color: "#e0af68" }}>&quot;https://cdn.frontface.app/widget.js&quot;</span>
              {"\n  "}
              <span style={{ color: "#9ece6a" }}>data-agent-id</span>=<span style={{ color: "#e0af68" }}>&quot;your-agent-id&quot;</span>
              {"\n"}
              <span style={{ color: "#7aa2f7" }}>&gt;&lt;/script&gt;</span>
            </pre>
          </div>
        </div>
      </section>

      <DarkCta
        title="Add AI support to your site in 5 minutes."
        sub="Works with any website. Free during beta."
        secondaryLabel="Request an integration"
        secondaryHref="mailto:hello@frontface.app"
      />
    </main>
  );
}
