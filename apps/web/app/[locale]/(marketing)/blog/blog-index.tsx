"use client";

import { useMemo, useState, type CSSProperties } from "react";

import { Link } from "@/i18n/navigation";

import { Btn } from "../components/marketing-button";
import { Eyebrow, Ic, WRAP } from "../components/marketing-kit";

import type { BlogPost } from "./blog-data";
import { Cover, coverKindFor } from "./cover-scene";

function fmt(date: string) {
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function BlogIndex({ posts }: { posts: BlogPost[] }) {
  const cats = useMemo(() => ["All", ...Array.from(new Set(posts.map((p) => p.category)))], [posts]);
  const [active, setActive] = useState("All");

  const featured = posts[0];
  const grid = useMemo(() => (active === "All" ? posts.slice(1) : posts.filter((p) => p.category === active)), [active, posts]);

  return (
    <div style={{ overflowX: "hidden" }}>
      {/* hero */}
      <section style={{ position: "relative", overflow: "hidden", paddingTop: "clamp(44px,6vh,72px)", paddingBottom: "clamp(28px,4vh,44px)" }}>
        <div
          className="lattice"
          style={
            {
              position: "absolute",
              inset: 0,
              "--lt": "rgba(17,21,27,.045)",
              "--lt-size": "70px",
              maskImage: "radial-gradient(120% 80% at 50% 10%, #000 30%, transparent 76%)",
              WebkitMaskImage: "radial-gradient(120% 80% at 50% 10%, #000 30%, transparent 76%)",
            } as CSSProperties
          }
        />
        <div style={{ ...WRAP, position: "relative", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div className="reveal in">
            <Eyebrow center>The FrontFace blog</Eyebrow>
          </div>
          <h1
            className="reveal in d1"
            style={{ fontSize: "clamp(34px,5.4vw,60px)", fontWeight: 800, letterSpacing: "-.03em", color: "var(--ff-ink)", lineHeight: 1.04, textWrap: "balance", maxWidth: 760 }}
          >
            Field notes on AI customer support.
          </h1>
          <p
            className="reveal in d2"
            style={{ fontSize: "clamp(16px,1.6vw,18px)", lineHeight: 1.55, color: "var(--ff-soft)", maxWidth: 560, marginTop: 18, textWrap: "pretty" }}
          >
            Playbooks, feature deep-dives and real use cases — on answering customers, capturing leads, and deploying
            agents that actually know your product.
          </p>
          <div className="reveal in d3" style={{ display: "flex", alignItems: "center", gap: 9, marginTop: 26, flexWrap: "wrap", justifyContent: "center" }}>
            {cats.map((c) => {
              const on = c === active;
              return (
                <button
                  key={c}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setActive(c)}
                  style={{
                    padding: "9px 16px",
                    borderRadius: 99,
                    fontSize: 13.5,
                    fontWeight: 600,
                    border: "1px solid " + (on ? "var(--ff-ink)" : "var(--ff-line-2)"),
                    background: on ? "var(--ff-ink)" : "#fff",
                    color: on ? "#fff" : "var(--ff-soft)",
                    transition: "all .15s",
                  }}
                >
                  {c}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* featured */}
      {active === "All" && (
        <section style={{ ...WRAP, padding: "clamp(20px,3vh,32px) clamp(20px,5vw,40px) clamp(28px,4vh,44px)" }}>
          <Link
            href={`/blog/${featured.slug}`}
            className="reveal in ff-blog-feat"
            style={{
              display: "grid",
              gridTemplateColumns: "1.05fr 1fr",
              background: "var(--ff-card)",
              border: "1px solid var(--ff-line)",
              borderRadius: 22,
              overflow: "hidden",
              boxShadow: "0 4px 18px -10px rgba(16,24,40,.14)",
              transition: "transform .2s, box-shadow .2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-3px)";
              e.currentTarget.style.boxShadow = "0 28px 56px -28px rgba(16,24,40,.3)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "none";
              e.currentTarget.style.boxShadow = "0 4px 18px -10px rgba(16,24,40,.14)";
            }}
          >
            <Cover kind={coverKindFor(featured)} big />
            <div style={{ padding: "clamp(28px,3.5vw,44px)", display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
                <span style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: ".06em", color: "#fff", background: "var(--ff-ink)", padding: "4px 10px", borderRadius: 99 }}>FEATURED</span>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ff-soft)" }}>{featured.category}</span>
              </div>
              <h2 style={{ fontSize: "clamp(24px,2.6vw,33px)", fontWeight: 800, letterSpacing: "-.025em", color: "var(--ff-ink)", lineHeight: 1.12, textWrap: "balance" }}>
                {featured.title}
              </h2>
              <p style={{ fontSize: 15.5, lineHeight: 1.6, color: "var(--ff-soft)", marginTop: 14, textWrap: "pretty" }}>{featured.description}</p>
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 24, fontSize: 13, color: "var(--ff-muted)" }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontWeight: 600, color: "var(--ff-ink)" }}>Read article {Ic("arrowR", { size: 15 })}</span>
                <span style={{ width: 3, height: 3, borderRadius: 99, background: "var(--ff-faint)" }} />
                <span>{featured.readTime}</span>
                <span style={{ width: 3, height: 3, borderRadius: 99, background: "var(--ff-faint)" }} />
                <span>{fmt(featured.date)}</span>
              </div>
            </div>
          </Link>
        </section>
      )}

      {/* grid */}
      <section style={{ ...WRAP, padding: "0 clamp(20px,5vw,40px) clamp(48px,7vh,90px)" }}>
        <div className="ff-blog-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 20 }}>
          {grid.map((p, i) => (
            <Link
              key={p.slug}
              href={`/blog/${p.slug}`}
              className={"reveal in d" + ((i % 3) + 1)}
              style={{
                display: "flex",
                flexDirection: "column",
                background: "var(--ff-card)",
                border: "1px solid var(--ff-line)",
                borderRadius: 18,
                overflow: "hidden",
                transition: "transform .2s, box-shadow .2s, border-color .2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-4px)";
                e.currentTarget.style.boxShadow = "0 22px 46px -26px rgba(16,24,40,.3)";
                e.currentTarget.style.borderColor = "var(--ff-line-2)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "none";
                e.currentTarget.style.boxShadow = "none";
                e.currentTarget.style.borderColor = "var(--ff-line)";
              }}
            >
              <Cover kind={coverKindFor(p)} />
              <div style={{ padding: "20px 22px 22px", display: "flex", flexDirection: "column", flex: 1 }}>
                <span style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: ".05em", color: "var(--ff-soft)", textTransform: "uppercase", marginBottom: 11 }}>{p.category}</span>
                <h3 style={{ fontSize: 18.5, fontWeight: 700, letterSpacing: "-.015em", color: "var(--ff-ink)", lineHeight: 1.2, textWrap: "balance" }}>{p.title}</h3>
                <p style={{ fontSize: 13.5, lineHeight: 1.55, color: "var(--ff-soft)", marginTop: 9, textWrap: "pretty", flex: 1 }}>{p.description}</p>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 18, fontSize: 12.5, color: "var(--ff-muted)" }}>
                  <span>{fmt(p.date)}</span>
                  <span style={{ width: 3, height: 3, borderRadius: 99, background: "var(--ff-faint)" }} />
                  <span>{p.readTime}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* newsletter (dark) */}
      <section style={{ position: "relative", overflow: "hidden", background: "linear-gradient(180deg,#11151b,#0c0f14)", color: "#fff", padding: "clamp(56px,9vh,100px) 0" }}>
        <div
          className="lattice"
          style={
            {
              position: "absolute",
              inset: 0,
              "--lt": "rgba(255,255,255,.05)",
              "--lt-size": "64px",
              maskImage: "radial-gradient(80% 90% at 50% 30%, #000 28%, transparent 76%)",
              WebkitMaskImage: "radial-gradient(80% 90% at 50% 30%, #000 28%, transparent 76%)",
            } as CSSProperties
          }
        />
        <div style={{ ...WRAP, position: "relative", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
          <h2 className="reveal" style={{ fontSize: "clamp(28px,4vw,42px)", fontWeight: 800, letterSpacing: "-.03em", lineHeight: 1.08, textWrap: "balance", maxWidth: 560 }}>
            Get the playbooks in your inbox.
          </h2>
          <p className="reveal d1" style={{ fontSize: 16.5, lineHeight: 1.55, color: "rgba(255,255,255,.62)", marginTop: 14, maxWidth: 460, textWrap: "pretty" }}>
            New deep-dives on AI support, lead capture and deployment — once a month, no fluff.
          </p>
          <form
            className="reveal d2 ff-news-form"
            onSubmit={(e) => e.preventDefault()}
            style={{ display: "flex", gap: 10, marginTop: 28, width: "100%", maxWidth: 440 }}
          >
            <input
              type="email"
              placeholder="you@company.com"
              aria-label="Email address"
              style={{ flex: 1, height: 50, borderRadius: 12, border: "1px solid rgba(255,255,255,.16)", background: "rgba(255,255,255,.06)", color: "#fff", padding: "0 16px", fontSize: 15, outline: "none" }}
            />
            <Btn kind="lightPrimary" size="md" style={{ height: 50 }}>
              Subscribe
            </Btn>
          </form>
          <div className="reveal d3" style={{ marginTop: 16, fontSize: 12.5, color: "rgba(255,255,255,.4)" }}>No spam. Unsubscribe anytime.</div>
        </div>
      </section>
    </div>
  );
}
