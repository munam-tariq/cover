/**
 * Cross-lingual query preprocessing for retrieval.
 *
 * When a visitor's question is in a different language than the knowledge base,
 * the vector (semantic) leg retrieves poorly — an Arabic query embedded against
 * English chunks lands in the wrong region of the vector space. We translate the
 * query into the KB's language before embedding, while the full-text leg keeps
 * the original query. Translation is skipped entirely when the languages already
 * match or the KB language is unknown, so same-language traffic pays nothing.
 */

import { openai } from "../../lib/openai";
import { logger } from "../../lib/logger";

const TRANSLATION_MODEL = "gpt-4o-mini";

const LANGUAGE_NAMES: Record<string, string> = {
  ar: "Arabic",
  en: "English",
  fr: "French",
  es: "Spanish",
  de: "German",
};

function languageName(base: string): string {
  return LANGUAGE_NAMES[base] || base;
}

/**
 * Return a query translated into the knowledge base's language for the vector
 * leg, or `null` when no translation is needed (unknown KB language, or the
 * query is already in it). Never throws — on failure it returns null so
 * retrieval falls back to embedding the original query.
 */
export async function translateQueryForKb(opts: {
  query: string;
  /** Detected KB language (base tag, e.g. "ar"); null/empty = untagged → skip. */
  kbLanguage: string | null | undefined;
  /** Detected base language of the query; null = undetermined → skip. */
  queryLanguage: string | null | undefined;
}): Promise<string | null> {
  const kb = (opts.kbLanguage || "").toLowerCase().split("-")[0];
  const q = (opts.queryLanguage || "").toLowerCase().split("-")[0];

  // Skip when the KB language is unknown or already matches the query.
  if (!kb || !q || kb === q) return null;

  try {
    const completion = await openai.chat.completions.create({
      model: TRANSLATION_MODEL,
      messages: [
        {
          role: "system",
          content:
            `Translate the user's search query into ${languageName(kb)}. ` +
            `Preserve product names, brand names, numbers, and codes verbatim. ` +
            `Output ONLY the translation — no quotes, no explanation.`,
        },
        { role: "user", content: opts.query },
      ],
      max_tokens: 200,
      temperature: 0,
    });

    const translated = completion.choices[0]?.message?.content?.trim();
    return translated || null;
  } catch (error) {
    logger.warn("Query translation failed; embedding original query", {
      step: "query_translation",
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}
