import assert from "node:assert/strict";
import test from "node:test";

import {
  getNextOnboardingPoll,
  getOnboardingProgressSignature,
} from "../../apps/web/app/(onboarding)/components/onboarding-polling.ts";

test("backs off while onboarding progress is unchanged and resets when it changes", () => {
  const crawling = getOnboardingProgressSignature({
    status: "crawling",
    crawlProgress: { pagesFound: 3, pagesProcessed: 1, maxPages: 10 },
  });
  const progressed = getOnboardingProgressSignature({
    status: "crawling",
    crawlProgress: { pagesFound: 4, pagesProcessed: 2, maxPages: 10 },
  });

  const changed = getNextOnboardingPoll(null, crawling, 0);
  assert.deepEqual(changed, { delayMs: 4_000, unchangedPolls: 0 });

  const firstRepeat = getNextOnboardingPoll(crawling, crawling, changed.unchangedPolls);
  assert.deepEqual(firstRepeat, { delayMs: 8_000, unchangedPolls: 1 });

  const secondRepeat = getNextOnboardingPoll(crawling, crawling, firstRepeat.unchangedPolls);
  assert.deepEqual(secondRepeat, { delayMs: 12_000, unchangedPolls: 2 });

  const cappedRepeat = getNextOnboardingPoll(crawling, crawling, secondRepeat.unchangedPolls);
  assert.deepEqual(cappedRepeat, { delayMs: 15_000, unchangedPolls: 3 });

  const reset = getNextOnboardingPoll(crawling, progressed, cappedRepeat.unchangedPolls);
  assert.deepEqual(reset, { delayMs: 4_000, unchangedPolls: 0 });
});

test("progress signatures ignore unrelated response fields", () => {
  const base = getOnboardingProgressSignature({
    status: "testing",
    totals: { pages: 4, imported: 4 },
    selfTest: { status: "running", questions: [] },
  });
  const responseWithUnrelatedData = {
    status: "testing",
    totals: { pages: 4, imported: 4 },
    selfTest: { status: "running", questions: [] },
    requestId: "different-request-id",
  };
  const withUnrelatedData = getOnboardingProgressSignature(responseWithUnrelatedData);

  assert.equal(base, withUnrelatedData);
});
