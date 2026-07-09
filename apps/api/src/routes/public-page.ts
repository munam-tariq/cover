/**
 * Public Page API Routes
 *
 * Powers the shareable, hosted public page for an agent (/c/<slug>-<projectId>).
 *
 * - GET  /api/public/page/:projectId         (PUBLIC, service-role, field-limited, NO anon key)
 * - GET  /api/projects/:id/public-page        (AUTH) load editor config
 * - PUT  /api/projects/:id/public-page        (AUTH) save editor config + slug
 *
 * Config is stored in projects.settings -> 'public_page' (JSONB); the cosmetic slug is the
 * non-unique projects.public_slug column. The trailing project UUID in the URL is the real key.
 */

import { Router, Request, Response } from "express";
import { z } from "zod";

import { logger } from "../lib/logger";
import { supabaseAdmin } from "../lib/supabase";
import { authMiddleware, AuthenticatedRequest } from "../middleware/auth";
import { rateLimit } from "../middleware/rate-limit";
import {
  resolveGreetingLanguage,
  projectLanguageDefault,
} from "../services/language";

import { buildLeadCaptureClientConfig } from "./embed";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isValidUUID = (id: string): boolean => UUID_REGEX.test(id);

// The 6 accent swatches from the reference design.
export const ACCENT_COLORS = [
  "#0d9488",
  "#2563eb",
  "#7c3aed",
  "#db2777",
  "#ea580c",
  "#0f172a",
];

/** Normalize an arbitrary string into a cosmetic, URL-safe slug (non-unique). */
function slugify(input: string): string {
  return (input || "")
    .toLowerCase()
    .normalize("NFKD") // decompose accents; combining marks below are non-alphanumeric and get stripped
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

interface PromptCard {
  title: string;
  description: string;
}

interface PublicPageConfig {
  enabled: boolean;
  business_name: string;
  logo_url: string | null;
  page_title: string;
  headline: string;
  subtext: string;
  theme: "light" | "dark" | "system";
  accent_color: string;
  chips_enabled: boolean;
  suggestion_chips: string[];
  cards_enabled: boolean;
  prompt_cards: PromptCard[];
  powered_by_badge: boolean;
  /** BCP-47 language for the page UI + AI (e.g. "ar-SA"); drives strings + RTL. */
  locale: string;
}

interface ProjectRow {
  id: string;
  name: string | null;
  company_name: string | null;
  public_slug: string | null;
  plan: string | null;
  settings: Record<string, unknown> | null;
}

/**
 * Build the effective public-page config for a project, filling defaults from the
 * onboarding branding (company name / logo) so the page is usable before any edits.
 */
function buildConfig(project: ProjectRow): {
  config: PublicPageConfig;
  slug: string;
} {
  const settings = (project.settings as Record<string, unknown>) || {};
  const pp = (settings.public_page as Partial<PublicPageConfig>) || {};
  const onboarding = (settings.onboarding as Record<string, unknown>) || {};

  const businessName =
    (pp.business_name && pp.business_name.trim()) ||
    project.company_name ||
    project.name ||
    "Assistant";

  const logoUrl =
    pp.logo_url !== undefined
      ? pp.logo_url
      : (onboarding.company_logo_url as string) || null;

  // NULL = never set → suggest from the business name. "" = explicitly cleared by the
  // user → keep empty so the URL is the bare /c/<uuid>.
  const slug = project.public_slug ?? slugify(businessName);

  // Localized copy defaults (project default wins). Only fills in when the user
  // hasn't authored their own headline/subtext/title.
  const lang = resolveGreetingLanguage(projectLanguageDefault(settings)).base;
  const defaults =
    lang === "ar"
      ? {
          pageTitle: `${businessName} — المساعدة`,
          headline: `مرحبًا، أنا مساعد ${businessName}.`,
          subtext: "اسألني عن خدماتنا — أنا هنا للمساعدة.",
        }
      : {
          pageTitle: `${businessName} — Help`,
          headline: `Hi, I'm the ${businessName} assistant.`,
          subtext: "Ask about our services — I'm here to help.",
        };

  const config: PublicPageConfig = {
    enabled: pp.enabled ?? false,
    business_name: businessName,
    logo_url: logoUrl,
    page_title: pp.page_title || defaults.pageTitle,
    headline: pp.headline || defaults.headline,
    subtext: pp.subtext || defaults.subtext,
    theme: pp.theme || "light",
    accent_color:
      pp.accent_color || (settings.primary_color as string) || ACCENT_COLORS[0],
    chips_enabled: pp.chips_enabled ?? true,
    suggestion_chips: Array.isArray(pp.suggestion_chips)
      ? pp.suggestion_chips
      : [],
    cards_enabled: pp.cards_enabled ?? true,
    prompt_cards: Array.isArray(pp.prompt_cards) ? pp.prompt_cards : [],
    powered_by_badge: pp.powered_by_badge ?? true,
    locale: projectLanguageDefault(settings) || "en",
  };

  return { config, slug };
}

/** Map the internal snake_case config to the camelCase shape consumed by the frontend. */
function toCamel(config: PublicPageConfig) {
  return {
    enabled: config.enabled,
    businessName: config.business_name,
    logoUrl: config.logo_url,
    pageTitle: config.page_title,
    headline: config.headline,
    subtext: config.subtext,
    theme: config.theme,
    accentColor: config.accent_color,
    chipsEnabled: config.chips_enabled,
    suggestionChips: config.suggestion_chips,
    cardsEnabled: config.cards_enabled,
    promptCards: config.prompt_cards,
    poweredBy: config.powered_by_badge,
    locale: config.locale,
  };
}

// ============================================================================
// PUBLIC router — mounted at /api/public (open CORS). No auth, no anon key.
// ============================================================================

export const publicPageRouter = Router();

/**
 * GET /api/public/page/:projectId
 * Field-limited, public config for rendering the hosted page. 404 unless enabled.
 *
 * Rate-limit key is the projectId (from the path), NOT the caller IP. This endpoint is rendered
 * server-side, so a per-IP key would be the single SSR server IP for every visitor — one busy
 * page would 404 all others. It also can't be keyed on a client-supplied `x-forwarded-for`,
 * which a direct attacker can rotate to bypass the limit. Per-project keying is unspoofable and
 * self-contained: each project gets its own generous quota and can only throttle itself.
 */
const publicProjectKey = (req: Request): string => `pp:${req.params.projectId}`;

publicPageRouter.get(
  "/page/:projectId",
  rateLimit({ windowMs: 60_000, maxRequests: 300, keyFn: publicProjectKey }),
  async (req: Request, res: Response) => {
    const { projectId } = req.params;

    if (!isValidUUID(projectId)) {
      return res
        .status(400)
        .json({ error: { code: "INVALID_ID", message: "Invalid project ID" } });
    }

    try {
      const { data: project, error } = await supabaseAdmin
        .from("projects")
        .select(
          "id, name, company_name, public_slug, plan, settings, voice_enabled, voice_greeting"
        )
        .eq("id", projectId)
        .is("deleted_at", null)
        .single();

      if (error || !project) {
        return res
          .status(404)
          .json({ error: { code: "NOT_FOUND", message: "Page not found" } });
      }

      const { config, slug } = buildConfig(project as ProjectRow);

      // Disabled pages are indistinguishable from missing ones to the public.
      if (!config.enabled) {
        return res
          .status(404)
          .json({ error: { code: "NOT_FOUND", message: "Page not found" } });
      }

      const settings = (project.settings as Record<string, unknown>) || {};
      const widgetEnabled = settings.widget_enabled !== false;

      // Feature gating for the hosted page — shape/booleans only, still field-limited.
      const lc = buildLeadCaptureClientConfig(settings);

      return res.json({
        projectId: project.id,
        slug,
        widgetEnabled,
        config: toCamel(config),
        leadCapture: {
          enabled: lc.enabled === true,
          formFields: "formFields" in lc ? lc.formFields : undefined,
          hasQualifyingQuestions:
            "hasQualifyingQuestions" in lc ? lc.hasQualifyingQuestions : false,
          captureMode: "capture_mode" in lc ? lc.capture_mode : "email_after",
        },
        voice: {
          enabled: project.voice_enabled === true,
          greeting: project.voice_greeting || undefined,
        },
      });
    } catch (err) {
      logger.error("Public page config error", err, { projectId });
      return res.status(500).json({
        error: { code: "INTERNAL_ERROR", message: "Internal server error" },
      });
    }
  }
);

/**
 * GET /api/public/conversations?projectId=<uuid>&visitorId=<token>
 *
 * Recent public-page conversations for the sidebar history. The visitorId is an
 * unguessable, client-generated token — it is the bearer for this visitor's history
 * (same trust model as the widget); transcripts are fetched separately by conversation
 * UUID. Never returns other visitors' rows. Called directly by the browser (not via SSR), so
 * the default per-IP key is the real client and rate-limits correctly.
 */
publicPageRouter.get(
  "/conversations",
  rateLimit({ windowMs: 60_000, maxRequests: 30 }),
  async (req: Request, res: Response) => {
    const projectId = req.query.projectId as string;
    const visitorId = req.query.visitorId as string;

    if (!projectId || !isValidUUID(projectId)) {
      return res
        .status(400)
        .json({ error: { code: "INVALID_ID", message: "Invalid project ID" } });
    }
    if (!visitorId || typeof visitorId !== "string" || visitorId.length > 100) {
      return res.status(400).json({
        error: { code: "INVALID_INPUT", message: "Invalid visitor ID" },
      });
    }

    try {
      const { data: project } = await supabaseAdmin
        .from("projects")
        .select("id, name, company_name, public_slug, plan, settings")
        .eq("id", projectId)
        .is("deleted_at", null)
        .single();

      // A disabled page leaks nothing, exactly like the config endpoint.
      if (!project || !buildConfig(project as ProjectRow).config.enabled) {
        return res
          .status(404)
          .json({ error: { code: "NOT_FOUND", message: "Page not found" } });
      }

      const { data: conversations, error } = await supabaseAdmin
        .from("conversations")
        .select("id, status, message_count, last_message_at, created_at")
        .eq("project_id", projectId)
        .eq("visitor_id", visitorId)
        .eq("source", "public")
        .order("last_message_at", { ascending: false, nullsFirst: false })
        .limit(20);

      if (error) {
        logger.error("Public conversations list error", error, { projectId });
        return res.status(500).json({
          error: { code: "INTERNAL_ERROR", message: "Internal server error" },
        });
      }

      const ids = (conversations || []).map((c) => c.id);

      // One batched query for snippets (first customer message per conversation) — no N+1.
      const snippets = new Map<string, string>();
      if (ids.length > 0) {
        const { data: firstMessages } = await supabaseAdmin
          .from("messages")
          .select("conversation_id, content, created_at")
          .in("conversation_id", ids)
          .eq("sender_type", "customer")
          .order("created_at", { ascending: true });
        for (const m of firstMessages || []) {
          if (!snippets.has(m.conversation_id)) {
            snippets.set(m.conversation_id, (m.content || "").slice(0, 120));
          }
        }
      }

      return res.json({
        conversations: (conversations || []).map((c) => ({
          id: c.id,
          snippet: snippets.get(c.id) || "",
          status: c.status,
          messageCount: c.message_count,
          lastMessageAt: c.last_message_at,
          createdAt: c.created_at,
        })),
      });
    } catch (err) {
      logger.error("Public conversations list error", err, { projectId });
      return res.status(500).json({
        error: { code: "INTERNAL_ERROR", message: "Internal server error" },
      });
    }
  }
);

/**
 * POST /api/public/conversations/close { projectId, visitorId, conversationId }
 *
 * Ends a visitor's current AI conversation so "New chat" truly starts fresh. Without this the
 * client clears its session but the next message reuses the latest `ai_active` row server-side
 * (getOrCreateConversation), so a reload resurrects the old thread. Only closes `ai_active`
 * rows owned by this (project, visitor) — a human-handoff conversation is left untouched.
 */
publicPageRouter.post(
  "/conversations/close",
  rateLimit({ windowMs: 60_000, maxRequests: 30 }),
  async (req: Request, res: Response) => {
    const { projectId, visitorId, conversationId } = req.body || {};

    if (!projectId || !isValidUUID(projectId) || !isValidUUID(conversationId)) {
      return res
        .status(400)
        .json({ error: { code: "INVALID_ID", message: "Invalid id" } });
    }
    if (!visitorId || typeof visitorId !== "string" || visitorId.length > 100) {
      return res
        .status(400)
        .json({
          error: { code: "INVALID_INPUT", message: "Invalid visitor ID" },
        });
    }

    try {
      const { error } = await supabaseAdmin
        .from("conversations")
        .update({ status: "closed" })
        .eq("id", conversationId)
        .eq("project_id", projectId)
        .eq("visitor_id", visitorId)
        .eq("source", "public")
        .eq("status", "ai_active");

      if (error) {
        logger.error("Public conversation close error", error, { projectId });
        return res.status(500).json({
          error: { code: "INTERNAL_ERROR", message: "Internal server error" },
        });
      }

      return res.json({ ok: true });
    } catch (err) {
      logger.error("Public conversation close error", err, { projectId });
      return res.status(500).json({
        error: { code: "INTERNAL_ERROR", message: "Internal server error" },
      });
    }
  }
);

// ============================================================================
// AUTHENTICATED router — mounted at /api/projects (restricted CORS).
// ============================================================================

export const publicPageSettingsRouter = Router({ mergeParams: true });

const PromptCardSchema = z.object({
  title: z.string().max(80),
  description: z.string().max(200),
});

const UpdatePublicPageSchema = z.object({
  enabled: z.boolean().optional(),
  slug: z.string().max(80).optional(),
  business_name: z.string().max(100).optional(),
  logo_url: z.string().url().max(2000).nullable().optional(),
  page_title: z.string().max(120).optional(),
  headline: z.string().max(160).optional(),
  subtext: z.string().max(400).optional(),
  theme: z.enum(["light", "dark", "system"]).optional(),
  accent_color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Invalid hex color")
    .optional(),
  chips_enabled: z.boolean().optional(),
  suggestion_chips: z.array(z.string().max(80)).max(8).optional(),
  cards_enabled: z.boolean().optional(),
  prompt_cards: z.array(PromptCardSchema).max(6).optional(),
  powered_by_badge: z.boolean().optional(),
});

async function loadOwnedProject(
  projectId: string,
  userId: string | undefined
): Promise<ProjectRow | null> {
  if (!userId) return null;
  const { data, error } = await supabaseAdmin
    .from("projects")
    .select("id, name, company_name, public_slug, plan, settings")
    .eq("id", projectId)
    .eq("user_id", userId)
    .is("deleted_at", null)
    .single();
  if (error || !data) return null;
  return data as ProjectRow;
}

/** GET /api/projects/:id/public-page — editor config */
publicPageSettingsRouter.get(
  "/:id/public-page",
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const { userId } = req as AuthenticatedRequest;
      const { id: projectId } = req.params;

      if (!isValidUUID(projectId)) {
        return res.status(400).json({
          error: { code: "INVALID_ID", message: "Invalid project ID format" },
        });
      }

      const project = await loadOwnedProject(projectId, userId);
      if (!project) {
        return res
          .status(404)
          .json({ error: { code: "NOT_FOUND", message: "Project not found" } });
      }

      const { config, slug } = buildConfig(project);
      return res.json({
        projectId: project.id,
        plan: project.plan || "free",
        slug,
        accentColors: ACCENT_COLORS,
        config: toCamel(config),
      });
    } catch (error) {
      logger.error("Error in GET /projects/:id/public-page", error);
      return res.status(500).json({
        error: { code: "INTERNAL_ERROR", message: "Internal server error" },
      });
    }
  }
);

/** PUT /api/projects/:id/public-page — save editor config + slug */
publicPageSettingsRouter.put(
  "/:id/public-page",
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const { userId } = req as AuthenticatedRequest;
      const { id: projectId } = req.params;

      if (!isValidUUID(projectId)) {
        return res.status(400).json({
          error: { code: "INVALID_ID", message: "Invalid project ID format" },
        });
      }

      const validation = UpdatePublicPageSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid request body",
            details: validation.error.flatten().fieldErrors,
          },
        });
      }

      const project = await loadOwnedProject(projectId, userId);
      if (!project) {
        return res
          .status(404)
          .json({ error: { code: "NOT_FOUND", message: "Project not found" } });
      }

      const { slug: incomingSlug, ...configFields } = validation.data;

      const currentSettings =
        (project.settings as Record<string, unknown>) || {};
      const currentPublicPage =
        (currentSettings.public_page as Record<string, unknown>) || {};

      // Merge only the provided config fields into settings.public_page.
      const mergedPublicPage = { ...currentPublicPage, ...configFields };

      const mergedSettings = {
        ...currentSettings,
        public_page: mergedPublicPage,
      };

      // Slug is non-unique and cosmetic. Normalize whatever the user typed. An explicitly
      // cleared slug is stored as "" (URL becomes the bare /c/<uuid>); NULL means "never set"
      // and keeps auto-suggesting from the business name.
      const businessNameForSlug =
        (configFields.business_name as string) ||
        (mergedPublicPage.business_name as string) ||
        project.company_name ||
        project.name ||
        "";
      let nextSlug: string | null;
      if (incomingSlug !== undefined) {
        nextSlug = slugify(incomingSlug);
      } else if (
        project.public_slug === null ||
        project.public_slug === undefined
      ) {
        nextSlug = slugify(businessNameForSlug) || null;
      } else {
        nextSlug = project.public_slug;
      }

      const { data: updated, error: updateError } = await supabaseAdmin
        .from("projects")
        .update({ settings: mergedSettings, public_slug: nextSlug })
        .eq("id", projectId)
        .eq("user_id", userId)
        .select("id, name, company_name, public_slug, plan, settings")
        .single();

      if (updateError || !updated) {
        logger.error("Error updating public page settings", updateError, {
          projectId,
        });
        return res.status(500).json({
          error: {
            code: "UPDATE_ERROR",
            message: "Failed to save public page settings",
          },
        });
      }

      const { config, slug } = buildConfig(updated as ProjectRow);
      return res.json({
        projectId: updated.id,
        plan: updated.plan || "free",
        slug,
        accentColors: ACCENT_COLORS,
        config: toCamel(config),
      });
    } catch (error) {
      logger.error("Error in PUT /projects/:id/public-page", error);
      return res.status(500).json({
        error: { code: "INTERNAL_ERROR", message: "Internal server error" },
      });
    }
  }
);
