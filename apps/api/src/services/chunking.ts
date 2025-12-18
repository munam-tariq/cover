/**
 * Service for chunking text into smaller pieces for embedding
 * TODO: Implement fully in knowledge-base feature
 */

export interface TextChunk {
  content: string;
  index: number;
  metadata?: Record<string, unknown>;
}

export class ChunkingService {
  private readonly defaultChunkSize = 500; // tokens (approximately)
  private readonly defaultOverlap = 50;

  /**
   * Split text into chunks of approximately equal size
   */
  chunkText(
    text: string,
    options?: { chunkSize?: number; overlap?: number }
  ): TextChunk[] {
    const chunkSize = options?.chunkSize || this.defaultChunkSize;
    const overlap = options?.overlap || this.defaultOverlap;

    // Simple character-based chunking (approximately 4 chars per token)
    const charChunkSize = chunkSize * 4;
    const charOverlap = overlap * 4;

    const chunks: TextChunk[] = [];
    let start = 0;
    let index = 0;

    while (start < text.length) {
      let end = start + charChunkSize;

      // Try to break at sentence or paragraph boundary
      if (end < text.length) {
        const searchEnd = Math.min(end + 100, text.length);
        const searchText = text.slice(end, searchEnd);

        // Look for sentence end
        const sentenceEnd = searchText.search(/[.!?]\s/);
        if (sentenceEnd !== -1) {
          end = end + sentenceEnd + 2;
        } else {
          // Look for paragraph break
          const paragraphEnd = searchText.indexOf("\n\n");
          if (paragraphEnd !== -1) {
            end = end + paragraphEnd + 2;
          }
        }
      }

      const content = text.slice(start, end).trim();
      if (content) {
        chunks.push({
          content,
          index,
        });
        index++;
      }

      start = end - charOverlap;
    }

    return chunks;
  }

  /**
   * Estimate token count for text
   */
  estimateTokens(text: string): number {
    // Rough estimation: ~4 characters per token for English
    return Math.ceil(text.length / 4);
  }
}

export const chunkingService = new ChunkingService();
