/**
 * Tool Executor Service
 *
 * Converts API endpoints to OpenAI-compatible tools and executes them
 * when called by the LLM during chat.
 */

import { getProjectEndpoints, extractUrlParams } from "../routes/endpoints";

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
interface ApiEndpoint {
  id: string;
  name: string;
  description: string;
  url: string;
  method: string;
  authType: string;
  authConfig: Record<string, unknown> | null;
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
 * The tool name is the endpoint ID to ensure uniqueness
 */
export function endpointToOpenAITool(endpoint: ApiEndpoint): OpenAITool {
  const params = extractUrlParams(endpoint.url);

  // Create properties for each URL parameter
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
      name: endpoint.id,
      description: endpoint.description,
      parameters: {
        type: "object",
        properties,
        required: params, // All URL params are required
      },
    },
  };
}

/**
 * Get all API endpoints as OpenAI tools for a project
 */
export async function getToolsForProject(
  projectId: string
): Promise<OpenAITool[]> {
  const endpoints = await getProjectEndpoints(projectId);
  return endpoints.map(endpointToOpenAITool);
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
  // Build the URL by replacing placeholders with actual values
  let url = endpoint.url;
  const params = extractUrlParams(endpoint.url);

  for (const param of params) {
    const value = args[param];
    if (!value) {
      return {
        success: false,
        error: `Missing required parameter: ${param}`,
      };
    }
    url = url.replace(`{${param}}`, encodeURIComponent(value));
  }

  // Build headers
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "User-Agent": "ChatbotPlatform/1.0",
  };

  // Add auth headers
  if (endpoint.authType !== "none" && endpoint.authConfig) {
    switch (endpoint.authType) {
      case "api_key":
        if (endpoint.authConfig.apiKey) {
          const headerName =
            (endpoint.authConfig.apiKeyHeader as string) || "X-API-Key";
          headers[headerName] = endpoint.authConfig.apiKey as string;
        }
        break;
      case "bearer":
        if (endpoint.authConfig.bearerToken) {
          headers["Authorization"] =
            `Bearer ${endpoint.authConfig.bearerToken}`;
        }
        break;
    }
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout for actual calls

    const response = await fetch(url, {
      method: endpoint.method,
      headers,
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
 * Execute a tool call by endpoint ID
 * This is the main entry point for the chat engine
 */
export async function executeToolById(
  projectId: string,
  endpointId: string,
  args: Record<string, string>
): Promise<ToolExecutionResult> {
  const endpoints = await getProjectEndpoints(projectId);
  const endpoint = endpoints.find((e) => e.id === endpointId);

  if (!endpoint) {
    return {
      success: false,
      error: `Tool not found: ${endpointId}`,
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
