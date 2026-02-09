/**
 * PulseManager — Anti-annoyance controller for Pulse popups
 *
 * Handles:
 * - Fetching active campaigns from API
 * - Session-level frequency capping (1 per session)
 * - localStorage memory of shown/dismissed/completed campaigns
 * - Timing delays (minimum page load delay)
 * - Mutual exclusion with chat widget
 * - Targeting evaluation (URL patterns, audience)
 */

import { PulsePopup, type PulseCampaignData } from "../components/pulse-popup";
import { getVisitorId } from "./storage";

const STORAGE_KEY = "pulse_state";
const MIN_DELAY_MS = 8000; // 8s minimum after page load
const COOLDOWN_AFTER_DISMISS_MS = 300_000; // 5 min cooldown after dismiss
const SESSION_KEY = "pulse_session";

export interface PulseManagerOptions {
  projectId: string;
  apiUrl: string;
  parentElement: HTMLElement;
  isChatOpen: () => boolean;
}

interface PulseStorageState {
  shown: string[]; // campaign IDs shown
  dismissed: string[]; // campaign IDs dismissed
  completed: string[]; // campaign IDs completed (answered)
  lastDismissedAt?: number; // timestamp
}

export class PulseManager {
  private options: PulseManagerOptions;
  private campaigns: PulseCampaignData[] = [];
  private activePopup: PulsePopup | null = null;
  private timeoutId: ReturnType<typeof setTimeout> | null = null;
  private destroyed = false;
  private sessionShown = false;

  constructor(options: PulseManagerOptions) {
    this.options = options;
    this.sessionShown = this.getSessionFlag();
  }

  /**
   * Start the Pulse manager: fetch campaigns and schedule display.
   */
  async start(): Promise<void> {
    if (this.destroyed) return;

    // Don't show if already shown this session
    if (this.sessionShown) return;

    try {
      const response = await fetch(
        `${this.options.apiUrl}/api/pulse/campaigns/${this.options.projectId}`
      );
      if (!response.ok) return;

      let data: { campaigns?: PulseCampaignData[] };
      try {
        data = await response.json();
      } catch {
        return; // Invalid JSON response
      }
      this.campaigns = Array.isArray(data.campaigns) ? data.campaigns : [];

      if (this.campaigns.length === 0) return;

      // Filter campaigns by targeting (URL pattern, already shown/completed)
      const eligible = this.getEligibleCampaigns();
      if (eligible.length === 0) return;

      // Pick the best campaign (first eligible by priority)
      const campaign = eligible[0];

      // Schedule display with delay
      const delay = Math.max(
        MIN_DELAY_MS,
        ((campaign as any).targeting?.delay_seconds || 10) * 1000
      );

      this.timeoutId = setTimeout(() => {
        if (this.destroyed) return;

        // Final checks before showing
        if (this.options.isChatOpen()) return;
        if (this.sessionShown) return;

        this.showCampaign(campaign);
      }, delay);
    } catch (error) {
      // Silent fail — Pulse is non-critical
      if (process.env.NODE_ENV === "development") {
        console.warn("[Pulse] Failed to fetch campaigns:", error);
      }
    }
  }

  /**
   * Stop and cleanup.
   */
  stop(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }

  /**
   * Destroy fully.
   */
  destroy(): void {
    this.destroyed = true;
    this.stop();
    this.activePopup?.destroy();
    this.activePopup = null;
  }

  /**
   * Called when chat opens — dismiss any active popup.
   */
  onChatOpened(): void {
    if (this.activePopup?.isVisible()) {
      this.activePopup.hide();
    }
    this.stop();
  }

  // ─── Private ─────────────────────────────────────────────────────────────

  private getEligibleCampaigns(): PulseCampaignData[] {
    const state = this.getState();
    const currentUrl = window.location.pathname + window.location.search;

    return this.campaigns.filter((campaign) => {
      // Skip already completed
      if (state.completed.includes(campaign.id)) return false;

      // Skip recently dismissed (within cooldown)
      if (
        state.dismissed.includes(campaign.id) &&
        state.lastDismissedAt &&
        Date.now() - state.lastDismissedAt < COOLDOWN_AFTER_DISMISS_MS
      ) {
        return false;
      }

      // Check URL targeting
      const targeting = (campaign as any).targeting as
        | { pages?: string[]; audience?: string }
        | undefined;
      if (targeting?.pages && targeting.pages.length > 0) {
        const matches = targeting.pages.some((pattern: string) => {
          if (pattern === "*") return true;
          return currentUrl.toLowerCase().includes(pattern.toLowerCase());
        });
        if (!matches) return false;
      }

      return true;
    });
  }

  private showCampaign(campaign: PulseCampaignData): void {
    this.activePopup = new PulsePopup({
      campaign,
      onSubmit: (campaignId, answer) => this.handleSubmit(campaignId, answer),
      onDismiss: (campaignId) => this.handleDismiss(campaignId),
    });

    this.options.parentElement.appendChild(this.activePopup.element);

    // Small delay for DOM attachment before animating
    requestAnimationFrame(() => {
      this.activePopup?.show();
    });

    // Mark shown
    this.markShown(campaign.id);
    this.sessionShown = true;
    this.setSessionFlag();
  }

  private async handleSubmit(
    campaignId: string,
    answer: Record<string, unknown>
  ): Promise<void> {
    // Mark completed in local state
    this.markCompleted(campaignId);

    // Send to API
    try {
      const visitorId = getVisitorId();
      await fetch(`${this.options.apiUrl}/api/pulse/responses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaign_id: campaignId,
          project_id: this.options.projectId,
          answer,
          page_url: window.location.href,
          visitor_id: visitorId,
          session_id: sessionStorage.getItem("sb_session_id") || null,
          metadata: {
            referrer: document.referrer || undefined,
          },
        }),
      });
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.warn("[Pulse] Failed to submit response:", error);
      }
    }
  }

  private handleDismiss(campaignId: string): void {
    this.markDismissed(campaignId);
  }

  // ─── Storage (localStorage) ──────────────────────────────────────────────

  private getState(): PulseStorageState {
    try {
      const key = `${STORAGE_KEY}_${this.options.projectId}`;
      const raw = localStorage.getItem(key);
      if (raw) return JSON.parse(raw);
    } catch {}
    return { shown: [], dismissed: [], completed: [] };
  }

  private saveState(state: PulseStorageState): void {
    try {
      const key = `${STORAGE_KEY}_${this.options.projectId}`;
      localStorage.setItem(key, JSON.stringify(state));
    } catch {}
  }

  private markShown(campaignId: string): void {
    const state = this.getState();
    if (!state.shown.includes(campaignId)) {
      state.shown.push(campaignId);
    }
    this.saveState(state);
  }

  private markDismissed(campaignId: string): void {
    const state = this.getState();
    if (!state.dismissed.includes(campaignId)) {
      state.dismissed.push(campaignId);
    }
    state.lastDismissedAt = Date.now();
    this.saveState(state);
  }

  private markCompleted(campaignId: string): void {
    const state = this.getState();
    if (!state.completed.includes(campaignId)) {
      state.completed.push(campaignId);
    }
    this.saveState(state);
  }

  // ─── Session flag (sessionStorage) ───────────────────────────────────────

  private getSessionFlag(): boolean {
    try {
      return sessionStorage.getItem(`${SESSION_KEY}_${this.options.projectId}`) === "1";
    } catch {
      return false;
    }
  }

  private setSessionFlag(): void {
    try {
      sessionStorage.setItem(`${SESSION_KEY}_${this.options.projectId}`, "1");
    } catch {}
  }
}
