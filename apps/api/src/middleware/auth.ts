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
 * Gets the user's project and attaches it to the request
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

    // Get user's project (for V1, users have one project)
    // Use .limit(1) instead of .single() to handle edge cases
    const { data: projects, error } = await supabaseAdmin
      .from("projects")
      .select("id")
      .eq("user_id", req.userId)
      .limit(1);

    if (error || !projects || projects.length === 0) {
      return res.status(404).json({
        error: { code: "PROJECT_NOT_FOUND", message: "No project found" },
      });
    }

    req.projectId = projects[0].id;
    next();
  } catch (error) {
    console.error("Project auth error:", error);
    res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Failed to verify project access" },
    });
  }
}
