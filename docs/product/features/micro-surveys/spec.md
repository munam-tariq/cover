# Micro-Surveys: Delightful Feedback Collection

## Decisions Made
- **Feature Name:** Micro-Surveys
- **Integration:** Separate feature from chat, but delivered through the same widget embed code
- **MVP Scope:** Full MVP with multiple question types + targeting + analytics

---

## Executive Summary

Transform the SupportBase embed code into a dual-purpose tool: not just a chatbot, but also a **delightful micro-survey platform** that helps businesses collect quick feedback through fun, illustrated floating popups.

**The Big Idea:** Most survey tools are boring (Hotjar popups, Qualtrics forms). We make feedback collection **fun and delightful** with illustrated characters, smooth animations, and micro-interactions that people actually want to engage with.

**Architecture:** Chat and Micro-Surveys are **two separate features** that operate independently, but customers install a **single widget embed code** that powers both. The widget intelligently shows the right experience based on configuration.

---

## Problem Statement

### For Business Owners
- Traditional surveys have **low response rates** (5-15%)
- Pop-up surveys feel intrusive and are often ignored
- No easy way to get quick pulse feedback without sending emails
- Disconnected tools: chatbot here, surveys there, analytics somewhere else

### For End Users
- Survey fatigue - "Not another boring popup"
- Surveys interrupt their flow
- No delight or reward for participating

---

## Solution: Feedback Campaigns

A campaign-based system where SupportBase customers can:
1. Create fun, engaging micro-surveys
2. Target them to specific pages/users/behaviors
3. Collect responses through the same embed code
4. Analyze results in their dashboard

**Key Differentiator:** The **delightful UI** - illustrated shapes (fruits, objects, characters) that float and wobble, making users smile and want to interact.

---

## Use Cases

### 1. Design/UX Feedback
> "Do you like our new homepage design?"
- **When:** After redesign launch
- **Target:** Returning visitors who've seen both versions
- **Type:** Thumbs up/down or emoji scale

### 2. Feature Validation
> "Would you use a dark mode feature?"
- **When:** Before building
- **Target:** Active users
- **Type:** Yes/No or MCQ ("Must have", "Nice to have", "Don't care")

### 3. NPS / Satisfaction
> "How likely are you to recommend us?"
- **When:** After key actions (purchase, signup, support resolution)
- **Target:** Customers
- **Type:** 1-10 scale or emoji scale

### 4. Product Prioritization
> "What should we build next?"
- **When:** Quarterly roadmap planning
- **Target:** Power users
- **Type:** MCQ with feature options

### 5. Content Feedback
> "Was this article helpful?"
- **When:** On blog/docs pages
- **Target:** Readers who scrolled 70%+
- **Type:** Thumbs up/down

### 6. Exit Intent
> "What stopped you from signing up?"
- **When:** Mouse moves to close tab
- **Target:** Visitors who viewed pricing
- **Type:** MCQ with common objections

### 7. Post-Purchase
> "How was your checkout experience?"
- **When:** Thank you page
- **Target:** New customers
- **Type:** Emoji scale (😠 to 😍)

### 8. Feature Awareness
> "Did you know you can export to PDF?"
- **When:** 5th session
- **Target:** Users who haven't used feature
- **Type:** "Show me!" / "Not interested"

---

## Value Proposition

| Stakeholder | Value |
|-------------|-------|
| **Business Owner** | Higher response rates (fun = engagement), unified platform, actionable insights |
| **End User** | Delightful experience, quick to respond, feels rewarding |
| **SupportBase** | Increased stickiness, upsell opportunity, differentiation |

### Why Response Rates Will Be Higher
1. **Novelty** - Illustrated popup is unexpected and charming
2. **Speed** - 1-2 clicks, no form fields
3. **Delight** - Animations create positive emotional response
4. **Non-intrusive** - Floats to the side, easy to dismiss
5. **Gamification** - Fun shapes make it feel like a game

---

## Feature Architecture

### Core Concepts

```
┌─────────────────────────────────────────────────────────────────┐
│                         CAMPAIGN                                 │
│  "New Homepage Feedback"                                        │
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │   QUESTION  │  │  TARGETING  │  │   DESIGN    │            │
│  │             │  │             │  │             │            │
│  │ Text        │  │ Pages       │  │ Illustration│            │
│  │ Type        │  │ Timing      │  │ Position    │            │
│  │ Options     │  │ Frequency   │  │ Animation   │            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                      RESPONSES                           │   │
│  │  visitor_123: "Yes!" at 2024-01-22 14:30                │   │
│  │  visitor_456: "Nah" at 2024-01-22 14:35                 │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Question Types

| Type | UI | Use Case |
|------|-----|----------|
| **Upvote** | 👍 Yes! / 👎 Nah | Quick sentiment |
| **MCQ** | Multiple choice buttons | Prioritization, research |
| **Emoji Scale** | 😠 😕 😐 🙂 😍 | Satisfaction, NPS |
| **Star Rating** | ⭐⭐⭐⭐⭐ | Quality feedback |
| **Text** | Short text input | Open-ended (sparingly) |

### Targeting Options

| Condition | Examples |
|-----------|----------|
| **Page URL** | Contains "/pricing", Exact match "/checkout/success" |
| **Time on Page** | After 30 seconds |
| **Scroll Depth** | After 50% scroll |
| **Visit Count** | 3rd visit or more |
| **Referrer** | Came from Google, came from Twitter |
| **Device** | Mobile only, Desktop only |
| **User Segment** | Logged in, Customer, Free tier |
| **Custom Event** | After "add_to_cart", After "video_complete" |

### Frequency Controls

- Max shows per visitor per campaign
- Cooldown period between campaigns
- Don't show if already responded
- Don't show if dismissed X times
- Global limit per session (avoid survey fatigue)

---

## Illustration Library

### Current (10 Shapes)
1. 🍎 Apple - Friendly, wholesome
2. 🍋 Lemon - Fresh, zingy
3. 🍦 Ice Cream - Sweet, fun
4. 🎈 Balloon - Celebratory
5. ⭐ Star - Achievement, rating
6. ☁️ Cloud - Soft, friendly (with face)
7. 🍩 Donut - Playful, treats
8. 🚀 Rocket - Progress, launch
9. 💖 Heart - Love, appreciation
10. 🎁 Gift - Surprise, reward

### Future Expansion
- **Characters:** Cute animals, mascots
- **Seasonal:** Pumpkin (fall), Snowflake (winter)
- **Industry-specific:** Shopping bag (e-commerce), Book (education)
- **Custom:** Upload your own brand mascot

---

## User Experience Flow

### Business Owner (Dashboard)

```
┌─────────────────────────────────────────────────────────────────┐
│  Campaigns                                    + New Campaign    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 🍎 Homepage Feedback           ACTIVE      245 responses │   │
│  │    "Loving our new design?"    👍 89% positive           │   │
│  │    Pages: /, /home             Last: 2 min ago           │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 🚀 Feature Priority            PAUSED      82 responses  │   │
│  │    "What should we build?"     Top: Dark Mode (45%)      │   │
│  │    Pages: /dashboard/*         Last: 3 days ago          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Campaign Builder

```
┌─────────────────────────────────────────────────────────────────┐
│  Create Campaign                                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Campaign Name: [Homepage Feedback_______________]              │
│                                                                 │
│  ── Question ──────────────────────────────────────────────    │
│                                                                 │
│  Question Text:                                                 │
│  [Loving our new design?________________________]               │
│                                                                 │
│  Question Type:  ○ Upvote  ○ MCQ  ○ Emoji  ○ Rating            │
│                  ●                                              │
│                                                                 │
│  ── Design ────────────────────────────────────────────────    │
│                                                                 │
│  Choose Illustration:                                           │
│  [🍎] [🍋] [🍦] [🎈] [⭐] [☁️] [🍩] [🚀] [💖] [🎁]            │
│                                                                 │
│  Preview:          ┌─────────────┐                             │
│                    │   🍎        │                             │
│                    │  Loving our │                             │
│                    │ new design? │                             │
│                    │ [Yes][Nah]  │                             │
│                    └─────────────┘                             │
│                                                                 │
│  ── Targeting ─────────────────────────────────────────────    │
│                                                                 │
│  Show on pages:  [/ , /home____________________] (comma sep)   │
│  Show after:     [5] seconds on page                           │
│  Show to:        ● All visitors  ○ Returning  ○ New only       │
│                                                                 │
│  ── Limits ────────────────────────────────────────────────    │
│                                                                 │
│  Max responses:     [1000] (0 = unlimited)                     │
│  Per visitor:       [1] time(s)                                │
│  Cooldown:          [24] hours between any campaigns           │
│                                                                 │
│                              [Save Draft]  [Launch Campaign]   │
└─────────────────────────────────────────────────────────────────┘
```

### End User (Website Visitor)

```
     Normal webpage content...

     ┌──────────────────────┐
     │                      │
     │   [Article text]     │
     │   [More content]     │      ← Page scrolls normally
     │   [...]              │
     │                      │
     └──────────────────────┘

                                    ┌───────────────┐
                                    │      🍎       │
                                    │   Loving our  │  ← Floats, wobbles
                                    │  new design?  │    gently
                                    │               │
                                    │ [👍 Yes!][👎] │
                                    └───────────────┘

     (Popup stays fixed, doesn't scroll with page)
```

---

## Data Model

### New Tables

```sql
-- Micro-Surveys table
CREATE TABLE micro_surveys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Basic info
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed')),

  -- Question
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL CHECK (question_type IN ('upvote', 'mcq', 'emoji', 'rating', 'text')),
  options JSONB, -- For MCQ: ["Option 1", "Option 2", ...]

  -- Design
  illustration TEXT NOT NULL DEFAULT 'apple', -- apple, lemon, rocket, etc.
  position TEXT NOT NULL DEFAULT 'random', -- random, top-left, top-right, etc.

  -- Targeting
  target_pages TEXT[], -- URL patterns: ["/", "/pricing*"]
  target_delay_seconds INTEGER DEFAULT 5,
  target_scroll_percent INTEGER, -- Show after X% scroll
  target_visitor_type TEXT DEFAULT 'all', -- all, new, returning

  -- Limits
  max_responses INTEGER, -- NULL = unlimited
  max_per_visitor INTEGER DEFAULT 1,
  cooldown_hours INTEGER DEFAULT 24,

  -- Stats (denormalized for quick access)
  response_count INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ, -- When activated
  ended_at TIMESTAMPTZ -- When completed/paused
);

-- Survey responses
CREATE TABLE survey_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id UUID NOT NULL REFERENCES micro_surveys(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Response
  response_value TEXT NOT NULL, -- "yes", "no", "Option 2", "😍", "4", etc.

  -- Context
  visitor_id TEXT NOT NULL,
  page_url TEXT,
  user_agent TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_surveys_project_status ON micro_surveys(project_id, status);
CREATE INDEX idx_survey_responses_survey ON survey_responses(survey_id);
CREATE INDEX idx_survey_responses_visitor ON survey_responses(visitor_id, survey_id);
CREATE UNIQUE INDEX idx_survey_responses_unique ON survey_responses(survey_id, visitor_id);
```

---

## API Design

### Survey Management (Dashboard)

```
POST   /api/surveys              - Create survey
GET    /api/surveys              - List surveys for project
GET    /api/surveys/:id          - Get survey details + analytics
PATCH  /api/surveys/:id          - Update survey
DELETE /api/surveys/:id          - Delete survey
POST   /api/surveys/:id/activate - Start survey
POST   /api/surveys/:id/pause    - Pause survey
```

### Survey Delivery (Widget)

```
GET    /api/surveys/active?projectId=X&page=/pricing&visitorId=Y
       → Returns survey to show (if any), considering targeting rules

POST   /api/surveys/:id/respond
       → Submit response { visitorId, value, pageUrl }
```

---

## Widget Integration

### Architecture: Two Features, One Widget

Chat and Micro-Surveys are **separate features** that operate independently:
- Chat: Triggered by launcher button click
- Micro-Surveys: Triggered by targeting rules (page, time, scroll)

Both are delivered through the **same embed code** - customers don't need to change anything.

### How It Works

1. **Same embed code** - No changes needed for customers
2. **Widget checks for active surveys** on page load
3. **Targeting evaluated** client-side (fast) + server-side (authoritative)
4. **Survey popup rendered** separately from chat widget (different DOM container)
5. **Both can be visible simultaneously** without conflicts
6. **Response submitted** to API

### Code Architecture

```
widget/
├── src/
│   ├── components/
│   │   ├── chat-window.ts       # Existing chat feature
│   │   ├── survey-popup.ts      # NEW: Micro-survey renderer
│   │   └── illustrations/       # NEW: SVG illustrations
│   │       ├── apple.ts
│   │       ├── lemon.ts
│   │       └── ...
│   ├── services/
│   │   ├── api.ts               # Existing chat API
│   │   └── survey-service.ts    # NEW: Survey fetch & tracking
│   └── widget.ts                # Entry point (initializes both)
```

---

## Dashboard Pages

### 1. Surveys List (`/dashboard/surveys`)
- All surveys with status, response count, sentiment
- Quick actions: activate, pause, duplicate, delete

### 2. Survey Builder (`/dashboard/surveys/new`)
- Single-page form with live preview
- Question type selector
- Illustration picker
- Targeting configuration

### 3. Survey Analytics (`/dashboard/surveys/:id`)
- Response breakdown (pie chart for MCQ, bar for upvote)
- Response timeline chart
- Page performance (which pages got most responses)
- Export responses CSV

---

## Pricing Considerations

| Tier | Campaigns | Responses/mo | Illustrations |
|------|-----------|--------------|---------------|
| Free | 1 active | 100 | 5 basic |
| Pro | 5 active | 5,000 | All 10 |
| Business | Unlimited | 50,000 | All + custom upload |

---

## Success Metrics

1. **Response Rate** - % of impressions that get responses (target: 15-25%)
2. **Completion Rate** - % of campaigns that hit response goal
3. **Customer Adoption** - % of customers who create at least 1 campaign
4. **NPS Impact** - Does using campaigns improve customer satisfaction?

---

## Implementation Phases

### Phase 1: Full MVP (Current Sprint)
**Database & API:**
- [ ] Database tables for micro_surveys & survey_responses
- [ ] Full CRUD API for surveys
- [ ] Activate/pause endpoints

**Widget Integration:**
- [ ] Survey popup component with all 10 illustrations
- [ ] Fetch active survey for current page
- [ ] Submit response API call
- [ ] Visitor tracking (localStorage)

**Question Types:**
- [ ] Upvote (Yes/Nah)
- [ ] MCQ (multiple choice)
- [ ] Emoji scale (5 emotions)
- [ ] Star rating (1-5)
- [ ] Text input

**Targeting:**
- [ ] Page URL patterns
- [ ] Time delay trigger
- [ ] Scroll depth trigger
- [ ] Visitor type (all/new/returning)
- [ ] Frequency limits per visitor

**Dashboard:**
- [ ] List all surveys with status
- [ ] Create/edit survey form
- [ ] Illustration picker with preview
- [ ] Analytics page with response breakdown
- [ ] Response timeline chart

### Phase 2: Advanced Features (Future)
- [ ] A/B test surveys
- [ ] Custom illustrations upload
- [ ] Slack/webhook notifications
- [ ] Export responses CSV

### Phase 3: Intelligence (Future)
- [ ] AI-suggested questions based on chatbot conversations
- [ ] Auto-pause underperforming surveys
- [ ] Sentiment analysis on text responses
- [ ] Cross-survey insights

---

## Open Questions

1. ~~**Naming:** "Campaigns", "Micro-Surveys", "Pulse Checks", "Quick Polls"?~~ → **RESOLVED: "Micro-Surveys"**
2. ~~**Relationship to chat:** Can campaigns trigger from chat?~~ → **RESOLVED: Separate features, same widget**
3. **Mobile behavior:** Same illustrations or simplified?
4. **Illustration licensing:** Create original or use/license existing? (Currently using custom SVGs)
5. **Competitive positioning:** How prominently to market vs chatbot?

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Survey fatigue if overused | Built-in cooldown, global limits |
| Slow page load from illustrations | Lazy load, small SVGs, CDN |
| Low adoption | Templates, one-click campaigns |
| Cannibalize chat engagement | Clear use case differentiation |

---

## Next Steps

1. **Validate demand:** Talk to 5 customers about this use case
2. **Finalize scope:** Decide MVP vs future phases
3. **Design review:** Get design feedback on illustrations
4. **Technical spike:** Test widget integration approach
5. **Build Phase 1:** 2-3 week sprint

---

## Critical Files to Create/Modify

### Database
- `packages/db/supabase/migrations/XXXXXX_create_micro_surveys.sql`

### API (apps/api)
- `src/routes/surveys.ts` - CRUD endpoints
- `src/routes/survey-responses.ts` - Response submission

### Widget (apps/widget)
- `src/components/survey-popup.ts` - Survey popup UI
- `src/components/illustrations/` - 10 SVG illustration files
- `src/services/survey-service.ts` - Fetch & track surveys
- `src/styles/survey.css` - Survey-specific styles
- `src/widget.ts` - Add survey initialization

### Dashboard (apps/web)
- `app/dashboard/surveys/page.tsx` - List view
- `app/dashboard/surveys/new/page.tsx` - Create form
- `app/dashboard/surveys/[id]/page.tsx` - Edit & analytics
- `components/survey-preview.tsx` - Live preview component

---

## Verification Plan

### Testing Survey Creation
1. Create survey via dashboard (`/dashboard/surveys/new`)
2. Set targeting to specific page (e.g., `/`)
3. Activate survey
4. Visit page as anonymous visitor (incognito)
5. Verify popup appears after configured delay
6. Submit response
7. Verify response recorded in dashboard analytics

### Testing Targeting Rules
1. Survey shows only on targeted pages
2. Survey respects delay settings
3. Survey respects scroll depth trigger
4. Survey doesn't show twice to same visitor
5. Survey respects frequency limits

### Testing Widget Integration
1. Both chat and survey work together
2. Survey doesn't break if chat is also open
3. Chat works normally when no survey is active
4. Performance acceptable (check Network tab, LCP)
