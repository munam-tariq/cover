/**
 * Onboarding Self-Test
 *
 * After a new agent's knowledge base is built, the backend runs a small self-test:
 * it asks the agent 2 questions generated from the company's homepage and answers
 * them with the real RAG pipeline. The result is surfaced through the existing
 * onboarding status API so the UI can play a live "watch your agent answer" demo —
 * no public endpoints, the work happens server-side.
 *
 * Reuses: chatCompletion (lib/openai), retrieve + formatAsContext (RAG).
 */

import { chatCompletion } from "../lib/openai";
import { supabaseAdmin } from "../lib/supabase";
import { retrieve, formatAsContext, type RetrievedChunk } from "./rag";
import type { SelfTestQA } from "./scrape-job-manager";

const MAX_HOMEPAGE_CHARS = 6000;
const MAX_CITATIONS = 3;

/**
 * Generate 2 realistic customer questions from the homepage content.
 */
export async function generateTestQuestions(
  homepageContent: string,
  companyName: string
): Promise<string[]> {
  const content = (homepageContent || "").slice(0, MAX_HOMEPAGE_CHARS);

  const completion = await chatCompletion(
    [
      {
        role: "system",
        content:
          "You write short, realistic questions a visitor would ask a company's website chat assistant. " +
          "Return ONLY a JSON array of exactly 2 concise question strings — no preamble, no markdown.",
      },
      {
        role: "user",
        content:
          `Company: ${companyName}\n\nHomepage content:\n"""${content}"""\n\n` +
          "Write 2 distinct questions a real customer would ask, each answerable from this site. " +
          'Return a JSON array of 2 strings, e.g. ["...", "..."].',
      },
    ],
    { temperature: 0.7, maxTokens: 200 }
  );

  const raw = completion.choices[0]?.message?.content?.trim() || "[]";
  return parseQuestions(raw).slice(0, 2);
}

function parseQuestions(raw: string): string[] {
  const cleaned = raw.replace(/```json|```/g, "").trim();
  try {
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) {
      return parsed
        .filter((q): q is string => typeof q === "string" && q.trim().length > 0)
        .map((q) => q.trim());
    }
  } catch {
    // fall through to line-based parsing
  }
  return cleaned
    .split("\n")
    .map((line) => line.replace(/^[-*\d.\s"]+/, "").replace(/["]+$/, "").trim())
    .filter((line) => line.length > 0);
}

/**
 * Answer one question with the real RAG pipeline and resolve citation paths.
 */
export async function answerTestQuestion(
  projectId: string,
  question: string,
  agentName: string
): Promise<SelfTestQA> {
  const result = await retrieve(projectId, question, {
    topK: 5,
    threshold: 0.15,
    useHybridSearch: true,
  });

  const context = formatAsContext(result.chunks);

  const completion = await chatCompletion(
    [
      {
        role: "system",
        content:
          `You are ${agentName}, a helpful customer-support assistant. Answer the question using ONLY ` +
          "the provided knowledge base context. Be concise (2-3 sentences). If the answer is not in the " +
          "context, say you're not certain rather than inventing details.",
      },
      {
        role: "user",
        content: `Knowledge base context:\n${context}\n\nQuestion: ${question}`,
      },
    ],
    { temperature: 0.4, maxTokens: 300 }
  );

  const answer = completion.choices[0]?.message?.content?.trim() || "";
  const citations = await buildCitations(result.chunks);

  return { question, answer, citations };
}

/**
 * Resolve the cited chunks' source URLs in a single batched query (no N+1),
 * preserving retrieval order and de-duplicating by URL.
 */
async function buildCitations(
  chunks: RetrievedChunk[]
): Promise<{ url: string; path: string }[]> {
  const sourceIds = [...new Set(chunks.map((c) => c.sourceId))];
  if (sourceIds.length === 0) return [];

  const { data } = await supabaseAdmin
    .from("knowledge_sources")
    .select("id, source_url")
    .in("id", sourceIds);

  const urlById = new Map<string, string>();
  for (const row of data || []) {
    if (row.source_url) urlById.set(row.id, row.source_url);
  }

  const citations: { url: string; path: string }[] = [];
  const seen = new Set<string>();
  for (const chunk of chunks) {
    const url = urlById.get(chunk.sourceId);
    if (!url || seen.has(url)) continue;
    seen.add(url);
    citations.push({ url, path: toPath(url) });
    if (citations.length >= MAX_CITATIONS) break;
  }
  return citations;
}

function toPath(url: string): string {
  try {
    const u = new URL(url);
    return u.pathname && u.pathname !== "/" ? u.pathname : "/home";
  } catch {
    return url;
  }
}

/**
 * Run the full self-test: generate 2 questions, answer each with RAG.
 * Never throws — returns whatever questions/answers it managed to produce.
 */
export async function runSelfTest(
  projectId: string,
  homepageContent: string,
  companyName: string,
  agentName: string
): Promise<SelfTestQA[]> {
  let questions: string[] = [];
  try {
    questions = await generateTestQuestions(homepageContent, companyName);
  } catch (error) {
    console.error("[SelfTest] Question generation failed:", error);
    return [];
  }

  const results: SelfTestQA[] = [];
  for (const question of questions) {
    try {
      results.push(await answerTestQuestion(projectId, question, agentName));
    } catch (error) {
      console.error(`[SelfTest] Failed to answer "${question}":`, error);
      results.push({ question, answer: "", citations: [] });
    }
  }
  return results;
}
