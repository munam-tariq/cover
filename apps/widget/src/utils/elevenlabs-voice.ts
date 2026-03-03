/**
 * ElevenLabs Voice Agent Manager
 *
 * Wraps the @elevenlabs/client SDK to manage voice calls.
 * The SDK handles all audio capture, playback, WebSocket management,
 * and echo cancellation — no manual AudioContext or PCM handling needed.
 *
 * Responsibilities:
 *  - Fetch signed URL from our API before each call
 *  - Start/stop ElevenLabs conversation session
 *  - Map SDK events to voice state + transcript callbacks
 *  - Auto-end call after prolonged inactivity
 */

import { Conversation } from "@elevenlabs/client";
import type { Mode } from "@elevenlabs/client";

export type ElevenLabsVoiceState =
  | "idle"
  | "connecting"
  | "listening"
  | "speaking"
  | "ended"
  | "error";

export interface ElevenLabsVoiceOptions {
  projectId: string;
  apiUrl: string;
  visitorId: string;
  sessionId: string | null;
  onStateChange: (state: ElevenLabsVoiceState) => void;
  onTranscript: (role: "user" | "assistant", text: string) => void;
  onError: (error: Error) => void;
  onEnded: () => void;
}

interface ElevenLabsVoiceConfig {
  voiceEnabled: boolean;
  signedUrl: string;
  greeting: string;
}

export class ElevenLabsVoiceManager {
  private conversation: Awaited<ReturnType<typeof Conversation.startSession>> | null = null;
  private state: ElevenLabsVoiceState = "idle";

  // Inactivity detection — auto-end call after prolonged silence
  private inactivityTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly INACTIVITY_TIMEOUT_MS = 90_000; // 90s safety fallback (ElevenLabs handles disconnect at 70s)

  constructor(private options: ElevenLabsVoiceOptions) {}

  /**
   * Start the voice session:
   * 1. Fetch signed URL from our API
   * 2. Start ElevenLabs conversation via SDK
   */
  async start(): Promise<void> {
    this.setState("connecting");

    const config = await this.fetchConfig();
    if (!config || !config.voiceEnabled || !config.signedUrl) {
      this.setState("error");
      this.options.onError(new Error("Failed to fetch voice config or voice not enabled"));
      return;
    }

    try {
      this.conversation = await Conversation.startSession({
        signedUrl: config.signedUrl,
        overrides: {
          agent: {
            firstMessage: config.greeting,
          },
        },
        customLlmExtraBody: {
          projectId: this.options.projectId,
          visitorId: this.options.visitorId,
          sessionId: this.options.sessionId,
        },
        onConnect: () => {
          this.setState("listening");
          this.startInactivityTimer();
        },
        onDisconnect: () => {
          this.handleDisconnect();
        },
        onError: (message: string) => {
          this.options.onError(new Error(message));
          this.setState("error");
        },
        onModeChange: ({ mode }: { mode: Mode }) => {
          if (mode === "speaking") {
            this.setState("speaking");
            this.clearInactivityTimer();
          } else {
            this.setState("listening");
            this.startInactivityTimer();
          }
        },
        onMessage: (message) => {
          if (!message.message?.trim()) return;
          const role: "user" | "assistant" = message.role === "user" ? "user" : "assistant";
          this.options.onTranscript(role, message.message);

          // Any user message activity resets inactivity
          if (role === "user") {
            this.startInactivityTimer();
          }
        },
      });
    } catch (err) {
      this.setState("error");
      this.options.onError(
        err instanceof Error ? err : new Error("Failed to start ElevenLabs session")
      );
    }
  }

  /** Stop the call — end session and release resources */
  stop(): void {
    this.clearInactivityTimer();
    this.conversation?.endSession();
    this.conversation = null;
    if (this.state !== "ended" && this.state !== "error") {
      this.setState("ended");
      this.options.onEnded();
    }
  }

  /** Mute or unmute microphone */
  mute(muted: boolean): void {
    this.conversation?.setMicMuted(muted);
  }

  getState(): ElevenLabsVoiceState {
    return this.state;
  }

  // ---------------------------------------------------------------------------
  // Private
  // ---------------------------------------------------------------------------

  private async fetchConfig(): Promise<ElevenLabsVoiceConfig | null> {
    try {
      const url = new URL(`${this.options.apiUrl}/api/voice/config/${this.options.projectId}`);
      if (this.options.visitorId) url.searchParams.set("visitorId", this.options.visitorId);
      if (this.options.sessionId) url.searchParams.set("sessionId", this.options.sessionId);

      const res = await fetch(url.toString());
      if (!res.ok) return null;
      return (await res.json()) as ElevenLabsVoiceConfig;
    } catch {
      return null;
    }
  }

  private handleDisconnect(): void {
    this.clearInactivityTimer();
    if (this.state !== "ended" && this.state !== "error") {
      this.setState("ended");
      this.options.onEnded();
    }
  }

  private setState(s: ElevenLabsVoiceState): void {
    this.state = s;
    this.options.onStateChange(s);
  }

  // ---------------------------------------------------------------------------
  // Inactivity detection
  // ---------------------------------------------------------------------------

  private startInactivityTimer(): void {
    this.clearInactivityTimer();
    this.inactivityTimer = setTimeout(() => {
      this.stop();
    }, this.INACTIVITY_TIMEOUT_MS);
  }

  private clearInactivityTimer(): void {
    if (this.inactivityTimer !== null) {
      clearTimeout(this.inactivityTimer);
      this.inactivityTimer = null;
    }
  }
}
