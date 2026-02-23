/**
 * Deepgram Voice Agent Manager
 *
 * Manages the raw WebSocket connection to wss://agent.deepgram.com/v1/agent/converse.
 * No SDK dependency — uses raw WebSocket + Web Audio API.
 *
 * Responsibilities:
 *  - Fetch Deepgram config/token from our API before each call
 *  - Open WebSocket, send AgentV1Settings on connect
 *  - Stream raw PCM16 mic audio as binary frames to Deepgram
 *  - Receive MP3 audio chunks from Deepgram and play them sequentially
 *  - Detect inactivity and inject "Are you still there?" after silence
 *  - Auto-end call if user doesn't respond after the inactivity probe
 */

export type DeepgramVoiceState =
  | "idle"
  | "connecting"
  | "listening"
  | "thinking"
  | "speaking"
  | "ended"
  | "error";

export interface DeepgramVoiceOptions {
  projectId: string;
  apiUrl: string;
  visitorId: string;
  sessionId: string | null;
  onStateChange: (state: DeepgramVoiceState) => void;
  onTranscript: (role: "user" | "assistant", text: string) => void;
  onInjectMessage?: (text: string) => void;
  onError: (error: Error) => void;
  onEnded: () => void;
}

interface DeepgramVoiceConfig {
  voiceEnabled: boolean;
  token: string;
  keyId?: string;
  settings: object;
}

export class DeepgramVoiceManager {
  private ws: WebSocket | null = null;
  private mediaStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;       // mic capture context (48kHz)
  private scriptProcessor: ScriptProcessorNode | null = null;
  private playbackCtx: AudioContext | null = null;        // single shared playback context (24kHz)
  private nextPlayTime = 0;                               // scheduled end of last chunk
  private isMuted = false;
  private isAudioGated = false;   // true while mic should be suppressed (injection window + agent speaking)
  private probeRetried = false;   // true after the first retry attempt — prevents infinite retry loop
  private pendingSettings: object | null = null; // stored during handshake, sent on Welcome
  private state: DeepgramVoiceState = "idle";
  private keyId: string | null = null;

  // WebSocket keepalive
  private keepaliveTimer: ReturnType<typeof setInterval> | null = null;

  // Inactivity detection
  private inactivityTimer: ReturnType<typeof setTimeout> | null = null;
  private secondaryTimer: ReturnType<typeof setTimeout> | null = null;
  private inactivityProbeActive = false;           // true after probe is injected
  private probeRetryTimer: ReturnType<typeof setTimeout> | null = null; // scheduled retry after rejection
  private readonly INACTIVITY_TIMEOUT_MS = 10000; // 10s after agent finishes speaking
  private readonly SECONDARY_TIMEOUT_MS = 50000;  // 50s after "Are you still there?" → 60s total silence

  constructor(private options: DeepgramVoiceOptions) {}

  /**
   * Start the voice session:
   * 1. Fetch config + token from our API
   * 2. Open WebSocket to Deepgram
   * 3. On open: send AgentV1Settings + start mic capture
   */
  async start(): Promise<void> {
    this.setState("connecting");

    const config = await this.fetchConfig();
    this.keyId = config?.keyId ?? null;
    if (!config || !config.voiceEnabled || !config.token) {
      this.setState("error");
      this.options.onError(new Error("Failed to fetch voice config or voice not enabled"));
      return;
    }

    try {
      // Open WebSocket — pass short-lived JWT as query param (browser-safe).
      // The JWT comes from /v1/auth/grant on the server; never exposes the API key.
      this.ws = new WebSocket(
        `wss://agent.deepgram.com/v1/agent/converse`,
        ["token", config.token]
      );
      this.ws.binaryType = "arraybuffer";

      this.ws.onopen = () => this.handleOpen(config.settings);
      this.ws.onmessage = (event) => this.handleMessage(event);
      this.ws.onclose = (event) => this.handleClose(event);
      this.ws.onerror = () => {
        this.options.onError(new Error("WebSocket connection error"));
        this.setState("error");
      };
    } catch (err) {
      this.setState("error");
      this.options.onError(err instanceof Error ? err : new Error("Failed to open WebSocket"));
    }
  }

  /** Stop the call — close WebSocket and release all resources */
  stop(): void {
    this.clearKeepalive();
    this.clearProbeRetryTimer();
    this.clearInactivityTimers();
    this.isAudioGated = false;
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      this.ws.close(1000, "User ended call");
    }
    this.ws = null;
    this.stopMic();
    this.stopPlayback();
    if (this.state !== "ended") {
      this.setState("ended");
      this.options.onEnded();
    }
  }

  /** Mute or unmute microphone capture */
  mute(muted: boolean): void {
    this.isMuted = muted;
    this.mediaStream?.getAudioTracks().forEach(t => { t.enabled = !muted; });
  }

  getState(): DeepgramVoiceState {
    return this.state;
  }

  getKeyId(): string | null {
    return this.keyId;
  }

  // ---------------------------------------------------------------------------
  // Private — setup
  // ---------------------------------------------------------------------------

  private async fetchConfig(): Promise<DeepgramVoiceConfig | null> {
    try {
      const url = new URL(`${this.options.apiUrl}/api/voice/config/${this.options.projectId}`);
      if (this.options.visitorId) url.searchParams.set("visitorId", this.options.visitorId);
      if (this.options.sessionId) url.searchParams.set("sessionId", this.options.sessionId);

      const res = await fetch(url.toString());
      if (!res.ok) return null;
      return (await res.json()) as DeepgramVoiceConfig;
    } catch {
      return null;
    }
  }

  private handleOpen(settings: object): void {
    // Store settings — protocol requires waiting for Welcome before sending anything.
    // Mic capture and keepalive are deferred until SettingsApplied.
    this.pendingSettings = settings;
  }

  private async startMicCapture(): Promise<void> {
    this.mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
      },
    });

    // AudioContext at 16kHz — browser automatically resamples the mic stream.
    // Deepgram nova-3 recommends 16kHz input; sending 48kHz triples data volume
    // and adds server-side processing latency.
    this.audioContext = new AudioContext({ sampleRate: 16000 });
    // Resume is required to satisfy browser autoplay policy (mic click = user gesture)
    await this.audioContext.resume();

    const source = this.audioContext.createMediaStreamSource(this.mediaStream);

    // ScriptProcessorNode for raw PCM16 capture.
    // Deprecated in favour of AudioWorklet, but AudioWorklet requires a separate
    // worker file that conflicts with the single-bundle widget build.
    // ScriptProcessorNode remains supported in all major browsers.
    // 1024 samples @ 16kHz = 64ms per chunk (vs 4096 @ 48kHz = 85ms)
    this.scriptProcessor = this.audioContext.createScriptProcessor(1024, 1, 1);

    this.scriptProcessor.onaudioprocess = (event) => {
      if (this.isMuted) return;
      if (this.isAudioGated) return;
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
      const float32 = event.inputBuffer.getChannelData(0);
      const pcm16 = this.float32ToPcm16(float32);
      this.ws.send(pcm16);
    };

    source.connect(this.scriptProcessor);
    // Connect to destination is required for the node to fire, even though we
    // don't want to play back the mic audio — volume stays at 0.
    this.scriptProcessor.connect(this.audioContext.destination);
  }

  // ---------------------------------------------------------------------------
  // Private — WebSocket message handling
  // ---------------------------------------------------------------------------

  private handleMessage(event: MessageEvent): void {
    if (typeof event.data === "string") {
      this.handleTextMessage(event.data);
    } else {
      // Binary: linear16 PCM audio chunk from the agent — schedule immediately
      if (this.state !== "speaking") this.setState("speaking");
      this.isAudioGated = false; // ungate audio as soon as the agent starts speaking
      this.scheduleAudioChunk(event.data as ArrayBuffer);
    }
  }

  private handleTextMessage(raw: string): void {
    let msg: { type: string; role?: string; content?: string; description?: string; code?: string };
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }

    switch (msg.type) {
      case "UserStartedSpeaking":
        this.setState("listening");
        this.isAudioGated = false;
        this.inactivityProbeActive = false;
        this.clearProbeRetryTimer();
        this.clearInactivityTimers();
        this.stopPlayback(); // barge-in: cut off any queued agent audio immediately
        break;

      case "AgentThinking":
        this.setState("thinking");
        break;

      case "AgentAudioDone":
        this.isAudioGated = false;
        this.setState("listening");
        if (this.probeRetryTimer !== null) {
          // Probe retry is scheduled — don't start any timer, wait for retry
        } else if (this.inactivityProbeActive) {
          // Probe was just spoken — start the hang-up timer
          this.startHangupTimer();
        } else {
          // Normal turn end — start the primary inactivity timer
          this.startInactivityTimer();
        }
        break;

      case "ConversationText":
        if (msg.role && msg.content) {
          this.options.onTranscript(
            msg.role as "user" | "assistant",
            msg.content
          );
        }
        break;

      case "Error":
        this.options.onError(new Error(msg.description || "Deepgram agent error"));
        this.setState("error");
        break;

      case "InjectionRefused":
      case "Warning":
        // Both InjectionRefused (current API) and Warning with agent-speech code (older API)
        // indicate the server rejected the probe injection.
        if (
          msg.type === "InjectionRefused" ||
          msg.code === "INJECT_AGENT_MESSAGE_DURING_AGENT_SPEECH"
        ) {
          if (!this.probeRetried) {
            // First rejection — retry once after 2.5s for delivery window to clear
            this.probeRetried = true;
            this.scheduleProbeRetry();
          } else {
            // Retry also failed — ungate audio so user can still speak, rely on hang-up timer
            this.isAudioGated = false;
          }
        } else if (msg.code === "INJECT_AGENT_MESSAGE_DURING_USER_SPEECH") {
          // Server thinks user is still speaking — ungate and let the conversation continue
          this.isAudioGated = false;
        }
        break;

      case "AgentStartedSpeaking":
        this.isAudioGated = false;
        break;

      case "Welcome":
        // Protocol: send Settings only after Welcome is received
        if (this.pendingSettings && this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify(this.pendingSettings));
          this.pendingSettings = null;
        }
        break;

      case "SettingsApplied":
        // Protocol: start audio only after settings are confirmed
        this.setState("listening");
        this.keepaliveTimer = setInterval(() => {
          if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type: "KeepAlive" }));
          }
        }, 8000);
        this.startMicCapture().catch((err) => {
          this.options.onError(err instanceof Error ? err : new Error("Mic capture failed"));
          this.stop();
        });
        break;
    }
  }

  private handleClose(event: CloseEvent): void {
    this.clearKeepalive();
    this.clearProbeRetryTimer();
    this.stopMic();
    this.stopPlayback();
    this.clearInactivityTimers();
    if (this.state !== "ended" && this.state !== "error") {
      this.setState("ended");
      this.options.onEnded();
    }
  }

  // ---------------------------------------------------------------------------
  // Private — audio playback
  // ---------------------------------------------------------------------------

  /**
   * Ensure the shared 24kHz playback AudioContext exists and is running.
   * Called lazily on first audio chunk so it benefits from the user-gesture
   * that started the call.
   */
  private ensurePlaybackCtx(): AudioContext {
    if (!this.playbackCtx || this.playbackCtx.state === "closed") {
      this.playbackCtx = new AudioContext({ sampleRate: 24000 });
      this.nextPlayTime = 0;
    }
    // Resume in case browser suspended it
    if (this.playbackCtx.state === "suspended") {
      this.playbackCtx.resume().catch(() => {});
    }
    return this.playbackCtx;
  }

  /**
   * Schedule a single linear16 PCM chunk for gapless playback.
   * Each chunk is appended immediately after the previous one using
   * time-based scheduling on the shared AudioContext — no gaps, no pops.
   */
  private scheduleAudioChunk(buffer: ArrayBuffer): void {
    try {
      const ctx = this.ensurePlaybackCtx();

      // Convert Int16 PCM → Float32 [-1, 1]
      const int16 = new Int16Array(buffer);
      const float32 = new Float32Array(int16.length);
      for (let i = 0; i < int16.length; i++) {
        float32[i] = int16[i] / 32768;
      }

      const audioBuffer = ctx.createBuffer(1, float32.length, 24000);
      audioBuffer.copyToChannel(float32, 0);

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);

      // Schedule gaplessly: start at the later of "now" or the end of the last chunk
      const startAt = Math.max(ctx.currentTime, this.nextPlayTime);
      source.start(startAt);
      this.nextPlayTime = startAt + audioBuffer.duration;
    } catch {
      // Skip corrupt chunk — don't interrupt subsequent chunks
    }
  }

  /** Close and release the playback AudioContext */
  private stopPlayback(): void {
    if (this.playbackCtx) {
      this.playbackCtx.close().catch(() => {});
      this.playbackCtx = null;
      this.nextPlayTime = 0;
    }
  }

  // ---------------------------------------------------------------------------
  // Private — inactivity detection
  // ---------------------------------------------------------------------------

  /** Start 10s silence timer. If it expires, ask the user if they're still there. */
  private startInactivityTimer(): void {
    this.clearInactivityTimers();
    this.inactivityTimer = setTimeout(() => {
      this.inactivityProbeActive = true;
      this.isAudioGated = true; // gate binary immediately
      // Wait 300ms before injecting — gives the VAD time to clear any in-flight
      // binary frames that were queued before the gate was set. Injecting in the
      // same tick as gating causes INJECT_AGENT_MESSAGE_DURING_USER_SPEECH because
      // the last PCM chunk (~64ms ago) is still in the server's VAD pipeline.
      this.secondaryTimer = setTimeout(() => {
        this.injectAgentMessage("Are you still there?");
        // Fallback hang-up timer — if AgentAudioDone never fires, stop after this window
        this.secondaryTimer = setTimeout(() => {
          this.stop();
        }, this.SECONDARY_TIMEOUT_MS + 10000);
      }, 300);
    }, this.INACTIVITY_TIMEOUT_MS);
  }

  /** Start 8s hang-up timer after the probe has been spoken. */
  private startHangupTimer(): void {
    this.clearInactivityTimers();
    this.secondaryTimer = setTimeout(() => {
      this.stop();
    }, this.SECONDARY_TIMEOUT_MS);
  }

  private clearKeepalive(): void {
    if (this.keepaliveTimer !== null) {
      clearInterval(this.keepaliveTimer);
      this.keepaliveTimer = null;
    }
  }

  private injectAgentMessage(text: string): void {
    this.options.onInjectMessage?.(text);
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.isAudioGated = true;
    this.ws.send(
      JSON.stringify({
        type: "InjectAgentMessage",
        content: text,
      })
    );
  }

  /**
   * Schedule a retry of InjectAgentMessage after 2.5s.
   * Called when Deepgram rejects the probe because it's still streaming audio.
   * AgentAudioDone fires when generation is done, not when delivery is done —
   * so we wait for the delivery window to pass before retrying.
   */
  private scheduleProbeRetry(): void {
    this.clearProbeRetryTimer();
    this.probeRetryTimer = setTimeout(() => {
      this.probeRetryTimer = null;
      this.injectAgentMessage("Are you still there?");
    }, 2500);
  }

  private clearProbeRetryTimer(): void {
    if (this.probeRetryTimer !== null) {
      clearTimeout(this.probeRetryTimer);
      this.probeRetryTimer = null;
    }
  }

  private clearInactivityTimers(): void {
    if (this.inactivityTimer !== null) {
      clearTimeout(this.inactivityTimer);
      this.inactivityTimer = null;
    }
    if (this.secondaryTimer !== null) {
      clearTimeout(this.secondaryTimer);
      this.secondaryTimer = null;
    }
    this.isAudioGated = false;
    this.probeRetried = false;
  }

  

  // ---------------------------------------------------------------------------
  // Private — cleanup
  // ---------------------------------------------------------------------------

  private stopMic(): void {
    if (this.scriptProcessor) {
      this.scriptProcessor.disconnect();
      this.scriptProcessor = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(t => t.stop());
      this.mediaStream = null;
    }
    if (this.audioContext) {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }
  }

  private setState(s: DeepgramVoiceState): void {
    this.state = s;
    this.options.onStateChange(s);
  }

  // ---------------------------------------------------------------------------
  // Private — audio conversion
  // ---------------------------------------------------------------------------

  /** Convert Float32 PCM samples [-1, 1] to interleaved Int16 PCM */
  private float32ToPcm16(float32: Float32Array): ArrayBuffer {
    const buffer = new ArrayBuffer(float32.length * 2);
    const view = new DataView(buffer);
    for (let i = 0; i < float32.length; i++) {
      const clamped = Math.max(-1, Math.min(1, float32[i]!));
      const int16 = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
      view.setInt16(i * 2, int16, true /* little-endian */);
    }
    return buffer;
  }
}
