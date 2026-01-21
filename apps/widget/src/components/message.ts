/**
 * Message Component
 *
 * Renders individual chat messages (user or assistant).
 * Features:
 * - XSS-safe content rendering
 * - Timestamp display
 * - Error state styling
 * - Smooth entrance animation
 * - Feedback buttons (thumbs up/down) for assistant messages
 */

import { escapeHtml, formatTime, parseMarkdown } from "../utils/helpers";

export interface MessageOptions {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  isError?: boolean;
  // Feedback state
  feedback?: "helpful" | "unhelpful" | null;
  onFeedback?: (messageId: string, rating: "helpful" | "unhelpful") => void;
}

// SVG icons for feedback buttons
const THUMBS_UP_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 10v12"/><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2h0a3.13 3.13 0 0 1 3 3.88Z"/></svg>`;
const THUMBS_DOWN_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 14V2"/><path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22h0a3.13 3.13 0 0 1-3-3.88Z"/></svg>`;

export class Message {
  element: HTMLElement;
  private feedbackContainer: HTMLElement | null = null;

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

    // Add feedback buttons for assistant messages (not error messages)
    // Position inside content div so absolute positioning works relative to bubble
    if (this.options.role === "assistant" && !this.options.isError) {
      this.feedbackContainer = this.createFeedbackButtons();
      content.appendChild(this.feedbackContainer);
    }

    message.appendChild(content);

    // Timestamp
    const time = document.createElement("div");
    time.className = "chatbot-message-time";
    time.textContent = formatTime(this.options.timestamp);

    message.appendChild(time);

    return message;
  }

  private createFeedbackButtons(): HTMLElement {
    const container = document.createElement("div");
    container.className = "chatbot-message-feedback";

    // If already submitted feedback, show confirmation
    if (this.options.feedback) {
      container.classList.add("chatbot-message-feedback--submitted");
      const submitted = document.createElement("span");
      submitted.className = "chatbot-feedback-submitted";
      submitted.innerHTML = `${this.options.feedback === "helpful" ? THUMBS_UP_ICON : THUMBS_DOWN_ICON} <span>Thanks for your feedback</span>`;
      container.appendChild(submitted);
      return container;
    }

    // Thumbs up button
    const thumbsUp = document.createElement("button");
    thumbsUp.className = "chatbot-feedback-btn chatbot-feedback-btn--up";
    thumbsUp.innerHTML = THUMBS_UP_ICON;
    thumbsUp.setAttribute("aria-label", "Helpful");
    thumbsUp.setAttribute("title", "Helpful");
    thumbsUp.addEventListener("click", (e) => {
      e.stopPropagation();
      this.handleFeedback("helpful");
    });

    // Thumbs down button
    const thumbsDown = document.createElement("button");
    thumbsDown.className = "chatbot-feedback-btn chatbot-feedback-btn--down";
    thumbsDown.innerHTML = THUMBS_DOWN_ICON;
    thumbsDown.setAttribute("aria-label", "Not helpful");
    thumbsDown.setAttribute("title", "Not helpful");
    thumbsDown.addEventListener("click", (e) => {
      e.stopPropagation();
      this.handleFeedback("unhelpful");
    });

    container.appendChild(thumbsUp);
    container.appendChild(thumbsDown);

    return container;
  }

  private handleFeedback(rating: "helpful" | "unhelpful"): void {
    // Update UI immediately (optimistic update)
    this.updateFeedbackUI(rating);

    // Call the callback if provided
    if (this.options.onFeedback) {
      this.options.onFeedback(this.options.id, rating);
    }
  }

  private updateFeedbackUI(rating: "helpful" | "unhelpful"): void {
    if (!this.feedbackContainer) return;

    // Clear current content
    this.feedbackContainer.innerHTML = "";
    this.feedbackContainer.classList.add("chatbot-message-feedback--submitted");

    // Show confirmation
    const submitted = document.createElement("span");
    submitted.className = "chatbot-feedback-submitted";
    submitted.innerHTML = `${rating === "helpful" ? THUMBS_UP_ICON : THUMBS_DOWN_ICON} <span>Thanks for your feedback</span>`;
    this.feedbackContainer.appendChild(submitted);

    // Update options to reflect new state
    this.options.feedback = rating;
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

  /**
   * Get the current feedback state
   */
  getFeedback(): "helpful" | "unhelpful" | null | undefined {
    return this.options.feedback;
  }
}
