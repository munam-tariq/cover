/**
 * Message Component
 *
 * Renders individual chat messages (user or assistant).
 * Features:
 * - XSS-safe content rendering
 * - Timestamp display
 * - Error state styling
 * - Smooth entrance animation
 */

import { escapeHtml, formatTime, parseMarkdown } from "../utils/helpers";

export interface MessageOptions {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  isError?: boolean;
}

export class Message {
  element: HTMLElement;

  constructor(private options: MessageOptions) {
    this.element = this.createElement();
  }

  private createElement(): HTMLElement {
    const message = document.createElement("div");
    message.className = `chatbot-message ${this.options.role}`;
    message.setAttribute("data-message-id", this.options.id);

    // Add error class if applicable
    if (this.options.isError) {
      message.classList.add("error");
    }

    // Message content
    const content = document.createElement("div");
    content.className = "chatbot-message-content";
    // Parse markdown for assistant messages, escape for user messages
    if (this.options.role === "assistant") {
      content.innerHTML = parseMarkdown(this.options.content);
    } else {
      content.innerHTML = escapeHtml(this.options.content);
    }

    // Timestamp
    const time = document.createElement("div");
    time.className = "chatbot-message-time";
    time.textContent = formatTime(this.options.timestamp);

    message.appendChild(content);
    message.appendChild(time);

    return message;
  }

  /**
   * Update message content (for streaming, future feature)
   */
  updateContent(newContent: string): void {
    const contentEl = this.element.querySelector(".chatbot-message-content");
    if (contentEl) {
      // Parse markdown for assistant messages, escape for user messages
      if (this.options.role === "assistant") {
        contentEl.innerHTML = parseMarkdown(newContent);
      } else {
        contentEl.innerHTML = escapeHtml(newContent);
      }
    }
  }

  /**
   * Get the message ID
   */
  getId(): string {
    return this.options.id;
  }
}
