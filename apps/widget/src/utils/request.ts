/**
 * Widget request headers
 *
 * Single place that assembles the headers for widget → API calls so the visitor id, the
 * publishable client key (X-FrontFace-Key, from data-client-key), and the conversation session
 * token (X-FrontFace-Session) are sent consistently. The client key lets embeds authenticate
 * even when their project has no allowed_domains configured; the session token authorizes the
 * per-conversation read routes.
 */
export interface WidgetRequestHeadersInput {
  visitorId?: string;
  clientKey?: string | null;
  sessionToken?: string | null;
  /** Set false for GET requests that send no body. Defaults to true (adds Content-Type: json). */
  json?: boolean;
}

export function widgetHeaders(
  input: WidgetRequestHeadersInput = {}
): Record<string, string> {
  const headers: Record<string, string> = {};
  if (input.json !== false) headers["Content-Type"] = "application/json";
  if (input.visitorId) headers["X-Visitor-Id"] = input.visitorId;
  if (input.clientKey) headers["X-FrontFace-Key"] = input.clientKey;
  if (input.sessionToken) headers["X-FrontFace-Session"] = input.sessionToken;
  return headers;
}
