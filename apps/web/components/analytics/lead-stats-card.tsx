"use client";

import { Card, CardContent } from "@chatbot/ui";
import { type LucideIcon } from "lucide-react";

interface LeadStatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: number | null;
  loading?: boolean;
}

export function LeadStatsCard({ title, value, icon: Icon, trend, loading }: LeadStatsCardProps) {
  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="h-3 w-24 bg-muted animate-pulse rounded" />
            <div className="h-8 w-8 bg-muted animate-pulse rounded-full" />
          </div>
          <div className="h-8 w-16 bg-muted animate-pulse rounded mb-2" />
          <div className="h-3 w-32 bg-muted animate-pulse rounded" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-muted-foreground">{title}</span>
          <Icon className="h-4 w-4 text-muted-foreground/60" />
        </div>
        <div className="text-3xl font-bold tracking-tight mb-1">{value}</div>
        <p className="text-xs text-muted-foreground">
          {trend != null && trend !== 0 ? (
            <span className={trend > 0 ? "text-green-600" : "text-red-500"}>
              {trend > 0 ? "+" : ""}
              {trend}% from previous period
            </span>
          ) : (
            "No previous data to compare"
          )}
        </p>
      </CardContent>
    </Card>
  );
}
