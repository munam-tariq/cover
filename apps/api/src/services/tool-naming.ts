/**
 * Tool Naming
 *
 * Derives the function name the LLM sees for an API endpoint, and resolves a
 * tool call back to its endpoint.
 *
 * Both directions are pure functions of the endpoint, so the schema and the
 * call resolution derive the same name independently — there is no lookup
 * table to fall out of sync.
 */

// OpenAI function names must match ^[a-zA-Z0-9_-]{1,64}$
const TOOL_NAME_MAX_LENGTH = 64;
const ID_SUFFIX_LENGTH = 8;
const FALLBACK_SLUG = "endpoint";

type NamedEndpoint = {
  id: string;
  name: string;
};

/**
 * A readable, unique function name for an endpoint.
 *
 * The model chooses tools partly by name, so a bare id spends that signal on
 * nothing. The id suffix keeps names unique: endpoint names carry no
 * uniqueness constraint, and two endpoints sharing a slug would otherwise
 * resolve to whichever one happened to come back first.
 */
export function toolNameForEndpoint(endpoint: NamedEndpoint): string {
  const suffix = endpoint.id.replace(/-/g, "").slice(0, ID_SUFFIX_LENGTH);
  const maxSlugLength = TOOL_NAME_MAX_LENGTH - suffix.length - 1;

  const slug = endpoint.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .slice(0, maxSlugLength)
    .replace(/^_+|_+$/g, "");

  // A name with no ASCII alphanumerics (Arabic, CJK, punctuation) slugs away
  // to nothing, which would leave an invalid name.
  return `${slug || FALLBACK_SLUG}_${suffix}`;
}

/**
 * Resolve a tool call back to the endpoint whose name it is.
 */
export function findEndpointByToolName<T extends NamedEndpoint>(
  endpoints: T[],
  toolName: string
): T | undefined {
  return endpoints.find(
    (endpoint) => toolNameForEndpoint(endpoint) === toolName
  );
}
