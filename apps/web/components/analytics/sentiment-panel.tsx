"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@chatbot/ui";
import { SmilePlus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

import { apiClient } from "@/lib/api-client";

interface SentimentTotals {
  positive: number;
  neutral: number;
  negative: number;
}

interface SentimentDay extends SentimentTotals {
  date: string;
}

interface SentimentResponse {
  totals: SentimentTotals;
  timeline: SentimentDay[];
}

interface SentimentPanelProps {
  projectId: string;
  days: number;
}

const SENTIMENT_DOTS = {
  positive: "bg-emerald-500",
  neutral: "bg-muted-foreground",
  negative: "bg-red-500",
} as const;

export function SentimentPanel({ projectId, days }: SentimentPanelProps) {
  const t = useTranslations("dashboard.pages.analytics.sentiment");
  const [data, setData] = useState<SentimentResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const chartConfig: ChartConfig = {
    positive: { label: t("positive"), color: "hsl(142 71% 45%)" },
    neutral: { label: t("neutral"), color: "hsl(var(--muted-foreground))" },
    negative: { label: t("negative"), color: "hsl(0 72% 51%)" },
  };

  const SENTIMENTS = [
    { key: "positive" as const, label: t("positive"), dot: SENTIMENT_DOTS.positive },
    { key: "neutral" as const, label: t("neutral"), dot: SENTIMENT_DOTS.neutral },
    { key: "negative" as const, label: t("negative"), dot: SENTIMENT_DOTS.negative },
  ];

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient<SentimentResponse>(
        `/api/analytics/sentiment?projectId=${projectId}&days=${days}`
      );
      setData(res);
    } catch (err) {
      console.error("Failed to load sentiment:", err);
      setData(null);
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
          <div className="h-[300px] w-full bg-muted animate-pulse rounded" />
        </CardContent>
      </Card>
    );
  }

  const totals = data?.totals ?? { positive: 0, neutral: 0, negative: 0 };
  const grandTotal = totals.positive + totals.neutral + totals.negative;

  if (!data || grandTotal === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>{t("description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="py-8 text-center text-muted-foreground">
            <SmilePlus className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-lg font-medium">{t("emptyTitle")}</p>
            <p className="text-sm">
              {t("emptyDescription")}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const pct = (n: number) => Math.round((n / grandTotal) * 100);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>
          {t("classifiedCount", { count: grandTotal })}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4 mb-6">
          {SENTIMENTS.map((s) => (
            <div key={s.key} className="rounded-lg border p-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className={`h-2.5 w-2.5 rounded-full ${s.dot}`} />
                {s.label}
              </div>
              <div className="mt-1 text-2xl font-bold tabular-nums">
                {totals[s.key]}
              </div>
              <div className="text-xs text-muted-foreground">
                {pct(totals[s.key])}%
              </div>
            </div>
          ))}
        </div>

        <ChartContainer config={chartConfig} className="h-[260px] w-full">
          <LineChart
            data={data.timeline}
            margin={{ left: 12, right: 12, top: 12, bottom: 12 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              fontSize={12}
              tickFormatter={(value) =>
                new Date(value).toLocaleDateString("en-US", {
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
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            {SENTIMENTS.map((s) => (
              <Line
                key={s.key}
                dataKey={s.key}
                type="monotone"
                stroke={`var(--color-${s.key})`}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            ))}
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
