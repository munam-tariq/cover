"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Progress } from "@chatbot/ui";
import { apiClient } from "@/lib/api-client";
import { useProject } from "@/contexts/project-context";
import {
  MessageSquare,
  UserPlus,
  CheckCircle2,
  Circle,
  Sparkles,
  ArrowRight,
  Target,
  XCircle,
  TrendingUp,
} from "lucide-react";
import { LeadStatsCard } from "@/components/analytics/lead-stats-card";

interface LeadsSummary {
  totalConversations: number;
  totalLeads: number;
  qualifiedCount: number;
  completionRate: number;
  qualificationRate: number;
  disqualificationRate: number;
  voiceCallCount: number;
  trends: {
    conversationsChange: number;
    leadsChange: number;
    qualifiedChange: number;
  };
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
  const { currentProject, isLoading: projectLoading } = useProject();
  const [leadsSummary, setLeadsSummary] = useState<LeadsSummary | null>(null);
  const [onboarding, setOnboarding] = useState<OnboardingData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const projectId = currentProject?.id;
    if (!projectId) return;

    async function fetchData() {
      setLoading(true);
      try {
        const [leadsData, onboardingData] = await Promise.all([
          apiClient<LeadsSummary>(
            `/api/analytics/leads-summary?projectId=${projectId}&period=30d`
          ).catch(() => null),
          apiClient<OnboardingData>(`/api/projects/${projectId}/onboarding`).catch(() => null),
        ]);

        setLeadsSummary(leadsData);
        setOnboarding(onboardingData);
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [currentProject?.id]);

  const stepLinks: Record<string, string> = {
    accountCreated: "/settings",
    knowledgeAdded: "/knowledge",
    playgroundTested: "/playground",
    widgetEmbedded: "/embed",
  };

  const isSetupComplete = onboarding?.progress.percentage === 100;

  if (projectLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Loading...</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <LeadStatsCard key={i} title="" value="" icon={MessageSquare} loading />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div id="onboarding-welcome">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          {currentProject ? (
            <>Welcome to <span className="font-medium">{currentProject.name}</span></>
          ) : (
            "Welcome to your chatbot command center"
          )}
        </p>
      </div>

      {/* Setup Progress Card */}
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
                      step.completed ? "text-muted-foreground" : "hover:bg-muted/50"
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

      {/* Stats Grid - 3x2 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <LeadStatsCard
          title="Total Conversations"
          value={leadsSummary?.totalConversations ?? 0}
          icon={MessageSquare}
          trend={leadsSummary?.trends.conversationsChange}
          loading={loading}
        />
        <LeadStatsCard
          title="Total Leads"
          value={leadsSummary?.totalLeads ?? 0}
          icon={UserPlus}
          trend={leadsSummary?.trends.leadsChange}
          loading={loading}
        />
        <LeadStatsCard
          title="Qualified Prospects"
          value={leadsSummary?.qualifiedCount ?? 0}
          icon={CheckCircle2}
          trend={leadsSummary?.trends.qualifiedChange}
          loading={loading}
        />
        <LeadStatsCard
          title="Completion Rate"
          value={`${leadsSummary?.completionRate ?? 0}%`}
          icon={Target}
          loading={loading}
        />
        <LeadStatsCard
          title="Qualification Rate"
          value={`${leadsSummary?.qualificationRate ?? 0}%`}
          icon={TrendingUp}
          loading={loading}
        />
        <LeadStatsCard
          title="Disqualification Rate"
          value={`${leadsSummary?.disqualificationRate ?? 0}%`}
          icon={XCircle}
          loading={loading}
        />
      </div>

      {/* Setup Complete */}
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
