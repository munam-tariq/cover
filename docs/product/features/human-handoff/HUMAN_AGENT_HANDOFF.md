# Feature Specification: Human Agent Handoff & Live Chat Dashboard

**Feature ID:** F001
**Status:** Draft
**Author:** Product Team
**Created:** January 2025
**Last Updated:** January 2025

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Problem Statement & Market Research](#2-problem-statement--market-research)
3. [Current State Analysis](#3-current-state-analysis)
4. [Feature Overview](#4-feature-overview)
5. [Sub-Feature Specifications](#5-sub-feature-specifications)
   - 5.1 [Handoff Configuration System](#51-handoff-configuration-system)
   - 5.2 [Conversation State Management](#52-conversation-state-management)
   - 5.3 [Agent Availability & Capacity System](#53-agent-availability--capacity-system)
   - 5.4 [Queue Management System](#54-queue-management-system)
   - 5.5 [Assignment Algorithm](#55-assignment-algorithm)
   - 5.6 [Widget Changes](#56-widget-changes)
   - 5.7 [Agent Dashboard](#57-agent-dashboard)
   - 5.8 [Business Hours System](#58-business-hours-system)
   - 5.9 [Real-time Architecture](#59-real-time-architecture)
   - 5.10 [Availability-Aware Handoff Logic](#510-availability-aware-handoff-logic)
   - 5.11 [Customer Identification System](#511-customer-identification-system)
   - 5.12 [Customer Presence & Session Management](#512-customer-presence--session-management)
6. [Database Schema](#6-database-schema)
7. [API Endpoints](#7-api-endpoints)
8. [Security & Permissions](#8-security--permissions)
9. [Edge Cases & Error Handling](#9-edge-cases--error-handling)
10. [Migration Strategy](#10-migration-strategy)
11. [Testing Strategy](#11-testing-strategy)
12. [Open Questions & Future Considerations](#12-open-questions--future-considerations)

---

## 1. Executive Summary

### 1.1 What We're Building

Transform SupportBase from an AI-only chatbot into a complete support solution where AI handles first-line support and seamlessly hands off to human agents when needed. This includes:

- **Configurable handoff triggers** (automatic + manual)
- **Live chat dashboard** for support agents
- **Queue management** with capacity-based assignment
- **Real-time messaging** between customers and agents
- **Business hours** configuration

### 1.2 Why This Matters

From market research across Reddit (r/SaaS, r/startups, r/CustomerSuccess):

> "The bot asks 5 questions, then hands off and the agent asks the same 5 questions"

AI chatbots without human handoff are dead ends. When handoff exists in competitors, context is lost. This is the #1 frustration in the market.

### 1.3 Our Differentiator

**Context preservation** - Agent sees the FULL AI conversation + customer metadata before they even say hello. No repeated questions.

### 1.4 Success Metrics

| Metric | Target |
|--------|--------|
| Handoff adoption | 50%+ of active projects enable handoff |
| Response time | < 2 minutes average (when agents online) |
| Context utilization | 90%+ agents view AI conversation before responding |
| Customer satisfaction | > 4.0/5.0 rating |

---

## 2. Problem Statement & Market Research

### 2.1 Problems We're Solving

**Problem 1: AI Chatbots Are Dead Ends**
- Most AI chatbots have no escalation path
- Customers get frustrated when stuck in AI loops
- Leads are lost when AI can't help

**Problem 2: Context Loss During Handoff**
- When handoff exists, the AI conversation is not visible to agents
- Agents start fresh: "How can I help you?"
- Customers repeat everything they already told the bot
- Frustration increases, CSAT drops

**Problem 3: No Capacity Management**
- Small teams can't handle unlimited concurrent chats
- No way to queue customers when agents are busy
- Conversations get dropped or forgotten

### 2.2 Competitor Analysis

| Feature | Intercom | Zendesk | Crisp | SupportBase (Planned) |
|---------|----------|---------|-------|----------------------|
| AI Chatbot | ✅ Fin AI | ✅ | ✅ Basic | ✅ RAG-powered |
| Human Handoff | ✅ | ✅ | ✅ | ✅ |
| Context Preserved | Partial | Partial | ❌ | ✅ Full |
| Capacity Limits | ✅ | ✅ | ❌ | ✅ |
| Queue Management | ✅ | ✅ | ❌ | ✅ |
| MCP Integration | ❌ | ❌ | ❌ | ✅ Unique |
| Pricing (SMB) | $74+/seat | $55+/agent | $25/mo | TBD |

### 2.3 Research Sources

- [Zendesk: Serving chats in Agent Workspace](https://support.zendesk.com/hc/en-us/articles/4408824439194-Serving-chats-in-the-Zendesk-Agent-Workspace)
- [Intercom: Workload management explained](https://www.intercom.com/help/en/articles/6560715-workload-management-explained)
- [Intercom: Balanced assignment deep dive](https://www.intercom.com/help/en/articles/6553774-balanced-assignment-deep-dive)
- [LiveChat: Understanding chat assignment](https://www.livechat.com/help/chat-assignment/)

---

## 3. Current State Analysis

### 3.1 Existing Database Schema

**Current `chat_sessions` table:**
```sql
chat_sessions (
  id                     UUID PRIMARY KEY
  project_id             UUID → projects
  visitor_id             TEXT              -- Anonymous visitor tracking
  messages               JSONB[]           -- All messages in one array
  message_count          INT
  source                 TEXT              -- 'widget', 'playground', 'mcp', 'api', 'voice'

  -- Lead capture state
  awaiting_email         BOOLEAN
  pending_question       TEXT
  email_asked            BOOLEAN

  -- Voice features
  is_voice               BOOLEAN
  voice_duration_seconds INT

  created_at, updated_at, last_message_at
)
```

**Key Observations:**
- Messages stored as JSONB array (not normalized)
- No concept of conversation status (waiting, active, resolved)
- No agent assignment capability
- No handoff metadata

### 3.2 Existing Architecture

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│    Widget    │────▶│   REST API   │────▶│   Supabase   │
│  (Browser)   │◀────│  (Express)   │◀────│  (Postgres)  │
└──────────────┘     └──────────────┘     └──────────────┘
      ▲                     │
      │                     ▼
      │              ┌──────────────┐
      │              │  AI Service  │
      │              │  (OpenAI)    │
      │              └──────────────┘
      │
      └─── No real-time connection (polling only)
```

**Gaps for Human Handoff:**
- No WebSocket/real-time infrastructure
- No agent presence tracking
- No message-level updates (entire JSONB array replaced)
- No conversation routing logic

### 3.3 What Needs to Change

| Component | Current | Required |
|-----------|---------|----------|
| Messages | JSONB array in `chat_sessions` | Separate `messages` table |
| Conversation Status | None | `ai_active`, `waiting`, `agent_active`, `resolved` |
| Agent Assignment | None | `assigned_agent_id` + availability tracking |
| Real-time | REST only | Supabase Realtime channels |
| Widget | AI-only flow | Handoff states + agent chat |
| Dashboard | No inbox | Full agent dashboard |

---

## 4. Feature Overview

### 4.1 User Roles

| Role | Description | Capabilities |
|------|-------------|--------------|
| **Customer** | End user chatting via widget | Chat with AI, request human, view queue position |
| **Agent** | Support team member | View inbox, claim/respond to chats, resolve conversations |
| **Admin** | Project owner | Configure handoff settings, manage team, view analytics |

### 4.2 High-Level Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CUSTOMER JOURNEY                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   Customer opens widget                                                      │
│          │                                                                   │
│          ▼                                                                   │
│   ┌─────────────┐                                                           │
│   │  AI CHAT    │ ◀──────────────────────────────────────┐                  │
│   │  (Default)  │                                         │                  │
│   └──────┬──────┘                                         │                  │
│          │                                                │                  │
│          ▼                                                │                  │
│   [Handoff Triggered?]                                    │                  │
│          │                                                │                  │
│    ┌─────┴─────┐                                          │                  │
│    │           │                                          │                  │
│   No          Yes                                         │                  │
│    │           │                                          │                  │
│    │           ▼                                          │                  │
│    │   [Handoff Enabled?]                                 │                  │
│    │           │                                          │                  │
│    │     ┌─────┴─────┐                                    │                  │
│    │     │           │                                    │                  │
│    │    No          Yes                                   │                  │
│    │     │           │                                    │                  │
│    │     │           ▼                                    │                  │
│    │     │   [Business Hours?]                            │                  │
│    │     │           │                                    │                  │
│    │     │     ┌─────┴─────┐                              │                  │
│    │     │     │           │                              │                  │
│    │     │    No          Yes                             │                  │
│    │     │     │           │                              │                  │
│    │     │     ▼           ▼                              │                  │
│    │     │  ┌────────┐  ┌────────────┐                    │                  │
│    │     │  │OFFLINE │  │ WAITING    │                    │                  │
│    │     │  │ FORM   │  │ (in queue) │                    │                  │
│    │     │  └────────┘  └─────┬──────┘                    │                  │
│    │     │                    │                           │                  │
│    │     │                    ▼                           │                  │
│    │     │            [Agent Available?]                  │                  │
│    │     │                    │                           │                  │
│    │     │              ┌─────┴─────┐                     │                  │
│    │     │              │           │                     │                  │
│    │     │             No          Yes                    │                  │
│    │     │              │           │                     │                  │
│    │     │              ▼           ▼                     │                  │
│    │     │         Stay in     ┌────────────┐            │                  │
│    │     │          Queue      │ AGENT_CHAT │────────────┘                  │
│    │     │                     │  (Live)    │     (Agent resolves           │
│    │     │                     └─────┬──────┘      → back to AI             │
│    │     │                           │             or close)                │
│    │     │                           ▼                                      │
│    │     │                     ┌────────────┐                               │
│    │     │                     │  RESOLVED  │                               │
│    │     │                     └────────────┘                               │
│    │     │                                                                  │
│    └─────┴──────────────────────────────────────────────────────────────────┤
│                                                                              │
│   Continue AI chat                                                           │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.3 Feature Flags / Configuration Summary

| Setting | Default | Description |
|---------|---------|-------------|
| `handoff_enabled` | `false` | Master toggle for human handoff |
| `trigger_mode` | `'both'` | `'auto'`, `'manual'`, or `'both'` |
| `show_human_button` | `false` | Show "Talk to Human" button in widget |
| `business_hours_enabled` | `false` | Respect business hours for handoff |
| `auto_triggers.low_confidence_enabled` | `true` | Trigger on low AI confidence |
| `auto_triggers.low_confidence_threshold` | `0.6` | Confidence threshold (0-1) |
| `auto_triggers.keywords_enabled` | `true` | Trigger on specific keywords |
| `auto_triggers.keywords` | `['human', 'agent', 'person']` | Keywords that trigger handoff |

---

## 5. Sub-Feature Specifications

---

### 5.1 Handoff Configuration System

#### 5.1.1 Overview

Administrators can configure when and how conversations are handed off to human agents. Configuration is per-project.

#### 5.1.2 Configuration Schema

```typescript
interface HandoffSettings {
  // ─────────────────────────────────────────────────────────────
  // MASTER TOGGLE
  // ─────────────────────────────────────────────────────────────
  enabled: boolean;  // Default: false
  // When false: AI-only mode, no human handoff possible
  // When true: Human handoff available based on settings below

  // ─────────────────────────────────────────────────────────────
  // TRIGGER CONFIGURATION
  // ─────────────────────────────────────────────────────────────
  trigger_mode: 'auto' | 'manual' | 'both';  // Default: 'both'
  // 'auto': AI decides when to hand off (based on triggers below)
  // 'manual': Only when customer clicks button
  // 'both': AI triggers + customer button available

  show_human_button: boolean;  // Default: false
  // Whether to show "Talk to Human" button in widget
  // Note: Most customers will keep this OFF to encourage AI usage first

  // ─────────────────────────────────────────────────────────────
  // AUTOMATIC TRIGGERS (when trigger_mode is 'auto' or 'both')
  // ─────────────────────────────────────────────────────────────
  auto_triggers: {
    // Low confidence trigger
    low_confidence_enabled: boolean;  // Default: true
    low_confidence_threshold: number; // Default: 0.6 (range: 0.0 - 1.0)
    // Hand off when AI confidence score < threshold

    // Keyword trigger
    keywords_enabled: boolean;  // Default: true
    keywords: string[];         // Default: ['human', 'agent', 'person', 'speak to someone']
    // Hand off immediately when any keyword detected in customer message
    // Case-insensitive matching

    // Loop detection (future consideration)
    // loop_detection_enabled: boolean;
    // loop_detection_threshold: number; // After N similar failed attempts
  };

  // ─────────────────────────────────────────────────────────────
  // BUSINESS HOURS (when business_hours_enabled is true)
  // ─────────────────────────────────────────────────────────────
  business_hours_enabled: boolean;  // Default: false
  timezone: string;                 // Default: 'UTC' (IANA timezone)
  business_hours: {
    monday:    { start: string; end: string; enabled: boolean };
    tuesday:   { start: string; end: string; enabled: boolean };
    wednesday: { start: string; end: string; enabled: boolean };
    thursday:  { start: string; end: string; enabled: boolean };
    friday:    { start: string; end: string; enabled: boolean };
    saturday:  { start: string; end: string; enabled: boolean };
    sunday:    { start: string; end: string; enabled: boolean };
  };
  // start/end format: "HH:MM" in 24-hour format (e.g., "09:00", "17:30")
  // Outside business hours: Show offline message, capture email for follow-up

  // ─────────────────────────────────────────────────────────────
  // AGENT DEFAULTS
  // ─────────────────────────────────────────────────────────────
  default_max_concurrent_chats: number;  // Default: 5
  // Default chat limit for new agents (can be overridden per-agent)
}
```

#### 5.1.3 Default Configuration

```json
{
  "enabled": false,
  "trigger_mode": "both",
  "show_human_button": false,
  "auto_triggers": {
    "low_confidence_enabled": true,
    "low_confidence_threshold": 0.6,
    "keywords_enabled": true,
    "keywords": ["human", "agent", "person", "speak to someone", "talk to someone"]
  },
  "business_hours_enabled": false,
  "timezone": "UTC",
  "business_hours": {
    "monday":    { "start": "09:00", "end": "17:00", "enabled": true },
    "tuesday":   { "start": "09:00", "end": "17:00", "enabled": true },
    "wednesday": { "start": "09:00", "end": "17:00", "enabled": true },
    "thursday":  { "start": "09:00", "end": "17:00", "enabled": true },
    "friday":    { "start": "09:00", "end": "17:00", "enabled": true },
    "saturday":  { "start": "09:00", "end": "17:00", "enabled": false },
    "sunday":    { "start": "09:00", "end": "17:00", "enabled": false }
  },
  "default_max_concurrent_chats": 5
}
```

#### 5.1.4 Settings UI

**Location:** Dashboard → Settings → Human Handoff

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Settings > Human Handoff                                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  Enable Human Handoff                                    [  Toggle ]│    │
│  │                                                                      │    │
│  │  Allow customers to be transferred to human support agents when      │    │
│  │  the AI cannot help or when they request it.                         │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  ════════════════════════════════════════════════════════════════════════   │
│                                                                              │
│  HANDOFF TRIGGERS                                                            │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  How should handoff be triggered?                                            │
│                                                                              │
│  ○ Automatic only                                                            │
│    AI detects when to hand off based on confidence and keywords              │
│                                                                              │
│  ○ Manual only                                                               │
│    Customer must click "Talk to Human" button                                │
│                                                                              │
│  ● Both (Recommended)                                                        │
│    AI can trigger handoff AND customer can request it                        │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  ☐ Show "Talk to Human" button in widget                                     │
│    Display a visible button for customers to request human assistance        │
│    ⚠️ May reduce AI resolution rate                                          │
│                                                                              │
│  ════════════════════════════════════════════════════════════════════════   │
│                                                                              │
│  AUTOMATIC TRIGGER SETTINGS                                                  │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  ☑ Trigger on low AI confidence                                              │
│                                                                              │
│    Confidence threshold                                                      │
│    [═══════════●═══════════] 60%                                            │
│    Hand off when AI confidence falls below this threshold                    │
│                                                                              │
│  ☑ Trigger on keywords                                                       │
│                                                                              │
│    Keywords (hand off immediately when detected):                            │
│    ┌─────────────────────────────────────────────────────────────────┐      │
│    │ human, agent, person, speak to someone, talk to someone,        │      │
│    │ representative, real person                                      │      │
│    └─────────────────────────────────────────────────────────────────┘      │
│    [+ Add keyword]                                                           │
│                                                                              │
│  ════════════════════════════════════════════════════════════════════════   │
│                                                                              │
│  BUSINESS HOURS                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  ☑ Enable business hours                                                     │
│    Human handoff only available during these hours.                          │
│    Outside hours, customers can leave their email for follow-up.             │
│                                                                              │
│  Timezone: [America/New_York                              ▼]                 │
│                                                                              │
│  │ Day        │ Hours                    │ Enabled │                        │
│  │────────────│──────────────────────────│─────────│                        │
│  │ Monday     │ [09:00 ▼] - [17:00 ▼]   │   ☑     │                        │
│  │ Tuesday    │ [09:00 ▼] - [17:00 ▼]   │   ☑     │                        │
│  │ Wednesday  │ [09:00 ▼] - [17:00 ▼]   │   ☑     │                        │
│  │ Thursday   │ [09:00 ▼] - [17:00 ▼]   │   ☑     │                        │
│  │ Friday     │ [09:00 ▼] - [17:00 ▼]   │   ☑     │                        │
│  │ Saturday   │ [Closed]                 │   ☐     │                        │
│  │ Sunday     │ [Closed]                 │   ☐     │                        │
│                                                                              │
│  ════════════════════════════════════════════════════════════════════════   │
│                                                                              │
│  AGENT DEFAULTS                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  Default max concurrent chats per agent                                      │
│  [ 5 ▼]                                                                      │
│  New agents will have this limit by default. Can be adjusted per agent.      │
│                                                                              │
│                                              [Cancel]  [Save Changes]        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 5.1.5 Validation Rules

| Field | Validation |
|-------|------------|
| `low_confidence_threshold` | Must be between 0.0 and 1.0 |
| `keywords` | Non-empty array, each keyword trimmed and lowercase |
| `timezone` | Must be valid IANA timezone |
| `business_hours.*.start/end` | Must be valid HH:MM format, start < end |
| `default_max_concurrent_chats` | Must be between 1 and 50 |

---

### 5.2 Conversation State Management

#### 5.2.1 Overview

Conversations move through defined states based on customer actions, agent actions, and system events.

#### 5.2.2 Conversation States

| State | Description | Who Can See | Next States |
|-------|-------------|-------------|-------------|
| `ai_active` | Customer chatting with AI | Customer, AI | `waiting`, `closed` |
| `waiting` | Awaiting agent assignment | Customer, All Agents | `agent_active`, `closed` |
| `agent_active` | Live chat with assigned agent | Customer, Assigned Agent | `resolved`, `waiting` |
| `resolved` | Marked as resolved | Customer, Agent who resolved | `closed`, `agent_active` |
| `closed` | Conversation ended | Archive only | (terminal state) |

#### 5.2.3 State Machine

```
                              ┌─────────────────────────────────────────┐
                              │                                         │
                              ▼                                         │
┌─────────────┐  handoff   ┌─────────────┐  agent    ┌──────────────┐  │
│  ai_active  │───────────▶│   waiting   │──claims──▶│ agent_active │  │
│             │            │  (queued)   │           │              │  │
└──────┬──────┘            └──────┬──────┘           └───────┬──────┘  │
       │                          │                          │         │
       │ customer                 │ customer                 │ agent   │
       │ closes                   │ closes                   │ resolves│
       │                          │                          │         │
       │                          │                          ▼         │
       │                          │                   ┌──────────────┐ │
       │                          │                   │   resolved   │ │
       │                          │                   └───────┬──────┘ │
       │                          │                           │        │
       │                          │    ┌──────────────────────┘        │
       │                          │    │ customer                      │
       │                          │    │ reopens                       │
       │                          │    │                               │
       ▼                          ▼    ▼                               │
┌─────────────────────────────────────────────────────────────────┐   │
│                           closed                                 │   │
│                      (terminal state)                            │───┘
└─────────────────────────────────────────────────────────────────┘
                              ▲
                              │
                    auto-close after 24h
                       of inactivity
```

#### 5.2.4 State Transition Rules

| From | To | Trigger | Conditions |
|------|----|---------|------------|
| `ai_active` | `waiting` | Handoff triggered | Handoff enabled, within business hours |
| `ai_active` | `closed` | Customer closes | Customer clicks close button |
| `ai_active` | `closed` | Timeout | No activity for 24 hours |
| `waiting` | `agent_active` | Agent claims | Agent has capacity, conversation not already claimed |
| `waiting` | `closed` | Customer closes | Customer clicks close button |
| `waiting` | `closed` | Timeout | No activity for 24 hours |
| `agent_active` | `resolved` | Agent resolves | Agent clicks resolve |
| `agent_active` | `waiting` | Agent transfers | Agent releases without resolving |
| `resolved` | `agent_active` | Customer replies | Customer sends new message |
| `resolved` | `closed` | Auto-close | 24 hours after resolution |
| `closed` | (none) | Terminal | Cannot transition out |

#### 5.2.5 Conversation Data Model

```typescript
interface Conversation {
  id: string;                    // UUID
  project_id: string;            // FK to projects

  // Status
  status: 'ai_active' | 'waiting' | 'agent_active' | 'resolved' | 'closed';

  // Customer identification
  visitor_id: string;            // Anonymous visitor ID
  customer_email: string | null; // If collected
  customer_name: string | null;  // If collected

  // Assignment
  assigned_agent_id: string | null;  // FK to users (when agent_active)

  // Handoff metadata
  handoff_reason: string | null;     // 'low_confidence', 'keyword', 'customer_request', 'button_click'
  handoff_triggered_at: Date | null;
  ai_confidence_at_handoff: number | null;  // Last AI confidence before handoff
  trigger_keyword: string | null;    // Which keyword triggered (if keyword trigger)

  // Queue tracking
  queue_entered_at: Date | null;     // When entered waiting queue
  queue_position: number | null;     // Calculated, not stored

  // Agent interaction
  claimed_at: Date | null;           // When agent claimed
  first_response_at: Date | null;    // When agent first responded
  resolved_at: Date | null;

  // Satisfaction
  satisfaction_rating: number | null;  // 1-5 scale
  satisfaction_feedback: string | null;

  // Metadata
  source: 'widget' | 'playground' | 'mcp' | 'api' | 'voice';
  metadata: {
    browser?: string;
    os?: string;
    page_url?: string;
    referrer?: string;
    [key: string]: any;
  };

  // Timestamps
  created_at: Date;
  updated_at: Date;
  last_message_at: Date;
}
```

---

### 5.3 Agent Availability & Capacity System

#### 5.3.1 Overview

Track which agents are online, their current workload, and their capacity to handle new conversations.

#### 5.3.2 Agent Status States

| Status | Description | Can Receive Chats | Visible to Team |
|--------|-------------|-------------------|-----------------|
| `online` | Available and working | Yes (if under limit) | Yes, with chat count |
| `away` | Temporarily unavailable | No | Yes, shown as away |
| `offline` | Not working | No | No |

#### 5.3.3 Capacity Model

```typescript
interface AgentAvailability {
  id: string;                    // UUID
  user_id: string;               // FK to users
  project_id: string;            // FK to projects (agent can have different settings per project)

  // Status
  status: 'online' | 'away' | 'offline';

  // Capacity
  max_concurrent_chats: number;  // Limit for this agent (default from project settings)
  current_chat_count: number;    // Currently assigned active conversations

  // Computed (not stored)
  available_slots: number;       // max_concurrent_chats - current_chat_count
  can_receive_chats: boolean;    // status === 'online' && available_slots > 0

  // Tracking
  last_seen_at: Date;            // Heartbeat timestamp
  last_assigned_at: Date | null; // When last received a chat (for round-robin tie-breaking)
  status_changed_at: Date;       // When status last changed

  // Auto-offline
  auto_offline_enabled: boolean; // Auto-set offline after inactivity
  auto_offline_minutes: number;  // Inactivity threshold (default: 30)
}
```

#### 5.3.4 Capacity Rules

```
Agent can receive new chat IF:
  1. status = 'online'
  2. current_chat_count < max_concurrent_chats
  3. last_seen_at within last 5 minutes (heartbeat check)

When agent receives new chat:
  → current_chat_count += 1
  → last_assigned_at = NOW()

When conversation moves OUT of agent_active (resolved, closed, transferred):
  → current_chat_count -= 1

When agent goes offline/away:
  → Active conversations remain assigned (agent can still respond)
  → No new conversations assigned
  → Team sees agent as unavailable
```

#### 5.3.5 Heartbeat System

Agents must send periodic heartbeats to confirm they're still active:

```typescript
// Client sends heartbeat every 30 seconds
POST /api/agent/heartbeat
{
  "project_id": "xxx"
}

// Server updates last_seen_at
// If no heartbeat for 5 minutes AND auto_offline_enabled:
//   → status = 'offline'
```

#### 5.3.6 Agent Status UI (Dashboard Header)

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│  [●] Online ▼               3/5 chats              Agent Name   │
│                                                                  │
│  Dropdown:                                                       │
│  ┌────────────────────────────────────────┐                     │
│  │ ● Online                               │                     │
│  │   Accept new conversations             │                     │
│  │                                        │                     │
│  │ ◐ Away                                 │                     │
│  │   Pause new conversations              │                     │
│  │                                        │                     │
│  │ ○ Offline                              │                     │
│  │   Not accepting chats                  │                     │
│  │                                        │                     │
│  │ ────────────────────────────────────── │                     │
│  │ Your limit: 5 concurrent chats         │                     │
│  │ [Change in settings]                   │                     │
│  └────────────────────────────────────────┘                     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

### 5.4 Queue Management System

#### 5.4.1 Overview

When all agents are at capacity or offline, conversations enter a queue. Queue is processed FIFO (First In, First Out) with automatic assignment when agents become available.

#### 5.4.2 Queue Entry Conditions

Conversation enters queue (`status = 'waiting'`) when:
1. Handoff is triggered (auto or manual)
2. Handoff is enabled for the project
3. Within business hours (if business hours enabled)
4. No agent with available capacity exists

#### 5.4.3 Queue Position Calculation

```sql
-- Real-time queue position for a conversation
SELECT COUNT(*) + 1 as position
FROM conversations
WHERE project_id = $project_id
  AND status = 'waiting'
  AND queue_entered_at < $this_conversation_queue_entered_at
ORDER BY queue_entered_at ASC;
```

Position is calculated dynamically, not stored (to avoid update cascades).

#### 5.4.4 Queue Processing Algorithm

```typescript
async function processQueue(projectId: string): Promise<void> {
  // Called when:
  // 1. Agent becomes available (status → online, or finishes a chat)
  // 2. New agent signs in
  // 3. Periodically (every 10 seconds as fallback)

  while (true) {
    // Find agent with most available capacity
    const agent = await findBestAvailableAgent(projectId);
    if (!agent) break;  // No agents available

    // Find oldest waiting conversation
    const conversation = await getNextInQueue(projectId);
    if (!conversation) break;  // Queue is empty

    // Attempt assignment (with locking to prevent race conditions)
    const assigned = await attemptAssignment(conversation.id, agent.user_id);
    if (!assigned) continue;  // Race condition, try next

    // Notify agent and customer
    await notifyAssignment(conversation.id, agent.user_id);
  }
}

async function getNextInQueue(projectId: string): Promise<Conversation | null> {
  const result = await db.query(`
    SELECT * FROM conversations
    WHERE project_id = $1
      AND status = 'waiting'
    ORDER BY queue_entered_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED
  `, [projectId]);

  return result.rows[0] || null;
}
```

#### 5.4.5 Queue Visibility

**Customer sees:**
```
┌─────────────────────────────────────────┐
│                                          │
│  ⏳ Connecting you to support...         │
│                                          │
│  You're #3 in queue                      │
│  Estimated wait: ~2 minutes              │
│                                          │
│  While you wait, you can:                │
│  • Continue chatting with AI             │
│  • Leave your email for callback         │
│                                          │
└─────────────────────────────────────────┘
```

**Agent sees (in inbox):**
```
┌─────────────────────────────────────────┐
│  QUEUE                                   │
│  ───────────────────────────────         │
│                                          │
│  🔴 3 waiting                            │
│                                          │
│  1. John D. - "Can't login" (5 min)     │
│  2. Sarah M. - "Billing issue" (3 min)  │
│  3. Alex T. - "API error" (1 min)       │
│                                          │
└─────────────────────────────────────────┘
```

#### 5.4.6 Estimated Wait Time Calculation

```typescript
function estimateWaitTime(queuePosition: number, projectId: string): number {
  // Get average handling time for this project (last 7 days)
  const avgHandlingMinutes = await getAverageHandlingTime(projectId);  // e.g., 5 min

  // Get number of online agents with capacity
  const availableAgents = await countAvailableAgents(projectId);  // e.g., 2

  if (availableAgents === 0) {
    return -1;  // Unknown / agents offline
  }

  // Simple estimation: position * avgTime / agents
  const estimatedMinutes = Math.ceil((queuePosition * avgHandlingMinutes) / availableAgents);

  return estimatedMinutes;
}
```

---

### 5.5 Assignment Algorithm

#### 5.5.1 Overview

Based on industry research (Zendesk, Intercom), we implement **Balanced Assignment** - conversations are assigned to the agent with the most available capacity.

#### 5.5.2 Assignment Strategy: Balanced Assignment

```typescript
async function findBestAvailableAgent(projectId: string): Promise<AgentAvailability | null> {
  const result = await db.query(`
    SELECT
      aa.*,
      (aa.max_concurrent_chats - aa.current_chat_count) as available_slots
    FROM agent_availability aa
    WHERE aa.project_id = $1
      AND aa.status = 'online'
      AND aa.current_chat_count < aa.max_concurrent_chats
      AND aa.last_seen_at > NOW() - INTERVAL '5 minutes'  -- Heartbeat check
    ORDER BY
      available_slots DESC,           -- Most free capacity first
      aa.last_assigned_at ASC NULLS FIRST  -- Tie-breaker: longest without assignment
    LIMIT 1
    FOR UPDATE SKIP LOCKED  -- Prevent race conditions
  `, [projectId]);

  return result.rows[0] || null;
}
```

**Why Balanced Assignment:**
- Prevents agent burnout (doesn't overload one agent)
- Respects individual capacity limits
- Fair distribution based on current workload
- Used by Intercom for support teams

#### 5.5.3 Race Condition Prevention

**Problem:** Two processes try to assign the same conversation simultaneously.

**Solution:** PostgreSQL row-level locking with `FOR UPDATE SKIP LOCKED`

```typescript
async function attemptAssignment(conversationId: string, agentId: string): Promise<boolean> {
  return await db.transaction(async (tx) => {
    // Step 1: Lock and verify conversation is still waiting
    const conv = await tx.query(`
      SELECT id FROM conversations
      WHERE id = $1
        AND status = 'waiting'
        AND assigned_agent_id IS NULL
      FOR UPDATE SKIP LOCKED
    `, [conversationId]);

    if (conv.rows.length === 0) {
      // Already assigned or status changed
      return false;
    }

    // Step 2: Lock and verify agent still has capacity
    const agent = await tx.query(`
      SELECT * FROM agent_availability
      WHERE user_id = $1
        AND status = 'online'
        AND current_chat_count < max_concurrent_chats
      FOR UPDATE SKIP LOCKED
    `, [agentId]);

    if (agent.rows.length === 0) {
      // Agent no longer available
      return false;
    }

    // Step 3: Perform assignment
    await tx.query(`
      UPDATE conversations
      SET
        assigned_agent_id = $2,
        status = 'agent_active',
        claimed_at = NOW()
      WHERE id = $1
    `, [conversationId, agentId]);

    // Step 4: Increment agent's chat count
    await tx.query(`
      UPDATE agent_availability
      SET
        current_chat_count = current_chat_count + 1,
        last_assigned_at = NOW()
      WHERE user_id = $1
    `, [agentId]);

    return true;
  });
}
```

#### 5.5.4 Manual Claim (Agent-Initiated)

Agents can also manually claim conversations from the queue:

```typescript
async function claimConversation(conversationId: string, agentId: string): Promise<Result> {
  // Verify agent has permission to access this project
  const hasAccess = await verifyProjectAccess(agentId, conversationId);
  if (!hasAccess) {
    return { success: false, error: 'ACCESS_DENIED' };
  }

  // Attempt assignment (same atomic operation)
  const assigned = await attemptAssignment(conversationId, agentId);

  if (!assigned) {
    return { success: false, error: 'ALREADY_CLAIMED_OR_NO_CAPACITY' };
  }

  return { success: true };
}
```

#### 5.5.5 Assignment Events

When assignment occurs, broadcast events:

```typescript
// To customer (via their widget channel)
{
  event: 'agent_assigned',
  data: {
    conversation_id: 'xxx',
    agent: {
      name: 'Sarah',
      avatar_url: '...'
    }
  }
}

// To assigned agent (via dashboard channel)
{
  event: 'conversation_assigned',
  data: {
    conversation_id: 'xxx',
    customer_name: 'John',
    preview: 'I need help with...',
    waiting_time_seconds: 120
  }
}

// To all agents (for queue update)
{
  event: 'queue_updated',
  data: {
    waiting_count: 2
  }
}
```

---

### 5.6 Widget Changes

#### 5.6.1 Overview

The widget needs to handle new states for human handoff: waiting for agent, live chat with agent, offline mode.

#### 5.6.2 Widget Conversation States

```typescript
type WidgetConversationState =
  | 'ai_chat'            // Default: talking to AI
  | 'handoff_requested'  // Handoff triggered, checking availability
  | 'waiting_for_agent'  // In queue, waiting for agent
  | 'agent_chat'         // Live chat with human agent
  | 'offline_mode'       // Outside business hours
  | 'resolved';          // Conversation resolved
```

#### 5.6.3 State-Based UI Rendering

```typescript
function renderWidgetHeader(state: WidgetConversationState, context: any) {
  switch (state) {
    case 'ai_chat':
      return (
        <Header>
          <BotIcon />
          <Title>AI Assistant</Title>
        </Header>
      );

    case 'handoff_requested':
      return (
        <Header className="bg-blue-50">
          <Spinner />
          <Title>Connecting to support...</Title>
        </Header>
      );

    case 'waiting_for_agent':
      return (
        <Header className="bg-yellow-50">
          <ClockIcon />
          <Title>In Queue</Title>
          <Subtitle>Position #{context.queuePosition} • ~{context.estimatedWait} min</Subtitle>
        </Header>
      );

    case 'agent_chat':
      return (
        <Header className="bg-green-50">
          <Avatar src={context.agent.avatar_url} />
          <Title>Chatting with {context.agent.name}</Title>
          <OnlineIndicator />
        </Header>
      );

    case 'offline_mode':
      return (
        <Header className="bg-slate-50">
          <MoonIcon />
          <Title>We're offline</Title>
          <Subtitle>Leave a message and we'll respond soon</Subtitle>
        </Header>
      );

    case 'resolved':
      return (
        <Header className="bg-green-50">
          <CheckIcon />
          <Title>Resolved</Title>
          <Subtitle>Thanks for chatting!</Subtitle>
        </Header>
      );
  }
}
```

#### 5.6.4 "Talk to Human" Button

When `show_human_button` is enabled in settings:

```
┌─────────────────────────────────────────┐
│                                          │
│  [Message input field            ]       │
│                                          │
│  ────────────────────────────────────    │
│                                          │
│  [Talk to a human →]                     │
│                                          │
└─────────────────────────────────────────┘
```

**Button behavior:**
- Visible only when `handoff_enabled && show_human_button`
- Hidden during `waiting_for_agent` and `agent_chat` states
- Clicking triggers handoff request

#### 5.6.5 Queue Position Display

```
┌─────────────────────────────────────────┐
│  ⏳ In Queue                             │
├─────────────────────────────────────────┤
│                                          │
│        You're #2 in line                 │
│                                          │
│        ████████░░░░░░░░░░░               │
│                                          │
│        Estimated wait: ~3 minutes        │
│                                          │
│  ────────────────────────────────────    │
│                                          │
│  While you wait, our AI can still help:  │
│                                          │
│  [Continue with AI]   [Stay in queue]    │
│                                          │
└─────────────────────────────────────────┘
```

#### 5.6.6 Agent Joined Transition

When agent is assigned, show smooth transition:

```
┌─────────────────────────────────────────┐
│  🟢 Sarah has joined the chat           │
├─────────────────────────────────────────┤
│                                          │
│  ─── Previous conversation with AI ───  │
│                                          │
│  🤖 AI: How can I help you today?       │
│                                          │
│  👤 You: I can't login to my account    │
│                                          │
│  🤖 AI: I found some troubleshooting    │
│     steps...                             │
│                                          │
│  👤 You: That didn't work. Can I talk   │
│     to someone?                          │
│                                          │
│  ─── Sarah joined ─────────────────────  │
│                                          │
│  👩 Sarah: Hi! I can see you're having  │
│     login issues. Let me check your     │
│     account right now.                   │
│                                          │
└─────────────────────────────────────────┘
```

#### 5.6.7 Real-time Connection

Widget establishes WebSocket connection for real-time updates:

```typescript
// Widget connects to Supabase Realtime
const channel = supabase
  .channel(`conversation:${conversationId}`)
  .on('broadcast', { event: 'message' }, handleNewMessage)
  .on('broadcast', { event: 'agent_assigned' }, handleAgentAssigned)
  .on('broadcast', { event: 'agent_typing' }, handleAgentTyping)
  .on('broadcast', { event: 'status_changed' }, handleStatusChanged)
  .on('broadcast', { event: 'queue_position' }, handleQueueUpdate)
  .subscribe();
```

#### 5.6.8 Offline Mode UI

When outside business hours:

```
┌─────────────────────────────────────────┐
│  😴 We're currently offline              │
├─────────────────────────────────────────┤
│                                          │
│  Our team is available:                  │
│  Mon-Fri, 9 AM - 5 PM EST               │
│                                          │
│  ────────────────────────────────────    │
│                                          │
│  Leave your email and we'll get back    │
│  to you when we're online:              │
│                                          │
│  ┌─────────────────────────────────┐    │
│  │ your@email.com                  │    │
│  └─────────────────────────────────┘    │
│                                          │
│  Your message:                           │
│  ┌─────────────────────────────────┐    │
│  │ I need help with...             │    │
│  │                                  │    │
│  └─────────────────────────────────┘    │
│                                          │
│  [Submit]                                │
│                                          │
│  ────────────────────────────────────    │
│                                          │
│  Or continue chatting with our AI:       │
│  [Chat with AI instead]                  │
│                                          │
└─────────────────────────────────────────┘
```

---

### 5.7 Agent Dashboard

#### 5.7.1 Overview

A new dashboard interface for support agents to manage conversations, view queue, and respond to customers.

#### 5.7.2 Dashboard Layout

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  SupportBase                              [●] Online ▼  3/5 chats   [Sarah] │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────┐  ┌───────────────────────────────┐  ┌────────────────┐ │
│  │                 │  │                               │  │                │ │
│  │   SIDEBAR       │  │      CONVERSATION VIEW        │  │  CONTEXT       │ │
│  │   (240px)       │  │      (flex-grow)              │  │  PANEL         │ │
│  │                 │  │                               │  │  (280px)       │ │
│  │  • Filters      │  │  • Message history            │  │                │ │
│  │  • Queue        │  │  • Real-time chat             │  │  • Customer    │ │
│  │  • My Chats     │  │  • Input field                │  │    info        │ │
│  │  • Team         │  │  • Actions (resolve, etc.)    │  │  • AI context  │ │
│  │                 │  │                               │  │  • Quick       │ │
│  │                 │  │                               │  │    actions     │ │
│  │                 │  │                               │  │                │ │
│  └─────────────────┘  └───────────────────────────────┘  └────────────────┘ │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 5.7.3 Sidebar: Conversation List

```
┌─────────────────────────┐
│  INBOX                  │
├─────────────────────────┤
│                         │
│  [All] [Mine] [Queue]   │
│                         │
│  ─────────────────────  │
│                         │
│  QUEUE (3)          ▼   │
│  ─────────────────────  │
│                         │
│  🔴 John D.        5m   │
│  "Can't login to..."    │
│                         │
│  🔴 Sarah M.       3m   │
│  "Billing question"     │
│                         │
│  🔴 Alex T.        1m   │
│  "API returns 500"      │
│                         │
│  ─────────────────────  │
│                         │
│  MY CHATS (2)       ▼   │
│  ─────────────────────  │
│                         │
│  🟢 Mike P.    Active   │
│  "Thanks for..."        │
│                         │
│  🟢 Lisa R.    Active   │
│  "How do I..."          │
│                         │
│  ─────────────────────  │
│                         │
│  TEAM               ▼   │
│  ─────────────────────  │
│                         │
│  🟢 You         3 chats │
│  🟢 Mike        2 chats │
│  🟡 Lisa        Away    │
│  ⚫ Tom         Offline │
│                         │
└─────────────────────────┘
```

#### 5.7.4 Conversation View

```
┌─────────────────────────────────────────────────────────────────┐
│  John Davidson                              [Resolve ▼] [Close] │
│  john@example.com                                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ─── Conversation started 10:23 AM ───                          │
│                                                                  │
│  🤖 AI Assistant                                      10:23 AM  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Hi! How can I help you today?                            │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│                                                       10:24 AM  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ I can't login to my account. I've tried resetting my     │ 👤│
│  │ password but the reset email never arrives.              │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  🤖 AI Assistant                                      10:24 AM  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ I found some troubleshooting steps for password reset    │   │
│  │ issues. Here's what you can try:                         │   │
│  │                                                          │   │
│  │ 1. Check your spam folder                                │   │
│  │ 2. Make sure you're using the correct email              │   │
│  │ 3. Try the "Forgot Password" link again                  │   │
│  │                                                          │   │
│  │ Did this help?                                           │   │
│  │                                                          │   │
│  │ 📊 Confidence: 72%                                       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│                                                       10:25 AM  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ No, I already tried all of that. Can I talk to a real   │ 👤│
│  │ person please?                                           │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ─── 🔀 Handed off to you (keyword: "real person") ───         │
│                                                                  │
│  👩 You                                               10:26 AM  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Hi John! I can see you've been having trouble with       │   │
│  │ password reset. Let me check your account directly.      │   │
│  │                                                          │   │
│  │ Can you confirm the email address you're using?          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ────────────────────────────────────────────────────────────   │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Type your message...                                     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  [📎 Attach]  [📝 Canned]  [🔗 Link]              [Send →]      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

#### 5.7.5 Context Panel

```
┌────────────────────────────┐
│  CUSTOMER                  │
├────────────────────────────┤
│                            │
│  [Avatar]                  │
│  John Davidson             │
│  john@example.com    [📋]  │
│                            │
│  ──────────────────────    │
│                            │
│  First seen                │
│  Jan 10, 2025              │
│                            │
│  Total conversations       │
│  3                         │
│                            │
│  Source                    │
│  Widget (Dashboard page)   │
│                            │
│  Browser                   │
│  Chrome 120 / macOS        │
│                            │
├────────────────────────────┤
│  AI CONTEXT                │
├────────────────────────────┤
│                            │
│  Handoff reason            │
│  🏷️ Keyword: "real person" │
│                            │
│  AI confidence             │
│  72% (at handoff)          │
│                            │
│  Topics discussed          │
│  • Password reset          │
│  • Email not received      │
│                            │
│  AI attempts               │
│  2 responses before        │
│  handoff                   │
│                            │
├────────────────────────────┤
│  QUICK ACTIONS             │
├────────────────────────────┤
│                            │
│  [🔑 Reset Password]       │
│  [👤 View Account]         │
│  [📧 Send Reset Email]     │
│  [📋 View Full Profile]    │
│                            │
└────────────────────────────┘
```

#### 5.7.6 Empty State (No Conversation Selected)

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│                                                                  │
│                         [💬]                                     │
│                                                                  │
│              Select a conversation                               │
│                                                                  │
│       Click on a conversation from the sidebar                   │
│       to start responding to customers.                          │
│                                                                  │
│                                                                  │
│       ─────────────────────────────────────                      │
│                                                                  │
│       📊 Today's Stats                                           │
│                                                                  │
│       Resolved: 12    Avg Response: 45s    CSAT: 4.8            │
│                                                                  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

#### 5.7.7 Actions Menu

```
┌─────────────────────────────┐
│  [Resolve ▼]                │
├─────────────────────────────┤
│                             │
│  ✅ Resolve                 │
│     Mark as solved          │
│                             │
│  🔄 Transfer                │
│     Move to another agent   │
│                             │
│  🏷️ Add Tags                │
│     Categorize this chat    │
│                             │
│  📝 Add Note                │
│     Internal note (hidden)  │
│                             │
│  ─────────────────────────  │
│                             │
│  🚫 Mark as Spam            │
│                             │
└─────────────────────────────┘
```

---

### 5.8 Business Hours System

#### 5.8.1 Overview

Control when human handoff is available based on configured business hours.

#### 5.8.2 Business Hours Check Logic

```typescript
function isWithinBusinessHours(settings: HandoffSettings): boolean {
  if (!settings.business_hours_enabled) {
    return true;  // Always available if not enabled
  }

  const now = DateTime.now().setZone(settings.timezone);
  const dayOfWeek = now.weekdayLong.toLowerCase();  // 'monday', 'tuesday', etc.

  const todayHours = settings.business_hours[dayOfWeek];

  if (!todayHours.enabled) {
    return false;  // Closed today
  }

  const currentTime = now.toFormat('HH:mm');
  return currentTime >= todayHours.start && currentTime <= todayHours.end;
}
```

#### 5.8.3 Business Hours Behavior Matrix

| Business Hours Enabled | Within Hours | Agent Available | Result |
|------------------------|--------------|-----------------|--------|
| No | - | - | Handoff available (if enabled) |
| Yes | Yes | Yes | Assign to agent |
| Yes | Yes | No | Add to queue |
| Yes | No | - | Show offline form |

#### 5.8.4 Offline Form Submission

When outside business hours, capture customer info:

```typescript
interface OfflineSubmission {
  conversation_id: string;
  customer_email: string;
  customer_name: string | null;
  message: string;
  submitted_at: Date;
}

// Queues conversation for team to handle when they come online
async function handleOfflineSubmission(data: OfflineSubmission) {
  // Update conversation with customer info
  await updateConversation(data.conversation_id, {
    customer_email: data.customer_email,
    customer_name: data.customer_name,
    status: 'waiting',  // Will be picked up when team comes online
  });

  // Add message to conversation
  await addMessage({
    conversation_id: data.conversation_id,
    sender_type: 'customer',
    content: data.message,
  });

  // Optionally create a lead capture record
  await createLeadCapture({
    project_id: conversation.project_id,
    session_id: data.conversation_id,
    user_email: data.customer_email,
    question: data.message,
  });

  // Send confirmation email to customer
  await sendOfflineConfirmationEmail(data.customer_email);
}
```

---

### 5.9 Real-time Architecture

#### 5.9.1 Overview

Use Supabase Realtime for WebSocket connections, enabling instant message delivery and status updates.

#### 5.9.2 Channel Structure

```
Channels:
├── conversation:{conversation_id}     # Per-conversation channel
│   ├── Customer widget subscribes
│   └── Assigned agent subscribes
│
├── project:{project_id}:agents        # Project-wide agent channel
│   ├── All agents for this project subscribe
│   ├── Queue updates
│   └── New conversation notifications
│
└── presence:{project_id}              # Agent presence tracking
    └── Tracks who is online/away/offline
```

#### 5.9.3 Event Types

**Conversation Channel Events:**

| Event | Sender | Receivers | Payload |
|-------|--------|-----------|---------|
| `message` | Customer/Agent | Both | `{ message: Message }` |
| `typing` | Customer/Agent | Other party | `{ user_type, is_typing }` |
| `agent_assigned` | System | Customer | `{ agent: { name, avatar } }` |
| `status_changed` | System | Both | `{ old_status, new_status }` |
| `resolved` | Agent | Customer | `{ resolved_by, show_rating }` |

**Project Agent Channel Events:**

| Event | Sender | Receivers | Payload |
|-------|--------|-----------|---------|
| `queue_updated` | System | All agents | `{ waiting_count }` |
| `new_conversation` | System | All agents | `{ conversation: ConversationPreview }` |
| `conversation_claimed` | System | All agents | `{ conversation_id, agent_id }` |

**Presence Events:**

| Event | Description |
|-------|-------------|
| `join` | Agent came online |
| `leave` | Agent went offline |
| `sync` | Full state sync |

#### 5.9.4 Supabase Realtime Implementation

```typescript
// Agent Dashboard: Subscribe to project channel
function subscribeToProjectChannel(projectId: string) {
  const channel = supabase
    .channel(`project:${projectId}:agents`)
    .on('broadcast', { event: 'queue_updated' }, ({ payload }) => {
      updateQueueCount(payload.waiting_count);
    })
    .on('broadcast', { event: 'new_conversation' }, ({ payload }) => {
      addToConversationList(payload.conversation);
      playNotificationSound();
    })
    .on('broadcast', { event: 'conversation_claimed' }, ({ payload }) => {
      removeFromQueue(payload.conversation_id);
    })
    .subscribe();

  return channel;
}

// Agent Dashboard: Subscribe to specific conversation
function subscribeToConversation(conversationId: string) {
  const channel = supabase
    .channel(`conversation:${conversationId}`)
    .on('broadcast', { event: 'message' }, ({ payload }) => {
      addMessage(payload.message);
      scrollToBottom();
    })
    .on('broadcast', { event: 'typing' }, ({ payload }) => {
      showTypingIndicator(payload.user_type, payload.is_typing);
    })
    .subscribe();

  return channel;
}

// Agent Presence
function setupPresence(projectId: string, userId: string) {
  const channel = supabase
    .channel(`presence:${projectId}`)
    .on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      updateTeamStatus(state);
    })
    .on('presence', { event: 'join' }, ({ key, newPresences }) => {
      handleAgentJoined(newPresences);
    })
    .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
      handleAgentLeft(leftPresences);
    })
    .subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({
          user_id: userId,
          status: 'online',
          online_at: new Date().toISOString(),
        });
      }
    });

  return channel;
}
```

#### 5.9.5 Message Broadcasting

```typescript
// When agent sends a message
async function sendAgentMessage(conversationId: string, content: string, agentId: string) {
  // 1. Save to database
  const message = await db.messages.create({
    conversation_id: conversationId,
    sender_type: 'agent',
    sender_id: agentId,
    content: content,
  });

  // 2. Update conversation timestamp
  await db.conversations.update(conversationId, {
    last_message_at: new Date(),
    updated_at: new Date(),
  });

  // 3. Broadcast to conversation channel
  await supabase
    .channel(`conversation:${conversationId}`)
    .send({
      type: 'broadcast',
      event: 'message',
      payload: { message },
    });

  return message;
}
```

#### 5.9.6 Connection Handling

```typescript
// Widget: Handle connection states
function setupWidgetConnection(conversationId: string) {
  let reconnectAttempts = 0;
  const maxReconnectAttempts = 5;

  const channel = supabase.channel(`conversation:${conversationId}`);

  channel.subscribe((status, err) => {
    switch (status) {
      case 'SUBSCRIBED':
        reconnectAttempts = 0;
        showConnectionStatus('connected');
        break;

      case 'CLOSED':
        showConnectionStatus('disconnected');
        attemptReconnect();
        break;

      case 'CHANNEL_ERROR':
        console.error('Channel error:', err);
        showConnectionStatus('error');
        attemptReconnect();
        break;
    }
  });

  function attemptReconnect() {
    if (reconnectAttempts >= maxReconnectAttempts) {
      showConnectionStatus('failed');
      return;
    }

    reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);

    setTimeout(() => {
      channel.subscribe();
    }, delay);
  }

  return channel;
}
```

---

### 5.10 Availability-Aware Handoff Logic

#### 5.10.1 Overview

**Critical Rule:** The "Talk to Human" button and auto-handoff should ONLY be available when someone can actually respond. Showing handoff options when no one is available creates terrible customer experience (customer waiting forever).

#### 5.10.2 Handoff Availability Check

Handoff is truly "available" ONLY when ALL conditions are met:

```typescript
interface HandoffAvailabilityResult {
  available: boolean;
  reason?: 'disabled' | 'no_agents' | 'all_offline' | 'outside_hours';
  show_button: boolean;
  show_offline_form: boolean;
}

async function checkHandoffAvailability(projectId: string): Promise<HandoffAvailabilityResult> {
  // 1. Check if handoff is enabled
  const settings = await getHandoffSettings(projectId);
  if (!settings.enabled) {
    return {
      available: false,
      reason: 'disabled',
      show_button: false,
      show_offline_form: false
    };
  }

  // 2. Check if any agents exist for this project
  const agentCount = await countProjectAgents(projectId);
  if (agentCount === 0) {
    // No agents exist - treat as handoff disabled
    return {
      available: false,
      reason: 'no_agents',
      show_button: false,
      show_offline_form: false
    };
  }

  // 3. Check business hours (if enabled)
  if (settings.business_hours_enabled) {
    const withinHours = isWithinBusinessHours(settings);
    if (!withinHours) {
      return {
        available: false,
        reason: 'outside_hours',
        show_button: false,
        show_offline_form: true  // Show offline form
      };
    }
  }

  // 4. Check if at least one agent is ONLINE
  const onlineAgentCount = await countOnlineAgents(projectId);
  if (onlineAgentCount === 0) {
    // Agents exist but none are online - treat as handoff unavailable
    return {
      available: false,
      reason: 'all_offline',
      show_button: false,
      show_offline_form: settings.business_hours_enabled  // Only if hours configured
    };
  }

  // All checks passed - handoff is available
  return {
    available: true,
    show_button: settings.show_human_button,
    show_offline_form: false
  };
}
```

#### 5.10.3 Availability Decision Matrix

| Handoff Enabled | Agents Exist | Business Hours | Any Agent Online | Result |
|-----------------|--------------|----------------|------------------|--------|
| ❌ No | - | - | - | AI only, no button |
| ✅ Yes | ❌ No | - | - | AI only, no button (⚠️ warn owner) |
| ✅ Yes | ✅ Yes | ❌ Disabled | ❌ No | AI only, no button |
| ✅ Yes | ✅ Yes | ❌ Disabled | ✅ Yes | ✅ **Show button** |
| ✅ Yes | ✅ Yes | ✅ Outside hours | - | Show offline form |
| ✅ Yes | ✅ Yes | ✅ Within hours | ❌ No | AI only, no button |
| ✅ Yes | ✅ Yes | ✅ Within hours | ✅ Yes | ✅ **Show button** |

#### 5.10.4 Widget Behavior Based on Availability

```typescript
// Widget checks availability on load and periodically
function updateWidgetState(availability: HandoffAvailabilityResult) {
  if (availability.available && availability.show_button) {
    // Show "Talk to Human" button
    showHumanButton();
    enableAutoHandoffTriggers();
  } else if (availability.show_offline_form) {
    // Outside business hours - show offline option
    showOfflineFormOption();
    disableAutoHandoffTriggers();
  } else {
    // Handoff not available - pure AI mode
    hideHumanButton();
    disableAutoHandoffTriggers();
  }
}

// Re-check every 60 seconds (agent might come online)
setInterval(() => {
  checkHandoffAvailability(projectId).then(updateWidgetState);
}, 60000);
```

#### 5.10.5 Owner Warning: No Agents Setup

When owner enables handoff but hasn't invited any agents:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ⚠️ Human Handoff Enabled - No Agents                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  You've enabled human handoff, but you haven't invited any team members     │
│  yet. The "Talk to Human" button won't appear to customers until at         │
│  least one agent is online.                                                 │
│                                                                              │
│  [Invite Your First Agent →]                                                │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 5.10.6 Real-time Availability Updates

When agent status changes, broadcast to all active widgets:

```typescript
// When agent goes online/offline
async function onAgentStatusChange(projectId: string) {
  const availability = await checkHandoffAvailability(projectId);

  // Broadcast to all active widget sessions for this project
  await supabase
    .channel(`project:${projectId}:widget`)
    .send({
      type: 'broadcast',
      event: 'availability_changed',
      payload: availability
    });
}
```

---

### 5.11 Customer Identification System

#### 5.11.1 Overview

Track customers across sessions using cookies, and link to email when provided. This enables:
- Agents see customer's conversation history
- Recognize returning customers
- Merge anonymous visits when email is provided
- Flag problematic customers

#### 5.11.2 Customer Lifecycle

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        CUSTOMER IDENTIFICATION FLOW                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   FIRST VISIT (Anonymous)                                                    │
│   ───────────────────────                                                    │
│   • Customer lands on page with widget                                       │
│   • Widget generates unique visitor_id (UUID)                               │
│   • Store in: localStorage + cookie (redundancy)                            │
│   • Cookie: sb_visitor_{project_id}                                         │
│   • Expiry: 1 year                                                          │
│                                                                              │
│            │                                                                 │
│            │ Customer starts conversation                                   │
│            ▼                                                                 │
│                                                                              │
│   ACTIVE VISITOR                                                             │
│   ──────────────                                                             │
│   • Has visitor_id (anonymous)                                              │
│   • Conversation history tracked                                            │
│   • Context collected: browser, device, pages, referrer                     │
│   • Still no email                                                          │
│                                                                              │
│            │                                                                 │
│            │ Customer provides email (chat, lead capture, handoff)          │
│            ▼                                                                 │
│                                                                              │
│   IDENTIFIED CUSTOMER                                                        │
│   ───────────────────                                                        │
│   • visitor_id linked to email                                              │
│   • All history preserved                                                   │
│   • Future visits (same device) auto-identified                             │
│   • Different device + same email → histories merged                        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 5.11.3 Technical Implementation: Widget Side

```typescript
// Widget: Initialize customer identification
class CustomerIdentifier {
  private projectId: string;
  private visitorId: string | null = null;

  constructor(projectId: string) {
    this.projectId = projectId;
    this.visitorId = this.getOrCreateVisitorId();
  }

  private getOrCreateVisitorId(): string {
    const cookieName = `sb_visitor_${this.projectId}`;
    const storageKey = `sb_visitor_${this.projectId}`;

    // Try localStorage first (more reliable)
    let visitorId = localStorage.getItem(storageKey);

    // Fall back to cookie
    if (!visitorId) {
      visitorId = this.getCookie(cookieName);
    }

    // Generate new ID if none exists
    if (!visitorId) {
      visitorId = this.generateUUID();
    }

    // Store in both locations for redundancy
    localStorage.setItem(storageKey, visitorId);
    this.setCookie(cookieName, visitorId, 365);

    return visitorId;
  }

  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  private setCookie(name: string, value: string, days: number): void {
    const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Lax`;
  }

  private getCookie(name: string): string | null {
    const match = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`));
    return match ? match[2] : null;
  }

  getVisitorId(): string {
    return this.visitorId!;
  }

  // Collect customer context
  getContext(): CustomerContext {
    return {
      visitor_id: this.visitorId!,
      browser: this.getBrowserInfo(),
      device: this.getDeviceType(),
      os: this.getOS(),
      page_url: window.location.href,
      page_title: document.title,
      referrer: document.referrer || null,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: navigator.language,
      screen_resolution: `${window.screen.width}x${window.screen.height}`
    };
  }

  private getBrowserInfo(): string {
    const ua = navigator.userAgent;
    if (ua.includes('Chrome')) return 'Chrome';
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Safari')) return 'Safari';
    if (ua.includes('Edge')) return 'Edge';
    return 'Other';
  }

  private getDeviceType(): string {
    const ua = navigator.userAgent;
    if (/Mobile|Android|iPhone/i.test(ua)) return 'Mobile';
    if (/Tablet|iPad/i.test(ua)) return 'Tablet';
    return 'Desktop';
  }

  private getOS(): string {
    const ua = navigator.userAgent;
    if (ua.includes('Windows')) return 'Windows';
    if (ua.includes('Mac')) return 'macOS';
    if (ua.includes('Linux')) return 'Linux';
    if (ua.includes('Android')) return 'Android';
    if (ua.includes('iOS') || ua.includes('iPhone')) return 'iOS';
    return 'Other';
  }
}
```

#### 5.11.4 Technical Implementation: Backend

```typescript
// Backend: Link email to visitor
async function linkEmailToVisitor(
  projectId: string,
  visitorId: string,
  email: string,
  name?: string
): Promise<Customer> {
  // Check if email already exists for this project
  const existingByEmail = await db.customers.findOne({
    project_id: projectId,
    email: email
  });

  // Check if visitor already exists
  const existingByVisitor = await db.customers.findOne({
    project_id: projectId,
    visitor_id: visitorId
  });

  if (existingByEmail && existingByVisitor) {
    if (existingByEmail.id === existingByVisitor.id) {
      // Same customer - just update
      return existingByEmail;
    }

    // Different records - need to merge
    // Merge visitor's history into email customer
    await mergeCustomers(existingByVisitor.id, existingByEmail.id);
    return existingByEmail;
  }

  if (existingByEmail) {
    // Email exists, new visitor_id - add to merged list
    await db.customers.update(existingByEmail.id, {
      merged_visitor_ids: [...existingByEmail.merged_visitor_ids, visitorId],
      updated_at: new Date()
    });
    return existingByEmail;
  }

  if (existingByVisitor) {
    // Visitor exists, now has email - update
    await db.customers.update(existingByVisitor.id, {
      email: email,
      name: name || existingByVisitor.name,
      updated_at: new Date()
    });
    return existingByVisitor;
  }

  // New customer entirely
  return await db.customers.create({
    project_id: projectId,
    visitor_id: visitorId,
    email: email,
    name: name,
    first_seen_at: new Date(),
    last_seen_at: new Date()
  });
}

// Merge two customer records
async function mergeCustomers(sourceId: string, targetId: string): Promise<void> {
  const source = await db.customers.findOne({ id: sourceId });

  // Move all conversations from source to target
  await db.conversations.updateMany(
    { customer_id: sourceId },
    { customer_id: targetId }
  );

  // Add source visitor_id to target's merged list
  await db.customers.update(targetId, {
    merged_visitor_ids: db.raw(`array_append(merged_visitor_ids, '${source.visitor_id}')`),
    total_conversations: db.raw(`total_conversations + ${source.total_conversations}`)
  });

  // Delete source customer
  await db.customers.delete(sourceId);
}
```

#### 5.11.5 Database Schema: Customers Table

```sql
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Identification
  visitor_id TEXT NOT NULL,                    -- Primary identifier from cookie
  email TEXT,                                   -- NULL until provided
  name TEXT,                                    -- NULL until provided

  -- Merged visitors (same email from different devices)
  merged_visitor_ids TEXT[] NOT NULL DEFAULT '{}',

  -- Stats
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  total_conversations INTEGER NOT NULL DEFAULT 0,

  -- Context (updated on each visit)
  last_browser TEXT,
  last_device TEXT,
  last_os TEXT,
  last_page_url TEXT,
  last_location TEXT,                          -- City, Country (from IP)

  -- Flags
  is_flagged BOOLEAN NOT NULL DEFAULT FALSE,
  flag_reason TEXT,
  flagged_at TIMESTAMPTZ,
  flagged_by UUID REFERENCES auth.users(id),

  -- Notes
  internal_notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  UNIQUE(project_id, visitor_id),
  UNIQUE(project_id, email) WHERE email IS NOT NULL
);

-- Indexes
CREATE INDEX idx_customers_project_visitor ON customers(project_id, visitor_id);
CREATE INDEX idx_customers_project_email ON customers(project_id, email) WHERE email IS NOT NULL;
CREATE INDEX idx_customers_project_last_seen ON customers(project_id, last_seen_at DESC);
CREATE INDEX idx_customers_flagged ON customers(project_id, is_flagged) WHERE is_flagged = TRUE;
```

#### 5.11.6 Agent View: Customer Context Panel

```
┌─────────────────────────────────────────┐
│  CUSTOMER                               │
├─────────────────────────────────────────┤
│                                         │
│  📧 john@example.com                    │
│     ────────────────                    │
│     (Identified customer)               │
│                                         │
│  ─────────────────────────────────────  │
│                                         │
│  📊 STATS                               │
│  ─────────────────────────────────────  │
│  First seen      Jan 10, 2025           │
│  Total chats     3                      │
│  Last visit      2 hours ago            │
│                                         │
│  ─────────────────────────────────────  │
│                                         │
│  💻 CURRENT SESSION                     │
│  ─────────────────────────────────────  │
│  Page            /pricing               │
│  Device          Desktop                │
│  Browser         Chrome / macOS         │
│  Location        New York, US           │
│                                         │
│  ─────────────────────────────────────  │
│                                         │
│  📜 CONVERSATION HISTORY                │
│  ─────────────────────────────────────  │
│                                         │
│  ▸ Today - Current (agent_active)       │
│    "Can't login to my account"          │
│                                         │
│  ▸ Jan 12 - Resolved                    │
│    "Billing question about pro plan"    │
│                                         │
│  ▸ Jan 10 - Resolved                    │
│    "How to integrate API"               │
│                                         │
│  [View All History]                     │
│                                         │
│  ─────────────────────────────────────  │
│                                         │
│  🚩 [Flag Customer]    📝 [Add Note]    │
│                                         │
└─────────────────────────────────────────┘
```

#### 5.11.7 Anonymous Customer View

```
┌─────────────────────────────────────────┐
│  CUSTOMER                               │
├─────────────────────────────────────────┤
│                                         │
│  👤 Anonymous Visitor                   │
│     ────────────────────────            │
│     visitor_abc123...                   │
│                                         │
│  ─────────────────────────────────────  │
│                                         │
│  📊 STATS                               │
│  ─────────────────────────────────────  │
│  First seen      Today                  │
│  Total chats     1 (this one)           │
│                                         │
│  ─────────────────────────────────────  │
│                                         │
│  💻 CURRENT SESSION                     │
│  ─────────────────────────────────────  │
│  Page            /features              │
│  Device          Mobile                 │
│  Browser         Safari / iOS           │
│  Location        London, UK             │
│                                         │
│  ─────────────────────────────────────  │
│                                         │
│  💡 Request email to identify this      │
│     customer for future conversations   │
│                                         │
│  [Request Email from Customer]          │
│                                         │
└─────────────────────────────────────────┘
```

---

### 5.12 Customer Presence & Session Management

#### 5.12.1 Overview

Track whether customer is actively engaged, idle, or has left. This enables:
- Agents know if customer is still there
- Auto-close inactive conversations
- Free up agent capacity when customer abandons
- Typing indicators for better UX

**Research Sources:**
- [Zendesk: Chat timeout rules](https://support.zendesk.com/hc/en-us/articles/4408836091034-When-do-chats-time-out)
- [Intercom: Auto-close inactive conversations](https://www.intercom.com/help/en/articles/9636573-auto-close-inactive-conversations)

#### 5.12.2 Customer Presence States

| State | Definition | Timeout | Agent Sees |
|-------|------------|---------|------------|
| 🟢 **Online** | Widget open, activity within 2 min | - | "Customer is online" |
| 🟡 **Idle** | Widget open, no activity for 2+ min | - | "Customer is idle" |
| ✍️ **Typing** | Actively typing in input | - | "Customer is typing..." |
| ⚫ **Offline** | No heartbeat for 30+ seconds | - | "Customer left • 2 min ago" |

#### 5.12.3 Technical Implementation: Widget Presence Tracking

```typescript
class CustomerPresenceTracker {
  private conversationId: string;
  private channel: RealtimeChannel;
  private lastActivity: number = Date.now();
  private isTyping: boolean = false;
  private heartbeatInterval: NodeJS.Timer | null = null;
  private idleThreshold = 2 * 60 * 1000;  // 2 minutes
  private heartbeatFrequency = 10 * 1000;  // 10 seconds

  constructor(conversationId: string) {
    this.conversationId = conversationId;
    this.setupEventListeners();
    this.startHeartbeat();
  }

  private setupEventListeners(): void {
    // Track any user interaction
    const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    activityEvents.forEach(event => {
      document.addEventListener(event, () => this.recordActivity());
    });

    // Track typing in chat input
    const chatInput = document.getElementById('chat-input');
    if (chatInput) {
      chatInput.addEventListener('input', () => this.setTyping(true));
      chatInput.addEventListener('blur', () => this.setTyping(false));
    }

    // Track page visibility
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.sendPresence('background');
      } else {
        this.recordActivity();
      }
    });

    // Track page unload
    window.addEventListener('beforeunload', () => {
      this.sendPresence('offline');
    });

    // Track page focus
    window.addEventListener('focus', () => this.recordActivity());
    window.addEventListener('blur', () => this.sendPresence('idle'));
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      const status = this.calculateStatus();
      this.sendPresence(status);
    }, this.heartbeatFrequency);
  }

  private calculateStatus(): 'online' | 'idle' | 'typing' {
    if (this.isTyping) return 'typing';

    const timeSinceActivity = Date.now() - this.lastActivity;
    if (timeSinceActivity < this.idleThreshold) return 'online';

    return 'idle';
  }

  private recordActivity(): void {
    this.lastActivity = Date.now();
    if (!this.isTyping) {
      this.sendPresence('online');
    }
  }

  private setTyping(typing: boolean): void {
    if (this.isTyping !== typing) {
      this.isTyping = typing;
      this.sendPresence(typing ? 'typing' : 'online');

      // Auto-clear typing after 3 seconds of no input
      if (typing) {
        setTimeout(() => {
          if (this.isTyping && Date.now() - this.lastActivity > 3000) {
            this.setTyping(false);
          }
        }, 3000);
      }
    }
  }

  private sendPresence(status: 'online' | 'idle' | 'typing' | 'offline' | 'background'): void {
    supabase
      .channel(`conversation:${this.conversationId}`)
      .send({
        type: 'broadcast',
        event: 'customer_presence',
        payload: {
          status,
          timestamp: Date.now()
        }
      });
  }

  destroy(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    this.sendPresence('offline');
  }
}
```

#### 5.12.4 Technical Implementation: Backend Presence Processing

```typescript
// Backend: Track customer presence in conversation
async function handleCustomerPresence(
  conversationId: string,
  status: string,
  timestamp: number
): Promise<void> {
  await db.conversations.update(conversationId, {
    customer_presence: status,
    customer_last_seen_at: new Date(timestamp),
    updated_at: new Date()
  });

  // Broadcast to assigned agent
  const conversation = await db.conversations.findOne({ id: conversationId });
  if (conversation.assigned_agent_id) {
    await supabase
      .channel(`agent:${conversation.assigned_agent_id}`)
      .send({
        type: 'broadcast',
        event: 'customer_presence_update',
        payload: {
          conversation_id: conversationId,
          status,
          timestamp
        }
      });
  }
}
```

#### 5.12.5 Auto-Close Flow: Inactive Conversations

Based on industry standards (Zendesk: 10-20 min idle, Intercom: configurable):

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        AUTO-CLOSE INACTIVE CONVERSATION                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ACTIVE CONVERSATION (agent_active)                                         │
│         │                                                                    │
│         │ Customer goes idle or offline (no activity for 5 min)             │
│         ▼                                                                    │
│   ┌─────────────────────────────────────────────────────────────┐           │
│   │  SYSTEM MESSAGE TO CUSTOMER:                                 │           │
│   │                                                              │           │
│   │  "Are you still there? This chat will close in 5 minutes    │           │
│   │   if we don't hear from you."                                │           │
│   │                                                              │           │
│   │  [I'm still here]                                            │           │
│   └─────────────────────────────────────────────────────────────┘           │
│         │                                                                    │
│         │                                                                    │
│    ┌────┴─────────────────────────────────┐                                 │
│    │                                       │                                 │
│    ▼                                       ▼                                 │
│                                                                              │
│   CUSTOMER RESPONDS                   NO RESPONSE (5 min)                   │
│   ─────────────────                   ─────────────────────                 │
│   • Cancel auto-close timer           │                                     │
│   • Clear warning message             ▼                                     │
│   • Continue conversation      ┌─────────────────────────────────────┐     │
│   • Reset idle tracking        │  SYSTEM MESSAGE:                     │     │
│                                │                                      │     │
│                                │  "This chat has been closed due to   │     │
│                                │   inactivity. Start a new chat       │     │
│                                │   anytime if you need more help!"    │     │
│                                │                                      │     │
│                                └─────────────────────────────────────┘     │
│                                        │                                    │
│                                        ▼                                    │
│                                 ┌────────────────────┐                      │
│                                 │ status → 'closed'  │                      │
│                                 │ agent chat_count-- │                      │
│                                 │ free up capacity   │                      │
│                                 └────────────────────┘                      │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 5.12.6 Configurable Timeout Settings

```typescript
// Add to handoff_settings
interface SessionTimeoutSettings {
  // When to consider customer idle (no activity)
  inactivity_timeout_minutes: number;  // Default: 5

  // How long after warning before auto-close
  auto_close_after_warning_minutes: number;  // Default: 5

  // How long to keep session "alive" after browser close
  // (customer might return)
  session_keep_alive_minutes: number;  // Default: 15

  // Whether to send "are you still there?" message
  send_inactivity_warning: boolean;  // Default: true
}
```

#### 5.12.7 Implementation: Auto-Close Job

```typescript
// Background job: Check for inactive conversations (runs every minute)
async function processInactiveConversations(): Promise<void> {
  const now = new Date();

  // Find conversations that need warning
  const needWarning = await db.conversations.findMany({
    where: {
      status: 'agent_active',
      customer_presence: { in: ['idle', 'offline'] },
      auto_close_warning_sent_at: null,
      customer_last_seen_at: {
        lt: new Date(now.getTime() - 5 * 60 * 1000)  // 5 min ago
      }
    }
  });

  for (const conv of needWarning) {
    // Send warning message
    await sendSystemMessage(conv.id, {
      type: 'inactivity_warning',
      content: "Are you still there? This chat will close in 5 minutes if we don't hear from you."
    });

    // Mark warning sent
    await db.conversations.update(conv.id, {
      auto_close_warning_sent_at: now
    });
  }

  // Find conversations that should be closed
  const toClose = await db.conversations.findMany({
    where: {
      status: 'agent_active',
      auto_close_warning_sent_at: {
        lt: new Date(now.getTime() - 5 * 60 * 1000)  // Warning sent 5+ min ago
      },
      customer_last_seen_at: {
        lt: new Date(now.getTime() - 10 * 60 * 1000)  // No activity for 10+ min
      }
    }
  });

  for (const conv of toClose) {
    await closeConversationDueToInactivity(conv.id);
  }
}

async function closeConversationDueToInactivity(conversationId: string): Promise<void> {
  const conversation = await db.conversations.findOne({ id: conversationId });

  // Send final message
  await sendSystemMessage(conversationId, {
    type: 'auto_closed',
    content: "This chat has been closed due to inactivity. Start a new chat anytime if you need more help!"
  });

  // Update conversation
  await db.conversations.update(conversationId, {
    status: 'closed',
    resolved_at: new Date(),
    metadata: {
      ...conversation.metadata,
      close_reason: 'customer_inactive'
    }
  });

  // Decrement agent's chat count
  if (conversation.assigned_agent_id) {
    await db.agent_availability.update(
      { user_id: conversation.assigned_agent_id, project_id: conversation.project_id },
      { current_chat_count: db.raw('current_chat_count - 1') }
    );
  }

  // Notify agent
  await supabase
    .channel(`agent:${conversation.assigned_agent_id}`)
    .send({
      type: 'broadcast',
      event: 'conversation_auto_closed',
      payload: { conversation_id: conversationId, reason: 'customer_inactive' }
    });
}
```

#### 5.12.8 Database Schema Additions

```sql
-- Add to conversations table
ALTER TABLE conversations ADD COLUMN customer_id UUID REFERENCES customers(id);
ALTER TABLE conversations ADD COLUMN customer_presence TEXT DEFAULT 'offline'
  CHECK (customer_presence IN ('online', 'idle', 'offline', 'typing'));
ALTER TABLE conversations ADD COLUMN customer_last_seen_at TIMESTAMPTZ;
ALTER TABLE conversations ADD COLUMN auto_close_warning_sent_at TIMESTAMPTZ;

-- Add to handoff_settings table
ALTER TABLE handoff_settings ADD COLUMN inactivity_timeout_minutes INTEGER NOT NULL DEFAULT 5;
ALTER TABLE handoff_settings ADD COLUMN auto_close_after_warning_minutes INTEGER NOT NULL DEFAULT 5;
ALTER TABLE handoff_settings ADD COLUMN session_keep_alive_minutes INTEGER NOT NULL DEFAULT 15;
ALTER TABLE handoff_settings ADD COLUMN send_inactivity_warning BOOLEAN NOT NULL DEFAULT true;
```

#### 5.12.9 Agent UI: Customer Presence Indicator

```
┌─────────────────────────────────────────────────────────────────┐
│  John Davidson                              [Resolve ▼] [Close] │
│  john@example.com             🟢 Online • Active now            │
├─────────────────────────────────────────────────────────────────┤
│  ...                                                             │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  John Davidson                              [Resolve ▼] [Close] │
│  john@example.com             🟡 Idle • Last active 3 min ago   │
├─────────────────────────────────────────────────────────────────┤
│  ...                                                             │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  John Davidson                              [Resolve ▼] [Close] │
│  john@example.com             ⚫ Left • 5 min ago               │
├─────────────────────────────────────────────────────────────────┤
│  ...                                                             │
│                                                                  │
│  ⚠️ Customer appears to have left. Chat will auto-close in 5m. │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  John Davidson                              [Resolve ▼] [Close] │
│  john@example.com             ✍️ Typing...                       │
├─────────────────────────────────────────────────────────────────┤
│  ...                                                             │
└─────────────────────────────────────────────────────────────────┘
```

#### 5.12.10 Summary: Timeout Values

| Scenario | Duration | Configurable? |
|----------|----------|---------------|
| Customer idle detection | 2 min no activity | No (fixed) |
| Trigger inactivity warning | 5 min offline/idle | Yes |
| Auto-close after warning | 5 min no response | Yes |
| Session keep-alive after browser close | 15 min | Yes |
| Typing indicator timeout | 3 sec no keystroke | No (fixed) |

---

## 6. Database Schema

### 6.1 Schema Overview

```
┌─────────────────────┐     ┌─────────────────────┐
│      projects       │     │        users        │
│ (existing)          │     │ (existing - auth)   │
└──────────┬──────────┘     └──────────┬──────────┘
           │                           │
           │                           │
           ▼                           ▼
┌─────────────────────┐     ┌─────────────────────┐     ┌─────────────────────┐
│  handoff_settings   │     │ agent_availability  │     │  project_members    │
│  (NEW)              │     │ (NEW)               │     │  (NEW)              │
└─────────────────────┘     └──────────┬──────────┘     └─────────────────────┘
                                       │
           ┌───────────────────────────┘
           │
           ▼
┌─────────────────────┐     ┌─────────────────────┐     ┌─────────────────────┐
│   conversations     │◀────│      messages       │     │     customers       │
│ (REPLACE            │     │ (NEW)               │     │ (NEW)               │
│  chat_sessions)     │     └─────────────────────┘     └─────────────────────┘
└─────────────────────┘                                          │
           │                                                     │
           └────────────────────────────────────────────────────┘
                            (customer_id FK)
```

### 6.2 New Tables

#### 6.2.1 `handoff_settings`

```sql
CREATE TABLE handoff_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Master toggle
  enabled BOOLEAN NOT NULL DEFAULT false,

  -- Trigger configuration
  trigger_mode TEXT NOT NULL DEFAULT 'both'
    CHECK (trigger_mode IN ('auto', 'manual', 'both')),
  show_human_button BOOLEAN NOT NULL DEFAULT false,

  -- Auto triggers
  auto_triggers JSONB NOT NULL DEFAULT '{
    "low_confidence_enabled": true,
    "low_confidence_threshold": 0.6,
    "keywords_enabled": true,
    "keywords": ["human", "agent", "person", "speak to someone"]
  }'::jsonb,

  -- Business hours
  business_hours_enabled BOOLEAN NOT NULL DEFAULT false,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  business_hours JSONB NOT NULL DEFAULT '{
    "monday": {"start": "09:00", "end": "17:00", "enabled": true},
    "tuesday": {"start": "09:00", "end": "17:00", "enabled": true},
    "wednesday": {"start": "09:00", "end": "17:00", "enabled": true},
    "thursday": {"start": "09:00", "end": "17:00", "enabled": true},
    "friday": {"start": "09:00", "end": "17:00", "enabled": true},
    "saturday": {"start": "09:00", "end": "17:00", "enabled": false},
    "sunday": {"start": "09:00", "end": "17:00", "enabled": false}
  }'::jsonb,

  -- Agent defaults
  default_max_concurrent_chats INTEGER NOT NULL DEFAULT 5,

  -- Session timeout settings (for customer presence)
  inactivity_timeout_minutes INTEGER NOT NULL DEFAULT 5,
  auto_close_after_warning_minutes INTEGER NOT NULL DEFAULT 5,
  session_keep_alive_minutes INTEGER NOT NULL DEFAULT 15,
  send_inactivity_warning BOOLEAN NOT NULL DEFAULT true,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  UNIQUE(project_id)
);

-- RLS
ALTER TABLE handoff_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view handoff settings for their projects"
  ON handoff_settings FOR SELECT
  USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));

CREATE POLICY "Users can update handoff settings for their projects"
  ON handoff_settings FOR UPDATE
  USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));
```

#### 6.2.2 `agent_availability`

```sql
CREATE TABLE agent_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Status
  status TEXT NOT NULL DEFAULT 'offline'
    CHECK (status IN ('online', 'away', 'offline')),

  -- Capacity
  max_concurrent_chats INTEGER NOT NULL DEFAULT 5,
  current_chat_count INTEGER NOT NULL DEFAULT 0,

  -- Tracking
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_assigned_at TIMESTAMPTZ,
  status_changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Auto-offline settings
  auto_offline_enabled BOOLEAN NOT NULL DEFAULT true,
  auto_offline_minutes INTEGER NOT NULL DEFAULT 30,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  UNIQUE(user_id, project_id),
  CHECK (current_chat_count >= 0),
  CHECK (current_chat_count <= max_concurrent_chats)
);

-- Indexes
CREATE INDEX idx_agent_availability_project_status
  ON agent_availability(project_id, status);
CREATE INDEX idx_agent_availability_available
  ON agent_availability(project_id)
  WHERE status = 'online';

-- RLS
ALTER TABLE agent_availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view agent availability for their projects"
  ON agent_availability FOR SELECT
  USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));

CREATE POLICY "Users can update their own availability"
  ON agent_availability FOR UPDATE
  USING (user_id = auth.uid());
```

#### 6.2.3 `conversations` (Replaces `chat_sessions`)

```sql
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Customer identification (links to customers table)
  customer_id UUID REFERENCES customers(id),
  visitor_id TEXT NOT NULL,
  customer_email TEXT,
  customer_name TEXT,

  -- Customer presence tracking
  customer_presence TEXT DEFAULT 'offline'
    CHECK (customer_presence IN ('online', 'idle', 'offline', 'typing')),
  customer_last_seen_at TIMESTAMPTZ,
  auto_close_warning_sent_at TIMESTAMPTZ,

  -- Status
  status TEXT NOT NULL DEFAULT 'ai_active'
    CHECK (status IN ('ai_active', 'waiting', 'agent_active', 'resolved', 'closed')),

  -- Assignment
  assigned_agent_id UUID REFERENCES auth.users(id),

  -- Handoff metadata
  handoff_reason TEXT
    CHECK (handoff_reason IN ('low_confidence', 'keyword', 'customer_request', 'button_click')),
  handoff_triggered_at TIMESTAMPTZ,
  ai_confidence_at_handoff FLOAT,
  trigger_keyword TEXT,

  -- Queue tracking
  queue_entered_at TIMESTAMPTZ,

  -- Agent interaction timestamps
  claimed_at TIMESTAMPTZ,
  first_response_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,

  -- Satisfaction
  satisfaction_rating INTEGER CHECK (satisfaction_rating BETWEEN 1 AND 5),
  satisfaction_feedback TEXT,

  -- Source
  source TEXT NOT NULL DEFAULT 'widget'
    CHECK (source IN ('widget', 'playground', 'mcp', 'api', 'voice')),

  -- Metadata
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Lead capture state (migrated from chat_sessions)
  awaiting_email BOOLEAN DEFAULT false,
  pending_question TEXT,
  email_asked BOOLEAN DEFAULT false,

  -- Voice (migrated from chat_sessions)
  is_voice BOOLEAN DEFAULT false,
  voice_duration_seconds INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_conversations_project_status
  ON conversations(project_id, status);
CREATE INDEX idx_conversations_assigned_agent
  ON conversations(assigned_agent_id)
  WHERE assigned_agent_id IS NOT NULL;
CREATE INDEX idx_conversations_waiting_queue
  ON conversations(project_id, queue_entered_at)
  WHERE status = 'waiting';
CREATE INDEX idx_conversations_visitor
  ON conversations(project_id, visitor_id);

-- RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view conversations for their projects"
  ON conversations FOR SELECT
  USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));

CREATE POLICY "Widget can view own conversation"
  ON conversations FOR SELECT
  USING (visitor_id = current_setting('app.visitor_id', true));
```

#### 6.2.4 `messages`

```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,

  -- Sender
  sender_type TEXT NOT NULL
    CHECK (sender_type IN ('customer', 'ai', 'agent', 'system')),
  sender_id UUID REFERENCES auth.users(id),  -- Only for agent type

  -- Content
  content TEXT NOT NULL,

  -- AI-specific metadata
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- For AI messages: { confidence: 0.85, sources: [...], model: 'gpt-4o-mini' }
  -- For system messages: { event: 'handoff_triggered', reason: 'keyword' }

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_messages_conversation
  ON messages(conversation_id);
CREATE INDEX idx_messages_conversation_created
  ON messages(conversation_id, created_at);

-- RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages for their project conversations"
  ON messages FOR SELECT
  USING (conversation_id IN (
    SELECT id FROM conversations
    WHERE project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
  ));

CREATE POLICY "Users can insert messages for their project conversations"
  ON messages FOR INSERT
  WITH CHECK (conversation_id IN (
    SELECT id FROM conversations
    WHERE project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
  ));
```

#### 6.2.5 `customers`

```sql
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Identification
  visitor_id TEXT NOT NULL,                    -- Primary identifier from cookie
  email TEXT,                                   -- NULL until provided
  name TEXT,                                    -- NULL until provided

  -- Merged visitors (same email from different devices)
  merged_visitor_ids TEXT[] NOT NULL DEFAULT '{}',

  -- Stats
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  total_conversations INTEGER NOT NULL DEFAULT 0,

  -- Context (updated on each visit)
  last_browser TEXT,
  last_device TEXT,
  last_os TEXT,
  last_page_url TEXT,
  last_location TEXT,                          -- City, Country (from IP)

  -- Flags
  is_flagged BOOLEAN NOT NULL DEFAULT FALSE,
  flag_reason TEXT,
  flagged_at TIMESTAMPTZ,
  flagged_by UUID REFERENCES auth.users(id),

  -- Notes
  internal_notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  UNIQUE(project_id, visitor_id),
  UNIQUE(project_id, email) WHERE email IS NOT NULL
);

-- Indexes
CREATE INDEX idx_customers_project_visitor ON customers(project_id, visitor_id);
CREATE INDEX idx_customers_project_email ON customers(project_id, email) WHERE email IS NOT NULL;
CREATE INDEX idx_customers_project_last_seen ON customers(project_id, last_seen_at DESC);
CREATE INDEX idx_customers_flagged ON customers(project_id, is_flagged) WHERE is_flagged = TRUE;

-- RLS
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view customers for their projects"
  ON customers FOR SELECT
  USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));

CREATE POLICY "Users can update customers for their projects"
  ON customers FOR UPDATE
  USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));
```

#### 6.2.6 `project_members`

```sql
CREATE TABLE project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,  -- NULL if pending

  -- Invitation
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'agent' CHECK (role IN ('agent', 'admin')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'removed')),

  -- Invitation tracking
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  invited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,

  -- Settings
  max_concurrent_chats INTEGER NOT NULL DEFAULT 5,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  UNIQUE(project_id, email)
);

-- Indexes
CREATE INDEX idx_project_members_project ON project_members(project_id);
CREATE INDEX idx_project_members_user ON project_members(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_project_members_email ON project_members(email);
CREATE INDEX idx_project_members_pending ON project_members(project_id, status) WHERE status = 'pending';

-- RLS
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project owners can view all members"
  ON project_members FOR SELECT
  USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));

CREATE POLICY "Project owners can insert members"
  ON project_members FOR INSERT
  WITH CHECK (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));

CREATE POLICY "Project owners can update members"
  ON project_members FOR UPDATE
  USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));

CREATE POLICY "Agents can view their own membership"
  ON project_members FOR SELECT
  USING (user_id = auth.uid());
```

### 6.3 Migration Strategy

See [Section 10: Migration Strategy](#10-migration-strategy) for detailed migration plan.

---

## 7. API Endpoints

### 7.1 Handoff Settings APIs

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects/:id/handoff-settings` | Get handoff settings |
| PUT | `/api/projects/:id/handoff-settings` | Update handoff settings |

### 7.2 Conversation APIs

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/conversations` | Create conversation (widget) |
| GET | `/api/conversations` | List conversations (dashboard) |
| GET | `/api/conversations/:id` | Get conversation details |
| PATCH | `/api/conversations/:id` | Update conversation |
| POST | `/api/conversations/:id/handoff` | Trigger handoff |
| POST | `/api/conversations/:id/claim` | Agent claims conversation |
| POST | `/api/conversations/:id/transfer` | Transfer to queue/agent |
| POST | `/api/conversations/:id/resolve` | Mark as resolved |

### 7.3 Message APIs

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/conversations/:id/messages` | Send message |
| GET | `/api/conversations/:id/messages` | Get messages (paginated) |

### 7.4 Agent APIs

| Method | Endpoint | Description |
|--------|----------|-------------|
| PUT | `/api/agent/status` | Update agent status |
| POST | `/api/agent/heartbeat` | Agent heartbeat |
| GET | `/api/projects/:id/agents` | List agents with status |

### 7.5 Detailed Endpoint Specifications

#### POST `/api/conversations/:id/handoff`

Trigger handoff for a conversation.

**Request:**
```json
{
  "reason": "button_click",  // 'button_click' | 'customer_request'
  "customer_email": "john@example.com",  // optional
  "customer_name": "John"  // optional
}
```

**Response (success - agent available):**
```json
{
  "status": "agent_active",
  "assigned_agent": {
    "id": "xxx",
    "name": "Sarah",
    "avatar_url": "..."
  }
}
```

**Response (success - queued):**
```json
{
  "status": "waiting",
  "queue_position": 3,
  "estimated_wait_minutes": 5
}
```

**Response (offline):**
```json
{
  "status": "offline",
  "message": "Our team is currently offline",
  "business_hours": {
    "timezone": "America/New_York",
    "next_available": "Monday 9:00 AM"
  }
}
```

#### POST `/api/conversations/:id/claim`

Agent claims a waiting conversation.

**Request:**
```json
{}  // No body needed, agent ID from auth
```

**Response (success):**
```json
{
  "success": true,
  "conversation": {
    "id": "xxx",
    "status": "agent_active",
    "assigned_agent_id": "yyy"
  }
}
```

**Response (failure):**
```json
{
  "success": false,
  "error": "ALREADY_CLAIMED",
  "message": "This conversation was claimed by another agent"
}
```

---

## 8. Security & Permissions

### 8.1 Authentication Requirements

| Endpoint Type | Authentication |
|---------------|----------------|
| Widget APIs | Project API key (public) |
| Dashboard APIs | Supabase Auth (JWT) |
| Agent APIs | Supabase Auth (JWT) + project access |

### 8.2 Row Level Security (RLS)

All tables have RLS enabled. Key policies:

1. **Conversations**: Users can only access conversations for projects they own
2. **Messages**: Users can only access messages in their project's conversations
3. **Agent Availability**: Users can only update their own availability
4. **Handoff Settings**: Users can only modify settings for their projects

### 8.3 Rate Limiting

| Endpoint | Limit |
|----------|-------|
| Widget message send | 10/minute per visitor |
| Dashboard APIs | 100/minute per user |
| Agent heartbeat | 2/minute per agent |

---

## 9. Edge Cases & Error Handling

### 9.1 Agent Goes Offline Mid-Conversation

**Scenario:** Agent loses connection or closes browser while chatting.

**Handling:**
1. Heartbeat stops → after 5 minutes, status changes to `offline`
2. Active conversations remain assigned (agent can return)
3. Customer sees: "Agent disconnected. Waiting for reconnection..."
4. After 10 minutes of no activity, option to return to queue

### 9.2 Customer Closes Browser During Queue

**Scenario:** Customer leaves while waiting for agent.

**Handling:**
1. Conversation stays in queue (customer might return)
2. After 30 minutes of no activity, move to `closed`
3. If customer returns, start fresh conversation

### 9.3 Race Condition: Multiple Agents Claim Same Conversation

**Scenario:** Two agents click "claim" simultaneously.

**Handling:**
1. PostgreSQL `FOR UPDATE SKIP LOCKED` ensures only one succeeds
2. Second agent sees: "Already claimed by another agent"
3. UI refreshes to show conversation assigned to first agent

### 9.4 Customer Messages During Handoff Transition

**Scenario:** Customer sends message while handoff is being processed.

**Handling:**
1. Messages are queued in database
2. All messages visible to agent when they join
3. No messages lost during transition

### 9.5 Business Hours Edge Cases

**Scenario:** Conversation started during business hours, agent goes offline, now outside hours.

**Handling:**
1. If waiting in queue, show offline message
2. Customer can leave email for follow-up
3. Conversation moves to queue for next business day

### 9.6 Agent at Capacity, All Agents Full

**Scenario:** Handoff triggered but all agents are at their limit.

**Handling:**
1. Conversation enters queue (`status = 'waiting'`)
2. Customer sees queue position
3. When any agent finishes a chat, queue is processed

---

## 10. Migration Strategy

### 10.1 Overview

Migrate from `chat_sessions` with JSONB messages to normalized `conversations` + `messages` tables.

### 10.2 Migration Phases

#### Phase 1: Create New Tables (Non-Breaking)

```sql
-- Create new tables without dropping old ones
CREATE TABLE conversations (...);
CREATE TABLE messages (...);
CREATE TABLE handoff_settings (...);
CREATE TABLE agent_availability (...);
```

#### Phase 2: Data Migration

```sql
-- Migrate chat_sessions to conversations
INSERT INTO conversations (
  id, project_id, visitor_id, source, metadata,
  awaiting_email, pending_question, email_asked,
  is_voice, voice_duration_seconds,
  created_at, updated_at, last_message_at,
  status  -- All existing sessions are AI-only
)
SELECT
  id, project_id, visitor_id, source, '{}'::jsonb,
  awaiting_email, pending_question, email_asked,
  is_voice, voice_duration_seconds,
  created_at, updated_at, last_message_at,
  'ai_active'
FROM chat_sessions;

-- Migrate messages from JSONB array to messages table
INSERT INTO messages (conversation_id, sender_type, content, metadata, created_at)
SELECT
  cs.id as conversation_id,
  CASE
    WHEN (msg->>'role') = 'user' THEN 'customer'
    WHEN (msg->>'role') = 'assistant' THEN 'ai'
    ELSE 'system'
  END as sender_type,
  msg->>'content' as content,
  COALESCE(msg->'sources', '[]'::jsonb) as metadata,
  COALESCE((msg->>'timestamp')::timestamptz, cs.created_at) as created_at
FROM chat_sessions cs
CROSS JOIN LATERAL jsonb_array_elements(cs.messages) as msg;
```

#### Phase 3: Update Application Code

1. Update API routes to use new tables
2. Update widget to handle new states
3. Deploy agent dashboard
4. Update all queries

#### Phase 4: Deprecate Old Table

```sql
-- After confirming everything works
-- Keep for 30 days, then drop
ALTER TABLE chat_sessions RENAME TO chat_sessions_deprecated;

-- After 30 days
DROP TABLE chat_sessions_deprecated;
```

### 10.3 Rollback Plan

If issues arise:
1. Application can fall back to `chat_sessions_deprecated`
2. No data loss (old table preserved)
3. Feature flag to disable new functionality

---

## 11. Testing Strategy

### 11.1 Unit Tests

| Component | Tests |
|-----------|-------|
| Handoff trigger logic | Keywords, confidence threshold, business hours |
| Assignment algorithm | Balanced assignment, capacity limits, tie-breaking |
| Queue position | FIFO ordering, position calculation |
| Business hours | Timezone handling, day boundaries |

### 11.2 Integration Tests

| Flow | Tests |
|------|-------|
| Full handoff flow | AI → handoff trigger → queue → agent claim → chat → resolve |
| Race conditions | Concurrent claims, concurrent messages |
| Real-time updates | Message broadcast, status changes, queue updates |
| Widget states | All state transitions, UI updates |

### 11.3 Load Tests

| Scenario | Target |
|----------|--------|
| Concurrent conversations | 1000 active simultaneously |
| Message throughput | 100 messages/second |
| Real-time connections | 5000 WebSocket connections |

### 11.4 Manual QA Checklist

- [ ] Handoff triggered by low confidence
- [ ] Handoff triggered by keyword
- [ ] Handoff triggered by button click
- [ ] Queue position displays correctly
- [ ] Agent claims conversation
- [ ] Messages delivered in real-time
- [ ] Agent status changes reflected
- [ ] Business hours enforced
- [ ] Offline form works correctly
- [ ] Conversation resolution flow
- [ ] Customer satisfaction collection

---

## 12. Open Questions & Future Considerations

### 12.1 Open Questions (Need Discussion)

1. **Sentiment Detection:** Should we add sentiment-based triggers in v1 or defer?
   - Current decision: Defer to post-MVP
   - Could be added later without schema changes

2. **Agent Routing:** Should we support skill-based routing?
   - Current decision: Not in v1
   - Would require `agent_skills` table and routing rules

3. **Canned Responses:** Should agents have pre-written response templates?
   - Not in current spec
   - Could be added as separate feature

4. **CSAT Collection:** When exactly should we ask for rating?
   - After agent resolves?
   - X hours after last message?
   - Need UX decision

### 12.2 Future Considerations

1. **Slack Integration:** Post-MVP feature to respond from Slack
2. **Ticketing:** Convert abandoned conversations to tickets
3. **Analytics:** Agent performance, resolution times, CSAT trends
4. **Mobile App:** Agent mobile app for on-the-go support
5. **AI Assist for Agents:** Suggest responses to agents based on context

### 12.3 Technical Debt to Monitor

1. **Message Table Growth:** May need partitioning for large volumes
2. **Real-time Scaling:** Supabase Realtime limits at scale
3. **Queue Processing:** May need dedicated worker for high volume

---

## Appendix A: Glossary

| Term | Definition |
|------|------------|
| **Handoff** | Transfer of conversation from AI to human agent |
| **Agent** | Human support team member |
| **Visitor** | Anonymous customer before email collection |
| **Queue** | Waiting list of conversations for agents |
| **Capacity** | Number of concurrent chats an agent can handle |
| **CSAT** | Customer Satisfaction score (1-5) |
| **Balanced Assignment** | Assign to agent with most free capacity |

---

## Appendix B: Related Documents

- [Agent Management Flow](./AGENT_MANAGEMENT_FLOW.md) - How agents are invited, login, and go online
- [Product Research & Roadmap](../../PRODUCT_RESEARCH_AND_ROADMAP.md) - Market research and feature prioritization

---

*Document Version: 1.0*
*Status: Draft - Pending Review*
