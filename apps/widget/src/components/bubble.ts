/**
 * Chat Bubble Component
 *
 * The floating action button that opens/closes the chat widget.
 * Features:
 * - Smooth icon transition between chat and close states
 * - Keyboard accessible with focus styling
 * - Customizable primary color
 */

export interface BubbleOptions {
  onClick: () => void;
  primaryColor: string;
}

export class Bubble {
  element: HTMLButtonElement;
  private isActive = false;

  constructor(private options: BubbleOptions) {
    this.element = this.createElement();
    this.attachEvents();
  }

  private createElement(): HTMLButtonElement {
    const bubble = document.createElement("button");
    bubble.className = "chatbot-bubble";
    bubble.setAttribute("aria-label", "Open chat");
    bubble.setAttribute("type", "button");
    bubble.style.backgroundColor = this.options.primaryColor;

    // Chat icon (visible when closed)
    const chatIcon = this.createSvgIcon(
      "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",
      "icon-chat"
    );

    // Close icon (visible when open)
    const closeIcon = this.createSvgIcon(
      "M18 6L6 18M6 6l12 12",
      "icon-close"
    );

    // Notification badge dot (hidden by default, CSS handles visibility)
    const notificationDot = document.createElement("span");
    notificationDot.className = "notification-dot";
    notificationDot.setAttribute("aria-hidden", "true");

    bubble.appendChild(chatIcon);
    bubble.appendChild(closeIcon);
    bubble.appendChild(notificationDot);

    return bubble;
  }

  private createSvgIcon(pathD: string, className: string): SVGElement {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", className);
    svg.setAttribute("width", "24");
    svg.setAttribute("height", "24");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "2");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    svg.setAttribute("aria-hidden", "true");

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", pathD);
    svg.appendChild(path);

    return svg;
  }

  private attachEvents(): void {
    this.element.addEventListener("click", (e) => {
      e.preventDefault();
      this.options.onClick();
    });

    // Keyboard support
    this.element.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        this.options.onClick();
      }
    });
  }

  /**
   * Update bubble state (open/closed)
   */
  setActive(active: boolean): void {
    this.isActive = active;
    this.element.classList.toggle("active", active);
    this.element.setAttribute(
      "aria-label",
      active ? "Close chat" : "Open chat"
    );
    this.element.setAttribute(
      "aria-expanded",
      active ? "true" : "false"
    );
  }

  /**
   * Update primary color dynamically
   */
  setColor(color: string): void {
    this.element.style.backgroundColor = color;
  }

  /**
   * Focus the bubble (useful after closing chat)
   */
  focus(): void {
    this.element.focus();
  }

  /**
   * Get current active state
   */
  getActive(): boolean {
    return this.isActive;
  }

  /**
   * Show notification badge dot
   */
  showBadge(): void {
    this.element.classList.add("has-notification");
  }

  /**
   * Hide notification badge dot
   */
  hideBadge(): void {
    this.element.classList.remove("has-notification");
  }
}
