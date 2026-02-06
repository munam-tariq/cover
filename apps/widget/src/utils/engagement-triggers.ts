/**
 * Engagement Trigger Service
 *
 * Monitors page signals (time-on-page, scroll depth, exit intent, URL patterns)
 * and fires configurable engagement actions. Each trigger fires at most once
 * per session to avoid annoyance.
 */

export type TriggerActionType = "teaser" | "badge" | "auto_open" | "overlay";
export type TriggerSource =
  | "time_on_page"
  | "scroll_depth"
  | "exit_intent"
  | "high_intent_url";

export interface TriggerAction {
  type: TriggerActionType;
  source: TriggerSource;
  message?: string;
}

export interface ProactiveEngagementConfig {
  enabled: boolean;
  teaser: {
    enabled: boolean;
    message: string;
    delay_seconds: number;
    show_once_per_session: boolean;
  };
  badge: {
    enabled: boolean;
    show_until_opened: boolean;
  };
  triggers: {
    time_on_page: {
      enabled: boolean;
      delay_seconds: number;
      action: TriggerActionType;
    };
    scroll_depth: {
      enabled: boolean;
      threshold_percent: number;
      action: TriggerActionType;
    };
    exit_intent: {
      enabled: boolean;
      action: TriggerActionType;
      message: string;
    };
    high_intent_urls: {
      enabled: boolean;
      patterns: string[];
      action: TriggerActionType;
    };
  };
}

export interface EngagementTriggerServiceOptions {
  config: ProactiveEngagementConfig;
  onTrigger: (action: TriggerAction) => void;
  projectId: string;
}

const SESSION_STORAGE_KEY = "chatbot_triggers_fired";
const SCROLL_THROTTLE_MS = 200;

export class EngagementTriggerService {
  private config: ProactiveEngagementConfig;
  private onTrigger: (action: TriggerAction) => void;
  private projectId: string;
  private firedTriggers: Set<string>;
  private timeoutId: ReturnType<typeof setTimeout> | null = null;
  private scrollHandler: (() => void) | null = null;
  private exitIntentHandler: ((e: MouseEvent) => void) | null = null;
  private scrollThrottleTimer: ReturnType<typeof setTimeout> | null = null;
  private chatOpened = false;
  private destroyed = false;

  constructor(options: EngagementTriggerServiceOptions) {
    this.config = options.config;
    this.onTrigger = options.onTrigger;
    this.projectId = options.projectId;
    this.firedTriggers = this.loadFiredTriggers();
  }

  /**
   * Start monitoring all configured triggers
   */
  start(): void {
    if (this.destroyed || !this.config.enabled) return;

    const { triggers } = this.config;

    // Time-on-page trigger
    if (triggers.time_on_page.enabled && !this.hasFired("time_on_page")) {
      this.startTimeOnPageTrigger(triggers.time_on_page.delay_seconds);
    }

    // Scroll depth trigger
    if (triggers.scroll_depth.enabled && !this.hasFired("scroll_depth")) {
      this.startScrollDepthTrigger(triggers.scroll_depth.threshold_percent);
    }

    // Exit intent trigger (desktop only)
    if (triggers.exit_intent.enabled && !this.hasFired("exit_intent")) {
      if (!this.isMobile()) {
        this.startExitIntentTrigger();
      }
    }

    // High-intent URL matching (fires immediately if match)
    if (
      triggers.high_intent_urls.enabled &&
      !this.hasFired("high_intent_url")
    ) {
      this.checkHighIntentUrl(triggers.high_intent_urls.patterns);
    }

    // Show badge immediately if configured
    if (this.config.badge.enabled && !this.chatOpened) {
      this.onTrigger({ type: "badge", source: "time_on_page" });
    }
  }

  /**
   * Stop all trigger monitoring
   */
  stop(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    if (this.scrollThrottleTimer) {
      clearTimeout(this.scrollThrottleTimer);
      this.scrollThrottleTimer = null;
    }
    if (this.scrollHandler) {
      window.removeEventListener("scroll", this.scrollHandler);
      this.scrollHandler = null;
    }
    if (this.exitIntentHandler) {
      document.removeEventListener("mouseout", this.exitIntentHandler);
      this.exitIntentHandler = null;
    }
  }

  /**
   * Notify that the chat was opened (suppress further triggers)
   */
  setChatOpened(): void {
    this.chatOpened = true;
    this.stop();
  }

  /**
   * Cleanup everything
   */
  destroy(): void {
    this.destroyed = true;
    this.stop();
  }

  // --- Private trigger implementations ---

  private startTimeOnPageTrigger(delaySeconds: number): void {
    this.timeoutId = setTimeout(() => {
      if (this.destroyed || this.chatOpened) return;
      this.fireTrigger("time_on_page", this.config.triggers.time_on_page.action);
    }, delaySeconds * 1000);
  }

  private startScrollDepthTrigger(thresholdPercent: number): void {
    this.scrollHandler = () => {
      if (this.scrollThrottleTimer) return;

      this.scrollThrottleTimer = setTimeout(() => {
        this.scrollThrottleTimer = null;

        if (this.destroyed || this.chatOpened || this.hasFired("scroll_depth"))
          return;

        const scrollPercent =
          ((window.scrollY + window.innerHeight) /
            document.documentElement.scrollHeight) *
          100;

        if (scrollPercent >= thresholdPercent) {
          this.fireTrigger(
            "scroll_depth",
            this.config.triggers.scroll_depth.action
          );
          // Remove scroll listener after firing
          if (this.scrollHandler) {
            window.removeEventListener("scroll", this.scrollHandler);
            this.scrollHandler = null;
          }
        }
      }, SCROLL_THROTTLE_MS);
    };

    window.addEventListener("scroll", this.scrollHandler, { passive: true });
  }

  private startExitIntentTrigger(): void {
    this.exitIntentHandler = (e: MouseEvent) => {
      if (this.destroyed || this.chatOpened || this.hasFired("exit_intent"))
        return;

      // Cursor left the top of the viewport
      if (e.clientY < 0) {
        this.fireTrigger(
          "exit_intent",
          this.config.triggers.exit_intent.action,
          this.config.triggers.exit_intent.message
        );
        // Remove exit intent listener after firing
        if (this.exitIntentHandler) {
          document.removeEventListener("mouseout", this.exitIntentHandler);
          this.exitIntentHandler = null;
        }
      }
    };

    document.addEventListener("mouseout", this.exitIntentHandler);
  }

  private checkHighIntentUrl(patterns: string[]): void {
    if (!patterns.length) return;

    const currentPath = window.location.pathname.toLowerCase();
    const currentHref = window.location.href.toLowerCase();

    const matched = patterns.some((pattern) => {
      const lowerPattern = pattern.toLowerCase();
      return (
        currentPath.includes(lowerPattern) ||
        currentHref.includes(lowerPattern)
      );
    });

    if (matched) {
      this.fireTrigger(
        "high_intent_url",
        this.config.triggers.high_intent_urls.action
      );
    }
  }

  private fireTrigger(
    source: TriggerSource,
    actionType: TriggerActionType,
    message?: string
  ): void {
    if (this.hasFired(source) || this.chatOpened || this.destroyed) return;

    this.markFired(source);
    this.onTrigger({ type: actionType, source, message });
  }

  // --- Session persistence ---

  private hasFired(source: string): boolean {
    return this.firedTriggers.has(source);
  }

  private markFired(source: string): void {
    this.firedTriggers.add(source);
    this.saveFiredTriggers();
  }

  private loadFiredTriggers(): Set<string> {
    try {
      const key = `${SESSION_STORAGE_KEY}_${this.projectId}`;
      const stored = sessionStorage.getItem(key);
      if (stored) {
        return new Set(JSON.parse(stored) as string[]);
      }
    } catch {
      // sessionStorage unavailable (e.g., private browsing)
    }
    return new Set();
  }

  private saveFiredTriggers(): void {
    try {
      const key = `${SESSION_STORAGE_KEY}_${this.projectId}`;
      sessionStorage.setItem(
        key,
        JSON.stringify(Array.from(this.firedTriggers))
      );
    } catch {
      // sessionStorage unavailable
    }
  }

  // --- Helpers ---

  private isMobile(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
  }
}
