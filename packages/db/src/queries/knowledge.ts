import type { SupabaseClient } from "../client";
import type { KnowledgeSource, KnowledgeChunk, Json } from "../types";

/**
 * Get all knowledge sources for a project
 */
export async function getKnowledgeSources(
  client: SupabaseClient,
  projectId: string
): Promise<KnowledgeSource[]> {
  const { data, error } = await client
    .from("knowledge_sources")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Get a single knowledge source by ID
 */
export async function getKnowledgeSource(
  client: SupabaseClient,
  sourceId: string
): Promise<KnowledgeSource | null> {
  const { data, error } = await client
    .from("knowledge_sources")
    .select("*")
    .eq("id", sourceId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }
  return data;
}

/**
 * Create a new knowledge source
 */
export async function createKnowledgeSource(
  client: SupabaseClient,
  data: {
    projectId: string;
    name: string;
    type: KnowledgeSource["type"];
    filePath?: string;
  }
): Promise<KnowledgeSource> {
  const { data: source, error } = await client
    .from("knowledge_sources")
    .insert({
      project_id: data.projectId,
      name: data.name,
      type: data.type,
      file_path: data.filePath,
      status: "pending",
    })
    .select()
    .single();

  if (error) throw error;
  return source;
}

/**
 * Update knowledge source status
 */
export async function updateKnowledgeSourceStatus(
  client: SupabaseClient,
  sourceId: string,
  status: KnowledgeSource["status"]
): Promise<void> {
  const { error } = await client
    .from("knowledge_sources")
    .update({ status })
    .eq("id", sourceId);

  if (error) throw error;
}

/**
 * Delete a knowledge source and its chunks
 */
export async function deleteKnowledgeSource(
  client: SupabaseClient,
  sourceId: string
): Promise<void> {
  const { error } = await client
    .from("knowledge_sources")
    .delete()
    .eq("id", sourceId);

  if (error) throw error;
}

/**
 * Insert knowledge chunks
 * Note: embedding is passed as number[] but stored as vector (string representation)
 */
export async function insertKnowledgeChunks(
  client: SupabaseClient,
  chunks: {
    sourceId: string;
    content: string;
    embedding: number[];
    metadata?: Json;
  }[]
): Promise<void> {
  const { error } = await client.from("knowledge_chunks").insert(
    chunks.map((chunk) => ({
      source_id: chunk.sourceId,
      content: chunk.content,
      // Convert number[] to string representation for pgvector
      embedding: `[${chunk.embedding.join(",")}]`,
      metadata: (chunk.metadata || {}) as Json,
    }))
  );

  if (error) throw error;
}

/**
 * Search knowledge chunks by embedding similarity
 * Uses the match_knowledge_chunks database function for vector search
 */
export async function searchKnowledgeChunks(
  client: SupabaseClient,
  projectId: string,
  embedding: number[],
  options?: {
    limit?: number;
    threshold?: number;
  }
): Promise<{ id: string; sourceId: string; content: string; metadata: unknown; similarity: number }[]> {
  const { data, error } = await client.rpc("match_knowledge_chunks", {
    query_embedding: `[${embedding.join(",")}]`,
    match_threshold: options?.threshold ?? 0.7,
    match_count: options?.limit ?? 5,
    p_project_id: projectId,
  });

  if (error) throw error;

  return (data || []).map((row: { id: string; source_id: string; content: string; metadata: unknown; similarity: number }) => ({
    id: row.id,
    sourceId: row.source_id,
    content: row.content,
    metadata: row.metadata,
    similarity: row.similarity,
  }));
}
