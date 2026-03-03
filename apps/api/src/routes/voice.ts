/**
 * ElevenLabs Voice Agent Routes
 *
 * The widget connects to ElevenLabs via their client SDK; ElevenLabs calls
 * our /api/voice/llm/:projectId endpoint as its custom LLM provider (OpenAI-compatible).
 *
 * Routes:
 *   GET  /api/voice/config/:projectId  — Returns ElevenLabs signed URL + greeting
 *   POST /api/voice/llm/:projectId     — OpenAI-compatible SSE endpoint (called by ElevenLabs)
 *   POST /api/voice/session-end        — Widget notifies us when voice call ends
 */

import { Router, Request, Response } from "express";
import { supabaseAdmin } from "../lib/supabase";
import { logger } from "../lib/logger";
import { processChat, type ChatOutput } from "../services/chat-engine";

const router = Router();

// ---------------------------------------------------------------------------
// Silence tracking
// ---------------------------------------------------------------------------

/**
 * Per-session counter for consecutive silence events.
 * ElevenLabs sends "..." when the user is silent past the "take turn after
 * silence" threshold. We intercept these at the route level — no LLM call
 * needed. First silence → probe, second silence → farewell.
 */
const silenceCounters = new Map<string, number>();

const SILENCE_PROBE = "Hey, are you still there? Take your time, I'm here whenever you're ready.";
const SILENCE_FAREWELL = "It was great chatting with you! Feel free to come back anytime. Goodbye!";

/** Check if a message is a silence indicator (only dots/ellipsis/whitespace) */
function isSilenceMessage(message: string): boolean {
  return !message.replace(/\./g, "").trim();
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Format seconds as "M:SS" for "Voice call ended" messages */
function formatVoiceDuration(seconds?: number): string {
  if (!seconds || seconds <= 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/**
 * Strip markdown and widget-specific fields from a ChatOutput for TTS.
 * ElevenLabs only needs the plain text response.
 */
function formatForVoice(output: ChatOutput): string {
  let text = output.response;
  // Light markdown cleanup for better TTS readability
  text = text.replace(/\*\*(.+?)\*\*/g, "$1");        // **bold** → bold
  text = text.replace(/\*(.+?)\*/g, "$1");              // *italic* → italic
  text = text.replace(/#{1,6}\s+/g, "");                // headings
  text = text.replace(/^\s*[-*+]\s+/gm, "");            // bullet points
  text = text.replace(/^\s*\d+\.\s+/gm, "");            // numbered lists
  text = text.replace(/`{1,3}[^`]*`{1,3}/g, "");        // inline/block code
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");  // [link text](url) → link text
  return text.trim();
}

/**
 * Fetch a signed WebSocket URL from ElevenLabs for starting a conversation.
 * The signed URL authenticates the client without exposing the API key.
 */
async function getElevenLabsSignedUrl(apiKey: string, agentId: string): Promise<string> {
  const res = await fetch(
    `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${encodeURIComponent(agentId)}`,
    {
      headers: { "xi-api-key": apiKey },
    }
  );

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`ElevenLabs signed URL failed: ${res.status} ${body}`);
  }

  const data = (await res.json()) as { signed_url: string };
  return data.signed_url;
}

/**
 * Stream a text response as OpenAI-compatible SSE chunks.
 * Used by both the normal LLM flow and the silence interceptor.
 */
function streamSSEResponse(res: Response, text: string): void {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const id = `chatcmpl-voice-${Date.now()}`;
  const words = text.split(/(\s+)/);
  const chunkSize = 5;

  for (let i = 0; i < words.length; i += chunkSize) {
    const chunk = words.slice(i, i + chunkSize).join("");
    res.write(`data: ${JSON.stringify({
      id,
      object: "chat.completion.chunk",
      model: "gpt-4o-mini",
      choices: [{ index: 0, delta: { content: chunk }, finish_reason: null }],
    })}\n\n`);
  }

  res.write(`data: ${JSON.stringify({
    id,
    object: "chat.completion.chunk",
    model: "gpt-4o-mini",
    choices: [{ index: 0, delta: {}, finish_reason: "stop" }],
  })}\n\n`);
  res.write("data: [DONE]\n\n");
  res.end();
}

/**
 * Load prior text-chat history for context seeding on the first voice turn.
 * Returns messages in {role, content} format for prepending to conversation history.
 */
async function loadPriorChatHistory(
  sessionId: string
): Promise<Array<{ role: "user" | "assistant"; content: string }>> {
  const { data: dbMessages } = await supabaseAdmin
    .from("messages")
    .select("sender_type, content, metadata")
    .eq("conversation_id", sessionId)
    .in("sender_type", ["customer", "ai"])
    .order("created_at", { ascending: true })
    .limit(30);

  if (!dbMessages) return [];

  return dbMessages
    .filter(m => {
      const meta = (m.metadata as Record<string, unknown> | null) ?? {};
      // Exclude housekeeping summaries ("Voice call ended…").
      // Keep text-chat messages and previous voice-call transcripts so the
      // qualifying-question interceptor knows what has already been asked/answered.
      return !meta.voice_summary;
    })
    .map(m => ({
      role: (m.sender_type === "customer" ? "user" : "assistant") as "user" | "assistant",
      content: m.content as string,
    }));
}

// ---------------------------------------------------------------------------
// Route A: GET /api/voice/config/:projectId
// ---------------------------------------------------------------------------

/**
 * Returns an ElevenLabs signed URL + voice greeting.
 * Widget calls this before each voice call, then connects via the SDK.
 *
 * Query params:
 *   visitorId  (string) — widget visitor ID
 *   sessionId  (string, optional) — existing conversation ID for continuity
 */
router.get("/config/:projectId", async (req: Request, res: Response) => {
  const { projectId } = req.params;

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(projectId)) {
    return res.status(400).json({
      error: { code: "INVALID_ID", message: "Invalid project ID format" },
    });
  }

  try {
    // Fetch project settings
    const { data: project, error } = await supabaseAdmin
      .from("projects")
      .select("id, name, settings, voice_enabled, voice_greeting")
      .eq("id", projectId)
      .is("deleted_at", null)
      .single();

    if (error || !project) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Project not found" },
      });
    }

    const settings = (project.settings as Record<string, unknown>) || {};
    const voiceEnabled = project.voice_enabled === true;
    const widgetEnabled = settings.widget_enabled !== false;

    if (!voiceEnabled || !widgetEnabled) {
      return res.json({ voiceEnabled: false });
    }

    // Check ElevenLabs credentials are configured
    if (!process.env.ELEVENLABS_API_KEY || !process.env.ELEVENLABS_AGENT_ID) {
      logger.error("[Voice Config] ELEVENLABS_API_KEY or ELEVENLABS_AGENT_ID not set", {}, { projectId });
      return res.status(500).json({
        error: { code: "CONFIG_ERROR", message: "Voice not configured" },
      });
    }

    const voiceGreeting = project.voice_greeting || "Hi! How can I help you today?";

    // Get a signed URL for the ElevenLabs WebSocket connection
    const signedUrl = await getElevenLabsSignedUrl(
      process.env.ELEVENLABS_API_KEY,
      process.env.ELEVENLABS_AGENT_ID
    );

    logger.info("[Voice Config] Voice config served", {
      projectId,
      visitorId: req.query.visitorId as string | undefined,
      sessionId: req.query.sessionId as string | undefined,
    });

    return res.json({
      voiceEnabled: true,
      signedUrl,
      greeting: voiceGreeting,
    });
  } catch (error) {
    logger.error("[Voice Config] Failed to fetch voice config", error as Error, { projectId });
    return res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Internal server error" },
    });
  }
});

// ---------------------------------------------------------------------------
// Route B: POST /api/voice/llm/:projectId
// ---------------------------------------------------------------------------

interface OpenAIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/**
 * OpenAI-compatible LLM endpoint called by ElevenLabs on every user turn.
 * Receives the full conversation in OpenAI messages format, runs it through
 * our chat engine, and streams the response back as OpenAI SSE.
 *
 * ElevenLabs passes visitorId/sessionId via elevenlabs_extra_body
 * (enabled in agent Security > Overrides > Custom LLM extra body).
 */
router.post("/llm/:projectId/chat/completions", async (req: Request, res: Response) => {
  const { projectId } = req.params;

  // Extract visitorId/sessionId from ElevenLabs extra body (preferred)
  // with fallback to headers for backward compatibility
  const extraBody = req.body.elevenlabs_extra_body as
    | { visitorId?: string; sessionId?: string }
    | undefined;
  const visitorId =
    extraBody?.visitorId ||
    (req.headers["x-visitor-id"] as string) ||
    `voice_anon_${Date.now()}`;
  const sessionId =
    extraBody?.sessionId ||
    (req.headers["x-session-id"] as string) ||
    undefined;

  const { messages } = req.body as { messages: OpenAIMessage[]; stream?: boolean };

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "messages array is required" });
  }

  // Extract the last user message as the current input
  const userMessages = messages.filter(m => m.role === "user");
  const lastUserMessage = userMessages.at(-1)?.content || "";

  if (!lastUserMessage.trim()) {
    return res.status(400).json({ error: "No user message found" });
  }

  // Build conversation history from all prior user/assistant turns (exclude last user message).
  let conversationHistory = messages
    .filter(m => m.role === "user" || m.role === "assistant")
    .slice(0, -1)
    .map(m => ({ role: m.role as "user" | "assistant", content: m.content }));

  // First-turn context seeding: when ElevenLabs sends the first turn (no prior
  // user/assistant messages in the array), load text-chat history from DB so
  // the agent is aware of prior conversation. This replaces Deepgram's
  // agent.context.messages which were seeded at connection time.
  if (conversationHistory.length === 0 && sessionId) {
    const priorMessages = await loadPriorChatHistory(sessionId);
    if (priorMessages.length > 0) {
      conversationHistory = priorMessages;
    }
  }

  // ── Silence interceptor ───────────────────────────────────────────────
  // ElevenLabs sends "..." when the user is silent past the "take turn
  // after silence" threshold. We handle this here — no LLM call needed.
  if (isSilenceMessage(lastUserMessage) && sessionId) {
    const count = (silenceCounters.get(sessionId) || 0) + 1;
    silenceCounters.set(sessionId, count);

    const response = count === 1 ? SILENCE_PROBE : SILENCE_FAREWELL;

    logger.info("[Voice LLM] Silence intercepted", {
      projectId, visitorId, sessionId, silenceCount: count,
    });

    streamSSEResponse(res, response);
    return;
  }

  // Non-silence message — reset counter
  if (sessionId) silenceCounters.delete(sessionId);

  logger.info("[Voice LLM] processChat called", {
    projectId,
    visitorId,
    sessionId,
    message: lastUserMessage,
    historyCount: conversationHistory.length,
  });

  try {
    const chatOutput = await processChat({
      projectId,
      visitorId,
      message: lastUserMessage,
      conversationHistory,
      sessionId,
      source: "voice",
    });

    const plainText = formatForVoice(chatOutput);

    logger.info("[Voice LLM] processChat response", {
      projectId,
      visitorId,
      sessionId,
      response: plainText,
      leadCapture: chatOutput.leadCapture ?? null,
    });

    // Return as OpenAI SSE stream
    streamSSEResponse(res, plainText);
  } catch (error) {
    logger.error("[Voice LLM] Chat processing failed", error as Error, {
      projectId,
      visitorId,
      sessionId,
    });

    // Return a graceful error response in SSE format
    streamSSEResponse(res, "I'm sorry, I ran into a problem. Please try again.");
  }
});

// ---------------------------------------------------------------------------
// Route C: POST /api/voice/session-end
// ---------------------------------------------------------------------------

/**
 * Widget calls this when a voice call ends to update the conversation record.
 */
router.post("/session-end", async (req: Request, res: Response) => {
  const { projectId, visitorId, sessionId, durationSeconds, transcript } = req.body as {
    projectId?: string;
    visitorId?: string;
    sessionId?: string;
    durationSeconds?: number;
    transcript?: Array<{ role: "user" | "assistant"; content: string }>;
  };

  if (!sessionId) {
    return res.status(400).json({ error: "sessionId is required" });
  }

  // Clean up silence tracking for this session
  silenceCounters.delete(sessionId);

  try {
    // Update conversation metadata
    await supabaseAdmin
      .from("conversations")
      .update({
        voice_duration_seconds: typeof durationSeconds === "number" ? Math.round(durationSeconds) : null,
        voice_ended_reason: "user_closed",
        voice_provider: "elevenlabs",
      })
      .eq("id", sessionId);

    // Batch-insert voice transcript so it's visible on refresh (no per-turn DB writes during call)
    if (Array.isArray(transcript) && transcript.length > 0) {
      const filtered = transcript
        .filter(t => t.content?.trim())
        // Deduplicate: skip consecutive turns with same role and content (LLM called twice)
        .filter((t, i, arr) => {
          if (i === 0) return true;
          const prev = arr[i - 1];
          return !(prev.role === t.role && prev.content === t.content);
        });

      // Merge consecutive same-role fragments — ElevenLabs may split responses
      // into multiple transcript events. Merging ensures each logical AI turn
      // appears as a single chat bubble after post-call sync.
      const merged = filtered.reduce<Array<{ role: "user" | "assistant"; content: string }>>((acc, turn) => {
        if (acc.length === 0) return [{ ...turn }];
        const prev = acc[acc.length - 1]!;
        if (prev.role === turn.role) {
          prev.content = prev.content + " " + turn.content.trim();
          return acc;
        }
        return [...acc, { ...turn }];
      }, []);

      const rows = merged.map(t => ({
        conversation_id: sessionId,
        sender_type: t.role === "user" ? "customer" : "ai",
        content: t.content.trim(),
        metadata: { voice_message: true },
      }));
      if (rows.length > 0) {
        await supabaseAdmin.from("messages").insert(rows);
      }
    }

    // Insert a single "Voice call ended" summary as a clean text-thread entry
    await supabaseAdmin.from("messages").insert({
      conversation_id: sessionId,
      sender_type: "ai",
      content: `Voice call ended (${formatVoiceDuration(durationSeconds)}). Continue chatting below.`,
      metadata: { voice_summary: true },
    });

    logger.info("[Voice] Session end recorded", { projectId, visitorId, sessionId, durationSeconds });

    return res.json({ ok: true });
  } catch (error) {
    logger.error("[Voice] Failed to record session end", error as Error, { sessionId });
    return res.status(500).json({ error: "Internal server error" });
  }
});

export { router as voiceRouter };
