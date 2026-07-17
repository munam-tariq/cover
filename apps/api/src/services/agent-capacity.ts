/**
 * Agent Capacity
 *
 * The only place that moves agent_availability.current_chat_count.
 *
 * Every previous writer was a read-modify-write with an unchecked error, which is how an agent ended
 * up holding 2 concurrency slots against 0 real chats on staging — slots that are gone permanently,
 * because getAvailableAgent filters on `current_chat_count < max_concurrent_chats`. Enough drift and
 * the agent silently stops receiving handoffs.
 *
 * Both RPCs are atomic and clamped (decrement never goes below 0), and both errors are surfaced
 * rather than swallowed. Assignment itself does NOT go through incrementChatCount — it must reserve
 * capacity in the same transaction that assigns, which is claim_conversation's job.
 */

import { supabaseAdmin } from "../lib/supabase";

export type ClaimConversationResult =
  | "CLAIMED"
  | "NO_AVAILABILITY_ROW"
  | "NOT_ONLINE"
  | "AT_CAPACITY"
  | "NOT_FOUND"
  | "WRONG_PROJECT"
  | "ALREADY_CLAIMED";

export type AgentConversationTransitionResult =
  | "TRANSITIONED"
  | "INVALID_NEXT_STATUS"
  | "NOT_FOUND"
  | "WRONG_PROJECT"
  | "NO_ASSIGNED_AGENT"
  | "NO_AVAILABILITY_ROW"
  | "ASSIGNMENT_CHANGED"
  | "INVALID_STATUS";

function requireRpcResult<T>(
  operation: string,
  data: T | null,
  error: { message?: string } | null
): T {
  if (error) {
    throw new Error(`${operation} failed: ${error.message ?? "database error"}`);
  }
  if (data == null) {
    throw new Error(`${operation} returned no result`);
  }
  return data;
}

export function isQueueableClaimResult(
  result: ClaimConversationResult
): boolean {
  switch (result) {
    case "AT_CAPACITY":
    case "NOT_ONLINE":
    case "NO_AVAILABILITY_ROW":
      return true;
    default:
      return false;
  }
}

export async function incrementChatCount(
  userId: string,
  projectId: string
): Promise<number> {
  const { data, error } = await supabaseAdmin.rpc("increment_chat_count", {
    p_user_id: userId,
    p_project_id: projectId,
  });
  return requireRpcResult("increment_chat_count", data as number | null, error);
}

export async function decrementChatCount(
  userId: string,
  projectId: string
): Promise<number> {
  const { data, error } = await supabaseAdmin.rpc("decrement_chat_count", {
    p_user_id: userId,
    p_project_id: projectId,
  });

  return requireRpcResult("decrement_chat_count", data as number | null, error);
}

export async function claimConversation(input: {
  conversationId: string;
  userId: string;
  projectId: string;
  handoffReason?: string;
  aiConfidence?: number;
  triggerKeyword?: string;
  customerEmail?: string;
  customerName?: string;
}): Promise<ClaimConversationResult> {
  const { data, error } = await supabaseAdmin.rpc("claim_conversation", {
    p_conversation_id: input.conversationId,
    p_user_id: input.userId,
    p_project_id: input.projectId,
    p_handoff_reason: input.handoffReason ?? null,
    p_ai_confidence: input.aiConfidence ?? null,
    p_trigger_keyword: input.triggerKeyword ?? null,
    p_customer_email: input.customerEmail ?? null,
    p_customer_name: input.customerName ?? null,
  });

  return requireRpcResult(
    "claim_conversation",
    data as ClaimConversationResult | null,
    error
  );
}

export async function transitionAgentConversation(input: {
  conversationId: string;
  projectId: string;
  nextStatus: "waiting" | "resolved" | "closed" | "ai_active";
}): Promise<AgentConversationTransitionResult> {
  const { data, error } = await supabaseAdmin.rpc(
    "transition_agent_conversation",
    {
      p_conversation_id: input.conversationId,
      p_project_id: input.projectId,
      p_next_status: input.nextStatus,
    }
  );

  return requireRpcResult(
    "transition_agent_conversation",
    data as AgentConversationTransitionResult | null,
    error
  );
}
