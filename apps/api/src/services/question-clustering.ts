/**
 * Question Clustering Service
 *
 * Groups similar user questions using embedding-based similarity.
 * Used for analytics to show "Top Questions Asked" with counts.
 */

import { supabaseAdmin } from "../lib/supabase";
import { logger } from "../lib/logger";
import { embeddingService } from "./embedding";

export interface QuestionCluster {
  representative: string; // The most common question text in the cluster
  count: number; // Total questions in this cluster
  examples: string[]; // Up to 3 example variations
}

/**
 * Get top questions from conversations by clustering similar questions
 * Uses embedding similarity to group semantically similar questions.
 * Uses conversations and messages tables (single source of truth).
 *
 * @param projectId - The project to analyze
 * @param days - Number of days to look back (default 30)
 * @param limit - Max clusters to return (default 10)
 */
export async function getTopQuestions(
  projectId: string,
  days: number = 30,
  limit: number = 10
): Promise<QuestionCluster[]> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  // Get all conversations for the project within the date range
  const { data: conversations, error: convError } = await supabaseAdmin
    .from("conversations")
    .select("id")
    .eq("project_id", projectId)
    .gte("created_at", cutoffDate.toISOString());

  if (convError) {
    logger.error("Error fetching conversations", convError, { projectId });
    throw new Error("Failed to fetch conversations");
  }

  if (!conversations || conversations.length === 0) {
    return [];
  }

  // Get all customer messages from these conversations
  const conversationIds = conversations.map(c => c.id);
  const { data: messages, error: msgError } = await supabaseAdmin
    .from("messages")
    .select("content")
    .eq("sender_type", "customer")
    .in("conversation_id", conversationIds)
    .gte("created_at", cutoffDate.toISOString());

  if (msgError) {
    logger.error("Error fetching messages", msgError, { projectId });
    throw new Error("Failed to fetch messages");
  }

  if (!messages || messages.length === 0) {
    return [];
  }

  // Extract user messages
  const userMessages: string[] = [];
  for (const msg of messages) {
    if (msg.content) {
      const content = String(msg.content).trim();
      if (content.length > 0 && content.length <= 500) {
        userMessages.push(content);
      }
    }
  }

  if (userMessages.length === 0) {
    return [];
  }

  // If we have very few messages, skip clustering and just count
  if (userMessages.length <= 5) {
    return simpleFrequencyCount(userMessages, limit);
  }

  // Cluster questions by similarity
  try {
    return await clusterBySimilarity(userMessages, limit);
  } catch (error) {
    logger.error("Embedding clustering failed, falling back to frequency", error, { projectId });
    return simpleFrequencyCount(userMessages, limit);
  }
}

/**
 * Simple frequency count fallback when clustering fails or for small datasets
 */
function simpleFrequencyCount(messages: string[], limit: number): QuestionCluster[] {
  // Count exact matches (case-insensitive)
  const counts = new Map<string, { original: string; count: number }>();

  for (const msg of messages) {
    const normalized = msg.toLowerCase();
    if (counts.has(normalized)) {
      counts.get(normalized)!.count++;
    } else {
      counts.set(normalized, { original: msg, count: 1 });
    }
  }

  // Sort by count and return top N
  const sorted = Array.from(counts.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);

  return sorted.map((item) => ({
    representative: item.original,
    count: item.count,
    examples: [item.original],
  }));
}

/**
 * Cluster messages by embedding similarity
 * Uses a greedy clustering approach with cosine similarity
 */
async function clusterBySimilarity(
  messages: string[],
  limit: number
): Promise<QuestionCluster[]> {
  // Limit messages to avoid excessive API calls (batch in groups of 100)
  const maxMessages = Math.min(messages.length, 500);
  const sampled = messages.slice(0, maxMessages);

  // Generate embeddings for all messages
  const embeddings = await embeddingService.embedTexts(sampled);

  // Greedy clustering with similarity threshold
  const SIMILARITY_THRESHOLD = 0.85;
  const clusters: Array<{
    indices: number[];
    representative: string;
  }> = [];
  const assigned = new Set<number>();

  for (let i = 0; i < sampled.length; i++) {
    if (assigned.has(i)) continue;

    // Start new cluster with this message
    const cluster = { indices: [i], representative: sampled[i] };
    assigned.add(i);

    // Find all similar messages
    for (let j = i + 1; j < sampled.length; j++) {
      if (assigned.has(j)) continue;

      const similarity = embeddingService.cosineSimilarity(
        embeddings[i],
        embeddings[j]
      );

      if (similarity >= SIMILARITY_THRESHOLD) {
        cluster.indices.push(j);
        assigned.add(j);
      }
    }

    clusters.push(cluster);
  }

  // Sort clusters by size and take top N
  const sortedClusters = clusters
    .sort((a, b) => b.indices.length - a.indices.length)
    .slice(0, limit);

  // Format output
  return sortedClusters.map((cluster) => {
    const examples = cluster.indices
      .slice(0, 3)
      .map((idx) => sampled[idx]);

    return {
      representative: cluster.representative,
      count: cluster.indices.length,
      examples,
    };
  });
}
