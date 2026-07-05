import { supabaseAdmin } from "../../lib/supabase";
import type { ChannelProvider } from "../../types/channels";

export interface InboundReservation {
  id: string;
  createdAt: string;
}

export async function reserveInboundEvent(
  provider: ChannelProvider,
  externalMessageId: string,
  projectId: string,
  payload: Record<string, unknown>
): Promise<InboundReservation | null> {
  const { data, error } = await supabaseAdmin
    .from("channel_inbound_events")
    .insert({
      provider,
      external_message_id: externalMessageId,
      project_id: projectId,
      payload,
    })
    .select("id, created_at")
    .single();

  if (error) {
    if (error.code === "23505") return null;
    throw error;
  }

  return data ? { id: data.id, createdAt: data.created_at } : null;
}

export async function completeInboundEvent(
  reservationId: string,
  conversationId: string
): Promise<void> {
  const { error } = await supabaseAdmin
    .from("channel_inbound_events")
    .update({
      conversation_id: conversationId,
      status: "processed",
      processed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", reservationId);

  if (error) throw error;
}

export async function failInboundEvent(
  reservationId: string,
  errorMessage: string
): Promise<void> {
  await supabaseAdmin
    .from("channel_inbound_events")
    .update({
      status: "failed",
      error: errorMessage,
      updated_at: new Date().toISOString(),
    })
    .eq("id", reservationId);
}
