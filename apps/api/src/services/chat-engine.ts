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
  generateFallbackResponse,
  type ProjectConfig,
} from "./prompt-builder";
import {
  getToolsForProject,
  executeToolById,
  formatToolResultForLLM,
} from "./tool-executor";

/**
 * Input for processing a chat message
 */
export interface ChatInput {
  projectId: string;
  visitorId: string;
  message: string;
  conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>;
  sessionId?: string;
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
  tokensUsed?: {
    prompt: number;
    completion: number;
    total: number;
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

/**
 * Main entry point: Process a chat message and return a response
 */
export async function processChat(input: ChatInput): Promise<ChatOutput> {
  const metrics: ProcessingMetrics = { startTime: Date.now() };
  const toolCallsInfo: ToolCallInfo[] = [];
  let retrievedChunks: RetrievedChunk[] = [];

  try {
    // 1. Validate and sanitize input
    const sanitizedMessage = sanitizeUserInput(input.message);
    if (!sanitizedMessage) {
      throw new ChatError("EMPTY_MESSAGE", "Message cannot be empty");
    }

    // 2. Get project configuration
    const project = await getProjectConfig(input.projectId);
    if (!project) {
      throw new ChatError("PROJECT_NOT_FOUND", "Chatbot not found");
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

    console.log(`[RAG v2] Found ${ragResult.totalFound} chunks via ${ragResult.searchType} search in ${ragResult.processingTimeMs}ms`);

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
      input.sessionId
    );

    // 11. Log conversation asynchronously
    logConversation(
      input.projectId,
      sessionId,
      sanitizedMessage,
      response,
      retrievedChunks.length,
      toolCallsInfo.length
    ).catch(console.error);

    return {
      response,
      sessionId,
      sources: extractSources(retrievedChunks),
      toolCalls: toolCallsInfo,
      processingTime: Date.now() - metrics.startTime,
      tokensUsed,
    };
  } catch (error) {
    console.error("Chat processing error:", error);

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

    return {
      response: responseContent,
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
 * Get project configuration from database
 */
async function getProjectConfig(
  projectId: string
): Promise<ProjectConfig | null> {
  const { data: project, error } = await supabaseAdmin
    .from("projects")
    .select("id, name, settings")
    .eq("id", projectId)
    .single();

  if (error || !project) {
    return null;
  }

  const settings = (project.settings as Record<string, unknown>) || {};

  return {
    name: project.name,
    systemPrompt: (settings.system_prompt as string) || null,
    supportEmail: (settings.support_email as string) || undefined,
    supportUrl: (settings.support_url as string) || undefined,
  };
}

/**
 * Get or create a chat session
 */
async function getOrCreateSession(
  projectId: string,
  visitorId: string,
  existingSessionId?: string
): Promise<string> {
  // If session ID provided and valid, use it
  if (existingSessionId) {
    const { data: existing } = await supabaseAdmin
      .from("chat_sessions")
      .select("id")
      .eq("id", existingSessionId)
      .eq("project_id", projectId)
      .single();

    if (existing) {
      return existing.id;
    }
  }

  // Try to find existing session for this visitor
  const { data: existingSession } = await supabaseAdmin
    .from("chat_sessions")
    .select("id")
    .eq("project_id", projectId)
    .eq("visitor_id", visitorId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (existingSession) {
    return existingSession.id;
  }

  // Create new session
  const { data: newSession, error } = await supabaseAdmin
    .from("chat_sessions")
    .insert({
      project_id: projectId,
      visitor_id: visitorId,
      messages: [],
      message_count: 0,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Failed to create session:", error);
    return generateSessionId();
  }

  return newSession.id;
}

/**
 * Log conversation for analytics (async, non-blocking)
 */
async function logConversation(
  projectId: string,
  sessionId: string,
  userMessage: string,
  assistantResponse: string,
  sourcesUsed: number,
  toolCallsCount: number
): Promise<void> {
  try {
    // Get current session
    const { data: session } = await supabaseAdmin
      .from("chat_sessions")
      .select("messages, message_count")
      .eq("id", sessionId)
      .single();

    const currentMessages = (session?.messages as unknown[]) || [];

    // Add new messages
    const newMessages = [
      ...currentMessages,
      {
        role: "user",
        content: userMessage,
        timestamp: new Date().toISOString(),
      },
      {
        role: "assistant",
        content: assistantResponse,
        timestamp: new Date().toISOString(),
        metadata: { sourcesUsed, toolCallsCount },
      },
    ];

    // Update session
    await supabaseAdmin
      .from("chat_sessions")
      .update({
        messages: newMessages,
        message_count: (session?.message_count || 0) + 2,
        updated_at: new Date().toISOString(),
      })
      .eq("id", sessionId);
  } catch (error) {
    console.error("Failed to log conversation:", error);
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
  };
}
