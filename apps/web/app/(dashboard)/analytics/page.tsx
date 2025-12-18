"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@chatbot/ui";
import { apiClient } from "@/lib/api-client";
import { createClient } from "@/lib/supabase/client";
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
  const [projectId, setProjectId] = useState<string | null>(null);
  const [period, setPeriod] = useState<Period>("30d");
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [topQuestions, setTopQuestions] = useState<QuestionCluster[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch project ID on mount
  useEffect(() => {
    async function fetchProjectId() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) return;

      const { data: projects } = await supabase
        .from("projects")
        .select("id")
        .eq("user_id", user.id)
        .limit(1);

      if (projects && projects.length > 0) {
        setProjectId(projects[0].id);
      }
    }

    fetchProjectId();
  }, []);

  // Fetch analytics data when projectId or period changes
  useEffect(() => {
    if (!projectId) return;

    async function fetchAnalytics() {
      setLoading(true);
      setError(null);

      try {
        // Fetch all analytics data in parallel
        const [summaryData, timelineData, questionsData] = await Promise.all([
          apiClient<AnalyticsSummary>(`/api/analytics/summary?projectId=${projectId}&period=${period}`),
          apiClient<{ timeline: TimelineEntry[] }>(`/api/analytics/timeline?projectId=${projectId}&days=${period === "24h" ? 1 : period === "7d" ? 7 : 30}`),
          apiClient<{ questions: QuestionCluster[] }>(`/api/analytics/top-questions?projectId=${projectId}&days=${period === "24h" ? 1 : period === "7d" ? 7 : 30}`),
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
    }

    fetchAnalytics();
  }, [projectId, period]);

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

  if (!projectId) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-muted-foreground">Loading project...</p>
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
