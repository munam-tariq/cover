"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, Skeleton } from "@chatbot/ui";
import { apiClient } from "@/lib/api-client";
import { useProject } from "@/contexts/project-context";
import {
  TrendingUp,
  TrendingDown,
  MessageSquare,
  Users,
  Minus,
  UserPlus,
  CheckCircle2,
  Target,
  XCircle,
} from "lucide-react";
import { MessagesChart } from "@/components/analytics/messages-chart";
import { TopQuestionsList } from "@/components/analytics/top-questions-list";
import { LeadStatsCard } from "@/components/analytics/lead-stats-card";

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

export default function AnalyticsPage() {
  const { currentProject, isLoading: projectLoading } = useProject();
  const [period, setPeriod] = useState<Period>("30d");
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
      const [summaryData, leadsData, timelineData, questionsData] = await Promise.all([
        apiClient<AnalyticsSummary>(`/api/analytics/summary?projectId=${currentProject.id}&period=${period}`),
        apiClient<LeadsSummary>(`/api/analytics/leads-summary?projectId=${currentProject.id}&period=${period}`).catch(() => null),
        apiClient<{ timeline: TimelineEntry[] }>(`/api/analytics/timeline?projectId=${currentProject.id}&days=${days}`),
        apiClient<{ questions: QuestionCluster[] }>(`/api/analytics/top-questions?projectId=${currentProject.id}&days=${days}`),
      ]);

      setSummary(summaryData);
      setLeadsSummary(leadsData);
      setTimeline(timelineData.timeline);
      setTopQuestions(questionsData.questions);
    } catch (err) {
      console.error("Failed to fetch analytics:", err);
      setError("Failed to load analytics data");
    } finally {
      setLoading(false);
    }
  }, [currentProject?.id, period]);

  useEffect(() => {
    if (!currentProject?.id) return;

    setSummary(null);
    setLeadsSummary(null);
    setTimeline([]);
    setTopQuestions([]);
    fetchAnalytics();
  }, [currentProject?.id, period, fetchAnalytics]);

  const periodLabels: Record<Period, string> = {
    "24h": "Last 24 Hours",
    "7d": "Last 7 Days",
    "30d": "Last 30 Days",
  };

  function TrendIndicator({ value }: { value: number }) {
    if (value === 0) {
      return (
        <span className="flex items-center text-muted-foreground text-sm">
          <Minus className="h-4 w-4 mr-1" />
          No change
        </span>
      );
    }
    if (value > 0) {
      return (
        <span className="flex items-center text-green-600 text-sm">
          <TrendingUp className="h-4 w-4 mr-1" />
          +{value}%
        </span>
      );
    }
    return (
      <span className="flex items-center text-red-600 text-sm">
        <TrendingDown className="h-4 w-4 mr-1" />
        {value}%
      </span>
    );
  }

  if (projectLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-4 w-64 mt-2" />
          </div>
          <Skeleton className="h-10 w-36" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <LeadStatsCard key={i} title="" value="" icon={MessageSquare} loading />
          ))}
        </div>
      </div>
    );
  }

  if (!currentProject) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-muted-foreground">No project selected</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with period selector */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-muted-foreground">
            View conversation metrics and insights for{" "}
            <span className="font-medium">{currentProject.name}</span>
          </p>
        </div>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value as Period)}
          className="px-3 py-2 border rounded-md bg-background text-sm"
        >
          <option value="24h">Last 24 Hours</option>
          <option value="7d">Last 7 Days</option>
          <option value="30d">Last 30 Days</option>
        </select>
      </div>

      {error && (
        <div className="p-4 bg-destructive/10 text-destructive rounded-md">
          {error}
        </div>
      )}

      {/* Lead Stats Cards - 3x2 grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <LeadStatsCard
          title="Total Conversations"
          value={leadsSummary?.totalConversations ?? summary?.totalConversations ?? 0}
          icon={MessageSquare}
          trend={leadsSummary?.trends.conversationsChange ?? summary?.trends.conversationsChange}
          loading={loading}
        />
        <LeadStatsCard
          title="Total Leads"
          value={leadsSummary?.totalLeads ?? 0}
          icon={UserPlus}
          trend={leadsSummary?.trends.leadsChange}
          loading={loading}
        />
        <LeadStatsCard
          title="Qualified Prospects"
          value={leadsSummary?.qualifiedCount ?? 0}
          icon={CheckCircle2}
          trend={leadsSummary?.trends.qualifiedChange}
          loading={loading}
        />
        <LeadStatsCard
          title="Completion Rate"
          value={`${leadsSummary?.completionRate ?? 0}%`}
          icon={Target}
          loading={loading}
        />
        <LeadStatsCard
          title="Qualification Rate"
          value={`${leadsSummary?.qualificationRate ?? 0}%`}
          icon={TrendingUp}
          loading={loading}
        />
        <LeadStatsCard
          title="Disqualification Rate"
          value={`${leadsSummary?.disqualificationRate ?? 0}%`}
          icon={XCircle}
          loading={loading}
        />
      </div>

      {/* Conversations Over Time Chart */}
      <MessagesChart data={timeline} loading={loading} period={period} />

      {/* Top Questions */}
      <TopQuestionsList questions={topQuestions} loading={loading} />
    </div>
  );
}
