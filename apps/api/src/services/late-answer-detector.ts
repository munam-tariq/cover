/**
 * Late Answer Detector Service
 *
 * Detects and captures qualifying answers that users provide AFTER the
 * qualifying flow has been skipped or completed. This handles scenarios like:
 *
 * - User skips qualifying questions, then later mentions "we have 500 orders"
 * - User provides multiple answers in one message (answers Q1, Q2, Q3 at once)
 * - User answers out of order (provides Q2's answer while being asked Q1)
 *
 * Key features:
 * - Smart gating to minimize unnecessary AI calls
 * - Multi-question matching in single AI call
 * - Auto-promotion of high-confidence answers to replace "[skipped]"
 * - Non-blocking async processing
 */

import { openai } from "../lib/openai";
import { supabaseAdmin } from "../lib/supabase";
import { logger, type LogContext } from "../lib/logger";
import {
  getCustomerByVisitorId,
  getLeadCaptureV2Settings,
  type LeadCaptureState,
  type QualifyingAnswer,
} from "./lead-capture-v2";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LateQualifyingAnswer {
  question_index: number;
  question_text: string;
  answer: string;
  raw_message: string;
  confidence: number;
  capture_type: "late_single" | "embedded" | "multi_answer" | "out_of_order" | "return_visit";
  captured_at: string;
  promoted: boolean;
}

interface ScanContext {
  projectId: string;
  visitorId: string;
  customerId: string;
  qualifiedLeadId: string | null;
  message: string;
  skippedQuestions: Array<{ index: number; question: string }>;
  allQuestions: Array<{ index: number; question: string; currentAnswer: string | null }>;
}

interface DetectedAnswer {
  questionIndex: number;
  questionText: string;
  answer: string;
  confidence: number;
}

interface GateResult {
  shouldScan: boolean;
  context: ScanContext | null;
  reason: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const AUTO_PROMOTE_THRESHOLD = 0.7;
const MIN_MESSAGE_LENGTH = 15;

// Regex patterns for answer indicators
const ANSWER_INDICATORS_REGEX = /\d+|\b(we|our|company|business|team|employees|orders|monthly|yearly|annually|clients|customers|users|products|services)\b/i;

// Regex patterns for refusal (don't scan these)
const REFUSAL_REGEX = /\b(don't want|won't share|private|confidential|not telling|none of your|skip|pass)\b/i;

// ─── Gating Logic ─────────────────────────────────────────────────────────────

/**
 * Smart gating to determine if we should scan this message for late answers.
 * Designed to fail fast and avoid unnecessary AI calls.
 */
export async function shouldScanForLateAnswers(
  projectId: string,
  visitorId: string,
  message: string
): Promise<GateResult> {
  const logCtx: LogContext = { projectId, visitorId, step: "late_answer_gate" };

  // Gate 1: Message length (skip "ok", "thanks", "yes", etc.)
  if (message.trim().length < MIN_MESSAGE_LENGTH) {
    return { shouldScan: false, context: null, reason: "message_too_short" };
  }

  // Gate 2: Check for refusal patterns (respect user's privacy)
  if (REFUSAL_REGEX.test(message)) {
    return { shouldScan: false, context: null, reason: "refusal_detected" };
  }

  // Gate 3: Check for answer indicators (numbers, company words)
  if (!ANSWER_INDICATORS_REGEX.test(message)) {
    return { shouldScan: false, context: null, reason: "no_answer_indicators" };
  }

  // Gate 4: Get customer state (requires DB call)
  const customer = await getCustomerByVisitorId(projectId, visitorId);
  if (!customer?.lead_capture_state) {
    return { shouldScan: false, context: null, reason: "no_lead_capture_state" };
  }

  const state = customer.lead_capture_state;

  // Gate 5: Not currently in qualifying flow (interceptor handles that)
  if (state.qualifying_status === "in_progress") {
    return { shouldScan: false, context: null, reason: "qualifying_in_progress" };
  }

  // Gate 6: Must have qualifying answers array
  if (!state.qualifying_answers || state.qualifying_answers.length === 0) {
    return { shouldScan: false, context: null, reason: "no_qualifying_answers" };
  }

  // Gate 7: Has skipped/missing answers to capture
  const hasSkipped = state.qualifying_answers.some(
    (a) => a.answer === "[skipped]" || a.answer === "N/A"
  );
  if (!hasSkipped) {
    return { shouldScan: false, context: null, reason: "no_skipped_answers" };
  }

  // Get project settings to get all questions
  const v2Settings = await getLeadCaptureV2Settings(projectId);
  if (!v2Settings) {
    return { shouldScan: false, context: null, reason: "no_v2_settings" };
  }

  // Get qualified lead ID
  const { data: lead } = await supabaseAdmin
    .from("qualified_leads")
    .select("id")
    .eq("customer_id", customer.id)
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  // Build context for scanning
  const enabledQuestions = v2Settings.qualifying_questions
    .filter((q) => q.enabled && q.question.trim())
    .map((q, idx) => ({
      index: idx,
      question: q.question,
    }));

  const skippedQuestions = state.qualifying_answers
    .filter((a) => a.answer === "[skipped]" || a.answer === "N/A")
    .map((a) => {
      const idx = enabledQuestions.findIndex((q) => q.question === a.question);
      return { index: idx, question: a.question };
    })
    .filter((q) => q.index !== -1);

  const allQuestions = state.qualifying_answers.map((a, idx) => ({
    index: idx,
    question: a.question,
    currentAnswer: a.answer,
  }));

  const context: ScanContext = {
    projectId,
    visitorId,
    customerId: customer.id,
    qualifiedLeadId: lead?.id || null,
    message,
    skippedQuestions,
    allQuestions,
  };

  logger.info("Late answer scan gate passed", {
    ...logCtx,
    skippedCount: skippedQuestions.length,
  });

  return { shouldScan: true, context, reason: "gates_passed" };
}

// ─── AI Question Matching ─────────────────────────────────────────────────────

/**
 * Use AI to match user's message against qualifying questions.
 * Checks ALL skipped questions in a single API call.
 */
async function matchAnswersToQuestions(
  message: string,
  questions: Array<{ index: number; question: string }>
): Promise<DetectedAnswer[]> {
  if (questions.length === 0) return [];

  try {
    const questionsText = questions
      .map((q, i) => `${i + 1}. [Q${q.index}] ${q.question}`)
      .join("\n");

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Analyze if this message contains answers to any of these business qualification questions.

QUESTIONS:
${questionsText}

Return ONLY a JSON object with "answers" array:
{"answers": [{ "questionIndex": <number from Q#>, "answer": "<extracted answer>", "confidence": <0.0-1.0> }]}

Rules:
- Only include questions where you found a clear, relevant answer
- Extract clean, normalized answers (e.g., "500" not "about five hundred")
- Confidence should reflect how certain you are this answers THAT specific question
- If message contains a question AND an answer, still extract the answer part
- Return empty array if no answers found: {"answers": []}`,
        },
        {
          role: "user",
          content: message,
        },
      ],
      max_tokens: 300,
      temperature: 0,
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content || '{"answers": []}';
    const result = JSON.parse(content);
    const answers = result.answers || [];

    // Map back to full question text
    return answers.map((a: { questionIndex: number; answer: string; confidence: number }) => {
      const q = questions.find((q) => q.index === a.questionIndex);
      return {
        questionIndex: a.questionIndex,
        questionText: q?.question || "",
        answer: a.answer,
        confidence: a.confidence,
      };
    }).filter((a: DetectedAnswer) => a.questionText && a.answer && a.confidence > 0.5);
  } catch (err) {
    logger.error("Failed to match answers to questions", err, { step: "late_answer_match" });
    return [];
  }
}

// ─── Save and Promote Logic ───────────────────────────────────────────────────

/**
 * Save detected late answers and auto-promote high-confidence ones.
 */
async function saveLateAnswers(
  answers: DetectedAnswer[],
  context: ScanContext,
  captureType: LateQualifyingAnswer["capture_type"]
): Promise<void> {
  const logCtx: LogContext = {
    projectId: context.projectId,
    visitorId: context.visitorId,
    step: "late_answer_save",
  };

  if (!context.qualifiedLeadId) {
    logger.warn("No qualified lead ID, cannot save late answers", logCtx);
    return;
  }

  for (const answer of answers) {
    const lateAnswer: LateQualifyingAnswer = {
      question_index: answer.questionIndex,
      question_text: answer.questionText,
      answer: answer.answer,
      raw_message: context.message,
      confidence: answer.confidence,
      capture_type: captureType,
      captured_at: new Date().toISOString(),
      promoted: false,
    };

    // 1. Append to late_qualifying_answers array
    const { data: lead } = await supabaseAdmin
      .from("qualified_leads")
      .select("late_qualifying_answers, qualifying_answers")
      .eq("id", context.qualifiedLeadId)
      .single();

    if (!lead) {
      logger.warn("Qualified lead not found", { ...logCtx, leadId: context.qualifiedLeadId });
      continue;
    }

    const lateAnswers = (lead.late_qualifying_answers as LateQualifyingAnswer[]) || [];
    lateAnswers.push(lateAnswer);

    await supabaseAdmin
      .from("qualified_leads")
      .update({ late_qualifying_answers: lateAnswers })
      .eq("id", context.qualifiedLeadId);

    logger.info("Saved late qualifying answer", {
      ...logCtx,
      questionIndex: answer.questionIndex,
      confidence: answer.confidence,
      captureType,
    });

    // 2. Auto-promote if high confidence and original was skipped
    if (answer.confidence >= AUTO_PROMOTE_THRESHOLD) {
      await promoteAnswer(context, answer, lateAnswers.length - 1);
    }
  }
}

/**
 * Promote a late answer to replace the "[skipped]" answer in primary qualifying_answers.
 */
async function promoteAnswer(
  context: ScanContext,
  answer: DetectedAnswer,
  lateAnswerIndex: number
): Promise<void> {
  const logCtx: LogContext = {
    projectId: context.projectId,
    visitorId: context.visitorId,
    step: "late_answer_promote",
  };

  if (!context.qualifiedLeadId) return;

  try {
    // Get current qualifying_answers
    const { data: lead } = await supabaseAdmin
      .from("qualified_leads")
      .select("qualifying_answers, late_qualifying_answers")
      .eq("id", context.qualifiedLeadId)
      .single();

    if (!lead) return;

    const qualifyingAnswers = (lead.qualifying_answers as QualifyingAnswer[]) || [];
    const lateAnswers = (lead.late_qualifying_answers as LateQualifyingAnswer[]) || [];

    // Find the matching question in primary answers
    const targetIdx = qualifyingAnswers.findIndex(
      (a) => a.question === answer.questionText
    );

    if (targetIdx === -1) {
      logger.warn("Question not found in qualifying_answers", {
        ...logCtx,
        question: answer.questionText.substring(0, 50),
      });
      return;
    }

    // Only promote if original was skipped
    if (qualifyingAnswers[targetIdx].answer !== "[skipped]" &&
        qualifyingAnswers[targetIdx].answer !== "N/A") {
      logger.info("Original answer exists, not promoting", {
        ...logCtx,
        originalAnswer: qualifyingAnswers[targetIdx].answer,
      });
      return;
    }

    // Update the primary answer
    qualifyingAnswers[targetIdx].answer = answer.answer;
    qualifyingAnswers[targetIdx].raw_response = `[Late capture] ${context.message}`;

    // Mark late answer as promoted
    if (lateAnswers[lateAnswerIndex]) {
      lateAnswers[lateAnswerIndex].promoted = true;
    }

    // Save both updates
    await supabaseAdmin
      .from("qualified_leads")
      .update({
        qualifying_answers: qualifyingAnswers,
        late_qualifying_answers: lateAnswers,
      })
      .eq("id", context.qualifiedLeadId);

    // Also update customer state if it exists
    const { data: customer } = await supabaseAdmin
      .from("customers")
      .select("lead_capture_state")
      .eq("id", context.customerId)
      .single();

    if (customer?.lead_capture_state) {
      const state = customer.lead_capture_state as LeadCaptureState;
      if (state.qualifying_answers) {
        const customerAnswerIdx = state.qualifying_answers.findIndex(
          (a) => a.question === answer.questionText
        );
        if (customerAnswerIdx !== -1) {
          state.qualifying_answers[customerAnswerIdx].answer = answer.answer;
          state.qualifying_answers[customerAnswerIdx].raw_response = `[Late capture] ${context.message}`;

          await supabaseAdmin
            .from("customers")
            .update({ lead_capture_state: state })
            .eq("id", context.customerId);
        }
      }
    }

    logger.info("Promoted late answer to primary", {
      ...logCtx,
      questionIndex: answer.questionIndex,
      answer: answer.answer,
    });
  } catch (err) {
    logger.error("Failed to promote late answer", err, logCtx);
  }
}

// ─── Main Entry Point ─────────────────────────────────────────────────────────

/**
 * Main entry point for late answer detection.
 * Called from chat-engine after each message (async, non-blocking).
 */
export async function scanAndSaveLateAnswers(
  projectId: string,
  visitorId: string,
  message: string
): Promise<void> {
  const logCtx: LogContext = { projectId, visitorId, step: "late_answer_scan" };

  try {
    // Check if we should scan
    const gateResult = await shouldScanForLateAnswers(projectId, visitorId, message);

    if (!gateResult.shouldScan || !gateResult.context) {
      // Most messages will exit here - this is expected
      return;
    }

    // Scan for answers to skipped questions
    const detectedAnswers = await matchAnswersToQuestions(
      message,
      gateResult.context.skippedQuestions
    );

    if (detectedAnswers.length === 0) {
      logger.info("No late answers detected", logCtx);
      return;
    }

    // Determine capture type
    const captureType: LateQualifyingAnswer["capture_type"] =
      detectedAnswers.length > 1 ? "multi_answer" : "late_single";

    // Save and potentially promote
    await saveLateAnswers(detectedAnswers, gateResult.context, captureType);

    logger.info("Late answer scan completed", {
      ...logCtx,
      detectedCount: detectedAnswers.length,
      captureType,
    });
  } catch (err) {
    logger.error("Late answer scan failed", err, logCtx);
  }
}

// ─── Embedded Answer Extraction ───────────────────────────────────────────────

/**
 * Extract an embedded answer from a message that also contains a question.
 * Used by the V2 interceptor when intent = "new_question".
 *
 * Example: "We have 500 orders, but what's your refund policy?"
 * -> Extracts "500" as the answer to the order count question
 */
export async function extractEmbeddedAnswer(
  question: string,
  userMessage: string
): Promise<{ answer: string; confidence: number } | null> {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `The user's message contains BOTH:
1. An answer to a qualifying question
2. A new question they're asking

Extract ONLY the answer part that responds to the qualifying question.

Qualifying question: "${question}"

Return JSON: {"hasAnswer": boolean, "answer": "extracted answer or null", "confidence": 0.0-1.0}

Rules:
- If no relevant answer found, return {"hasAnswer": false, "answer": null, "confidence": 0}
- Extract clean, normalized answers
- Confidence reflects how clearly this answers the qualifying question`,
        },
        {
          role: "user",
          content: userMessage,
        },
      ],
      max_tokens: 100,
      temperature: 0,
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content || "{}";
    const result = JSON.parse(content);

    if (result.hasAnswer && result.answer && result.confidence > 0.5) {
      return {
        answer: result.answer,
        confidence: result.confidence,
      };
    }

    return null;
  } catch (err) {
    logger.error("Failed to extract embedded answer", err, { step: "embedded_answer" });
    return null;
  }
}
