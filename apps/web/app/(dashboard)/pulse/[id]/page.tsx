"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Badge,
  Skeleton,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@chatbot/ui";
import { apiClient } from "@/lib/api-client";
import { useProject } from "@/contexts/project-context";
import {
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
  Bar,
  BarChart,
} from "recharts";
import {
  ArrowLeft,
  BarChart3,
  MessageSquare,
  SmilePlus,
  FileText,
  Play,
  Pause,
  Square,
  Trash2,
  Download,
  Sparkles,
  Loader2,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Campaign {
  id: string;
  type: "nps" | "poll" | "sentiment" | "feedback";
  question: string;
  config: Record<string, unknown>;
  targeting: Record<string, unknown>;
  styling: Record<string, unknown>;
  status: "draft" | "active" | "paused" | "completed";
  response_count: number;
  response_goal: number | null;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
  updated_at: string;
}

interface PulseResponseItem {
  id: string;
  answer: Record<string, unknown>;
  page_url: string | null;
  visitor_id: string | null;
  created_at: string;
}

interface Analytics {
  total_responses: number;
  type: string;
  // NPS
  nps_score?: number;
  promoters?: number;
  passives?: number;
  detractors?: number;
  score_distribution?: { score: number; count: number }[];
  // Poll
  option_counts?: Record<string, number>;
  other_count?: number;
  // Sentiment
  emoji_counts?: Record<string, number>;
  // Feedback
  has_text_responses?: boolean;
  // Common
  daily_trend?: { date: string; count: number }[];
}

interface Summary {
  id: string;
  summary_text: string;
  themes: { label: string; count: number; sentiment?: string }[];
  generated_at: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const TYPE_META: Record<
  string,
  { label: string; icon: React.ReactNode; color: string }
> = {
  nps: {
    label: "NPS Score",
    icon: <BarChart3 className="h-4 w-4" />,
    color: "text-blue-600 bg-blue-50",
  },
  poll: {
    label: "Quick Poll",
    icon: <MessageSquare className="h-4 w-4" />,
    color: "text-purple-600 bg-purple-50",
  },
  sentiment: {
    label: "Sentiment",
    icon: <SmilePlus className="h-4 w-4" />,
    color: "text-amber-600 bg-amber-50",
  },
  feedback: {
    label: "Open Feedback",
    icon: <FileText className="h-4 w-4" />,
    color: "text-green-600 bg-green-50",
  },
};

const STATUS_VARIANT: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  active: "default",
  draft: "outline",
  paused: "secondary",
  completed: "secondary",
};

const SENTIMENT_EMOJIS: Record<string, string> = {
  "1": "\ud83d\ude21",
  "2": "\ud83d\ude1e",
  "3": "\ud83d\ude10",
  "4": "\ud83d\ude42",
  "5": "\ud83d\ude0d",
};

const trendChartConfig: ChartConfig = {
  count: {
    label: "Responses",
    color: "hsl(var(--primary))",
  },
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function CampaignResultsPage() {
  const { currentProject } = useProject();
  const router = useRouter();
  const params = useParams();
  const campaignId = params.id as string;

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [responses, setResponses] = useState<PulseResponseItem[]>([]);
  const [responsesTotal, setResponsesTotal] = useState(0);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchData = useCallback(async () => {
    if (!currentProject?.id || !campaignId) return;

    setLoading(true);
    setError(null);

    try {
      const base = `/api/projects/${currentProject.id}/pulse/campaigns/${campaignId}`;

      const [campaignData, analyticsData, responsesData] = await Promise.all([
        apiClient<{ campaign: Campaign; summary: Summary | null }>(base),
        apiClient<{ analytics: Analytics }>(`${base}/analytics`),
        apiClient<{
          responses: PulseResponseItem[];
          total: number;
        }>(`${base}/responses?limit=50`),
      ]);

      setCampaign(campaignData.campaign);
      setSummary(campaignData.summary);
      setAnalytics(analyticsData.analytics);
      setResponses(responsesData.responses || []);
      setResponsesTotal(responsesData.total || 0);
    } catch (err) {
      console.error("Failed to load campaign:", err);
      setError("Failed to load campaign data");
    } finally {
      setLoading(false);
    }
  }, [currentProject?.id, campaignId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const updateStatus = async (
    newStatus: "active" | "paused" | "completed"
  ) => {
    if (!currentProject?.id || !campaignId) return;

    setStatusUpdating(true);
    setActionError(null);
    try {
      const data = await apiClient<{ campaign: Campaign }>(
        `/api/projects/${currentProject.id}/pulse/campaigns/${campaignId}`,
        {
          method: "PUT",
          body: JSON.stringify({ status: newStatus }),
        }
      );
      setCampaign(data.campaign);
    } catch (err) {
      console.error("Failed to update status:", err);
      setActionError(`Failed to ${newStatus === "active" ? "activate" : newStatus} campaign`);
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (
      !currentProject?.id ||
      !campaignId ||
      !confirm("Delete this campaign and all its responses?")
    )
      return;

    setDeleting(true);
    try {
      await apiClient(
        `/api/projects/${currentProject.id}/pulse/campaigns/${campaignId}`,
        { method: "DELETE" }
      );
      router.push("/pulse");
    } catch (err) {
      console.error("Failed to delete:", err);
      setDeleting(false);
    }
  };

  const generateSummary = async () => {
    if (!currentProject?.id || !campaignId) return;

    setGeneratingSummary(true);
    setActionError(null);
    try {
      const data = await apiClient<{ summary: Summary }>(
        `/api/projects/${currentProject.id}/pulse/campaigns/${campaignId}/summary`,
        { method: "POST" }
      );
      setSummary(data.summary);
    } catch (err) {
      console.error("Failed to generate summary:", err);
      setActionError("Failed to generate AI summary. Please try again.");
    } finally {
      setGeneratingSummary(false);
    }
  };

  const exportCsv = () => {
    if (!campaign || responses.length === 0) return;

    const rows: string[][] = [];

    // Header
    if (campaign.type === "nps") {
      rows.push(["Date", "Score", "Follow-up", "Page", "Visitor"]);
    } else if (campaign.type === "poll") {
      rows.push(["Date", "Option", "Other Text", "Page", "Visitor"]);
    } else if (campaign.type === "sentiment") {
      rows.push(["Date", "Emoji", "Follow-up", "Page", "Visitor"]);
    } else {
      rows.push(["Date", "Text", "Page", "Visitor"]);
    }

    // Data rows
    for (const r of responses) {
      const date = new Date(r.created_at).toLocaleString();
      const page = r.page_url || "";
      const visitor = r.visitor_id || "";
      const a = r.answer || {};

      if (campaign.type === "nps") {
        rows.push([
          date,
          String((a as Record<string, unknown>).score ?? ""),
          String((a as Record<string, unknown>).follow_up ?? ""),
          page,
          visitor,
        ]);
      } else if (campaign.type === "poll") {
        rows.push([
          date,
          String((a as Record<string, unknown>).option ?? ""),
          String((a as Record<string, unknown>).other_text ?? ""),
          page,
          visitor,
        ]);
      } else if (campaign.type === "sentiment") {
        rows.push([
          date,
          String((a as Record<string, unknown>).emoji ?? ""),
          String((a as Record<string, unknown>).follow_up ?? ""),
          page,
          visitor,
        ]);
      } else {
        rows.push([
          date,
          String((a as Record<string, unknown>).text ?? ""),
          page,
          visitor,
        ]);
      }
    }

    const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""').replace(/\n/g, " ")}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `pulse-${campaign.type}-${campaignId.slice(0, 8)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // ─── Loading state ───────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
        <Skeleton className="h-80" />
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => router.push("/pulse")}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Pulse
        </button>
        <div className="p-4 rounded-md bg-destructive/10 text-destructive text-sm">
          {error || "Campaign not found"}
        </div>
      </div>
    );
  }

  const meta = TYPE_META[campaign.type] || TYPE_META.feedback;

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <button
            onClick={() => router.push("/pulse")}
            className="p-2 rounded-md hover:bg-muted transition-colors mt-0.5"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold truncate">{campaign.question}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span
                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${meta.color}`}
              >
                {meta.icon}
                {meta.label}
              </span>
              <Badge variant={STATUS_VARIANT[campaign.status] || "outline"}>
                {campaign.status}
              </Badge>
              <span className="text-sm text-muted-foreground">
                Created{" "}
                {new Date(campaign.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {campaign.status === "draft" && (
            <button
              onClick={() => updateStatus("active")}
              disabled={statusUpdating}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-md text-sm hover:bg-green-700 disabled:opacity-50"
            >
              <Play className="h-3.5 w-3.5" />
              Activate
            </button>
          )}
          {campaign.status === "active" && (
            <button
              onClick={() => updateStatus("paused")}
              disabled={statusUpdating}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 border rounded-md text-sm hover:bg-muted disabled:opacity-50"
            >
              <Pause className="h-3.5 w-3.5" />
              Pause
            </button>
          )}
          {campaign.status === "paused" && (
            <button
              onClick={() => updateStatus("active")}
              disabled={statusUpdating}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-md text-sm hover:bg-green-700 disabled:opacity-50"
            >
              <Play className="h-3.5 w-3.5" />
              Resume
            </button>
          )}
          {(campaign.status === "active" ||
            campaign.status === "paused") && (
            <button
              onClick={() => updateStatus("completed")}
              disabled={statusUpdating}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 border rounded-md text-sm hover:bg-muted disabled:opacity-50"
            >
              <Square className="h-3.5 w-3.5" />
              Complete
            </button>
          )}
          <button
            onClick={exportCsv}
            disabled={responses.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 border rounded-md text-sm hover:bg-muted disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5" />
            CSV
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-destructive/30 text-destructive rounded-md text-sm hover:bg-destructive/10 disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Action error */}
      {actionError && (
        <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm flex items-center justify-between">
          <span>{actionError}</span>
          <button
            onClick={() => setActionError(null)}
            className="text-destructive/70 hover:text-destructive ml-2"
          >
            &times;
          </button>
        </div>
      )}

      {/* Stats cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Responses</p>
            <p className="text-3xl font-bold mt-1">
              {campaign.response_count}
              {campaign.response_goal && (
                <span className="text-base font-normal text-muted-foreground">
                  {" "}
                  / {campaign.response_goal}
                </span>
              )}
            </p>
          </CardContent>
        </Card>

        {/* Type-specific stat */}
        {campaign.type === "nps" && analytics?.nps_score !== undefined && (
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">NPS Score</p>
              <p
                className={`text-3xl font-bold mt-1 ${
                  analytics.nps_score >= 50
                    ? "text-green-600"
                    : analytics.nps_score >= 0
                    ? "text-amber-600"
                    : "text-red-600"
                }`}
              >
                {analytics.nps_score > 0 ? "+" : ""}
                {analytics.nps_score}
              </p>
            </CardContent>
          </Card>
        )}

        {campaign.type === "nps" && analytics?.promoters !== undefined && (
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Breakdown</p>
              <div className="flex items-center gap-3 mt-2">
                <div className="text-center">
                  <p className="text-lg font-bold text-green-600">
                    {analytics.promoters}
                  </p>
                  <p className="text-xs text-muted-foreground">Promoters</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-amber-600">
                    {analytics.passives}
                  </p>
                  <p className="text-xs text-muted-foreground">Passives</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-red-600">
                    {analytics.detractors}
                  </p>
                  <p className="text-xs text-muted-foreground">Detractors</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {campaign.type !== "nps" && (
          <>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Status</p>
                <p className="text-lg font-bold mt-1 capitalize">
                  {campaign.status}
                </p>
                {campaign.starts_at && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Since{" "}
                    {new Date(campaign.starts_at).toLocaleDateString()}
                  </p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Unique Visitors</p>
                <p className="text-3xl font-bold mt-1">
                  {new Set(
                    responses.filter((r) => r.visitor_id).map((r) => r.visitor_id)
                  ).size || "\u2014"}
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Type-specific visualization */}
      {analytics && campaign.response_count > 0 && (
        <TypeVisualization
          campaign={campaign}
          analytics={analytics}
        />
      )}

      {/* Response Trend Chart */}
      {analytics?.daily_trend && analytics.daily_trend.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Response Trend</CardTitle>
            <CardDescription>Daily responses over the last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={trendChartConfig}
              className="h-[250px] w-full"
            >
              <LineChart
                data={analytics.daily_trend}
                margin={{ left: 12, right: 12, top: 12, bottom: 12 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  fontSize={12}
                  tickFormatter={(d) =>
                    new Date(d).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })
                  }
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  fontSize={12}
                  allowDecimals={false}
                />
                <ChartTooltip
                  cursor={false}
                  content={
                    <ChartTooltipContent
                      labelFormatter={(value) =>
                        new Date(value).toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })
                      }
                    />
                  }
                />
                <Line
                  dataKey="count"
                  type="monotone"
                  stroke="var(--color-count)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      {/* AI Summary */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                AI Insights
              </CardTitle>
              <CardDescription>
                {summary
                  ? `Generated ${new Date(summary.generated_at).toLocaleString()}`
                  : "AI-powered analysis of responses"}
              </CardDescription>
            </div>
            <button
              onClick={generateSummary}
              disabled={
                generatingSummary || campaign.response_count < 5
              }
              className="inline-flex items-center gap-1.5 px-3 py-1.5 border rounded-md text-sm hover:bg-muted disabled:opacity-50 disabled:pointer-events-none"
            >
              {generatingSummary ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              {summary ? "Regenerate" : "Generate"}
            </button>
          </div>
        </CardHeader>
        <CardContent>
          {summary ? (
            <div className="space-y-4">
              <p className="text-sm leading-relaxed">{summary.summary_text}</p>
              {summary.themes && summary.themes.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Key Themes</p>
                  <div className="flex flex-wrap gap-2">
                    {summary.themes.map((theme, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-muted"
                      >
                        {theme.label}
                        <span className="text-muted-foreground">
                          ({theme.count})
                        </span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {campaign.response_count < 5
                ? `Need at least 5 responses to generate insights (${campaign.response_count} so far).`
                : "Click Generate to create an AI summary of responses."}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Recent Responses */}
      <Card>
        <CardHeader>
          <CardTitle>
            Recent Responses
            {responsesTotal > 0 && (
              <span className="text-sm font-normal text-muted-foreground ml-2">
                ({responsesTotal})
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {responses.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No responses yet. Responses will appear here as they come in.
            </div>
          ) : (
            <div className="divide-y">
              {responses.map((r) => (
                <ResponseRow
                  key={r.id}
                  response={r}
                  type={campaign.type}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Type-specific Visualization ─────────────────────────────────────────────

function TypeVisualization({
  campaign,
  analytics,
}: {
  campaign: Campaign;
  analytics: Analytics;
}) {
  if (campaign.type === "nps" && analytics.score_distribution) {
    const chartConfig: ChartConfig = {
      count: {
        label: "Responses",
        color: "hsl(var(--primary))",
      },
    };

    const data = analytics.score_distribution.map((d) => ({
      ...d,
      fill:
        d.score <= 6
          ? "hsl(0, 84%, 60%)"
          : d.score <= 8
          ? "hsl(45, 93%, 47%)"
          : "hsl(142, 76%, 36%)",
    }));

    return (
      <Card>
        <CardHeader>
          <CardTitle>Score Distribution</CardTitle>
          <CardDescription>
            Detractors (0-6) / Passives (7-8) / Promoters (9-10)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[200px] w-full">
            <BarChart
              data={data}
              margin={{ left: 12, right: 12, top: 12, bottom: 12 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="score"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                fontSize={12}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                fontSize={12}
                allowDecimals={false}
              />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent />}
              />
              <Bar
                dataKey="count"
                radius={[4, 4, 0, 0]}
                fill="var(--color-count)"
              />
            </BarChart>
          </ChartContainer>
          <div className="flex items-center justify-center gap-6 mt-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-red-500" />
              <span className="text-muted-foreground">
                Detractors ({analytics.detractors})
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-amber-500" />
              <span className="text-muted-foreground">
                Passives ({analytics.passives})
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-green-600" />
              <span className="text-muted-foreground">
                Promoters ({analytics.promoters})
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (campaign.type === "poll" && analytics.option_counts) {
    const options = Object.entries(analytics.option_counts).sort(
      ([, a], [, b]) => b - a
    );
    const maxCount = Math.max(...options.map(([, c]) => c), 1);

    return (
      <Card>
        <CardHeader>
          <CardTitle>Poll Results</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {options.map(([option, count]) => {
            const pct =
              analytics.total_responses > 0
                ? Math.round((count / analytics.total_responses) * 100)
                : 0;
            return (
              <div key={option}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium">{option}</span>
                  <span className="text-muted-foreground">
                    {count} ({pct}%)
                  </span>
                </div>
                <div className="h-3 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-purple-600 transition-all"
                    style={{ width: `${(count / maxCount) * 100}%` }}
                  />
                </div>
              </div>
            );
          })}
          {(analytics.other_count ?? 0) > 0 && (
            <p className="text-xs text-muted-foreground mt-2">
              {analytics.other_count} &quot;Other&quot; responses
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  if (campaign.type === "sentiment" && analytics.emoji_counts) {
    const entries = Object.entries(analytics.emoji_counts).sort(
      ([a], [b]) => Number(a) - Number(b)
    );
    const maxCount = Math.max(...entries.map(([, c]) => c), 1);

    return (
      <Card>
        <CardHeader>
          <CardTitle>Sentiment Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end justify-center gap-6">
            {entries.map(([emoji, count]) => {
              const height = Math.max((count / maxCount) * 120, 8);
              const pct =
                analytics.total_responses > 0
                  ? Math.round((count / analytics.total_responses) * 100)
                  : 0;
              return (
                <div key={emoji} className="flex flex-col items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {count} ({pct}%)
                  </span>
                  <div
                    className="w-12 rounded-t-md bg-amber-400 transition-all"
                    style={{ height }}
                  />
                  <span className="text-2xl">
                    {SENTIMENT_EMOJIS[emoji] || emoji}
                  </span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (campaign.type === "feedback") {
    return null; // Feedback is text — shown in responses list
  }

  return null;
}

// ─── Response Row ────────────────────────────────────────────────────────────

function ResponseRow({
  response,
  type,
}: {
  response: PulseResponseItem;
  type: string;
}) {
  const a = response.answer || {};

  const renderAnswer = () => {
    switch (type) {
      case "nps": {
        const score = (a as Record<string, unknown>).score as number;
        const followUp = (a as Record<string, unknown>).follow_up as string;
        return (
          <div className="flex items-center gap-3">
            <span
              className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold text-white ${
                score >= 9
                  ? "bg-green-600"
                  : score >= 7
                  ? "bg-amber-500"
                  : "bg-red-500"
              }`}
            >
              {score}
            </span>
            {followUp && (
              <span className="text-sm text-muted-foreground truncate">
                {followUp}
              </span>
            )}
          </div>
        );
      }
      case "poll": {
        const option = (a as Record<string, unknown>).option as string;
        const otherText = (a as Record<string, unknown>).other_text as string;
        return (
          <span className="text-sm">
            {option}
            {otherText && (
              <span className="text-muted-foreground"> &mdash; {otherText}</span>
            )}
          </span>
        );
      }
      case "sentiment": {
        const emoji = (a as Record<string, unknown>).emoji as string;
        const followUp = (a as Record<string, unknown>).follow_up as string;
        return (
          <div className="flex items-center gap-2">
            <span className="text-xl">
              {SENTIMENT_EMOJIS[emoji] || emoji}
            </span>
            {followUp && (
              <span className="text-sm text-muted-foreground truncate">
                {followUp}
              </span>
            )}
          </div>
        );
      }
      case "feedback": {
        const text = (a as Record<string, unknown>).text as string;
        return <span className="text-sm">{text}</span>;
      }
      default:
        return <span className="text-sm text-muted-foreground">-</span>;
    }
  };

  return (
    <div className="px-6 py-3 flex items-center justify-between gap-4">
      <div className="min-w-0 flex-1">{renderAnswer()}</div>
      <div className="flex items-center gap-4 flex-shrink-0 text-xs text-muted-foreground">
        {response.page_url && (
          <span className="truncate max-w-[150px]" title={response.page_url}>
            {response.page_url}
          </span>
        )}
        <span>{new Date(response.created_at).toLocaleString()}</span>
      </div>
    </div>
  );
}
