"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { useProject } from "@/contexts/project-context";
import { Button, Card, CardContent, Skeleton } from "@chatbot/ui";
import { Copy, Check, AlertCircle, Loader2, Sparkles } from "lucide-react";

interface UpdatedProject {
  id: string;
  name: string;
  systemPrompt: string;
  updatedAt: string;
}

interface ProjectUpdateResponse {
  project: UpdatedProject;
}

export default function SettingsPage() {
  const { currentProject, isLoading: projectLoading, deleteProject, refreshProjects } = useProject();
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [mcpCopied, setMcpCopied] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");

  const router = useRouter();

  // Initialize form when project loads
  useEffect(() => {
    if (currentProject) {
      setName(currentProject.name || "");
      setSystemPrompt(currentProject.systemPrompt || "");
    }
  }, [currentProject]);

  const handleSave = async () => {
    if (!currentProject) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await apiClient<ProjectUpdateResponse>(`/api/projects/${currentProject.id}`, {
        method: "PUT",
        body: JSON.stringify({
          name: name.trim() || "My Chatbot",
          systemPrompt: systemPrompt.trim(),
        }),
      });

      // Refresh projects to update context
      await refreshProjects();

      setSuccess("Settings saved successfully");

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error("Error saving settings:", err);
      setError("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleCopyProjectId = async () => {
    if (!currentProject) return;

    try {
      await navigator.clipboard.writeText(currentProject.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleCopyMcpConfig = async () => {
    if (!currentProject) return;

    const mcpConfig = JSON.stringify(
      {
        "chatbot-platform": {
          type: "http",
          url: `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/mcp`,
          headers: {
            "X-Project-ID": currentProject.id,
          },
        },
      },
      null,
      2
    );

    try {
      await navigator.clipboard.writeText(mcpConfig);
      setMcpCopied(true);
      setTimeout(() => setMcpCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleDeleteProject = async () => {
    if (!currentProject) return;

    const confirmed = confirm(
      `Are you sure you want to delete "${currentProject.name}"? This will delete all knowledge sources, API endpoints, and chat history for this project. This action cannot be undone.`
    );

    if (!confirmed) return;

    setDeleting(true);
    setError(null);

    try {
      // Use the context's deleteProject method (handles switching to another project)
      await deleteProject(currentProject.id);
      // The context will redirect to /projects if no projects left
      // or switch to another project
    } catch (err) {
      console.error("Error deleting project:", err);
      setError("Failed to delete project");
      setDeleting(false);
    }
  };

  if (projectLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-64 mt-2" />
        </div>
        <div className="grid gap-6">
          <Card>
            <CardContent className="p-6 space-y-4">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-24 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!currentProject) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-muted-foreground">No project selected</p>
        </div>
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground mb-4">
              Please select or create a project first.
            </p>
            <Button onClick={() => router.push("/projects")}>
              Go to Projects
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Manage settings for <span className="font-medium">{currentProject.name}</span>
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 rounded-md bg-destructive/10 text-destructive">
          <AlertCircle className="h-4 w-4" />
          <p>{error}</p>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 p-4 rounded-md bg-green-500/10 text-green-600">
          <Check className="h-4 w-4" />
          <p>{success}</p>
        </div>
      )}

      <div className="grid gap-6">
        <Card>
          <CardContent className="p-6">
            <h2 className="font-semibold mb-4">Project Settings</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Project Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="My Chatbot"
                  maxLength={50}
                  className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {name.length}/50 characters
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  System Prompt
                </label>
                <textarea
                  rows={4}
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  placeholder="You are a helpful assistant that answers questions based on the provided knowledge base..."
                  maxLength={2000}
                  className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Instructions that define how your chatbot behaves and responds.
                  ({systemPrompt.length}/2000)
                </p>
              </div>
              <div className="pt-2">
                <Button onClick={handleSave} disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h2 className="font-semibold mb-4">API Keys</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Project ID
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={currentProject.id}
                    readOnly
                    className="flex-1 px-3 py-2 border border-input rounded-md bg-muted font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    onClick={handleCopyProjectId}
                    className="shrink-0"
                  >
                    {copied ? (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-2" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Use this ID when embedding the chat widget on your website.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">MCP Integration</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Connect AI tools like <strong>Cursor</strong>, <strong>Claude Code</strong>, or <strong>Windsurf</strong> to manage your chatbot using natural language.
              Add this configuration to your MCP settings file.
            </p>
            <div className="space-y-4">
              <div className="relative">
                <pre className="p-4 bg-muted rounded-md overflow-x-auto text-sm font-mono">
{`{
  "chatbot-platform": {
    "type": "http",
    "url": "${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/mcp",
    "headers": {
      "X-Project-ID": "${currentProject.id}"
    }
  }
}`}
                </pre>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyMcpConfig}
                  className="absolute top-2 right-2"
                >
                  {mcpCopied ? (
                    <>
                      <Check className="h-3 w-3 mr-1" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3 mr-1" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
              <div className="text-sm text-muted-foreground space-y-2">
                <p><strong>Available Tools:</strong></p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li><code className="text-xs bg-muted px-1 rounded">get_project_info</code> - View project details and stats</li>
                  <li><code className="text-xs bg-muted px-1 rounded">update_project_settings</code> - Update name, system prompt, welcome message</li>
                  <li><code className="text-xs bg-muted px-1 rounded">list_knowledge</code> / <code className="text-xs bg-muted px-1 rounded">upload_knowledge</code> - Manage knowledge sources</li>
                  <li><code className="text-xs bg-muted px-1 rounded">list_api_endpoints</code> / <code className="text-xs bg-muted px-1 rounded">add_api_endpoint</code> - Configure API tools</li>
                  <li><code className="text-xs bg-muted px-1 rounded">get_embed_code</code> - Get widget embed code with customization</li>
                  <li><code className="text-xs bg-muted px-1 rounded">ask_question</code> - Test your chatbot&apos;s responses</li>
                </ul>
              </div>
              <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-md">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  <strong>Tip:</strong> Try saying &quot;Add FAQ content about returns and shipping to my chatbot&quot; in Cursor or Claude Code!
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h2 className="font-semibold mb-4 text-destructive">Danger Zone</h2>
            <div className="p-4 border border-destructive/50 rounded-md">
              <h3 className="font-medium">Delete Project</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Once you delete this project, all knowledge sources, API endpoints, and chat history will be removed. This action cannot be undone.
              </p>
              <Button
                variant="destructive"
                className="mt-3"
                onClick={handleDeleteProject}
                disabled={deleting}
              >
                {deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {deleting ? "Deleting..." : "Delete Project"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
