"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@chatbot/ui";
import { Tags } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

import { apiClient } from "@/lib/api-client";

interface TopicCount {
  topic: string;
  count: number;
}

interface TopicsPanelProps {
  projectId: string;
  days: number;
}

export function TopicsPanel({ projectId, days }: TopicsPanelProps) {
  const t = useTranslations("dashboard.pages.analytics.topics");
  const [topics, setTopics] = useState<TopicCount[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiClient<{ topics: TopicCount[] }>(
        `/api/analytics/topics?projectId=${projectId}&days=${days}`
      );
      setTopics(data.topics);
    } catch (err) {
      console.error("Failed to load topics:", err);
      setTopics([]);
    } finally {
      setLoading(false);
    }
  }, [projectId, days]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>{t("loadingDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 w-full bg-muted animate-pulse rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (topics.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>{t("description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="py-8 text-center text-muted-foreground">
            <Tags className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-lg font-medium">{t("emptyTitle")}</p>
            <p className="text-sm">
              {t("emptyDescription")}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const maxCount = Math.max(...topics.map((topic) => topic.count));

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>
          {t("descriptionRanked")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {topics.map((topic, index) => (
            <div key={topic.topic} className="space-y-2">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="flex-shrink-0 flex items-center justify-center h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs font-medium">
                    {index + 1}
                  </span>
                  <p className="text-sm font-medium truncate">{topic.topic}</p>
                </div>
                <span className="flex-shrink-0 text-sm font-medium tabular-nums">
                  {topic.count}
                </span>
              </div>
              <div className="ms-8 h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-300"
                  style={{ width: `${(topic.count / maxCount) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
