/**
 * Deepgram Voice Agent Routes
 *
 * Replaces the Vapi integration with Deepgram's Voice Agent API.
 * The widget connects directly to Deepgram via WebSocket; Deepgram calls
 * our /api/voice/llm/:projectId endpoint as its LLM provider (OpenAI-compatible).
 *
 * Routes:
 *   GET  /api/voice/config/:projectId  — Returns Deepgram temp token + AgentV1Settings
 *   POST /api/voice/llm/:projectId     — OpenAI-compatible SSE endpoint (called by Deepgram)
 *   POST /api/voice/session-end        — Widget notifies us when voice call ends
 */

import { Router, Request, Response } from "express";
import { supabaseAdmin } from "../lib/supabase";
import { logger } from "../lib/logger";
import { processChat, type ChatOutput } from "../services/chat-engine";

const router = Router();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Strip markdown and widget-specific fields from a ChatOutput for TTS.
 * Deepgram only needs the plain text response — sources, toolCalls, handoff, etc. are widget-only.
 */
/** Format seconds as "M:SS" for "Voice call ended" messages */
function formatVoiceDuration(seconds?: number): string {
  if (!seconds || seconds <= 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

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
  // Intentionally not returned: sources, toolCalls, handoff, processingTime,
  // tokensUsed, leadCapture, requestId — these are widget-only fields.
}

/** Create a short-lived Deepgram API key scoped to usage:write.
 *  Returns { key, keyId } where key is used as the WebSocket token
 *  and keyId is stored by the widget for deletion on session end.
 */
async function createDeepgramSessionKey(masterKey: string, dgProjectId: string): Promise<{ key: string; keyId: string }> {
  // Safety-net expiry: 2 hours from now (key is deleted explicitly on session-end)
  const expiry = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();

  const res = await fetch(`https://api.deepgram.com/v1/projects/${dgProjectId}/keys`, {
    method: "POST",
    headers: {
      Authorization: `Token ${masterKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      comment: "cover-widget-voice-session",
      scopes: ["member"],
      expiration_date: expiry,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Deepgram key creation failed: ${res.status} ${body}`);
  }

  const data = (await res.json()) as { api_key_id: string; key: string };
  return { key: data.key, keyId: data.api_key_id };
}

/** Delete a Deepgram API key. Best-effort — logs but does not throw. */
async function deleteDeepgramSessionKey(masterKey: string, dgProjectId: string, keyId: string): Promise<void> {
  try {
    const res = await fetch(`https://api.deepgram.com/v1/projects/${dgProjectId}/keys/${keyId}`, {
      method: "DELETE",
      headers: { Authorization: `Token ${masterKey}` },
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      logger.warn("[Voice] Deepgram key deletion failed", { keyId, status: res.status, body });
    }
  } catch (err) {
    logger.warn("[Voice] Deepgram key deletion error", { keyId, error: String(err) });
  }
}

// ---------------------------------------------------------------------------
// Route A: GET /api/voice/config/:projectId
// ---------------------------------------------------------------------------

/**
 * Returns Deepgram short-lived token + full AgentV1Settings JSON.
 * Widget calls this before each voice call, then opens a WebSocket to Deepgram.
 *
 * Query params:
 *   visitorId  (string) — widget visitor ID (forwarded to LLM endpoint headers)
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

    // Check Deepgram API key + project ID are configured
    if (!process.env.DEEPGRAM_API_KEY || !process.env.DEEPGRAM_PROJECT_ID) {
      logger.error("[Voice Config] DEEPGRAM_API_KEY or DEEPGRAM_PROJECT_ID not set", {}, { projectId });
      return res.status(500).json({
        error: { code: "CONFIG_ERROR", message: "Voice not configured" },
      });
    }

    const visitorId = req.query.visitorId as string | undefined;
    const sessionId = req.query.sessionId as string | undefined;

    const voiceGreeting = project.voice_greeting || "Hi! How can I help you today?";

    // Create a short-lived Deepgram key for this session (deleted on session-end)
    const { key: deepgramToken, keyId: deepgramKeyId } = await createDeepgramSessionKey(
      process.env.DEEPGRAM_API_KEY,
      process.env.DEEPGRAM_PROJECT_ID
    );
    const apiBaseUrl = process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 3001}`;

    // Deepgram forwards these headers to our LLM endpoint on every turn
    const endpointHeaders: Record<string, string> = {};
    if (visitorId) endpointHeaders["x-visitor-id"] = visitorId;
    if (sessionId) endpointHeaders["x-session-id"] = sessionId;

    // Load existing text-chat history to pre-seed Deepgram's context so the agent
    // is aware of prior conversation from the start of the call.
    // Deepgram will include these in every messages array it sends to our LLM endpoint,
    // so the LLM endpoint does not need a separate DB reload.
    type HistoryMessage = { type: "History"; role: "user" | "assistant"; content: string };
    let contextMessages: HistoryMessage[] = [];
    if (sessionId) {
      const { data: dbMessages } = await supabaseAdmin
        .from("messages")
        .select("sender_type, content, metadata")
        .eq("conversation_id", sessionId)
        .in("sender_type", ["customer", "ai"])
        .order("created_at", { ascending: true })
        .limit(30);

      if (dbMessages) {
        contextMessages = dbMessages
          .filter(m => {
            const meta = (m.metadata as Record<string, unknown> | null) ?? {};
            // Exclude only housekeeping summaries ("Voice call ended…").
            // Keep both text-chat messages and previous voice-call transcripts so the
            // qualifying-question interceptor knows what has already been asked and answered.
            return !meta.voice_summary;
          })
          .map(m => ({
            type: "History" as const,
            role: (m.sender_type === "customer" ? "user" : "assistant") as "user" | "assistant",
            content: m.content as string,
          }));
      }
    }

    logger.info("[Voice Config] Voice config served", {
      projectId,
      visitorId,
      sessionId,
      contextMessageCount: contextMessages.length,
    });

    // Return token + full Deepgram AgentV1Settings
    return res.json({
      voiceEnabled: true,
      token: deepgramToken,
      keyId: deepgramKeyId,
      settings: {
        type: "Settings",
        audio: {
          input: { encoding: "linear16", sample_rate: 16000 },
          output: { encoding: "linear16", sample_rate: 24000, container: "none" },
        },
        agent: {
          ...(contextMessages.length > 0 ? { context: { messages: contextMessages } } : {}),
          language: "en",
          listen: {
            provider: {
              type: "deepgram",
              model: process.env.DEEPGRAM_LISTEN_MODEL || "nova-3",
              smart_format: true,
              endpointing: 200,
            },
          },
          think: {
            provider: {
              type: "open_ai",
              model: "gpt-4o-mini",
              temperature: 0.7,
            },
            endpoint: {
              url: `${apiBaseUrl}/api/voice/llm/${projectId}`,
              headers: endpointHeaders,
            },
            // Brief voice-style directive. The full system prompt and qualifying-question
            // logic live in processChat() — our custom LLM endpoint handles all of that.
            prompt: "Respond naturally and conversationally. Keep responses brief and clear for voice. Avoid markdown, bullet points, and lists.",
            context_length: 6000,
          },
          speak: {
            provider: {
              type: "deepgram",
              model: process.env.DEEPGRAM_VOICE_MODEL || "aura-2-thalia-en",
            },
          },
          greeting: voiceGreeting,
        },
      },
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
 * OpenAI-compatible LLM endpoint called by Deepgram on every user turn.
 * Receives the full conversation in OpenAI messages format, runs it through
 * our chat engine, and streams the response back as OpenAI SSE.
 *
 * Headers (forwarded by Deepgram from the endpoint config):
 *   x-visitor-id  — widget visitor ID
 *   x-session-id  — existing conversation ID (optional)
 */
router.post("/llm/:projectId", async (req: Request, res: Response) => {
  const { projectId } = req.params;
  const visitorId = (req.headers["x-visitor-id"] as string) || `voice_anon_${Date.now()}`;
  const sessionId = (req.headers["x-session-id"] as string) || undefined;

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
  // Deepgram includes agent.context (text-chat history seeded at call start) in every
  // messages array it sends here, so no separate DB reload is needed.
  const conversationHistory = messages
    .filter(m => m.role === "user" || m.role === "assistant")
    .slice(0, -1)
    .map(m => ({ role: m.role as "user" | "assistant", content: m.content }));

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
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const id = `chatcmpl-voice-${Date.now()}`;
    const words = plainText.split(/(\s+)/); // preserve whitespace separators
    const chunkSize = 5;

    for (let i = 0; i < words.length; i += chunkSize) {
      const chunk = words.slice(i, i + chunkSize).join("");
      const payload = {
        id,
        object: "chat.completion.chunk",
        model: "gpt-4o-mini",
        choices: [
          {
            index: 0,
            delta: { content: chunk },
            finish_reason: null,
          },
        ],
      };
      res.write(`data: ${JSON.stringify(payload)}\n\n`);
    }

    // Final chunk with finish_reason
    res.write(
      `data: ${JSON.stringify({
        id,
        object: "chat.completion.chunk",
        model: "gpt-4o-mini",
        choices: [{ index: 0, delta: {}, finish_reason: "stop" }],
      })}\n\n`
    );
    res.write("data: [DONE]\n\n");
    res.end();
  } catch (error) {
    logger.error("[Voice LLM] Chat processing failed", error as Error, {
      projectId,
      visitorId,
      sessionId,
    });

    // Return a graceful error response in SSE format
    const id = `chatcmpl-voice-err-${Date.now()}`;
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    const errorText = "I'm sorry, I ran into a problem. Please try again.";
    res.write(
      `data: ${JSON.stringify({
        id,
        object: "chat.completion.chunk",
        model: "gpt-4o-mini",
        choices: [{ index: 0, delta: { content: errorText }, finish_reason: "stop" }],
      })}\n\n`
    );
    res.write("data: [DONE]\n\n");
    res.end();
  }
});

// ---------------------------------------------------------------------------
// Route C: POST /api/voice/session-end
// ---------------------------------------------------------------------------

/**
 * Widget calls this when a voice call ends to update the conversation record.
 */
router.post("/session-end", async (req: Request, res: Response) => {
  const { projectId, visitorId, sessionId, durationSeconds, transcript, keyId } = req.body as {
    projectId?: string;
    visitorId?: string;
    sessionId?: string;
    durationSeconds?: number;
    transcript?: Array<{ role: "user" | "assistant"; content: string }>;
    keyId?: string;
  };

  if (!sessionId) {
    return res.status(400).json({ error: "sessionId is required" });
  }

  // Delete the short-lived Deepgram key now that the session is over
  if (keyId && process.env.DEEPGRAM_API_KEY && process.env.DEEPGRAM_PROJECT_ID) {
    void deleteDeepgramSessionKey(
      process.env.DEEPGRAM_API_KEY,
      process.env.DEEPGRAM_PROJECT_ID,
      keyId
    );
  }

  try {
    // Update conversation metadata
    await supabaseAdmin
      .from("conversations")
      .update({
        voice_duration_seconds: typeof durationSeconds === "number" ? Math.round(durationSeconds) : null,
        voice_ended_reason: "user_closed",
        voice_provider: "deepgram",
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

      // Merge consecutive same-role fragments — Deepgram splits each AI response
      // sentence-by-sentence into multiple ConversationText events. Merging here ensures
      // each logical AI turn appears as a single chat bubble after post-call sync.
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
