/**
 * Voice Permission Prompt Component
 *
 * Custom pre-prompt shown BEFORE the browser's native microphone permission dialog.
 * Increases permission grant rates by ~14% (per Google Meet case study).
 */

export interface VoicePermissionPromptOptions {
  primaryColor: string;
  onAllow: () => void;
  onCancel: () => void;
}

export class VoicePermissionPrompt {
  element: HTMLElement;

  constructor(private options: VoicePermissionPromptOptions) {
    this.element = this.createElement();
    this.attachEvents();
  }

  private createElement(): HTMLElement {
    const container = document.createElement("div");
    container.className = "cb-voice-permission";
    container.setAttribute("role", "dialog");
    container.setAttribute("aria-label", "Microphone permission");

    container.innerHTML = `
      <div class="cb-voice-permission-icon">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
          <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
          <line x1="12" y1="19" x2="12" y2="23"></line>
          <line x1="8" y1="23" x2="16" y2="23"></line>
        </svg>
      </div>
      <p class="cb-voice-permission-text">
        To start a voice call, we need access to your microphone. Your audio is not recorded.
      </p>
      <button class="cb-voice-permission-allow" type="button" style="background-color: ${this.options.primaryColor}">
        Allow Microphone
      </button>
      <button class="cb-voice-permission-cancel" type="button">
        Cancel
      </button>
      <p class="cb-voice-permission-denied" style="display:none">
        Microphone access was denied. Click the lock icon in your browser's address bar to allow microphone access, then try again.
      </p>
    `;

    return container;
  }

  private attachEvents(): void {
    const allowBtn = this.element.querySelector(".cb-voice-permission-allow") as HTMLButtonElement;
    const cancelBtn = this.element.querySelector(".cb-voice-permission-cancel") as HTMLButtonElement;

    allowBtn.addEventListener("click", async () => {
      allowBtn.disabled = true;
      allowBtn.textContent = "Requesting access...";

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Stop the stream immediately — Vapi will request its own
        stream.getTracks().forEach((track) => track.stop());
        this.options.onAllow();
      } catch {
        // Show denied message
        const deniedMsg = this.element.querySelector(".cb-voice-permission-denied") as HTMLElement;
        deniedMsg.style.display = "block";
        allowBtn.textContent = "Try Again";
        allowBtn.disabled = false;
      }
    });

    cancelBtn.addEventListener("click", () => {
      this.options.onCancel();
    });
  }

  show(): void {
    this.element.style.display = "flex";
  }

  hide(): void {
    this.element.style.display = "none";
  }

  destroy(): void {
    this.element.remove();
  }
}
