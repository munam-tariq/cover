"use client";

import { useState } from "react";
import Link from "next/link";
import {
  PlayCircle,
  Code,
  Copy,
  CheckCheck,
  Save,
  Loader2,
} from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Textarea,
  Label,
} from "@chatbot/ui";
import { useProject, type Project } from "@/contexts/project-context";
import { apiClient } from "@/lib/api-client";

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
    const widgetUrl = process.env.NEXT_PUBLIC_WIDGET_URL || "https://widget.cover.ai";
    return `<script
  src="${widgetUrl}/widget.js"
  data-project-id="${project.id}"
  data-position="bottom-right"
  data-primary-color="#2563eb"
  async
></script>`;
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
          <CardTitle>System Prompt</CardTitle>
          <CardDescription>
            Define how your AI agent should behave and respond to visitors
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={systemPrompt}
            onChange={(e) => handleSystemPromptChange(e.target.value)}
            placeholder="You are a helpful assistant for [Company Name]. You help visitors with questions about our products and services. Be friendly, professional, and helpful. If you don't know the answer, offer to connect them with our team."
            rows={6}
            className="resize-none"
          />
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {systemPrompt.length} / 2000 characters
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
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Test and deploy your AI agent
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button asChild className="w-full gap-2">
            <Link href="/playground">
              <PlayCircle className="h-4 w-4" />
              Test in Playground
            </Link>
          </Button>
          <Button variant="outline" asChild className="w-full gap-2">
            <Link href="/analytics">
              View Analytics
            </Link>
          </Button>
        </CardContent>
      </Card>

      {/* Embed Code */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="h-5 w-5" />
            Embed Code
          </CardTitle>
          <CardDescription>
            Add this code to your website to display the chat widget
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="relative">
            <pre className="bg-muted p-3 rounded-md text-xs overflow-x-auto max-h-32">
              {getEmbedCode()}
            </pre>
            <Button
              size="sm"
              variant="secondary"
              className="absolute top-2 right-2 gap-1"
              onClick={handleCopyEmbed}
            >
              {embedCopied ? (
                <>
                  <CheckCheck className="h-3 w-3" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" />
                  Copy
                </>
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Paste this code just before the closing &lt;/body&gt; tag
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
