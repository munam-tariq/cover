/**
 * Qualifying-questions visibility in the inbox detail view.
 *
 * The section is both a live "what to ask" prompt and a record of what a conversation captured.
 * Two invariants keep those from colliding:
 *   1. The API only sends the configured prompt list while lead capture is enabled — otherwise a
 *      project with the toggle off keeps prompting agents to ask questions it no longer collects.
 *   2. The detail view unions those prompts with questions this conversation actually answered, so
 *      turning lead capture off never hides real historical lead data.
 */

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (p: string) => readFile(new URL(p, import.meta.url), "utf8");

const stripComments = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

test("the API only surfaces configured questions while lead capture is enabled", async () => {
  const customers = stripComments(
    await read("../../apps/api/src/routes/customers.ts")
  );
  // The prompt list must be gated on the master toggle; the pre-fix code filtered
  // qualifying_questions unconditionally, so a disabled project still prompted the agent.
  assert.match(
    customers,
    /const configuredQuestions = leadCaptureSettings\?\.enabled/,
    "configuredQuestions must be gated on lead_capture_v2.enabled"
  );
  assert.doesNotMatch(
    customers,
    /const configuredQuestions =\s*\n?\s*leadCaptureSettings\?\.qualifying_questions\?\.filter/,
    "the ungated filter is the exact bug this guards"
  );
});

test("the detail view shows historical answers even when nothing is configured", async () => {
  const page = stripComments(
    await read("../../apps/web/app/[locale]/(dashboard)/inbox/[id]/page.tsx")
  );

  // Displayed set is the union of the (enable-gated) prompts and questions with real answers.
  assert.match(page, /const questionsToShow = Array\.from\(\s*new Set\(\[/);
  assert.match(page, /leadData\?\.qualifyingAnswers\.map\(\(qa\) => qa\.question\)/);
  assert.match(
    page,
    /leadData\?\.lateQualifyingAnswers\.map\(\(lqa\) => lqa\.question_text\)/
  );

  // Render + iterate on the union, not the raw configured list — otherwise disabling lead capture
  // (API sends []) would hide a conversation's captured answers.
  assert.match(page, /\{questionsToShow\.length > 0 && \(/);
  assert.match(page, /\{questionsToShow\.map\(\(question, idx\) => \{/);
  assert.doesNotMatch(page, /\{configuredQuestions\.length > 0 && \(/);
});
