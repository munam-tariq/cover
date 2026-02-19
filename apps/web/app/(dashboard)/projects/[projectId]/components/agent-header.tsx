"use client";

import { useState, useEffect } from "react";
import { Bot, Edit2, Check, X, Copy, CheckCheck, Loader2, AlertTriangle } from "lucide-react";
import { Button, Input, Badge, Switch, Label } from "@chatbot/ui";
import { useProject, type Project } from "@/contexts/project-context";
import { apiClient } from "@/lib/api-client";
import Image from "next/image";

interface AgentHeaderProps {
  project: Project;
}

interface ProjectUpdateResponse {
  project: {
    id: string;
    name: string;
    settings?: Record<string, unknown>;
    updatedAt: string;
  };
}

/**
 * Get company logo URL from project settings
 */
function getProjectLogoUrl(project: Project): string | null {
  const settings = project.settings as Record<string, unknown> | null;
  const onboarding = settings?.onboarding as Record<string, unknown> | null;
  return (onboarding?.company_logo_url as string) || null;
}

export function AgentHeader({ project }: AgentHeaderProps) {
  const { refreshProjects } = useProject();
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(project.name);
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [logoError, setLogoError] = useState(false);

  // Widget status state
  const [widgetEnabled, setWidgetEnabled] = useState(true);
  const [savingWidgetStatus, setSavingWidgetStatus] = useState(false);

  // Initialize widget status from project
  useEffect(() => {
    const settings = project.settings as Record<string, unknown> | null;
    setWidgetEnabled(settings?.widget_enabled !== false);
  }, [project]);

  const handleSave = async () => {
    if (!editName.trim() || editName === project.name) {
      setIsEditing(false);
      setEditName(project.name);
      return;
    }

    setIsSaving(true);
    try {
      await apiClient<ProjectUpdateResponse>(`/api/projects/${project.id}`, {
        method: "PUT",
        body: JSON.stringify({ name: editName.trim() }),
      });
      await refreshProjects();
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to update name:", error);
      setEditName(project.name);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditName(project.name);
    setIsEditing(false);
  };

  const handleCopyId = () => {
    navigator.clipboard.writeText(project.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      handleCancel();
    }
  };

  // Whether the widget can be enabled (requires at least one knowledge source)
  const hasKnowledge = (project.knowledgeCount ?? 0) > 0;

  // Handle widget status toggle
  const handleWidgetStatusChange = async (enabled: boolean) => {
    if (enabled && !hasKnowledge) {
      return; // blocked by disabled switch, but guard just in case
    }

    setWidgetEnabled(enabled);
    setSavingWidgetStatus(true);

    try {
      const existingSettings = (project.settings as Record<string, unknown>) || {};
      const updatedSettings = {
        ...existingSettings,
        widget_enabled: enabled,
      };

      await apiClient<ProjectUpdateResponse>(`/api/projects/${project.id}`, {
        method: "PUT",
        body: JSON.stringify({
          name: project.name,
          settings: updatedSettings,
        }),
      });

      await refreshProjects();
    } catch (error) {
      console.error("Error updating widget status:", error);
      setWidgetEnabled(!enabled);
    } finally {
      setSavingWidgetStatus(false);
    }
  };

  const logoUrl = getProjectLogoUrl(project);

  return (
    <div className="flex items-start justify-between gap-4 pb-4 border-b">
      <div className="flex items-start gap-4">
        {/* Agent logo or fallback icon */}
        {logoUrl && !logoError ? (
          <Image
            src={logoUrl}
            alt={`${project.name} logo`}
            width={56}
            height={56}
            className="rounded-xl shrink-0"
            onError={() => setLogoError(true)}
            unoptimized
          />
        ) : (
          <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Bot className="h-7 w-7 text-primary" />
          </div>
        )}

        {/* Agent info */}
        <div className="min-w-0">
          {isEditing ? (
            <div className="flex items-center gap-2">
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={handleKeyDown}
                className="h-9 text-xl font-semibold max-w-xs"
                autoFocus
                disabled={isSaving}
              />
              <Button
                size="sm"
                variant="ghost"
                onClick={handleSave}
                disabled={isSaving}
              >
                <Check className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCancel}
                disabled={isSaving}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold truncate">{project.name}</h1>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsEditing(true)}
                className="h-8 w-8 p-0"
              >
                <Edit2 className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* ID copy button */}
          <div className="flex items-center gap-3 mt-1">
            <button
              onClick={handleCopyId}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {copied ? (
                <>
                  <CheckCheck className="h-3 w-3" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" />
                  {project.id.slice(0, 8)}...
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Right side: Widget toggle and stats */}
      <div className="flex items-center gap-6">
        {/* Widget Status Toggle */}
        <div className="flex items-center gap-3 px-4 py-2 rounded-lg border bg-card">
          <div className="flex flex-col">
            <Label htmlFor="widget-toggle" className="text-sm font-medium">
              Widget
            </Label>
            {!widgetEnabled && !hasKnowledge ? (
              <span className="text-xs text-amber-600 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Add knowledge first
              </span>
            ) : (
              <span className={`text-xs ${widgetEnabled ? "text-green-600" : "text-muted-foreground"}`}>
                {widgetEnabled ? "Active" : "Off"}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {savingWidgetStatus && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
            <Switch
              id="widget-toggle"
              checked={widgetEnabled}
              onCheckedChange={handleWidgetStatusChange}
              disabled={savingWidgetStatus || (!widgetEnabled && !hasKnowledge)}
            />
          </div>
        </div>

        {/* Quick stats */}
        <div className="hidden md:flex items-center gap-6 text-sm">
          {project.knowledgeCount !== undefined && (
            <div className="text-center">
              <p className="text-2xl font-semibold">{project.knowledgeCount}</p>
              <p className="text-muted-foreground">Sources</p>
            </div>
          )}
          {project.endpointCount !== undefined && (
            <div className="text-center">
              <p className="text-2xl font-semibold">{project.endpointCount}</p>
              <p className="text-muted-foreground">Endpoints</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
