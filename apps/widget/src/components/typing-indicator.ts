/**
 * Typing Indicator Component
 *
 * Shows animated dots while waiting for AI response.
 * Features:
 * - Three animated bouncing dots
 * - Respects reduced motion preferences via CSS
 * - Screen reader accessible
 */

export class TypingIndicator {
  element: HTMLElement;

  constructor() {
    this.element = this.createElement();
  }

  private createElement(): HTMLElement {
    const container = document.createElement("div");
    container.className = "chatbot-typing";
    container.setAttribute("role", "status");
    container.setAttribute("aria-label", "Assistant is typing");

    // Create three dots
    for (let i = 0; i < 3; i++) {
      const dot = document.createElement("span");
      dot.className = "chatbot-typing-dot";
      dot.setAttribute("aria-hidden", "true");
      container.appendChild(dot);
    }

    // Screen reader text (hidden visually)
    const srText = document.createElement("span");
    srText.className = "sr-only";
    srText.style.cssText = `
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    `;
    srText.textContent = "Assistant is typing...";
    container.appendChild(srText);

    return container;
  }

  /**
   * Show the typing indicator
   */
  show(): void {
    this.element.style.display = "flex";
  }

  /**
   * Hide the typing indicator
   */
  hide(): void {
    this.element.style.display = "none";
  }
}
