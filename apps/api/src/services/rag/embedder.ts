/**
 * RAG v2 - Embedder
 *
 * Handles embedding generation for chunks.
 * Uses OpenAI's text-embedding-3-small model.
 *
 * Key features:
 * - Batch processing for efficiency
 * - Automatic retry with exponential backoff
 * - Progress tracking for large jobs
 */

import { openai } from "../../lib/openai";
import { RAGConfig } from "./config";
import type { ContextualChunk, ProcessedChunk } from "./types";

/**
 * Generate embedding for a single text
 */
async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: RAGConfig.embedding.model,
    input: text,
  });

  return response.data[0].embedding;
}

/**
 * Generate embeddings for multiple texts in a batch
 */
async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  const response = await openai.embeddings.create({
    model: RAGConfig.embedding.model,
    input: texts,
  });

  // Sort by index to maintain order
  return response.data
    .sort((a, b) => a.index - b.index)
    .map((item) => item.embedding);
}

/**
 * Embedder Class
 *
 * Generates embeddings for text chunks with batching and error handling.
 */
export class Embedder {
  private batchSize: number;
  private maxRetries: number;

  constructor(options?: { batchSize?: number; maxRetries?: number }) {
    this.batchSize = options?.batchSize ?? RAGConfig.embedding.batchSize;
    this.maxRetries = options?.maxRetries ?? 3;
  }

  /**
   * Generate embedding for a single chunk
   */
  async embedChunk(chunk: ContextualChunk): Promise<ProcessedChunk> {
    const embedding = await this.withRetry(() =>
      generateEmbedding(chunk.contextualContent)
    );

    return {
      ...chunk,
      embedding,
    };
  }

  /**
   * Generate embeddings for multiple chunks
   */
  async embedChunks(
    chunks: ContextualChunk[],
    onProgress?: (completed: number, total: number) => void
  ): Promise<ProcessedChunk[]> {
    const results: ProcessedChunk[] = [];
    const total = chunks.length;

    // Process in batches
    for (let i = 0; i < chunks.length; i += this.batchSize) {
      const batch = chunks.slice(i, i + this.batchSize);
      const texts = batch.map((c) => c.contextualContent);

      const embeddings = await this.withRetry(() => generateEmbeddings(texts));

      // Combine chunks with embeddings
      for (let j = 0; j < batch.length; j++) {
        results.push({
          ...batch[j],
          embedding: embeddings[j],
        });
      }

      // Report progress
      if (onProgress) {
        onProgress(Math.min(i + this.batchSize, total), total);
      }
    }

    return results;
  }

  /**
   * Generate embedding for a query (used during retrieval)
   */
  async embedQuery(query: string): Promise<number[]> {
    return this.withRetry(() => generateEmbedding(query));
  }

  /**
   * Retry wrapper with exponential backoff
   */
  private async withRetry<T>(
    fn: () => Promise<T>,
    attempt: number = 1
  ): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (attempt >= this.maxRetries) {
        throw error;
      }

      // Exponential backoff: 1s, 2s, 4s, ...
      const delay = Math.pow(2, attempt - 1) * 1000;
      console.warn(`Embedding attempt ${attempt} failed, retrying in ${delay}ms`);

      await sleep(delay);
      return this.withRetry(fn, attempt + 1);
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
 * Create an embedder with default options
 */
export function createEmbedder(options?: {
  batchSize?: number;
  maxRetries?: number;
}): Embedder {
  return new Embedder(options);
}

/**
 * Quick embedding for a query string
 */
export async function embedQuery(query: string): Promise<number[]> {
  return createEmbedder().embedQuery(query);
}
