import { generateEmbedding } from "../lib/openai";

/**
 * Service for handling text embeddings
 * TODO: Implement fully in knowledge-base feature
 */
export class EmbeddingService {
  /**
   * Generate embedding for a single text chunk
   */
  async embedText(text: string): Promise<number[]> {
    return generateEmbedding(text);
  }

  /**
   * Generate embeddings for multiple text chunks
   */
  async embedTexts(texts: string[]): Promise<number[][]> {
    const embeddings = await Promise.all(
      texts.map((text) => generateEmbedding(text))
    );
    return embeddings;
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error("Vectors must have the same length");
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}

export const embeddingService = new EmbeddingService();
