# Feature: Pulse — Micro-Survey Popups

## Problem Statement
Startup founders and product managers want continuous visitor feedback but the friction of installing, configuring, and managing another JavaScript tool (Hotjar, Survicate, Qualaroo) means they never do it. The workflow from "I want to know something" to "I know the answer" takes 2+ weeks with existing tools. SupportBase already has a widget script on customer websites — Pulse turns that existing distribution into a zero-integration visitor intelligence layer.

## Target User
Startup founders, product managers, and growth leads at companies with 1K-100K monthly visitors who already use SupportBase for chat/lead capture. They need visitor feedback for decisions (what to build next, why visitors bounce, how they feel about pricing) but don't have the bandwidth to manage another tool.

## Core Value Proposition
Pulse lets SupportBase customers collect visitor feedback through delightful micro-survey popups — with zero extra integration, one-click campaign creation, and AI-powered analysis of responses cross-referenced with chat data.

## Feature Name
**Pulse** — "Taking the pulse of your visitors in real-time, where they already are."

## Magic Moment
Customer creates a campaign in 30 seconds, goes to get coffee, comes back to 20+ responses with AI-analyzed insights — no code changes, no deploys, no engineering help.

## Acceptance Criteria
- [ ] AC1: Customer can create and publish a Pulse campaign in under 60 seconds from the dashboard
- [ ] AC2: Published campaigns render correctly on targeted pages and record responses with 99.5%+ reliability (answer data, page URL, timestamp, visitor ID)
- [ ] AC3: All 4 MVP campaign types functional end-to-end: NPS (0-10 + follow-up), Quick Poll (2-5 options), Sentiment Check (emoji), Open Feedback (text)
- [ ] AC4: Anti-annoyance controls working: max 1 Pulse per session, no re-showing dismissed/completed campaigns, minimum 8s delay after page load
- [ ] AC5: Results dashboard shows responses within 5s, NPS shows score + distribution, polls show percentage breakdown, open feedback shows AI-generated thematic summary after 10+ responses

## MVP Campaign Types

### 1. NPS (Net Promoter Score)
- Standard 0-10 scale with visual selector
- Follow-up: "What's the main reason for your score?" (open text)
- Auto-calculates NPS score, Promoter/Passive/Detractor breakdown

### 2. Quick Poll
- Single question, 2-5 answer options
- Optional "Other" with text input
- Results: bar chart with percentages

### 3. Sentiment Check
- 3-5 emoji reactions (angry / sad / neutral / happy / love)
- Single tap to respond — lowest friction type
- Optional "Tell us more" text follow-up

### 4. Open Feedback
- Single text input with a prompt
- "What's one thing we could improve?"
- AI auto-categorizes and clusters responses into themes

## User Flow

### Campaign Creation (Dashboard)
1. User clicks "Pulse" in sidebar → sees campaign list
2. User clicks "New Campaign" → picks campaign type (visual cards)
3. User writes question (pre-populated smart default) → configures options if poll
4. User sets targeting: pages (URL pattern), timing (delay, scroll depth), audience (new/returning)
5. User optionally customizes styling (accent color, light/dark, shape preference)
6. User clicks "Publish" → campaign goes live instantly

### Visitor Experience (Widget)
1. Visitor lands on targeted page → SupportBase widget loads as normal
2. After delay (default 10s), Pulse popup appears — cute, animated, randomly positioned
3. Visitor interacts (taps emoji, selects option, enters text) → satisfying micro-animation
4. Response recorded → popup gently dismisses with thank-you
5. No more Pulse shown this session (frequency cap)

### Results (Dashboard)
1. Customer opens campaign detail → sees response count, trend chart
2. Type-specific visualization: NPS gauge, poll bars, sentiment distribution
3. AI Insights panel: auto-generated summary + cross-reference with chat data
4. Export to CSV available

## Popup Design Philosophy

### Shape Variety
- 5-8 shape templates: pill, rounded rectangle, speech bubble, blob, slight-rotation card, circle badge
- Randomly selected per impression to prevent banner blindness
- Small footprint: max 320px wide

### Animation
- Entrance: gentle float-up with slight bounce or fade-in with scale (200-300ms)
- Idle: subtle float animation (2px translateY oscillation, 3s duration)
- Interaction: micro-animations on hover/tap — emoji wiggle, selection pop
- Exit: quick shrink + fade (150ms)

### Positioning
- NOT center-of-screen modal
- Random from safe zones: bottom-left, bottom-right, lower-side rails
- Never overlapping navigation, CTAs, or critical content
- Opposite side from chat widget to avoid collision

### Anti-Annoyance System
- Frequency cap: 1 Pulse per session (configurable)
- Cooldown: 5 minutes after dismiss (configurable)
- Session memory: localStorage tracks shown/dismissed/completed
- Smart timing: minimum 8s delay after page load
- Mutual exclusion: don't show if chat widget is open
- Respect dismissal: don't re-show completed campaigns

## Technical Context

### Existing Architecture (from codebase analysis)
- **Widget** (`apps/widget`): Shadow DOM, plain DOM components, esbuild IIFE bundle. Pulse components follow same pattern — no framework, CSS + vanilla JS inside shadow root.
- **API** (`apps/api`): Express routes, Supabase PostgreSQL. New routes for campaign CRUD, response ingestion, results/analytics.
- **Dashboard** (`apps/web`): Next.js with shadcn/ui, Tailwind. New pages under Pulse section.
- **AI**: Existing RAG/LLM infrastructure in `apps/api/src/services/rag/index.ts` for response analysis.
- **Widget config**: Widget fetches config from API on load. Pulse campaigns would be included in this config payload.

### Data Model
- `pulse_campaigns`: id, project_id, type (nps|poll|sentiment|feedback), question, config (JSONB: options, follow_up), targeting (JSONB: pages, timing, audience), styling (JSONB: color, theme, shape), status (draft|active|paused|completed), response_goal, starts_at, ends_at, created_at, updated_at
- `pulse_responses`: id, campaign_id, project_id, answer (JSONB), page_url, visitor_id, session_id, created_at, metadata (JSONB: scroll_depth, time_on_page)
- `pulse_summaries`: id, campaign_id, summary_text, themes (JSONB), response_count, generated_at

### Key Integration Points
- Widget config endpoint: extend to include active Pulse campaigns
- Widget bundle: add Pulse rendering components to existing IIFE
- Dashboard sidebar: add Pulse navigation item
- AI service: reuse for response analysis and summary generation

## What This Is NOT (v1 Scope Exclusions)
- NOT multi-page surveys — 1 question, 1 answer, done
- NOT a form replacement — no file uploads, no validation rules, no confirmation emails
- NOT an A/B testing tool — no statistical significance, no variant splitting
- NOT real-time streaming — results refresh on load/polling, not WebSocket
- NOT a segmentation engine — target by URL pattern and new/returning only
- NOT white-labeled — "Powered by SupportBase" link (premium removal later)
- NOT integrated with third-party tools — no Slack, no webhooks, no Zapier (v2)
- NOT multi-language — questions in whatever language customer writes
- NOT GDPR consent management — respects existing widget consent

## Research Evidence
- Users hate popup fatigue — cute/funky design breaks the "dismiss immediately" reflex
- Zero-integration advantage is the moat — adding another JS snippet is a 2-week project at most startups
- NPS is the lingua franca of customer sentiment — every board deck has it
- Cross-referencing chat + survey data creates insights neither produces alone
- 16-day workflow (research tool → install → configure → wait → analyze) compressed to 1 hour

## Competitive Advantage
1. **Zero marginal integration cost** — widget script already loaded
2. **Unified visitor identity** — connect survey responses with chat interactions
3. **AI built-in** — existing LLM infrastructure for automatic response analysis
4. **Context-aware targeting** — widget already knows the page, visitor behavior
5. **Platform play** — SupportBase becomes "visitor intelligence platform," not just "chatbot tool"
