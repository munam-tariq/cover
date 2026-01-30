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
import { extractEmbeddedAnswer } from "./late-answer-detector";

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
  // V3 qualifying question pause/resume fields
  qualifying_paused?: boolean;       // True when user asked a new question mid-qualifying
  qualifying_retry_count?: number;   // Track retries to avoid infinite re-ask loops
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

// ─── SDR-Style Conversational Messages ────────────────────────────────────────
// Natural, warm, human-sounding responses like a senior SDR would use

const FIRST_QUESTION_INTROS = [
  "Love it! Just a quick one for me —",
  "Awesome! One quick thing I'm curious about —",
  "Perfect! Just wondering —",
  "Great to meet you! Quick question —",
  "Thanks for reaching out! I'd love to know —",
];

const NEXT_QUESTION_TRANSITIONS = [
  "Perfect, that helps a lot! And",
  "Great, thanks for sharing! Also curious —",
  "Awesome, good to know! One more —",
  "That's really helpful! Last thing —",
  "Got it, appreciate that! Quick follow-up —",
];

const ANSWER_ACKNOWLEDGMENTS = [
  "Perfect!",
  "Love it!",
  "Awesome!",
  "Great!",
  "That's helpful!",
];

const SKIP_TRANSITIONS = [
  "No worries at all! Let me ask you this instead —",
  "Totally fine! How about this one —",
  "All good! Different question —",
  "No problem! Let's try this —",
];

const QUALIFYING_COMPLETE_MESSAGES = [
  "Awesome, thanks for sharing! Now, how can I help you today?",
  "Perfect, I really appreciate that! What can I help you with?",
  "Great, thanks so much! What brings you here today?",
  "Love it, thanks! So tell me — what can I help you figure out?",
];

const REASK_INTROS = [
  "Oh, one thing I forgot to ask earlier —",
  "By the way, I'm still curious —",
  "Quick thing before I forget —",
  "Oh, and I meant to ask —",
];

/**
 * Pick a random message from an array for natural variation
 */
function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Get a friendly intro for the first qualifying question
 */
function getFirstQuestionMessage(question: string): string {
  return `${pickRandom(FIRST_QUESTION_INTROS)} ${question}`;
}

/**
 * Get a warm transition to the next qualifying question
 */
function getNextQuestionMessage(question: string, isLastQuestion: boolean): string {
  if (isLastQuestion) {
    return `${pickRandom(ANSWER_ACKNOWLEDGMENTS)} Last one — ${question}`;
  }
  return `${pickRandom(NEXT_QUESTION_TRANSITIONS)} ${question}`;
}

/**
 * Get a friendly skip-to-next message
 */
function getSkipMessage(question: string): string {
  return `${pickRandom(SKIP_TRANSITIONS)} ${question}`;
}

/**
 * Get a warm completion message when all questions are done
 */
function getQualifyingCompleteMessage(): string {
  return pickRandom(QUALIFYING_COMPLETE_MESSAGES);
}

/**
 * Get a natural re-ask intro for appending to chat responses
 */
export function getReaskIntro(question: string): string {
  return `${pickRandom(REASK_INTROS)} ${question}`;
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

    // 6. Classify user intent before extracting answer
    const classification = await classifyQualifyingIntent(currentQuestion.question, message);
    logger.info("Qualifying intent classification", {
      ...logCtx,
      intent: classification.intent,
      confidence: classification.confidence,
      reason: classification.reason
    });

    // 7. Handle based on intent
    if (classification.intent === "new_question" && classification.confidence >= 0.7) {
      // Check for embedded answer before pausing
      // Example: "We have 500 orders, but what's your refund policy?"
      const embeddedAnswer = await extractEmbeddedAnswer(currentQuestion.question, message);

      if (embeddedAnswer && embeddedAnswer.confidence > 0.6) {
        // User provided an answer AND asked a new question - capture the answer
        logger.info("Extracted embedded answer from new_question", {
          ...logCtx,
          answer: embeddedAnswer.answer,
          confidence: embeddedAnswer.confidence,
        });

        // Save the embedded answer
        await saveQualifyingAnswer(customer.id, projectId, state, {
          question: currentQuestion.question,
          answer: embeddedAnswer.answer,
          raw_response: `[Embedded in: ${message}]`,
        });

        // Check if there are more questions
        const nextIndex = currentIndex + 1;

        if (nextIndex < enabledQuestions.length) {
          // More questions - move to next (don't re-ask current since we got answer)
          const nextQuestion = enabledQuestions[nextIndex];

          const updatedState: LeadCaptureState = {
            ...state,
            current_qualifying_index: nextIndex,
            qualifying_answers: [
              ...state.qualifying_answers,
              { question: currentQuestion.question, answer: embeddedAnswer.answer, raw_response: `[Embedded in: ${message}]` },
            ],
            qualifying_paused: true, // Still pause to let their question be answered
            qualifying_retry_count: 0,
          };

          await supabaseAdmin
            .from("customers")
            .update({ lead_capture_state: updatedState })
            .eq("id", customer.id);

          // Return null to let chat handle their question
          // The re-ask hook will ask the NEXT question, not re-ask this one
          return null;
        } else {
          // No more questions - mark as qualified, but still let their question be answered
          await markAsQualified(customer.id, projectId);

          // Return null so their question gets answered
          return null;
        }
      }

      // No embedded answer found - use existing pause logic
      const updatedState: LeadCaptureState = {
        ...state,
        qualifying_paused: true,
        qualifying_retry_count: state.qualifying_retry_count || 0,
      };

      await supabaseAdmin
        .from("customers")
        .update({ lead_capture_state: updatedState })
        .eq("id", customer.id);

      logger.info("Qualifying paused - user asked new question", logCtx);
      return null; // Let normal chat flow handle their question
    }

    if (classification.intent === "off_topic") {
      // User is going off-topic - skip this question gracefully
      logger.info("Skipping qualifying question - off-topic response", logCtx);
      return await skipCurrentQualifyingQuestion(customer.id, projectId, state, enabledQuestions);
    }

    // 8. Intent is "answer" (or low-confidence new_question) - extract and save answer
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

      // Update state with next index (also reset pause/retry state)
      const updatedState: LeadCaptureState = {
        ...state,
        current_qualifying_index: nextIndex,
        qualifying_answers: [
          ...state.qualifying_answers,
          { question: currentQuestion.question, answer: extracted.answer, raw_response: message },
        ],
        qualifying_paused: false,
        qualifying_retry_count: 0,
      };

      await supabaseAdmin
        .from("customers")
        .update({ lead_capture_state: updatedState })
        .eq("id", customer.id);

      const isLastQuestion = nextIndex === enabledQuestions.length - 1;
      return {
        response: getNextQuestionMessage(nextQuestion.question, isLastQuestion),
        sessionId,
      };
    }

    // All questions answered - mark as qualified
    await markAsQualified(customer.id, projectId);

    return {
      response: getQualifyingCompleteMessage(),
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
        qualifyingQuestion: getFirstQuestionMessage(firstQuestion.question),
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
        qualifyingQuestion: getFirstQuestionMessage(firstQuestion.question),
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

// ─── Intent Classification ───────────────────────────────────────────────────

type QualifyingIntent = "answer" | "new_question" | "off_topic";

interface IntentClassification {
  intent: QualifyingIntent;
  confidence: number;
  reason: string;
}

/**
 * Classify user's message intent during qualifying question flow.
 * Determines if user is answering the question, asking a new question, or going off-topic.
 */
async function classifyQualifyingIntent(
  question: string,
  userMessage: string
): Promise<IntentClassification> {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are classifying user messages in a chatbot conversation.
The chatbot just asked the user a qualifying question, and the user responded.
Classify the user's response into one of these categories:

1. "answer" - The user is providing an answer (direct or indirect) to the question asked. This includes partial answers, "I don't know" responses, or any attempt to address the question.
2. "new_question" - The user is asking a NEW question or making a request that is clearly unrelated to the qualifying question. Examples: asking about pricing, features, refund policy, how something works, etc.
3. "off_topic" - The user is going off-topic, expressing frustration, refusing to answer, or providing clearly irrelevant information without asking a new question.

Respond ONLY with valid JSON: {"intent": "answer" | "new_question" | "off_topic", "confidence": 0.0-1.0, "reason": "brief explanation"}`,
        },
        {
          role: "user",
          content: `Qualifying question: "${question}"
User's response: "${userMessage}"

Classification:`,
        },
      ],
      max_tokens: 100,
      temperature: 0,
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content || "{}";
    const result = JSON.parse(content);

    return {
      intent: result.intent || "answer",
      confidence: typeof result.confidence === "number" ? result.confidence : 0.5,
      reason: result.reason || "",
    };
  } catch (err) {
    logger.error("Failed to classify qualifying intent", err, { step: "classify_intent" });
    // Default to treating as answer on error (preserves existing behavior)
    return { intent: "answer", confidence: 0.5, reason: "classification_error" };
  }
}

/**
 * Skip the current qualifying question and move to the next one (or complete if none left).
 * Used when user goes off-topic or max retries reached.
 */
async function skipCurrentQualifyingQuestion(
  customerId: string,
  projectId: string,
  state: LeadCaptureState,
  enabledQuestions: Array<{ question: string; enabled: boolean }>
): Promise<InterceptorResult | null> {
  const currentIndex = state.current_qualifying_index;
  const currentQuestion = enabledQuestions[currentIndex];
  const nextIndex = currentIndex + 1;

  // Record the skipped question in answers (with "skipped" marker)
  const skippedAnswer: QualifyingAnswer = {
    question: currentQuestion?.question || "",
    answer: "[skipped]",
    raw_response: "[user went off-topic or max retries reached]",
  };

  if (nextIndex < enabledQuestions.length) {
    // More questions - skip to the next one
    const nextQuestion = enabledQuestions[nextIndex];

    const updatedState: LeadCaptureState = {
      ...state,
      current_qualifying_index: nextIndex,
      qualifying_answers: [...state.qualifying_answers, skippedAnswer],
      qualifying_paused: false,
      qualifying_retry_count: 0,
    };

    await supabaseAdmin
      .from("customers")
      .update({ lead_capture_state: updatedState })
      .eq("id", customerId);

    // Sync skipped answer to qualified_leads table
    await syncSkippedAnswerToLead(customerId, projectId, skippedAnswer);

    return {
      response: getSkipMessage(nextQuestion.question),
      sessionId: undefined,
    };
  }

  // No more questions - mark as qualified (even with skipped questions)
  const updatedState: LeadCaptureState = {
    ...state,
    qualifying_answers: [...state.qualifying_answers, skippedAnswer],
    qualifying_paused: false,
    qualifying_retry_count: 0,
  };

  await supabaseAdmin
    .from("customers")
    .update({ lead_capture_state: updatedState })
    .eq("id", customerId);

  // Sync skipped answer to qualified_leads table before marking as qualified
  await syncSkippedAnswerToLead(customerId, projectId, skippedAnswer);

  await markAsQualified(customerId, projectId);

  return {
    response: getQualifyingCompleteMessage(),
    sessionId: undefined,
  };
}

// ─── Re-ask Qualifying Question After Normal Chat ────────────────────────────

const MAX_QUALIFYING_RETRIES = 2;

/**
 * Check if a qualifying question needs to be re-asked after normal chat response.
 * Called from chat-engine after AI response is generated.
 */
export async function checkAndReaskQualifyingQuestion(
  projectId: string,
  visitorId: string
): Promise<{ shouldReask: boolean; question?: string }> {
  try {
    const customer = await getCustomerByVisitorId(projectId, visitorId);
    if (!customer?.lead_capture_state?.qualifying_paused) {
      return { shouldReask: false };
    }

    const state = customer.lead_capture_state;
    const retryCount = state.qualifying_retry_count || 0;

    // Check if max retries reached
    if (retryCount >= MAX_QUALIFYING_RETRIES) {
      // Too many retries - skip this question
      const v2Settings = await getLeadCaptureV2Settings(projectId);
      const enabledQuestions = v2Settings?.qualifying_questions.filter(q => q.enabled && q.question.trim()) || [];

      await skipCurrentQualifyingQuestion(customer.id, projectId, state, enabledQuestions);
      logger.info("Max retries reached, skipping qualifying question", { projectId, visitorId });
      return { shouldReask: false };
    }

    // Get current question
    const v2Settings = await getLeadCaptureV2Settings(projectId);
    const enabledQuestions = v2Settings?.qualifying_questions.filter(q => q.enabled && q.question.trim()) || [];
    const currentQuestion = enabledQuestions[state.current_qualifying_index];

    if (!currentQuestion) {
      return { shouldReask: false };
    }

    // Update state: unpause and increment retry count
    const updatedState: LeadCaptureState = {
      ...state,
      qualifying_paused: false,
      qualifying_retry_count: retryCount + 1,
    };

    await supabaseAdmin
      .from("customers")
      .update({ lead_capture_state: updatedState })
      .eq("id", customer.id);

    logger.info("Re-asking qualifying question after user question", {
      projectId,
      visitorId,
      retryCount: retryCount + 1,
      question: currentQuestion.question.substring(0, 50),
    });

    return { shouldReask: true, question: currentQuestion.question };
  } catch (err) {
    logger.error("Error checking for qualifying re-ask", err, { projectId, visitorId });
    return { shouldReask: false };
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
 * Sync a skipped answer to the qualified_leads table.
 * Similar to saveQualifyingAnswer but doesn't change status to "qualifying".
 */
async function syncSkippedAnswerToLead(
  customerId: string,
  projectId: string,
  answer: QualifyingAnswer
): Promise<void> {
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
