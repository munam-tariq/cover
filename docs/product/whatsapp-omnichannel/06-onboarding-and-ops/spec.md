# Onboarding & Ops Specification

## Metadata
- **Feature ID**: CHAN-006
- **Feature Name**: WhatsApp Onboarding, Env & End-to-End Verification
- **Category**: Channels / Ops
- **Priority**: P0
- **Complexity**: Medium (mostly process, not code)
- **Target Version**: Omnichannel v1 (Week 1–2)
- **Dependencies**: CHAN-001, CHAN-002, CHAN-003, CHAN-004
- **Owner**: Eng + Ops
- **Status**: Approved — ready to build

## Summary
The runbook, environment, and verification for connecting a **pilot customer's own WhatsApp number** to
FrontFace **manually**, using the **customer's own Meta app and credentials**. FrontFace does not create or
operate a Meta app, and does not need Meta Business Verification or App Review for this flow — it is a
credential-agnostic API consumer: it verifies inbound webhooks and sends messages using whatever access
token and app secret a given connection was configured with, regardless of which Meta app issued them.
Defines which "own number" states are supported in v1, the load-bearing WABA-subscription step, the
Coexistence/Embedded-Signup fast-follow (a *different*, provider-owned-app pattern — see note below), the
env vars, and the full end-to-end test (local test number → real pilot number).

## User Story
As the FrontFace operator onboarding a pilot, I have a precise, ordered runbook to connect the customer's
WhatsApp number so inbound messages reach our webhook and the agent replies — and I know exactly which
numbers I can connect today vs. which need the fast-follow.

## Functional Requirements

### FR-001: Supported number states (v1)
A customer's number is in one of three states; onboarding differs:
1. **Already on Cloud API / a WABA** → manual connect (paste credentials). No App Review. ✅ v1.
2. **Brand-new / dedicated number** (not yet on WhatsApp) → register on a WABA. ✅ v1.
3. **Live in the WhatsApp Business *App*** (common SMB case) → naive Cloud-API registration **takes the
   number off their app**. The non-disruptive path is Meta **Coexistence** (GA 2025-05-06: Business App +
   Cloud API on the same number, two-way mirrored), **but Coexistence is delivered through Embedded
   Signup** → fast-follow. For a state-3 pilot in v1: use a dedicated number, or accept the app→Cloud-API
   move. ⏳ fast-follow.

Plain **personal** (non-Business) numbers are unsupported until onboarded to the WhatsApp Business Platform.

### FR-002: App-level webhook + per-number routing
- Webhooks are **app-level, on the customer's own app** — not number-level, and not FrontFace's app. Each
  customer's WABA lives under whichever Meta app they (or whoever manages their Meta account) already have
  or create. FrontFace's webhook endpoint is a single shared receiving URL that any number of different
  customer apps point their callback at; inbound is routed to the right project by `phone_number_id`
  (CHAN-001 `channel_connections.external_id`), not by which app sent it.
- The load-bearing step: the customer's own WABA must be **subscribed** via `POST /{waba-id}/subscribed_apps`,
  called with the customer's own access token against their own app. This is the most easily-missed step —
  without it, no inbound reaches our webhook. (Confirmed empirically during E2E testing: inbound stopped
  arriving until this call was made, even for a single app's own WABA. The exact reason Meta requires this
  in addition to the Configuration-panel field subscription isn't fully pinned down — treat it as a required
  step regardless.) No Business Manager asset-sharing across FrontFace and the customer is involved.

### FR-003: Manual-connect runbook
Ordered steps (for our internal docs / the connecting business). All Meta-side setup happens on the
**customer's own Meta app** — FrontFace never creates or touches its own app:
1. The customer has (or creates) a Meta app with the WhatsApp product added. This is a few clicks on
   Meta's side for a single number; it is not the Tech-Provider setup.
2. Using the customer's own access token, call `POST /{waba-id}/subscribed_apps` against their own WABA.
3. Obtain: **Phone Number ID**, **WABA ID**, a **permanent system-user access token** — all from the
   customer's own app.
4. On the customer's own app, set the webhook callback to `https://<api-host>/api/channels/whatsapp/webhook`
   + a **verify token**; subscribe to the `messages` field.
5. Paste Phone Number ID / WABA ID / access token / app secret / verify token into the FrontFace
   **Channels** settings tab (CHAN-004) → stored encrypted (CHAN-001). These are the customer's own app's
   credentials, not FrontFace's.
6. Send a test WhatsApp message → confirm the agent replies.

### FR-004: Environment
- `apps/api` (`.env.example`): `GRAPH_API_VERSION` (default `v25.0`). App secrets are per-connection only
  (no global `WHATSAPP_APP_SECRET` fallback) — each connection independently verifies HMAC against its own
  stored secret, since each customer's webhook is genuinely signed by their own app's secret, not a shared
  one. Per-project tokens (access/verify/WABA/app secret) live **encrypted in `channel_connections`**, never
  in env.
- `ENCRYPTION_KEY` already required (reused for credential encryption — CHAN-001).

### FR-005: Meta Business Verification — not required for v1
- Because FrontFace does not operate its own Meta app in this flow, **Meta Business Verification and
  Tech-Provider review are not needed** to onboard pilot customers, and there is no limit on the number of
  customer WABAs FrontFace can support this way (each is independent, under its own app). Verification only
  becomes relevant if/when self-serve Embedded Signup is built (see the fast-follow note in the
  [README](../README.md)) — that is a separate, later decision, not a dependency of this cut.

### FR-006: End-to-end verification (the demo)
- Defined in Technical Approach below; the pilot demo is the [README](../README.md) week-2 acceptance gate.

### FR-007: Security — webhook is the only new public surface *(added 2026-06-28, security baseline)*
- Of all the new endpoints in this cut, only the WhatsApp webhook (`POST/GET /api/channels/whatsapp/webhook`)
  is intentionally public. Every other endpoint is either dashboard-authenticated (`authMiddleware`) or
  widget-gated (`requirePublicWidgetAccess`). The env documentation and onboarding runbook must make this
  distinction explicit so the operator understands what is exposed.

### FR-008: Security — verify token should be cryptographically random *(added 2026-06-28)*
- The webhook `verify_token` stored in `channel_connections.credentials` should be generated using
  `crypto.randomBytes` (not a human-chosen passphrase). The Channels tab (CHAN-004) should auto-generate
  this value and allow regeneration. (The verify token gates only the GET handshake echo — the callback
  URL is set in Meta's dashboard, not via the token — so this is hygiene, not a critical gate. The HMAC
  `app_secret` on POST is the real security boundary.)

## UI Mockup

```
Number-state decision (v1):
  Is the number already on Cloud API / a WABA?
      ├─ yes ──────────────► manual connect (paste creds)         ✅ v1
      └─ no ──► Is it a brand-new/dedicated number?
                   ├─ yes ──► register on a WABA                  ✅ v1
                   └─ no (live in Business App)
                        ├─ ok to move off the app? ──► register   ✅ v1
                        └─ must keep the app ──► Coexistence       ⏳ fast-follow (Embedded Signup)
```

## Technical Approach

### Env (`apps/api/.env.example` additions)
```
GRAPH_API_VERSION=v25.0
# ENCRYPTION_KEY already present — reused to encrypt channel_connections.credentials
```

### Meta Graph calls used (reference)
```
POST /{waba-id}/subscribed_apps               # customer subscribes their own WABA to their own app (FR-002)
GET  /api/channels/whatsapp/webhook           # Meta verification handshake (CHAN-002 FR-001)
POST /{phone-number-id}/messages              # send (CHAN-002 sendText / CHAN-003 dispatcher)
```

### End-to-end test plan
1. **Local loop (Meta test number):** tunnel (ngrok) → register the webhook → send a WhatsApp message →
   confirm a `source='whatsapp'` conversation appears in the inbox with the channel badge, the agent
   answers from the KB, and the reply lands back in WhatsApp.
2. **Memory:** send a follow-up in the same thread; confirm the reply reflects prior context (engine
   history fix, CHAN-002 FR-007).
3. **Handoff:** trigger handoff → reply from the inbox composer → reaches WhatsApp; send another inbound
   and confirm the AI does not hijack the human thread.
4. **Window:** simulate `last_inbound_at` > 24h → composer shows window-closed; dispatcher refuses
   free-form send (`WINDOW_CLOSED`); no ghost message persisted.
5. **Idempotency:** redeliver the same `wa_message_id` → no duplicate message/reply.
6. **Launcher (CHAN-005):** configure WhatsApp in the embed editor → widget button deep-links to
   `wa.me/<number>`.
7. **Unit:** signature verify, inbound parse, enum threading, dispatcher window logic.
8. **Pilot:** repeat 1–4 on the **real pilot customer number**, connected manually per the runbook.

**Security-specific tests** *(added 2026-06-28, security baseline)*:

9. **Invalid HMAC:** POST to the webhook with a tampered body or wrong `X-Hub-Signature-256` → 401,
   no message created, no LLM call.
10. **Missing HMAC:** POST with no `X-Hub-Signature-256` header → 401.
11. **Replayed `wa_message_id`:** re-deliver an already-processed message → no duplicate message row, no
    duplicate AI reply (DB unique index + app-level check).
12. **Anon data-API probe:** query `channel_connections` via the Supabase anon key → zero rows /
    permission denied (matching the `security:probe:supabase` script pattern).
13. **Non-owner API probe:** a signed-in user who is NOT the project owner calls
    `GET /api/projects/:id/channels` and `POST /api/projects/:id/channels/whatsapp` → 403.
14. **Credential secrecy:** inspect the response of `GET /api/projects/:id/channels` → no access token,
    app secret, or verify token in the response body.
15. **Launcher XSS:** configure a channel with `url: "javascript:alert(1)"` → rejected on save; if
    force-inserted via direct DB write, the widget does not render it as a clickable link.
16. **Webhook rate-limit:** fire 50 rapid webhook POSTs with the same `wa_id` → rate limiter triggers;
    verify that POSTs from a *different* `wa_id` in the same burst are unaffected.

## Acceptance Criteria

### AC-001: Number-state guidance
- The runbook clearly states which of the three states a pilot is in and the correct action; state-3
  "keep the app" is correctly routed to the fast-follow, not promised in v1.

### AC-002: WABA subscription
- The runbook includes the `subscribed_apps` step explicitly (customer's own app, own WABA — no
  cross-business asset-sharing); skipping it is identified as the failure mode when no inbound arrives.

### AC-003: Env documented
- `GRAPH_API_VERSION` appears in `.env.example` with comments; per-project tokens (including app secret)
  are documented as living encrypted in `channel_connections`, not env.

### AC-004: Full E2E green
- Test-plan steps 1–8 pass on a Meta test number; steps 1–4 pass on the real pilot number.
- Security tests 9–16 all pass.

### AC-005: No Meta Business Verification dependency
- This cut does not require Meta Business Verification or Tech-Provider review — FrontFace operates no
  Meta app of its own. (Superseded 2026-07-01: this AC previously required initiating verification during
  the cut; that assumed the Tech-Provider/shared-app model, which this cut does not use.)

### AC-006: Security probe green *(security baseline)*
- Running `pnpm security:probe:supabase` after applying the channel migrations shows
  `channel_connections` as denied to anon (matching the hardening round verification pattern).

### AC-007: Verify token is cryptographically random *(security baseline)*
- The auto-generated verify token in the Channels tab is at least 32 bytes of `crypto.randomBytes`,
  hex-encoded. A manually-pasted short/guessable verify token is accepted (operator's choice) but the
  default path is secure-by-default.

## Out of Scope
- Self-serve Embedded Signup UI + Coexistence onboarding (fast-follow; **note:** this is a different,
  provider-owned-app pattern than the rest of this spec — see the fast-follow note in the
  [README](../README.md); it would require revisiting the "no FrontFace app" decision, not just building UI
  on top of it).
- Multi-number-per-project onboarding.
- Production load/queue hardening beyond fire-and-forget + Sentry (CHAN-002).
- Outbound templates / billing setup.

## Success Metrics
- Time to connect the pilot number end-to-end (target < 30 min following the runbook).
- 0 "no inbound arriving" incidents traced to a missed WABA subscription after the runbook is followed.

## Questions & Decisions
- **Q**: Does v1 ("customer's own number") need App Review or Business Verification?
  - **A**: No — FrontFace doesn't operate its own Meta app in this flow, so neither applies, and there is no
    cap on how many customer WABAs can be connected this way. App Review/Business Verification only become
    relevant if self-serve Embedded Signup is built later (fast-follow, and a separate architectural
    decision — see the README's fast-follow note).
- **Q**: Single shared verify token / app secret vs per-connection?
  - **A**: Per-connection only (stored encrypted). No global `WHATSAPP_APP_SECRET` env fallback was
    implemented.
- **Q**: Conversation-based vs per-message pricing?
  - **A**: Per-message since 2025-07-01; inbound service replies inside the 24h window are free (the entire
    v1 cost model). Verify country rates against live Meta docs before quoting customers.

## References
- [README — roadmap & pricing](../README.md)
- [CHAN-001 Channel Foundation](../01-channel-foundation/spec.md)
- [CHAN-002 WhatsApp Inbound](../02-whatsapp-inbound/spec.md)
- [CHAN-003 Outbound Dispatcher](../03-outbound-dispatcher/spec.md)
- [Meta — Embedded Signup](https://developers.facebook.com/documentation/business-messaging/whatsapp/embedded-signup/overview)
  (fast-follow only — see the note above; not part of this v1 flow)
- [Meta — Become a Tech Provider](https://developers.facebook.com/documentation/business-messaging/whatsapp/solution-providers/get-started-for-tech-providers)
  (fast-follow only, if self-serve Embedded Signup is ever built — not part of this v1 flow, kept for
  reference since it was previously listed as if it applied to v1, which it does not)
