/**
 * Lead Capture V2 Service
 *
 * Configurable lead capture with:
 * - Inline form (email required + up to 2 custom fields)
 * - Qualifying questions asked by AI after form submission
 * - State machine persisted in customers.lead_capture_state
 * - Backward compatible with V1 (checked in chat-engine step 11)
 */

import { openai } from "../lib/openai";
import { supabaseAdmin } from "../lib/supabase";
import { logger, type LogContext } from "../lib/logger";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LeadCaptureV2Settings {
  enabled: boolean;
  form_fields: {
    email: { required: true };
    field_2: { enabled: boolean; label: string; required: boolean };
    field_3: { enabled: boolean; label: string; required: boolean };
  };
  qualifying_questions: Array<{
    question: string;
    enabled: boolean;
  }>;
  notification_email?: string;
  notifications_enabled?: boolean;
}

export interface FormFieldValue {
  label: string;
  value: string;
}

export interface FormData {
  email: string;
  field_2?: FormFieldValue;
  field_3?: FormFieldValue;
}

export interface QualifyingAnswer {
  question: string;
  answer: string;
  raw_response: string;
}

export interface LeadCaptureState {
  lead_capture_status: "pending" | "form_shown" | "form_completed" | "qualifying" | "qualified" | "skipped" | "deferred";
  form_data: FormData;
  qualifying_status: "pending" | "in_progress" | "completed" | "skipped";
  qualifying_answers: QualifyingAnswer[];
  current_qualifying_index: number;
  first_message: string;
  // V3 cascade tracking fields
  capture_source?: "inline_email" | "form" | "conversational" | "exit_overlay" | "summary_hook";
  ask_count?: number;
  messages_since_last_ask?: number;
  visit_count?: number;
  high_intent_detected?: boolean;
  deferred_at?: string;
  inline_email_shown?: boolean;
  inline_email_skipped?: boolean;
}

export interface LeadFormSubmitResult {
  success: boolean;
  leadId?: string;
  nextAction: "qualifying_question" | "none";
  qualifyingQuestion?: string;
}

export interface LeadCaptureStatusResult {
  hasCompletedForm: boolean;
  hasCompletedQualifying: boolean;
  leadCaptureState: LeadCaptureState | null;
}

interface InterceptorResult {
  response: string;
  sessionId?: string;
}

// ─── Settings ─────────────────────────────────────────────────────────────────

const v2SettingsCache = new Map<string, { data: LeadCaptureV2Settings | null; timestamp: number }>();
const V2_CACHE_TTL = 60000; // 1 minute

/**
 * Get V2 lead capture settings from project.settings JSONB
 */
export async function getLeadCaptureV2Settings(
  projectId: string
): Promise<LeadCaptureV2Settings | null> {
  const cached = v2SettingsCache.get(projectId);
  if (cached && Date.now() - cached.timestamp < V2_CACHE_TTL) {
    return cached.data;
  }

  const { data: project, error } = await supabaseAdmin
    .from("projects")
    .select("settings")
    .eq("id", projectId)
    .single();

  if (error || !project) {
    v2SettingsCache.set(projectId, { data: null, timestamp: Date.now() });
    return null;
  }

  const settings = (project.settings as Record<string, unknown>) || {};
  const v2 = settings.lead_capture_v2 as LeadCaptureV2Settings | undefined;

  if (!v2 || !v2.enabled) {
    v2SettingsCache.set(projectId, { data: null, timestamp: Date.now() });
    return null;
  }

  v2SettingsCache.set(projectId, { data: v2, timestamp: Date.now() });
  return v2;
}

// ─── Customer Lookup ──────────────────────────────────────────────────────────

interface CustomerRecord {
  id: string;
  email: string | null;
  lead_capture_state: LeadCaptureState | null;
}

async function getCustomerByVisitorId(
  projectId: string,
  visitorId: string
): Promise<CustomerRecord | null> {
  const { data, error } = await supabaseAdmin
    .from("customers")
    .select("id, email, lead_capture_state")
    .eq("project_id", projectId)
    .eq("visitor_id", visitorId)
    .single();

  if (error || !data) return null;
  return data as CustomerRecord;
}

async function findOrCreateCustomer(
  projectId: string,
  visitorId: string
): Promise<CustomerRecord> {
  // Try to find existing
  const existing = await getCustomerByVisitorId(projectId, visitorId);
  if (existing) return existing;

  // Create new customer
  const { data, error } = await supabaseAdmin
    .from("customers")
    .insert({
      project_id: projectId,
      visitor_id: visitorId,
    })
    .select("id, email, lead_capture_state")
    .single();

  if (error || !data) {
    throw new Error(`Failed to create customer: ${error?.message}`);
  }

  return data as CustomerRecord;
}

// ─── Interceptor ──────────────────────────────────────────────────────────────

/**
 * V2 Interceptor for qualifying question flow.
 * Called at the top of processChat() before any AI processing.
 *
 * Returns a response if the message is part of qualifying flow.
 * Returns null if normal chat should proceed.
 */
export async function leadCaptureV2Interceptor(
  projectId: string,
  visitorId: string,
  sessionId: string | undefined,
  message: string
): Promise<InterceptorResult | null> {
  const logCtx: LogContext = { projectId, visitorId, step: "lc_v2_interceptor" };

  try {
    // 1. Check if V2 is enabled
    const v2Settings = await getLeadCaptureV2Settings(projectId);
    if (!v2Settings) return null;

    // 2. Get customer
    const customer = await getCustomerByVisitorId(projectId, visitorId);
    if (!customer) return null; // No customer yet → form not submitted → normal flow

    // 3. Check lead capture state
    const state = customer.lead_capture_state;
    if (!state) return null; // No state → normal flow

    // 4. Only intercept if qualifying is in_progress
    if (state.qualifying_status !== "in_progress") return null;

    // 5. We're in qualifying flow - process the answer
    const enabledQuestions = v2Settings.qualifying_questions.filter(q => q.enabled && q.question.trim());
    const currentIndex = state.current_qualifying_index;

    if (currentIndex >= enabledQuestions.length) {
      // All questions answered - shouldn't happen, but handle gracefully
      await markAsQualified(customer.id, projectId);
      return null;
    }

    const currentQuestion = enabledQuestions[currentIndex];

    // Extract answer from free-text response
    const extracted = await extractQualifyingAnswer(currentQuestion.question, message);

    // Save the answer
    await saveQualifyingAnswer(customer.id, projectId, state, {
      question: currentQuestion.question,
      answer: extracted.answer,
      raw_response: message,
    });

    // Check if there are more questions
    const nextIndex = currentIndex + 1;

    if (nextIndex < enabledQuestions.length) {
      // More questions - ask the next one
      const nextQuestion = enabledQuestions[nextIndex];

      // Update state with next index
      const updatedState: LeadCaptureState = {
        ...state,
        current_qualifying_index: nextIndex,
        qualifying_answers: [
          ...state.qualifying_answers,
          { question: currentQuestion.question, answer: extracted.answer, raw_response: message },
        ],
      };

      await supabaseAdmin
        .from("customers")
        .update({ lead_capture_state: updatedState })
        .eq("id", customer.id);

      return {
        response: `Got it, thanks! ${nextQuestion.question}`,
        sessionId,
      };
    }

    // All questions answered - mark as qualified
    await markAsQualified(customer.id, projectId);

    return {
      response: "Thanks for answering those questions! How can I help you today?",
      sessionId,
    };
  } catch (err) {
    logger.error("Lead capture V2 interceptor error", err, logCtx);
    return null; // On error, fall through to normal chat
  }
}

// ─── Form Submission ──────────────────────────────────────────────────────────

/**
 * Handle form submission from the widget.
 * Creates lead record, saves state, returns next action.
 */
export async function submitLeadForm(
  projectId: string,
  visitorId: string,
  sessionId: string | null,
  formData: FormData,
  firstMessage: string
): Promise<LeadFormSubmitResult> {
  const logCtx: LogContext = { projectId, visitorId, step: "lc_v2_submit_form" };

  try {
    const v2Settings = await getLeadCaptureV2Settings(projectId);
    if (!v2Settings) {
      return { success: false, nextAction: "none" };
    }

    // Find or create customer
    const customer = await findOrCreateCustomer(projectId, visitorId);

    // If email not provided (progressive profiling — email was captured inline),
    // use the existing customer email so we don't overwrite it with "".
    const email = formData.email || customer.email || "";
    if (email && email !== formData.email) {
      formData = { ...formData, email };
    }

    // Update customer email only if we have one
    if (email) {
      await supabaseAdmin
        .from("customers")
        .update({ email })
        .eq("id", customer.id);
    }

    // Determine if qualifying questions are configured
    const enabledQuestions = v2Settings.qualifying_questions.filter(q => q.enabled && q.question.trim());
    const hasQualifyingQuestions = enabledQuestions.length > 0;

    // Determine initial status
    const qualificationStatus = hasQualifyingQuestions ? "form_completed" : "qualified";

    // Preserve capture source from existing state (e.g. inline_email)
    const existingState = customer.lead_capture_state;

    // Build lead capture state
    const lcState: LeadCaptureState = {
      lead_capture_status: hasQualifyingQuestions ? "qualifying" : "qualified",
      form_data: formData,
      qualifying_status: hasQualifyingQuestions ? "in_progress" : "completed",
      qualifying_answers: [],
      current_qualifying_index: 0,
      first_message: firstMessage,
      // Preserve capture source from inline email if it was set
      ...(existingState?.capture_source ? { capture_source: existingState.capture_source } : {}),
    };

    // Save state to customer
    await supabaseAdmin
      .from("customers")
      .update({ lead_capture_state: lcState })
      .eq("id", customer.id);

    // Create or update qualified_leads record
    // Check if a lead already exists (e.g. from inline email capture)
    const { data: existingLead } = await supabaseAdmin
      .from("qualified_leads")
      .select("id")
      .eq("customer_id", customer.id)
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    let leadId: string;
    if (existingLead) {
      // Update existing lead with form data
      await supabaseAdmin
        .from("qualified_leads")
        .update({
          email,
          form_data: formData,
          qualification_status: qualificationStatus,
          first_message: firstMessage || undefined,
          form_submitted_at: new Date().toISOString(),
          qualification_completed_at: hasQualifyingQuestions ? null : new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingLead.id);
      leadId = existingLead.id;
    } else {
      // Create new lead
      const { data: lead, error: leadError } = await supabaseAdmin
        .from("qualified_leads")
        .insert({
          project_id: projectId,
          customer_id: customer.id,
          conversation_id: sessionId,
          visitor_id: visitorId,
          email,
          form_data: formData,
          qualification_status: qualificationStatus,
          first_message: firstMessage,
          qualification_completed_at: hasQualifyingQuestions ? null : new Date().toISOString(),
        })
        .select("id")
        .single();

      if (leadError) {
        logger.error("Failed to create qualified lead", leadError, logCtx);
        return { success: false, nextAction: "none" };
      }
      leadId = lead.id;
    }

    // If qualifying questions exist, return first question
    if (hasQualifyingQuestions) {
      const firstQuestion = enabledQuestions[0];
      return {
        success: true,
        leadId,
        nextAction: "qualifying_question",
        qualifyingQuestion: `Thanks! Quick question - ${firstQuestion.question}`,
      };
    }

    // No qualifying questions - done
    return {
      success: true,
      leadId,
      nextAction: "none",
    };
  } catch (err) {
    logger.error("Lead form submission error", err, logCtx);
    return { success: false, nextAction: "none" };
  }
}

// ─── Status Check ─────────────────────────────────────────────────────────────

/**
 * Check lead capture status for a returning visitor.
 * Called by widget on init to skip form for returning users.
 */
export async function getLeadCaptureStatus(
  projectId: string,
  visitorId: string
): Promise<LeadCaptureStatusResult> {
  const customer = await getCustomerByVisitorId(projectId, visitorId);

  if (!customer || !customer.lead_capture_state) {
    return {
      hasCompletedForm: false,
      hasCompletedQualifying: false,
      leadCaptureState: null,
    };
  }

  const state = customer.lead_capture_state;

  return {
    hasCompletedForm: ["form_completed", "qualifying", "qualified"].includes(state.lead_capture_status),
    hasCompletedQualifying: state.qualifying_status === "completed",
    leadCaptureState: state,
    // V3 recovery fields
    askCount: state.ask_count || 0,
    visitCount: state.visit_count || 0,
    isDeferred: state.lead_capture_status === "deferred",
    hasProvidedEmail: !!state.form_data?.email,
    captureSource: state.capture_source || null,
  };
}

// ─── Skip Form ────────────────────────────────────────────────────────────────

/**
 * Handle form skip from the widget.
 * "permanent" sets terminal "skipped" state.
 * "deferred" sets re-askable "deferred" state (V3).
 */
export async function skipLeadForm(
  projectId: string,
  visitorId: string,
  skipType: "permanent" | "deferred" = "permanent"
): Promise<void> {
  const customer = await findOrCreateCustomer(projectId, visitorId);

  const existingState = customer.lead_capture_state;
  const askCount = (existingState?.ask_count || 0) + 1;

  if (skipType === "deferred") {
    const deferredState: LeadCaptureState = {
      ...(existingState || {
        form_data: { email: "" },
        qualifying_answers: [],
        current_qualifying_index: 0,
        first_message: "",
      }),
      lead_capture_status: "deferred",
      qualifying_status: "pending",
      ask_count: askCount,
      messages_since_last_ask: 0,
      deferred_at: new Date().toISOString(),
    } as LeadCaptureState;

    await supabaseAdmin
      .from("customers")
      .update({ lead_capture_state: deferredState })
      .eq("id", customer.id);
  } else {
    // Preserve existing state data (especially email captured inline)
    const skippedState: LeadCaptureState = {
      ...(existingState || {
        form_data: { email: "" },
        qualifying_answers: [],
        current_qualifying_index: 0,
        first_message: "",
      }),
      lead_capture_status: "skipped",
      qualifying_status: "skipped",
      ask_count: askCount,
    } as LeadCaptureState;

    await supabaseAdmin
      .from("customers")
      .update({ lead_capture_state: skippedState })
      .eq("id", customer.id);
  }
}

/**
 * Submit inline email capture (V3 cascade).
 * Lightweight email-only capture, no form fields.
 */
export async function submitInlineEmail(
  projectId: string,
  visitorId: string,
  sessionId: string | null,
  email: string,
  captureSource: string = "inline_email"
): Promise<LeadFormSubmitResult> {
  const logCtx: LogContext = { projectId, visitorId, step: "lc_v3_inline_email" };

  try {
    const v2Settings = await getLeadCaptureV2Settings(projectId);
    if (!v2Settings) {
      return { success: false, nextAction: "none" };
    }

    // Find or create customer
    const customer = await findOrCreateCustomer(projectId, visitorId);

    // Update customer email
    await supabaseAdmin
      .from("customers")
      .update({ email })
      .eq("id", customer.id);

    // Determine if qualifying questions are configured
    const enabledQuestions = v2Settings.qualifying_questions.filter(q => q.enabled && q.question.trim());
    const hasQualifyingQuestions = enabledQuestions.length > 0;

    // Check if custom form fields exist (for progressive profiling)
    const hasCustomFields = (v2Settings.form_fields.field_2?.enabled) || (v2Settings.form_fields.field_3?.enabled);

    // Determine the correct state based on what's left to collect.
    // If custom fields exist, the progressive profiling form must show first
    // before qualifying begins — so qualifying_status stays "pending".
    // Only start qualifying immediately when there are NO custom fields.
    const startQualifyingNow = hasQualifyingQuestions && !hasCustomFields;

    const qualificationStatus = (!hasCustomFields && !hasQualifyingQuestions)
      ? "qualified"
      : "form_completed";

    // Build lead capture state
    const lcState: LeadCaptureState = {
      lead_capture_status: hasCustomFields
        ? "form_shown"                             // progressive profiling form pending
        : (hasQualifyingQuestions ? "qualifying" : "qualified"),
      form_data: { email },
      qualifying_status: startQualifyingNow
        ? "in_progress"   // no form needed → qualifying starts now
        : (hasQualifyingQuestions ? "pending" : "completed"),
      qualifying_answers: [],
      current_qualifying_index: 0,
      first_message: "",
      capture_source: captureSource as LeadCaptureState["capture_source"],
    };

    await supabaseAdmin
      .from("customers")
      .update({ lead_capture_state: lcState })
      .eq("id", customer.id);

    // Create qualified_leads record
    const { data: lead, error: leadError } = await supabaseAdmin
      .from("qualified_leads")
      .insert({
        project_id: projectId,
        customer_id: customer.id,
        conversation_id: sessionId,
        visitor_id: visitorId,
        email,
        form_data: { email },
        qualification_status: qualificationStatus,
        first_message: "",
        qualification_completed_at: qualificationStatus === "qualified" ? new Date().toISOString() : null,
      })
      .select("id")
      .single();

    if (leadError) {
      logger.error("Failed to create inline lead", leadError, logCtx);
      return { success: false, nextAction: "none" };
    }

    // Only return qualifying question if starting immediately (no custom fields)
    if (startQualifyingNow) {
      const firstQuestion = enabledQuestions[0];
      return {
        success: true,
        leadId: lead.id,
        nextAction: "qualifying_question",
        qualifyingQuestion: `Thanks! Quick question - ${firstQuestion.question}`,
      };
    }

    return { success: true, leadId: lead.id, nextAction: "none" };
  } catch (err) {
    logger.error("Inline email submission error", err, logCtx);
    return { success: false, nextAction: "none" };
  }
}

// ─── V3 Recovery Helpers ──────────────────────────────────────────────────────

/**
 * Defer lead capture (sets status to "deferred" without terminal skip).
 * Called when the widget uses the defer API route.
 */
export async function deferLeadCapture(
  projectId: string,
  visitorId: string
): Promise<void> {
  const customer = await findOrCreateCustomer(projectId, visitorId);
  const existingState = customer.lead_capture_state;

  const deferredState: LeadCaptureState = {
    ...(existingState || {
      form_data: { email: "" },
      qualifying_answers: [],
      current_qualifying_index: 0,
      first_message: "",
    }),
    lead_capture_status: "deferred",
    qualifying_status: "pending",
    ask_count: (existingState?.ask_count || 0) + 1,
    messages_since_last_ask: 0,
    deferred_at: new Date().toISOString(),
  } as LeadCaptureState;

  await supabaseAdmin
    .from("customers")
    .update({ lead_capture_state: deferredState })
    .eq("id", customer.id);
}

/**
 * Increment visit count for a returning visitor.
 */
export async function updateVisitCount(
  projectId: string,
  visitorId: string
): Promise<{ visitCount: number }> {
  const customer = await getCustomerByVisitorId(projectId, visitorId);
  if (!customer) {
    return { visitCount: 0 };
  }

  const state = customer.lead_capture_state;
  const newCount = (state?.visit_count || 0) + 1;

  const updatedState: LeadCaptureState = {
    ...(state || {
      lead_capture_status: "pending",
      form_data: { email: "" },
      qualifying_status: "pending",
      qualifying_answers: [],
      current_qualifying_index: 0,
      first_message: "",
    }),
    visit_count: newCount,
  } as LeadCaptureState;

  await supabaseAdmin
    .from("customers")
    .update({ lead_capture_state: updatedState })
    .eq("id", customer.id);

  return { visitCount: newCount };
}

// ─── Internal Helpers ─────────────────────────────────────────────────────────

/**
 * Extract a clean answer from free-text user response using OpenAI.
 */
async function extractQualifyingAnswer(
  question: string,
  userResponse: string
): Promise<{ answer: string }> {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Extract a concise answer from the user's response to the question. Return ONLY the extracted answer, nothing else. If the response doesn't contain a clear answer, return "N/A".`,
        },
        {
          role: "user",
          content: `Question: "${question}"\nUser's response: "${userResponse}"\n\nExtracted answer:`,
        },
      ],
      max_tokens: 100,
      temperature: 0,
    });

    const answer = completion.choices[0]?.message?.content?.trim() || "N/A";
    return { answer };
  } catch (err) {
    logger.error("Failed to extract qualifying answer", err, { step: "extract_answer" });
    return { answer: userResponse.trim().substring(0, 200) }; // Fallback: use raw response
  }
}

/**
 * Save a qualifying answer and update lead record.
 */
async function saveQualifyingAnswer(
  customerId: string,
  projectId: string,
  state: LeadCaptureState,
  answer: QualifyingAnswer
): Promise<void> {
  // Update qualified_leads record with new answer
  const { data: lead } = await supabaseAdmin
    .from("qualified_leads")
    .select("id, qualifying_answers")
    .eq("customer_id", customerId)
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (lead) {
    const currentAnswers = (lead.qualifying_answers as QualifyingAnswer[]) || [];
    await supabaseAdmin
      .from("qualified_leads")
      .update({
        qualifying_answers: [...currentAnswers, answer],
        qualification_status: "qualifying",
        updated_at: new Date().toISOString(),
      })
      .eq("id", lead.id);
  }
}

/**
 * Mark a customer as fully qualified (form + all questions answered).
 */
async function markAsQualified(
  customerId: string,
  projectId: string
): Promise<void> {
  // Update customer state
  const { data: customer } = await supabaseAdmin
    .from("customers")
    .select("lead_capture_state")
    .eq("id", customerId)
    .single();

  if (customer?.lead_capture_state) {
    const state = customer.lead_capture_state as LeadCaptureState;
    const updatedState: LeadCaptureState = {
      ...state,
      lead_capture_status: "qualified",
      qualifying_status: "completed",
    };

    await supabaseAdmin
      .from("customers")
      .update({ lead_capture_state: updatedState })
      .eq("id", customerId);
  }

  // Update qualified_leads record
  await supabaseAdmin
    .from("qualified_leads")
    .update({
      qualification_status: "qualified",
      qualification_completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("customer_id", customerId)
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(1);
}

/**
 * Mask email for privacy in responses: "john@gmail.com" → "j***@gmail.com"
 */
export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return "***@***";
  if (local.length <= 1) return `${local}***@${domain}`;
  return `${local[0]}***@${domain}`;
}
