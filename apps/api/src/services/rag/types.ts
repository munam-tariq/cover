/**
 * RAG v2 - Type Definitions
 *
 * Central type definitions for the RAG pipeline.
 * Keeping types separate allows for easy refactoring and testing.
 */

/**
 * A chunk of text extracted from a document
 */
export interface TextChunk {
  /** The actual text content */
  content: string;
  /** Position index in the original document */
  index: number;
  /** Start character position in source */
  startChar?: number;
  /** End character position in source */
  endChar?: number;
  /** Optional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * A chunk with generated context (Anthropic's Contextual Retrieval)
 */
export interface ContextualChunk extends TextChunk {
  /** LLM-generated context explaining what this chunk is about */
  context: string;
  /** The combined content (context + original) used for embedding */
  contextualContent: string;
}

/**
 * A chunk ready for storage with all computed fields
 */
export interface ProcessedChunk extends ContextualChunk {
  /** Vector embedding of the contextual content */
  embedding: number[];
  /** Full-text search tokens (for hybrid search) */
  ftsTokens?: string;
}

/**
 * Document metadata for context generation
 */
export interface DocumentMetadata {
  /** Name/title of the source document */
  name: string;
  /** Type of document (pdf, text, file, url) */
  type: string;
  /** Optional description */
  description?: string;
  /** Any additional metadata */
  [key: string]: unknown;
}

/**
 * A retrieved chunk with similarity/relevance scores
 */
export interface RetrievedChunk {
  id: string;
  sourceId: string;
  sourceName: string;
  content: string;
  context?: string;
  /** Vector similarity score (0-1) */
  vectorScore: number;
  /** Full-text search score (0-1, normalized) */
  ftsScore: number;
  /** Combined score after fusion */
  combinedScore: number;
  metadata: Record<string, unknown>;
}

/**
 * Options for retrieval
 */
export interface RetrievalOptions {
  /** Maximum number of results to return */
  topK?: number;
  /** Minimum similarity threshold (0-1) */
  threshold?: number;
  /** Weight for vector search (0-1), FTS gets 1-weight */
  vectorWeight?: number;
  /** Whether to use hybrid search (default: true) */
  useHybridSearch?: boolean;
  /** Maximum total content length in characters */
  maxContentLength?: number;
}

/**
 * Options for chunking
 */
export interface ChunkingOptions {
  /** Target chunk size in tokens */
  chunkSize?: number;
  /** Overlap between chunks in tokens */
  overlap?: number;
  /** Whether to use semantic boundaries */
  useSemanticBoundaries?: boolean;
}

/**
 * Options for context generation
 */
export interface ContextOptions {
  /** Maximum tokens for generated context */
  maxContextTokens?: number;
  /** Whether to include document metadata */
  includeMetadata?: boolean;
}

/**
 * Retrieval metrics for observability
 */
export interface RetrievalMetrics {
  /** Total candidates retrieved before fusion */
  candidateCount: number;
  /** Chunks after RRF fusion */
  fusedCount: number;
  /** Chunks after threshold filtering */
  filteredCount: number;
  /** Average combined score of returned chunks */
  avgScore: number;
  /** Time spent on search (ms) */
  vectorSearchMs?: number;
}

/**
 * Result from the full RAG pipeline
 */
export interface RAGResult {
  chunks: RetrievedChunk[];
  query: string;
  totalFound: number;
  searchType: "hybrid" | "vector" | "fts";
  processingTimeMs: number;
  /** Detailed retrieval metrics for observability */
  metrics?: RetrievalMetrics;
}
