import assert from "node:assert/strict";
import test from "node:test";

import { parseSampleRate } from "../../packages/shared/src/observability.ts";

test("parseSampleRate accepts values in the Sentry range", () => {
  assert.equal(parseSampleRate("0"), 0);
  assert.equal(parseSampleRate("0.25"), 0.25);
  assert.equal(parseSampleRate("1"), 1);
});

test("parseSampleRate falls back for invalid or out-of-range values", () => {
  assert.equal(parseSampleRate(undefined, 0.1), 0.1);
  assert.equal(parseSampleRate("not-a-number", 0.1), 0.1);
  assert.equal(parseSampleRate("-0.1", 0.1), 0.1);
  assert.equal(parseSampleRate("1.1", 0.1), 0.1);
});
