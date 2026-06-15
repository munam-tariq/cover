# Subplan 1 — Conversation Insights + Widget Customization

| Field | Value |
|-------|-------|
| Parent | [master-plan.md](./master-plan.md) |
| Scope | **Gap 1** (Conversation Insights, P0) + **Gap 6** (Widget Customization, all 4 groups) |
| Status | 🟢 Ready to build |
| Product | FrontFace |
| Created | 2026-06-12 |

> Two independent features bundled by user decision. They share a rollout but touch different code paths, so they can be built in parallel. Part A is the priority (P0).

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Part A — Conversation Insights (Gap 1)](#part-a--conversation-insights-gap-1)
3. [Part B — Widget Customization (Gap 6)](#part-b--widget-customization-gap-6)
4. [Shared Rollout & Sequencing](#4-shared-rollout--sequencing)
5. [Open Questions](#5-open-questions)

---

## 1. Executive Summary

**Part A (Conversation Insights)** closes Chatbase's headline analytics feature: auto-detected **topics**, **sentiment**, and an **answer-gap report** of questions the agent couldn't answer — each with a one-click "add to knowledge base" action. This creates the improvement flywheel (gaps → KB additions → better answers) and is the P0 of this subplan.

**Part B (Widget Customization)** brings the embeddable widget from "primary color + title + greeting" up to Chatbase parity on appearance and content: theme, avatar/launcher images, richer colors, conversation starters, notices, interaction toggles, and localization. Custom domains are explicitly **out of scope**.

Both reuse existing infrastructure (OpenAI client, `question-clustering` service, cron framework, project `settings` JSONB, Supabase storage) rather than introducing new systems.

---

## Part A — Conversation Insights (Gap 1)

### A.1 Problem

`apps/api/src/routes/analytics.ts` already surfaces message counts, top questions (via the `question-clustering` service / `getTopQuestions`), and feedback issues — but operators can't see **what** conversations are about (topics), **how users feel** (sentiment), or **what the agent failed to answer** (gaps). Chatbase's Analytics → Topics/Sentiment and Sources → Suggestions own this; it's the most-cited reason teams pick Chatbase.

### A.2 Solution

A nightly LLM classification batch labels the previous day's conversations and writes the results to a dedicated table, which three new analytics endpoints + three new dashboard tabs read from.

### A.3 Technical Design

**Classification job** — new handler in `apps/api/src/routes/cron.ts`, following the existing pattern:
```
cronRouter.post("/classify-insights", verifyCronSecret, async (_req, res) => { ... })
```
(mirrors `/lead-digest`, `/agent-presence`, `/conversation-cleanup` at `cron.ts:46/81/114`). For each project's prior-day conversations, call `gpt-4o-mini` to assign:
- **topic** — open taxonomy, normalized against the project's existing topics so labels converge instead of fragmenting. Reuse the clustering approach already in `apps/api/src/services/question-clustering.ts`.
- **sentiment** — `positive` / `neutral` / `negative`.
- **resolved** — did the conversation reach an answer?
- **answer_gap_question** — if the agent failed to answer, the user's question text (nullable).

Reuse the OpenAI client + prompt patterns from `apps/api/src/services/chat-engine.ts` and the intent-classification style in `apps/api/src/services/lead-capture-v2.ts`. Batch conversations per LLM call to control cost.

**Answer-gap signal** — the chat engine already detects low-confidence / no-answer states for lead capture. Reuse that signal as the cheap first pass; the nightly LLM pass confirms and extracts the question text. Populate the gap list from both.

**Schema** — new migration, next number after `supabase/migrations/20260610000008_add_mobile_source.sql`:

```
conversation_insights (
  id              uuid pk default gen_random_uuid(),
  conversation_id uuid references conversations(id) on delete cascade,
  project_id      uuid references projects(id) on delete cascade,
  topic           text,
  sentiment       text check (sentiment in ('positive','neutral','negative')),
  resolved        boolean,
  answer_gap_question text,
  created_at      timestamptz default now()
)
-- indexes on (project_id, created_at) and (project_id, topic)
-- RLS mirroring conversations/messages tenant isolation
```
Kept as a **separate table** (not columns on `conversations`) so re-classification is cheap and idempotent — delete + reinsert per conversation.

**API** — new endpoints on `analyticsRouter` (`apps/api/src/routes/analytics.ts`), behind the existing `authMiddleware` + `requireProjectAccess` guards:
- `GET /analytics/topics` → topic labels with counts + trend over the selected range.
- `GET /analytics/sentiment` → positive/neutral/negative breakdown over time.
- `GET /analytics/gaps` → unanswered-question list with frequency.

**Dashboard** — extend `apps/web/app/(dashboard)/analytics/page.tsx` (currently a single page) with **Topics / Sentiment / Gaps** tabs:
- Topics: ranked list + graph/pie; clicking a topic filters into conversations (link to existing `apps/web/app/(dashboard)/inbox/[id]`).
- Sentiment: trend chart + breakdown.
- Gaps: unanswered questions, each with a one-click **"Add to knowledge base"** affordance (creates a Q&A/text source via `apps/api/src/routes/knowledge.ts`).

### A.4 Future Work (noted, not built here)

- **Conflicting-info detection** across sources (Chatbase "Suggestions" does this on top of answer-gaps). Natural v2 of insights.
- Real-time (per-conversation) classification instead of nightly batch.

---

## Part B — Widget Customization (Gap 6)

### B.1 Problem

The widget config endpoint (`apps/api/src/routes/embed.ts`) returns only `primaryColor`, `title`, `greeting`, `placeholder`, and a **hardcoded** `position: "bottom-right"` (`embed.ts:188`) — even though the snippet generator UI (`apps/web/app/(dashboard)/embed/page.tsx`) lets the user pick left/right. Chatbase's chat-widget editor exposes two full tabs (Content + Style). FrontFace is far behind on a low-effort, high-visibility surface.

### B.2 Scope (custom domains excluded)

**Theme & branding**
- Light / dark theme.
- Avatar / profile-picture upload.
- Launcher (chat-bubble) icon upload.
- Chat-bubble button color **separate** from the header/primary color, plus a "use primary color for header" toggle.
- Remove-"Powered by" white-label flag.

**Conversation starters**
- Suggested / starter messages, with grouped options.
  - ⚠️ **Overlap:** this is already specified in [`docs/product/features/quick-questions/spec.md`](../features/quick-questions/spec.md) ("Suggested Starters"). **Do not duplicate** — implement per that spec and just surface the config in the widget settings UI here.
- Dismissible notice banner (rich text, dismissed after first user message).
- Footer / disclaimer line (e.g. privacy-policy link).

**Interaction toggles**
- Per-message feedback (thumbs up/down). Note: `analytics.ts` already has a `/feedback/issues` endpoint — wire the widget toggle to the existing feedback pipeline.
- Copy-message button.
- Multi-language / localization (browser-language match with a default).

**Layout polish**
- Configurable message placeholder (currently hardcoded `"Type a message..."` at `embed.ts:192`).
- Reconcile left/right alignment so `embed.ts` **honors** the stored `position` instead of hardcoding `"bottom-right"`.

### B.3 Technical Design

**Storage** — extend the project `settings` JSONB (where `primary_color`, `widget_enabled`, `proactive_engagement`, `lead_recovery` already live — see `embed.ts:165-215`) with a `widget_appearance` object holding the new fields. No new table needed; a migration is only required if we want typed columns (recommend JSONB to start).

**Config surface** — extend the `config` object returned by `apps/api/src/routes/embed.ts` (the `res.json({ config: {...} })` block at `embed.ts:183`) with the new fields, defaulting safely (fail-open block at `embed.ts:225` must mirror defaults).

**Image uploads** — avatar + launcher icon reuse the existing Supabase storage bucket pattern (same approach Chatbase uses: JPG/PNG/SVG up to ~1MB). Store the public URL in `widget_appearance`.

**Dashboard UI** — extend `apps/web/app/(dashboard)/embed/page.tsx` (or split into a dedicated widget-settings page) into a **Content / Style** layout mirroring Chatbase, with a live preview panel. The existing page already manages `primaryColor`, `title`, `greeting`, `position` — add the new controls alongside.

**Widget runtime** — the embedded widget script must consume the new config fields (theme class, images, colors, alignment, starters, notice, footer, toggles, locale).

### B.4 Suggested build order (incremental)

1. Layout polish (placeholder + honor `position`) — smallest, unblocks the "config is actually respected" foundation.
2. Theme & branding (theme, colors, images).
3. Conversation starters (lean on the quick-questions spec) + notice/footer.
4. Interaction toggles + localization.

---

## 4. Shared Rollout & Sequencing

1. **Migrations** — `conversation_insights` table (Part A). Part B uses JSONB, no migration unless typing columns.
2. **Backend** — cron classifier + analytics endpoints (Part A); `embed.ts` config extension + upload handling (Part B).
3. **Dashboard** — analytics tabs (Part A); widget Content/Style settings (Part B).
4. **Widget runtime** — consume new appearance config (Part B).
5. **Flags** — gate Conversation Insights behind a project settings toggle while the nightly job stabilizes; ship widget customization incrementally per B.4.

Part A is P0 and can ship before Part B is finished.

---

## 5. Open Questions

- **Insights cost/scheduling:** nightly batch granularity — per-project fan-out vs one global pass? Confirm acceptable `gpt-4o-mini` spend at current conversation volume.
- **Topic taxonomy:** fully open per project, or seed a starter taxonomy and let it grow? (Recommendation: open + normalize via `question-clustering`.)
- **White-label gating:** is remove-"Powered by" tied to a paid plan (Chatbase gates it), or available to all FrontFace users?
- **Localization depth:** ship UI-string localization only, or also localize agent responses?
