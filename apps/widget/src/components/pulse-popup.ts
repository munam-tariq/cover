/**
 * PulsePopup — Micro-survey popup component
 *
 * Renders a cute, shaped popup with campaign-type-specific content.
 * Follows the standard widget component pattern: element, show(), hide(), destroy().
 */

export interface PulseCampaignData {
  id: string;
  type: "nps" | "poll" | "sentiment" | "feedback";
  question: string;
  config: Record<string, unknown>;
  styling: {
    accent_color?: string;
    theme?: "light" | "dark" | "auto";
    shape?: string;
    position?: string;
  };
}

export interface PulsePopupOptions {
  campaign: PulseCampaignData;
  onSubmit: (campaignId: string, answer: Record<string, unknown>) => void;
  onDismiss: (campaignId: string) => void;
}

const SHAPES = ["sticky", "holo", "envelope", "notebook", "ticket", "polaroid"] as const;

const SHAPE_STYLES: Record<string, string> = {
  sticky: "",
  holo: "",
  envelope: "",
  notebook: "",
  ticket: "",
  polaroid: "",
};

const POSITIONS = ["bottom-left", "bottom-right", "top-left", "top-right"] as const;

const SENTIMENT_EMOJIS = ["😡", "😞", "😐", "😊", "😍"];

export class PulsePopup {
  element: HTMLElement;
  private visible = false;
  private submitted = false;
  private options: PulsePopupOptions;
  private shape: string;
  private position: string;
  private dismissTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(options: PulsePopupOptions) {
    this.options = options;

    // Pick shape
    const shapePref = options.campaign.styling.shape || "random";
    this.shape =
      shapePref === "random"
        ? SHAPES[Math.floor(Math.random() * SHAPES.length)]
        : shapePref;

    // Pick position
    const posPref = options.campaign.styling.position || "smart";
    this.position =
      posPref === "smart"
        ? this.detectSmartPosition()
        : posPref;

    this.element = this.createElement();
  }

  private detectSmartPosition(): string {
    // Randomly pick from all 4 corners, avoiding the corner occupied by the chat widget
    const all = ["bottom-left", "bottom-right", "top-left", "top-right"];
    const avoid: string[] = [];

    const widget = document.querySelector("#chatbot-widget-container");
    if (widget) {
      const shadow = (widget as any).shadowRoot;
      if (shadow) {
        for (const pos of all) {
          if (shadow.querySelector(`.chatbot-widget.${pos}`)) {
            avoid.push(pos);
            break;
          }
        }
      }
    }

    const available = all.filter(p => !avoid.includes(p));
    return available[Math.floor(Math.random() * available.length)];
  }

  private createElement(): HTMLElement {
    const el = document.createElement("div");
    el.className = `pulse-popup pulse-pos-${this.position}`;
    el.setAttribute("role", "dialog");
    el.setAttribute("aria-label", "Quick feedback");

    const accentColor =
      this.options.campaign.styling.accent_color || "#6366f1";

    el.innerHTML = `
      <div class="pulse-popup-shape pulse-shape-${this.shape}" style="--pulse-accent: ${accentColor}; ${SHAPE_STYLES[this.shape] || ""}">
        <button class="pulse-close" aria-label="Dismiss">&times;</button>
        <div class="pulse-question">${this.escapeHtml(this.options.campaign.question)}</div>
        <div class="pulse-body">${this.renderBody()}</div>
        <div class="pulse-thank-you" style="display:none;">
          <span class="pulse-check">✓</span> Thanks!
        </div>
      </div>
    `;

    // Close button
    const closeBtn = el.querySelector(".pulse-close") as HTMLElement;
    closeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.dismiss();
    });

    // Keyboard escape
    el.addEventListener("keydown", (e) => {
      if (e.key === "Escape") this.dismiss();
    });

    // Attach type-specific events
    this.attachTypeEvents(el);

    return el;
  }

  private renderBody(): string {
    const { type, config } = this.options.campaign;

    switch (type) {
      case "nps":
        return this.renderNps();
      case "poll":
        return this.renderPoll(config);
      case "sentiment":
        return this.renderSentiment();
      case "feedback":
        return this.renderFeedback(config);
      default:
        return "";
    }
  }

  private renderNps(): string {
    const buttons = Array.from({ length: 11 }, (_, i) => {
      const cls =
        i <= 6 ? "pulse-nps-detractor" : i <= 8 ? "pulse-nps-passive" : "pulse-nps-promoter";
      return `<button class="pulse-nps-btn ${cls}" data-score="${i}">${i}</button>`;
    }).join("");

    return `
      <div class="pulse-nps-scale">
        ${buttons}
      </div>
      <div class="pulse-nps-labels">
        <span>Not likely</span>
        <span>Very likely</span>
      </div>
      <div class="pulse-nps-followup" style="display:none;">
        <textarea class="pulse-textarea" placeholder="What's the main reason for your score?" rows="2" maxlength="500"></textarea>
        <button class="pulse-submit-btn">Submit</button>
      </div>
    `;
  }

  private renderPoll(config: Record<string, unknown>): string {
    const options = (config.options as string[]) || [];
    const allowOther = config.allow_other === true;

    const optionBtns = options
      .map(
        (opt, i) =>
          `<button class="pulse-poll-option" data-option="${this.escapeHtml(opt)}" data-index="${i}">${this.escapeHtml(opt)}</button>`
      )
      .join("");

    const otherField = allowOther
      ? `<div class="pulse-poll-other" style="display:none;">
           <input type="text" class="pulse-other-input" placeholder="Other..." maxlength="200" />
           <button class="pulse-submit-btn">Submit</button>
         </div>`
      : "";

    return `
      <div class="pulse-poll-options">
        ${optionBtns}
        ${allowOther ? '<button class="pulse-poll-option pulse-poll-other-btn" data-option="__other__">Other</button>' : ""}
      </div>
      ${otherField}
    `;
  }

  private renderSentiment(): string {
    return `
      <div class="pulse-sentiment-row">
        ${SENTIMENT_EMOJIS.map(
          (emoji, i) =>
            `<button class="pulse-emoji-btn" data-emoji="${i + 1}" aria-label="Rating ${i + 1} of 5">${emoji}</button>`
        ).join("")}
      </div>
    `;
  }

  private renderFeedback(config: Record<string, unknown>): string {
    const placeholder =
      (config.placeholder as string) || "Share your thoughts...";
    const maxLength = (config.max_length as number) || 500;

    return `
      <textarea class="pulse-textarea" placeholder="${this.escapeHtml(placeholder)}" rows="3" maxlength="${maxLength}"></textarea>
      <button class="pulse-submit-btn">Submit</button>
    `;
  }

  private attachTypeEvents(el: HTMLElement): void {
    const { type } = this.options.campaign;

    if (type === "nps") {
      // NPS score buttons
      el.querySelectorAll(".pulse-nps-btn").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          const score = parseInt(
            (e.currentTarget as HTMLElement).dataset.score || "0"
          );
          // Highlight selected
          el.querySelectorAll(".pulse-nps-btn").forEach((b) =>
            b.classList.remove("selected")
          );
          (e.currentTarget as HTMLElement).classList.add("selected");

          // Show follow-up if configured
          const followUpQ =
            this.options.campaign.config.follow_up_question as string | undefined;
          const followUpEl = el.querySelector(
            ".pulse-nps-followup"
          ) as HTMLElement;
          if (followUpQ && followUpEl) {
            followUpEl.style.display = "block";
            (el.querySelector(".pulse-nps-btn.selected") as HTMLElement)?.setAttribute(
              "data-selected-score",
              String(score)
            );
          } else {
            // No follow-up — submit immediately
            this.submitAnswer({ score });
          }
        });
      });

      // NPS follow-up submit
      const npsSubmit = el.querySelector(
        ".pulse-nps-followup .pulse-submit-btn"
      );
      npsSubmit?.addEventListener("click", () => {
        const selectedBtn = el.querySelector(".pulse-nps-btn.selected");
        const score = parseInt(selectedBtn?.getAttribute("data-score") || "0");
        const followUp = (
          el.querySelector(".pulse-nps-followup .pulse-textarea") as HTMLTextAreaElement
        )?.value?.trim();
        this.submitAnswer({ score, follow_up: followUp || undefined });
      });
    }

    if (type === "poll") {
      el.querySelectorAll(".pulse-poll-option").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          if (this.submitted) return;
          const option = (e.currentTarget as HTMLElement).dataset.option || "";
          if (option === "__other__") {
            const otherDiv = el.querySelector(
              ".pulse-poll-other"
            ) as HTMLElement;
            if (otherDiv) otherDiv.style.display = "flex";
          } else {
            (e.currentTarget as HTMLElement).classList.add("selected");
            this.submitAnswer({ option });
          }
        });
      });

      // Poll "Other" submit
      const otherSubmit = el.querySelector(
        ".pulse-poll-other .pulse-submit-btn"
      );
      otherSubmit?.addEventListener("click", () => {
        const otherText = (
          el.querySelector(".pulse-other-input") as HTMLInputElement
        )?.value?.trim();
        if (otherText) {
          this.submitAnswer({ option: "Other", other_text: otherText });
        }
      });
    }

    if (type === "sentiment") {
      el.querySelectorAll(".pulse-emoji-btn").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          if (this.submitted) return;
          const emoji = (e.currentTarget as HTMLElement).dataset.emoji || "";
          (e.currentTarget as HTMLElement).classList.add("selected");
          this.submitAnswer({ emoji });
        });
      });
    }

    if (type === "feedback") {
      const submitBtn = el.querySelector(".pulse-submit-btn");
      submitBtn?.addEventListener("click", () => {
        const text = (
          el.querySelector(".pulse-textarea") as HTMLTextAreaElement
        )?.value?.trim();
        if (text) {
          this.submitAnswer({ text });
        }
      });
    }
  }

  private submitAnswer(answer: Record<string, unknown>): void {
    if (this.submitted) return;
    this.submitted = true;

    // Show thank you
    const body = this.element.querySelector(".pulse-body") as HTMLElement;
    const thankYou = this.element.querySelector(
      ".pulse-thank-you"
    ) as HTMLElement;
    const question = this.element.querySelector(
      ".pulse-question"
    ) as HTMLElement;

    if (body) body.style.display = "none";
    if (question) question.style.display = "none";
    if (thankYou) thankYou.style.display = "flex";

    this.options.onSubmit(this.options.campaign.id, answer);

    // Auto-dismiss after 1.5s
    this.dismissTimer = setTimeout(() => this.hide(), 1500);
  }

  private dismiss(): void {
    this.options.onDismiss(this.options.campaign.id);
    this.hide();
  }

  show(): void {
    if (this.visible) return;
    this.visible = true;
    this.element.classList.add("visible");
  }

  hide(): void {
    if (!this.visible) return;
    this.visible = false;
    this.element.classList.remove("visible");
  }

  isVisible(): boolean {
    return this.visible;
  }

  destroy(): void {
    if (this.dismissTimer) {
      clearTimeout(this.dismissTimer);
      this.dismissTimer = null;
    }
    this.hide();
    this.element.remove();
  }

  private escapeHtml(str: string): string {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }
}
