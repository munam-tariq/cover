/**
 * Inline Email Field Component
 *
 * Compact email input bar rendered above the message input.
 * Non-blocking — visitor can type messages while this is visible.
 * Part of the email capture cascade: inline → form → conversational re-ask.
 */

export interface InlineEmailFieldOptions {
  primaryColor: string;
  required?: boolean;
  onSubmit: (email: string) => void;
  onDismiss: () => void;
}

export class InlineEmailField {
  element: HTMLDivElement;
  private emailInput: HTMLInputElement | null = null;
  private submitBtn: HTMLButtonElement | null = null;
  private visible = false;

  constructor(private options: InlineEmailFieldOptions) {
    this.element = this.createElement();
  }

  private createElement(): HTMLDivElement {
    const container = document.createElement("div");
    container.className = "chatbot-inline-email";

    // Email input
    const isRequired = this.options.required === true;
    const input = document.createElement("input");
    input.type = "email";
    input.className = "chatbot-inline-email-input";
    input.placeholder = isRequired ? "Email (required)" : "Email (optional)";
    input.setAttribute("aria-label", isRequired ? "Your email address (required)" : "Your email address (optional)");
    input.autocomplete = "email";

    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        this.handleSubmit();
      }
    });
    this.emailInput = input;

    // Submit button
    const submitBtn = document.createElement("button");
    submitBtn.type = "button";
    submitBtn.className = "chatbot-inline-email-submit";
    submitBtn.setAttribute("aria-label", "Submit email");
    submitBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>`;
    submitBtn.addEventListener("click", (e) => {
      e.preventDefault();
      this.handleSubmit();
    });
    this.submitBtn = submitBtn;

    container.appendChild(input);
    container.appendChild(submitBtn);

    // Dismiss button (hidden in required mode)
    if (!isRequired) {
      const dismissBtn = document.createElement("button");
      dismissBtn.type = "button";
      dismissBtn.className = "chatbot-inline-email-dismiss";
      dismissBtn.setAttribute("aria-label", "Dismiss");
      dismissBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>`;
      dismissBtn.addEventListener("click", (e) => {
        e.preventDefault();
        this.hide();
        this.options.onDismiss();
      });
      container.appendChild(dismissBtn);
    }

    return container;
  }

  private handleSubmit(): void {
    const email = this.getEmail();
    if (!email) return;

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      this.emailInput?.classList.add("error");
      setTimeout(() => this.emailInput?.classList.remove("error"), 2000);
      return;
    }

    this.setSubmitting(true);
    this.options.onSubmit(email);
  }

  /**
   * Get the current email value, or null if empty
   */
  getEmail(): string | null {
    const val = this.emailInput?.value.trim();
    return val || null;
  }

  /**
   * Show the inline email field with slide-down animation
   */
  show(): void {
    if (this.visible) return;
    this.visible = true;
    this.element.classList.add("visible");
  }

  /**
   * Hide the inline email field
   */
  hide(): void {
    if (!this.visible) return;
    this.visible = false;
    this.element.classList.remove("visible");
  }

  isVisible(): boolean {
    return this.visible;
  }

  /**
   * Set submitting state
   */
  setSubmitting(loading: boolean): void {
    if (this.submitBtn) {
      this.submitBtn.disabled = loading;
      this.submitBtn.style.opacity = loading ? "0.5" : "1";
    }
    if (this.emailInput) {
      this.emailInput.disabled = loading;
    }
  }

  /**
   * Show success feedback then hide
   */
  showSuccess(email: string): void {
    const container = this.element;
    container.innerHTML = "";

    const successMsg = document.createElement("div");
    successMsg.className = "chatbot-inline-email-success";
    successMsg.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
      <span>Saved! (${this.escapeHtml(email)})</span>
    `;
    container.appendChild(successMsg);

    // Auto-hide after 2 seconds
    setTimeout(() => this.hide(), 2000);
  }

  /**
   * Focus the email input
   */
  focus(): void {
    setTimeout(() => this.emailInput?.focus(), 100);
  }

  /**
   * Remove from DOM and cleanup
   */
  destroy(): void {
    this.hide();
    this.element.remove();
  }

  private escapeHtml(text: string): string {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }
}
