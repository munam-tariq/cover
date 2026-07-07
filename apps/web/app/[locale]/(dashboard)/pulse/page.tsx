"use client";

import { Card, CardContent, Skeleton, Badge } from "@chatbot/ui";
import { Plus, Activity, BarChart3, MessageSquare, SmilePlus, FileText } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState, useCallback } from "react";

import { useProject } from "@/contexts/project-context";
import { useRouter } from "@/i18n/navigation";
import { apiClient } from "@/lib/api-client";


interface Campaign {
  id: string;
  type: "nps" | "poll" | "sentiment" | "feedback";
  question: string;
  status: "draft" | "active" | "paused" | "completed";
  response_count: number;
  response_goal: number | null;
  created_at: string;
  updated_at: string;
}

const TYPE_META: Record<string, { labelKey: "nps" | "poll" | "sentiment" | "feedback"; icon: React.ReactNode; color: string }> = {
  nps: { labelKey: "nps", icon: <BarChart3 className="h-4 w-4" />, color: "text-blue-600 bg-blue-50" },
  poll: { labelKey: "poll", icon: <MessageSquare className="h-4 w-4" />, color: "text-purple-600 bg-purple-50" },
  sentiment: { labelKey: "sentiment", icon: <SmilePlus className="h-4 w-4" />, color: "text-amber-600 bg-amber-50" },
  feedback: { labelKey: "feedback", icon: <FileText className="h-4 w-4" />, color: "text-green-600 bg-green-50" },
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  active: "default",
  draft: "outline",
  paused: "secondary",
  completed: "secondary",
};

export default function PulsePage() {
  const t = useTranslations("dashboard.pages.pulse");
  const locale = useLocale();
  const { currentProject, isLoading: projectLoading } = useProject();
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const fetchCampaigns = useCallback(async () => {
    if (!currentProject?.id) return;

    setLoading(true);
    setError(null);

    try {
      const statusQuery = statusFilter !== "all" ? `&status=${statusFilter}` : "";
      const data = await apiClient<{ campaigns: Campaign[]; total: number }>(
        `/api/projects/${currentProject.id}/pulse/campaigns?limit=50${statusQuery}`
      );
      setCampaigns(data.campaigns || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error("Failed to fetch campaigns:", err);
      setError(t("states.loadError"));
    } finally {
      setLoading(false);
    }
  }, [currentProject?.id, statusFilter, t]);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  if (projectLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!currentProject) {
    return <div className="text-muted-foreground">{t("states.noProjectSelected")}</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="text-muted-foreground">
            {t("listSubtitle")}
          </p>
        </div>
        <button
          onClick={() => router.push("/pulse/new")}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Plus className="h-4 w-4" />
          {t("newCampaign")}
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-1">
        {["all", "active", "draft", "paused", "completed"].map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              statusFilter === status
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {status === "all"
              ? t("status.all")
              : status === "active"
              ? t("status.active")
              : status === "draft"
              ? t("status.draft")
              : status === "paused"
              ? t("status.paused")
              : t("status.completed")}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 rounded-md bg-destructive/10 text-destructive text-sm flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="text-destructive/70 hover:text-destructive ms-2"
          >
            &times;
          </button>
        </div>
      )}

      {/* Campaign List */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : campaigns.length === 0 ? (
            <div className="p-12 text-center">
              <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              {statusFilter === "all" ? (
                <>
                  <h3 className="text-lg font-medium mb-1">{t("states.empty")}</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {t("states.emptyDescription")}
                  </p>
                  <button
                    onClick={() => router.push("/pulse/new")}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:opacity-90"
                  >
                    <Plus className="h-4 w-4" />
                    {t("createCampaign")}
                  </button>
                </>
              ) : (
                <>
                  <h3 className="text-lg font-medium mb-1">
                    {t("states.emptyFiltered", {
                      status:
                        statusFilter === "active"
                          ? t("status.active")
                          : statusFilter === "draft"
                          ? t("status.draft")
                          : statusFilter === "paused"
                          ? t("status.paused")
                          : t("status.completed"),
                    })}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {t("states.emptyFilteredDescription")}
                  </p>
                  <button
                    onClick={() => setStatusFilter("all")}
                    className="text-sm text-primary hover:underline"
                  >
                    {t("states.viewAll")}
                  </button>
                </>
              )}
            </div>
          ) : (
            <div>
              {/* Table header */}
              <div className="grid grid-cols-[1fr_100px_80px_120px_100px] gap-4 px-6 py-3 border-b bg-muted/30 text-xs font-medium text-muted-foreground uppercase">
                <span>{t("table.campaign")}</span>
                <span>{t("table.type")}</span>
                <span>{t("table.status")}</span>
                <span>{t("table.responses")}</span>
                <span>{t("table.created")}</span>
              </div>

              {/* Table rows */}
              {campaigns.map((campaign) => {
                const meta = TYPE_META[campaign.type] || TYPE_META.feedback;
                return (
                  <div key={campaign.id} className="border-b last:border-b-0">
                    <button
                      onClick={() => router.push(`/pulse/${campaign.id}`)}
                      className="w-full grid grid-cols-[1fr_100px_80px_120px_100px] gap-4 px-6 py-4 text-start hover:bg-muted/20 transition-colors"
                    >
                      <span className="font-medium truncate">
                        {campaign.question}
                      </span>
                      <span>
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${meta.color}`}>
                          {meta.icon}
                          {t(`typeShort.${meta.labelKey}`)}
                        </span>
                      </span>
                      <span>
                        <Badge variant={STATUS_VARIANT[campaign.status] || "outline"}>
                          {campaign.status === "active"
                            ? t("status.active")
                            : campaign.status === "draft"
                            ? t("status.draft")
                            : campaign.status === "paused"
                            ? t("status.paused")
                            : t("status.completed")}
                        </Badge>
                      </span>
                      <span className="text-muted-foreground">
                        {campaign.response_count}
                        {campaign.response_goal
                          ? ` / ${campaign.response_goal}`
                          : ""}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {new Date(campaign.created_at).toLocaleDateString(locale === "ar" ? "ar-u-nu-latn" : undefined)}
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Total count */}
      {total > 0 && (
        <p className="text-sm text-muted-foreground">
          {t("total", { count: total })}
        </p>
      )}
    </div>
  );
}
