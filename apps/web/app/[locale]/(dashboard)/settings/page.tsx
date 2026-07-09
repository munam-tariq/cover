"use client";

import { Button, Card, CardContent, Skeleton, Switch, Label, Badge, Input } from "@chatbot/ui";
import { Copy, Check, AlertCircle, Loader2, Sparkles, Mail, Key, RefreshCw, Trash2, Eye, EyeOff, Users, ChevronRight, Shield, ShieldCheck, ShieldAlert, Plus, X, ChevronDown, MessageSquare, Zap, MousePointerClick, ScrollText, Timer, RotateCcw } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState, useEffect } from "react";

import { useProject } from "@/contexts/project-context";
import { Link, useRouter } from "@/i18n/navigation";
import { apiClient } from "@/lib/api-client";

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
  const t = useTranslations("dashboard.pages.settings");
  const embedT = useTranslations("dashboard.pages.embed");
  const leadT = useTranslations("dashboard.pages.projectDetail.leadCapture");
  const locale = useLocale();
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
  const [languageDefault, setLanguageDefault] = useState("");

  // Lead capture state (V1 - kept for backward compatibility)
  const [leadCaptureEnabled, setLeadCaptureEnabled] = useState(false);
  const [leadCaptureEmail, setLeadCaptureEmail] = useState("");
  const [leadNotificationsEnabled, setLeadNotificationsEnabled] = useState(true);

  // Lead capture V2 state
  const [lcV2Enabled, setLcV2Enabled] = useState(false);
  const [lcV2Field2Enabled, setLcV2Field2Enabled] = useState(false);
  const [lcV2Field2Label, setLcV2Field2Label] = useState(leadT("phoneNumber"));
  const [lcV2Field2Required, setLcV2Field2Required] = useState(false);
  const [lcV2Field3Enabled, setLcV2Field3Enabled] = useState(false);
  const [lcV2Field3Label, setLcV2Field3Label] = useState(leadT("company"));
  const [lcV2Field3Required, setLcV2Field3Required] = useState(false);
  const [lcV2Q1Enabled, setLcV2Q1Enabled] = useState(false);
  const [lcV2Q1Text, setLcV2Q1Text] = useState("");
  const [lcV2Q2Enabled, setLcV2Q2Enabled] = useState(false);
  const [lcV2Q2Text, setLcV2Q2Text] = useState("");
  const [lcV2Q3Enabled, setLcV2Q3Enabled] = useState(false);
  const [lcV2Q3Text, setLcV2Q3Text] = useState("");
  const [lcV2NotifEmail, setLcV2NotifEmail] = useState("");
  const [lcV2NotifsEnabled, setLcV2NotifsEnabled] = useState(true);

  // Widget status state (emergency kill switch)
  const [widgetEnabled, setWidgetEnabled] = useState(true);
  const [savingWidgetStatus, setSavingWidgetStatus] = useState(false);

  // Domain whitelist state
  const [allowedDomains, setAllowedDomains] = useState<string[]>([]);
  const [newDomain, setNewDomain] = useState("");
  const [domainError, setDomainError] = useState<string | null>(null);
  const [savingDomains, setSavingDomains] = useState(false);
  const [loadingDomains, setLoadingDomains] = useState(true);

  // Proactive engagement state
  const [peEnabled, setPeEnabled] = useState(false);
  const [peTeaserEnabled, setPeTeaserEnabled] = useState(true);
  const [peTeaserMessage, setPeTeaserMessage] = useState("Have a question? I can help!");
  const [peTeaserDelay, setPeTeaserDelay] = useState(5);
  const [peBadgeEnabled, setPeBadgeEnabled] = useState(true);
  const [peTimeEnabled, setPeTimeEnabled] = useState(true);
  const [peTimeDelay, setPeTimeDelay] = useState(30);
  const [peScrollEnabled, setPeScrollEnabled] = useState(true);
  const [peScrollThreshold, setPeScrollThreshold] = useState(50);
  const [peExitIntentEnabled, setPeExitIntentEnabled] = useState(true);
  const [peHighIntentEnabled, setPeHighIntentEnabled] = useState(false);
  const [peHighIntentPatterns, setPeHighIntentPatterns] = useState("");
  const [savingProactive, setSavingProactive] = useState(false);

  // Lead recovery (V3) state
  const [lrEnabled, setLrEnabled] = useState(false);
  const [lrExitOverlayEnabled, setLrExitOverlayEnabled] = useState(true);
  const [lrExitHeadline, setLrExitHeadline] = useState("Before you go...");
  const [lrExitSubtext, setLrExitSubtext] = useState("Drop your email and we'll follow up");
  const [lrDeferredEnabled, setLrDeferredEnabled] = useState(true);
  const [lrDeferredReaskAfter, setLrDeferredReaskAfter] = useState(3);
  const [lrDeferredMaxAsks, setLrDeferredMaxAsks] = useState(2);
  const [lrReturnVisitEnabled, setLrReturnVisitEnabled] = useState(true);
  const [lrReturnMaxVisits, setLrReturnMaxVisits] = useState(3);
  const [lrReturnMessage, setLrReturnMessage] = useState("Welcome back! Want me to email you a summary?");
  const [lrHighIntentEnabled, setLrHighIntentEnabled] = useState(true);
  const [lrHighIntentKeywords, setLrHighIntentKeywords] = useState("pricing, demo, trial, contact, sales, buy, subscribe");
  const [lrSummaryHookEnabled, setLrSummaryHookEnabled] = useState(true);
  const [lrSummaryMinMessages, setLrSummaryMinMessages] = useState(3);
  const [lrSummaryPrompt, setLrSummaryPrompt] = useState("Want me to email you a summary of this conversation?");
  const [savingRecovery, setSavingRecovery] = useState(false);

  const router = useRouter();

  // System prompt presets
  const systemPromptPresets = [
    {
      name: t("presetsList.support"),
      prompt: t("presetsList.supportPrompt")
    },
    {
      name: t("presetsList.sales"),
      prompt: t("presetsList.salesPrompt")
    },
    {
      name: t("presetsList.shopping"),
      prompt: t("presetsList.shoppingPrompt")
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
      setLanguageDefault(
        (settings.language as { default?: string } | undefined)?.default || ""
      );
      setLeadCaptureEnabled(settings.lead_capture_enabled === true);
      setLeadCaptureEmail((settings.lead_capture_email as string) || "");
      setLeadNotificationsEnabled(settings.lead_notifications_enabled !== false);
      // Load widget enabled status (default to true)
      setWidgetEnabled(settings.widget_enabled !== false);

      // Load proactive engagement settings
      const pe = settings.proactive_engagement as Record<string, unknown> | undefined;
      if (pe) {
        setPeEnabled(pe.enabled === true);
        const teaser = pe.teaser as Record<string, unknown> | undefined;
        if (teaser) {
          setPeTeaserEnabled(teaser.enabled !== false);
          setPeTeaserMessage((teaser.message as string) || "Have a question? I can help!");
          setPeTeaserDelay((teaser.delay_seconds as number) || 5);
        }
        const badge = pe.badge as Record<string, unknown> | undefined;
        if (badge) {
          setPeBadgeEnabled(badge.enabled !== false);
        }
        const triggers = pe.triggers as Record<string, unknown> | undefined;
        if (triggers) {
          const time = triggers.time_on_page as Record<string, unknown> | undefined;
          if (time) { setPeTimeEnabled(time.enabled !== false); setPeTimeDelay((time.delay_seconds as number) || 30); }
          const scroll = triggers.scroll_depth as Record<string, unknown> | undefined;
          if (scroll) { setPeScrollEnabled(scroll.enabled !== false); setPeScrollThreshold((scroll.threshold_percent as number) || 50); }
          const exit = triggers.exit_intent as Record<string, unknown> | undefined;
          if (exit) { setPeExitIntentEnabled(exit.enabled !== false); }
          const highIntent = triggers.high_intent_urls as Record<string, unknown> | undefined;
          if (highIntent) {
            setPeHighIntentEnabled(highIntent.enabled === true);
            setPeHighIntentPatterns(((highIntent.patterns as string[]) || []).join("\n"));
          }
        }
      }

      // Load V2 lead capture settings
      const lcV2 = settings.lead_capture_v2 as Record<string, unknown> | undefined;
      if (lcV2) {
        setLcV2Enabled(lcV2.enabled === true);
        const formFields = lcV2.form_fields as Record<string, unknown> | undefined;
        if (formFields) {
          const f2 = formFields.field_2 as Record<string, unknown> | undefined;
          if (f2) {
            setLcV2Field2Enabled(f2.enabled === true);
            setLcV2Field2Label((f2.label as string) || leadT("phoneNumber"));
            setLcV2Field2Required(f2.required === true);
          }
          const f3 = formFields.field_3 as Record<string, unknown> | undefined;
          if (f3) {
            setLcV2Field3Enabled(f3.enabled === true);
            setLcV2Field3Label((f3.label as string) || leadT("company"));
            setLcV2Field3Required(f3.required === true);
          }
        }
        const qs = lcV2.qualifying_questions as Array<Record<string, unknown>> | undefined;
        if (qs) {
          if (qs[0]) { setLcV2Q1Enabled(qs[0].enabled === true); setLcV2Q1Text((qs[0].question as string) || ""); }
          if (qs[1]) { setLcV2Q2Enabled(qs[1].enabled === true); setLcV2Q2Text((qs[1].question as string) || ""); }
          if (qs[2]) { setLcV2Q3Enabled(qs[2].enabled === true); setLcV2Q3Text((qs[2].question as string) || ""); }
        }
        setLcV2NotifEmail((lcV2.notification_email as string) || "");
        setLcV2NotifsEnabled(lcV2.notifications_enabled !== false);
      }

      // Load lead recovery settings (V3)
      const lr = settings.lead_recovery as Record<string, unknown> | undefined;
      if (lr) {
        setLrEnabled(lr.enabled === true);
        const exitOverlay = lr.exit_intent_overlay as Record<string, unknown> | undefined;
        if (exitOverlay) {
          setLrExitOverlayEnabled(exitOverlay.enabled !== false);
          setLrExitHeadline((exitOverlay.headline as string) || "Before you go...");
          setLrExitSubtext((exitOverlay.subtext as string) || "Drop your email and we'll follow up");
        }
        const deferred = lr.deferred_skip as Record<string, unknown> | undefined;
        if (deferred) {
          setLrDeferredEnabled(deferred.enabled !== false);
          setLrDeferredReaskAfter((deferred.reask_after_messages as number) || 3);
          setLrDeferredMaxAsks((deferred.max_deferred_asks as number) || 2);
        }
        const returnVisit = lr.return_visit as Record<string, unknown> | undefined;
        if (returnVisit) {
          setLrReturnVisitEnabled(returnVisit.enabled !== false);
          setLrReturnMaxVisits((returnVisit.max_visits_before_stop as number) || 3);
          setLrReturnMessage((returnVisit.welcome_back_message as string) || "Welcome back! Want me to email you a summary?");
        }
        const highIntent = lr.high_intent_override as Record<string, unknown> | undefined;
        if (highIntent) {
          setLrHighIntentEnabled(highIntent.enabled !== false);
          setLrHighIntentKeywords(((highIntent.keywords as string[]) || []).join(", "));
        }
        const summaryHook = lr.conversation_summary_hook as Record<string, unknown> | undefined;
        if (summaryHook) {
          setLrSummaryHookEnabled(summaryHook.enabled !== false);
          setLrSummaryMinMessages((summaryHook.min_messages as number) || 3);
          setLrSummaryPrompt((summaryHook.prompt as string) || "Want me to email you a summary of this conversation?");
        }
      }
    }
  }, [currentProject, leadT]);

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

  const handleSave = async () => {
    if (!currentProject) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await apiClient<ProjectUpdateResponse>(`/api/projects/${currentProject.id}`, {
        method: "PUT",
        body: JSON.stringify({
          name: name.trim() || t("agentNamePlaceholder"),
          systemPrompt: systemPrompt.trim(),
          settings: {
            language: languageDefault ? { default: languageDefault } : {},
          },
        }),
      });

      // Refresh projects to update context
      await refreshProjects();

      setSuccess(t("saved"));

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error("Error saving settings:", err);
      setError(t("saveError"));
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
    if (!currentProject) return;

    const confirmed = confirm(
      t("deleteConfirm", { name: currentProject.name })
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
      setError(t("deleteError"));
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

      setSuccess(enabled ? t("widgetEnabledSuccess") : t("widgetDisabledSuccess"));
      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      console.error("Error updating widget status:", err);
      setError(t("widgetStatusError"));
      // Revert on error
      setWidgetEnabled(!enabled);
    } finally {
      setSavingWidgetStatus(false);
    }
  };

  const handleSaveLeadCapture = async () => {
    if (!currentProject) return;

    // Validate V2 notification email if enabled
    if (lcV2Enabled && lcV2NotifsEnabled && lcV2NotifEmail.trim()) {
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(lcV2NotifEmail.trim())) {
        setError(leadT("invalidEmail"));
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
        // Keep V1 settings in sync (disabled when V2 is active)
        lead_capture_enabled: lcV2Enabled ? false : leadCaptureEnabled,
        lead_capture_email: leadCaptureEmail.trim() || null,
        lead_notifications_enabled: leadNotificationsEnabled,
        // V2 settings
        lead_capture_v2: {
          enabled: lcV2Enabled,
          form_fields: {
            email: { required: true },
            field_2: { enabled: lcV2Field2Enabled, label: lcV2Field2Label.trim() || leadT("phoneNumber"), required: lcV2Field2Required },
            field_3: { enabled: lcV2Field3Enabled, label: lcV2Field3Label.trim() || leadT("company"), required: lcV2Field3Required },
          },
          qualifying_questions: [
            { question: lcV2Q1Text.trim(), enabled: lcV2Q1Enabled && !!lcV2Q1Text.trim() },
            { question: lcV2Q2Text.trim(), enabled: lcV2Q2Enabled && !!lcV2Q2Text.trim() },
            { question: lcV2Q3Text.trim(), enabled: lcV2Q3Enabled && !!lcV2Q3Text.trim() },
          ],
          notification_email: lcV2NotifEmail.trim() || null,
          notifications_enabled: lcV2NotifsEnabled,
        },
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

      setSuccess(leadT("saved"));
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error("Error saving lead capture settings:", err);
      setError(leadT("saveError"));
    } finally {
      setSavingLeadCapture(false);
    }
  };

  // Save proactive engagement settings
  const handleSaveProactive = async () => {
    if (!currentProject) return;

    setSavingProactive(true);
    setError(null);
    setSuccess(null);

    try {
      const existingSettings = currentProject.settings || {};
      const updatedSettings = {
        ...existingSettings,
        proactive_engagement: {
          enabled: peEnabled,
          teaser: {
            enabled: peTeaserEnabled,
            message: peTeaserMessage.trim() || "Have a question? I can help!",
            delay_seconds: peTeaserDelay,
            show_once_per_session: true,
          },
          badge: {
            enabled: peBadgeEnabled,
            show_until_opened: true,
          },
          triggers: {
            time_on_page: { enabled: peTimeEnabled, delay_seconds: peTimeDelay, action: "teaser" as const },
            scroll_depth: { enabled: peScrollEnabled, threshold_percent: peScrollThreshold, action: "teaser" as const },
            exit_intent: { enabled: peExitIntentEnabled, action: "overlay" as const, message: "Before you go - have a question?" },
            high_intent_urls: {
              enabled: peHighIntentEnabled,
              patterns: peHighIntentPatterns.split("\n").map(p => p.trim()).filter(Boolean),
              action: "auto_open" as const,
            },
          },
        },
      };

      await apiClient<ProjectUpdateResponse>(`/api/projects/${currentProject.id}`, {
        method: "PUT",
        body: JSON.stringify({ name: currentProject.name, settings: updatedSettings }),
      });

      await refreshProjects();
      setSuccess("Proactive engagement settings saved");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error("Error saving proactive settings:", err);
      setError("Failed to save proactive engagement settings");
    } finally {
      setSavingProactive(false);
    }
  };

  // Save lead recovery settings (V3)
  const handleSaveRecovery = async () => {
    if (!currentProject) return;

    setSavingRecovery(true);
    setError(null);
    setSuccess(null);

    try {
      const existingSettings = currentProject.settings || {};
      const updatedSettings = {
        ...existingSettings,
        lead_recovery: {
          enabled: lrEnabled,
          exit_intent_overlay: {
            enabled: lrExitOverlayEnabled,
            headline: lrExitHeadline.trim() || "Before you go...",
            subtext: lrExitSubtext.trim() || "Drop your email and we'll follow up",
          },
          deferred_skip: {
            enabled: lrDeferredEnabled,
            reask_after_messages: lrDeferredReaskAfter,
            max_deferred_asks: lrDeferredMaxAsks,
          },
          return_visit: {
            enabled: lrReturnVisitEnabled,
            max_visits_before_stop: lrReturnMaxVisits,
            welcome_back_message: lrReturnMessage.trim() || "Welcome back! Want me to email you a summary?",
          },
          high_intent_override: {
            enabled: lrHighIntentEnabled,
            keywords: lrHighIntentKeywords.split(",").map(k => k.trim()).filter(Boolean),
            override_cooldowns: true,
          },
          conversation_summary_hook: {
            enabled: lrSummaryHookEnabled,
            min_messages: lrSummaryMinMessages,
            prompt: lrSummaryPrompt.trim() || "Want me to email you a summary of this conversation?",
          },
        },
      };

      await apiClient<ProjectUpdateResponse>(`/api/projects/${currentProject.id}`, {
        method: "PUT",
        body: JSON.stringify({ name: currentProject.name, settings: updatedSettings }),
      });

      await refreshProjects();
      setSuccess("Lead recovery settings saved");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error("Error saving recovery settings:", err);
      setError("Failed to save lead recovery settings");
    } finally {
      setSavingRecovery(false);
    }
  };

  // Domain whitelist handlers
  const handleAddDomain = () => {
    const domain = newDomain.trim().toLowerCase();

    if (!domain) return;

    // Basic validation - allows wildcards like *.example.com
    const domainRegex = /^(\*\.)?[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/;
    if (!domainRegex.test(domain)) {
      setDomainError(embedT("invalidDomain"));
      return;
    }

    if (allowedDomains.includes(domain)) {
      setDomainError(embedT("domainAlreadyAdded"));
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
    const domainsToSave = [...allowedDomains];
    if (newDomain.trim()) {
      const domain = newDomain.trim().toLowerCase();
      const domainRegex = /^(\*\.)?[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/;

      if (!domainRegex.test(domain)) {
        setDomainError(embedT("invalidDomain"));
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
          ? embedT("domainsUpdated", { count: domainsToSave.length })
          : embedT("domainsDisabled")
      );
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      const message = err instanceof Error ? err.message : embedT("saveDomainError");
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
        <div className="grid grid-cols-1 gap-6">
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
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="text-muted-foreground">{t("noAgentSelected")}</p>
        </div>
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground mb-4">
              {t("selectAgentFirst")}
            </p>
            <Button onClick={() => router.push("/projects")}>
              {t("goToAgents")}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground">
          {t("manageFor", { name: currentProject.name })}
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

      <div className="grid grid-cols-1 gap-6">
        <Card>
          <CardContent className="p-6">
            <h2 className="font-semibold mb-4">{t("agentSettings")}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  {t("agentName")}
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t("agentNamePlaceholder")}
                  maxLength={50}
                  className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {t("characterCount", { count: name.length, max: 50 })}
                </p>
              </div>
              <div>
                <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
                  <label className="block text-sm font-medium">
                    {t("agentDescription")}
                  </label>
                  {/* Was absolutely positioned inside the textarea before — on
                      narrow screens wrapped text reached the same corner and
                      rendered underneath it. Moved into the label row instead
                      so it can never overlap the field's content. */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowPresets(!showPresets)}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground bg-background border border-input rounded-md hover:bg-muted transition-colors"
                    >
                      {t("presets")}
                      <ChevronDown className="h-4 w-4" />
                    </button>
                    {showPresets && (
                      <div className="absolute top-full end-0 mt-1 w-48 bg-background border border-input rounded-md shadow-lg z-10">
                        {systemPromptPresets.map((preset) => (
                          <button
                            key={preset.name}
                            type="button"
                            onClick={() => {
                              setSystemPrompt(preset.prompt);
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
                <textarea
                  rows={4}
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  placeholder={t("agentDescriptionPlaceholder")}
                  maxLength={2000}
                  className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  {t("characterCount", { count: systemPrompt.length, max: 2000 })}
                </p>
              </div>
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
                <p className="text-sm text-muted-foreground mt-1">
                  {t("languageHelp")}
                </p>
              </div>
              <div className="pt-2">
                <Button onClick={handleSave} disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
                  {saving ? t("saving") : t("saveChanges")}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h2 className="font-semibold mb-4">{t("widgetAgentId")}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  {t("agentId")}
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
                <p className="text-sm text-muted-foreground mt-1">
                  {t("widgetIdHelp")}
                </p>
              </div>
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

        {/* Widget Status - Emergency Kill Switch */}
        <Card className={!widgetEnabled ? "border-destructive/50 bg-destructive/5" : ""}>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              {widgetEnabled ? (
                <ShieldCheck className="h-5 w-5 text-green-600" />
              ) : (
                <ShieldAlert className="h-5 w-5 text-destructive" />
              )}
              <h2 className="font-semibold">{t("widgetStatus")}</h2>
              {savingWidgetStatus && (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              {t("widgetStatusDescription")}
            </p>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="widget-status-toggle" className="text-base">
                  {widgetEnabled ? t("widgetActive") : t("widgetDisabled")}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {widgetEnabled
                    ? t("widgetActiveDescription")
                    : t("widgetDisabledDescription")}
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
                  {t("widgetHiddenWarning")}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Proactive Engagement - HIDDEN (not production ready) */}
        {false && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">Proactive Engagement</h2>
              {savingProactive && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Proactively engage visitors with teasers, badges, and triggers to increase chat opens.
            </p>

            {/* Master Toggle */}
            <div className="flex items-center justify-between mb-6">
              <div className="space-y-0.5">
                <Label htmlFor="pe-enabled" className="text-base">Enable Proactive Engagement</Label>
                <p className="text-sm text-muted-foreground">Show teasers and triggers to visitors</p>
              </div>
              <Switch id="pe-enabled" checked={peEnabled} onCheckedChange={setPeEnabled} />
            </div>

            {peEnabled && (
              <div className="space-y-6 border-t pt-4">
                {/* Teaser Message */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    <h3 className="text-sm font-medium">Teaser Message</h3>
                    <Switch checked={peTeaserEnabled} onCheckedChange={setPeTeaserEnabled} />
                  </div>
                  {peTeaserEnabled && (
                    <div className="ms-6 space-y-2">
                      <div>
                        <Label className="text-xs text-muted-foreground">Message</Label>
                        <Input
                          value={peTeaserMessage}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPeTeaserMessage(e.target.value)}
                          placeholder="Have a question? I can help!"
                          maxLength={100}
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Delay (seconds)</Label>
                        <Input
                          type="number"
                          value={peTeaserDelay}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPeTeaserDelay(Number(e.target.value))}
                          min={1}
                          max={120}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Notification Badge */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="inline-block w-3 h-3 bg-red-500 rounded-full" />
                    <div>
                      <h3 className="text-sm font-medium">Notification Badge</h3>
                      <p className="text-xs text-muted-foreground">Red dot on chat bubble to attract attention</p>
                    </div>
                  </div>
                  <Switch checked={peBadgeEnabled} onCheckedChange={setPeBadgeEnabled} />
                </div>

                {/* Triggers */}
                <div className="space-y-3">
                  <h3 className="text-sm font-medium">Triggers</h3>

                  {/* Time on Page */}
                  <div className="flex items-center justify-between ms-2">
                    <div className="flex items-center gap-2">
                      <Timer className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm">Time on Page</p>
                        {peTimeEnabled && (
                          <p className="text-xs text-muted-foreground">
                            After {peTimeDelay}s on page
                          </p>
                        )}
                      </div>
                    </div>
                    <Switch checked={peTimeEnabled} onCheckedChange={setPeTimeEnabled} />
                  </div>
                  {peTimeEnabled && (
                    <div className="ms-8">
                      <Input
                        type="number"
                        value={peTimeDelay}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPeTimeDelay(Number(e.target.value))}
                        min={5}
                        max={300}
                        className="w-24"
                      />
                    </div>
                  )}

                  {/* Scroll Depth */}
                  <div className="flex items-center justify-between ms-2">
                    <div className="flex items-center gap-2">
                      <ScrollText className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm">Scroll Depth</p>
                        {peScrollEnabled && (
                          <p className="text-xs text-muted-foreground">
                            After scrolling {peScrollThreshold}% of the page
                          </p>
                        )}
                      </div>
                    </div>
                    <Switch checked={peScrollEnabled} onCheckedChange={setPeScrollEnabled} />
                  </div>
                  {peScrollEnabled && (
                    <div className="ms-8">
                      <Input
                        type="number"
                        value={peScrollThreshold}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPeScrollThreshold(Number(e.target.value))}
                        min={10}
                        max={100}
                        className="w-24"
                      />
                    </div>
                  )}

                  {/* Exit Intent */}
                  <div className="flex items-center justify-between ms-2">
                    <div className="flex items-center gap-2">
                      <MousePointerClick className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm">Exit Intent (Desktop Only)</p>
                        <p className="text-xs text-muted-foreground">When cursor moves to close/back</p>
                      </div>
                    </div>
                    <Switch checked={peExitIntentEnabled} onCheckedChange={setPeExitIntentEnabled} />
                  </div>

                  {/* High-Intent URLs */}
                  <div className="flex items-center justify-between ms-2">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm">High-Intent URL Patterns</p>
                        <p className="text-xs text-muted-foreground">Auto-open on matching pages</p>
                      </div>
                    </div>
                    <Switch checked={peHighIntentEnabled} onCheckedChange={setPeHighIntentEnabled} />
                  </div>
                  {peHighIntentEnabled && (
                    <div className="ms-8">
                      <textarea
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        value={peHighIntentPatterns}
                        onChange={(e) => setPeHighIntentPatterns(e.target.value)}
                        rows={3}
                        placeholder={"/pricing\n/contact\n/demo"}
                      />
                      <p className="text-xs text-muted-foreground mt-1">One URL pattern per line (e.g., /pricing)</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <Button onClick={handleSaveProactive} disabled={savingProactive}>
                {savingProactive ? "Saving..." : "Save Engagement Settings"}
              </Button>
            </div>
          </CardContent>
        </Card>
        )}

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Mail className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">{leadT("title")}</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              {leadT("description")}
            </p>

            <div className="space-y-6">
              {/* Enable Toggle */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="lc-v2-toggle" className="text-base">
                    {leadT("enableTitle")}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {t("leadCaptureAfterFirst")}
                  </p>
                </div>
                <Switch
                  id="lc-v2-toggle"
                  checked={lcV2Enabled}
                  onCheckedChange={setLcV2Enabled}
                />
              </div>

              {lcV2Enabled && (
                <div className="space-y-6 border-t pt-6">
                  {/* Form Fields Section */}
                  <div>
                    <h3 className="text-sm font-semibold mb-3">{leadT("formFields")}</h3>
                    <div className="space-y-3">
                      {/* Email - always required */}
                      <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                        <div className="flex-1">
                          <p className="text-sm font-medium">{leadT("email")}</p>
                          <p className="text-xs text-muted-foreground">{leadT("alwaysRequired")}</p>
                        </div>
                        <Badge variant="secondary">{leadT("required")}</Badge>
                      </div>

                      {/* Field 2 */}
                      <div className="flex flex-wrap items-center gap-3 p-3 border rounded-lg">
                        <Switch
                          id="lc-v2-field2-toggle"
                          checked={lcV2Field2Enabled}
                          onCheckedChange={setLcV2Field2Enabled}
                          className="shrink-0"
                        />
                        <div className="flex-1 min-w-[140px] space-y-1.5">
                          <input
                            type="text"
                            value={lcV2Field2Label}
                            onChange={(e) => setLcV2Field2Label(e.target.value)}
                            placeholder={leadT("fieldLabelPlaceholder")}
                            maxLength={30}
                            disabled={!lcV2Field2Enabled}
                            className="w-full px-2 py-1 text-sm border border-input rounded focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
                          />
                        </div>
                        <label className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
                          <input
                            type="checkbox"
                            checked={lcV2Field2Required}
                            onChange={(e) => setLcV2Field2Required(e.target.checked)}
                            disabled={!lcV2Field2Enabled}
                            className="rounded"
                          />
                          {leadT("required")}
                        </label>
                      </div>

                      {/* Field 3 */}
                      <div className="flex flex-wrap items-center gap-3 p-3 border rounded-lg">
                        <Switch
                          id="lc-v2-field3-toggle"
                          checked={lcV2Field3Enabled}
                          onCheckedChange={setLcV2Field3Enabled}
                          className="shrink-0"
                        />
                        <div className="flex-1 min-w-[140px] space-y-1.5">
                          <input
                            type="text"
                            value={lcV2Field3Label}
                            onChange={(e) => setLcV2Field3Label(e.target.value)}
                            placeholder={leadT("fieldLabelPlaceholder")}
                            maxLength={30}
                            disabled={!lcV2Field3Enabled}
                            className="w-full px-2 py-1 text-sm border border-input rounded focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
                          />
                        </div>
                        <label className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
                          <input
                            type="checkbox"
                            checked={lcV2Field3Required}
                            onChange={(e) => setLcV2Field3Required(e.target.checked)}
                            disabled={!lcV2Field3Enabled}
                            className="rounded"
                          />
                          {leadT("required")}
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Qualifying Questions Section */}
                  <div>
                    <h3 className="text-sm font-semibold mb-1">{leadT("qualifyingQuestions")}</h3>
                    <p className="text-xs text-muted-foreground mb-3">
                      {t("leadQuestionDescription")}
                    </p>
                    <div className="space-y-3">
                      {/* Q1 */}
                      <div className="flex items-center gap-3">
                        <Switch
                          id="lc-v2-q1-toggle"
                          checked={lcV2Q1Enabled}
                          onCheckedChange={setLcV2Q1Enabled}
                        />
                        <input
                          type="text"
                          value={lcV2Q1Text}
                          onChange={(e) => setLcV2Q1Text(e.target.value)}
                          placeholder={t("question1Placeholder")}
                          maxLength={200}
                          disabled={!lcV2Q1Enabled}
                          className="flex-1 px-3 py-2 text-sm border border-input rounded-md focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
                        />
                      </div>

                      {/* Q2 */}
                      <div className="flex items-center gap-3">
                        <Switch
                          id="lc-v2-q2-toggle"
                          checked={lcV2Q2Enabled}
                          onCheckedChange={setLcV2Q2Enabled}
                        />
                        <input
                          type="text"
                          value={lcV2Q2Text}
                          onChange={(e) => setLcV2Q2Text(e.target.value)}
                          placeholder={t("question2Placeholder")}
                          maxLength={200}
                          disabled={!lcV2Q2Enabled}
                          className="flex-1 px-3 py-2 text-sm border border-input rounded-md focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
                        />
                      </div>

                      {/* Q3 */}
                      <div className="flex items-center gap-3">
                        <Switch
                          id="lc-v2-q3-toggle"
                          checked={lcV2Q3Enabled}
                          onCheckedChange={setLcV2Q3Enabled}
                        />
                        <input
                          type="text"
                          value={lcV2Q3Text}
                          onChange={(e) => setLcV2Q3Text(e.target.value)}
                          placeholder={t("question3Placeholder")}
                          maxLength={200}
                          disabled={!lcV2Q3Enabled}
                          className="flex-1 px-3 py-2 text-sm border border-input rounded-md focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Notifications Section */}
                  <div>
                    <h3 className="text-sm font-semibold mb-3">{leadT("notifications")}</h3>
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="lc-v2-notif-email" className="text-sm">
                          {leadT("notificationEmail")}
                        </Label>
                        <input
                          id="lc-v2-notif-email"
                          type="email"
                          value={lcV2NotifEmail}
                          onChange={(e) => setLcV2NotifEmail(e.target.value)}
                          placeholder={leadT("notificationEmailPlaceholder")}
                          className="w-full mt-1.5 px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          {leadT("notificationEmailHelp")}
                        </p>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label htmlFor="lc-v2-notifs-toggle" className="text-sm">
                            {leadT("enableNotifications")}
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            {leadT("enableNotificationsHelp")}
                          </p>
                        </div>
                        <Switch
                          id="lc-v2-notifs-toggle"
                          checked={lcV2NotifsEnabled}
                          onCheckedChange={setLcV2NotifsEnabled}
                        />
                      </div>
                    </div>
                  </div>

                </div>
              )}

              <div className="pt-2">
                <Button onClick={handleSaveLeadCapture} disabled={savingLeadCapture}>
                  {savingLeadCapture && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
                  {savingLeadCapture ? leadT("saving") : leadT("save")}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lead Recovery (V3) - HIDDEN (not production ready) */}
        {false && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <RotateCcw className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">Lead Recovery</h2>
              {savingRecovery && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Recover visitors who didn&apos;t leave their email on the first attempt with exit overlays, deferred re-asks, return visit detection, and more.
            </p>

            {/* Master Toggle */}
            <div className="flex items-center justify-between mb-6">
              <div className="space-y-0.5">
                <Label htmlFor="lr-enabled" className="text-base">Enable Lead Recovery</Label>
                <p className="text-sm text-muted-foreground">Activate multi-signal recovery to capture more leads</p>
              </div>
              <Switch id="lr-enabled" checked={lrEnabled} onCheckedChange={setLrEnabled} />
            </div>

            {lrEnabled && (
              <div className="space-y-6 border-t pt-4">
                {/* Exit Intent Overlay */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MousePointerClick className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <h3 className="text-sm font-medium">Exit Intent Overlay</h3>
                        <p className="text-xs text-muted-foreground">Show email capture when visitor tries to leave (desktop only)</p>
                      </div>
                    </div>
                    <Switch checked={lrExitOverlayEnabled} onCheckedChange={setLrExitOverlayEnabled} />
                  </div>
                  {lrExitOverlayEnabled && (
                    <div className="ms-6 space-y-2">
                      <div>
                        <Label className="text-xs text-muted-foreground">Headline</Label>
                        <Input
                          value={lrExitHeadline}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLrExitHeadline(e.target.value)}
                          placeholder="Before you go..."
                          maxLength={60}
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Subtext</Label>
                        <Input
                          value={lrExitSubtext}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLrExitSubtext(e.target.value)}
                          placeholder="Drop your email and we'll follow up"
                          maxLength={120}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Deferred Skip */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Timer className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <h3 className="text-sm font-medium">Deferred Skip</h3>
                        <p className="text-xs text-muted-foreground">Re-ask for email after visitor skips the form</p>
                      </div>
                    </div>
                    <Switch checked={lrDeferredEnabled} onCheckedChange={setLrDeferredEnabled} />
                  </div>
                  {lrDeferredEnabled && (
                    <div className="ms-6 space-y-2">
                      <div>
                        <Label className="text-xs text-muted-foreground">Re-ask after N more messages</Label>
                        <Input
                          type="number"
                          value={lrDeferredReaskAfter}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLrDeferredReaskAfter(Number(e.target.value))}
                          min={1}
                          max={20}
                          className="w-20"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Max deferred re-asks</Label>
                        <Input
                          type="number"
                          value={lrDeferredMaxAsks}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLrDeferredMaxAsks(Number(e.target.value))}
                          min={1}
                          max={5}
                          className="w-20"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Return Visit */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <RotateCcw className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <h3 className="text-sm font-medium">Return Visit Recovery</h3>
                        <p className="text-xs text-muted-foreground">Welcome back returning visitors and ask for email</p>
                      </div>
                    </div>
                    <Switch checked={lrReturnVisitEnabled} onCheckedChange={setLrReturnVisitEnabled} />
                  </div>
                  {lrReturnVisitEnabled && (
                    <div className="ms-6 space-y-2">
                      <div>
                        <Label className="text-xs text-muted-foreground">Max visits before stopping</Label>
                        <Input
                          type="number"
                          value={lrReturnMaxVisits}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLrReturnMaxVisits(Number(e.target.value))}
                          min={1}
                          max={10}
                          className="w-20"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Welcome-back message</Label>
                        <Input
                          value={lrReturnMessage}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLrReturnMessage(e.target.value)}
                          placeholder="Welcome back! Want me to email you a summary?"
                          maxLength={200}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* High-Intent Override */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <h3 className="text-sm font-medium">High-Intent Override</h3>
                        <p className="text-xs text-muted-foreground">Override cooldowns when visitor shows buying intent</p>
                      </div>
                    </div>
                    <Switch checked={lrHighIntentEnabled} onCheckedChange={setLrHighIntentEnabled} />
                  </div>
                  {lrHighIntentEnabled && (
                    <div className="ms-6">
                      <Label className="text-xs text-muted-foreground">Keywords (comma-separated)</Label>
                      <Input
                        value={lrHighIntentKeywords}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLrHighIntentKeywords(e.target.value)}
                        placeholder="pricing, demo, trial, contact, sales"
                      />
                      <p className="text-xs text-muted-foreground mt-1">When a visitor types any of these words, immediately ask for email</p>
                    </div>
                  )}
                </div>

                {/* Conversation Summary Hook */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <h3 className="text-sm font-medium">Conversation Summary Hook</h3>
                        <p className="text-xs text-muted-foreground">Offer to email a summary after a conversation</p>
                      </div>
                    </div>
                    <Switch checked={lrSummaryHookEnabled} onCheckedChange={setLrSummaryHookEnabled} />
                  </div>
                  {lrSummaryHookEnabled && (
                    <div className="ms-6 space-y-2">
                      <div>
                        <Label className="text-xs text-muted-foreground">Minimum messages before showing</Label>
                        <Input
                          type="number"
                          value={lrSummaryMinMessages}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLrSummaryMinMessages(Number(e.target.value))}
                          min={2}
                          max={20}
                          className="w-20"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Prompt message</Label>
                        <Input
                          value={lrSummaryPrompt}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLrSummaryPrompt(e.target.value)}
                          placeholder="Want me to email you a summary of this conversation?"
                          maxLength={200}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <Button onClick={handleSaveRecovery} disabled={savingRecovery}>
                {savingRecovery ? "Saving..." : "Save Recovery Settings"}
              </Button>
            </div>
          </CardContent>
        </Card>
        )}

        <Card>
          <CardContent className="p-6">
            <Link href="/settings/handoff" className="flex items-center justify-between group">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-primary/10">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h2 className="font-semibold group-hover:text-primary transition-colors">{t("handoffTitle")}</h2>
                  <p className="text-sm text-muted-foreground">
                    {t("handoffDescription")}
                  </p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors rtl:-scale-x-100" />
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">{embedT("domainWhitelist")}</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              {embedT("domainWhitelistDescription")}
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
                    <Label>{embedT("allowedDomains")}</Label>
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
                            className="ms-1 hover:text-destructive"
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
                  <Label htmlFor="new-domain">{embedT("addDomain")}</Label>
                  <div className="flex gap-2">
                    <Input
                      id="new-domain"
                      value={newDomain}
                      onChange={(e) => {
                        setNewDomain(e.target.value);
                        setDomainError(null);
                      }}
                      onKeyDown={(e) => e.key === "Enter" && handleAddDomain()}
                      placeholder={embedT("domainPlaceholder")}
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
                    {embedT("domainHelp")}
                  </p>
                </div>

                {/* Status Indicator */}
                <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                  {allowedDomains.length > 0 ? (
                    <>
                      <ShieldCheck className="h-4 w-4 text-green-500" />
                      <span className="text-sm">
                        {embedT("restrictedStatus", { count: allowedDomains.length })}
                      </span>
                    </>
                  ) : (
                    <>
                      <ShieldAlert className="h-4 w-4 text-yellow-500" />
                      <span className="text-sm">
                        {embedT("openStatus")}
                      </span>
                    </>
                  )}
                </div>

                <div className="pt-2">
                  <Button onClick={handleSaveDomains} disabled={savingDomains}>
                    {savingDomains && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
                    {savingDomains ? embedT("saving") : embedT("saveDomainSettings")}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h2 className="font-semibold mb-4 text-destructive">{t("dangerZone")}</h2>
            <div className="p-4 border border-destructive/50 rounded-md">
              <h3 className="font-medium">{t("deleteAgent")}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {t("deleteDescription")}
              </p>
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
    </div>
  );
}
