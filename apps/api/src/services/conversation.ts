/**
 * Conversation Service
 *
 * Handles conversation and message operations using the new tables.
 * Supports the human agent handoff feature.
 */

import { supabaseAdmin } from "../lib/supabase";

import type { ChatSource, MessageContext } from "./chat-engine";

export interface ConversationData {
  id: string;
  projectId: string;
  customerId?: string;
  visitorId: string;
  customerEmail?: string;
  customerName?: string;
  status: "ai_active" | "waiting" | "agent_active" | "resolved" | "closed";
  assignedAgentId?: string;
  source: ChatSource;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface MessageData {
  id: string;
  conversationId: string;
  senderType: "customer" | "ai" | "agent" | "system";
  senderId?: string;
  content: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

/**
 * Get or create a conversation in the new tables
 * This function always writes to the new tables - feature flag should be checked by caller
 */
export async function getOrCreateConversation(
  projectId: string,
  visitorId: string,
  existingConversationId?: string,
  source: ChatSource = "widget",
  context?: MessageContext
): Promise<string> {
  // If conversation ID provided, try to use it or create with that ID
  if (existingConversationId) {
    const { data: existing } = await supabaseAdmin
      .from("conversations")
      .select("id")
      .eq("id", existingConversationId)
      .eq("project_id", projectId)
      .eq("visitor_id", visitorId)
      .single();

    if (existing) {
      // Update customer with latest context
      await getOrCreateCustomer(projectId, visitorId, context);
      return existing.id;
    }

    // Conversation doesn't exist with this ID, create it with the specified ID
    const customerId = await getOrCreateCustomer(projectId, visitorId, context);

    const { data: newConv, error: insertError } = await supabaseAdmin
      .from("conversations")
      .insert({
        id: existingConversationId, // Use the session ID from legacy table
        project_id: projectId,
        visitor_id: visitorId,
        customer_id: customerId,
        status: "ai_active",
        source,
        message_count: 0,
      })
      .select("id")
      .single();

    if (insertError) {
      // If insert fails (e.g., UUID conflict — the id belongs to another visitor),
      // retry with full ownership check before giving up.
      const { data: retry } = await supabaseAdmin
        .from("conversations")
        .select("id")
        .eq("id", existingConversationId)
        .eq("project_id", projectId)
        .eq("visitor_id", visitorId)
        .single();

      if (retry) {
        return retry.id;
      }

      // The supplied id is unusable (belongs to another visitor or violates a
      // constraint). Fall through to create/reuse a normal conversation for this
      // visitor instead of returning a 500.
      console.warn(
        "[Conversation] Supplied conversationId is unusable, falling through to create/reuse:",
        insertError.code
      );
    } else {
      return newConv.id;
    }
  }

  // Find or create customer with context
  const customerId = await getOrCreateCustomer(projectId, visitorId, context);

  // Try to find an existing AI-driven conversation for this visitor to continue.
  // IMPORTANT: only reuse `ai_active` here. A conversation in `waiting`/`agent_active`
  // is owned by a human agent — reusing it when the client sends no sessionId (e.g. after
  // "New chat") would let the AI inject messages into a live handoff. Those are resumed
  // explicitly by their sessionId via the existingConversationId path above.
  const { data: existingConversation } = await supabaseAdmin
    .from("conversations")
    .select("id")
    .eq("project_id", projectId)
    .eq("visitor_id", visitorId)
    .eq("source", source)
    .eq("status", "ai_active")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (existingConversation) {
    return existingConversation.id;
  }

  // Create new conversation
  const { data: newConversation, error } = await supabaseAdmin
    .from("conversations")
    .insert({
      project_id: projectId,
      visitor_id: visitorId,
      customer_id: customerId,
      status: "ai_active",
      source,
      message_count: 0,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[Conversation] Failed to create conversation:", error);
    throw new Error("Failed to create conversation");
  }

  return newConversation.id;
}

/**
 * Read the pinned conversation language (BCP-47) from `metadata.language`.
 * Returns null when unset or on error — callers fall back to detection/default.
 */
export async function getConversationLanguage(
  conversationId: string
): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from("conversations")
    .select("metadata")
    .eq("id", conversationId)
    .single();

  if (error || !data) return null;
  const metadata = (data.metadata as Record<string, unknown> | null) || {};
  const language = metadata.language;
  return typeof language === "string" && language ? language : null;
}

/**
 * Pin the resolved conversation language into `metadata.language`, preserving
 * any other metadata keys. Called once when a conversation's language is first
 * resolved so every later turn stays consistent.
 */
export async function setConversationLanguage(
  conversationId: string,
  language: string
): Promise<void> {
  const { data } = await supabaseAdmin
    .from("conversations")
    .select("metadata")
    .eq("id", conversationId)
    .single();

  const metadata = (data?.metadata as Record<string, unknown> | null) || {};
  if (metadata.language === language) return;

  await supabaseAdmin
    .from("conversations")
    .update({ metadata: { ...metadata, language } })
    .eq("id", conversationId);
}

/**
 * Get or create a customer record and update device/location context
 */
export async function getOrCreateCustomer(
  projectId: string,
  visitorId: string,
  context?: MessageContext
): Promise<string> {
  // Build customer update data with context
  const customerUpdate: Record<string, unknown> = {
    last_seen_at: new Date().toISOString(),
  };

  // Add device context if provided
  if (context) {
    if (context.browser) {
      customerUpdate.last_browser = context.browserVersion
        ? `${context.browser} ${context.browserVersion}`
        : context.browser;
    }
    if (context.device) {
      customerUpdate.last_device = context.device;
    }
    if (context.os) {
      customerUpdate.last_os = context.osVersion
        ? `${context.os} ${context.osVersion}`
        : context.os;
    }
    if (context.pageUrl) {
      customerUpdate.last_page_url = context.pageUrl;
    }
    if (context.city && context.country) {
      customerUpdate.last_location = `${context.city}, ${context.country}`;
    } else if (context.country) {
      customerUpdate.last_location = context.country;
    }
  }

  // Try to find existing customer
  const { data: existing } = await supabaseAdmin
    .from("customers")
    .select("id")
    .eq("project_id", projectId)
    .eq("visitor_id", visitorId)
    .single();

  if (existing) {
    // Update last seen and device context
    await supabaseAdmin
      .from("customers")
      .update(customerUpdate)
      .eq("id", existing.id);
    return existing.id;
  }

  // Create new customer with context
  const { data: newCustomer, error } = await supabaseAdmin
    .from("customers")
    .insert({
      project_id: projectId,
      visitor_id: visitorId,
      ...customerUpdate,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[Conversation] Failed to create customer:", error);
    throw new Error("Failed to create customer");
  }

  return newCustomer.id;
}

/**
 * Add a message to a conversation
 */
export async function addMessage(
  conversationId: string,
  senderType: "customer" | "ai" | "agent" | "system",
  content: string,
  metadata?: Record<string, unknown>,
  senderId?: string
): Promise<string> {
  if (senderType === "customer") {
    const message = await appendCustomerMessage(
      conversationId,
      content,
      metadata,
      senderId
    );
    return message.id;
  }

  const { data: message, error } = await supabaseAdmin
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_type: senderType,
      sender_id: senderId,
      content,
      metadata: metadata || {},
    })
    .select("id")
    .single();

  if (error) {
    console.error("[Conversation] Failed to add message:", error);
    throw new Error("Failed to add message");
  }

  return message.id;
}

/**
 * Append a live customer reply through the database transition that serializes against auto-close.
 * This is the only customer-message writer for normal chat, handoff, and channel ingress. A reply
 * on a terminal conversation reopens it and invalidates its stale insight in the same transaction.
 */
export async function appendCustomerMessage(
  conversationId: string,
  content: string,
  metadata?: Record<string, unknown>,
  senderId?: string
): Promise<{ id: string; createdAt: string; reopened: boolean }> {
  const { data, error } = await supabaseAdmin.rpc(
    "append_customer_message",
    {
      p_conversation_id: conversationId,
      p_content: content,
      p_metadata: metadata ?? {},
      p_sender_id: senderId ?? null,
    }
  );

  const row = (data?.[0] ?? null) as
    | {
        message_id: string;
        message_created_at: string;
        reopened: boolean;
      }
    | null;

  if (error || !row) {
    console.error("[Conversation] Failed to append customer message:", error);
    throw new Error(
      `Failed to append customer message${error?.message ? `: ${error.message}` : ""}`
    );
  }

  return {
    id: row.message_id,
    createdAt: row.message_created_at,
    reopened: row.reopened,
  };
}

/**
 * Add user and assistant messages to a conversation (for chat logging)
 */
export async function logConversationMessages(
  conversationId: string,
  userMessage: string,
  assistantResponse: string,
  metadata?: {
    sourcesUsed?: number;
    toolCallsCount?: number;
    model?: string;
  },
  context?: MessageContext
): Promise<void> {
  // Build customer message metadata with context
  const customerMetadata: Record<string, unknown> = {};
  if (context) {
    if (context.pageUrl) customerMetadata.pageUrl = context.pageUrl;
    if (context.pageTitle) customerMetadata.pageTitle = context.pageTitle;
    if (context.browser) customerMetadata.browser = context.browser;
    if (context.os) customerMetadata.os = context.os;
    if (context.device) customerMetadata.device = context.device;
    if (context.country) customerMetadata.country = context.country;
    if (context.city) customerMetadata.city = context.city;
    if (context.timezone) customerMetadata.timezone = context.timezone;
  }

  await appendCustomerMessage(conversationId, userMessage, customerMetadata);
  await addMessage(conversationId, "ai", assistantResponse, metadata);
}

/**
 * Update customer presence
 */
export async function updateCustomerPresence(
  conversationId: string,
  presence: "online" | "idle" | "offline" | "typing"
): Promise<void> {
  try {
    await supabaseAdmin
      .from("conversations")
      .update({
        customer_presence: presence,
        customer_last_seen_at: new Date().toISOString(),
      })
      .eq("id", conversationId);
  } catch (error) {
    console.error("[Conversation] Failed to update presence:", error);
  }
}

/**
 * Get conversation by ID
 */
export async function getConversation(
  conversationId: string
): Promise<ConversationData | null> {
  const { data, error } = await supabaseAdmin
    .from("conversations")
    .select("*")
    .eq("id", conversationId)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    id: data.id,
    projectId: data.project_id,
    customerId: data.customer_id,
    visitorId: data.visitor_id,
    customerEmail: data.customer_email,
    customerName: data.customer_name,
    status: data.status,
    assignedAgentId: data.assigned_agent_id,
    source: data.source,
    messageCount: data.message_count,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

/**
 * Get messages for a conversation
 */
export async function getMessages(
  conversationId: string,
  limit: number = 50,
  before?: string
): Promise<MessageData[]> {
  let query = supabaseAdmin
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (before) {
    query = query.lt("created_at", before);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[Conversation] Failed to get messages:", error);
    return [];
  }

  return (data || []).map((m) => ({
    id: m.id,
    conversationId: m.conversation_id,
    senderType: m.sender_type,
    senderId: m.sender_id,
    content: m.content,
    metadata: m.metadata,
    createdAt: m.created_at,
  }));
}

/**
 * Update conversation status
 */
export async function updateConversationStatus(
  conversationId: string,
  status: ConversationData["status"],
  additionalData?: Partial<{
    assignedAgentId: string;
    handoffReason: string;
    handoffTriggeredAt: string;
    claimedAt: string;
    resolvedAt: string;
    queueEnteredAt: string;
  }>
): Promise<void> {
  const updateData: Record<string, unknown> = { status };

  if (additionalData?.assignedAgentId !== undefined) {
    updateData.assigned_agent_id = additionalData.assignedAgentId;
  }
  if (additionalData?.handoffReason) {
    updateData.handoff_reason = additionalData.handoffReason;
  }
  if (additionalData?.handoffTriggeredAt) {
    updateData.handoff_triggered_at = additionalData.handoffTriggeredAt;
  }
  if (additionalData?.claimedAt) {
    updateData.claimed_at = additionalData.claimedAt;
  }
  if (additionalData?.resolvedAt) {
    updateData.resolved_at = additionalData.resolvedAt;
  }
  if (additionalData?.queueEnteredAt) {
    updateData.queue_entered_at = additionalData.queueEnteredAt;
  }

  const { error } = await supabaseAdmin
    .from("conversations")
    .update(updateData)
    .eq("id", conversationId);

  if (error) {
    console.error("[Conversation] Failed to update status:", error);
    throw new Error("Failed to update conversation status");
  }
}

// Feature flag functions removed - new conversations system is now always enabled
// The use_new_conversations column in projects table is deprecated

/**
 * Get conversation history in the format expected by chat engine
 */
export async function getConversationHistory(
  conversationId: string
): Promise<Array<{ role: "user" | "assistant"; content: string }>> {
  const messages = await getMessages(conversationId);

  return messages
    .filter((m) => m.senderType === "customer" || m.senderType === "ai")
    .map((m) => ({
      role: m.senderType === "customer" ? "user" : "assistant",
      content: m.content,
    }));
}

// The unused v1 lead-capture state mutator was removed. Its retired storage is dropped by the
// post-deploy cleanup migration after this code ships.
