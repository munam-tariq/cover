export const STATUS_LABELS: Record<string, string> = {
  qualified: "Qualified",
  not_qualified: "Disqualified",
  qualifying: "Pending",
  form_completed: "Form Only",
  skipped: "Skipped",
  deferred: "Deferred",
};

export const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  qualified: "default",
  not_qualified: "destructive",
  qualifying: "secondary",
  form_completed: "outline",
  skipped: "destructive",
  deferred: "secondary",
};

export const CAPTURE_SOURCE_LABELS: Record<string, string> = {
  form: "Form",
  inline_email: "Inline Email",
  conversational: "Conversational",
  exit_overlay: "Exit Overlay",
  summary_hook: "Summary Hook",
};

export interface LateQualifyingAnswer {
  question_index: number;
  question_text: string;
  answer: string;
  raw_message: string;
  confidence: number;
  capture_type: string;
  captured_at: string;
  promoted: boolean;
}

export interface Lead {
  id: string;
  email: string;
  formData: Record<string, { label: string; value: string }>;
  qualifyingAnswers: Array<{
    question: string;
    answer: string;
    actual_question?: string;
    answer_reasoning?: string;
  }>;
  lateQualifyingAnswers: LateQualifyingAnswer[];
  qualificationStatus: string;
  qualificationReasoning: string | null;
  captureSource: string | null;
  firstMessage: string | null;
  conversationId: string | null;
  customerId: string | null;
  createdAt: string;
}

export function getLeadDisplayName(lead: Lead): string {
  const formEntries = Object.values(lead.formData || {});
  const nameField = formEntries.find(
    (f) => f.label && /name/i.test(f.label) && f.value
  );
  if (nameField) return nameField.value;
  return lead.email.split("@")[0];
}
