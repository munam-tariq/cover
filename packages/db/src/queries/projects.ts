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

  /** Proactive engagement settings (V3) */
  proactive_engagement?: {
    enabled: boolean;
    teaser: {
      enabled: boolean;
      message: string;
      delay_seconds: number;
      show_once_per_session: boolean;
    };
    badge: {
      enabled: boolean;
      show_until_opened: boolean;
    };
    triggers: {
      time_on_page: {
        enabled: boolean;
        delay_seconds: number;
        action: "teaser" | "badge" | "auto_open";
      };
      scroll_depth: {
        enabled: boolean;
        threshold_percent: number;
        action: "teaser" | "badge" | "auto_open";
      };
      exit_intent: {
        enabled: boolean;
        action: "auto_open" | "overlay";
        message: string;
      };
      high_intent_urls: {
        enabled: boolean;
        patterns: string[];
        action: "auto_open" | "teaser";
      };
    };
  };

  /** Lead capture V2 settings (includes V3 cascade extensions) */
  lead_capture_v2?: {
    enabled: boolean;
    form_fields: {
      email: { required: true };
      field_2?: { enabled: boolean; label: string; required: boolean };
      field_3?: { enabled: boolean; label: string; required: boolean };
    };
    qualifying_questions?: Array<{
      question: string;
      enabled: boolean;
      mandatory?: boolean;
      qualified_response?: string;
      followup_questions?: string;
      probe_question?: string;
    }>;
    notification_email?: string | null;
    notifications_enabled?: boolean;
    // V3 cascade fields
    capture_mode?: "email_after" | "email_first" | "email_required";
    conversational_reask?: {
      enabled: boolean;
      max_reasks_per_session: number;
      messages_between_reasks: number;
    };
  };

  /** Lead recovery settings (V3) */
  lead_recovery?: {
    enabled: boolean;
    exit_intent_overlay: {
      enabled: boolean;
      headline: string;
      subtext: string;
    };
    deferred_skip: {
      enabled: boolean;
      reask_after_messages: number;
      max_deferred_asks: number;
    };
    return_visit: {
      enabled: boolean;
      max_visits_before_stop: number;
      welcome_back_message: string;
    };
    high_intent_override: {
      enabled: boolean;
      keywords: string[];
      override_cooldowns: boolean;
    };
    conversation_summary_hook: {
      enabled: boolean;
      min_messages: number;
      prompt: string;
    };
  };

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
