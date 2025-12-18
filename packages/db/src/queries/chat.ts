import type { SupabaseClient } from "../client";
import type { ChatSession, Json } from "../types";

/**
 * Message type for chat sessions
 * Messages are stored as JSONB array in chat_sessions.messages
 */
export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  sources?: { title: string; content: string }[];
  timestamp: string;
}

/**
 * Get or create a chat session
 */
export async function getOrCreateChatSession(
  client: SupabaseClient,
  projectId: string,
  visitorId: string
): Promise<ChatSession> {
  // Try to get existing session
  const { data: existing } = await client
    .from("chat_sessions")
    .select("*")
    .eq("project_id", projectId)
    .eq("visitor_id", visitorId)
    .single();

  if (existing) return existing;

  // Create new session
  const { data: created, error: createError } = await client
    .from("chat_sessions")
    .insert({
      project_id: projectId,
      visitor_id: visitorId,
      messages: [],
      message_count: 0,
    })
    .select()
    .single();

  if (createError) throw createError;
  return created;
}

/**
 * Get chat session by ID
 */
export async function getChatSession(
  client: SupabaseClient,
  sessionId: string
): Promise<ChatSession | null> {
  const { data, error } = await client
    .from("chat_sessions")
    .select("*")
    .eq("id", sessionId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }
  return data;
}

/**
 * Get messages for a chat session
 */
export async function getChatMessages(
  client: SupabaseClient,
  sessionId: string
): Promise<ChatMessage[]> {
  const { data, error } = await client
    .from("chat_sessions")
    .select("messages")
    .eq("id", sessionId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return [];
    throw error;
  }
  return (data?.messages as unknown as ChatMessage[]) || [];
}

/**
 * Add a message to a chat session
 */
export async function addChatMessage(
  client: SupabaseClient,
  sessionId: string,
  message: Omit<ChatMessage, "timestamp">
): Promise<ChatSession> {
  // First get current messages
  const { data: session, error: getError } = await client
    .from("chat_sessions")
    .select("messages, message_count")
    .eq("id", sessionId)
    .single();

  if (getError) throw getError;

  const currentMessages = (session?.messages as unknown as ChatMessage[]) || [];
  const newMessage: ChatMessage = {
    ...message,
    timestamp: new Date().toISOString(),
  };

  // Update with new message
  const { data: updated, error: updateError } = await client
    .from("chat_sessions")
    .update({
      messages: [...currentMessages, newMessage] as unknown as Json[],
      message_count: (session?.message_count || 0) + 1,
    })
    .eq("id", sessionId)
    .select()
    .single();

  if (updateError) throw updateError;
  return updated;
}

/**
 * Get recent chat sessions for a project
 */
export async function getRecentChatSessions(
  client: SupabaseClient,
  projectId: string,
  limit = 20
): Promise<ChatSession[]> {
  const { data, error } = await client
    .from("chat_sessions")
    .select("*")
    .eq("project_id", projectId)
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}
