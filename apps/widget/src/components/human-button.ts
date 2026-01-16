/**
 * Human Button Component
 *
 * The "Talk to Human" button that appears above the input
 * when handoff is available and enabled.
 */

export interface HumanButtonOptions {
  onClick: () => void;
  text?: string;
  primaryColor?: string;
}

export class HumanButton {
  element: HTMLElement;
  private button: HTMLButtonElement;
  private isLoading = false;

  constructor(private options: HumanButtonOptions) {
    this.element = this.createElement();
    this.button = this.element.querySelector("button") as HTMLButtonElement;
    this.attachEvents();
  }

  private createElement(): HTMLElement {
    const container = document.createElement("div");
    container.className = "chatbot-human-button-container";

    const button = document.createElement("button");
    button.type = "button";
    button.className = "chatbot-human-button";
    button.setAttribute("aria-label", "Talk to a human agent");

    // User icon
    const icon = this.createUserIcon();
    button.appendChild(icon);

    // Text
    const text = document.createElement("span");
    text.className = "chatbot-human-button-text";
    text.textContent = this.options.text || "Talk to a human";
    button.appendChild(text);

    // Arrow icon
    const arrow = this.createArrowIcon();
    button.appendChild(arrow);

    container.appendChild(button);
    return container;
  }

  private createUserIcon(): SVGElement {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", "16");
    svg.setAttribute("height", "16");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "2");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    svg.setAttribute("aria-hidden", "true");

    // User icon - circle for head
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", "12");
    circle.setAttribute("cy", "8");
    circle.setAttribute("r", "4");
    svg.appendChild(circle);

    // User icon - body path
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", "M20 21a8 8 0 1 0-16 0");
    svg.appendChild(path);

    return svg;
  }

  private createArrowIcon(): SVGElement {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", "14");
    svg.setAttribute("height", "14");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "2");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    svg.setAttribute("aria-hidden", "true");
    svg.classList.add("chatbot-human-button-arrow");

    // Right arrow
    const polyline = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
    polyline.setAttribute("points", "9 18 15 12 9 6");
    svg.appendChild(polyline);

    return svg;
  }

  private createSpinner(): HTMLElement {
    const spinner = document.createElement("span");
    spinner.className = "chatbot-human-button-spinner";
    return spinner;
  }

  private attachEvents(): void {
    this.button.addEventListener("click", () => {
      if (!this.isLoading) {
        this.options.onClick();
      }
    });
  }

  /**
   * Show the button
   */
  show(): void {
    this.element.classList.add("visible");
  }

  /**
   * Hide the button
   */
  hide(): void {
    this.element.classList.remove("visible");
  }

  /**
   * Check if button is visible
   */
  isVisible(): boolean {
    return this.element.classList.contains("visible");
  }

  /**
   * Set loading state
   */
  setLoading(loading: boolean): void {
    this.isLoading = loading;
    this.button.disabled = loading;
    this.element.classList.toggle("loading", loading);

    // Update button content for loading state
    const textEl = this.button.querySelector(".chatbot-human-button-text");
    const arrowEl = this.button.querySelector(".chatbot-human-button-arrow");

    if (loading) {
      if (textEl) textEl.textContent = "Connecting...";
      if (arrowEl) arrowEl.remove();

      // Add spinner if not already present
      if (!this.button.querySelector(".chatbot-human-button-spinner")) {
        this.button.appendChild(this.createSpinner());
      }
    } else {
      if (textEl) textEl.textContent = this.options.text || "Talk to a human";

      // Remove spinner
      const spinner = this.button.querySelector(".chatbot-human-button-spinner");
      if (spinner) spinner.remove();

      // Add arrow back if not present
      if (!this.button.querySelector(".chatbot-human-button-arrow")) {
        this.button.appendChild(this.createArrowIcon());
      }
    }
  }

  /**
   * Update button text
   */
  setText(text: string): void {
    this.options.text = text;
    const textEl = this.button.querySelector(".chatbot-human-button-text");
    if (textEl && !this.isLoading) {
      textEl.textContent = text;
    }
  }

  /**
   * Update primary color (if needed)
   */
  setColor(color: string): void {
    this.options.primaryColor = color;
    // Button uses CSS variables, but we can add custom styling if needed
    this.button.style.setProperty("--human-button-color", color);
  }
}
