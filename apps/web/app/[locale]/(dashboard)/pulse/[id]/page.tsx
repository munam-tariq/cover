"use client";

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
import { useParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState, useCallback } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
  Bar,
  BarChart,
} from "recharts";

import { useProject } from "@/contexts/project-context";
import { useRouter } from "@/i18n/navigation";
import { apiClient } from "@/lib/api-client";

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
  { labelKey: "nps" | "poll" | "sentiment" | "feedback"; icon: React.ReactNode; color: string }
> = {
  nps: {
    labelKey: "nps",
    icon: <BarChart3 className="h-4 w-4" />,
    color: "text-blue-600 bg-blue-50",
  },
  poll: {
    labelKey: "poll",
    icon: <MessageSquare className="h-4 w-4" />,
    color: "text-purple-600 bg-purple-50",
  },
  sentiment: {
    labelKey: "sentiment",
    icon: <SmilePlus className="h-4 w-4" />,
    color: "text-amber-600 bg-amber-50",
  },
  feedback: {
    labelKey: "feedback",
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

// ─── Component ───────────────────────────────────────────────────────────────

export default function CampaignResultsPage() {
  const t = useTranslations("dashboard.pages.pulse");
  const locale = useLocale();
  const { currentProject } = useProject();
  const router = useRouter();
  const params = useParams();
  const campaignId = String(params?.id ?? "");
  const dateLocale = locale === "ar" ? "ar-u-nu-latn" : "en-US";
  const trendChartConfig: ChartConfig = {
    count: {
      label: t("detail.responses"),
      color: "hsl(var(--primary))",
    },
  };
  const statusLabel = (status: Campaign["status"]) => {
    switch (status) {
      case "active":
        return t("status.active");
      case "draft":
        return t("status.draft");
      case "paused":
        return t("status.paused");
      case "completed":
        return t("status.completed");
      default:
        return status;
    }
  };

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
      setError(t("states.loadError"));
    } finally {
      setLoading(false);
    }
  }, [currentProject?.id, campaignId, t]);

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
      setActionError(t("detail.statusActionError"));
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (
      !currentProject?.id ||
      !campaignId ||
      !confirm(t("actions.deleteConfirm"))
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
      setActionError(t("actions.summaryError"));
    } finally {
      setGeneratingSummary(false);
    }
  };

  const exportCsv = () => {
    if (!campaign || responses.length === 0) return;

    const rows: string[][] = [];

    // Header
    if (campaign.type === "nps") {
      rows.push([
        t("csv.date"),
        t("csv.score"),
        t("csv.followUp"),
        t("csv.page"),
        t("csv.visitor"),
      ]);
    } else if (campaign.type === "poll") {
      rows.push([
        t("csv.date"),
        t("csv.option"),
        t("csv.otherText"),
        t("csv.page"),
        t("csv.visitor"),
      ]);
    } else if (campaign.type === "sentiment") {
      rows.push([
        t("csv.date"),
        t("csv.emoji"),
        t("csv.followUp"),
        t("csv.page"),
        t("csv.visitor"),
      ]);
    } else {
      rows.push([t("csv.date"), t("csv.text"), t("csv.page"), t("csv.visitor")]);
    }

    // Data rows
    for (const r of responses) {
      const date = new Date(r.created_at).toLocaleString(dateLocale);
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
          <ArrowLeft className="h-4 w-4 rtl:-scale-x-100" />
          {t("detail.backToPulse")}
        </button>
        <div className="p-4 rounded-md bg-destructive/10 text-destructive text-sm">
          {error || t("states.notFound")}
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
            <ArrowLeft className="h-4 w-4 rtl:-scale-x-100" />
          </button>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold truncate">{campaign.question}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span
                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${meta.color}`}
              >
                {meta.icon}
                {t(`campaignTypes.${meta.labelKey}`)}
              </span>
              <Badge variant={STATUS_VARIANT[campaign.status] || "outline"}>
                {statusLabel(campaign.status)}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {t("detail.created", {
                  date: new Date(campaign.created_at).toLocaleDateString(dateLocale),
                })}
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
              {t("actions.activate")}
            </button>
          )}
          {campaign.status === "active" && (
            <button
              onClick={() => updateStatus("paused")}
              disabled={statusUpdating}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 border rounded-md text-sm hover:bg-muted disabled:opacity-50"
            >
              <Pause className="h-3.5 w-3.5" />
              {t("actions.pause")}
            </button>
          )}
          {campaign.status === "paused" && (
            <button
              onClick={() => updateStatus("active")}
              disabled={statusUpdating}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-md text-sm hover:bg-green-700 disabled:opacity-50"
            >
              <Play className="h-3.5 w-3.5" />
              {t("actions.resume")}
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
              {t("actions.complete")}
            </button>
          )}
          <button
            onClick={exportCsv}
            disabled={responses.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 border rounded-md text-sm hover:bg-muted disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5" />
            {t("actions.exportCsv")}
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
            className="text-destructive/70 hover:text-destructive ms-2"
          >
            &times;
          </button>
        </div>
      )}

      {/* Stats cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">{t("detail.totalResponses")}</p>
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
              <p className="text-sm text-muted-foreground">{t("detail.npsScore")}</p>
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
              <p className="text-sm text-muted-foreground">{t("detail.breakdown")}</p>
              <div className="flex items-center gap-3 mt-2">
                <div className="text-center">
                  <p className="text-lg font-bold text-green-600">
                    {analytics.promoters}
                  </p>
                  <p className="text-xs text-muted-foreground">{t("detail.promoters")}</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-amber-600">
                    {analytics.passives}
                  </p>
                  <p className="text-xs text-muted-foreground">{t("detail.passives")}</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-red-600">
                    {analytics.detractors}
                  </p>
                  <p className="text-xs text-muted-foreground">{t("detail.detractors")}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {campaign.type !== "nps" && (
          <>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">{t("table.status")}</p>
                <p className="text-lg font-bold mt-1">
                  {statusLabel(campaign.status)}
                </p>
                {campaign.starts_at && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {t("detail.statusSince", {
                      date: new Date(campaign.starts_at).toLocaleDateString(dateLocale),
                    })}
                  </p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">{t("detail.uniqueVisitors")}</p>
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
            <CardTitle>{t("detail.responseTrend")}</CardTitle>
            <CardDescription>{t("detail.responseTrendDescription")}</CardDescription>
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
                    new Date(d).toLocaleDateString(dateLocale, {
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
                        new Date(value).toLocaleDateString(dateLocale, {
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
                {t("detail.aiInsights")}
              </CardTitle>
              <CardDescription>
                {summary
                  ? t("detail.generated", {
                      date: new Date(summary.generated_at).toLocaleString(dateLocale),
                    })
                  : t("detail.aiSummaryDescription")}
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
              {summary ? t("actions.regenerateSummary") : t("actions.generate")}
            </button>
          </div>
        </CardHeader>
        <CardContent>
          {summary ? (
            <div className="space-y-4">
              <p className="text-sm leading-relaxed">{summary.summary_text}</p>
              {summary.themes && summary.themes.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">{t("detail.keyThemes")}</p>
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
                ? t("detail.summaryNeedsResponses", {
                    count: campaign.response_count,
                  })
                : t("detail.summaryEmpty")}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Recent Responses */}
      <Card>
        <CardHeader>
          <CardTitle>
            {t("detail.recentResponses")}
            {responsesTotal > 0 && (
              <span className="text-sm font-normal text-muted-foreground ms-2">
                ({responsesTotal})
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {responses.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              {t("detail.noResponses")}
            </div>
          ) : (
            <div className="divide-y">
              {responses.map((r) => (
                <ResponseRow
                  key={r.id}
                  response={r}
                  type={campaign.type}
                  dateLocale={dateLocale}
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
  const t = useTranslations("dashboard.pages.pulse");

  if (campaign.type === "nps" && analytics.score_distribution) {
    const chartConfig: ChartConfig = {
      count: {
        label: t("detail.responses"),
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
          <CardTitle>{t("detail.scoreDistribution")}</CardTitle>
          <CardDescription>
            {t("detail.scoreDistributionDescription")}
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
                {t("detail.detractors")} ({analytics.detractors})
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-amber-500" />
              <span className="text-muted-foreground">
                {t("detail.passives")} ({analytics.passives})
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-green-600" />
              <span className="text-muted-foreground">
                {t("detail.promoters")} ({analytics.promoters})
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
          <CardTitle>{t("detail.pollResults")}</CardTitle>
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
              {t("detail.otherResponses", { count: analytics.other_count ?? 0 })}
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
          <CardTitle>{t("detail.sentimentDistribution")}</CardTitle>
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
  dateLocale,
}: {
  response: PulseResponseItem;
  type: string;
  dateLocale: string;
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
        <span>{new Date(response.created_at).toLocaleString(dateLocale)}</span>
      </div>
    </div>
  );
}
