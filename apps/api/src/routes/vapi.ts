/**
 * Vapi Webhook Handler
 *
 * Receives webhook events from Vapi during voice calls.
 * REUSES the existing chat infrastructure (RAG v2 hybrid search, prompt builder,
 * conversation service) instead of reimplementing them.
 *
 * Events handled:
 * - knowledge-base-request:   Query our RAG pipeline (same as chat)
 * - tool-calls:               Handle custom tools (searchKnowledgeBase, captureLead, handoffToHuman)
 * - end-of-call-report:       Store transcript, duration, cost; create summary message
 * - status-update:            Create voice conversation on call start, log status changes
 * - transcript:               Log individual voice messages to the conversation (so they appear in inbox)
 */

import { Router, Request, Response } from "express";
import {
  retrieve,
  extractSources,
} from "../services/rag";
import { addMessage } from "../services/conversation";
import { supabaseAdmin } from "../lib/supabase";
import { logger, type LogContext } from "../lib/logger";
import { extractQualifyingAnswersFromVoiceTranscript } from "../services/lead-capture-v2";

const router = Router();

// ============================================================================
// Types
// ============================================================================

interface VapiCall {
  id?: string;
  assistantOverrides?: {
    variableValues?: Record<string, string>;
  };
  startedAt?: string;
  endedAt?: string;
}

interface VapiMessage {
  type: string;
  call?: VapiCall;
  messages?: Array<{ role: string; content?: string; message?: string }>;
  status?: string | Record<string, unknown>;
  toolCallList?: Array<{
    id: string;
    name: string;
    arguments: Record<string, unknown>;
  }>;
  endedReason?: string;
  summary?: string;
  transcript?: string;
  recordingUrl?: string;
  cost?: number;
  costBreakdown?: Record<string, unknown>;
  artifact?: Record<string, unknown>;
}

// ============================================================================
// Helpers
// ============================================================================

function getProjectId(call?: VapiCall): string | undefined {
  return call?.assistantOverrides?.variableValues?.projectId;
}

function getVisitorId(call?: VapiCall): string | undefined {
  return call?.assistantOverrides?.variableValues?.visitorId;
}

function getConversationId(call?: VapiCall): string | undefined {
  return call?.assistantOverrides?.variableValues?.conversationId;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

/** Shorten a UUID for log output: "abc123ef-..." → "abc123ef" */
function shortId(id?: string): string {
  if (!id) return "—";
  return id.substring(0, 8);
}

// ============================================================================
// Main Webhook Handler
// ============================================================================

router.post("/webhook", async (req: Request, res: Response) => {
  const { message } = req.body;

  if (!message?.type) {
    return res.status(400).json({ error: "Missing message type" });
  }

  const callId = message.call?.id;
  const projectId = getProjectId(message.call);

  // Minimal context — no noisy fields
  const logCtx: LogContext = {
    callId: shortId(callId),
    projectId: shortId(projectId),
  };

  try {
    switch (message.type) {
      case "knowledge-base-request":
        return await handleKnowledgeBaseRequest(message, res, logCtx);

      case "tool-calls":
        return await handleToolCalls(message, res, logCtx);

      case "end-of-call-report":
        return await handleEndOfCallReport(message, res, logCtx);

      case "status-update":
        return await handleStatusUpdate(message, res, logCtx);

      case "transcript":
        return await handleTranscript(message, res, logCtx);

      default:
        logger.info(`[Vapi] Unhandled event: ${message.type}`, logCtx);
        return res.status(200).json({});
    }
  } catch (error) {
    logger.error(`[Vapi] ${message.type} failed`, error as Error, logCtx);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ============================================================================
// Event Handlers
// ============================================================================

/**
 * Handle knowledge-base-request from Vapi
 * Uses the SAME RAG v2 hybrid search pipeline as the chat engine
 */
async function handleKnowledgeBaseRequest(
  message: VapiMessage,
  res: Response,
  logCtx: LogContext
): Promise<void> {
  const projectId = getProjectId(message.call);

  if (!projectId) {
    logger.warn("[Vapi] KB request — missing projectId", logCtx);
    res.status(200).json({ documents: [] });
    return;
  }

  // Extract the latest user message as the search query
  const userMessages = (message.messages || []).filter((m) => m.role === "user");
  const lastUserMsg = userMessages.length > 0 ? userMessages[userMessages.length - 1] : null;
  const query = lastUserMsg?.message || lastUserMsg?.content || "";

  if (!query) {
    logger.info("[Vapi] KB request — empty query, skipping", logCtx);
    res.status(200).json({ documents: [] });
    return;
  }

  const startTime = Date.now();

  logger.info(`[Vapi] ← KB query: "${query}"`, logCtx);

  try {
    const ragResult = await retrieve(projectId, query, {
      topK: 5,
      threshold: 0.15,
      useHybridSearch: true,
    });

    const chunks = ragResult.chunks;
    const documents = chunks.map((chunk) => ({
      content: chunk.content,
      similarity: chunk.combinedScore || chunk.vectorScore || 0,
      uuid: chunk.id,
    }));

    const sources = extractSources(chunks);
    const duration = Date.now() - startTime;

    // Log each source found with score and content preview
    if (chunks.length > 0) {
      logger.info(`[Vapi]   RAG found ${chunks.length} chunks (${duration}ms, ${ragResult.searchType})`, logCtx);
      for (const chunk of chunks) {
        const preview = chunk.content.replace(/\s+/g, " ").substring(0, 100);
        logger.info(`[Vapi]   ├ [${(chunk.combinedScore || 0).toFixed(2)}] ${chunk.sourceName}: "${preview}…"`, logCtx);
      }
    } else {
      logger.warn(`[Vapi]   RAG found 0 chunks (${duration}ms)`, logCtx);
    }

    logger.info(`[Vapi] → Sending ${documents.length} documents to Vapi`, logCtx);

    res.status(200).json({ documents });
  } catch (error) {
    logger.error("[Vapi] KB search failed", error as Error, {
      ...logCtx,
      query: query.substring(0, 80),
      ms: Date.now() - startTime,
    });
    res.status(200).json({ documents: [] });
  }
}

/**
 * Handle tool-calls from Vapi (server-side tools)
 */
async function handleToolCalls(
  message: VapiMessage,
  res: Response,
  logCtx: LogContext
): Promise<void> {
  const toolCallList = message.toolCallList;

  if (!toolCallList || toolCallList.length === 0) {
    res.status(200).json({ results: [] });
    return;
  }

  const projectId = getProjectId(message.call);
  const visitorId = getVisitorId(message.call);
  const conversationId = getConversationId(message.call);
  const results = [];

  for (const rawToolCall of toolCallList) {
    // Normalize: Vapi may send flat { name, arguments } or nested OpenAI
    // format { function: { name, arguments } } depending on tool config
    const fn = (rawToolCall as Record<string, unknown>).function as
      | { name?: string; arguments?: string | Record<string, unknown> }
      | undefined;
    const toolCall = {
      id: rawToolCall.id,
      name: rawToolCall.name || fn?.name || "unknown",
      arguments:
        rawToolCall.arguments ??
        (typeof fn?.arguments === "string"
          ? JSON.parse(fn.arguments)
          : fn?.arguments) ??
        {},
    };

    logger.info(`[Vapi] Tool call: ${toolCall.name}`, {
      ...logCtx,
      args: JSON.stringify(toolCall.arguments),
    });

    switch (toolCall.name) {
      case "captureLead": {
        const { name, email, phone } = toolCall.arguments as {
          name?: string;
          email?: string;
          phone?: string;
        };

        if (projectId && email) {
          try {
            const { data: customer } = await supabaseAdmin
              .from("customers")
              .select("id")
              .eq("project_id", projectId)
              .eq("email", email)
              .single();

            if (customer) {
              await supabaseAdmin
                .from("customers")
                .update({
                  name: name || undefined,
                  phone: phone || undefined,
                  last_seen_at: new Date().toISOString(),
                })
                .eq("id", customer.id);
            } else if (visitorId) {
              await supabaseAdmin
                .from("customers")
                .update({
                  email,
                  name: name || undefined,
                  phone: phone || undefined,
                  last_seen_at: new Date().toISOString(),
                })
                .eq("project_id", projectId)
                .eq("visitor_id", visitorId);
            }

            await supabaseAdmin.from("qualified_leads").upsert(
              {
                project_id: projectId,
                email,
                form_data: { name, email, phone },
                capture_source: "voice",
                qualification_status: "qualified",
              },
              { onConflict: "project_id,email" }
            );

            logger.info("[Vapi] Lead captured", {
              ...logCtx,
              email: email.replace(/(.{2}).*(@.*)/, "$1***$2"),
            });

            results.push({
              toolCallId: toolCall.id,
              result: JSON.stringify({ success: true, message: "Lead captured successfully" }),
            });
          } catch (error) {
            logger.error("[Vapi] Lead capture failed", error as Error, logCtx);
            results.push({
              toolCallId: toolCall.id,
              result: JSON.stringify({ success: false, message: "Failed to capture lead" }),
            });
          }
        } else {
          results.push({
            toolCallId: toolCall.id,
            result: JSON.stringify({ success: false, message: "Missing email or projectId" }),
          });
        }
        break;
      }

      case "handoffToHuman": {
        const reason = (toolCall.arguments as { reason?: string }).reason;
        const callId = message.call?.id;
        let convId = conversationId;

        if (!convId && callId) {
          const { data: conv } = await supabaseAdmin
            .from("conversations")
            .select("id")
            .eq("voice_call_id", callId)
            .single();
          convId = conv?.id;
        }

        if (convId) {
          try {
            await supabaseAdmin
              .from("conversations")
              .update({
                status: "waiting",
                handoff_reason: reason || "Customer requested human agent during voice call",
                handoff_triggered_at: new Date().toISOString(),
              })
              .eq("id", convId);

            await addMessage(
              convId,
              "system",
              `Customer requested to speak with a human agent during a voice call.${reason ? ` Reason: ${reason}` : ""}`
            );

            logger.info("[Vapi] Handoff triggered", { ...logCtx, reason });

            results.push({
              toolCallId: toolCall.id,
              result: JSON.stringify({
                success: true,
                message: "A human agent has been notified. They will follow up shortly.",
              }),
            });
          } catch (error) {
            logger.error("[Vapi] Handoff failed", error as Error, logCtx);
            results.push({
              toolCallId: toolCall.id,
              result: JSON.stringify({ success: false, message: "Failed to connect with agent" }),
            });
          }
        } else {
          logger.warn("[Vapi] Handoff — no conversation found", logCtx);
          results.push({
            toolCallId: toolCall.id,
            result: JSON.stringify({
              success: true,
              message: "A human agent will follow up. Thank you for your patience.",
            }),
          });
        }
        break;
      }

      case "searchKnowledgeBase": {
        const query = (toolCall.arguments as { query?: string }).query;
        if (projectId && query) {
          try {
            const ragResult = await retrieve(projectId, query, {
              topK: 5,
              threshold: 0.15,
              useHybridSearch: true,
            });
            const context = ragResult.chunks
              .map((c) => c.content)
              .join("\n\n---\n\n");
            logger.info(`[Vapi] KB search: "${query}" → ${ragResult.chunks.length} chunks`, logCtx);
            results.push({
              toolCallId: toolCall.id,
              result: context || "No relevant information found in the knowledge base.",
            });
          } catch (error) {
            logger.error("[Vapi] KB search failed", error as Error, logCtx);
            results.push({
              toolCallId: toolCall.id,
              result: "Sorry, I couldn't search the knowledge base right now.",
            });
          }
        } else {
          results.push({
            toolCallId: toolCall.id,
            result: "No relevant information found.",
          });
        }
        break;
      }

      default:
        logger.warn(`[Vapi] Unknown tool: ${toolCall.name}`, logCtx);
        results.push({
          toolCallId: toolCall.id,
          result: JSON.stringify({ error: `Unknown tool: ${toolCall.name}` }),
        });
    }
  }

  res.status(200).json({ results });
}

/**
 * Handle end-of-call-report from Vapi
 * Store transcript, duration, cost. Log all messages to the conversation.
 */
async function handleEndOfCallReport(
  message: VapiMessage,
  res: Response,
  logCtx: LogContext
): Promise<void> {
  const call = message.call;
  const callId = call?.id;
  const endedReason = message.endedReason;
  const summary = message.summary;
  const transcript = message.transcript;
  const recordingUrl = message.recordingUrl;
  const totalCost = message.cost || 0;

  const callMessages = (message.artifact as Record<string, unknown>)?.messages as Array<Record<string, unknown>> | undefined
    || message.messages as unknown as Array<Record<string, unknown>> | undefined;

  // Calculate duration
  let durationSeconds = 0;
  if (call?.startedAt && call?.endedAt) {
    durationSeconds = Math.round(
      (new Date(call.endedAt).getTime() - new Date(call.startedAt).getTime()) / 1000
    );
  }

  logger.info(`[Vapi] Call ended — ${endedReason || "unknown"} (${formatDuration(durationSeconds)}, $${totalCost.toFixed(4)})`, {
    ...logCtx,
    messages: callMessages?.length || 0,
    hasSummary: !!summary,
    hasRecording: !!recordingUrl,
  });

  if (!callId) {
    res.status(200).json({ received: true });
    return;
  }

  const { data: conversation } = await supabaseAdmin
    .from("conversations")
    .select("id, project_id")
    .eq("voice_call_id", callId)
    .single();

  if (!conversation) {
    logger.warn("[Vapi] End-of-call — no conversation found", logCtx);
    res.status(200).json({ received: true });
    return;
  }

  try {
    // 1. Update conversation with voice call metadata (keep existing status — no auto-resolve)
    await supabaseAdmin
      .from("conversations")
      .update({
        voice_duration_seconds: durationSeconds,
        voice_cost: totalCost,
        voice_recording_url: recordingUrl || null,
        voice_transcript: callMessages || null,
        voice_ended_reason: endedReason || null,
      })
      .eq("id", conversation.id);

    // 2. Check if messages were already logged via real-time transcript events
    const { count: existingMsgCount } = await supabaseAdmin
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("conversation_id", conversation.id);

    let loggedMessages = 0;
    if ((existingMsgCount || 0) === 0 && callMessages && callMessages.length > 0) {
      for (const msg of callMessages) {
        const role = msg.role as string;
        const content = (msg.message as string) || (msg.content as string) || "";
        if (!content.trim()) continue;

        if (role === "user" || role === "assistant" || role === "bot") {
          const senderType = role === "user" ? "customer" : "ai";
          await addMessage(conversation.id, senderType, content, {
            source: "voice",
            voice_call_id: callId,
          });
          loggedMessages++;
        }
      }
      if (loggedMessages > 0) {
        logger.info(`[Vapi] Backfilled ${loggedMessages} messages from report`, logCtx);
      }
    }

    // 3. Add summary as a system message
    const durationStr = formatDuration(durationSeconds);
    const summaryContent = summary
      ? `Voice call ended (${durationStr}). Summary: ${summary}`
      : `Voice call ended (${durationStr}).`;

    await addMessage(conversation.id, "system", summaryContent, {
      type: "voice_call_summary",
      duration: durationSeconds,
      endedReason,
      cost: totalCost,
    });

    // 4. Update message count and last_message_at
    const { count: totalMessages } = await supabaseAdmin
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("conversation_id", conversation.id);

    await supabaseAdmin
      .from("conversations")
      .update({
        message_count: totalMessages || loggedMessages + 1,
        last_message_at: new Date().toISOString(),
      })
      .eq("id", conversation.id);

    logger.info("[Vapi] End-of-call processed", {
      ...logCtx,
      conversationId: shortId(conversation.id),
    });

    // Extract qualifying answers from voice transcript (async, non-blocking)
    const visitorId = getVisitorId(message.call);
    if (visitorId && callMessages && callMessages.length > 0) {
      extractQualifyingAnswersFromVoiceTranscript(
        conversation.project_id,
        visitorId,
        callMessages as Array<{ role: string; message?: string; content?: string }>
      ).catch(err => logger.error("[Vapi] Qualifying extraction failed", err as Error, logCtx));
    }
  } catch (error) {
    logger.error("[Vapi] End-of-call processing failed", error as Error, {
      ...logCtx,
      conversationId: shortId(conversation.id),
    });
  }

  res.status(200).json({ received: true });
}

/**
 * Create a new voice conversation record
 */
async function createVoiceConversation(
  callId: string,
  projectId: string,
  visitorId: string,
  logCtx: LogContext
): Promise<string | null> {
  const { data: customer } = await supabaseAdmin
    .from("customers")
    .select("id")
    .eq("project_id", projectId)
    .eq("visitor_id", visitorId)
    .single();

  const { data: newConv } = await supabaseAdmin
    .from("conversations")
    .insert({
      project_id: projectId,
      visitor_id: visitorId,
      customer_id: customer?.id || null,
      status: "ai_active",
      source: "voice",
      is_voice_call: true,
      voice_provider: "vapi",
      voice_call_id: callId,
      message_count: 0,
    })
    .select("id")
    .single();

  if (newConv) {
    logger.info("[Vapi] New voice conversation", {
      ...logCtx,
      conversationId: shortId(newConv.id),
    });
    return newConv.id;
  }
  return null;
}

/**
 * Handle status-update from Vapi
 */
async function handleStatusUpdate(
  message: VapiMessage,
  res: Response,
  logCtx: LogContext
): Promise<void> {
  const status = message.status;
  const callStatus = typeof status === "string" ? status : (status as Record<string, unknown>)?.status as string;
  const call = message.call;
  const callId = call?.id;

  const projectId = getProjectId(call);
  const visitorId = getVisitorId(call);
  const conversationId = getConversationId(call);

  if (callStatus === "in-progress") {
    logger.info("[Vapi] ━━━ Call started ━━━", logCtx);
  } else if (callStatus === "ended") {
    logger.info("[Vapi] ━━━ Call ended ━━━", logCtx);
  } else {
    logger.info(`[Vapi] Status: ${callStatus}`, logCtx);
  }

  // On call start, link voice call to a conversation
  if (callStatus === "in-progress" && callId && projectId && visitorId) {
    try {
      const { data: existingByCallId } = await supabaseAdmin
        .from("conversations")
        .select("id")
        .eq("voice_call_id", callId)
        .single();

      if (existingByCallId) {
        logger.info("[Vapi] Call already linked", {
          ...logCtx,
          conversationId: shortId(existingByCallId.id),
        });
      } else if (conversationId) {
        const { data: existingConv } = await supabaseAdmin
          .from("conversations")
          .select("id")
          .eq("id", conversationId)
          .eq("project_id", projectId)
          .single();

        if (existingConv) {
          await supabaseAdmin
            .from("conversations")
            .update({
              is_voice_call: true,
              voice_provider: "vapi",
              voice_call_id: callId,
            })
            .eq("id", existingConv.id);

          logger.info("[Vapi] Linked to existing conversation", {
            ...logCtx,
            conversationId: shortId(existingConv.id),
          });
        } else {
          await createVoiceConversation(callId, projectId, visitorId, logCtx);
        }
      } else {
        await createVoiceConversation(callId, projectId, visitorId, logCtx);
      }
    } catch (error) {
      logger.error("[Vapi] Failed to link conversation", error as Error, logCtx);
    }
  }

  res.status(200).json({ received: true });
}

/**
 * Handle real-time transcript events from Vapi
 */
async function handleTranscript(
  message: VapiMessage,
  res: Response,
  logCtx: LogContext
): Promise<void> {
  const call = message.call;
  const callId = call?.id;
  const transcriptData = message as unknown as Record<string, unknown>;
  const role = transcriptData.role as string;
  const transcriptText = transcriptData.transcript as string;
  const transcriptType = transcriptData.transcriptType as string;

  // Only store final transcripts (not partials)
  if (transcriptType !== "final" || !transcriptText?.trim()) {
    res.status(200).json({ received: true });
    return;
  }

  const speaker = role === "user" ? "User" : "AI  ";
  logger.info(`[Vapi] ${speaker}: "${transcriptText.substring(0, 100)}${transcriptText.length > 100 ? "…" : ""}"`, logCtx);

  // Store in DB
  if (callId) {
    try {
      const { data: conversation } = await supabaseAdmin
        .from("conversations")
        .select("id")
        .eq("voice_call_id", callId)
        .single();

      if (conversation) {
        const senderType = role === "user" ? "customer" : "ai";
        await addMessage(conversation.id, senderType, transcriptText, {
          source: "voice",
          voice_call_id: callId,
        });

        await supabaseAdmin
          .from("conversations")
          .update({ last_message_at: new Date().toISOString() })
          .eq("id", conversation.id);
      } else {
        logger.warn("[Vapi] Transcript — no conversation found", logCtx);
      }
    } catch (error) {
      logger.error("[Vapi] Transcript storage failed", error as Error, logCtx);
    }
  }

  res.status(200).json({ received: true });
}

export { router as vapiRouter };
