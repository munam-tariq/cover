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
import {
  getVoiceTranscriptExtractionMessages,
  getProcessQualifyingMessagePrompt,
  type ProcessQualifyingMessageResult,
} from "./prompts";

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
    mandatory?: boolean;           // required for lead to be "qualified"
    qualified_response?: string;   // what counts as a passing answer
    followup_questions?: string;   // prompts when answer is unclear
    probe_question?: string;       // alternative question if user truly can't answer
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
  qualified?: boolean;   // did answer meet qualified_response criteria?
  mandatory?: boolean;   // was this question mandatory?
  actual_question?: string;  // set when an alternate question was used to elicit the answer
  answer_reasoning?: string;  // LLM reasoning for this answer
}

export interface LeadCaptureState {
  lead_capture_status: "pending" | "form_shown" | "form_completed" | "qualifying" | "qualified" | "not_qualified" | "skipped" | "deferred";
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
  question_retry_count?: number;    // Track re-asks on current question (off-topic or non-qualifying answer)
  qualification_reasoning?: string;  // Why the lead was marked qualified/not_qualified
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
  // V3 recovery fields
  askCount?: number;
  visitCount?: number;
  isDeferred?: boolean;
  hasProvidedEmail?: boolean;
  captureSource?: string | null;
}

interface InterceptorResult {
  response: string;
  sessionId?: string;
}

// SDR messages and prompt builders are centralized in ./prompts.ts

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

export interface CustomerRecord {
  id: string;
  email: string | null;
  lead_capture_state: LeadCaptureState | null;
}

export async function getCustomerByVisitorId(
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
 *
 * New behaviour:
 * - "new_question" intent is treated as "answer" — we don't pause qualifying for general questions
 * - All questions loop until answered (mandatory flag only affects qualification status, not flow)
 * - Human handoff keywords (checked at step 4.5) still pass through to the handoff trigger
 */
export async function leadCaptureV2Interceptor(
  projectId: string,
  visitorId: string,
  sessionId: string | undefined,
  message: string,
  conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>
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

    // 4.5. Check for human intent keywords - let handoff trigger handle these
    // This ensures "Talk to Human" button works even during qualifying flow
    const humanIntentKeywords = [
      "human",
      "agent",
      "person",
      "representative",
      "speak to someone",
      "talk to someone",
      "talk to human",
      "real person",
      "live agent",
      "customer service",
      "support agent",
      "human support",
      "live support",
      "speak to a human",
      "talk to a human",
      "speak with someone",
      "talk with someone",
      "speak with a human",
      "i would like to speak",
    ];

    const lowerMessage = message.toLowerCase();
    const hasHumanIntent = humanIntentKeywords.some(keyword => lowerMessage.includes(keyword));

    if (hasHumanIntent) {
      logger.info("Human intent detected during qualifying, passing to handoff trigger", {
        ...logCtx,
        message: message.substring(0, 50),
      });
      return null; // Let handoff trigger handle this
    }

    // 5. We're in qualifying flow - process the answer
    const enabledQuestions = v2Settings.qualifying_questions.filter(q => q.enabled && q.question.trim());
    const currentIndex = state.current_qualifying_index;

    if (currentIndex >= enabledQuestions.length) {
      // All questions answered - shouldn't happen, but handle gracefully
      await finalizeQualification(customer.id, projectId, state.qualifying_answers);
      return null;
    }

    const currentQuestion = enabledQuestions[currentIndex];
    const nextIndex = currentIndex + 1;
    const nextQuestion = enabledQuestions[nextIndex] ?? null;
    const isLastQuestion = nextIndex >= enabledQuestions.length;
    const retryCount = state.question_retry_count || 0;

    // 6. Single unified LLM call: classifies intent, extracts answer, checks criteria, generates response
    const result = await processQualifyingMessage({
      question: currentQuestion.question,
      criteria: currentQuestion.qualified_response,
      alternateQuestion1: currentQuestion.followup_questions,  // DB key stays as followup_questions
      alternateQuestion2: currentQuestion.probe_question,      // DB key stays as probe_question
      nextQuestion: nextQuestion?.question ?? null,
      isLastQuestion,
      retryCount,
      userMessage: message,
      recentMessages: (conversationHistory || []).slice(-6),  // last 3 exchanges for context
    });

    // Safety override: if LLM extracted an answer but chose redirect, it contradicted itself —
    // the user clearly answered something, so force accept and fix the response.
    if (result.action === "redirect" && result.extracted_answer) {
      logger.info("Overriding redirect→accept: LLM extracted answer but chose redirect", {
        ...logCtx,
        extracted_answer: result.extracted_answer,
      });
      result.action = "accept";
      result.intent = "answer";
      // Replace the redirect response with a proper accept/transition response
      result.response = isLastQuestion
        ? "Thanks for sharing all that! Now, what can I help you with today?"
        : nextQuestion
          ? `Thanks for that! ${nextQuestion}`
          : "Thanks for sharing! How can I help you today?";
    }

    logger.info("Qualifying message processed", {
      ...logCtx,
      action: result.action,
      intent: result.intent,
      qualified: result.qualified,
      retryCount,
    });

    // 7a. Redirect: user is off-topic and has no remaining alternates — loop back.
    // Does NOT increment retryCount; user must answer to proceed.
    if (result.action === "redirect") {
      return { response: result.response, sessionId };
    }

    // 7b. Followup/probe: present alternate question (only triggered when user is off-topic/unable to answer).
    // Increments retryCount — each alternate question is used at most once.
    if (result.action === "followup" || result.action === "probe") {
      const updatedState: LeadCaptureState = {
        ...state,
        question_retry_count: retryCount + 1,
      };
      await supabaseAdmin
        .from("customers")
        .update({ lead_capture_state: updatedState })
        .eq("id", customer.id);
      return { response: result.response, sessionId };
    }

    // 8. action is "accept" or "skip" — record answer and advance
    // Determine which question the user actually responded to (may differ from original if alternate was used)
    let lastAskedQuestion = currentQuestion.question;
    if (retryCount >= 2 && currentQuestion.probe_question) {
      lastAskedQuestion = currentQuestion.probe_question;
    } else if (retryCount >= 1 && currentQuestion.followup_questions) {
      lastAskedQuestion = currentQuestion.followup_questions;
    }

    const thisAnswer: QualifyingAnswer = {
      question: currentQuestion.question,
      answer: result.action === "skip" ? "[skipped]" : (result.extracted_answer || "N/A"),
      raw_response: message,
      qualified: result.qualified ?? undefined,
      mandatory: currentQuestion.mandatory,
      ...(lastAskedQuestion !== currentQuestion.question ? { actual_question: lastAskedQuestion } : {}),
      ...(result.answer_reasoning ? { answer_reasoning: result.answer_reasoning } : {}),
    };

    await saveQualifyingAnswer(customer.id, projectId, state, thisAnswer);

    const allAnswers = [...state.qualifying_answers, thisAnswer];

    if (isLastQuestion) {
      // All questions done — finalize
      const updatedState: LeadCaptureState = {
        ...state,
        qualifying_answers: allAnswers,
        question_retry_count: 0,
      };
      await supabaseAdmin
        .from("customers")
        .update({ lead_capture_state: updatedState })
        .eq("id", customer.id);
      await finalizeQualification(customer.id, projectId, allAnswers);
      return { response: result.response, sessionId };
    }

    // Advance to next question
    const updatedState: LeadCaptureState = {
      ...state,
      current_qualifying_index: nextIndex,
      qualifying_answers: allAnswers,
      question_retry_count: 0,
    };
    await supabaseAdmin
      .from("customers")
      .update({ lead_capture_state: updatedState })
      .eq("id", customer.id);
    return { response: result.response, sessionId };
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
        qualifyingQuestion: firstQuestion.question,
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
        qualifyingQuestion: firstQuestion.question,
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
// ─── Unified Qualifying Message Processor ────────────────────────────────────

/**
 * Single LLM call that handles intent classification, answer extraction,
 * criteria checking, and natural response generation for the qualifying flow.
 * Replaces the previous 3-call approach (classify → extract → check).
 */
async function processQualifyingMessage(
  input: Parameters<typeof getProcessQualifyingMessagePrompt>[0]
): Promise<ProcessQualifyingMessageResult> {
  const fallback: ProcessQualifyingMessageResult = {
    intent: "answer",
    extracted_answer: input.userMessage.substring(0, 200),
    is_uncertain: false,
    qualified: null,
    action: "accept",
    response: input.nextQuestion
      ? `Thanks! ${input.nextQuestion}`
      : "Thanks for that! Now, how can I help you today?",
    answer_reasoning: undefined,
  };

  try {
    const msgs = getProcessQualifyingMessagePrompt(input);
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: msgs.system },
        { role: "user", content: msgs.user },
      ],
      max_tokens: 450,
      temperature: 0.3,
      response_format: { type: "json_object" },
    });
    const content = completion.choices[0]?.message?.content || "{}";
    const result = JSON.parse(content) as ProcessQualifyingMessageResult;
    if (!result.action || !result.response) return fallback;
    return result;
  } catch (err) {
    logger.error("Failed to process qualifying message", err, { step: "process_qualifying" });
    return fallback;
  }
}

/**
 * Save a qualifying answer and update lead record.
 */
export async function saveQualifyingAnswer(
  customerId: string,
  projectId: string,
  _state: LeadCaptureState,
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
    // Upsert by question: replace an existing answer for the same question rather than
    // appending. This prevents duplicate entries when Deepgram sends rapid successive
    // LLM calls for partial ASR transcripts of the same user utterance.
    const existingIndex = currentAnswers.findIndex(a => a.question === answer.question);
    const updatedAnswers = existingIndex !== -1
      ? currentAnswers.map((a, i) => i === existingIndex ? answer : a)
      : [...currentAnswers, answer];
    await supabaseAdmin
      .from("qualified_leads")
      .update({
        qualifying_answers: updatedAnswers,
        qualification_status: "qualifying",
        updated_at: new Date().toISOString(),
      })
      .eq("id", lead.id);
  }
}

/**
 * Finalize lead qualification — determines qualified/not_qualified status based on
 * mandatory question outcomes and stores reasoning.
 */
export async function finalizeQualification(
  customerId: string,
  projectId: string,
  allAnswers: QualifyingAnswer[]
): Promise<void> {
  const mandatoryFailures = allAnswers.filter(
    a => a.mandatory === true && (a.qualified === false || a.answer === "[skipped]")
  );
  const mandatoryPassed = allAnswers.filter(
    a => a.mandatory === true && a.qualified !== false && a.answer !== "[skipped]"
  );

  const finalStatus: LeadCaptureState["lead_capture_status"] =
    mandatoryFailures.length > 0 ? "not_qualified" : "qualified";

  const questionSummaries = allAnswers.map((a, i) => {
    const status = a.qualified === true ? "✓" : a.qualified === false ? "✗" : "–";
    const mandatoryNote = a.mandatory ? " [mandatory]" : "";
    const reasoning = a.answer_reasoning ? ` — ${a.answer_reasoning}` : "";
    return `${i + 1}. ${a.question.substring(0, 60)}${mandatoryNote}: "${a.answer}"${reasoning} ${status}`;
  }).join("\n");

  const reasoning =
    mandatoryFailures.length > 0
      ? `Not qualified: mandatory question(s) not satisfactorily answered.\n\n${questionSummaries}`
      : mandatoryPassed.length > 0
        ? `Qualified: all ${mandatoryPassed.length} mandatory question(s) answered satisfactorily.\n\n${questionSummaries}`
        : `Qualified: no mandatory questions configured.\n\n${questionSummaries}`;

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
      lead_capture_status: finalStatus,
      qualifying_status: "completed",
      qualification_reasoning: reasoning,
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
      qualification_status: finalStatus,
      qualification_reasoning: reasoning,
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

// ─── Voice Transcript Answer Extraction ───────────────────────────────────────

/**
 * Extract qualifying answers from a voice call transcript using LLM.
 * Called from the Vapi webhook after a call ends (fire-and-forget).
 *
 * Looks at the transcript, finds answers to unanswered qualifying questions,
 * saves them to the lead record, and updates qualifying status.
 */
export async function extractQualifyingAnswersFromVoiceTranscript(
  projectId: string,
  visitorId: string,
  callMessages: Array<{ role: string; message?: string; content?: string }>
): Promise<void> {
  const logCtx: LogContext = { projectId, visitorId, step: "voice_qualifying_extract" };

  // 1. Get V2 settings → enabled qualifying questions
  const v2Settings = await getLeadCaptureV2Settings(projectId);
  if (!v2Settings) return;

  const enabledQuestions = v2Settings.qualifying_questions.filter(q => q.enabled && q.question.trim());
  if (enabledQuestions.length === 0) return;

  // 2. Get customer by visitorId → lead_capture_state
  const customer = await getCustomerByVisitorId(projectId, visitorId);
  if (!customer) {
    logger.warn("[Voice Extract] No customer found for visitor", logCtx);
    return;
  }

  const state = customer.lead_capture_state;

  // 3. Determine which questions are unanswered
  const answeredQuestions = new Set(
    (state?.qualifying_answers || [])
      .filter(a => a.answer !== "[skipped]")
      .map(a => a.question.toLowerCase().trim())
  );

  const unansweredQuestions = enabledQuestions.filter(
    q => !answeredQuestions.has(q.question.toLowerCase().trim())
  );

  if (unansweredQuestions.length === 0) {
    logger.info("[Voice Extract] All qualifying questions already answered", logCtx);
    return;
  }

  // 4. Build transcript text
  const transcriptText = callMessages
    .filter(m => {
      const content = (m.message || m.content || "").trim();
      return content && (m.role === "user" || m.role === "assistant" || m.role === "bot");
    })
    .map(m => {
      const role = m.role === "user" ? "Caller" : "Agent";
      const content = m.message || m.content || "";
      return `${role}: ${content}`;
    })
    .join("\n");

  if (!transcriptText) {
    logger.info("[Voice Extract] Empty transcript, skipping", logCtx);
    return;
  }

  // 5. LLM extraction
  const questionsText = unansweredQuestions
    .map((q, i) => `  ${i + 1}. "${q.question}"`)
    .join("\n");

  try {
    const msgs = getVoiceTranscriptExtractionMessages(questionsText, transcriptText);
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: msgs.system },
        { role: "user", content: msgs.user },
      ],
      max_tokens: 500,
      temperature: 0,
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content || "{}";
    const result = JSON.parse(content) as {
      answers: Array<{ question: string; answer: string; confidence: number }>;
    };

    const validAnswers = (result.answers || []).filter(a => a.confidence > 0.6);

    if (validAnswers.length === 0) {
      logger.info("[Voice Extract] No qualifying answers found in transcript", logCtx);
      return;
    }

    logger.info(`[Voice Extract] Found ${validAnswers.length} qualifying answers`, logCtx);

    // 6. Save each answer
    // Refresh state to get the latest
    const freshCustomer = await getCustomerByVisitorId(projectId, visitorId);
    if (!freshCustomer) return;
    let currentState = freshCustomer.lead_capture_state || state;

    for (const extracted of validAnswers) {
      const answer: QualifyingAnswer = {
        question: extracted.question,
        answer: extracted.answer,
        raw_response: `[Extracted from voice transcript]`,
      };

      await saveQualifyingAnswer(freshCustomer.id, projectId, currentState!, answer);

      // Update local state for next iteration
      const currentIndex = currentState?.current_qualifying_index || 0;
      currentState = {
        ...currentState!,
        qualifying_answers: [...(currentState?.qualifying_answers || []), answer],
        current_qualifying_index: currentIndex + 1,
      };

      // Update customer state
      await supabaseAdmin
        .from("customers")
        .update({ lead_capture_state: currentState })
        .eq("id", freshCustomer.id);
    }

    // 7. Check if all questions are now answered
    const allAnswered = enabledQuestions.every(q => {
      const qText = q.question.toLowerCase().trim();
      return answeredQuestions.has(qText) ||
        validAnswers.some(a => a.question.toLowerCase().trim() === qText);
    });

    if (allAnswered) {
      const freshState = freshCustomer.lead_capture_state;
      const finalAnswers = freshState?.qualifying_answers || currentState?.qualifying_answers || [];
      await finalizeQualification(freshCustomer.id, projectId, finalAnswers);
      logger.info("[Voice Extract] All qualifying questions answered — finalized qualification", logCtx);
    }
  } catch (err) {
    logger.error("[Voice Extract] LLM extraction failed", err, logCtx);
  }
}
