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
import {
  LeadCaptureForm,
  LeadCaptureFormData,
  LeadCaptureFormConfig,
} from "./lead-capture-form";
import {
  sendMessage,
  ChatApiError,
  submitLeadCaptureForm,
  getLeadCaptureStatus,
} from "../utils/api";
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
  getLeadCaptureState,
  setLeadCaptureState,
  StoredMessage,
  LeadCaptureLocalState,
} from "../utils/storage";
import { generateId } from "../utils/helpers";
import { detectHighIntent } from "../utils/high-intent-detector";
import { VoiceCallOverlay, type VoiceCallState } from "./voice-call-overlay";
import { VoicePermissionPrompt } from "./voice-permission-prompt";
import type { VoiceConfig } from "../widget";

/** Minimal Vapi SDK instance typing for dynamic imports */
interface VapiInstance {
  on(event: string, callback: (...args: unknown[]) => void): void;
  start(assistantId: string, overrides?: Record<string, unknown>): Promise<unknown>;
  stop(): void;
  setMuted(muted: boolean): void;
  isMuted(): boolean;
}
import {
  WidgetRealtimeManager,
  getRealtimeManager,
  cleanupRealtime,
  RealtimeMessage,
  RealtimeStatusChange,
} from "../utils/realtime";

export interface LeadRecoveryConfig {
  enabled: boolean;
  deferred_skip?: { enabled: boolean; reask_after_messages: number; max_deferred_asks: number };
  return_visit?: { enabled: boolean; max_visits_before_stop: number; welcome_back_message: string };
  high_intent_override?: { enabled: boolean; keywords: string[]; override_cooldowns: boolean };
  conversation_summary_hook?: { enabled: boolean; min_messages: number; prompt: string };
}

export interface ChatWindowOptions {
  projectId: string;
  apiUrl: string;
  greeting: string;
  title: string;
  primaryColor: string;
  onClose: () => void;
  leadCaptureConfig?: Record<string, unknown> | null;
  leadRecoveryConfig?: LeadRecoveryConfig | null;
  voiceConfig?: VoiceConfig | null;
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
  private leadCaptureForm: LeadCaptureForm | null = null;
  private isLeadCaptureActive = false;
  private leadCaptureLocalState: LeadCaptureLocalState | null = null;
  private firstUserMessage: string | null = null;
  private isFirstMessage = true;

  // V3 Recovery
  private highIntentDetected = false;
  private summaryHookShown = false;
  private totalUserMessages = 0;

  // Expand/collapse
  private isExpanded = false;

  // Voice
  private voiceOverlay: VoiceCallOverlay | null = null;
  private voicePermissionPrompt: VoicePermissionPrompt | null = null;
  private vapiInstance: unknown = null;
  private vapiModule: unknown = null;
  private isVoiceCallActive = false;

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
      voiceEnabled: !!options.voiceConfig?.enabled,
      onVoiceClick: () => this.initiateVoiceCall(),
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

    // Load lead capture local state
    this.leadCaptureLocalState = getLeadCaptureState(options.projectId);
    this.isFirstMessage = this.messages.length === 0;

    // Render initial messages
    this.renderMessages();

    // Setup keyboard handling
    this.setupKeyboardHandling();

    // Check lead capture status for returning users, then show form if needed
    this.initializeLeadCaptureState();

    // Check conversation status first (if we have a session)
    // This determines if we should show the human button
    this.initializeConversationState();

    // Set initial voice button state (disabled if lead capture pending)
    this.updateVoiceButtonState();
  }

  /**
   * Enter handoff mode in a single place so both button-triggered and
   * keyword-triggered flows keep widget state in sync.
   */
  private async enterHandoffMode(options?: {
    preferredStatus?: ConversationStatus;
    syncMessages?: boolean;
  }): Promise<boolean> {
    if (!this.sessionId) return false;

    let status = options?.preferredStatus;
    if (status !== "waiting" && status !== "agent_active") {
      const current = await getConversationStatus(this.options.apiUrl, this.sessionId);
      status = current?.status;
    }

    if (status !== "waiting" && status !== "agent_active") {
      return false;
    }

    this.conversationStatus = status;
    this.updateVoiceButtonState();
    this.humanButton?.hide();
    this.startMessagePolling();

    if (options?.syncMessages) {
      await this.fetchAndSyncMessages();
    }

    return true;
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
        this.updateVoiceButtonState();

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

        // Fetch feedback for this conversation and merge with messages
        await this.fetchAndMergeFeedback(convertedMessages);

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

  /**
   * Fetch feedback from API and merge into messages
   */
  private async fetchAndMergeFeedback(messages: StoredMessage[]): Promise<void> {
    if (!this.sessionId) return;

    try {
      const response = await fetch(
        `${this.options.apiUrl}/api/chat/feedback?conversationId=${this.sessionId}&visitorId=${this.visitorId}`
      );

      if (!response.ok) {
        return; // Silently fail - feedback is not critical
      }

      const data = await response.json();
      const feedbackList = data.feedback || [];

      // Create lookup maps for quick matching
      const feedbackByMessageId = new Map<string, string>();
      const feedbackByContent = new Map<string, string>();

      for (const fb of feedbackList) {
        if (fb.messageId) {
          feedbackByMessageId.set(fb.messageId, fb.rating);
        }
        if (fb.answerText) {
          feedbackByContent.set(fb.answerText, fb.rating);
        }
      }

      // Merge feedback into messages
      for (const msg of messages) {
        if (msg.role !== "assistant") continue;

        // Try to match by message ID first, then by content
        const rating = feedbackByMessageId.get(msg.id) || feedbackByContent.get(msg.content);
        if (rating) {
          msg.feedback = rating as "helpful" | "unhelpful";
        }
      }

      if (process.env.NODE_ENV === "development") {
        console.log("[Widget] Merged feedback:", feedbackList.length);
      }
    } catch (error) {
      // Silently fail - feedback restoration is not critical
      if (process.env.NODE_ENV === "development") {
        console.error("[Widget] Failed to fetch feedback:", error);
      }
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
        <div class="chatbot-header-actions">
          ${this.options.voiceConfig?.enabled ? `
          <button class="cb-voice-header-btn" aria-label="Start voice call" type="button" title="Voice call">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"></path>
            </svg>
          </button>
          ` : ""}
          <button class="cb-expand-btn" aria-label="Expand chat" type="button" title="Expand">
            <svg class="cb-expand-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <polyline points="15 3 21 3 21 9"></polyline>
              <polyline points="9 21 3 21 3 15"></polyline>
              <line x1="21" y1="3" x2="14" y2="10"></line>
              <line x1="3" y1="21" x2="10" y2="14"></line>
            </svg>
            <svg class="cb-collapse-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" style="display:none">
              <polyline points="4 14 10 14 10 20"></polyline>
              <polyline points="20 10 14 10 14 4"></polyline>
              <line x1="14" y1="10" x2="21" y2="3"></line>
              <line x1="3" y1="21" x2="10" y2="14"></line>
            </svg>
          </button>
          <button class="chatbot-close" aria-label="Close chat" type="button">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      </div>
      <div class="chatbot-messages" role="log" aria-live="polite" aria-label="Chat messages"></div>
      <div class="chatbot-input-container"></div>
    `;

    // Attach close handler
    const closeBtn = window.querySelector(".chatbot-close") as HTMLElement;
    closeBtn.addEventListener("click", () => {
      this.options.onClose();
    });

    // Attach expand/collapse handler
    const expandBtn = window.querySelector(".cb-expand-btn");
    if (expandBtn) {
      expandBtn.addEventListener("click", () => {
        this.toggleExpanded();
      });
    }

    // Attach voice header button handler
    const voiceHeaderBtn = window.querySelector(".cb-voice-header-btn");
    if (voiceHeaderBtn) {
      voiceHeaderBtn.addEventListener("click", () => {
        this.initiateVoiceCall();
      });
    }

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

    // Add greeting if no messages (suppress when lead capture form is pending)
    if (this.messages.length === 0) {
      const lcConfig = this.options.leadCaptureConfig;
      const formPending = lcConfig?.enabled && !this.leadCaptureLocalState?.hasCompletedForm;

      if (!formPending) {
        const greeting: StoredMessage = {
          id: "greeting",
          role: "assistant",
          content: this.options.greeting,
          timestamp: Date.now(),
        };
        this.addMessageToDOM(greeting);
      }
    } else {
      // Render stored messages
      this.messages.forEach((msg) => this.addMessageToDOM(msg));
    }

    // Re-insert lead capture form if it was active (its element uses chatbot-message
    // class so it gets removed by the querySelectorAll above)
    if (this.isLeadCaptureActive && this.leadCaptureForm) {
      this.messagesContainer.insertBefore(
        this.leadCaptureForm.element,
        this.typingIndicator.element
      );
    }

    this.scrollToBottom();
  }

  private addMessageToDOM(messageData: StoredMessage): void {
    const messageComponent = new Message({
      ...messageData,
      isError: messageData.isError,
      feedback: messageData.feedback,
      // Only add feedback callback for assistant messages
      onFeedback: messageData.role === "assistant" && !messageData.isError
        ? (messageId, rating) => this.handleFeedback(messageId, rating)
        : undefined,
    });

    // Insert before typing indicator
    this.messagesContainer.insertBefore(
      messageComponent.element,
      this.typingIndicator.element
    );
  }

  /**
   * Handle feedback submission for a message
   */
  private async handleFeedback(
    messageId: string,
    rating: "helpful" | "unhelpful"
  ): Promise<void> {
    // Find the message
    const messageIndex = this.messages.findIndex((m) => m.id === messageId);
    if (messageIndex === -1) return;

    const message = this.messages[messageIndex];

    // Find the preceding user message (the question that prompted this response)
    let questionText: string | null = null;
    for (let i = messageIndex - 1; i >= 0; i--) {
      if (this.messages[i].role === "user") {
        questionText = this.messages[i].content;
        break;
      }
    }

    // Update local message state
    message.feedback = rating;
    setStoredMessages(this.options.projectId, this.messages);

    // Submit feedback to API
    try {
      const response = await fetch(`${this.options.apiUrl}/api/chat/feedback`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messageId: messageId,
          conversationId: this.sessionId,
          projectId: this.options.projectId,
          rating,
          visitorId: this.visitorId,
          questionText,
          answerText: message.content,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        // Don't revert on duplicate - user already submitted
        if (error.error?.code !== "DUPLICATE_FEEDBACK") {
          console.error("[Widget] Failed to submit feedback:", error);
        }
      } else {
        if (process.env.NODE_ENV === "development") {
          console.log("[Widget] Feedback submitted:", { messageId, rating });
        }
      }
    } catch (error) {
      console.error("[Widget] Failed to submit feedback:", error);
      // Keep the local state even if API fails - UX is better
    }
  }

  private async handleSend(content: string): Promise<void> {
    // Stop typing indicator when sending
    this.stopTypingIndicator();

    // Record activity for presence tracking
    this.presenceManager.recordActivity();

    // Track total user messages
    this.totalUserMessages++;

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

    // Show typing indicator only for AI responses (not in handoff mode)
    if (!this.isInHandoffState()) {
      this.typingIndicator.show();
      this.input.setLoading(true);
      this.scrollToBottom();
    }

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

      const shouldEnterHandoffMode =
        response.handoff?.triggered === true ||
        (!!response.handoff?.reason &&
          !response.response?.trim() &&
          (response.handoff.reason === "in_queue" ||
            response.handoff.reason === "agent_handling"));

      if (shouldEnterHandoffMode && this.sessionId && !this.isInHandoffState()) {
        const preferredStatus = response.handoff?.reason === "agent_handling"
          ? "agent_active"
          : "waiting";
        await this.enterHandoffMode({ preferredStatus, syncMessages: true });
      }

      // Track first message (used for lead metadata)
      if (this.isFirstMessage) {
        this.firstUserMessage = content;
        this.isFirstMessage = false;
      }

      // V3 Recovery: Summary hook (after min messages, offer to email summary)
      if (this.shouldShowSummaryHook()) {
        setTimeout(() => this.showSummaryHook(), 1200);
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

  // ─── Lead Capture V2 ──────────────────────────────────────────────────────

  /**
   * Initialize lead capture state for returning users
   */
  private async initializeLeadCaptureState(): Promise<void> {
    const lcConfig = this.options.leadCaptureConfig;
    if (!lcConfig?.enabled) return;

    // Check local cache first
    if (this.leadCaptureLocalState?.hasCompletedForm) {
      if (process.env.NODE_ENV === "development") {
        console.log("[Widget] Lead capture: returning user (cached)");
      }
      return; // Already completed form, skip
    }

    // Check server for returning user status
    try {
      const status = await getLeadCaptureStatus(
        this.options.apiUrl,
        this.options.projectId,
        this.visitorId
      );

      if (status.hasCompletedForm) {
        // Cache the result locally
        setLeadCaptureState(this.options.projectId, {
          hasCompletedForm: true,
          hasCompletedQualifying: status.hasCompletedQualifying,
        });
        this.leadCaptureLocalState = {
          hasCompletedForm: true,
          hasCompletedQualifying: status.hasCompletedQualifying,
        };

        // Enable voice buttons now that form is confirmed complete
        this.updateVoiceButtonState();

        if (process.env.NODE_ENV === "development") {
          console.log("[Widget] Lead capture: returning user (server)");
        }
        return;
      }

      // V3 Recovery: Return-visit welcome-back for non-captured visitors
      if (this.shouldShowReturnVisitMessage()) {
        setTimeout(() => this.showReturnVisitMessage(), 800);
      }
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("[Widget] Lead capture status check failed:", error);
      }
    }

    // Show lead capture form immediately if enabled and not completed
    if (this.shouldShowLeadCaptureForm()) {
      setTimeout(() => this.showLeadCaptureForm(), 400);
    }
  }

  // ─── V3 Recovery Methods ─────────────────────────────────────────────────────

  /**
   * Check if we should show the summary hook
   */
  private shouldShowSummaryHook(): boolean {
    const rc = this.options.leadRecoveryConfig;
    if (!rc?.enabled) return false;
    if (!rc.conversation_summary_hook?.enabled) return false;
    if (this.summaryHookShown) return false;
    if (this.leadCaptureLocalState?.hasCompletedForm) return false;
    if (this.isLeadCaptureActive) return false;
    if (this.totalUserMessages < (rc.conversation_summary_hook.min_messages || 3)) return false;
    return true;
  }

  /**
   * Show the summary hook — offer to email a conversation summary
   */
  private showSummaryHook(): void {
    const rc = this.options.leadRecoveryConfig;
    const prompt = rc?.conversation_summary_hook?.prompt || "Want me to email you a summary of this conversation?";

    this.summaryHookShown = true;

    const hookMsg: StoredMessage = {
      id: generateId(),
      content: prompt,
      role: "assistant",
      timestamp: Date.now(),
    };
    this.messages.push(hookMsg);
    this.addMessageToDOM(hookMsg);
    setStoredMessages(this.options.projectId, this.messages);
    this.scrollToBottom();

    if (process.env.NODE_ENV === "development") {
      console.log("[Widget] Summary hook shown");
    }
  }

  /**
   * Check if we should show a return-visit welcome-back message.
   * Called during initializeLeadCaptureState for returning visitors.
   */
  private shouldShowReturnVisitMessage(): boolean {
    const rc = this.options.leadRecoveryConfig;
    if (!rc?.enabled || !rc.return_visit?.enabled) return false;
    if (this.leadCaptureLocalState?.hasCompletedForm) return false;

    return true;
  }

  /**
   * Show return-visit welcome-back message
   */
  private showReturnVisitMessage(): void {
    const rc = this.options.leadRecoveryConfig;
    const message = rc?.return_visit?.welcome_back_message || "Welcome back! Want me to email you a summary?";

    const welcomeMsg: StoredMessage = {
      id: generateId(),
      content: message,
      role: "assistant",
      timestamp: Date.now(),
    };
    this.messages.push(welcomeMsg);
    this.addMessageToDOM(welcomeMsg);
    setStoredMessages(this.options.projectId, this.messages);
    this.scrollToBottom();

    if (process.env.NODE_ENV === "development") {
      console.log("[Widget] Return visit welcome-back message shown");
    }
  }

  /**
   * Check if we should show the lead capture form
   */
  private shouldShowLeadCaptureForm(): boolean {
    const lcConfig = this.options.leadCaptureConfig;
    if (!lcConfig?.enabled) return false;
    if (this.isLeadCaptureActive) return false;
    if (this.leadCaptureLocalState?.hasCompletedForm) return false;

    return true;
  }

  /**
   * Show the lead capture form inline in the messages area
   */
  private showLeadCaptureForm(): void {
    const lcConfig = this.options.leadCaptureConfig;
    if (!lcConfig) return;

    this.isLeadCaptureActive = true;

    // Build form config
    const formConfig: LeadCaptureFormConfig = {
      formFields: lcConfig.formFields as LeadCaptureFormConfig["formFields"],
    };

    this.leadCaptureForm = new LeadCaptureForm({
      config: formConfig,
      primaryColor: this.options.primaryColor,
      onSubmit: (data) => this.handleLeadCaptureSubmit(data),
    });

    // Insert form into messages container (before typing indicator)
    this.messagesContainer.insertBefore(
      this.leadCaptureForm.element,
      this.typingIndicator.element
    );

    // Disable input while form is active
    this.input.setDisabled(true, "Please complete the form above");

    this.scrollToBottom();

    // Focus the email input
    this.leadCaptureForm.focusEmail();
  }

  /**
   * Handle lead capture form submission
   */
  private async handleLeadCaptureSubmit(formData: LeadCaptureFormData): Promise<void> {
    if (!this.leadCaptureForm) return;

    try {
      const result = await submitLeadCaptureForm(
        this.options.apiUrl,
        this.options.projectId,
        this.visitorId,
        this.sessionId,
        formData,
        this.firstUserMessage || ""
      );

      if (result.success) {
        // Show success state on form
        this.leadCaptureForm.showSuccess(formData.email);

        // Cache locally
        setLeadCaptureState(this.options.projectId, {
          hasCompletedForm: true,
          hasCompletedQualifying: result.nextAction === "none",
          firstMessage: this.firstUserMessage || "",
        });
        this.leadCaptureLocalState = {
          hasCompletedForm: true,
          hasCompletedQualifying: result.nextAction === "none",
        };

        // Re-enable input
        this.isLeadCaptureActive = false;
        this.input.setDisabled(false);

        // Enable voice buttons now that lead form is complete
        this.updateVoiceButtonState();

        // Re-check handoff availability to show "Talk to Human" button now that form is complete
        this.checkAvailability();

        // If there's a qualifying question, show it as an assistant message
        if (result.nextAction === "qualifying_question" && result.qualifyingQuestion) {
          const qMsg: StoredMessage = {
            id: generateId(),
            content: result.qualifyingQuestion,
            role: "assistant",
            timestamp: Date.now(),
          };
          this.messages.push(qMsg);
          this.addMessageToDOM(qMsg);
          setStoredMessages(this.options.projectId, this.messages);
        } else if (result.nextAction === "none") {
          // No qualifying questions — show greeting now to start normal chat
          setTimeout(() => {
            const greetingMsg: StoredMessage = {
              id: generateId(),
              content: this.options.greeting,
              role: "assistant",
              timestamp: Date.now(),
            };
            this.messages.push(greetingMsg);
            this.addMessageToDOM(greetingMsg);
            setStoredMessages(this.options.projectId, this.messages);
            this.scrollToBottom();
          }, 500);
        }

        this.scrollToBottom();
        this.input.focus();
      } else {
        this.leadCaptureForm.setLoading(false);
      }
    } catch (error) {
      console.error("[Widget] Lead form submit error:", error);
      this.leadCaptureForm.setLoading(false);
    }
  }

  // ─── Voice Call Methods ────────────────────────────────────────────────────

  /**
   * Initiate voice call flow:
   * Voice buttons are disabled until lead form is completed (if lead capture enabled),
   * so by the time this runs, we can go straight to the permission prompt.
   */
  private initiateVoiceCall(): void {
    if (this.isVoiceCallActive) return;
    if (!this.options.voiceConfig?.enabled) return;
    if (this.conversationStatus === "waiting" || this.conversationStatus === "agent_active") return;
    this.showVoicePermissionPrompt();
  }

  /**
   * Update disabled/enabled state of voice call buttons (header + input).
   * Buttons are disabled when lead capture is enabled but form hasn't been submitted.
   */
  private updateVoiceButtonState(): void {
    if (!this.options.voiceConfig?.enabled) return;

    const lcConfig = this.options.leadCaptureConfig;
    const leadCaptureEnabled = lcConfig?.enabled === true;
    const formCompleted = this.leadCaptureLocalState?.hasCompletedForm === true;
    const isInHandoff = this.conversationStatus === "waiting" ||
                         this.conversationStatus === "agent_active";
    const disabled = (leadCaptureEnabled && !formCompleted) || isInHandoff;

    const tooltip = isInHandoff
      ? "Voice calls unavailable during agent conversation"
      : (leadCaptureEnabled && !formCompleted)
        ? "Complete the form above to start a voice call"
        : "Voice call";

    // Header voice button
    const headerBtn = this.element.querySelector(".cb-voice-header-btn") as HTMLButtonElement | null;
    if (headerBtn) {
      headerBtn.disabled = disabled;
      headerBtn.classList.toggle("cb-voice-btn-disabled", disabled);
      headerBtn.title = tooltip;
    }

    // Input voice button
    const inputBtn = this.element.querySelector(".cb-voice-input-btn") as HTMLButtonElement | null;
    if (inputBtn) {
      inputBtn.disabled = disabled;
      inputBtn.classList.toggle("cb-voice-btn-disabled", disabled);
      inputBtn.title = tooltip;
    }
  }

  /**
   * Show microphone permission prompt (skips if already granted)
   */
  private async showVoicePermissionPrompt(): Promise<void> {
    // Check if microphone permission is already granted
    try {
      const result = await navigator.permissions.query({ name: "microphone" as PermissionName });
      if (result.state === "granted") {
        // Already have permission — skip the prompt, start the call directly
        this.startVoiceCall();
        return;
      }
    } catch {
      // permissions.query not supported (e.g. Firefox) — fall through to show prompt
    }

    // Remove existing prompt if any
    this.voicePermissionPrompt?.destroy();

    this.voicePermissionPrompt = new VoicePermissionPrompt({
      primaryColor: this.options.primaryColor,
      onAllow: () => {
        this.voicePermissionPrompt?.destroy();
        this.voicePermissionPrompt = null;
        this.startVoiceCall();
      },
      onCancel: () => {
        this.voicePermissionPrompt?.destroy();
        this.voicePermissionPrompt = null;
      },
    });

    // Show over the messages area
    this.messagesContainer.insertBefore(
      this.voicePermissionPrompt.element,
      this.typingIndicator.element
    );
    this.scrollToBottom();
  }

  /**
   * Load the Vapi SDK dynamically (only when needed)
   */
  private async loadVapiSDK(): Promise<Record<string, unknown>> {
    if (!this.vapiModule) {
      this.vapiModule = await import("@vapi-ai/web");
    }
    return this.vapiModule as Record<string, unknown>;
  }

  /**
   * Fetch fresh voice config from the API (includes dynamic system prompt)
   */
  private async fetchVoiceCallConfig(): Promise<{
    vapiPublicKey: string;
    assistantId: string;
    greeting: string;
    assistantOverrides: Record<string, unknown>;
  } | null> {
    try {
      const response = await fetch(
        `${this.options.apiUrl}/api/vapi/config/${this.options.projectId}?visitorId=${encodeURIComponent(this.visitorId)}`
      );
      if (!response.ok) return null;
      const data = await response.json();
      if (!data.voiceEnabled || !data.vapiPublicKey || !data.assistantId) return null;
      return data;
    } catch (error) {
      console.error("[Widget] Failed to fetch voice call config:", error);
      return null;
    }
  }

  /**
   * Start the actual Vapi voice call
   */
  private async startVoiceCall(): Promise<void> {
    const voiceConfig = this.options.voiceConfig;
    if (!voiceConfig?.vapiPublicKey || !voiceConfig?.assistantId) {
      console.error("[Widget] Voice config missing vapiPublicKey or assistantId");
      return;
    }

    // Ensure a conversation exists before starting voice call (P5)
    if (!this.sessionId) {
      try {
        const resp = await fetch(`${this.options.apiUrl}/api/chat/ensure-conversation`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId: this.options.projectId, visitorId: this.visitorId }),
        });
        const data = await resp.json();
        if (data.conversationId) {
          this.sessionId = data.conversationId;
          setSessionId(this.options.projectId, data.conversationId);
        }
      } catch (error) {
        console.error("[Widget] Failed to ensure conversation before voice call:", error);
      }
    }

    this.isVoiceCallActive = true;

    // Create and show the voice overlay
    this.voiceOverlay?.destroy();
    this.voiceOverlay = new VoiceCallOverlay({
      primaryColor: this.options.primaryColor,
      onEndCall: () => this.endVoiceCall(),
      onMuteToggle: () => this.toggleVoiceMute(),
      onBackToChat: () => this.dismissVoiceOverlay(),
    });

    // Insert overlay into the chat window (covers messages + input)
    this.element.appendChild(this.voiceOverlay.element);
    this.voiceOverlay.show();

    // Disable text input during voice call
    this.input.setDisabled(true, "Voice call in progress");

    try {
      // Fetch fresh voice config (includes dynamic system prompt with personality + qualifying Qs)
      const freshConfig = await this.fetchVoiceCallConfig();

      // Dynamically load Vapi SDK
      const VapiModule = await this.loadVapiSDK();
      // Handle CJS/ESM interop: module.default could be the class itself or { default: class }
      const VapiClass = typeof VapiModule.default === "function"
        ? VapiModule.default
        : (VapiModule.default as Record<string, unknown>)?.default || VapiModule;
      const vapi = new (VapiClass as new (key: string) => VapiInstance)(voiceConfig.vapiPublicKey);
      this.vapiInstance = vapi;

      // Wire up Vapi events (call methods on vapi directly to preserve `this` context)
      vapi.on("call-start", () => {
        this.voiceOverlay?.setState("active-listening");
      });

      vapi.on("call-end", () => {
        this.voiceOverlay?.setState("ended");
        this.isVoiceCallActive = false;

        // Re-enable text input
        this.input.setDisabled(false);

        // Add a system message to the chat
        const duration = this.voiceOverlay?.getDuration() || 0;
        const durationStr = `${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, "0")}`;
        const summaryMsg: StoredMessage = {
          id: generateId(),
          content: `Voice call ended (${durationStr}). You can continue chatting below.`,
          role: "assistant",
          timestamp: Date.now(),
        };
        this.messages.push(summaryMsg);
        this.addMessageToDOM(summaryMsg);
        setStoredMessages(this.options.projectId, this.messages);

        // Refresh lead capture status after voice call (P6)
        // Give server time to extract qualifying answers from transcript
        setTimeout(async () => {
          try {
            const status = await getLeadCaptureStatus(
              this.options.apiUrl,
              this.options.projectId,
              this.visitorId
            );
            if (status.hasCompletedQualifying) {
              this.leadCaptureLocalState = { hasCompletedForm: true, hasCompletedQualifying: true };
              setLeadCaptureState(this.options.projectId, this.leadCaptureLocalState);
            }
          } catch (err) {
            console.error("[Widget] Failed to refresh lead capture status after voice call:", err);
          }
        }, 5000);
      });

      vapi.on("speech-start", () => {
        this.voiceOverlay?.setState("active-speaking");
      });

      vapi.on("speech-end", () => {
        this.voiceOverlay?.setState("active-listening");
      });

      vapi.on("message", (msg: unknown) => {
        const message = msg as Record<string, unknown>;
        if (message.type === "transcript" && message.transcriptType === "final") {
          const role = message.role === "user" ? "user" : "assistant";
          const text = message.transcript as string;

          // Show in voice overlay transcript
          this.voiceOverlay?.addTranscript(role as "user" | "assistant", text);

          // Also add to main chat messages so they appear in conversation history
          if (text?.trim()) {
            const chatMsg: StoredMessage = {
              id: generateId(),
              content: text,
              role: role as "user" | "assistant",
              timestamp: Date.now(),
            };
            this.messages.push(chatMsg);
            this.addMessageToDOM(chatMsg);
            setStoredMessages(this.options.projectId, this.messages);
          }
        }
      });

      vapi.on("volume-level", (level: unknown) => {
        this.voiceOverlay?.setAmplitude((level as number) / 100);
      });

      vapi.on("error", (err: unknown) => {
        console.error("[Widget] Vapi error:", err);
        this.voiceOverlay?.setState("error");
        this.isVoiceCallActive = false;
      });

      // Build assistant overrides: use fresh config from API (includes dynamic system prompt)
      // or fall back to basic metadata
      const overrides = freshConfig?.assistantOverrides
        ? {
            ...freshConfig.assistantOverrides,
            // Always inject visitorId and conversationId from the widget
            variableValues: {
              ...(freshConfig.assistantOverrides.variableValues as Record<string, string> || {}),
              visitorId: this.visitorId,
              conversationId: this.sessionId || "",
            },
          }
        : {
            variableValues: {
              companyName: document.title || "Support",
              projectId: this.options.projectId,
              visitorId: this.visitorId,
              conversationId: this.sessionId || "",
              greeting: voiceConfig.greeting || "Hi! How can I help you today?",
            },
          };

      // Start the call with dynamic assistant overrides
      await vapi.start(voiceConfig.assistantId, overrides);
    } catch (error) {
      console.error("[Widget] Failed to start voice call:", error);
      this.voiceOverlay?.setState("error");
      this.isVoiceCallActive = false;
    }
  }

  /**
   * End the current voice call
   */
  private endVoiceCall(): void {
    if (this.vapiInstance) {
      (this.vapiInstance as VapiInstance).stop();
    }
  }

  /**
   * Toggle mute on the voice call
   */
  private toggleVoiceMute(): void {
    if (this.vapiInstance) {
      const vapi = this.vapiInstance as VapiInstance;
      const muted = vapi.isMuted();
      vapi.setMuted(!muted);
    }
  }

  /**
   * Dismiss the voice overlay and return to chat
   */
  private dismissVoiceOverlay(): void {
    if (this.isVoiceCallActive) {
      this.endVoiceCall();
    }
    this.voiceOverlay?.destroy();
    this.voiceOverlay = null;
    this.isVoiceCallActive = false;
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
   * Button is gated behind lead capture form completion when enabled
   */
  private async checkAvailability(): Promise<void> {
    try {
      this.handoffAvailability = await checkHandoffAvailability(
        this.options.apiUrl,
        this.options.projectId
      );

      // Gate: Only show button if form completed OR lead capture disabled
      const lcConfig = this.options.leadCaptureConfig;
      const leadCaptureEnabled = lcConfig?.enabled === true;
      const formCompleted = this.leadCaptureLocalState?.hasCompletedForm === true;
      const shouldShowButton = this.handoffAvailability.showButton &&
        (!leadCaptureEnabled || formCompleted);

      // Update human button visibility
      if (shouldShowButton && this.humanButton) {
        this.humanButton.setText(this.handoffAvailability.buttonText || "Talk to a human");
        this.humanButton.show();
      } else if (this.humanButton) {
        this.humanButton.hide();
      }

      // Log for debugging
      if (process.env.NODE_ENV === "development") {
        console.log("[Widget] Handoff availability:", this.handoffAvailability, {
          leadCaptureEnabled,
          formCompleted,
          shouldShowButton
        });
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
      if (this.sessionId) {
        const alreadyInHandoff = await this.enterHandoffMode({ syncMessages: true });
        if (alreadyInHandoff) {
          this.scrollToBottom();
          return;
        }
      }

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

        console.log("[Widget] Chat response for handoff request:", {
          hasHandoff: !!response.handoff,
          handoffTriggered: response.handoff?.triggered,
          sessionId: response.sessionId,
        });

        // Check if handoff was already triggered by the chat engine
        if (response.handoff?.triggered) {
          // Handoff was triggered automatically, show AI response if present
          if (response.response?.trim()) {
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

          await this.enterHandoffMode({ syncMessages: true });
          this.scrollToBottom();
          return;
        }
      }

      // Ensure we have a valid session ID before triggering handoff
      if (!this.sessionId) {
        console.error("[Widget] No session ID available for handoff");
        throw new Error("No session ID available");
      }

      // Now trigger handoff
      const result = await triggerHandoff(
        this.options.apiUrl,
        this.sessionId,
        { reason: "button_click" }
      );

      // Check if we should show the offline form
      if (result.showOfflineForm) {
        this.showOfflineForm();
        return;
      }

      await this.enterHandoffMode({
        preferredStatus:
          result.status === "waiting" || result.status === "agent_active"
            ? result.status
            : undefined,
        syncMessages: true,
      });
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
    const config = ((window as unknown) as Record<string, unknown>).__WIDGET_CONFIG__ as Record<string, string> | undefined;
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
    this.updateVoiceButtonState();

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
          this.updateVoiceButtonState();

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
   * Toggle expanded/collapsed state
   */
  private toggleExpanded(): void {
    this.isExpanded = !this.isExpanded;
    this.element.classList.toggle("cb-expanded", this.isExpanded);

    // Toggle icon visibility
    const expandIcon = this.element.querySelector(".cb-expand-icon") as HTMLElement;
    const collapseIcon = this.element.querySelector(".cb-collapse-icon") as HTMLElement;
    const expandBtn = this.element.querySelector(".cb-expand-btn") as HTMLElement;

    if (expandIcon && collapseIcon && expandBtn) {
      expandIcon.style.display = this.isExpanded ? "none" : "block";
      collapseIcon.style.display = this.isExpanded ? "block" : "none";
      expandBtn.setAttribute("aria-label", this.isExpanded ? "Collapse chat" : "Expand chat");
      expandBtn.title = this.isExpanded ? "Collapse" : "Expand";
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
