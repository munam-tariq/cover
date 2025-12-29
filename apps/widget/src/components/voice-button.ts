/**
 * Voice Button Component
 *
 * A microphone button that toggles voice chat mode.
 * Shows different states: idle, connecting, listening, speaking.
 */

import type { VoiceState } from "../utils/voice";

export interface VoiceButtonOptions {
  onClick: () => void;
  primaryColor: string;
}

export class VoiceButton {
  element: HTMLButtonElement;
  private state: VoiceState = "idle";
  private pulseAnimation: Animation | null = null;

  constructor(private options: VoiceButtonOptions) {
    this.element = this.createElement();
    this.attachEvents();
  }

  private createElement(): HTMLButtonElement {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "chatbot-voice-btn";
    button.setAttribute("aria-label", "Start voice chat");
    button.title = "Start voice chat";

    // Microphone icon (default state)
    button.innerHTML = this.getMicIcon();

    return button;
  }

  private getMicIcon(): string {
    return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
      <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
      <line x1="12" y1="19" x2="12" y2="23"/>
      <line x1="8" y1="23" x2="16" y2="23"/>
    </svg>`;
  }

  private getPhoneIcon(): string {
    return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
    </svg>`;
  }

  private getStopIcon(): string {
    return `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <rect x="6" y="6" width="12" height="12" rx="2"/>
    </svg>`;
  }

  private getLoadingIcon(): string {
    return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="chatbot-voice-spinner" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke-opacity="0.25"/>
      <path d="M12 2a10 10 0 0 1 10 10"/>
    </svg>`;
  }

  private attachEvents(): void {
    this.element.addEventListener("click", () => {
      this.options.onClick();
    });
  }

  /**
   * Update the button state
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

    // Stop any existing animation
    if (this.pulseAnimation) {
      this.pulseAnimation.cancel();
      this.pulseAnimation = null;
    }

    switch (state) {
      case "idle":
        this.element.innerHTML = this.getMicIcon();
        this.element.setAttribute("aria-label", "Start voice chat");
        this.element.title = "Start voice chat";
        break;

      case "connecting":
        this.element.innerHTML = this.getLoadingIcon();
        this.element.setAttribute("aria-label", "Connecting...");
        this.element.title = "Connecting...";
        break;

      case "listening":
        this.element.innerHTML = this.getStopIcon();
        this.element.setAttribute("aria-label", "Listening... Click to end call");
        this.element.title = "Listening... Click to end call";
        this.startPulse();
        break;

      case "processing":
        this.element.innerHTML = this.getStopIcon();
        this.element.setAttribute("aria-label", "Processing... Click to end call");
        this.element.title = "Processing...";
        break;

      case "speaking":
        this.element.innerHTML = this.getStopIcon();
        this.element.setAttribute("aria-label", "Speaking... Click to end call");
        this.element.title = "Speaking...";
        break;

      case "error":
        this.element.innerHTML = this.getMicIcon();
        this.element.setAttribute("aria-label", "Error. Click to try again");
        this.element.title = "Error. Click to try again";
        break;
    }
  }

  /**
   * Start pulsing animation for listening state
   */
  private startPulse(): void {
    this.pulseAnimation = this.element.animate(
      [
        { boxShadow: "0 0 0 0 rgba(239, 68, 68, 0.4)" },
        { boxShadow: "0 0 0 8px rgba(239, 68, 68, 0)" },
      ],
      {
        duration: 1500,
        iterations: Infinity,
      }
    );
  }

  /**
   * Check if in active call
   */
  isActive(): boolean {
    return (
      this.state === "connecting" ||
      this.state === "listening" ||
      this.state === "processing" ||
      this.state === "speaking"
    );
  }

  /**
   * Update primary color
   */
  setColor(color: string): void {
    this.options.primaryColor = color;
  }

  /**
   * Set disabled state
   */
  setDisabled(disabled: boolean): void {
    this.element.disabled = disabled;
    this.element.classList.toggle("disabled", disabled);
  }
}
