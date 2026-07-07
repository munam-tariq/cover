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
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

interface TimelineEntry {
  date: string;
  messages: number;
  conversations: number;
}

interface MessagesChartProps {
  data: TimelineEntry[];
  loading: boolean;
  period: "24h" | "7d" | "30d";
}

export function MessagesChart({ data, loading, period }: MessagesChartProps) {
  const t = useTranslations("dashboard.pages.analytics.messagesChart");
  const tPeriods = useTranslations("dashboard.pages.analytics.periods");

  const chartConfig: ChartConfig = {
    messages: {
      label: t("legendMessages"),
      color: "hsl(var(--primary))",
    },
    conversations: {
      label: t("legendConversations"),
      color: "hsl(var(--muted-foreground))",
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
  const totalMessages = data.reduce((sum, d) => sum + d.messages, 0);
  const totalConversations = data.reduce((sum, d) => sum + d.conversations, 0);

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
  const hasData = data.some((d) => d.messages > 0 || d.conversations > 0);

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
          {tPeriods(period)} - {t("summary", { count: totalMessages, conversations: totalConversations })}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <LineChart
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
            <Line
              dataKey="messages"
              type="monotone"
              stroke="var(--color-messages)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
            <Line
              dataKey="conversations"
              type="monotone"
              stroke="var(--color-conversations)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
              strokeDasharray="4 4"
            />
          </LineChart>
        </ChartContainer>
        <div className="flex items-center justify-center gap-6 mt-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-primary" />
            <span className="text-muted-foreground">{t("legendMessages")}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-muted-foreground" />
            <span className="text-muted-foreground">{t("legendConversations")}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
