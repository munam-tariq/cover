# Identity Review Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix identity-review findings #1–#4 and #6 with regression coverage across the API and React Native SDK.

**Architecture:** Keep JTI persistence in its existing service while extracting its conflict decision into a pure policy module. Reuse the shared rate-limit store for a per-visitor limit plus a trusted-IP ceiling. Close every React Native initialization/reset exit in the identity state machine, and guard late transport responses with the client's existing request generation.

**Tech Stack:** TypeScript, Express, Supabase JS, Node test runner, Jest, React Native Builder Bob.

**Spec:** `docs/superpowers/specs/2026-07-18-identity-review-fixes-design.md`

## Global Constraints

- Follow DRY, KISS, and SOLID principles.
- Do not change JWT claims, response shapes, JTI lifetime, or cross-visitor replay behavior.
- Do not mutate any database or edit the applied identity migration in this pass.
- Preserve all unrelated changes in both dirty working trees.
- Work in the existing trees because the identity feature's critical files are untracked; do not create a worktree that omits them.
- Do not run `git add`, `git commit`, `git push`, merge, or destructive Git commands.
- The React Native SDK is the sibling repository at `/media/ubuntu/external/cover/sdk`.
- Write each regression test before its production change and observe the expected failure.

## File Map

- Create `apps/api/src/services/identity-jti-policy.ts`: pure JTI conflict and prune-interval decisions.
- Create `tests/api/identity-jti-policy.test.ts`: behavioral JTI state-transition and prune-throttle tests.
- Modify `apps/api/src/services/identity-jti.ts`: use the pure conflict policy and throttle pruning.
- Modify `tests/api/rate-limit.test.ts`: behavioral identify limiter coverage.
- Modify `apps/api/src/middleware/rate-limit.ts`: reusable identify visitor/IP limiter stack and exported trusted IP extraction.
- Modify `apps/api/src/routes/customers.ts`: use the identify limiter stack.
- Modify `/media/ubuntu/external/cover/sdk/packages/react-native/src/__tests__/identify.test.ts`: initialization and clearing regressions.
- Modify `/media/ubuntu/external/cover/sdk/packages/react-native/src/client.ts`: settle pending identity state and reject stale responses.
- Regenerate `/media/ubuntu/external/cover/sdk/packages/react-native/lib/**`: published React Native artifacts.

---

### Task 1: Make incomplete same-visitor JTI reservations resumable

**Files:**

- Create: `apps/api/src/services/identity-jti-policy.ts`
- Create: `tests/api/identity-jti-policy.test.ts`
- Modify: `apps/api/src/services/identity-jti.ts:17-82`

**Interfaces:**

- Produces:
  - `decideExistingIdentityJti(existing, visitorId): ExistingIdentityJtiDecision`
  - decisions `{ status: "resume" }`, `{ status: "replay", customerId }`, or `{ status: "reject" }`
- Consumes: the existing Supabase row `{ visitor_id, customer_id }`.

- [ ] **Step 1: Write the failing policy and wiring tests**

Create `tests/api/identity-jti-policy.test.ts`:

```ts
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { decideExistingIdentityJti } from "../../apps/api/src/services/identity-jti-policy.ts";

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
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
node --experimental-strip-types --test tests/api/identity-jti-policy.test.ts
```

Expected: FAIL because `identity-jti-policy.ts` does not exist.

- [ ] **Step 3: Implement the pure conflict policy**

Create `apps/api/src/services/identity-jti-policy.ts`:

```ts
export interface ExistingIdentityJti {
  visitorId: string;
  customerId: string | null;
}

export type ExistingIdentityJtiDecision =
  | { status: "resume" }
  | { status: "replay"; customerId: string }
  | { status: "reject" };

export function decideExistingIdentityJti(
  existing: ExistingIdentityJti | null,
  visitorId: string
): ExistingIdentityJtiDecision {
  if (!existing || existing.visitorId !== visitorId) {
    return { status: "reject" };
  }
  if (existing.customerId) {
    return { status: "replay", customerId: existing.customerId };
  }
  return { status: "resume" };
}
```

- [ ] **Step 4: Wire the policy into `reserveIdentityJti()`**

Import the policy in `identity-jti.ts`:

```ts
import { decideExistingIdentityJti } from "./identity-jti-policy";
import { IdentityTokenError } from "./identity-jwt";
```

Replace the existing same-visitor/customer guard with:

```ts
  const decision = decideExistingIdentityJti(
    existing
      ? {
          visitorId: existing.visitor_id,
          customerId: existing.customer_id,
        }
      : null,
    input.visitorId
  );

  if (decision.status === "replay") {
    return { status: "replay", customerId: decision.customerId };
  }
  if (decision.status === "resume") {
    return { status: "reserved" };
  }

  throw new IdentityTokenError(
    "TOKEN_REPLAYED",
    "Identity token has already been used"
  );
```

Update the function comment so an incomplete same-visitor reservation is
documented as resumable rather than rejected.

- [ ] **Step 5: Run the focused test and verify GREEN**

Run:

```bash
node --experimental-strip-types --test tests/api/identity-jti-policy.test.ts
```

Expected: PASS (4 tests).

---

### Task 2: Throttle opportunistic expired-JTI pruning

**Files:**

- Modify: `apps/api/src/services/identity-jti-policy.ts`
- Modify: `tests/api/identity-jti-policy.test.ts`
- Modify: `apps/api/src/services/identity-jti.ts:15-55`

**Interfaces:**

- Produces `createIntervalGate(intervalMs): (now?: number) => boolean`.
- `identity-jti.ts` uses one process-local five-minute gate before launching
  its existing best-effort indexed delete.

- [ ] **Step 1: Add the failing interval-gate and wiring tests**

Extend the policy import:

```ts
import {
  createIntervalGate,
  decideExistingIdentityJti,
} from "../../apps/api/src/services/identity-jti-policy.ts";
```

Append:

```ts
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
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
node --experimental-strip-types --test tests/api/identity-jti-policy.test.ts
```

Expected: FAIL because `createIntervalGate` is not exported and pruning is
still unconditional.

- [ ] **Step 3: Add the pure interval gate**

Append to `identity-jti-policy.ts`:

```ts
export function createIntervalGate(
  intervalMs: number
): (now?: number) => boolean {
  let nextRunAt = 0;

  return (now = Date.now()) => {
    if (now < nextRunAt) return false;
    nextRunAt = now + intervalMs;
    return true;
  };
}
```

- [ ] **Step 4: Guard the existing prune**

In `identity-jti.ts`, import `createIntervalGate` with the conflict policy and
add:

```ts
const JTI_PRUNE_INTERVAL_MS = 5 * 60 * 1000;
const shouldPruneExpiredJtis = createIntervalGate(JTI_PRUNE_INTERVAL_MS);
```

Wrap the existing best-effort delete:

```ts
    if (shouldPruneExpiredJtis()) {
      void supabaseAdmin
        .from("consumed_identity_jti")
        .delete()
        .lt("expires_at", new Date().toISOString())
        .then(undefined, () => undefined);
    }
```

Update the module comment to say pruning is opportunistic and interval
throttled per process.

- [ ] **Step 5: Run the focused test and verify GREEN**

Run:

```bash
node --experimental-strip-types --test tests/api/identity-jti-policy.test.ts
```

Expected: PASS (6 tests).

---

### Task 3: Give identify a visitor limit and trusted-IP ceiling

**Files:**

- Modify: `tests/api/rate-limit.test.ts`
- Modify: `apps/api/src/middleware/rate-limit.ts:176-390`
- Modify: `apps/api/src/routes/customers.ts:12-160`

**Interfaces:**

- Produces:
  - `IDENTIFY_RATE_LIMITS`
  - `identifyRateLimiters`, ordered IP ceiling then visitor quota
  - reusable `extractClientIp(req)`
- The customer identify route spreads `...identifyRateLimiters`.

- [ ] **Step 1: Extend the rate-limit imports and add a stack test helper**

Add `readFile` and the new middleware exports:

```ts
import { readFile } from "node:fs/promises";

import {
  CHAT_RATE_LIMITS,
  IDENTIFY_RATE_LIMITS,
  chatRateLimiter,
  getRateLimitStatus,
  identifyRateLimiters,
  resetRateLimits,
  setStore,
  type RateLimitStore,
} from "../../apps/api/src/middleware/rate-limit.ts";
```

Add after `mockRes()`:

```ts
async function runIdentifyRateLimiters(req: any) {
  const res = mockRes();
  let allowed = true;

  for (const limiter of identifyRateLimiters) {
    let continued = false;
    await limiter(req, res, () => {
      continued = true;
    });
    if (!continued) {
      allowed = false;
      break;
    }
  }

  return { allowed, res };
}
```

- [ ] **Step 2: Add the failing identify limiter tests**

Append:

```ts
test("identify gives different visitors behind one IP separate quotas", async () => {
  for (let index = 0; index < 11; index += 1) {
    const { allowed, res } = await runIdentifyRateLimiters(
      mockReq({
        body: { projectId: "project-a", visitorId: `visitor-${index}` },
        ip: "198.51.100.10",
      })
    );
    assert.equal(allowed, true);
    assert.equal(res.statusCode, 200);
  }
});

test("identify blocks one visitor after its per-minute quota", async () => {
  const req = mockReq({
    body: { projectId: "project-a", visitorId: "visitor-a" },
    ip: "198.51.100.11",
  });

  for (
    let index = 0;
    index < IDENTIFY_RATE_LIMITS.perVisitor.maxRequests;
    index += 1
  ) {
    assert.equal((await runIdentifyRateLimiters(req)).allowed, true);
  }

  const blocked = await runIdentifyRateLimiters(req);
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.res.statusCode, 429);
});

test("identify's IP ceiling blocks visitor-id rotation", async () => {
  const ip = "198.51.100.12";

  for (
    let index = 0;
    index < IDENTIFY_RATE_LIMITS.perIp.maxRequests;
    index += 1
  ) {
    const result = await runIdentifyRateLimiters(
      mockReq({
        body: { projectId: "project-a", visitorId: `rotated-${index}` },
        ip,
      })
    );
    assert.equal(result.allowed, true);
  }

  const blocked = await runIdentifyRateLimiters(
    mockReq({
      body: { projectId: "project-a", visitorId: "rotated-extra" },
      ip,
    })
  );
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.res.statusCode, 429);
});

test("the customer identify route uses the shared dual limiter", async () => {
  const source = await readFile("apps/api/src/routes/customers.ts", "utf8");
  assert.match(source, /import \{ identifyRateLimiters \}/);
  assert.match(source, /\.\.\.identifyRateLimiters/);
});
```

- [ ] **Step 3: Run the focused test and verify RED**

Run:

```bash
node --experimental-strip-types --test tests/api/rate-limit.test.ts
```

Expected: FAIL because `IDENTIFY_RATE_LIMITS` and `identifyRateLimiters` do not
exist and the route still uses a single project/IP bucket.

- [ ] **Step 4: Add the shared identify limiter stack**

Export the existing extractor:

```ts
export function extractClientIp(req: Request): string {
```

After `IP_CEILING_MULTIPLIER`, add:

```ts
const IDENTIFY_REQUESTS_PER_MINUTE = 10;

export const IDENTIFY_RATE_LIMITS = {
  perVisitor: {
    windowMs: 60_000,
    maxRequests: IDENTIFY_REQUESTS_PER_MINUTE,
  },
  perIp: {
    windowMs: 60_000,
    maxRequests: IDENTIFY_REQUESTS_PER_MINUTE * IP_CEILING_MULTIPLIER,
  },
} as const;
```

After the generic `rateLimit()` factory, add:

```ts
function requestBodyString(req: Request, key: string): string {
  const value = req.body?.[key];
  return typeof value === "string" && value.length > 0 ? value : "unknown";
}

export const identifyRateLimiters = [
  rateLimit({
    ...IDENTIFY_RATE_LIMITS.perIp,
    keyFn: (req) =>
      `identify:ip:${requestBodyString(req, "projectId")}:${extractClientIp(req)}`,
  }),
  rateLimit({
    ...IDENTIFY_RATE_LIMITS.perVisitor,
    keyFn: (req) =>
      `identify:visitor:${requestBodyString(req, "projectId")}:${requestBodyString(req, "visitorId")}`,
  }),
] as const;
```

- [ ] **Step 5: Replace the route's single limiter**

Change the import to:

```ts
import { identifyRateLimiters } from "../middleware/rate-limit";
```

Replace the existing inline `rateLimit({ ... })` middleware with:

```ts
  ...identifyRateLimiters,
```

- [ ] **Step 6: Run the focused test and verify GREEN**

Run:

```bash
node --experimental-strip-types --test tests/api/rate-limit.test.ts
```

Expected: all existing and new rate-limit tests pass.

- [ ] **Step 7: Run the API type-check**

Run:

```bash
pnpm --filter @chatbot/api type-check
```

Expected: exit 0.

---

### Task 4: Settle pre-init identify on every initialization exit

**Files:**

- Modify: `/media/ubuntu/external/cover/sdk/packages/react-native/src/__tests__/identify.test.ts`
- Modify: `/media/ubuntu/external/cover/sdk/packages/react-native/src/client.ts:267-307`

**Interfaces:**

- Hard initialization failure rejects a pending explicit identify with the
  normalized initialization error.
- Explicit session-denial recovery reaches ready and then invokes
  `applyIdentityAfterReady()`.

- [ ] **Step 1: Add the hard-initialization-failure regression test**

Append inside `describe("client identity verification", ...)`:

```ts
  it('rejects a pre-init identify when initialization fails', async () => {
    const client = createFrontFaceClient({
      projectId: PROJECT_ID,
      clientKey: CLIENT_KEY,
      storage: new MemoryStorage(),
      fetch: async (input) => {
        const url = new URL(String(input));
        if (url.pathname === `/api/embed/config/${PROJECT_ID}`) {
          return jsonResponse(
            {
              error: {
                code: 'UPSTREAM_UNAVAILABLE',
                message: 'Try later',
              },
            },
            503
          );
        }
        if (url.pathname === '/api/chat/lead-capture/status') {
          return jsonResponse({
            hasCompletedForm: false,
            hasCompletedQualifying: false,
            leadCaptureState: null,
          });
        }
        if (
          url.pathname ===
          `/api/projects/${PROJECT_ID}/handoff-availability`
        ) {
          return jsonResponse({
            available: false,
            showButton: false,
            showOfflineForm: false,
          });
        }
        throw new Error(`Unexpected request: ${url.pathname}`);
      },
    });

    let settled = false;
    let rejection: unknown;
    const identifying = client.identify({ token: IDENTITY_TOKEN }).then(
      () => {
        settled = true;
      },
      (error) => {
        settled = true;
        rejection = error;
      }
    );

    await waitFor(() => client.getSnapshot().phase === 'error');
    await tick();
    const settledBeforeDestroy = settled;
    client.destroy();
    await identifying;

    expect(settledBeforeDestroy).toBe(true);
    expect(rejection).toEqual(
      expect.objectContaining({ code: 'UPSTREAM_UNAVAILABLE' })
    );
  });
```

- [ ] **Step 2: Add the session-denial recovery regression test**

Append:

```ts
  it('applies a pre-init identify after session-denial recovery', async () => {
    const storage = new MemoryStorage();
    const conversationId = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
    const keys = getStorageKeys('https://api.frontface.app', PROJECT_ID);
    storage.values.set(
      keys.session,
      JSON.stringify({
        version: 1,
        conversationId,
        sessionToken: 'expired-session-token',
      })
    );
    const identifyBodies: Array<Record<string, unknown>> = [];
    const client = createFrontFaceClient({
      projectId: PROJECT_ID,
      clientKey: CLIENT_KEY,
      storage,
      fetch: async (input, init) => {
        const url = new URL(String(input));
        switch (url.pathname) {
          case `/api/embed/config/${PROJECT_ID}`:
            return jsonResponse({
              ...embedConfig,
              config: { ...embedConfig.config, feedbackEnabled: false },
            });
          case '/api/chat/lead-capture/status':
            return jsonResponse({
              hasCompletedForm: true,
              hasCompletedQualifying: true,
              leadCaptureState: null,
            });
          case `/api/projects/${PROJECT_ID}/handoff-availability`:
            return jsonResponse({
              available: false,
              showButton: false,
              showOfflineForm: false,
            });
          case `/api/widget/conversations/${conversationId}/status`:
            return jsonResponse(
              {
                error: {
                  code: 'SESSION_INVALID',
                  message: 'Session expired',
                },
              },
              403
            );
          case `/api/widget/conversations/${conversationId}/messages/public`:
            return jsonResponse({ messages: [] });
          case '/api/customers/identify': {
            const body = JSON.parse(
              String(init?.body)
            ) as Record<string, unknown>;
            identifyBodies.push(body);
            return jsonResponse({
              contact: {
                ...identifyResponse.contact,
                visitorId: body.visitorId,
              },
              verifiedIdentity: identifyResponse.verifiedIdentity,
            });
          }
          default:
            throw new Error(`Unexpected request: ${url.pathname}`);
        }
      },
    });

    let settled = false;
    let rejection: unknown;
    const identifying = client.identify({ token: IDENTITY_TOKEN }).then(
      () => {
        settled = true;
      },
      (error) => {
        settled = true;
        rejection = error;
      }
    );

    await waitFor(() => client.getSnapshot().phase === 'ready');
    await tick();
    await tick();
    const settledBeforeDestroy = settled;
    client.destroy();
    await identifying;

    expect(settledBeforeDestroy).toBe(true);
    expect(rejection).toBeUndefined();
    expect(identifyBodies).toHaveLength(1);
  });
```

- [ ] **Step 3: Run the focused React Native test and verify RED**

Run:

```bash
pnpm --dir /media/ubuntu/external/cover/sdk/packages/react-native test:focused -- src/__tests__/identify.test.ts
```

Expected: both new tests fail because the pending identify is settled only
after `destroy()`, with `CLIENT_DESTROYED`.

- [ ] **Step 4: Settle pending identity in both initialization branches**

In the explicit-session-denial branch, after clearing `latestRetryableRead`,
add:

```ts
        applyIdentityAfterReady();
        return;
```

In the hard-failure branch, after publishing the error snapshot and before
throwing, add:

```ts
      const pending = pendingIdentify;
      pendingIdentify = undefined;
      pending?.reject(normalized);
      throw normalized;
```

- [ ] **Step 5: Run the focused React Native test and verify GREEN**

Run:

```bash
pnpm --dir /media/ubuntu/external/cover/sdk/packages/react-native test:focused -- src/__tests__/identify.test.ts
```

Expected: the full identify test file passes.

---

### Task 5: Clear pending identity and reject stale identify responses

**Files:**

- Modify: `/media/ubuntu/external/cover/sdk/packages/react-native/src/__tests__/identify.test.ts`
- Modify: `/media/ubuntu/external/cover/sdk/packages/react-native/src/client.ts:350-416`
- Modify: `/media/ubuntu/external/cover/sdk/packages/react-native/src/client.ts:1439-1442`

**Interfaces:**

- `clearLocalData()` rejects `pendingIdentify` with `CLIENT_RESET`.
- A late identity transport response after clear/reset rejects as
  `REQUEST_ABORTED` and never emits `identity:verified`.

- [ ] **Step 1: Add the pending-clear regression test**

Append:

```ts
  it('rejects a pending pre-init identify when local data is cleared', async () => {
    let markConfigStarted: (() => void) | undefined;
    const configStarted = new Promise<void>((resolve) => {
      markConfigStarted = resolve;
    });
    const client = createFrontFaceClient({
      projectId: PROJECT_ID,
      clientKey: CLIENT_KEY,
      storage: new MemoryStorage(),
      fetch: async (input) => {
        const url = new URL(String(input));
        if (url.pathname === `/api/embed/config/${PROJECT_ID}`) {
          markConfigStarted?.();
          return new Promise<Response>(() => undefined);
        }
        if (url.pathname === '/api/chat/lead-capture/status') {
          return jsonResponse({
            hasCompletedForm: false,
            hasCompletedQualifying: false,
            leadCaptureState: null,
          });
        }
        if (
          url.pathname ===
          `/api/projects/${PROJECT_ID}/handoff-availability`
        ) {
          return jsonResponse({
            available: false,
            showButton: false,
            showOfflineForm: false,
          });
        }
        throw new Error(`Unexpected request: ${url.pathname}`);
      },
    });

    let settled = false;
    let rejection: unknown;
    const identifying = client.identify({ token: IDENTITY_TOKEN }).then(
      () => {
        settled = true;
      },
      (error) => {
        settled = true;
        rejection = error;
      }
    );

    await configStarted;
    await client.clearLocalData();
    await tick();
    const settledBeforeDestroy = settled;
    client.destroy();
    await identifying;

    expect(settledBeforeDestroy).toBe(true);
    expect(rejection).toEqual(expect.objectContaining({ code: 'CLIENT_RESET' }));
  });
```

- [ ] **Step 2: Add the late-response regression test**

Append:

```ts
  it('ignores an identify response that arrives after local data is cleared', async () => {
    const identifyBodies: Array<Record<string, unknown>> = [];
    const calls: string[] = [];
    const events: FrontFaceEvent[] = [];
    const bootstrapFetch = createBootstrapFetch(identifyBodies, calls);
    let resolveIdentify: ((response: Response) => void) | undefined;
    let markIdentifyStarted: (() => void) | undefined;
    const identifyStarted = new Promise<void>((resolve) => {
      markIdentifyStarted = resolve;
    });
    let identifySignal: AbortSignal | null = null;
    const client = createFrontFaceClient({
      projectId: PROJECT_ID,
      clientKey: CLIENT_KEY,
      storage: new MemoryStorage(),
      onEvent: (event) => events.push(event),
      fetch: async (input, init) => {
        const url = new URL(String(input));
        if (url.pathname !== '/api/customers/identify') {
          return bootstrapFetch(input, init);
        }
        identifySignal = init?.signal ?? null;
        markIdentifyStarted?.();
        return new Promise<Response>((resolve) => {
          resolveIdentify = resolve;
        });
      },
    });

    await client.initialize();
    const identifying = client.identify({ token: IDENTITY_TOKEN }).then(
      () => ({ status: 'resolved' as const }),
      (error: unknown) => ({ status: 'rejected' as const, error })
    );
    await identifyStarted;

    await client.clearLocalData();
    resolveIdentify?.(jsonResponse(identifyResponse));
    const outcome = await identifying;

    expect(identifySignal?.aborted).toBe(true);
    expect(outcome).toEqual(
      expect.objectContaining({
        status: 'rejected',
        error: expect.objectContaining({ code: 'REQUEST_ABORTED' }),
      })
    );
    expect(events.some((event) => event.type === 'identity:verified')).toBe(
      false
    );
    client.destroy();
  });
```

- [ ] **Step 3: Run the focused React Native test and verify RED**

Run:

```bash
pnpm --dir /media/ubuntu/external/cover/sdk/packages/react-native test:focused -- src/__tests__/identify.test.ts
```

Expected:

- the pending call is settled only by `destroy()` and reports
  `CLIENT_DESTROYED`, not `CLIENT_RESET`;
- the late transport response resolves and emits `identity:verified`.

- [ ] **Step 4: Reject pending identity during `clearLocalData()`**

Change `clearLocalData()` to:

```ts
    async clearLocalData(): Promise<void> {
      ensureNotDestroyed();
      clearIdentityState(
        createClientError(
          'config',
          'CLIENT_RESET',
          'Local data was cleared before this identify() completed'
        )
      );
      return clearLocalState();
    },
```

- [ ] **Step 5: Guard `performIdentify()` against stale responses**

Capture the generation before launching the request:

```ts
    const requestGeneration = generation;
    const controller = new AbortController();
```

Immediately after `identifyCustomer()` resolves and before assigning
`identityApplied`, add:

```ts
        if (
          controller.signal.aborted ||
          !isCurrentGeneration(requestGeneration)
        ) {
          throw cancelledRequestError();
        }
```

- [ ] **Step 6: Run the focused React Native test and verify GREEN**

Run:

```bash
pnpm --dir /media/ubuntu/external/cover/sdk/packages/react-native test:focused -- src/__tests__/identify.test.ts
```

Expected: all identify tests pass.

---

### Task 6: Full verification and React Native artifact rebuild

**Files:**

- Regenerate: `/media/ubuntu/external/cover/sdk/packages/react-native/lib/**`
- Inspect all files changed by Tasks 1–5.

**Interfaces:**

- Source and built React Native exports must behave identically.
- No production database or Git state is mutated.

- [ ] **Step 1: Run the main repository focused tests**

Run:

```bash
node --experimental-strip-types --test \
  tests/api/identity-jti-policy.test.ts \
  tests/api/rate-limit.test.ts
```

Expected: all tests pass.

- [ ] **Step 2: Run the complete main repository test suite**

Run:

```bash
pnpm test
```

Expected: exit 0 with no test failures.

- [ ] **Step 3: Run main repository type-check and targeted lint**

Run:

```bash
pnpm type-check
pnpm --filter @chatbot/api exec eslint \
  src/middleware/rate-limit.ts \
  src/routes/customers.ts \
  src/services/identity-jti.ts \
  src/services/identity-jti-policy.ts
```

Expected: both commands exit 0.

- [ ] **Step 4: Run the complete React Native verification**

Run:

```bash
pnpm --dir /media/ubuntu/external/cover/sdk --filter @frontface/react-native test
pnpm --dir /media/ubuntu/external/cover/sdk --filter @frontface/react-native typecheck
pnpm --dir /media/ubuntu/external/cover/sdk --filter @frontface/react-native lint
```

Expected: all Jest tests pass and type-check/lint exit 0.

- [ ] **Step 5: Rebuild and inspect published React Native artifacts**

Run:

```bash
pnpm --dir /media/ubuntu/external/cover/sdk --filter @frontface/react-native build
pnpm --dir /media/ubuntu/external/cover/sdk --filter @frontface/react-native pack:check
rg -n "applyIdentityAfterReady|CLIENT_RESET|requestGeneration" \
  /media/ubuntu/external/cover/sdk/packages/react-native/lib
```

Expected: Builder Bob and pack dry-run exit 0, and generated runtime/declaration
artifacts reflect the source changes where applicable.

- [ ] **Step 6: Review final diffs and whitespace**

Run:

```bash
git diff --check
git status --short
git -C /media/ubuntu/external/cover/sdk status --short
```

Expected: no whitespace errors; only the intended identity work plus the user's
pre-existing changes are present. Do not stage or commit anything.

- [ ] **Step 7: Reconcile the result against the approved spec**

Confirm:

- #1 same-visitor incomplete JTI retries, while cross-visitor replay rejects;
- #2 hard init rejects pending identify and session denial applies it;
- #3 identify has separate visitor quotas plus a trusted-IP ceiling;
- #4 clearing local data settles pending work and stale responses cannot verify;
- #6 pruning runs at most once per five minutes per process;
- #5 and #7 remain explicitly deferred;
- no database, staging, commit, or push action occurred.
