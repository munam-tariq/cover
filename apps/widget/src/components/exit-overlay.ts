/**
 * Exit Overlay Component
 *
 * Lightweight overlay within the Shadow DOM (not fullscreen page overlay).
 * Shows headline, subtext, email input, submit button, and "No thanks" link.
 * Displays max once per session. Only when chat is NOT open and email NOT captured.
 */

export interface ExitOverlayOptions {
  headline: string;
  subtext: string;
  primaryColor: string;
  onSubmit: (email: string) => void;
  onDismiss: () => void;
}

export class ExitOverlay {
  element: HTMLDivElement;
  private emailInput: HTMLInputElement | null = null;
  private submitBtn: HTMLButtonElement | null = null;
  private visible = false;
  private shownThisSession = false;

  constructor(private options: ExitOverlayOptions) {
    this.element = this.createElement();
  }

  private createElement(): HTMLDivElement {
    const overlay = document.createElement("div");
    overlay.className = "chatbot-exit-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-label", "Before you go");

    const card = document.createElement("div");
    card.className = "chatbot-exit-overlay-card";

    // Headline
    const headline = document.createElement("h3");
    headline.className = "chatbot-exit-overlay-headline";
    headline.textContent = this.options.headline || "Before you go...";

    // Subtext
    const subtext = document.createElement("p");
    subtext.className = "chatbot-exit-overlay-subtext";
    subtext.textContent = this.options.subtext || "Drop your email and we'll follow up";

    // Email input
    const input = document.createElement("input");
    input.type = "email";
    input.className = "chatbot-exit-overlay-input";
    input.placeholder = "you@example.com";
    input.setAttribute("aria-label", "Your email address");
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
    submitBtn.className = "chatbot-exit-overlay-submit";
    submitBtn.textContent = "Send";
    submitBtn.style.backgroundColor = this.options.primaryColor;
    submitBtn.addEventListener("click", (e) => {
      e.preventDefault();
      this.handleSubmit();
    });
    this.submitBtn = submitBtn;

    // Input row (email + submit inline)
    const inputRow = document.createElement("div");
    inputRow.className = "chatbot-exit-overlay-input-row";
    inputRow.appendChild(input);
    inputRow.appendChild(submitBtn);

    // "No thanks" link
    const dismissLink = document.createElement("button");
    dismissLink.type = "button";
    dismissLink.className = "chatbot-exit-overlay-dismiss";
    dismissLink.textContent = "No thanks";
    dismissLink.addEventListener("click", (e) => {
      e.preventDefault();
      this.hide();
      this.options.onDismiss();
    });

    card.appendChild(headline);
    card.appendChild(subtext);
    card.appendChild(inputRow);
    card.appendChild(dismissLink);
    overlay.appendChild(card);

    return overlay;
  }

  private handleSubmit(): void {
    const email = this.emailInput?.value.trim();
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
   * Show the exit overlay (max once per session)
   */
  show(): void {
    if (this.visible || this.shownThisSession) return;
    this.visible = true;
    this.shownThisSession = true;
    this.element.classList.add("visible");
    // Focus email input for accessibility
    setTimeout(() => this.emailInput?.focus(), 200);
  }

  /**
   * Hide the exit overlay
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
      this.submitBtn.textContent = loading ? "..." : "Send";
      this.submitBtn.style.opacity = loading ? "0.6" : "1";
    }
    if (this.emailInput) {
      this.emailInput.disabled = loading;
    }
  }

  /**
   * Show success feedback then hide
   */
  showSuccess(): void {
    const card = this.element.querySelector(".chatbot-exit-overlay-card");
    if (card) {
      card.innerHTML = `
        <div class="chatbot-exit-overlay-success">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          <span>Thanks! We'll be in touch.</span>
        </div>
      `;
    }
    setTimeout(() => this.hide(), 2500);
  }

  /**
   * Remove from DOM and cleanup
   */
  destroy(): void {
    this.hide();
    this.element.remove();
  }
}
