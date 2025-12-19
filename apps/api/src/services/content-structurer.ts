/**
 * Content Structurer Service
 *
 * Uses GPT-4o-mini to clean and structure scraped web content
 * for optimal chatbot knowledge retrieval.
 */

import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export interface StructuredPage {
  title: string;
  content: string;
  wordCount: number;
  summary: string;
  hasQAPairs: boolean;
}

const STRUCTURING_PROMPT = `You are a content structuring assistant. Your job is to take raw webpage content and restructure it for a chatbot knowledge base.

Instructions:
1. Remove any navigation, footer, cookie notices, or boilerplate content
2. If this is an FAQ page, extract and format as clear Q&A pairs
3. Organize content with clear headers and sections
4. Keep all factual information - don't summarize away important details
5. Use markdown formatting for structure
6. Generate a clear, descriptive title for this page

Output format (you MUST include these exact headers):
---
TITLE: [Descriptive page title]
SUMMARY: [One sentence summary of what this page is about]
HAS_QA_PAIRS: [true/false]
---

[Structured markdown content here]

If this is an FAQ or Q&A page, format questions and answers like:
### Q: [Question]
[Answer]

For other content, use appropriate headers and paragraphs.`;

/**
 * Structure a single page's content using LLM
 */
export async function structurePageContent(
  url: string,
  rawMarkdown: string,
  originalTitle: string
): Promise<StructuredPage> {
  try {
    // Limit input size to prevent token overflow (roughly 15k chars ~= 3.5k tokens)
    const truncatedContent = rawMarkdown.slice(0, 15000);

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: STRUCTURING_PROMPT },
        {
          role: 'user',
          content: `URL: ${url}\nOriginal Title: ${originalTitle}\n\nContent:\n${truncatedContent}`
        }
      ],
      temperature: 0.3,
      max_tokens: 4000
    });

    const output = response.choices[0]?.message?.content || '';

    // Parse the structured output
    const titleMatch = output.match(/TITLE:\s*(.+)/);
    const summaryMatch = output.match(/SUMMARY:\s*(.+)/);
    const hasQAMatch = output.match(/HAS_QA_PAIRS:\s*(true|false)/i);

    // Extract content after the metadata block
    const contentMatch = output.match(/---\n[\s\S]*?---\n([\s\S]*)/);
    const content = contentMatch ? contentMatch[1].trim() : output;

    // Calculate word count
    const wordCount = content.split(/\s+/).filter(w => w.length > 0).length;

    return {
      title: titleMatch ? titleMatch[1].trim() : originalTitle,
      content,
      wordCount,
      summary: summaryMatch ? summaryMatch[1].trim() : '',
      hasQAPairs: hasQAMatch ? hasQAMatch[1].toLowerCase() === 'true' : false
    };

  } catch (error) {
    console.error('[ContentStructurer] Error structuring content:', error);

    // Fallback: return cleaned raw content
    const wordCount = rawMarkdown.split(/\s+/).filter(w => w.length > 0).length;

    return {
      title: originalTitle,
      content: rawMarkdown,
      wordCount,
      summary: '',
      hasQAPairs: false
    };
  }
}

/**
 * Structure multiple pages with progress callback
 */
export async function structureAllPages(
  pages: Array<{ url: string; markdown: string; title: string }>,
  onProgress?: (completed: number, total: number) => void
): Promise<StructuredPage[]> {
  const results: StructuredPage[] = [];

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];

    console.log(`[ContentStructurer] Processing page ${i + 1}/${pages.length}: ${page.title}`);

    const structured = await structurePageContent(page.url, page.markdown, page.title);
    results.push(structured);

    if (onProgress) {
      onProgress(i + 1, pages.length);
    }
  }

  return results;
}

/**
 * Estimate the number of chunks that will be created from content
 */
export function estimateChunks(wordCount: number): number {
  // Rough estimate: ~200 words per chunk (based on ~500 token chunks with overlap)
  return Math.max(1, Math.ceil(wordCount / 200));
}
