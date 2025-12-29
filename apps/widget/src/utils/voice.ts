/**
 * Voice Manager
 *
 * Handles WebSocket connection for voice streaming, microphone access,
 * and audio playback. Coordinates between browser audio APIs and
 * the backend voice WebSocket.
 */

export interface VoiceConfig {
  enabled: boolean;
  greeting: string;
  voiceId: string;
  maxDurationSeconds: number;
}

export interface VoiceManagerOptions {
  apiUrl: string;
  projectId: string;
  visitorId: string;
  sessionId?: string | null;
  onConnected: (greeting: string, sessionId: string) => void;
  onTranscript: (text: string, isFinal: boolean) => void;
  onResponse: (text: string) => void;
  onSpeakingStart: () => void;
  onSpeakingEnd: () => void;
  onNavigation: (url: string, newTab: boolean) => void;
  onError: (error: string, code?: string) => void;
  onEnded: (durationSeconds: number) => void;
  onStateChange: (state: VoiceState) => void;
}

export type VoiceState =
  | "idle"
  | "connecting"
  | "listening"
  | "processing"
  | "speaking"
  | "error";

/**
 * Fetch voice configuration for a project
 */
export async function getVoiceConfig(
  apiUrl: string,
  projectId: string
): Promise<VoiceConfig | null> {
  try {
    const response = await fetch(
      `${apiUrl}/api/voice/config?projectId=${encodeURIComponent(projectId)}`
    );
    if (!response.ok) return null;
    return response.json();
  } catch {
    return null;
  }
}

/**
 * Voice Manager Class
 * Handles the full voice conversation lifecycle
 */
export class VoiceManager {
  private ws: WebSocket | null = null;
  private recordingContext: AudioContext | null = null;
  private playbackContext: AudioContext | null = null;
  private scriptProcessor: ScriptProcessorNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private audioQueue: ArrayBuffer[] = [];
  private isPlaying = false;
  private state: VoiceState = "idle";
  private stream: MediaStream | null = null;

  constructor(private options: VoiceManagerOptions) {}

  /**
   * Get current state
   */
  getState(): VoiceState {
    return this.state;
  }

  /**
   * Start a voice call
   */
  async start(): Promise<void> {
    if (this.state !== "idle") {
      console.warn("[VoiceManager] Already in a call");
      return;
    }

    this.setState("connecting");

    try {
      // Request microphone access
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      // Initialize audio context for playback (24kHz for TTS audio)
      this.playbackContext = new AudioContext({ sampleRate: 24000 });

      // Initialize audio context for recording (16kHz for STT)
      this.recordingContext = new AudioContext({ sampleRate: 16000 });

      // Build WebSocket URL
      const wsUrl = this.buildWebSocketUrl();
      this.ws = new WebSocket(wsUrl);
      this.ws.binaryType = "arraybuffer";

      this.ws.onopen = () => {
        console.log("[VoiceManager] WebSocket connected");
        this.startRecording();
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(event);
      };

      this.ws.onerror = (error) => {
        console.error("[VoiceManager] WebSocket error:", error);
        this.setState("error");
        this.options.onError("Connection error", "WS_ERROR");
        this.cleanup();
      };

      this.ws.onclose = () => {
        console.log("[VoiceManager] WebSocket closed");
        if (this.state !== "idle") {
          this.cleanup();
        }
      };
    } catch (error) {
      console.error("[VoiceManager] Start error:", error);
      this.setState("error");

      if (error instanceof Error) {
        if (error.name === "NotAllowedError") {
          this.options.onError("Microphone access denied", "MIC_DENIED");
        } else if (error.name === "NotFoundError") {
          this.options.onError("No microphone found", "MIC_NOT_FOUND");
        } else {
          this.options.onError(error.message, "START_ERROR");
        }
      }

      this.cleanup();
    }
  }

  /**
   * End the voice call
   */
  end(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: "end" }));
    }
    this.cleanup();
  }

  /**
   * Build WebSocket URL with query parameters
   */
  private buildWebSocketUrl(): string {
    const baseUrl = this.options.apiUrl.replace(/^http/, "ws");
    const params = new URLSearchParams({
      projectId: this.options.projectId,
      visitorId: this.options.visitorId,
    });

    if (this.options.sessionId) {
      params.set("sessionId", this.options.sessionId);
    }

    return `${baseUrl}/api/voice/stream?${params.toString()}`;
  }

  /**
   * Start recording audio from microphone using Web Audio API
   * Captures raw PCM audio (linear16, 16kHz) for Deepgram STT
   */
  private startRecording(): void {
    if (!this.stream || !this.recordingContext) return;

    // Create source node from microphone stream
    this.sourceNode = this.recordingContext.createMediaStreamSource(this.stream);

    // Create ScriptProcessorNode for raw PCM capture
    // Buffer size of 4096 samples at 16kHz = ~256ms chunks
    const bufferSize = 4096;
    this.scriptProcessor = this.recordingContext.createScriptProcessor(
      bufferSize,
      1, // input channels
      1  // output channels
    );

    this.scriptProcessor.onaudioprocess = (event) => {
      if (this.ws?.readyState !== WebSocket.OPEN) return;

      // Get raw Float32 audio samples
      const inputBuffer = event.inputBuffer.getChannelData(0);

      // Convert Float32 to Int16 (linear16 format)
      const int16Buffer = this.float32ToInt16(inputBuffer);

      // Send raw PCM bytes to server
      this.ws.send(int16Buffer.buffer);
    };

    // Connect the audio graph: microphone -> processor -> destination
    this.sourceNode.connect(this.scriptProcessor);
    // Need to connect to destination to make audio processing work
    this.scriptProcessor.connect(this.recordingContext.destination);

    this.setState("listening");
    console.log("[VoiceManager] Recording started with raw PCM capture");
  }

  /**
   * Convert Float32 audio samples to Int16 (linear16 format)
   */
  private float32ToInt16(float32Array: Float32Array): Int16Array {
    const int16Array = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      // Clamp values to [-1, 1] range and convert to Int16
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return int16Array;
  }

  /**
   * Handle incoming WebSocket message
   */
  private handleMessage(event: MessageEvent): void {
    try {
      const message = JSON.parse(event.data);

      switch (message.type) {
        case "connected":
          this.options.onConnected(message.greeting, message.sessionId);
          break;

        case "transcript":
          this.options.onTranscript(message.text, message.isFinal);
          if (message.isFinal) {
            this.setState("processing");
          }
          break;

        case "response_text":
          this.options.onResponse(message.text);
          break;

        case "audio":
          // Decode base64 audio and queue for playback
          const audioData = this.base64ToArrayBuffer(message.audio);
          this.audioQueue.push(audioData);
          this.playNextAudio();
          break;

        case "speaking_start":
          this.setState("speaking");
          this.options.onSpeakingStart();
          break;

        case "speaking_end":
          this.options.onSpeakingEnd();
          // Will transition to listening when audio finishes
          break;

        case "navigation":
          this.options.onNavigation(message.url, message.newTab);
          break;

        case "error":
          this.options.onError(message.error, message.code);
          if (message.code === "MAX_DURATION") {
            this.cleanup();
          }
          break;

        case "ended":
          this.options.onEnded(message.durationSeconds);
          this.cleanup();
          break;

        case "pong":
          // Keepalive response
          break;

        default:
          console.log("[VoiceManager] Unknown message type:", message.type);
      }
    } catch (error) {
      console.error("[VoiceManager] Message parse error:", error);
    }
  }

  /**
   * Convert base64 string to ArrayBuffer
   */
  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }

  /**
   * Play next audio chunk from queue
   */
  private async playNextAudio(): Promise<void> {
    if (this.isPlaying || this.audioQueue.length === 0 || !this.playbackContext) {
      return;
    }

    this.isPlaying = true;
    const audioData = this.audioQueue.shift()!;

    try {
      // Create audio buffer from PCM data (16-bit, 24kHz)
      const int16Array = new Int16Array(audioData);
      const audioBuffer = this.playbackContext.createBuffer(
        1,
        int16Array.length,
        24000
      );
      const channelData = audioBuffer.getChannelData(0);

      // Convert Int16 to Float32
      for (let i = 0; i < int16Array.length; i++) {
        channelData[i] = int16Array[i] / 32768;
      }

      // Play the buffer
      const source = this.playbackContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.playbackContext.destination);

      source.onended = () => {
        this.isPlaying = false;
        // Play next chunk or return to listening
        if (this.audioQueue.length > 0) {
          this.playNextAudio();
        } else if (this.state === "speaking") {
          this.setState("listening");
        }
      };

      source.start();
    } catch (error) {
      console.error("[VoiceManager] Audio playback error:", error);
      this.isPlaying = false;
      this.playNextAudio();
    }
  }

  /**
   * Update state and notify listener
   */
  private setState(newState: VoiceState): void {
    this.state = newState;
    this.options.onStateChange(newState);
  }

  /**
   * Cleanup resources
   */
  private cleanup(): void {
    // Disconnect and clean up script processor
    if (this.scriptProcessor) {
      try {
        this.scriptProcessor.disconnect();
      } catch {}
      this.scriptProcessor = null;
    }

    // Disconnect source node
    if (this.sourceNode) {
      try {
        this.sourceNode.disconnect();
      } catch {}
      this.sourceNode = null;
    }

    // Stop media stream
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }

    // Close WebSocket
    if (this.ws) {
      try {
        this.ws.close();
      } catch {}
      this.ws = null;
    }

    // Close recording audio context
    if (this.recordingContext) {
      try {
        this.recordingContext.close();
      } catch {}
      this.recordingContext = null;
    }

    // Close playback audio context
    if (this.playbackContext) {
      try {
        this.playbackContext.close();
      } catch {}
      this.playbackContext = null;
    }

    // Clear audio queue
    this.audioQueue = [];
    this.isPlaying = false;

    this.setState("idle");
  }
}
