"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { createClient } from "@/lib/supabase/client";
import { Button, Card, CardContent, Skeleton } from "@chatbot/ui";
import { Copy, Check, AlertCircle, Loader2, Sparkles } from "lucide-react";

interface Project {
  id: string;
  name: string;
  systemPrompt: string;
}

interface ProjectResponse {
  project: Project;
}

export default function SettingsPage() {
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
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

  useEffect(() => {
    const fetchProject = async () => {
      try {
        const data = await apiClient<ProjectResponse>("/api/projects");
        setProject(data.project);
        setName(data.project.name || "");
        setSystemPrompt(data.project.systemPrompt || "");
      } catch (err) {
        console.error("Error fetching project:", err);
        // Check if unauthorized (will redirect via apiClient)
        if (err instanceof Error && err.message.includes("401")) {
          router.push("/login");
          return;
        }
        setError("Failed to load project settings");
      } finally {
        setLoading(false);
      }
    };

    fetchProject();
  }, [router]);

  const handleSave = async () => {
    if (!project) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const data = await apiClient<ProjectResponse>("/api/projects", {
        method: "PUT",
        body: JSON.stringify({
          name: name.trim() || "My Chatbot",
          systemPrompt: systemPrompt.trim(),
        }),
      });

      setProject(data.project);
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
    if (!project) return;

    try {
      await navigator.clipboard.writeText(project.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleCopyMcpConfig = async () => {
    if (!project) return;

    const mcpConfig = JSON.stringify(
      {
        "chatbot-platform": {
          type: "http",
          url: `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/mcp`,
          headers: {
            "X-Project-ID": project.id,
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
    if (!project) return;

    const confirmed = confirm(
      "Are you sure you want to delete this project? This will permanently delete all your knowledge sources, API endpoints, and chat history. This action cannot be undone."
    );

    if (!confirmed) return;

    setDeleting(true);
    setError(null);

    try {
      await apiClient("/api/projects", { method: "DELETE" });

      // Sign out via Supabase client and redirect to login
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/login");
    } catch (err) {
      console.error("Error deleting project:", err);
      setError("Failed to delete project");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Manage your chatbot and account settings
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
                  className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                />
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
                  className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Instructions that define how your chatbot behaves and responds.
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
                    value={project?.id || ""}
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
      "X-Project-ID": "${project?.id || "your-project-id"}"
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
                Once you delete a project, there is no going back. All knowledge sources, API endpoints, and chat history will be permanently deleted.
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
