/**
 * Voice UI Component
 *
 * Shows the voice call interface when a call is active.
 * Displays: transcript, bot response, status indicator, and end call button.
 */

import type { VoiceState } from "../utils/voice";

export interface VoiceUIOptions {
  onEndCall: () => void;
  primaryColor: string;
}

export class VoiceUI {
  element: HTMLElement;
  private statusDot: HTMLElement;
  private statusText: HTMLElement;
  private transcriptEl: HTMLElement;
  private responseEl: HTMLElement;
  private endButton: HTMLButtonElement;
  private state: VoiceState = "idle";

  constructor(private options: VoiceUIOptions) {
    this.element = this.createElement();
    this.statusDot = this.element.querySelector(".chatbot-voice-status-dot")!;
    this.statusText = this.element.querySelector(".chatbot-voice-status-text")!;
    this.transcriptEl = this.element.querySelector(".chatbot-voice-transcript")!;
    this.responseEl = this.element.querySelector(".chatbot-voice-response")!;
    this.endButton = this.element.querySelector(".chatbot-voice-end")!;
    this.attachEvents();
  }

  private createElement(): HTMLElement {
    const container = document.createElement("div");
    container.className = "chatbot-voice-ui";
    container.setAttribute("role", "region");
    container.setAttribute("aria-label", "Voice call in progress");

    container.innerHTML = `
      <div class="chatbot-voice-header">
        <div class="chatbot-voice-status">
          <span class="chatbot-voice-status-dot"></span>
          <span class="chatbot-voice-status-text">Connecting...</span>
        </div>
      </div>
      <div class="chatbot-voice-content">
        <div class="chatbot-voice-transcript" aria-live="polite"></div>
        <div class="chatbot-voice-response" aria-live="polite"></div>
      </div>
      <button type="button" class="chatbot-voice-end" aria-label="End call">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08c-.18-.17-.29-.42-.29-.7 0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28-.79-.74-1.69-1.36-2.67-1.85-.33-.16-.56-.5-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z"/>
        </svg>
        End Call
      </button>
    `;

    return container;
  }

  private attachEvents(): void {
    this.endButton.addEventListener("click", () => {
      this.options.onEndCall();
    });
  }

  /**
   * Show the voice UI
   */
  show(): void {
    this.element.classList.add("visible");
    this.clearContent();
  }

  /**
   * Hide the voice UI
   */
  hide(): void {
    this.element.classList.remove("visible");
    this.clearContent();
  }

  /**
   * Update the voice state
   */
  setState(state: VoiceState): void {
    this.state = state;
    this.element.classList.remove(
      "idle",
      "connecting",
      "listening",
      "processing",
      "speaking",
      "error"
    );
    this.element.classList.add(state);

    // Update status text and dot
    switch (state) {
      case "connecting":
        this.statusText.textContent = "Connecting...";
        this.statusDot.style.backgroundColor = "#f59e0b"; // Orange
        break;

      case "listening":
        this.statusText.textContent = "Listening...";
        this.statusDot.style.backgroundColor = "#ef4444"; // Red
        this.addPulseToStatusDot();
        break;

      case "processing":
        this.statusText.textContent = "Processing...";
        this.statusDot.style.backgroundColor = "#f59e0b"; // Orange
        this.removePulseFromStatusDot();
        break;

      case "speaking":
        this.statusText.textContent = "Speaking...";
        this.statusDot.style.backgroundColor = "#22c55e"; // Green
        this.removePulseFromStatusDot();
        break;

      case "error":
        this.statusText.textContent = "Error";
        this.statusDot.style.backgroundColor = "#ef4444"; // Red
        this.removePulseFromStatusDot();
        break;

      case "idle":
      default:
        this.statusText.textContent = "Call ended";
        this.statusDot.style.backgroundColor = "#6b7280"; // Gray
        this.removePulseFromStatusDot();
        break;
    }
  }

  /**
   * Add pulse animation to status dot
   */
  private addPulseToStatusDot(): void {
    this.statusDot.classList.add("pulsing");
  }

  /**
   * Remove pulse animation from status dot
   */
  private removePulseFromStatusDot(): void {
    this.statusDot.classList.remove("pulsing");
  }

  /**
   * Update the transcript (what the user is saying)
   */
  setTranscript(text: string, isFinal: boolean): void {
    if (text.trim()) {
      this.transcriptEl.textContent = text;
      this.transcriptEl.classList.toggle("final", isFinal);
    }
  }

  /**
   * Clear the transcript
   */
  clearTranscript(): void {
    this.transcriptEl.textContent = "";
    this.transcriptEl.classList.remove("final");
  }

  /**
   * Set the bot's response
   */
  setResponse(text: string): void {
    this.responseEl.textContent = text;
    this.clearTranscript();
  }

  /**
   * Clear all content
   */
  private clearContent(): void {
    this.transcriptEl.textContent = "";
    this.transcriptEl.classList.remove("final");
    this.responseEl.textContent = "";
  }

  /**
   * Show an error message
   */
  showError(message: string): void {
    this.responseEl.textContent = message;
    this.responseEl.classList.add("error");
    this.setState("error");
  }

  /**
   * Clear error state
   */
  clearError(): void {
    this.responseEl.classList.remove("error");
  }

  /**
   * Update primary color
   */
  setColor(color: string): void {
    this.options.primaryColor = color;
    this.endButton.style.backgroundColor = color;
  }
}
