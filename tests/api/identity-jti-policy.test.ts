import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  createIntervalGate,
  decideExistingIdentityJti,
} from "../../apps/api/src/services/identity-jti-policy.ts";

test("an incomplete reservation is resumable only by the same visitor", () => {
  assert.deepEqual(
    decideExistingIdentityJti(
      { visitorId: "visitor-a", customerId: null },
      "visitor-a"
    ),
    { status: "resume" }
  );
  assert.deepEqual(
    decideExistingIdentityJti(
      { visitorId: "visitor-a", customerId: null },
      "visitor-b"
    ),
    { status: "reject" }
  );
});

test("a completed reservation replays only for the same visitor", () => {
  assert.deepEqual(
    decideExistingIdentityJti(
      { visitorId: "visitor-a", customerId: "customer-1" },
      "visitor-a"
    ),
    { status: "replay", customerId: "customer-1" }
  );
  assert.deepEqual(
    decideExistingIdentityJti(
      { visitorId: "visitor-a", customerId: "customer-1" },
      "visitor-b"
    ),
    { status: "reject" }
  );
});

test("a missing row after a unique conflict is rejected", () => {
  assert.deepEqual(decideExistingIdentityJti(null, "visitor-a"), {
    status: "reject",
  });
});

test("the JTI service delegates conflict handling to the policy", async () => {
  const source = await readFile(
    "apps/api/src/services/identity-jti.ts",
    "utf8"
  );
  assert.match(source, /decideExistingIdentityJti/);
  assert.match(source, /decision\.status === "resume"/);
});

test("the interval gate permits at most one prune per interval", () => {
  const shouldRun = createIntervalGate(300_000);

  assert.equal(shouldRun(1_000_000), true);
  assert.equal(shouldRun(1_299_999), false);
  assert.equal(shouldRun(1_300_000), true);
});

test("the JTI service guards the expired-row delete with the interval gate", async () => {
  const source = await readFile(
    "apps/api/src/services/identity-jti.ts",
    "utf8"
  );
  assert.match(source, /createIntervalGate/);
  assert.match(source, /if \(shouldPruneExpiredJtis\(\)\)/);
});
