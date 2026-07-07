"use client";

/**
 * Extraction + live agent self-test animation. Unlike the reference design (which
 * faked the timeline), this is driven by the REAL crawl status + the backend's
 * 2-question self-test, passed in via `view`.
 */
import { useLocale, useTranslations } from "next-intl";
import React, { useEffect, useRef, useState } from "react";

import { Ic, card, cardLabel, fullCanvas, Lattice, sourceIcon as _si } from "./onboarding-kit";
import { Btn, Logo } from "./onboarding-ui";

export interface SelfTestQA {
  question: string;
  answer: string;
  citations: { url: string; path: string }[];
}

export interface ExtractView {
  statusKey: string;
  pill: { label: string; ic: string; spin: boolean };
  steps: { key: string; label: string; sub: string; state: "pending" | "active" | "done" }[];
  sources: { label: string; type: string }[];
  citedPaths: string[];
  selfTest?: { status: string; questions: SelfTestQA[] };
  error?: string;
}

export interface CompanyChip {
  agentName: string;
  companyName: string;
  domain: string;
  monogram: string;
}

const sourceIcon = _si;

function CoChip({ company, sub }: { company: CompanyChip; sub: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <div style={{ width: 46, height: 46, borderRadius: 13, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 16, color: "#fff", background: "linear-gradient(150deg,var(--ink),var(--ink-3))" }}>{company.monogram}</div>
      <div>
        <div style={{ fontSize: 15.5, fontWeight: 700, color: "var(--ink)", letterSpacing: "-.01em" }}>{company.domain || company.companyName}</div>
        <div style={{ fontSize: 12.5, color: "var(--muted)" }}>{sub}</div>
      </div>
    </div>
  );
}

function StepDot({ state }: { state: "pending" | "active" | "done" }) {
  if (state === "done") return <span style={{ width: 22, height: 22, borderRadius: 99, background: "var(--ink)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{Ic("check", { size: 13, sw: 2.4 })}</span>;
  if (state === "active") return <span style={{ width: 22, height: 22, borderRadius: 99, border: "2.5px solid var(--accent)", borderTopColor: "transparent", animation: "ff-spin .8s linear infinite", flexShrink: 0 }} />;
  return <span style={{ width: 22, height: 22, borderRadius: 99, border: "2px solid var(--line-2)", flexShrink: 0 }} />;
}

function ModelCard({ agentName, instruction }: { agentName: string; instruction: string }) {
  const t = useTranslations("onboarding.extract");
  return (
    <div style={card}>
      <div style={cardLabel}>{t("modelInstructions")}</div>
      <div style={{ animation: "ff-pop .4s ease both" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "10px 12px", borderRadius: 10, border: "1px solid var(--line-2)", background: "#fbfbfc", marginBottom: 11 }}>
          <span style={{ width: 22, height: 22, borderRadius: 6, background: "var(--ink)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>{Ic("spark", { size: 13 })}</span>
          <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)" }}>FrontFace</span>
          <span style={{ marginInlineStart: "auto", fontSize: 11, color: "var(--ok)", fontWeight: 700 }}>● {t("live")}</span>
        </div>
        <div style={{ fontSize: 12.5, lineHeight: 1.6, color: "var(--soft)", minHeight: 72 }}>
          <span style={{ fontWeight: 700, color: "var(--ink)" }}>{agentName}</span> — {instruction}
        </div>
      </div>
    </div>
  );
}

function SourcesCard({ sources, citedPaths }: { sources: { label: string; type: string }[]; citedPaths: string[] }) {
  const t = useTranslations("onboarding.extract");
  return (
    <div style={card}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={cardLabel}>{t("sourcesLabel")}</div>
        <span className="mono" style={{ fontSize: 11.5, color: "var(--muted)" }}>{sources.length}</span>
      </div>
      <div className="scroll" style={{ display: "flex", flexDirection: "column", gap: 2, maxHeight: 188, overflowY: "auto" }}>
        {sources.length === 0 && <div style={{ color: "var(--faint)", fontSize: 12.5, padding: "6px 9px" }}>{t("sourcesEmpty")}</div>}
        {sources.map((s, i) => {
          const hot = s.type === "url" && citedPaths.some((p) => s.label.endsWith(p));
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 9, padding: "7px 9px", borderRadius: 8, animation: "ff-up-sm .3s ease both", background: hot ? "var(--accent-soft)" : "transparent", transition: "background .3s" }}>
              {Ic(sourceIcon[s.type] || "link", { size: 13, style: { color: hot ? "var(--accent)" : "var(--muted)", flexShrink: 0 } })}
              <span className="mono" style={{ fontSize: 12, color: hot ? "var(--accent)" : "var(--text)", fontWeight: hot ? 600 : 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.label}</span>
              {hot && <span style={{ marginInlineStart: "auto", fontSize: 9.5, fontWeight: 700, color: "var(--accent)", letterSpacing: ".04em" }}>{t("cited")}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface ChatMsg {
  role: "user" | "agent";
  text?: string;
  typing?: boolean;
  citations?: { url: string; path: string }[];
}

function Bubble({ m, agentName }: { m: ChatMsg; agentName: string }) {
  const t = useTranslations("onboarding.extract");
  const isRtl = useLocale() === "ar";
  if (m.role === "user") {
    return (
      <div style={{ alignSelf: "flex-end", maxWidth: "82%", animation: `${isRtl ? "ff-in-left" : "ff-in-right"} .32s cubic-bezier(.2,.7,.2,1) both` }}>
        <div style={{ padding: "10px 14px", borderRadius: isRtl ? "14px 14px 14px 4px" : "14px 14px 4px 14px", background: "var(--ink)", color: "#fff", fontSize: 13.5, lineHeight: 1.5 }}>{m.text}</div>
      </div>
    );
  }
  return (
    <div style={{ alignSelf: "flex-start", maxWidth: "88%", animation: "ff-up-sm .3s ease both" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 5 }}>
        <span style={{ width: 19, height: 19, borderRadius: 6, background: "var(--ink)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>{Ic("bot", { size: 12 })}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--ink)" }}>{agentName}</span>
      </div>
      <div style={{ padding: "11px 14px", borderRadius: isRtl ? "14px 4px 14px 14px" : "4px 14px 14px 14px", background: "#fff", border: "1px solid var(--line)", color: "var(--text)", fontSize: 13.5, lineHeight: 1.58, boxShadow: "0 2px 6px -4px rgba(16,24,40,.1)" }}>
        {m.typing ? (
          <span style={{ display: "inline-flex", gap: 4, padding: "2px 0" }}>
            {[0, 1, 2].map((d) => <span key={d} style={{ width: 6, height: 6, borderRadius: 99, background: "var(--muted)", animation: `ff-blink 1.1s ${d * 0.18}s infinite` }} />)}
          </span>
        ) : (
          <span>{m.text}</span>
        )}
      </div>
      {!m.typing && m.citations && m.citations.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600 }}>{t("chatSources")}</span>
          {m.citations.map((c) => (
            <span key={c.url} className="mono" style={{ fontSize: 10.5, color: "var(--ink)", background: "var(--accent-soft)", padding: "3px 8px", borderRadius: 99, fontWeight: 600 }}>{c.path}</span>
          ))}
        </div>
      )}
    </div>
  );
}

function ChatWindow({ agentName, msgs }: { agentName: string; msgs: ChatMsg[] }) {
  const t = useTranslations("onboarding.extract");
  const chatRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [msgs]);
  return (
    <div style={{ borderRadius: 18, background: "#fff", border: "1px solid var(--line)", boxShadow: "0 28px 60px -28px rgba(16,24,40,.28), 0 2px 6px rgba(16,24,40,.04)", overflow: "hidden", display: "flex", flexDirection: "column", height: 446 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "13px 17px", borderBottom: "1px solid var(--line)" }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, background: "var(--ink)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>{Ic("bot", { size: 19 })}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>{agentName}</div>
          <div style={{ fontSize: 11.5, color: "var(--ok)", display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 6, height: 6, borderRadius: 99, background: "var(--ok)" }} /> {t("online")}</div>
        </div>
        <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".05em", color: "var(--muted)", border: "1px solid var(--line-2)", borderRadius: 99, padding: "3px 9px" }}>{t("preview")}</span>
      </div>
      <div ref={chatRef} className="scroll" style={{ flex: 1, overflowY: "auto", padding: "18px 17px", display: "flex", flexDirection: "column", gap: 12, background: "#fcfcfd" }}>
        {msgs.length === 0 && <div style={{ margin: "auto", color: "var(--faint)", fontSize: 13 }}>{t("warmingUp")}</div>}
        {msgs.map((m, i) => <Bubble key={i} m={m} agentName={agentName} />)}
      </div>
    </div>
  );
}

export function ExtractAnimation({ company, view, instruction }: { company: CompanyChip; view: ExtractView; instruction: string }) {
  const t = useTranslations("onboarding.extract");
  const [stage, setStage] = useState<"intro" | "work">("intro");
  const [chat, setChat] = useState<ChatMsg[]>([]);
  const chatStarted = useRef(false);

  useEffect(() => {
    const t = setTimeout(() => setStage("work"), 1900);
    return () => clearTimeout(t);
  }, []);

  // Reveal the real self-test Q&A as a streaming conversation (once).
  useEffect(() => {
    const qs = view.selfTest?.questions || [];
    if (chatStarted.current || qs.length === 0) return;
    chatStarted.current = true;
    const timers: ReturnType<typeof setTimeout>[] = [];
    let t = 300;
    qs.forEach((qa) => {
      timers.push(setTimeout(() => setChat((c) => [...c, { role: "user", text: qa.question }]), t));
      t += 750;
      timers.push(setTimeout(() => setChat((c) => [...c, { role: "agent", typing: true }]), t));
      t += 950;
      timers.push(
        setTimeout(() => setChat((c) => {
          const copy = c.slice();
          copy[copy.length - 1] = { role: "agent", text: qa.answer, citations: qa.citations };
          return copy;
        }), t)
      );
      t += 1200;
    });
    return () => timers.forEach(clearTimeout);
  }, [view.selfTest]);

  if (stage === "intro") {
    return (
      <div style={fullCanvas}>
        <Lattice />
        <div style={{ position: "relative", textAlign: "center", animation: "ff-fade .5s ease both" }}>
          <div style={{ position: "relative", width: 88, height: 88, margin: "0 auto 30px" }}>
            <span style={{ position: "absolute", inset: 0, borderRadius: 24, border: "2px solid var(--accent)", animation: "ff-ring 1.9s ease-out infinite" }} />
            <span style={{ position: "absolute", inset: 0, borderRadius: 24, border: "2px solid var(--accent)", animation: "ff-ring 1.9s ease-out infinite .95s" }} />
            <div style={{ position: "relative", width: 88, height: 88, borderRadius: 24, background: "var(--ink)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 24px 50px -18px rgba(17,21,27,.55)" }}>{Ic("bot", { size: 44 })}</div>
          </div>
          <div style={{ fontSize: "clamp(22px,2.6vw,30px)", fontWeight: 800, letterSpacing: "-.025em", color: "var(--ink)", lineHeight: 1.2, display: "flex", alignItems: "center", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            {t("buildingAgentFor")}
            <span style={{ display: "inline-flex", alignItems: "center", gap: 9 }}>
              <span style={{ width: 38, height: 38, borderRadius: 11, display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 14, color: "#fff", background: "linear-gradient(150deg,var(--ink),var(--ink-3))" }}>{company.monogram}</span>
              {company.companyName}
            </span>
          </div>
          <div className="shimmer-text" style={{ marginTop: 16, fontSize: 16, fontWeight: 600 }}>{t("analyzingSite")}</div>
        </div>
      </div>
    );
  }

  return (
    <div style={fullCanvas}>
      <Lattice />
      <div style={{ position: "relative", width: "100%", maxWidth: 1080, display: "flex", flexDirection: "column", gap: 20, animation: "ff-fade .5s ease both", padding: "0 24px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <CoChip company={company} sub={t("settingUp")} />
          <div style={{ display: "inline-flex", alignItems: "center", gap: 9, padding: "9px 15px", borderRadius: 99, background: "#fff", border: "1px solid var(--line)", boxShadow: "0 2px 8px -4px rgba(16,24,40,.12)" }}>
            <span style={{ display: "flex", color: "var(--ink)", animation: view.pill.spin ? "ff-spin 1s linear infinite" : "none" }}>{Ic(view.pill.spin ? "scan" : view.pill.ic, { size: 16 })}</span>
            <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)" }}>{view.pill.label}</span>
          </div>
        </div>

        {view.error ? (
          <div style={{ ...card, borderColor: "#f3c2c2", background: "#fff7f7" }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#b42318", marginBottom: 4 }}>{t("hitSnag")}</div>
            <div style={{ fontSize: 13, color: "var(--soft)" }}>{view.error}</div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0,360px) minmax(0,1fr)", gap: 20, alignItems: "start" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
              <ModelCard agentName={company.agentName} instruction={instruction} />
              <SourcesCard sources={view.sources} citedPaths={view.citedPaths} />
            </div>
            <ChatWindow agentName={company.agentName} msgs={chat} />
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
          {view.steps.map((s) => (
            <div key={s.key} style={{ display: "flex", alignItems: "center", gap: 11, padding: "12px 14px", borderRadius: 13, background: "#fff", border: "1px solid " + (s.state === "active" ? "var(--line-2)" : "var(--line)"), boxShadow: s.state === "active" ? "0 0 0 3px rgba(17,21,27,.06)" : "none", transition: "all .3s" }}>
              <StepDot state={s.state} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: s.state === "pending" ? "var(--muted)" : "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.label}</div>
                <div style={{ fontSize: 11.5, color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function SuccessScreen({
  company, importedLine, onTest, onDashboard,
}: {
  company: CompanyChip;
  importedLine: string;
  onTest: () => void;
  onDashboard: () => void;
}) {
  const t = useTranslations("onboarding.success");
  return (
    <div style={{ position: "absolute", inset: 0, background: "var(--bg)", overflow: "auto", display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 24px" }} className="scroll">
      <div className="lattice" style={{ position: "absolute", inset: 0, ["--lt" as string]: "rgba(17,21,27,.04)", ["--lt-size" as string]: "70px", maskImage: "radial-gradient(110% 90% at 50% 40%, #000 30%, transparent 78%)", WebkitMaskImage: "radial-gradient(110% 90% at 50% 40%, #000 30%, transparent 78%)" }} />
      <div style={{ position: "absolute", top: 26, insetInlineStart: 30 }}><Logo /></div>
      <div style={{ position: "relative", width: "100%", maxWidth: 540, animation: "ff-up .5s cubic-bezier(.2,.7,.2,1) both" }}>
        <div style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: 22, padding: "34px 34px 30px", boxShadow: "0 40px 80px -40px rgba(16,24,40,.32), 0 2px 8px rgba(16,24,40,.04)", textAlign: "center" }}>
          <div style={{ position: "relative", width: 60, height: 60, margin: "0 auto 18px" }}>
            <span style={{ position: "absolute", inset: -6, borderRadius: 20, background: "radial-gradient(circle, rgba(17,21,27,.13), transparent 70%)" }} />
            <div style={{ position: "relative", width: 60, height: 60, borderRadius: 17, background: "var(--ink)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 16px 32px -12px rgba(17,21,27,.55)" }}>{Ic("check", { size: 30, sw: 2.6 })}</div>
          </div>
          <h1 style={{ fontSize: 27, fontWeight: 800, letterSpacing: "-.025em", color: "var(--ink)" }}>{t("title")}</h1>
          <p style={{ fontSize: 15, color: "var(--soft)", marginTop: 9, lineHeight: 1.5 }}>
            {t.rich("subtitle", {
              agentName: company.agentName,
              b: (chunks) => <strong style={{ color: "var(--ink)" }}>{chunks}</strong>,
            })}
          </p>

          <div style={{ display: "flex", alignItems: "center", gap: 13, padding: "13px 15px", borderRadius: 14, border: "1px solid var(--line)", background: "#fbfbfc", margin: "22px 0 12px", textAlign: "start" }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 15, color: "#fff", background: "linear-gradient(150deg,var(--ink),var(--ink-3))" }}>{company.monogram}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>{company.domain || company.companyName}</div>
              <div style={{ fontSize: 12.5, color: "var(--muted)" }}>{importedLine}</div>
            </div>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: "var(--ink)" }}><span style={{ width: 7, height: 7, borderRadius: 99, background: "var(--ink)" }} /> {t("trained")}</span>
          </div>

          <div style={{ textAlign: "start", border: "1px solid var(--line)", borderRadius: 14, padding: "15px 17px", background: "#fff" }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--soft)", marginBottom: 11, letterSpacing: ".01em" }}>{t("whatsNext")}</div>
            {([
              ["play", t("nextItems.playground")],
              ["grid", t("nextItems.widget")],
              ["sliders", t("nextItems.handoff")],
            ] as [string, string][]).map(([ic, txt], i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 11, padding: "7px 0" }}>
                <span style={{ width: 28, height: 28, borderRadius: 8, background: "#f1f3f5", color: "var(--ink)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{Ic(ic, { size: 15 })}</span>
                <span style={{ fontSize: 14, color: "var(--text)", fontWeight: 500 }}>{txt}</span>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 22 }}>
            <Btn kind="primary" full onClick={onTest}>{Ic("play", { size: 17 })} {t("testAgent")}</Btn>
            <Btn kind="secondary" full onClick={onDashboard}>{Ic("grid", { size: 17 })} {t("goDashboard")}</Btn>
          </div>
        </div>
      </div>
    </div>
  );
}
