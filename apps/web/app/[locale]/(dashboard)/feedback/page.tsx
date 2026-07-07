"use client";

import { Card, CardContent, CardHeader, CardTitle, Skeleton } from "@chatbot/ui";
import { TrendingUp, TrendingDown, ThumbsUp, ThumbsDown, Smile, Minus } from "lucide-react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { useEffect, useState, useCallback } from "react";

import { FeedbackIssuesList } from "@/components/analytics/feedback-issues-list";
import { useProject } from "@/contexts/project-context";
import { apiClient } from "@/lib/api-client";

const FeedbackChart = dynamic(
  () => import("@/components/analytics/feedback-chart").then((m) => m.FeedbackChart),
  { ssr: false, loading: () => <Skeleton className="h-64 w-full rounded-xl" /> }
);

interface FeedbackSummary {
  totalFeedback: number;
  helpfulCount: number;
  unhelpfulCount: number;
  satisfactionRate: number;
  trends: {
    helpfulChange: number;
    unhelpfulChange: number;
    satisfactionChange: number;
  };
  periodStart: string;
  periodEnd: string;
}

interface FeedbackTimelineEntry {
  date: string;
  helpful: number;
  unhelpful: number;
}

interface FeedbackIssue {
  questionText: string;
  sampleAnswer: string;
  unhelpfulCount: number;
  totalOccurrences: number;
  lastOccurred: string;
}

type Period = "24h" | "7d" | "30d";

export default function FeedbackPage() {
  const t = useTranslations("dashboard.pages.feedback");
  const { currentProject, isLoading: projectLoading } = useProject();
  const [period, setPeriod] = useState<Period>("30d");
  const [summary, setSummary] = useState<FeedbackSummary | null>(null);
  const [timeline, setTimeline] = useState<FeedbackTimelineEntry[]>([]);
  const [issues, setIssues] = useState<FeedbackIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFeedbackData = useCallback(async () => {
    if (!currentProject?.id) return;

    setLoading(true);
    setError(null);

    try {
      // Fetch all feedback data in parallel
      const [summaryData, timelineData, issuesData] = await Promise.all([
        apiClient<FeedbackSummary>(`/api/analytics/feedback/summary?projectId=${currentProject.id}&period=${period}`),
        apiClient<{ data: FeedbackTimelineEntry[] }>(`/api/analytics/feedback/timeline?projectId=${currentProject.id}&period=${period}`),
        apiClient<{ issues: FeedbackIssue[] }>(`/api/analytics/feedback/issues?projectId=${currentProject.id}&period=${period}&limit=10`),
      ]);

      setSummary(summaryData);
      setTimeline(timelineData.data);
      setIssues(issuesData.issues);
    } catch (err) {
      console.error("Failed to fetch feedback data:", err);
      setError(t("loadError"));
    } finally {
      setLoading(false);
    }
  }, [currentProject?.id, period, t]);

  // Fetch data when project or period changes
  useEffect(() => {
    if (!currentProject?.id) return;

    // Reset state when project changes
    setSummary(null);
    setTimeline([]);
    setIssues([]);
    fetchFeedbackData();
  }, [currentProject?.id, period, fetchFeedbackData]);

  const periodLabels: Record<Period, string> = {
    "24h": t("periods.24hShort"),
    "7d": t("periods.7dShort"),
    "30d": t("periods.30dShort"),
  };

  function TrendIndicator({ value, invertColors = false }: { value: number; invertColors?: boolean }) {
    if (value === 0) {
      return (
        <span className="flex items-center text-muted-foreground text-sm">
          <Minus className="h-4 w-4 me-1" />
          {t("noChange")}
        </span>
      );
    }

    const isPositive = value > 0;
    // For "unhelpful" metric, a decrease is good (so we invert the colors)
    const showGreen = invertColors ? !isPositive : isPositive;

    if (isPositive) {
      return (
        <span className={`flex items-center text-sm ${showGreen ? "text-green-600" : "text-red-600"}`}>
          <TrendingUp className="h-4 w-4 me-1" />
          +{value.toFixed(1)}%
        </span>
      );
    }

    return (
      <span className={`flex items-center text-sm ${showGreen ? "text-green-600" : "text-red-600"}`}>
        <TrendingDown className="h-4 w-4 me-1" />
        {value.toFixed(1)}%
      </span>
    );
  }

  if (projectLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-96 mt-2" />
          </div>
          <Skeleton className="h-10 w-36" />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!currentProject) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="text-muted-foreground">{t("noProjectSelected")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with period selector */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="text-muted-foreground">
            {t("subtitle")}
          </p>
        </div>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value as Period)}
          className="px-3 py-2 border rounded-md bg-background text-sm"
        >
          <option value="24h">{t("periods.24h")}</option>
          <option value="7d">{t("periods.7d")}</option>
          <option value="30d">{t("periods.30d")}</option>
        </select>
      </div>

      {error && (
        <div className="p-4 bg-destructive/10 text-destructive rounded-md">
          {error}
        </div>
      )}

      {/* Summary Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Helpful Count */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("stats.helpful")}</CardTitle>
            <ThumbsUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-8 w-24 bg-muted animate-pulse rounded" />
            ) : (
              <>
                <div className="text-2xl font-bold text-green-600">
                  {summary?.helpfulCount.toLocaleString() ?? 0}
                </div>
                <TrendIndicator value={summary?.trends.helpfulChange ?? 0} />
                <p className="text-xs text-muted-foreground mt-1">
                  {t("vsPrevious", { period: periodLabels[period] })}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Unhelpful Count */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("stats.notHelpful")}</CardTitle>
            <ThumbsDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-8 w-24 bg-muted animate-pulse rounded" />
            ) : (
              <>
                <div className="text-2xl font-bold text-red-600">
                  {summary?.unhelpfulCount.toLocaleString() ?? 0}
                </div>
                <TrendIndicator value={summary?.trends.unhelpfulChange ?? 0} invertColors />
                <p className="text-xs text-muted-foreground mt-1">
                  {t("vsPrevious", { period: periodLabels[period] })}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Satisfaction Rate */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("stats.satisfactionRate")}</CardTitle>
            <Smile className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-8 w-24 bg-muted animate-pulse rounded" />
            ) : (
              <>
                <div className="text-2xl font-bold text-blue-600">
                  {summary?.satisfactionRate.toFixed(1) ?? 0}%
                </div>
                <TrendIndicator value={summary?.trends.satisfactionChange ?? 0} />
                <p className="text-xs text-muted-foreground mt-1">
                  {t("vsPrevious", { period: periodLabels[period] })}
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Feedback Over Time Chart */}
      <FeedbackChart data={timeline} loading={loading} period={period} />

      {/* Issues List */}
      <FeedbackIssuesList issues={issues} loading={loading} />
    </div>
  );
}
