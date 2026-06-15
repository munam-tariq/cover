/**
 * Conversation Insights — pure core
 *
 * Side-effect-free helpers for the nightly insights classifier and the analytics
 * endpoints. Everything here is dependency-injected (no OpenAI/Supabase imports) so it
 * is unit-testable in isolation. I/O lives in `conversation-insights.ts`.
 */

export type SentimentValue = "positive" | "neutral" | "negative";

export interface ConversationForClassification {
  id: string;
  messages: Array<{ role: "customer" | "agent"; content: string }>;
}

/**
 * Build the system/user messages for one batch LLM classification call. The system prompt
 * pins the exact JSON contract consumed by `parseClassificationResponse`; the user prompt
 * carries one labelled transcript per conversation. Pure (no I/O) so it is unit-testable.
 */
export function buildClassificationPrompt(
  conversations: ConversationForClassification[]
): { system: string; user: string } {
  const system = [
    "You analyze customer-support conversations. For EVERY conversation in the input, decide:",
    "- topic: a short (1-3 word) subject label, Title Case.",
    "- sentiment: one of positive, neutral, negative (the customer's overall sentiment).",
    "- resolved: true if the agent answered the customer's question, false otherwise.",
    "- answer_gap_question: if resolved is false, the customer's unanswered question as a short",
    "  standalone question; otherwise null.",
    "",
    'Respond with ONLY a JSON object of the form:',
    '{ "results": [ { "conversation_id": "...", "topic": "...", "sentiment": "neutral",',
    '  "resolved": true, "answer_gap_question": null } ] }',
    "Return one result object per conversation, echoing its conversation_id exactly.",
  ].join("\n");

  const user = conversations
    .map((c) => {
      const transcript = c.messages
        .map((m) => `${m.role === "customer" ? "Customer" : "Agent"}: ${m.content}`)
        .join("\n");
      return `--- conversation_id: ${c.id} ---\n${transcript}`;
    })
    .join("\n\n");

  return { system, user };
}

export interface ClassifiedConversation {
  conversation_id: string;
  topic: string;
  sentiment: SentimentValue;
  resolved: boolean;
  answer_gap_question: string | null;
}

export interface TopicNormalizer {
  /** Embed a batch of labels into vectors (injected — OpenAI in prod, fake in tests). */
  embed: (texts: string[]) => Promise<number[][]>;
  /** Cosine similarity between two vectors. */
  cosine: (a: number[], b: number[]) => number;
  /** Similarity at/above which two labels are considered the same topic. */
  threshold?: number;
}

const DEFAULT_TOPIC_THRESHOLD = 0.85;

/**
 * Collapse near-duplicate topic labels to a canonical label so labels converge instead of
 * fragmenting. The canonical set is seeded with the project's `existingTopics` (preferred so
 * historical labels win), then grows as genuinely new topics appear in `rawTopics`.
 *
 * Returns a map from each distinct raw topic to its canonical label. Mirrors the greedy
 * embedding clustering already used by `question-clustering.ts`, but with the embedder and
 * similarity function injected for offline testability.
 */
export async function normalizeTopicLabels(
  rawTopics: string[],
  existingTopics: string[],
  normalizer: TopicNormalizer
): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  const distinctRaw = [...new Set(rawTopics)];
  if (distinctRaw.length === 0) return result;

  const threshold = normalizer.threshold ?? DEFAULT_TOPIC_THRESHOLD;

  const uniqueLabels = [...new Set([...existingTopics, ...distinctRaw])];
  const vectors = await normalizer.embed(uniqueLabels);
  const vecOf = new Map<string, number[]>();
  uniqueLabels.forEach((label, i) => vecOf.set(label, vectors[i] ?? []));

  // Seed canonical labels with existing project topics (deduped, order preserved) so a raw
  // topic prefers an established label over promoting itself.
  const canonical: string[] = [...new Set(existingTopics)];

  for (const raw of distinctRaw) {
    const rv = vecOf.get(raw) ?? [];
    let match: string | null = null;
    for (const c of canonical) {
      if (normalizer.cosine(rv, vecOf.get(c) ?? []) >= threshold) {
        match = c;
        break;
      }
    }
    if (match) {
      result.set(raw, match);
    } else {
      canonical.push(raw);
      result.set(raw, raw);
    }
  }

  return result;
}

/** A persisted insight row, as fetched from `conversation_insights`. */
export interface InsightRow {
  topic: string | null;
  sentiment: string | null;
  resolved: boolean | null;
  answer_gap_question: string | null;
  created_at: string;
}

export interface TopicCount {
  topic: string;
  count: number;
}

export interface SentimentTimeline {
  totals: { positive: number; neutral: number; negative: number };
  timeline: Array<{
    date: string;
    positive: number;
    neutral: number;
    negative: number;
  }>;
}

export interface GapRollup {
  question: string;
  count: number;
  lastOccurred: string;
}

/** Rank topics by frequency (descending). Rows without a topic are ignored. */
export function aggregateTopics(rows: InsightRow[]): TopicCount[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const topic = nonEmptyString(row.topic);
    if (!topic) continue;
    counts.set(topic, (counts.get(topic) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([topic, count]) => ({ topic, count }))
    .sort((a, b) => b.count - a.count);
}

const SENTIMENTS: ReadonlySet<string> = new Set(["positive", "neutral", "negative"]);

/**
 * Sentiment totals + a per-day breakdown over a `days`-wide UTC window ending today.
 * Buckets are keyed by `created_at`'s UTC date (matching `analytics.ts /timeline`), so the
 * window and the row keys agree regardless of server timezone. Rows outside the window or with
 * an unrecognised sentiment are ignored. `now` is injectable for deterministic tests.
 */
export function aggregateSentimentTimeline(
  rows: InsightRow[],
  days: number,
  now: Date = new Date()
): SentimentTimeline {
  const startDate = new Date(now);
  startDate.setUTCDate(startDate.getUTCDate() - (days - 1));
  startDate.setUTCHours(0, 0, 0, 0);

  const timeline: Record<
    string,
    { positive: number; neutral: number; negative: number }
  > = {};
  const order: string[] = [];
  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setUTCDate(date.getUTCDate() + i);
    const key = date.toISOString().split("T")[0];
    timeline[key] = { positive: 0, neutral: 0, negative: 0 };
    order.push(key);
  }

  const totals = { positive: 0, neutral: 0, negative: 0 };
  for (const row of rows) {
    const sentiment = typeof row.sentiment === "string" ? row.sentiment : "";
    if (!SENTIMENTS.has(sentiment)) continue;
    const key = new Date(row.created_at).toISOString().split("T")[0];
    const bucket = timeline[key];
    if (!bucket) continue;
    const s = sentiment as keyof typeof totals;
    bucket[s] += 1;
    totals[s] += 1;
  }

  return { totals, timeline: order.map((date) => ({ date, ...timeline[date] })) };
}

/**
 * Roll up unanswered-question gaps by normalized (lowercased/trimmed) text, ranked by
 * frequency. Keeps the first-seen original casing as the displayed `question` and the most
 * recent `created_at` as `lastOccurred`. Mirrors `analytics.ts /feedback/issues`.
 */
export function aggregateGaps(rows: InsightRow[], limit: number): GapRollup[] {
  const map = new Map<string, GapRollup>();
  for (const row of rows) {
    const question = nonEmptyString(row.answer_gap_question);
    if (!question) continue;
    const key = question.toLowerCase();
    const existing = map.get(key);
    if (existing) {
      existing.count += 1;
      if (new Date(row.created_at) > new Date(existing.lastOccurred)) {
        existing.lastOccurred = row.created_at;
      }
    } else {
      map.set(key, { question, count: 1, lastOccurred: row.created_at });
    }
  }
  return [...map.values()].sort((a, b) => b.count - a.count).slice(0, limit);
}

function asSentiment(value: unknown): SentimentValue {
  return typeof value === "string" && SENTIMENTS.has(value)
    ? (value as SentimentValue)
    : "neutral";
}

function nonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Tolerantly parse the LLM batch-classification output into typed records.
 *
 * Accepts either a parsed object or a raw JSON string. Expects the classified items at
 * `.results`. Items missing a `conversation_id` or `topic` are skipped; `sentiment` is
 * coerced to a valid value (defaulting to "neutral"); `resolved` wins over any leftover
 * `answer_gap_question` (a resolved conversation has no gap); when `resolved` is absent it
 * is inferred from the presence of a gap question. When `allowedIds` is provided, items
 * whose `conversation_id` is not in the set are dropped (guards against hallucinated ids).
 */
export function parseClassificationResponse(
  raw: unknown,
  allowedIds?: ReadonlySet<string>
): ClassifiedConversation[] {
  let parsed: unknown = raw;
  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return [];
    }
  }

  const results =
    parsed && typeof parsed === "object" && Array.isArray((parsed as { results?: unknown }).results)
      ? ((parsed as { results: unknown[] }).results)
      : Array.isArray(parsed)
        ? (parsed as unknown[])
        : null;

  if (!results) return [];

  const out: ClassifiedConversation[] = [];
  for (const item of results) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;

    const conversationId = nonEmptyString(record.conversation_id);
    const topic = nonEmptyString(record.topic);
    if (!conversationId || !topic) continue;
    if (allowedIds && !allowedIds.has(conversationId)) continue;

    const gap = nonEmptyString(record.answer_gap_question);
    const resolved =
      record.resolved === true
        ? true
        : record.resolved === false
          ? false
          : gap === null; // absent: resolved iff there is no gap question

    out.push({
      conversation_id: conversationId,
      topic,
      sentiment: asSentiment(record.sentiment),
      resolved,
      answer_gap_question: resolved ? null : gap,
    });
  }

  return out;
}
