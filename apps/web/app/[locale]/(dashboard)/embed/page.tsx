"use client";

import {
  Badge,
  Button,
  Card,
  Input,
  Label,
  Switch,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
  cn,
} from "@chatbot/ui";
import {
  AlertTriangle,
  Check,
  Code,
  Copy,
  Eye,
  ExternalLink,
  Loader2,
  Monitor,
  ChevronDown,
  ChevronUp,
  Plus,
  RefreshCw,
  Smartphone,
  Trash2,
  Upload,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useProject } from "@/contexts/project-context";
import { Link } from "@/i18n/navigation";
import { apiClient } from "@/lib/api-client";
import { createClient } from "@/lib/supabase/client";
import {
  buildWidgetEmbedCode,
  WIDGET_API_URL,
  WIDGET_PREVIEW_SCRIPT_URL,
  WIDGET_SCRIPT_URL,
} from "@/lib/widget-embed";

type Theme = "light" | "dark" | "auto";
type Position = "bottom-right" | "bottom-left";

interface WidgetSettings {
  primaryColor: string;
  theme: Theme;
  position: Position;
  bubbleColor: string; // "" → use primary color
  usePrimaryForHeader: boolean;
  avatarUrl: string | null;
  launcherIconUrl: string | null;
  hideBranding: boolean;
  placeholder: string;
  starters: string[];
  noticeEnabled: boolean;
  noticeText: string;
  footerText: string;
  footerUrl: string;
  feedbackEnabled: boolean;
  copyEnabled: boolean;
  localeDefault: string;
  channels: Array<{ type: string; url: string; label: string; iconUrl: string }>;
}

const DEFAULTS: WidgetSettings = {
  primaryColor: "#0a0a0a",
  theme: "light",
  position: "bottom-right",
  bubbleColor: "",
  usePrimaryForHeader: true,
  avatarUrl: null,
  launcherIconUrl: null,
  hideBranding: false,
  placeholder: "Type a message...",
  starters: [],
  noticeEnabled: false,
  noticeText: "",
  footerText: "",
  footerUrl: "",
  feedbackEnabled: false,
  copyEnabled: true,
  localeDefault: "en",
  channels: [],
};

const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
// Raster types only — must match the widget-assets storage policy (SVG excluded: XSS risk).
const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

interface EmbedConfigResponse {
  config?: {
    primaryColor?: string;
    theme?: Theme;
    position?: Position;
    bubbleColor?: string | null;
    usePrimaryForHeader?: boolean;
    avatarUrl?: string | null;
    launcherIconUrl?: string | null;
    hideBranding?: boolean;
    placeholder?: string;
    starters?: string[];
    notice?: { enabled: boolean; text: string };
    footer?: { text: string; url?: string } | null;
    feedbackEnabled?: boolean;
    copyEnabled?: boolean;
    localeDefault?: string;
    channels?: Array<{ type: string; url: string; label?: string; iconUrl?: string }>;
  };
}

interface WidgetPreviewKeyResponse {
  key: string;
}

/** Map the resolved /config response (camelCase) into editor state. */
function fromConfig(
  cfg: EmbedConfigResponse["config"],
  defaults: WidgetSettings = DEFAULTS
): WidgetSettings {
  if (!cfg) return defaults;
  return {
    primaryColor: cfg.primaryColor ?? defaults.primaryColor,
    theme: cfg.theme ?? defaults.theme,
    position: cfg.position ?? defaults.position,
    bubbleColor: cfg.bubbleColor ?? "",
    usePrimaryForHeader: cfg.usePrimaryForHeader ?? defaults.usePrimaryForHeader,
    avatarUrl: cfg.avatarUrl ?? null,
    launcherIconUrl: cfg.launcherIconUrl ?? null,
    hideBranding: cfg.hideBranding ?? defaults.hideBranding,
    placeholder: cfg.placeholder ?? defaults.placeholder,
    starters: cfg.starters ?? [],
    noticeEnabled: cfg.notice?.enabled ?? false,
    noticeText: cfg.notice?.text ?? "",
    footerText: cfg.footer?.text ?? "",
    footerUrl: cfg.footer?.url ?? "",
    feedbackEnabled: cfg.feedbackEnabled ?? DEFAULTS.feedbackEnabled,
    copyEnabled: cfg.copyEnabled ?? defaults.copyEnabled,
    localeDefault: cfg.localeDefault ?? defaults.localeDefault,
    channels: (cfg.channels ?? []).map((ch) => ({
      type: ch.type,
      url: ch.url,
      label: ch.label ?? "",
      iconUrl: ch.iconUrl ?? "",
    })),
  };
}

/** Map editor state to the settings payload (snake_case widget_appearance). */
function toSettingsPayload(s: WidgetSettings) {
  return {
    primary_color: s.primaryColor,
    widget_appearance: {
      theme: s.theme,
      position: s.position,
      placeholder: s.placeholder,
      avatar_url: s.avatarUrl,
      launcher_icon_url: s.launcherIconUrl,
      bubble_color: s.bubbleColor || null,
      use_primary_for_header: s.usePrimaryForHeader,
      hide_branding: s.hideBranding,
      feedback_enabled: s.feedbackEnabled,
      copy_enabled: s.copyEnabled,
      starters: s.starters.map((x) => x.trim()).filter(Boolean),
      notice: { enabled: s.noticeEnabled, text: s.noticeText },
      footer: s.footerText
        ? { text: s.footerText, ...(s.footerUrl ? { url: s.footerUrl } : {}) }
        : null,
      locale_default: s.localeDefault,
      channels: s.channels
        .filter((ch) => ch.url.trim())
        .map((ch) => ({
          type: ch.type,
          url: ch.url.trim(),
          ...(ch.label.trim() ? { label: ch.label.trim() } : {}),
          ...(ch.iconUrl.trim() ? { iconUrl: ch.iconUrl.trim() } : {}),
        })),
    },
  };
}

export default function EmbedPage() {
  const t = useTranslations("dashboard.pages.embed");
  const { currentProject, isLoading: projectLoading } = useProject();
  const localizedDefaults = useMemo<WidgetSettings>(
    () => ({ ...DEFAULTS, placeholder: t("defaultPlaceholder") }),
    [t]
  );
  const [settings, setSettings] = useState<WidgetSettings>(localizedDefaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<"avatar" | "launcher" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<"desktop" | "mobile">("desktop");
  const [previewKey, setPreviewKey] = useState(0);
  const [previewClientKey, setPreviewClientKey] = useState<string | null>(null);
  const [previewKeyWarning, setPreviewKeyWarning] = useState<string | null>(null);
  const [newStarter, setNewStarter] = useState("");

  const projectId = currentProject?.id;

  // ---- Load current appearance from the (resolved) embed config ----
  const load = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    setPreviewKeyWarning(null);
    try {
      const [res, previewKeyRes] = await Promise.all([
        apiClient<EmbedConfigResponse>(`/api/embed/config/${projectId}`),
        apiClient<WidgetPreviewKeyResponse>(
          `/api/projects/${projectId}/widget-preview-key`
        ).catch((err) => {
          console.warn("Failed to load widget preview key:", err);
          setPreviewKeyWarning(
            err instanceof Error
              ? err.message
              : t("previewKeyOwnerWarning")
          );
          return null;
        }),
      ]);
      setSettings(fromConfig(res.config, localizedDefaults));
      setPreviewClientKey(previewKeyRes?.key ?? null);
    } catch (err) {
      console.error("Failed to load widget settings:", err);
      setSettings(localizedDefaults);
      setPreviewClientKey(null);
      setPreviewKeyWarning(null);
    } finally {
      setLoading(false);
    }
  }, [projectId, localizedDefaults, t]);

  useEffect(() => {
    load();
  }, [load]);

  const update = <K extends keyof WidgetSettings>(
    key: K,
    value: WidgetSettings[K]
  ) => setSettings((prev) => ({ ...prev, [key]: value }));

  // ---- Save (persists to settings.widget_appearance) ----
  const handleSave = async () => {
    if (!projectId) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await apiClient(`/api/projects/${projectId}`, {
        method: "PUT",
        body: JSON.stringify({ settings: toSettingsPayload(settings) }),
      });
      setSuccess(t("saved"));
      setPreviewKey((k) => k + 1); // reload preview so the widget re-fetches /config
      setTimeout(() => setSuccess(null), 2500);
    } catch (err) {
      console.error("Failed to save widget settings:", err);
      setError(err instanceof Error ? err.message : t("saveError"));
    } finally {
      setSaving(false);
    }
  };

  // ---- Image upload (browser → Supabase 'assets' bucket, widget-assets/<projectId>/) ----
  const uploadImage = async (kind: "avatar" | "launcher", file: File) => {
    if (!projectId) return;
    setError(null);
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setError(t("imageTypeError"));
      return;
    }
    if (file.size >= MAX_IMAGE_BYTES) {
      setError(t("imageSizeError"));
      return;
    }
    setUploading(kind);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop() || "png";
      const path = `widget-assets/${projectId}/${kind}-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("assets")
        .upload(path, file, { upsert: false, contentType: file.type });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from("assets").getPublicUrl(path);
      update(kind === "avatar" ? "avatarUrl" : "launcherIconUrl", data.publicUrl);
    } catch (err) {
      console.error("Image upload failed:", err);
      setError(t("imageUploadError"));
    } finally {
      setUploading(null);
    }
  };

  const embedCode = currentProject
    ? buildWidgetEmbedCode({
        projectId: currentProject.id,
        apiUrl: WIDGET_API_URL,
        scriptUrl: WIDGET_SCRIPT_URL,
      })
    : "";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(embedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  // Live preview uses the current local widget bundle in development and deployed assets elsewhere.
  const previewHtml = currentProject
    ? `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; padding: 20px; font-family: system-ui, -apple-system, sans-serif;
      background: linear-gradient(135deg, #f5f5f5 0%, #e5e5e5 100%); min-height: calc(100vh - 40px); }
    .sample-content { max-width: 600px; margin: 0 auto; }
    h1 { color: #333; font-size: 24px; margin-bottom: 16px; }
    p { color: #666; line-height: 1.6; }
  </style>
</head>
<body>
  <div class="sample-content">
    <h1>${t("previewSampleTitle")}</h1>
    <p>${t("previewSampleCopy")}</p>
  </div>
  ${buildWidgetEmbedCode({
    projectId: currentProject.id,
    apiUrl: WIDGET_API_URL,
    scriptUrl: WIDGET_PREVIEW_SCRIPT_URL,
    clientKey: previewClientKey,
  })}
</body>
</html>`
    : "";

  if (projectLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-2 text-muted-foreground">
          <RefreshCw className="h-5 w-5 animate-spin" />
          <span>{t("loading")}</span>
        </div>
      </div>
    );
  }

  if (!currentProject) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">{t("noAgent")}</p>
          <Button asChild>
            <Link href="/projects?create=true">{t("createAgent")}</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Code className="h-6 w-6" />
            {t("widgetTitle")}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t("widgetSubtitle")}
          </p>
        </div>
        <Badge variant="outline" className="text-xs">
          {t("agentLabel", { name: currentProject.name })}
        </Badge>
      </div>

      {currentProject.knowledgeCount === 0 && (
        <div className="flex items-center gap-3 p-4 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <p className="text-sm">
            {t("noKnowledgeWarning")}
          </p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Live Preview */}
        <Card className="p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold flex items-center gap-2">
              <Eye className="h-4 w-4" />
              {t("livePreview")}
            </h2>
            <div className="flex items-center gap-2">
              <div className="flex items-center border rounded-lg overflow-hidden">
                <button
                  onClick={() => setViewMode("desktop")}
                  className={cn(
                    "px-3 py-1.5 text-sm flex items-center gap-1.5 transition-colors",
                    viewMode === "desktop"
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  )}
                >
                  <Monitor className="h-4 w-4" />
                  {t("desktop")}
                </button>
                <button
                  onClick={() => setViewMode("mobile")}
                  className={cn(
                    "px-3 py-1.5 text-sm flex items-center gap-1.5 transition-colors",
                    viewMode === "mobile"
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  )}
                >
                  <Smartphone className="h-4 w-4" />
                  {t("mobile")}
                </button>
              </div>
              <Button variant="outline" size="sm" onClick={() => setPreviewKey((k) => k + 1)}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div
            className={cn(
              "bg-muted rounded-lg overflow-hidden mx-auto transition-all duration-300",
              viewMode === "desktop" ? "w-full aspect-video" : "w-[375px] h-[667px]"
            )}
          >
            <iframe
              key={`${previewKey}-${previewClientKey ?? "no-key"}`}
              srcDoc={previewHtml}
              className="w-full h-full border-0"
              title={t("previewTitle")}
              sandbox="allow-scripts"
            />
          </div>
          <p className="text-sm text-muted-foreground mt-4 text-center">
            {t("previewSavedHelp")}
          </p>
          {previewKeyWarning && (
            <p className="text-xs text-amber-700 mt-2 text-center dark:text-amber-300">
              {previewKeyWarning}
            </p>
          )}
        </Card>

        {/* Customization (Content / Style) */}
        <Card className="p-6">
          <Tabs defaultValue="style" className="space-y-4">
            <TabsList className="w-full">
              <TabsTrigger value="style" className="flex-1">{t("style")}</TabsTrigger>
              <TabsTrigger value="content" className="flex-1">{t("content")}</TabsTrigger>
            </TabsList>

            {/* ---------- Style ---------- */}
            <TabsContent value="style" className="space-y-5">
              <div className="space-y-2">
                <Label>{t("theme")}</Label>
                <div className="flex gap-2">
                  {(["light", "dark", "auto"] as const).map((theme) => (
                    <Button
                      key={theme}
                      type="button"
                      variant={settings.theme === theme ? "default" : "outline"}
                      size="sm"
                      className="flex-1"
                      onClick={() => update("theme", theme)}
                    >
                      {t(`themes.${theme}`)}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="position">{t("position")}</Label>
                <select
                  id="position"
                  value={settings.position}
                  onChange={(e) => update("position", e.target.value as Position)}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="bottom-right">{t("positions.bottomRight")}</option>
                  <option value="bottom-left">{t("positions.bottomLeft")}</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="primaryColor">{t("primaryColor")}</Label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    id="primaryColor"
                    value={settings.primaryColor}
                    onChange={(e) => update("primaryColor", e.target.value)}
                    className="w-12 h-10 p-1 border border-input rounded-md cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={settings.primaryColor}
                    onChange={(e) => update("primaryColor", e.target.value)}
                    placeholder="#0a0a0a"
                    className="flex-1 font-mono text-sm"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between gap-4">
                <div>
                  <Label className="text-sm">{t("usePrimaryForLauncher")}</Label>
                  <p className="text-xs text-muted-foreground">
                    {t("usePrimaryForLauncherHelp")}
                  </p>
                </div>
                <Switch
                  checked={settings.usePrimaryForHeader}
                  onCheckedChange={(v) => update("usePrimaryForHeader", v)}
                />
              </div>

              {!settings.usePrimaryForHeader && (
                <div className="space-y-2">
                  <Label htmlFor="bubbleColor">{t("launcherBubbleColor")}</Label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      id="bubbleColor"
                      value={settings.bubbleColor || settings.primaryColor}
                      onChange={(e) => update("bubbleColor", e.target.value)}
                      className="w-12 h-10 p-1 border border-input rounded-md cursor-pointer"
                    />
                    <Input
                      type="text"
                      value={settings.bubbleColor}
                      onChange={(e) => update("bubbleColor", e.target.value)}
                      placeholder="#0a0a0a"
                      className="flex-1 font-mono text-sm"
                    />
                  </div>
                </div>
              )}

              <ImageUpload
                label={t("avatar")}
                url={settings.avatarUrl}
                uploading={uploading === "avatar"}
                onPick={(f) => uploadImage("avatar", f)}
                onClear={() => update("avatarUrl", null)}
              />
              <ImageUpload
                label={t("launcherIcon")}
                url={settings.launcherIconUrl}
                uploading={uploading === "launcher"}
                onPick={(f) => uploadImage("launcher", f)}
                onClear={() => update("launcherIconUrl", null)}
              />

              <div className="flex items-center justify-between gap-4">
                <div>
                  <Label className="text-sm">{t("removePoweredBy")}</Label>
                  <p className="text-xs text-muted-foreground">{t("whiteLabelHelp")}</p>
                </div>
                <Switch
                  checked={settings.hideBranding}
                  onCheckedChange={(v) => update("hideBranding", v)}
                />
              </div>
            </TabsContent>

            {/* ---------- Content ---------- */}
            <TabsContent value="content" className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="placeholder">{t("messagePlaceholder")}</Label>
                <Input
                  id="placeholder"
                  value={settings.placeholder}
                  onChange={(e) => update("placeholder", e.target.value)}
                  placeholder={t("defaultPlaceholder")}
                />
              </div>

              <div className="space-y-2">
                <Label>{t("conversationStarters")}</Label>
                {settings.starters.map((s, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input
                      value={s}
                      onChange={(e) => {
                        const next = [...settings.starters];
                        next[i] = e.target.value;
                        update("starters", next);
                      }}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        update("starters", settings.starters.filter((_, j) => j !== i))
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                {settings.starters.length < 6 && (
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder={t("addStarterPlaceholder")}
                      value={newStarter}
                      onChange={(e) => setNewStarter(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && newStarter.trim()) {
                          e.preventDefault();
                          update("starters", [...settings.starters, newStarter.trim()]);
                          setNewStarter("");
                        }
                      }}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!newStarter.trim()}
                      onClick={() => {
                        update("starters", [...settings.starters, newStarter.trim()]);
                        setNewStarter("");
                      }}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>

              <div className="space-y-2 rounded-md border p-3">
                <div className="flex items-center justify-between gap-4">
                  <Label className="text-sm">{t("noticeBanner")}</Label>
                  <Switch
                    checked={settings.noticeEnabled}
                    onCheckedChange={(v) => update("noticeEnabled", v)}
                  />
                </div>
                {settings.noticeEnabled && (
                  <Textarea
                    rows={2}
                    value={settings.noticeText}
                    onChange={(e) => update("noticeText", e.target.value)}
                    placeholder={t("noticePlaceholder")}
                  />
                )}
              </div>

              <div className="space-y-2 rounded-md border p-3">
                <Label className="text-sm">{t("footer")}</Label>
                <Input
                  value={settings.footerText}
                  onChange={(e) => update("footerText", e.target.value)}
                  placeholder={t("footerTextPlaceholder")}
                />
                <Input
                  value={settings.footerUrl}
                  onChange={(e) => update("footerUrl", e.target.value)}
                  placeholder={t("footerUrlPlaceholder")}
                />
              </div>

              <div className="flex items-center justify-between gap-4">
                <Label className="text-sm">{t("messageFeedback")}</Label>
                <Switch
                  checked={settings.feedbackEnabled}
                  onCheckedChange={(v) => update("feedbackEnabled", v)}
                />
              </div>
              <div className="flex items-center justify-between gap-4">
                <Label className="text-sm">{t("copyMessageButton")}</Label>
                <Switch
                  checked={settings.copyEnabled}
                  onCheckedChange={(v) => update("copyEnabled", v)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="locale">{t("defaultLanguage")}</Label>
                <Input
                  id="locale"
                  value={settings.localeDefault}
                  onChange={(e) => update("localeDefault", e.target.value)}
                  placeholder="en"
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  {t("defaultLanguageHelp")}
                </p>
              </div>
            </TabsContent>
          </Tabs>

          {/* ---- Channels ---- */}
          <div className="space-y-4 mt-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">{t("channelsTitle")}</h3>
              <button
                type="button"
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                onClick={() =>
                  update("channels", [
                    ...settings.channels,
                    { type: "whatsapp", url: "", label: "", iconUrl: "" },
                  ])
                }
              >
                <Plus className="h-3 w-3" /> {t("addChannel")}
              </button>
            </div>
            {settings.channels.length === 0 && (
              <p className="text-xs text-muted-foreground">
                {t("noChannels")}
              </p>
            )}
            {settings.channels.map((ch, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2 rounded-md border border-input p-3"
              >
                <div className="flex-1 space-y-2">
                  <div className="flex gap-2">
                    <select
                      value={ch.type}
                      onChange={(e) => {
                        const next = [...settings.channels];
                        next[idx] = { ...ch, type: e.target.value };
                        update("channels", next);
                      }}
                      className="w-32 px-2 py-1.5 border border-input rounded-md bg-background text-sm"
                    >
                      <option value="whatsapp">WhatsApp</option>
                      <option value="instagram">Instagram</option>
                      <option value="facebook">Facebook</option>
                      <option value="email">Email</option>
                      <option value="phone">Phone</option>
                      <option value="custom">Custom</option>
                    </select>
                    <Input
                      value={ch.url}
                      placeholder={
                        ch.type === "whatsapp"
                          ? "https://wa.me/15550100042"
                          : ch.type === "email"
                            ? "mailto:hi@acme.com"
                            : ch.type === "phone"
                              ? "tel:+15550100042"
                              : "https://..."
                      }
                      onChange={(e) => {
                        const next = [...settings.channels];
                        next[idx] = { ...ch, url: e.target.value };
                        update("channels", next);
                      }}
                      className="flex-1"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={ch.label}
                      placeholder={t("labelOptional")}
                      onChange={(e) => {
                        const next = [...settings.channels];
                        next[idx] = { ...ch, label: e.target.value };
                        update("channels", next);
                      }}
                      className="flex-1"
                    />
                    {ch.type === "custom" && (
                      <Input
                        value={ch.iconUrl}
                        placeholder={t("iconUrlOptional")}
                        onChange={(e) => {
                          const next = [...settings.channels];
                          next[idx] = { ...ch, iconUrl: e.target.value };
                          update("channels", next);
                        }}
                        className="flex-1"
                      />
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-0.5">
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={() => {
                      const next = [...settings.channels];
                      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
                      update("channels", next);
                    }}
                    className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
                    aria-label={t("moveChannelUp")}
                  >
                    <ChevronUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={idx === settings.channels.length - 1}
                    onClick={() => {
                      const next = [...settings.channels];
                      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
                      update("channels", next);
                    }}
                    className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
                    aria-label={t("moveChannelDown")}
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const next = settings.channels.filter((_, i) => i !== idx);
                    update("channels", next);
                  }}
                  className="p-1.5 text-muted-foreground hover:text-destructive"
                  aria-label={t("removeChannel")}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Save bar */}
          <div className="mt-6 flex items-center justify-between gap-3 border-t pt-4">
            <div className="text-sm">
              {error && <span className="text-destructive">{error}</span>}
              {success && (
                <span className="flex items-center gap-1 text-green-600">
                  <Check className="h-4 w-4" />
                  {success}
                </span>
              )}
            </div>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              {t("saveChanges")}
            </Button>
          </div>
        </Card>
      </div>

      {/* Embed Code */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold flex items-center gap-2">
            <Code className="h-4 w-4" />
            {t("yourEmbedCode")}
          </h2>
          <Button variant="outline" size="sm" onClick={handleCopy} className="min-w-[100px]">
            {copied ? (
              <>
                <Check className="h-4 w-4 me-2" />
                {t("copiedBang")}
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 me-2" />
                {t("copyCode")}
              </>
            )}
          </Button>
        </div>
        <div className="relative">
          <pre className="p-4 bg-zinc-950 text-zinc-100 rounded-lg overflow-x-auto text-sm font-mono">
            <code>{embedCode}</code>
          </pre>
        </div>
        <p className="text-sm text-muted-foreground mt-4">
          {t("embedInstallHelp")}
        </p>
      </Card>

      {/* Integration Guides */}
      <Card className="p-6">
        <h2 className="font-semibold mb-4 flex items-center gap-2">
          <ExternalLink className="h-4 w-4" />
          {t("integrationGuides")}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { name: "HTML / Static Sites", status: t("available") },
            { name: "WordPress", status: t("soon") },
            { name: "Shopify", status: t("soon") },
            { name: "React / Next.js", status: t("soon") },
          ].map((g) => (
            <div
              key={g.name}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg border",
                g.status === t("soon") && "opacity-60"
              )}
            >
              <span
                className={cn(
                  "h-2 w-2 rounded-full",
                  g.status === t("available") ? "bg-green-500" : "bg-muted"
                )}
              />
              <span className="text-sm font-medium">{g.name}</span>
              <Badge variant="outline" className="text-xs ms-auto">
                {g.status}
              </Badge>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

interface ImageUploadProps {
  label: string;
  url: string | null;
  uploading: boolean;
  onPick: (file: File) => void;
  onClear: () => void;
}

function ImageUpload({ label, url, uploading, onPick, onClear }: ImageUploadProps) {
  const t = useTranslations("dashboard.pages.embed");
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={label} className="h-full w-full object-cover" />
        ) : (
          <Upload className="h-4 w-4 text-muted-foreground" />
        )}
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{t("imageHelp")}</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onPick(f);
          e.target.value = "";
        }}
      />
      {url ? (
        <Button variant="ghost" size="icon" onClick={onClear} disabled={uploading}>
          <Trash2 className="h-4 w-4" />
        </Button>
      ) : (
        <Button
          variant="outline"
          size="sm"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className="gap-1"
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {t("upload")}
        </Button>
      )}
    </div>
  );
}
