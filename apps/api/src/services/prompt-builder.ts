/**
 * Prompt Builder Service
 *
 * Constructs optimized system prompts for the chat engine.
 * Handles context injection, tool descriptions, and conversation flow.
 *
 * Prompt templates are defined in ./prompts.ts — this file handles
 * placeholder substitution, message construction, and security sanitization.
 */

import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import {
  CHAT_SYSTEM_PROMPT_TEMPLATE,
  CHAT_TOOLS_SECTION,
  SENSITIVE_OUTPUT_PATTERNS,
} from "./prompts";

/**
 * Project configuration for prompt building
 */
export interface ProjectConfig {
  name: string;
  systemPrompt?: string | null;
  supportEmail?: string;
  supportUrl?: string;
}

/**
 * Build options for system prompt
 */
export interface PromptBuildOptions {
  project: ProjectConfig;
  knowledgeContext: string;
  hasTools: boolean;
  toolDescriptions?: string;
}

/**
 * Build the system prompt for the chat engine.
 *
 * IMPORTANT: Custom personality is always INJECTED into the template, never replaces it.
 * This ensures security rules, knowledge grounding, and formatting guidelines are always present.
 */
export function buildSystemPrompt(options: PromptBuildOptions): string {
  const { project, knowledgeContext, hasTools, toolDescriptions } = options;

  // Always use the template — inject custom personality into it
  let prompt = CHAT_SYSTEM_PROMPT_TEMPLATE;

  // Build personality section from custom prompt
  const customPrompt = project.systemPrompt?.trim();
  const personalitySection = customPrompt
    ? `## Your Personality & Special Instructions\n\n${customPrompt}`
    : "";

  // Build fallback contact suggestion
  const fallbackContact = project.supportEmail
    ? `please reach out to us at ${project.supportEmail}`
    : project.supportUrl
      ? `check ${project.supportUrl} for more details`
      : "reach out to our support team directly";

  // Build tools section
  const toolsSection = hasTools
    ? CHAT_TOOLS_SECTION + (toolDescriptions ? `\n\n${toolDescriptions}` : "")
    : "";

  // Replace placeholders
  prompt = prompt
    .replace(/{business_name}/g, project.name || "the business")
    .replace(/{context}/g, knowledgeContext)
    .replace(/{tools_section}/g, toolsSection)
    .replace(/{fallback_contact}/g, fallbackContact)
    .replace(/{personality}/g, personalitySection);

  return prompt;
}

/**
 * Build the messages array for OpenAI chat completion
 *
 * Wraps user messages in <user_message> tags to create clear boundaries
 * between trusted system content and untrusted user input.
 */
export function buildChatMessages(
  systemPrompt: string,
  conversationHistory: Array<{ role: "user" | "assistant"; content: string }>,
  currentMessage: string,
  maxHistoryMessages: number = 10
): ChatCompletionMessageParam[] {
  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
  ];

  // Add conversation history (limited to prevent context overflow)
  const recentHistory = conversationHistory.slice(-maxHistoryMessages);
  for (const msg of recentHistory) {
    messages.push({
      role: msg.role,
      // Wrap user messages in delimiter tags for security
      content:
        msg.role === "user"
          ? wrapUserMessage(msg.content)
          : msg.content,
    });
  }

  // Add current user message (wrapped in delimiter tags)
  messages.push({
    role: "user",
    content: wrapUserMessage(currentMessage),
  });

  return messages;
}

/**
 * Wrap user message with delimiter tags
 * This creates a clear boundary between trusted and untrusted content
 */
function wrapUserMessage(content: string): string {
  return `<user_message>\n${content}\n</user_message>`;
}

/**
 * Estimate token count for a string (rough approximation)
 * OpenAI uses ~4 chars per token on average
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Check if messages fit within token budget
 */
export function checkTokenBudget(
  messages: ChatCompletionMessageParam[],
  maxTokens: number = 8000
): { withinBudget: boolean; estimatedTokens: number } {
  const totalContent = messages
    .map((m) => (typeof m.content === "string" ? m.content : ""))
    .join(" ");

  const estimatedTokens = estimateTokens(totalContent);
  return {
    withinBudget: estimatedTokens < maxTokens,
    estimatedTokens,
  };
}

/**
 * Truncate conversation history if needed to fit token budget
 */
export function truncateHistoryToFit(
  systemPrompt: string,
  conversationHistory: Array<{ role: "user" | "assistant"; content: string }>,
  currentMessage: string,
  maxTokens: number = 6000
): Array<{ role: "user" | "assistant"; content: string }> {
  const systemTokens = estimateTokens(systemPrompt);
  const currentTokens = estimateTokens(currentMessage);
  const availableTokens = maxTokens - systemTokens - currentTokens - 500; // 500 token buffer

  if (availableTokens <= 0) {
    return []; // No room for history
  }

  // Build history from most recent, stopping when we exceed budget
  const truncated: Array<{ role: "user" | "assistant"; content: string }> = [];
  let usedTokens = 0;

  for (let i = conversationHistory.length - 1; i >= 0; i--) {
    const msg = conversationHistory[i];
    const msgTokens = estimateTokens(msg.content);

    if (usedTokens + msgTokens > availableTokens) {
      break;
    }

    truncated.unshift(msg);
    usedTokens += msgTokens;
  }

  return truncated;
}

/**
 * Generate a fallback response when things go wrong
 */
export function generateFallbackResponse(
  reason: "no_knowledge" | "error" | "timeout" | "empty_response",
  projectName?: string
): string {
  const name = projectName || "our team";

  switch (reason) {
    case "no_knowledge":
      return `I don't have specific information about that in my knowledge base. Please contact ${name} directly for assistance.`;
    case "error":
      return `I'm having trouble processing your request right now. Please try again in a moment, or contact ${name} for immediate help.`;
    case "timeout":
      return `Your request is taking longer than expected. Please try asking a simpler question, or contact ${name} directly.`;
    case "empty_response":
      return `I wasn't able to generate a helpful response. Could you try rephrasing your question?`;
    default:
      return `I'm unable to help with that right now. Please contact ${name} for assistance.`;
  }
}

/**
 * Sanitize user input to prevent prompt injection
 *
 * Defense layers:
 * 1. Unicode normalization (catch homoglyph attacks)
 * 2. Instruction override patterns
 * 3. Role-play/jailbreak attempts
 * 4. System prompt extraction attempts
 * 5. Delimiter injection
 * 6. Length limiting
 */
export function sanitizeUserInput(input: string): string {
  // Step 1: Normalize unicode to catch homoglyph attacks (e.g., Cyrillic 'а' vs Latin 'a')
  let sanitized = input.normalize("NFKC");

  // Step 2: Remove instruction override patterns
  sanitized = sanitized
    .replace(/ignore\s+(all\s+)?(previous|above|prior)\s+instructions?/gi, "")
    .replace(/disregard\s+(all\s+)?(previous|above|prior)\s+instructions?/gi, "")
    .replace(/forget\s+(all\s+)?(previous|above|prior)\s+instructions?/gi, "")
    .replace(/override\s+(all\s+)?(previous|above|prior)\s+instructions?/gi, "");

  // Step 3: Remove role-play and jailbreak attempts
  sanitized = sanitized
    .replace(/you\s+are\s+now\s+/gi, "")
    .replace(/pretend\s+(to\s+be\s+|you\s+are\s+)/gi, "")
    .replace(/act\s+as\s+(if\s+you\s+are\s+|a\s+)?/gi, "")
    .replace(/do\s+anything\s+now/gi, "") // DAN jailbreak
    .replace(/DAN\s*\d*/gi, "") // DAN variants
    .replace(/developer\s+mode/gi, "")
    .replace(/jailbreak/gi, "")
    .replace(/bypass\s+(your\s+)?(safety|security|restrictions|guidelines)/gi, "");

  // Step 4: Block system prompt extraction attempts
  sanitized = sanitized
    .replace(/show\s+(me\s+)?(your|the)\s+(system|original|initial)\s+(prompt|instructions)/gi, "")
    .replace(/what\s+(is|are)\s+your\s+(system\s+)?(prompt|instructions)/gi, "")
    .replace(/reveal\s+(your\s+)?(system\s+)?(prompt|instructions)/gi, "")
    .replace(/repeat\s+(your\s+)?(system\s+)?(prompt|instructions|everything)/gi, "");

  // Step 5: Remove delimiter injection attempts
  sanitized = sanitized
    .replace(/```\s*(system|assistant|user|human)/gi, "```") // Code block role injection
    .replace(/<\s*(system|assistant|user|human)\s*>/gi, "") // XML tag injection
    .replace(/\[\s*(system|assistant|user|human)\s*\]/gi, ""); // Bracket injection

  // Step 6: Remove role prefix injection (lines starting with role names)
  sanitized = sanitized.replace(/^(system|assistant|ai|chatgpt|claude|gpt|human):/gim, "");

  // Step 7: Limit to reasonable length
  sanitized = sanitized.slice(0, 2000);

  // Trim whitespace
  sanitized = sanitized.trim();

  return sanitized;
}

/**
 * Sanitize LLM output to prevent system prompt leakage
 *
 * Checks if the output contains sensitive phrases from the system prompt
 * that should never be included in responses.
 */
export function sanitizeOutput(output: string): {
  sanitized: string;
  wasFiltered: boolean;
  reason?: string;
} {
  // Check for sensitive patterns
  for (const pattern of SENSITIVE_OUTPUT_PATTERNS) {
    if (pattern.test(output)) {
      return {
        sanitized: "I can't respond to that request. How can I help you with something else?",
        wasFiltered: true,
        reason: "potential_prompt_leak",
      };
    }
  }

  // Check for role-play compliance (LLM shouldn't claim to be something else)
  if (/i am now|i will now pretend|entering.*mode/i.test(output)) {
    return {
      sanitized: "I can't respond to that request. How can I help you with something else?",
      wasFiltered: true,
      reason: "role_play_detected",
    };
  }

  return {
    sanitized: output,
    wasFiltered: false,
  };
}
