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
      .select("id, status")
      .eq("id", existingConversationId)
      .eq("project_id", projectId)
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
      // If insert fails (e.g., constraint violation), try to find existing again
      const { data: retry } = await supabaseAdmin
        .from("conversations")
        .select("id")
        .eq("id", existingConversationId)
        .single();

      if (retry) {
        return retry.id;
      }
      console.error("[Conversation] Failed to create conversation with ID:", insertError);
      throw new Error("Failed to create conversation");
    }

    return newConv.id;
  }

  // Find or create customer with context
  const customerId = await getOrCreateCustomer(projectId, visitorId, context);

  // Try to find existing active conversation for this visitor
  const { data: existingConversation } = await supabaseAdmin
    .from("conversations")
    .select("id")
    .eq("project_id", projectId)
    .eq("visitor_id", visitorId)
    .eq("source", source)
    .in("status", ["ai_active", "waiting", "agent_active"])
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
 * Get or create a customer record and update device/location context
 */
async function getOrCreateCustomer(
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
  try {
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

    // Add user message with context metadata
    await supabaseAdmin.from("messages").insert({
      conversation_id: conversationId,
      sender_type: "customer",
      content: userMessage,
      metadata: customerMetadata,
    });

    // Add assistant message with metadata
    await supabaseAdmin.from("messages").insert({
      conversation_id: conversationId,
      sender_type: "ai",
      content: assistantResponse,
      metadata: metadata || {},
    });
  } catch (error) {
    console.error("[Conversation] Failed to log messages:", error);
  }
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

/**
 * Update lead capture state on conversation
 */
export async function updateLeadCaptureState(
  conversationId: string,
  state: {
    awaitingEmail?: boolean;
    pendingQuestion?: string | null;
    emailAsked?: boolean;
    customerEmail?: string;
    customerName?: string;
  }
): Promise<void> {
  const updateData: Record<string, unknown> = {};

  if (state.awaitingEmail !== undefined) {
    updateData.awaiting_email = state.awaitingEmail;
  }
  if (state.pendingQuestion !== undefined) {
    updateData.pending_question = state.pendingQuestion;
  }
  if (state.emailAsked !== undefined) {
    updateData.email_asked = state.emailAsked;
  }
  if (state.customerEmail) {
    updateData.customer_email = state.customerEmail;
  }
  if (state.customerName) {
    updateData.customer_name = state.customerName;
  }

  if (Object.keys(updateData).length > 0) {
    await supabaseAdmin
      .from("conversations")
      .update(updateData)
      .eq("id", conversationId);
  }
}
