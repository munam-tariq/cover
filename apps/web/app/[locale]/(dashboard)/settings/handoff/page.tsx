"use client";

import { Button, Card, CardContent, Skeleton } from "@chatbot/ui";
import { ChevronLeft } from "lucide-react";
import { useTranslations } from "next-intl";

import { useProject } from "@/contexts/project-context";
import { Link } from "@/i18n/navigation";

import { HandoffTab } from "../../projects/[projectId]/components/handoff-tab";

export default function HandoffSettingsPage() {
  const settingsT = useTranslations("dashboard.pages.settings");
  const handoffT = useTranslations("dashboard.pages.projectDetail.handoff");
  const { currentProject, isLoading } = useProject();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-48" />
        <Card>
          <CardContent className="p-6 space-y-4">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-24 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!currentProject) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" asChild className="gap-2 -ms-2">
          <Link href="/settings">
            <ChevronLeft className="h-4 w-4 rtl:-scale-x-100" />
            {settingsT("title")}
          </Link>
        </Button>
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            {settingsT("noAgentSelected")}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild className="gap-2 -ms-2">
        <Link href="/settings">
          <ChevronLeft className="h-4 w-4 rtl:-scale-x-100" />
          {settingsT("title")}
        </Link>
      </Button>

      <div>
        <h1 className="text-2xl font-bold">{handoffT("title")}</h1>
        <p className="text-muted-foreground">{handoffT("description")}</p>
      </div>

      <HandoffTab project={currentProject} />
    </div>
  );
}
