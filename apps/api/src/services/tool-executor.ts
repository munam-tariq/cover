/**
 * Tool Executor Service
 *
 * Converts API endpoints to OpenAI-compatible tools and executes them
 * when called by the LLM during chat.
 */

import { isUrlSafeForFetch } from "../lib/url-guard";
import { getProjectEndpoints } from "../routes/endpoints";

import {
  buildEndpointRequest,
  extractEndpointParams,
  findMissingParams,
  substituteUrlParams,
  type JsonValue,
} from "./endpoint-request";
import { toolNameForEndpoint, findEndpointByToolName } from "./tool-naming";

/**
 * OpenAI Tool Definition
 */
interface OpenAITool {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: {
      type: "object";
      properties: Record<
        string,
        {
          type: string;
          description: string;
        }
      >;
      required: string[];
    };
  };
}

/**
 * API Endpoint (with decrypted auth)
 */
export interface ApiEndpoint {
  id: string;
  name: string;
  description: string;
  url: string;
  method: string;
  authType: string;
  authConfig: Record<string, unknown> | null;
  bodyTemplate: JsonValue | null;
}

/**
 * Tool execution result
 */
interface ToolExecutionResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

/**
 * Convert an API endpoint to an OpenAI-compatible tool definition
 */
export function endpointToOpenAITool(endpoint: ApiEndpoint): OpenAITool {
  const params = extractEndpointParams(endpoint);

  // Create properties for each parameter the URL or body template needs
  const properties: Record<string, { type: string; description: string }> = {};

  params.forEach((param) => {
    // Generate a human-readable description from the parameter name
    const description = `The ${param.replace(/_/g, " ")} to look up`;
    properties[param] = {
      type: "string",
      description,
    };
  });

  return {
    type: "function",
    function: {
      name: toolNameForEndpoint(endpoint),
      description: endpoint.description,
      parameters: {
        type: "object",
        properties,
        required: params, // Every param the URL or body template needs
      },
    },
  };
}

/**
 * Load a project's endpoints once, with the tool definitions they produce.
 *
 * The endpoints come back alongside the tools so a chat turn can resolve its
 * tool calls against this same snapshot, rather than re-reading and
 * re-decrypting every endpoint on each call.
 */
export async function getProjectTools(projectId: string): Promise<{
  endpoints: ApiEndpoint[];
  tools: OpenAITool[];
}> {
  const endpoints = await getProjectEndpoints(projectId);
  return { endpoints, tools: endpoints.map(endpointToOpenAITool) };
}

/**
 * Execute a tool call by making the actual API request
 * @param endpoint - The endpoint with decrypted auth config
 * @param args - The arguments passed by the LLM (URL parameters)
 */
export async function executeToolCall(
  endpoint: ApiEndpoint,
  args: Record<string, string>
): Promise<ToolExecutionResult> {
  const missing = findMissingParams(extractEndpointParams(endpoint), args);
  if (missing.length > 0) {
    return {
      success: false,
      error: `Missing required parameter: ${missing.join(", ")}`,
    };
  }

  const url = substituteUrlParams(endpoint.url, args);

  // SSRF guard: block private/loopback/link-local/metadata hosts and non-HTTP(S) schemes.
  const urlSafety = isUrlSafeForFetch(url);
  if (!urlSafety.ok) {
    return {
      success: false,
      error: `Blocked endpoint URL: ${urlSafety.reason}`,
    };
  }

  const { headers, body } = buildEndpointRequest(endpoint, args);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout for actual calls

    const response = await fetch(url, {
      method: endpoint.method,
      headers,
      body,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        success: false,
        error: `API returned error: ${response.status} ${response.statusText}`,
      };
    }

    // Try to parse as JSON, fall back to text
    const contentType = response.headers.get("content-type");
    let data: unknown;

    if (contentType?.includes("application/json")) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    return {
      success: true,
      data,
    };
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        return {
          success: false,
          error: "Request timed out",
        };
      }
      return {
        success: false,
        error: `Request failed: ${error.message}`,
      };
    }
    return {
      success: false,
      error: "Request failed",
    };
  }
}

/**
 * Execute a tool call against the endpoints offered for this chat turn.
 * This is the main entry point for the chat engine.
 *
 * Resolving against the caller's snapshot keeps the endpoint that runs the
 * same one that was advertised to the model, and confines the tool to the
 * project those endpoints were loaded for.
 */
export async function executeToolByName(
  endpoints: ApiEndpoint[],
  toolName: string,
  args: Record<string, string>
): Promise<ToolExecutionResult> {
  const endpoint = findEndpointByToolName(endpoints, toolName);

  if (!endpoint) {
    return {
      success: false,
      error: `Tool not found: ${toolName}`,
    };
  }

  return executeToolCall(endpoint, args);
}

/**
 * Format tool result for inclusion in LLM context
 * Truncates large responses to avoid context overflow
 */
export function formatToolResultForLLM(result: ToolExecutionResult): string {
  if (!result.success) {
    return `Error: ${result.error || "Unknown error"}`;
  }

  let dataStr: string;

  if (typeof result.data === "string") {
    dataStr = result.data;
  } else {
    dataStr = JSON.stringify(result.data, null, 2);
  }

  // Truncate very large responses
  const MAX_LENGTH = 4000;
  if (dataStr.length > MAX_LENGTH) {
    dataStr = dataStr.substring(0, MAX_LENGTH) + "\n... (truncated)";
  }

  return dataStr;
}
