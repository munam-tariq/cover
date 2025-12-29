/**
 * Voice WebSocket Handler
 *
 * Handles real-time voice streaming between the client and Deepgram.
 * Flow: Client Audio -> STT -> Chat Engine -> TTS -> Client Audio
 */

import { WebSocket, WebSocketServer } from "ws";
import type { IncomingMessage } from "http";
import { createSTTStream, type STTStream } from "../services/deepgram-stt";
import { textToSpeechStream } from "../services/deepgram-tts";
import { processChat } from "../services/chat-engine";
import { supabaseAdmin } from "../lib/supabase";
import { VOICE_CONFIG, type VoiceId } from "../lib/deepgram";

/**
 * Voice session state for each connected client
 */
interface VoiceSession {
  projectId: string;
  visitorId: string;
  sessionId: string;
  voiceId: VoiceId;
  voiceGreeting: string;
  sttStream: STTStream | null;
  startTime: Date;
  transcriptBuffer: string;
  isProcessing: boolean;
  origin: string | undefined;
}

/**
 * Client -> Server message types
 */
interface ClientMessage {
  type: "audio" | "end" | "ping";
  data?: ArrayBuffer | Uint8Array;
}

/**
 * Server -> Client message types
 */
type ServerMessage =
  | { type: "connected"; greeting: string; sessionId: string }
  | { type: "transcript"; text: string; isFinal: boolean }
  | { type: "audio"; audio: string } // Base64 encoded audio
  | { type: "navigation"; url: string; newTab: boolean }
  | { type: "response_text"; text: string } // Text of bot response for display
  | { type: "speaking_start" }
  | { type: "speaking_end" }
  | { type: "error"; error: string; code?: string }
  | { type: "ended"; durationSeconds: number }
  | { type: "pong" };

/**
 * Send a JSON message to the client
 */
function sendMessage(ws: WebSocket, message: ServerMessage): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

/**
 * Send binary audio data to the client
 */
function sendAudio(ws: WebSocket, audioBuffer: Buffer): void {
  if (ws.readyState === WebSocket.OPEN) {
    // Send as base64 encoded JSON for easier client handling
    sendMessage(ws, {
      type: "audio",
      audio: audioBuffer.toString("base64"),
    });
  }
}

/**
 * Check if a URL is on the same domain as the origin
 */
function isSameDomain(url: string, origin?: string): boolean {
  if (!origin) return false;
  try {
    const urlHost = new URL(url).hostname;
    const originHost = new URL(origin).hostname;
    return urlHost === originHost;
  } catch {
    return false;
  }
}

/**
 * Get voice settings for a project
 */
async function getVoiceSettings(
  projectId: string
): Promise<{
  enabled: boolean;
  greeting: string;
  voiceId: VoiceId;
} | null> {
  const { data: project, error } = await supabaseAdmin
    .from("projects")
    .select("voice_enabled, voice_greeting, voice_id")
    .eq("id", projectId)
    .single();

  if (error || !project) {
    return null;
  }

  return {
    enabled: project.voice_enabled ?? false,
    greeting: project.voice_greeting ?? "Hi! How can I help you today?",
    voiceId: (project.voice_id as VoiceId) ?? "aura-2-thalia-en",
  };
}

/**
 * Setup WebSocket server for voice streaming
 */
export function setupVoiceWebSocket(wss: WebSocketServer): void {
  wss.on("connection", async (ws: WebSocket, req: IncomingMessage) => {
    console.log("[Voice WS] New connection");

    // Parse query parameters
    const url = new URL(req.url || "", `http://${req.headers.host}`);
    const projectId = url.searchParams.get("projectId");
    const visitorId = url.searchParams.get("visitorId");
    const sessionId = url.searchParams.get("sessionId");

    // Validate required parameters
    if (!projectId || !visitorId) {
      sendMessage(ws, {
        type: "error",
        error: "Missing required parameters: projectId and visitorId",
        code: "INVALID_PARAMS",
      });
      ws.close();
      return;
    }

    // Check global voice feature flag
    if (!VOICE_CONFIG.enabled) {
      sendMessage(ws, {
        type: "error",
        error: "Voice chat is not enabled",
        code: "VOICE_DISABLED",
      });
      ws.close();
      return;
    }

    // Verify project has voice enabled
    const voiceSettings = await getVoiceSettings(projectId);
    if (!voiceSettings) {
      sendMessage(ws, {
        type: "error",
        error: "Project not found",
        code: "PROJECT_NOT_FOUND",
      });
      ws.close();
      return;
    }

    if (!voiceSettings.enabled) {
      sendMessage(ws, {
        type: "error",
        error: "Voice chat is not enabled for this project",
        code: "VOICE_NOT_ENABLED",
      });
      ws.close();
      return;
    }

    // Initialize session
    const session: VoiceSession = {
      projectId,
      visitorId,
      sessionId: sessionId || `voice_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      voiceId: voiceSettings.voiceId,
      voiceGreeting: voiceSettings.greeting,
      sttStream: null,
      startTime: new Date(),
      transcriptBuffer: "",
      isProcessing: false,
      origin: req.headers.origin,
    };

    // Create STT stream
    session.sttStream = createSTTStream({
      onTranscript: async (text: string, isFinal: boolean) => {
        // Send transcript to client for display
        sendMessage(ws, {
          type: "transcript",
          text,
          isFinal,
        });

        // Process final transcripts through chat engine
        if (isFinal && text.trim() && !session.isProcessing) {
          session.isProcessing = true;
          session.transcriptBuffer = "";

          try {
            // Process through chat engine
            const result = await processChat({
              projectId: session.projectId,
              message: text,
              sessionId: session.sessionId,
              visitorId: session.visitorId,
              source: "voice",
            });

            // Send response text for display
            sendMessage(ws, {
              type: "response_text",
              text: result.response,
            });

            // Check for navigation URL from sources
            let navigationUrl: string | null = null;
            if (result.sources?.length > 0) {
              // Get source info from knowledge_sources to check for source_url
              for (const source of result.sources) {
                const { data: sourceData } = await supabaseAdmin
                  .from("knowledge_sources")
                  .select("source_url")
                  .eq("id", source.id)
                  .single();

                if (sourceData?.source_url) {
                  navigationUrl = sourceData.source_url;
                  break;
                }
              }
            }

            // Generate TTS response
            sendMessage(ws, { type: "speaking_start" });

            await textToSpeechStream(result.response, {
              voiceId: session.voiceId,
              onAudioChunk: (chunk) => {
                sendAudio(ws, chunk);
              },
              onComplete: () => {
                sendMessage(ws, { type: "speaking_end" });

                // Send navigation after audio if available
                if (navigationUrl) {
                  sendMessage(ws, {
                    type: "navigation",
                    url: navigationUrl,
                    newTab: !isSameDomain(navigationUrl, session.origin),
                  });
                }
              },
              onError: (error) => {
                console.error("[Voice WS] TTS error:", error);
                sendMessage(ws, {
                  type: "speaking_end",
                });
                sendMessage(ws, {
                  type: "error",
                  error: "Failed to generate speech",
                  code: "TTS_ERROR",
                });
              },
            });
          } catch (error) {
            console.error("[Voice WS] Chat processing error:", error);
            sendMessage(ws, {
              type: "error",
              error: "Failed to process message",
              code: "CHAT_ERROR",
            });
          } finally {
            session.isProcessing = false;
          }
        } else if (!isFinal) {
          session.transcriptBuffer += text + " ";
        }
      },
      onError: (error) => {
        console.error("[Voice WS] STT error:", error);
        sendMessage(ws, {
          type: "error",
          error: "Speech recognition error",
          code: "STT_ERROR",
        });
      },
      onClose: () => {
        console.log("[Voice WS] STT connection closed");
      },
    });

    // Send connected message
    sendMessage(ws, {
      type: "connected",
      greeting: session.voiceGreeting,
      sessionId: session.sessionId,
    });

    // Speak greeting
    sendMessage(ws, { type: "speaking_start" });
    await textToSpeechStream(session.voiceGreeting, {
      voiceId: session.voiceId,
      onAudioChunk: (chunk) => sendAudio(ws, chunk),
      onComplete: () => sendMessage(ws, { type: "speaking_end" }),
      onError: (error) => {
        console.error("[Voice WS] Greeting TTS error:", error);
        sendMessage(ws, { type: "speaking_end" });
      },
    });

    // Set up max duration timeout
    const maxDurationTimeout = setTimeout(() => {
      console.log("[Voice WS] Max duration reached");
      sendMessage(ws, {
        type: "error",
        error: "Maximum call duration reached",
        code: "MAX_DURATION",
      });
      ws.close();
    }, VOICE_CONFIG.maxDurationSeconds * 1000);

    // Handle incoming messages
    ws.on("message", (data: Buffer) => {
      try {
        // Check if it's a JSON control message or binary audio data
        const firstByte = data[0];

        // JSON starts with '{' (0x7b) or '[' (0x5b)
        if (firstByte === 0x7b || firstByte === 0x5b) {
          const message = JSON.parse(data.toString()) as ClientMessage;

          switch (message.type) {
            case "end":
              // Client requested end of call
              session.sttStream?.close();
              break;
            case "ping":
              sendMessage(ws, { type: "pong" });
              break;
            default:
              console.log("[Voice WS] Unknown message type:", message.type);
          }
        } else {
          // Binary audio data - forward to STT
          session.sttStream?.send(data);
        }
      } catch (error) {
        // Not valid JSON, treat as audio data
        session.sttStream?.send(data);
      }
    });

    // Handle connection close
    ws.on("close", async () => {
      console.log("[Voice WS] Connection closed");
      clearTimeout(maxDurationTimeout);
      session.sttStream?.close();

      // Record voice session duration
      const durationSeconds = Math.round(
        (Date.now() - session.startTime.getTime()) / 1000
      );

      // Update chat session with voice info
      try {
        await supabaseAdmin
          .from("chat_sessions")
          .update({
            is_voice: true,
            voice_duration_seconds: durationSeconds,
          })
          .eq("id", session.sessionId);
      } catch (error) {
        console.error("[Voice WS] Failed to update session:", error);
      }

      // Send ended message (if connection still open)
      sendMessage(ws, {
        type: "ended",
        durationSeconds,
      });
    });

    // Handle errors
    ws.on("error", (error) => {
      console.error("[Voice WS] WebSocket error:", error);
      clearTimeout(maxDurationTimeout);
      session.sttStream?.close();
    });
  });

  console.log("[Voice WS] WebSocket server ready");
}
