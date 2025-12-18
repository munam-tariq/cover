/**
 * RAG v2 - Semantic Chunker
 *
 * Splits documents into semantically meaningful chunks.
 * Uses sentence boundaries and paragraph breaks for natural splits.
 *
 * Key improvements over v1:
 * - Sentence-aware splitting (doesn't cut mid-sentence)
 * - Smaller default chunk size (256 tokens vs 500)
 * - Better overlap handling
 * - Preserves document structure
 */

import { RAGConfig } from "./config";
import type { TextChunk, ChunkingOptions } from "./types";

/**
 * Sentence boundary regex patterns
 */
const SENTENCE_ENDINGS = /(?<=[.!?])\s+(?=[A-Z])/g;
const PARAGRAPH_BREAKS = /\n\n+/g;
const LIST_ITEMS = /(?:^|\n)[-•*]\s+/g;

/**
 * Split text into sentences
 */
function splitIntoSentences(text: string): string[] {
  // First, normalize whitespace
  const normalized = text.replace(/\s+/g, " ").trim();

  // Split on sentence boundaries
  const sentences = normalized.split(SENTENCE_ENDINGS);

  return sentences
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * Split text into paragraphs, preserving structure
 */
function splitIntoParagraphs(text: string): string[] {
  return text
    .split(PARAGRAPH_BREAKS)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

/**
 * Estimate token count for text
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / RAGConfig.chunking.charsPerToken);
}

/**
 * Semantic Chunker Class
 *
 * Provides intelligent document chunking that respects semantic boundaries.
 */
export class SemanticChunker {
  private chunkSize: number;
  private overlap: number;
  private minChunkSize: number;

  constructor(options?: ChunkingOptions) {
    this.chunkSize = options?.chunkSize ?? RAGConfig.chunking.defaultChunkSize;
    this.overlap = options?.overlap ?? RAGConfig.chunking.defaultOverlap;
    this.minChunkSize = RAGConfig.chunking.minChunkSize;
  }

  /**
   * Main chunking method - splits text into semantic chunks
   */
  chunk(text: string): TextChunk[] {
    if (!text || text.trim().length === 0) {
      return [];
    }

    // Step 1: Split into paragraphs
    const paragraphs = splitIntoParagraphs(text);

    // Step 2: Process each paragraph
    const allSentences: { text: string; paragraphIndex: number }[] = [];

    paragraphs.forEach((para, pIndex) => {
      const sentences = splitIntoSentences(para);
      sentences.forEach((sent) => {
        allSentences.push({ text: sent, paragraphIndex: pIndex });
      });
    });

    // Step 3: Group sentences into chunks respecting token limits
    const chunks: TextChunk[] = [];
    let currentChunk: string[] = [];
    let currentTokens = 0;
    let chunkStartChar = 0;
    let currentCharPos = 0;

    for (let i = 0; i < allSentences.length; i++) {
      const sentence = allSentences[i];
      const sentenceTokens = estimateTokens(sentence.text);

      // Check if adding this sentence would exceed chunk size
      if (currentTokens + sentenceTokens > this.chunkSize && currentChunk.length > 0) {
        // Save current chunk
        const chunkContent = currentChunk.join(" ");
        chunks.push({
          content: chunkContent,
          index: chunks.length,
          startChar: chunkStartChar,
          endChar: currentCharPos,
          metadata: {
            tokenEstimate: currentTokens,
            sentenceCount: currentChunk.length,
          },
        });

        // Start new chunk with overlap
        const overlapSentences = this.getOverlapSentences(currentChunk, this.overlap);
        currentChunk = overlapSentences;
        currentTokens = estimateTokens(overlapSentences.join(" "));
        chunkStartChar = currentCharPos - overlapSentences.join(" ").length;
      }

      // Add sentence to current chunk
      currentChunk.push(sentence.text);
      currentTokens += sentenceTokens;
      currentCharPos += sentence.text.length + 1; // +1 for space
    }

    // Don't forget the last chunk
    if (currentChunk.length > 0) {
      const chunkContent = currentChunk.join(" ");
      if (estimateTokens(chunkContent) >= this.minChunkSize) {
        chunks.push({
          content: chunkContent,
          index: chunks.length,
          startChar: chunkStartChar,
          endChar: currentCharPos,
          metadata: {
            tokenEstimate: currentTokens,
            sentenceCount: currentChunk.length,
          },
        });
      } else if (chunks.length > 0) {
        // Merge with previous chunk if too small
        const lastChunk = chunks[chunks.length - 1];
        lastChunk.content += " " + chunkContent;
        lastChunk.endChar = currentCharPos;
        if (lastChunk.metadata) {
          lastChunk.metadata.tokenEstimate =
            (lastChunk.metadata.tokenEstimate as number) + currentTokens;
        }
      } else {
        // Only chunk, keep it even if small
        chunks.push({
          content: chunkContent,
          index: 0,
          startChar: 0,
          endChar: currentCharPos,
          metadata: {
            tokenEstimate: currentTokens,
            sentenceCount: currentChunk.length,
          },
        });
      }
    }

    return chunks;
  }

  /**
   * Get sentences for overlap from the end of current chunk
   */
  private getOverlapSentences(sentences: string[], overlapTokens: number): string[] {
    const result: string[] = [];
    let tokens = 0;

    // Work backwards from the end
    for (let i = sentences.length - 1; i >= 0 && tokens < overlapTokens; i--) {
      result.unshift(sentences[i]);
      tokens += estimateTokens(sentences[i]);
    }

    return result;
  }

  /**
   * Chunk with metadata about the source document
   */
  chunkWithMetadata(
    text: string,
    documentMetadata: Record<string, unknown>
  ): TextChunk[] {
    const chunks = this.chunk(text);

    return chunks.map((chunk) => ({
      ...chunk,
      metadata: {
        ...chunk.metadata,
        ...documentMetadata,
      },
    }));
  }
}

/**
 * Create a chunker instance with default config
 */
export function createChunker(options?: ChunkingOptions): SemanticChunker {
  return new SemanticChunker(options);
}

/**
 * Convenience function for one-off chunking
 */
export function chunkText(text: string, options?: ChunkingOptions): TextChunk[] {
  return createChunker(options).chunk(text);
}
