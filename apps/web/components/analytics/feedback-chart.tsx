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
import { useTranslations } from "next-intl";
import { CartesianGrid, XAxis, YAxis, Bar, BarChart } from "recharts";

interface FeedbackTimelineEntry {
  date: string;
  helpful: number;
  unhelpful: number;
}

interface FeedbackChartProps {
  data: FeedbackTimelineEntry[];
  loading: boolean;
  period: "24h" | "7d" | "30d";
}

export function FeedbackChart({ data, loading, period }: FeedbackChartProps) {
  const t = useTranslations("dashboard.pages.feedback.chart");
  const tStats = useTranslations("dashboard.pages.feedback.stats");
  const tPeriods = useTranslations("dashboard.pages.feedback.periods");

  const chartConfig: ChartConfig = {
    helpful: {
      label: tStats("helpful"),
      color: "hsl(142, 76%, 36%)", // Green
    },
    unhelpful: {
      label: tStats("notHelpful"),
      color: "hsl(0, 84%, 60%)", // Red
    },
  };

  // Format date for display based on period
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    if (period === "24h") {
      return date.toLocaleTimeString("en-US", { hour: "numeric" });
    }
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  // Calculate totals for description
  const totalHelpful = data.reduce((sum, d) => sum + d.helpful, 0);
  const totalUnhelpful = data.reduce((sum, d) => sum + d.unhelpful, 0);
  const total = totalHelpful + totalUnhelpful;
  const satisfactionRate = total > 0 ? ((totalHelpful / total) * 100).toFixed(1) : "0";

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

  // Check if we have any data
  const hasData = data.some((d) => d.helpful > 0 || d.unhelpful > 0);

  if (!hasData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>{tPeriods(period)}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <p className="text-lg font-medium">{t("emptyTitle")}</p>
              <p className="text-sm">
                {t("emptyDescription")}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>
          {tPeriods(period)} - {t("summary", { count: total, rate: satisfactionRate })}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <BarChart
            data={data}
            margin={{ left: 12, right: 12, top: 12, bottom: 12 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={formatDate}
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
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => {
                    const date = new Date(value);
                    return date.toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    });
                  }}
                />
              }
            />
            <Bar
              dataKey="helpful"
              fill="var(--color-helpful)"
              radius={[4, 4, 0, 0]}
              stackId="feedback"
            />
            <Bar
              dataKey="unhelpful"
              fill="var(--color-unhelpful)"
              radius={[4, 4, 0, 0]}
              stackId="feedback"
            />
          </BarChart>
        </ChartContainer>
        <div className="flex items-center justify-center gap-6 mt-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-green-600" />
            <span className="text-muted-foreground">{tStats("helpful")} ({totalHelpful})</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-red-500" />
            <span className="text-muted-foreground">{tStats("notHelpful")} ({totalUnhelpful})</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
