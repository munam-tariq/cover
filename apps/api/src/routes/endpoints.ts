import { Router, Response } from "express";
import { z } from "zod";
import {
  authMiddleware,
  projectAuthMiddleware,
  AuthenticatedRequest,
} from "../middleware/auth";
import { supabaseAdmin } from "../lib/supabase";
import { encryptAuthConfig, decryptAuthConfig } from "../services/encryption";

export const endpointsRouter = Router();

const MAX_ENDPOINTS_PER_PROJECT = 10;

// Validation schemas
const authTypeSchema = z.enum(["none", "api_key", "bearer"]);

const createEndpointSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  description: z
    .string()
    .min(1, "Description is required")
    .max(500, "Description too long"),
  url: z.string().url("Invalid URL format"),
  method: z.enum(["GET", "POST"]).default("GET"),
  authType: authTypeSchema.default("none"),
  authConfig: z
    .object({
      apiKey: z.string().optional(),
      apiKeyHeader: z.string().optional(),
      bearerToken: z.string().optional(),
    })
    .optional(),
});

const updateEndpointSchema = createEndpointSchema.partial();

// Apply auth middleware to all routes
endpointsRouter.use(authMiddleware);
endpointsRouter.use(projectAuthMiddleware);

/**
 * GET /api/endpoints
 * List all API endpoints for the authenticated user's project
 */
endpointsRouter.get("/", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { data: endpoints, error } = await supabaseAdmin
      .from("api_endpoints")
      .select("id, name, description, url, method, auth_type, created_at")
      .eq("project_id", req.projectId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching endpoints:", error);
      return res.status(500).json({
        error: { code: "FETCH_ERROR", message: "Failed to fetch endpoints" },
      });
    }

    res.json({
      endpoints: endpoints.map((e) => ({
        id: e.id,
        name: e.name,
        description: e.description,
        url: e.url,
        method: e.method,
        authType: e.auth_type,
        createdAt: e.created_at,
      })),
    });
  } catch (error) {
    console.error("Endpoints GET error:", error);
    res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Internal server error" },
    });
  }
});

/**
 * GET /api/endpoints/:id
 * Get a single endpoint by ID (credentials are NOT returned)
 */
endpointsRouter.get(
  "/:id",
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;

      const { data: endpoint, error } = await supabaseAdmin
        .from("api_endpoints")
        .select("*")
        .eq("id", id)
        .eq("project_id", req.projectId)
        .single();

      if (error || !endpoint) {
        return res.status(404).json({
          error: { code: "NOT_FOUND", message: "Endpoint not found" },
        });
      }

      // Return endpoint without decrypted auth config (security)
      res.json({
        endpoint: {
          id: endpoint.id,
          name: endpoint.name,
          description: endpoint.description,
          url: endpoint.url,
          method: endpoint.method,
          authType: endpoint.auth_type,
          // Only return header name for API key auth, not the actual credentials
          authConfig: endpoint.auth_type === "api_key" && endpoint.auth_config
            ? { apiKeyHeader: decryptAuthConfig(endpoint.auth_config as string).apiKeyHeader }
            : undefined,
          createdAt: endpoint.created_at,
          updatedAt: endpoint.updated_at,
        },
      });
    } catch (error) {
      console.error("Endpoint GET by ID error:", error);
      res.status(500).json({
        error: { code: "INTERNAL_ERROR", message: "Internal server error" },
      });
    }
  }
);

/**
 * POST /api/endpoints
 * Create a new API endpoint
 */
endpointsRouter.post("/", async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Check endpoint limit
    const { count } = await supabaseAdmin
      .from("api_endpoints")
      .select("*", { count: "exact", head: true })
      .eq("project_id", req.projectId);

    if (count !== null && count >= MAX_ENDPOINTS_PER_PROJECT) {
      return res.status(400).json({
        error: {
          code: "LIMIT_REACHED",
          message: `Maximum ${MAX_ENDPOINTS_PER_PROJECT} API endpoints per project`,
        },
      });
    }

    // Validate input
    const validation = createEndpointSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: validation.error.errors[0].message,
          details: validation.error.errors,
        },
      });
    }

    const { name, description, url, method, authType, authConfig } =
      validation.data;

    // Validate auth config based on auth type
    if (authType === "api_key" && (!authConfig?.apiKey || authConfig.apiKey.trim() === "")) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "API key is required for API Key authentication",
        },
      });
    }

    if (authType === "bearer" && (!authConfig?.bearerToken || authConfig.bearerToken.trim() === "")) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Token is required for Bearer authentication",
        },
      });
    }

    // Encrypt auth config if provided
    let encryptedAuthConfig: string | null = null;
    if (authConfig && authType !== "none") {
      encryptedAuthConfig = encryptAuthConfig(authConfig);
    }

    // Create endpoint
    const { data: endpoint, error: createError } = await supabaseAdmin
      .from("api_endpoints")
      .insert({
        project_id: req.projectId,
        name,
        description,
        url,
        method,
        auth_type: authType,
        auth_config: encryptedAuthConfig,
      })
      .select()
      .single();

    if (createError) {
      console.error("Error creating endpoint:", createError);
      return res.status(500).json({
        error: { code: "CREATE_ERROR", message: "Failed to create endpoint" },
      });
    }

    res.status(201).json({
      endpoint: {
        id: endpoint.id,
        name: endpoint.name,
        description: endpoint.description,
        url: endpoint.url,
        method: endpoint.method,
        authType: endpoint.auth_type,
        createdAt: endpoint.created_at,
      },
    });
  } catch (error) {
    console.error("Endpoint POST error:", error);
    res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Internal server error" },
    });
  }
});

/**
 * PUT /api/endpoints/:id
 * Update an existing endpoint
 */
endpointsRouter.put(
  "/:id",
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;

      // Check if endpoint exists and belongs to user's project
      const { data: existingEndpoint, error: checkError } = await supabaseAdmin
        .from("api_endpoints")
        .select("id, auth_type, auth_config")
        .eq("id", id)
        .eq("project_id", req.projectId)
        .single();

      if (checkError || !existingEndpoint) {
        return res.status(404).json({
          error: { code: "NOT_FOUND", message: "Endpoint not found" },
        });
      }

      // Validate input
      const validation = updateEndpointSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          error: {
            code: "VALIDATION_ERROR",
            message: validation.error.errors[0].message,
            details: validation.error.errors,
          },
        });
      }

      const { name, description, url, method, authType, authConfig } =
        validation.data;

      // Build update object
      const updateData: Record<string, unknown> = {};

      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (url !== undefined) updateData.url = url;
      if (method !== undefined) updateData.method = method;

      // Handle auth type and config changes
      if (authType !== undefined) {
        updateData.auth_type = authType;

        // If auth type changed to 'none', clear auth config
        if (authType === "none") {
          updateData.auth_config = null;
        } else if (authConfig) {
          // Validate auth config based on auth type
          if (authType === "api_key" && (!authConfig.apiKey || authConfig.apiKey.trim() === "")) {
            return res.status(400).json({
              error: {
                code: "VALIDATION_ERROR",
                message: "API key is required for API Key authentication",
              },
            });
          }

          if (authType === "bearer" && (!authConfig.bearerToken || authConfig.bearerToken.trim() === "")) {
            return res.status(400).json({
              error: {
                code: "VALIDATION_ERROR",
                message: "Token is required for Bearer authentication",
              },
            });
          }

          updateData.auth_config = encryptAuthConfig(authConfig);
        }
      } else if (authConfig) {
        // Auth config provided but auth type not changed - merge with existing type
        const currentAuthType = existingEndpoint.auth_type;
        if (currentAuthType !== "none") {
          updateData.auth_config = encryptAuthConfig(authConfig);
        }
      }

      updateData.updated_at = new Date().toISOString();

      // Update endpoint
      const { data: endpoint, error: updateError } = await supabaseAdmin
        .from("api_endpoints")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (updateError) {
        console.error("Error updating endpoint:", updateError);
        return res.status(500).json({
          error: { code: "UPDATE_ERROR", message: "Failed to update endpoint" },
        });
      }

      res.json({
        endpoint: {
          id: endpoint.id,
          name: endpoint.name,
          description: endpoint.description,
          url: endpoint.url,
          method: endpoint.method,
          authType: endpoint.auth_type,
          createdAt: endpoint.created_at,
          updatedAt: endpoint.updated_at,
        },
      });
    } catch (error) {
      console.error("Endpoint PUT error:", error);
      res.status(500).json({
        error: { code: "INTERNAL_ERROR", message: "Internal server error" },
      });
    }
  }
);

/**
 * DELETE /api/endpoints/:id
 * Delete an endpoint
 */
endpointsRouter.delete(
  "/:id",
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;

      // Check if endpoint exists and belongs to user's project
      const { data: existingEndpoint, error: checkError } = await supabaseAdmin
        .from("api_endpoints")
        .select("id")
        .eq("id", id)
        .eq("project_id", req.projectId)
        .single();

      if (checkError || !existingEndpoint) {
        return res.status(404).json({
          error: { code: "NOT_FOUND", message: "Endpoint not found" },
        });
      }

      // Delete the endpoint
      const { error: deleteError } = await supabaseAdmin
        .from("api_endpoints")
        .delete()
        .eq("id", id);

      if (deleteError) {
        console.error("Error deleting endpoint:", deleteError);
        return res.status(500).json({
          error: { code: "DELETE_ERROR", message: "Failed to delete endpoint" },
        });
      }

      res.status(204).send();
    } catch (error) {
      console.error("Endpoint DELETE error:", error);
      res.status(500).json({
        error: { code: "INTERNAL_ERROR", message: "Internal server error" },
      });
    }
  }
);

/**
 * POST /api/endpoints/:id/test
 * Test an endpoint configuration
 */
endpointsRouter.post(
  "/:id/test",
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;

      // Get the endpoint with encrypted auth config
      const { data: endpoint, error } = await supabaseAdmin
        .from("api_endpoints")
        .select("*")
        .eq("id", id)
        .eq("project_id", req.projectId)
        .single();

      if (error || !endpoint) {
        return res.status(404).json({
          error: { code: "NOT_FOUND", message: "Endpoint not found" },
        });
      }

      // Execute the test
      const testResult = await executeEndpointTest(endpoint);

      res.json(testResult);
    } catch (error) {
      console.error("Endpoint test error:", error);
      res.status(500).json({
        error: { code: "INTERNAL_ERROR", message: "Internal server error" },
      });
    }
  }
);

/**
 * Execute a test request to an endpoint
 */
async function executeEndpointTest(endpoint: {
  url: string;
  method: string;
  auth_type: string;
  auth_config: string | null;
}): Promise<{
  success: boolean;
  status?: number;
  statusText?: string;
  responseTime: number;
  error?: string;
}> {
  // Replace URL placeholders with test values
  const testUrl = endpoint.url.replace(/\{(\w+)\}/g, "test_value");

  // Build headers
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "User-Agent": "ChatbotPlatform/1.0",
  };

  // Add auth headers based on auth type
  if (endpoint.auth_type !== "none" && endpoint.auth_config) {
    try {
      const authConfig = decryptAuthConfig(endpoint.auth_config);

      switch (endpoint.auth_type) {
        case "api_key":
          if (authConfig.apiKey) {
            const headerName = (authConfig.apiKeyHeader as string) || "X-API-Key";
            headers[headerName] = authConfig.apiKey as string;
          }
          break;
        case "bearer":
          if (authConfig.bearerToken) {
            headers["Authorization"] = `Bearer ${authConfig.bearerToken}`;
          }
          break;
      }
    } catch (decryptError) {
      console.error("Failed to decrypt auth config:", decryptError);
      return {
        success: false,
        responseTime: 0,
        error: "Failed to decrypt authentication credentials",
      };
    }
  }

  const startTime = Date.now();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    const response = await fetch(testUrl, {
      method: endpoint.method,
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const responseTime = Date.now() - startTime;

    if (response.ok) {
      return {
        success: true,
        status: response.status,
        statusText: response.statusText,
        responseTime,
      };
    } else {
      // Request completed but returned error status
      let errorMessage = `HTTP ${response.status}`;

      if (response.status === 401 || response.status === 403) {
        errorMessage = "Authentication failed - check credentials";
      } else if (response.status === 404) {
        errorMessage = "Endpoint not found - check URL";
      } else if (response.status >= 500) {
        errorMessage = "Server error - the external API returned an error";
      }

      return {
        success: false,
        status: response.status,
        statusText: response.statusText,
        responseTime,
        error: errorMessage,
      };
    }
  } catch (fetchError) {
    const responseTime = Date.now() - startTime;

    if (fetchError instanceof Error) {
      if (fetchError.name === "AbortError") {
        return {
          success: false,
          responseTime,
          error: "Connection timed out (10s limit)",
        };
      }

      // Network errors
      if (fetchError.message.includes("ENOTFOUND") || fetchError.message.includes("getaddrinfo")) {
        return {
          success: false,
          responseTime,
          error: "Could not resolve hostname - check URL",
        };
      }

      if (fetchError.message.includes("ECONNREFUSED")) {
        return {
          success: false,
          responseTime,
          error: "Connection refused - server may be down",
        };
      }

      return {
        success: false,
        responseTime,
        error: `Connection failed: ${fetchError.message}`,
      };
    }

    return {
      success: false,
      responseTime,
      error: "Connection failed",
    };
  }
}

/**
 * Extract URL parameters from a URL template
 * Used by chat-engine for tool conversion
 */
export function extractUrlParams(url: string): string[] {
  const matches = url.match(/\{(\w+)\}/g) || [];
  return matches.map((m) => m.slice(1, -1));
}

/**
 * Get endpoint with decrypted auth config (for internal use by chat-engine)
 * This should only be called from the backend, never exposed via API
 */
export async function getEndpointWithAuth(
  projectId: string,
  endpointId: string
): Promise<{
  id: string;
  name: string;
  description: string;
  url: string;
  method: string;
  authType: string;
  authConfig: Record<string, unknown> | null;
} | null> {
  const { data: endpoint, error } = await supabaseAdmin
    .from("api_endpoints")
    .select("*")
    .eq("id", endpointId)
    .eq("project_id", projectId)
    .single();

  if (error || !endpoint) {
    return null;
  }

  let authConfig: Record<string, unknown> | null = null;
  if (endpoint.auth_config && endpoint.auth_type !== "none") {
    try {
      authConfig = decryptAuthConfig(endpoint.auth_config as string);
    } catch {
      console.error("Failed to decrypt auth config for endpoint:", endpointId);
    }
  }

  return {
    id: endpoint.id,
    name: endpoint.name,
    description: endpoint.description,
    url: endpoint.url,
    method: endpoint.method,
    authType: endpoint.auth_type,
    authConfig,
  };
}

/**
 * Get all endpoints for a project (for internal use by chat-engine)
 */
export async function getProjectEndpoints(projectId: string) {
  const { data: endpoints, error } = await supabaseAdmin
    .from("api_endpoints")
    .select("*")
    .eq("project_id", projectId);

  if (error || !endpoints) {
    return [];
  }

  return endpoints.map((endpoint) => {
    let authConfig: Record<string, unknown> | null = null;
    if (endpoint.auth_config && endpoint.auth_type !== "none") {
      try {
        authConfig = decryptAuthConfig(endpoint.auth_config as string);
      } catch {
        console.error("Failed to decrypt auth config for endpoint:", endpoint.id);
      }
    }

    return {
      id: endpoint.id,
      name: endpoint.name,
      description: endpoint.description,
      url: endpoint.url,
      method: endpoint.method,
      authType: endpoint.auth_type,
      authConfig,
    };
  });
}
