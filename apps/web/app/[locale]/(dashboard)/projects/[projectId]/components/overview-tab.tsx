"use client";

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Textarea,
} from "@chatbot/ui";
import {
  PlayCircle,
  Code,
  Copy,
  CheckCheck,
  Save,
  Loader2,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { useProject, type Project } from "@/contexts/project-context";
import { Link } from "@/i18n/navigation";
import { apiClient } from "@/lib/api-client";
import {
  buildWidgetEmbedCode,
  WIDGET_API_URL,
  WIDGET_SCRIPT_URL,
} from "@/lib/widget-embed";

interface OverviewTabProps {
  project: Project;
}

interface ProjectUpdateResponse {
  project: {
    id: string;
    name: string;
    systemPrompt: string;
    updatedAt: string;
  };
}

export function OverviewTab({ project }: OverviewTabProps) {
  const t = useTranslations("dashboard.pages.projectDetail.overview");
  const { refreshProjects } = useProject();
  const [systemPrompt, setSystemPrompt] = useState(project.systemPrompt || "");
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [embedCopied, setEmbedCopied] = useState(false);

  const handleSystemPromptChange = (value: string) => {
    setSystemPrompt(value);
    setIsDirty(value !== (project.systemPrompt || ""));
  };

  const handleSave = async () => {
    if (!isDirty) return;

    setIsSaving(true);
    try {
      await apiClient<ProjectUpdateResponse>(`/api/projects/${project.id}`, {
        method: "PUT",
        body: JSON.stringify({ systemPrompt }),
      });
      await refreshProjects();
      setIsDirty(false);
    } catch (error) {
      console.error("Failed to save system prompt:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const getEmbedCode = () => {
    return buildWidgetEmbedCode({
      projectId: project.id,
      apiUrl: WIDGET_API_URL,
      scriptUrl: WIDGET_SCRIPT_URL,
    });
  };

  const handleCopyEmbed = () => {
    navigator.clipboard.writeText(getEmbedCode());
    setEmbedCopied(true);
    setTimeout(() => setEmbedCopied(false), 2000);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* System Prompt */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>{t("systemPrompt")}</CardTitle>
          <CardDescription>
            {t("systemPromptDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={systemPrompt}
            onChange={(e) => handleSystemPromptChange(e.target.value)}
            placeholder={t("systemPromptPlaceholder")}
            rows={6}
            className="resize-none"
          />
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {t("characterCount", { count: systemPrompt.length })}
            </p>
            <Button
              onClick={handleSave}
              disabled={!isDirty || isSaving}
              size="sm"
              className="gap-2"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("saving")}
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  {t("saveChanges")}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>{t("quickActions")}</CardTitle>
          <CardDescription>
            {t("quickActionsDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button asChild className="w-full gap-2">
            <Link href="/playground">
              <PlayCircle className="h-4 w-4" />
              {t("testInPlayground")}
            </Link>
          </Button>
          <Button variant="outline" asChild className="w-full gap-2">
            <Link href="/analytics">
              {t("viewAnalytics")}
            </Link>
          </Button>
        </CardContent>
      </Card>

      {/* Embed Code */}
      <Card className="min-w-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="h-5 w-5" />
            {t("embedCode")}
          </CardTitle>
          <CardDescription>
            {t("embedCodeDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="relative min-w-0">
            <pre className="bg-muted p-3 rounded-md text-xs overflow-x-auto max-h-32">
              {getEmbedCode()}
            </pre>
            <Button
              size="sm"
              variant="secondary"
              className="absolute top-2 end-2 gap-1"
              onClick={handleCopyEmbed}
            >
              {embedCopied ? (
                <>
                  <CheckCheck className="h-3 w-3" />
                  {t("copied")}
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" />
                  {t("copy")}
                </>
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {t("pasteBeforeBody")}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
