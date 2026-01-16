# SupportBase Product Research & Feature Roadmap

## Executive Summary

Based on extensive market research across Reddit communities (r/SaaS, r/startups, r/CustomerSuccess, r/smallbusiness, r/Entrepreneur), I've identified critical gaps in the customer support tooling market that SupportBase is uniquely positioned to fill. This document outlines the research findings, prioritized features, and detailed specifications for the next phase of development.

---

## Part 1: Market Research Findings

### 1.1 The Problem Landscape

**Pain Point #1: Enterprise Tools Are Overkill for SMBs**
- Intercom, Zendesk, Freshdesk are designed for enterprise with complex pricing
- Small teams (1-10 people) pay $50-200/user/month for features they don't use
- Setup takes weeks, requires dedicated ops person
- Reddit sentiment: "Intercom is amazing but priced for VC-backed companies"

**Pain Point #2: AI Chatbots Fail at Human Handoff**
- Most AI chatbots are "dead ends" - no graceful escalation
- Customers get frustrated when stuck in AI loops
- When handoff happens, context is lost
- Agents have to ask "how can I help you?" after AI already collected info
- Reddit quote: "The bot asks 5 questions, then hands off and the agent asks the same 5 questions"

**Pain Point #3: Channel Fragmentation**
- Support requests come from email, chat, social, Slack, Discord
- Teams juggle 4-5 tabs/tools constantly
- No unified view of customer conversations
- Context switching kills productivity

**Pain Point #4: Slack is Where B2B Teams Live**
- B2B SaaS companies increasingly use Slack for customer support
- Dedicated customer channels are common for enterprise deals
- No good tools to manage Slack-based support at scale
- Manual tracking in spreadsheets is common

### 1.2 Competitor Analysis

| Tool | Strengths | Weaknesses | Pricing |
|------|-----------|------------|---------|
| Intercom | Full-featured, great AI | Expensive, complex | $74-$139+/seat |
| Zendesk | Enterprise-grade | Bloated, slow | $55-$115/agent |
| Crisp | Simple, affordable | Limited AI, no MCP | $25-$95/month |
| Tidio | Good for e-commerce | Weak B2B features | $29-$59/month |
| HelpScout | Clean, email-focused | No real-time chat | $20-$65/user |
| Freshdesk | Good value | UI is dated | $15-$79/agent |

**SupportBase Competitive Advantages:**
1. MCP integration (unique in market)
2. Developer-first, vibe coder positioning
3. RAG-powered from your own docs
4. Simple, one-line embed
5. Built for indie hackers and small teams

### 1.3 Market Opportunity

**Target Market Segments:**
1. **Indie Hackers** - Solo founders needing support without hiring
2. **Small SaaS Teams** (2-10 people) - Need simple, affordable tools
3. **Agencies** - Managing support for multiple client projects
4. **Developer Tools Companies** - Technical audience, MCP-native

**Market Size:**
- 30M+ small businesses in US alone
- 70%+ don't have proper support tools
- $10B+ helpdesk software market growing 10%+ YoY

---

## Part 2: Feature Prioritization

Based on research, here's the prioritized feature roadmap:

### Priority 1: Human Agent Handoff + Live Chat Dashboard
**Why First:** This is the #1 pain point. Without human handoff, AI chatbots are incomplete products. This makes SupportBase a "complete" support solution.

### Priority 2: Slack Integration
**Why Second:** B2B SaaS market is underserved. Slack-based support is growing rapidly. Differentiating feature for our "vibe coder" audience.

### Priority 3: Simple Ticketing System
**Why Third:** Provides accountability and tracking. Essential for teams >1 person. Can be built incrementally on top of handoff system.

---

## Part 3: Feature Specification - Human Agent Handoff & Live Chat Dashboard

### 3.1 Overview

Transform SupportBase from an AI-only chatbot into a complete support solution where AI handles first-line support and seamlessly hands off to human agents when needed.

### 3.2 User Stories

**As a customer:**
- I want to talk to a human when the AI can't help me
- I want my conversation history preserved when handed off
- I want to know when I'm talking to AI vs human
- I want to rate my support experience

**As a support agent:**
- I want to see all pending conversations in one place
- I want full context when a conversation is handed off
- I want to quickly respond to multiple customers
- I want to see customer info (email, previous conversations)
- I want to mark conversations as resolved

**As a business owner:**
- I want to set rules for when handoff should happen
- I want to see metrics on AI resolution vs handoff rate
- I want to manage my support team's access
- I want to set business hours for human support

### 3.3 Handoff Trigger Logic

**Automatic Triggers:**
1. Customer explicitly requests human ("talk to a person", "human agent")
2. AI confidence score below threshold (configurable, default 60%)
3. Sentiment detection - frustrated customer language
4. Repeated similar questions (customer stuck in loop)
5. Specific keywords/topics configured by admin

**Manual Triggers:**
1. Customer clicks "Talk to Human" button
2. AI suggests handoff after X failed attempts

**Handoff Flow:**
```
Customer asks question
    ↓
AI processes with RAG
    ↓
[Confidence Check]
    ├── High confidence → Respond with answer
    │       ↓
    │   [Customer satisfied?]
    │       ├── Yes → Continue/Close
    │       └── No → Offer handoff
    │
    └── Low confidence OR trigger detected
            ↓
        [Business hours?]
            ├── Yes → Queue for agent + notify
            │       ↓
            │   Show "Connecting to agent..."
            │       ↓
            │   Agent accepts → Live chat begins
            │
            └── No → Capture email + create ticket
                    ↓
                Show "We'll respond within X hours"
```

### 3.4 Live Chat Dashboard - Screens & UI

#### Screen 1: Inbox Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│  SupportBase                                    [Agent Name ▼] [🔔] │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────┐  ┌─────────────────────────────────────────────┐ │
│  │ CONVERSATIONS│  │                                             │ │
│  │              │  │  Select a conversation to start             │ │
│  │ ● Waiting (3)│  │                                             │ │
│  │ ○ Active (2) │  │           [Icon: Message bubbles]          │ │
│  │ ○ Resolved   │  │                                             │ │
│  │              │  │  3 customers waiting for response           │ │
│  │ ────────────│  │                                             │ │
│  │              │  │                                             │ │
│  │ 🔴 John D.   │  │                                             │ │
│  │ "Can't login"│  │                                             │ │
│  │ 5 min ago    │  │                                             │ │
│  │              │  │                                             │ │
│  │ 🔴 Sarah M.  │  │                                             │ │
│  │ "Billing..." │  │                                             │ │
│  │ 12 min ago   │  │                                             │ │
│  │              │  │                                             │ │
│  │ 🟡 Alex T.   │  │                                             │ │
│  │ "API error"  │  │                                             │ │
│  │ 2 min ago    │  │                                             │ │
│  │              │  └─────────────────────────────────────────────┘ │
│  │              │                                                   │
│  │ ────────────│                                                   │
│  │ TEAM        │                                                   │
│  │ 🟢 You      │                                                   │
│  │ 🟢 Mike (2) │                                                   │
│  │ ⚫ Lisa     │                                                   │
│  └──────────────┘                                                   │
└─────────────────────────────────────────────────────────────────────┘
```

#### Screen 2: Active Conversation View

```
┌─────────────────────────────────────────────────────────────────────┐
│  SupportBase                                    [Agent Name ▼] [🔔] │
├─────────────────────────────────────────────────────────────────────┤
│ ┌──────────────┐ ┌────────────────────────────┐ ┌─────────────────┐│
│ │ CONVERSATIONS│ │ John D.          [Resolve ▼]│ │ CUSTOMER INFO   ││
│ │              │ │ john@example.com    [Close] │ │                 ││
│ │ ● Waiting (2)│ ├────────────────────────────┤ │ John Davidson   ││
│ │ ○ Active (3) │ │                            │ │ john@example.com││
│ │ ○ Resolved   │ │ 🤖 AI Assistant  10:23 AM  │ │                 ││
│ │              │ │ Hi! How can I help you     │ │ ─────────────── ││
│ │ ────────────│ │ today?                     │ │ First seen:     ││
│ │              │ │                            │ │ Jan 10, 2025    ││
│ │ 🟢 John D.   │ │ 👤 John  10:24 AM         │ │                 ││
│ │ Active now   │ │ I can't login to my       │ │ Conversations: 3││
│ │              │ │ account. Tried resetting  │ │                 ││
│ │ 🔴 Sarah M.  │ │ password but nothing works│ │ ─────────────── ││
│ │ 12 min ago   │ │                            │ │ CONTEXT         ││
│ │              │ │ 🤖 AI Assistant  10:24 AM  │ │                 ││
│ │ 🔴 Alex T.   │ │ I found some info about   │ │ • Tried password││
│ │ 15 min ago   │ │ password reset. [Link]    │ │   reset 2x      ││
│ │              │ │ Did this help?            │ │ • Account type: ││
│ │              │ │                            │ │   Pro plan      ││
│ │              │ │ 👤 John  10:25 AM         │ │ • Browser:      ││
│ │              │ │ No, I already tried that. │ │   Chrome/Mac    ││
│ │              │ │ Can I talk to someone?    │ │                 ││
│ │              │ │                            │ │ ─────────────── ││
│ │              │ │ 🔀 Handed off to you      │ │ QUICK ACTIONS   ││
│ │              │ │ ─────────────────────────│ │                 ││
│ │              │ │                            │ │ [Reset Password]││
│ │              │ │ 👤 You (Agent)  10:26 AM  │ │ [View Account]  ││
│ │              │ │ Hi John! I see you're     │ │ [Send Invoice]  ││
│ │              │ │ having login issues. Let  │ │                 ││
│ │              │ │ me check your account...  │ │                 ││
│ │              │ │                            │ │                 ││
│ │              │ ├────────────────────────────┤ │                 ││
│ │              │ │ Type a message...    [Send]│ │                 ││
│ └──────────────┘ └────────────────────────────┘ └─────────────────┘│
└─────────────────────────────────────────────────────────────────────┘
```

#### Screen 3: Handoff Settings

```
┌─────────────────────────────────────────────────────────────────────┐
│  Settings > Handoff Configuration                                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  AUTOMATIC HANDOFF TRIGGERS                                         │
│  ─────────────────────────────────────────────────────────────────  │
│                                                                     │
│  AI Confidence Threshold                                            │
│  [========60%====|=========] 60%                                   │
│  Hand off when AI confidence is below this threshold                │
│                                                                     │
│  ☑ Enable sentiment detection                                       │
│    Hand off when frustrated language is detected                    │
│                                                                     │
│  ☑ Enable loop detection                                            │
│    Hand off after [3 ▼] similar failed attempts                    │
│                                                                     │
│  Trigger Keywords (hand off immediately when detected):             │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ human, agent, person, speak to someone, manager, cancel,    │   │
│  │ refund, angry, lawsuit                                       │   │
│  └─────────────────────────────────────────────────────────────┘   │
│  [+ Add keyword]                                                    │
│                                                                     │
│  BUSINESS HOURS                                                     │
│  ─────────────────────────────────────────────────────────────────  │
│                                                                     │
│  ☑ Enable business hours (outside hours → email capture)            │
│                                                                     │
│  Timezone: [America/New_York ▼]                                    │
│                                                                     │
│  │ Day       │ Hours              │ Enabled │                      │
│  │───────────│────────────────────│─────────│                      │
│  │ Monday    │ [9:00 AM] - [5:00 PM] │ ☑    │                      │
│  │ Tuesday   │ [9:00 AM] - [5:00 PM] │ ☑    │                      │
│  │ Wednesday │ [9:00 AM] - [5:00 PM] │ ☑    │                      │
│  │ Thursday  │ [9:00 AM] - [5:00 PM] │ ☑    │                      │
│  │ Friday    │ [9:00 AM] - [5:00 PM] │ ☑    │                      │
│  │ Saturday  │ [Closed]              │ ☐    │                      │
│  │ Sunday    │ [Closed]              │ ☐    │                      │
│                                                                     │
│                                            [Cancel] [Save Changes]  │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.5 Technical Architecture

#### Database Schema

```sql
-- Conversations table
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id),
  customer_email TEXT,
  customer_name TEXT,
  status TEXT CHECK (status IN ('ai_active', 'waiting', 'agent_active', 'resolved', 'closed')),
  assigned_agent_id UUID REFERENCES users(id),
  handoff_reason TEXT,
  ai_confidence_at_handoff FLOAT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  satisfaction_rating INT CHECK (satisfaction_rating BETWEEN 1 AND 5),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Messages table
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  sender_type TEXT CHECK (sender_type IN ('customer', 'ai', 'agent', 'system')),
  sender_id UUID, -- NULL for AI, customer; user_id for agents
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb, -- For AI: confidence, sources, etc.
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Handoff settings per project
CREATE TABLE handoff_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) UNIQUE,
  confidence_threshold FLOAT DEFAULT 0.6,
  sentiment_detection_enabled BOOLEAN DEFAULT true,
  loop_detection_enabled BOOLEAN DEFAULT true,
  loop_detection_threshold INT DEFAULT 3,
  trigger_keywords TEXT[] DEFAULT ARRAY['human', 'agent', 'person'],
  business_hours_enabled BOOLEAN DEFAULT false,
  business_hours JSONB DEFAULT '{}'::jsonb,
  timezone TEXT DEFAULT 'UTC',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent availability
CREATE TABLE agent_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  project_id UUID REFERENCES projects(id),
  status TEXT CHECK (status IN ('online', 'away', 'offline')),
  max_concurrent_chats INT DEFAULT 5,
  current_chat_count INT DEFAULT 0,
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, project_id)
);

-- Indexes for performance
CREATE INDEX idx_conversations_project_status ON conversations(project_id, status);
CREATE INDEX idx_conversations_assigned_agent ON conversations(assigned_agent_id) WHERE assigned_agent_id IS NOT NULL;
CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_created ON messages(created_at);
```

#### Real-time Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Customer      │     │   SupportBase   │     │   Agent         │
│   Widget        │     │   Backend       │     │   Dashboard     │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         │  WebSocket Connect    │                       │
         │──────────────────────>│                       │
         │                       │                       │
         │  New Message          │                       │
         │──────────────────────>│                       │
         │                       │  Process with AI      │
         │                       │─────────────┐         │
         │                       │<────────────┘         │
         │                       │                       │
         │  [If handoff needed]  │                       │
         │                       │  Broadcast: new_conv  │
         │                       │──────────────────────>│
         │                       │                       │
         │                       │  Agent claims conv    │
         │                       │<──────────────────────│
         │                       │                       │
         │  Status: Agent joined │                       │
         │<──────────────────────│                       │
         │                       │                       │
         │  New Message          │                       │
         │──────────────────────>│──────────────────────>│
         │                       │                       │
         │                       │  Agent Response       │
         │<──────────────────────│<──────────────────────│
         │                       │                       │
```

**Technology Stack:**
- Supabase Realtime for WebSocket connections
- Supabase Presence for agent online status
- PostgreSQL for conversation/message storage
- Edge Functions for handoff logic processing

#### API Endpoints

```typescript
// Conversation Management
POST   /api/conversations                    // Start new conversation
GET    /api/conversations                    // List conversations (with filters)
GET    /api/conversations/:id                // Get conversation with messages
PATCH  /api/conversations/:id                // Update status, assign agent
DELETE /api/conversations/:id                // Close/delete conversation

// Messages
POST   /api/conversations/:id/messages       // Send message
GET    /api/conversations/:id/messages       // Get messages (paginated)

// Agent Operations
POST   /api/conversations/:id/claim          // Agent claims conversation
POST   /api/conversations/:id/transfer       // Transfer to another agent
POST   /api/conversations/:id/resolve        // Mark as resolved

// Settings
GET    /api/projects/:id/handoff-settings    // Get handoff config
PUT    /api/projects/:id/handoff-settings    // Update handoff config

// Agent Status
PUT    /api/agent/status                     // Update online/away/offline
GET    /api/projects/:id/agents              // Get all agents and their status
```

### 3.6 Widget Changes

**New UI Elements for Customer Widget:**

```tsx
// New states to handle in widget
type ConversationState =
  | 'ai_chat'           // Talking to AI
  | 'requesting_human'  // Customer requested human
  | 'waiting_for_agent' // In queue for agent
  | 'agent_chat'        // Live chat with agent
  | 'offline_form';     // Outside business hours

// New component: Handoff Banner
function HandoffBanner({ state, position, agentName }) {
  if (state === 'waiting_for_agent') {
    return (
      <div className="bg-yellow-50 border-b border-yellow-200 p-3">
        <div className="flex items-center gap-2">
          <Spinner className="w-4 h-4" />
          <span>Connecting you to a support agent...</span>
        </div>
        <div className="text-sm text-yellow-700">
          Position in queue: #{position}
        </div>
      </div>
    );
  }

  if (state === 'agent_chat') {
    return (
      <div className="bg-green-50 border-b border-green-200 p-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full" />
          <span>Chatting with {agentName}</span>
        </div>
      </div>
    );
  }

  return null;
}

// New component: Request Human Button
function RequestHumanButton({ onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="text-sm text-slate-500 hover:text-slate-700"
    >
      Talk to a human
    </button>
  );
}
```

### 3.7 Metrics & Analytics

**New Dashboard Metrics:**
- Total conversations (AI-resolved vs human-resolved)
- Average handoff rate
- Average response time (AI vs human)
- Average resolution time
- Customer satisfaction scores
- Agent utilization (chats per agent)
- Peak hours heatmap
- Common handoff reasons

---

## Part 4: Feature Specification - Slack Integration

### 4.1 Overview

Enable SupportBase conversations to flow into Slack, allowing teams to provide support directly from where they already work. Bi-directional sync ensures customers get responses whether agents reply in Slack or the dashboard.

### 4.2 User Stories

**As a support agent:**
- I want to receive new support requests in a Slack channel
- I want to reply to customers directly from Slack
- I want to claim/assign conversations from Slack
- I want to see customer context without leaving Slack

**As a team lead:**
- I want to configure which Slack channel receives support requests
- I want to set up notifications for different urgency levels
- I want team members to coordinate on complex issues in threads

**As a customer:**
- I don't care where agents reply - I just want fast responses
- I want the same experience regardless of which tool agents use

### 4.3 Integration Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   SupportBase   │     │   SupportBase   │     │   Slack         │
│   Widget        │     │   Backend       │     │   Workspace     │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         │  New Conversation     │                       │
         │──────────────────────>│                       │
         │                       │                       │
         │                       │  [If handoff/new]     │
         │                       │  Post to Slack        │
         │                       │──────────────────────>│
         │                       │                       │
         │                       │                       │ Agent sees
         │                       │                       │ in channel
         │                       │                       │
         │                       │  Slack reply (thread) │
         │                       │<──────────────────────│
         │                       │                       │
         │  Agent Response       │                       │
         │<──────────────────────│                       │
         │                       │                       │
```

### 4.4 Slack Message Format

**New Conversation Notification:**

```
┌─────────────────────────────────────────────────────────────────┐
│ 🆕 New Support Conversation                                      │
│ ─────────────────────────────────────────────────────────────── │
│                                                                  │
│ 👤 Customer: John Davidson (john@example.com)                    │
│ 📱 Project: Acme SaaS                                           │
│ ⏰ Started: 2 minutes ago                                        │
│                                                                  │
│ 💬 Latest Message:                                               │
│ "I can't login to my account. I've tried resetting my password  │
│ twice but the reset email never arrives."                        │
│                                                                  │
│ 🤖 AI tried to help but customer requested human assistance      │
│                                                                  │
│ [Claim] [View in Dashboard] [Mark as Spam]                      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Threaded Conversation:**

```
┌─────────────────────────────────────────────────────────────────┐
│ [Parent message as shown above]                                  │
│                                                                  │
│ └─ Thread replies ────────────────────────────────────────────  │
│                                                                  │
│    @sarah claimed this conversation                              │
│                                                                  │
│    @sarah: Hi John! Let me check your account. Can you confirm  │
│    the email address you're using to login?                      │
│    ↳ ✅ Sent to customer                                         │
│                                                                  │
│    📨 Customer replied:                                          │
│    "It's john@example.com - the same one I'm using for this     │
│    chat"                                                         │
│                                                                  │
│    @sarah: Found it! Your account was flagged by our security   │
│    system. I've unlocked it - try logging in now.               │
│    ↳ ✅ Sent to customer                                         │
│                                                                  │
│    📨 Customer replied:                                          │
│    "It works now! Thank you so much!"                           │
│                                                                  │
│    @sarah marked this as resolved                                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 4.5 Slack Commands

```
/supportbase help                    - Show available commands
/supportbase status                  - Your availability status
/supportbase status online|away|off  - Set your status
/supportbase queue                   - Show waiting conversations
/supportbase stats                   - Show today's support metrics
```

### 4.6 Setup Flow UI

**Step 1: Connect Slack**

```
┌─────────────────────────────────────────────────────────────────┐
│  Settings > Integrations > Slack                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                                                          │    │
│  │        [Slack Logo]                                      │    │
│  │                                                          │    │
│  │  Connect your Slack workspace to receive support         │    │
│  │  requests and respond directly from Slack.               │    │
│  │                                                          │    │
│  │              [Add to Slack]                              │    │
│  │                                                          │    │
│  │  ✓ Receive notifications for new conversations           │    │
│  │  ✓ Reply to customers from Slack threads                 │    │
│  │  ✓ Claim and manage conversations                        │    │
│  │  ✓ Real-time sync with web dashboard                     │    │
│  │                                                          │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Step 2: Configure Channel**

```
┌─────────────────────────────────────────────────────────────────┐
│  Settings > Integrations > Slack                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ✅ Connected to: Acme Team                    [Disconnect]      │
│                                                                  │
│  ─────────────────────────────────────────────────────────────  │
│                                                                  │
│  Support Channel                                                 │
│  [#customer-support          ▼]                                 │
│  New support conversations will be posted here                   │
│                                                                  │
│  Notification Settings                                           │
│  ☑ Notify on new conversations                                   │
│  ☑ Notify on high-priority (sentiment: frustrated)               │
│  ☑ Notify when conversation waiting > 5 minutes                  │
│  ☐ Notify on every customer message                              │
│                                                                  │
│  Thread Behavior                                                 │
│  ● Create new thread per conversation                            │
│  ○ Post all in channel (no threads)                             │
│                                                                  │
│  Reply Sync                                                      │
│  ☑ Sync thread replies to customer                               │
│  ☑ Show "Sent to customer" confirmation                          │
│                                                                  │
│                                            [Save Configuration]  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 4.7 Technical Implementation

**Database Schema Additions:**

```sql
-- Slack workspace connections
CREATE TABLE slack_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id),
  team_id TEXT NOT NULL,              -- Slack workspace ID
  team_name TEXT,
  bot_token TEXT NOT NULL,            -- Encrypted
  channel_id TEXT,
  channel_name TEXT,
  settings JSONB DEFAULT '{
    "notify_new": true,
    "notify_priority": true,
    "notify_waiting": true,
    "waiting_threshold_minutes": 5,
    "use_threads": true,
    "sync_replies": true
  }'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id)
);

-- Map conversations to Slack messages
CREATE TABLE slack_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  slack_integration_id UUID REFERENCES slack_integrations(id),
  channel_id TEXT NOT NULL,
  message_ts TEXT NOT NULL,           -- Slack message timestamp (ID)
  thread_ts TEXT,                      -- Thread parent timestamp
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Map SupportBase messages to Slack messages for sync
CREATE TABLE message_slack_sync (
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  slack_message_ts TEXT NOT NULL,
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (message_id)
);
```

**Slack Event Handlers:**

```typescript
// Handle Slack events
export async function handleSlackEvent(event: SlackEvent) {
  switch (event.type) {
    case 'message':
      // Check if it's a thread reply in a support channel
      if (event.thread_ts && isSuportConversation(event.thread_ts)) {
        await handleAgentReply(event);
      }
      break;

    case 'reaction_added':
      // Handle emoji reactions for quick actions
      // ✅ = resolve, 🚫 = spam, 👋 = claim
      await handleReaction(event);
      break;

    case 'app_mention':
      // Handle @supportbase mentions
      await handleMention(event);
      break;
  }
}

async function handleAgentReply(event: SlackMessageEvent) {
  // Find the conversation from thread_ts
  const slackMessage = await db.slack_messages.findByThreadTs(event.thread_ts);
  if (!slackMessage) return;

  // Get or create agent user from Slack user
  const agent = await getOrCreateAgentFromSlack(event.user);

  // Save message to SupportBase
  const message = await db.messages.create({
    conversation_id: slackMessage.conversation_id,
    sender_type: 'agent',
    sender_id: agent.id,
    content: event.text,
    metadata: { source: 'slack', slack_ts: event.ts }
  });

  // Send to customer via real-time
  await broadcastToCustomer(slackMessage.conversation_id, message);

  // Add confirmation reaction to Slack message
  await slack.reactions.add({
    channel: event.channel,
    timestamp: event.ts,
    name: 'white_check_mark'
  });
}
```

---

## Part 5: Feature Specification - Simple Ticketing System

### 5.1 Overview

A lightweight ticketing system that automatically creates tickets from unresolved conversations. Focus on simplicity over enterprise features - this is for small teams that need basic tracking, not Zendesk-level complexity.

### 5.2 Core Concepts

**Ticket = Unresolved Conversation + Accountability**

A ticket is created when:
1. Customer leaves conversation before resolution
2. Outside business hours (email captured)
3. Agent marks as "needs follow-up"
4. Auto-created from lead capture

### 5.3 Ticket States

```
┌─────────┐     ┌──────────┐     ┌─────────────┐     ┌──────────┐
│  Open   │────>│ In Progress│────>│ Waiting on  │────>│ Resolved │
│         │     │           │     │  Customer   │     │          │
└─────────┘     └──────────┘     └─────────────┘     └──────────┘
     │                                  │                  │
     │                                  │                  │
     └─────────────────────────────────<┘                  │
                    (Customer replies)                      │
                                                           │
     ┌──────────┐                                          │
     │ Closed   │<─────────────────────────────────────────┘
     │          │        (After X days or manual)
     └──────────┘
```

### 5.4 Ticket List View

```
┌─────────────────────────────────────────────────────────────────────┐
│  Tickets                                          [+ Create Ticket] │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  [All] [Open (12)] [In Progress (5)] [Waiting (3)] [Resolved (45)] │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ Search tickets...                          [Filter ▼] [Sort ▼] │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ #127 Can't access premium features after upgrade              │  │
│  │ 🔴 Open • High Priority • john@example.com                    │  │
│  │ Created 2 hours ago • Unassigned                              │  │
│  │ Last: "I paid but still shows free plan"                      │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ #126 API returns 500 error on /users endpoint                 │  │
│  │ 🟡 In Progress • Normal • dev@techcorp.io                     │  │
│  │ Created 5 hours ago • Assigned to Sarah                       │  │
│  │ Last: "Investigating the logs now"                            │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ #125 Feature request: Dark mode                               │  │
│  │ 🟢 Waiting on Customer • Low • feedback@user.com              │  │
│  │ Created 1 day ago • Assigned to Mike                          │  │
│  │ Last: "Added to roadmap, any other features you'd like?"      │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ──────────────────────────────────────────────────────────────────│
│  Showing 1-10 of 65 tickets                    [< Prev] [Next >]   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 5.5 Single Ticket View

```
┌─────────────────────────────────────────────────────────────────────┐
│  ← Back to Tickets                                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  #127 Can't access premium features after upgrade                   │
│  ────────────────────────────────────────────────────────────────  │
│                                                                     │
│  ┌─────────────────────────────────┐  ┌──────────────────────────┐ │
│  │ CONVERSATION                    │  │ DETAILS                  │ │
│  │                                 │  │                          │ │
│  │ 🤖 AI Assistant  2:15 PM       │  │ Status: [Open ▼]         │ │
│  │ Hi! How can I help?            │  │ Priority: [High ▼]       │ │
│  │                                 │  │ Assignee: [Unassigned ▼] │ │
│  │ 👤 John  2:16 PM               │  │                          │ │
│  │ I just upgraded to premium but │  │ ────────────────────     │ │
│  │ I still can't access any of    │  │                          │ │
│  │ the features. My dashboard     │  │ Customer                 │ │
│  │ still shows "Free Plan"        │  │ John Davidson            │ │
│  │                                 │  │ john@example.com         │ │
│  │ 🤖 AI Assistant  2:16 PM       │  │                          │ │
│  │ I found some troubleshooting   │  │ Created                  │ │
│  │ steps for plan issues...       │  │ Jan 15, 2025 2:15 PM    │ │
│  │                                 │  │                          │ │
│  │ 👤 John  2:18 PM               │  │ Source                   │ │
│  │ I already tried that. Can I    │  │ Chat Widget              │ │
│  │ talk to someone about this?    │  │                          │ │
│  │                                 │  │ ────────────────────     │ │
│  │ 🔀 Customer left chat          │  │                          │ │
│  │    Ticket #127 created         │  │ Tags                     │ │
│  │                                 │  │ [billing] [upgrade] [+]  │ │
│  │                                 │  │                          │ │
│  │ ─────────────────────────────  │  │ ────────────────────     │ │
│  │                                 │  │                          │ │
│  │ ✉️ Add internal note or reply  │  │ INTERNAL NOTES           │ │
│  │                                 │  │                          │ │
│  │ [Note to team] [Reply to customer] │  │ No notes yet            │ │
│  │                                 │  │ [+ Add note]             │ │
│  │ ┌───────────────────────────┐  │  │                          │ │
│  │ │ Type your message...     │  │  │                          │ │
│  │ └───────────────────────────┘  │  │                          │ │
│  │               [Send]           │  │                          │ │
│  │                                 │  │                          │ │
│  └─────────────────────────────────┘  └──────────────────────────┘ │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 5.6 Technical Implementation

**Database Schema:**

```sql
-- Tickets table (extends conversations)
CREATE TABLE tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number SERIAL,               -- Human-readable #127
  conversation_id UUID REFERENCES conversations(id),
  project_id UUID REFERENCES projects(id),

  -- Core fields
  subject TEXT NOT NULL,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'waiting', 'resolved', 'closed')),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),

  -- Assignment
  assigned_to UUID REFERENCES users(id),

  -- Customer info (denormalized for queries)
  customer_email TEXT,
  customer_name TEXT,

  -- Metadata
  source TEXT CHECK (source IN ('chat', 'email', 'manual', 'lead_capture')),
  tags TEXT[] DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  first_response_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ
);

-- Internal notes (not visible to customer)
CREATE TABLE ticket_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ticket activity log
CREATE TABLE ticket_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  action TEXT NOT NULL,               -- 'created', 'status_changed', 'assigned', 'replied', 'noted'
  details JSONB DEFAULT '{}'::jsonb,  -- { from: 'open', to: 'in_progress' }
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create ticket function
CREATE OR REPLACE FUNCTION auto_create_ticket()
RETURNS TRIGGER AS $$
BEGIN
  -- Create ticket when conversation is abandoned or needs follow-up
  IF NEW.status IN ('waiting', 'offline') AND OLD.status NOT IN ('waiting', 'offline') THEN
    INSERT INTO tickets (conversation_id, project_id, subject, customer_email, customer_name, source)
    SELECT
      NEW.id,
      NEW.project_id,
      COALESCE(
        (SELECT content FROM messages WHERE conversation_id = NEW.id ORDER BY created_at LIMIT 1),
        'Support Request'
      ),
      NEW.customer_email,
      NEW.customer_name,
      'chat'
    WHERE NOT EXISTS (
      SELECT 1 FROM tickets WHERE conversation_id = NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_create_ticket
AFTER UPDATE ON conversations
FOR EACH ROW EXECUTE FUNCTION auto_create_ticket();
```

---

## Part 6: Implementation Roadmap

### Phase 1: Human Handoff + Live Chat Dashboard (4-6 weeks)

**Week 1-2: Core Infrastructure**
- [ ] Database schema for conversations, messages, handoff settings
- [ ] Real-time WebSocket setup with Supabase
- [ ] Basic conversation API endpoints
- [ ] Handoff logic service (confidence threshold, keywords)

**Week 3-4: Agent Dashboard**
- [ ] Dashboard layout and navigation
- [ ] Conversation list with filtering
- [ ] Active conversation view
- [ ] Real-time message updates
- [ ] Agent status management

**Week 5-6: Widget Updates + Polish**
- [ ] Widget handoff flow states
- [ ] "Talk to human" button
- [ ] Queue position indicator
- [ ] Agent typing indicators
- [ ] Settings page for handoff configuration

### Phase 2: Slack Integration (3-4 weeks)

**Week 1: Slack App Setup**
- [ ] Create Slack app with proper scopes
- [ ] OAuth flow for workspace connection
- [ ] Basic message posting to channels

**Week 2: Bi-directional Sync**
- [ ] Post new conversations to Slack
- [ ] Handle thread replies from agents
- [ ] Sync messages to customer widget
- [ ] Confirmation reactions

**Week 3-4: Polish + Commands**
- [ ] Slack slash commands
- [ ] Interactive buttons (claim, resolve)
- [ ] Settings page for Slack config
- [ ] Error handling and retry logic

### Phase 3: Simple Ticketing (2-3 weeks)

**Week 1: Core Ticketing**
- [ ] Database schema for tickets
- [ ] Auto-create tickets from conversations
- [ ] Ticket list view with filters

**Week 2: Ticket Management**
- [ ] Single ticket view
- [ ] Status/priority/assignment management
- [ ] Internal notes
- [ ] Email replies to customers

**Week 3: Polish**
- [ ] Activity log
- [ ] Tags and search
- [ ] Basic metrics
- [ ] Email notifications

---

## Part 7: Success Metrics

### Launch Metrics (30 days post-launch)

**Human Handoff:**
- 50%+ of conversations use handoff feature
- Average handoff response time < 2 minutes
- Customer satisfaction rating > 4.0/5

**Slack Integration:**
- 20%+ of active projects connect Slack
- 30%+ of agent responses come from Slack
- Zero sync issues/data loss

**Ticketing:**
- 70%+ ticket resolution rate
- Average time to first response < 4 hours
- Internal adoption (notes used in 50%+ tickets)

### Business Metrics

- Conversion increase: +20% paid conversions
- Retention: -15% churn for teams using handoff
- Expansion: +30% teams add 2nd+ agent seat
- NPS: > 50

---

## Appendix: Competitive Positioning

### New Feature Comparison

| Feature | SupportBase | Intercom | Crisp | Tidio |
|---------|-------------|----------|-------|-------|
| AI Chatbot | ✅ RAG-powered | ✅ Fin AI | ✅ Basic | ✅ Basic |
| Human Handoff | ✅ Planned | ✅ | ✅ | ✅ |
| Live Dashboard | ✅ Planned | ✅ | ✅ | ✅ |
| Slack Integration | ✅ Planned | ✅ | ❌ | ❌ |
| MCP Integration | ✅ Unique | ❌ | ❌ | ❌ |
| Simple Ticketing | ✅ Planned | ✅ | ✅ | ✅ |
| Vibe Coder Focus | ✅ Unique | ❌ | ❌ | ❌ |
| One-line Embed | ✅ | ✅ | ✅ | ✅ |
| Pricing for SMB | ✅ | ❌ | ✅ | ✅ |

### Unique Value Propositions Post-Features

1. **Only MCP-native support platform** - Build and manage from your IDE
2. **AI + Human hybrid designed together** - Not bolted on
3. **Slack-first for B2B** - Native workflow integration
4. **Simple ticketing that doesn't suck** - No enterprise bloat
5. **Priced for indie hackers** - Not VC-backed enterprises

---

*Document Version: 1.0*
*Last Updated: January 2025*
*Author: SupportBase Product Team*
