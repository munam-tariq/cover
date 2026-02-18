/**
 * MCP Server Route Handler
 *
 * Implements the Model Context Protocol (MCP) HTTP transport for AI platform integration.
 * Users can add this MCP to Cursor, Claude Code, etc. via simple config:
 *
 * {
 *   "type": "http",
 *   "url": "https://api.yourproduct.com/mcp",
 *   "headers": {
 *     "X-API-Key": "ck_your_api_key_here"
 *   }
 * }
 *
 * The API key provides account-level access to all projects.
 */
import { Router, Request, Response } from "express";
import { randomUUID } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

import { supabaseAdmin } from "../lib/supabase";
import { encryptAuthConfig } from "../services/encryption";
import { clearDomainCache } from "../middleware/domain-whitelist";
import {
  createProcessingPipeline,
  type DocumentMetadata,
} from "../services/rag";
import { processChat } from "../services/chat-engine";
import { verifyApiKey, isValidApiKeyFormat } from "../services/api-key";

export const mcpRouter = Router();

// Store active sessions (account-level, not project-level)
const sessions: Record<
  string,
  {
    transport: StreamableHTTPServerTransport;
    userId: string;
  }
> = {};

// Constants
const WIDGET_CDN_URL =
  process.env.CDN_URL ||
  "https://hynaqwwofkpaafvlckdm.supabase.co/storage/v1/object/public/assets";
const API_URL = process.env.API_URL || "https://api.frontface.app";
const MAX_SOURCES_PER_PROJECT = 20;
const MAX_ENDPOINTS_PER_PROJECT = 10;
const MAX_TEXT_LENGTH = 100000;

/**
 * Validates API key from X-API-Key header and returns user info
 */
async function validateApiKeyAuth(
  req: Request
): Promise<{ userId: string } | null> {
  const apiKey = req.headers["x-api-key"] as string;

  if (!apiKey) {
    return null;
  }

  // Validate key format
  if (!isValidApiKeyFormat(apiKey)) {
    return null;
  }

  // Extract prefix for lookup (ck_ + first 8 chars + ...)
  const prefix = `${apiKey.substring(0, 11)}...`;

  // Find API key by prefix (active keys only)
  const { data: keyRecord, error: keyError } = await supabaseAdmin
    .from("api_keys")
    .select("id, user_id, key_hash")
    .eq("key_prefix", prefix)
    .is("revoked_at", null)
    .single();

  if (keyError || !keyRecord) {
    return null;
  }

  // Verify the full key against the hash
  const isValid = await verifyApiKey(apiKey, keyRecord.key_hash);
  if (!isValid) {
    return null;
  }

  // Update last_used_at (fire and forget)
  void supabaseAdmin
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", keyRecord.id);

  return {
    userId: keyRecord.user_id,
  };
}

/**
 * Validates that a user owns a specific project
 */
async function validateProjectOwnership(
  userId: string,
  projectId: string
): Promise<boolean> {
  // Validate UUID format
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(projectId)) {
    return false;
  }

  const { data: project, error } = await supabaseAdmin
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("user_id", userId)
    .is("deleted_at", null)
    .single();

  return !error && !!project;
}

/**
 * Helper to resolve project ID - returns the project ID or an error response
 */
async function resolveProjectId(
  userId: string,
  projectId: string | undefined
): Promise<{ projectId: string } | { error: string }> {
  if (projectId) {
    // Validate ownership
    const isOwner = await validateProjectOwnership(userId, projectId);
    if (!isOwner) {
      return { error: "Project not found or access denied" };
    }
    return { projectId };
  }

  // No project_id provided - try to find the default (single) project
  const { data: projects } = await supabaseAdmin
    .from("projects")
    .select("id")
    .eq("user_id", userId)
    .is("deleted_at", null);

  if (!projects || projects.length === 0) {
    return { error: "No projects found. Create one first with create_project." };
  }
  if (projects.length > 1) {
    return { error: "Multiple projects found. Please specify project_id. Use list_projects to see available projects." };
  }
  return { projectId: projects[0].id };
}

/**
 * Create an MCP server with all tools registered
 * Account-level access - tools that need project context require project_id parameter
 */
function createMcpServer(userId: string): McpServer {
  const server = new McpServer({
    name: "frontface",
    version: "1.0.0",
  });

  // ===== TOOL: get_project_info =====
  server.tool(
    "get_project_info",
    "Get information about your chatbot project including name, settings, and statistics.",
    {
      project_id: z
        .string()
        .uuid()
        .optional()
        .describe("Project ID. If not specified and you have only one project, that project will be used."),
    },
    async ({ project_id }) => {
      // Resolve project ID
      const resolved = await resolveProjectId(userId, project_id);
      if ("error" in resolved) {
        return {
          content: [{ type: "text", text: JSON.stringify({ error: resolved.error }) }],
          isError: true,
        };
      }
      const targetProjectId = resolved.projectId;

      const { data: project, error } = await supabaseAdmin
        .from("projects")
        .select("id, name, settings, allowed_domains, created_at")
        .eq("id", targetProjectId)
        .single();

      if (error || !project) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ error: "Project not found" }),
            },
          ],
          isError: true,
        };
      }

      // Get counts
      const [{ count: knowledgeCount }, { count: endpointCount }] =
        await Promise.all([
          supabaseAdmin
            .from("knowledge_sources")
            .select("*", { count: "exact", head: true })
            .eq("project_id", targetProjectId),
          supabaseAdmin
            .from("api_endpoints")
            .select("*", { count: "exact", head: true })
            .eq("project_id", targetProjectId),
        ]);

      const settings = (project.settings as Record<string, unknown>) || {};
      const allowedDomains = (project.allowed_domains as string[]) || [];

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                project_id: project.id,
                name: project.name,
                system_prompt: settings.systemPrompt || null,
                welcome_message: settings.welcomeMessage || null,
                allowed_domains: allowedDomains,
                domain_whitelist_enabled: allowedDomains.length > 0,
                knowledge_sources_count: knowledgeCount || 0,
                api_endpoints_count: endpointCount || 0,
                created_at: project.created_at,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  // ===== TOOL: update_project_settings =====
  server.tool(
    "update_project_settings",
    "Update your chatbot project name, system prompt, or welcome message.",
    {
      project_id: z
        .string()
        .uuid()
        .optional()
        .describe("Project ID. If not specified and you have only one project, that project will be used."),
      name: z
        .string()
        .min(1)
        .max(100)
        .optional()
        .describe("New name for the chatbot project"),
      system_prompt: z
        .string()
        .max(2000)
        .optional()
        .describe(
          "Custom system prompt that defines how the chatbot behaves and responds"
        ),
      welcome_message: z
        .string()
        .max(500)
        .optional()
        .describe("The greeting message shown when users open the chat widget"),
    },
    async ({ project_id, name, system_prompt, welcome_message }) => {
      // Resolve project ID
      const resolved = await resolveProjectId(userId, project_id);
      if ("error" in resolved) {
        return {
          content: [{ type: "text", text: JSON.stringify({ error: resolved.error }) }],
          isError: true,
        };
      }
      const targetProjectId = resolved.projectId;

      // Get current settings
      const { data: project, error: fetchError } = await supabaseAdmin
        .from("projects")
        .select("settings")
        .eq("id", targetProjectId)
        .single();

      if (fetchError) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ error: "Failed to fetch project" }),
            },
          ],
          isError: true,
        };
      }

      const currentSettings =
        (project?.settings as Record<string, unknown>) || {};
      const updates: Record<string, unknown> = {};

      if (name !== undefined) {
        updates.name = name;
      }

      const newSettings = { ...currentSettings };
      if (system_prompt !== undefined) {
        newSettings.systemPrompt = system_prompt;
      }
      if (welcome_message !== undefined) {
        newSettings.welcomeMessage = welcome_message;
      }

      updates.settings = newSettings;
      updates.updated_at = new Date().toISOString();

      const { error: updateError } = await supabaseAdmin
        .from("projects")
        .update(updates)
        .eq("id", targetProjectId);

      if (updateError) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                error: "Failed to update project",
                details: updateError.message,
              }),
            },
          ],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              message: "Project settings updated successfully",
              updated_fields: Object.keys(updates).filter(
                (k) => k !== "updated_at"
              ),
            }),
          },
        ],
      };
    }
  );

  // ===== TOOL: list_projects =====
  server.tool(
    "list_projects",
    "List all chatbot projects for your account. Returns project IDs, names, and stats. Use the project_id parameter in other tools to work with specific projects.",
    {},
    async () => {
      // Fetch all active projects for this user
      const { data: projects, error } = await supabaseAdmin
        .from("projects")
        .select("id, name, settings, created_at")
        .eq("user_id", userId)
        .is("deleted_at", null)
        .order("created_at", { ascending: true });

      if (error) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ error: "Failed to fetch projects" }),
            },
          ],
          isError: true,
        };
      }

      // Get counts for each project
      const projectsWithStats = await Promise.all(
        (projects || []).map(async (project) => {
          const [{ count: knowledgeCount }, { count: endpointCount }] =
            await Promise.all([
              supabaseAdmin
                .from("knowledge_sources")
                .select("*", { count: "exact", head: true })
                .eq("project_id", project.id),
              supabaseAdmin
                .from("api_endpoints")
                .select("*", { count: "exact", head: true })
                .eq("project_id", project.id),
            ]);

          const settings = (project.settings as Record<string, unknown>) || {};

          return {
            id: project.id,
            name: project.name,
            system_prompt: settings.systemPrompt || null,
            knowledge_sources_count: knowledgeCount || 0,
            api_endpoints_count: endpointCount || 0,
            created_at: project.created_at,
          };
        })
      );

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                count: projectsWithStats.length,
                projects: projectsWithStats,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  // ===== TOOL: create_project =====
  server.tool(
    "create_project",
    "Create a new chatbot project. Use this to set up additional chatbots for different purposes (e.g., sales bot, support bot, etc.).",
    {
      name: z
        .string()
        .min(1)
        .max(50)
        .describe("Name for the new project (e.g., 'Sales Bot', 'Support Bot')"),
      system_prompt: z
        .string()
        .max(2000)
        .optional()
        .describe(
          "Custom system prompt that defines how this chatbot behaves and responds"
        ),
      allowed_domains: z
        .array(z.string())
        .optional()
        .describe(
          "Domains where this chatbot can be embedded. Example: ['example.com', '*.example.com']. " +
          "Leave empty to allow all domains (less secure). Use wildcards for subdomains."
        ),
    },
    async ({ name, system_prompt, allowed_domains }) => {
      // Build settings object
      const settings: Record<string, unknown> = {};
      if (system_prompt) {
        settings.systemPrompt = system_prompt.trim();
      }

      // Validate and normalize allowed domains
      let normalizedDomains: string[] = [];
      if (allowed_domains && allowed_domains.length > 0) {
        const domainRegex = /^(\*\.)?[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/i;
        for (const domain of allowed_domains) {
          const trimmed = domain.trim().toLowerCase();
          if (trimmed && domainRegex.test(trimmed)) {
            normalizedDomains.push(trimmed);
          }
        }
        normalizedDomains = [...new Set(normalizedDomains)]; // Remove duplicates
      }

      // Create project
      const { data: project, error: createError } = await supabaseAdmin
        .from("projects")
        .insert({
          user_id: userId,
          name: name.trim(),
          settings,
          allowed_domains: normalizedDomains,
        })
        .select("id, name, settings, allowed_domains, created_at")
        .single();

      if (createError || !project) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                error: "Failed to create project",
                details: createError?.message,
              }),
            },
          ],
          isError: true,
        };
      }

      const projectDomains = (project.allowed_domains as string[]) || [];

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: true,
                project: {
                  id: project.id,
                  name: project.name,
                  system_prompt: (project.settings as Record<string, unknown>)?.systemPrompt || null,
                  allowed_domains: projectDomains,
                  domain_whitelist_enabled: projectDomains.length > 0,
                  created_at: project.created_at,
                },
                message: "Project created successfully. Use this project_id with other tools to manage this chatbot.",
                security_note: projectDomains.length === 0
                  ? "No domain whitelist configured. Widget can be used on any site. Use set_allowed_domains to restrict."
                  : `Widget restricted to: ${projectDomains.join(', ')}`,
                next_steps: [
                  "Add knowledge sources with upload_knowledge (project_id: " + project.id + ")",
                  "Configure API endpoints with add_api_endpoint",
                  "Get embed code with get_embed_code",
                ],
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  // ===== TOOL: set_allowed_domains =====
  server.tool(
    "set_allowed_domains",
    "Configure which domains can embed the chatbot widget. This is a security feature to prevent unauthorized usage of your chatbot on other websites.",
    {
      project_id: z
        .string()
        .uuid()
        .optional()
        .describe("Project ID. If not specified and you have only one project, that project will be used."),
      domains: z
        .array(z.string())
        .describe(
          "List of allowed domains. Examples: " +
          "['mysite.com'] - only mysite.com and www.mysite.com, " +
          "['*.mysite.com'] - all subdomains, " +
          "[] - allow ALL domains (removes restriction, less secure)"
        ),
    },
    async ({ project_id, domains }) => {
      // Resolve project ID
      const resolved = await resolveProjectId(userId, project_id);
      if ("error" in resolved) {
        return {
          content: [{ type: "text", text: JSON.stringify({ error: resolved.error }) }],
          isError: true,
        };
      }
      const targetProjectId = resolved.projectId;

      // Validate and normalize domains
      const domainRegex = /^(\*\.)?[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/i;
      const validatedDomains: string[] = [];

      for (const domain of domains) {
        if (typeof domain !== 'string') continue;
        const trimmed = domain.trim().toLowerCase();
        if (!trimmed) continue;

        if (!domainRegex.test(trimmed)) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  error: `Invalid domain format: ${domain}. Use format like 'example.com' or '*.example.com'`,
                }),
              },
            ],
            isError: true,
          };
        }
        validatedDomains.push(trimmed);
      }

      // Remove duplicates
      const uniqueDomains = [...new Set(validatedDomains)];

      // Update project
      const { data: project, error: updateError } = await supabaseAdmin
        .from("projects")
        .update({ allowed_domains: uniqueDomains })
        .eq("id", targetProjectId)
        .select("id, allowed_domains")
        .single();

      if (updateError || !project) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                error: "Failed to update allowed domains",
                details: updateError?.message,
              }),
            },
          ],
          isError: true,
        };
      }

      const updatedDomains = (project.allowed_domains as string[]) || [];

      // Clear the domain cache for this project
      clearDomainCache(targetProjectId);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: true,
                allowed_domains: updatedDomains,
                domain_whitelist_enabled: updatedDomains.length > 0,
                message: updatedDomains.length > 0
                  ? `Domain whitelist updated. Widget restricted to: ${updatedDomains.join(', ')}`
                  : 'Domain whitelist disabled. Widget can now be embedded on any domain.',
                note: "Only localhost is always allowed for development. Add preview domains (e.g., *.vercel.app) explicitly if needed.",
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  // ===== TOOL: list_knowledge =====
  server.tool(
    "list_knowledge",
    "List all knowledge sources in your chatbot. Knowledge sources contain the information your chatbot uses to answer questions.",
    {
      project_id: z
        .string()
        .uuid()
        .optional()
        .describe("Project ID. If not specified and you have only one project, that project will be used."),
    },
    async ({ project_id }) => {
      // Resolve project ID
      const resolved = await resolveProjectId(userId, project_id);
      if ("error" in resolved) {
        return {
          content: [{ type: "text", text: JSON.stringify({ error: resolved.error }) }],
          isError: true,
        };
      }
      const targetProjectId = resolved.projectId;

      const { data: sources, error } = await supabaseAdmin
        .from("knowledge_sources")
        .select("id, name, type, status, chunk_count, error, created_at")
        .eq("project_id", targetProjectId)
        .order("created_at", { ascending: false });

      if (error) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                error: "Failed to fetch knowledge sources",
              }),
            },
          ],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                project_id: targetProjectId,
                count: sources?.length || 0,
                max_allowed: MAX_SOURCES_PER_PROJECT,
                sources: (sources || []).map((s) => ({
                  id: s.id,
                  name: s.name,
                  type: s.type,
                  status: s.status,
                  chunk_count: s.chunk_count || 0,
                  error: s.error,
                  created_at: s.created_at,
                })),
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  // ===== TOOL: upload_knowledge =====
  server.tool(
    "upload_knowledge",
    "Add text content as a knowledge source. The chatbot will search this content when answering questions. Use for FAQs, product info, policies, documentation, etc.",
    {
      project_id: z
        .string()
        .uuid()
        .optional()
        .describe("Project ID. If not specified and you have only one project, that project will be used."),
      name: z
        .string()
        .min(1)
        .max(100)
        .describe("Name for this knowledge source (e.g., 'FAQ', 'Return Policy', 'Product Catalog')"),
      content: z
        .string()
        .min(1)
        .max(MAX_TEXT_LENGTH)
        .describe(
          "The text content to add. Can be long-form text, Q&A pairs, documentation, etc."
        ),
    },
    async ({ project_id, name, content }) => {
      // Resolve project ID
      const resolved = await resolveProjectId(userId, project_id);
      if ("error" in resolved) {
        return {
          content: [{ type: "text", text: JSON.stringify({ error: resolved.error }) }],
          isError: true,
        };
      }
      const targetProjectId = resolved.projectId;

      // Check limit
      const { count } = await supabaseAdmin
        .from("knowledge_sources")
        .select("*", { count: "exact", head: true })
        .eq("project_id", targetProjectId);

      if (count !== null && count >= MAX_SOURCES_PER_PROJECT) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                error: `Maximum ${MAX_SOURCES_PER_PROJECT} knowledge sources per project. Delete existing sources first.`,
              }),
            },
          ],
          isError: true,
        };
      }

      // Create knowledge source
      const { data: source, error: createError } = await supabaseAdmin
        .from("knowledge_sources")
        .insert({
          project_id: targetProjectId,
          name,
          type: "text",
          content,
          status: "processing",
        })
        .select()
        .single();

      if (createError || !source) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                error: "Failed to create knowledge source",
                details: createError?.message,
              }),
            },
          ],
          isError: true,
        };
      }

      // Process in background
      processKnowledgeInBackground(source.id, name, content);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              source_id: source.id,
              name: source.name,
              status: "processing",
              message:
                "Knowledge is being processed. It will be available for the chatbot shortly (usually 10-30 seconds).",
            }),
          },
        ],
      };
    }
  );

  // ===== TOOL: delete_knowledge =====
  server.tool(
    "delete_knowledge",
    "Delete a knowledge source and all its indexed content.",
    {
      source_id: z.string().uuid().describe("The ID of the knowledge source to delete"),
    },
    async ({ source_id }) => {
      // Get the source and verify ownership through project
      const { data: source, error: fetchError } = await supabaseAdmin
        .from("knowledge_sources")
        .select("id, file_path, project_id")
        .eq("id", source_id)
        .single();

      if (fetchError || !source) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                error: "Knowledge source not found",
              }),
            },
          ],
          isError: true,
        };
      }

      // Validate ownership of the project
      const isOwner = await validateProjectOwnership(userId, source.project_id);
      if (!isOwner) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                error: "Knowledge source not found or access denied",
              }),
            },
          ],
          isError: true,
        };
      }

      // Delete file from storage if exists
      if (source.file_path) {
        await supabaseAdmin.storage
          .from("knowledge-files")
          .remove([source.file_path]);
      }

      // Delete chunks first
      await supabaseAdmin
        .from("knowledge_chunks")
        .delete()
        .eq("source_id", source_id);

      // Delete source
      const { error: deleteError } = await supabaseAdmin
        .from("knowledge_sources")
        .delete()
        .eq("id", source_id);

      if (deleteError) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                error: "Failed to delete knowledge source",
                details: deleteError.message,
              }),
            },
          ],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              message: "Knowledge source deleted successfully",
            }),
          },
        ],
      };
    }
  );

  // ===== TOOL: list_api_endpoints =====
  server.tool(
    "list_api_endpoints",
    "List all configured API endpoints. These are external APIs that the chatbot can call to fetch real-time data.",
    {
      project_id: z
        .string()
        .uuid()
        .optional()
        .describe("Project ID. If not specified and you have only one project, that project will be used."),
    },
    async ({ project_id }) => {
      // Resolve project ID
      const resolved = await resolveProjectId(userId, project_id);
      if ("error" in resolved) {
        return {
          content: [{ type: "text", text: JSON.stringify({ error: resolved.error }) }],
          isError: true,
        };
      }
      const targetProjectId = resolved.projectId;

      const { data: endpoints, error } = await supabaseAdmin
        .from("api_endpoints")
        .select("id, name, description, url, method, auth_type, created_at")
        .eq("project_id", targetProjectId)
        .order("created_at", { ascending: false });

      if (error) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ error: "Failed to fetch API endpoints" }),
            },
          ],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                project_id: targetProjectId,
                count: endpoints?.length || 0,
                max_allowed: MAX_ENDPOINTS_PER_PROJECT,
                endpoints: (endpoints || []).map((e) => ({
                  id: e.id,
                  name: e.name,
                  description: e.description,
                  url: e.url,
                  method: e.method,
                  auth_type: e.auth_type,
                  created_at: e.created_at,
                })),
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  // ===== TOOL: add_api_endpoint =====
  server.tool(
    "add_api_endpoint",
    "Configure an external API endpoint that the chatbot can call for real-time data. Use {param} syntax in URL for dynamic values (e.g., /orders/{order_id}).",
    {
      project_id: z
        .string()
        .uuid()
        .optional()
        .describe("Project ID. If not specified and you have only one project, that project will be used."),
      name: z
        .string()
        .min(1)
        .max(100)
        .describe("Name for this endpoint (e.g., 'Order Status', 'Product Inventory')"),
      description: z
        .string()
        .min(1)
        .max(500)
        .describe(
          "When to use this API. Be specific about what questions should trigger it. Example: 'Get order status. Use when customer asks about their order, shipping, or delivery. Requires order_id.'"
        ),
      url: z
        .string()
        .url()
        .describe(
          "API URL. Use {param} for dynamic values. Example: 'https://api.store.com/orders/{order_id}'"
        ),
      method: z
        .enum(["GET", "POST"])
        .default("GET")
        .describe("HTTP method (default: GET)"),
      auth_type: z
        .enum(["none", "api_key", "bearer"])
        .default("none")
        .describe("Authentication type (default: none)"),
      api_key: z
        .string()
        .optional()
        .describe("API key value (required if auth_type is api_key)"),
      api_key_header: z
        .string()
        .default("X-API-Key")
        .optional()
        .describe("Header name for API key (default: X-API-Key)"),
      bearer_token: z
        .string()
        .optional()
        .describe("Bearer token value (required if auth_type is bearer)"),
    },
    async ({
      project_id,
      name,
      description,
      url,
      method,
      auth_type,
      api_key,
      api_key_header,
      bearer_token,
    }) => {
      // Resolve project ID
      const resolved = await resolveProjectId(userId, project_id);
      if ("error" in resolved) {
        return {
          content: [{ type: "text", text: JSON.stringify({ error: resolved.error }) }],
          isError: true,
        };
      }
      const targetProjectId = resolved.projectId;

      // Check limit
      const { count } = await supabaseAdmin
        .from("api_endpoints")
        .select("*", { count: "exact", head: true })
        .eq("project_id", targetProjectId);

      if (count !== null && count >= MAX_ENDPOINTS_PER_PROJECT) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                error: `Maximum ${MAX_ENDPOINTS_PER_PROJECT} API endpoints per project. Delete existing endpoints first.`,
              }),
            },
          ],
          isError: true,
        };
      }

      // Validate auth config
      if (auth_type === "api_key" && !api_key) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                error: "api_key is required when auth_type is 'api_key'",
              }),
            },
          ],
          isError: true,
        };
      }

      if (auth_type === "bearer" && !bearer_token) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                error: "bearer_token is required when auth_type is 'bearer'",
              }),
            },
          ],
          isError: true,
        };
      }

      // Build and encrypt auth config
      let encryptedAuthConfig: string | null = null;
      if (auth_type !== "none") {
        const authConfig: Record<string, string> = {};
        if (auth_type === "api_key" && api_key) {
          authConfig.apiKey = api_key;
          authConfig.apiKeyHeader = api_key_header || "X-API-Key";
        } else if (auth_type === "bearer" && bearer_token) {
          authConfig.bearerToken = bearer_token;
        }
        encryptedAuthConfig = encryptAuthConfig(authConfig);
      }

      // Create endpoint
      const { data: endpoint, error: createError } = await supabaseAdmin
        .from("api_endpoints")
        .insert({
          project_id: targetProjectId,
          name,
          description,
          url,
          method,
          auth_type,
          auth_config: encryptedAuthConfig,
        })
        .select("id, name, description, url, method, auth_type, created_at")
        .single();

      if (createError || !endpoint) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                error: "Failed to create API endpoint",
                details: createError?.message,
              }),
            },
          ],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              endpoint_id: endpoint.id,
              name: endpoint.name,
              message:
                "API endpoint configured. The chatbot will call this API when users ask relevant questions.",
            }),
          },
        ],
      };
    }
  );

  // ===== TOOL: delete_api_endpoint =====
  server.tool(
    "delete_api_endpoint",
    "Delete an API endpoint configuration.",
    {
      endpoint_id: z.string().uuid().describe("The ID of the endpoint to delete"),
    },
    async ({ endpoint_id }) => {
      // Get the endpoint and verify ownership through project
      const { data: endpoint, error: fetchError } = await supabaseAdmin
        .from("api_endpoints")
        .select("id, project_id")
        .eq("id", endpoint_id)
        .single();

      if (fetchError || !endpoint) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                error: "API endpoint not found",
              }),
            },
          ],
          isError: true,
        };
      }

      // Validate ownership of the project
      const isOwner = await validateProjectOwnership(userId, endpoint.project_id);
      if (!isOwner) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                error: "API endpoint not found or access denied",
              }),
            },
          ],
          isError: true,
        };
      }

      const { error: deleteError } = await supabaseAdmin
        .from("api_endpoints")
        .delete()
        .eq("id", endpoint_id);

      if (deleteError) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                error: "Failed to delete API endpoint",
                details: deleteError.message,
              }),
            },
          ],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              message: "API endpoint deleted successfully",
            }),
          },
        ],
      };
    }
  );

  // ===== TOOL: get_embed_code =====
  server.tool(
    "get_embed_code",
    "Get the embed code to add the chatbot widget to a website. Add this script tag just before the closing </body> tag.",
    {
      project_id: z
        .string()
        .uuid()
        .optional()
        .describe("Project ID. If not specified and you have only one project, that project will be used."),
      position: z
        .enum(["bottom-right", "bottom-left"])
        .default("bottom-right")
        .optional()
        .describe("Widget position on the page"),
      primary_color: z
        .string()
        .regex(/^#[0-9A-Fa-f]{6}$/)
        .default("#2563eb")
        .optional()
        .describe("Primary color in hex format (e.g., #2563eb)"),
      title: z
        .string()
        .max(50)
        .default("Chat with us")
        .optional()
        .describe("Title shown in the chat widget header"),
      greeting: z
        .string()
        .max(200)
        .optional()
        .describe("Greeting message shown when chat opens"),
    },
    async ({ project_id, position, primary_color, title, greeting }) => {
      // Resolve project ID
      const resolved = await resolveProjectId(userId, project_id);
      if ("error" in resolved) {
        return {
          content: [{ type: "text", text: JSON.stringify({ error: resolved.error }) }],
          isError: true,
        };
      }
      const targetProjectId = resolved.projectId;

      // Fetch project to get allowed_domains
      const { data: project } = await supabaseAdmin
        .from("projects")
        .select("allowed_domains")
        .eq("id", targetProjectId)
        .single();

      const allowedDomains = (project?.allowed_domains as string[]) || [];

      // Build embed code with optional customizations
      let embedCode = `<script src="${WIDGET_CDN_URL}/widget.js" data-project-id="${targetProjectId}" data-api-url="${API_URL}"`;

      if (position && position !== "bottom-right") {
        embedCode += ` data-position="${position}"`;
      }
      if (primary_color && primary_color !== "#2563eb") {
        embedCode += ` data-color="${primary_color}"`;
      }
      if (title && title !== "Chat with us") {
        embedCode += ` data-title="${title}"`;
      }
      if (greeting) {
        embedCode += ` data-greeting="${greeting}"`;
      }

      embedCode += " async></script>";

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                embed_code: embedCode,
                instructions:
                  "Add this script tag to your HTML just before the closing </body> tag. The chat widget will appear on your page.",
                security_note: allowedDomains.length === 0
                  ? "No domain whitelist configured. Widget can be embedded on any site. Use set_allowed_domains to restrict access."
                  : `Widget restricted to: ${allowedDomains.join(', ')}. Use set_allowed_domains to update.`,
                customization_options: {
                  position: "bottom-right or bottom-left",
                  color: "Any hex color (e.g., #ff5733)",
                  title: "Custom header title",
                  greeting: "Custom greeting message",
                },
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  // ===== TOOL: ask_question =====
  server.tool(
    "ask_question",
    "Send a question to the chatbot and get an answer. Useful for testing your chatbot's responses.",
    {
      project_id: z
        .string()
        .uuid()
        .optional()
        .describe("Project ID. If not specified and you have only one project, that project will be used."),
      question: z
        .string()
        .min(1)
        .max(1000)
        .describe("The question to ask the chatbot"),
    },
    async ({ project_id, question }) => {
      // Resolve project ID
      const resolved = await resolveProjectId(userId, project_id);
      if ("error" in resolved) {
        return {
          content: [{ type: "text", text: JSON.stringify({ error: resolved.error }) }],
          isError: true,
        };
      }
      const targetProjectId = resolved.projectId;

      try {
        // Use the chat engine to process the question
        const result = await processChat({
          projectId: targetProjectId,
          visitorId: `mcp-${userId}`,
          message: question,
          sessionId: undefined, // New session each time for MCP
          source: "mcp",
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  answer: result.response,
                  sources:
                    result.sources.length > 0
                      ? result.sources.map((s) => ({
                          name: s.name,
                          relevance: Math.round(s.relevance * 100) + "%",
                        }))
                      : null,
                  tool_calls:
                    result.toolCalls.length > 0
                      ? result.toolCalls.map((t) => ({
                          tool: t.name,
                          success: t.success,
                        }))
                      : null,
                  processing_time_ms: result.processingTime,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                error: "Failed to process question",
                details:
                  error instanceof Error ? error.message : "Unknown error",
              }),
            },
          ],
          isError: true,
        };
      }
    }
  );

  return server;
}

/**
 * Process knowledge source in background (fire and forget)
 */
async function processKnowledgeInBackground(
  sourceId: string,
  sourceName: string,
  content: string
): Promise<void> {
  try {
    const pipeline = createProcessingPipeline();
    const metadata: DocumentMetadata = {
      name: sourceName,
      type: "text",
    };

    console.log(`[MCP/RAG] Processing ${sourceName}...`);

    const processedChunks = await pipeline.process(
      content,
      metadata,
      (stage, completed, total) => {
        console.log(`[MCP/RAG] ${stage}: ${completed}/${total}`);
      }
    );

    if (processedChunks.length === 0) {
      throw new Error("No valid chunks generated from content");
    }

    // Store chunks
    const chunkRecords = processedChunks.map((chunk) => ({
      source_id: sourceId,
      content: chunk.content,
      context: chunk.context,
      embedding: `[${chunk.embedding.join(",")}]`,
      metadata: {
        index: chunk.index,
        tokenEstimate: chunk.metadata?.tokenEstimate,
      },
    }));

    const { error: insertError } = await supabaseAdmin
      .from("knowledge_chunks")
      .insert(chunkRecords);

    if (insertError) {
      throw new Error(`Failed to insert chunks: ${insertError.message}`);
    }

    // Update source status
    await supabaseAdmin
      .from("knowledge_sources")
      .update({
        status: "ready",
        chunk_count: processedChunks.length,
      })
      .eq("id", sourceId);

    console.log(
      `[MCP/RAG] Successfully processed ${sourceName} (${processedChunks.length} chunks)`
    );
  } catch (error) {
    console.error(`[MCP/RAG] Processing failed for ${sourceId}:`, error);

    await supabaseAdmin
      .from("knowledge_sources")
      .update({
        status: "failed",
        error: error instanceof Error ? error.message : "Processing failed",
      })
      .eq("id", sourceId);
  }
}

/**
 * POST /mcp - Handle MCP messages (JSON-RPC over HTTP)
 * This is the main endpoint for MCP tool calls
 */
mcpRouter.post("/", async (req: Request, res: Response) => {
  try {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;

    // Check for existing session
    if (sessionId && sessions[sessionId]) {
      const session = sessions[sessionId];
      await session.transport.handleRequest(req, res, req.body);
      return;
    }

    // New session - validate auth and check for initialize request
    // Store request id before type narrowing
    const requestId = (req.body as { id?: string | number | null })?.id ?? null;

    if (!sessionId && isInitializeRequest(req.body)) {
      // Validate API key auth
      const auth = await validateApiKeyAuth(req);
      if (!auth) {
        return res.status(401).json({
          jsonrpc: "2.0",
          error: {
            code: -32001,
            message:
              "Unauthorized: Invalid or missing X-API-Key header. Generate an API key from the Settings page.",
          },
          id: requestId,
        });
      }

      // Create new transport and server
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (id) => {
          sessions[id] = {
            transport,
            userId: auth.userId,
          };
          console.log(`[MCP] Session initialized: ${id} for user ${auth.userId}`);
        },
      });

      // Clean up on close
      transport.onclose = () => {
        if (transport.sessionId) {
          delete sessions[transport.sessionId];
          console.log(`[MCP] Session closed: ${transport.sessionId}`);
        }
      };

      // Create MCP server with tools (account-level)
      const mcpServer = createMcpServer(auth.userId);
      await mcpServer.connect(transport);

      // Handle the request
      await transport.handleRequest(req, res, req.body);
      return;
    }

    // Invalid request - no session and not an initialize request
    res.status(400).json({
      jsonrpc: "2.0",
      error: {
        code: -32000,
        message: "Bad Request: Invalid session or missing initialize request",
      },
      id: req.body?.id || null,
    });
  } catch (error) {
    console.error("[MCP] Request error:", error);
    res.status(500).json({
      jsonrpc: "2.0",
      error: {
        code: -32603,
        message: "Internal error",
      },
      id: req.body?.id || null,
    });
  }
});

/**
 * GET /mcp - SSE endpoint for server-to-client messages
 */
mcpRouter.get("/", async (req: Request, res: Response) => {
  const sessionId = req.headers["mcp-session-id"] as string;

  if (!sessionId || !sessions[sessionId]) {
    return res.status(400).json({
      error: "Invalid or missing session",
    });
  }

  const session = sessions[sessionId];
  await session.transport.handleRequest(req, res);
});

/**
 * DELETE /mcp - Close a session
 */
mcpRouter.delete("/", async (req: Request, res: Response) => {
  const sessionId = req.headers["mcp-session-id"] as string;

  if (!sessionId || !sessions[sessionId]) {
    return res.status(400).json({
      error: "Invalid or missing session",
    });
  }

  const session = sessions[sessionId];
  await session.transport.handleRequest(req, res);
});
