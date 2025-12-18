/**
 * RAG v2 - Main Module
 *
 * Unified API for the RAG pipeline including:
 * - Semantic chunking
 * - Contextual embeddings (Anthropic approach)
 * - Hybrid search (vector + full-text)
 *
 * Usage:
 *
 * // Processing new knowledge
 * const pipeline = createProcessingPipeline();
 * const chunks = await pipeline.process(text, documentMetadata);
 *
 * // Retrieving relevant chunks
 * const result = await retrieve(projectId, query);
 */

// Export types
export type {
  TextChunk,
  ContextualChunk,
  ProcessedChunk,
  DocumentMetadata,
  RetrievedChunk,
  RetrievalOptions,
  ChunkingOptions,
  ContextOptions,
  RAGResult,
} from "./types";

// Export configuration
export { RAGConfig, getConfig } from "./config";

// Export chunker
export {
  SemanticChunker,
  createChunker,
  chunkText,
} from "./chunker";

// Export context generator
export {
  ContextGenerator,
  createContextGenerator,
  generateContext,
} from "./context-generator";

// Export embedder
export {
  Embedder,
  createEmbedder,
  embedQuery,
} from "./embedder";

// Export retriever
export {
  HybridRetriever,
  createRetriever,
  retrieve,
  formatAsContext,
  extractSources,
} from "./retriever";

// ============================================================================
// Processing Pipeline
// ============================================================================

import { createChunker } from "./chunker";
import { createContextGenerator } from "./context-generator";
import { createEmbedder } from "./embedder";
import type {
  TextChunk,
  ProcessedChunk,
  DocumentMetadata,
  ChunkingOptions,
  ContextOptions,
} from "./types";

/**
 * Options for the processing pipeline
 */
export interface ProcessingPipelineOptions {
  chunking?: ChunkingOptions;
  context?: ContextOptions & { batchSize?: number };
  embedding?: { batchSize?: number };
  /** Skip context generation (faster but lower quality) */
  skipContext?: boolean;
}

/**
 * Progress callback for pipeline operations
 */
export type ProgressCallback = (
  stage: "chunking" | "context" | "embedding",
  completed: number,
  total: number
) => void;

/**
 * Processing Pipeline
 *
 * Orchestrates the full RAG ingestion pipeline:
 * 1. Chunk the document
 * 2. Generate context for each chunk
 * 3. Generate embeddings
 */
export class ProcessingPipeline {
  private chunker: ReturnType<typeof createChunker>;
  private contextGenerator: ReturnType<typeof createContextGenerator>;
  private embedder: ReturnType<typeof createEmbedder>;
  private skipContext: boolean;

  constructor(options?: ProcessingPipelineOptions) {
    this.chunker = createChunker(options?.chunking);
    this.contextGenerator = createContextGenerator(options?.context);
    this.embedder = createEmbedder(options?.embedding);
    this.skipContext = options?.skipContext ?? false;
  }

  /**
   * Process a document through the full pipeline
   */
  async process(
    text: string,
    documentMetadata: DocumentMetadata,
    onProgress?: ProgressCallback
  ): Promise<ProcessedChunk[]> {
    // Step 1: Chunk the text
    onProgress?.("chunking", 0, 1);
    const chunks = this.chunker.chunk(text);
    onProgress?.("chunking", 1, 1);

    if (chunks.length === 0) {
      return [];
    }

    // Step 2: Generate context for each chunk
    let contextualChunks;
    if (this.skipContext) {
      // Create contextual chunks without LLM-generated context
      contextualChunks = chunks.map((chunk) => ({
        ...chunk,
        context: `From ${documentMetadata.name} (${documentMetadata.type}).`,
        contextualContent: `From ${documentMetadata.name}.\n\n${chunk.content}`,
      }));
      onProgress?.("context", chunks.length, chunks.length);
    } else {
      contextualChunks = await this.contextGenerator.generateForChunks(
        chunks,
        documentMetadata,
        (completed, total) => onProgress?.("context", completed, total)
      );
    }

    // Step 3: Generate embeddings
    const processedChunks = await this.embedder.embedChunks(
      contextualChunks,
      (completed, total) => onProgress?.("embedding", completed, total)
    );

    return processedChunks;
  }

  /**
   * Process with full document context (higher quality, more expensive)
   */
  async processWithFullContext(
    text: string,
    documentMetadata: DocumentMetadata,
    onProgress?: ProgressCallback
  ): Promise<ProcessedChunk[]> {
    // Step 1: Chunk
    onProgress?.("chunking", 0, 1);
    const chunks = this.chunker.chunk(text);
    onProgress?.("chunking", 1, 1);

    if (chunks.length === 0) {
      return [];
    }

    // Step 2: Generate context with full document
    const contextualChunks = [];
    for (let i = 0; i < chunks.length; i++) {
      const contextualChunk = await this.contextGenerator.generateWithFullDocument(
        chunks[i],
        text,
        documentMetadata
      );
      contextualChunks.push(contextualChunk);
      onProgress?.("context", i + 1, chunks.length);
    }

    // Step 3: Generate embeddings
    const processedChunks = await this.embedder.embedChunks(
      contextualChunks,
      (completed, total) => onProgress?.("embedding", completed, total)
    );

    return processedChunks;
  }
}

/**
 * Create a processing pipeline with default options
 */
export function createProcessingPipeline(
  options?: ProcessingPipelineOptions
): ProcessingPipeline {
  return new ProcessingPipeline(options);
}

/**
 * Quick processing function for one-off use
 */
export async function processDocument(
  text: string,
  documentMetadata: DocumentMetadata,
  options?: ProcessingPipelineOptions
): Promise<ProcessedChunk[]> {
  return createProcessingPipeline(options).process(text, documentMetadata);
}
