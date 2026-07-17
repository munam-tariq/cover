/**
 * Conversation Insights — classifier (I/O)
 *
 * Hourly batch that labels recent conversations with topic / sentiment / resolution / answer-gap
 * via gpt-4o-mini and writes them to `conversation_insights`. All pure logic (parsing, topic
 * normalization) lives in `conversation-insights-core.ts` and is unit-tested; this module is the
 * Supabase + OpenAI orchestration, verified end-to-end via the cron endpoint.
 *
 * Re-runnable: the DB cursor selects only terminal conversations without an insight, while the
 * insert RPC revalidates the exact close generation and ignores overlap conflicts.
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
const MAX_CONVERSATIONS_PER_RUN = 120;
const MAX_EXISTING_TOPICS_PER_PROJECT = 500;

/**
 * How far back to look for unclassified terminal conversations.
 *
 * This is a BACKLOG BOUND, not the correctness mechanism — that is the "no insight row yet" cursor
 * in classifyProject. A time window alone cannot be correct here: the classifier runs hourly, so any
 * window wider than an hour reclassifies (and re-bills) the same conversations on consecutive runs,
 * and `updated_at` is unusable as a cursor because every touch moves it — a CSAT rating on a closed
 * chat would make it look newly terminal.
 */
const BACKLOG_LOOKBACK_MS = 7 * 24 * 60 * 60 * 1000;

const topicNormalizer = {
  embed: (texts: string[]) => embeddingService.embedTexts(texts),
  cosine: (a: number[], b: number[]) => embeddingService.cosineSimilarity(a, b),
};

interface MessageRow {
  conversation_id: string;
  sender_type: string;
  content: string | null;
  created_at: string;
  metadata: Record<string, unknown> | null;
}

interface ClassificationBatchRow {
  conversation_id: string;
  project_id: string;
  resolved_at: string;
  messages: unknown;
}

interface TopicRow {
  project_id: string;
  topic: string;
}

interface PendingConversation extends ConversationForClassification {
  projectId: string;
  resolvedAt: string;
}

interface PendingInsight extends ClassifiedConversation {
  projectId: string;
  resolvedAt: string;
}

/**
 * Classify recent conversations for every eligible project.
 * Skips projects with `settings.insights_enabled === false`.
 */
export async function classifyAllProjects(
  now: Date = new Date()
): Promise<{ processed: number; classified: number; errors: string[] }> {
  const errors: string[] = [];

  const { data: projects, error } = await supabaseAdmin
    .from("projects")
    .select("id, settings")
    .is("deleted_at", null);

  if (error) {
    throw new Error(`Failed to fetch projects: ${error.message}`);
  }

  const eligibleProjectIds = (projects ?? [])
    .filter((project) => {
      const settings = (project.settings as Record<string, unknown>) || {};
      return settings.insights_enabled !== false;
    })
    .map((project) => project.id);
  const processed = eligibleProjectIds.length;
  if (processed === 0) return { processed, classified: 0, errors };

  const cutoff = new Date(now.getTime() - BACKLOG_LOOKBACK_MS).toISOString();
  const { data: batchData, error: batchError } = await supabaseAdmin.rpc(
    "get_insight_classification_batch",
    {
      p_project_ids: eligibleProjectIds,
      p_cutoff: cutoff,
      p_limit: MAX_CONVERSATIONS_PER_RUN,
      p_message_limit: MAX_MESSAGES_PER_CONVERSATION,
    }
  );
  if (batchError) {
    throw new Error(`classification batch: ${batchError.message}`);
  }

  const candidates = (batchData ?? []) as ClassificationBatchRow[];
  if (candidates.length === 0) return { processed, classified: 0, errors };

  const candidateProjectIds = [
    ...new Set(candidates.map((candidate) => candidate.project_id)),
  ];
  const { data: topicData, error: topicError } = await supabaseAdmin.rpc(
    "get_recent_insight_topics",
    {
      p_project_ids: candidateProjectIds,
      p_limit: MAX_EXISTING_TOPICS_PER_PROJECT,
    }
  );
  if (topicError) throw new Error(`existing topics: ${topicError.message}`);

  const topicsByProject = new Map<string, string[]>();
  for (const row of (topicData ?? []) as TopicRow[]) {
    const topics = topicsByProject.get(row.project_id) ?? [];
    topics.push(row.topic);
    topicsByProject.set(row.project_id, topics);
  }

  const candidatesByProject = new Map<string, ClassificationBatchRow[]>();
  for (const candidate of candidates) {
    const projectCandidates =
      candidatesByProject.get(candidate.project_id) ?? [];
    projectCandidates.push(candidate);
    candidatesByProject.set(candidate.project_id, projectCandidates);
  }

  const pendingInsights: PendingInsight[] = [];
  for (const [projectId, projectCandidates] of candidatesByProject) {
    try {
      pendingInsights.push(
        ...(await classifyProjectBatch(
          projectId,
          projectCandidates,
          topicsByProject.get(projectId) ?? []
        ))
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      logger.error("Insights classification failed for project", err, {
        projectId,
      });
      errors.push(`${projectId}: ${message}`);
    }
  }

  if (pendingInsights.length === 0) {
    return { processed, classified: 0, errors };
  }

  const { data: insertedCount, error: insertError } = await supabaseAdmin.rpc(
    "insert_conversation_insights",
    {
      p_rows: pendingInsights.map((insight) => ({
        conversation_id: insight.conversation_id,
        project_id: insight.projectId,
        resolved_at: insight.resolvedAt,
        topic: insight.topic,
        sentiment: insight.sentiment,
        resolved: insight.resolved,
        answer_gap_question: insight.answer_gap_question,
      })),
    }
  );
  if (insertError) throw new Error(`insert: ${insertError.message}`);

  return { processed, classified: insertedCount ?? 0, errors };
}

/** Classify one project's portion of the already-fetched cross-project batch. */
async function classifyProjectBatch(
  projectId: string,
  candidates: ClassificationBatchRow[],
  existingTopics: string[]
): Promise<PendingInsight[]> {
  const resolvedAtById = new Map(
    candidates.map((candidate) => [
      candidate.conversation_id,
      candidate.resolved_at,
    ])
  );
  const inputs: PendingConversation[] = [];
  for (const candidate of candidates) {
    const rows = Array.isArray(candidate.messages)
      ? (candidate.messages as MessageRow[])
      : [];
    const messages = groupMessages(rows).get(candidate.conversation_id) ?? [];
    const customerMessage = [...messages].reverse().find(
      (message) => message.role === "customer"
    );
    if (!customerMessage) continue;

    // The SQL returns the latest N turns plus the latest customer turn. If that customer is older
    // than the window, replace the oldest recent turn with it so prompts remain bounded and useful.
    const recentMessages = messages.slice(-MAX_MESSAGES_PER_CONVERSATION);
    const boundedMessages = recentMessages.some(
      (message) => message.role === "customer"
    )
      ? recentMessages
      : [customerMessage, ...recentMessages.slice(1)];
    inputs.push({
      id: candidate.conversation_id,
      projectId,
      resolvedAt: candidate.resolved_at,
      messages: boundedMessages,
    });
  }
  if (inputs.length === 0) return [];

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
  if (results.length === 0) return [];

  const rawTopics = results.map((r) => r.topic);
  const topicMap = await normalizeTopicLabels(
    rawTopics,
    existingTopics,
    topicNormalizer
  );
  return results.map((r) => ({
    ...r,
    projectId,
    resolvedAt: resolvedAtById.get(r.conversation_id)!,
    topic: topicMap.get(r.topic) ?? r.topic,
  }));
}

/** Group + role-map messages per conversation, dropping system turns and trimming content. */
function groupMessages(
  messages: MessageRow[]
): Map<string, Array<{ role: "customer" | "agent"; content: string }>> {
  const map = new Map<string, Array<{ role: "customer" | "agent"; content: string }>>();
  for (const msg of messages) {
    if (msg.sender_type === "system") continue;
    // Machine-generated turns are not part of the conversation: the AI's inactivity warning and the
    // CSAT prompt would otherwise show up in every transcript the classifier reads and skew topics.
    if (msg.metadata?.event) continue;
    const content = (msg.content ?? "").trim();
    if (!content) continue;
    const role = msg.sender_type === "customer" ? "customer" : "agent";
    const list = map.get(msg.conversation_id) ?? [];
    list.push({ role, content: content.slice(0, MAX_CONTENT_CHARS) });
    map.set(msg.conversation_id, list);
  }
  return map;
}
