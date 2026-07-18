/**
 * Projects API Routes
 *
 * Handles project management operations for multiple projects:
 * - GET /api/projects - List all user's active projects
 * - GET /api/projects/:id - Get a specific project
 * - POST /api/projects - Create a new project
 * - PUT /api/projects/:id - Update a project
 * - DELETE /api/projects/:id - Soft delete a project
 * - GET /api/projects/:id/onboarding - Get onboarding progress for a project
 * - GET /api/projects/:id/allowed-domains - Get allowed domains for widget embedding
 * - PUT /api/projects/:id/allowed-domains - Update allowed domains for widget embedding
 */

import { PROJECT_CONFIG } from "@chatbot/shared";
import { createClient } from "@supabase/supabase-js";
import { Router, Request, Response } from "express";

import { firstRelatedRecord } from "../lib/supabase-relations";
import { isSafeChannelUrl, isSafeIconUrl } from "../lib/url-validation";
import { authMiddleware, AuthenticatedRequest } from "../middleware/auth";
import { clearClientKeyCache } from "../middleware/client-key";
import { clearDomainCache } from "../middleware/domain-whitelist";
import { ChannelOwnershipError } from "../services/channels/connection-ownership";
import {
  decryptCredentials,
  getActiveConnection,
  getProjectConnection,
  setProjectConnectionStatus,
  upsertConnection,
} from "../services/channels/connections";
import { getGraphApiVersion } from "../services/channels/whatsapp/adapter";
import {
  createClientKey,
  listClientKeys,
  revokeClientKey,
  type ClientKeyPlatform,
} from "../services/client-key";
import {
  getOrCreateIdentitySecret,
  rotateIdentitySecret,
} from "../services/identity-secret";
import { selectReusableWidgetPreviewKey } from "../services/widget-preview-key";
import type { WhatsAppCredentials } from "../types/channels";

const router = Router();

// Initialize Supabase admin client
const supabase = createClient(
  `https://${process.env.SUPABASE_PROJECT_ID}.supabase.co`,
  process.env.SUPABASE_SERVICE_KEY!
);

/**
 * GET /api/projects
 * List all active projects for the current user (owned + member)
 * Query params:
 *   - include_stats: boolean - Include knowledge/endpoint counts
 */
router.get("/", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { userId } = req as AuthenticatedRequest;
    const includeStats = req.query.include_stats === "true";

    // Fetch owned projects
    const { data: ownedProjects, error: ownedError } = await supabase
      .from("projects")
      .select("id, name, settings, plan, voice_enabled, voice_greeting, created_at, updated_at, user_id")
      .eq("user_id", userId)
      .is("deleted_at", null)
      .order("created_at", { ascending: true });

    if (ownedError) {
      console.error("Error fetching owned projects:", ownedError);
      return res.status(500).json({ error: { code: "FETCH_ERROR", message: "Failed to fetch projects" } });
    }

    // Fetch projects where user is an active member
    const { data: memberships, error: memberError } = await supabase
      .from("project_members")
      .select("project_id, role, projects!inner(id, name, settings, plan, voice_enabled, voice_greeting, created_at, updated_at, user_id, deleted_at)")
      .eq("user_id", userId)
      .eq("status", "active");

    if (memberError) {
      console.error("Error fetching member projects:", memberError);
      // Don't fail, just continue with owned projects
    }

    // Filter out deleted member projects and build combined list
    // Note: Supabase returns joined data - projects is the joined project object
    interface MemberProject {
      id: string;
      name: string;
      settings: Record<string, unknown> | null;
      plan: string;
      voice_enabled: boolean;
      voice_greeting: string | null;
      created_at: string;
      updated_at: string;
      user_id: string;
      deleted_at: string | null;
    }

    const memberProjects = (memberships || []).flatMap((membership) => {
      const project = firstRelatedRecord<MemberProject>(membership.projects);
      if (!project || project.deleted_at) return [];

      return [{
        id: project.id,
        name: project.name,
        settings: project.settings,
        plan: project.plan,
        voice_enabled: project.voice_enabled,
        voice_greeting: project.voice_greeting,
        created_at: project.created_at,
        updated_at: project.updated_at,
        user_id: project.user_id,
        memberRole: membership.role,
      }];
    });

    // Combine owned and member projects (avoid duplicates)
    const ownedIds = new Set((ownedProjects || []).map((p) => p.id));
    const allProjects = [
      ...(ownedProjects || []).map((p) => ({ ...p, role: "owner" as const })),
      ...memberProjects
        .filter((p) => !ownedIds.has(p.id))
        .map((p) => ({ ...p, role: p.memberRole as "admin" | "agent" })),
    ];

    // Build response with optional stats
    const projectsResponse = await Promise.all(
      allProjects.map(async (project) => {
        const projectData: Record<string, unknown> = {
          id: project.id,
          name: project.name,
          plan: project.plan || "free",
          systemPrompt: project.settings?.systemPrompt || "",
          settings: {
            ...(project.settings || {}),
            voice_enabled: project.voice_enabled,
            voice_greeting: project.voice_greeting,
          },
          createdAt: project.created_at,
          updatedAt: project.updated_at,
          role: project.role,
          isOwner: project.role === "owner",
        };

        if (includeStats) {
          const [knowledgeResult, endpointResult] = await Promise.all([
            supabase
              .from("knowledge_sources")
              .select("*", { count: "exact", head: true })
              .eq("project_id", project.id)
              .eq("status", "ready"),
            supabase
              .from("api_endpoints")
              .select("*", { count: "exact", head: true })
              .eq("project_id", project.id),
          ]);

          projectData.knowledgeCount = knowledgeResult.count || 0;
          projectData.endpointCount = endpointResult.count || 0;
        }

        return projectData;
      })
    );

    res.json({ projects: projectsResponse });
  } catch (error) {
    console.error("Error in GET /projects:", error);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } });
  }
});

/**
 * GET /api/projects/:id
 * Get a specific project by ID (for owners and members)
 * Query params:
 *   - include_stats: boolean - Include knowledge/endpoint counts
 */
router.get("/:id", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { userId } = req as AuthenticatedRequest;
    const { id } = req.params;
    const includeStats = req.query.include_stats === "true";

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({ error: { code: "INVALID_ID", message: "Invalid project ID format" } });
    }

    // Fetch project (without user_id filter - we'll check access separately)
    const { data: project, error } = await supabase
      .from("projects")
      .select("id, name, settings, plan, voice_enabled, voice_greeting, created_at, updated_at, user_id")
      .eq("id", id)
      .is("deleted_at", null)
      .single();

    if (error || !project) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Project not found" } });
    }

    // Check access: is user owner or active member?
    const isOwner = project.user_id === userId;
    let role: "owner" | "admin" | "agent" = "owner";

    if (!isOwner) {
      // Check if user is an active member
      const { data: membership } = await supabase
        .from("project_members")
        .select("role")
        .eq("project_id", id)
        .eq("user_id", userId)
        .eq("status", "active")
        .single();

      if (!membership) {
        return res.status(404).json({ error: { code: "NOT_FOUND", message: "Project not found" } });
      }

      role = membership.role as "admin" | "agent";
    }

    const projectResponse: Record<string, unknown> = {
      id: project.id,
      name: project.name,
      plan: project.plan || "free",
      systemPrompt: project.settings?.systemPrompt || "",
      settings: {
        ...(project.settings || {}),
        voice_enabled: project.voice_enabled,
        voice_greeting: project.voice_greeting,
      },
      createdAt: project.created_at,
      updatedAt: project.updated_at,
      user_id: project.user_id,
      role,
      isOwner,
    };

    if (includeStats) {
      const [knowledgeResult, endpointResult] = await Promise.all([
        supabase
          .from("knowledge_sources")
          .select("*", { count: "exact", head: true })
          .eq("project_id", project.id)
          .eq("status", "ready"),
        supabase
          .from("api_endpoints")
          .select("*", { count: "exact", head: true })
          .eq("project_id", project.id),
      ]);

      projectResponse.knowledgeCount = knowledgeResult.count || 0;
      projectResponse.endpointCount = endpointResult.count || 0;
    }

    res.json({ project: projectResponse });
  } catch (error) {
    console.error("Error in GET /projects/:id:", error);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } });
  }
});

/**
 * POST /api/projects
 * Create a new project
 * Body: { name: string, systemPrompt?: string }
 */
router.post("/", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { userId } = req as AuthenticatedRequest;
    const { name, systemPrompt } = req.body;

    // Validate name
    if (!name || typeof name !== "string") {
      return res.status(400).json({ error: { code: "INVALID_INPUT", message: "Name is required" } });
    }

    const trimmedName = name.trim();
    if (trimmedName.length < 1 || trimmedName.length > 50) {
      return res.status(400).json({
        error: { code: "INVALID_INPUT", message: "Name must be between 1 and 50 characters" }
      });
    }

    // Validate system prompt if provided
    if (systemPrompt !== undefined && typeof systemPrompt !== "string") {
      return res.status(400).json({
        error: { code: "INVALID_INPUT", message: "System prompt must be a string" }
      });
    }

    if (systemPrompt && systemPrompt.length > PROJECT_CONFIG.MAX_SYSTEM_PROMPT_LENGTH) {
      return res.status(400).json({
        error: { code: "INVALID_INPUT", message: `System prompt must be less than ${PROJECT_CONFIG.MAX_SYSTEM_PROMPT_LENGTH} characters` }
      });
    }

    // Build settings object
    const settings: Record<string, unknown> = {};
    if (systemPrompt) {
      settings.systemPrompt = systemPrompt.trim();
    }

    // Create project
    const { data: project, error } = await supabase
      .from("projects")
      .insert({
        user_id: userId,
        name: trimmedName,
        settings,
      })
      .select("id, name, settings, plan, created_at, updated_at")
      .single();

    if (error) {
      console.error("Error creating project:", error);
      return res.status(500).json({ error: { code: "CREATE_ERROR", message: "Failed to create project" } });
    }

    res.status(201).json({
      project: {
        id: project.id,
        name: project.name,
        plan: project.plan || "free",
        systemPrompt: project.settings?.systemPrompt || "",
        settings: project.settings || {},
        createdAt: project.created_at,
        updatedAt: project.updated_at,
      },
    });
  } catch (error) {
    console.error("Error in POST /projects:", error);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } });
  }
});

/**
 * PUT /api/projects/:id
 * Update a specific project
 * Body: { name?: string, systemPrompt?: string, settings?: Record<string, unknown> }
 *
 * Note: `settings` is merged with existing settings. Use this to update
 * lead capture settings, etc. without losing other settings.
 */
router.put("/:id", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { userId } = req as AuthenticatedRequest;
    const { id } = req.params;
    const { name, systemPrompt, settings: newSettings } = req.body;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({ error: { code: "INVALID_ID", message: "Invalid project ID format" } });
    }

    // Validate inputs
    if (name !== undefined && typeof name !== "string") {
      return res.status(400).json({ error: { code: "INVALID_INPUT", message: "Name must be a string" } });
    }

    if (name !== undefined) {
      const trimmedName = name.trim();
      if (trimmedName.length < 1 || trimmedName.length > 50) {
        return res.status(400).json({
          error: { code: "INVALID_INPUT", message: "Name must be between 1 and 50 characters" }
        });
      }
    }

    if (systemPrompt !== undefined && typeof systemPrompt !== "string") {
      return res.status(400).json({
        error: { code: "INVALID_INPUT", message: "System prompt must be a string" }
      });
    }

    if (systemPrompt && systemPrompt.length > PROJECT_CONFIG.MAX_SYSTEM_PROMPT_LENGTH) {
      return res.status(400).json({
        error: { code: "INVALID_INPUT", message: `System prompt must be less than ${PROJECT_CONFIG.MAX_SYSTEM_PROMPT_LENGTH} characters` }
      });
    }

    if (newSettings !== undefined && (typeof newSettings !== "object" || newSettings === null)) {
      return res.status(400).json({
        error: { code: "INVALID_INPUT", message: "Settings must be an object" }
      });
    }

    if (newSettings?.widget_appearance?.channels) {
      const channels = newSettings.widget_appearance.channels;
      if (Array.isArray(channels)) {
        for (const ch of channels) {
          if (typeof ch !== "object" || ch === null) continue;
          const { url, iconUrl } = ch as { url?: string; iconUrl?: string };
          if (url !== undefined && !isSafeChannelUrl(url)) {
            return res.status(400).json({
              error: {
                code: "INVALID_CHANNEL_URL",
                message: `Channel url uses a disallowed scheme or is not a valid URL. Allowed: https, http, mailto, tel`,
              },
            });
          }
          if (iconUrl !== undefined && !isSafeIconUrl(iconUrl)) {
            return res.status(400).json({
              error: {
                code: "INVALID_CHANNEL_URL",
                message: `Channel iconUrl must use https or http`,
              },
            });
          }
        }
      }
    }

    // Get current project
    const { data: currentProject, error: fetchError } = await supabase
      .from("projects")
      .select("id, settings, plan")
      .eq("id", id)
      .eq("user_id", userId)
      .is("deleted_at", null)
      .single();

    if (fetchError || !currentProject) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Project not found" } });
    }

    // Guard: cannot enable widget without a knowledge base
    if (newSettings?.widget_enabled === true) {
      const { count } = await supabase
        .from("knowledge_sources")
        .select("*", { count: "exact", head: true })
        .eq("project_id", id)
        .eq("status", "ready");

      if (!count || count === 0) {
        return res.status(400).json({
          error: {
            code: "NO_KNOWLEDGE_BASE",
            message: "Cannot enable widget without a knowledge base",
          },
        });
      }
    }

    // Build update object
    const updates: Record<string, unknown> = {};

    if (name !== undefined) {
      updates.name = name.trim() || "My Chatbot";
    }

    // Merge settings - priority: newSettings > systemPrompt > currentProject.settings
    if (systemPrompt !== undefined || newSettings !== undefined) {
      const currentSettings = (currentProject.settings as Record<string, unknown>) || {};
      let mergedSettings = { ...currentSettings };

      // If systemPrompt is provided, update it in settings
      if (systemPrompt !== undefined) {
        mergedSettings.systemPrompt = systemPrompt.trim();
      }

      // If newSettings is provided, merge it (allows updating lead_capture_*, etc.)
      // voice_enabled and voice_greeting are top-level columns — extract them before merging into JSONB
      if (newSettings !== undefined) {
        const { voice_enabled, voice_greeting, ...settingsRest } = newSettings as Record<string, unknown>;
        mergedSettings = { ...mergedSettings, ...settingsRest };
        if (voice_enabled !== undefined) updates.voice_enabled = voice_enabled;
        if (voice_greeting !== undefined) updates.voice_greeting = voice_greeting;
      }

      updates.settings = mergedSettings;
    }

    // Update project
    const { data: updatedProject, error: updateError } = await supabase
      .from("projects")
      .update(updates)
      .eq("id", currentProject.id)
      .select("id, name, settings, plan, voice_enabled, voice_greeting, updated_at")
      .single();

    if (updateError) {
      console.error("Error updating project:", updateError);
      return res.status(500).json({ error: { code: "UPDATE_ERROR", message: "Failed to update project" } });
    }

    res.json({
      project: {
        id: updatedProject.id,
        name: updatedProject.name,
        systemPrompt: updatedProject.settings?.systemPrompt || "",
        settings: {
          ...(updatedProject.settings || {}),
          voice_enabled: updatedProject.voice_enabled,
          voice_greeting: updatedProject.voice_greeting,
        },
        updatedAt: updatedProject.updated_at,
      },
    });
  } catch (error) {
    console.error("Error in PUT /projects/:id:", error);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } });
  }
});

/**
 * DELETE /api/projects/:id
 * Soft delete a project (set deleted_at timestamp)
 */
router.delete("/:id", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { userId } = req as AuthenticatedRequest;
    const { id } = req.params;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({ error: { code: "INVALID_ID", message: "Invalid project ID format" } });
    }

    // Check project exists and belongs to user
    const { data: project, error: fetchError } = await supabase
      .from("projects")
      .select("id")
      .eq("id", id)
      .eq("user_id", userId)
      .is("deleted_at", null)
      .single();

    if (fetchError || !project) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Project not found" } });
    }

    // Soft delete: set deleted_at timestamp
    const { error: deleteError } = await supabase
      .from("projects")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", project.id);

    if (deleteError) {
      console.error("Error deleting project:", deleteError);
      return res.status(500).json({ error: { code: "DELETE_ERROR", message: "Failed to delete project" } });
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE /projects/:id:", error);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } });
  }
});

// Sources that prove the chatbot is reachable by real end customers: the
// embedded widget, the hosted chat page, and the mobile SDK.
const LIVE_DEPLOYMENT_SOURCES = ["widget", "public", "mobile"];

/**
 * GET /api/projects/:id/onboarding
 * Get the onboarding progress for a specific project
 */
router.get("/:id/onboarding", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { userId } = req as AuthenticatedRequest;
    const { id } = req.params;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({ error: { code: "INVALID_ID", message: "Invalid project ID format" } });
    }

    // Get project
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id, created_at")
      .eq("id", id)
      .eq("user_id", userId)
      .is("deleted_at", null)
      .single();

    if (projectError || !project) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Project not found" } });
    }

    // Check all onboarding steps in parallel
    const [knowledgeResult, playgroundResult, widgetResult] = await Promise.all([
      supabase
        .from("knowledge_sources")
        .select("id", { count: "exact", head: true })
        .eq("project_id", project.id)
        .eq("status", "ready"),
      supabase
        .from("conversations")
        .select("id", { count: "exact", head: true })
        .eq("project_id", project.id)
        .eq("source", "playground"),
      supabase
        .from("conversations")
        .select("id", { count: "exact", head: true })
        .eq("project_id", project.id)
        .in("source", LIVE_DEPLOYMENT_SOURCES),
    ]);

    const steps = {
      accountCreated: {
        completed: true,
        label: "Create account",
        description: "Sign up for your account",
      },
      knowledgeAdded: {
        completed: (knowledgeResult.count || 0) > 0,
        label: "Add knowledge",
        description: "Upload content for your chatbot to learn",
      },
      playgroundTested: {
        completed: (playgroundResult.count || 0) > 0,
        label: "Test in playground",
        description: "Try your chatbot in the playground",
      },
      widgetEmbedded: {
        completed: (widgetResult.count || 0) > 0,
        label: "Embed on website",
        description: "Add the chat widget to your site",
      },
    };

    const completedCount = Object.values(steps).filter((s) => s.completed).length;
    const totalSteps = Object.keys(steps).length;

    res.json({
      steps,
      progress: {
        completed: completedCount,
        total: totalSteps,
        percentage: Math.round((completedCount / totalSteps) * 100),
      },
    });
  } catch (error) {
    console.error("Error in GET /projects/:id/onboarding:", error);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } });
  }
});

/**
 * GET /api/projects/:id/allowed-domains
 * Get allowed domains for a project (domain whitelisting)
 */
router.get("/:id/allowed-domains", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { userId } = req as AuthenticatedRequest;
    const { id } = req.params;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({ error: { code: "INVALID_ID", message: "Invalid project ID format" } });
    }

    // Check access: user must be owner or member
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id, allowed_domains, user_id")
      .eq("id", id)
      .is("deleted_at", null)
      .single();

    if (projectError || !project) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Project not found" } });
    }

    // Verify ownership or membership
    const isOwner = project.user_id === userId;
    if (!isOwner) {
      const { data: membership } = await supabase
        .from("project_members")
        .select("role")
        .eq("project_id", id)
        .eq("user_id", userId)
        .eq("status", "active")
        .single();

      if (!membership) {
        return res.status(404).json({ error: { code: "NOT_FOUND", message: "Project not found" } });
      }
    }

    const domains = project.allowed_domains || [];

    res.json({
      domains,
      enabled: domains.length > 0,
    });
  } catch (error) {
    console.error("Error in GET /projects/:id/allowed-domains:", error);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } });
  }
});

/**
 * PUT /api/projects/:id/allowed-domains
 * Update allowed domains for a project (domain whitelisting)
 * Body: { domains: string[] }
 */
router.put("/:id/allowed-domains", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { userId } = req as AuthenticatedRequest;
    const { id } = req.params;
    const { domains } = req.body;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({ error: { code: "INVALID_ID", message: "Invalid project ID format" } });
    }

    // Validate domains input
    if (!Array.isArray(domains)) {
      return res.status(400).json({
        error: { code: "INVALID_INPUT", message: "domains must be an array" }
      });
    }

    // Validate each domain
    const validatedDomains: string[] = [];
    const domainRegex = /^(\*\.)?[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/i;

    for (const domain of domains) {
      if (typeof domain !== 'string') continue;

      const trimmed = domain.trim().toLowerCase();
      if (!trimmed) continue;

      if (!domainRegex.test(trimmed)) {
        return res.status(400).json({
          error: { code: "INVALID_INPUT", message: `Invalid domain format: ${domain}` }
        });
      }

      validatedDomains.push(trimmed);
    }

    // Remove duplicates
    const uniqueDomains = [...new Set(validatedDomains)];

    // Check access and update project (owner only for security settings)
    const { data: project, error: updateError } = await supabase
      .from("projects")
      .update({ allowed_domains: uniqueDomains })
      .eq("id", id)
      .eq("user_id", userId)
      .is("deleted_at", null)
      .select("id, allowed_domains")
      .single();

    if (updateError || !project) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Project not found or you don't have permission" } });
    }

    // Clear the domain cache for this project
    clearDomainCache(id);

    res.json({
      domains: project.allowed_domains || [],
      enabled: (project.allowed_domains || []).length > 0,
      message: uniqueDomains.length > 0
        ? `Domain whitelist updated with ${uniqueDomains.length} domain(s)`
        : 'Domain whitelist disabled (all domains allowed)',
    });
  } catch (error) {
    console.error("Error in PUT /projects/:id/allowed-domains:", error);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } });
  }
});

// ─── Publishable client keys (mobile/native SDKs) ─────────────────────────────

const CLIENT_KEY_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CLIENT_KEY_PLATFORMS: ClientKeyPlatform[] = ["mobile", "web", "all"];

/**
 * Returns the project if the user may access it (owner always; active members when allowMember),
 * otherwise null. Mirrors the ownership checks used by the allowed-domains routes.
 */
async function getAccessibleProject(
  id: string,
  userId: string | undefined,
  allowMember: boolean
): Promise<{ id: string; user_id: string } | null> {
  if (!userId) return null;

  const { data: project } = await supabase
    .from("projects")
    .select("id, user_id")
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (!project) return null;
  if (project.user_id === userId) return project;
  if (!allowMember) return null;

  const { data: membership } = await supabase
    .from("project_members")
    .select("role")
    .eq("project_id", id)
    .eq("user_id", userId)
    .eq("status", "active")
    .single();

  return membership ? project : null;
}

/**
 * GET /api/projects/:id/widget-preview-key
 * Return a publishable key used only by the sandboxed dashboard widget preview. The public web
 * embed snippet remains origin-gated and does not include this key.
 */
router.get(
  "/:id/widget-preview-key",
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const { userId } = req as AuthenticatedRequest;
      const { id } = req.params;

      if (!CLIENT_KEY_UUID_RE.test(id)) {
        return res.status(400).json({
          error: { code: "INVALID_ID", message: "Invalid project ID format" },
        });
      }

      const project = await getAccessibleProject(id, userId, true);
      if (!project) {
        return res
          .status(404)
          .json({ error: { code: "NOT_FOUND", message: "Project not found" } });
      }

      const keys = await listClientKeys(id);
      const existing = selectReusableWidgetPreviewKey(keys);
      if (existing) {
        return res.json({ key: existing.key });
      }

      if (project.user_id !== userId) {
        return res.status(409).json({
          error: {
            code: "PREVIEW_KEY_REQUIRED",
            message: "A project owner must create the widget preview key.",
          },
        });
      }

      const created = await createClientKey(id, "web", "Dashboard preview");
      if (!created) {
        return res.status(500).json({
          error: {
            code: "INTERNAL_ERROR",
            message: "Failed to create widget preview key",
          },
        });
      }

      return res.status(201).json({ key: created.key });
    } catch (error) {
      console.error("Error in GET /projects/:id/widget-preview-key:", error);
      return res.status(500).json({
        error: { code: "INTERNAL_ERROR", message: "Internal server error" },
      });
    }
  }
);

/**
 * GET /api/projects/:id/client-keys
 * List the project's publishable client keys (owner or member). Keys are publishable, so the full
 * value is returned for display/copy.
 */
router.get(
  "/:id/client-keys",
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const { userId } = req as AuthenticatedRequest;
      const { id } = req.params;

      if (!CLIENT_KEY_UUID_RE.test(id)) {
        return res.status(400).json({
          error: { code: "INVALID_ID", message: "Invalid project ID format" },
        });
      }

      const project = await getAccessibleProject(id, userId, true);
      if (!project) {
        return res
          .status(404)
          .json({ error: { code: "NOT_FOUND", message: "Project not found" } });
      }

      res.json({ keys: await listClientKeys(id) });
    } catch (error) {
      console.error("Error in GET /projects/:id/client-keys:", error);
      res
        .status(500)
        .json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } });
    }
  }
);

/**
 * POST /api/projects/:id/client-keys
 * Mint a new publishable client key (owner only). Body: { platform?, name? }.
 * Overlapping active keys are allowed (rotation).
 */
router.post(
  "/:id/client-keys",
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const { userId } = req as AuthenticatedRequest;
      const { id } = req.params;
      const { platform, name } = req.body ?? {};

      if (!CLIENT_KEY_UUID_RE.test(id)) {
        return res.status(400).json({
          error: { code: "INVALID_ID", message: "Invalid project ID format" },
        });
      }

      const resolvedPlatform: ClientKeyPlatform = CLIENT_KEY_PLATFORMS.includes(
        platform as ClientKeyPlatform
      )
        ? (platform as ClientKeyPlatform)
        : "mobile";

      if (name != null && (typeof name !== "string" || name.length > 100)) {
        return res.status(400).json({
          error: { code: "INVALID_INPUT", message: "name must be a string ≤ 100 chars" },
        });
      }

      const project = await getAccessibleProject(id, userId, false);
      if (!project) {
        return res.status(404).json({
          error: {
            code: "NOT_FOUND",
            message: "Project not found or you don't have permission",
          },
        });
      }

      const key = await createClientKey(id, resolvedPlatform, name ?? null);
      if (!key) {
        return res.status(500).json({
          error: { code: "INTERNAL_ERROR", message: "Failed to create key" },
        });
      }

      res.status(201).json({ key });
    } catch (error) {
      console.error("Error in POST /projects/:id/client-keys:", error);
      res
        .status(500)
        .json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } });
    }
  }
);

/**
 * DELETE /api/projects/:id/client-keys/:keyId
 * Revoke (soft-delete) a publishable client key (owner only) and bust the middleware cache.
 */
router.delete(
  "/:id/client-keys/:keyId",
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const { userId } = req as AuthenticatedRequest;
      const { id, keyId } = req.params;

      if (!CLIENT_KEY_UUID_RE.test(id) || !CLIENT_KEY_UUID_RE.test(keyId)) {
        return res.status(400).json({
          error: { code: "INVALID_ID", message: "Invalid ID format" },
        });
      }

      const project = await getAccessibleProject(id, userId, false);
      if (!project) {
        return res.status(404).json({
          error: {
            code: "NOT_FOUND",
            message: "Project not found or you don't have permission",
          },
        });
      }

      const revokedKey = await revokeClientKey(id, keyId);
      if (!revokedKey) {
        return res
          .status(404)
          .json({ error: { code: "NOT_FOUND", message: "Key not found" } });
      }

      clearClientKeyCache(revokedKey);
      res.json({ success: true });
    } catch (error) {
      console.error("Error in DELETE /projects/:id/client-keys/:keyId:", error);
      res
        .status(500)
        .json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } });
    }
  }
);

/**
 * GET /api/projects/:id/identity-secret
 * Return the project's identity-verification signing secret. OWNER ONLY — the
 * secret can mint verified-identity tokens for any visitor, so members must not
 * read it. Lazily created on first access. Tenants use it to sign HS256 identity
 * JWTs on their own backend for POST /api/customers/identify.
 */
router.get(
  "/:id/identity-secret",
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const { userId } = req as AuthenticatedRequest;
      const { id } = req.params;

      if (!CLIENT_KEY_UUID_RE.test(id)) {
        return res.status(400).json({
          error: { code: "INVALID_ID", message: "Invalid project ID format" },
        });
      }

      const project = await getAccessibleProject(id, userId, false);
      if (!project) {
        return res
          .status(404)
          .json({ error: { code: "NOT_FOUND", message: "Project not found" } });
      }

      const record = await getOrCreateIdentitySecret(id);
      if (!record) {
        return res.status(500).json({
          error: {
            code: "INTERNAL_ERROR",
            message: "Failed to load identity secret",
          },
        });
      }

      // Never let the signing secret sit in a shared/browser cache.
      res.setHeader("Cache-Control", "no-store");
      res.json(record);
    } catch (error) {
      console.error("Error in GET /projects/:id/identity-secret:", error);
      res
        .status(500)
        .json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } });
    }
  }
);

/**
 * POST /api/projects/:id/identity-secret/rotate
 * Replace the identity-verification secret (owner only). All identity tokens
 * signed with the previous secret stop verifying immediately.
 */
router.post(
  "/:id/identity-secret/rotate",
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const { userId } = req as AuthenticatedRequest;
      const { id } = req.params;

      if (!CLIENT_KEY_UUID_RE.test(id)) {
        return res.status(400).json({
          error: { code: "INVALID_ID", message: "Invalid project ID format" },
        });
      }

      const project = await getAccessibleProject(id, userId, false);
      if (!project) {
        return res.status(404).json({
          error: {
            code: "NOT_FOUND",
            message: "Project not found or you don't have permission",
          },
        });
      }

      const record = await rotateIdentitySecret(id);
      if (!record) {
        return res.status(500).json({
          error: {
            code: "INTERNAL_ERROR",
            message: "Failed to rotate identity secret",
          },
        });
      }

      res.setHeader("Cache-Control", "no-store");
      res.json(record);
    } catch (error) {
      console.error("Error in POST /projects/:id/identity-secret/rotate:", error);
      res
        .status(500)
        .json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } });
    }
  }
);

/**
 * GET /api/projects/:id/channels
 * List channel connections for this project (owner only). No credential material returned.
 */
router.get(
  "/:id/channels",
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const { userId } = req as AuthenticatedRequest;
      const { id } = req.params;

      const project = await getAccessibleProject(id, userId, false);
      if (!project) {
        return res.status(404).json({
          error: { code: "NOT_FOUND", message: "Project not found" },
        });
      }

      const whatsapp = await getProjectConnection(id, "whatsapp");
      const connections = whatsapp ? [whatsapp] : [];

      res.json({ connections });
    } catch (error) {
      console.error("Error in GET /projects/:id/channels:", error);
      res.status(500).json({
        error: { code: "INTERNAL_ERROR", message: "Internal server error" },
      });
    }
  }
);

/**
 * POST /api/projects/:id/channels/whatsapp
 * Create or update WhatsApp connection (owner only). Encrypts credentials immediately.
 */
router.post(
  "/:id/channels/whatsapp",
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const { userId } = req as AuthenticatedRequest;
      const { id } = req.params;

      const project = await getAccessibleProject(id, userId, false);
      if (!project) {
        return res.status(404).json({
          error: { code: "NOT_FOUND", message: "Project not found" },
        });
      }

      const { phoneNumberId, wabaId, accessToken, appSecret, displayName } =
        req.body ?? {};

      if (!phoneNumberId || !accessToken || !appSecret) {
        return res.status(400).json({
          error: {
            code: "MISSING_FIELDS",
            message:
              "phoneNumberId, accessToken, and appSecret are required",
          },
        });
      }

      const connection = await upsertConnection(id, "whatsapp", {
        externalId: phoneNumberId,
        displayName: displayName ?? null,
        credentials: {
          accessToken,
          appSecret,
          ...(wabaId ? { wabaId } : {}),
        },
        config: wabaId ? { wabaId } : {},
      });

      res.status(200).json({ connection });
    } catch (error) {
      if (error instanceof ChannelOwnershipError) {
        return res.status(409).json({
          error: { code: "CHANNEL_ALREADY_CONNECTED", message: error.message },
        });
      }
      console.error("Error in POST /projects/:id/channels/whatsapp:", error);
      res.status(500).json({
        error: { code: "INTERNAL_ERROR", message: "Internal server error" },
      });
    }
  }
);

/**
 * POST /api/projects/:id/channels/whatsapp/test
 * Test WhatsApp connection by calling the Graph API (owner only).
 */
router.post(
  "/:id/channels/whatsapp/test",
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const { userId } = req as AuthenticatedRequest;
      const { id } = req.params;

      const project = await getAccessibleProject(id, userId, false);
      if (!project) {
        return res.status(404).json({
          error: { code: "NOT_FOUND", message: "Project not found" },
        });
      }

      const conn = await getActiveConnection(id, "whatsapp");
      if (!conn) {
        return res.json({ ok: false, error: "No active WhatsApp connection" });
      }

      const creds = decryptCredentials<WhatsAppCredentials>(
        conn.encryptedCredentials
      );

      const url = `https://graph.facebook.com/${getGraphApiVersion()}/${conn.externalId}`;

      const resp = await fetch(url, {
        headers: { Authorization: `Bearer ${creds.accessToken}` },
      });

      if (resp.ok) {
        return res.json({ ok: true });
      }
      const body = await resp.json().catch(() => ({}));
      const graphError = body as { error?: { message?: string } };
      return res.json({
        ok: false,
        error: graphError.error?.message || `HTTP ${resp.status}`,
      });
    } catch (error) {
      console.error("Error in POST /projects/:id/channels/whatsapp/test:", error);
      res.json({
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

/**
 * DELETE /api/projects/:id/channels/whatsapp/:connectionId
 * Disconnect a WhatsApp channel (owner only). Soft-delete via status='disabled'.
 */
router.delete(
  "/:id/channels/whatsapp/:connectionId",
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const { userId } = req as AuthenticatedRequest;
      const { id, connectionId } = req.params;

      const project = await getAccessibleProject(id, userId, false);
      if (!project) {
        return res.status(404).json({
          error: { code: "NOT_FOUND", message: "Project not found" },
        });
      }

      const disabled = await setProjectConnectionStatus(
        id,
        "whatsapp",
        connectionId,
        "disabled"
      );
      if (!disabled) {
        return res.status(404).json({
          error: { code: "NOT_FOUND", message: "Connection not found" },
        });
      }

      res.sendStatus(204);
    } catch (error) {
      console.error("Error in DELETE /projects/:id/channels/whatsapp:", error);
      res.status(500).json({
        error: { code: "INTERNAL_ERROR", message: "Internal server error" },
      });
    }
  }
);

export { router as projectsRouter };
