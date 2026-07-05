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
import { useCallback, useEffect, useRef, useState } from "react";

import { useProject } from "@/contexts/project-context";
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
function fromConfig(cfg: EmbedConfigResponse["config"]): WidgetSettings {
  if (!cfg) return DEFAULTS;
  return {
    primaryColor: cfg.primaryColor ?? DEFAULTS.primaryColor,
    theme: cfg.theme ?? DEFAULTS.theme,
    position: cfg.position ?? DEFAULTS.position,
    bubbleColor: cfg.bubbleColor ?? "",
    usePrimaryForHeader: cfg.usePrimaryForHeader ?? DEFAULTS.usePrimaryForHeader,
    avatarUrl: cfg.avatarUrl ?? null,
    launcherIconUrl: cfg.launcherIconUrl ?? null,
    hideBranding: cfg.hideBranding ?? DEFAULTS.hideBranding,
    placeholder: cfg.placeholder ?? DEFAULTS.placeholder,
    starters: cfg.starters ?? [],
    noticeEnabled: cfg.notice?.enabled ?? false,
    noticeText: cfg.notice?.text ?? "",
    footerText: cfg.footer?.text ?? "",
    footerUrl: cfg.footer?.url ?? "",
    feedbackEnabled: cfg.feedbackEnabled ?? DEFAULTS.feedbackEnabled,
    copyEnabled: cfg.copyEnabled ?? DEFAULTS.copyEnabled,
    localeDefault: cfg.localeDefault ?? DEFAULTS.localeDefault,
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
  const { currentProject, isLoading: projectLoading } = useProject();
  const [settings, setSettings] = useState<WidgetSettings>(DEFAULTS);
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
              : "A project owner must create the widget preview key."
          );
          return null;
        }),
      ]);
      setSettings(fromConfig(res.config));
      setPreviewClientKey(previewKeyRes?.key ?? null);
    } catch (err) {
      console.error("Failed to load widget settings:", err);
      setSettings(DEFAULTS);
      setPreviewClientKey(null);
      setPreviewKeyWarning(null);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

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
      setSuccess("Saved");
      setPreviewKey((k) => k + 1); // reload preview so the widget re-fetches /config
      setTimeout(() => setSuccess(null), 2500);
    } catch (err) {
      console.error("Failed to save widget settings:", err);
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  // ---- Image upload (browser → Supabase 'assets' bucket, widget-assets/<projectId>/) ----
  const uploadImage = async (kind: "avatar" | "launcher", file: File) => {
    if (!projectId) return;
    setError(null);
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setError("Image must be a PNG, JPG, WebP, or GIF file.");
      return;
    }
    if (file.size >= MAX_IMAGE_BYTES) {
      setError("Image must be smaller than 2 MB.");
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
      setError("Image upload failed. Try a smaller image or check permissions.");
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
    <h1>Your Website</h1>
    <p>This is a live preview with your actual chatbot. Click the chat bubble to test it!</p>
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
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  if (!currentProject) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">No agent found.</p>
          <Button asChild>
            <a href="/projects?create=true">Create Agent</a>
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
            Widget
          </h1>
          <p className="text-muted-foreground mt-1">
            Customize your chat widget and embed it on any website
          </p>
        </div>
        <Badge variant="outline" className="text-xs">
          Agent: {currentProject.name}
        </Badge>
      </div>

      {currentProject.knowledgeCount === 0 && (
        <div className="flex items-center gap-3 p-4 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <p className="text-sm">
            Your agent has no knowledge base. Add content before embedding, or the widget
            won&apos;t be able to answer questions.
          </p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Live Preview */}
        <Card className="p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Live Preview
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
                  Desktop
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
                  Mobile
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
              title="Widget Preview"
              sandbox="allow-scripts"
            />
          </div>
          <p className="text-sm text-muted-foreground mt-4 text-center">
            Saved appearance changes are loaded from your agent&apos;s widget configuration.
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
              <TabsTrigger value="style" className="flex-1">Style</TabsTrigger>
              <TabsTrigger value="content" className="flex-1">Content</TabsTrigger>
            </TabsList>

            {/* ---------- Style ---------- */}
            <TabsContent value="style" className="space-y-5">
              <div className="space-y-2">
                <Label>Theme</Label>
                <div className="flex gap-2">
                  {(["light", "dark", "auto"] as const).map((t) => (
                    <Button
                      key={t}
                      type="button"
                      variant={settings.theme === t ? "default" : "outline"}
                      size="sm"
                      className="flex-1 capitalize"
                      onClick={() => update("theme", t)}
                    >
                      {t}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="position">Position</Label>
                <select
                  id="position"
                  value={settings.position}
                  onChange={(e) => update("position", e.target.value as Position)}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="bottom-right">Bottom Right</option>
                  <option value="bottom-left">Bottom Left</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="primaryColor">Header / primary color</Label>
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
                  <Label className="text-sm">Use primary color for launcher</Label>
                  <p className="text-xs text-muted-foreground">
                    Off lets you set a separate bubble color
                  </p>
                </div>
                <Switch
                  checked={settings.usePrimaryForHeader}
                  onCheckedChange={(v) => update("usePrimaryForHeader", v)}
                />
              </div>

              {!settings.usePrimaryForHeader && (
                <div className="space-y-2">
                  <Label htmlFor="bubbleColor">Launcher bubble color</Label>
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
                label="Avatar"
                url={settings.avatarUrl}
                uploading={uploading === "avatar"}
                onPick={(f) => uploadImage("avatar", f)}
                onClear={() => update("avatarUrl", null)}
              />
              <ImageUpload
                label="Launcher icon"
                url={settings.launcherIconUrl}
                uploading={uploading === "launcher"}
                onPick={(f) => uploadImage("launcher", f)}
                onClear={() => update("launcherIconUrl", null)}
              />

              <div className="flex items-center justify-between gap-4">
                <div>
                  <Label className="text-sm">Remove &ldquo;Powered by&rdquo;</Label>
                  <p className="text-xs text-muted-foreground">White-label the widget</p>
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
                <Label htmlFor="placeholder">Message placeholder</Label>
                <Input
                  id="placeholder"
                  value={settings.placeholder}
                  onChange={(e) => update("placeholder", e.target.value)}
                  placeholder="Type a message..."
                />
              </div>

              <div className="space-y-2">
                <Label>Conversation starters</Label>
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
                      placeholder="Add a starter…"
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
                  <Label className="text-sm">Notice banner</Label>
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
                    placeholder="e.g. Holiday hours: replies may be delayed"
                  />
                )}
              </div>

              <div className="space-y-2 rounded-md border p-3">
                <Label className="text-sm">Footer</Label>
                <Input
                  value={settings.footerText}
                  onChange={(e) => update("footerText", e.target.value)}
                  placeholder="Footer text (e.g. Privacy Policy)"
                />
                <Input
                  value={settings.footerUrl}
                  onChange={(e) => update("footerUrl", e.target.value)}
                  placeholder="https://… (optional link)"
                />
              </div>

              <div className="flex items-center justify-between gap-4">
                <Label className="text-sm">Message feedback (👍 / 👎)</Label>
                <Switch
                  checked={settings.feedbackEnabled}
                  onCheckedChange={(v) => update("feedbackEnabled", v)}
                />
              </div>
              <div className="flex items-center justify-between gap-4">
                <Label className="text-sm">Copy-message button</Label>
                <Switch
                  checked={settings.copyEnabled}
                  onCheckedChange={(v) => update("copyEnabled", v)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="locale">Default language</Label>
                <Input
                  id="locale"
                  value={settings.localeDefault}
                  onChange={(e) => update("localeDefault", e.target.value)}
                  placeholder="en"
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Falls back to this when the visitor&apos;s browser language isn&apos;t available.
                </p>
              </div>
            </TabsContent>
          </Tabs>

          {/* ---- Channels ---- */}
          <div className="space-y-4 mt-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">Channels on the widget</h3>
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
                <Plus className="h-3 w-3" /> Add channel
              </button>
            </div>
            {settings.channels.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No channels configured. Add one to show contact buttons on the widget.
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
                      placeholder="Label (optional)"
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
                        placeholder="Icon URL (optional)"
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
                    aria-label="Move channel up"
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
                    aria-label="Move channel down"
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
                  aria-label="Remove channel"
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
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save changes
            </Button>
          </div>
        </Card>
      </div>

      {/* Embed Code */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold flex items-center gap-2">
            <Code className="h-4 w-4" />
            Your Embed Code
          </h2>
          <Button variant="outline" size="sm" onClick={handleCopy} className="min-w-[100px]">
            {copied ? (
              <>
                <Check className="h-4 w-4 mr-2" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-2" />
                Copy Code
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
          Paste this just before the closing{" "}
          <code className="text-xs bg-muted px-1 py-0.5 rounded">&lt;/body&gt;</code> tag.
          Appearance is read from your saved settings, so future changes do not require replacing
          this snippet.
        </p>
      </Card>

      {/* Integration Guides */}
      <Card className="p-6">
        <h2 className="font-semibold mb-4 flex items-center gap-2">
          <ExternalLink className="h-4 w-4" />
          Integration Guides
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { name: "HTML / Static Sites", status: "Available" },
            { name: "WordPress", status: "Soon" },
            { name: "Shopify", status: "Soon" },
            { name: "React / Next.js", status: "Soon" },
          ].map((g) => (
            <div
              key={g.name}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg border",
                g.status === "Soon" && "opacity-60"
              )}
            >
              <span
                className={cn(
                  "h-2 w-2 rounded-full",
                  g.status === "Available" ? "bg-green-500" : "bg-muted"
                )}
              />
              <span className="text-sm font-medium">{g.name}</span>
              <Badge variant="outline" className="text-xs ml-auto">
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
        <p className="text-xs text-muted-foreground">PNG, JPG, WebP or GIF, max 2 MB</p>
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
          Upload
        </Button>
      )}
    </div>
  );
}
