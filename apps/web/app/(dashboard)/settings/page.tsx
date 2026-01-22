"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { useProject } from "@/contexts/project-context";
import { Button, Card, CardContent, Skeleton, Switch, Label, Badge, Input } from "@chatbot/ui";
import { Copy, Check, AlertCircle, Loader2, Sparkles, Mail, Key, RefreshCw, Trash2, Eye, EyeOff, Users, ChevronRight, Shield, ShieldCheck, ShieldAlert, Plus, X, ChevronDown } from "lucide-react";
import Link from "next/link";

interface UpdatedProject {
  id: string;
  name: string;
  systemPrompt: string;
  updatedAt: string;
}

interface ProjectUpdateResponse {
  project: UpdatedProject;
}

interface ApiKeyInfo {
  id: string;
  prefix: string;
  name: string;
  lastUsedAt: string | null;
  createdAt: string;
}

interface ApiKeyResponse {
  hasKey: boolean;
  apiKey: ApiKeyInfo | null;
}

interface NewApiKeyResponse {
  success: boolean;
  message: string;
  apiKey: {
    id: string;
    key: string;
    prefix: string;
    name: string;
    createdAt: string;
  };
}

export default function SettingsPage() {
  const { currentProject, isLoading: projectLoading, deleteProject, refreshProjects } = useProject();
  const [saving, setSaving] = useState(false);
  const [savingLeadCapture, setSavingLeadCapture] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [mcpCopied, setMcpCopied] = useState(false);

  // API key state
  const [apiKeyInfo, setApiKeyInfo] = useState<ApiKeyInfo | null>(null);
  const [newApiKey, setNewApiKey] = useState<string | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [loadingApiKey, setLoadingApiKey] = useState(true);
  const [generatingKey, setGeneratingKey] = useState(false);
  const [revokingKey, setRevokingKey] = useState(false);
  const [apiKeyCopied, setApiKeyCopied] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");

  // Lead capture state
  const [leadCaptureEnabled, setLeadCaptureEnabled] = useState(false);
  const [leadCaptureEmail, setLeadCaptureEmail] = useState("");
  const [leadNotificationsEnabled, setLeadNotificationsEnabled] = useState(true);

  // Widget status state (emergency kill switch)
  const [widgetEnabled, setWidgetEnabled] = useState(true);
  const [savingWidgetStatus, setSavingWidgetStatus] = useState(false);

  // Domain whitelist state
  const [allowedDomains, setAllowedDomains] = useState<string[]>([]);
  const [newDomain, setNewDomain] = useState("");
  const [domainError, setDomainError] = useState<string | null>(null);
  const [savingDomains, setSavingDomains] = useState(false);
  const [loadingDomains, setLoadingDomains] = useState(true);

  const router = useRouter();

  // System prompt presets
  const systemPromptPresets = [
    {
      name: "Customer Support",
      prompt: "You are a helpful customer support agent. Answer support questions, help troubleshoot issues, and guide customers through common problems. Be friendly, patient, and thorough in your responses. If you don't know the answer, offer to connect the customer with a human agent."
    },
    {
      name: "Sales",
      prompt: "You are a knowledgeable sales assistant. Help potential customers understand our products and services, answer questions about pricing and features, and guide them toward solutions that fit their needs. Be persuasive but honest, and focus on understanding customer requirements before making recommendations."
    },
    {
      name: "Shopping Assistant",
      prompt: "You are a friendly shopping assistant. Help customers find products, compare options, check availability, and answer questions about orders and shipping. Provide personalized recommendations based on customer preferences and help them make informed purchasing decisions."
    }
  ];
  const [showPresets, setShowPresets] = useState(false);

  // Initialize form when project loads
  useEffect(() => {
    if (currentProject) {
      setName(currentProject.name || "");
      setSystemPrompt(currentProject.systemPrompt || "");

      // Load lead capture settings from project.settings
      const settings = currentProject.settings || {};
      setLeadCaptureEnabled(settings.lead_capture_enabled === true);
      setLeadCaptureEmail((settings.lead_capture_email as string) || "");
      setLeadNotificationsEnabled(settings.lead_notifications_enabled !== false);
      // Load widget enabled status (default to true)
      setWidgetEnabled(settings.widget_enabled !== false);
    }
  }, [currentProject]);

  // Fetch allowed domains when project changes
  useEffect(() => {
    const fetchAllowedDomains = async () => {
      if (!currentProject) {
        setLoadingDomains(false);
        return;
      }
      setLoadingDomains(true);
      try {
        const response = await apiClient<{ domains: string[]; enabled: boolean }>(
          `/api/projects/${currentProject.id}/allowed-domains`
        );
        setAllowedDomains(response.domains || []);
      } catch (err) {
        console.error("Failed to fetch allowed domains:", err);
        setAllowedDomains([]);
      } finally {
        setLoadingDomains(false);
      }
    };
    fetchAllowedDomains();
  }, [currentProject]);

  // Fetch API key status on mount
  useEffect(() => {
    const fetchApiKey = async () => {
      try {
        const response = await apiClient<ApiKeyResponse>("/api/account/api-key");
        if (response.hasKey && response.apiKey) {
          setApiKeyInfo(response.apiKey);
        } else {
          setApiKeyInfo(null);
        }
      } catch (err) {
        console.error("Failed to fetch API key:", err);
      } finally {
        setLoadingApiKey(false);
      }
    };
    fetchApiKey();
  }, []);

  const handleGenerateApiKey = async () => {
    const confirmed = apiKeyInfo
      ? confirm("This will revoke your existing API key and generate a new one. Any integrations using the old key will stop working. Continue?")
      : true;

    if (!confirmed) return;

    setGeneratingKey(true);
    setError(null);

    try {
      const response = await apiClient<NewApiKeyResponse>("/api/account/api-key", {
        method: "POST",
        body: JSON.stringify({ name: "MCP API Key" }),
      });

      setNewApiKey(response.apiKey.key);
      setShowApiKey(true);
      setApiKeyInfo({
        id: response.apiKey.id,
        prefix: response.apiKey.prefix,
        name: response.apiKey.name,
        lastUsedAt: null,
        createdAt: response.apiKey.createdAt,
      });
      setSuccess("API key generated successfully. Copy it now - it won't be shown again!");
      setTimeout(() => setSuccess(null), 10000);
    } catch (err) {
      console.error("Failed to generate API key:", err);
      setError("Failed to generate API key");
    } finally {
      setGeneratingKey(false);
    }
  };

  const handleRevokeApiKey = async () => {
    const confirmed = confirm("Are you sure you want to revoke your API key? Any MCP integrations will stop working.");
    if (!confirmed) return;

    setRevokingKey(true);
    setError(null);

    try {
      await apiClient("/api/account/api-key", { method: "DELETE" });
      setApiKeyInfo(null);
      setNewApiKey(null);
      setShowApiKey(false);
      setSuccess("API key revoked successfully");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error("Failed to revoke API key:", err);
      setError("Failed to revoke API key");
    } finally {
      setRevokingKey(false);
    }
  };

  const handleCopyApiKey = async () => {
    if (!newApiKey) return;
    try {
      await navigator.clipboard.writeText(newApiKey);
      setApiKeyCopied(true);
      setTimeout(() => setApiKeyCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

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
    if (!newApiKey && !apiKeyInfo) {
      setError("Generate an API key first to copy MCP config");
      return;
    }

    const apiKeyValue = newApiKey || "YOUR_API_KEY_HERE";
    const mcpConfig = JSON.stringify(
      {
        "supportbase": {
          type: "http",
          url: `${process.env.NEXT_PUBLIC_API_URL || "https://api.supportbase.app"}/mcp`,
          headers: {
            "X-API-Key": apiKeyValue,
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

  // Handle widget status toggle (immediate save for emergency control)
  const handleWidgetStatusChange = async (enabled: boolean) => {
    if (!currentProject) return;

    setWidgetEnabled(enabled);
    setSavingWidgetStatus(true);
    setError(null);
    setSuccess(null);

    try {
      // Merge with existing settings
      const existingSettings = currentProject.settings || {};
      const updatedSettings = {
        ...existingSettings,
        widget_enabled: enabled,
      };

      await apiClient<ProjectUpdateResponse>(`/api/projects/${currentProject.id}`, {
        method: "PUT",
        body: JSON.stringify({
          name: currentProject.name,
          settings: updatedSettings,
        }),
      });

      // Refresh projects to update context
      await refreshProjects();

      setSuccess(enabled ? "Widget enabled" : "Widget disabled - visitors will not see the chat widget");
      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      console.error("Error updating widget status:", err);
      setError("Failed to update widget status");
      // Revert on error
      setWidgetEnabled(!enabled);
    } finally {
      setSavingWidgetStatus(false);
    }
  };

  const handleSaveLeadCapture = async () => {
    if (!currentProject) return;

    // Validate email if lead capture is enabled
    if (leadCaptureEnabled && !leadCaptureEmail.trim()) {
      setError("Please enter a notification email to enable lead capture");
      return;
    }

    if (leadCaptureEnabled && leadCaptureEmail) {
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(leadCaptureEmail.trim())) {
        setError("Please enter a valid email address");
        return;
      }
    }

    setSavingLeadCapture(true);
    setError(null);
    setSuccess(null);

    try {
      // Merge with existing settings
      const existingSettings = currentProject.settings || {};
      const updatedSettings = {
        ...existingSettings,
        lead_capture_enabled: leadCaptureEnabled,
        lead_capture_email: leadCaptureEmail.trim() || null,
        lead_notifications_enabled: leadNotificationsEnabled,
      };

      await apiClient<ProjectUpdateResponse>(`/api/projects/${currentProject.id}`, {
        method: "PUT",
        body: JSON.stringify({
          name: currentProject.name,
          settings: updatedSettings,
        }),
      });

      // Refresh projects to update context
      await refreshProjects();

      setSuccess("Lead capture settings saved");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error("Error saving lead capture settings:", err);
      setError("Failed to save lead capture settings");
    } finally {
      setSavingLeadCapture(false);
    }
  };

  // Domain whitelist handlers
  const handleAddDomain = () => {
    const domain = newDomain.trim().toLowerCase();

    if (!domain) return;

    // Basic validation - allows wildcards like *.example.com
    const domainRegex = /^(\*\.)?[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/;
    if (!domainRegex.test(domain)) {
      setDomainError("Invalid domain format. Example: example.com or *.example.com");
      return;
    }

    if (allowedDomains.includes(domain)) {
      setDomainError("Domain already added");
      return;
    }

    setAllowedDomains([...allowedDomains, domain]);
    setNewDomain("");
    setDomainError(null);
  };

  const handleRemoveDomain = (domain: string) => {
    setAllowedDomains(allowedDomains.filter((d) => d !== domain));
  };

  const handleSaveDomains = async () => {
    if (!currentProject) return;

    setSavingDomains(true);
    setDomainError(null);

    // Include any domain typed in the input but not yet added
    let domainsToSave = [...allowedDomains];
    if (newDomain.trim()) {
      const domain = newDomain.trim().toLowerCase();
      const domainRegex = /^(\*\.)?[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/;

      if (!domainRegex.test(domain)) {
        setDomainError("Invalid domain format. Example: example.com or *.example.com");
        setSavingDomains(false);
        return;
      }

      if (!domainsToSave.includes(domain)) {
        domainsToSave.push(domain);
        setAllowedDomains(domainsToSave);
        setNewDomain("");
      }
    }

    try {
      await apiClient(`/api/projects/${currentProject.id}/allowed-domains`, {
        method: "PUT",
        body: JSON.stringify({ domains: domainsToSave }),
      });
      setSuccess(
        domainsToSave.length > 0
          ? `Domain whitelist updated (${domainsToSave.length} domain${domainsToSave.length !== 1 ? "s" : ""})`
          : "Domain whitelist disabled"
      );
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save domains";
      setDomainError(message);
    } finally {
      setSavingDomains(false);
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
                  Describe what you want your agent to do
                </label>
                <div className="relative">
                  <textarea
                    rows={4}
                    value={systemPrompt}
                    onChange={(e) => setSystemPrompt(e.target.value)}
                    placeholder="Answer support questions, help troubleshoot issues, and guide customers through common problems"
                    maxLength={2000}
                    className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                  />
                  <div className="absolute bottom-2 right-2">
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowPresets(!showPresets)}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground bg-background border border-input rounded-md hover:bg-muted transition-colors"
                      >
                        Presets
                        <ChevronDown className="h-4 w-4" />
                      </button>
                      {showPresets && (
                        <div className="absolute bottom-full right-0 mb-1 w-48 bg-background border border-input rounded-md shadow-lg z-10">
                          {systemPromptPresets.map((preset) => (
                            <button
                              key={preset.name}
                              type="button"
                              onClick={() => {
                                setSystemPrompt(preset.prompt);
                                setShowPresets(false);
                              }}
                              className="block w-full px-4 py-2 text-left text-sm hover:bg-muted first:rounded-t-md last:rounded-b-md"
                            >
                              {preset.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
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
            <h2 className="font-semibold mb-4">Widget Project ID</h2>
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

        <Card id="onboarding-api-key">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Key className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">API Key</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Generate an API key to connect AI tools like Cursor, Claude Code, or Windsurf to manage your chatbot.
              This key provides access to all your projects.
            </p>

            {loadingApiKey ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-4 w-48" />
              </div>
            ) : (
              <div className="space-y-4">
                {newApiKey && showApiKey ? (
                  <div className="p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-md space-y-3">
                    <p className="text-sm font-medium text-green-800 dark:text-green-200">
                      Copy your API key now. It won&apos;t be shown again!
                    </p>
                    <div className="flex gap-2">
                      <input
                        type={showApiKey ? "text" : "password"}
                        value={newApiKey}
                        readOnly
                        className="flex-1 px-3 py-2 border border-input rounded-md bg-background font-mono text-sm"
                      />
                      <Button variant="outline" size="icon" onClick={() => setShowApiKey(!showApiKey)}>
                        {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                      <Button variant="outline" onClick={handleCopyApiKey}>
                        {apiKeyCopied ? (
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
                    <Button variant="ghost" size="sm" onClick={() => { setNewApiKey(null); setShowApiKey(false); }}>
                      Dismiss
                    </Button>
                  </div>
                ) : apiKeyInfo ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={apiKeyInfo.prefix}
                        readOnly
                        className="flex-1 px-3 py-2 border border-input rounded-md bg-muted font-mono text-sm"
                      />
                      <Button
                        variant="outline"
                        onClick={handleGenerateApiKey}
                        disabled={generatingKey}
                      >
                        {generatingKey ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4 mr-2" />
                        )}
                        Regenerate
                      </Button>
                      <Button
                        variant="outline"
                        onClick={handleRevokeApiKey}
                        disabled={revokingKey}
                        className="text-destructive hover:text-destructive"
                      >
                        {revokingKey ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4 mr-2" />
                        )}
                        Revoke
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Created: {new Date(apiKeyInfo.createdAt).toLocaleDateString()}
                      {apiKeyInfo.lastUsedAt && (
                        <> • Last used: {new Date(apiKeyInfo.lastUsedAt).toLocaleDateString()}</>
                      )}
                    </p>
                  </div>
                ) : (
                  <Button
                    id="onboarding-generate-btn"
                    onClick={handleGenerateApiKey}
                    disabled={generatingKey}
                  >
                    {generatingKey ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Key className="h-4 w-4 mr-2" />
                    )}
                    Generate API Key
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card id="onboarding-mcp-config">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">MCP Integration</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Connect AI tools like <strong>Cursor</strong>, <strong>Claude Code</strong>, or <strong>Windsurf</strong> to manage your chatbot using natural language.
              {!apiKeyInfo && " Generate an API key above first."}
            </p>
            <div className="space-y-4">
              <div className="relative">
                <pre className="p-4 bg-muted rounded-md overflow-x-auto text-sm font-mono">
{`{
  "supportbase": {
    "type": "http",
    "url": "${process.env.NEXT_PUBLIC_API_URL || "https://api.supportbase.app"}/mcp",
    "headers": {
      "X-API-Key": "${newApiKey || (apiKeyInfo ? apiKeyInfo.prefix : "YOUR_API_KEY_HERE")}"
    }
  }
}`}
                </pre>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyMcpConfig}
                  className="absolute top-2 right-2"
                  disabled={!apiKeyInfo && !newApiKey}
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
              {newApiKey && (
                <div className="p-3 bg-yellow-50 dark:bg-yellow-950 rounded-md">
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">
                    <strong>Important:</strong> Copy the config now with your full API key included. After dismissing, only the key prefix will be shown.
                  </p>
                </div>
              )}
              <div className="text-sm text-muted-foreground space-y-3">
                <p><strong>Available Tools:</strong></p>
                <div className="space-y-3 ml-2">
                  <div>
                    <p className="text-xs font-medium text-foreground mb-1">Project Management</p>
                    <ul className="list-disc list-inside space-y-0.5">
                      <li><code className="text-xs bg-muted px-1 rounded">list_projects</code> - List all your chatbot projects</li>
                      <li><code className="text-xs bg-muted px-1 rounded">create_project</code> - Create a new chatbot project</li>
                      <li><code className="text-xs bg-muted px-1 rounded">get_project_info</code> - View project details and stats</li>
                      <li><code className="text-xs bg-muted px-1 rounded">update_project_settings</code> - Update name, system prompt, welcome message</li>
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-foreground mb-1">Knowledge Base</p>
                    <ul className="list-disc list-inside space-y-0.5">
                      <li><code className="text-xs bg-muted px-1 rounded">list_knowledge</code> - List all knowledge sources</li>
                      <li><code className="text-xs bg-muted px-1 rounded">upload_knowledge</code> - Add text content as knowledge</li>
                      <li><code className="text-xs bg-muted px-1 rounded">delete_knowledge</code> - Remove a knowledge source</li>
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-foreground mb-1">API Endpoints</p>
                    <ul className="list-disc list-inside space-y-0.5">
                      <li><code className="text-xs bg-muted px-1 rounded">list_api_endpoints</code> - List configured external APIs</li>
                      <li><code className="text-xs bg-muted px-1 rounded">add_api_endpoint</code> - Configure an external API</li>
                      <li><code className="text-xs bg-muted px-1 rounded">delete_api_endpoint</code> - Remove an API endpoint</li>
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-foreground mb-1">Chat &amp; Embed</p>
                    <ul className="list-disc list-inside space-y-0.5">
                      <li><code className="text-xs bg-muted px-1 rounded">ask_question</code> - Test your chatbot&apos;s responses</li>
                      <li><code className="text-xs bg-muted px-1 rounded">get_embed_code</code> - Get widget embed code with customization</li>
                    </ul>
                  </div>
                </div>
              </div>
              <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-md">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  <strong>Tip:</strong> Try saying &quot;Add FAQ content about returns and shipping to my chatbot&quot; in Cursor or Claude Code!
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Widget Status - Emergency Kill Switch */}
        <Card className={!widgetEnabled ? "border-destructive/50 bg-destructive/5" : ""}>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              {widgetEnabled ? (
                <ShieldCheck className="h-5 w-5 text-green-600" />
              ) : (
                <ShieldAlert className="h-5 w-5 text-destructive" />
              )}
              <h2 className="font-semibold">Widget Status</h2>
              {savingWidgetStatus && (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Emergency control to instantly hide the chat widget from your website. Use this if you need to quickly disable the chatbot.
            </p>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="widget-status-toggle" className="text-base">
                  {widgetEnabled ? "Widget is Active" : "Widget is Disabled"}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {widgetEnabled
                    ? "Visitors can see and use the chat widget"
                    : "Widget is hidden from all visitors"}
                </p>
              </div>
              <Switch
                id="widget-status-toggle"
                checked={widgetEnabled}
                onCheckedChange={handleWidgetStatusChange}
                disabled={savingWidgetStatus}
              />
            </div>

            {!widgetEnabled && (
              <div className="mt-4 p-3 bg-destructive/10 rounded-md">
                <p className="text-sm text-destructive flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  The chat widget is currently hidden from your website visitors.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Mail className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">Lead Capture</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              When your chatbot can&apos;t answer a question, it can offer to collect the visitor&apos;s email so you can follow up.
            </p>

            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="lead-capture-toggle" className="text-base">
                    Enable Lead Capture
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Ask for email when chatbot can&apos;t answer
                  </p>
                </div>
                <Switch
                  id="lead-capture-toggle"
                  checked={leadCaptureEnabled}
                  onCheckedChange={setLeadCaptureEnabled}
                />
              </div>

              {leadCaptureEnabled && (
                <div className="pl-0 space-y-4 border-l-2 border-primary/20 ml-0 pt-2">
                  <div className="pl-4">
                    <Label htmlFor="lead-capture-email" className="text-sm font-medium">
                      Notification Email
                    </Label>
                    <input
                      id="lead-capture-email"
                      type="email"
                      value={leadCaptureEmail}
                      onChange={(e) => setLeadCaptureEmail(e.target.value)}
                      placeholder="support@yourbusiness.com"
                      className="w-full mt-1.5 px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      We&apos;ll send a daily digest of captured leads to this email
                    </p>
                  </div>

                  <div className="flex items-center justify-between pl-4">
                    <div className="space-y-0.5">
                      <Label htmlFor="notifications-toggle" className="text-sm">
                        Send Email Notifications
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Receive daily digest of unanswered questions
                      </p>
                    </div>
                    <Switch
                      id="notifications-toggle"
                      checked={leadNotificationsEnabled}
                      onCheckedChange={setLeadNotificationsEnabled}
                    />
                  </div>
                </div>
              )}

              <div className="pt-2">
                <Button onClick={handleSaveLeadCapture} disabled={savingLeadCapture}>
                  {savingLeadCapture && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {savingLeadCapture ? "Saving..." : "Save Lead Capture Settings"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <Link href="/settings/handoff" className="flex items-center justify-between group">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-primary/10">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h2 className="font-semibold group-hover:text-primary transition-colors">Human Handoff</h2>
                  <p className="text-sm text-muted-foreground">
                    Allow customers to connect with human agents when AI can&apos;t help
                  </p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">Domain Whitelist</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Restrict which websites can embed your chat widget. Leave empty to allow all domains.
            </p>

            {loadingDomains ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-4 w-48" />
              </div>
            ) : (
              <div className="space-y-4">
                {/* Current Domains */}
                {allowedDomains.length > 0 && (
                  <div className="space-y-2">
                    <Label>Allowed Domains</Label>
                    <div className="flex flex-wrap gap-2">
                      {allowedDomains.map((domain) => (
                        <Badge
                          key={domain}
                          variant="secondary"
                          className="flex items-center gap-1 px-3 py-1"
                        >
                          {domain}
                          <button
                            onClick={() => handleRemoveDomain(domain)}
                            className="ml-1 hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Add Domain Input */}
                <div className="space-y-2">
                  <Label htmlFor="new-domain">Add Domain</Label>
                  <div className="flex gap-2">
                    <Input
                      id="new-domain"
                      value={newDomain}
                      onChange={(e) => {
                        setNewDomain(e.target.value);
                        setDomainError(null);
                      }}
                      onKeyDown={(e) => e.key === "Enter" && handleAddDomain()}
                      placeholder="example.com or *.example.com"
                      className="flex-1"
                    />
                    <Button
                      variant="outline"
                      onClick={handleAddDomain}
                      disabled={!newDomain.trim()}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  {domainError && (
                    <p className="text-sm text-destructive">{domainError}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Use *.example.com to allow all subdomains. Only localhost is always allowed.
                  </p>
                </div>

                {/* Status Indicator */}
                <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                  {allowedDomains.length > 0 ? (
                    <>
                      <ShieldCheck className="h-4 w-4 text-green-500" />
                      <span className="text-sm">
                        Widget restricted to {allowedDomains.length} domain{allowedDomains.length !== 1 ? "s" : ""}
                      </span>
                    </>
                  ) : (
                    <>
                      <ShieldAlert className="h-4 w-4 text-yellow-500" />
                      <span className="text-sm">
                        Widget can be embedded on any domain
                      </span>
                    </>
                  )}
                </div>

                <div className="pt-2">
                  <Button onClick={handleSaveDomains} disabled={savingDomains}>
                    {savingDomains && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    {savingDomains ? "Saving..." : "Save Domain Settings"}
                  </Button>
                </div>
              </div>
            )}
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
