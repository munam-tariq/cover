/**
 * Input Component
 *
 * The message input area with textarea and send button.
 * Features:
 * - Auto-resizing textarea
 * - Character count with warning
 * - Enter to send (Shift+Enter for newline)
 * - Loading state with disabled input
 * - Keyboard accessible
 */

const MAX_MESSAGE_LENGTH = 2000;
const WARNING_THRESHOLD = 1800;

export interface InputOptions {
  onSend: (message: string) => void;
  primaryColor: string;
  placeholder?: string;
  onInput?: () => void; // Called when user types (for typing indicators)
  voiceEnabled?: boolean;
  onVoiceClick?: () => void;
}

export class Input {
  element: HTMLElement;
  private textarea: HTMLTextAreaElement;
  private sendButton: HTMLButtonElement;
  private charCount: HTMLElement | null = null;
  private isLoading = false;

  constructor(private options: InputOptions) {
    this.element = this.createElement();
    this.textarea = this.element.querySelector("textarea") as HTMLTextAreaElement;
    this.sendButton = this.element.querySelector("button") as HTMLButtonElement;
    this.attachEvents();
  }

  private createElement(): HTMLElement {
    const container = document.createElement("div");
    container.className = "chatbot-input";

    // Textarea wrapper (for character count positioning)
    const textareaWrapper = document.createElement("div");
    textareaWrapper.className = "chatbot-textarea-wrapper";

    // Textarea
    const textarea = document.createElement("textarea");
    textarea.placeholder = this.options.placeholder || "Ask anything...";
    textarea.rows = 1;
    textarea.setAttribute("aria-label", "Message input");
    textarea.setAttribute("maxlength", MAX_MESSAGE_LENGTH.toString());

    textareaWrapper.appendChild(textarea);
    container.appendChild(textareaWrapper);

    // Voice/mic button (only if voice is enabled)
    if (this.options.voiceEnabled) {
      const micButton = document.createElement("button");
      micButton.type = "button";
      micButton.className = "cb-voice-input-btn";
      micButton.setAttribute("aria-label", "Start voice call");
      micButton.title = "Voice call";

      const micSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      micSvg.setAttribute("width", "18");
      micSvg.setAttribute("height", "18");
      micSvg.setAttribute("viewBox", "0 0 24 24");
      micSvg.setAttribute("fill", "none");
      micSvg.setAttribute("stroke", "currentColor");
      micSvg.setAttribute("stroke-width", "2");
      micSvg.setAttribute("aria-hidden", "true");

      const micPath1 = document.createElementNS("http://www.w3.org/2000/svg", "path");
      micPath1.setAttribute("d", "M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z");
      micSvg.appendChild(micPath1);

      const micPath2 = document.createElementNS("http://www.w3.org/2000/svg", "path");
      micPath2.setAttribute("d", "M19 10v2a7 7 0 0 1-14 0v-2");
      micSvg.appendChild(micPath2);

      const micLine1 = document.createElementNS("http://www.w3.org/2000/svg", "line");
      micLine1.setAttribute("x1", "12");
      micLine1.setAttribute("y1", "19");
      micLine1.setAttribute("x2", "12");
      micLine1.setAttribute("y2", "23");
      micSvg.appendChild(micLine1);

      const micLine2 = document.createElementNS("http://www.w3.org/2000/svg", "line");
      micLine2.setAttribute("x1", "8");
      micLine2.setAttribute("y1", "23");
      micLine2.setAttribute("x2", "16");
      micLine2.setAttribute("y2", "23");
      micSvg.appendChild(micLine2);

      micButton.appendChild(micSvg);
      container.appendChild(micButton);

      micButton.addEventListener("click", () => {
        this.options.onVoiceClick?.();
      });
    }

    // Send button
    const sendButton = document.createElement("button");
    sendButton.type = "button";
    sendButton.className = "chatbot-send";
    sendButton.setAttribute("aria-label", "Send message");
    // Gradient send button handled via CSS — no inline style needed

    // Send icon
    const sendIcon = this.createSendIcon();
    sendButton.appendChild(sendIcon);

    container.appendChild(sendButton);

    return container;
  }

  private createSendIcon(): SVGElement {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", "18");
    svg.setAttribute("height", "18");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "2");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    svg.setAttribute("aria-hidden", "true");

    // Paper plane icon
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", "22");
    line.setAttribute("y1", "2");
    line.setAttribute("x2", "11");
    line.setAttribute("y2", "13");
    svg.appendChild(line);

    const polygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
    polygon.setAttribute("points", "22 2 15 22 11 13 2 9 22 2");
    svg.appendChild(polygon);

    return svg;
  }

  private attachEvents(): void {
    // Send on button click
    this.sendButton.addEventListener("click", () => {
      this.send();
    });

    // Send on Enter (without Shift)
    this.textarea.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        this.send();
      }
    });

    // Auto-resize textarea and update character count
    this.textarea.addEventListener("input", () => {
      this.autoResize();
      this.updateCharCount();
      // Notify about typing for typing indicators
      this.options.onInput?.();
    });

    // Handle paste - ensure we don't exceed max length
    this.textarea.addEventListener("paste", (e) => {
      // Let default paste happen, then check length on next tick
      setTimeout(() => {
        if (this.textarea.value.length > MAX_MESSAGE_LENGTH) {
          this.textarea.value = this.textarea.value.substring(0, MAX_MESSAGE_LENGTH);
        }
        this.autoResize();
        this.updateCharCount();
      }, 0);
    });
  }

  private autoResize(): void {
    this.textarea.style.height = "auto";
    const newHeight = Math.min(this.textarea.scrollHeight, 120);
    this.textarea.style.height = `${newHeight}px`;
  }

  private updateCharCount(): void {
    const length = this.textarea.value.length;

    // Only show character count when approaching limit
    if (length >= WARNING_THRESHOLD) {
      if (!this.charCount) {
        this.charCount = document.createElement("div");
        this.charCount.className = "chatbot-char-count";
        const wrapper = this.element.querySelector(".chatbot-textarea-wrapper");
        wrapper?.appendChild(this.charCount);
      }

      this.charCount.textContent = `${length}/${MAX_MESSAGE_LENGTH}`;
      this.charCount.classList.remove("warning", "error");

      if (length >= MAX_MESSAGE_LENGTH) {
        this.charCount.classList.add("error");
      } else if (length >= WARNING_THRESHOLD) {
        this.charCount.classList.add("warning");
      }
    } else if (this.charCount) {
      this.charCount.remove();
      this.charCount = null;
    }
  }

  private send(): void {
    if (this.isLoading) return;

    const message = this.textarea.value.trim();
    if (!message) return;

    // Validate length
    if (message.length > MAX_MESSAGE_LENGTH) {
      return;
    }

    this.options.onSend(message);
    this.clear();
  }

  /**
   * Clear the input
   */
  clear(): void {
    this.textarea.value = "";
    this.textarea.style.height = "auto";

    // Remove character count if visible
    if (this.charCount) {
      this.charCount.remove();
      this.charCount = null;
    }
  }

  /**
   * Set loading state
   */
  setLoading(loading: boolean): void {
    this.isLoading = loading;
    this.sendButton.disabled = loading;
    this.textarea.disabled = loading;
    this.element.classList.toggle("loading", loading);

    if (!loading) {
      // Focus textarea after loading completes
      this.textarea.focus();
    }
  }

  /**
   * Focus the input
   */
  focus(): void {
    this.textarea.focus();
  }

  /**
   * Check if input has content
   */
  hasContent(): boolean {
    return this.textarea.value.trim().length > 0;
  }

  /**
   * Update placeholder text
   */
  setPlaceholder(text: string): void {
    this.textarea.placeholder = text;
  }

  /**
   * Disable/enable the input with a custom placeholder
   */
  setDisabled(disabled: boolean, placeholder?: string): void {
    this.textarea.disabled = disabled;
    this.sendButton.disabled = disabled;
    this.element.classList.toggle("disabled", disabled);

    if (disabled && placeholder) {
      this.textarea.placeholder = placeholder;
    } else if (!disabled) {
      this.textarea.placeholder = this.options.placeholder || "Type a message...";
    }
  }

  /**
   * Update primary color
   */
  setColor(color: string): void {
    // Accent color set via CSS custom property on parent — gradient in CSS handles the rest
    this.sendButton.style.setProperty("--widget-accent", color);
  }
}
