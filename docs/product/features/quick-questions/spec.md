# Quick Questions / Suggested Starters

**Feature Specification Document**

| Field | Value |
|-------|-------|
| Status | Planned |
| Priority | Medium |
| Inspired By | Chatbase.co |
| Estimated Effort | 5-7 days |
| Author | AI Product Team |
| Created | January 2025 |

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Problem Statement](#2-problem-statement)
3. [Solution Overview](#3-solution-overview)
4. [User Experience](#4-user-experience)
5. [Functional Requirements](#5-functional-requirements)
6. [Technical Architecture](#6-technical-architecture)
7. [Database Design](#7-database-design)
8. [API Specification](#8-api-specification)
9. [Widget Implementation](#9-widget-implementation)
10. [Dashboard UI](#10-dashboard-ui)
11. [MCP Integration](#11-mcp-integration)
12. [User Flows](#12-user-flows)
13. [Edge Cases & Error Handling](#13-edge-cases--error-handling)
14. [Security Considerations](#14-security-considerations)
15. [Performance Considerations](#15-performance-considerations)
16. [Accessibility](#16-accessibility)
17. [Analytics & Tracking](#17-analytics--tracking)
18. [Testing Strategy](#18-testing-strategy)
19. [Implementation Phases](#19-implementation-phases)
20. [Success Metrics](#20-success-metrics)
21. [Future Enhancements](#21-future-enhancements)
22. [Appendix](#22-appendix)

---

## 1. Executive Summary

### What
Add a "Quick Questions" feature that displays clickable question suggestions to help users start conversations with minimal friction. Questions appear as clickable chips/buttons in both the closed state (floating near the chat bubble) and the open state (inside the chat window).

### Why
- **Reduce friction**: Users often don't know what to ask or how to phrase questions
- **Increase engagement**: One-click starts boost conversation initiation rates
- **Guide users**: Direct users toward topics the chatbot handles well
- **Competitive parity**: Chatbase.co and other competitors offer this feature
- **Better first impressions**: Shows the chatbot's capabilities upfront

### How
- Admin configures suggested questions through dashboard settings
- Questions can be manually curated (static) or auto-populated from analytics (top asked questions)
- Widget displays questions contextually based on user state
- Clicking a question opens the chat (if closed) and sends the message automatically

---

## 2. Problem Statement

### Current State
1. Users land on a website and see the chat bubble
2. They must click to open the chat
3. They see a greeting message
4. They must think of and type a question
5. They wait for a response

**Pain Points:**
- **Blank slate problem**: Users stare at empty input wondering what to ask
- **Typing friction**: Mobile users especially dislike typing
- **Uncertainty**: Users don't know if the bot can help with their question
- **Bounce rate**: Many users open chat, see the blank state, and close it

### Competitive Analysis

| Competitor | Quick Questions Feature |
|------------|------------------------|
| Chatbase.co | Yes - Shows 2-3 suggestions in both states |
| Intercom | Yes - "Quick replies" in bot flows |
| Drift | Yes - Playbook buttons |
| Crisp | Limited - Only in bot builder |
| SupportBase | **No** - This is the gap we're filling |

---

## 3. Solution Overview

### Core Concept
Display pre-configured or analytics-driven question suggestions that users can click to instantly start a conversation.

### Display Locations

#### Location 1: Closed State (Near Bubble)
When the chat widget is minimized, show 2-3 floating question chips near the chat bubble.

```
┌─────────────────────────────────────┐
│                                     │
│    ┌──────────────────────────┐     │
│    │ "How do I get started?" │←─── Floating chip
│    └──────────────────────────┘     │
│    ┌──────────────────────────┐     │
│    │ "What's the pricing?"   │←─── Floating chip
│    └──────────────────────────┘     │
│                          ┌────┐     │
│                          │ 💬 │←─── Chat bubble
│                          └────┘     │
└─────────────────────────────────────┘
```

#### Location 2: Open State (In Chat Window)
After the greeting message, display question suggestions as larger clickable cards.

```
┌─────────────────────────────────────┐
│  Help                           ✕   │
├─────────────────────────────────────┤
│                                     │
│  🤖 Hi! I'm here to help with any   │
│     questions about our product.    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │ How do I get started?       │←── Question card
│  └─────────────────────────────┘    │
│  ┌─────────────────────────────┐    │
│  │ What features are included? │←── Question card
│  └─────────────────────────────┘    │
│  ┌─────────────────────────────┐    │
│  │ How does pricing work?      │←── Question card
│  └─────────────────────────────┘    │
│                                     │
├─────────────────────────────────────┤
│  Type a message...            Send  │
└─────────────────────────────────────┘
```

### Question Source Modes

#### Mode 1: Static (Manual Configuration)
- Admin manually enters 2-5 questions in the dashboard
- Full control over content and ordering
- Best for: New projects, curated experiences, specific use cases

#### Mode 2: Analytics (Auto-populated)
- System automatically identifies most frequently asked questions
- Uses existing question clustering algorithm (0.85 cosine similarity)
- Refreshes periodically (configurable: daily, weekly, monthly)
- Best for: Established chatbots with significant traffic

#### Mode 3: Hybrid
- Uses static questions as the primary source
- Falls back to analytics-generated questions if static list is empty or insufficient
- Best for: Projects transitioning from new to established

---

## 4. User Experience

### 4.1 End User Journey

#### Scenario A: First-time visitor with questions shown
1. User lands on website
2. Sees chat bubble in corner with floating question suggestions
3. Reads suggestions: "How do I get started?" catches their eye
4. Clicks the suggestion
5. Chat window opens with their question already sent
6. AI responds immediately
7. User continues conversation naturally

**Outcome**: Zero-friction conversation start

#### Scenario B: User opens chat manually
1. User clicks chat bubble to open
2. Sees greeting: "Hi! How can I help?"
3. Sees 3 suggested questions below greeting
4. Clicks "What's the pricing?"
5. Question is sent automatically
6. AI responds with pricing information
7. User asks follow-up questions

**Outcome**: Guided conversation path

#### Scenario C: User ignores suggestions
1. User sees suggestions but has a specific question in mind
2. Types their own question in the input field
3. Suggestions disappear after first message
4. Normal conversation continues

**Outcome**: Suggestions don't interfere with natural usage

### 4.2 Admin Journey

#### Initial Setup
1. Admin navigates to Settings > Quick Questions
2. Sees feature is disabled by default
3. Toggles "Enable Quick Questions" on
4. Selects source mode: "Static" (recommended for new projects)
5. Adds first question: "How do I get started?"
6. Adds second question: "What features are included?"
7. Adds third question: "How does pricing work?"
8. Previews how questions will appear in widget
9. Saves settings

#### Ongoing Optimization
1. Admin checks analytics for most asked questions
2. Switches source mode to "Hybrid"
3. System now supplements static questions with analytics
4. Admin monitors click-through rates on suggestions
5. Adjusts questions based on performance data

---

## 5. Functional Requirements

### 5.1 Core Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-1 | Display up to 5 configurable quick questions | Must Have |
| FR-2 | Support static (manual) question configuration | Must Have |
| FR-3 | Click on question opens chat and sends message | Must Have |
| FR-4 | Questions disappear after first user message | Must Have |
| FR-5 | Show questions in closed state (near bubble) | Must Have |
| FR-6 | Show questions in open state (in chat window) | Must Have |
| FR-7 | Admin can enable/disable feature | Must Have |
| FR-8 | Admin can reorder questions via drag-and-drop | Must Have |
| FR-9 | Support analytics-based auto-population | Should Have |
| FR-10 | Support hybrid mode (static + analytics) | Should Have |
| FR-11 | Admin can configure display settings | Should Have |
| FR-12 | Track question click analytics | Should Have |
| FR-13 | MCP tool support for configuration | Should Have |
| FR-14 | Questions respect max character limit | Must Have |
| FR-15 | Mobile-responsive display | Must Have |

### 5.2 Display Settings

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `enabled` | boolean | false | Master toggle for feature |
| `source_mode` | enum | "static" | static, analytics, hybrid |
| `show_in_closed_state` | boolean | true | Show near bubble when minimized |
| `show_in_open_state` | boolean | true | Show in chat window |
| `max_display_count` | integer | 3 | Maximum questions to show (1-5) |
| `max_question_length` | integer | 100 | Truncate questions longer than this |

### 5.3 Analytics Settings (for analytics/hybrid modes)

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `analytics_min_occurrences` | integer | 5 | Minimum times a question cluster must occur |
| `analytics_max_questions` | integer | 5 | Max questions to auto-generate |
| `analytics_refresh_days` | integer | 7 | How often to refresh analytics data |
| `analytics_exclude_topics` | array | [] | Topics to exclude from suggestions |

---

## 6. Technical Architecture

### 6.1 System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Dashboard (Next.js)                       │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Settings > Quick Questions                              │    │
│  │  - Enable/disable toggle                                 │    │
│  │  - Source mode selector                                  │    │
│  │  - Drag-and-drop question list                          │    │
│  │  - Preview panel                                         │    │
│  └─────────────────────────────────────────────────────────┘    │
└──────────────────────────────┬──────────────────────────────────┘
                               │ API calls
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                           API (Hono)                             │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  GET /api/projects/:id/quick-questions-settings         │    │
│  │  PUT /api/projects/:id/quick-questions-settings         │    │
│  │  GET /api/embed/:projectId (modified to include QQ)     │    │
│  └─────────────────────────────────────────────────────────┘    │
└──────────────────────────────┬──────────────────────────────────┘
                               │ Database queries
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Supabase (PostgreSQL)                     │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  quick_questions_settings table                          │    │
│  │  - project_id (FK)                                       │    │
│  │  - enabled, source_mode, static_questions               │    │
│  │  - display settings, analytics settings                  │    │
│  └─────────────────────────────────────────────────────────┘    │
└──────────────────────────────┬──────────────────────────────────┘
                               │ Config fetched at runtime
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Widget (Vanilla JS)                       │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  QuickQuestions Component                                │    │
│  │  - Renders in closed state (near bubble)                 │    │
│  │  - Renders in open state (in chat window)                │    │
│  │  - Handles click events → sends message                  │    │
│  │  - Hides after first user message                        │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

### 6.2 Data Flow

```
Admin configures questions in Dashboard
                │
                ▼
    PUT /api/projects/:id/quick-questions-settings
                │
                ▼
    Settings saved to quick_questions_settings table
                │
                ▼
    User visits website with embedded widget
                │
                ▼
    Widget calls GET /api/embed/:projectId
                │
                ▼
    API returns config including quickQuestions object
                │
                ▼
    Widget creates QuickQuestions component instances
                │
                ▼
    User clicks a question
                │
                ▼
    Widget opens chat (if closed) + sends message
                │
                ▼
    Analytics event logged (question_click)
                │
                ▼
    QuickQuestions components hide themselves
```

### 6.3 Component Architecture (Widget)

```
SupportBaseWidget
├── Bubble (existing)
│   └── onClick → toggleChatWindow()
├── QuickQuestions (NEW - closed state)
│   ├── question chips
│   └── onClick → handleQuickQuestion()
├── ChatWindow (existing)
│   ├── Header
│   ├── MessageList
│   │   ├── GreetingMessage
│   │   ├── QuickQuestions (NEW - open state)
│   │   └── Messages...
│   └── InputArea
└── HumanHandoffButton (existing)
```

---

## 7. Database Design

### 7.1 New Table: `quick_questions_settings`

```sql
-- Migration: add_quick_questions_settings.sql

CREATE TABLE quick_questions_settings (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign key to projects
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Feature toggle
  enabled BOOLEAN DEFAULT false,

  -- Source configuration
  source_mode TEXT DEFAULT 'static'
    CHECK (source_mode IN ('static', 'analytics', 'hybrid')),

  -- Static questions (ordered array)
  -- Format: [{"id": "uuid", "text": "Question?", "order": 0}, ...]
  static_questions JSONB DEFAULT '[]'::jsonb,

  -- Analytics configuration
  analytics_min_occurrences INTEGER DEFAULT 5,
  analytics_max_questions INTEGER DEFAULT 5,
  analytics_refresh_days INTEGER DEFAULT 7,
  analytics_last_refresh TIMESTAMPTZ,

  -- Auto-generated questions from analytics
  -- Format: [{"text": "Question?", "occurrences": 42, "generated_at": "..."}, ...]
  analytics_questions JSONB DEFAULT '[]'::jsonb,

  -- Display settings
  show_in_closed_state BOOLEAN DEFAULT true,
  show_in_open_state BOOLEAN DEFAULT true,
  max_display_count INTEGER DEFAULT 3 CHECK (max_display_count BETWEEN 1 AND 5),
  max_question_length INTEGER DEFAULT 100,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Constraints
  UNIQUE(project_id)
);

-- Index for efficient lookups
CREATE INDEX idx_quick_questions_project ON quick_questions_settings(project_id);

-- Trigger to update updated_at
CREATE TRIGGER update_quick_questions_timestamp
  BEFORE UPDATE ON quick_questions_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### 7.2 Static Questions JSONB Schema

```typescript
interface StaticQuestion {
  id: string;           // UUID for stable identification
  text: string;         // The question text (max 100 chars)
  order: number;        // Display order (0-indexed)
  created_at: string;   // ISO timestamp
  updated_at: string;   // ISO timestamp
}

// Example:
[
  {
    "id": "a1b2c3d4-...",
    "text": "How do I get started?",
    "order": 0,
    "created_at": "2025-01-15T10:00:00Z",
    "updated_at": "2025-01-15T10:00:00Z"
  },
  {
    "id": "e5f6g7h8-...",
    "text": "What features are included?",
    "order": 1,
    "created_at": "2025-01-15T10:00:00Z",
    "updated_at": "2025-01-15T10:00:00Z"
  }
]
```

### 7.3 Analytics Questions JSONB Schema

```typescript
interface AnalyticsQuestion {
  text: string;           // The question text (cleaned/representative)
  occurrences: number;    // How many times this cluster was asked
  cluster_id: string;     // Reference to question cluster
  generated_at: string;   // When this was computed
  sample_questions: string[]; // 2-3 actual questions from this cluster
}

// Example:
[
  {
    "text": "How do I add my FAQ?",
    "occurrences": 156,
    "cluster_id": "cluster-abc123",
    "generated_at": "2025-01-15T00:00:00Z",
    "sample_questions": [
      "How can I add my FAQ to the chatbot?",
      "Where do I upload my FAQs?",
      "How to import FAQ documents?"
    ]
  }
]
```

---

## 8. API Specification

### 8.1 GET Quick Questions Settings

**Endpoint:** `GET /api/projects/:projectId/quick-questions-settings`

**Description:** Retrieve the quick questions configuration for a project.

**Authentication:** Required (project owner or admin)

**Response 200:**
```json
{
  "success": true,
  "data": {
    "enabled": true,
    "source_mode": "static",
    "static_questions": [
      {
        "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "text": "How do I get started?",
        "order": 0
      },
      {
        "id": "b2c3d4e5-f6g7-8901-bcde-f12345678901",
        "text": "What features are included?",
        "order": 1
      }
    ],
    "analytics_min_occurrences": 5,
    "analytics_max_questions": 5,
    "analytics_refresh_days": 7,
    "analytics_questions": [],
    "show_in_closed_state": true,
    "show_in_open_state": true,
    "max_display_count": 3,
    "max_question_length": 100
  }
}
```

**Response 404:**
```json
{
  "success": false,
  "error": "Project not found"
}
```

### 8.2 PUT Quick Questions Settings

**Endpoint:** `PUT /api/projects/:projectId/quick-questions-settings`

**Description:** Update the quick questions configuration for a project.

**Authentication:** Required (project owner or admin)

**Request Body:**
```json
{
  "enabled": true,
  "source_mode": "static",
  "static_questions": [
    { "text": "How do I get started?" },
    { "text": "What features are included?" },
    { "text": "How does pricing work?" }
  ],
  "show_in_closed_state": true,
  "show_in_open_state": true,
  "max_display_count": 3
}
```

**Validation Rules:**
- `enabled`: boolean
- `source_mode`: must be "static", "analytics", or "hybrid"
- `static_questions`: array of objects with `text` property
- `static_questions[].text`: string, 1-100 characters
- `static_questions.length`: 0-5 items
- `max_display_count`: integer, 1-5
- `show_in_closed_state`: boolean
- `show_in_open_state`: boolean

**Response 200:**
```json
{
  "success": true,
  "data": {
    "enabled": true,
    "source_mode": "static",
    "static_questions": [
      {
        "id": "new-uuid-1",
        "text": "How do I get started?",
        "order": 0
      },
      {
        "id": "new-uuid-2",
        "text": "What features are included?",
        "order": 1
      },
      {
        "id": "new-uuid-3",
        "text": "How does pricing work?",
        "order": 2
      }
    ],
    "show_in_closed_state": true,
    "show_in_open_state": true,
    "max_display_count": 3
  }
}
```

**Response 400:**
```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    { "field": "static_questions[0].text", "message": "Question text is required" }
  ]
}
```

### 8.3 Modified: GET Embed Config

**Endpoint:** `GET /api/embed/:projectId`

**Description:** Retrieve widget configuration including quick questions.

**Authentication:** None (public endpoint, rate limited)

**Response 200 (addition to existing response):**
```json
{
  "projectId": "...",
  "name": "...",
  "greeting": "...",
  "primaryColor": "#2563eb",
  "quickQuestions": {
    "enabled": true,
    "questions": [
      "How do I get started?",
      "What features are included?",
      "How does pricing work?"
    ],
    "showInClosedState": true,
    "showInOpenState": true,
    "maxDisplayCount": 3
  }
}
```

**Notes:**
- Only returns the display-ready questions (text only)
- Respects `max_display_count` limit
- Merges static and analytics questions based on source_mode
- Returns empty array if feature is disabled

---

## 9. Widget Implementation

### 9.1 New File: `quick-questions.ts`

```typescript
// apps/widget/src/components/quick-questions.ts

export interface QuickQuestionsConfig {
  questions: string[];
  mode: 'closed' | 'open';
  onQuestionClick: (question: string) => void;
  primaryColor?: string;
}

export class QuickQuestions {
  private container: HTMLElement;
  private questions: string[];
  private onQuestionClick: (question: string) => void;
  private mode: 'closed' | 'open';
  private primaryColor: string;
  private isHidden: boolean = false;

  constructor(config: QuickQuestionsConfig) {
    this.questions = config.questions;
    this.onQuestionClick = config.onQuestionClick;
    this.mode = config.mode;
    this.primaryColor = config.primaryColor || '#2563eb';
    this.container = this.create();
  }

  private create(): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.className = `sb-quick-questions sb-quick-questions--${this.mode}`;
    wrapper.setAttribute('role', 'group');
    wrapper.setAttribute('aria-label', 'Suggested questions');

    this.questions.forEach((question, index) => {
      const chip = this.createChip(question, index);
      wrapper.appendChild(chip);
    });

    return wrapper;
  }

  private createChip(question: string, index: number): HTMLElement {
    const chip = document.createElement('button');
    chip.className = 'sb-quick-question-chip';
    chip.textContent = this.truncateQuestion(question);
    chip.title = question; // Full text on hover
    chip.style.setProperty('--sb-primary-color', this.primaryColor);
    chip.style.animationDelay = `${index * 0.1}s`;

    // Accessibility
    chip.setAttribute('type', 'button');
    chip.setAttribute('aria-label', `Ask: ${question}`);

    // Event handlers
    chip.addEventListener('click', () => {
      this.onQuestionClick(question);
    });

    chip.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.onQuestionClick(question);
      }
    });

    return chip;
  }

  private truncateQuestion(question: string, maxLength: number = 50): string {
    if (question.length <= maxLength) return question;
    return question.substring(0, maxLength - 3) + '...';
  }

  public mount(parent: HTMLElement): void {
    parent.appendChild(this.container);
  }

  public unmount(): void {
    this.container.remove();
  }

  public hide(): void {
    if (this.isHidden) return;
    this.isHidden = true;
    this.container.classList.add('sb-quick-questions--hiding');

    // Remove after animation
    setTimeout(() => {
      this.container.classList.add('sb-hidden');
      this.container.classList.remove('sb-quick-questions--hiding');
    }, 300);
  }

  public show(): void {
    if (!this.isHidden) return;
    this.isHidden = false;
    this.container.classList.remove('sb-hidden');
  }

  public isVisible(): boolean {
    return !this.isHidden;
  }

  public getElement(): HTMLElement {
    return this.container;
  }
}
```

### 9.2 CSS Additions: `widget.css`

```css
/* ===========================================
   Quick Questions Component
   =========================================== */

/* Base styles */
.sb-quick-questions {
  --sb-primary-color: #2563eb;
}

/* Hidden state */
.sb-quick-questions.sb-hidden {
  display: none !important;
}

/* Hiding animation */
.sb-quick-questions--hiding {
  opacity: 0;
  transition: opacity 0.3s ease;
}

/* -----------------------------------------
   Closed State (Near Bubble)
   ----------------------------------------- */
.sb-quick-questions--closed {
  position: absolute;
  bottom: 80px;  /* Above the bubble */
  right: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
  padding: 8px;
  z-index: 9998;  /* Below bubble (9999) */
}

.sb-quick-questions--closed .sb-quick-question-chip {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 20px;
  padding: 8px 16px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 13px;
  font-weight: 500;
  color: #334155;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  transition: all 0.2s ease;
  max-width: 220px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  /* Animation */
  animation: sb-slideInRight 0.3s ease forwards;
  opacity: 0;
  transform: translateX(20px);
}

.sb-quick-questions--closed .sb-quick-question-chip:hover {
  background: #f8fafc;
  border-color: var(--sb-primary-color);
  color: var(--sb-primary-color);
  transform: translateX(-4px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
}

.sb-quick-questions--closed .sb-quick-question-chip:focus {
  outline: 2px solid var(--sb-primary-color);
  outline-offset: 2px;
}

.sb-quick-questions--closed .sb-quick-question-chip:active {
  transform: translateX(-2px) scale(0.98);
}

/* -----------------------------------------
   Open State (In Chat Window)
   ----------------------------------------- */
.sb-quick-questions--open {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 16px 16px;
  margin-top: 8px;
}

.sb-quick-questions--open .sb-quick-question-chip {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 12px 16px;
  font-family: inherit;
  font-size: 14px;
  font-weight: 500;
  color: #334155;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s ease;

  /* Animation */
  animation: sb-fadeInUp 0.3s ease forwards;
  opacity: 0;
  transform: translateY(10px);
}

.sb-quick-questions--open .sb-quick-question-chip:hover {
  background: #eff6ff;
  border-color: var(--sb-primary-color);
  color: var(--sb-primary-color);
}

.sb-quick-questions--open .sb-quick-question-chip:focus {
  outline: 2px solid var(--sb-primary-color);
  outline-offset: 2px;
}

.sb-quick-questions--open .sb-quick-question-chip:active {
  transform: scale(0.98);
}

/* -----------------------------------------
   Animations
   ----------------------------------------- */
@keyframes sb-slideInRight {
  from {
    opacity: 0;
    transform: translateX(20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes sb-fadeInUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* -----------------------------------------
   Mobile Responsive
   ----------------------------------------- */
@media (max-width: 480px) {
  /* Hide closed-state questions on mobile (space constraint) */
  .sb-quick-questions--closed {
    display: none;
  }

  /* Adjust open-state for mobile */
  .sb-quick-questions--open {
    padding: 8px 12px 12px;
    gap: 6px;
  }

  .sb-quick-questions--open .sb-quick-question-chip {
    padding: 10px 14px;
    font-size: 13px;
  }
}

/* -----------------------------------------
   Reduced Motion
   ----------------------------------------- */
@media (prefers-reduced-motion: reduce) {
  .sb-quick-questions--closed .sb-quick-question-chip,
  .sb-quick-questions--open .sb-quick-question-chip {
    animation: none;
    opacity: 1;
    transform: none;
  }

  .sb-quick-questions--hiding {
    transition: none;
  }
}

/* -----------------------------------------
   Dark Mode Support (Future)
   ----------------------------------------- */
@media (prefers-color-scheme: dark) {
  .sb-quick-questions--closed .sb-quick-question-chip {
    background: #1e293b;
    border-color: #334155;
    color: #e2e8f0;
  }

  .sb-quick-questions--closed .sb-quick-question-chip:hover {
    background: #334155;
    color: var(--sb-primary-color);
  }

  .sb-quick-questions--open .sb-quick-question-chip {
    background: #1e293b;
    border-color: #334155;
    color: #e2e8f0;
  }

  .sb-quick-questions--open .sb-quick-question-chip:hover {
    background: #334155;
    color: var(--sb-primary-color);
  }
}
```

### 9.3 Widget Integration

**File:** `apps/widget/src/widget.ts`

```typescript
// Add to imports
import { QuickQuestions, QuickQuestionsConfig } from './components/quick-questions';

// Add to class properties
private quickQuestionsConfig: {
  enabled: boolean;
  questions: string[];
  showInClosedState: boolean;
  showInOpenState: boolean;
} | null = null;
private closedQuickQuestions: QuickQuestions | null = null;
private openQuickQuestions: QuickQuestions | null = null;
private hasUserSentMessage: boolean = false;

// In initWidget(), after fetching config:
if (config.quickQuestions?.enabled) {
  this.quickQuestionsConfig = config.quickQuestions;
  this.initQuickQuestions();
}

// New method: Initialize quick questions
private initQuickQuestions(): void {
  if (!this.quickQuestionsConfig?.enabled) return;

  const { questions, showInClosedState, showInOpenState } = this.quickQuestionsConfig;

  if (questions.length === 0) return;

  // Create closed state instance
  if (showInClosedState) {
    this.closedQuickQuestions = new QuickQuestions({
      questions: questions.slice(0, 3), // Max 3 in closed state
      mode: 'closed',
      onQuestionClick: (q) => this.handleQuickQuestion(q),
      primaryColor: this.primaryColor,
    });
    this.closedQuickQuestions.mount(this.container);
  }

  // Open state instance created when chat window opens
}

// New method: Handle quick question click
private handleQuickQuestion(question: string): void {
  // Track analytics
  this.trackEvent('quick_question_click', { question });

  // Open chat window if closed
  if (!this.isOpen) {
    this.openChat();
  }

  // Hide quick questions
  this.closedQuickQuestions?.hide();
  this.openQuickQuestions?.hide();

  // Send the question
  this.chatWindow.sendMessage(question);
  this.hasUserSentMessage = true;
}

// Modify openChat() to create open-state questions
private openChat(): void {
  // ... existing code ...

  // Create open state quick questions if not already created
  if (
    this.quickQuestionsConfig?.enabled &&
    this.quickQuestionsConfig.showInOpenState &&
    !this.hasUserSentMessage &&
    !this.openQuickQuestions
  ) {
    this.openQuickQuestions = new QuickQuestions({
      questions: this.quickQuestionsConfig.questions,
      mode: 'open',
      onQuestionClick: (q) => this.handleQuickQuestion(q),
      primaryColor: this.primaryColor,
    });
    // Mount after greeting message
    this.chatWindow.mountQuickQuestions(this.openQuickQuestions.getElement());
  }
}

// Modify closeChat() to hide closed state questions
private closeChat(): void {
  // ... existing code ...

  // Show closed state questions again if no conversation started
  if (!this.hasUserSentMessage) {
    this.closedQuickQuestions?.show();
  }
}

// Add handler for when user sends their own message
private onUserMessage(message: string): void {
  // ... existing code ...

  // Hide quick questions after first user message
  if (!this.hasUserSentMessage) {
    this.hasUserSentMessage = true;
    this.closedQuickQuestions?.hide();
    this.openQuickQuestions?.hide();
  }
}
```

### 9.4 Types Update

**File:** `apps/widget/src/types.ts`

```typescript
export interface QuickQuestionsEmbedConfig {
  enabled: boolean;
  questions: string[];
  showInClosedState: boolean;
  showInOpenState: boolean;
}

export interface EmbedConfig {
  // ... existing fields ...
  quickQuestions?: QuickQuestionsEmbedConfig;
}
```

---

## 10. Dashboard UI

### 10.1 Settings Page Structure

**File:** `apps/web/app/(dashboard)/settings/quick-questions/page.tsx`

**Layout:**
```
┌─────────────────────────────────────────────────────────────────────┐
│  Settings > Quick Questions                                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────────────────────────────┬───────────────────────────┐│
│  │  Configuration                       │  Preview                  ││
│  │                                      │                           ││
│  │  [Toggle] Enable Quick Questions     │  ┌─────────────────────┐  ││
│  │                                      │  │  Closed State       │  ││
│  │  Source Mode                         │  │  ┌─────────────┐    │  ││
│  │  [Static ▼] [Analytics] [Hybrid]     │  │  │ Question 1  │    │  ││
│  │                                      │  │  │ Question 2  │    │  ││
│  │  ─────────────────────────────       │  │  │   [💬]      │    │  ││
│  │                                      │  │  └─────────────┘    │  ││
│  │  Questions (drag to reorder)         │  └─────────────────────┘  ││
│  │  ┌─────────────────────────────┐     │                           ││
│  │  │ ≡ How do I get started? [✎][✕]│   │  ┌─────────────────────┐  ││
│  │  └─────────────────────────────┘     │  │  Open State         │  ││
│  │  ┌─────────────────────────────┐     │  │  ┌─────────────┐    │  ││
│  │  │ ≡ What features included? [✎][✕]│  │  │ Hi! How can │    │  ││
│  │  └─────────────────────────────┘     │  │ I help today? │    │  ││
│  │  ┌─────────────────────────────┐     │  │  └─────────────┘    │  ││
│  │  │ ≡ How does pricing work? [✎][✕]│  │  │  ┌───────────┐     │  ││
│  │  └─────────────────────────────┘     │  │  │ Question 1│     │  ││
│  │                                      │  │  │ Question 2│     │  ││
│  │  [+ Add Question]                    │  │  │ Question 3│     │  ││
│  │                                      │  │  └───────────┘     │  ││
│  │  ─────────────────────────────       │  └─────────────────────┘  ││
│  │                                      │                           ││
│  │  Display Settings                    │                           ││
│  │  [✓] Show in closed state            │                           ││
│  │  [✓] Show in open state              │                           ││
│  │  Max questions: [3 ▼]                │                           ││
│  │                                      │                           ││
│  └──────────────────────────────────────┴───────────────────────────┘│
│                                                                      │
│                                            [Cancel]  [Save Changes]  │
└─────────────────────────────────────────────────────────────────────┘
```

### 10.2 Component Structure

```typescript
// Page component structure
QuickQuestionsSettingsPage
├── PageHeader
│   └── Title, Description, Breadcrumbs
├── SettingsForm
│   ├── EnableToggle
│   │   └── Switch component
│   ├── SourceModeSelector
│   │   └── SegmentedControl (static | analytics | hybrid)
│   ├── QuestionsSection (conditional on source_mode)
│   │   ├── QuestionList (drag-and-drop via @dnd-kit)
│   │   │   └── QuestionItem[] (text, edit, delete, drag handle)
│   │   └── AddQuestionButton
│   ├── AnalyticsSection (conditional on source_mode)
│   │   └── AnalyticsQuestionsReadOnly
│   └── DisplaySettings
│       ├── ShowInClosedState (checkbox)
│       ├── ShowInOpenState (checkbox)
│       └── MaxDisplayCount (select 1-5)
├── PreviewPanel
│   ├── ClosedStatePreview
│   │   └── MockBubble + MockQuestionChips
│   └── OpenStatePreview
│       └── MockChatWindow with questions
└── ActionButtons
    └── Cancel, Save
```

### 10.3 Key UI Components

**QuestionItem Component:**
```tsx
interface QuestionItemProps {
  id: string;
  text: string;
  index: number;
  onEdit: (id: string, newText: string) => void;
  onDelete: (id: string) => void;
}

function QuestionItem({ id, text, index, onEdit, onDelete }: QuestionItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(text);

  // DnD kit hooks
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });

  return (
    <div ref={setNodeRef} style={{ transform, transition }} className="...">
      {/* Drag handle */}
      <button {...attributes} {...listeners} className="cursor-grab">
        <GripVertical className="w-4 h-4 text-slate-400" />
      </button>

      {/* Question text */}
      {isEditing ? (
        <Input
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          onBlur={() => {
            onEdit(id, editText);
            setIsEditing(false);
          }}
          maxLength={100}
          autoFocus
        />
      ) : (
        <span className="flex-1 truncate">{text}</span>
      )}

      {/* Actions */}
      <button onClick={() => setIsEditing(true)}>
        <Pencil className="w-4 h-4" />
      </button>
      <button onClick={() => onDelete(id)}>
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}
```

### 10.4 Navigation Update

**File:** `apps/web/app/(dashboard)/settings/layout.tsx`

Add navigation link:
```tsx
const settingsNavItems = [
  // ... existing items ...
  {
    href: "/settings/quick-questions",
    label: "Quick Questions",
    icon: MessageSquarePlus,
    description: "Configure conversation starters"
  },
];
```

---

## 11. MCP Integration

### 11.1 Get Quick Questions Settings Tool

**File:** `packages/mcp-server/src/tools/quick-questions.ts`

```typescript
export const getQuickQuestionsSettingsTool = {
  name: "get_quick_questions_settings",
  description: "Get the quick questions configuration for your chatbot. Quick questions are suggested conversation starters that appear near the chat bubble.",
  inputSchema: {
    type: "object",
    properties: {
      project_id: {
        type: "string",
        description: "The project ID. If not provided, uses the default project."
      }
    },
    required: []
  },
  handler: async (params: { project_id?: string }, context: ToolContext) => {
    const projectId = params.project_id || context.defaultProjectId;

    if (!projectId) {
      return { error: "No project ID provided and no default project configured" };
    }

    const response = await fetch(
      `${context.apiUrl}/api/projects/${projectId}/quick-questions-settings`,
      { headers: context.authHeaders }
    );

    if (!response.ok) {
      return { error: `Failed to get settings: ${response.statusText}` };
    }

    const data = await response.json();
    return {
      enabled: data.enabled,
      source_mode: data.source_mode,
      questions: data.static_questions.map((q: any) => q.text),
      show_in_closed_state: data.show_in_closed_state,
      show_in_open_state: data.show_in_open_state,
      max_display_count: data.max_display_count
    };
  }
};
```

### 11.2 Update Quick Questions Settings Tool

```typescript
export const updateQuickQuestionsSettingsTool = {
  name: "update_quick_questions_settings",
  description: "Update the quick questions configuration for your chatbot. You can enable/disable the feature, set questions, and configure display settings.",
  inputSchema: {
    type: "object",
    properties: {
      project_id: {
        type: "string",
        description: "The project ID. If not provided, uses the default project."
      },
      enabled: {
        type: "boolean",
        description: "Enable or disable quick questions feature"
      },
      source_mode: {
        type: "string",
        enum: ["static", "analytics", "hybrid"],
        description: "How questions are sourced: static (manual), analytics (auto), or hybrid"
      },
      questions: {
        type: "array",
        items: { type: "string" },
        description: "List of question texts to display (max 5)"
      },
      show_in_closed_state: {
        type: "boolean",
        description: "Show questions floating near the chat bubble"
      },
      show_in_open_state: {
        type: "boolean",
        description: "Show questions inside the chat window"
      },
      max_display_count: {
        type: "integer",
        minimum: 1,
        maximum: 5,
        description: "Maximum number of questions to display"
      }
    },
    required: []
  },
  handler: async (params: UpdateParams, context: ToolContext) => {
    const projectId = params.project_id || context.defaultProjectId;

    if (!projectId) {
      return { error: "No project ID provided and no default project configured" };
    }

    // Build update payload
    const payload: Record<string, any> = {};
    if (params.enabled !== undefined) payload.enabled = params.enabled;
    if (params.source_mode) payload.source_mode = params.source_mode;
    if (params.questions) {
      payload.static_questions = params.questions.map(text => ({ text }));
    }
    if (params.show_in_closed_state !== undefined) {
      payload.show_in_closed_state = params.show_in_closed_state;
    }
    if (params.show_in_open_state !== undefined) {
      payload.show_in_open_state = params.show_in_open_state;
    }
    if (params.max_display_count !== undefined) {
      payload.max_display_count = params.max_display_count;
    }

    const response = await fetch(
      `${context.apiUrl}/api/projects/${projectId}/quick-questions-settings`,
      {
        method: "PUT",
        headers: {
          ...context.authHeaders,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      }
    );

    if (!response.ok) {
      return { error: `Failed to update settings: ${response.statusText}` };
    }

    return { success: true, message: "Quick questions settings updated successfully" };
  }
};
```

### 11.3 Usage Examples

```
User: "Enable quick questions with these suggestions: How do I get started? What features are included?"

AI Response:
I'll enable quick questions for your chatbot with those suggestions.

[Calls update_quick_questions_settings tool with:
  enabled: true,
  questions: ["How do I get started?", "What features are included?"]
]

Done! Quick questions are now enabled. Your visitors will see these suggestions:
1. "How do I get started?"
2. "What features are included?"

They'll appear both near the chat bubble and inside the chat window.
```

---

## 12. User Flows

### 12.1 Admin: Initial Setup Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│ 1. Admin logs into dashboard                                         │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 2. Navigates to Settings > Quick Questions                           │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 3. Sees feature is disabled, toggles ON                              │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 4. Source mode defaults to "Static"                                  │
│    - Sees empty questions list                                       │
│    - Sees "Add Question" button                                      │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 5. Clicks "Add Question"                                             │
│    - Input field appears                                             │
│    - Types: "How do I get started?"                                  │
│    - Presses Enter                                                   │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 6. Question appears in list                                          │
│    - Preview panel updates to show question                          │
│    - Adds 2 more questions                                           │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 7. Reorders questions via drag-and-drop                              │
│    - Preview updates in real-time                                    │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 8. Adjusts display settings                                          │
│    - Keeps closed state enabled                                      │
│    - Keeps open state enabled                                        │
│    - Sets max display to 3                                           │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 9. Clicks "Save Changes"                                             │
│    - Success toast appears                                           │
│    - Settings saved to database                                      │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 10. Tests on their website                                           │
│     - Sees questions near bubble                                     │
│     - Clicks one, chat opens with question sent                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 12.2 End User: Click Quick Question Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│ 1. User lands on website with SupportBase widget                     │
│    - Sees chat bubble in corner                                      │
│    - Sees 2-3 floating question chips above bubble                   │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 2. Reads questions, sees relevant one                                │
│    - "How do I get started?" catches their eye                       │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 3. Clicks on "How do I get started?"                                 │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 4. Widget state changes:                                             │
│    a. Floating questions animate out (hide)                          │
│    b. Chat window opens with animation                               │
│    c. Greeting message appears                                       │
│    d. User's clicked question appears as sent message                │
│    e. AI thinking indicator shows                                    │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 5. AI responds with getting started information                      │
│    - Quick questions in open state are already hidden                │
│    - User reads response                                             │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 6. User can:                                                         │
│    a. Ask follow-up questions                                        │
│    b. Close chat (questions won't reappear since conversation started)│
└─────────────────────────────────────────────────────────────────────┘
```

### 12.3 End User: Ignore Questions Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│ 1. User lands on website, sees bubble and floating questions         │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 2. User has a specific question in mind, clicks bubble directly      │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 3. Chat window opens:                                                │
│    - Greeting message shows                                          │
│    - Quick questions shown in open state                             │
│    - Input field is ready                                            │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 4. User types their own question                                     │
│    - "Can I integrate with Shopify?"                                 │
│    - Presses send                                                    │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 5. Quick questions animate out and hide                              │
│    - Space is reclaimed for conversation                             │
│    - AI responds to their custom question                            │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 6. User continues normal conversation                                │
│    - Quick questions never reappear in this session                  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 13. Edge Cases & Error Handling

### 13.1 No Questions Configured

**Scenario:** Admin enables feature but doesn't add any questions.

**Expected Behavior:**
- Feature is technically "enabled" but questions array is empty
- Widget checks `questions.length > 0` before rendering
- No quick questions shown to end users
- Dashboard shows helpful hint: "Add at least one question to activate"

**Implementation:**
```typescript
// In widget
if (!config.quickQuestions?.enabled || config.quickQuestions.questions.length === 0) {
  return; // Don't initialize QuickQuestions
}
```

### 13.2 Analytics Mode with No Data

**Scenario:** Admin selects analytics mode but chatbot is new with no conversation history.

**Expected Behavior:**
- `analytics_questions` array is empty
- If source_mode is "analytics", no questions shown
- If source_mode is "hybrid", falls back to static questions
- Dashboard shows: "Collecting data... Analytics questions will appear after [X] conversations"

**Implementation:**
```typescript
// In API when building embed config
function getQuestionsForEmbed(settings: QuickQuestionsSettings): string[] {
  const { source_mode, static_questions, analytics_questions } = settings;

  switch (source_mode) {
    case 'static':
      return static_questions.map(q => q.text);
    case 'analytics':
      return analytics_questions.map(q => q.text);
    case 'hybrid':
      // Static first, then analytics to fill gaps
      const staticTexts = static_questions.map(q => q.text);
      const analyticsTexts = analytics_questions.map(q => q.text);
      return [...staticTexts, ...analyticsTexts].slice(0, settings.max_display_count);
    default:
      return [];
  }
}
```

### 13.3 Long Question Text

**Scenario:** Admin enters a very long question that would break the UI.

**Prevention:**
- Input validation: max 100 characters
- Real-time character counter in input field
- Truncate with ellipsis in widget display

**Implementation:**
```typescript
// Dashboard validation
const MAX_QUESTION_LENGTH = 100;

function validateQuestion(text: string): { valid: boolean; error?: string } {
  if (!text.trim()) {
    return { valid: false, error: "Question cannot be empty" };
  }
  if (text.length > MAX_QUESTION_LENGTH) {
    return { valid: false, error: `Question must be ${MAX_QUESTION_LENGTH} characters or less` };
  }
  return { valid: true };
}

// Widget display truncation
function truncateQuestion(text: string, maxLength: number = 50): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}
```

### 13.4 Too Many Questions

**Scenario:** Admin tries to add more than 5 questions.

**Prevention:**
- "Add Question" button disabled when at 5 questions
- Validation prevents saving more than 5
- Clear UI feedback: "Maximum 5 questions allowed"

**Implementation:**
```typescript
const MAX_QUESTIONS = 5;

// Dashboard UI
<Button
  disabled={questions.length >= MAX_QUESTIONS}
  onClick={addQuestion}
>
  Add Question
</Button>
{questions.length >= MAX_QUESTIONS && (
  <p className="text-sm text-amber-600">Maximum {MAX_QUESTIONS} questions reached</p>
)}
```

### 13.5 Widget Reopened After Conversation

**Scenario:** User has a conversation, closes chat, comes back later and reopens.

**Expected Behavior:**
- Quick questions should NOT reappear if conversation already started
- Session state tracks `hasUserSentMessage`
- On reopen, check this flag before showing questions

**Implementation:**
```typescript
class SupportBaseWidget {
  private hasUserSentMessage: boolean = false;
  private sessionKey = 'sb_session_state';

  constructor() {
    // Restore session state
    const savedState = sessionStorage.getItem(this.sessionKey);
    if (savedState) {
      const { hasUserSentMessage } = JSON.parse(savedState);
      this.hasUserSentMessage = hasUserSentMessage;
    }
  }

  private onUserMessage(message: string): void {
    this.hasUserSentMessage = true;
    this.saveSessionState();
    // ... send message
  }

  private saveSessionState(): void {
    sessionStorage.setItem(this.sessionKey, JSON.stringify({
      hasUserSentMessage: this.hasUserSentMessage
    }));
  }

  private openChat(): void {
    // ... open chat window

    // Only show questions if no conversation yet
    if (!this.hasUserSentMessage) {
      this.showOpenStateQuestions();
    }
  }
}
```

### 13.6 Mobile Device Constraints

**Scenario:** User on mobile device with limited screen space.

**Expected Behavior:**
- Closed-state questions hidden on mobile (< 480px width)
- Open-state questions still shown (they fit in chat window)
- Responsive styling adjusts padding and font sizes

**Implementation:**
```css
@media (max-width: 480px) {
  .sb-quick-questions--closed {
    display: none;
  }

  .sb-quick-questions--open .sb-quick-question-chip {
    padding: 10px 14px;
    font-size: 13px;
  }
}
```

### 13.7 Network Error Loading Config

**Scenario:** Widget fails to load configuration due to network error.

**Expected Behavior:**
- Widget still functions for basic chat
- Quick questions simply don't appear
- No error shown to user
- Error logged for debugging

**Implementation:**
```typescript
async function loadConfig(): Promise<EmbedConfig> {
  try {
    const response = await fetch(`${apiUrl}/api/embed/${projectId}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error('[SupportBase] Failed to load config:', error);
    // Return minimal config without quick questions
    return {
      projectId,
      quickQuestions: { enabled: false, questions: [] }
    };
  }
}
```

### 13.8 Duplicate Questions

**Scenario:** Admin accidentally adds the same question twice.

**Prevention:**
- Validation on save: check for duplicate texts
- Show warning: "This question already exists"
- Allow duplicates but warn (admin might have reason)

**Implementation:**
```typescript
function validateQuestions(questions: StaticQuestion[]): ValidationResult {
  const texts = questions.map(q => q.text.toLowerCase().trim());
  const duplicates = texts.filter((text, index) => texts.indexOf(text) !== index);

  if (duplicates.length > 0) {
    return {
      valid: true, // Allow save but warn
      warnings: [`Duplicate questions detected: "${duplicates[0]}"`]
    };
  }

  return { valid: true };
}
```

### 13.9 Special Characters in Questions

**Scenario:** Question contains HTML, emojis, or special characters.

**Expected Behavior:**
- HTML entities escaped (prevent XSS)
- Emojis displayed correctly
- Special quotes and apostrophes preserved

**Implementation:**
```typescript
function sanitizeQuestionText(text: string): string {
  // Escape HTML entities
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  // Preserve emojis and special characters
  return escaped.trim();
}

// In widget, use textContent instead of innerHTML
chip.textContent = sanitizeQuestionText(question);
```

### 13.10 Analytics Refresh Failure

**Scenario:** Scheduled analytics refresh job fails.

**Expected Behavior:**
- Keep existing analytics_questions (don't clear)
- Log error for debugging
- Retry on next scheduled run
- Alert admin if repeated failures

**Implementation:**
```typescript
async function refreshAnalyticsQuestions(projectId: string): Promise<void> {
  try {
    const topQuestions = await getTopQuestionClusters(projectId, {
      minOccurrences: settings.analytics_min_occurrences,
      limit: settings.analytics_max_questions
    });

    await updateAnalyticsQuestions(projectId, topQuestions);
    await updateLastRefresh(projectId, new Date());
  } catch (error) {
    console.error(`[Analytics Refresh] Failed for project ${projectId}:`, error);
    // Don't clear existing questions on failure
    // Will retry on next scheduled run
  }
}
```

---

## 14. Security Considerations

### 14.1 XSS Prevention

**Risk:** Admin-configured questions could contain malicious scripts.

**Mitigation:**
- Sanitize all question text before storage
- Use `textContent` instead of `innerHTML` in widget
- Escape HTML entities on display

### 14.2 Rate Limiting

**Risk:** Abuse of settings API endpoints.

**Mitigation:**
- Require authentication for all settings endpoints
- Rate limit: 60 requests per minute per user
- Validate project ownership before allowing changes

### 14.3 Input Validation

**Risk:** Invalid data corrupting database or causing errors.

**Mitigation:**
```typescript
const settingsSchema = z.object({
  enabled: z.boolean().optional(),
  source_mode: z.enum(['static', 'analytics', 'hybrid']).optional(),
  static_questions: z.array(z.object({
    text: z.string().min(1).max(100)
  })).max(5).optional(),
  show_in_closed_state: z.boolean().optional(),
  show_in_open_state: z.boolean().optional(),
  max_display_count: z.number().int().min(1).max(5).optional()
});
```

### 14.4 Data Privacy

**Risk:** Analytics questions revealing sensitive user queries.

**Mitigation:**
- Only show cluster representatives, not actual user queries
- Don't store individual question texts in analytics_questions
- Admins can exclude topics from analytics generation

---

## 15. Performance Considerations

### 15.1 Widget Bundle Size

**Goal:** Minimize impact on page load.

**Approach:**
- QuickQuestions component: ~2KB minified
- CSS additions: ~1KB minified
- Total addition: ~3KB (acceptable)

### 15.2 Initial Load

**Current:** Widget loads config on init, then renders.

**With Quick Questions:**
- Config response adds ~200 bytes for quick questions data
- No additional API calls needed
- Render time: < 5ms for QuickQuestions component

### 15.3 Animation Performance

**Risk:** CSS animations causing jank on low-end devices.

**Mitigation:**
- Use CSS transforms (GPU accelerated)
- Respect `prefers-reduced-motion` media query
- Keep animation duration short (300ms)

### 15.4 Caching

**Embed Config Cache:**
- Cache quick questions in embed config response
- Cache TTL: 5 minutes
- Invalidate on settings update

```typescript
// Cache key structure
const cacheKey = `embed_config:${projectId}`;
const cacheTTL = 300; // 5 minutes

async function getEmbedConfig(projectId: string): Promise<EmbedConfig> {
  const cached = await cache.get(cacheKey);
  if (cached) return cached;

  const config = await buildEmbedConfig(projectId);
  await cache.set(cacheKey, config, cacheTTL);
  return config;
}

// Invalidate on settings change
async function updateQuickQuestionsSettings(projectId: string, settings: Settings) {
  await db.update(settings);
  await cache.delete(`embed_config:${projectId}`);
}
```

---

## 16. Accessibility

### 16.1 Keyboard Navigation

**Requirements:**
- All question chips focusable via Tab
- Enter/Space activates focused chip
- Escape closes chat window
- Focus trap within chat window when open

**Implementation:**
```typescript
// Chip keyboard handler
chip.addEventListener('keydown', (e: KeyboardEvent) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    this.onQuestionClick(question);
  }
});
```

### 16.2 Screen Reader Support

**Requirements:**
- Group labeled as "Suggested questions"
- Each chip has descriptive aria-label
- State changes announced

**Implementation:**
```html
<div role="group" aria-label="Suggested questions">
  <button
    type="button"
    aria-label="Ask: How do I get started?"
    class="sb-quick-question-chip"
  >
    How do I get started?
  </button>
</div>
```

### 16.3 Color Contrast

**Requirements:**
- Text meets WCAG AA contrast ratio (4.5:1)
- Focus indicators clearly visible

**Implementation:**
```css
.sb-quick-question-chip {
  color: #334155; /* Slate-700: 7.5:1 contrast on white */
}

.sb-quick-question-chip:focus {
  outline: 2px solid var(--sb-primary-color);
  outline-offset: 2px;
}
```

### 16.4 Reduced Motion

**Requirements:**
- Respect user's motion preferences
- Provide equivalent experience without animation

**Implementation:**
```css
@media (prefers-reduced-motion: reduce) {
  .sb-quick-question-chip {
    animation: none;
    opacity: 1;
    transform: none;
  }
}
```

---

## 17. Analytics & Tracking

### 17.1 Events to Track

| Event | Properties | Description |
|-------|------------|-------------|
| `quick_questions_shown` | `location: 'closed' \| 'open'`, `count: number` | Questions displayed to user |
| `quick_question_click` | `question: string`, `location: 'closed' \| 'open'`, `index: number` | User clicked a question |
| `quick_questions_dismissed` | `reason: 'user_typed' \| 'conversation_started'` | Questions hidden |

### 17.2 Metrics Dashboard

**Add to Analytics page:**
- Quick Questions click rate: (clicks / impressions) × 100
- Top clicked questions (ranking)
- Click location distribution (closed vs open)
- Conversion rate (questions clicked → conversation completed)

### 17.3 Implementation

```typescript
// Track impression
private trackQuickQuestionsShown(location: 'closed' | 'open', count: number): void {
  this.trackEvent('quick_questions_shown', { location, count });
}

// Track click
private handleQuickQuestion(question: string, location: 'closed' | 'open', index: number): void {
  this.trackEvent('quick_question_click', { question, location, index });
  // ... rest of handler
}

// In analytics route, aggregate for dashboard
async function getQuickQuestionAnalytics(projectId: string, dateRange: DateRange) {
  const impressions = await db.query(`
    SELECT COUNT(*) FROM events
    WHERE project_id = $1 AND event_name = 'quick_questions_shown'
    AND timestamp BETWEEN $2 AND $3
  `, [projectId, dateRange.start, dateRange.end]);

  const clicks = await db.query(`
    SELECT question, COUNT(*) as count FROM events
    WHERE project_id = $1 AND event_name = 'quick_question_click'
    AND timestamp BETWEEN $2 AND $3
    GROUP BY question
    ORDER BY count DESC
  `, [projectId, dateRange.start, dateRange.end]);

  return { impressions, clicks };
}
```

---

## 18. Testing Strategy

### 18.1 Unit Tests

**Widget Component Tests:**
```typescript
describe('QuickQuestions', () => {
  it('renders correct number of questions', () => {
    const qq = new QuickQuestions({
      questions: ['Q1', 'Q2', 'Q3'],
      mode: 'closed',
      onQuestionClick: jest.fn()
    });
    const container = qq.getElement();
    expect(container.querySelectorAll('.sb-quick-question-chip')).toHaveLength(3);
  });

  it('calls onQuestionClick when chip clicked', () => {
    const onClick = jest.fn();
    const qq = new QuickQuestions({
      questions: ['Test question'],
      mode: 'open',
      onQuestionClick: onClick
    });
    const chip = qq.getElement().querySelector('.sb-quick-question-chip');
    chip?.click();
    expect(onClick).toHaveBeenCalledWith('Test question');
  });

  it('hides when hide() is called', () => {
    const qq = new QuickQuestions({...});
    qq.hide();
    expect(qq.getElement().classList).toContain('sb-hidden');
  });

  it('truncates long questions', () => {
    const longQuestion = 'A'.repeat(100);
    const qq = new QuickQuestions({
      questions: [longQuestion],
      mode: 'open',
      onQuestionClick: jest.fn()
    });
    const chip = qq.getElement().querySelector('.sb-quick-question-chip');
    expect(chip?.textContent?.length).toBeLessThan(60);
    expect(chip?.textContent).toContain('...');
  });
});
```

**API Route Tests:**
```typescript
describe('Quick Questions Settings API', () => {
  describe('GET /api/projects/:id/quick-questions-settings', () => {
    it('returns settings for valid project', async () => {
      const response = await request(app)
        .get('/api/projects/test-project/quick-questions-settings')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('enabled');
      expect(response.body.data).toHaveProperty('static_questions');
    });

    it('returns 404 for non-existent project', async () => {
      const response = await request(app)
        .get('/api/projects/non-existent/quick-questions-settings')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/projects/:id/quick-questions-settings', () => {
    it('updates settings successfully', async () => {
      const response = await request(app)
        .put('/api/projects/test-project/quick-questions-settings')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          enabled: true,
          static_questions: [{ text: 'Test question?' }]
        });

      expect(response.status).toBe(200);
      expect(response.body.data.enabled).toBe(true);
    });

    it('validates question length', async () => {
      const response = await request(app)
        .put('/api/projects/test-project/quick-questions-settings')
        .send({
          static_questions: [{ text: 'A'.repeat(200) }] // Too long
        });

      expect(response.status).toBe(400);
    });
  });
});
```

### 18.2 Integration Tests

```typescript
describe('Quick Questions Integration', () => {
  it('end-to-end: admin configures, user sees and clicks', async () => {
    // 1. Admin configures questions via API
    await request(app)
      .put('/api/projects/test-project/quick-questions-settings')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        enabled: true,
        static_questions: [
          { text: 'How do I get started?' },
          { text: 'What is the pricing?' }
        ]
      });

    // 2. Embed config includes quick questions
    const embedConfig = await request(app)
      .get('/api/embed/test-project');

    expect(embedConfig.body.quickQuestions.enabled).toBe(true);
    expect(embedConfig.body.quickQuestions.questions).toHaveLength(2);

    // 3. Widget integration tested in E2E
  });
});
```

### 18.3 E2E Tests (Playwright)

```typescript
import { test, expect } from '@playwright/test';

test.describe('Quick Questions Widget', () => {
  test.beforeEach(async ({ page }) => {
    // Set up test project with quick questions enabled
    await setupTestProject({ quickQuestionsEnabled: true });
    await page.goto('/test-page-with-widget');
  });

  test('shows questions near bubble in closed state', async ({ page }) => {
    const closedQuestions = page.locator('.sb-quick-questions--closed');
    await expect(closedQuestions).toBeVisible();
    await expect(closedQuestions.locator('.sb-quick-question-chip')).toHaveCount(3);
  });

  test('clicking question opens chat and sends message', async ({ page }) => {
    const questionChip = page.locator('.sb-quick-questions--closed .sb-quick-question-chip').first();
    const questionText = await questionChip.textContent();

    await questionChip.click();

    // Chat window should open
    await expect(page.locator('.sb-chat-window')).toBeVisible();

    // Question should be sent
    const userMessage = page.locator('.sb-message--user').first();
    await expect(userMessage).toContainText(questionText!);

    // Questions should be hidden
    await expect(page.locator('.sb-quick-questions--closed')).toBeHidden();
  });

  test('questions hidden after user types message', async ({ page }) => {
    // Open chat
    await page.locator('.sb-bubble').click();

    // Questions should be visible in open state
    await expect(page.locator('.sb-quick-questions--open')).toBeVisible();

    // Type a message
    await page.locator('.sb-input').fill('My custom question');
    await page.locator('.sb-send-button').click();

    // Questions should now be hidden
    await expect(page.locator('.sb-quick-questions--open')).toBeHidden();
  });

  test('respects mobile breakpoint', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Closed state questions should be hidden on mobile
    await expect(page.locator('.sb-quick-questions--closed')).toBeHidden();

    // Open chat - open state questions should still show
    await page.locator('.sb-bubble').click();
    await expect(page.locator('.sb-quick-questions--open')).toBeVisible();
  });
});
```

### 18.4 Dashboard Tests

```typescript
describe('Quick Questions Settings Page', () => {
  test('can add and reorder questions', async ({ page }) => {
    await page.goto('/settings/quick-questions');

    // Enable feature
    await page.locator('[data-testid="enable-toggle"]').click();

    // Add questions
    await page.locator('[data-testid="add-question"]').click();
    await page.locator('input[name="question-text"]').fill('First question?');
    await page.keyboard.press('Enter');

    await page.locator('[data-testid="add-question"]').click();
    await page.locator('input[name="question-text"]').fill('Second question?');
    await page.keyboard.press('Enter');

    // Verify order
    const questions = page.locator('[data-testid="question-item"]');
    await expect(questions.first()).toContainText('First question?');
    await expect(questions.nth(1)).toContainText('Second question?');

    // Drag second to first position
    await questions.nth(1).dragTo(questions.first());

    // Verify new order
    await expect(questions.first()).toContainText('Second question?');

    // Save
    await page.locator('[data-testid="save-button"]').click();
    await expect(page.locator('.toast-success')).toBeVisible();
  });
});
```

---

## 19. Implementation Phases

### Phase 1: Database & API Foundation

**Deliverables:**
1. Database migration for `quick_questions_settings` table
2. API routes: GET and PUT settings endpoints
3. Modify embed endpoint to include quick questions
4. Unit tests for API routes

**Acceptance Criteria:**
- [ ] Migration runs successfully
- [ ] GET settings returns correct data structure
- [ ] PUT settings validates and saves correctly
- [ ] Embed endpoint includes quick questions when enabled
- [ ] All API tests pass

### Phase 2: Widget Component

**Deliverables:**
1. QuickQuestions component class
2. CSS styles for both states
3. Integration into main widget
4. Click handling and state management

**Acceptance Criteria:**
- [ ] Questions render in closed state
- [ ] Questions render in open state
- [ ] Clicking opens chat and sends message
- [ ] Questions hide after first user message
- [ ] Animations work correctly
- [ ] Mobile responsive behavior correct

### Phase 3: Dashboard UI

**Deliverables:**
1. Settings page component
2. Enable/disable toggle
3. Question list with CRUD operations
4. Drag-and-drop reordering
5. Preview panel
6. Display settings controls

**Acceptance Criteria:**
- [ ] Page loads and displays current settings
- [ ] Can toggle feature on/off
- [ ] Can add questions (up to 5)
- [ ] Can edit question text
- [ ] Can delete questions
- [ ] Can reorder via drag-and-drop
- [ ] Preview updates in real-time
- [ ] Settings save successfully

### Phase 4: MCP & Polish

**Deliverables:**
1. MCP tools for get/update settings
2. Analytics tracking implementation
3. Edge case handling
4. Accessibility audit and fixes
5. Performance optimization
6. Documentation updates

**Acceptance Criteria:**
- [ ] MCP tools work correctly
- [ ] Analytics events tracking
- [ ] All edge cases handled gracefully
- [ ] Passes accessibility audit
- [ ] No performance regressions
- [ ] Knowledge base updated

---

## 20. Success Metrics

### 20.1 Primary Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Feature Adoption | 30% of projects enable within 30 days | % of active projects with feature enabled |
| Click-through Rate | 15% of impressions result in clicks | Clicks / Impressions |
| Conversation Start Rate | 10% increase | Conversations started / Widget loads |

### 20.2 Secondary Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Time to First Message | 50% reduction | Median time from widget load to first user message |
| Mobile Engagement | No decrease | Conversations on mobile before/after |
| Support Ticket Reduction | 5% reduction | Support tickets mentioning "how to start" |

### 20.3 Quality Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Widget Performance | No increase in load time | P95 widget load time |
| Error Rate | < 0.1% | API error rate for settings endpoints |
| Accessibility | WCAG AA compliance | Automated + manual audit score |

---

## 21. Future Enhancements

### 21.1 Potential Future Features

**Contextual Questions:**
- Show different questions based on:
  - Page URL user is viewing
  - User's previous interactions
  - Time of day / business hours
  - User segment (new vs returning)

**A/B Testing:**
- Test different question sets
- Measure which questions drive most engagement
- Automatic optimization based on performance

**AI-Generated Questions:**
- Use LLM to suggest questions based on knowledge base
- Auto-generate questions for new content
- Continuously optimize question phrasing

**Multi-language Support:**
- Store questions in multiple languages
- Detect user language and show appropriate set
- Admin can configure per-language questions

**Rich Question Cards:**
- Add icons to questions
- Support question categories/groups
- Visual separators and headers

### 21.2 Roadmap Considerations

| Enhancement | Effort | Impact | Priority |
|-------------|--------|--------|----------|
| Contextual (URL-based) | Medium | High | P2 |
| A/B Testing | High | High | P3 |
| AI-Generated | Medium | Medium | P3 |
| Multi-language | Medium | Medium | P2 |
| Rich Cards | Low | Low | P4 |

---

## 22. Appendix

### 22.1 Files to Create

```
apps/api/src/routes/quick-questions.ts          # API endpoints
apps/widget/src/components/quick-questions.ts   # Widget component
apps/web/app/(dashboard)/settings/quick-questions/page.tsx  # Settings UI
packages/mcp-server/src/tools/quick-questions.ts  # MCP tools
packages/database/migrations/YYYYMMDD_add_quick_questions_settings.sql
```

### 22.2 Files to Modify

```
apps/api/src/routes/embed.ts       # Add quick questions to config
apps/api/src/index.ts              # Register new routes
apps/widget/src/widget.ts          # Integrate QuickQuestions component
apps/widget/src/styles/widget.css  # Add new styles
apps/widget/src/types.ts           # Add config types
apps/web/app/(dashboard)/settings/layout.tsx  # Add nav link
packages/mcp-server/src/index.ts   # Register new tools
```

### 22.3 Related Documentation

- [Widget Architecture](../architecture/widget.md)
- [API Documentation](../api/README.md)
- [MCP Tools Reference](../mcp/tools.md)
- [Analytics Guide](../analytics/README.md)

### 22.4 References

- Chatbase.co - Competitor implementation
- [WCAG 2.1 Accessibility Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [@dnd-kit Documentation](https://docs.dndkit.com/)

---

**Document Version:** 1.0
**Last Updated:** January 2025
**Status:** Ready for Implementation
