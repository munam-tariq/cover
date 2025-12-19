/**
 * Account API Routes
 *
 * Handles account-level operations including API key management.
 * - GET /api/account/api-key - Get current API key metadata
 * - POST /api/account/api-key - Generate a new API key
 * - DELETE /api/account/api-key - Revoke current API key
 */

import { Router, Request, Response } from "express";
import { authMiddleware, AuthenticatedRequest } from "../middleware/auth";
import { supabaseAdmin } from "../lib/supabase";
import { generateApiKey } from "../services/api-key";

export const accountRouter = Router();

/**
 * GET /api/account/api-key
 * Get current API key metadata (not the key itself)
 */
accountRouter.get(
  "/api-key",
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const { userId } = req as AuthenticatedRequest;

      // Get active (non-revoked) API key for this user
      const { data: apiKey, error } = await supabaseAdmin
        .from("api_keys")
        .select("id, key_prefix, name, last_used_at, created_at")
        .eq("user_id", userId)
        .is("revoked_at", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (error || !apiKey) {
        // No API key found - this is not an error
        return res.json({
          hasKey: false,
          apiKey: null,
        });
      }

      res.json({
        hasKey: true,
        apiKey: {
          id: apiKey.id,
          prefix: apiKey.key_prefix,
          name: apiKey.name,
          lastUsedAt: apiKey.last_used_at,
          createdAt: apiKey.created_at,
        },
      });
    } catch (error) {
      console.error("Error fetching API key:", error);
      res.status(500).json({
        error: { code: "INTERNAL_ERROR", message: "Failed to fetch API key" },
      });
    }
  }
);

/**
 * POST /api/account/api-key
 * Generate a new API key (revokes existing key if any)
 */
accountRouter.post(
  "/api-key",
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const { userId } = req as AuthenticatedRequest;
      const { name } = req.body;

      // Revoke any existing active keys for this user
      await supabaseAdmin
        .from("api_keys")
        .update({ revoked_at: new Date().toISOString() })
        .eq("user_id", userId)
        .is("revoked_at", null);

      // Generate new API key
      const { key, prefix, hash } = await generateApiKey();

      // Store the new key
      const { data: newKey, error } = await supabaseAdmin
        .from("api_keys")
        .insert({
          user_id: userId,
          key_prefix: prefix,
          key_hash: hash,
          name: name || "Default API Key",
        })
        .select("id, key_prefix, name, created_at")
        .single();

      if (error || !newKey) {
        console.error("Error creating API key:", error);
        return res.status(500).json({
          error: { code: "CREATE_ERROR", message: "Failed to create API key" },
        });
      }

      // Return the full key (only shown once!)
      res.status(201).json({
        success: true,
        message:
          "API key generated successfully. Save this key - it will only be shown once!",
        apiKey: {
          id: newKey.id,
          key: key, // Full key - only returned on creation
          prefix: newKey.key_prefix,
          name: newKey.name,
          createdAt: newKey.created_at,
        },
      });
    } catch (error) {
      console.error("Error generating API key:", error);
      res.status(500).json({
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to generate API key",
        },
      });
    }
  }
);

/**
 * DELETE /api/account/api-key
 * Revoke the current API key
 */
accountRouter.delete(
  "/api-key",
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const { userId } = req as AuthenticatedRequest;

      // Revoke all active keys for this user
      const { error } = await supabaseAdmin
        .from("api_keys")
        .update({ revoked_at: new Date().toISOString() })
        .eq("user_id", userId)
        .is("revoked_at", null);

      if (error) {
        console.error("Error revoking API key:", error);
        return res.status(500).json({
          error: { code: "REVOKE_ERROR", message: "Failed to revoke API key" },
        });
      }

      res.json({
        success: true,
        message: "API key revoked successfully",
      });
    } catch (error) {
      console.error("Error revoking API key:", error);
      res.status(500).json({
        error: { code: "INTERNAL_ERROR", message: "Failed to revoke API key" },
      });
    }
  }
);
