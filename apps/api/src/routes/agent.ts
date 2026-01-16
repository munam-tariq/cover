/**
 * Agent API Routes
 *
 * Handles agent availability and status:
 * - PUT /api/agent/status - Update agent status (online/away/offline)
 * - POST /api/agent/heartbeat - Agent heartbeat for presence tracking
 * - GET /api/projects/:id/agents - List agents with status
 * - GET /api/agent/projects - Get projects where user is an agent
 */

import { Router, Request, Response } from "express";
import { z } from "zod";
import { supabaseAdmin } from "../lib/supabase";
import { authMiddleware, AuthenticatedRequest } from "../middleware/auth";
import { broadcastAgentStatusChanged } from "../services/realtime";

const router = Router();

// ============================================================================
// Validation Schemas
// ============================================================================

const UpdateStatusSchema = z.object({
  projectId: z.string().uuid("Invalid project ID"),
  status: z.enum(["online", "away", "offline"]),
});

const HeartbeatSchema = z.object({
  projectId: z.string().uuid("Invalid project ID"),
});

// ============================================================================
// Helpers
// ============================================================================

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUUID(id: string): boolean {
  return UUID_REGEX.test(id);
}

// Auto-offline threshold (30 minutes without heartbeat)
const AUTO_OFFLINE_THRESHOLD_MS = 30 * 60 * 1000;

// ============================================================================
// Routes
// ============================================================================

/**
 * PUT /api/agent/status
 * Update agent availability status for a project
 */
router.put("/status", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { userId } = req as AuthenticatedRequest;

    // Validate request body
    const validation = UpdateStatusSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid request body",
          details: validation.error.flatten().fieldErrors,
        },
      });
    }

    const { projectId, status } = validation.data;

    // Verify user is a member of the project
    const { data: membership, error: memberError } = await supabaseAdmin
      .from("project_members")
      .select("id, max_concurrent_chats")
      .eq("project_id", projectId)
      .eq("user_id", userId)
      .eq("status", "active")
      .single();

    // Also check if user is the project owner
    const { data: project, error: projectError } = await supabaseAdmin
      .from("projects")
      .select("id, user_id")
      .eq("id", projectId)
      .is("deleted_at", null)
      .single();

    if (projectError || !project) {
      return res.status(404).json({
        error: { code: "PROJECT_NOT_FOUND", message: "Project not found" },
      });
    }

    const isOwner = project.user_id === userId;
    const isAgent = !!membership;

    if (!isOwner && !isAgent) {
      return res.status(403).json({
        error: { code: "FORBIDDEN", message: "You are not a member of this project" },
      });
    }

    // Get or get default max concurrent chats
    const maxConcurrentChats = membership?.max_concurrent_chats || 5;

    // Upsert agent availability
    const { data: availability, error: upsertError } = await supabaseAdmin
      .from("agent_availability")
      .upsert(
        {
          user_id: userId,
          project_id: projectId,
          status,
          max_concurrent_chats: maxConcurrentChats,
          last_seen_at: new Date().toISOString(),
          status_changed_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id,project_id",
        }
      )
      .select("*")
      .single();

    if (upsertError) {
      console.error("Error updating agent status:", upsertError);
      return res.status(500).json({
        error: { code: "UPDATE_ERROR", message: "Failed to update status" },
      });
    }

    // Broadcast status change to project channel for real-time updates (fire-and-forget)
    if (userId) {
      broadcastAgentStatusChanged(
        projectId,
        userId,
        status,
        {
          currentChatCount: availability.current_chat_count ?? 0,
          maxConcurrentChats: availability.max_concurrent_chats ?? 5,
        }
      ).catch((err) => console.error("[Realtime] Broadcast error:", err));
    }

    res.json({
      availability: {
        id: availability.id,
        projectId: availability.project_id,
        status: availability.status,
        maxConcurrentChats: availability.max_concurrent_chats,
        currentChatCount: availability.current_chat_count,
        lastSeenAt: availability.last_seen_at,
        statusChangedAt: availability.status_changed_at,
      },
    });
  } catch (error) {
    console.error("Error in PUT /agent/status:", error);
    res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Internal server error" },
    });
  }
});

/**
 * POST /api/agent/heartbeat
 * Update agent's last_seen_at timestamp
 */
router.post("/heartbeat", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { userId } = req as AuthenticatedRequest;

    // Validate request body
    const validation = HeartbeatSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid request body",
          details: validation.error.flatten().fieldErrors,
        },
      });
    }

    const { projectId } = validation.data;

    // Update last_seen_at
    const { data: availability, error: updateError } = await supabaseAdmin
      .from("agent_availability")
      .update({
        last_seen_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .eq("project_id", projectId)
      .select("status, current_chat_count, max_concurrent_chats")
      .single();

    if (updateError) {
      // If no record exists, that's okay - agent might not have set status yet
      if (updateError.code === "PGRST116") {
        return res.json({
          status: "offline",
          currentChatCount: 0,
          maxConcurrentChats: 5,
        });
      }

      console.error("Error updating heartbeat:", updateError);
      return res.status(500).json({
        error: { code: "UPDATE_ERROR", message: "Failed to update heartbeat" },
      });
    }

    res.json({
      status: availability.status,
      currentChatCount: availability.current_chat_count,
      maxConcurrentChats: availability.max_concurrent_chats,
    });
  } catch (error) {
    console.error("Error in POST /agent/heartbeat:", error);
    res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Internal server error" },
    });
  }
});

/**
 * GET /api/projects/:id/agents
 * List all agents for a project with their status
 */
router.get("/projects/:id/agents", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { userId } = req as AuthenticatedRequest;
    const { id: projectId } = req.params;

    // Validate project ID
    if (!isValidUUID(projectId)) {
      return res.status(400).json({
        error: { code: "INVALID_ID", message: "Invalid project ID format" },
      });
    }

    // Verify user has access to the project
    const { data: project, error: projectError } = await supabaseAdmin
      .from("projects")
      .select("id, user_id")
      .eq("id", projectId)
      .is("deleted_at", null)
      .single();

    if (projectError || !project) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Project not found" },
      });
    }

    const isOwner = project.user_id === userId;

    // Check if user is a member if not owner
    if (!isOwner) {
      const { data: membership } = await supabaseAdmin
        .from("project_members")
        .select("id")
        .eq("project_id", projectId)
        .eq("user_id", userId)
        .eq("status", "active")
        .single();

      if (!membership) {
        return res.status(403).json({
          error: { code: "FORBIDDEN", message: "Access denied" },
        });
      }
    }

    // Get all active members
    const { data: members, error: membersError } = await supabaseAdmin
      .from("project_members")
      .select("user_id, email, role, max_concurrent_chats")
      .eq("project_id", projectId)
      .eq("status", "active");

    if (membersError) {
      console.error("Error fetching members:", membersError);
      return res.status(500).json({
        error: { code: "FETCH_ERROR", message: "Failed to fetch agents" },
      });
    }

    // Get availability for all members
    const memberUserIds = (members || []).map((m) => m.user_id).filter(Boolean);

    // Include owner if they're acting as an agent
    const allUserIds = [...memberUserIds, project.user_id];

    const { data: availabilities } = await supabaseAdmin
      .from("agent_availability")
      .select("*")
      .eq("project_id", projectId)
      .in("user_id", allUserIds);

    const availabilityMap = (availabilities || []).reduce(
      (acc, a) => {
        acc[a.user_id] = a;
        return acc;
      },
      {} as Record<string, typeof availabilities[0]>
    );

    // Get user details
    const { data: ownerUser } = await supabaseAdmin.auth.admin.getUserById(project.user_id);

    // Build agents list
    const agents = [];

    // Add owner if they have an availability record
    const ownerAvailability = availabilityMap[project.user_id];
    if (ownerAvailability) {
      agents.push({
        id: project.user_id,
        email: ownerUser?.user?.email || "",
        name: ownerUser?.user?.user_metadata?.name || null,
        role: "owner",
        status: ownerAvailability.status,
        maxConcurrentChats: ownerAvailability.max_concurrent_chats,
        currentChatCount: ownerAvailability.current_chat_count,
        lastSeenAt: ownerAvailability.last_seen_at,
        isOnline: ownerAvailability.status === "online",
        hasCapacity:
          ownerAvailability.status === "online" &&
          ownerAvailability.current_chat_count < ownerAvailability.max_concurrent_chats,
      });
    }

    // Add team members
    for (const member of members || []) {
      if (!member.user_id) continue;

      const availability = availabilityMap[member.user_id];
      agents.push({
        id: member.user_id,
        email: member.email,
        role: member.role,
        status: availability?.status || "offline",
        maxConcurrentChats: availability?.max_concurrent_chats || member.max_concurrent_chats,
        currentChatCount: availability?.current_chat_count || 0,
        lastSeenAt: availability?.last_seen_at || null,
        isOnline: availability?.status === "online",
        hasCapacity:
          availability?.status === "online" &&
          (availability?.current_chat_count || 0) < (availability?.max_concurrent_chats || member.max_concurrent_chats),
      });
    }

    // Calculate summary stats
    const onlineCount = agents.filter((a) => a.isOnline).length;
    const totalCapacity = agents.reduce(
      (sum, a) => (a.isOnline ? sum + (a.maxConcurrentChats - a.currentChatCount) : sum),
      0
    );

    res.json({
      agents,
      summary: {
        total: agents.length,
        online: onlineCount,
        availableCapacity: totalCapacity,
      },
    });
  } catch (error) {
    console.error("Error in GET /projects/:id/agents:", error);
    res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Internal server error" },
    });
  }
});

/**
 * GET /api/agent/projects
 * Get all projects where the current user is an agent
 */
router.get("/projects", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { userId } = req as AuthenticatedRequest;

    // Get projects where user is a member
    const { data: memberships, error: memberError } = await supabaseAdmin
      .from("project_members")
      .select("project_id, role, projects(id, name)")
      .eq("user_id", userId)
      .eq("status", "active");

    if (memberError) {
      console.error("Error fetching memberships:", memberError);
      return res.status(500).json({
        error: { code: "FETCH_ERROR", message: "Failed to fetch projects" },
      });
    }

    // Get availability for each project
    const projectIds = (memberships || []).map((m) => m.project_id);

    const { data: availabilities } = await supabaseAdmin
      .from("agent_availability")
      .select("project_id, status, current_chat_count, max_concurrent_chats")
      .eq("user_id", userId)
      .in("project_id", projectIds);

    const availabilityMap = (availabilities || []).reduce(
      (acc, a) => {
        acc[a.project_id] = a;
        return acc;
      },
      {} as Record<string, typeof availabilities[0]>
    );

    const projects = (memberships || []).map((m) => ({
      id: m.projects.id,
      name: m.projects.name,
      role: m.role,
      status: availabilityMap[m.project_id]?.status || "offline",
      currentChatCount: availabilityMap[m.project_id]?.current_chat_count || 0,
      maxConcurrentChats: availabilityMap[m.project_id]?.max_concurrent_chats || 5,
    }));

    res.json({ projects });
  } catch (error) {
    console.error("Error in GET /agent/projects:", error);
    res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Internal server error" },
    });
  }
});

/**
 * GET /api/agent/me
 * Get current user's agent info across all projects
 */
router.get("/me", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { userId } = req as AuthenticatedRequest;

    // Get user details
    const { data: userData } = await supabaseAdmin.auth.admin.getUserById(userId);

    // Get all availability records
    const { data: availabilities, error: availError } = await supabaseAdmin
      .from("agent_availability")
      .select("project_id, status, current_chat_count, max_concurrent_chats, last_seen_at")
      .eq("user_id", userId);

    if (availError) {
      console.error("Error fetching availability:", availError);
      return res.status(500).json({
        error: { code: "FETCH_ERROR", message: "Failed to fetch agent info" },
      });
    }

    // Get owned projects count
    const { count: ownedProjectsCount } = await supabaseAdmin
      .from("projects")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .is("deleted_at", null);

    // Get memberships count
    const { count: membershipCount } = await supabaseAdmin
      .from("project_members")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "active");

    res.json({
      agent: {
        id: userId,
        email: userData?.user?.email || "",
        name: userData?.user?.user_metadata?.name || null,
      },
      summary: {
        ownedProjects: ownedProjectsCount || 0,
        agentMemberships: membershipCount || 0,
        totalOnline: (availabilities || []).filter((a) => a.status === "online").length,
        totalActiveChats: (availabilities || []).reduce((sum, a) => sum + a.current_chat_count, 0),
      },
      projects: availabilities || [],
    });
  } catch (error) {
    console.error("Error in GET /agent/me:", error);
    res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Internal server error" },
    });
  }
});

export { router as agentRouter };
