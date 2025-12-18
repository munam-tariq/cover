import type { SupabaseClient } from "../client";
import type { ApiEndpoint, Json } from "../types";

/**
 * Get all API endpoints for a project
 */
export async function getApiEndpoints(
  client: SupabaseClient,
  projectId: string
): Promise<ApiEndpoint[]> {
  const { data, error } = await client
    .from("api_endpoints")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Get a single API endpoint by ID
 */
export async function getApiEndpoint(
  client: SupabaseClient,
  endpointId: string
): Promise<ApiEndpoint | null> {
  const { data, error } = await client
    .from("api_endpoints")
    .select("*")
    .eq("id", endpointId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }
  return data;
}

/**
 * Create a new API endpoint
 */
export async function createApiEndpoint(
  client: SupabaseClient,
  data: {
    projectId: string;
    name: string;
    url: string;
    method: ApiEndpoint["method"];
    description: string;
    headers?: Record<string, string>;
  }
): Promise<ApiEndpoint> {
  const { data: endpoint, error } = await client
    .from("api_endpoints")
    .insert({
      project_id: data.projectId,
      name: data.name,
      url: data.url,
      method: data.method,
      description: data.description,
      headers: data.headers as Json,
    })
    .select()
    .single();

  if (error) throw error;
  return endpoint;
}

/**
 * Update an API endpoint
 */
export async function updateApiEndpoint(
  client: SupabaseClient,
  endpointId: string,
  data: Partial<
    Pick<ApiEndpoint, "name" | "url" | "method" | "description" | "headers">
  >
): Promise<ApiEndpoint> {
  const { data: endpoint, error } = await client
    .from("api_endpoints")
    .update(data)
    .eq("id", endpointId)
    .select()
    .single();

  if (error) throw error;
  return endpoint;
}

/**
 * Delete an API endpoint
 */
export async function deleteApiEndpoint(
  client: SupabaseClient,
  endpointId: string
): Promise<void> {
  const { error } = await client
    .from("api_endpoints")
    .delete()
    .eq("id", endpointId);

  if (error) throw error;
}
