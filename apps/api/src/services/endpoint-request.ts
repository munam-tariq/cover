/**
 * Endpoint Request Building
 *
 * Shared helpers that turn a configured API endpoint into an outbound HTTP
 * request. Used by both the chat tool executor and the endpoint test route so
 * the request a user tests is the request the AI actually sends.
 */

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

const USER_AGENT = "ChatbotPlatform/1.0";
const DEFAULT_API_KEY_HEADER = "X-API-Key";

/**
 * Extract {param} placeholder names from a single string.
 */
export function extractPlaceholders(text: string): string[] {
  const matches = text.match(/\{(\w+)\}/g) || [];
  return matches.map((m) => m.slice(1, -1));
}

/**
 * Collect placeholder names from every string value in a JSON template.
 */
function collectTemplatePlaceholders(template: JsonValue): string[] {
  const found: string[] = [];

  const walk = (node: JsonValue): void => {
    if (typeof node === "string") {
      found.push(...extractPlaceholders(node));
    } else if (Array.isArray(node)) {
      node.forEach(walk);
    } else if (node !== null && typeof node === "object") {
      Object.values(node).forEach(walk);
    }
  };

  walk(template);
  return found;
}

/**
 * Every parameter name an endpoint needs, from its URL and its body template.
 * Single source of truth for both the tool schema shown to the LLM and the
 * substitution done at call time, so the two cannot drift apart.
 */
export function extractEndpointParams(endpoint: {
  url: string;
  bodyTemplate?: JsonValue | null;
}): string[] {
  const params = [
    ...extractPlaceholders(endpoint.url),
    ...(endpoint.bodyTemplate != null
      ? collectTemplatePlaceholders(endpoint.bodyTemplate)
      : []),
  ];

  return [...new Set(params)];
}

/**
 * Replace {param} placeholders inside the string values of a JSON template.
 *
 * Walks the parsed tree rather than string-replacing the raw JSON: an argument
 * value containing quotes or braces is then just a string, and cannot inject
 * extra fields into the outbound body. Non-string values pass through
 * untouched, so a template can still carry real numbers and booleans.
 */
export function substituteTemplate(
  template: JsonValue,
  args: Record<string, string>
): JsonValue {
  if (typeof template === "string") {
    return template.replace(/\{(\w+)\}/g, (match, name: string) =>
      Object.prototype.hasOwnProperty.call(args, name) ? args[name] : match
    );
  }

  if (Array.isArray(template)) {
    return template.map((item) => substituteTemplate(item, args));
  }

  if (template !== null && typeof template === "object") {
    return Object.fromEntries(
      Object.entries(template).map(([key, value]) => [
        key,
        substituteTemplate(value, args),
      ])
    );
  }

  return template;
}

/**
 * Replace {param} placeholders in a URL, encoding each value for use in a path.
 */
export function substituteUrlParams(
  url: string,
  args: Record<string, string>
): string {
  return url.replace(/\{(\w+)\}/g, (match, name: string) =>
    Object.prototype.hasOwnProperty.call(args, name)
      ? encodeURIComponent(args[name])
      : match
  );
}

/**
 * Parameter names the endpoint needs that the caller did not supply.
 * An empty string is a supplied value, not a missing one.
 */
export function findMissingParams(
  params: string[],
  args: Record<string, unknown>
): string[] {
  return params.filter(
    (param) =>
      !Object.prototype.hasOwnProperty.call(args, param) ||
      args[param] === undefined ||
      args[param] === null
  );
}

/**
 * Build the auth headers for an endpoint from its decrypted auth config.
 */
export function buildAuthHeaders(
  authType: string,
  authConfig: Record<string, unknown> | null
): Record<string, string> {
  if (authType === "none" || !authConfig) {
    return {};
  }

  switch (authType) {
    case "api_key": {
      if (!authConfig.apiKey) {
        return {};
      }
      const headerName =
        (authConfig.apiKeyHeader as string) || DEFAULT_API_KEY_HEADER;
      return { [headerName]: authConfig.apiKey as string };
    }
    case "bearer":
      return authConfig.bearerToken
        ? { Authorization: `Bearer ${authConfig.bearerToken}` }
        : {};
    default:
      return {};
  }
}

/**
 * Build the headers and body for an outbound endpoint request.
 * A body is sent only for POST with a template configured, and Content-Type is
 * declared only when there is a body to describe.
 */
export function buildEndpointRequest(
  endpoint: {
    method: string;
    authType: string;
    authConfig: Record<string, unknown> | null;
    bodyTemplate?: JsonValue | null;
  },
  args: Record<string, string>
): { headers: Record<string, string>; body?: string } {
  const headers: Record<string, string> = {
    "User-Agent": USER_AGENT,
    ...buildAuthHeaders(endpoint.authType, endpoint.authConfig),
  };

  if (endpoint.method !== "POST" || endpoint.bodyTemplate == null) {
    return { headers };
  }

  const body = JSON.stringify(substituteTemplate(endpoint.bodyTemplate, args));
  headers["Content-Type"] = "application/json";

  return { headers, body };
}
