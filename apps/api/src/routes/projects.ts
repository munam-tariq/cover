/**
 * Projects API Routes
 *
 * Handles project management operations:
 * - GET /api/projects - Get current user's project
 * - PUT /api/projects - Update project settings
 * - DELETE /api/projects - Delete project
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
 * Get the current user's project with optional stats
 * Query params:
 *   - include_stats: boolean - Include knowledge/endpoint counts
 */
router.get("/", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { userId } = req as AuthenticatedRequest;
    const includeStats = req.query.include_stats === "true";

    const { data: project, error } = await supabase
      .from("projects")
      .select("id, name, settings, created_at, updated_at")
      .eq("user_id", userId)
      .limit(1)
      .single();

    if (error && error.code !== "PGRST116") {
      // PGRST116 = no rows returned
      console.error("Error fetching project:", error);
      return res.status(500).json({ error: { code: "FETCH_ERROR", message: "Failed to fetch project" } });
    }

    if (!project) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "No project found" } });
    }

    // Build response
    const projectResponse: Record<string, unknown> = {
      id: project.id,
      name: project.name,
      systemPrompt: project.settings?.systemPrompt || "",
      settings: project.settings || {},
      createdAt: project.created_at,
      updatedAt: project.updated_at,
    };

    // Optionally include stats
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
    console.error("Error in GET /projects:", error);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } });
  }
});

/**
 * PUT /api/projects
 * Update the current user's project
 */
router.put("/", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { userId } = req as AuthenticatedRequest;
    const { name, systemPrompt } = req.body;

    // Validate input
    if (name !== undefined && typeof name !== "string") {
      return res.status(400).json({ error: { code: "INVALID_INPUT", message: "Name must be a string" } });
    }

    if (systemPrompt !== undefined && typeof systemPrompt !== "string") {
      return res.status(400).json({ error: { code: "INVALID_INPUT", message: "System prompt must be a string" } });
    }

    // Get current project
    const { data: currentProject, error: fetchError } = await supabase
      .from("projects")
      .select("id, settings")
      .eq("user_id", userId)
      .limit(1)
      .single();

    if (fetchError || !currentProject) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "No project found" } });
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
    console.error("Error in PUT /projects:", error);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } });
  }
});

/**
 * GET /api/projects/onboarding
 * Get the onboarding progress for the current user's project
 * Returns completion status for each setup step
 */
router.get("/onboarding", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { userId } = req as AuthenticatedRequest;

    // Get project
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id, created_at")
      .eq("user_id", userId)
      .limit(1)
      .single();

    if (projectError || !project) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "No project found" } });
    }

    // Check all onboarding steps in parallel
    const [knowledgeResult, playgroundResult, widgetResult] = await Promise.all([
      // Check if at least 1 knowledge source is ready
      supabase
        .from("knowledge_sources")
        .select("id", { count: "exact", head: true })
        .eq("project_id", project.id)
        .eq("status", "ready"),
      // Check if at least 1 chat session from playground
      supabase
        .from("chat_sessions")
        .select("id", { count: "exact", head: true })
        .eq("project_id", project.id)
        .eq("source", "playground"),
      // Check if at least 1 chat session from widget
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
    console.error("Error in GET /projects/onboarding:", error);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } });
  }
});

/**
 * DELETE /api/projects
 * Delete the current user's project (and all associated data via cascade)
 */
router.delete("/", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { userId } = req as AuthenticatedRequest;

    // Get project
    const { data: project, error: fetchError } = await supabase
      .from("projects")
      .select("id")
      .eq("user_id", userId)
      .limit(1)
      .single();

    if (fetchError || !project) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "No project found" } });
    }

    // Delete project (cascade will handle related data)
    const { error: deleteError } = await supabase
      .from("projects")
      .delete()
      .eq("id", project.id);

    if (deleteError) {
      console.error("Error deleting project:", deleteError);
      return res.status(500).json({ error: { code: "DELETE_ERROR", message: "Failed to delete project" } });
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE /projects:", error);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } });
  }
});

export { router as projectsRouter };
