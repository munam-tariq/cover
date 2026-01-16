/**
 * Offline Form Component
 *
 * Displayed when no agents are available (outside business hours or all offline).
 * Captures customer contact info and message for follow-up.
 * Features:
 * - Name, email, and message fields
 * - Email validation
 * - Success confirmation
 * - Loading state
 */

export interface OfflineFormOptions {
  onSubmit: (data: { name: string; email: string; message: string }) => Promise<void>;
  primaryColor: string;
  title?: string;
  description?: string;
}

export class OfflineForm {
  element: HTMLElement;
  private form: HTMLFormElement;
  private nameInput: HTMLInputElement;
  private emailInput: HTMLInputElement;
  private messageInput: HTMLTextAreaElement;
  private submitButton: HTMLButtonElement;
  private errorMessage: HTMLElement;
  private successMessage: HTMLElement;
  private isLoading = false;
  private isSubmitted = false;

  constructor(private options: OfflineFormOptions) {
    this.element = this.createElement();
    this.form = this.element.querySelector("form") as HTMLFormElement;
    this.nameInput = this.element.querySelector('input[name="name"]') as HTMLInputElement;
    this.emailInput = this.element.querySelector('input[name="email"]') as HTMLInputElement;
    this.messageInput = this.element.querySelector("textarea") as HTMLTextAreaElement;
    this.submitButton = this.element.querySelector('button[type="submit"]') as HTMLButtonElement;
    this.errorMessage = this.element.querySelector(".offline-form-error") as HTMLElement;
    this.successMessage = this.element.querySelector(".offline-form-success") as HTMLElement;
    this.attachEvents();
  }

  private createElement(): HTMLElement {
    const container = document.createElement("div");
    container.className = "chatbot-offline-form";

    const title = this.options.title || "We're currently offline";
    const description = this.options.description ||
      "Leave your message and we'll get back to you as soon as possible.";

    container.innerHTML = `
      <div class="offline-form-header">
        <div class="offline-form-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
        </div>
        <h3 class="offline-form-title">${this.escapeHtml(title)}</h3>
        <p class="offline-form-description">${this.escapeHtml(description)}</p>
      </div>

      <form class="offline-form-body">
        <div class="offline-form-field">
          <label for="offline-name">Name</label>
          <input
            type="text"
            id="offline-name"
            name="name"
            placeholder="Your name"
            required
            autocomplete="name"
          />
        </div>

        <div class="offline-form-field">
          <label for="offline-email">Email</label>
          <input
            type="email"
            id="offline-email"
            name="email"
            placeholder="your@email.com"
            required
            autocomplete="email"
          />
        </div>

        <div class="offline-form-field">
          <label for="offline-message">Message</label>
          <textarea
            id="offline-message"
            name="message"
            placeholder="How can we help you?"
            required
            rows="4"
          ></textarea>
        </div>

        <div class="offline-form-error" style="display: none;"></div>

        <button
          type="submit"
          class="offline-form-submit"
          style="background-color: ${this.options.primaryColor}"
        >
          Send Message
        </button>
      </form>

      <div class="offline-form-success" style="display: none;">
        <div class="offline-form-success-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
        </div>
        <h3>Message Sent!</h3>
        <p>We'll get back to you as soon as possible.</p>
      </div>
    `;

    return container;
  }

  private escapeHtml(text: string): string {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  private attachEvents(): void {
    this.form.addEventListener("submit", async (e) => {
      e.preventDefault();
      await this.handleSubmit();
    });

    // Clear error on input
    [this.nameInput, this.emailInput, this.messageInput].forEach((input) => {
      input.addEventListener("input", () => {
        this.hideError();
        input.classList.remove("error");
      });
    });
  }

  private async handleSubmit(): Promise<void> {
    if (this.isLoading || this.isSubmitted) return;

    // Validate
    const name = this.nameInput.value.trim();
    const email = this.emailInput.value.trim();
    const message = this.messageInput.value.trim();

    // Name validation
    if (!name) {
      this.showError("Please enter your name");
      this.nameInput.classList.add("error");
      this.nameInput.focus();
      return;
    }

    // Email validation
    if (!email) {
      this.showError("Please enter your email");
      this.emailInput.classList.add("error");
      this.emailInput.focus();
      return;
    }

    if (!this.isValidEmail(email)) {
      this.showError("Please enter a valid email address");
      this.emailInput.classList.add("error");
      this.emailInput.focus();
      return;
    }

    // Message validation
    if (!message) {
      this.showError("Please enter a message");
      this.messageInput.classList.add("error");
      this.messageInput.focus();
      return;
    }

    // Submit
    this.setLoading(true);

    try {
      await this.options.onSubmit({ name, email, message });
      this.showSuccess();
      this.isSubmitted = true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to send message. Please try again.";
      this.showError(errorMessage);
    } finally {
      this.setLoading(false);
    }
  }

  private isValidEmail(email: string): boolean {
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private setLoading(loading: boolean): void {
    this.isLoading = loading;
    this.submitButton.disabled = loading;
    this.submitButton.textContent = loading ? "Sending..." : "Send Message";
    this.form.classList.toggle("loading", loading);

    // Disable inputs during loading
    this.nameInput.disabled = loading;
    this.emailInput.disabled = loading;
    this.messageInput.disabled = loading;
  }

  private showError(message: string): void {
    this.errorMessage.textContent = message;
    this.errorMessage.style.display = "block";
  }

  private hideError(): void {
    this.errorMessage.style.display = "none";
  }

  private showSuccess(): void {
    this.form.style.display = "none";
    this.successMessage.style.display = "flex";
  }

  /**
   * Reset form to initial state
   */
  reset(): void {
    this.form.reset();
    this.hideError();
    this.form.style.display = "block";
    this.successMessage.style.display = "none";
    this.isSubmitted = false;

    // Remove error classes
    [this.nameInput, this.emailInput, this.messageInput].forEach((input) => {
      input.classList.remove("error");
    });
  }

  /**
   * Show the form
   */
  show(): void {
    this.element.style.display = "block";
  }

  /**
   * Hide the form
   */
  hide(): void {
    this.element.style.display = "none";
  }
}
