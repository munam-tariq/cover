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

import { Router, Request, Response } from "express";
import { createClient } from "@supabase/supabase-js";
import { authMiddleware, AuthenticatedRequest } from "../middleware/auth";
import { clearDomainCache } from "../middleware/domain-whitelist";

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
      .select("id, name, settings, created_at, updated_at, user_id")
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
      .select("project_id, role, projects!inner(id, name, settings, created_at, updated_at, user_id, deleted_at)")
      .eq("user_id", userId)
      .eq("status", "active");

    if (memberError) {
      console.error("Error fetching member projects:", memberError);
      // Don't fail, just continue with owned projects
    }

    // Filter out deleted member projects and build combined list
    // Note: Supabase returns joined data - projects is the joined project object
    const memberProjects = (memberships || [])
      .filter((m) => {
        const proj = m.projects as unknown as { deleted_at: string | null } | null;
        return proj && !proj.deleted_at;
      })
      .map((m) => {
        const proj = m.projects as unknown as {
          id: string;
          name: string;
          settings: Record<string, unknown> | null;
          created_at: string;
          updated_at: string;
          user_id: string;
        };
        return {
          id: proj.id,
          name: proj.name,
          settings: proj.settings,
          created_at: proj.created_at,
          updated_at: proj.updated_at,
          user_id: proj.user_id,
          memberRole: m.role,
        };
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
          systemPrompt: project.settings?.systemPrompt || "",
          settings: project.settings || {},
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
      .select("id, name, settings, created_at, updated_at, user_id")
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
      systemPrompt: project.settings?.systemPrompt || "",
      settings: project.settings || {},
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

    if (systemPrompt && systemPrompt.length > 2000) {
      return res.status(400).json({
        error: { code: "INVALID_INPUT", message: "System prompt must be less than 2000 characters" }
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
      .select("id, name, settings, created_at, updated_at")
      .single();

    if (error) {
      console.error("Error creating project:", error);
      return res.status(500).json({ error: { code: "CREATE_ERROR", message: "Failed to create project" } });
    }

    res.status(201).json({
      project: {
        id: project.id,
        name: project.name,
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

    if (systemPrompt && systemPrompt.length > 2000) {
      return res.status(400).json({
        error: { code: "INVALID_INPUT", message: "System prompt must be less than 2000 characters" }
      });
    }

    if (newSettings !== undefined && (typeof newSettings !== "object" || newSettings === null)) {
      return res.status(400).json({
        error: { code: "INVALID_INPUT", message: "Settings must be an object" }
      });
    }

    // Get current project
    const { data: currentProject, error: fetchError } = await supabase
      .from("projects")
      .select("id, settings")
      .eq("id", id)
      .eq("user_id", userId)
      .is("deleted_at", null)
      .single();

    if (fetchError || !currentProject) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Project not found" } });
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
      if (newSettings !== undefined) {
        mergedSettings = { ...mergedSettings, ...newSettings };
      }

      updates.settings = mergedSettings;
    }

    // Update project
    const { data: updatedProject, error: updateError } = await supabase
      .from("projects")
      .update(updates)
      .eq("id", currentProject.id)
      .select("id, name, settings, updated_at")
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
        settings: updatedProject.settings || {},
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
        .from("chat_sessions")
        .select("id", { count: "exact", head: true })
        .eq("project_id", project.id)
        .eq("source", "playground"),
      supabase
        .from("chat_sessions")
        .select("id", { count: "exact", head: true })
        .eq("project_id", project.id)
        .eq("source", "widget"),
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

export { router as projectsRouter };
