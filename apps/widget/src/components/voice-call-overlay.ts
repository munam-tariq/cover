/**
 * Voice Call Overlay Component
 *
 * Replaces the chat window content when a voice call is active.
 * Shows a pulsing orb visualization, call controls, and real-time transcript.
 *
 * States:
 * 1. Connecting — Pulsing animation, "Connecting..." text, cancel button
 * 2. Active/Listening — Orb reacts to user speech amplitude
 * 3. Active/Thinking — Orb swirls, "Processing..." text
 * 4. Active/Speaking — Orb pulses with AI speech
 * 5. Ended — "Call ended" message, duration, "Continue chatting" button
 * 6. Error — Error message with retry option
 */

export type VoiceCallState =
  | "connecting"
  | "active-listening"
  | "active-thinking"
  | "active-speaking"
  | "ended"
  | "error";

export interface VoiceCallOverlayOptions {
  primaryColor: string;
  onEndCall: () => void;
  onMuteToggle: () => void;
  onBackToChat: () => void;
}

export class VoiceCallOverlay {
  element: HTMLElement;
  private orbElement: HTMLElement;
  private statusText: HTMLElement;
  private timerElement: HTMLElement;
  private transcriptContainer: HTMLElement;
  private muteButton: HTMLButtonElement;
  private endCallButton: HTMLButtonElement;
  private backButton: HTMLButtonElement;
  private controlsContainer: HTMLElement;
  private endedContainer: HTMLElement;

  private state: VoiceCallState = "connecting";
  private isMuted = false;
  private timerInterval: number | null = null;
  private callStartTime: number | null = null;
  private callDuration = 0;

  constructor(private options: VoiceCallOverlayOptions) {
    this.element = this.createElement();
    this.orbElement = this.element.querySelector(".cb-voice-orb") as HTMLElement;
    this.statusText = this.element.querySelector(".cb-voice-status-text") as HTMLElement;
    this.timerElement = this.element.querySelector(".cb-voice-timer") as HTMLElement;
    this.transcriptContainer = this.element.querySelector(".cb-voice-transcript") as HTMLElement;
    this.muteButton = this.element.querySelector(".cb-voice-btn-mute") as HTMLButtonElement;
    this.endCallButton = this.element.querySelector(".cb-voice-btn-end") as HTMLButtonElement;
    this.backButton = this.element.querySelector(".cb-voice-back-btn") as HTMLButtonElement;
    this.controlsContainer = this.element.querySelector(".cb-voice-controls") as HTMLElement;
    this.endedContainer = this.element.querySelector(".cb-voice-ended") as HTMLElement;
    this.attachEvents();
  }

  private createElement(): HTMLElement {
    const overlay = document.createElement("div");
    overlay.className = "cb-voice-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-label", "Voice call");

    overlay.innerHTML = `
      <div class="cb-voice-header">
        <button class="cb-voice-back-btn" aria-label="Back to chat" type="button">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>
        <span class="cb-voice-header-title">Voice Call</span>
        <span class="cb-voice-timer" aria-live="polite">00:00</span>
      </div>

      <div class="cb-voice-body">
        <div class="cb-voice-orb-container">
          <div class="cb-voice-orb cb-voice-orb--connecting" style="--cb-primary-color: ${this.options.primaryColor}">
            <div class="cb-voice-orb-inner"></div>
          </div>
        </div>
        <p class="cb-voice-status-text" aria-live="polite">Connecting...</p>
        <div class="cb-voice-transcript" aria-label="Call transcript"></div>
      </div>

      <div class="cb-voice-controls">
        <button class="cb-voice-btn cb-voice-btn-mute" aria-label="Mute microphone" type="button">
          <svg class="cb-voice-icon-mic" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
            <line x1="12" y1="19" x2="12" y2="23"></line>
            <line x1="8" y1="23" x2="16" y2="23"></line>
          </svg>
          <svg class="cb-voice-icon-mic-off" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" style="display:none">
            <line x1="1" y1="1" x2="23" y2="23"></line>
            <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"></path>
            <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2c0 .76-.12 1.5-.34 2.18"></path>
            <line x1="12" y1="19" x2="12" y2="23"></line>
            <line x1="8" y1="23" x2="16" y2="23"></line>
          </svg>
        </button>
        <button class="cb-voice-btn cb-voice-btn-end" aria-label="End call" type="button">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91"></path>
            <line x1="23" y1="1" x2="1" y2="23"></line>
          </svg>
        </button>
      </div>

      <div class="cb-voice-ended" style="display:none">
        <div class="cb-voice-ended-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"></path>
          </svg>
        </div>
        <p class="cb-voice-ended-title">Call ended</p>
        <p class="cb-voice-ended-duration"></p>
        <button class="cb-voice-continue-btn" type="button">
          Continue chatting
        </button>
      </div>
    `;

    return overlay;
  }

  private attachEvents(): void {
    this.muteButton.addEventListener("click", () => {
      this.isMuted = !this.isMuted;
      this.updateMuteUI();
      this.options.onMuteToggle();
    });

    this.endCallButton.addEventListener("click", () => {
      this.options.onEndCall();
    });

    this.backButton.addEventListener("click", () => {
      if (this.state === "ended" || this.state === "error") {
        this.options.onBackToChat();
      } else {
        this.options.onEndCall();
      }
    });

    const continueBtn = this.element.querySelector(".cb-voice-continue-btn");
    continueBtn?.addEventListener("click", () => {
      this.options.onBackToChat();
    });
  }

  /**
   * Set the call state and update the UI accordingly
   */
  setState(newState: VoiceCallState): void {
    this.state = newState;

    // Remove all state classes from orb
    this.orbElement.className = "cb-voice-orb";

    switch (newState) {
      case "connecting":
        this.orbElement.classList.add("cb-voice-orb--connecting");
        this.statusText.textContent = "Connecting...";
        this.showControls(true);
        this.showEnded(false);
        break;

      case "active-listening":
        this.orbElement.classList.add("cb-voice-orb--listening");
        this.statusText.textContent = "Listening...";
        this.startTimer();
        this.showControls(true);
        this.showEnded(false);
        break;

      case "active-thinking":
        this.orbElement.classList.add("cb-voice-orb--thinking");
        this.statusText.textContent = "Processing...";
        break;

      case "active-speaking":
        this.orbElement.classList.add("cb-voice-orb--speaking");
        this.statusText.textContent = "Agent is speaking...";
        break;

      case "ended":
        this.orbElement.classList.add("cb-voice-orb--ended");
        this.stopTimer();
        this.statusText.textContent = "";
        this.showControls(false);
        this.showEnded(true);
        break;

      case "error":
        this.orbElement.classList.add("cb-voice-orb--ended");
        this.stopTimer();
        this.statusText.textContent = "Call failed. Please try again.";
        this.showControls(false);
        this.showEnded(true, true);
        break;
    }
  }

  /**
   * Update amplitude for voice visualization (0.0 - 1.0)
   */
  setAmplitude(value: number): void {
    const clamped = Math.min(1, Math.max(0, value));
    const scale = 1 + clamped * 0.15; // Scale from 1.0 to 1.15
    this.orbElement.style.setProperty("--cb-amplitude", scale.toString());
  }

  /**
   * Append a transcript entry
   */
  addTranscript(role: "user" | "assistant", text: string): void {
    const entry = document.createElement("p");
    entry.className = `cb-voice-transcript-entry cb-voice-transcript-${role}`;
    entry.textContent = text;
    this.transcriptContainer.appendChild(entry);
    this.transcriptContainer.scrollTop = this.transcriptContainer.scrollHeight;
  }

  /**
   * Show/hide the overlay
   */
  show(): void {
    this.element.style.display = "flex";
    this.setState("connecting");
  }

  hide(): void {
    this.element.style.display = "none";
    this.stopTimer();
  }

  /**
   * Get the call duration in seconds
   */
  getDuration(): number {
    return this.callDuration;
  }

  private showControls(visible: boolean): void {
    this.controlsContainer.style.display = visible ? "flex" : "none";
  }

  private showEnded(visible: boolean, isError = false): void {
    this.endedContainer.style.display = visible ? "flex" : "none";
    if (visible) {
      const title = this.endedContainer.querySelector(".cb-voice-ended-title") as HTMLElement;
      const duration = this.endedContainer.querySelector(".cb-voice-ended-duration") as HTMLElement;
      const continueBtn = this.endedContainer.querySelector(".cb-voice-continue-btn") as HTMLElement;

      title.textContent = isError ? "Call failed" : "Call ended";
      duration.textContent = isError ? "Please try again" : this.formatDuration(this.callDuration);
      continueBtn.textContent = isError ? "Back to chat" : "Continue chatting";
    }
  }

  private updateMuteUI(): void {
    const micIcon = this.muteButton.querySelector(".cb-voice-icon-mic") as HTMLElement;
    const micOffIcon = this.muteButton.querySelector(".cb-voice-icon-mic-off") as HTMLElement;

    if (this.isMuted) {
      micIcon.style.display = "none";
      micOffIcon.style.display = "block";
      this.muteButton.classList.add("cb-voice-btn-muted");
      this.muteButton.setAttribute("aria-label", "Unmute microphone");
    } else {
      micIcon.style.display = "block";
      micOffIcon.style.display = "none";
      this.muteButton.classList.remove("cb-voice-btn-muted");
      this.muteButton.setAttribute("aria-label", "Mute microphone");
    }
  }

  private startTimer(): void {
    if (this.timerInterval) return;
    this.callStartTime = Date.now();
    this.timerInterval = window.setInterval(() => {
      this.callDuration = Math.floor((Date.now() - (this.callStartTime || Date.now())) / 1000);
      this.timerElement.textContent = this.formatDuration(this.callDuration);
    }, 1000);
  }

  private stopTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  private formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }

  destroy(): void {
    this.stopTimer();
    this.element.remove();
  }
}
