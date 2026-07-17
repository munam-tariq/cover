/**
 * Handoff reason persistence (the auto-trigger gap)
 *
 * The inbox "Handoff reason" filter matches on conversations.handoff_reason. The manual widget
 * endpoint and the offline form wrote it, but the AUTO handoff service (handoff-trigger.ts) detected
 * the reason ("keyword" / "low_confidence") and then never persisted it — so those two filter
 * options were dead: on staging, handoff_reason was only ever button_click or offline_form, never
 * keyword or low_confidence. These guard that the auto-trigger records why it fired.
 */

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (p: string) => readFile(new URL(p, import.meta.url), "utf8");

const stripComments = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

test("the auto-handoff flow persists handoff_reason on the created conversation", async () => {
  const trigger = stripComments(
    await read("../../apps/api/src/services/handoff-trigger.ts")
  );

  // A single write keyed on the id every createHandoffConversation path returns — direct assign,
  // queue, fresh insert, existing-session update — so no path can silently skip it.
  const flow = trigger.slice(
    trigger.indexOf("async function executeHandoffFlow")
  );
  assert.match(
    flow,
    /\.from\("conversations"\)\s*\.update\(\{[\s\S]*handoff_reason: reason/,
    "executeHandoffFlow must write handoff_reason, or keyword/low_confidence stay unfilterable"
  );
  assert.match(
    flow,
    /handoff_reason: reason,[\s\S]*?\}\)\s*\.eq\("id", handoffResult\.conversationId\)/,
    "the reason write must key on the returned conversationId to cover every path"
  );
});

test("each trigger passes the detail that belongs to its reason", async () => {
  const trigger = stripComments(
    await read("../../apps/api/src/services/handoff-trigger.ts")
  );

  // low_confidence carries the score that tripped it; keyword carries the word that matched. Both
  // land in dedicated columns the detail view can surface later.
  assert.match(
    trigger,
    /reason: "low_confidence",\s*confidence: maxScore,/,
    "the low-confidence trigger must pass its score"
  );
  assert.match(
    trigger,
    /reason: "keyword",\s*triggerKeyword: keywordResult\.matchedKeyword,/,
    "the keyword trigger must pass the matched keyword"
  );

  // And the write must actually store them (conditionally — a keyword handoff has no confidence).
  assert.match(trigger, /ai_confidence_at_handoff: confidence/);
  assert.match(trigger, /trigger_keyword: triggerKeyword/);
});
