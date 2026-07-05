import { logger } from "../../lib/logger";
import { supabaseAdmin } from "../../lib/supabase";
import type { WhatsAppCredentials } from "../../types/channels";

import { getActiveConnection, decryptCredentials } from "./connections";
import { sendTextMessage } from "./whatsapp/adapter";

const WINDOW_MS = 24 * 60 * 60 * 1000;

export type DispatchResult =
  | { ok: true; transport: "whatsapp" | "realtime" }
  | {
      ok: false;
      reason:
        | "WINDOW_CLOSED"
        | "SEND_FAILED"
        | "CONVERSATION_NOT_FOUND"
        | "NO_ACTIVE_CONNECTION";
      detail?: string;
    };

interface ConversationForDispatch {
  project_id: string;
  source: string;
  visitor_id: string;
  metadata: Record<string, unknown> | null;
}

export function isWithin24hWindow(lastInboundAt: Date, now?: Date): boolean {
  const currentTime = now ?? new Date();
  return currentTime.getTime() - lastInboundAt.getTime() < WINDOW_MS;
}

function getLastInboundAt(
  conversation: Pick<ConversationForDispatch, "metadata">
): Date | null {
  const raw = conversation.metadata?.last_inbound_at;
  if (typeof raw !== "string") return null;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export async function canSendFreeForm(
  conversationId: string
): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from("conversations")
    .select("metadata")
    .eq("id", conversationId)
    .maybeSingle();

  if (!data) return false;
  const lastInboundAt = getLastInboundAt({
    metadata: data.metadata as Record<string, unknown> | null,
  });
  return lastInboundAt ? isWithin24hWindow(lastInboundAt) : false;
}

export async function dispatchToChannel(
  conversationId: string,
  text: string
): Promise<DispatchResult> {
  const { data: conversation } = await supabaseAdmin
    .from("conversations")
    .select("project_id, source, visitor_id, metadata")
    .eq("id", conversationId)
    .single();

  if (!conversation) return { ok: false, reason: "CONVERSATION_NOT_FOUND" };
  const convo = conversation as ConversationForDispatch;

  if (convo.source !== "whatsapp") return { ok: true, transport: "realtime" };

  const lastInboundAt = getLastInboundAt(convo);
  if (!lastInboundAt || !isWithin24hWindow(lastInboundAt)) {
    return { ok: false, reason: "WINDOW_CLOSED" };
  }

  const conn = await getActiveConnection(convo.project_id, "whatsapp");
  if (!conn) return { ok: false, reason: "NO_ACTIVE_CONNECTION" };

  const creds = decryptCredentials<WhatsAppCredentials>(
    conn.encryptedCredentials
  );

  const waId = convo.visitor_id.replace(/^whatsapp:/, "");

  try {
    await sendTextMessage(conn.externalId, creds.accessToken, waId, text);
    return { ok: true, transport: "whatsapp" };
  } catch (error) {
    logger.error("WhatsApp dispatch failed", error, { conversationId });
    return {
      ok: false,
      reason: "SEND_FAILED",
      detail: error instanceof Error ? error.message : String(error),
    };
  }
}
