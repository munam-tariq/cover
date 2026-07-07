"use client";

import { BookOpen, RefreshCw, Search, ThumbsUp } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

function scoreGrade(score: number): { letter: string; color: string } {
  if (score >= 85) return { letter: "A", color: "#22c55e" };
  if (score >= 70) return { letter: "B", color: "#84cc16" };
  if (score >= 50) return { letter: "C", color: "#eab308" };
  if (score >= 30) return { letter: "D", color: "#f97316" };
  return { letter: "F", color: "#ef4444" };
}

const SELECT_STYLE = {
  width: "100%",
  height: 46,
  borderRadius: 10,
  border: "1px solid var(--ff-line-2)",
  background: "#fff",
  color: "var(--ff-ink)",
  padding: "0 12px",
  fontSize: 15,
  outline: "none",
  appearance: "none" as const,
  cursor: "pointer",
} as const;

interface DimScoreCardProps {
  icon: React.ElementType;
  label: string;
  score: number;
  recommendation: string;
}

function DimScoreCard({ icon: Icon, label, score, recommendation }: DimScoreCardProps) {
  const { letter, color } = scoreGrade(score * 4);
  return (
    <div
      style={{
        border: "1px solid var(--ff-line)",
        borderRadius: 14,
        background: "#fff",
        padding: "16px 18px",
        display: "grid",
        gridTemplateColumns: "1fr auto",
        gap: 8,
        alignItems: "start",
      }}
    >
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6 }}>
          <Icon size={15} color="var(--ff-muted)" />
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--ff-soft)" }}>{label}</span>
        </div>
        <p style={{ margin: 0, fontSize: 13, color: "var(--ff-soft)", lineHeight: 1.55 }}>
          {recommendation}
        </p>
      </div>
      <span
        style={{
          fontSize: 22,
          fontWeight: 850,
          color,
          letterSpacing: "-.02em",
          lineHeight: 1,
          minWidth: 28,
          textAlign: "end",
        }}
      >
        {letter}
      </span>
    </div>
  );
}

export function KbHealthScorer() {
  const t = useTranslations("marketing.calculators.kbScorer.ui");
  const articleOptions = t.raw("articleOptions") as string[];
  const ageOptions = t.raw("ageOptions") as string[];
  const [articleCount, setArticleCount] = useState<string>("31-100");
  const [avgAgeDays, setAvgAgeDays] = useState<string>("3-12");
  const [hasSearch, setHasSearch] = useState(false);
  const [hasCategories, setHasCategories] = useState(false);
  const [hasRatings, setHasRatings] = useState(false);
  const [reviewsWeekly, setReviewsWeekly] = useState(false);

  const result = useMemo(() => {
    const coverageScore =
      articleCount === ">150" ? 25 :
      articleCount === "31-100" ? 16 :
      articleCount === "10-30" ? 8 : 0;

    const freshnessScore =
      avgAgeDays === "<3" ? 25 :
      avgAgeDays === "3-12" ? 18 :
      avgAgeDays === "12-24" ? 10 : 4;

    const findabilityScore = (hasSearch ? 12 : 0) + (hasCategories ? 13 : 0);

    const feedbackScore = (hasRatings ? 12 : 0) + (reviewsWeekly ? 13 : 0);

    const total = coverageScore + freshnessScore + findabilityScore + feedbackScore;

    const topRecommendation =
      coverageScore === Math.min(coverageScore, freshnessScore, findabilityScore, feedbackScore)
        ? t("recCoverageLow")
        : freshnessScore === Math.min(coverageScore, freshnessScore, findabilityScore, feedbackScore)
        ? t("recFreshnessLow")
        : findabilityScore === Math.min(coverageScore, freshnessScore, findabilityScore, feedbackScore)
        ? t("recFindabilityLow")
        : t("recFeedbackLow");

    return { coverageScore, freshnessScore, findabilityScore, feedbackScore, total, topRecommendation };
  }, [articleCount, avgAgeDays, hasSearch, hasCategories, hasRatings, reviewsWeekly, t]);

  const { letter: totalLetter, color: totalColor } = scoreGrade(result.total);

  return (
    <section
      aria-label={t("aria")}
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(0,.92fr) minmax(320px,1.08fr)",
        gap: 22,
        alignItems: "start",
      }}
      className="ff-tool-grid"
    >
      <div
        style={{
          border: "1px solid var(--ff-line)",
          borderRadius: 18,
          background: "#fff",
          padding: "clamp(22px,3vw,30px)",
          boxShadow: "0 18px 48px -34px rgba(16,24,40,.32)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
          <span
            style={{
              width: 40, height: 40, borderRadius: 12,
              background: "var(--ff-ink)", color: "#fff",
              display: "inline-flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <BookOpen size={19} />
          </span>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "var(--ff-ink)" }}>{t("panelTitle")}</div>
            <div style={{ fontSize: 13, color: "var(--ff-muted)" }}>{t("panelSub")}</div>
          </div>
        </div>

        <div style={{ display: "grid", gap: 20 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--ff-accent)", marginBottom: 14 }}>
              {t("dimCoverage")}
            </div>
            <label style={{ display: "block" }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--ff-ink)", display: "block", marginBottom: 8 }}>
                {t("articleCountQuestion")}
              </span>
              <div style={{ position: "relative" }}>
                <select value={articleCount} onChange={(e) => setArticleCount(e.target.value)} style={SELECT_STYLE}>
                  <option value="<10">{articleOptions[0]}</option>
                  <option value="10-30">{articleOptions[1]}</option>
                  <option value="31-100">{articleOptions[2]}</option>
                  <option value=">150">{articleOptions[3]}</option>
                </select>
              </div>
            </label>
          </div>

          <div>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--ff-accent)", marginBottom: 14 }}>
              {t("dimFreshness")}
            </div>
            <label style={{ display: "block" }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--ff-ink)", display: "block", marginBottom: 8 }}>
                {t("ageQuestion")}
              </span>
              <div style={{ position: "relative" }}>
                <select value={avgAgeDays} onChange={(e) => setAvgAgeDays(e.target.value)} style={SELECT_STYLE}>
                  <option value="<3">{ageOptions[0]}</option>
                  <option value="3-12">{ageOptions[1]}</option>
                  <option value="12-24">{ageOptions[2]}</option>
                  <option value=">24">{ageOptions[3]}</option>
                </select>
              </div>
            </label>
          </div>

          <div>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--ff-accent)", marginBottom: 14 }}>
              {t("dimFindability")}
            </div>
            <div style={{ display: "grid", gap: 10 }}>
              {[
                { label: t("checkSearch"), value: hasSearch, set: setHasSearch },
                { label: t("checkCategories"), value: hasCategories, set: setHasCategories },
              ].map((item) => (
                <label
                  key={item.label}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    cursor: "pointer",
                    padding: "12px 14px",
                    border: `1px solid ${item.value ? "var(--ff-accent)" : "var(--ff-line)"}`,
                    borderRadius: 10,
                    background: item.value ? "var(--ff-accent-soft, #f0f9ff)" : "#fff",
                    transition: "all .15s",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={item.value}
                    onChange={(e) => item.set(e.target.checked)}
                    style={{ width: 16, height: 16, accentColor: "var(--ff-accent)", flexShrink: 0 }}
                  />
                  <span style={{ fontSize: 14, fontWeight: 650, color: "var(--ff-ink)" }}>{item.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--ff-accent)", marginBottom: 14 }}>
              {t("dimFeedback")}
            </div>
            <div style={{ display: "grid", gap: 10 }}>
              {[
                { label: t("checkRatings"), value: hasRatings, set: setHasRatings },
                { label: t("checkWeekly"), value: reviewsWeekly, set: setReviewsWeekly },
              ].map((item) => (
                <label
                  key={item.label}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    cursor: "pointer",
                    padding: "12px 14px",
                    border: `1px solid ${item.value ? "var(--ff-accent)" : "var(--ff-line)"}`,
                    borderRadius: 10,
                    background: item.value ? "var(--ff-accent-soft, #f0f9ff)" : "#fff",
                    transition: "all .15s",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={item.value}
                    onChange={(e) => item.set(e.target.checked)}
                    style={{ width: 16, height: 16, accentColor: "var(--ff-accent)", flexShrink: 0 }}
                  />
                  <span style={{ fontSize: 14, fontWeight: 650, color: "var(--ff-ink)" }}>{item.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gap: 14 }}>
        <div
          style={{
            position: "relative",
            overflow: "hidden",
            borderRadius: 20,
            background: "linear-gradient(155deg,#11151b,#1d2633 62%,#0d1117)",
            color: "#fff",
            padding: "clamp(24px,4vw,32px)",
            boxShadow: "0 26px 70px -38px rgba(16,24,40,.55)",
          }}
        >
          <div
            className="lattice"
            style={{
              position: "absolute",
              inset: 0,
              ["--lt" as string]: "rgba(255,255,255,.055)",
              ["--lt-size" as string]: "48px",
              maskImage: "radial-gradient(100% 80% at 70% 0%, #000 26%, transparent 78%)",
              WebkitMaskImage: "radial-gradient(100% 80% at 70% 0%, #000 26%, transparent 78%)",
            }}
          />
          <div style={{ position: "relative" }}>
            <div
              style={{
                fontSize: 12, fontWeight: 800, letterSpacing: ".12em",
                textTransform: "uppercase", color: "rgba(255,255,255,.58)",
              }}
            >
              {t("scoreKicker")}
            </div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 16, marginTop: 18 }}>
              <div
                style={{
                  fontSize: "clamp(56px,9vw,80px)",
                  fontWeight: 850,
                  letterSpacing: "-.04em",
                  lineHeight: 0.95,
                }}
              >
                {result.total}
              </div>
              <div style={{ marginBottom: 6 }}>
                <div style={{ fontSize: "clamp(28px,5vw,44px)", fontWeight: 850, color: totalColor, lineHeight: 1 }}>
                  {totalLetter}
                </div>
                <div style={{ fontSize: 14, color: "rgba(255,255,255,.55)" }}>{t("outOf100")}</div>
              </div>
            </div>
            <div
              style={{
                marginTop: 20,
                padding: "12px 16px",
                background: "rgba(255,255,255,.07)",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,.09)",
                fontSize: 13.5,
                lineHeight: 1.6,
                color: "rgba(255,255,255,.78)",
              }}
            >
              <span style={{ fontWeight: 800, color: "#fff" }}>{t("topPriority")}</span>
              {result.topRecommendation}
            </div>
          </div>
        </div>

        <DimScoreCard
          icon={BookOpen}
          label={t("dimCoverage")}
          score={result.coverageScore}
          recommendation={
            result.coverageScore >= 16
              ? t("coverageHigh")
              : result.coverageScore >= 8
              ? t("coverageMid")
              : t("coverageLow")
          }
        />
        <DimScoreCard
          icon={RefreshCw}
          label={t("dimFreshness")}
          score={result.freshnessScore}
          recommendation={
            result.freshnessScore >= 18
              ? t("freshnessHigh")
              : result.freshnessScore >= 10
              ? t("freshnessMid")
              : t("freshnessLow")
          }
        />
        <DimScoreCard
          icon={Search}
          label={t("dimFindability")}
          score={result.findabilityScore}
          recommendation={
            result.findabilityScore >= 20
              ? t("findabilityHigh")
              : result.findabilityScore >= 12
              ? t("findabilityMid")
              : t("findabilityLow")
          }
        />
        <DimScoreCard
          icon={ThumbsUp}
          label={t("dimFeedback")}
          score={result.feedbackScore}
          recommendation={
            result.feedbackScore >= 20
              ? t("feedbackHigh")
              : result.feedbackScore >= 12
              ? t("feedbackMid")
              : t("feedbackLow")
          }
        />
      </div>
    </section>
  );
}
