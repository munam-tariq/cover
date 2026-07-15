"use client";

import { Button, Card, CardContent, Label, Skeleton } from "@chatbot/ui";
import { AlertCircle, Check, Copy, Eye, EyeOff, Key, Loader2, RefreshCw, Sparkles, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState, useEffect } from "react";

import { useProject, type Project } from "@/contexts/project-context";
import { useRouter } from "@/i18n/navigation";
import { apiClient } from "@/lib/api-client";

interface GeneralTabProps {
  project: Project;
}

interface ProjectUpdateResponse {
  project: { id: string; name: string; settings?: Record<string, unknown>; updatedAt: string };
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

export function GeneralTab({ project }: GeneralTabProps) {
  const t = useTranslations("dashboard.pages.settings");
  const locale = useLocale();
  const router = useRouter();
  const { deleteProject, refreshProjects } = useProject();

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Response language
  const [languageDefault, setLanguageDefault] = useState("");
  const [saving, setSaving] = useState(false);

  // Danger zone
  const [deleting, setDeleting] = useState(false);

  // API key state
  const [apiKeyInfo, setApiKeyInfo] = useState<ApiKeyInfo | null>(null);
  const [newApiKey, setNewApiKey] = useState<string | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [loadingApiKey, setLoadingApiKey] = useState(true);
  const [generatingKey, setGeneratingKey] = useState(false);
  const [revokingKey, setRevokingKey] = useState(false);
  const [apiKeyCopied, setApiKeyCopied] = useState(false);
  const [mcpCopied, setMcpCopied] = useState(false);

  useEffect(() => {
    const settings = project.settings || {};
    setLanguageDefault(
      (settings.language as { default?: string } | undefined)?.default || ""
    );
  }, [project]);

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

  const handleSaveLanguage = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await apiClient<ProjectUpdateResponse>(`/api/projects/${project.id}`, {
        method: "PUT",
        body: JSON.stringify({
          settings: { language: languageDefault ? { default: languageDefault } : {} },
        }),
      });
      await refreshProjects();
      setSuccess(t("saved"));
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error("Error saving language:", err);
      setError(t("saveError"));
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateApiKey = async () => {
    const confirmed = apiKeyInfo
      ? confirm(t("regenerateConfirm"))
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
      setSuccess(t("apiKeyGenerated"));
      setTimeout(() => setSuccess(null), 10000);
    } catch (err) {
      console.error("Failed to generate API key:", err);
      setError(t("apiKeyGenerateError"));
    } finally {
      setGeneratingKey(false);
    }
  };

  const handleRevokeApiKey = async () => {
    const confirmed = confirm(t("revokeConfirm"));
    if (!confirmed) return;

    setRevokingKey(true);
    setError(null);

    try {
      await apiClient("/api/account/api-key", { method: "DELETE" });
      setApiKeyInfo(null);
      setNewApiKey(null);
      setShowApiKey(false);
      setSuccess(t("apiKeyRevoked"));
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error("Failed to revoke API key:", err);
      setError(t("apiKeyRevokeError"));
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

  const handleCopyMcpConfig = async () => {
    if (!newApiKey && !apiKeyInfo) {
      setError(t("mcpCopyError"));
      return;
    }

    const apiKeyValue = newApiKey || "YOUR_API_KEY_HERE";
    const mcpConfig = JSON.stringify(
      {
        "frontface": {
          type: "http",
          url: `${process.env.NEXT_PUBLIC_API_URL || "https://api.frontface.app"}/mcp`,
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
    const confirmed = confirm(t("deleteConfirm", { name: project.name }));
    if (!confirmed) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteProject(project.id);
      // deleteProject clears state; redirect to the agents list
      router.push("/projects");
    } catch (err) {
      console.error("Error deleting project:", err);
      setError(t("deleteError"));
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
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

      {/* Response language */}
      <Card>
        <CardContent className="p-6">
          <div>
            <Label htmlFor="language-default">{t("languageLabel")}</Label>
            <select
              id="language-default"
              value={languageDefault}
              onChange={(e) => setLanguageDefault(e.target.value)}
              className="mt-1 w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">{t("languageAuto")}</option>
              <option value="ar-SA">العربية — السعودية (ar-SA)</option>
              <option value="en">English (en)</option>
            </select>
            <p className="text-sm text-muted-foreground mt-1">{t("languageHelp")}</p>
          </div>
          <div className="pt-4">
            <Button onClick={handleSaveLanguage} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
              {saving ? t("saving") : t("saveChanges")}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card id="onboarding-api-key">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Key className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">{t("apiKey")}</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            {t("apiKeyDescription")}
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
                    {t("copyApiKeyNow")}
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
                          <Check className="h-4 w-4 me-2" />
                          {t("copied")}
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4 me-2" />
                          {t("copy")}
                        </>
                      )}
                    </Button>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => { setNewApiKey(null); setShowApiKey(false); }}>
                    {t("dismiss")}
                  </Button>
                </div>
              ) : apiKeyInfo ? (
                <div className="space-y-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <input
                      type="text"
                      value={apiKeyInfo.prefix}
                      readOnly
                      className="w-full sm:flex-1 px-3 py-2 border border-input rounded-md bg-muted font-mono text-sm"
                    />
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={handleGenerateApiKey}
                        disabled={generatingKey}
                        className="flex-1 sm:flex-initial"
                      >
                        {generatingKey ? (
                          <Loader2 className="h-4 w-4 me-2 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4 me-2" />
                        )}
                        {t("regenerate")}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={handleRevokeApiKey}
                        disabled={revokingKey}
                        className="flex-1 sm:flex-initial text-destructive hover:text-destructive"
                      >
                        {revokingKey ? (
                          <Loader2 className="h-4 w-4 me-2 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4 me-2" />
                        )}
                        {t("revoke")}
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t("created", { date: new Date(apiKeyInfo.createdAt).toLocaleDateString(locale === "ar" ? "ar-u-nu-latn" : undefined) })}
                    {apiKeyInfo.lastUsedAt && (
                      <> • {t("lastUsed", { date: new Date(apiKeyInfo.lastUsedAt).toLocaleDateString(locale === "ar" ? "ar-u-nu-latn" : undefined) })}</>
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
                    <Loader2 className="h-4 w-4 me-2 animate-spin" />
                  ) : (
                    <Key className="h-4 w-4 me-2" />
                  )}
                  {t("generateApiKey")}
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
            <h2 className="font-semibold">{t("mcpIntegration")}</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            {t("mcpDescription")}
            {!apiKeyInfo && t("mcpGenerateFirst")}
          </p>
          <div className="space-y-4">
            <div className="relative min-w-0">
              <pre className="p-4 bg-muted rounded-md overflow-x-auto text-sm font-mono">
{`{
  "frontface": {
    "type": "http",
    "url": "${process.env.NEXT_PUBLIC_API_URL || "https://api.frontface.app"}/mcp",
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
                className="absolute top-2 end-2"
                disabled={!apiKeyInfo && !newApiKey}
              >
                {mcpCopied ? (
                  <>
                    <Check className="h-3 w-3 me-1" />
                    {t("copied")}
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3 me-1" />
                    {t("copy")}
                  </>
                )}
              </Button>
            </div>
            {newApiKey && (
              <div className="p-3 bg-yellow-50 dark:bg-yellow-950 rounded-md">
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  <strong>{t("important")}</strong> {t("importantCopy")}
                </p>
              </div>
            )}
            <div className="text-sm text-muted-foreground space-y-3">
              <p><strong>{t("availableTools")}</strong></p>
              <div className="space-y-3 ms-2">
                <div>
                  <p className="text-xs font-medium text-foreground mb-1">{t("projectManagement")}</p>
                  <ul className="list-disc list-inside space-y-0.5">
                    <li><code className="text-xs bg-muted px-1 rounded">list_projects</code> - List all your chatbot projects</li>
                    <li><code className="text-xs bg-muted px-1 rounded">create_project</code> - Create a new chatbot project</li>
                    <li><code className="text-xs bg-muted px-1 rounded">get_project_info</code> - View project details and stats</li>
                    <li><code className="text-xs bg-muted px-1 rounded">update_project_settings</code> - Update name, system prompt, welcome message</li>
                  </ul>
                </div>
                <div>
                  <p className="text-xs font-medium text-foreground mb-1">{t("knowledgeBase")}</p>
                  <ul className="list-disc list-inside space-y-0.5">
                    <li><code className="text-xs bg-muted px-1 rounded">list_knowledge</code> - List all knowledge sources</li>
                    <li><code className="text-xs bg-muted px-1 rounded">upload_knowledge</code> - Add text content as knowledge</li>
                    <li><code className="text-xs bg-muted px-1 rounded">delete_knowledge</code> - Remove a knowledge source</li>
                  </ul>
                </div>
                <div>
                  <p className="text-xs font-medium text-foreground mb-1">{t("apiEndpoints")}</p>
                  <ul className="list-disc list-inside space-y-0.5">
                    <li><code className="text-xs bg-muted px-1 rounded">list_api_endpoints</code> - List configured external APIs</li>
                    <li><code className="text-xs bg-muted px-1 rounded">add_api_endpoint</code> - Configure an external API</li>
                    <li><code className="text-xs bg-muted px-1 rounded">delete_api_endpoint</code> - Remove an API endpoint</li>
                  </ul>
                </div>
                <div>
                  <p className="text-xs font-medium text-foreground mb-1">{t("chatEmbed")}</p>
                  <ul className="list-disc list-inside space-y-0.5">
                    <li><code className="text-xs bg-muted px-1 rounded">ask_question</code> - Test your chatbot&apos;s responses</li>
                    <li><code className="text-xs bg-muted px-1 rounded">get_embed_code</code> - Get widget embed code with customization</li>
                  </ul>
                </div>
              </div>
            </div>
            <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-md">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                <strong>{t("mcpTip")}</strong> {t("mcpTipText")}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Danger zone */}
      <Card>
        <CardContent className="p-6">
          <h2 className="font-semibold mb-4 text-destructive">{t("dangerZone")}</h2>
          <div className="p-4 border border-destructive/50 rounded-md">
            <h3 className="font-medium">{t("deleteAgent")}</h3>
            <p className="text-sm text-muted-foreground mt-1">{t("deleteDescription")}</p>
            <Button
              variant="destructive"
              className="mt-3"
              onClick={handleDeleteProject}
              disabled={deleting}
            >
              {deleting && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
              {deleting ? t("deleting") : t("deleteAgent")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
