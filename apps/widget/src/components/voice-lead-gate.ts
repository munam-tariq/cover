/**
 * Voice Lead Gate Component
 *
 * Inline card shown when user taps the voice button but hasn't provided email yet.
 * Reuses existing lead capture storage. Appears as a card in the chat messages area.
 */

export interface VoiceLeadGateOptions {
  primaryColor: string;
  onSubmit: (email: string) => void;
  onDismiss: () => void;
}

export class VoiceLeadGate {
  element: HTMLElement;
  private emailInput: HTMLInputElement;
  private submitButton: HTMLButtonElement;
  private errorElement: HTMLElement;

  constructor(private options: VoiceLeadGateOptions) {
    this.element = this.createElement();
    this.emailInput = this.element.querySelector(".cb-voice-gate-email") as HTMLInputElement;
    this.submitButton = this.element.querySelector(".cb-voice-gate-submit") as HTMLButtonElement;
    this.errorElement = this.element.querySelector(".cb-voice-gate-error") as HTMLElement;
    this.attachEvents();
  }

  private createElement(): HTMLElement {
    const container = document.createElement("div");
    container.className = "cb-voice-gate chatbot-message assistant";

    container.innerHTML = `
      <div class="cb-voice-gate-card">
        <div class="cb-voice-gate-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
            <line x1="12" y1="19" x2="12" y2="23"></line>
            <line x1="8" y1="23" x2="16" y2="23"></line>
          </svg>
        </div>
        <p class="cb-voice-gate-title">Want to talk instead of type?</p>
        <p class="cb-voice-gate-subtitle">Enter your email to start a voice call.</p>
        <div class="cb-voice-gate-form">
          <input
            type="email"
            class="cb-voice-gate-email"
            placeholder="you@example.com"
            aria-label="Email address"
            autocomplete="email"
          />
          <button class="cb-voice-gate-submit" type="button" style="background-color: ${this.options.primaryColor}">
            Start Call
          </button>
        </div>
        <p class="cb-voice-gate-error" style="display:none"></p>
        <button class="cb-voice-gate-dismiss" type="button">
          No thanks, I'll keep typing
        </button>
      </div>
    `;

    return container;
  }

  private attachEvents(): void {
    this.submitButton.addEventListener("click", () => this.handleSubmit());

    this.emailInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        this.handleSubmit();
      }
    });

    const dismissBtn = this.element.querySelector(".cb-voice-gate-dismiss") as HTMLButtonElement;
    dismissBtn.addEventListener("click", () => {
      this.options.onDismiss();
    });
  }

  private handleSubmit(): void {
    const email = this.emailInput.value.trim();

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      this.showError("Please enter a valid email address.");
      this.emailInput.classList.add("error");
      return;
    }

    this.errorElement.style.display = "none";
    this.emailInput.classList.remove("error");
    this.setLoading(true);
    this.options.onSubmit(email);
  }

  showError(message: string): void {
    this.errorElement.textContent = message;
    this.errorElement.style.display = "block";
  }

  setLoading(loading: boolean): void {
    this.submitButton.disabled = loading;
    this.emailInput.disabled = loading;
    this.submitButton.textContent = loading ? "Starting..." : "Start Call";
  }

  focusEmail(): void {
    this.emailInput.focus();
  }

  show(): void {
    this.element.style.display = "block";
  }

  hide(): void {
    this.element.style.display = "none";
  }

  destroy(): void {
    this.element.remove();
  }
}
