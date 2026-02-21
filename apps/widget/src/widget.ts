/**
 * Chatbot Widget - Main Entry Point
 *
 * A lightweight, embeddable chat widget that loads via a single script tag.
 * Uses Shadow DOM for style isolation and works on any website.
 *
 * Usage:
 * <script
 *   src="https://cdn.yoursite.com/widget.js"
 *   data-project-id="proj_abc123"
 *   async
 * ></script>
 */

import { ChatWindow, type LeadRecoveryConfig } from "./components/chat-window";
import { Bubble } from "./components/bubble";
import { TeaserMessage } from "./components/teaser-message";
import { ExitOverlay } from "./components/exit-overlay";
import { submitInlineEmail } from "./utils/api";
import { getVisitorId, getLeadCaptureState, setLeadCaptureState } from "./utils/storage";
import {
  EngagementTriggerService,
  type ProactiveEngagementConfig,
  type TriggerAction,
} from "./utils/engagement-triggers";
import { PulseManager } from "./utils/pulse-manager";

// CSS is injected at build time
declare const __WIDGET_CSS__: string;

// Prevent TypeScript from complaining about window extension
declare global {
  interface Window {
    __CHATBOT_WIDGET_LOADED__?: boolean;
    ChatbotWidget?: typeof ChatbotWidget;
  }
}

/**
 * Voice configuration from API
 */
export interface VoiceConfig {
  enabled: boolean;
  vapiPublicKey?: string;
  assistantId?: string;
  greeting?: string;
}

/**
 * Widget configuration options
 */
export interface WidgetConfig {
  projectId: string;
  apiUrl?: string;
  position?: "bottom-right" | "bottom-left";
  primaryColor?: string;
  greeting?: string;
  title?: string;
}

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: Omit<Required<WidgetConfig>, "projectId"> = {
  apiUrl: "https://api.frontface.app",
  position: "bottom-right",
  primaryColor: "#0a0a0a",
  greeting: "Hi! How can I help you today?",
  title: "Chat with us",
};

/**
 * Main widget class
 */
class ChatbotWidget {
  private config!: Required<WidgetConfig>;
  private explicitPrimaryColor: boolean = false; // true if set via script attribute
  private container: HTMLElement | null = null;
  private shadowRoot: ShadowRoot | null = null;
  private bubble: Bubble | null = null;
  private chatWindow: ChatWindow | null = null;
  private isOpen = false;
  private leadCaptureConfig: Record<string, unknown> | null = null;
  private proactiveConfig: ProactiveEngagementConfig | null = null;
  private triggerService: EngagementTriggerService | null = null;
  private teaserMessage: TeaserMessage | null = null;
  private exitOverlay: ExitOverlay | null = null;
  private leadRecoveryConfig: LeadRecoveryConfig | null = null;
  private voiceConfig: VoiceConfig | null = null;
  private pulseManager: PulseManager | null = null;
  private greetingIntro: string = "";

  constructor(config: WidgetConfig) {
    // Validate required config
    if (!config.projectId) {
      console.error("[Chatbot Widget] Missing required projectId");
      return;
    }

    // Merge with defaults
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
    };

    // Track if caller explicitly provided a primary color (script attribute)
    // so fetchConfig won't override it with the server default
    this.explicitPrimaryColor = !!config.primaryColor;

    // Initialize when DOM is ready
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => this.init());
    } else {
      this.init();
    }
  }

  /**
   * Initialize the widget
   */
  private async init(): Promise<void> {
    // Prevent double initialization
    if (this.container) {
      console.warn("[Chatbot Widget] Widget already initialized");
      return;
    }

    // Fetch config from API and check if widget is enabled
    const isEnabled = await this.fetchConfig();
    if (!isEnabled) {
      if (process.env.NODE_ENV === "development") {
        console.log("[Chatbot Widget] Widget is disabled for this project");
      }
      return;
    }

    // Create container with Shadow DOM for style isolation
    this.container = document.createElement("div");
    this.container.id = "chatbot-widget-container";
    this.shadowRoot = this.container.attachShadow({ mode: "closed" });

    // Inject styles
    const style = document.createElement("style");
    style.textContent = __WIDGET_CSS__;
    this.shadowRoot.appendChild(style);

    // Set primary color as CSS variable so animations/focus rings pick it up
    this.container.style.setProperty("--widget-primary", this.config.primaryColor);

    // Create widget wrapper
    const wrapper = document.createElement("div");
    wrapper.className = `chatbot-widget ${this.config.position}`;
    this.shadowRoot.appendChild(wrapper);

    // Create bubble
    this.bubble = new Bubble({
      onClick: () => this.toggle(),
      primaryColor: this.config.primaryColor,
    });
    wrapper.appendChild(this.bubble.element);

    // Create chat window
    this.chatWindow = new ChatWindow({
      projectId: this.config.projectId,
      apiUrl: this.config.apiUrl,
      greeting: this.config.greeting,
      greetingIntro: this.greetingIntro || undefined,
      title: this.config.title,
      primaryColor: this.config.primaryColor,
      onClose: () => this.close(),
      leadCaptureConfig: this.leadCaptureConfig,
      leadRecoveryConfig: this.leadRecoveryConfig,
      voiceConfig: this.voiceConfig,
    });
    wrapper.appendChild(this.chatWindow.element);

    // Add to document
    document.body.appendChild(this.container);

    // Initialize proactive engagement if configured
    if (this.proactiveConfig?.enabled) {
      this.initProactiveEngagement(wrapper);
    }

    // Initialize exit overlay for recovery (if exit_intent_overlay enabled)
    if (this.leadRecoveryConfig?.enabled && this.leadRecoveryConfig.exit_intent_overlay?.enabled) {
      this.initExitOverlay(wrapper);
    }

    // Initialize Pulse micro-surveys
    this.initPulse(wrapper);

    // Log initialization
    if (process.env.NODE_ENV === "development") {
      console.log("[Chatbot Widget] Initialized", {
        projectId: this.config.projectId,
        apiUrl: this.config.apiUrl,
        realtimeEnabled: !!(window as Record<string, unknown>).__WIDGET_CONFIG__,
        proactiveEnabled: !!this.proactiveConfig?.enabled,
      });
    }
  }

  /**
   * Fetch config from API, check if widget is enabled, and store realtime config
   * Returns true if widget is enabled, false if disabled
   */
  private async fetchConfig(): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.config.apiUrl}/api/embed/config/${this.config.projectId}`
      );

      if (!response.ok) {
        console.warn("[Chatbot Widget] Failed to fetch config");
        // On error, default to enabled (fail-open)
        return true;
      }

      const data = await response.json();

      // Check if widget is enabled (default to true if not specified)
      if (data.enabled === false) {
        return false;
      }

      // Store lead capture config
      if (data.leadCapture?.enabled) {
        this.leadCaptureConfig = data.leadCapture;
      }

      // Store proactive engagement config
      if (data.proactiveEngagement?.enabled) {
        this.proactiveConfig = data.proactiveEngagement as ProactiveEngagementConfig;
      }

      // Store lead recovery config
      if (data.leadRecovery?.enabled) {
        this.leadRecoveryConfig = data.leadRecovery as LeadRecoveryConfig;
      }

      // Store voice config
      if (data.voice?.enabled) {
        this.voiceConfig = data.voice as VoiceConfig;
      }

      // Apply server config — overrides script-tag defaults with project settings
      // Exception: explicit script-tag attributes (e.g. data-primary-color) take precedence
      if (data.config) {
        if (data.config.greeting) this.config.greeting = data.config.greeting;
        if (data.config.greetingIntro) this.greetingIntro = data.config.greetingIntro;
        if (data.config.primaryColor && !this.explicitPrimaryColor) this.config.primaryColor = data.config.primaryColor;
        if (data.config.title) this.config.title = data.config.title;
        if (data.config.position) this.config.position = data.config.position;
      }

      // Store realtime config for realtime.ts to use
      if (data.realtime?.supabaseUrl && data.realtime?.supabaseAnonKey) {
        (window as Record<string, unknown>).__WIDGET_CONFIG__ = {
          supabaseUrl: data.realtime.supabaseUrl,
          supabaseAnonKey: data.realtime.supabaseAnonKey,
        };

        if (process.env.NODE_ENV === "development") {
          console.log("[Chatbot Widget] Config loaded:", data.realtime.supabaseUrl);
        }
      }

      return true;
    } catch (error) {
      console.warn("[Chatbot Widget] Failed to fetch config:", error);
      // On error, default to enabled (fail-open)
      return true;
    }
  }

  /**
   * Toggle the chat window
   */
  toggle(): void {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  /**
   * Open the chat window
   */
  open(): void {
    if (this.isOpen) return;

    this.isOpen = true;
    this.chatWindow?.show();
    this.bubble?.setActive(true);

    // Proactive engagement: chat opened, dismiss triggers
    this.teaserMessage?.hide();
    this.bubble?.hideBadge();
    this.triggerService?.setChatOpened();
    this.pulseManager?.onChatOpened();
  }

  /**
   * Close the chat window
   */
  close(): void {
    if (!this.isOpen) return;

    this.isOpen = false;
    this.chatWindow?.hide();
    this.bubble?.setActive(false);

    // Focus bubble after closing for accessibility
    this.bubble?.focus();
  }

  /**
   * Check if chat is open
   */
  isOpened(): boolean {
    return this.isOpen;
  }

  /**
   * Update configuration dynamically
   */
  updateConfig(newConfig: Partial<WidgetConfig>): void {
    if (newConfig.primaryColor) {
      this.config.primaryColor = newConfig.primaryColor;
      this.container?.style.setProperty("--widget-primary", newConfig.primaryColor);
      this.bubble?.setColor(newConfig.primaryColor);
      this.chatWindow?.setColor(newConfig.primaryColor);
    }

    if (newConfig.title) {
      this.config.title = newConfig.title;
      this.chatWindow?.setTitle(newConfig.title);
    }
  }

  /**
   * Clear chat history
   */
  clearHistory(): void {
    this.chatWindow?.clearHistory();
  }

  /**
   * Destroy the widget
   */
  /**
   * Initialize proactive engagement: teaser, badge, and trigger service
   */
  private initProactiveEngagement(wrapper: HTMLDivElement): void {
    if (!this.proactiveConfig) return;

    // Create teaser message component
    if (this.proactiveConfig.teaser.enabled) {
      this.teaserMessage = new TeaserMessage({
        message: this.proactiveConfig.teaser.message,
        primaryColor: this.config.primaryColor,
        onTeaserClick: () => this.open(),
        onDismiss: () => {
          // Teaser dismissed by user, but don't stop other triggers
          if (process.env.NODE_ENV === "development") {
            console.log("[Chatbot Widget] Teaser dismissed");
          }
        },
      });
      wrapper.appendChild(this.teaserMessage.element);
    }

    // Create trigger service
    this.triggerService = new EngagementTriggerService({
      config: this.proactiveConfig,
      projectId: this.config.projectId,
      onTrigger: (action: TriggerAction) =>
        this.handleEngagementTrigger(action),
    });

    // Start monitoring triggers
    this.triggerService.start();
  }

  /**
   * Handle a proactive engagement trigger action
   */
  private handleEngagementTrigger(action: TriggerAction): void {
    if (this.isOpen) return; // Already open, ignore triggers

    if (process.env.NODE_ENV === "development") {
      console.log("[Chatbot Widget] Trigger fired:", action.source, action.type);
    }

    switch (action.type) {
      case "teaser":
        this.teaserMessage?.show();
        if (this.proactiveConfig?.badge.enabled) {
          this.bubble?.showBadge();
        }
        break;

      case "badge":
        this.bubble?.showBadge();
        break;

      case "auto_open":
        this.open();
        break;

      case "overlay":
        // V3 Recovery: show exit overlay if configured, otherwise fall back to teaser
        if (this.exitOverlay && !this.isEmailCaptured()) {
          this.exitOverlay.show();
        } else {
          this.teaserMessage?.show();
          if (this.proactiveConfig?.badge.enabled) {
            this.bubble?.showBadge();
          }
        }
        break;
    }
  }

  /**
   * Initialize exit overlay component for lead recovery
   */
  private initExitOverlay(wrapper: HTMLDivElement): void {
    const overlayConfig = this.leadRecoveryConfig?.exit_intent_overlay;
    if (!overlayConfig?.enabled) return;

    this.exitOverlay = new ExitOverlay({
      headline: overlayConfig.headline || "Before you go...",
      subtext: overlayConfig.subtext || "Drop your email and we'll follow up",
      primaryColor: this.config.primaryColor,
      onSubmit: (email) => this.handleExitOverlayEmail(email),
      onDismiss: () => {
        if (process.env.NODE_ENV === "development") {
          console.log("[Chatbot Widget] Exit overlay dismissed");
        }
      },
    });
    wrapper.appendChild(this.exitOverlay.element);
  }

  /**
   * Handle email submitted via exit overlay
   */
  private async handleExitOverlayEmail(email: string): Promise<void> {
    if (!this.exitOverlay) return;

    try {
      const visitorId = getVisitorId();
      await submitInlineEmail(
        this.config.apiUrl,
        this.config.projectId,
        visitorId,
        null,
        email,
        "exit_overlay"
      );

      this.exitOverlay.showSuccess();

      // Update local lead state
      const existingState = getLeadCaptureState(this.config.projectId);
      setLeadCaptureState(this.config.projectId, {
        ...(existingState || { hasCompletedForm: false, hasCompletedQualifying: false }),
        hasProvidedEmail: true,
        captureSource: "exit_overlay",
      });

      if (process.env.NODE_ENV === "development") {
        console.log("[Chatbot Widget] Exit overlay email captured:", email);
      }
    } catch (error) {
      console.error("[Chatbot Widget] Exit overlay email error:", error);
      this.exitOverlay.setSubmitting(false);
    }
  }

  /**
   * Check if email has been captured (prevents showing overlay after capture)
   */
  private isEmailCaptured(): boolean {
    const state = getLeadCaptureState(this.config.projectId);
    return !!(state?.hasProvidedEmail || state?.hasCompletedForm);
  }

  /**
   * Initialize Pulse micro-survey popups
   */
  private initPulse(wrapper: HTMLDivElement): void {
    this.pulseManager = new PulseManager({
      projectId: this.config.projectId,
      apiUrl: this.config.apiUrl,
      parentElement: wrapper,
      isChatOpen: () => this.isOpen,
    });
    this.pulseManager.start();
  }

  destroy(): void {
    this.triggerService?.destroy();
    this.teaserMessage?.destroy();
    this.exitOverlay?.destroy();
    this.pulseManager?.destroy();
    this.triggerService = null;
    this.teaserMessage = null;
    this.exitOverlay = null;
    this.pulseManager = null;

    if (this.container) {
      this.container.remove();
      this.container = null;
      this.shadowRoot = null;
      this.bubble = null;
      this.chatWindow = null;
      this.isOpen = false;
    }
  }
}

/**
 * Auto-initialize from script tag attributes
 */
function autoInit(): void {
  // Prevent double initialization
  if (window.__CHATBOT_WIDGET_LOADED__) {
    console.warn("[Chatbot Widget] Widget already loaded");
    return;
  }
  window.__CHATBOT_WIDGET_LOADED__ = true;

  // Get current script tag
  const script = document.currentScript as HTMLScriptElement | null;
  if (!script) {
    console.warn("[Chatbot Widget] Could not find script tag for auto-init");
    return;
  }

  // Get project ID (required)
  const projectId = script.getAttribute("data-project-id");
  if (!projectId) {
    console.error(
      "[Chatbot Widget] Missing data-project-id attribute on script tag"
    );
    return;
  }

  // Build config from data attributes
  const config: WidgetConfig = {
    projectId,
    apiUrl: script.getAttribute("data-api-url") || undefined,
    position:
      (script.getAttribute("data-position") as WidgetConfig["position"]) ||
      undefined,
    primaryColor: script.getAttribute("data-primary-color") || undefined,
    greeting: script.getAttribute("data-greeting") || undefined,
    title: script.getAttribute("data-title") || undefined,
  };

  // Remove undefined values
  Object.keys(config).forEach((key) => {
    if (config[key as keyof WidgetConfig] === undefined) {
      delete config[key as keyof WidgetConfig];
    }
  });

  // Create widget instance
  new ChatbotWidget(config);
}

// Export for manual initialization
window.ChatbotWidget = ChatbotWidget;

// Auto-initialize from script tag
autoInit();

// Also export for ES modules
export { ChatbotWidget };
