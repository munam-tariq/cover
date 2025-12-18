/**
 * Chat Window Component
 *
 * The main chat interface that contains header, messages, and input.
 * Features:
 * - Message history with persistence
 * - Typing indicator during API calls
 * - Auto-scroll to new messages
 * - Focus trap for accessibility
 * - Escape key to close
 * - Error handling with user-friendly messages
 */

import { Message, MessageOptions } from "./message";
import { Input } from "./input";
import { TypingIndicator } from "./typing-indicator";
import { sendMessage, ChatApiError } from "../utils/api";
import {
  getVisitorId,
  getSessionId,
  setSessionId,
  getStoredMessages,
  setStoredMessages,
  StoredMessage,
} from "../utils/storage";
import { generateId } from "../utils/helpers";

export interface ChatWindowOptions {
  projectId: string;
  apiUrl: string;
  greeting: string;
  title: string;
  primaryColor: string;
  onClose: () => void;
}

export class ChatWindow {
  element: HTMLElement;
  private messagesContainer: HTMLElement;
  private input: Input;
  private typingIndicator: TypingIndicator;
  private messages: StoredMessage[] = [];
  private visitorId: string;
  private sessionId: string | null = null;
  private isVisible = false;
  private focusableElements: HTMLElement[] = [];
  private lastFocusedElement: HTMLElement | null = null;

  constructor(private options: ChatWindowOptions) {
    this.visitorId = getVisitorId();
    this.sessionId = getSessionId(options.projectId);
    this.messages = getStoredMessages(options.projectId);

    this.element = this.createElement();
    this.messagesContainer = this.element.querySelector(
      ".chatbot-messages"
    ) as HTMLElement;

    // Create input
    this.input = new Input({
      onSend: (message) => this.handleSend(message),
      primaryColor: options.primaryColor,
    });
    this.element
      .querySelector(".chatbot-input-container")!
      .appendChild(this.input.element);

    // Create typing indicator
    this.typingIndicator = new TypingIndicator();
    this.typingIndicator.hide();
    this.messagesContainer.appendChild(this.typingIndicator.element);

    // Render initial messages
    this.renderMessages();

    // Setup keyboard handling
    this.setupKeyboardHandling();
  }

  private createElement(): HTMLElement {
    const window = document.createElement("div");
    window.className = "chatbot-window";
    window.setAttribute("role", "dialog");
    window.setAttribute("aria-label", "Chat window");
    window.setAttribute("aria-modal", "true");
    window.setAttribute("tabindex", "-1");

    window.innerHTML = `
      <div class="chatbot-header" style="background-color: ${this.options.primaryColor}">
        <div class="chatbot-header-left">
          <div class="chatbot-avatar">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
          </div>
          <div class="chatbot-header-info">
            <span class="chatbot-title">${this.escapeHtml(this.options.title)}</span>
            <span class="chatbot-status">
              <span class="chatbot-status-dot"></span>
              Online
            </span>
          </div>
        </div>
        <button class="chatbot-close" aria-label="Close chat" type="button">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      <div class="chatbot-messages" role="log" aria-live="polite" aria-label="Chat messages"></div>
      <div class="chatbot-input-container"></div>
    `;

    // Attach close handler
    const closeBtn = window.querySelector(".chatbot-close") as HTMLElement;
    closeBtn.addEventListener("click", () => {
      this.options.onClose();
    });

    return window;
  }

  private escapeHtml(text: string): string {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  private renderMessages(): void {
    // Clear existing messages (except typing indicator)
    const existingMessages = this.messagesContainer.querySelectorAll(".chatbot-message");
    existingMessages.forEach((el) => el.remove());

    // Add greeting if no messages
    if (this.messages.length === 0) {
      const greeting: StoredMessage = {
        id: "greeting",
        role: "assistant",
        content: this.options.greeting,
        timestamp: Date.now(),
      };
      this.addMessageToDOM(greeting);
    } else {
      // Render stored messages
      this.messages.forEach((msg) => this.addMessageToDOM(msg));
    }

    this.scrollToBottom();
  }

  private addMessageToDOM(messageData: StoredMessage): void {
    const messageComponent = new Message({
      ...messageData,
      isError: messageData.isError,
    });

    // Insert before typing indicator
    this.messagesContainer.insertBefore(
      messageComponent.element,
      this.typingIndicator.element
    );
  }

  private async handleSend(content: string): Promise<void> {
    // Create user message
    const userMessage: StoredMessage = {
      id: generateId(),
      content,
      role: "user",
      timestamp: Date.now(),
    };

    // Add to messages and DOM
    this.messages.push(userMessage);
    this.addMessageToDOM(userMessage);
    this.scrollToBottom();

    // Save to storage
    setStoredMessages(this.options.projectId, this.messages);

    // Show typing indicator
    this.typingIndicator.show();
    this.input.setLoading(true);
    this.scrollToBottom();

    try {
      // Build conversation history (last 10 messages)
      const conversationHistory = this.messages.slice(-10).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      // Send to API
      const response = await sendMessage({
        apiUrl: this.options.apiUrl,
        projectId: this.options.projectId,
        message: content,
        visitorId: this.visitorId,
        sessionId: this.sessionId,
        conversationHistory,
      });

      // Update session ID
      if (response.sessionId) {
        this.sessionId = response.sessionId;
        setSessionId(this.options.projectId, response.sessionId);
      }

      // Add assistant response
      const assistantMessage: StoredMessage = {
        id: generateId(),
        content: response.response,
        role: "assistant",
        timestamp: Date.now(),
      };

      this.messages.push(assistantMessage);
      this.addMessageToDOM(assistantMessage);
      setStoredMessages(this.options.projectId, this.messages);
    } catch (error) {
      console.error("Chat error:", error);

      // Create error message
      let errorContent = "Sorry, something went wrong. Please try again.";

      if (error instanceof ChatApiError) {
        if (error.isRateLimited) {
          errorContent =
            "You've sent too many messages. Please wait a moment and try again.";
        } else {
          errorContent = error.message;
        }
      }

      const errorMessage: StoredMessage = {
        id: generateId(),
        content: errorContent,
        role: "assistant",
        timestamp: Date.now(),
        isError: true,
      };

      this.messages.push(errorMessage);
      this.addMessageToDOM(errorMessage);
      setStoredMessages(this.options.projectId, this.messages);
    } finally {
      this.typingIndicator.hide();
      this.input.setLoading(false);
      this.scrollToBottom();
    }
  }

  private scrollToBottom(): void {
    // Use requestAnimationFrame for smooth scrolling
    requestAnimationFrame(() => {
      this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    });
  }

  private setupKeyboardHandling(): void {
    // Escape key to close
    this.element.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        this.options.onClose();
      }

      // Tab trap
      if (e.key === "Tab") {
        this.handleTabKey(e);
      }
    });
  }

  private handleTabKey(e: KeyboardEvent): void {
    if (!this.isVisible) return;

    // Get all focusable elements
    this.focusableElements = Array.from(
      this.element.querySelectorAll(
        'button:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    ) as HTMLElement[];

    if (this.focusableElements.length === 0) return;

    const firstElement = this.focusableElements[0];
    const lastElement = this.focusableElements[this.focusableElements.length - 1];
    const activeElement = document.activeElement as HTMLElement;

    // Check if active element is within shadow DOM
    const shadowActiveElement = this.element.getRootNode() instanceof ShadowRoot
      ? (this.element.getRootNode() as ShadowRoot).activeElement
      : activeElement;

    if (e.shiftKey) {
      // Shift + Tab
      if (shadowActiveElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      }
    } else {
      // Tab
      if (shadowActiveElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    }
  }

  /**
   * Show the chat window
   */
  show(): void {
    this.isVisible = true;
    this.element.classList.add("visible");

    // Store last focused element
    this.lastFocusedElement = document.activeElement as HTMLElement;

    // Focus the input after animation
    setTimeout(() => {
      this.input.focus();
    }, 250);
  }

  /**
   * Hide the chat window
   */
  hide(): void {
    this.isVisible = false;
    this.element.classList.remove("visible");

    // Restore focus
    if (this.lastFocusedElement) {
      this.lastFocusedElement.focus();
    }
  }

  /**
   * Check if window is visible
   */
  getVisible(): boolean {
    return this.isVisible;
  }

  /**
   * Update title
   */
  setTitle(title: string): void {
    const titleEl = this.element.querySelector(".chatbot-title");
    if (titleEl) {
      titleEl.textContent = title;
    }
  }

  /**
   * Update primary color
   */
  setColor(color: string): void {
    const header = this.element.querySelector(".chatbot-header") as HTMLElement;
    if (header) {
      header.style.backgroundColor = color;
    }
    this.input.setColor(color);
  }

  /**
   * Clear chat history
   */
  clearHistory(): void {
    this.messages = [];
    setStoredMessages(this.options.projectId, []);
    this.renderMessages();
  }
}
