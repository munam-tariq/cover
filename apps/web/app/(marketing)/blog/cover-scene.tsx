import type { CSSProperties, ReactNode } from "react";

import { Ic, type IconName } from "../components/marketing-kit";

/* cover-scene.tsx - composed blog cover visuals built from the product UI vocabulary. */

export type CoverKind =
  | "rag"
  | "lead"
  | "handoff"
  | "code"
  | "page"
  | "channels"
  | "saas"
  | "market"
  | "chart"
  | "website"
  | "startup"
  | "deflection"
  | "toolkit"
  | "shopify"
  | "wix"
  | "wordpress"
  | "compare"
  | "alternatives"
  | "smallbiz";

const COVER_KINDS = new Set<CoverKind>([
  "rag",
  "lead",
  "handoff",
  "code",
  "page",
  "channels",
  "saas",
  "market",
  "chart",
  "website",
  "startup",
  "deflection",
  "toolkit",
  "shopify",
  "wix",
  "wordpress",
  "compare",
  "alternatives",
  "smallbiz",
]);

/** Deterministically map a post to a cover scene from explicit metadata first, then slug/category. */
export function coverKindFor(post: { slug: string; category?: string; coverKind?: string }): CoverKind {
  if (post.coverKind && (COVER_KINDS as ReadonlySet<string>).has(post.coverKind)) {
    return post.coverKind as CoverKind;
  }

  const s = post.slug.toLowerCase();
  if (/shopify/.test(s)) return "shopify";
  if (/wix/.test(s)) return "wix";
  if (/wordpress/.test(s)) return "wordpress";
  if (/tidio|alternative/.test(s)) return "alternatives";
  if (/zendesk|handoff|escalat/.test(s)) return "handoff";
  if (/small-business/.test(s)) return "smallbiz";
  if (/frontface-vs|chatbase|intercom/.test(s)) return "compare";
  if (/cut-support|ticket|deflect/.test(s)) return "deflection";
  if (/tools/.test(s)) return "toolkit";
  if (/startup/.test(s)) return "startup";
  if (/rag|grounded|hallucinat/.test(s)) return "rag";
  if (/lead|generation/.test(s)) return "lead";
  if (/website|embed|widget|add-ai-chatbot|vibe|coding|build/.test(s)) return "website";
  if (/mcp|integration|channel|protocol/.test(s)) return "channels";
  if (/marketplace|market/.test(s)) return "market";
  if (/analytic|chart|insight|metric/.test(s)) return "chart";
  if (/support|saas/.test(s)) return "saas";

  switch (post.category) {
    case "Tutorial":
      return "code";
    case "Strategy":
      return "saas";
    case "Technology":
      return "rag";
    case "Trends":
      return "chart";
    default:
      return "rag";
  }
}

const coverBackground: Partial<Record<CoverKind, string>> = {
  alternatives: "linear-gradient(150deg,#171313,#2a242b 58%,#0f1014)",
  compare: "linear-gradient(150deg,#11151b,#242835 58%,#10141b)",
  deflection: "linear-gradient(150deg,#101613,#1f2d27 60%,#0d1110)",
  handoff: "linear-gradient(150deg,#15151b,#242735 62%,#0f1117)",
  lead: "linear-gradient(150deg,#12151a,#253124 58%,#0e1210)",
  rag: "linear-gradient(150deg,#11151b,#1b2230 65%,#10141b)",
  shopify: "linear-gradient(150deg,#0f1712,#203325 58%,#0d120f)",
  smallbiz: "linear-gradient(150deg,#121416,#2b2820 58%,#0f1112)",
  startup: "linear-gradient(150deg,#11151b,#202b35 58%,#0f1418)",
  toolkit: "linear-gradient(150deg,#121418,#27292b 58%,#0f1012)",
  website: "linear-gradient(150deg,#101418,#1c2b35 60%,#0e1114)",
  wix: "linear-gradient(150deg,#11151b,#242b3a 58%,#0f1219)",
  wordpress: "linear-gradient(150deg,#11161a,#20303a 58%,#0d1114)",
};

const coverGlow: Partial<Record<CoverKind, string>> = {
  alternatives: "radial-gradient(circle, rgba(245,207,164,.18), transparent 64%)",
  compare: "radial-gradient(circle, rgba(255,255,255,.15), transparent 66%)",
  deflection: "radial-gradient(circle, rgba(143,225,176,.18), transparent 66%)",
  lead: "radial-gradient(circle, rgba(212,241,196,.17), transparent 66%)",
  shopify: "radial-gradient(circle, rgba(174,236,153,.18), transparent 66%)",
  smallbiz: "radial-gradient(circle, rgba(242,211,153,.18), transparent 66%)",
  startup: "radial-gradient(circle, rgba(173,218,239,.15), transparent 66%)",
  toolkit: "radial-gradient(circle, rgba(235,232,218,.14), transparent 66%)",
  website: "radial-gradient(circle, rgba(151,213,235,.16), transparent 66%)",
  wix: "radial-gradient(circle, rgba(181,196,255,.16), transparent 66%)",
  wordpress: "radial-gradient(circle, rgba(164,213,235,.16), transparent 66%)",
};

const rowBase = (hot: boolean): CSSProperties => ({
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "7px 10px",
  borderRadius: 9,
  background: hot ? "rgba(255,255,255,.16)" : "rgba(255,255,255,.055)",
  border: "1px solid " + (hot ? "rgba(255,255,255,.3)" : "rgba(255,255,255,.1)"),
});

const mono: CSSProperties = { fontSize: 11.5, color: "#fff" };
const badge: CSSProperties = {
  marginLeft: "auto",
  fontSize: 9,
  fontWeight: 800,
  letterSpacing: ".05em",
  color: "#11151b",
  background: "#fff",
  padding: "2px 7px",
  borderRadius: 99,
};

function SceneLabel({ icon, children }: { icon: IconName; children: ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, color: "rgba(255,255,255,.62)", fontSize: 11, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase" }}>
      {Ic(icon, { size: 15, style: { color: "#fff" } })}
      {children}
    </div>
  );
}

function MiniRow({
  icon,
  label,
  hot = false,
  pill,
  delay = 0,
}: {
  icon: IconName;
  label: string;
  hot?: boolean;
  pill?: string;
  delay?: number;
}) {
  return (
    <div style={{ ...rowBase(hot), position: "relative", overflow: "hidden", animation: "ff-up-sm .5s both", animationDelay: `${delay}s` }}>
      {hot && <span style={{ position: "absolute", top: 0, bottom: 0, width: "40%", background: "linear-gradient(90deg,transparent,rgba(255,255,255,.24),transparent)", animation: `ff-sweep 1.9s ${delay}s ease-in-out infinite` }} />}
      <span style={{ position: "relative", display: "flex", color: hot ? "#fff" : "rgba(255,255,255,.56)" }}>{Ic(icon, { size: 13, sw: hot ? 2.4 : 1.7 })}</span>
      <span className="mono" style={{ ...mono, position: "relative", color: hot ? "#fff" : "rgba(255,255,255,.68)" }}>
        {label}
      </span>
      {pill && <span style={badge}>{pill}</span>}
    </div>
  );
}

function WindowShell({ title, children, maxWidth = 320 }: { title: string; children: ReactNode; maxWidth?: number }) {
  return (
    <div style={{ width: "100%", maxWidth, borderRadius: 12, overflow: "hidden", border: "1px solid rgba(255,255,255,.13)", background: "rgba(7,10,14,.78)", boxShadow: "0 20px 42px -26px rgba(0,0,0,.7)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", borderBottom: "1px solid rgba(255,255,255,.08)" }}>
        {["#525b69", "#434b58", "#363c48"].map((c) => (
          <span key={c} style={{ width: 8, height: 8, borderRadius: 99, background: c }} />
        ))}
        <span className="mono" style={{ marginLeft: 5, fontSize: 10.5, color: "rgba(255,255,255,.45)" }}>
          {title}
        </span>
      </div>
      {children}
    </div>
  );
}

function CoverScene({ kind, big }: { kind: CoverKind; big?: boolean }) {
  const W = (key: IconName, size = 13) => Ic(key, { size, style: { color: "#fff" }, sw: 2 });

  switch (kind) {
    case "website":
      return (
        <WindowShell title="frontface.app" maxWidth={big ? 360 : 320}>
          <div style={{ padding: 13, display: "grid", gridTemplateColumns: "1fr 66px", gap: 11 }}>
            <div>
              <div style={{ height: 9, width: "76%", borderRadius: 99, background: "rgba(255,255,255,.82)", marginBottom: 8 }} />
              <div style={{ height: 7, width: "58%", borderRadius: 99, background: "rgba(255,255,255,.22)", marginBottom: 14 }} />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 7 }}>
                {[0, 1, 2].map((i) => (
                  <span key={i} style={{ height: 34, borderRadius: 8, border: "1px solid rgba(255,255,255,.09)", background: "rgba(255,255,255,.055)", animation: "ff-pop .5s both", animationDelay: `${i * 0.08}s` }} />
                ))}
              </div>
            </div>
            <div style={{ alignSelf: "end", justifySelf: "end", width: 52, height: 52, borderRadius: 16, background: "#fff", color: "#11151b", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 18px 34px -18px rgba(0,0,0,.6)", animation: "ff-float 2.4s ease-in-out infinite" }}>
              {Ic("bot", { size: 24 })}
            </div>
          </div>
        </WindowShell>
      );
    case "startup":
      return (
        <div style={{ width: "100%", maxWidth: 320, display: "flex", flexDirection: "column", gap: 9 }}>
          <SceneLabel icon="bolt">Startup support loop</SceneLabel>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
            {[
              ["42", "open"],
              ["18h", "saved"],
              ["24/7", "live"],
            ].map(([value, label], i) => (
              <div key={label} style={{ padding: "10px 8px", borderRadius: 11, background: i === 1 ? "#fff" : "rgba(255,255,255,.07)", color: i === 1 ? "#11151b" : "#fff", border: "1px solid rgba(255,255,255,.12)", animation: "ff-pop .5s both", animationDelay: `${i * 0.08}s` }}>
                <div style={{ fontSize: 20, fontWeight: 800, lineHeight: 1 }}>{value}</div>
                <div style={{ marginTop: 4, fontSize: 9.5, fontWeight: 800, letterSpacing: ".07em", textTransform: "uppercase", opacity: 0.68 }}>{label}</div>
              </div>
            ))}
          </div>
          <MiniRow icon="clock" label="after-hours questions" hot pill="AUTO" delay={0.12} />
        </div>
      );
    case "deflection":
      return (
        <div style={{ width: "100%", maxWidth: 338, display: "grid", gridTemplateColumns: "1fr auto 112px", alignItems: "center", gap: 11 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            <MiniRow icon="mail" label="refund?" delay={0} />
            <MiniRow icon="doc" label="setup?" delay={0.07} />
            <MiniRow icon="shield" label="security?" delay={0.14} />
          </div>
          <span style={{ color: "rgba(255,255,255,.7)", animation: "ff-float 1.8s ease-in-out infinite" }}>{Ic("arrowR", { size: 22 })}</span>
          <div style={{ borderRadius: 16, background: "#fff", color: "#11151b", padding: "14px 12px", textAlign: "center", boxShadow: "0 20px 40px -24px rgba(0,0,0,.7)" }}>
            <div style={{ fontSize: 34, fontWeight: 800, letterSpacing: "-.04em", lineHeight: 1 }}>74%</div>
            <div style={{ marginTop: 4, fontSize: 10.5, fontWeight: 800, color: "#5b6470" }}>resolved first</div>
            <div style={{ height: 6, borderRadius: 99, background: "#eceff3", marginTop: 11, overflow: "hidden" }}>
              <div style={{ width: "74%", height: "100%", borderRadius: 99, background: "linear-gradient(90deg,#11151b,#444c58,#11151b)", backgroundSize: "200% 100%", animation: "ff-shimmer 2.2s linear infinite" }} />
            </div>
          </div>
        </div>
      );
    case "toolkit":
      return (
        <div style={{ width: "100%", maxWidth: 310, display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 9 }}>
          {([
            ["database", "Grounded answers"],
            ["handoff", "Clean handoff"],
            ["target", "Lead capture"],
            ["chart", "Question insights"],
          ] as [IconName, string][]).map(([icon, label], i) => (
            <div key={label} style={{ minHeight: 66, borderRadius: 13, border: "1px solid rgba(255,255,255,.12)", background: i === 0 ? "#fff" : "rgba(255,255,255,.065)", color: i === 0 ? "#11151b" : "#fff", padding: 12, animation: "ff-pop .5s both", animationDelay: `${i * 0.07}s` }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                {Ic(icon, { size: 18 })}
                {i < 3 && <span style={{ width: 7, height: 7, borderRadius: 99, background: i === 0 ? "#11151b" : "#fff" }} />}
              </div>
              <div style={{ marginTop: 10, fontSize: 11.5, fontWeight: 800, lineHeight: 1.25 }}>{label}</div>
            </div>
          ))}
        </div>
      );
    case "shopify":
      return (
        <div style={{ width: "100%", maxWidth: 306, display: "flex", flexDirection: "column", gap: 9 }}>
          <SceneLabel icon="grid">Store support</SceneLabel>
          <div style={{ borderRadius: 15, background: "#fff", color: "#11151b", padding: 13, boxShadow: "0 20px 42px -26px rgba(0,0,0,.7)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 9 }}>
              <strong style={{ fontSize: 13 }}>Order #1842</strong>
              <span style={{ fontSize: 9, fontWeight: 800, borderRadius: 99, padding: "2px 7px", background: "#11151b", color: "#fff" }}>ANSWERED</span>
            </div>
            {["Shipping ETA", "Return window", "Size guide"].map((label, i) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 7, padding: "7px 0", borderTop: i ? "1px solid #eef0f3" : 0, fontSize: 11.5, color: "#525c68", animation: "ff-up-sm .45s both", animationDelay: `${i * 0.08}s` }}>
                {Ic("check", { size: 13 })} {label}
              </div>
            ))}
          </div>
        </div>
      );
    case "wix":
      return (
        <WindowShell title="Wix HTML embed" maxWidth={315}>
          <pre className="mono" style={{ margin: 0, padding: "13px 14px", fontSize: 11.2, lineHeight: 1.65, color: "rgba(255,255,255,.86)" }}>
            <span style={{ color: "#7aa2f7" }}>&lt;iframe</span>
            {"\n  "}
            <span style={{ color: "#9ece6a" }}>src</span>=<span style={{ color: "#e0af68" }}>&quot;/frontface&quot;</span>
            {"\n  "}
            <span style={{ color: "#9ece6a" }}>style</span>=<span style={{ color: "#e0af68" }}>&quot;fixed&quot;</span>
            {"\n"}
            <span style={{ color: "#7aa2f7" }}>/&gt;</span>
            <span style={{ display: "inline-block", width: 7, height: 14, background: "#fff", marginLeft: 3, verticalAlign: "-2px", animation: "ff-blink 1s steps(1) infinite" }} />
          </pre>
        </WindowShell>
      );
    case "wordpress":
      return (
        <div style={{ width: "100%", maxWidth: 294, display: "grid", gridTemplateColumns: "72px 1fr", gap: 12, alignItems: "center" }}>
          <div style={{ width: 66, height: 66, borderRadius: "50%", background: "#fff", color: "#11151b", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30, fontWeight: 800, boxShadow: "0 18px 34px -20px rgba(0,0,0,.7)" }}>W</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            <MiniRow icon="text" label="theme header" delay={0} />
            <MiniRow icon="doc" label="faq block" delay={0.08} />
            <MiniRow icon="code" label="script snippet" hot pill="NO PLUGIN" delay={0.16} />
          </div>
        </div>
      );
    case "compare":
      return (
        <div style={{ width: "100%", maxWidth: 336, display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
          {[
            ["FrontFace", "5m", true],
            ["Chatbase", "2h", false],
            ["Intercom", "suite", false],
          ].map(([name, setup, hot], i) => (
            <div key={name as string} style={{ borderRadius: 13, border: "1px solid " + (hot ? "rgba(255,255,255,.72)" : "rgba(255,255,255,.12)"), background: hot ? "#fff" : "rgba(255,255,255,.06)", color: hot ? "#11151b" : "#fff", padding: "12px 10px", animation: "ff-pop .5s both", animationDelay: `${i * 0.08}s` }}>
              <div style={{ fontSize: 11.5, fontWeight: 800, whiteSpace: "nowrap" }}>{name}</div>
              <div style={{ marginTop: 13, height: 6, borderRadius: 99, background: hot ? "#e7ebef" : "rgba(255,255,255,.14)", overflow: "hidden" }}>
                <div style={{ width: hot ? "92%" : i === 1 ? "68%" : "54%", height: "100%", borderRadius: 99, background: hot ? "#11151b" : "#fff" }} />
              </div>
              <div style={{ marginTop: 10, fontSize: 10, fontWeight: 800, opacity: 0.68 }}>setup {setup}</div>
            </div>
          ))}
        </div>
      );
    case "alternatives":
      return (
        <div style={{ width: "100%", maxWidth: 316, display: "flex", flexDirection: "column", gap: 8 }}>
          {[
            ["Tidio", "live chat first", false],
            ["Crisp", "shared inbox", false],
            ["FrontFace", "AI resolves first", true],
          ].map(([name, label, hot], i) => (
            <div key={name as string} style={{ ...rowBase(Boolean(hot)), animation: "ff-up-sm .5s both", animationDelay: `${i * 0.08}s` }}>
              <span style={{ width: 28, height: 28, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", background: hot ? "#fff" : "rgba(255,255,255,.08)", color: hot ? "#11151b" : "#fff" }}>
                {Ic(hot ? "bot" : "mail", { size: hot ? 15 : 14 })}
              </span>
              <span style={{ color: "#fff", fontSize: 12.5, fontWeight: 800 }}>{name}</span>
              <span style={{ marginLeft: "auto", color: "rgba(255,255,255,.68)", fontSize: 10.5, fontWeight: 700 }}>{label}</span>
            </div>
          ))}
        </div>
      );
    case "smallbiz":
      return (
        <div style={{ width: "100%", maxWidth: 312, display: "grid", gridTemplateColumns: "108px 1fr", gap: 11, alignItems: "center" }}>
          <div style={{ borderRadius: 15, background: "#fff", color: "#11151b", padding: "14px 12px", boxShadow: "0 18px 36px -22px rgba(0,0,0,.7)" }}>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: ".08em", color: "#68717d" }}>OPEN</div>
            <div style={{ marginTop: 6, fontSize: 26, fontWeight: 800, lineHeight: 1 }}>24/7</div>
            <div style={{ marginTop: 10, display: "flex", gap: 4 }}>
              {[0, 1, 2].map((i) => (
                <span key={i} style={{ width: 14, height: 14, borderRadius: "50%", background: "#11151b", opacity: 1 - i * 0.24 }} />
              ))}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            <MiniRow icon="user" label="pricing?" delay={0} />
            <MiniRow icon="book" label="services?" delay={0.08} />
            <MiniRow icon="check" label="answered" hot pill="NOW" delay={0.16} />
          </div>
        </div>
      );
    case "rag":
      return (
        <div style={{ width: "100%", maxWidth: big ? 380 : 300, display: "flex", flexDirection: "column", gap: 9 }}>
          <SceneLabel icon="database">Knowledge base</SceneLabel>
          {([["/security", true], ["/pricing", true], ["/faq", false]] as [string, boolean][]).map(([path, hot], i) => (
            <MiniRow key={path} icon={hot ? "check" : "file"} label={path} hot={hot} pill={hot ? "MATCH" : undefined} delay={i * 0.08} />
          ))}
        </div>
      );
    case "lead":
      return (
        <div style={{ width: "100%", maxWidth: 280, display: "flex", flexDirection: "column", gap: 10 }}>
          <SceneLabel icon="user">Lead capture</SceneLabel>
          <div style={{ ...rowBase(false), color: "rgba(255,255,255,.85)", fontSize: 12.5 }}>
            {Ic("mail", { size: 14, style: { color: "rgba(255,255,255,.7)" } })}
            <span className="mono">you@company.com</span>
            <span style={{ marginLeft: "auto", width: 1.5, height: 13, background: "#fff", animation: "ff-blink 1s steps(1) infinite" }} />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <span style={{ flex: 1, textAlign: "center", padding: "8px 0", borderRadius: 9, background: "#fff", color: "#11151b", fontSize: 12, fontWeight: 800 }}>Share and continue</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.72)" }}>{W("check")} Captured - routed to your team</div>
        </div>
      );
    case "handoff":
      return (
        <div style={{ width: "100%", maxWidth: 290, display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14 }}>
            <span style={{ width: 46, height: 46, borderRadius: 13, background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.14)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>{Ic("bot", { size: 22 })}</span>
            <span style={{ display: "flex", color: "rgba(255,255,255,.6)", animation: "ff-float 1.8s ease-in-out infinite" }}>{Ic("arrowR", { size: 22, style: { color: "#fff" } })}</span>
            <span style={{ width: 46, height: 46, borderRadius: 99, background: "linear-gradient(150deg,#fff,#d8dbe1)", color: "#11151b", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 14 }}>DR</span>
          </div>
          <div style={{ ...rowBase(false), justifyContent: "center", color: "rgba(255,255,255,.82)", fontSize: 12, fontWeight: 700 }}>{W("handoff")} Routed with full context</div>
        </div>
      );
    case "code":
      return (
        <WindowShell title="index.html">
          <pre className="mono" style={{ margin: 0, padding: "12px 13px", fontSize: 11.5, lineHeight: 1.65, color: "rgba(255,255,255,.85)" }}>
            <span style={{ color: "#7aa2f7" }}>&lt;script</span>
            {"\n  "}
            <span style={{ color: "#9ece6a" }}>src</span>=<span style={{ color: "#e0af68" }}>&quot;frontface.app/widget.js&quot;</span>
            {"\n  "}
            <span style={{ color: "#9ece6a" }}>data-agent-id</span>=<span style={{ color: "#e0af68" }}>&quot;you&quot;</span>
            {"\n"}
            <span style={{ color: "#7aa2f7" }}>&gt;&lt;/script&gt;</span>
            <span style={{ display: "inline-block", width: 7, height: 14, background: "#fff", marginLeft: 3, verticalAlign: "-2px", animation: "ff-blink 1s steps(1) infinite" }} />
          </pre>
        </WindowShell>
      );
    case "page":
      return (
        <div style={{ width: "100%", maxWidth: 230, borderRadius: 14, overflow: "hidden", background: "#fff", color: "#1c2530", boxShadow: "0 18px 40px -18px rgba(0,0,0,.6)" }}>
          <div style={{ padding: "13px 14px 11px", textAlign: "center", borderBottom: "1px solid #eef0f3" }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: "#11151b", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 7px" }}>{Ic("bot", { size: 18 })}</div>
            <div className="mono" style={{ fontSize: 10, color: "#8b95a1" }}>frontface.app/acme</div>
          </div>
          <div style={{ padding: 11, display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ alignSelf: "flex-start", maxWidth: "85%", padding: "7px 10px", borderRadius: "4px 10px 10px 10px", background: "#f4f5f7", fontSize: 11, lineHeight: 1.4 }}>Ask me anything.</div>
            <div style={{ alignSelf: "flex-end", padding: "7px 10px", borderRadius: "10px 10px 4px 10px", background: "#11151b", color: "#fff", fontSize: 11 }}>What are your hours?</div>
          </div>
        </div>
      );
    case "channels":
      return (
        <div style={{ width: "100%", maxWidth: 280, display: "flex", flexDirection: "column", gap: 9 }}>
          {([
            ["channels", "Website chat"],
            ["whatsapp", "WhatsApp"],
            ["slack", "Slack"],
          ] as [IconName, string][]).map(([icon, name], i) => (
            <MiniRow key={name} icon={icon} label={name} hot={i === 0} pill={i === 0 ? "LIVE" : undefined} delay={i * 0.08} />
          ))}
        </div>
      );
    case "saas":
      return (
        <div style={{ width: "100%", maxWidth: 280, display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span style={{ fontSize: 52, fontWeight: 800, letterSpacing: "-.03em", color: "#fff", lineHeight: 1 }}>
              68<span style={{ fontSize: 26 }}>%</span>
            </span>
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,.7)", letterSpacing: ".02em" }}>tickets deflected automatically</div>
          <div style={{ width: "100%", height: 8, borderRadius: 99, background: "rgba(255,255,255,.1)", overflow: "hidden" }}>
            <div style={{ width: "68%", height: "100%", borderRadius: 99, background: "#fff" }} />
          </div>
        </div>
      );
    case "market":
      return (
        <div style={{ width: "100%", maxWidth: 300, display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ alignSelf: "flex-start", maxWidth: "82%", padding: "8px 11px", borderRadius: "4px 12px 12px 12px", background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.1)", color: "#fff", fontSize: 11.5, lineHeight: 1.45 }}>Is this inspected before delivery?</div>
          <div style={{ alignSelf: "flex-end", maxWidth: "82%", padding: "8px 11px", borderRadius: "12px 12px 4px 12px", background: "#fff", color: "#11151b", fontSize: 11.5, lineHeight: 1.45, fontWeight: 600 }}>Yes - every item passes a quality check.</div>
          <div style={{ alignSelf: "flex-start", display: "inline-flex", alignItems: "center", gap: 5, fontSize: 10, color: "rgba(255,255,255,.6)" }}>
            <span className="mono" style={{ background: "rgba(255,255,255,.1)", padding: "2px 7px", borderRadius: 99 }}>/inspection</span>
          </div>
        </div>
      );
    case "chart":
      return (
        <div style={{ width: "100%", maxWidth: 280, display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 10, height: big ? 150 : 100 }}>
          {[42, 70, 55, 88, 64, 96].map((height, i) => (
            <div key={i} style={{ width: 22, height: `${height}%`, borderRadius: "6px 6px 0 0", background: i === 5 ? "#fff" : "rgba(255,255,255,.22)", animation: "ff-pop .65s cubic-bezier(.2,.7,.2,1) both", animationDelay: `${i * 0.08}s`, transformOrigin: "bottom" }} />
          ))}
        </div>
      );
    default:
      return null;
  }
}

export function Cover({ kind, big = false, height }: { kind: CoverKind; big?: boolean; height?: number }) {
  return (
    <div
      aria-hidden="true"
      style={{
        position: "relative",
        overflow: "hidden",
        background: coverBackground[kind] ?? "linear-gradient(150deg,#11151b,#1b2230 65%,#10141b)",
        height: height ?? (big ? "100%" : 184),
        minHeight: big ? 300 : height ?? 184,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: big ? "32px" : "24px",
      }}
    >
      <div
        className="lattice"
        style={
          {
            position: "absolute",
            inset: 0,
            "--lt": "rgba(255,255,255,.06)",
            "--lt-size": "40px",
            maskImage: "radial-gradient(120% 100% at 70% 20%, #000 30%, transparent 82%)",
            WebkitMaskImage: "radial-gradient(120% 100% at 70% 20%, #000 30%, transparent 82%)",
          } as CSSProperties
        }
      />
      <div style={{ position: "absolute", top: "-22%", right: "-16%", width: 280, height: 280, borderRadius: "50%", background: coverGlow[kind] ?? "radial-gradient(circle, rgba(255,255,255,.1), transparent 66%)" }} />
      <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", width: "100%" }}>
        <CoverScene kind={kind} big={big} />
      </div>
    </div>
  );
}
