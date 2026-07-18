# Identity Review Fixes Design

## Goal

Close findings #1–#4 and #6 from the 2026-07-18 extra-high identity review
without broadening the identity contract or changing the pending production
migration strategy.

The pass covers the API working tree in this repository and the React Native
SDK working tree at `/media/ubuntu/external/cover/sdk`. It does not commit,
stage, or push either repository.

## Confirmed Problems

### Incomplete JTI reservations cannot recover

`reserveIdentityJti()` inserts a row with `customer_id = NULL` before the merge.
If the merge or result-recording step fails, a retry by the same visitor finds
that row and receives `TOKEN_REPLAYED`. The token was reserved but never
completed, so treating it as a completed replay is the wrong state transition.

### Pre-initialization identify calls can remain pending

The React Native client settles `pendingIdentify` only through
`applyIdentityAfterReady()`. Hard initialization failures never invoke it, and
the recoverable explicit-session-denial branch returns after restoring a ready
anonymous client without invoking it.

### Identify requests share an overly broad rate-limit bucket

The identify route currently uses project ID plus `req.ip`. Legitimate visitors
behind the same proxy or NAT therefore consume the same ten-request bucket.
The route also bypasses the trusted-proxy IP extraction already used by the
chat limiter.

### Clearing local data does not clear identity activity

`clearLocalData()` resets transport and persisted state but does not abort
identity-specific bookkeeping or reject `pendingIdentify`. Its general request
invalidation does abort the identity controller, but a transport that resolves
after cancellation can still update identity state because `performIdentify()`
does not check the request generation before publishing success.

### Expired-JTI pruning runs on every successful reservation

Every new JTI launches a cross-project expired-row delete. This repeats the same
database work on the identify hot path and creates avoidable lock and vacuum
churn.

## Chosen Design

### 1. Model an incomplete same-visitor JTI as resumable

The JTI conflict policy will have three outcomes:

- same visitor and a recorded customer: return the recorded result as an
  idempotent replay;
- same visitor and no recorded customer: return `reserved` so the merge can be
  attempted again;
- a different visitor, a missing row after a unique conflict, or any otherwise
  inconsistent state: reject with `TOKEN_REPLAYED`.

This keeps the reservation bound to its original visitor, survives both merge
failures and ambiguous result-recording failures, and avoids a compensating
delete race. The merge RPC already serializes and converges repeated attempts,
so retrying the incomplete operation is safe.

The conflict classification will be isolated as a small pure policy function
so the state transition has a behavioral unit test without mocking Supabase.

### 2. Settle React Native identity work on every initialization exit

On a hard initialization failure, the client will reject the pending explicit
identify call with the same normalized `FrontFaceError` returned by
initialization.

On explicit session denial, initialization deliberately recovers to a ready
anonymous client. After publishing that ready state, it will invoke
`applyIdentityAfterReady()` so the pending/config identity token runs normally.

`clearLocalData()` will clear active identity state with a typed reset error
before clearing transport and persistence. It will not erase `identityToken`;
`resetUser()` remains the API that logs out the identified user. This preserves
the semantic distinction between clearing cached chat data and resetting user
identity while preventing stale work from completing.

`performIdentify()` will also capture the current request generation and check
the generation and abort signal after its transport call. A response delivered
after clear/reset is therefore rejected as an aborted request instead of
publishing `identity:verified` into the new local state.

After source changes, the React Native `lib/` artifacts will be rebuilt because
the package publishes built CommonJS, ESM, and declaration outputs.

### 3. Apply visitor fairness plus a network abuse ceiling

The identify route will use two limits in the existing shared rate-limit store:

- per project and visitor ID: 10 requests per minute;
- per project and trusted client IP: 50 requests per minute, using the existing
  default five-times IP ceiling multiplier and trusted-proxy extraction.

The IP ceiling runs as a security backstop against forged visitor IDs. The
visitor limit remains the final successful middleware so response headers
describe the caller's own quota rather than the broader network quota.

The implementation will reuse the existing generic `rateLimit()` middleware.
Only the shared client-IP extractor needs to become reusable; no second store
or route-specific limiter implementation will be introduced.

### 4. Throttle opportunistic JTI pruning

Expired JTI rows will be pruned at most once per five-minute interval per API
process. The first successful reservation after the interval launches the same
best-effort indexed delete; later reservations skip it until the next interval.

This avoids nondeterministic probability-based behavior, does not require
deploying a new cron before the identity migration exists in production, and
removes the delete from nearly every identify request.

## Error Handling

- A same-visitor incomplete JTI retry proceeds through the normal merge path.
- Cross-visitor JTI reuse continues to return `401 TOKEN_REPLAYED`.
- JTI database errors other than a unique conflict continue to become internal
  errors; they are not mislabeled as token replay.
- A hard React Native initialization failure rejects both initialization and a
  pending explicit identify with the same normalized error.
- Session-denial recovery remains non-fatal and applies identity once the fresh
  ready state exists.
- Clearing local data rejects pending identity with a typed client-reset error
  and aborts in-flight network work.
- Prune failures remain best-effort and never fail identity verification.

## Verification Design

Tests will be written and observed failing before implementation:

1. API JTI policy tests cover incomplete same-visitor retry, completed
   same-visitor replay, and cross-visitor rejection.
2. API rate-limit tests prove eleven different visitors behind one IP are not
   blocked by the ten-request visitor limit, one visitor is blocked after ten
   requests, and rotating visitors eventually hits the IP ceiling.
3. React Native tests prove a pre-init identify rejects on hard initialization
   failure, applies after session-denial recovery, and is rejected/aborted when
   `clearLocalData()` races it.
4. Focused suites run after each fix, followed by the main repository test and
   type-check commands and the React Native test, lint, type-check, and build
   commands.
5. Diffs are reviewed to confirm generated React Native artifacts match source
   and unrelated working-tree changes remain untouched.

## Deferred Findings

Finding #5 remains a separate production-deployment task. Before promotion,
the hardening migration should be rewritten as online-safe steps: a plain
normalized-email column with controlled backfill/maintenance, a concurrent
unique index, and foreign keys added `NOT VALID` before later validation.

Finding #7, the unused `v_email_norm` variable, will be removed during that
migration rewrite. Editing it alone would not improve deployed dev behavior and
would separate an applied migration file from the production-safe redesign.

## Non-Goals

- No production migration or database mutation.
- No identity-token claim or public response-shape changes.
- No change to JTI lifetime, visitor binding, or cross-visitor replay policy.
- No new cron endpoint or scheduler.
- No unrelated identity refactor.
- No Git staging, commit, push, merge, or branch operation.
