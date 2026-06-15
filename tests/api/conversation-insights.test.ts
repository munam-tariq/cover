import assert from "node:assert/strict";
import test from "node:test";

import {
  parseClassificationResponse,
  normalizeTopicLabels,
  aggregateTopics,
  aggregateSentimentTimeline,
  aggregateGaps,
  buildClassificationPrompt,
} from "../../apps/api/src/services/conversation-insights-core.ts";

const ID_A = "11111111-1111-1111-1111-111111111111";
const ID_B = "22222222-2222-2222-2222-222222222222";

// Deterministic offline embedder for normalizeTopicLabels tests: strings sharing a
// "group" vector are treated as near-duplicates; everything else is orthogonal.
const GROUP_VECTORS: Record<string, number[]> = {
  Billing: [1, 0, 0],
  billing: [1, 0, 0],
  "billing question": [1, 0, 0],
  Refunds: [1, 0, 0],
  Shipping: [0, 1, 0],
  Delivery: [0, 1, 0],
  Pricing: [0, 0, 1],
};
function fakeEmbed(texts: string[]): Promise<number[][]> {
  return Promise.resolve(
    texts.map((t, i) => GROUP_VECTORS[t] ?? unitVector(i + 7, 32))
  );
}
function unitVector(slot: number, dims: number): number[] {
  const v = new Array(dims).fill(0);
  v[slot % dims] = 1;
  return v;
}
function cosine(a: number[], b: number[]): number {
  const dot = a.reduce((s, x, i) => s + x * (b[i] ?? 0), 0);
  const na = Math.hypot(...a);
  const nb = Math.hypot(...b);
  return na && nb ? dot / (na * nb) : 0;
}
const normalizer = { embed: fakeEmbed, cosine };

test("parses well-formed results into typed records", () => {
  const out = parseClassificationResponse({
    results: [
      {
        conversation_id: ID_A,
        topic: "Billing",
        sentiment: "negative",
        resolved: false,
        answer_gap_question: "How do I get a refund?",
      },
    ],
  });
  assert.deepEqual(out, [
    {
      conversation_id: ID_A,
      topic: "Billing",
      sentiment: "negative",
      resolved: false,
      answer_gap_question: "How do I get a refund?",
    },
  ]);
});

test("accepts a raw JSON string", () => {
  const out = parseClassificationResponse(
    JSON.stringify({
      results: [
        { conversation_id: ID_A, topic: "Pricing", sentiment: "positive", resolved: true },
      ],
    })
  );
  assert.equal(out.length, 1);
  assert.equal(out[0].topic, "Pricing");
});

test("skips items missing conversation_id or topic", () => {
  const out = parseClassificationResponse({
    results: [
      { topic: "NoId", sentiment: "neutral", resolved: true },
      { conversation_id: ID_B, sentiment: "neutral", resolved: true },
      { conversation_id: ID_A, topic: "Valid", sentiment: "neutral", resolved: true },
    ],
  });
  assert.equal(out.length, 1);
  assert.equal(out[0].conversation_id, ID_A);
});

test("coerces invalid or missing sentiment to neutral", () => {
  const out = parseClassificationResponse({
    results: [
      { conversation_id: ID_A, topic: "X", sentiment: "furious", resolved: true },
      { conversation_id: ID_B, topic: "Y", resolved: true },
    ],
  });
  assert.equal(out[0].sentiment, "neutral");
  assert.equal(out[1].sentiment, "neutral");
});

test("nullifies answer_gap_question when resolved is true", () => {
  const out = parseClassificationResponse({
    results: [
      {
        conversation_id: ID_A,
        topic: "X",
        sentiment: "positive",
        resolved: true,
        answer_gap_question: "leftover question",
      },
    ],
  });
  assert.equal(out[0].resolved, true);
  assert.equal(out[0].answer_gap_question, null);
});

test("infers resolved=false from a present gap question when resolved is absent", () => {
  const out = parseClassificationResponse({
    results: [
      { conversation_id: ID_A, topic: "X", sentiment: "neutral", answer_gap_question: "what about Z?" },
    ],
  });
  assert.equal(out[0].resolved, false);
  assert.equal(out[0].answer_gap_question, "what about Z?");
});

test("treats blank gap question as null", () => {
  const out = parseClassificationResponse({
    results: [
      { conversation_id: ID_A, topic: "X", sentiment: "neutral", resolved: false, answer_gap_question: "   " },
    ],
  });
  assert.equal(out[0].answer_gap_question, null);
});

test("filters conversation_ids not in the allowlist", () => {
  const out = parseClassificationResponse(
    {
      results: [
        { conversation_id: ID_A, topic: "X", sentiment: "neutral", resolved: true },
        { conversation_id: "deadbeef", topic: "Hallucinated", sentiment: "neutral", resolved: true },
      ],
    },
    new Set([ID_A, ID_B])
  );
  assert.equal(out.length, 1);
  assert.equal(out[0].conversation_id, ID_A);
});

test("returns empty array for malformed JSON or non-object input", () => {
  assert.deepEqual(parseClassificationResponse("not json{"), []);
  assert.deepEqual(parseClassificationResponse(null), []);
  assert.deepEqual(parseClassificationResponse(42), []);
  assert.deepEqual(parseClassificationResponse({ results: "nope" }), []);
});

test("ignores extra unknown fields on items", () => {
  const out = parseClassificationResponse({
    results: [
      { conversation_id: ID_A, topic: "X", sentiment: "neutral", resolved: true, foo: "bar", nested: { a: 1 } },
    ],
  });
  assert.equal(out.length, 1);
  assert.equal(Object.prototype.hasOwnProperty.call(out[0], "foo"), false);
});

test("normalize: collapses a near-duplicate raw topic onto an existing canonical topic", async () => {
  const map = await normalizeTopicLabels(["billing"], ["Billing"], normalizer);
  assert.equal(map.get("billing"), "Billing");
});

test("normalize: collapses same-batch near-duplicates to the first occurrence", async () => {
  const map = await normalizeTopicLabels(["Refunds", "billing question"], [], normalizer);
  // Refunds + "billing question" share a group vector → both map to the first seen label.
  assert.equal(map.get("Refunds"), "Refunds");
  assert.equal(map.get("billing question"), "Refunds");
});

test("normalize: keeps genuinely distinct topics separate", async () => {
  const map = await normalizeTopicLabels(["Billing", "Shipping", "Pricing"], [], normalizer);
  assert.equal(map.get("Billing"), "Billing");
  assert.equal(map.get("Shipping"), "Shipping");
  assert.equal(map.get("Pricing"), "Pricing");
});

test("normalize: dedupes repeated raw topics into a single key", async () => {
  const map = await normalizeTopicLabels(["Billing", "Billing"], [], normalizer);
  assert.equal(map.size, 1);
  assert.equal(map.get("Billing"), "Billing");
});

test("normalize: prefers existing canonical over a same-batch new label", async () => {
  // "Delivery" matches existing "Shipping"; should converge to the existing label.
  const map = await normalizeTopicLabels(["Delivery"], ["Shipping"], normalizer);
  assert.equal(map.get("Delivery"), "Shipping");
});

test("normalize: empty input returns an empty map without embedding", async () => {
  let called = false;
  const spyNormalizer = {
    embed: (texts: string[]) => {
      called = true;
      return fakeEmbed(texts);
    },
    cosine,
  };
  const map = await normalizeTopicLabels([], ["Billing"], spyNormalizer);
  assert.equal(map.size, 0);
  assert.equal(called, false);
});

// ─── aggregateTopics ──────────────────────────────────────────────────────────
test("aggregateTopics: ranks topics by count, descending", () => {
  const out = aggregateTopics([
    { topic: "Billing", sentiment: "neutral", resolved: true, answer_gap_question: null, created_at: "2026-06-12T00:00:00Z" },
    { topic: "Billing", sentiment: "neutral", resolved: true, answer_gap_question: null, created_at: "2026-06-12T00:00:00Z" },
    { topic: "Shipping", sentiment: "neutral", resolved: true, answer_gap_question: null, created_at: "2026-06-12T00:00:00Z" },
  ]);
  assert.deepEqual(out, [
    { topic: "Billing", count: 2 },
    { topic: "Shipping", count: 1 },
  ]);
});

test("aggregateTopics: skips rows with no topic", () => {
  const out = aggregateTopics([
    { topic: null, sentiment: "neutral", resolved: true, answer_gap_question: null, created_at: "2026-06-12T00:00:00Z" },
    { topic: "  ", sentiment: "neutral", resolved: true, answer_gap_question: null, created_at: "2026-06-12T00:00:00Z" },
    { topic: "Pricing", sentiment: "neutral", resolved: true, answer_gap_question: null, created_at: "2026-06-12T00:00:00Z" },
  ]);
  assert.deepEqual(out, [{ topic: "Pricing", count: 1 }]);
});

// ─── aggregateSentimentTimeline ───────────────────────────────────────────────
const NOW = new Date("2026-06-12T10:00:00Z");
test("aggregateSentimentTimeline: totals + per-day UTC buckets across the window", () => {
  const out = aggregateSentimentTimeline(
    [
      { topic: "X", sentiment: "positive", resolved: true, answer_gap_question: null, created_at: "2026-06-12T09:00:00Z" },
      { topic: "X", sentiment: "negative", resolved: false, answer_gap_question: "q", created_at: "2026-06-12T01:00:00Z" },
      { topic: "X", sentiment: "neutral", resolved: true, answer_gap_question: null, created_at: "2026-06-10T12:00:00Z" },
    ],
    3,
    NOW
  );
  assert.deepEqual(out.totals, { positive: 1, neutral: 1, negative: 1 });
  assert.equal(out.timeline.length, 3);
  assert.deepEqual(out.timeline[0], { date: "2026-06-10", positive: 0, neutral: 1, negative: 0 });
  assert.deepEqual(out.timeline[2], { date: "2026-06-12", positive: 1, neutral: 0, negative: 1 });
});

test("aggregateSentimentTimeline: ignores rows outside the window and unknown sentiments", () => {
  const out = aggregateSentimentTimeline(
    [
      { topic: "X", sentiment: "positive", resolved: true, answer_gap_question: null, created_at: "2026-06-01T00:00:00Z" },
      { topic: "X", sentiment: "ecstatic", resolved: true, answer_gap_question: null, created_at: "2026-06-12T00:00:00Z" },
    ],
    3,
    NOW
  );
  assert.deepEqual(out.totals, { positive: 0, neutral: 0, negative: 0 });
});

// ─── aggregateGaps ────────────────────────────────────────────────────────────
test("aggregateGaps: groups unanswered questions by normalized text, ranked by count", () => {
  const out = aggregateGaps(
    [
      { topic: "X", sentiment: "negative", resolved: false, answer_gap_question: "Do you ship to Canada?", created_at: "2026-06-10T00:00:00Z" },
      { topic: "X", sentiment: "negative", resolved: false, answer_gap_question: "do you ship to canada?", created_at: "2026-06-12T00:00:00Z" },
      { topic: "Y", sentiment: "neutral", resolved: false, answer_gap_question: "What is the warranty?", created_at: "2026-06-11T00:00:00Z" },
      { topic: "Z", sentiment: "positive", resolved: true, answer_gap_question: null, created_at: "2026-06-12T00:00:00Z" },
    ],
    10
  );
  assert.equal(out.length, 2);
  assert.equal(out[0].question, "Do you ship to Canada?");
  assert.equal(out[0].count, 2);
  assert.equal(out[0].lastOccurred, "2026-06-12T00:00:00Z");
  assert.equal(out[1].question, "What is the warranty?");
  assert.equal(out[1].count, 1);
});

test("aggregateGaps: respects the limit", () => {
  const out = aggregateGaps(
    [
      { topic: "A", sentiment: "neutral", resolved: false, answer_gap_question: "one", created_at: "2026-06-12T00:00:00Z" },
      { topic: "B", sentiment: "neutral", resolved: false, answer_gap_question: "two", created_at: "2026-06-12T00:00:00Z" },
      { topic: "C", sentiment: "neutral", resolved: false, answer_gap_question: "three", created_at: "2026-06-12T00:00:00Z" },
    ],
    2
  );
  assert.equal(out.length, 2);
});

// ─── buildClassificationPrompt ────────────────────────────────────────────────
test("buildClassificationPrompt: embeds each conversation id and transcript, asks for JSON", () => {
  const { system, user } = buildClassificationPrompt([
    {
      id: ID_A,
      messages: [
        { role: "customer", content: "Where is my order?" },
        { role: "agent", content: "Let me check that for you." },
      ],
    },
    { id: ID_B, messages: [{ role: "customer", content: "Do you offer refunds?" }] },
  ]);

  // Contract with parseClassificationResponse: the model must return results[] with these keys.
  for (const key of ["results", "conversation_id", "topic", "sentiment", "resolved", "answer_gap_question"]) {
    assert.ok(system.includes(key), `system prompt should mention "${key}"`);
  }
  // Each conversation id + a customer line must appear in the user content.
  assert.ok(user.includes(ID_A));
  assert.ok(user.includes(ID_B));
  assert.ok(user.includes("Where is my order?"));
  assert.ok(user.includes("Do you offer refunds?"));
});
