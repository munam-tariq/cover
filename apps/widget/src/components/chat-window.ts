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
import { HumanButton } from "./human-button";
import { OfflineForm } from "./offline-form";
import { sendMessage, ChatApiError } from "../utils/api";
import {
  checkHandoffAvailability,
  triggerHandoff,
  getConversationStatus,
  fetchNewMessages,
  sendTypingIndicator,
  submitOfflineMessage,
  PresenceManager,
  HandoffAvailability,
  ConversationStatus,
} from "../utils/handoff";
import {
  getVisitorId,
  getSessionId,
  setSessionId,
  getStoredMessages,
  setStoredMessages,
  StoredMessage,
} from "../utils/storage";
import { generateId } from "../utils/helpers";
import {
  WidgetRealtimeManager,
  getRealtimeManager,
  cleanupRealtime,
  RealtimeMessage,
  RealtimeStatusChange,
} from "../utils/realtime";

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
  private humanButton: HumanButton | null = null;
  private messages: StoredMessage[] = [];
  private visitorId: string;
  private sessionId: string | null = null;
  private isVisible = false;
  private focusableElements: HTMLElement[] = [];
  private lastFocusedElement: HTMLElement | null = null;
  private handoffAvailability: HandoffAvailability | null = null;
  private availabilityCheckInterval: number | null = null;
  private conversationStatus: ConversationStatus = "ai_active";
  private messagePollingInterval: number | null = null;
  private lastMessageTimestamp: string | null = null;
  private realtimeManager: WidgetRealtimeManager | null = null;
  private useRealtime = true; // Use realtime when Supabase config is available
  private isTyping = false;
  private typingTimeout: number | null = null;
  private typingDebounce = 300; // ms before sending typing:start
  private typingStopDelay = 3000; // ms of inactivity before sending typing:stop
  private presenceManager: PresenceManager;
  private offlineForm: OfflineForm | null = null;
  private showingOfflineForm = false;

  constructor(private options: ChatWindowOptions) {
    this.visitorId = getVisitorId();
    this.sessionId = getSessionId(options.projectId);
    this.messages = getStoredMessages(options.projectId);

    // Initialize presence manager
    this.presenceManager = new PresenceManager(options.apiUrl, this.visitorId);

    this.element = this.createElement();
    this.messagesContainer = this.element.querySelector(
      ".chatbot-messages"
    ) as HTMLElement;

    // Create human button (will be shown/hidden based on availability)
    this.humanButton = new HumanButton({
      onClick: () => this.handleHumanButtonClick(),
      text: "Talk to a human",
    });
    // Insert human button before input container
    const inputContainer = this.element.querySelector(".chatbot-input-container")!;
    inputContainer.parentNode?.insertBefore(this.humanButton.element, inputContainer);

    // Create input
    this.input = new Input({
      onSend: (message) => this.handleSend(message),
      primaryColor: options.primaryColor,
      onInput: () => this.handleUserTyping(),
    });
    inputContainer.appendChild(this.input.element);

    // Create typing indicator
    this.typingIndicator = new TypingIndicator();
    this.typingIndicator.hide();
    this.messagesContainer.appendChild(this.typingIndicator.element);

    // Create offline form (hidden by default)
    this.offlineForm = new OfflineForm({
      onSubmit: async (data) => this.handleOfflineFormSubmit(data),
      primaryColor: options.primaryColor,
    });
    this.offlineForm.hide();
    // Insert offline form in the messages container (will replace chat when shown)
    this.messagesContainer.parentNode?.insertBefore(
      this.offlineForm.element,
      this.messagesContainer.nextSibling
    );

    // Render initial messages
    this.renderMessages();

    // Setup keyboard handling
    this.setupKeyboardHandling();

    // Check conversation status first (if we have a session)
    // This determines if we should show the human button
    this.initializeConversationState();
  }

  /**
   * Initialize conversation state on load
   * Checks existing conversation status and sets up polling if needed
   */
  private async initializeConversationState(): Promise<void> {
    // If we have an existing session, always fetch fresh messages from server
    if (this.sessionId) {
      // Always sync messages from server first to replace potentially stale localStorage
      await this.fetchAndSyncMessages();

      // Check conversation status
      const status = await getConversationStatus(
        this.options.apiUrl,
        this.sessionId
      );

      if (process.env.NODE_ENV === "development") {
        console.log("[Widget] Conversation status:", status);
      }

      if (status) {
        this.conversationStatus = status.status;

        // If in handoff state (waiting or agent_active), hide button and start polling
        if (status.status === "waiting" || status.status === "agent_active") {
          this.humanButton?.hide();

          // Start realtime/polling for new messages
          this.startMessagePolling();

          if (process.env.NODE_ENV === "development") {
            console.log("[Widget] Conversation in handoff state:", status.status);
          }
          return;
        }
      } else {
        // If status check fails but we have session, still check if we should poll
        // This handles the case where conversation exists but status endpoint fails
        if (process.env.NODE_ENV === "development") {
          console.log("[Widget] Status check failed, session exists:", this.sessionId);
        }
      }
    }

    // Check handoff availability (shows/hides button based on project settings)
    this.checkAvailability();
  }

  /**
   * Fetch all messages from server and sync with local storage
   * Called when recovering an existing conversation
   */
  private async fetchAndSyncMessages(): Promise<void> {
    if (!this.sessionId) return;

    try {
      // Fetch ALL messages (not just new ones) to ensure we have complete history
      const serverMessages = await fetchNewMessages(
        this.options.apiUrl,
        this.sessionId,
        undefined // No timestamp = get all messages
      );

      if (serverMessages.length > 0) {
        // Convert server messages to stored format
        const convertedMessages: StoredMessage[] = serverMessages.map((msg) => ({
          id: msg.id,
          content: msg.content,
          role: msg.senderType === "customer" ? "user" as const : "assistant" as const,
          timestamp: new Date(msg.createdAt).getTime(),
          ...(msg.senderType === "agent" && msg.senderName ? { agentName: msg.senderName } : {}),
        }));

        // Replace all messages with server data (server is source of truth)
        this.messages = convertedMessages;
        // Sort by timestamp to maintain order
        this.messages.sort((a, b) => a.timestamp - b.timestamp);
        setStoredMessages(this.options.projectId, this.messages);
        this.renderMessages();

        // Set last message timestamp for future polling
        const lastMsg = serverMessages[serverMessages.length - 1];
        this.lastMessageTimestamp = lastMsg.createdAt;

        if (process.env.NODE_ENV === "development") {
          console.log("[Widget] Synced messages from server:", serverMessages.length);
        }
      }
    } catch (error) {
      console.error("[Widget] Failed to fetch messages on recovery:", error);
    }
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
    // Stop typing indicator when sending
    this.stopTypingIndicator();

    // Record activity for presence tracking
    this.presenceManager.recordActivity();

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

      // Add assistant response only if there's content
      // (empty response means we're in handoff mode - agent will respond via realtime)
      if (response.response && response.response.trim()) {
        const assistantMessage: StoredMessage = {
          id: generateId(),
          content: response.response,
          role: "assistant",
          timestamp: Date.now(),
        };

        this.messages.push(assistantMessage);
        this.addMessageToDOM(assistantMessage);
        setStoredMessages(this.options.projectId, this.messages);
      }
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

  /**
   * Handle user typing - send typing indicator when in handoff mode
   */
  private handleUserTyping(): void {
    // Record activity for presence tracking
    this.presenceManager.recordActivity();

    // Only send typing indicators when in handoff mode
    if (!this.isInHandoffState() || !this.sessionId) return;

    // Clear existing timeout
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
    }

    // Send typing:start if not already typing
    if (!this.isTyping) {
      this.isTyping = true;
      sendTypingIndicator(this.options.apiUrl, this.sessionId, true);
    }

    // Set timeout to send typing:stop after inactivity
    this.typingTimeout = window.setTimeout(() => {
      this.stopTypingIndicator();
    }, this.typingStopDelay);
  }

  /**
   * Stop typing indicator
   */
  private stopTypingIndicator(): void {
    if (this.isTyping && this.sessionId) {
      this.isTyping = false;
      sendTypingIndicator(this.options.apiUrl, this.sessionId, false);
    }

    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
      this.typingTimeout = null;
    }
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

  /**
   * Check handoff availability and update UI
   */
  private async checkAvailability(): Promise<void> {
    try {
      this.handoffAvailability = await checkHandoffAvailability(
        this.options.apiUrl,
        this.options.projectId
      );

      // Update human button visibility
      if (this.handoffAvailability.showButton && this.humanButton) {
        this.humanButton.setText(this.handoffAvailability.buttonText || "Talk to a human");
        this.humanButton.show();
      } else if (this.humanButton) {
        this.humanButton.hide();
      }

      // Log for debugging
      if (process.env.NODE_ENV === "development") {
        console.log("[Widget] Handoff availability:", this.handoffAvailability);
      }
    } catch (error) {
      console.error("[Widget] Failed to check handoff availability:", error);
    }
  }

  /**
   * Handle human button click
   */
  private async handleHumanButtonClick(): Promise<void> {
    if (!this.humanButton) return;

    // Show loading state
    this.humanButton.setLoading(true);

    try {
      // We need a conversation ID to trigger handoff
      // If we don't have one yet, send a message first to create the conversation
      if (!this.sessionId) {
        // Create a system message indicating user requested human
        const userMessage: StoredMessage = {
          id: generateId(),
          content: "I would like to speak with a human agent.",
          role: "user",
          timestamp: Date.now(),
        };

        this.messages.push(userMessage);
        this.addMessageToDOM(userMessage);
        setStoredMessages(this.options.projectId, this.messages);

        // Send to API to create conversation
        const response = await sendMessage({
          apiUrl: this.options.apiUrl,
          projectId: this.options.projectId,
          message: userMessage.content,
          visitorId: this.visitorId,
          sessionId: this.sessionId,
          conversationHistory: [],
        });

        if (response.sessionId) {
          this.sessionId = response.sessionId;
          setSessionId(this.options.projectId, response.sessionId);
        }

        // Check if handoff was already triggered by the chat engine
        if (response.handoff?.triggered) {
          // Handoff was triggered automatically, show the response
          const assistantMessage: StoredMessage = {
            id: generateId(),
            content: response.response,
            role: "assistant",
            timestamp: Date.now(),
          };
          this.messages.push(assistantMessage);
          this.addMessageToDOM(assistantMessage);
          setStoredMessages(this.options.projectId, this.messages);

          // Hide the human button since we're now in handoff mode
          this.humanButton.hide();
          this.humanButton.setLoading(false);
          this.conversationStatus = "waiting";
          this.lastMessageTimestamp = new Date().toISOString();
          this.startMessagePolling();
          this.scrollToBottom();
          return;
        }
      }

      // Now trigger handoff
      const result = await triggerHandoff(
        this.options.apiUrl,
        this.sessionId!,
        { reason: "button_click" }
      );

      // Check if we should show the offline form
      if (result.showOfflineForm) {
        this.showOfflineForm();
        return;
      }

      // Hide the human button
      this.humanButton.hide();
      this.conversationStatus = result.status === "agent_active" ? "agent_active" : "waiting";

      // Start realtime/polling for messages
      this.startMessagePolling();

      // Fetch messages from server to get the system message that was broadcast
      // This ensures customer sees "You're now connected with a support agent."
      await this.fetchAndSyncMessages();
    } catch (error) {
      console.error("[Widget] Failed to trigger handoff:", error);

      // Show error message
      const errorMessage: StoredMessage = {
        id: generateId(),
        content: "Sorry, we couldn't connect you with an agent right now. Please try again.",
        role: "assistant",
        timestamp: Date.now(),
        isError: true,
      };
      this.messages.push(errorMessage);
      this.addMessageToDOM(errorMessage);
      setStoredMessages(this.options.projectId, this.messages);
    } finally {
      this.humanButton?.setLoading(false);
      this.scrollToBottom();
    }
  }

  /**
   * Show the offline form
   */
  private showOfflineForm(): void {
    if (!this.offlineForm) return;

    this.showingOfflineForm = true;

    // Hide chat elements
    this.messagesContainer.style.display = "none";
    this.humanButton?.hide();
    const inputContainer = this.element.querySelector(".chatbot-input-container") as HTMLElement;
    if (inputContainer) {
      inputContainer.style.display = "none";
    }

    // Show offline form
    this.offlineForm.show();
  }

  /**
   * Hide the offline form and show chat
   */
  private hideOfflineForm(): void {
    if (!this.offlineForm) return;

    this.showingOfflineForm = false;

    // Show chat elements
    this.messagesContainer.style.display = "flex";
    const inputContainer = this.element.querySelector(".chatbot-input-container") as HTMLElement;
    if (inputContainer) {
      inputContainer.style.display = "block";
    }

    // Hide offline form
    this.offlineForm.hide();

    // Reset form for next use
    this.offlineForm.reset();
  }

  /**
   * Handle offline form submission
   */
  private async handleOfflineFormSubmit(data: {
    name: string;
    email: string;
    message: string;
  }): Promise<void> {
    await submitOfflineMessage(this.options.apiUrl, this.options.projectId, {
      ...data,
      visitorId: this.visitorId,
    });
  }

  /**
   * Start real-time or polling for new messages (when in handoff state)
   */
  private startMessagePolling(): void {
    if (!this.sessionId) return;

    // Start presence tracking when entering handoff mode
    this.presenceManager.start(this.sessionId);

    // Check if realtime config is available
    const config = (window as Record<string, unknown>).__WIDGET_CONFIG__ as Record<string, string> | undefined;
    const hasRealtimeConfig = !!(config?.supabaseUrl && config?.supabaseAnonKey);

    // Try realtime if enabled and config available
    if (this.useRealtime && hasRealtimeConfig) {
      if (process.env.NODE_ENV === "development") {
        console.log("[Widget] Starting realtime with config:", config?.supabaseUrl);
      }
      this.startRealtime();
    } else {
      if (process.env.NODE_ENV === "development") {
        console.log("[Widget] Starting polling (realtime config not available)");
      }
      this.startPolling();
    }
  }

  /**
   * Start Supabase Realtime connection
   */
  private startRealtime(): void {
    if (!this.sessionId) return;

    try {
      this.realtimeManager = getRealtimeManager(this.options.apiUrl);

      this.realtimeManager.subscribe(this.sessionId, {
        onMessage: (message: RealtimeMessage) => {
          this.handleRealtimeMessage(message);
        },
        onStatusChange: (status: RealtimeStatusChange) => {
          this.handleRealtimeStatusChange(status);
        },
        onAgentJoined: (agent: { id: string; name: string }) => {
          // Show system message when agent joins (if not already shown via message)
          if (process.env.NODE_ENV === "development") {
            console.log("[Widget] Agent joined via realtime:", agent);
          }
        },
        onTyping: (data: { participant: { type: string; name?: string }; isTyping: boolean }) => {
          // Handle agent typing indicator
          if (data.participant.type === "agent") {
            if (data.isTyping) {
              this.typingIndicator.show();
            } else {
              this.typingIndicator.hide();
            }
          }
        },
        onConnectionChange: (connected: boolean) => {
          if (process.env.NODE_ENV === "development") {
            console.log("[Widget] Realtime connection:", connected ? "connected" : "disconnected");
          }

          // If disconnected and we're in handoff mode, fallback to polling
          if (!connected && this.isInHandoffState()) {
            console.warn("[Widget] Realtime disconnected, falling back to polling");
            this.useRealtime = false;
            this.startPolling();
          }
        },
        onError: (error: Error) => {
          console.error("[Widget] Realtime error:", error);
          // Fallback to polling on error
          this.useRealtime = false;
          this.startPolling();
        },
      });

      if (process.env.NODE_ENV === "development") {
        console.log("[Widget] Started realtime connection");
      }
    } catch (error) {
      console.error("[Widget] Failed to start realtime, falling back to polling:", error);
      this.useRealtime = false;
      this.startPolling();
    }
  }

  /**
   * Handle realtime message event
   */
  private handleRealtimeMessage(message: RealtimeMessage): void {
    // Skip if we already have this message
    if (this.messages.some((m) => m.id === message.id)) return;

    // Skip customer messages (we already have those from sending)
    if (message.senderType === "customer") return;

    // Determine role based on sender type
    let role: "user" | "assistant" = "assistant";
    if (message.senderType === "customer") {
      role = "user";
    }

    const storedMsg: StoredMessage = {
      id: message.id,
      content: message.content,
      role,
      timestamp: new Date(message.createdAt).getTime(),
      // Add agent name for agent messages
      ...(message.senderType === "agent" && message.senderName
        ? { agentName: message.senderName }
        : {}),
    };

    this.messages.push(storedMsg);
    this.addMessageToDOM(storedMsg);
    setStoredMessages(this.options.projectId, this.messages);
    this.scrollToBottom();

    if (process.env.NODE_ENV === "development") {
      console.log("[Widget] Received realtime message:", message);
    }
  }

  /**
   * Handle realtime status change event
   */
  private handleRealtimeStatusChange(status: RealtimeStatusChange): void {
    const previousStatus = this.conversationStatus;
    this.conversationStatus = status.status;

    if (process.env.NODE_ENV === "development") {
      console.log("[Widget] Realtime status change:", status);
    }

    // If resolved or returned to AI, cleanup and show button again
    if (status.status === "resolved" || status.status === "closed" || status.status === "ai_active") {
      // If was in handoff state and now resolved/ai_active, fetch any system messages
      if (previousStatus === "agent_active" || previousStatus === "waiting") {
        this.fetchAndSyncMessages();
      }

      this.stopMessagePolling();

      // Show the "Talk to human" button again if returned to AI
      if (status.status === "ai_active") {
        this.checkAvailability();
      }
    }
  }

  /**
   * Check if we're in handoff state
   */
  private isInHandoffState(): boolean {
    return this.conversationStatus === "waiting" || this.conversationStatus === "agent_active";
  }

  /**
   * Start polling fallback for new messages
   */
  private startPolling(): void {
    if (this.messagePollingInterval) return;

    // Poll every 2 seconds for new messages
    this.messagePollingInterval = window.setInterval(async () => {
      if (!this.sessionId) return;

      try {
        const newMessages = await fetchNewMessages(
          this.options.apiUrl,
          this.sessionId,
          this.lastMessageTimestamp || undefined
        );

        if (newMessages.length > 0) {
          for (const msg of newMessages) {
            // Skip if we already have this message
            if (this.messages.some((m) => m.id === msg.id)) continue;

            // Determine role based on sender type
            let role: "user" | "assistant" = "assistant";
            if (msg.senderType === "customer") {
              role = "user";
            }

            const storedMsg: StoredMessage = {
              id: msg.id,
              content: msg.content,
              role,
              timestamp: new Date(msg.createdAt).getTime(),
              // Add agent name for agent messages
              ...(msg.senderType === "agent" && msg.senderName
                ? { agentName: msg.senderName }
                : {}),
            };

            this.messages.push(storedMsg);
            this.addMessageToDOM(storedMsg);
          }

          // Update last timestamp
          const lastMsg = newMessages[newMessages.length - 1];
          this.lastMessageTimestamp = lastMsg.createdAt;

          // Save to storage and scroll
          setStoredMessages(this.options.projectId, this.messages);
          this.scrollToBottom();
        }

        // Also check conversation status to see if we should stop polling
        const status = await getConversationStatus(
          this.options.apiUrl,
          this.sessionId
        );

        if (status) {
          this.conversationStatus = status.status;

          // If resolved or closed, stop polling and maybe show button again
          if (status.status === "resolved" || status.status === "closed" || status.status === "ai_active") {
            this.stopMessagePolling();

            // Re-check availability to show button if appropriate
            if (status.status === "ai_active") {
              this.checkAvailability();
            }
          }
        }
      } catch (error) {
        console.error("[Widget] Message polling error:", error);
      }
    }, 2000);

    if (process.env.NODE_ENV === "development") {
      console.log("[Widget] Started message polling (fallback)");
    }
  }

  /**
   * Stop polling/realtime for messages
   */
  private stopMessagePolling(): void {
    // Stop polling
    if (this.messagePollingInterval) {
      clearInterval(this.messagePollingInterval);
      this.messagePollingInterval = null;
    }

    // Disconnect realtime
    if (this.realtimeManager) {
      this.realtimeManager.unsubscribe();
      this.realtimeManager = null;
    }

    if (process.env.NODE_ENV === "development") {
      console.log("[Widget] Stopped message polling/realtime");
    }
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
