"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";

import type { LeadCaptureClientConfig, LeadFormData } from "./lib/public-api";

// Same validation the widget form uses (apps/widget/src/components/lead-capture-form.ts).
const EMAIL_RE = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

/**
 * Inline lead-capture form shown in the thread before chat unlocks (widget parity:
 * blocking, no skip). Field shape comes from settings.lead_capture_v2.form_fields.
 */
export function LeadCaptureCard({
  config,
  accentColor,
  submitting,
  onSubmit,
}: {
  config: LeadCaptureClientConfig;
  accentColor: string;
  submitting: boolean;
  onSubmit: (data: LeadFormData) => void;
}) {
  const [email, setEmail] = useState("");
  const [field2, setField2] = useState("");
  const [field3, setField3] = useState("");
  const [error, setError] = useState<string | null>(null);

  const f2 = config.formFields?.field_2;
  const f3 = config.formFields?.field_3;

  const handleSubmit = () => {
    if (!EMAIL_RE.test(email.trim())) {
      setError("Please enter a valid email address.");
      return;
    }
    if (f2?.enabled && f2.required && !field2.trim()) {
      setError(`${f2.label || "This field"} is required.`);
      return;
    }
    if (f3?.enabled && f3.required && !field3.trim()) {
      setError(`${f3.label || "This field"} is required.`);
      return;
    }
    setError(null);
    const data: LeadFormData = { email: email.trim() };
    if (f2?.enabled && field2.trim())
      data.field_2 = { label: f2.label || "Field 2", value: field2.trim() };
    if (f3?.enabled && field3.trim())
      data.field_3 = { label: f3.label || "Field 3", value: field3.trim() };
    onSubmit(data);
  };

  const inputClass =
    "w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-offset-0";

  return (
    <div className="bg-muted/20 mx-auto my-4 w-full max-w-md rounded-xl border p-4">
      <div className="text-sm font-medium">Before we start</div>
      <p className="text-muted-foreground mt-1 text-xs">
        Leave your details so we can follow up if needed.
      </p>
      <div className="mt-3 space-y-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email address *"
          disabled={submitting}
          className={inputClass}
        />
        {f2?.enabled && (
          <input
            type="text"
            value={field2}
            onChange={(e) => setField2(e.target.value)}
            placeholder={`${f2.label || ""}${f2.required ? " *" : ""}`}
            disabled={submitting}
            className={inputClass}
          />
        )}
        {f3?.enabled && (
          <input
            type="text"
            value={field3}
            onChange={(e) => setField3(e.target.value)}
            placeholder={`${f3.label || ""}${f3.required ? " *" : ""}`}
            disabled={submitting}
            className={inputClass}
          />
        )}
        {error && (
          <div className="text-xs text-red-600 dark:text-red-400">{error}</div>
        )}
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-white transition disabled:opacity-60"
          style={{ backgroundColor: accentColor }}
        >
          {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Start chatting
        </button>
      </div>
    </div>
  );
}
