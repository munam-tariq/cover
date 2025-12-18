/**
 * RAG Retrieval Service
 *
 * Handles semantic search over knowledge base using vector similarity.
 * Embeds queries and retrieves the most relevant knowledge chunks.
 */

import { generateEmbedding } from "../lib/openai";
import { supabaseAdmin } from "../lib/supabase";

/**
 * A retrieved knowledge chunk with similarity score
 */
export interface RetrievedChunk {
  id: string;
  sourceId: string;
  sourceName: string;
  content: string;
  similarity: number;
  metadata: Record<string, unknown>;
}

/**
 * Options for knowledge retrieval
 */
export interface RetrievalOptions {
  /** Maximum number of chunks to retrieve (default: 5) */
  topK?: number;
  /** Minimum similarity threshold (default: 0.7) */
  threshold?: number;
  /** Maximum total content length in characters (default: 8000) */
  maxContentLength?: number;
}

const DEFAULT_OPTIONS: Required<RetrievalOptions> = {
  topK: 5,
  threshold: 0.3, // Lower threshold to be more inclusive for small knowledge bases
  maxContentLength: 8000,
};

/**
 * Retrieve relevant knowledge chunks for a query
 *
 * Process:
 * 1. Generate embedding for the query
 * 2. Search knowledge_chunks using pgvector similarity
 * 3. Join with knowledge_sources for source names
 * 4. Filter by similarity threshold
 * 5. Truncate if total content exceeds max length
 */
export async function retrieveRelevantKnowledge(
  projectId: string,
  query: string,
  options: RetrievalOptions = {}
): Promise<RetrievedChunk[]> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Generate query embedding
  const queryEmbedding = await generateEmbedding(query);
  const embeddingStr = `[${queryEmbedding.join(",")}]`;

  // Search using the database function
  console.log(`[RAG] Searching for projectId=${projectId}, threshold=${opts.threshold}, topK=${opts.topK}`);

  const { data: chunks, error } = await supabaseAdmin.rpc(
    "match_knowledge_chunks",
    {
      query_embedding: embeddingStr,
      match_threshold: opts.threshold,
      match_count: opts.topK,
      p_project_id: projectId,
    }
  );

  if (error) {
    console.error("RAG retrieval error:", error);
    throw new Error(`Knowledge retrieval failed: ${error.message}`);
  }

  console.log(`[RAG] Found ${chunks?.length || 0} chunks`);

  if (!chunks || chunks.length === 0) {
    return [];
  }

  // Get source names for the chunks
  const sourceIds = [...new Set(chunks.map((c: { source_id: string }) => c.source_id))];
  const { data: sources } = await supabaseAdmin
    .from("knowledge_sources")
    .select("id, name")
    .in("id", sourceIds);

  const sourceNameMap = new Map(
    (sources || []).map((s: { id: string; name: string }) => [s.id, s.name])
  );

  // Map to RetrievedChunk format
  let retrievedChunks: RetrievedChunk[] = chunks.map(
    (chunk: {
      id: string;
      source_id: string;
      content: string;
      similarity: number;
      metadata: Record<string, unknown>;
    }) => ({
      id: chunk.id,
      sourceId: chunk.source_id,
      sourceName: sourceNameMap.get(chunk.source_id) || "Unknown Source",
      content: chunk.content,
      similarity: chunk.similarity,
      metadata: chunk.metadata || {},
    })
  );

  // Truncate if total content exceeds max length
  let totalLength = 0;
  const truncatedChunks: RetrievedChunk[] = [];

  for (const chunk of retrievedChunks) {
    if (totalLength + chunk.content.length > opts.maxContentLength) {
      // Try to fit a partial chunk if we have room
      const remainingSpace = opts.maxContentLength - totalLength;
      if (remainingSpace > 200) {
        truncatedChunks.push({
          ...chunk,
          content: chunk.content.slice(0, remainingSpace - 3) + "...",
        });
      }
      break;
    }
    truncatedChunks.push(chunk);
    totalLength += chunk.content.length;
  }

  return truncatedChunks;
}

/**
 * Format retrieved chunks as context for the LLM
 * Returns a formatted string with source attribution
 */
export function formatChunksAsContext(chunks: RetrievedChunk[]): string {
  if (chunks.length === 0) {
    return "No relevant information found in the knowledge base.";
  }

  return chunks
    .map((chunk, index) => {
      const similarityPct = Math.round(chunk.similarity * 100);
      return `[Source ${index + 1}: ${chunk.sourceName}]\n${chunk.content}`;
    })
    .join("\n\n---\n\n");
}

/**
 * Extract source references for the response
 * Returns minimal source info to show in UI
 */
export function extractSourceReferences(
  chunks: RetrievedChunk[]
): { id: string; name: string; relevance: number }[] {
  // Deduplicate by source ID, keeping highest similarity
  const sourceMap = new Map<
    string,
    { id: string; name: string; relevance: number }
  >();

  for (const chunk of chunks) {
    const existing = sourceMap.get(chunk.sourceId);
    if (!existing || chunk.similarity > existing.relevance) {
      sourceMap.set(chunk.sourceId, {
        id: chunk.sourceId,
        name: chunk.sourceName,
        relevance: Math.round(chunk.similarity * 100),
      });
    }
  }

  return Array.from(sourceMap.values()).sort(
    (a, b) => b.relevance - a.relevance
  );
}

/**
 * Check if the knowledge base has any ready sources
 */
export async function hasKnowledgeBase(projectId: string): Promise<boolean> {
  const { count } = await supabaseAdmin
    .from("knowledge_sources")
    .select("*", { count: "exact", head: true })
    .eq("project_id", projectId)
    .eq("status", "ready");

  return (count || 0) > 0;
}

/**
 * Get knowledge base stats for a project
 */
export async function getKnowledgeStats(
  projectId: string
): Promise<{ sourceCount: number; chunkCount: number }> {
  const { data: sources } = await supabaseAdmin
    .from("knowledge_sources")
    .select("chunk_count")
    .eq("project_id", projectId)
    .eq("status", "ready");

  const sourceCount = sources?.length || 0;
  const chunkCount = (sources || []).reduce(
    (sum, s) => sum + (s.chunk_count || 0),
    0
  );

  return { sourceCount, chunkCount };
}
