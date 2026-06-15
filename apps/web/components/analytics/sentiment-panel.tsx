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

const chartConfig: ChartConfig = {
  positive: { label: "Positive", color: "hsl(142 71% 45%)" },
  neutral: { label: "Neutral", color: "hsl(var(--muted-foreground))" },
  negative: { label: "Negative", color: "hsl(0 72% 51%)" },
};

const SENTIMENTS = [
  { key: "positive" as const, label: "Positive", dot: "bg-emerald-500" },
  { key: "neutral" as const, label: "Neutral", dot: "bg-muted-foreground" },
  { key: "negative" as const, label: "Negative", dot: "bg-red-500" },
];

export function SentimentPanel({ projectId, days }: SentimentPanelProps) {
  const [data, setData] = useState<SentimentResponse | null>(null);
  const [loading, setLoading] = useState(true);

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
          <CardTitle>Sentiment</CardTitle>
          <CardDescription>Loading sentiment...</CardDescription>
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
          <CardTitle>Sentiment</CardTitle>
          <CardDescription>How visitors feel in conversations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="py-8 text-center text-muted-foreground">
            <SmilePlus className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-lg font-medium">No sentiment yet</p>
            <p className="text-sm">
              Sentiment is detected nightly once conversations are classified
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
        <CardTitle>Sentiment</CardTitle>
        <CardDescription>
          {grandTotal} classified conversations
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
