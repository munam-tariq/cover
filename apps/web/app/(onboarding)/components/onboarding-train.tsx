"use client";

/**
 * Train step — website input + "other sources" drawer (File / Text / Q&A).
 * Sources are staged client-side and uploaded by the flow when training starts.
 */
import React, { useRef, useState } from "react";
import { createPortal } from "react-dom";

import { Ic, field, sourceIcon } from "./onboarding-kit";
import { Btn, Heading } from "./onboarding-ui";

export type StagedSource =
  | { type: "file"; name: string; meta: string; file: File }
  | { type: "text"; name: string; meta: string; content: string }
  | { type: "qa"; name: string; meta: string; question: string; answer: string };

const SRC_TILES: [string, string, string, string][] = [
  ["file", "file", "File", "PDF or TXT"],
  ["text", "text", "Paste text", "Notes, policies, FAQs"],
  ["qa", "qa", "Q&A pair", "Question + answer"],
];
const DRAWER_TITLE: Record<string, string> = { file: "Add file", text: "Add text", qa: "Add Q&A pair" };
const DRAWER_SUB: Record<string, string> = {
  file: "Upload a document to train your agent.",
  text: "Add plain text — notes, policies, FAQs.",
  qa: "Craft a question and the answer to give.",
};
const drawerLabel: React.CSSProperties = { fontSize: 13, fontWeight: 600, color: "var(--text)", display: "block", marginBottom: 8 };

export function TrainStep({
  website, onWebsite, sources, onAddSource, onRemoveSource,
}: {
  website: string;
  onWebsite: (v: string) => void;
  sources: StagedSource[];
  onAddSource: (s: StagedSource) => void;
  onRemoveSource: (i: number) => void;
}) {
  const [f, setF] = useState(false);
  const [open, setOpen] = useState<null | "file" | "text" | "qa">(null);
  const [tTitle, setTTitle] = useState("");
  const [tBody, setTBody] = useState("");
  const [qQ, setQQ] = useState("");
  const [qA, setQA] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  function pickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const mb = Math.max(0.1, file.size / 1024 / 1024);
    onAddSource({ type: "file", name: file.name, meta: `${mb.toFixed(1)} MB`, file });
    setOpen(null);
    if (fileRef.current) fileRef.current.value = "";
  }
  function addText() {
    if (!tBody.trim()) return;
    onAddSource({ type: "text", name: tTitle.trim() || "Text snippet", meta: `${tBody.trim().length} chars`, content: tBody.trim() });
    setTTitle(""); setTBody(""); setOpen(null);
  }
  function addQA() {
    if (!qQ.trim() || !qA.trim()) return;
    onAddSource({ type: "qa", name: qQ.trim(), meta: "Q&A pair", question: qQ.trim(), answer: qA.trim() });
    setQQ(""); setQA(""); setOpen(null);
  }

  return (
    <div>
      <Heading title="Train your agent" sub="Point us at your site and we'll read every page. Add files, text, or Q&A to fill any gaps." />

      <div style={{ marginBottom: 22 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>Your website</label>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".04em", color: "var(--accent)", background: "var(--accent-soft)", padding: "3px 9px", borderRadius: 99 }}>RECOMMENDED</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", height: 50, borderRadius: 12, overflow: "hidden", background: "var(--field)", border: `1.5px solid ${f ? "var(--ink)" : "var(--line-2)"}`, boxShadow: f ? "0 0 0 4px rgba(17,21,27,.06)" : "none", transition: "all .15s" }}>
          <span className="mono" style={{ display: "flex", alignItems: "center", height: "100%", padding: "0 12px", fontSize: 13.5, color: "var(--muted)", background: "#f4f5f7", borderRight: "1px solid var(--line-2)" }}>https://</span>
          <input value={website} onChange={(e) => onWebsite(e.target.value)} onFocus={() => setF(true)} onBlur={() => setF(false)}
            placeholder="www.yourcompany.com" style={{ flex: 1, height: "100%", border: "none", outline: "none", padding: "0 14px", fontSize: 15, color: "var(--text)", background: "transparent" }} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 9, fontSize: 13, color: "var(--muted)" }}>
          {Ic("globe", { size: 14 })} We&apos;ll crawl pages on this domain to train your agent.
        </div>
      </div>

      <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", display: "block", marginBottom: 9 }}>Other sources <span style={{ color: "var(--muted)", fontWeight: 500 }}>· optional</span></label>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 9 }}>
        {SRC_TILES.map(([id, ic, label, hint]) => {
          const on = open === id;
          return (
            <button key={id} onClick={() => setOpen(on ? null : (id as "file" | "text" | "qa"))} style={{
              display: "flex", flexDirection: "column", gap: 7, padding: "13px 13px", borderRadius: 13, textAlign: "left", cursor: "pointer", transition: "all .15s",
              border: on ? "1.5px solid var(--ink)" : "1.5px solid var(--line-2)", background: on ? "#fafbfc" : "#fff",
            }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: on ? "var(--ink)" : "#f1f3f5", color: on ? "#fff" : "var(--ink)", display: "flex", alignItems: "center", justifyContent: "center", transition: "all .15s" }}>{Ic(ic, { size: 16 })}</div>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--ink)" }}>{label}</div>
                <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 1 }}>{hint}</div>
              </div>
            </button>
          );
        })}
      </div>

      {open && typeof document !== "undefined" && createPortal(
        <div className="ff-onboard" style={{ position: "fixed", inset: 0, zIndex: 60, display: "flex", justifyContent: "flex-end" }}>
          <div onClick={() => setOpen(null)} style={{ position: "absolute", inset: 0, background: "rgba(17,21,27,.4)", animation: "ff-backdrop .25s ease both" }} />
          <div style={{ position: "relative", width: "min(460px,92vw)", height: "100%", background: "#fff", boxShadow: "-24px 0 70px -20px rgba(0,0,0,.35)", display: "flex", flexDirection: "column", animation: "ff-drawer-in .34s cubic-bezier(.2,.7,.2,1) both" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "18px 20px", borderBottom: "1px solid var(--line)" }}>
              <div style={{ width: 34, height: 34, borderRadius: 9, background: "var(--ink)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>{Ic(open, { size: 17 })}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15.5, fontWeight: 700, color: "var(--ink)" }}>{DRAWER_TITLE[open]}</div>
                <div style={{ fontSize: 12.5, color: "var(--muted)" }}>{DRAWER_SUB[open]}</div>
              </div>
              <button onClick={() => setOpen(null)} style={{ display: "flex", border: "none", background: "transparent", color: "var(--muted)", padding: 6 }} title="Close">{Ic("x", { size: 18 })}</button>
            </div>
            <div className="scroll" style={{ flex: 1, overflowY: "auto", padding: 20 }}>
              {open === "file" && (
                <div onClick={() => fileRef.current && fileRef.current.click()} style={{ border: "1.5px dashed var(--line-2)", borderRadius: 14, padding: "48px 18px", textAlign: "center", cursor: "pointer", background: "#fbfbfc" }}>
                  <div style={{ width: 46, height: 46, borderRadius: 13, margin: "0 auto 12px", background: "#f1f3f5", color: "var(--ink)", display: "flex", alignItems: "center", justifyContent: "center" }}>{Ic("upload", { size: 22 })}</div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text)" }}>Drop a file or <span style={{ textDecoration: "underline" }}>browse</span></div>
                  <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 5 }}>PDF or TXT · up to 10 MB</div>
                  <input ref={fileRef} type="file" accept=".pdf,.txt" onChange={pickFile} style={{ display: "none" }} />
                </div>
              )}
              {open === "text" && (
                <div>
                  <label style={drawerLabel}>Title</label>
                  <input value={tTitle} onChange={(e) => setTTitle(e.target.value)} placeholder="e.g. Refund policy" style={{ ...field(false), height: 46, marginBottom: 16 }} />
                  <label style={drawerLabel}>Content</label>
                  <textarea value={tBody} onChange={(e) => setTBody(e.target.value)} rows={8} placeholder="Paste any text your agent should know…" style={{ ...field(false), height: "auto", padding: "12px 14px", lineHeight: 1.55 }} />
                </div>
              )}
              {open === "qa" && (
                <div>
                  <label style={drawerLabel}>Question</label>
                  <input value={qQ} onChange={(e) => setQQ(e.target.value)} placeholder="e.g. Do you offer a free trial?" style={{ ...field(false), height: 46, marginBottom: 16 }} />
                  <label style={drawerLabel}>Answer</label>
                  <textarea value={qA} onChange={(e) => setQA(e.target.value)} rows={7} placeholder="The answer your agent should give" style={{ ...field(false), height: "auto", padding: "12px 14px", lineHeight: 1.55 }} />
                </div>
              )}
            </div>
            {open !== "file" && (
              <div style={{ padding: "14px 20px", borderTop: "1px solid var(--line)" }}>
                <Btn kind="primary" full onClick={open === "text" ? addText : addQA}>{Ic("plus", { size: 17 })} {open === "text" ? "Add snippet" : "Add Q&A pair"}</Btn>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

      {sources.length > 0 && (
        <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>
          {sources.map((s, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 11, padding: "10px 12px", borderRadius: 11, border: "1px solid var(--line)", background: "#fff", animation: "ff-up-sm .24s ease both" }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, flexShrink: 0, background: "#f1f3f5", color: "var(--ink)", display: "flex", alignItems: "center", justifyContent: "center" }}>{Ic(sourceIcon[s.type], { size: 15 })}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</div>
                <div style={{ fontSize: 11.5, color: "var(--muted)" }}>{s.meta}</div>
              </div>
              <button onClick={() => onRemoveSource(i)} style={{ display: "flex", border: "none", background: "transparent", color: "var(--muted)", padding: 5 }} title="Remove">{Ic("x", { size: 15 })}</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
