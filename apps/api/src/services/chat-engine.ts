/**
 * Chat Engine Service
 *
 * The brain of the chatbot system. Orchestrates:
 * - RAG retrieval from knowledge base
 * - Tool calling for external APIs
 * - LLM conversation handling
 * - Response generation
 *
 * This is the core service that processes all chat messages.
 */

import type {
  ChatCompletionMessageParam,
  ChatCompletionTool,
  ChatCompletionToolMessageParam,
} from "openai/resources/chat/completions";
import { openai } from "../lib/openai";
import { supabaseAdmin } from "../lib/supabase";
import { logger, generateRequestId, type LogContext } from "../lib/logger";
// RAG v2 - Hybrid Search with Contextual Embeddings
import {
  retrieve,
  formatAsContext,
  extractSources,
  type RetrievedChunk,
} from "./rag";
import {
  buildSystemPrompt,
  buildChatMessages,
  truncateHistoryToFit,
  sanitizeUserInput,
  sanitizeOutput,
  generateFallbackResponse,
  type ProjectConfig,
} from "./prompt-builder";
import {
  getToolsForProject,
  executeToolById,
  formatToolResultForLLM,
} from "./tool-executor";
import {
  handleLeadCaptureFlow,
  detectNoAnswer,
  getLeadCaptureSettings,
  type LeadCaptureResult,
} from "./lead-capture";
import {
  getOrCreateConversation,
  logConversationMessages,
} from "./conversation";
import {
  checkHandoffTrigger,
  checkLowConfidenceHandoff,
  getHandoffSettings,
  type HandoffTriggerResult,
} from "./handoff-trigger";
import { broadcastNewMessage } from "./realtime";
import {
  leadCaptureV2Interceptor,
  getLeadCaptureV2Settings,
  maskEmail,
  checkAndReaskQualifyingQuestion,
  getReaskIntro,
  type LeadCaptureState,
} from "./lead-capture-v2";
import { scanAndSaveLateAnswers } from "./late-answer-detector";

/**
 * Valid sources for chat sessions
 */
export type ChatSource = "widget" | "playground" | "mcp" | "api";

/**
 * Context metadata from the widget/client for analytics
 */
export interface MessageContext {
  pageUrl?: string;
  pageTitle?: string;
  referrer?: string;
  browser?: string;
  browserVersion?: string;
  os?: string;
  osVersion?: string;
  device?: string;
  screenWidth?: number;
  screenHeight?: number;
  timezone?: string;
  language?: string;
  ipAddress?: string;
  country?: string;
  city?: string;
  countryCode?: string;
}

/**
 * Input for processing a chat message
 */
export interface ChatInput {
  projectId: string;
  visitorId: string;
  message: string;
  conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>;
  sessionId?: string;
  source?: ChatSource;
  context?: MessageContext;
  requestId?: string; // For request tracing
}

/**
 * A tool call made during processing
 */
export interface ToolCallInfo {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
  result: unknown;
  success: boolean;
  duration: number;
}

/**
 * Source reference from knowledge base
 */
export interface SourceReference {
  id: string;
  name: string;
  relevance: number;
}

/**
 * Output from processing a chat message
 */
export interface ChatOutput {
  response: string;
  sessionId: string;
  sources: SourceReference[];
  toolCalls: ToolCallInfo[];
  processingTime: number;
  requestId?: string; // For client-side tracing
  tokensUsed?: {
    prompt: number;
    completion: number;
    total: number;
  };
  leadCapture?: {
    type: LeadCaptureResult["type"];
    emailCaptured?: string;
  };
  handoff?: {
    triggered: boolean;
    reason?: string;
    queuePosition?: number;
    estimatedWait?: string;
    conversationId?: string;
  };
}

/**
 * Processing metrics for observability
 */
interface ProcessingMetrics {
  startTime: number;
  ragTime?: number;
  llmTime?: number;
  toolTime?: number;
}

const MAX_TOOL_CALL_ITERATIONS = 3; // Prevent infinite tool call loops
const LLM_TIMEOUT = 30000; // 30 seconds
const MODEL = "gpt-4o-mini";

// Cache for project config to avoid repeated DB calls
const projectConfigCache = new Map<string, { data: ProjectConfig | null; timestamp: number }>();
const CACHE_TTL = 60000; // 1 minute cache

/**
 * Main entry point: Process a chat message and return a response
 */
export async function processChat(input: ChatInput): Promise<ChatOutput> {
  const requestId = input.requestId || generateRequestId();
  const metrics: ProcessingMetrics = { startTime: Date.now() };
  const toolCallsInfo: ToolCallInfo[] = [];
  let retrievedChunks: RetrievedChunk[] = [];

  // Create log context for this request
  const logCtx: LogContext = {
    requestId,
    projectId: input.projectId,
    visitorId: input.visitorId,
    sessionId: input.sessionId,
  };

  try {
    // 1. Validate and sanitize input
    const sanitizedMessage = sanitizeUserInput(input.message);
    if (!sanitizedMessage) {
      throw new ChatError("EMPTY_MESSAGE", "Message cannot be empty");
    }

    // 1.1. Check if conversation is in handoff state (agent_active or waiting)
    // This MUST run BEFORE the Lead Capture interceptor to ensure agent sees all messages
    // even if the customer is mid-qualifying-questions flow
    if (input.sessionId) {
      const handoffState = await checkConversationHandoffState(input.sessionId);
      if (handoffState.isInHandoff) {
        // Store the customer message in the messages table
        await storeCustomerMessageOnly(input.sessionId, sanitizedMessage);

        return {
          response: "", // No AI response - agent will respond
          sessionId: input.sessionId,
          sources: [],
          toolCalls: [],
          processingTime: Date.now() - metrics.startTime,
          handoff: {
            triggered: false, // Already in handoff, not a new trigger
            reason: handoffState.status === "waiting" ? "in_queue" : "agent_handling",
          },
        };
      }
    }

    // 1.5 Lead Capture V2 Interceptor
    // Only runs if NOT in handoff state - qualifying questions continue normally
    const lcV2Result = await leadCaptureV2Interceptor(
      input.projectId,
      input.visitorId,
      input.sessionId,
      sanitizedMessage
    );
    if (lcV2Result) {
      // IMPORTANT: Create/get session even for qualifying question flow
      // This ensures the widget has a valid sessionId for handoff trigger
      const sessionId = await getOrCreateSession(
        input.projectId,
        input.visitorId,
        lcV2Result.sessionId || input.sessionId,
        input.source || "widget",
        input.context
      );

      // Log the qualifying question conversation
      logConversation(
        input.projectId,
        sessionId,
        sanitizedMessage,
        lcV2Result.response,
        0,
        0,
        input.context,
        requestId
      ).catch((err) => logger.error("Failed to log qualifying conversation", err, logCtx));

      return {
        response: lcV2Result.response,
        sessionId,
        sources: [],
        toolCalls: [],
        processingTime: Date.now() - metrics.startTime,
        requestId,
      };
    }

    // 2. Get project configuration
    const project = await getProjectConfig(input.projectId);
    if (!project) {
      throw new ChatError("PROJECT_NOT_FOUND", "Chatbot not found");
    }

    // 2.5. Check for handoff trigger BEFORE processing with AI
    const handoffResult = await checkHandoffTrigger(
      input.projectId,
      sanitizedMessage,
      input.visitorId,
      input.sessionId
    );

    if (handoffResult.triggered) {
      // Use the conversation ID from handoff result if available
      // This ensures the widget uses the SAME conversation that was put in the queue
      // Otherwise, there's a bug where createHandoffConversation creates conversation "A"
      // but getOrCreateSession might create conversation "B", causing a mismatch
      let sessionId: string;

      if (handoffResult.conversationId) {
        // Handoff created/updated a conversation - use that ID
        sessionId = handoffResult.conversationId;

        // Update customer context for this conversation
        await getOrCreateSession(
          input.projectId,
          input.visitorId,
          sessionId, // Use the handoff conversation ID
          input.source || "widget",
          input.context
        );
      } else {
        // Fallback: create session normally (for cases where handoff triggers but
        // doesn't create a conversation, e.g., offline responses)
        sessionId = await getOrCreateSession(
          input.projectId,
          input.visitorId,
          input.sessionId,
          input.source || "widget",
          input.context
        );
      }

      // Log the user message that triggered handoff
      logConversation(
        input.projectId,
        sessionId,
        sanitizedMessage,
        handoffResult.message,
        0,
        0,
        input.context,
        requestId
      ).catch((err) => logger.error("Failed to log handoff conversation", err, logCtx));

      return {
        response: handoffResult.message,
        sessionId,
        sources: [],
        toolCalls: [],
        processingTime: Date.now() - metrics.startTime,
        handoff: {
          triggered: true,
          reason: handoffResult.reason,
          queuePosition: handoffResult.queuePosition,
          estimatedWait: handoffResult.estimatedWait,
          conversationId: sessionId, // Use consistent ID
        },
      };
    }

    // 3. RAG v2: Hybrid search with contextual embeddings
    const ragStart = Date.now();
    const ragResult = await retrieve(input.projectId, sanitizedMessage, {
      topK: 5,
      threshold: 0.15, // Lower threshold with hybrid search for better recall
      useHybridSearch: true,
    });
    retrievedChunks = ragResult.chunks;
    metrics.ragTime = Date.now() - ragStart;

    logger.info("RAG search completed", {
      ...logCtx,
      step: "rag_search",
      chunksFound: ragResult.totalFound,
      searchType: ragResult.searchType,
      duration: ragResult.processingTimeMs,
      maxScore: retrievedChunks[0]?.combinedScore || 0,
    });

    // 3.5. Check for low confidence handoff trigger AFTER RAG
    const lowConfidenceResult = await checkLowConfidenceHandoff(
      input.projectId,
      input.visitorId,
      retrievedChunks,
      input.sessionId
    );

    if (lowConfidenceResult.triggered) {
      // Use the conversation ID from handoff result if available
      // This ensures the widget uses the SAME conversation that was put in the queue
      let sessionId: string;

      if (lowConfidenceResult.conversationId) {
        // Handoff created/updated a conversation - use that ID
        sessionId = lowConfidenceResult.conversationId;

        // Update customer context for this conversation
        await getOrCreateSession(
          input.projectId,
          input.visitorId,
          sessionId, // Use the handoff conversation ID
          input.source || "widget",
          input.context
        );
      } else {
        // Fallback: create session normally
        sessionId = await getOrCreateSession(
          input.projectId,
          input.visitorId,
          input.sessionId,
          input.source || "widget",
          input.context
        );
      }

      // Log the user message that triggered low confidence handoff
      logConversation(
        input.projectId,
        sessionId,
        sanitizedMessage,
        lowConfidenceResult.message,
        retrievedChunks.length,
        0,
        input.context,
        requestId
      ).catch((err) => logger.error("Failed to log low confidence conversation", err, logCtx));

      return {
        response: lowConfidenceResult.message,
        sessionId,
        sources: extractSources(retrievedChunks),
        toolCalls: [],
        processingTime: Date.now() - metrics.startTime,
        handoff: {
          triggered: true,
          reason: lowConfidenceResult.reason,
          queuePosition: lowConfidenceResult.queuePosition,
          estimatedWait: lowConfidenceResult.estimatedWait,
          conversationId: sessionId, // Use consistent ID
        },
      };
    }

    // 4. Format knowledge context
    const knowledgeContext = formatAsContext(retrievedChunks);

    // 5. Get available tools (API endpoints)
    const tools = await getToolsForProject(input.projectId);

    // 6. Build system prompt
    const systemPrompt = buildSystemPrompt({
      project,
      knowledgeContext,
      hasTools: tools.length > 0,
    });

    // 7. Truncate history if needed to fit context window
    const truncatedHistory = truncateHistoryToFit(
      systemPrompt,
      input.conversationHistory || [],
      sanitizedMessage,
      6000
    );

    // 8. Build messages array
    let messages = buildChatMessages(
      systemPrompt,
      truncatedHistory,
      sanitizedMessage
    );

    // 9. Call LLM with potential tool calling loop
    const llmStart = Date.now();
    const { response, tokensUsed, toolCalls } = await callLLMWithTools(
      messages,
      tools,
      input.projectId,
      toolCallsInfo
    );
    metrics.llmTime = Date.now() - llmStart;

    // 10. Get or create session
    const sessionId = await getOrCreateSession(
      input.projectId,
      input.visitorId,
      input.sessionId,
      input.source || "widget",
      input.context
    );

    // 11. Lead Capture Flow
    let finalResponse = response;
    let leadCaptureResult: LeadCaptureResult | undefined;

    try {
      // Get lead capture settings
      const leadSettings = await getLeadCaptureSettings(input.projectId);

      // Check if V2 is enabled (takes precedence over V1)
      const v2Settings = await getLeadCaptureV2Settings(input.projectId);

      if (v2Settings) {
        // V2 flow: Check if AI can't answer for qualified/skipped users
        const responseIndicatesNoAnswer = detectNoAnswer(response);
        const hasRelevantContext = retrievedChunks.length > 0 &&
          retrievedChunks.some(c => c.combinedScore > 0.3);
        const foundAnswer = hasRelevantContext && !responseIndicatesNoAnswer;

        // Look up customer state (needed for V2 + V3 recovery logic)
        const { data: customer } = await supabaseAdmin
          .from("customers")
          .select("lead_capture_state")
          .eq("project_id", input.projectId)
          .eq("visitor_id", input.visitorId)
          .single();

        const state = customer?.lead_capture_state as LeadCaptureState | null;

        if (!foundAnswer) {
          if (state?.lead_capture_status === "qualified") {
            // Qualified user: tell them we have their info
            const maskedEmail = maskEmail(state.form_data.email);
            finalResponse = response + `\n\nWe have your email on file (${maskedEmail}). I'll flag this for our team to follow up with you.`;
          } else if (!state || state.lead_capture_status === "skipped") {
            // Unqualified/skipped user: suggest leaving email
            finalResponse = response + "\n\nWould you like to leave your email? Someone from our team can follow up.";
          }
          // If form_completed or qualifying, don't append anything (they're mid-flow)
        }

        // V3 Recovery: High-intent override + Summary hook (server-side)
        const recoverySettings = (await getProjectRecoverySettings(input.projectId));
        if (recoverySettings && state) {
          const stateRecord = state as unknown as Record<string, unknown>;
          const highIntentOverride = recoverySettings.high_intent_override as {
            enabled?: boolean;
            keywords?: string[];
          } | undefined;
          const summaryHook = recoverySettings.conversation_summary_hook as {
            enabled?: boolean;
            min_messages?: number;
            prompt?: string;
          } | undefined;

          const emailCaptured = !!stateRecord.email ||
            state.lead_capture_status === "qualified" ||
            state.lead_capture_status === "form_completed";

          if (!emailCaptured) {
            // High-intent override: detect high-intent keywords in user message
            if (highIntentOverride?.enabled) {
              const keywords = highIntentOverride.keywords || [];
              const defaultKeywords = ["pricing", "demo", "trial", "contact", "sales", "buy", "subscribe", "cost", "price", "plan", "enterprise", "quote"];
              const keywordList = keywords.length > 0 ? keywords : defaultKeywords;
              const lowerMessage = sanitizedMessage.toLowerCase();
              const isHighIntent = keywordList.some((kw: string) => lowerMessage.includes(kw.toLowerCase()));

              if (isHighIntent && (state.lead_capture_status === "deferred" || state.lead_capture_status === "pending" || state.lead_capture_status === "skipped")) {
                // Flag high intent in customer state
                await supabaseAdmin
                  .from("customers")
                  .update({
                    lead_capture_state: {
                      ...state,
                      high_intent_detected: true,
                    },
                  })
                  .eq("project_id", input.projectId)
                  .eq("visitor_id", input.visitorId);

                // Append contextual email ask to response
                finalResponse = finalResponse + "\n\nIt sounds like you're interested in learning more. Would you like to share your email so our team can follow up with personalized information?";
              }
            }

            // Summary hook: after N messages, offer to email a summary
            if (summaryHook?.enabled) {
              const minMessages = summaryHook.min_messages || 3;
              const messageCount = (input.conversationHistory?.length || 0) + 1;

              if (messageCount >= minMessages * 2) { // *2 because history has both user and assistant
                const hookPrompt = summaryHook.prompt ||
                  "Want me to email you a summary of this conversation?";

                // Only append if we haven't already appended a high-intent message
                if (!stateRecord.high_intent_detected && !stateRecord.summary_hook_shown) {
                  finalResponse = finalResponse + `\n\n${hookPrompt}`;

                  // Mark summary hook as shown
                  await supabaseAdmin
                    .from("customers")
                    .update({
                      lead_capture_state: {
                        ...state,
                        summary_hook_shown: true,
                      },
                    })
                    .eq("project_id", input.projectId)
                    .eq("visitor_id", input.visitorId);
                }
              }
            }
          }
        }
      } else if (leadSettings.lead_capture_enabled) {
        // V1 flow (unchanged)
        const hasRelevantContext = retrievedChunks.length > 0 &&
          retrievedChunks.some(c => c.combinedScore > 0.3);
        const responseIndicatesNoAnswer = detectNoAnswer(response);
        const foundAnswer = hasRelevantContext && !responseIndicatesNoAnswer;

        leadCaptureResult = await handleLeadCaptureFlow(
          sessionId,
          input.projectId,
          sanitizedMessage,
          foundAnswer,
          leadSettings
        );

        if (leadCaptureResult.shouldAppendToResponse && leadCaptureResult.responseAppendix) {
          if (leadCaptureResult.type === "email_captured") {
            finalResponse = leadCaptureResult.responseAppendix;
          } else {
            finalResponse = response + leadCaptureResult.responseAppendix;
          }
        }
      }
    } catch (leadError) {
      // Log but don't fail the chat if lead capture has issues
      logger.error("Lead capture error", leadError, { ...logCtx, step: "lead_capture" });
    }

    // 11.5 Re-ask qualifying question if user asked a new question mid-qualifying
    try {
      const reaskResult = await checkAndReaskQualifyingQuestion(input.projectId, input.visitorId);
      if (reaskResult.shouldReask && reaskResult.question) {
        finalResponse = `${finalResponse}\n\n${getReaskIntro(reaskResult.question)}`;
        logger.info("Appended qualifying question re-ask", {
          ...logCtx,
          step: "qualifying_reask",
          question: reaskResult.question.substring(0, 50),
        });
      }
    } catch (reaskError) {
      // Log but don't fail the chat if re-ask has issues
      logger.error("Qualifying re-ask error", reaskError, { ...logCtx, step: "qualifying_reask" });
    }

    // 11.7 Late Answer Detection (async, non-blocking)
    // Scans for late answers to skipped qualifying questions
    scanAndSaveLateAnswers(
      input.projectId,
      input.visitorId,
      sanitizedMessage
    ).catch((err) => logger.error("Late answer scan error", err, logCtx));

    // 12. Log conversation asynchronously
    logConversation(
      input.projectId,
      sessionId,
      sanitizedMessage,
      finalResponse,
      retrievedChunks.length,
      toolCallsInfo.length,
      input.context,
      requestId
    ).catch((err) => logger.error("Failed to log conversation", err, logCtx));

    logger.info("Chat processing completed", {
      ...logCtx,
      step: "complete",
      duration: Date.now() - metrics.startTime,
      ragTime: metrics.ragTime,
      llmTime: metrics.llmTime,
      chunksUsed: retrievedChunks.length,
      toolCallsCount: toolCallsInfo.length,
    });

    return {
      response: finalResponse,
      sessionId,
      sources: extractSources(retrievedChunks),
      toolCalls: toolCallsInfo,
      processingTime: Date.now() - metrics.startTime,
      requestId,
      tokensUsed,
      leadCapture: leadCaptureResult ? {
        type: leadCaptureResult.type,
        emailCaptured: leadCaptureResult.email,
      } : undefined,
    };
  } catch (error) {
    logger.error("Chat processing error", error, {
      ...logCtx,
      step: "error",
      duration: Date.now() - metrics.startTime,
    });

    // Return a graceful error response
    if (error instanceof ChatError) {
      throw error;
    }

    return {
      response: generateFallbackResponse("error"),
      sessionId: input.sessionId || generateSessionId(),
      sources: extractSources(retrievedChunks),
      toolCalls: toolCallsInfo,
      processingTime: Date.now() - metrics.startTime,
      requestId,
    };
  }
}

/**
 * Call the LLM with tool calling support
 * Handles the iterative tool calling loop
 */
async function callLLMWithTools(
  messages: ChatCompletionMessageParam[],
  tools: ChatCompletionTool[],
  projectId: string,
  toolCallsInfo: ToolCallInfo[]
): Promise<{
  response: string;
  tokensUsed?: { prompt: number; completion: number; total: number };
  toolCalls: ToolCallInfo[];
}> {
  let iterations = 0;
  let totalPromptTokens = 0;
  let totalCompletionTokens = 0;

  while (iterations < MAX_TOOL_CALL_ITERATIONS) {
    iterations++;

    // Make LLM call with timeout
    const completion = await Promise.race([
      openai.chat.completions.create({
        model: MODEL,
        messages,
        tools: tools.length > 0 ? tools : undefined,
        tool_choice: tools.length > 0 ? "auto" : undefined,
        max_tokens: 800,
        temperature: 0.7,
      }),
      timeoutPromise<never>(LLM_TIMEOUT, "LLM request timed out"),
    ]);

    // Track token usage
    if (completion.usage) {
      totalPromptTokens += completion.usage.prompt_tokens;
      totalCompletionTokens += completion.usage.completion_tokens;
    }

    const choice = completion.choices[0];
    const assistantMessage = choice.message;

    // Check if we have tool calls to execute
    if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
      // Add assistant message with tool calls to conversation
      messages.push(assistantMessage);

      // Execute each tool call
      for (const toolCall of assistantMessage.tool_calls) {
        const startTime = Date.now();
        let args: Record<string, unknown> = {};

        try {
          args = JSON.parse(toolCall.function.arguments || "{}");
        } catch {
          args = {};
        }

        // Execute the tool
        const result = await executeToolById(
          projectId,
          toolCall.function.name,
          args as Record<string, string>
        );

        const toolInfo: ToolCallInfo = {
          id: toolCall.id,
          name: toolCall.function.name,
          arguments: args,
          result: result.data,
          success: result.success,
          duration: Date.now() - startTime,
        };
        toolCallsInfo.push(toolInfo);

        // Add tool result to messages
        const toolMessage: ChatCompletionToolMessageParam = {
          role: "tool",
          tool_call_id: toolCall.id,
          content: formatToolResultForLLM(result),
        };
        messages.push(toolMessage);
      }

      // Continue loop to get final response with tool results
      continue;
    }

    // No tool calls - we have our final response
    const responseContent = assistantMessage.content;

    if (!responseContent || responseContent.trim() === "") {
      return {
        response: generateFallbackResponse("empty_response"),
        tokensUsed: {
          prompt: totalPromptTokens,
          completion: totalCompletionTokens,
          total: totalPromptTokens + totalCompletionTokens,
        },
        toolCalls: toolCallsInfo,
      };
    }

    // Sanitize output to prevent system prompt leakage
    const { sanitized: sanitizedResponse, wasFiltered } = sanitizeOutput(responseContent);
    if (wasFiltered) {
      logger.warn("Output filtered for potential prompt leak", {
        step: "output_sanitization",
      });
    }

    return {
      response: sanitizedResponse,
      tokensUsed: {
        prompt: totalPromptTokens,
        completion: totalCompletionTokens,
        total: totalPromptTokens + totalCompletionTokens,
      },
      toolCalls: toolCallsInfo,
    };
  }

  // Max iterations reached - return what we have
  return {
    response: generateFallbackResponse("error"),
    tokensUsed: {
      prompt: totalPromptTokens,
      completion: totalCompletionTokens,
      total: totalPromptTokens + totalCompletionTokens,
    },
    toolCalls: toolCallsInfo,
  };
}

/**
 * Get project configuration from database (with caching)
 */
async function getProjectConfig(
  projectId: string
): Promise<ProjectConfig | null> {
  // Check cache first
  const cached = projectConfigCache.get(projectId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  const { data: project, error } = await supabaseAdmin
    .from("projects")
    .select("id, name, settings")
    .eq("id", projectId)
    .single();

  if (error || !project) {
    // Cache null result to avoid repeated failed queries
    projectConfigCache.set(projectId, { data: null, timestamp: Date.now() });
    return null;
  }

  const settings = (project.settings as Record<string, unknown>) || {};

  const config: ProjectConfig = {
    name: project.name,
    systemPrompt:
      (settings.systemPrompt as string) ||
      (settings.system_prompt as string) ||
      null,
    supportEmail:
      (settings.supportEmail as string) ||
      (settings.support_email as string) ||
      undefined,
    supportUrl:
      (settings.supportUrl as string) ||
      (settings.support_url as string) ||
      undefined,
  };

  // Cache the result
  projectConfigCache.set(projectId, { data: config, timestamp: Date.now() });

  return config;
}

/**
 * Get or create a chat session
 * Uses conversations table as single source of truth
 */
async function getOrCreateSession(
  projectId: string,
  visitorId: string,
  existingSessionId?: string,
  source: ChatSource = "widget",
  context?: MessageContext
): Promise<string> {
  // Use the conversation service which handles all the logic
  // getOrCreateConversation handles:
  // - Checking if existing session ID is valid
  // - Finding existing conversation for visitor
  // - Creating new conversation if needed
  // - Updating customer context
  const conversationId = await getOrCreateConversation(
    projectId,
    visitorId,
    existingSessionId,
    source,
    context
  );

  return conversationId;
}

/**
 * Log conversation for analytics (async, non-blocking)
 * Uses conversations/messages tables as single source of truth
 */
async function logConversation(
  projectId: string,
  sessionId: string,
  userMessage: string,
  assistantResponse: string,
  sourcesUsed: number,
  toolCallsCount: number,
  context?: MessageContext,
  requestId?: string
): Promise<void> {
  const logCtx: LogContext = { requestId, projectId, sessionId, step: "log_conversation" };
  try {
    // Write to conversations/messages tables (single source of truth)
    await logConversationMessages(sessionId, userMessage, assistantResponse, {
      sourcesUsed,
      toolCallsCount,
      model: MODEL,
    }, context);
  } catch (error) {
    logger.error("Failed to log conversation", error, logCtx);
  }
}

/**
 * Generate a random session ID
 */
function generateSessionId(): string {
  return `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Create a timeout promise for race conditions
 */
function timeoutPromise<T>(ms: number, message: string): Promise<T> {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new ChatError("TIMEOUT", message)), ms);
  });
}

/**
 * Custom error class for chat errors
 */
export class ChatError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = "ChatError";
  }
}

/**
 * Check if a conversation is in handoff state (agent_active or waiting)
 */
async function checkConversationHandoffState(
  sessionId: string
): Promise<{ isInHandoff: boolean; status: string | null }> {
  try {
    // Check in new conversations table first
    const { data: conversation } = await supabaseAdmin
      .from("conversations")
      .select("id, status")
      .eq("id", sessionId)
      .single();

    if (conversation) {
      const isInHandoff = conversation.status === "agent_active" || conversation.status === "waiting";
      return { isInHandoff, status: conversation.status };
    }

    // Not found in conversations table
    return { isInHandoff: false, status: null };
  } catch (error) {
    logger.error("Error checking handoff state", error, { sessionId, step: "check_handoff_state" });
    return { isInHandoff: false, status: null };
  }
}

/**
 * Store only the customer message (when in handoff mode, no AI response)
 * Uses conversations/messages tables as single source of truth
 */
async function storeCustomerMessageOnly(
  conversationId: string,
  message: string
): Promise<void> {
  try {
    // Insert customer message into messages table and get the inserted record
    const { data: insertedMessage, error: insertError } = await supabaseAdmin
      .from("messages")
      .insert({
        conversation_id: conversationId,
        sender_type: "customer",
        content: message,
      })
      .select("id, created_at")
      .single();

    if (insertError) {
      logger.error("Error inserting message", insertError, {
        conversationId,
        step: "store_customer_message",
      });
      throw insertError;
    }

    // Broadcast message to real-time channel so agent sees it instantly (fire-and-forget)
    if (insertedMessage) {
      broadcastNewMessage(conversationId, {
        id: insertedMessage.id,
        senderType: "customer",
        content: message,
        createdAt: insertedMessage.created_at,
      }).catch((err) =>
        logger.error("Realtime broadcast error", err, {
          conversationId,
          step: "realtime_broadcast",
        })
      );
    }

    // Update conversation's last_message_at and message_count
    const { data: conv } = await supabaseAdmin
      .from("conversations")
      .select("message_count")
      .eq("id", conversationId)
      .single();

    await supabaseAdmin
      .from("conversations")
      .update({
        last_message_at: new Date().toISOString(),
        message_count: (conv?.message_count || 0) + 1,
        customer_last_seen_at: new Date().toISOString(),
        customer_presence: "online",
      })
      .eq("id", conversationId);
  } catch (error) {
    logger.error("Error storing customer message", error, {
      conversationId,
      step: "store_customer_message",
    });
    throw error;
  }
}

/**
 * Get lead recovery settings for a project (V3)
 */
async function getProjectRecoverySettings(
  projectId: string
): Promise<Record<string, unknown> | null> {
  try {
    const { data: project } = await supabaseAdmin
      .from("projects")
      .select("settings")
      .eq("id", projectId)
      .single();

    if (!project) return null;

    const settings = (project.settings as Record<string, unknown>) || {};
    const recovery = settings.lead_recovery as Record<string, unknown> | undefined;

    if (!recovery?.enabled) return null;
    return recovery;
  } catch {
    return null;
  }
}

/**
 * Validate chat input
 */
export function validateChatInput(input: unknown): ChatInput {
  if (!input || typeof input !== "object") {
    throw new ChatError("INVALID_INPUT", "Request body is required");
  }

  const data = input as Record<string, unknown>;

  if (!data.projectId || typeof data.projectId !== "string") {
    throw new ChatError("INVALID_INPUT", "projectId is required");
  }

  if (!data.message || typeof data.message !== "string") {
    throw new ChatError("INVALID_INPUT", "message is required");
  }

  if (data.message.length > 2000) {
    throw new ChatError(
      "MESSAGE_TOO_LONG",
      "Message exceeds 2000 character limit"
    );
  }

  const visitorId =
    (data.visitorId as string) ||
    `anon_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  // Validate source if provided
  const validSources: ChatSource[] = ["widget", "playground", "mcp", "api"];
  const source = validSources.includes(data.source as ChatSource)
    ? (data.source as ChatSource)
    : "widget";

  return {
    projectId: data.projectId,
    visitorId,
    message: data.message,
    conversationHistory: Array.isArray(data.conversationHistory)
      ? data.conversationHistory.filter(
          (m): m is { role: "user" | "assistant"; content: string } =>
            m &&
            typeof m === "object" &&
            (m.role === "user" || m.role === "assistant") &&
            typeof m.content === "string"
        )
      : [],
    sessionId: typeof data.sessionId === "string" ? data.sessionId : undefined,
    source,
  };
}
