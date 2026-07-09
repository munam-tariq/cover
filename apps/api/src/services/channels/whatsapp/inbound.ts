import { logger } from "../../../lib/logger";
import { supabaseAdmin } from "../../../lib/supabase";
import type { ChannelConnection } from "../../../types/channels";
import { processChat } from "../../chat-engine";
import {
  addMessage,
  getConversationHistory,
  getConversationLanguage,
} from "../../conversation";
import {
  projectLanguageDefault,
  resolveGreetingLanguage,
  toResolvedLanguage,
} from "../../language";
import { broadcastNewMessage } from "../../realtime";
import { resolveConnectionConfig } from "../config";
import { resolveConversation } from "../conversation-resolver";
import {
  completeInboundEvent,
  failInboundEvent,
  reserveInboundEvent,
} from "../inbound-reservations";
import { dispatchToChannel } from "../outbound-dispatcher";

import type { ParsedInbound } from "./adapter";
import { checkSenderRateLimit } from "./rate-limit";

/**
 * Notice sent for non-text WhatsApp messages (image/audio/etc.), per base
 * language. Channel-specific system line, so kept local rather than in the
 * shared UI-chrome catalog (which is for the widget/public-page). English
 * fallback for any other language.
 */
const UNSUPPORTED_NOTICE: Record<string, string> = {
  en: "I can read text messages right now — please type your question.",
  ar: "أقدر أقرأ الرسائل النصية حاليًا — من فضلك اكتب سؤالك.",
};

function unsupportedNotice(base: string): string {
  return UNSUPPORTED_NOTICE[base] ?? UNSUPPORTED_NOTICE.en;
}

/**
 * Language for a channel notice when there's no incoming text to detect from:
 * the language pinned by a prior text turn wins, else the project default,
 * else English. One DB read; the project lookup only happens when unpinned.
 */
async function resolveNoticeLanguage(
  projectId: string,
  conversationId: string
): Promise<string> {
  const stored = await getConversationLanguage(conversationId);
  if (stored) return toResolvedLanguage(stored).base;

  const { data } = await supabaseAdmin
    .from("projects")
    .select("settings")
    .eq("id", projectId)
    .maybeSingle();
  const projectDefault = projectLanguageDefault(
    data?.settings as Record<string, unknown> | null
  );
  return resolveGreetingLanguage(projectDefault).base;
}

export function shouldSuppressAiReply(
  status: string,
  agentRepliedAfter: boolean
): boolean {
  if (status !== "ai_active") return true;
  if (agentRepliedAfter) return true;
  return false;
}

async function getConversationStatus(
  conversationId: string
): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from("conversations")
    .select("status")
    .eq("id", conversationId)
    .single();

  if (error) throw error;
  return data?.status ?? null;
}

async function stampLastInboundAt(
  conversationId: string
): Promise<string> {
  const inboundAt = new Date().toISOString();
  const { data } = await supabaseAdmin
    .from("conversations")
    .select("metadata")
    .eq("id", conversationId)
    .single();

  const existingMetadata =
    data?.metadata && typeof data.metadata === "object"
      ? (data.metadata as Record<string, unknown>)
      : {};

  const { error } = await supabaseAdmin
    .from("conversations")
    .update({
      metadata: {
        ...existingMetadata,
        last_inbound_at: inboundAt,
      },
    })
    .eq("id", conversationId);

  if (error) throw error;
  return inboundAt;
}

async function hasAgentMessageAfter(
  conversationId: string,
  afterIso: string
): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from("messages")
    .select("id")
    .eq("conversation_id", conversationId)
    .eq("sender_type", "agent")
    .gt("created_at", afterIso)
    .limit(1)
    .maybeSingle();
  return data !== null;
}

async function upsertCustomerPhone(
  projectId: string,
  visitorId: string,
  phone: string
): Promise<void> {
  await supabaseAdmin
    .from("customers")
    .update({ phone })
    .eq("project_id", projectId)
    .eq("visitor_id", visitorId);
}

async function addAndBroadcastMessage(
  conversationId: string,
  senderType: "customer" | "ai",
  content: string,
  metadata: Record<string, unknown>,
  logCtx: Record<string, unknown>
): Promise<{ id: string; createdAt: string }> {
  const id = await addMessage(conversationId, senderType, content, metadata);
  const createdAt = new Date().toISOString();

  broadcastNewMessage(conversationId, {
    id,
    senderType,
    content,
    createdAt,
    metadata,
  }).catch((err) => logger.error("Realtime broadcast error", err, logCtx));

  return { id, createdAt };
}

async function persistAndDispatchAiMessage(
  conversationId: string,
  content: string,
  metadata: Record<string, unknown>,
  logCtx: Record<string, unknown>
): Promise<void> {
  await addAndBroadcastMessage(conversationId, "ai", content, metadata, logCtx);

  const dispatchResult = await dispatchToChannel(conversationId, content);
  if (!dispatchResult.ok) {
    logger.error("WhatsApp dispatch failed", dispatchResult, logCtx);
  }
}

export async function handleInbound(
  conn: ChannelConnection & { encryptedCredentials: string },
  parsed: ParsedInbound
): Promise<void> {
  const logCtx = {
    projectId: conn.projectId,
    waMessageId: parsed.waMessageId,
    waId: parsed.waId,
  };

  const senderKey = `wa:${parsed.waId}`;
  if (await checkSenderRateLimit(senderKey)) {
    logger.warn("Sender rate-limited, dropping", logCtx);
    return;
  }

  const reservation = await reserveInboundEvent("whatsapp", parsed.waMessageId, conn.projectId, {
    phoneNumberId: parsed.phoneNumberId,
    waId: parsed.waId,
    type: parsed.type,
  });
  if (!reservation) {
    logger.info("Duplicate inbound event, skipping", logCtx);
    return;
  }

  const config = resolveConnectionConfig(
    conn.config as Record<string, unknown>
  );
  const visitorId = `whatsapp:${parsed.waId}`;

  try {
    const conversationId = await resolveConversation(
      conn.projectId,
      visitorId,
      "whatsapp",
      config.resolutionStrategy
    );

    const priorHistory = await getConversationHistory(conversationId);

    const inboundAt = await stampLastInboundAt(conversationId);
    const customerContent =
      parsed.type === "text" ? parsed.text : "[unsupported WhatsApp message]";

    await addAndBroadcastMessage(
      conversationId,
      "customer",
      customerContent,
      { wa_message_id: parsed.waMessageId, phone: parsed.waId },
      logCtx
    );

    await completeInboundEvent(reservation.id, conversationId);

    upsertCustomerPhone(conn.projectId, visitorId, parsed.waId).catch((err) =>
      logger.error("Customer phone upsert error", err, logCtx)
    );

    if (parsed.type === "unsupported") {
      const noticeLang = await resolveNoticeLanguage(
        conn.projectId,
        conversationId
      );
      await persistAndDispatchAiMessage(
        conversationId,
        unsupportedNotice(noticeLang),
        { source: "whatsapp", unsupported: true },
        logCtx
      );
      return;
    }

    if (!config.aiAutoReply) return;

    const result = await processChat({
      projectId: conn.projectId,
      visitorId,
      message: parsed.text,
      sessionId: conversationId,
      source: "whatsapp",
      conversationHistory: priorHistory,
      skipMessageWrites: true,
    });

    if (!result.response) return;

    if (result.handoff?.triggered) {
      await persistAndDispatchAiMessage(
        conversationId,
        result.response,
        { source: "whatsapp", handoff: true },
        logCtx
      );
      return;
    }

    const freshStatus = await getConversationStatus(conversationId);
    const agentRepliedAfter = await hasAgentMessageAfter(
      conversationId,
      inboundAt
    );

    if (
      shouldSuppressAiReply(freshStatus ?? "ai_active", agentRepliedAfter)
    ) {
      logger.info("AI reply suppressed by stale-state guard", {
        ...logCtx,
        freshStatus,
        agentRepliedAfter,
      });
      return;
    }

    await persistAndDispatchAiMessage(
      conversationId,
      result.response,
      { source: "whatsapp" },
      logCtx
    );
  } catch (err) {
    await failInboundEvent(
      reservation.id,
      err instanceof Error ? err.message : String(err)
    );
    throw err;
  }
}
