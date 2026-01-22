/**
 * RAG v2 - Hybrid Retriever
 *
 * Combines vector similarity search with full-text search for better retrieval.
 * Uses Reciprocal Rank Fusion (RRF) to merge results from both search types.
 *
 * Key features:
 * - Vector search using pgvector (semantic similarity)
 * - Full-text search using PostgreSQL tsvector (keyword matching)
 * - RRF fusion for combining results
 * - Configurable weights for vector vs FTS
 */

import { supabaseAdmin } from "../../lib/supabase";
import { logger } from "../../lib/logger";
import { RAGConfig } from "./config";
import { createEmbedder } from "./embedder";
import type { RetrievedChunk, RetrievalOptions, RAGResult, RetrievalMetrics } from "./types";

/**
 * Reciprocal Rank Fusion constant
 * Higher values give more weight to lower-ranked items
 */
const RRF_K = 60;

/**
 * Calculate RRF score for a rank position
 */
function rrfScore(rank: number): number {
  return 1 / (RRF_K + rank);
}

/**
 * Hybrid Retriever Class
 *
 * Performs hybrid search combining vector and full-text search.
 */
export class HybridRetriever {
  private options: Required<RetrievalOptions>;

  constructor(options?: RetrievalOptions) {
    this.options = {
      topK: options?.topK ?? RAGConfig.retrieval.defaultTopK,
      threshold: options?.threshold ?? RAGConfig.retrieval.defaultThreshold,
      vectorWeight: options?.vectorWeight ?? RAGConfig.retrieval.defaultVectorWeight,
      useHybridSearch: options?.useHybridSearch ?? true,
      maxContentLength: options?.maxContentLength ?? RAGConfig.retrieval.maxContentLength,
    };
  }

  /**
   * Main retrieval method - performs hybrid search
   */
  async retrieve(
    projectId: string,
    query: string,
    options?: Partial<RetrievalOptions>
  ): Promise<RAGResult> {
    const startTime = Date.now();
    const opts = { ...this.options, ...options };

    // Initialize metrics
    const metrics: RetrievalMetrics = {
      candidateCount: 0,
      fusedCount: 0,
      filteredCount: 0,
      avgScore: 0,
    };

    // Generate query embedding
    const embedder = createEmbedder();
    const queryEmbedding = await embedder.embedQuery(query);

    let chunks: RetrievedChunk[];
    let searchType: "hybrid" | "vector" | "fts";

    if (opts.useHybridSearch) {
      // Perform hybrid search
      chunks = await this.hybridSearch(projectId, query, queryEmbedding, opts, metrics);
      searchType = "hybrid";
    } else {
      // Vector-only search
      chunks = await this.vectorSearch(projectId, queryEmbedding, opts);
      searchType = "vector";
    }

    // Apply content length limit
    chunks = this.truncateToMaxLength(chunks, opts.maxContentLength);
    metrics.filteredCount = chunks.length;

    // Calculate average score
    if (chunks.length > 0) {
      metrics.avgScore = chunks.reduce((sum, c) => sum + c.combinedScore, 0) / chunks.length;
    }

    // Log retrieval metrics for observability
    logger.debug("RAG retrieval completed", {
      projectId,
      query: query.substring(0, 100),
      searchType,
      ...metrics,
      processingTimeMs: Date.now() - startTime,
    });

    return {
      chunks,
      query,
      totalFound: chunks.length,
      searchType,
      processingTimeMs: Date.now() - startTime,
      metrics,
    };
  }

  /**
   * Hybrid search combining vector and full-text search with RRF fusion
   */
  private async hybridSearch(
    projectId: string,
    query: string,
    queryEmbedding: number[],
    opts: Required<RetrievalOptions>,
    metrics: RetrievalMetrics
  ): Promise<RetrievedChunk[]> {
    const candidateCount = opts.topK * RAGConfig.retrieval.candidateMultiplier;

    // Execute both searches in parallel
    const vectorStart = Date.now();
    const [vectorResults, ftsResults] = await Promise.all([
      this.vectorSearchRaw(projectId, queryEmbedding, candidateCount),
      this.ftsSearchRaw(projectId, query, candidateCount),
    ]);
    metrics.vectorSearchMs = Date.now() - vectorStart;

    metrics.candidateCount = vectorResults.length + ftsResults.length;

    // Apply RRF fusion
    const fused = this.applyRRF(vectorResults, ftsResults, opts.vectorWeight);
    metrics.fusedCount = fused.length;

    // Filter by threshold and limit
    return fused
      .filter((chunk) => chunk.combinedScore >= opts.threshold)
      .slice(0, opts.topK);
  }

  /**
   * Vector-only search using pgvector
   */
  private async vectorSearch(
    projectId: string,
    queryEmbedding: number[],
    opts: Required<RetrievalOptions>
  ): Promise<RetrievedChunk[]> {
    const results = await this.vectorSearchRaw(projectId, queryEmbedding, opts.topK * 2);

    return results
      .filter((chunk) => chunk.vectorScore >= opts.threshold)
      .slice(0, opts.topK)
      .map((chunk) => ({
        ...chunk,
        combinedScore: chunk.vectorScore,
      }));
  }

  /**
   * Raw vector search - returns results with vector scores
   */
  private async vectorSearchRaw(
    projectId: string,
    queryEmbedding: number[],
    limit: number
  ): Promise<RetrievedChunk[]> {
    const embeddingStr = `[${queryEmbedding.join(",")}]`;

    const { data, error } = await supabaseAdmin.rpc("hybrid_search_chunks", {
      query_embedding: embeddingStr,
      query_text: "", // Empty for vector-only
      match_count: limit,
      p_project_id: projectId,
      vector_weight: 1.0, // Full weight on vector
    });

    if (error) {
      console.error("Vector search error:", error);
      throw new Error(`Vector search failed: ${error.message}`);
    }

    return (data || []).map((row: HybridSearchRow) => ({
      id: row.id,
      sourceId: row.source_id,
      sourceName: row.source_name || "Unknown",
      content: row.content,
      context: row.context || undefined,
      vectorScore: row.vector_score || 0,
      ftsScore: 0,
      combinedScore: row.vector_score || 0,
      metadata: row.metadata || {},
    }));
  }

  /**
   * Raw full-text search - returns results with FTS scores
   */
  private async ftsSearchRaw(
    projectId: string,
    query: string,
    limit: number
  ): Promise<RetrievedChunk[]> {
    // Create tsquery from the user's query
    const tsQuery = this.createTsQuery(query);

    const { data, error } = await supabaseAdmin.rpc("fts_search_chunks", {
      query_text: tsQuery,
      match_count: limit,
      p_project_id: projectId,
    });

    if (error) {
      console.error("FTS search error:", error);
      // FTS errors shouldn't fail the whole search
      return [];
    }

    return (data || []).map((row: FtsSearchRow) => ({
      id: row.id,
      sourceId: row.source_id,
      sourceName: row.source_name || "Unknown",
      content: row.content,
      context: row.context || undefined,
      vectorScore: 0,
      ftsScore: row.fts_score || 0,
      combinedScore: row.fts_score || 0,
      metadata: row.metadata || {},
    }));
  }

  /**
   * Apply Reciprocal Rank Fusion to combine results
   */
  private applyRRF(
    vectorResults: RetrievedChunk[],
    ftsResults: RetrievedChunk[],
    vectorWeight: number
  ): RetrievedChunk[] {
    const ftsWeight = 1 - vectorWeight;
    const scoreMap = new Map<string, RetrievedChunk & { rrfScore: number }>();

    // Process vector results
    vectorResults.forEach((chunk, rank) => {
      const existing = scoreMap.get(chunk.id);
      const vectorRRF = rrfScore(rank + 1) * vectorWeight;

      if (existing) {
        existing.rrfScore += vectorRRF;
        existing.vectorScore = chunk.vectorScore;
      } else {
        scoreMap.set(chunk.id, {
          ...chunk,
          rrfScore: vectorRRF,
        });
      }
    });

    // Process FTS results
    ftsResults.forEach((chunk, rank) => {
      const existing = scoreMap.get(chunk.id);
      const ftsRRF = rrfScore(rank + 1) * ftsWeight;

      if (existing) {
        existing.rrfScore += ftsRRF;
        existing.ftsScore = chunk.ftsScore;
      } else {
        scoreMap.set(chunk.id, {
          ...chunk,
          rrfScore: ftsRRF,
        });
      }
    });

    // Sort by RRF score and normalize to 0-1 range
    const results = Array.from(scoreMap.values());
    const maxRRF = Math.max(...results.map((r) => r.rrfScore), 0.001);

    return results
      .map((chunk) => ({
        ...chunk,
        combinedScore: chunk.rrfScore / maxRRF, // Normalize to 0-1
      }))
      .sort((a, b) => b.combinedScore - a.combinedScore);
  }

  /**
   * Convert user query to PostgreSQL tsquery format
   */
  private createTsQuery(query: string): string {
    // Split into words, filter empty, join with OR for broader matching
    const words = query
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2); // Skip very short words

    if (words.length === 0) return "";

    // Use OR between words for broader matching
    return words.join(" | ");
  }

  /**
   * Truncate results to fit max content length
   */
  private truncateToMaxLength(
    chunks: RetrievedChunk[],
    maxLength: number
  ): RetrievedChunk[] {
    const result: RetrievedChunk[] = [];
    let totalLength = 0;

    for (const chunk of chunks) {
      if (totalLength + chunk.content.length > maxLength) {
        // Try to fit a partial chunk
        const remaining = maxLength - totalLength;
        if (remaining > 200) {
          result.push({
            ...chunk,
            content: chunk.content.slice(0, remaining - 3) + "...",
          });
        }
        break;
      }

      result.push(chunk);
      totalLength += chunk.content.length;
    }

    return result;
  }
}

/**
 * Database row types
 */
interface HybridSearchRow {
  id: string;
  source_id: string;
  source_name: string;
  content: string;
  context: string | null;
  vector_score: number;
  fts_score: number;
  metadata: Record<string, unknown>;
}

interface FtsSearchRow {
  id: string;
  source_id: string;
  source_name: string;
  content: string;
  context: string | null;
  fts_score: number;
  metadata: Record<string, unknown>;
}

/**
 * Create a retriever with default options
 */
export function createRetriever(options?: RetrievalOptions): HybridRetriever {
  return new HybridRetriever(options);
}

/**
 * Quick retrieval function
 */
export async function retrieve(
  projectId: string,
  query: string,
  options?: RetrievalOptions
): Promise<RAGResult> {
  return createRetriever(options).retrieve(projectId, query);
}

/**
 * Format retrieved chunks as context for the LLM
 */
export function formatAsContext(chunks: RetrievedChunk[]): string {
  if (chunks.length === 0) {
    return "No relevant information found in the knowledge base.";
  }

  return chunks
    .map((chunk, index) => {
      const score = Math.round(chunk.combinedScore * 100);
      return `[Source ${index + 1}: ${chunk.sourceName} (${score}% match)]\n${chunk.content}`;
    })
    .join("\n\n---\n\n");
}

/**
 * Extract source references for UI display
 */
export function extractSources(
  chunks: RetrievedChunk[]
): { id: string; name: string; relevance: number }[] {
  const sourceMap = new Map<string, { id: string; name: string; relevance: number }>();

  for (const chunk of chunks) {
    const existing = sourceMap.get(chunk.sourceId);
    const relevance = Math.round(chunk.combinedScore * 100);

    if (!existing || relevance > existing.relevance) {
      sourceMap.set(chunk.sourceId, {
        id: chunk.sourceId,
        name: chunk.sourceName,
        relevance,
      });
    }
  }

  return Array.from(sourceMap.values()).sort((a, b) => b.relevance - a.relevance);
}
