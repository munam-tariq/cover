import type { SupabaseClient } from "../client";
import type { Project, Json } from "../types";

/**
 * Project settings stored in the settings JSONB column
 */
export interface ProjectSettings {
  systemPrompt?: string;
  welcomeMessage?: string;
  primaryColor?: string;
  widgetPosition?: "bottom-right" | "bottom-left";
  [key: string]: Json | undefined;
}

/**
 * Get all projects for a user
 */
export async function getProjects(
  client: SupabaseClient,
  userId: string
): Promise<Project[]> {
  const { data, error } = await client
    .from("projects")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Get a single project by ID
 */
export async function getProject(
  client: SupabaseClient,
  projectId: string
): Promise<Project | null> {
  const { data, error } = await client
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }
  return data;
}

/**
 * Create a new project
 */
export async function createProject(
  client: SupabaseClient,
  data: {
    userId: string;
    name?: string;
    settings?: ProjectSettings;
  }
): Promise<Project> {
  const { data: project, error } = await client
    .from("projects")
    .insert({
      user_id: data.userId,
      name: data.name || "My Chatbot",
      settings: (data.settings || {}) as Json,
    })
    .select()
    .single();

  if (error) throw error;
  return project;
}

/**
 * Update a project
 */
export async function updateProject(
  client: SupabaseClient,
  projectId: string,
  data: {
    name?: string;
    settings?: ProjectSettings;
  }
): Promise<Project> {
  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.settings !== undefined) updateData.settings = data.settings as Json;

  const { data: project, error } = await client
    .from("projects")
    .update(updateData)
    .eq("id", projectId)
    .select()
    .single();

  if (error) throw error;
  return project;
}

/**
 * Delete a project
 */
export async function deleteProject(
  client: SupabaseClient,
  projectId: string
): Promise<void> {
  const { error } = await client.from("projects").delete().eq("id", projectId);

  if (error) throw error;
}
