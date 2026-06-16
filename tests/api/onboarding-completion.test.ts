import assert from "node:assert/strict";
import test from "node:test";

import { hasCompletedOnboarding } from "../../apps/api/src/services/onboarding-completion.ts";

test("hasCompletedOnboarding recognizes completed settings only", () => {
  assert.equal(
    hasCompletedOnboarding({
      onboarding: { completed_at: "2026-06-15T12:00:00.000Z" },
    }),
    true
  );
  assert.equal(
    hasCompletedOnboarding({ onboarding: { completed_at: null } }),
    false
  );
  assert.equal(hasCompletedOnboarding({}), false);
  assert.equal(hasCompletedOnboarding(null), false);
});
