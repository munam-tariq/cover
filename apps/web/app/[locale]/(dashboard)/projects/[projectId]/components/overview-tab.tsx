"use client";

import { PROJECT_CONFIG } from "@chatbot/shared";
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
  ChevronDown,
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
  const settingsT = useTranslations("dashboard.pages.settings");
  const { refreshProjects } = useProject();
  const [systemPrompt, setSystemPrompt] = useState(project.systemPrompt || "");
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [embedCopied, setEmbedCopied] = useState(false);
  const [showPresets, setShowPresets] = useState(false);
  const systemPromptPresets = [
    { name: settingsT("presetsList.support"), prompt: settingsT("presetsList.supportPrompt") },
    { name: settingsT("presetsList.sales"), prompt: settingsT("presetsList.salesPrompt") },
    { name: settingsT("presetsList.shopping"), prompt: settingsT("presetsList.shoppingPrompt") },
  ];

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
          <div className="flex items-start justify-between gap-2">
            <div>
              <CardTitle>{t("systemPrompt")}</CardTitle>
              <CardDescription>{t("systemPromptDescription")}</CardDescription>
            </div>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowPresets(!showPresets)}
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground bg-background border border-input rounded-md hover:bg-muted transition-colors"
              >
                {settingsT("presets")}
                <ChevronDown className="h-4 w-4" />
              </button>
              {showPresets && (
                <div className="absolute top-full end-0 mt-1 w-48 bg-background border border-input rounded-md shadow-lg z-10">
                  {systemPromptPresets.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => {
                        handleSystemPromptChange(preset.prompt);
                        setShowPresets(false);
                      }}
                      className="block w-full px-4 py-2 text-start text-sm hover:bg-muted first:rounded-t-md last:rounded-b-md"
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={systemPrompt}
            onChange={(e) => handleSystemPromptChange(e.target.value)}
            placeholder={t("systemPromptPlaceholder")}
            rows={6}
            maxLength={PROJECT_CONFIG.MAX_SYSTEM_PROMPT_LENGTH}
            className="resize-none"
          />
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {t("characterCount", { count: systemPrompt.length, max: PROJECT_CONFIG.MAX_SYSTEM_PROMPT_LENGTH })}
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
