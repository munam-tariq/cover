"use client";

/* live-demo.tsx — the hero "answer engine": a looping widget chat beside a
   knowledge-base panel that animates RAG retrieval. Faithful port of
   redesign/landing-demo.jsx, typed, with timer cleanup and a static
   reduced-motion fallback. */

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState, type CSSProperties } from "react";

import type { Locale } from "@/i18n/routing";

import { getLandingData, type Demo } from "../landing-data";

import { Ic } from "./marketing-kit";

function useReducedMotion() {
  const [prefersReduced, setPrefersReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReduced(mq.matches);
    const update = (e: MediaQueryListEvent) => setPrefersReduced(e.matches);
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return prefersReduced;
}

interface Msg {
  id?: number;
  role?: "user" | "agent";
  text?: string;
  streaming?: boolean;
  done?: boolean;
  typing?: boolean;
  kind?: "leadform";
  cites?: string[];
  showCites?: boolean;
  lead?: boolean;
}

function staticTranscript(demo: Demo): Msg[] {
  return [
    { id: 0, role: "agent", text: demo.greeting, done: true },
    { id: 1, role: "user", text: demo.q, done: true },
    { id: 2, role: "agent", text: demo.a, done: true, showCites: true, cites: demo.cites },
    { id: 3, role: "user", text: demo.q2, done: true },
    { id: 4, role: "agent", text: demo.a2, done: true },
    { id: 5, role: "agent", kind: "leadform", done: true },
  ];
}

export function LiveDemo({ demos: demosProp, lock = null }: { demos?: Demo[]; lock?: number | null }) {
  const locale = useLocale() as Locale;
  const t = useTranslations("marketing.liveDemo");
  const demos = demosProp ?? getLandingData(locale).demos;
  const reduce = useReducedMotion();
  const rotating = lock == null;
  const [di, setDi] = useState(0);
  const [runId, setRunId] = useState(0);
  const ei = rotating ? di : Math.min(lock, demos.length - 1);
  const demo = demos[ei];

  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [composer, setComposer] = useState("");
  const [searching, setSearching] = useState(false);
  const [cited, setCited] = useState<string[]>([]);
  const [pill, setPill] = useState<string | null>(null);
  const [fading, setFading] = useState(false);

  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const idxRef = useRef(0);
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const after = (ms: number, fn: () => void) => {
    const id = setTimeout(fn, ms);
    timers.current.push(id);
  };
  const clearAll = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [msgs, composer, searching]);

  useEffect(() => {
    clearAll();
    idxRef.current = 0;

    if (reduce) {
      setMsgs(staticTranscript(demo));
      setComposer("");
      setSearching(false);
      setCited(demo.cites);
      setPill(null);
      setFading(false);
      return;
    }

    setMsgs([]);
    setComposer("");
    setSearching(false);
    setCited([]);
    setPill(null);
    setFading(false);

    /* char-by-char composer typing → resolves when done */
    const typeComposer = (full: string, cps: number, done: () => void) => {
      let i = 0;
      const step = () => {
        i++;
        setComposer(full.slice(0, i));
        if (i < full.length) after(cps, step);
        else after(420, done);
      };
      after(cps, step);
    };

    /* word-by-word streaming of an agent bubble with id `mid` */
    const streamAgent = (
      mid: number,
      full: string,
      opts: { cites?: string[]; lead?: boolean } | undefined,
      done?: () => void,
    ) => {
      const words = full.split(" ");
      let i = 0;
      const tick = () => {
        i++;
        setMsgs((m) => m.map((x) => (x.id === mid ? { ...x, text: words.slice(0, i).join(" ") } : x)));
        if (opts && opts.cites && i === Math.min(3, words.length)) setCited(opts.cites);
        if (i < words.length) after(48, tick);
        else {
          setMsgs((m) =>
            m.map((x) =>
              x.id === mid ? { ...x, text: full, streaming: false, done: true, showCites: !!(opts && opts.cites) } : x,
            ),
          );
          done && done();
        }
      };
      after(40, tick);
    };

    const pushUser = (text: string) => {
      const id = idxRef.current++;
      setMsgs((m) => [...m, { id, role: "user", text, done: true }]);
      return id;
    };
    const pushAgent = (full: string, opts: { cites?: string[]; lead?: boolean } | undefined, done?: () => void) => {
      const id = idxRef.current++;
      setMsgs((m) => [...m, { id, role: "agent", text: "", streaming: true, ...(opts || {}) }]);
      streamAgent(id, full, opts, done);
      return id;
    };
    const pushTyping = () => {
      const id = idxRef.current++;
      setMsgs((m) => [...m, { id, role: "agent", typing: true }]);
      return id;
    };
    const dropTyping = (id: number) => setMsgs((m) => m.filter((x) => x.id !== id));

    // 1. greeting
    after(500, () => {
      const t = pushTyping();
      after(700, () => {
        dropTyping(t);
        pushAgent(demo.greeting, undefined);
      });
    });
    // 2. visitor types first question
    after(2100, () =>
      typeComposer(demo.q, 34, () => {
        setComposer("");
        pushUser(demo.q);
        // 3. search the knowledge base
        after(350, () => {
          setSearching(true);
          setPill(t("searching"));
        });
        after(1500, () => {
          setSearching(false);
          setPill(null);
          // 4. answer with citations
          const tp = pushTyping();
          after(650, () => {
            dropTyping(tp);
            pushAgent(demo.a, { cites: demo.cites }, () => {
              // 5. second question → lead capture
              after(1500, () =>
                typeComposer(demo.q2, 32, () => {
                  setComposer("");
                  pushUser(demo.q2);
                  const tp2 = pushTyping();
                  after(700, () => {
                    dropTyping(tp2);
                    pushAgent(demo.a2, { lead: true }, () => {
                      after(550, () => setMsgs((m) => [...m, { role: "agent", kind: "leadform", done: true }]));
                      // 6. fade + advance
                      after(3200, () => {
                        if (rotating) setFading(true);
                      });
                      after(3800, () => {
                        if (rotating && demos.length > 1) setDi((d) => (d + 1) % demos.length);
                        else setRunId((r) => r + 1);
                      });
                    });
                  });
                }),
              );
            });
          });
        });
      }),
    );

    return clearAll;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ei, runId, reduce]);

  const litCount = cited.length;

  return (
    <div style={{ position: "relative", width: "100%", maxWidth: 1080, margin: "0 auto" }}>
      {/* accent glow behind */}
      <div
        style={{
          position: "absolute",
          inset: "-8% -4%",
          background: "radial-gradient(60% 60% at 30% 30%, rgba(var(--ff-accent-rgb),.13), transparent 70%)",
          filter: "blur(10px)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          position: "relative",
          borderRadius: 20,
          background: "#fff",
          border: "1px solid var(--ff-line)",
          boxShadow: "0 50px 100px -45px rgba(16,24,40,.40), 0 8px 24px -16px rgba(16,24,40,.12)",
          overflow: "hidden",
          transition: "opacity .5s",
          opacity: fading ? 0 : 1,
        }}
      >
        {/* browser chrome */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            padding: "12px 16px",
            borderBottom: "1px solid var(--ff-line)",
            background: "#fbfbfc",
          }}
        >
          <div style={{ display: "flex", gap: 7 }}>
            {["#cfd3da", "#bcc1cb", "#a7adb8"].map((c) => (
              <span key={c} style={{ width: 11, height: 11, borderRadius: 99, background: c }} />
            ))}
          </div>
          <div
            className="mono"
            style={{
              flex: 1,
              maxWidth: 320,
              height: 28,
              borderRadius: 8,
              background: "#fff",
              border: "1px solid var(--ff-line-2)",
              display: "flex",
              alignItems: "center",
              gap: 7,
              padding: "0 12px",
              fontSize: 12,
              color: "var(--ff-muted)",
            }}
          >
            {Ic("shield", { size: 12, style: { color: "var(--ff-ok)" } })} {demo.domain}
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".06em", color: "var(--ff-muted)" }}>
            {demo.tag.toUpperCase()}
          </span>
        </div>

        {/* split body */}
        <div className="ff-demo-grid" style={{ display: "grid", gridTemplateColumns: "minmax(0,300px) minmax(0,1fr)" }}>
          <KBPanel demo={demo} cited={cited} searching={searching} litCount={litCount} />
          {/* chat widget */}
          <div style={{ display: "flex", flexDirection: "column", minWidth: 0, minHeight: 470, maxHeight: 470 }}>
            {/* widget header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 11,
                padding: "14px 18px",
                borderBottom: "1px solid var(--ff-line)",
              }}
            >
              <div
                style={{
                  position: "relative",
                  width: 36,
                  height: 36,
                  borderRadius: 11,
                  background: "var(--ff-ink)",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {Ic("bot", { size: 20 })}
                <span
                  style={{
                    position: "absolute",
                    insetInlineEnd: -2,
                    bottom: -2,
                    width: 11,
                    height: 11,
                    borderRadius: 99,
                    background: "var(--ff-ok)",
                    border: "2px solid #fff",
                  }}
                />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14.5, fontWeight: 700, color: "var(--ff-ink)" }}>{demo.name} Assistant</div>
                <div style={{ fontSize: 12, color: "var(--ff-ok)", display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ width: 6, height: 6, borderRadius: 99, background: "var(--ff-ok)" }} /> Online · instant replies
                </div>
              </div>
              {pill ? (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 7,
                    padding: "6px 12px",
                    borderRadius: 99,
                    background: "var(--ff-accent-soft)",
                    color: "var(--ff-accent-2)",
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  <span style={{ display: "flex", animation: "ff-spin 1s linear infinite" }}>{Ic("scan", { size: 13 })}</span>
                  {pill}
                </span>
              ) : (
                <span
                  style={{
                    fontSize: 10.5,
                    fontWeight: 700,
                    letterSpacing: ".05em",
                    color: "var(--ff-muted)",
                    border: "1px solid var(--ff-line-2)",
                    borderRadius: 99,
                    padding: "4px 10px",
                  }}
                >
                  LIVE
                </span>
              )}
            </div>
            {/* messages */}
            <div
              ref={bodyRef}
              className="scroll"
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "18px",
                display: "flex",
                flexDirection: "column",
                gap: 13,
                background: "#fcfcfd",
              }}
            >
              {msgs.map((m, i) => (
                <DemoBubble key={i} m={m} demo={demo} />
              ))}
            </div>
            {/* composer */}
            <div style={{ padding: "12px 16px 16px", borderTop: "1px solid var(--ff-line)" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  height: 46,
                  padding: "0 8px 0 16px",
                  borderRadius: 13,
                  border: "1.5px solid " + (composer ? "var(--ff-ink)" : "var(--ff-line-2)"),
                  background: "#fff",
                  transition: "border-color .2s",
                }}
              >
                <span
                  style={{
                    flex: 1,
                    fontSize: 14,
                    color: composer ? "var(--ff-text)" : "var(--ff-faint)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {composer || t("composerPlaceholder")}
                  {composer && (
                    <span
                      style={{
                        display: "inline-block",
                        width: 1.5,
                        height: 15,
                        background: "var(--ff-ink)",
                        marginInlineStart: 1,
                        verticalAlign: "-2px",
                        animation: "ff-blink 1s steps(1) infinite",
                      }}
                    />
                  )}
                </span>
                <span
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 9,
                    background: composer ? "var(--ff-ink)" : "#eef0f3",
                    color: composer ? "#fff" : "var(--ff-faint)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "all .2s",
                    flexShrink: 0,
                  }}
                >
                  {Ic("send", { size: 15 })}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div
        style={{
          textAlign: "center",
          marginTop: 16,
          fontSize: 12.5,
          color: "var(--ff-muted)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
        }}
      >
        <span>{t("liveDemoLabel")} · {demo.name}</span>
        <span style={{ display: "inline-flex", gap: 6 }}>
          {demos.map((_, i) => (
            <span
              key={i}
              style={{
                width: i === ei ? 18 : 6,
                height: 6,
                borderRadius: 99,
                background: i === ei ? "var(--ff-accent)" : "var(--ff-line-2)",
                transition: "all .4s",
              }}
            />
          ))}
        </span>
      </div>

      <style>{`
        @media (max-width: 760px) {
          .ff-demo-grid { grid-template-columns: 1fr !important; }
          .ff-demo-kb { display: none !important; }
        }
      `}</style>
    </div>
  );
}

/* ---- knowledge base panel ---- */
function KBPanel({
  demo,
  cited,
  searching,
  litCount,
}: {
  demo: Demo;
  cited: string[];
  searching: boolean;
  litCount: number;
}) {
  const t = useTranslations("marketing.liveDemo");
  const isRtl = useLocale() === "ar";
  return (
    <div
      className="ff-demo-kb"
      style={{
        position: "relative",
        borderRight: "1px solid var(--ff-line)",
        background: "linear-gradient(170deg,#11151b,#161c27 60%,#10141b)",
        color: "#fff",
        padding: "18px 18px 20px",
        overflow: "hidden",
        minHeight: 470,
      }}
    >
      <div
        className="lattice"
        style={
          {
            position: "absolute",
            inset: 0,
            "--lt": "rgba(255,255,255,.05)",
            "--lt-size": "44px",
            maskImage: "radial-gradient(120% 80% at 40% 10%, #000 30%, transparent 80%)",
            WebkitMaskImage: "radial-gradient(120% 80% at 40% 10%, #000 30%, transparent 80%)",
          } as CSSProperties
        }
      />
      <div style={{ position: "relative" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 4 }}>
          <span
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background: "rgba(255,255,255,.08)",
              border: "1px solid rgba(255,255,255,.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {Ic("database", { size: 15 })}
          </span>
          <span style={{ fontSize: 13.5, fontWeight: 700, letterSpacing: "-.01em" }}>{t("knowledgeBase")}</span>
        </div>
        <div className="mono" style={{ fontSize: 11.5, color: "rgba(255,255,255,.5)", marginBottom: 16 }}>
          {demo.domain} · {t("pagesIndexed", { count: demo.pages.length })}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          {demo.pages.map((p, i) => {
            const hot = cited.includes(p);
            return (
              <div
                key={p}
                style={{
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                  gap: 9,
                  padding: "9px 11px",
                  borderRadius: 10,
                  overflow: "hidden",
                  background: hot ? "rgba(var(--ff-accent-rgb),.18)" : "rgba(255,255,255,.04)",
                  border: "1px solid " + (hot ? "rgba(var(--ff-accent-rgb),.5)" : "rgba(255,255,255,.08)"),
                  transition: "all .35s",
                  transform: hot ? `translateX(${isRtl ? -2 : 2}px)` : "none",
                }}
              >
                {searching && (
                  <span
                    style={{
                      position: "absolute",
                      top: 0,
                      bottom: 0,
                      width: "40%",
                      background: "linear-gradient(90deg,transparent,rgba(var(--ff-accent-rgb),.25),transparent)",
                      animation: `ff-sweep 1.3s ${i * 0.08}s ease-in-out infinite`,
                    }}
                  />
                )}
                <span style={{ display: "flex", color: hot ? "#fff" : "rgba(255,255,255,.4)", flexShrink: 0, position: "relative" }}>
                  {Ic(hot ? "check" : "file", { size: 13, sw: hot ? 2.4 : 1.7 })}
                </span>
                <span
                  className="mono"
                  style={{
                    fontSize: 11.5,
                    color: hot ? "#fff" : "rgba(255,255,255,.62)",
                    fontWeight: hot ? 600 : 400,
                    position: "relative",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {p}
                </span>
                {hot && (
                  <span
                    style={{
                      marginInlineStart: "auto",
                      fontSize: 9,
                      fontWeight: 800,
                      letterSpacing: ".06em",
                      color: "#fff",
                      background: "var(--ff-accent)",
                      padding: "2px 6px",
                      borderRadius: 99,
                      position: "relative",
                    }}
                  >
                    MATCH
                  </span>
                )}
              </div>
            );
          })}
        </div>

        <div
          style={{
            marginTop: 16,
            paddingTop: 14,
            borderTop: "1px solid rgba(255,255,255,.08)",
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 11.5,
            color: "rgba(255,255,255,.55)",
          }}
        >
          {searching ? (
            <>
              <span style={{ display: "flex", animation: "ff-spin 1s linear infinite", color: "var(--ff-accent)" }}>
                {Ic("scan", { size: 13 })}
              </span>{" "}
              {t("retrieving")}
            </>
          ) : litCount > 0 ? (
            <>
              <span style={{ color: "var(--ff-ok)", display: "flex" }}>{Ic("check", { size: 13 })}</span>{" "}
              {t("groundedIn", { count: litCount })}
            </>
          ) : (
            <>
              <span style={{ width: 6, height: 6, borderRadius: 99, background: "var(--ff-ok)" }} /> {t("ragReady")}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---- a single chat bubble ---- */
function DemoBubble({ m, demo }: { m: Msg; demo: Demo }) {
  const t = useTranslations("marketing.liveDemo");
  const isRtl = useLocale() === "ar";
  if (m.kind === "leadform") {
    return (
      <div style={{ alignSelf: "flex-start", maxWidth: "92%", animation: "ff-up-sm .35s ease both" }}>
        <div
          style={{
            border: "1px solid var(--ff-line-2)",
            borderRadius: 14,
            padding: 14,
            background: "#fff",
            boxShadow: "0 8px 20px -12px rgba(16,24,40,.22)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: ".04em",
              color: "var(--ff-accent-2)",
              marginBottom: 11,
            }}
          >
            {Ic("user", { size: 13 })} {t("leadCapture")}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              height: 40,
              padding: "0 12px",
              borderRadius: 10,
              border: "1px solid var(--ff-line-2)",
              background: "#fbfbfc",
              color: "var(--ff-muted)",
              fontSize: 13,
            }}
          >
            {Ic("mail", { size: 15 })} you@company.com
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <span
              style={{
                flex: 1,
                textAlign: "center",
                padding: "10px 16px",
                borderRadius: 10,
                background: "var(--ff-ink)",
                color: "#fff",
                fontSize: 13,
                fontWeight: 600,
                whiteSpace: "nowrap",
              }}
            >
              {t("shareContinue")}
            </span>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "10px 13px",
                borderRadius: 10,
                border: "1px solid var(--ff-line-2)",
                color: "var(--ff-soft)",
                fontSize: 13,
                fontWeight: 600,
                whiteSpace: "nowrap",
              }}
            >
              {Ic("handoff", { size: 14 })} {t("talkToHuman")}
            </span>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginTop: 8,
            fontSize: 11.5,
            color: "var(--ff-ok)",
            fontWeight: 600,
          }}
        >
          {Ic("check", { size: 13 })} {t("leadCaptured")}
        </div>
      </div>
    );
  }
  if (m.role === "user") {
    return (
      <div style={{ alignSelf: "flex-end", maxWidth: "82%", animation: `${isRtl ? "ff-in-left" : "ff-in-right"} .3s cubic-bezier(.2,.7,.2,1) both` }}>
        <div
          style={{
            padding: "10px 14px",
            borderRadius: isRtl ? "14px 14px 14px 4px" : "14px 14px 4px 14px",
            background: "var(--ff-ink)",
            color: "#fff",
            fontSize: 13.5,
            lineHeight: 1.5,
          }}
        >
          {m.text}
        </div>
      </div>
    );
  }
  if (m.typing) {
    return (
      <div style={{ alignSelf: "flex-start", animation: "ff-up-sm .25s ease both" }}>
        <div
          style={{
            display: "inline-flex",
            gap: 4,
            padding: "12px 14px",
            borderRadius: isRtl ? "14px 4px 14px 14px" : "4px 14px 14px 14px",
            background: "#fff",
            border: "1px solid var(--ff-line)",
          }}
        >
          {[0, 1, 2].map((d) => (
            <span
              key={d}
              style={{ width: 6, height: 6, borderRadius: 99, background: "var(--ff-muted)", animation: `ff-blink 1.1s ${d * 0.18}s infinite` }}
            />
          ))}
        </div>
      </div>
    );
  }
  // agent
  return (
    <div style={{ alignSelf: "flex-start", maxWidth: "90%", animation: "ff-up-sm .3s ease both" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 5 }}>
        <span
          style={{
            width: 19,
            height: 19,
            borderRadius: 6,
            background: "var(--ff-ink)",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {Ic("bot", { size: 12 })}
        </span>
        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--ff-ink)" }}>{demo.name} Assistant</span>
      </div>
      <div
        style={{
          padding: "11px 14px",
          borderRadius: isRtl ? "14px 4px 14px 14px" : "4px 14px 14px 14px",
          background: "#fff",
          border: "1px solid var(--ff-line)",
          color: "var(--ff-text)",
          fontSize: 13.5,
          lineHeight: 1.6,
          boxShadow: "0 2px 6px -4px rgba(16,24,40,.1)",
        }}
      >
        <span>
          {m.text}
          {m.streaming && (
            <span
              style={{
                display: "inline-block",
                width: 2,
                height: 14,
                background: "var(--ff-accent)",
                marginInlineStart: 2,
                verticalAlign: "-2px",
                animation: "ff-blink 1s steps(1) infinite",
              }}
            />
          )}
        </span>
      </div>
      {m.done && m.showCites && m.cites && (
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 11, color: "var(--ff-muted)", fontWeight: 600 }}>{t("sources")}</span>
          {m.cites.map((c) => (
            <span
              key={c}
              className="mono"
              style={{
                fontSize: 10.5,
                color: "var(--ff-accent-2)",
                background: "var(--ff-accent-soft)",
                padding: "3px 8px",
                borderRadius: 99,
                fontWeight: 600,
              }}
            >
              {c}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
