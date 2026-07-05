# WhatsApp + Omnichannel — 2-Week Roadmap & Spec Index

> **Status:** Approved plan, specs updated with security baseline (2026-06-28) · **Owner:** Product/Eng · **Target:** 2-week cut
> **Source plan:** `~/.claude/plans/can-u-run-a-tidy-canyon.md`
> All schema field names in these specs are **verified against the live dev DB** (`gjotktstaruezfjnslup`)
> as of 2026-06-26 — not inferred from `supabase/dump/schema.sql`.
> Security requirements reflect the June 2026 hardening round (see `docs/security/security-hardening-2026-06-26.md`).

## Why

FrontFace's AI agent reaches customers through only two surfaces today: the embedded **widget** and the
hosted **public page**. The next direction is **omnichannel** — the *same* KB-driven agent (same
knowledge base, persona, handoff, lead capture, analytics) answering on the channels businesses already
advertise, starting with **WhatsApp**, the number most SMBs put on their site.

This is unusually cheap to build here because of two verified facts:

1. **The engine is already channel-agnostic.** `processChat()` (`apps/api/src/services/chat-engine.ts:187`)
   keys on `projectId + visitorId + source`. A "channel" primitive already exists as `conversations.source`
   (a CHECK enum extended before via `add_public_source` / `add_mobile_source`). Widget-coupling lives
   only in *delivery* (HTTP response body for AI replies, Supabase Realtime broadcast for agent replies),
   **not** in reply *generation*.
2. **Inbound WhatsApp is free.** Meta moved to per-message pricing on **2025-07-01**. A business replying
   to a customer-initiated message **inside the 24-hour service window costs $0**. Only business-*initiated*
   re-engagement (templates outside the window) is billed — explicitly out of scope for this cut.

## Strategic decision — build native (not Chatwoot / Whatomate)

| Option | Verdict | Rationale |
|---|---|---|
| **Build native** — thin WhatsApp Cloud API adapter on `processChat` | ✅ **Chosen** | Reuses the moat (RAG + handoff + lead capture, already channel-agnostic); one stack (Node/TS + Supabase); foundation extends to IG/Messenger; talks to Meta directly (no BSP markup) |
| **Adopt Chatwoot** (Rails/Vue) | Reference only | No AI/RAG of its own — we'd re-plumb our engine into *their* inbox (more work); a second polyglot system to run + sync; licensing due-diligence |
| **Adopt Whatomate** (Frappe/Python) | Reference only | WhatsApp-only, stack mismatch, not an inbox |

**Borrow, don't run:** read Chatwoot/Whatomate source for the fiddly *adapter* internals — webhook
signature verification, media handling, the 24h-window state machine, template storage. Keep our engine
and inbox.

## WhatsApp pricing (verified, effective 2025-07-01)

| Category | Charged? | Notes |
|---|---|---|
| **Service** (reply to customer-initiated msg, in 24h window) | **Free** | This is our entire inbound MVP |
| Utility template (inside an open window) | Free | — |
| Utility / Authentication template (outside window) | Paid (~$0.004–0.046, country-variable) | Fast-follow |
| Marketing template | Paid (~$0.025–0.137, country-variable) | Fast-follow |

The load-bearing fact is the **free 24-hour service window**; per-message rates above are illustrative and
vary by country — verify against live Meta docs before quoting customers.

## Onboarding — pilot on the customer's own number, connected manually

The agent runs on the **customer's own WhatsApp number**, using the **customer's own Meta app and
credentials** — FrontFace does not create or operate a Meta app of its own, and does not need Meta
Business Verification or Tech-Provider review for this v1 flow. The customer (or whoever manages their
Meta app) generates their own access token and app secret, points their app's webhook callback at
FrontFace's endpoint, and hands those credentials to FrontFace, which stores them encrypted per connection
and calls the Graph API with them. FrontFace is a credential-agnostic API consumer, not an app owner.

Which "own number" is supported depends on its state (see [CHAN-006](./06-onboarding-and-ops/spec.md)):

- Already on Cloud API / a WABA → manual connect. ✅ v1
- Brand-new / dedicated number → register on a WABA. ✅ v1
- Live in the WhatsApp Business **App** (common SMB case) → keep-your-app **Coexistence** (Meta GA
  2025-05-06) is the non-disruptive path, **but it's delivered through Embedded Signup** → fast-follow.

**Note on the fast-follow:** self-serve in-dashboard connect (Embedded Signup) is a different Meta pattern
than the one described above — Embedded Signup provisions the WABA under the *platform's* app via a popup
flow, which is the Tech-Provider/ISV model FrontFace is deliberately avoiding for v1. If self-serve connect
is prioritized later, that decision needs to be revisited explicitly (it would require FrontFace to become
a Tech Provider and complete Meta Business Verification) — it is not simply "the same flow, automated."

## Security baseline (all specs)

The June 2026 security hardening round exposed patterns that this cut must follow from day one. The
hardening migration (`20260626000001`), owner-only client keys (`20260627120415`), privilege revocation
(`20260627174410`), and the API-layer gating (public-widget-gate, widget-session-token, voice-session-token,
rate-limit per-IP ceiling, SSRF DNS-rebinding defense) are the reference. Each spec adds only the
channel-specific security requirements; the shared rules below apply everywhere.

### DB layer
1. **No `anon` grants on new tables.** After the hardening round, `anon` is revoked on all 21 tenant
   tables. New tables (`channel_connections`) must follow: `REVOKE ALL ON TABLE ... FROM anon` in the
   same migration that creates them.
2. **Revoke TRUNCATE/REFERENCES/TRIGGER** from both `anon` and `authenticated` on new tables (matching
   `20260627174410_revoke_dangerous_public_table_privileges.sql`).
3. **Owner-only write policies.** Use the post-hardening `project_client_keys` pattern: RLS INSERT/UPDATE
   restricted to `authenticated` with an ownership check via `projects.user_id = auth.uid()`. Do NOT
   create `FOR ALL USING(true)` policies — that was the root cause of the `conversation_insights` leak.
4. **Pin `search_path`** on every new `SECURITY DEFINER` function (`SET search_path = public, pg_temp`).
5. **Credential columns are service-role-only.** Encrypted at rest (AES-256-GCM via `encryption.ts`).
   Never readable via the data API — revoke `authenticated` SELECT on credential columns or on the
   entire table if no browser query needs it.

### API layer
6. **Public widget endpoints → `requirePublicWidgetAccess` gate.** Every new public endpoint that accepts
   a `projectId` must go through this gate (client key or allowed browser origin). The gate runs in
   monitor mode by default (`WIDGET_GATE_ENFORCE=true` to fail closed) — matching the rollout pattern.
7. **Per-conversation reads → `requireWidgetSession`.** Any new endpoint that exposes conversation-specific
   data to the widget must verify the HMAC session token (`X-FrontFace-Session`), closing the IDOR that
   the hardening round fixed on `/status`, `/messages/public`, and `/handoff`.
8. **Rate limiting.** Use `chatRateLimiter` (or a channel-appropriate variant) on all write endpoints.
   Key by the identity the channel provides (phone number for WhatsApp, visitorId for widget) — NOT
   by source IP alone, which penalises shared NATs and doesn't distinguish tenants.
9. **The WhatsApp webhook is the ONE deliberately-public endpoint** in this cut. It is authenticated by
   Meta's `X-Hub-Signature-256` HMAC — it must NOT be wrapped in `requirePublicWidgetAccess` (Meta is
   not a browser and does not send Origin headers or client keys). The HMAC verification is the gate.
10. **SSRF defense.** Any tenant-configured URL fetched server-side must pass through
    `resolveAndValidateUrl` (DNS-rebinding check). The outbound WhatsApp send uses a hardcoded Meta
    endpoint (`graph.facebook.com`) so it is not an SSRF vector, but document this explicitly.
11. **Monitor-then-enforce.** New middleware follows the `WIDGET_GATE_ENFORCE` toggle: log would-be
    denials in monitor mode so existing clients aren't broken, then flip to enforce once backfilled.

### Client layer
12. **URL scheme validation.** Any user-provided URL rendered in the widget (channel deep-links, custom
    icons) must be validated to allow only `https:`, `http:`, `mailto:`, `tel:` — no `javascript:` or
    `data:` URIs. This is the same class of issue as the `parseMarkdown` `javascript:` href finding in
    `docs/security/stored-content-injection-xss-audit.md` (#4).
13. **Widget session tokens.** WhatsApp conversations are server-side — they do NOT receive or require a
    widget session token. The token is only issued to browser-initiated conversations (widget/public).

## 2-week roadmap

**Week 1 — foundation + visible win**
- [CHAN-005] Digital-card multi-channel widget launcher (frontend-only, ships immediately).
- [CHAN-001] Channel foundation: `whatsapp` source, `channel_connections`, `customers.phone`, idempotency.
- [CHAN-002] WhatsApp adapter + inbound webhook + shared `handleInbound` + engine history fix.

**Week 2 — close the loop + dashboard**
- [CHAN-003] Source-aware outbound dispatcher + agent-reply→WhatsApp + 24h-window enforcement.
- [CHAN-004] Dashboard channel-awareness: badge, source filter, analytics option, phone, Channels tab.
- [CHAN-006] Hardening + manual-connect runbook + end-to-end pilot demo.

## Specs

| ID | Spec | Workstream |
|---|---|---|
| CHAN-001 | [Channel Foundation](./01-channel-foundation/spec.md) | DB + types: source enum, `channel_connections`, `customers.phone`, idempotency |
| CHAN-002 | [WhatsApp Inbound](./02-whatsapp-inbound/spec.md) | Adapter, webhook, `handleInbound`, engine history fix |
| CHAN-003 | [Outbound Dispatcher](./03-outbound-dispatcher/spec.md) | Source-aware send, agent-reply routing, 24h window |
| CHAN-004 | [Dashboard Channel-Awareness](./04-dashboard-channel-awareness/spec.md) | Inbox/analytics/contacts/settings |
| CHAN-005 | [Digital-Card Launcher](./05-digital-card-launcher/spec.md) | Widget multi-channel launcher (frontend) |
| CHAN-006 | [Onboarding & Ops](./06-onboarding-and-ops/spec.md) | Meta runbook, Coexistence matrix, env, verification |

## Dependency order

```
CHAN-001 (foundation)
   ├──► CHAN-002 (inbound)  ──► CHAN-003 (outbound)  ──► CHAN-006 (onboarding/pilot)
   └──► CHAN-004 (dashboard)
CHAN-005 (launcher) — independent, frontend-only, can ship first
```

## Explicitly out of scope (fast-follow)

Self-serve Embedded Signup + Coexistence UI · outbound templates + template management · identity
unification (`whatsapp:<phone>` ↔ web visitor) · IG/Messenger/Email/Telegram adapters · per-channel team
routing · full dashboard visual redesign (the 10 reference screenshots) — that is a **separate track**,
not this cut.

## References
- [Chatbase competitive roadmap](../chatbase-roadmap/master-plan.md)
- [Widget Customization spec](../features/enhanced/widget-customization/spec.md)
- [Human Handoff spec](../features/advanced/human-handoff/spec.md)
- [Public Page v2 roadmap](../public-page-v2-roadmap.md)
