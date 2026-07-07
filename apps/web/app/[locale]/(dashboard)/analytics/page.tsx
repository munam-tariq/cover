"use client";

import { Skeleton, Tabs, TabsContent, TabsList, TabsTrigger } from "@chatbot/ui";
import {
  TrendingUp,
  MessageSquare,
  UserPlus,
  CheckCircle2,
  Target,
  XCircle,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { useEffect, useState, useCallback } from "react";

import { GapsPanel } from "@/components/analytics/gaps-panel";
import { LeadStatsCard } from "@/components/analytics/lead-stats-card";
import { TopQuestionsList } from "@/components/analytics/top-questions-list";
import { TopicsPanel } from "@/components/analytics/topics-panel";
import { useProject } from "@/contexts/project-context";
import { apiClient } from "@/lib/api-client";

const MessagesChart = dynamic(
  () => import("@/components/analytics/messages-chart").then((m) => m.MessagesChart),
  { ssr: false, loading: () => <Skeleton className="h-64 w-full rounded-xl" /> }
);
const SentimentPanel = dynamic(
  () => import("@/components/analytics/sentiment-panel").then((m) => m.SentimentPanel),
  { ssr: false, loading: () => <Skeleton className="h-64 w-full rounded-xl" /> }
);

interface AnalyticsSummary {
  totalMessages: number;
  totalConversations: number;
  period: string;
  periodStart: string;
  periodEnd: string;
  trends: {
    messagesChange: number;
    conversationsChange: number;
  };
}

interface LeadsSummary {
  totalConversations: number;
  totalLeads: number;
  qualifiedCount: number;
  completionRate: number;
  qualificationRate: number;
  disqualificationRate: number;
  voiceCallCount: number;
  trends: {
    conversationsChange: number;
    leadsChange: number;
    qualifiedChange: number;
  };
}

interface TimelineEntry {
  date: string;
  messages: number;
  conversations: number;
}

interface QuestionCluster {
  representative: string;
  count: number;
  examples: string[];
}

type Period = "24h" | "7d" | "30d";
type SourceFilter = "all" | "widget" | "public" | "mobile" | "playground" | "whatsapp";

const SOURCE_OPTIONS: { value: SourceFilter; labelKey: string }[] = [
  { value: "all", labelKey: "all" },
  { value: "widget", labelKey: "widget" },
  { value: "whatsapp", labelKey: "whatsapp" },
  { value: "public", labelKey: "public" },
  { value: "mobile", labelKey: "mobile" },
  { value: "playground", labelKey: "playground" },
];

export default function AnalyticsPage() {
  const t = useTranslations("dashboard.pages.analytics");
  const { currentProject, isLoading: projectLoading } = useProject();
  const [period, setPeriod] = useState<Period>("30d");
  const [source, setSource] = useState<SourceFilter>("all");
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [leadsSummary, setLeadsSummary] = useState<LeadsSummary | null>(null);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [topQuestions, setTopQuestions] = useState<QuestionCluster[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    if (!currentProject?.id) return;

    setLoading(true);
    setError(null);

    try {
      const days = period === "24h" ? 1 : period === "7d" ? 7 : 30;
      const sourceParam = source === "all" ? "" : `&source=${source}`;
      const [summaryData, leadsData, timelineData, questionsData] =
        await Promise.all([
          apiClient<AnalyticsSummary>(
            `/api/analytics/summary?projectId=${currentProject.id}&period=${period}${sourceParam}`
          ),
          apiClient<LeadsSummary>(
            `/api/analytics/leads-summary?projectId=${currentProject.id}&period=${period}${sourceParam}`
          ).catch(() => null),
          apiClient<{ timeline: TimelineEntry[] }>(
            `/api/analytics/timeline?projectId=${currentProject.id}&days=${days}${sourceParam}`
          ),
          apiClient<{ questions: QuestionCluster[] }>(
            `/api/analytics/top-questions?projectId=${currentProject.id}&days=${days}${sourceParam}`
          ),
        ]);

      setSummary(summaryData);
      setLeadsSummary(leadsData);
      setTimeline(timelineData.timeline);
      setTopQuestions(questionsData.questions);
    } catch (err) {
      console.error("Failed to fetch analytics:", err);
      setError(t("loadError"));
    } finally {
      setLoading(false);
    }
  }, [currentProject?.id, period, source, t]);

  useEffect(() => {
    if (!currentProject?.id) return;

    setSummary(null);
    setLeadsSummary(null);
    setTimeline([]);
    setTopQuestions([]);
    fetchAnalytics();
  }, [currentProject?.id, period, source, fetchAnalytics]);

  if (projectLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-32" />
            <Skeleton className="mt-2 h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-36" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <LeadStatsCard
              key={i}
              title=""
              value=""
              icon={MessageSquare}
              loading
            />
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

  const days = period === "24h" ? 1 : period === "7d" ? 7 : 30;

  return (
    <div className="space-y-6">
      {/* Header with period selector */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="text-muted-foreground">
            {t("subtitle", { projectName: currentProject.name })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={source}
            onChange={(e) => setSource(e.target.value as SourceFilter)}
            className="bg-background rounded-md border px-3 py-2 text-sm"
          >
            {SOURCE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {t(`sources.${o.labelKey}`)}
              </option>
            ))}
          </select>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as Period)}
            className="bg-background rounded-md border px-3 py-2 text-sm"
          >
            <option value="24h">{t("periods.24h")}</option>
            <option value="7d">{t("periods.7d")}</option>
            <option value="30d">{t("periods.30d")}</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive rounded-md p-4">
          {error}
        </div>
      )}

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">{t("tabs.overview")}</TabsTrigger>
          <TabsTrigger value="topics">{t("tabs.topics")}</TabsTrigger>
          <TabsTrigger value="sentiment">{t("tabs.sentiment")}</TabsTrigger>
          <TabsTrigger value="gaps">{t("tabs.gaps")}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Lead Stats Cards - 3x2 grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <LeadStatsCard
              title={t("stats.totalConversations")}
              value={
                leadsSummary?.totalConversations ??
                summary?.totalConversations ??
                0
              }
              icon={MessageSquare}
              trend={
                leadsSummary?.trends.conversationsChange ??
                summary?.trends.conversationsChange
              }
              loading={loading}
            />
            <LeadStatsCard
              title={t("stats.totalLeads")}
              value={leadsSummary?.totalLeads ?? 0}
              icon={UserPlus}
              trend={leadsSummary?.trends.leadsChange}
              loading={loading}
            />
            <LeadStatsCard
              title={t("stats.qualifiedProspects")}
              value={leadsSummary?.qualifiedCount ?? 0}
              icon={CheckCircle2}
              trend={leadsSummary?.trends.qualifiedChange}
              loading={loading}
            />
            <LeadStatsCard
              title={t("stats.completionRate")}
              value={`${leadsSummary?.completionRate ?? 0}%`}
              icon={Target}
              loading={loading}
            />
            <LeadStatsCard
              title={t("stats.qualificationRate")}
              value={`${leadsSummary?.qualificationRate ?? 0}%`}
              icon={TrendingUp}
              loading={loading}
            />
            <LeadStatsCard
              title={t("stats.disqualificationRate")}
              value={`${leadsSummary?.disqualificationRate ?? 0}%`}
              icon={XCircle}
              loading={loading}
            />
          </div>

          {/* Conversations Over Time Chart */}
          <MessagesChart data={timeline} loading={loading} period={period} />

          {/* Top Questions */}
          <TopQuestionsList questions={topQuestions} loading={loading} />
        </TabsContent>

        <TabsContent value="topics">
          <TopicsPanel projectId={currentProject.id} days={days} />
        </TabsContent>

        <TabsContent value="sentiment">
          <SentimentPanel projectId={currentProject.id} days={days} />
        </TabsContent>

        <TabsContent value="gaps">
          <GapsPanel projectId={currentProject.id} days={days} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
