import { NextFunction, Request, Response } from "express";
import { supabaseAdmin, createUserClient } from "../lib/supabase";

export interface AuthenticatedRequest extends Request {
  userId?: string;
  projectId?: string;
  supabase?: ReturnType<typeof createUserClient>;
}

/**
 * Middleware to verify authentication token
 * Validates the Supabase JWT and attaches user info to the request
 */
export async function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        error: { code: "UNAUTHORIZED", message: "Missing authorization header" },
      });
    }

    const token = authHeader.substring(7);

    // Verify token with Supabase
    const {
      data: { user },
      error,
    } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({
        error: { code: "UNAUTHORIZED", message: "Invalid or expired token" },
      });
    }

    // Attach user info and user-scoped Supabase client
    req.userId = user.id;
    req.supabase = createUserClient(token);

    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    res.status(401).json({
      error: { code: "UNAUTHORIZED", message: "Authentication failed" },
    });
  }
}

/**
 * Middleware to verify project access
 * Gets the projectId from query params or X-Project-ID header
 * Verifies the user owns the project before attaching it to the request
 */
export async function projectAuthMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    if (!req.userId) {
      return res.status(401).json({
        error: { code: "UNAUTHORIZED", message: "User not authenticated" },
      });
    }

    // Get projectId from query params, header, or body (in order of priority)
    const projectId =
      (req.query.projectId as string) ||
      (req.headers["x-project-id"] as string) ||
      (req.body?.projectId as string);

    if (!projectId) {
      return res.status(400).json({
        error: { code: "PROJECT_ID_REQUIRED", message: "Project ID is required" },
      });
    }

    // Verify the user owns this project (exclude soft-deleted projects)
    const { data: project, error } = await supabaseAdmin
      .from("projects")
      .select("id")
      .eq("id", projectId)
      .eq("user_id", req.userId)
      .is("deleted_at", null)
      .single();

    if (error || !project) {
      return res.status(404).json({
        error: { code: "PROJECT_NOT_FOUND", message: "Project not found or access denied" },
      });
    }

    req.projectId = project.id;
    next();
  } catch (error) {
    console.error("Project auth error:", error);
    res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Failed to verify project access" },
    });
  }
}
