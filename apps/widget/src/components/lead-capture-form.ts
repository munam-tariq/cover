/**
 * Lead Capture Form Component
 *
 * Inline form card rendered in the messages container.
 * Shows email (required) + up to 2 custom fields + Continue/Skip buttons.
 * Uses inline styles for Shadow DOM compatibility.
 */

export interface LeadCaptureFormField {
  enabled: boolean;
  label: string;
  required: boolean;
}

export interface LeadCaptureFormConfig {
  formFields: {
    email: { required: true };
    field_2?: LeadCaptureFormField;
    field_3?: LeadCaptureFormField;
  };
  /** V3: Hide email field when already captured via inline (progressive profiling) */
  hideEmail?: boolean;
}

export interface LeadCaptureFormData {
  email: string;
  field_2?: { label: string; value: string };
  field_3?: { label: string; value: string };
}

export interface LeadCaptureFormOptions {
  config: LeadCaptureFormConfig;
  onSubmit: (data: LeadCaptureFormData) => void;
  onSkip: () => void;
  primaryColor: string;
}

export class LeadCaptureForm {
  element: HTMLElement;
  private emailInput: HTMLInputElement | null = null;
  private field2Input: HTMLInputElement | null = null;
  private field3Input: HTMLInputElement | null = null;
  private errorEl: HTMLElement | null = null;
  private submitBtn: HTMLButtonElement | null = null;

  constructor(private options: LeadCaptureFormOptions) {
    this.element = this.createElement();
  }

  private createElement(): HTMLElement {
    const card = document.createElement("div");
    card.className = "chatbot-message assistant";
    card.style.cssText = `
      max-width: 100%;
      margin: 0;
      padding: 0;
    `;

    const { config, primaryColor } = this.options;
    const field2 = config.formFields.field_2;
    const field3 = config.formFields.field_3;
    const hideEmail = !!config.hideEmail;

    // V3: Adjust intro text when in progressive profiling mode
    const introText = hideEmail
      ? "Just a couple quick things to help me help you better!"
      : "Hey! Quick intro so I know who I'm talking to 😊";

    const formHtml = `
      <div style="
        background: #f9fafb;
        border: 1px solid #e5e7eb;
        border-radius: 12px;
        padding: 16px;
        margin: 4px 0;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      ">
        <div style="
          font-size: 13px;
          color: #374151;
          margin-bottom: 12px;
          line-height: 1.4;
        ">
          ${introText}
        </div>

        ${!hideEmail ? `
        <div style="margin-bottom: 8px;">
          <label style="
            display: block;
            font-size: 12px;
            color: #6b7280;
            margin-bottom: 4px;
            font-weight: 500;
          ">Email <span style="color: #ef4444;">*</span></label>
          <input
            type="email"
            placeholder="you@example.com"
            class="lc-email-input"
            style="
              width: 100%;
              padding: 8px 10px;
              border: 1px solid #d1d5db;
              border-radius: 6px;
              font-size: 13px;
              outline: none;
              box-sizing: border-box;
              background: white;
              color: #111827;
              transition: border-color 0.15s;
            "
          />
        </div>
        ` : ''}

        ${field2?.enabled ? `
        <div style="margin-bottom: 8px;">
          <label style="
            display: block;
            font-size: 12px;
            color: #6b7280;
            margin-bottom: 4px;
            font-weight: 500;
          ">${this.escapeHtml(field2.label)}${field2.required ? ' <span style="color: #ef4444;">*</span>' : ''}</label>
          <input
            type="text"
            placeholder="${this.escapeHtml(field2.label)}"
            class="lc-field2-input"
            style="
              width: 100%;
              padding: 8px 10px;
              border: 1px solid #d1d5db;
              border-radius: 6px;
              font-size: 13px;
              outline: none;
              box-sizing: border-box;
              background: white;
              color: #111827;
              transition: border-color 0.15s;
            "
          />
        </div>
        ` : ''}

        ${field3?.enabled ? `
        <div style="margin-bottom: 8px;">
          <label style="
            display: block;
            font-size: 12px;
            color: #6b7280;
            margin-bottom: 4px;
            font-weight: 500;
          ">${this.escapeHtml(field3.label)}${field3.required ? ' <span style="color: #ef4444;">*</span>' : ''}</label>
          <input
            type="text"
            placeholder="${this.escapeHtml(field3.label)}"
            class="lc-field3-input"
            style="
              width: 100%;
              padding: 8px 10px;
              border: 1px solid #d1d5db;
              border-radius: 6px;
              font-size: 13px;
              outline: none;
              box-sizing: border-box;
              background: white;
              color: #111827;
              transition: border-color 0.15s;
            "
          />
        </div>
        ` : ''}

        <div class="lc-error" style="
          display: none;
          color: #ef4444;
          font-size: 12px;
          margin-bottom: 8px;
        "></div>

        <div style="
          display: flex;
          gap: 8px;
          margin-top: 12px;
        ">
          <button class="lc-submit-btn" style="
            flex: 1;
            padding: 8px 16px;
            background: ${primaryColor};
            color: white;
            border: none;
            border-radius: 6px;
            font-size: 13px;
            font-weight: 500;
            cursor: pointer;
            transition: opacity 0.15s;
          ">Continue</button>
          <button class="lc-skip-btn" style="
            padding: 8px 16px;
            background: transparent;
            color: #6b7280;
            border: 1px solid #d1d5db;
            border-radius: 6px;
            font-size: 13px;
            cursor: pointer;
            transition: background 0.15s;
          ">Skip</button>
        </div>
      </div>
    `;

    card.innerHTML = formHtml;

    // Cache input references
    this.emailInput = card.querySelector(".lc-email-input") as HTMLInputElement;
    this.field2Input = card.querySelector(".lc-field2-input") as HTMLInputElement;
    this.field3Input = card.querySelector(".lc-field3-input") as HTMLInputElement;
    this.errorEl = card.querySelector(".lc-error") as HTMLElement;
    this.submitBtn = card.querySelector(".lc-submit-btn") as HTMLButtonElement;

    // Add focus styles
    const inputs = card.querySelectorAll("input");
    inputs.forEach((input) => {
      input.addEventListener("focus", () => {
        input.style.borderColor = this.options.primaryColor;
        input.style.boxShadow = `0 0 0 1px ${this.options.primaryColor}20`;
      });
      input.addEventListener("blur", () => {
        input.style.borderColor = "#d1d5db";
        input.style.boxShadow = "none";
      });
    });

    // Submit handler
    const submitBtn = card.querySelector(".lc-submit-btn") as HTMLButtonElement;
    submitBtn.addEventListener("click", () => this.handleSubmit());

    // Skip handler - validates required fields before allowing skip
    const skipBtn = card.querySelector(".lc-skip-btn") as HTMLButtonElement;
    skipBtn.addEventListener("click", () => this.handleSkip());

    // Enter key submits
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        this.handleSubmit();
      }
    });

    return card;
  }

  /**
   * Handle skip button click - validates required fields before allowing skip
   */
  private handleSkip(): void {
    const { config } = this.options;
    const hideEmail = !!config.hideEmail;

    // Validate required email field (if not hidden)
    if (!hideEmail && this.emailInput) {
      const email = this.emailInput.value.trim();
      if (!email) {
        this.showError("Email is required. Please enter your email address.");
        this.emailInput.focus();
        return;
      }

      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(email)) {
        this.showError("Please enter a valid email address.");
        this.emailInput.focus();
        return;
      }
    }

    // Validate required custom fields
    const field2 = config.formFields.field_2;
    const field3 = config.formFields.field_3;

    if (field2?.enabled && field2.required && this.field2Input) {
      if (!this.field2Input.value.trim()) {
        this.showError(`${field2.label} is required.`);
        this.field2Input.focus();
        return;
      }
    }

    if (field3?.enabled && field3.required && this.field3Input) {
      if (!this.field3Input.value.trim()) {
        this.showError(`${field3.label} is required.`);
        this.field3Input.focus();
        return;
      }
    }

    // All required fields are filled, allow skip (submits required data only)
    this.hideError();

    // Build form data with required fields only
    const formData: LeadCaptureFormData = {
      email: !hideEmail && this.emailInput ? this.emailInput.value.trim() : ""
    };

    if (field2?.enabled && field2.required && this.field2Input?.value.trim()) {
      formData.field_2 = {
        label: field2.label,
        value: this.field2Input.value.trim(),
      };
    }

    if (field3?.enabled && field3.required && this.field3Input?.value.trim()) {
      formData.field_3 = {
        label: field3.label,
        value: this.field3Input.value.trim(),
      };
    }

    // Submit the required data and then trigger skip callback
    this.setLoading(true);
    this.options.onSubmit(formData);
  }

  private handleSubmit(): void {
    const { config } = this.options;
    const hideEmail = !!config.hideEmail;

    // V3: When email is hidden (progressive profiling), skip email validation
    let email = "";
    if (!hideEmail) {
      if (!this.emailInput) return;
      email = this.emailInput.value.trim();

      // Validate email
      if (!email) {
        this.showError("Please enter your email address.");
        this.emailInput.focus();
        return;
      }

      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(email)) {
        this.showError("Please enter a valid email address.");
        this.emailInput.focus();
        return;
      }
    }

    // Validate required custom fields
    const field2 = config.formFields.field_2;
    const field3 = config.formFields.field_3;

    if (field2?.enabled && field2.required && this.field2Input) {
      if (!this.field2Input.value.trim()) {
        this.showError(`Please enter your ${field2.label.toLowerCase()}.`);
        this.field2Input.focus();
        return;
      }
    }

    if (field3?.enabled && field3.required && this.field3Input) {
      if (!this.field3Input.value.trim()) {
        this.showError(`Please enter your ${field3.label.toLowerCase()}.`);
        this.field3Input.focus();
        return;
      }
    }

    // Clear error
    this.hideError();

    // Build form data (email may be empty string in progressive profiling mode)
    const formData: LeadCaptureFormData = { email };

    if (field2?.enabled && this.field2Input?.value.trim()) {
      formData.field_2 = {
        label: field2.label,
        value: this.field2Input.value.trim(),
      };
    }

    if (field3?.enabled && this.field3Input?.value.trim()) {
      formData.field_3 = {
        label: field3.label,
        value: this.field3Input.value.trim(),
      };
    }

    // Disable form
    this.setLoading(true);

    this.options.onSubmit(formData);
  }

  setLoading(loading: boolean): void {
    if (this.submitBtn) {
      this.submitBtn.disabled = loading;
      this.submitBtn.textContent = loading ? "Submitting..." : "Continue";
      this.submitBtn.style.opacity = loading ? "0.7" : "1";
    }

    const inputs = this.element.querySelectorAll("input");
    inputs.forEach((input) => {
      (input as HTMLInputElement).disabled = loading;
    });

    const skipBtn = this.element.querySelector(".lc-skip-btn") as HTMLButtonElement;
    if (skipBtn) {
      skipBtn.disabled = loading;
    }
  }

  private showError(message: string): void {
    if (this.errorEl) {
      this.errorEl.textContent = message;
      this.errorEl.style.display = "block";
    }
  }

  private hideError(): void {
    if (this.errorEl) {
      this.errorEl.style.display = "none";
    }
  }

  /**
   * Replace the form with a success summary showing captured info
   */
  showSuccess(email: string): void {
    const inner = this.element.querySelector("div") as HTMLElement;
    if (inner) {
      inner.innerHTML = `
        <div style="
          display: flex;
          align-items: center;
          gap: 8px;
          color: #059669;
          font-size: 13px;
        ">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          <span>Awesome, great to meet you ${this.escapeHtml(email.split('@')[0])}! Let's chat.</span>
        </div>
      `;
    }
  }

  focusEmail(): void {
    setTimeout(() => {
      // V3: If email is hidden (progressive profiling), focus first available field
      if (this.emailInput) {
        this.emailInput.focus();
      } else if (this.field2Input) {
        this.field2Input.focus();
      } else if (this.field3Input) {
        this.field3Input.focus();
      }
    }, 100);
  }

  private escapeHtml(text: string): string {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }
}
