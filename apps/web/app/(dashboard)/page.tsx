"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Progress } from "@chatbot/ui";
import { apiClient } from "@/lib/api-client";
import { createClient } from "@/lib/supabase/client";
import {
  MessageSquare,
  BookOpen,
  Code,
  Zap,
  ArrowRight,
  CheckCircle2,
  Circle,
  Sparkles
} from "lucide-react";

interface DashboardStats {
  totalMessages: number;
  knowledgeSources: number;
  apiEndpoints: number;
  responseRate: number | null;
}

interface OnboardingStep {
  completed: boolean;
  label: string;
  description: string;
}

interface OnboardingData {
  steps: {
    accountCreated: OnboardingStep;
    knowledgeAdded: OnboardingStep;
    playgroundTested: OnboardingStep;
    widgetEmbedded: OnboardingStep;
  };
  progress: {
    completed: number;
    total: number;
    percentage: number;
  };
}

export default function DashboardPage() {
  const [projectId, setProjectId] = useState<string | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    totalMessages: 0,
    knowledgeSources: 0,
    apiEndpoints: 0,
    responseRate: null,
  });
  const [onboarding, setOnboarding] = useState<OnboardingData | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch project ID on mount
  useEffect(() => {
    async function fetchProjectId() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) return;

      const { data: projects } = await supabase
        .from("projects")
        .select("id")
        .eq("user_id", user.id)
        .limit(1);

      if (projects && projects.length > 0) {
        setProjectId(projects[0].id);
      }
    }

    fetchProjectId();
  }, []);

  // Fetch dashboard stats and onboarding when projectId is available
  useEffect(() => {
    if (!projectId) return;

    async function fetchData() {
      setLoading(true);
      try {
        // Fetch all data in parallel
        const [analyticsData, knowledgeData, endpointsData, onboardingData] = await Promise.all([
          apiClient<{ totalMessages: number; totalConversations: number }>(
            `/api/analytics/summary?projectId=${projectId}&period=30d`
          ).catch(() => ({ totalMessages: 0, totalConversations: 0 })),
          apiClient<{ sources: Array<{ id: string }> }>(
            `/api/knowledge?projectId=${projectId}`
          ).catch(() => ({ sources: [] })),
          apiClient<{ endpoints: Array<{ id: string }> }>(
            `/api/endpoints?projectId=${projectId}`
          ).catch(() => ({ endpoints: [] })),
          apiClient<OnboardingData>("/api/projects/onboarding").catch(() => null),
        ]);

        setStats({
          totalMessages: analyticsData.totalMessages || 0,
          knowledgeSources: knowledgeData.sources?.length || 0,
          apiEndpoints: endpointsData.endpoints?.length || 0,
          responseRate: analyticsData.totalMessages > 0 ? 100 : null,
        });

        setOnboarding(onboardingData);
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [projectId]);

  const statCards = [
    {
      title: "Total Messages",
      value: stats.totalMessages,
      icon: MessageSquare,
      href: "/analytics",
      color: "text-blue-600",
    },
    {
      title: "Knowledge Sources",
      value: stats.knowledgeSources,
      icon: BookOpen,
      href: "/knowledge",
      color: "text-green-600",
    },
    {
      title: "API Endpoints",
      value: stats.apiEndpoints,
      icon: Code,
      href: "/api-endpoints",
      color: "text-purple-600",
    },
    {
      title: "Response Rate",
      value: stats.responseRate !== null ? `${stats.responseRate}%` : "-",
      icon: Zap,
      href: "/analytics",
      color: "text-orange-600",
    },
  ];

  // Map onboarding steps to their corresponding links
  const stepLinks: Record<string, string> = {
    accountCreated: "/settings",
    knowledgeAdded: "/knowledge",
    playgroundTested: "/playground",
    widgetEmbedded: "/embed",
  };

  const isSetupComplete = onboarding?.progress.percentage === 100;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome to your chatbot command center
        </p>
      </div>

      {/* Setup Progress Card - Only show if not 100% complete */}
      {onboarding && !isSetupComplete && (
        <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Setup Progress</CardTitle>
              </div>
              <span className="text-sm font-medium text-primary">
                {onboarding.progress.completed}/{onboarding.progress.total} complete
              </span>
            </div>
            <CardDescription>
              Complete these steps to get your chatbot live
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Progress value={onboarding.progress.percentage} className="h-2" />

            <div className="grid gap-2">
              {Object.entries(onboarding.steps).map(([key, step]) => {
                const StepIcon = step.completed ? CheckCircle2 : Circle;
                const href = stepLinks[key];

                return (
                  <Link
                    key={key}
                    href={href}
                    className={`flex items-center gap-3 p-2 rounded-md transition-colors ${
                      step.completed
                        ? "text-muted-foreground"
                        : "hover:bg-muted/50"
                    }`}
                  >
                    <StepIcon
                      className={`h-5 w-5 flex-shrink-0 ${
                        step.completed ? "text-green-600" : "text-muted-foreground"
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${step.completed ? "line-through" : ""}`}>
                        {step.label}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {step.description}
                      </p>
                    </div>
                    {!step.completed && (
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Link key={stat.title} href={stat.href}>
            <Card className="hover:border-primary/50 transition-colors cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="h-8 w-16 bg-muted animate-pulse rounded" />
                ) : (
                  <div className="text-2xl font-bold">{stat.value}</div>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Quick Actions - Show when setup is complete */}
      {isSetupComplete && (
        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <div>
                <p className="font-medium text-green-800">Setup Complete!</p>
                <p className="text-sm text-green-600">
                  Your chatbot is live and ready to help your visitors
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2">
        <Link href="/playground">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
            <CardHeader>
              <CardTitle className="text-lg">Test Your Chatbot</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Try out your chatbot in the playground to see how it responds to questions.
              </p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/settings">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
            <CardHeader>
              <CardTitle className="text-lg">Configure Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Customize your chatbot's name, system prompt, and behavior.
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
