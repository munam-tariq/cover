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

import { ChatWindow } from "./components/chat-window";
import { Bubble } from "./components/bubble";

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
  apiUrl: "http://localhost:3001",
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
  private container: HTMLElement | null = null;
  private shadowRoot: ShadowRoot | null = null;
  private bubble: Bubble | null = null;
  private chatWindow: ChatWindow | null = null;
  private isOpen = false;

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
  private init(): void {
    // Prevent double initialization
    if (this.container) {
      console.warn("[Chatbot Widget] Widget already initialized");
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
      title: this.config.title,
      primaryColor: this.config.primaryColor,
      onClose: () => this.close(),
    });
    wrapper.appendChild(this.chatWindow.element);

    // Add to document
    document.body.appendChild(this.container);

    // Log initialization
    if (process.env.NODE_ENV === "development") {
      console.log("[Chatbot Widget] Initialized", {
        projectId: this.config.projectId,
        apiUrl: this.config.apiUrl,
      });
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
  destroy(): void {
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
