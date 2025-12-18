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
 */

import { Router, Request, Response } from "express";
import { createClient } from "@supabase/supabase-js";
import { authMiddleware, AuthenticatedRequest } from "../middleware/auth";

const router = Router();

// Initialize Supabase admin client
const supabase = createClient(
  `https://${process.env.SUPABASE_PROJECT_ID}.supabase.co`,
  process.env.SUPABASE_SERVICE_KEY!
);

/**
 * GET /api/projects
 * List all active projects for the current user
 * Query params:
 *   - include_stats: boolean - Include knowledge/endpoint counts
 */
router.get("/", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { userId } = req as AuthenticatedRequest;
    const includeStats = req.query.include_stats === "true";

    // Fetch all active projects (deleted_at is null)
    const { data: projects, error } = await supabase
      .from("projects")
      .select("id, name, settings, created_at, updated_at")
      .eq("user_id", userId)
      .is("deleted_at", null)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching projects:", error);
      return res.status(500).json({ error: { code: "FETCH_ERROR", message: "Failed to fetch projects" } });
    }

    // Build response with optional stats
    const projectsResponse = await Promise.all(
      (projects || []).map(async (project) => {
        const projectData: Record<string, unknown> = {
          id: project.id,
          name: project.name,
          systemPrompt: project.settings?.systemPrompt || "",
          settings: project.settings || {},
          createdAt: project.created_at,
          updatedAt: project.updated_at,
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
 * Get a specific project by ID
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

    const { data: project, error } = await supabase
      .from("projects")
      .select("id, name, settings, created_at, updated_at")
      .eq("id", id)
      .eq("user_id", userId)
      .is("deleted_at", null)
      .single();

    if (error || !project) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Project not found" } });
    }

    const projectResponse: Record<string, unknown> = {
      id: project.id,
      name: project.name,
      systemPrompt: project.settings?.systemPrompt || "",
      settings: project.settings || {},
      createdAt: project.created_at,
      updatedAt: project.updated_at,
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
 */
router.put("/:id", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { userId } = req as AuthenticatedRequest;
    const { id } = req.params;
    const { name, systemPrompt } = req.body;

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

    if (systemPrompt !== undefined) {
      updates.settings = {
        ...currentProject.settings,
        systemPrompt: systemPrompt.trim(),
      };
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

export { router as projectsRouter };
