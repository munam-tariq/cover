"use client";

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Skeleton,
  Switch,
  Textarea,
  cn,
} from "@chatbot/ui";
import {
  AlertCircle,
  Check,
  Copy,
  ExternalLink,
  Loader2,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { type Project } from "@/contexts/project-context";
import { apiClient } from "@/lib/api-client";
import { createClient } from "@/lib/supabase/client";

interface PromptCard {
  title: string;
  description: string;
}

interface PublicPageConfig {
  enabled: boolean;
  businessName: string;
  logoUrl: string | null;
  pageTitle: string;
  headline: string;
  subtext: string;
  theme: "light" | "dark" | "system";
  accentColor: string;
  chipsEnabled: boolean;
  suggestionChips: string[];
  cardsEnabled: boolean;
  promptCards: PromptCard[];
  poweredBy: boolean;
}

interface PublicPageResponse {
  projectId: string;
  plan: string;
  slug: string;
  accentColors: string[];
  config: PublicPageConfig;
}

const DEFAULT_ACCENTS = [
  "#0d9488",
  "#2563eb",
  "#7c3aed",
  "#db2777",
  "#ea580c",
  "#0f172a",
];

const DEFAULT_CONFIG: PublicPageConfig = {
  enabled: false,
  businessName: "",
  logoUrl: null,
  pageTitle: "",
  headline: "",
  subtext: "",
  theme: "light",
  accentColor: DEFAULT_ACCENTS[0],
  chipsEnabled: true,
  suggestionChips: [],
  cardsEnabled: true,
  promptCards: [],
  poweredBy: true,
};

function slugify(input: string): string {
  return (input || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function monogram(name: string): string {
  const words = (name || "?").trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

/** Map camelCase editor state to the snake_case API payload. */
function toPayload(c: PublicPageConfig, slug: string) {
  return {
    slug,
    enabled: c.enabled,
    business_name: c.businessName,
    logo_url: c.logoUrl,
    page_title: c.pageTitle,
    headline: c.headline,
    subtext: c.subtext,
    theme: c.theme,
    accent_color: c.accentColor,
    chips_enabled: c.chipsEnabled,
    suggestion_chips: c.suggestionChips,
    cards_enabled: c.cardsEnabled,
    prompt_cards: c.promptCards,
    powered_by_badge: c.poweredBy,
  };
}

interface PublicPageTabProps {
  project: Project;
}

export function PublicPageTab({ project }: PublicPageTabProps) {
  const [config, setConfig] = useState<PublicPageConfig>(DEFAULT_CONFIG);
  const [slug, setSlug] = useState("");
  const [accents, setAccents] = useState<string[]>(DEFAULT_ACCENTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [newChip, setNewChip] = useState("");

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // The public page lives on the same Next app, so its origin == the dashboard origin.
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  // An empty slug is a valid choice: the URL becomes the bare /c/<uuid>.
  const effectiveSlug = slugify(slug);
  const handle = `${effectiveSlug ? `${effectiveSlug}-` : ""}${project.id}`;
  const publicUrl = `${origin}/c/${handle}`;
  const previewUrl = `${origin}/c/${handle}?preview=1`;

  // ---- Load ----
  const fetchConfig = useCallback(async () => {
    if (!project) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient<PublicPageResponse>(
        `/api/projects/${project.id}/public-page`
      );
      setConfig({ ...DEFAULT_CONFIG, ...res.config });
      setSlug(res.slug || "");
      setAccents(res.accentColors?.length ? res.accentColors : DEFAULT_ACCENTS);
    } catch (err) {
      console.error("Failed to load public page settings:", err);
      setError("Failed to load settings.");
    } finally {
      setLoading(false);
    }
  }, [project]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  // ---- Live preview: push draft config into the iframe ----
  const postDraft = useCallback(() => {
    iframeRef.current?.contentWindow?.postMessage(
      {
        type: "public-page-preview-config",
        config: { ...config, slug: effectiveSlug },
      },
      origin || "*"
    );
  }, [config, effectiveSlug, origin]);

  useEffect(() => {
    postDraft();
  }, [postDraft]);

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (origin && e.origin !== origin) return;
      if (e.data?.type === "public-page-preview-ready") postDraft();
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [postDraft, origin]);

  // ---- Save ----
  const handleSave = async () => {
    if (!project) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await apiClient<PublicPageResponse>(
        `/api/projects/${project.id}/public-page`,
        { method: "PUT", body: JSON.stringify(toPayload(config, slug)) }
      );
      setConfig({ ...DEFAULT_CONFIG, ...res.config });
      setSlug(res.slug || "");
      setSuccess("Saved");
      setTimeout(() => setSuccess(null), 2500);
    } catch (err) {
      console.error("Failed to save public page settings:", err);
      setError("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // ---- Logo upload (browser -> Supabase Storage 'assets' bucket) ----
  // Storage RLS only accepts images < 2 MB under public-page-logos/<projectId>/ for projects
  // the user owns; validate client-side first for a friendly error.
  const MAX_LOGO_BYTES = 2 * 1024 * 1024;
  const handleLogoUpload = async (file: File) => {
    setError(null);
    if (!file.type.startsWith("image/")) {
      setError("Logo must be an image file (PNG, JPG, SVG, …).");
      return;
    }
    if (file.size >= MAX_LOGO_BYTES) {
      setError("Logo must be smaller than 2 MB.");
      return;
    }
    setUploading(true);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop() || "png";
      const path = `public-page-logos/${project.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("assets")
        .upload(path, file, { upsert: false, contentType: file.type });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from("assets").getPublicUrl(path);
      update("logoUrl", data.publicUrl);
    } catch (err) {
      console.error("Logo upload failed:", err);
      setError(
        "Logo upload failed. Try a smaller image, or check storage permissions."
      );
    } finally {
      setUploading(false);
    }
  };

  const update = <K extends keyof PublicPageConfig>(
    key: K,
    value: PublicPageConfig[K]
  ) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard may be unavailable */
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* ----------------------------- Config column ----------------------------- */}
      <div className="space-y-6">
        {/* Enable + URL */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  Public page
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-medium",
                      config.enabled
                        ? "bg-green-500/15 text-green-700 dark:text-green-400"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {config.enabled ? "Live" : "Off"}
                  </span>
                </CardTitle>
                <CardDescription>
                  A shareable, hosted home for this agent — no website required.
                </CardDescription>
              </div>
              <Switch
                checked={config.enabled}
                onCheckedChange={(v) => update("enabled", v)}
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted/30 flex items-center gap-2 rounded-md border px-3 py-2">
              <span className="text-muted-foreground truncate font-mono text-sm">
                {publicUrl}
              </span>
              <div className="ml-auto flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={copyUrl}
                  className="gap-1"
                >
                  {copied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                  {copied ? "Copied" : "Copy"}
                </Button>
                <Button variant="ghost" size="sm" asChild className="gap-1">
                  <a href={publicUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" />
                    Open
                  </a>
                </Button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pp-slug">URL slug</Label>
              <Input
                id="pp-slug"
                value={slug}
                placeholder={slugify(config.businessName) || "your-business"}
                onChange={(e) => setSlug(slugify(e.target.value))}
              />
              <p className="text-muted-foreground text-xs">
                Cosmetic label — the URL stays unique via the agent ID, so any
                name is fine.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Branding */}
        <Card>
          <CardHeader>
            <CardTitle>Branding</CardTitle>
            <CardDescription>How your agent introduces itself.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div
                className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl text-lg font-semibold text-white"
                style={{ backgroundColor: config.accentColor }}
              >
                {config.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={config.logoUrl}
                    alt="Logo"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  monogram(config.businessName)
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Logo</p>
                <p className="text-muted-foreground text-xs">
                  Defaults to a monogram. Upload a custom image anytime.
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleLogoUpload(f);
                  e.target.value = "";
                }}
              />
              <Button
                variant="outline"
                size="sm"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
                className="gap-1"
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                Upload
              </Button>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pp-business">Business name</Label>
              <Input
                id="pp-business"
                value={config.businessName}
                onChange={(e) => update("businessName", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="pp-title">Page title</Label>
                <span className="text-muted-foreground text-xs">
                  Browser tab
                </span>
              </div>
              <Input
                id="pp-title"
                value={config.pageTitle}
                onChange={(e) => update("pageTitle", e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Welcome screen */}
        <Card>
          <CardHeader>
            <CardTitle>Welcome screen</CardTitle>
            <CardDescription>
              The greeting visitors see before they ask anything.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="pp-headline">Headline</Label>
              <Input
                id="pp-headline"
                value={config.headline}
                onChange={(e) => update("headline", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pp-subtext">Subtext</Label>
              <Textarea
                id="pp-subtext"
                rows={2}
                value={config.subtext}
                onChange={(e) => update("subtext", e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Appearance */}
        <Card>
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
            <CardDescription>
              Theme and accent color applied across the page.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Theme</Label>
              <div className="flex gap-2">
                {(["light", "dark"] as const).map((t) => (
                  <Button
                    key={t}
                    type="button"
                    variant={config.theme === t ? "default" : "outline"}
                    size="sm"
                    className="capitalize"
                    onClick={() => update("theme", t)}
                  >
                    {t}
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Accent color</Label>
              <div className="flex flex-wrap gap-2">
                {accents.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-label={c}
                    onClick={() => update("accentColor", c)}
                    className={cn(
                      "h-8 w-8 rounded-full border-2 transition",
                      config.accentColor.toLowerCase() === c.toLowerCase()
                        ? "border-foreground scale-110"
                        : "border-transparent"
                    )}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Suggestion chips */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle>Suggestion chips</CardTitle>
                <CardDescription>
                  Quick-tap prompts under the input.
                </CardDescription>
              </div>
              <Switch
                checked={config.chipsEnabled}
                onCheckedChange={(v) => update("chipsEnabled", v)}
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {config.suggestionChips.map((chip, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  value={chip}
                  onChange={(e) => {
                    const next = [...config.suggestionChips];
                    next[i] = e.target.value;
                    update("suggestionChips", next);
                  }}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() =>
                    update(
                      "suggestionChips",
                      config.suggestionChips.filter((_, j) => j !== i)
                    )
                  }
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            {config.suggestionChips.length < 8 && (
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Add a suggestion…"
                  value={newChip}
                  onChange={(e) => setNewChip(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newChip.trim()) {
                      e.preventDefault();
                      update("suggestionChips", [
                        ...config.suggestionChips,
                        newChip.trim(),
                      ]);
                      setNewChip("");
                    }
                  }}
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  disabled={!newChip.trim()}
                  onClick={() => {
                    update("suggestionChips", [
                      ...config.suggestionChips,
                      newChip.trim(),
                    ]);
                    setNewChip("");
                  }}
                >
                  <Plus className="h-4 w-4" />
                  Add
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Prompt cards */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle>Prompt cards</CardTitle>
                <CardDescription>
                  Titled topic cards shown on the welcome screen.
                </CardDescription>
              </div>
              <Switch
                checked={config.cardsEnabled}
                onCheckedChange={(v) => update("cardsEnabled", v)}
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {config.promptCards.map((card, i) => (
              <div key={i} className="space-y-2 rounded-md border p-3">
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Card title"
                    value={card.title}
                    onChange={(e) => {
                      const next = [...config.promptCards];
                      next[i] = { ...next[i], title: e.target.value };
                      update("promptCards", next);
                    }}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      update(
                        "promptCards",
                        config.promptCards.filter((_, j) => j !== i)
                      )
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <Textarea
                  placeholder="Short description"
                  rows={2}
                  value={card.description}
                  onChange={(e) => {
                    const next = [...config.promptCards];
                    next[i] = { ...next[i], description: e.target.value };
                    update("promptCards", next);
                  }}
                />
              </div>
            ))}
            {config.promptCards.length < 6 && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1"
                onClick={() =>
                  update("promptCards", [
                    ...config.promptCards,
                    { title: "", description: "" },
                  ])
                }
              >
                <Plus className="h-4 w-4" />
                Add card
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Powered by */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle>&ldquo;Powered by FrontFace&rdquo; badge</CardTitle>
                <CardDescription>Shown in the page footer.</CardDescription>
              </div>
              <Switch
                checked={config.poweredBy}
                onCheckedChange={(v) => update("poweredBy", v)}
              />
            </div>
          </CardHeader>
        </Card>

        {/* Save bar */}
        <div className="bg-background/80 sticky bottom-0 flex items-center justify-between gap-4 py-3 backdrop-blur">
          <div className="text-sm">
            {error && (
              <span className="text-destructive flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {error}
              </span>
            )}
            {success && (
              <span className="flex items-center gap-1 text-green-600">
                <Check className="h-4 w-4" />
                {success}
              </span>
            )}
          </div>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save changes
          </Button>
        </div>
      </div>

      {/* ----------------------------- Live preview ----------------------------- */}
      <div className="hidden lg:block">
        <div className="sticky top-6 space-y-2">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm font-medium">
              <span className="h-2 w-2 rounded-full bg-blue-500" />
              Live preview
            </span>
            <span className="text-muted-foreground text-xs">
              Updates as you edit
            </span>
          </div>
          <div className="overflow-hidden rounded-xl border shadow-sm">
            <iframe
              ref={iframeRef}
              key={`${project.id}`}
              src={previewUrl}
              title="Public page preview"
              className="bg-background h-[640px] w-full"
              onLoad={postDraft}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
