# Evolution State

## Feature
Pulse — Micro-Survey Popups

## Current State
CONVERGED

## Cycle
4

## Goal
Build a micro-survey/campaign popup feature ("Pulse") that leverages the existing SupportBase widget to show engaging, animated, randomly-placed popups on customer websites. Customers configure campaigns from the dashboard. 4 MVP types: NPS, Quick Poll, Sentiment Check, Open Feedback. AI-powered response analysis. Zero extra integration for customers.

## Next Action
Feature complete. All builds passing. Ready for deployment.

## Key Decisions Made
- **Feature Name**: "Pulse"
- **MVP Scope**: 4 campaign types (NPS, Quick Poll, Sentiment, Open Feedback)
- **Data Model**: 3 Supabase tables — pulse_campaigns (JSONB config/targeting/styling), pulse_responses, pulse_summaries
- **API Pattern**: Two Express routers — pulseRouter (authenticated, dashboard) + pulseWidgetRouter (public, widget). Widget response endpoint unauthenticated for zero-friction collection.
- **Widget Config**: Extend existing embed.ts config endpoint to include active Pulse campaigns in response payload
- **Widget Components**: Follow existing Shadow DOM + plain DOM class pattern. PulseManager follows EngagementTriggerService pattern for timing/anti-annoyance.
- **Dashboard Pages**: /pulse (list), /pulse/new (builder), /pulse/[id] (results), /pulse/[id]/edit. Follow existing (dashboard) layout pattern.
- **6 Shape Templates**: Blob, Petal, Diamond, Cloud, Squircle, Leaf — using border-radius and clip-path CSS
- **Popup Positioning**: Fixed position, 4 corners + Smart mode (auto-detects chat widget position)
- **Anti-Annoyance**: localStorage-based session memory, frequency caps, cooldown, mutual exclusion with chat
- **Charts**: recharts (already in codebase) for response trends, NPS gauge, poll bars
- **AI Summary**: Reuse existing LLM service, generate summaries after 10+ responses, cache in pulse_summaries table

## Implementation Plan (Detailed)

### Phase A: Data Layer (1 cycle)
- **A1**: Create Supabase migration — pulse_campaigns, pulse_responses, pulse_summaries tables with indexes, RLS policies, and response_count trigger
- **A2**: Create TypeScript types/interfaces for all Pulse entities (PulseCampaign, PulseResponse, PulseSummary, campaign config shapes per type)

### Phase B: Backend API (2 cycles)
- **B1**: Campaign CRUD service + routes — create, read, update, delete, list campaigns. Dashboard-authenticated routes.
- **B2**: Widget routes — GET active campaigns for project (public), POST response submission (public, rate-limited). Results/analytics endpoints. AI summary generation endpoint.

### Phase C: Widget Popup (2 cycles)
- **C1**: PulseManager + PulsePopup base component — trigger evaluation, anti-annoyance system (localStorage), positioning logic, shape rendering, entrance/idle/dismiss animations, close button, thank-you state
- **C2**: Campaign type renderers — NPS (0-10 scale + follow-up), Quick Poll (options + submit), Sentiment (emoji buttons), Open Feedback (textarea + submit). Response submission to API.

### Phase D: Dashboard (3 cycles)
- **D1**: Campaign list page (/pulse) — empty state, campaign cards with status/type/stats, filters, create button. Sidebar nav item.
- **D2**: Campaign builder (/pulse/new) — 5-step wizard: Choose Type → Write Question → Targeting → Styling → Review & Publish. Live preview. Draft/publish.
- **D3**: Results page (/pulse/[id]) — Type-specific visualizations (NPS gauge + distribution, poll bars, sentiment emojis, feedback themes). Response trend chart. AI Insights panel. Export CSV.

### Phase E: Integration (1 cycle)
- **E1**: Connect the full pipeline — extend widget config endpoint to serve active campaigns, wire dashboard → API → widget flow, end-to-end test of create campaign → see popup → submit response → view results.

### Phase F: Polish (1 cycle)
- **F1**: All UI states (loading, empty, error), edge cases, responsive behavior, mobile popup adaptation, error handling audit, backpressure pass (build + types + lint).

### Task Status
- [x] A1: Database migrations
- [x] A2: TypeScript types
- [x] B1: Campaign CRUD service + routes
- [x] B2: Widget routes + analytics + AI summary
- [x] C1: PulseManager + PulsePopup base
- [x] C2: Campaign type renderers
- [x] D1: Campaign list page
- [x] D2: Campaign builder wizard
- [x] D3: Results page
- [x] E1: End-to-end integration
- [x] F1: Polish pass

**Total estimated cycles: 10 build cycles + 1-2 review cycles + 1 polish cycle = ~13-14 cycles total**

## Cycle History

### Cycle 1 — DISCOVERY
- Spawned 3 parallel research agents
- Created comprehensive feature spec
- Named feature "Pulse"

### Cycle 2 — DESIGN
- Spawned 2 parallel design agents: Technical Architecture (explored 70+ codebase files) + UX Design (explored 30+ codebase files)
- **Technical Architecture Output**: Exact data model with column types, JSONB schemas, RLS policies. API design following existing Express router pattern (pulseRouter + pulseWidgetRouter). Widget integration following Shadow DOM/EngagementTriggerService patterns. 28 new files + 4 modified files mapped.
- **UX Design Output**: Complete page-by-page specs for dashboard (list, builder, results). Widget popup specs for all 4 campaign types with exact CSS. 6 shape template CSS definitions. Complete animation specs (entrance, idle, hover, selection, submit, dismiss) with keyframe definitions. All UI states for every screen. Responsive behavior specs. Design token reference.
- Architecture decisions recorded above.

### Cycle 3 — BUILDING
- Built all 11 tasks (A1→F1): Database migration, TypeScript types, API routes (CRUD + widget + analytics + AI summary), Widget popup (4 types + anti-annoyance), Dashboard (list + builder wizard + results page)
- All 3 builds passing: dashboard (Next.js), widget (esbuild), API (TypeScript)
- Files created/modified: migration SQL, packages/db types, API pulse.ts + index.ts, widget pulse-popup.ts + pulse-manager.ts + widget.css + widget.ts, dashboard pulse/page.tsx + pulse/new/page.tsx + pulse/[id]/page.tsx + sidebar.tsx

### Cycle 4 — REVIEWING
- Spawned 3 parallel review agents: API+DB, Widget, Dashboard
- **API+DB Review**: Found 6 real bugs — fixed wrong column name in summary insert, replaced broken upsert with delete+insert, added 10K limit to analytics query, added empty poll option validation
- **Widget Review**: Found timeout leak in auto-dismiss — stored timer reference and clear in destroy(). Already fixed double-submission guards in previous polish pass.
- **Dashboard Review**: Fixed CSV newline escaping, added filtered empty state messaging, confirmed chart edge cases handled
- All 3 builds re-verified passing after fixes. Zero Pulse-related type errors.
