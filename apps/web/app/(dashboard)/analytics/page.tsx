"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Skeleton } from "@chatbot/ui";
import { apiClient } from "@/lib/api-client";
import { useProject } from "@/contexts/project-context";
import { TrendingUp, TrendingDown, MessageSquare, Users, Minus } from "lucide-react";
import { MessagesChart } from "@/components/analytics/messages-chart";
import { TopQuestionsList } from "@/components/analytics/top-questions-list";

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
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [topQuestions, setTopQuestions] = useState<QuestionCluster[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    if (!currentProject?.id) return;

    setLoading(true);
    setError(null);

    try {
      // Fetch all analytics data in parallel
      const [summaryData, timelineData, questionsData] = await Promise.all([
        apiClient<AnalyticsSummary>(`/api/analytics/summary?projectId=${currentProject.id}&period=${period}`),
        apiClient<{ timeline: TimelineEntry[] }>(`/api/analytics/timeline?projectId=${currentProject.id}&days=${period === "24h" ? 1 : period === "7d" ? 7 : 30}`),
        apiClient<{ questions: QuestionCluster[] }>(`/api/analytics/top-questions?projectId=${currentProject.id}&days=${period === "24h" ? 1 : period === "7d" ? 7 : 30}`),
      ]);

      setSummary(summaryData);
      setTimeline(timelineData.timeline);
      setTopQuestions(questionsData.questions);
    } catch (err) {
      console.error("Failed to fetch analytics:", err);
      setError("Failed to load analytics data");
    } finally {
      setLoading(false);
    }
  }, [currentProject?.id, period]);

  // Fetch analytics data when project or period changes
  useEffect(() => {
    if (!currentProject?.id) return;

    // Reset state when project changes
    setSummary(null);
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
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2].map((i) => (
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
            Track your chatbot's performance and popular questions
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

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Messages</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-8 w-24 bg-muted animate-pulse rounded" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {summary?.totalMessages.toLocaleString() ?? 0}
                </div>
                <TrendIndicator value={summary?.trends.messagesChange ?? 0} />
                <p className="text-xs text-muted-foreground mt-1">
                  vs previous {periodLabels[period].toLowerCase().replace("last ", "")}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversations</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-8 w-24 bg-muted animate-pulse rounded" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {summary?.totalConversations.toLocaleString() ?? 0}
                </div>
                <TrendIndicator value={summary?.trends.conversationsChange ?? 0} />
                <p className="text-xs text-muted-foreground mt-1">
                  vs previous {periodLabels[period].toLowerCase().replace("last ", "")}
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Messages Over Time Chart */}
      <MessagesChart data={timeline} loading={loading} period={period} />

      {/* Top Questions */}
      <TopQuestionsList questions={topQuestions} loading={loading} />
    </div>
  );
}
