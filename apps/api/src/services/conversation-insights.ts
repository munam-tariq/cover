/**
 * Conversation Insights — classifier (I/O)
 *
 * Nightly batch that labels recent conversations with topic / sentiment / resolution / answer-gap
 * via gpt-4o-mini and writes them to `conversation_insights`. All pure logic (parsing, topic
 * normalization) lives in `conversation-insights-core.ts` and is unit-tested; this module is the
 * Supabase + OpenAI orchestration, verified end-to-end via the cron endpoint.
 *
 * Re-runnable: rows for the affected conversations are deleted and reinserted, so classifying the
 * same window twice is idempotent.
 */

import { logger } from "../lib/logger";
import { openai } from "../lib/openai";
import { supabaseAdmin } from "../lib/supabase";

import {
  buildClassificationPrompt,
  normalizeTopicLabels,
  parseClassificationResponse,
  type ClassifiedConversation,
  type ConversationForClassification,
} from "./conversation-insights-core";
import { embeddingService } from "./embedding";

const MODEL = "gpt-4o-mini";
const BATCH_SIZE = 12; // conversations per LLM call
const MAX_MESSAGES_PER_CONVERSATION = 20;
const MAX_CONTENT_CHARS = 500;
const LOOKBACK_MS = 24 * 60 * 60 * 1000;

const topicNormalizer = {
  embed: (texts: string[]) => embeddingService.embedTexts(texts),
  cosine: (a: number[], b: number[]) => embeddingService.cosineSimilarity(a, b),
};

interface MessageRow {
  conversation_id: string;
  sender_type: string;
  content: string | null;
  created_at: string;
}

/**
 * Classify recent conversations for every eligible project.
 * Skips projects with `settings.insights_enabled === false`.
 */
export async function classifyAllProjects(
  now: Date = new Date()
): Promise<{ processed: number; classified: number; errors: string[] }> {
  const errors: string[] = [];
  let processed = 0;
  let classified = 0;

  const { data: projects, error } = await supabaseAdmin
    .from("projects")
    .select("id, settings")
    .is("deleted_at", null);

  if (error) {
    throw new Error(`Failed to fetch projects: ${error.message}`);
  }

  const cutoff = new Date(now.getTime() - LOOKBACK_MS).toISOString();

  for (const project of projects ?? []) {
    const settings = (project.settings as Record<string, unknown>) || {};
    if (settings.insights_enabled === false) continue;

    processed++;
    try {
      classified += await classifyProject(project.id, cutoff);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      logger.error("Insights classification failed for project", err, {
        projectId: project.id,
      });
      errors.push(`${project.id}: ${message}`);
    }
  }

  return { processed, classified, errors };
}

/** Classify one project's conversations created since `cutoff`. Returns rows written. */
async function classifyProject(projectId: string, cutoff: string): Promise<number> {
  // 1. Recent, non-voice conversations for this project.
  const { data: conversations, error: convError } = await supabaseAdmin
    .from("conversations")
    .select("id")
    .eq("project_id", projectId)
    .neq("is_voice_call", true)
    .gte("created_at", cutoff);

  if (convError) throw new Error(`conversations: ${convError.message}`);
  if (!conversations || conversations.length === 0) return 0;

  const conversationIds = conversations.map((c) => c.id);

  // 2. All their messages in a single query (no N+1), grouped in memory.
  const { data: messages, error: msgError } = await supabaseAdmin
    .from("messages")
    .select("conversation_id, sender_type, content, created_at")
    .in("conversation_id", conversationIds)
    .order("created_at", { ascending: true });

  if (msgError) throw new Error(`messages: ${msgError.message}`);

  const byConversation = groupMessages((messages as MessageRow[]) ?? []);

  // 3. Build classification inputs; skip conversations with no customer turn.
  const inputs: ConversationForClassification[] = [];
  for (const id of conversationIds) {
    const msgs = byConversation.get(id);
    if (!msgs || !msgs.some((m) => m.role === "customer")) continue;
    inputs.push({ id, messages: msgs.slice(-MAX_MESSAGES_PER_CONVERSATION) });
  }
  if (inputs.length === 0) return 0;

  // 4. Classify in batches.
  const results: ClassifiedConversation[] = [];
  for (let i = 0; i < inputs.length; i += BATCH_SIZE) {
    const batch = inputs.slice(i, i + BATCH_SIZE);
    const allowedIds = new Set(batch.map((c) => c.id));
    const { system, user } = buildClassificationPrompt(batch);

    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.2,
      max_tokens: 1500,
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content || "{}";
    results.push(...parseClassificationResponse(content, allowedIds));
  }
  if (results.length === 0) return 0;

  // 5. Normalize topics against the project's existing labels so they converge.
  const existingTopics = await getExistingTopics(projectId);
  const rawTopics = results.map((r) => r.topic);
  const topicMap = await normalizeTopicLabels(rawTopics, existingTopics, topicNormalizer);
  const normalized = results.map((r) => ({
    ...r,
    topic: topicMap.get(r.topic) ?? r.topic,
  }));

  // 6. Idempotent persist: delete prior rows for these conversations, then insert.
  const classifiedIds = normalized.map((r) => r.conversation_id);
  const { error: delError } = await supabaseAdmin
    .from("conversation_insights")
    .delete()
    .in("conversation_id", classifiedIds);
  if (delError) throw new Error(`delete: ${delError.message}`);

  const { error: insError } = await supabaseAdmin
    .from("conversation_insights")
    .insert(
      normalized.map((r) => ({
        conversation_id: r.conversation_id,
        project_id: projectId,
        topic: r.topic,
        sentiment: r.sentiment,
        resolved: r.resolved,
        answer_gap_question: r.answer_gap_question,
      }))
    );
  if (insError) throw new Error(`insert: ${insError.message}`);

  return normalized.length;
}

/** Group + role-map messages per conversation, dropping system turns and trimming content. */
function groupMessages(
  messages: MessageRow[]
): Map<string, Array<{ role: "customer" | "agent"; content: string }>> {
  const map = new Map<string, Array<{ role: "customer" | "agent"; content: string }>>();
  for (const msg of messages) {
    if (msg.sender_type === "system") continue;
    const content = (msg.content ?? "").trim();
    if (!content) continue;
    const role = msg.sender_type === "customer" ? "customer" : "agent";
    const list = map.get(msg.conversation_id) ?? [];
    list.push({ role, content: content.slice(0, MAX_CONTENT_CHARS) });
    map.set(msg.conversation_id, list);
  }
  return map;
}

/** Recent distinct topic labels for a project (the canonical set to converge toward). */
async function getExistingTopics(projectId: string): Promise<string[]> {
  const { data } = await supabaseAdmin
    .from("conversation_insights")
    .select("topic")
    .eq("project_id", projectId)
    .not("topic", "is", null)
    .order("created_at", { ascending: false })
    .limit(500);

  return [...new Set((data ?? []).map((r) => r.topic as string).filter(Boolean))];
}
