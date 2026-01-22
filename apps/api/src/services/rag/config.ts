/**
 * RAG v2 - Configuration
 *
 * Centralized configuration for the RAG pipeline.
 * All magic numbers and tunable parameters live here.
 */

export const RAGConfig = {
  /**
   * Chunking Configuration
   */
  chunking: {
    /** Target chunk size in tokens (400-512 optimal for context retention) */
    defaultChunkSize: 400,
    /** Overlap between chunks in tokens (helps preserve context) */
    defaultOverlap: 50,
    /** Minimum chunk size to keep (avoid tiny chunks) */
    minChunkSize: 50,
    /** Characters per token estimation */
    charsPerToken: 4,
  },

  /**
   * Context Generation Configuration (Anthropic's approach)
   */
  context: {
    /** Maximum tokens for generated context */
    maxContextTokens: 100,
    /** Model to use for context generation */
    model: "gpt-4o-mini" as const,
    /** Temperature for context generation (lower = more focused) */
    temperature: 0.3,
  },

  /**
   * Embedding Configuration
   */
  embedding: {
    /** OpenAI embedding model */
    model: "text-embedding-3-small" as const,
    /** Embedding dimensions */
    dimensions: 1536,
    /** Batch size for embedding multiple texts */
    batchSize: 20,
  },

  /**
   * Retrieval Configuration
   */
  retrieval: {
    /** Default number of results to return */
    defaultTopK: 5,
    /** Default similarity threshold (lowered for hybrid search) */
    defaultThreshold: 0.15,
    /** Weight for vector search in hybrid (0-1) */
    defaultVectorWeight: 0.7,
    /** Weight for FTS in hybrid (calculated as 1 - vectorWeight) */
    get defaultFtsWeight() {
      return 1 - this.defaultVectorWeight;
    },
    /** Maximum content length to return */
    maxContentLength: 8000,
    /** Number of candidates to fetch before fusion (higher = better fusion quality) */
    candidateMultiplier: 5,
  },

  /**
   * Full-Text Search Configuration
   */
  fts: {
    /** PostgreSQL text search configuration */
    textSearchConfig: "english",
    /** Columns to include in FTS */
    searchColumns: ["content", "context"],
  },

  /**
   * Prompt Templates
   */
  prompts: {
    /**
     * Context generation prompt (Anthropic's approach)
     * Variables: {{DOCUMENT_TITLE}}, {{DOCUMENT_TYPE}}, {{CHUNK_CONTENT}}
     */
    contextGeneration: `You are an AI assistant helping to improve document retrieval.
Given a document and a chunk from that document, provide a brief context (2-3 sentences)
that explains what this chunk is about and how it relates to the document.

Document: {{DOCUMENT_TITLE}} ({{DOCUMENT_TYPE}})

Chunk:
{{CHUNK_CONTENT}}

Provide ONLY the contextual description, no other text. Focus on:
- What specific topic/information this chunk contains
- Key entities, numbers, or facts mentioned
- How this relates to the overall document

Context:`,
  },
} as const;

/**
 * Get a typed config value with optional override
 */
export function getConfig<T>(
  path: string,
  override?: T
): T {
  if (override !== undefined) return override;

  const parts = path.split(".");
  let value: unknown = RAGConfig;

  for (const part of parts) {
    if (value && typeof value === "object" && part in value) {
      value = (value as Record<string, unknown>)[part];
    } else {
      throw new Error(`Config path not found: ${path}`);
    }
  }

  return value as T;
}
