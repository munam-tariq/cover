# Settings Consolidation into the Agent View — Design

**Date:** 2026-07-14
**Status:** Approved (pending spec review) → next step: implementation plan
**Author:** brainstorming session

## Problem

The dashboard has a top-level **Settings** page (`/settings`) that is almost
entirely redundant with the per-agent tabs under `/projects/[projectId]`. Both
are agent-scoped — the Settings header literally reads *"Manage settings for
Allen"* and is driven by the top-left agent switcher. Nearly every Settings
section already has an equivalent agent tab, so users have two paths to the same
configuration.

Goal: **delete the redundant Settings page and relocate its genuinely-unique
pieces into the agent's tabs.**

## Current-state delta analysis

The agent view (`/projects/[projectId]`) has 8 tabs: Overview, Knowledge,
Endpoints, Lead Capture, Widget, Handoff, Public Page, Channels.

Mapping every Settings section to its agent-view equivalent:

| Settings section | Already covered in agent view? | Where |
|---|---|---|
| Agent name | ✅ | Agent header (inline edit) |
| System prompt ("Describe what you want your agent to do") | ✅ | Overview tab |
| **Response language** | ❌ **unique** | — |
| System-prompt **Presets** dropdown | ❌ **unique** (Overview lacks it) | — |
| Widget Agent ID card | ✅ | Overview + Widget embed code + header copy (full ID) |
| **API Key** (account-wide) | ❌ **unique** | — |
| **MCP Integration** | ❌ **unique** | — |
| Widget Status (kill switch) | ✅ | Agent header toggle |
| Proactive Engagement | hidden dead UI (`false &&`) | drop |
| Lead Capture (V2) | ✅ | Lead Capture tab |
| Lead Recovery (V3) | hidden dead UI (`false &&`) | drop (see below) |
| Handoff (link card → `/settings/handoff`) | ✅ | Handoff tab |
| Domain Whitelist | ✅ | Widget tab |
| **Danger Zone (delete agent)** | ❌ **unique** | — |

### Scoping note on API Key / MCP

The API key is **account-scoped**: `POST/DELETE /api/account/api-key`, one key
per account, and its MCP tools span all projects (its own copy says *"This key
provides access to all your projects."*). It sits on the agent-scoped Settings
page **today**, so relocating it into an agent tab does not regress current
behavior — it renders and behaves exactly as it does now. (The user chose to keep
it in the agent view rather than move it to the Profile page.)

### Lead Recovery (V3): backend-ready but UI-disabled — drop, don't migrate

The `apps/widget/*` and `apps/api/*` code does read `settings.lead_recovery`, but
its **only config UI — the card in `settings/page.tsx` — is wrapped in `{false &&
(...)}`** and labeled "not production ready" (identical to Proactive Engagement).
So there is currently **no visible way to configure it**. Surfacing it in the Lead
Capture tab would *newly expose* a not-production-ready feature — a behavior change,
not preservation. The correct move for this consolidation is to **drop the hidden
card along with the rest of the dead UI**. The backend that consumes
`lead_recovery` is untouched; projects that already have the setting keep working.
Re-exposing Lead Recovery is a separate, future decision.

## Design

### 1. New agent tab: "General" (9th tab)

Add a `GeneralTab` to `/projects/[projectId]` containing the three unique
agent-scoped pieces:

- **Response language** selector (with its own save)
- **API Key + MCP Integration** — ported verbatim, unchanged behavior. **Keep the
  anchor IDs** `#onboarding-api-key`, `#onboarding-generate-btn`,
  `#onboarding-mcp-config` on the moved cards so the onboarding tour still targets
  them.
- **Danger Zone** — delete agent.

Details:
- Tab label: **"General"** (chosen to avoid clashing with Overview's existing gear
  icon). New i18n key `dashboard.pages.projectDetail.tabs.general` in `en` + `ar-SA`.
- Tab icon: `SlidersHorizontal` (distinct from Overview's `Settings` gear).
- Inserted as the last tab in the `tabOptions` array in
  `projects/[projectId]/page.tsx`, with a matching `<TabsContent value="general">`.

### 2. Relocations

- **System-prompt Presets dropdown** → port into the **Overview** tab's system
  prompt card (the preset list + dropdown button currently only in Settings).

(No Lead Capture tab changes — Lead Recovery is dropped, not migrated; see above.)

### 3. Deletions

- `app/[locale]/(dashboard)/settings/page.tsx`
- `app/[locale]/(dashboard)/settings/handoff/page.tsx` — this only wraps
  `<HandoffTab project={currentProject} />` and back-links to `/settings`; the
  Handoff tab already provides it.
- Sidebar **Settings** nav entry (`components/layout/sidebar.tsx`).
- `/settings` from `middleware.ts` `protectedPaths` (`/projects` is already
  protected, so the General tab stays gated).
- Dead / duplicate code carried along and not re-created anywhere: the **Proactive
  Engagement** (`false &&`) block, the **Lead Recovery (V3)** (`false &&`) block,
  the duplicate **Lead Capture V2** in Settings, the **Widget Agent ID** card, the
  **Widget Status** kill-switch card, and the **Handoff** link card.

### 4. Supporting changes (keep the tour + links working)

1. **URL-addressable tabs.** In `projects/[projectId]/page.tsx`, initialize
   `activeTab` from a `?tab=` search param (default `overview`) and keep it in sync
   so `/projects/<id>?tab=general` opens — and therefore mounts — the General tab.
   This is required because inactive tab content unmounts, and it is reusable for
   deep-linking any tab.
2. **Project-aware onboarding tour.** Convert `onboardingTours` (currently a static
   array in `tour-steps.tsx`) into a builder `buildOnboardingTours(projectId)`.
   Supply `projectId` from `TourProvider` via `useProject()` (the provider lives
   inside the `(dashboard)` layout). Change step 1's
   `nextRoute: "/settings"` → `/projects/${projectId}?tab=general`. Mirror the
   existing locale-prefix handling (`TourStarter` matches bare
   `pathname === "/dashboard"`, so there is locale stripping in play — reuse it).
3. **Dashboard links.** Re-point `accountCreated: "/settings"` and the
   `<Link href="/settings">` in `dashboard/page.tsx` to the current agent's General
   tab (`/projects/<currentProject.id>?tab=general`), using `useProject()` which is
   already available there.

### 5. i18n — no message-file migration needed

next-intl namespaces are paths into the messages JSON, independent of a
component's file location. The ported General-tab cards and the Lead Recovery card
keep calling `useTranslations("dashboard.pages.settings")` (and the existing
`embed` / `leadCapture` namespaces) against the **same existing keys** — which
already exist in both `en` and `ar-SA` because the current Settings page renders in
Arabic today. **The only new string is the "General" tab label** (1 key × 2
locales). A future rename of `settings.*` keys read from a `projectDetail`
component is optional cleanup, not part of this change.

## Out of scope

The sidebar **Knowledge Base / API Endpoints / Embed** pages also mirror agent
tabs, but each operates on the selected agent and works correctly. They stay as an
alternate navigation path for now. Revisit separately if desired.

## Watch-items for implementation

- **Verify the tour end-to-end by running it**, not just wiring it. The
  `nextRoute → activate ?tab=general → anchor mounted` sequence is timing-sensitive;
  onborda already carries multiple `resize`-event hacks, so positioning is fragile.
  An actual tour run is the acceptance check for the tour piece.
- **Sweep before deleting.** `apps/web` has **no test framework** (only `lint`,
  `type-check`, `build`) and **no spec references** `settings` — so this sweep is a
  confirmed no-op for tests. Still remove the now-unused nav label key `settings`
  from the messages files.
- **Delete-from-own-page.** Confirm `deleteProject`'s "switch to another project or
  redirect to `/projects`" behavior fires correctly when the deleted agent is the
  one whose General tab you are viewing — the one delete path Settings never
  exercised from inside `/projects/[id]`.

## Inbound `/settings` dependencies (all accounted for)

- `components/layout/sidebar.tsx` — nav entry → **remove**
- `lib/supabase/middleware.ts` — protected paths → **remove `/settings`**
- `dashboard/page.tsx` (×2: `accountCreated`, `<Link>`) → **re-point**
- `components/onboarding/tour-steps.tsx` — `nextRoute` + 3 anchor selectors → **re-point + keep anchors**
- `settings/handoff/page.tsx` (×2 back-links) → **file deleted**
- `settings/page.tsx` (link to `/settings/handoff`) → **file deleted**

## Acceptance criteria

1. `/projects/[projectId]` shows a **General** tab with Response language, API Key +
   MCP Integration, and Danger Zone; all save/generate/revoke/delete actions work.
2. **System-prompt Presets** work from the Overview tab.
3. The **onboarding `mcp-setup` tour** runs start-to-finish: dashboard →
   General tab → API key → generate → MCP config, verified by an actual run.
4. `/settings` and `/settings/handoff` are gone; the sidebar has no Settings entry;
   no broken links (dashboard, tour, handoff) remain.
5. Everything renders correctly in both `en` and `ar-SA` (RTL).
6. Lead Recovery stays dropped (no new UI); the `lead_recovery`-consuming
   backend/widget code is unchanged.

## Non-goals / explicitly preserved

- No change to API-key semantics (still account-wide).
- No new backend/API/DB changes — all relocated config uses existing endpoints and
  the existing `project.settings` shape.
- No auto-commit — the user reviews all git changes in their IDE.
