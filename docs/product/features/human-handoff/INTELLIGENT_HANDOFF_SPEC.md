# Intelligent Handoff - Complete Implementation Specification

**Version:** 1.0
**Created:** 2026-01-23
**Status:** Ready for Implementation
**Priority:** P0 - Critical

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Problem Statement](#2-problem-statement)
3. [Solution Overview](#3-solution-overview)
4. [Detailed Architecture](#4-detailed-architecture)
5. [File Changes](#5-file-changes)
6. [Implementation Steps](#6-implementation-steps)
7. [Data Structures](#7-data-structures)
8. [API Contracts](#8-api-contracts)
9. [Edge Cases](#9-edge-cases)
10. [Error Handling](#10-error-handling)
11. [Performance Requirements](#11-performance-requirements)
12. [Test Cases](#12-test-cases)
13. [Unit Tests](#13-unit-tests)
14. [Integration Tests](#14-integration-tests)
15. [Rollback Plan](#15-rollback-plan)
16. [Monitoring & Logging](#16-monitoring--logging)

---

## 1. Executive Summary

Replace keyword-based handoff detection with LLM-powered intelligent classification that:
- Detects user intent (human request, question, complaint)
- Analyzes sentiment (positive, neutral, negative, frustrated, angry)
- Assesses urgency (low, medium, high, critical)
- Makes escalation decisions based on all signals

**Key Benefit:** Catches frustrated/angry users who don't use magic words like "talk to human".

**Cost:** ~$0.002 per message (~$2 per 1,000 messages)

**Latency Impact:** 0ms added (runs in parallel with RAG embedding)

---

## 2. Problem Statement

### Current Behavior
```
User: "This is ridiculous, I've asked 5 times!"
Bot: [Normal AI response - no escalation]

User: "My account was hacked and money is missing"
Bot: [Normal AI response - no escalation]

User: "talk to human" (exact match)
Bot: [Triggers handoff]
```

### Desired Behavior
```
User: "This is ridiculous, I've asked 5 times!"
Bot: [Escalate - sentiment: frustrated]

User: "My account was hacked and money is missing"
Bot: [Escalate - urgency: critical]

User: "i wana talk to human support agnet" (typos)
Bot: [Escalate - intent: human_request]
```

### Root Cause
- Current system uses exact string matching
- No semantic understanding
- No sentiment analysis
- No urgency detection
- Typos break detection

---

## 3. Solution Overview

### Before (Sequential)
```
Message → Validate → KEYWORD CHECK (blocking) → RAG → Low Confidence → LLM → Response
```

### After (Parallel)
```
Message → Validate → ┌─ CLASSIFY (gpt-4o-mini) ─┐ → Evaluate → RAG Search → LLM → Response
                     └─ EMBED (text-embedding) ──┘
                           ~150ms parallel
```

### Classification Output
```typescript
{
  intent: "human_request" | "question" | "complaint" | "feedback" | "greeting" | "other",
  sentiment: "positive" | "neutral" | "negative" | "frustrated" | "angry",
  urgency: "low" | "medium" | "high" | "critical",
  shouldEscalate: boolean,
  reason?: string
}
```

### Escalation Rules
```
shouldEscalate = true IF ANY:
  - intent === "human_request"
  - sentiment === "frustrated" OR sentiment === "angry"
  - urgency === "high" OR urgency === "critical"
```

---

## 4. Detailed Architecture

### 4.1 Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              processChat()                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. const sanitizedMessage = sanitizeUserInput(input.message);               │
│                                                                              │
│  2. // Check existing handoff state                                          │
│     const handoffState = await checkConversationHandoffState(...);           │
│     if (handoffState.skipAI) return { response: "", ... };                   │
│                                                                              │
│  3. // Get project config                                                    │
│     const project = await getProjectConfig(input.projectId);                 │
│                                                                              │
│  4. // PARALLEL: Classification + Embedding                                  │
│     const [classification, queryEmbedding] = await Promise.all([             │
│       classifyMessage(sanitizedMessage),           // ~150ms, ~$0.002        │
│       embedQuery(sanitizedMessage),                // ~100ms, ~$0.0001       │
│     ]);                                                                      │
│                                                                              │
│  5. // Evaluate classification result                                        │
│     if (classification.shouldEscalate) {                                     │
│       return handleIntelligentHandoff({                                      │
│         projectId, visitorId, sessionId,                                     │
│         classification,                                                      │
│         sanitizedMessage,                                                    │
│       });                                                                    │
│     }                                                                        │
│                                                                              │
│  6. // Continue with RAG using pre-computed embedding                        │
│     const ragResult = await searchWithEmbedding(                             │
│       queryEmbedding,                                                        │
│       input.projectId,                                                       │
│       { topK: 5, threshold: 0.15 }                                           │
│     );                                                                       │
│                                                                              │
│  7. // LLM call with RAG context                                             │
│     const llmResponse = await callLLMWithTools(...);                         │
│                                                                              │
│  8. // Lead capture check                                                    │
│     ...                                                                      │
│                                                                              │
│  9. return { response, sessionId, sources, ... };                            │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Classification Prompt

```
You are a customer support message classifier. Analyze the message and return JSON.

ESCALATION RULES (shouldEscalate = true):
1. User explicitly asks for human/agent/representative/support person
2. User sentiment is "frustrated" or "angry" (showing clear displeasure)
3. Urgency is "high" or "critical" (security breach, money loss, legal threat)
4. Message indicates repeated failed attempts ("I've asked before", "third time asking")

INTENT CATEGORIES:
- human_request: User wants to talk to a human
- question: User is asking a question
- complaint: User is complaining about something
- feedback: User is providing feedback
- greeting: User is saying hello/hi
- other: Doesn't fit above categories

SENTIMENT LEVELS:
- positive: Happy, satisfied, grateful
- neutral: No strong emotion
- negative: Slightly unhappy or disappointed
- frustrated: Clearly upset, exasperated
- angry: Very upset, hostile, threatening

URGENCY LEVELS:
- low: General questions, no time pressure
- medium: Wants timely response but not urgent
- high: Account issues, billing problems, service disruption
- critical: Security breach, unauthorized access, money stolen, legal threats

Message: """
{message}
"""

Return ONLY valid JSON:
{"intent":"...","sentiment":"...","urgency":"...","shouldEscalate":true/false,"reason":"brief reason if escalating"}
```

### 4.3 Handoff Flow After Classification

```
shouldEscalate = true
        │
        ▼
┌───────────────────┐
│ Get HandoffSettings│
│ (for hours/agents) │
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐    NO     ┌────────────────────────────────────┐
│ handoff.enabled?  │──────────►│ Return acknowledgment message:     │
└─────────┬─────────┘           │ "I understand you'd like to speak  │
          │ YES                 │ with a human agent. Unfortunately, │
          ▼                     │ live support isn't available..."   │
┌───────────────────┐           └────────────────────────────────────┘
│ Within business   │    NO     ┌────────────────────────────────────┐
│ hours?            │──────────►│ "Team is currently offline..."     │
└─────────┬─────────┘           └────────────────────────────────────┘
          │ YES
          ▼
┌───────────────────┐    NO     ┌────────────────────────────────────┐
│ Agents available? │──────────►│ "Team is currently unavailable..." │
└─────────┬─────────┘           └────────────────────────────────────┘
          │ YES
          ▼
┌───────────────────┐   YES     ┌────────────────────────────────────┐
│ Previous agent    │──────────►│ Direct assignment to previous agent│
│ available?        │           │ status → agent_active               │
└─────────┬─────────┘           └────────────────────────────────────┘
          │ NO
          ▼
┌───────────────────┐
│ Add to queue      │
│ status → waiting  │
│ Return queue pos  │
└───────────────────┘
```

---

## 5. File Changes

### 5.1 New Files to Create

| File | Purpose |
|------|---------|
| `apps/api/src/services/intelligent-handoff.ts` | Classification service |
| `apps/api/src/services/__tests__/intelligent-handoff.test.ts` | Unit tests |

### 5.2 Files to Modify

| File | Changes |
|------|---------|
| `apps/api/src/services/chat-engine.ts` | Replace keyword check with parallel classification |
| `apps/api/src/services/handoff-trigger.ts` | Add `handleIntelligentHandoff()` function |
| `apps/api/src/services/rag/embedder.ts` | Export `embedQuery()` for direct use |
| `apps/api/src/lib/openai.ts` | (Optional) Add `classifyMessage()` helper |

### 5.3 Files to Keep Unchanged

| File | Reason |
|------|--------|
| `apps/api/src/services/handoff-trigger.ts` | Keep `executeHandoffFlow()`, `checkAgentAvailability()`, `isWithinBusinessHours()`, `createHandoffConversation()` |
| Database schema | No changes needed |
| Widget | No changes needed |
| Dashboard | No changes needed |

### 5.4 Code to Remove

| File | What to Remove |
|------|----------------|
| `apps/api/src/services/handoff-trigger.ts` | `DEFAULT_HUMAN_INTENT_KEYWORDS` (lines 22-40) |
| `apps/api/src/services/handoff-trigger.ts` | `checkKeywordTrigger()` function (lines 368-382) |
| `apps/api/src/services/chat-engine.ts` | `checkHandoffTrigger()` call at line 221-226 |
| `apps/api/src/services/chat-engine.ts` | `checkLowConfidenceHandoff()` call (optional - can merge into classification) |

---

## 6. Implementation Steps

### Step 1: Create `intelligent-handoff.ts`

```typescript
// apps/api/src/services/intelligent-handoff.ts

import { openai } from "../lib/openai";
import { logger } from "../lib/logger";

// ============================================================================
// TYPES
// ============================================================================

export type Intent =
  | "human_request"
  | "question"
  | "complaint"
  | "feedback"
  | "greeting"
  | "other";

export type Sentiment =
  | "positive"
  | "neutral"
  | "negative"
  | "frustrated"
  | "angry";

export type Urgency =
  | "low"
  | "medium"
  | "high"
  | "critical";

export interface MessageClassification {
  intent: Intent;
  sentiment: Sentiment;
  urgency: Urgency;
  shouldEscalate: boolean;
  reason?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const CLASSIFICATION_PROMPT = `You are a customer support message classifier. Analyze the message and return JSON.

ESCALATION RULES (shouldEscalate = true):
1. User explicitly asks for human/agent/representative/support person
2. User sentiment is "frustrated" or "angry" (showing clear displeasure)
3. Urgency is "high" or "critical" (security breach, money loss, legal threat)
4. Message indicates repeated failed attempts ("I've asked before", "third time asking")

INTENT CATEGORIES:
- human_request: User wants to talk to a human
- question: User is asking a question
- complaint: User is complaining about something
- feedback: User is providing feedback
- greeting: User is saying hello/hi
- other: Doesn't fit above categories

SENTIMENT LEVELS:
- positive: Happy, satisfied, grateful
- neutral: No strong emotion
- negative: Slightly unhappy or disappointed
- frustrated: Clearly upset, exasperated
- angry: Very upset, hostile, threatening

URGENCY LEVELS:
- low: General questions, no time pressure
- medium: Wants timely response but not urgent
- high: Account issues, billing problems, service disruption
- critical: Security breach, unauthorized access, money stolen, legal threats

Message: """
{message}
"""

Return ONLY valid JSON:
{"intent":"...","sentiment":"...","urgency":"...","shouldEscalate":true/false,"reason":"brief reason if escalating"}`;

const DEFAULT_CLASSIFICATION: MessageClassification = {
  intent: "other",
  sentiment: "neutral",
  urgency: "low",
  shouldEscalate: false,
};

// Timeout for classification call (ms)
const CLASSIFICATION_TIMEOUT = 5000;

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Classify a customer message using GPT-4o-mini
 *
 * @param message - The sanitized user message
 * @returns Classification result with intent, sentiment, urgency, and escalation decision
 *
 * @example
 * const result = await classifyMessage("I want to talk to a human");
 * // { intent: "human_request", sentiment: "neutral", urgency: "low", shouldEscalate: true, reason: "explicit human request" }
 *
 * @example
 * const result = await classifyMessage("This is ridiculous!!!");
 * // { intent: "complaint", sentiment: "frustrated", urgency: "medium", shouldEscalate: true, reason: "user is frustrated" }
 */
export async function classifyMessage(
  message: string
): Promise<MessageClassification> {
  const startTime = Date.now();
  const logContext = { step: "intelligent_classification" };

  // Edge case: Empty message
  if (!message || message.trim().length === 0) {
    logger.warn("Classification called with empty message", logContext);
    return DEFAULT_CLASSIFICATION;
  }

  // Edge case: Very long message - truncate to avoid token limits
  const truncatedMessage = message.length > 2000
    ? message.substring(0, 2000) + "..."
    : message;

  try {
    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CLASSIFICATION_TIMEOUT);

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: CLASSIFICATION_PROMPT.replace("{message}", truncatedMessage),
        },
      ],
      max_tokens: 150,
      temperature: 0,
      response_format: { type: "json_object" },
    });

    clearTimeout(timeoutId);

    const content = response.choices[0]?.message?.content;

    if (!content) {
      logger.warn("Classification returned empty content", logContext);
      return DEFAULT_CLASSIFICATION;
    }

    const result = parseClassificationResult(content);

    logger.info("Message classified", {
      ...logContext,
      latencyMs: Date.now() - startTime,
      intent: result.intent,
      sentiment: result.sentiment,
      urgency: result.urgency,
      shouldEscalate: result.shouldEscalate,
      reason: result.reason,
      tokensUsed: response.usage?.total_tokens,
    });

    return result;

  } catch (error: unknown) {
    const latencyMs = Date.now() - startTime;

    // Check if it was a timeout
    if (error instanceof Error && error.name === "AbortError") {
      logger.error("Classification timed out", error, {
        ...logContext,
        latencyMs,
        timeout: CLASSIFICATION_TIMEOUT,
      });
    } else {
      logger.error("Classification failed", error, {
        ...logContext,
        latencyMs,
      });
    }

    // Safe default: don't escalate on failure
    return DEFAULT_CLASSIFICATION;
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Parse and validate the classification JSON response
 */
function parseClassificationResult(content: string): MessageClassification {
  try {
    const parsed = JSON.parse(content);

    // Validate and normalize each field
    const intent = validateIntent(parsed.intent);
    const sentiment = validateSentiment(parsed.sentiment);
    const urgency = validateUrgency(parsed.urgency);
    const shouldEscalate = typeof parsed.shouldEscalate === "boolean"
      ? parsed.shouldEscalate
      : calculateShouldEscalate(intent, sentiment, urgency);
    const reason = typeof parsed.reason === "string" ? parsed.reason : undefined;

    return { intent, sentiment, urgency, shouldEscalate, reason };
  } catch {
    logger.warn("Failed to parse classification JSON", { content });
    return DEFAULT_CLASSIFICATION;
  }
}

function validateIntent(value: unknown): Intent {
  const validIntents: Intent[] = [
    "human_request", "question", "complaint", "feedback", "greeting", "other"
  ];
  return validIntents.includes(value as Intent) ? (value as Intent) : "other";
}

function validateSentiment(value: unknown): Sentiment {
  const validSentiments: Sentiment[] = [
    "positive", "neutral", "negative", "frustrated", "angry"
  ];
  return validSentiments.includes(value as Sentiment) ? (value as Sentiment) : "neutral";
}

function validateUrgency(value: unknown): Urgency {
  const validUrgencies: Urgency[] = ["low", "medium", "high", "critical"];
  return validUrgencies.includes(value as Urgency) ? (value as Urgency) : "low";
}

/**
 * Calculate shouldEscalate if not provided by LLM
 * This is a fallback to ensure consistent escalation logic
 */
function calculateShouldEscalate(
  intent: Intent,
  sentiment: Sentiment,
  urgency: Urgency
): boolean {
  // Rule 1: Explicit human request
  if (intent === "human_request") return true;

  // Rule 2: Frustrated or angry sentiment
  if (sentiment === "frustrated" || sentiment === "angry") return true;

  // Rule 3: High or critical urgency
  if (urgency === "high" || urgency === "critical") return true;

  return false;
}

// ============================================================================
// EXPORTS FOR TESTING
// ============================================================================

export const _testing = {
  parseClassificationResult,
  validateIntent,
  validateSentiment,
  validateUrgency,
  calculateShouldEscalate,
  DEFAULT_CLASSIFICATION,
  CLASSIFICATION_PROMPT,
};
```

### Step 2: Modify `chat-engine.ts`

```typescript
// At the top, add import:
import { classifyMessage, type MessageClassification } from "./intelligent-handoff";
import { embedQuery } from "./rag";

// Replace the keyword check section (around line 220-264) with:

    // 2.5. PARALLEL: Classification + Embedding
    // This runs intelligent classification alongside RAG embedding
    // Total time: ~150ms (parallel, not sequential)
    const classificationStart = Date.now();

    const [classification, queryEmbedding] = await Promise.all([
      classifyMessage(sanitizedMessage),
      embedQuery(sanitizedMessage),
    ]);

    metrics.classificationTime = Date.now() - classificationStart;

    logger.info("Parallel classification + embedding completed", {
      ...logCtx,
      step: "parallel_processing",
      classificationTime: metrics.classificationTime,
      shouldEscalate: classification.shouldEscalate,
      intent: classification.intent,
      sentiment: classification.sentiment,
      urgency: classification.urgency,
    });

    // 2.6. Check if we should escalate to human
    if (classification.shouldEscalate) {
      const handoffResult = await handleIntelligentHandoff({
        projectId: input.projectId,
        visitorId: input.visitorId,
        sessionId: input.sessionId,
        classification,
        sanitizedMessage,
      });

      if (handoffResult.triggered) {
        // Get or create session for the handoff
        const sessionId = await getOrCreateSession(
          input.projectId,
          input.visitorId,
          input.sessionId,
          input.source || "widget",
          input.context
        );

        // Log the conversation
        logConversation(
          input.projectId,
          sessionId,
          sanitizedMessage,
          handoffResult.message,
          0,
          0,
          input.context,
          requestId
        ).catch((err) =>
          logger.error("Failed to log intelligent handoff conversation", err, logCtx)
        );

        return {
          response: handoffResult.message,
          sessionId,
          sources: [],
          toolCalls: [],
          processingTime: Date.now() - metrics.startTime,
          handoff: {
            triggered: true,
            reason: handoffResult.reason,
            classification, // Include classification data
            queuePosition: handoffResult.queuePosition,
            estimatedWait: handoffResult.estimatedWait,
            conversationId: handoffResult.conversationId,
          },
        };
      }
    }

    // 3. RAG Search using PRE-COMPUTED embedding
    const ragStart = Date.now();
    const ragResult = await searchWithEmbedding(
      queryEmbedding,
      input.projectId,
      {
        topK: 5,
        threshold: 0.15,
        useHybridSearch: true,
      }
    );
    retrievedChunks = ragResult.chunks;
    metrics.ragTime = Date.now() - ragStart;

    // ... rest of the function remains the same
```

### Step 3: Add `handleIntelligentHandoff` to `handoff-trigger.ts`

```typescript
// Add to handoff-trigger.ts

import { type MessageClassification } from "./intelligent-handoff";

/**
 * Message templates for intelligent handoff triggers
 */
const INTELLIGENT_MESSAGES: HandoffMessageTemplates = {
  offline:
    "I can see you need additional help. Our support team is currently offline, but please leave your message and we'll get back to you during business hours.",
  unavailable:
    "I understand this is important to you. Our support team is currently unavailable, but please leave your message and we'll respond as soon as possible.",
  technicalError:
    "I'd like to connect you with someone who can help. We're experiencing technical difficulties - please try again in a moment.",
  directAssignment:
    "I'm connecting you with a support agent who can help. They'll be with you shortly.",
  queued: (pos, wait) =>
    `I'm connecting you with a support agent. ${pos === 1 ? "You're next in line!" : `You're #${pos} in the queue.`} Estimated wait: ${wait}.`,
};

/**
 * Handle handoff triggered by intelligent classification
 */
export interface IntelligentHandoffParams {
  projectId: string;
  visitorId: string;
  sessionId?: string;
  classification: MessageClassification;
  sanitizedMessage: string;
}

export async function handleIntelligentHandoff(
  params: IntelligentHandoffParams
): Promise<HandoffTriggerResult> {
  const { projectId, visitorId, sessionId, classification, sanitizedMessage } = params;

  // Get handoff settings
  const settings = await getHandoffSettings(projectId);

  // Log the intelligent trigger
  logger.info("Intelligent handoff evaluation", {
    projectId,
    visitorId,
    sessionId,
    intent: classification.intent,
    sentiment: classification.sentiment,
    urgency: classification.urgency,
    reason: classification.reason,
    hasSettings: !!settings,
    handoffEnabled: settings?.enabled ?? false,
    step: "intelligent_handoff_trigger",
  });

  // If handoff not available, return acknowledgment
  if (!settings || !settings.enabled) {
    return {
      triggered: true,
      reason: "intelligent",
      message: getUnavailableMessage(classification),
    };
  }

  // Execute the standard handoff flow
  return executeHandoffFlow({
    projectId,
    visitorId,
    sessionId,
    reason: "intelligent",
    messages: INTELLIGENT_MESSAGES,
    settings,
  });
}

/**
 * Get appropriate message when handoff is not available
 * Personalizes based on classification
 */
function getUnavailableMessage(classification: MessageClassification): string {
  if (classification.intent === "human_request") {
    return "I understand you'd like to speak with a human agent. Unfortunately, live support isn't available right now. I'll do my best to help you - what can I assist you with?";
  }

  if (classification.sentiment === "frustrated" || classification.sentiment === "angry") {
    return "I can see this is frustrating for you, and I'm sorry about that. Our support team isn't available right now, but I'll do my best to help. Could you tell me more about what's happening?";
  }

  if (classification.urgency === "critical" || classification.urgency === "high") {
    return "I understand this is urgent. Our support team isn't available right now, but I'll try to help you immediately. Please tell me exactly what's happening so I can assist.";
  }

  return "I'd like to connect you with our support team, but they're currently unavailable. Let me try to help you directly - what can I assist you with?";
}
```

### Step 4: Add `searchWithEmbedding` to RAG retriever

```typescript
// Add to apps/api/src/services/rag/retriever.ts

/**
 * Search using a pre-computed embedding
 * Used when embedding is generated in parallel with classification
 */
export async function searchWithEmbedding(
  queryEmbedding: number[],
  projectId: string,
  options: RetrieveOptions = {}
): Promise<RetrieveResult> {
  const startTime = Date.now();
  const { topK = 5, threshold = 0.15, useHybridSearch = true } = options;

  // Vector search with pre-computed embedding
  const vectorResults = await vectorSearchWithEmbedding(queryEmbedding, projectId, topK * 3);

  // Full-text search (generates its own query)
  const ftsResults = useHybridSearch
    ? await ftsSearchRaw(/* query text needed */, projectId, topK * 3)
    : [];

  // ... rest of retrieval logic
}
```

---

## 7. Data Structures

### 7.1 MessageClassification

```typescript
interface MessageClassification {
  intent: "human_request" | "question" | "complaint" | "feedback" | "greeting" | "other";
  sentiment: "positive" | "neutral" | "negative" | "frustrated" | "angry";
  urgency: "low" | "medium" | "high" | "critical";
  shouldEscalate: boolean;
  reason?: string;
}
```

### 7.2 Updated HandoffTriggerResult

```typescript
interface HandoffTriggerResult {
  triggered: boolean;
  reason?: "keyword" | "button" | "low_confidence" | "intelligent";  // Added "intelligent"
  message: string;
  queuePosition?: number;
  estimatedWait?: string;
  conversationId?: string;
  classification?: MessageClassification;  // New field
}
```

### 7.3 Updated ChatOutput

```typescript
interface ChatOutput {
  response: string;
  sessionId: string;
  sources: SourceReference[];
  toolCalls: ToolCallInfo[];
  processingTime: number;
  tokensUsed?: { input: number; output: number };
  handoff?: {
    triggered: boolean;
    reason?: "keyword" | "button" | "low_confidence" | "intelligent";
    classification?: MessageClassification;  // New field
    queuePosition?: number;
    estimatedWait?: string;
    conversationId?: string;
  };
  leadCapture?: LeadCaptureState;
}
```

---

## 8. API Contracts

### 8.1 classifyMessage()

**Input:**
```typescript
message: string  // Sanitized user message (max 2000 chars)
```

**Output:**
```typescript
{
  intent: Intent,
  sentiment: Sentiment,
  urgency: Urgency,
  shouldEscalate: boolean,
  reason?: string
}
```

**Behavior:**
- Returns default classification on error (shouldEscalate: false)
- Truncates messages > 2000 characters
- Timeout: 5 seconds
- Uses gpt-4o-mini with temperature=0

### 8.2 handleIntelligentHandoff()

**Input:**
```typescript
{
  projectId: string,
  visitorId: string,
  sessionId?: string,
  classification: MessageClassification,
  sanitizedMessage: string
}
```

**Output:**
```typescript
HandoffTriggerResult
```

---

## 9. Edge Cases

### 9.1 Empty or Invalid Messages

| Case | Input | Expected Behavior |
|------|-------|-------------------|
| Empty string | `""` | Return default classification (no escalate) |
| Whitespace only | `"   "` | Return default classification (no escalate) |
| Very long message | 5000+ chars | Truncate to 2000 chars before classification |
| Unicode/emoji only | `"😭😭😭"` | Classify sentiment from emoji context |
| Mixed languages | `"Help me 请帮助我"` | Classify based on overall intent |

### 9.2 Classification Failures

| Case | Expected Behavior |
|------|-------------------|
| OpenAI API timeout (>5s) | Return default classification, log error |
| OpenAI API error (rate limit) | Return default classification, log error |
| Invalid JSON response | Return default classification, log warning |
| Missing fields in response | Use defaults for missing fields |
| Invalid enum values | Map to closest valid value or default |

### 9.3 Handoff Flow Edge Cases

| Case | Expected Behavior |
|------|-------------------|
| No handoff_settings row | Handoff disabled, return acknowledgment |
| Handoff disabled in settings | Return acknowledgment message |
| Outside business hours | Return offline message |
| No agents online | Return unavailable message |
| All agents at capacity | Add to queue, return queue position |
| Previous agent available | Direct assignment to previous agent |
| Classification says escalate but user seems fine | Trust classification, escalate anyway |

### 9.4 Parallel Processing Edge Cases

| Case | Expected Behavior |
|------|-------------------|
| Classification fails, embedding succeeds | Continue with RAG using embedding |
| Embedding fails, classification succeeds | Fail the request (need embedding for RAG) |
| Both fail | Return error to user |
| Classification much slower than embedding | Wait for both before proceeding |

### 9.5 Message Content Edge Cases

| Message | Expected Classification |
|---------|------------------------|
| `"talk to human"` | intent: human_request, shouldEscalate: true |
| `"i wana talk to humna agnet"` (typos) | intent: human_request, shouldEscalate: true |
| `"HELP ME NOW!!!"` | sentiment: frustrated/angry, shouldEscalate: true |
| `"This is the third time I'm asking"` | sentiment: frustrated, shouldEscalate: true |
| `"My account was hacked"` | urgency: critical, shouldEscalate: true |
| `"Someone stole $5000 from my account"` | urgency: critical, shouldEscalate: true |
| `"I'm going to sue you"` | urgency: high, shouldEscalate: true |
| `"What are your business hours?"` | intent: question, shouldEscalate: false |
| `"Thanks, that helped!"` | sentiment: positive, shouldEscalate: false |
| `"ok"` | intent: other, shouldEscalate: false |
| `"hello"` | intent: greeting, shouldEscalate: false |

---

## 10. Error Handling

### 10.1 Error Hierarchy

```typescript
// Classification errors - always fallback to default
ClassificationError
  ├── TimeoutError      → Log, return default
  ├── RateLimitError    → Log, return default
  ├── ParseError        → Log, return default
  └── NetworkError      → Log, return default

// Handoff errors - surface to user
HandoffError
  ├── SettingsError     → Log, continue without handoff
  ├── AgentCheckError   → Log, return unavailable message
  └── QueueError        → Log, return technical error message
```

### 10.2 Error Handling Code

```typescript
// In classifyMessage()
try {
  // ... classification logic
} catch (error) {
  if (error instanceof OpenAI.APIError) {
    if (error.status === 429) {
      logger.warn("Classification rate limited", { step: "classification_rate_limit" });
    } else {
      logger.error("OpenAI API error", error, { step: "classification_api_error" });
    }
  } else if (error instanceof Error && error.name === "AbortError") {
    logger.error("Classification timeout", error, { step: "classification_timeout" });
  } else {
    logger.error("Unexpected classification error", error, { step: "classification_error" });
  }
  return DEFAULT_CLASSIFICATION;
}
```

### 10.3 Graceful Degradation

```
Classification fails → Use default (no escalate) → Continue to RAG → Normal AI response
```

This ensures that classification failures don't break the chat flow.

---

## 11. Performance Requirements

### 11.1 Latency Targets

| Operation | Target | Max Acceptable |
|-----------|--------|----------------|
| classifyMessage() | 150ms | 500ms |
| embedQuery() | 100ms | 300ms |
| Parallel total | 150ms | 500ms |
| Full chat with classification | 1000ms | 2000ms |

### 11.2 Resource Limits

| Resource | Limit |
|----------|-------|
| Classification timeout | 5000ms |
| Max message length for classification | 2000 chars |
| Max tokens for classification response | 150 |
| Concurrent classification calls | Limited by OpenAI rate limits |

### 11.3 Cost Targets

| Metric | Target |
|--------|--------|
| Cost per classification | ~$0.002 |
| Cost per 1,000 messages | ~$2 |
| Monthly cost (100K messages) | ~$200 |

---

## 12. Test Cases

### 12.1 Classification Test Cases

| ID | Input | Expected Output | Notes |
|----|-------|-----------------|-------|
| C1 | "talk to human" | intent: human_request, shouldEscalate: true | Explicit request |
| C2 | "i want to speak with an agent" | intent: human_request, shouldEscalate: true | Explicit request |
| C3 | "let me talk to a real person" | intent: human_request, shouldEscalate: true | Explicit request |
| C4 | "i wana talk to humna agnet" | intent: human_request, shouldEscalate: true | Typos |
| C5 | "connect me with support" | intent: human_request, shouldEscalate: true | Implicit request |
| C6 | "This is ridiculous!!!" | sentiment: frustrated, shouldEscalate: true | Frustration |
| C7 | "I've asked this 5 times already" | sentiment: frustrated, shouldEscalate: true | Repeated attempts |
| C8 | "Your bot is completely useless" | sentiment: angry, shouldEscalate: true | Anger |
| C9 | "This is unacceptable" | sentiment: frustrated, shouldEscalate: true | Frustration |
| C10 | "I'm so frustrated with this" | sentiment: frustrated, shouldEscalate: true | Explicit frustration |
| C11 | "My account was hacked" | urgency: critical, shouldEscalate: true | Security |
| C12 | "Someone stole money from my account" | urgency: critical, shouldEscalate: true | Financial |
| C13 | "I'm going to sue you" | urgency: high, shouldEscalate: true | Legal threat |
| C14 | "My service has been down for 3 days" | urgency: high, shouldEscalate: true | Service disruption |
| C15 | "I need this fixed NOW" | urgency: medium, sentiment: frustrated | Urgency + frustration |
| C16 | "What are your business hours?" | intent: question, shouldEscalate: false | Normal question |
| C17 | "How do I reset my password?" | intent: question, shouldEscalate: false | Normal question |
| C18 | "Thanks, that helped!" | sentiment: positive, shouldEscalate: false | Positive |
| C19 | "Hello" | intent: greeting, shouldEscalate: false | Greeting |
| C20 | "ok" | intent: other, shouldEscalate: false | Acknowledgment |
| C21 | "" | Default classification | Empty |
| C22 | "   " | Default classification | Whitespace |
| C23 | "a".repeat(5000) | Truncated, classified | Long message |

### 12.2 Handoff Flow Test Cases

| ID | Scenario | Expected Outcome |
|----|----------|------------------|
| H1 | shouldEscalate=true, no settings | Acknowledgment message |
| H2 | shouldEscalate=true, handoff disabled | Acknowledgment message |
| H3 | shouldEscalate=true, outside hours | Offline message |
| H4 | shouldEscalate=true, no agents | Unavailable message |
| H5 | shouldEscalate=true, agents available | Queue with position |
| H6 | shouldEscalate=true, prev agent available | Direct assignment |
| H7 | shouldEscalate=false | Continue to RAG |
| H8 | Classification fails | Default to no escalate, continue to RAG |

### 12.3 Integration Test Cases

| ID | Scenario | Input | Expected |
|----|----------|-------|----------|
| I1 | Normal question | "What are your hours?" | AI response (no handoff) |
| I2 | Human request | "talk to human" | Handoff triggered |
| I3 | Frustrated user | "This is so frustrating!!!" | Handoff triggered |
| I4 | Security issue | "My account was hacked" | Handoff triggered |
| I5 | Positive feedback | "Thanks!" | AI response (no handoff) |
| I6 | Handoff unavailable | "talk to human" (no agents) | Acknowledgment + continue |

---

## 13. Unit Tests

### 13.1 Test File Structure

```typescript
// apps/api/src/services/__tests__/intelligent-handoff.test.ts

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  classifyMessage,
  _testing
} from "../intelligent-handoff";

const {
  parseClassificationResult,
  validateIntent,
  validateSentiment,
  validateUrgency,
  calculateShouldEscalate,
  DEFAULT_CLASSIFICATION,
} = _testing;

// Mock OpenAI
vi.mock("../../lib/openai", () => ({
  openai: {
    chat: {
      completions: {
        create: vi.fn(),
      },
    },
  },
}));

describe("intelligent-handoff", () => {
  describe("classifyMessage", () => {
    // Tests here
  });

  describe("parseClassificationResult", () => {
    // Tests here
  });

  // ... more test suites
});
```

### 13.2 Test Implementations

```typescript
// ============================================================================
// parseClassificationResult tests
// ============================================================================

describe("parseClassificationResult", () => {
  it("should parse valid JSON correctly", () => {
    const input = JSON.stringify({
      intent: "human_request",
      sentiment: "frustrated",
      urgency: "high",
      shouldEscalate: true,
      reason: "user wants human",
    });

    const result = parseClassificationResult(input);

    expect(result).toEqual({
      intent: "human_request",
      sentiment: "frustrated",
      urgency: "high",
      shouldEscalate: true,
      reason: "user wants human",
    });
  });

  it("should return default for invalid JSON", () => {
    const result = parseClassificationResult("not json");
    expect(result).toEqual(DEFAULT_CLASSIFICATION);
  });

  it("should return default for empty string", () => {
    const result = parseClassificationResult("");
    expect(result).toEqual(DEFAULT_CLASSIFICATION);
  });

  it("should handle missing fields with defaults", () => {
    const input = JSON.stringify({ intent: "question" });
    const result = parseClassificationResult(input);

    expect(result.intent).toBe("question");
    expect(result.sentiment).toBe("neutral");
    expect(result.urgency).toBe("low");
    expect(result.shouldEscalate).toBe(false);
  });

  it("should calculate shouldEscalate if not provided", () => {
    const input = JSON.stringify({
      intent: "human_request",
      sentiment: "neutral",
      urgency: "low",
    });

    const result = parseClassificationResult(input);
    expect(result.shouldEscalate).toBe(true); // human_request triggers escalate
  });
});

// ============================================================================
// validateIntent tests
// ============================================================================

describe("validateIntent", () => {
  it.each([
    ["human_request", "human_request"],
    ["question", "question"],
    ["complaint", "complaint"],
    ["feedback", "feedback"],
    ["greeting", "greeting"],
    ["other", "other"],
  ])("should accept valid intent: %s", (input, expected) => {
    expect(validateIntent(input)).toBe(expected);
  });

  it.each([
    ["invalid", "other"],
    ["", "other"],
    [null, "other"],
    [undefined, "other"],
    [123, "other"],
  ])("should return 'other' for invalid intent: %s", (input, expected) => {
    expect(validateIntent(input)).toBe(expected);
  });
});

// ============================================================================
// validateSentiment tests
// ============================================================================

describe("validateSentiment", () => {
  it.each([
    ["positive", "positive"],
    ["neutral", "neutral"],
    ["negative", "negative"],
    ["frustrated", "frustrated"],
    ["angry", "angry"],
  ])("should accept valid sentiment: %s", (input, expected) => {
    expect(validateSentiment(input)).toBe(expected);
  });

  it.each([
    ["invalid", "neutral"],
    ["", "neutral"],
    [null, "neutral"],
  ])("should return 'neutral' for invalid sentiment: %s", (input) => {
    expect(validateSentiment(input)).toBe("neutral");
  });
});

// ============================================================================
// validateUrgency tests
// ============================================================================

describe("validateUrgency", () => {
  it.each([
    ["low", "low"],
    ["medium", "medium"],
    ["high", "high"],
    ["critical", "critical"],
  ])("should accept valid urgency: %s", (input, expected) => {
    expect(validateUrgency(input)).toBe(expected);
  });

  it.each([
    ["invalid", "low"],
    ["", "low"],
    [null, "low"],
  ])("should return 'low' for invalid urgency: %s", (input) => {
    expect(validateUrgency(input)).toBe("low");
  });
});

// ============================================================================
// calculateShouldEscalate tests
// ============================================================================

describe("calculateShouldEscalate", () => {
  it("should escalate for human_request intent", () => {
    expect(calculateShouldEscalate("human_request", "neutral", "low")).toBe(true);
  });

  it("should escalate for frustrated sentiment", () => {
    expect(calculateShouldEscalate("question", "frustrated", "low")).toBe(true);
  });

  it("should escalate for angry sentiment", () => {
    expect(calculateShouldEscalate("question", "angry", "low")).toBe(true);
  });

  it("should escalate for high urgency", () => {
    expect(calculateShouldEscalate("question", "neutral", "high")).toBe(true);
  });

  it("should escalate for critical urgency", () => {
    expect(calculateShouldEscalate("question", "neutral", "critical")).toBe(true);
  });

  it("should NOT escalate for normal question", () => {
    expect(calculateShouldEscalate("question", "neutral", "low")).toBe(false);
  });

  it("should NOT escalate for positive feedback", () => {
    expect(calculateShouldEscalate("feedback", "positive", "low")).toBe(false);
  });

  it("should NOT escalate for greeting", () => {
    expect(calculateShouldEscalate("greeting", "neutral", "low")).toBe(false);
  });

  it("should NOT escalate for negative but not frustrated", () => {
    expect(calculateShouldEscalate("question", "negative", "low")).toBe(false);
  });

  it("should NOT escalate for medium urgency alone", () => {
    expect(calculateShouldEscalate("question", "neutral", "medium")).toBe(false);
  });
});

// ============================================================================
// classifyMessage tests (with mocked OpenAI)
// ============================================================================

describe("classifyMessage", () => {
  const mockCreate = vi.fn();

  beforeEach(() => {
    vi.resetAllMocks();
    const { openai } = require("../../lib/openai");
    openai.chat.completions.create = mockCreate;
  });

  it("should return classification from OpenAI", async () => {
    mockCreate.mockResolvedValueOnce({
      choices: [{
        message: {
          content: JSON.stringify({
            intent: "human_request",
            sentiment: "neutral",
            urgency: "low",
            shouldEscalate: true,
            reason: "user asked for human",
          }),
        },
      }],
      usage: { total_tokens: 100 },
    });

    const result = await classifyMessage("talk to human");

    expect(result).toEqual({
      intent: "human_request",
      sentiment: "neutral",
      urgency: "low",
      shouldEscalate: true,
      reason: "user asked for human",
    });
  });

  it("should return default classification on API error", async () => {
    mockCreate.mockRejectedValueOnce(new Error("API Error"));

    const result = await classifyMessage("test message");

    expect(result).toEqual(DEFAULT_CLASSIFICATION);
  });

  it("should return default classification for empty message", async () => {
    const result = await classifyMessage("");

    expect(result).toEqual(DEFAULT_CLASSIFICATION);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("should truncate long messages", async () => {
    const longMessage = "a".repeat(3000);

    mockCreate.mockResolvedValueOnce({
      choices: [{
        message: {
          content: JSON.stringify({
            intent: "question",
            sentiment: "neutral",
            urgency: "low",
            shouldEscalate: false,
          }),
        },
      }],
    });

    await classifyMessage(longMessage);

    const callArg = mockCreate.mock.calls[0][0];
    const messageContent = callArg.messages[0].content;

    expect(messageContent).toContain("a".repeat(2000));
    expect(messageContent).toContain("...");
    expect(messageContent).not.toContain("a".repeat(2001));
  });

  it("should handle empty response content", async () => {
    mockCreate.mockResolvedValueOnce({
      choices: [{
        message: { content: null },
      }],
    });

    const result = await classifyMessage("test");

    expect(result).toEqual(DEFAULT_CLASSIFICATION);
  });
});
```

---

## 14. Integration Tests

### 14.1 Chat Engine Integration Test

```typescript
// apps/api/src/services/__tests__/chat-engine-intelligent-handoff.test.ts

import { describe, it, expect, vi, beforeEach } from "vitest";
import { processChat } from "../chat-engine";

// Mock dependencies
vi.mock("../intelligent-handoff");
vi.mock("../rag");
vi.mock("../handoff-trigger");

describe("chat-engine intelligent handoff integration", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("parallel classification + embedding", () => {
    it("should run classification and embedding in parallel", async () => {
      const { classifyMessage } = await import("../intelligent-handoff");
      const { embedQuery } = await import("../rag");

      const classifyDelay = 150;
      const embedDelay = 100;

      (classifyMessage as any).mockImplementation(async () => {
        await new Promise((r) => setTimeout(r, classifyDelay));
        return { intent: "question", sentiment: "neutral", urgency: "low", shouldEscalate: false };
      });

      (embedQuery as any).mockImplementation(async () => {
        await new Promise((r) => setTimeout(r, embedDelay));
        return new Array(1536).fill(0);
      });

      const start = Date.now();
      await processChat({
        projectId: "test-project",
        message: "What are your hours?",
        visitorId: "test-visitor",
      });
      const elapsed = Date.now() - start;

      // If parallel, should take ~max(150, 100) = 150ms
      // If sequential, would take ~150 + 100 = 250ms
      expect(elapsed).toBeLessThan(200); // Allow some overhead
    });
  });

  describe("escalation flow", () => {
    it("should trigger handoff when shouldEscalate is true", async () => {
      const { classifyMessage } = await import("../intelligent-handoff");
      const { handleIntelligentHandoff } = await import("../handoff-trigger");

      (classifyMessage as any).mockResolvedValue({
        intent: "human_request",
        sentiment: "neutral",
        urgency: "low",
        shouldEscalate: true,
        reason: "user wants human",
      });

      (handleIntelligentHandoff as any).mockResolvedValue({
        triggered: true,
        reason: "intelligent",
        message: "Connecting you to an agent...",
        queuePosition: 1,
      });

      const result = await processChat({
        projectId: "test-project",
        message: "talk to human",
        visitorId: "test-visitor",
      });

      expect(result.handoff?.triggered).toBe(true);
      expect(result.handoff?.reason).toBe("intelligent");
      expect(handleIntelligentHandoff).toHaveBeenCalledWith(
        expect.objectContaining({
          classification: expect.objectContaining({
            intent: "human_request",
            shouldEscalate: true,
          }),
        })
      );
    });

    it("should continue to RAG when shouldEscalate is false", async () => {
      const { classifyMessage } = await import("../intelligent-handoff");
      const { searchWithEmbedding } = await import("../rag");

      (classifyMessage as any).mockResolvedValue({
        intent: "question",
        sentiment: "neutral",
        urgency: "low",
        shouldEscalate: false,
      });

      (searchWithEmbedding as any).mockResolvedValue({
        chunks: [{ content: "Our hours are 9-5", combinedScore: 0.8 }],
      });

      const result = await processChat({
        projectId: "test-project",
        message: "What are your hours?",
        visitorId: "test-visitor",
      });

      expect(result.handoff?.triggered).toBeFalsy();
      expect(searchWithEmbedding).toHaveBeenCalled();
    });
  });

  describe("classification failure handling", () => {
    it("should continue to RAG when classification fails", async () => {
      const { classifyMessage } = await import("../intelligent-handoff");
      const { searchWithEmbedding } = await import("../rag");

      (classifyMessage as any).mockResolvedValue({
        intent: "other",
        sentiment: "neutral",
        urgency: "low",
        shouldEscalate: false, // Default on failure
      });

      (searchWithEmbedding as any).mockResolvedValue({
        chunks: [],
      });

      const result = await processChat({
        projectId: "test-project",
        message: "test message",
        visitorId: "test-visitor",
      });

      expect(result.handoff?.triggered).toBeFalsy();
      expect(searchWithEmbedding).toHaveBeenCalled();
    });
  });
});
```

### 14.2 End-to-End Test

```typescript
// apps/api/src/services/__tests__/intelligent-handoff-e2e.test.ts

import { describe, it, expect } from "vitest";
import { classifyMessage } from "../intelligent-handoff";

// These tests call the real OpenAI API
// Only run in CI with proper credentials
describe.skipIf(!process.env.OPENAI_API_KEY)(
  "intelligent-handoff E2E",
  () => {
    it("should classify human request correctly", async () => {
      const result = await classifyMessage("I want to talk to a human agent");

      expect(result.intent).toBe("human_request");
      expect(result.shouldEscalate).toBe(true);
    }, 10000);

    it("should classify frustration correctly", async () => {
      const result = await classifyMessage("This is SO frustrating! I've asked 5 times!");

      expect(result.sentiment).toMatch(/frustrated|angry/);
      expect(result.shouldEscalate).toBe(true);
    }, 10000);

    it("should classify security issue correctly", async () => {
      const result = await classifyMessage("My account was hacked and money is missing");

      expect(result.urgency).toMatch(/high|critical/);
      expect(result.shouldEscalate).toBe(true);
    }, 10000);

    it("should NOT escalate normal question", async () => {
      const result = await classifyMessage("What are your business hours?");

      expect(result.intent).toBe("question");
      expect(result.shouldEscalate).toBe(false);
    }, 10000);

    it("should NOT escalate positive feedback", async () => {
      const result = await classifyMessage("Thanks, that really helped!");

      expect(result.sentiment).toBe("positive");
      expect(result.shouldEscalate).toBe(false);
    }, 10000);
  }
);
```

---

## 15. Rollback Plan

### 15.1 Feature Flag

```typescript
// In config or environment
const INTELLIGENT_HANDOFF_ENABLED = process.env.INTELLIGENT_HANDOFF_ENABLED === "true";

// In chat-engine.ts
if (INTELLIGENT_HANDOFF_ENABLED) {
  // New parallel classification flow
} else {
  // Old keyword detection flow
}
```

### 15.2 Rollback Steps

1. Set `INTELLIGENT_HANDOFF_ENABLED=false` in environment
2. Deploy (no code changes needed)
3. Verify keyword detection is working
4. Investigate issues with intelligent handoff
5. Fix and re-enable when ready

### 15.3 Keep Keyword Detection Code

Do NOT delete keyword detection code until intelligent handoff is proven stable:

```typescript
// Keep these functions available for rollback:
// - checkKeywordTrigger()
// - DEFAULT_HUMAN_INTENT_KEYWORDS
// - checkHandoffTrigger()
```

---

## 16. Monitoring & Logging

### 16.1 Log Events

| Event | Log Level | Fields |
|-------|-----------|--------|
| Classification started | debug | projectId, messageLength |
| Classification completed | info | latencyMs, intent, sentiment, urgency, shouldEscalate, tokensUsed |
| Classification failed | error | error, latencyMs |
| Classification timeout | error | timeout |
| Escalation triggered | info | reason, intent, sentiment, urgency |
| Handoff executed | info | queuePosition, conversationId |

### 16.2 Metrics to Track

| Metric | Type | Purpose |
|--------|------|---------|
| classification_latency_ms | histogram | Performance monitoring |
| classification_tokens_used | counter | Cost tracking |
| classification_errors | counter | Error rate |
| escalation_rate | gauge | % messages escalated |
| escalation_by_reason | counter | Breakdown by reason |
| false_positive_rate | gauge | Escalations that shouldn't have happened |
| false_negative_rate | gauge | Missed escalations |

### 16.3 Alerts

| Alert | Condition | Severity |
|-------|-----------|----------|
| High classification latency | p99 > 500ms for 5 min | warning |
| Classification error rate | > 5% for 5 min | critical |
| High escalation rate | > 30% for 1 hour | warning |
| Classification API down | 0 successful calls for 2 min | critical |

---

## Appendix A: Classification Prompt Tuning

If classification accuracy is low, tune the prompt:

1. Add more examples to the prompt
2. Adjust temperature (currently 0 for consistency)
3. Add negative examples ("This is NOT an escalation...")
4. Consider few-shot prompting with examples

## Appendix B: Cost Optimization

If costs become too high:

1. **Option 1:** Only classify "suspect" messages (contain "!", "?", emotional words)
2. **Option 2:** Use cheaper model (gpt-3.5-turbo) for initial pass
3. **Option 3:** Cache classifications for identical messages
4. **Option 4:** Reduce max_tokens from 150 to 100

## Appendix C: Multi-Turn Enhancement (Future)

Track sentiment across conversation:

```typescript
interface ConversationSentimentTracker {
  sessionId: string;
  sentimentHistory: Sentiment[];  // Last 5 turns
  negativeCount: number;          // Consecutive negative
  escalationScore: number;        // 0-1, increases with frustration
}

// Escalate if:
// - 3+ consecutive negative/frustrated turns
// - Sudden shift from positive to angry
// - escalationScore > 0.7
```

---

**End of Specification**
