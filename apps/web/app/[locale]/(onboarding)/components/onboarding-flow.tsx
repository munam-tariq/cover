"use client";

/**
 * Onboarding flow — single client state machine that drives the new split-screen
 * design and wires it to the real backend (project creation, knowledge uploads,
 * crawl, live status polling, and the agent self-test). No skip option.
 */
import { useTranslations } from "next-intl";
import posthog from "posthog-js";
import React, { useCallback, useEffect, useMemo, useState } from "react";

import { useRouter } from "@/i18n/navigation";
import { apiClient, apiClientFormData } from "@/lib/api-client";

import { useOnboarding } from "./onboarding-context";
import {
  ExtractAnimation,
  SuccessScreen,
  type ExtractView,
  type CompanyChip,
} from "./onboarding-extract";
import { OnboardingStyles, RAIL_STEPS } from "./onboarding-kit";
import {
  getNextOnboardingPoll,
  getOnboardingProgressSignature,
} from "./onboarding-polling";
import { WelcomeStep, HearStep, SizeStep, GoalStep, NameStep } from "./onboarding-steps";
import { TrainStep, type StagedSource } from "./onboarding-train";
import { SplitShell, type NavConfig } from "./onboarding-ui";

const ORDER = ["welcome", "hear", "size", "goal", "name", "train", "extract", "success"] as const;
type Step = (typeof ORDER)[number];

const GOAL_IDS = ["answer", "leads", "handoff", "all"] as const;

function companyFromWebsite(website: string): string {
  try {
    const host = new URL(website.startsWith("http") ? website : `https://${website}`).hostname.replace(/^www\./, "");
    const root = host.split(".")[0];
    return root ? root.charAt(0).toUpperCase() + root.slice(1) : "My Company";
  } catch {
    return "My Company";
  }
}

function monogramOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "FF";
  return (parts[0][0] + (parts[1]?.[0] || parts[0][1] || "")).toUpperCase();
}

const stripProto = (u: string) => u.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/$/, "");

interface StatusResponse {
  status: string;
  error?: { message: string };
  crawlProgress?: { pagesFound: number; pagesProcessed: number; maxPages: number };
  structureProgress?: { total: number; completed: number };
  crawledUrls?: string[];
  pages?: { url: string }[];
  totals?: { pages?: number; words?: number; estimatedChunks?: number; imported?: number };
  selfTest?: { status: string; questions: { question: string; answer: string; citations: { url: string; path: string }[] }[] };
}

const STEP_IDS = ["scan", "read", "build", "test"] as const;

export function OnboardingFlow() {
  const t = useTranslations("onboarding");
  const router = useRouter();
  const { state, setProjectId, setJobId, setDomain, setLogoUrl, reset } = useOnboarding();

  const [step, setStep] = useState<Step>("welcome");
  const [hear, setHear] = useState("");
  const [size, setSize] = useState("");
  const [goal, setGoal] = useState("");
  const [agentName, setAgentName] = useState("");
  const [tone, setTone] = useState("professional");
  const [website, setWebsite] = useState("");
  const [sources, setSources] = useState<StagedSource[]>([]);
  const [training, setTraining] = useState(false);
  const [trainError, setTrainError] = useState<string | null>(null);
  const [status, setStatus] = useState<StatusResponse | null>(null);

  // Mark the start of the onboarding funnel once per mount.
  useEffect(() => {
    posthog.capture("onboarding_started");
  }, []);

  const idx = ORDER.indexOf(step);
  const railIndex = RAIL_STEPS.indexOf(step as (typeof RAIL_STEPS)[number]);
  const go = (s: Step) => setStep(s);
  const next = () => go(ORDER[Math.min(idx + 1, ORDER.length - 1)]);
  const back = () => go(ORDER[Math.max(idx - 1, 0)]);

  const companyName = useMemo(() => companyFromWebsite(website), [website]);

  const startTraining = useCallback(async () => {
    if (!website.trim()) return;
    setTraining(true);
    setTrainError(null);
    try {
      const resolvedCompany = companyFromWebsite(website);
      // 1. Create the project once.
      let pid = state.projectId;
      if (!pid) {
        const data = await apiClient<{ projectId: string }>("/api/onboarding/start", {
          method: "POST",
          body: JSON.stringify({
            agentName: agentName.trim() || "Support Assistant",
            companyName: resolvedCompany,
            tone,
            goal,
            hear,
            size,
          }),
        });
        pid = data.projectId;
        setProjectId(pid);
      }

      // 2. Upload any staged "other sources".
      for (const s of sources) {
        if (s.type === "file") {
          const fd = new FormData();
          fd.append("name", s.name);
          fd.append("file", s.file);
          await apiClientFormData(`/api/knowledge/upload?projectId=${pid}`, fd);
        } else if (s.type === "text") {
          await apiClient(`/api/knowledge?projectId=${pid}`, {
            method: "POST",
            body: JSON.stringify({ name: s.name, content: s.content }),
          });
        } else if (s.type === "qa") {
          await apiClient(`/api/knowledge?projectId=${pid}`, {
            method: "POST",
            body: JSON.stringify({ name: s.question.slice(0, 100), content: `Q: ${s.question}\nA: ${s.answer}` }),
          });
        }
      }

      // 3. Start the website crawl.
      const crawl = await apiClient<{ jobId: string; domain: string; logoUrl: string }>(
        "/api/onboarding/crawl",
        { method: "POST", body: JSON.stringify({ projectId: pid, websiteUrl: website.trim() }) }
      );
      setJobId(crawl.jobId);
      setDomain(crawl.domain);
      setLogoUrl(crawl.logoUrl);
      setStatus(null);
      go("extract");
    } catch (e) {
      setTrainError(e instanceof Error ? e.message : t("trainError.generic"));
    } finally {
      setTraining(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [website, agentName, tone, goal, hear, size, sources, state.projectId]);

  // Poll real crawl status during the extract stage; auto-complete on ready.
  useEffect(() => {
    if (step !== "extract" || !state.jobId) return;
    let active = true;
    let done = false;
    let completeCalled = false;
    let progressSignature: string | null = null;
    let unchangedPolls = 0;
    let pollTimer: ReturnType<typeof setTimeout> | undefined;
    let successTimer: ReturnType<typeof setTimeout> | undefined;

    const schedulePoll = (delayMs: number) => {
      if (active && !done) {
        pollTimer = setTimeout(poll, delayMs);
      }
    };

    const poll = async () => {
      let nextDelayMs: number | null = null;
      try {
        const data = await apiClient<StatusResponse>(`/api/onboarding/status/${state.jobId}`);
        if (!active) return;
        setStatus(data);

        if (data.status === "ready" && !completeCalled && state.projectId) {
          completeCalled = true;
          apiClient("/api/onboarding/complete", {
            method: "POST",
            body: JSON.stringify({ projectId: state.projectId, jobId: state.jobId }),
          }).catch(() => {});
        }
        if ((data.status === "completed" || data.status === "failed") && !done) {
          done = true;
          if (data.status === "completed") {
            posthog.capture("onboarding_completed", {
              pages_imported: data.totals?.imported ?? data.totals?.pages ?? 0,
              sources_added: sources.length,
              goal,
            });
            successTimer = setTimeout(() => active && go("success"), 2800);
          }
          return;
        }

        const currentSignature = getOnboardingProgressSignature(data);
        const nextPoll = getNextOnboardingPoll(
          progressSignature,
          currentSignature,
          unchangedPolls
        );
        progressSignature = currentSignature;
        unchangedPolls = nextPoll.unchangedPolls;
        nextDelayMs = nextPoll.delayMs;
      } catch {
        const failureSignature = "request-failed";
        const nextPoll = getNextOnboardingPoll(
          progressSignature,
          failureSignature,
          unchangedPolls
        );
        progressSignature = failureSignature;
        unchangedPolls = nextPoll.unchangedPolls;
        nextDelayMs = nextPoll.delayMs;
      } finally {
        if (nextDelayMs !== null) {
          schedulePoll(nextDelayMs);
        }
      }
    };

    poll();
    return () => {
      active = false;
      clearTimeout(pollTimer);
      clearTimeout(successTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, state.jobId, state.projectId]);

  const company: CompanyChip = {
    agentName: agentName.trim() || t("steps.name.agentNamePlaceholder"),
    companyName,
    domain: state.domain || stripProto(website),
    monogram: monogramOf(agentName || companyName),
  };
  const goalId = (GOAL_IDS as readonly string[]).includes(goal) ? goal : "answer";
  const instruction = t("instructionPrefix", { company: companyName }) + t(`goalInstr.${goalId}`);

  const view = useMemo<ExtractView>(() => buildView(status, sources, t), [status, sources, t]);

  // ---- extraction (full bleed) ----
  if (step === "extract") {
    return (
      <div className="ff-onboard" style={{ position: "fixed", inset: 0, overflow: "hidden", background: "var(--bg)" }}>
        <OnboardingStyles />
        <ExtractAnimation company={company} view={view} instruction={instruction} />
      </div>
    );
  }

  if (step === "success") {
    const imported = status?.totals?.imported ?? status?.totals?.pages ?? 0;
    const importedLine =
      t("importedLine.pages", { count: imported }) +
      (sources.length ? t("importedLine.addedSources", { count: sources.length }) : "");
    return (
      <div className="ff-onboard" style={{ position: "fixed", inset: 0, overflow: "hidden" }}>
        <OnboardingStyles />
        <SuccessScreen
          company={company}
          importedLine={importedLine}
          onTest={() => {
            reset();
            router.push("/playground");
          }}
          onDashboard={() => {
            reset();
            router.push("/dashboard");
          }}
        />
      </div>
    );
  }

  // ---- split-screen steps ----
  let content: React.ReactNode = null;
  let nav: NavConfig | undefined;

  if (step === "welcome") {
    content = <WelcomeStep />;
    nav = { onNext: next, can: true, label: t("nav.getStarted"), full: true };
  } else if (step === "hear") {
    content = <HearStep value={hear} onChange={setHear} />;
    nav = { onBack: back, onNext: next, can: !!hear };
  } else if (step === "size") {
    content = <SizeStep value={size} onChange={setSize} />;
    nav = { onBack: back, onNext: next, can: !!size };
  } else if (step === "goal") {
    content = <GoalStep value={goal} onChange={setGoal} />;
    nav = { onBack: back, onNext: next, can: !!goal };
  } else if (step === "name") {
    content = <NameStep name={agentName} tone={tone} onName={setAgentName} onTone={setTone} companyName={companyName} />;
    nav = { onBack: back, onNext: next, can: !!agentName.trim() };
  } else if (step === "train") {
    content = (
      <div>
        <TrainStep
          website={website}
          onWebsite={setWebsite}
          sources={sources}
          onAddSource={(s) => setSources((prev) => [...prev, s])}
          onRemoveSource={(i) => setSources((prev) => prev.filter((_, j) => j !== i))}
        />
        {trainError && (
          <div style={{ marginTop: 14, padding: "10px 13px", borderRadius: 11, background: "#fff7f7", border: "1px solid #f3c2c2", color: "#b42318", fontSize: 13 }}>
            {trainError}
          </div>
        )}
      </div>
    );
    nav = {
      onBack: back,
      onNext: startTraining,
      can: !!website.trim() && !training,
      label: training ? t("nav.starting") : t("nav.trainMyAgent"),
    };
  }

  return (
    <div className="ff-onboard" style={{ position: "fixed", inset: 0, overflow: "hidden", background: "#fff" }}>
      <OnboardingStyles />
      <SplitShell railIndex={railIndex < 0 ? 0 : railIndex} stepKey={step} nav={nav}>
        {content}
      </SplitShell>
    </div>
  );
}

/* Derive the presentational view from the real crawl status. */
function buildView(status: StatusResponse | null, staged: StagedSource[], t: ReturnType<typeof useTranslations>): ExtractView {
  const s = status?.status || "pending";
  const order = ["pending", "crawling", "structuring", "ready", "importing", "testing", "completed"];
  const rank = order.indexOf(s);
  const at = (k: string) => order.indexOf(k);

  const stepState = (activeAt: string, doneAfter: string): "pending" | "active" | "done" => {
    if (s === "failed") return "pending";
    if (rank >= at(doneAfter)) return "done";
    if (rank >= at(activeAt)) return "active";
    return "pending";
  };

  const steps = [
    { key: "scan", label: t(`stepDefs.${STEP_IDS[0]}`), state: stepState("crawling", "structuring"),
      sub: status?.crawlProgress?.pagesFound ? t("stepSub.pagesFound", { count: status.crawlProgress.pagesFound }) : t("stepSub.findingPages") },
    { key: "read", label: t(`stepDefs.${STEP_IDS[1]}`), state: stepState("structuring", "importing"),
      sub: status?.structureProgress?.total ? t("stepSub.pagesProgress", { completed: status.structureProgress.completed, total: status.structureProgress.total }) : t("stepSub.readingPages") },
    { key: "build", label: t(`stepDefs.${STEP_IDS[2]}`), state: stepState("importing", "testing"),
      sub: status?.totals?.estimatedChunks ? t("stepSub.chunksCount", { count: status.totals.estimatedChunks }) : t("stepSub.indexingAnswers") },
    { key: "test", label: t(`stepDefs.${STEP_IDS[3]}`), state: stepState("testing", "completed"),
      sub: t("stepSub.runningSampleChat") },
  ];

  const pillMap: Record<string, { label: string; ic: string; spin: boolean }> = {
    pending: { label: t("pill.connecting"), ic: "scan", spin: true },
    crawling: { label: t("pill.scanning"), ic: "scan", spin: true },
    structuring: { label: t("pill.reading"), ic: "doc", spin: true },
    ready: { label: t("pill.building"), ic: "cpu", spin: true },
    importing: { label: t("pill.building"), ic: "cpu", spin: true },
    testing: { label: t("pill.testing"), ic: "play", spin: true },
    completed: { label: t("pill.allSet"), ic: "check", spin: false },
    failed: { label: t("pill.failed"), ic: "x", spin: false },
  };

  const crawled = (status?.crawledUrls && status.crawledUrls.length
    ? status.crawledUrls
    : (status?.pages || []).map((p) => p.url)) || [];
  const sourceList = [
    ...crawled.map((u) => ({ label: stripProto(u), type: "url" })),
    ...staged.map((s2) => ({ label: s2.name, type: s2.type })),
  ];

  const citedPaths = (status?.selfTest?.questions || []).flatMap((q) => q.citations.map((c) => c.path));

  return {
    statusKey: s,
    pill: pillMap[s] || pillMap.pending,
    steps,
    sources: sourceList,
    citedPaths,
    selfTest: status?.selfTest,
    error: status?.error?.message,
  };
}
