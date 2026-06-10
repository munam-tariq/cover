# Public Page — v2 Roadmap / Next-Session Handoff

**Date:** 2026-06-09
**Status:** v1 (chat-only) in progress. This doc captures everything intentionally deferred so a future session can pick it up cleanly.

## What v1 ships (for context)

A shareable, hosted home page per agent at `frontface.app/c/<slug>-<uuid>`:
- ChatGPT-style full-page UI (sidebar, welcome screen with suggestion chips + prompt cards, theme + accent color, "Powered by" badge).
- A new **Public Page** tab on the agent detail page to configure it (branding, welcome, appearance, chips, cards, slug, enable toggle) with a live preview.
- Chat via the existing server-side `POST /api/chat/message` (`source: "public"`) — **synchronous request/response only**.
- Config via a new **service-role, field-limited** endpoint `GET /api/public/page/:projectId` that **does NOT ship the anon Supabase key** and does not read tables directly with anon. → v1 adds **zero new data exposure**.

## v2 — Deferred items (in priority order)

### 1. Live agent handoff on the public page  ← headline item (explicitly requested)
Let a human agent take over a public-page conversation in real time, like the embeddable widget already supports.
- **Hard prerequisite:** the **Critical anon-RLS fix** must be in place first (see `docs/security/stored-content-injection-xss-audit.md`). Live handoff needs Supabase realtime, which means **shipping the anon key to the browser** — unsafe until the broad `anon USING(true)` SELECT policies on `projects`/`knowledge_sources`/`api_endpoints` are removed.
- **Approach:** reuse the widget's handoff mechanism — `handoff` block in the `/api/chat/message` response, then realtime subscription (or the widget's polling fallback via `/api/chat/messages`) for agent replies. Mirror `apps/widget/src/components/chat-window.ts` handoff/polling logic in the React public-chat client.
- **Surfaces:** "Talk to a human" affordance, queue position / estimated wait, agent-typing, and routing into the existing Inbox/handoff backend (`apps/api/src/routes/handoff*.ts`, `handoff_settings`).

### 2. Voice (ElevenLabs)
The reference public page shows a Voice button. Reuse the widget's `voice-call-overlay.ts` + `@elevenlabs/client` and the `voice_*` project columns (`voice_enabled`, `voice_greeting`, `voice_id`) + `apps/api/src/routes/voice.ts`. Gate on `voice_enabled`.

### 3. Lead capture on the public page
Reuse the existing `lead_capture_v2` config and `apps/widget/src/components/lead-capture-form.ts` / `apps/api/src/routes/lead-capture.ts`. Show the form inline in the public chat per the project's lead-capture settings.

### 4. Custom domains
Let a business map their own domain (e.g. `help.acme.com`) to their public page instead of `frontface.app/c/...`. Ties into the existing `allowed_domains` / `DOMAIN_WHITELISTING_PLAN.md` work and the first-party host exemption added in v1.

### 5. Server-persisted conversation history
v1 stores "recent conversations" in `localStorage` (per browser). v2: persist visitor conversations server-side (keyed by `visitorId`) so the sidebar history survives across devices and supports the handoff/inbox view.

### 6. Public-page analytics
Track the `source: "public"` traffic separately in Analytics — sessions, messages, conversion to lead/handoff — distinct from `widget`/`playground`.

## Notes
- Keep the public config endpoint **field-limited** as more features land; never echo `systemPrompt`, `notification_email`, or other secrets.
- When enabling realtime, **scope channels per-conversation** rather than granting broad anon table SELECT (per the security audit's fix guidance).
