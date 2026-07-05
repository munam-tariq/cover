import { supabaseAdmin } from "../../lib/supabase";
import type { ResolutionStrategy } from "../../types/channels";
import type { ChatSource } from "../chat-engine";
import { getOrCreateCustomer } from "../conversation";

export async function resolveConversation(
  projectId: string,
  visitorId: string,
  source: ChatSource,
  strategy: ResolutionStrategy
): Promise<string> {
  const statuses =
    strategy === "latest_open"
      ? ["ai_active", "waiting", "agent_active"]
      : ["ai_active"];

  const { data: existing } = await supabaseAdmin
    .from("conversations")
    .select("id")
    .eq("project_id", projectId)
    .eq("visitor_id", visitorId)
    .eq("source", source)
    .in("status", statuses)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) return existing.id;

  const customerId = await getOrCreateCustomer(projectId, visitorId);

  const { data: newConv, error } = await supabaseAdmin
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

  if (!error) return newConv.id;

  // A concurrent request for the same visitor+source (e.g. two WhatsApp
  // webhook POSTs that arrived close together but not batched into one
  // request) won the race and already created the open conversation —
  // idx_conversations_whatsapp_open enforces this for source='whatsapp'.
  // Re-select the winner's row instead of failing this turn.
  if (error.code === "23505") {
    const { data: winner, error: reselectError } = await supabaseAdmin
      .from("conversations")
      .select("id")
      .eq("project_id", projectId)
      .eq("visitor_id", visitorId)
      .eq("source", source)
      .in("status", statuses)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!reselectError && winner) return winner.id;
  }

  throw new Error(`Failed to create conversation: ${error.message}`);
}
