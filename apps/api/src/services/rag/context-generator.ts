/**
 * RAG v2 - Context Generator
 *
 * Implements Anthropic's Contextual Retrieval approach.
 * Generates context for each chunk to improve retrieval accuracy.
 *
 * The key insight: chunks often lack context about what document they're from
 * and what they're about. By prepending a brief context, we dramatically
 * improve embedding quality and retrieval accuracy.
 *
 * Reference: https://www.anthropic.com/news/contextual-retrieval
 */

import { openai } from "../../lib/openai";
import { RAGConfig } from "./config";
import type {
  TextChunk,
  ContextualChunk,
  DocumentMetadata,
  ContextOptions,
} from "./types";

/**
 * Generate context for a single chunk
 */
async function generateChunkContext(
  chunk: TextChunk,
  documentMetadata: DocumentMetadata,
  options?: ContextOptions
): Promise<string> {
  const prompt = RAGConfig.prompts.contextGeneration
    .replace("{{DOCUMENT_TITLE}}", documentMetadata.name)
    .replace("{{DOCUMENT_TYPE}}", documentMetadata.type)
    .replace("{{CHUNK_CONTENT}}", chunk.content);

  try {
    const response = await openai.chat.completions.create({
      model: RAGConfig.context.model,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      max_tokens: options?.maxContextTokens ?? RAGConfig.context.maxContextTokens,
      temperature: RAGConfig.context.temperature,
    });

    const context = response.choices[0]?.message?.content?.trim() || "";
    return context;
  } catch (error) {
    console.error("Context generation failed for chunk:", error);
    // Fallback: use document metadata as basic context
    return `From ${documentMetadata.name} (${documentMetadata.type}).`;
  }
}

/**
 * Combine context with chunk content
 */
function combineContextWithContent(context: string, content: string): string {
  // Format: [Context] + newline + [Original content]
  // This structure helps the embedding model understand the relationship
  return `${context}\n\n${content}`;
}

/**
 * Context Generator Class
 *
 * Adds contextual information to chunks for better retrieval.
 */
export class ContextGenerator {
  private batchSize: number;
  private options: ContextOptions;

  constructor(options?: ContextOptions & { batchSize?: number }) {
    this.batchSize = options?.batchSize ?? 5;
    this.options = options ?? {};
  }

  /**
   * Generate context for a single chunk
   */
  async generateForChunk(
    chunk: TextChunk,
    documentMetadata: DocumentMetadata
  ): Promise<ContextualChunk> {
    const context = await generateChunkContext(
      chunk,
      documentMetadata,
      this.options
    );

    const contextualContent = combineContextWithContent(context, chunk.content);

    return {
      ...chunk,
      context,
      contextualContent,
    };
  }

  /**
   * Generate context for multiple chunks in parallel
   * Uses batching to avoid rate limits
   */
  async generateForChunks(
    chunks: TextChunk[],
    documentMetadata: DocumentMetadata,
    onProgress?: (completed: number, total: number) => void
  ): Promise<ContextualChunk[]> {
    const results: ContextualChunk[] = [];
    const total = chunks.length;

    // Process in batches
    for (let i = 0; i < chunks.length; i += this.batchSize) {
      const batch = chunks.slice(i, i + this.batchSize);

      const batchResults = await Promise.all(
        batch.map((chunk) =>
          this.generateForChunk(chunk, documentMetadata)
        )
      );

      results.push(...batchResults);

      // Report progress
      if (onProgress) {
        onProgress(Math.min(i + this.batchSize, total), total);
      }

      // Small delay between batches to avoid rate limits
      if (i + this.batchSize < chunks.length) {
        await sleep(100);
      }
    }

    return results;
  }

  /**
   * Generate context using the full document for better understanding
   * This is closer to Anthropic's original approach but more expensive
   */
  async generateWithFullDocument(
    chunk: TextChunk,
    fullDocument: string,
    documentMetadata: DocumentMetadata
  ): Promise<ContextualChunk> {
    // For very long documents, we truncate to save tokens
    const maxDocLength = 8000;
    const truncatedDoc =
      fullDocument.length > maxDocLength
        ? fullDocument.slice(0, maxDocLength) + "..."
        : fullDocument;

    const prompt = `<document>
${truncatedDoc}
</document>

Here is a chunk we want to situate within the document above:
<chunk>
${chunk.content}
</chunk>

Please give a short succinct context (2-3 sentences) to situate this chunk within the overall document for improving search retrieval. Focus on what specific information this chunk contains and any key entities or facts. Answer only with the context.`;

    try {
      const response = await openai.chat.completions.create({
        model: RAGConfig.context.model,
        messages: [{ role: "user", content: prompt }],
        max_tokens: RAGConfig.context.maxContextTokens,
        temperature: RAGConfig.context.temperature,
      });

      const context = response.choices[0]?.message?.content?.trim() || "";
      const contextualContent = combineContextWithContent(context, chunk.content);

      return {
        ...chunk,
        context,
        contextualContent,
      };
    } catch (error) {
      console.error("Full document context generation failed:", error);
      // Fallback to simple context generation
      return this.generateForChunk(chunk, documentMetadata);
    }
  }
}

/**
 * Simple sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Create a context generator with default options
 */
export function createContextGenerator(
  options?: ContextOptions & { batchSize?: number }
): ContextGenerator {
  return new ContextGenerator(options);
}

/**
 * Quick context generation for a single chunk
 */
export async function generateContext(
  chunk: TextChunk,
  documentMetadata: DocumentMetadata,
  options?: ContextOptions
): Promise<ContextualChunk> {
  return createContextGenerator(options).generateForChunk(chunk, documentMetadata);
}
