/**
 * Teaser Message Component
 *
 * A speech-bubble tooltip that appears near the chat bubble to
 * proactively engage visitors. Slides up with animation, can be
 * dismissed via close button, and clicking the message opens chat.
 */

export interface TeaserMessageOptions {
  message: string;
  primaryColor: string;
  onTeaserClick: () => void;
  onDismiss: () => void;
}

export class TeaserMessage {
  element: HTMLDivElement;
  private visible = false;

  constructor(private options: TeaserMessageOptions) {
    this.element = this.createElement();
  }

  private createElement(): HTMLDivElement {
    const container = document.createElement("div");
    container.className = "chatbot-teaser";
    container.setAttribute("role", "alert");
    container.setAttribute("aria-live", "polite");

    // Message text (clickable to open chat)
    const messageEl = document.createElement("button");
    messageEl.className = "chatbot-teaser-message";
    messageEl.type = "button";
    messageEl.textContent = this.options.message;
    messageEl.setAttribute("aria-label", "Open chat: " + this.options.message);
    messageEl.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.options.onTeaserClick();
    });

    // Close button
    const closeBtn = document.createElement("button");
    closeBtn.className = "chatbot-teaser-close";
    closeBtn.type = "button";
    closeBtn.setAttribute("aria-label", "Dismiss");
    closeBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>`;
    closeBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.hide();
      this.options.onDismiss();
    });

    container.appendChild(messageEl);
    container.appendChild(closeBtn);

    return container;
  }

  /**
   * Show the teaser with slide-up animation
   */
  show(): void {
    if (this.visible) return;
    this.visible = true;
    this.element.classList.add("visible");
  }

  /**
   * Hide the teaser with fade-out
   */
  hide(): void {
    if (!this.visible) return;
    this.visible = false;
    this.element.classList.remove("visible");
  }

  /**
   * Check if currently visible
   */
  isVisible(): boolean {
    return this.visible;
  }

  /**
   * Update the message text
   */
  setMessage(message: string): void {
    const messageEl = this.element.querySelector(".chatbot-teaser-message");
    if (messageEl) {
      messageEl.textContent = message;
    }
  }

  /**
   * Remove from DOM and cleanup
   */
  destroy(): void {
    this.hide();
    this.element.remove();
  }
}
