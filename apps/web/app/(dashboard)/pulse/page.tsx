"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, Skeleton, Badge } from "@chatbot/ui";
import { apiClient } from "@/lib/api-client";
import { useProject } from "@/contexts/project-context";
import { Plus, Activity, BarChart3, MessageSquare, SmilePlus, FileText } from "lucide-react";

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

const TYPE_META: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  nps: { label: "NPS", icon: <BarChart3 className="h-4 w-4" />, color: "text-blue-600 bg-blue-50" },
  poll: { label: "Poll", icon: <MessageSquare className="h-4 w-4" />, color: "text-purple-600 bg-purple-50" },
  sentiment: { label: "Sentiment", icon: <SmilePlus className="h-4 w-4" />, color: "text-amber-600 bg-amber-50" },
  feedback: { label: "Feedback", icon: <FileText className="h-4 w-4" />, color: "text-green-600 bg-green-50" },
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  active: "default",
  draft: "outline",
  paused: "secondary",
  completed: "secondary",
};

export default function PulsePage() {
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
      setError("Failed to load campaigns");
    } finally {
      setLoading(false);
    }
  }, [currentProject?.id, statusFilter]);

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
    return <div className="text-muted-foreground">No project selected</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Pulse</h1>
          <p className="text-muted-foreground">
            Micro-survey popups to capture visitor feedback
          </p>
        </div>
        <button
          onClick={() => router.push("/pulse/new")}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Plus className="h-4 w-4" />
          New Campaign
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
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 rounded-md bg-destructive/10 text-destructive text-sm flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="text-destructive/70 hover:text-destructive ml-2"
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
                  <h3 className="text-lg font-medium mb-1">No campaigns yet</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Create your first micro-survey to start capturing visitor feedback.
                  </p>
                  <button
                    onClick={() => router.push("/pulse/new")}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:opacity-90"
                  >
                    <Plus className="h-4 w-4" />
                    Create Campaign
                  </button>
                </>
              ) : (
                <>
                  <h3 className="text-lg font-medium mb-1">
                    No {statusFilter} campaigns
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Try a different filter or create a new campaign.
                  </p>
                  <button
                    onClick={() => setStatusFilter("all")}
                    className="text-sm text-primary hover:underline"
                  >
                    View all campaigns
                  </button>
                </>
              )}
            </div>
          ) : (
            <div>
              {/* Table header */}
              <div className="grid grid-cols-[1fr_100px_80px_120px_100px] gap-4 px-6 py-3 border-b bg-muted/30 text-xs font-medium text-muted-foreground uppercase">
                <span>Campaign</span>
                <span>Type</span>
                <span>Status</span>
                <span>Responses</span>
                <span>Created</span>
              </div>

              {/* Table rows */}
              {campaigns.map((campaign) => {
                const meta = TYPE_META[campaign.type] || TYPE_META.feedback;
                return (
                  <div key={campaign.id} className="border-b last:border-b-0">
                    <button
                      onClick={() => router.push(`/pulse/${campaign.id}`)}
                      className="w-full grid grid-cols-[1fr_100px_80px_120px_100px] gap-4 px-6 py-4 text-left hover:bg-muted/20 transition-colors"
                    >
                      <span className="font-medium truncate">
                        {campaign.question}
                      </span>
                      <span>
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${meta.color}`}>
                          {meta.icon}
                          {meta.label}
                        </span>
                      </span>
                      <span>
                        <Badge variant={STATUS_VARIANT[campaign.status] || "outline"}>
                          {campaign.status}
                        </Badge>
                      </span>
                      <span className="text-muted-foreground">
                        {campaign.response_count}
                        {campaign.response_goal
                          ? ` / ${campaign.response_goal}`
                          : ""}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {new Date(campaign.created_at).toLocaleDateString()}
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
          {total} campaign{total !== 1 ? "s" : ""}
        </p>
      )}
    </div>
  );
}
