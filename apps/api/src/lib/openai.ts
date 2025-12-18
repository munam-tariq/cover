import OpenAI from "openai";

const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
  console.warn("OpenAI API key not configured. AI features will fail.");
}

export const openai = new OpenAI({
  apiKey: apiKey || "",
});

/**
 * Generate embeddings for text
 * Uses text-embedding-3-small model
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
  });

  return response.data[0].embedding;
}

/**
 * Chat completion with GPT-4o-mini
 */
export async function chatCompletion(
  messages: OpenAI.Chat.ChatCompletionMessageParam[],
  options?: {
    temperature?: number;
    maxTokens?: number;
    tools?: OpenAI.Chat.ChatCompletionTool[];
  }
) {
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages,
    temperature: options?.temperature ?? 0.7,
    max_tokens: options?.maxTokens ?? 1000,
    tools: options?.tools,
  });

  return response;
}
