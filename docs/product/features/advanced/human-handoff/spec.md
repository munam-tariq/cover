# Feature: Human Handoff (Live Escalation)

## Overview

**Feature ID**: `human-handoff`
**Category**: Advanced (V3) → Consider for Immediate Priority
**Priority**: P1 (High - Key Differentiator)
**Complexity**: L (Large) - Multiple implementation options
**Estimated Effort**: 5-10 days (depending on option chosen)
**Status**: 🔶 NEEDS DECISION - Multiple implementation paths

### Summary

Enable seamless escalation from AI chatbot to human support when conversations require human intervention. The system detects escalation triggers, notifies the appropriate person, and enables real-time or async communication between the business owner and the customer.

### Why This Feature Matters

From deep research analysis:

> "There's almost nothing more infuriating than having to repeat your entire problem to a human agent after you just spent five minutes explaining it to a bot."

**Key Statistics:**
- 18% of customers will cut ties when stuck with no human option
- 44% more are "more than likely" to leave
- 38% extremely likely to disengage when they have to repeat their issue
- 80% of people will only use chatbots if they know a human option exists

**The Gap in the Market:**
Most chatbots either:
1. Don't offer human handoff at all
2. Hand off without context (customer repeats everything)

**Our Opportunity:** AI-summarized context transfer - the chatbot generates a summary of the conversation before handoff, so the human has full context immediately.

### Dependencies

- `chat-engine` ✅ - Core chat infrastructure
- `lead-capture` ✅ - Existing async escalation (potential merge)
- `auth-system` ✅ - User authentication
- `team-collaboration` ❌ (Optional - for full agent dashboard)
- `webhooks` ❌ (Optional - for external integrations)

---

## Research Findings

### Source 1: When to Escalate

From [Quidget](https://quidget.ai/blog/ai-automation/when-should-chatbots-escalate-to-human-agents-with-real-examples/):

| Trigger | Description | Priority |
|---------|-------------|----------|
| **Direct Request** | User says "talk to a person", "agent please" | Immediate |
| **Repeated Failures** | Bot fails to help 2-3 times in a row | High |
| **Negative Sentiment** | Frustration, anger detected | High |
| **Complex/Sensitive** | Billing, refunds, cancellations | High |
| **High-Value Customer** | VIP accounts, large orders | Medium |
| **Time-Sensitive** | Urgent issues (travel, deadlines) | High |

### Source 2: Context Transfer is Critical

From [SpurNow](https://www.spurnow.com/en/blogs/chatbot-to-human-handoff):

> "When a chatbot hands off a conversation to a human agent, it's important to provide the agent with the full conversation history. This prevents the agent from asking repetitive questions, which can frustrate the customer."

**Best Practice - Agent's First Message Should:**
> "Hi {name}, I see you were chatting with our bot about a refund for Order #1234. I can help with that."

### Source 3: Two Escalation Modes

From [JivoChat](https://www.jivochat.com/blog/communication/offline-messages.html) and [Kommunicate](https://www.kommunicate.io/blog/chatbot-human-handoff/):

| Mode | When to Use | User Experience |
|------|-------------|-----------------|
| **Live Takeover** | Agent available, business hours | Real-time chat continues |
| **Leave Message** | No agents, after hours | Ticket created, follow-up promised |

### Source 4: Small Business Reality

From [Social Intents](https://www.socialintents.com/blog/ai-chatbot-with-human-handoff/):

> "When the AI detects that a message requires human attention, it automatically escalates the chat to your connected Slack channel. Your team can then jump in and continue the conversation seamlessly from Slack."

**Key Insight:** Small businesses don't have dedicated support teams. They need notifications where they already are (Slack, email) and ability to reply from that same channel.

### Source 5: Two-Way Communication

From [ClearFeed](https://clearfeed.ai/blogs/slack-hubspot-integration-to-improve-workflow):

> "Whatever happens in Slack shows up in HubSpot. Whatever agents do in HubSpot flows back into the Slack thread. Everyone sees the same info."

**Key Insight:** Users expect to reply from Slack/WhatsApp and have it appear in the customer's chat. One-way notification is frustrating.

---

## Relationship with Existing Lead Capture

### Current Lead Capture Feature

Cover already has lead capture that:
- Detects when bot can't answer
- Offers to collect visitor's email
- Sends daily digest to business owner
- Creates lead record for follow-up

### How Human Handoff Differs

| Aspect | Lead Capture | Human Handoff |
|--------|--------------|---------------|
| **Trigger** | Bot can't answer | User requests human OR high-stakes |
| **Goal** | Collect contact for later | Get human involved NOW |
| **Timing** | Async (hours/days) | Sync or near-sync (minutes) |
| **User Expectation** | "Someone will contact me" | "I'm talking to a human now" |
| **Communication** | One-way (email follow-up) | Two-way (real-time chat) |

### 🔶 DECISION NEEDED: Merge or Separate?

**Option A: Keep Separate**
- Lead capture for "bot can't answer"
- Human handoff for "user requests human"
- Two distinct features

**Option B: Merge into Unified Escalation**
- One escalation system with two modes
- Async mode (like current lead capture)
- Sync mode (real-time handoff)
- Settings control which triggers use which mode

**Recommendation:** Option B - Unified system is cleaner for users

---

## Implementation Options

### Option A: Async Only (Enhanced Lead Capture)

**Complexity:** Low (3-4 days)
**Architecture:** Extends existing lead-capture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    OPTION A: ASYNC ONLY FLOW                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Customer in Widget          Cover System              Business      │
│  ─────────────────          ────────────              ─────────      │
│                                                                      │
│  "I need to talk to         Detect escalation                       │
│   a human"                  trigger                                 │
│       │                          │                                   │
│       ▼                          ▼                                   │
│  ┌─────────────┐          ┌─────────────┐                           │
│  │ "I'll       │          │ Generate AI │                           │
│  │ connect you │          │ Summary of  │                           │
│  │ with our    │          │ conversation│                           │
│  │ team..."    │          └─────────────┘                           │
│  └─────────────┘                 │                                   │
│       │                          ▼                                   │
│       ▼                   ┌─────────────┐         ┌─────────────┐   │
│  ┌─────────────┐          │ Create      │────────▶│ Email       │   │
│  │ "What's your│          │ Support     │         │ Notification│   │
│  │ email so we │          │ Ticket      │         └─────────────┘   │
│  │ can follow  │          └─────────────┘                │          │
│  │ up?"        │                                         ▼          │
│  └─────────────┘                                  ┌─────────────┐   │
│       │                                           │ Owner sees  │   │
│       ▼                                           │ ticket +    │   │
│  Customer provides                                │ AI summary  │   │
│  email                                            └─────────────┘   │
│       │                                                  │          │
│       ▼                                                  ▼          │
│  ┌─────────────┐                                  ┌─────────────┐   │
│  │ "Thanks!    │                                  │ Owner       │   │
│  │ We'll email │                                  │ replies via │   │
│  │ you within  │                                  │ email       │   │
│  │ 2 hours"    │                                  └─────────────┘   │
│  └─────────────┘                                         │          │
│                                                          ▼          │
│  ┌─────────────┐                                  Customer gets    │
│  │ Customer    │◀─────────────────────────────── email response    │
│  │ receives    │                                                    │
│  │ email       │                                                    │
│  └─────────────┘                                                    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

**What It Does:**
1. User requests human → Collect email → Create ticket → Notify owner
2. AI generates conversation summary for the ticket
3. Owner replies via email (outside the widget)
4. No real-time takeover

**Pros:**
- Simple, builds on existing lead-capture infrastructure
- No real-time messaging complexity
- Works for all business sizes
- AI summary is the differentiator

**Cons:**
- Not truly "handoff" - just better lead capture
- Customer leaves widget, waits for email
- No real-time conversation

**Best For:** MVP if you want to ship fast, businesses without real-time availability

---

### Option B: Slack Integration with Reply-Back (RECOMMENDED)

**Complexity:** Medium (5-7 days)
**Architecture:** New Slack integration + WebSocket for real-time

```
┌─────────────────────────────────────────────────────────────────────┐
│                 OPTION B: SLACK INTEGRATION FLOW                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Customer Widget        Cover Backend         Slack           Owner  │
│  ───────────────        ────────────         ─────           ─────  │
│                                                                      │
│  "I need a human"                                                    │
│       │                                                              │
│       ▼                                                              │
│  ┌─────────────┐                                                    │
│  │ Bot: "Let me│                                                    │
│  │ connect you │                                                    │
│  │ with our    │                                                    │
│  │ team..."    │                                                    │
│  └─────────────┘                                                    │
│       │                                                              │
│       │              ┌─────────────┐                                │
│       └─────────────▶│ Generate AI │                                │
│                      │ Summary     │                                │
│                      └─────────────┘                                │
│                             │                                        │
│                             ▼                                        │
│                      ┌─────────────┐    ┌─────────────┐             │
│                      │ Send to     │───▶│ #support    │             │
│                      │ Slack       │    │ channel     │             │
│                      └─────────────┘    └─────────────┘             │
│                                                │                     │
│                                                ▼                     │
│                                         ┌───────────────┐           │
│                                         │ 🔔 New Chat   │           │
│                                         │ Request       │           │
│                                         │               │           │
│                                         │ Customer:     │           │
│                                         │ John (widget) │           │
│                                         │               │           │
│                                         │ 📝 AI Summary:│           │
│                                         │ Customer is   │           │
│                                         │ asking about  │           │
│                                         │ refund for    │           │
│                                         │ order #1234.  │           │
│                                         │ Bot couldn't  │           │
│                                         │ help with     │           │
│                                         │ policy...     │           │
│                                         │               │           │
│                                         │ [View Full]   │           │
│                                         │ [Take Over]   │           │
│                                         └───────────────┘           │
│                                                │                     │
│  ┌─────────────┐                              │                     │
│  │ "Sarah from │◀─────────────────────────────┘                     │
│  │ support has │     Owner clicks                                   │
│  │ joined the  │     "Take Over"                                    │
│  │ chat"       │                                                    │
│  └─────────────┘                                                    │
│       │                                                              │
│       │                                         ┌─────────────┐     │
│       │                                         │ Owner types │     │
│       │                                         │ in Slack    │     │
│       │                                         │ thread      │     │
│       │                                         └─────────────┘     │
│       │                                                │             │
│       ▼                                                │             │
│  ┌─────────────┐                                      │             │
│  │ "Hi John,   │◀─────────────────────────────────────┘             │
│  │ I see you   │     Message synced                                 │
│  │ need help   │     to widget                                      │
│  │ with..."    │                                                    │
│  └─────────────┘                                                    │
│       │                                                              │
│       ▼                                                              │
│  ┌─────────────┐                                                    │
│  │ Customer    │                                                    │
│  │ replies in  │─────────────────────────────────────▶ Appears in   │
│  │ widget      │                                       Slack thread │
│  └─────────────┘                                                    │
│       │                                                              │
│       ▼                                                              │
│  TWO-WAY REAL-TIME CONVERSATION                                     │
│  Widget ◀────────────────────────────────────────────▶ Slack       │
│                                                                      │
│                             │                                        │
│                             ▼                                        │
│                      ┌─────────────┐                                │
│                      │ Owner clicks│                                │
│                      │ "Resolve"   │                                │
│                      └─────────────┘                                │
│                             │                                        │
│       ┌─────────────┐       │                                        │
│       │ "Your issue │◀──────┘                                        │
│       │ has been    │                                                │
│       │ resolved.   │                                                │
│       │ Anything    │                                                │
│       │ else?"      │                                                │
│       └─────────────┘                                                │
│             │                                                        │
│             ▼                                                        │
│       Bot resumes if needed                                         │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

**What It Does:**
1. User requests human in widget
2. AI generates conversation summary
3. Notification sent to Slack channel with summary + action buttons
4. Owner clicks "Take Over" to join conversation
5. Owner types in Slack thread → appears in customer's widget
6. Customer replies in widget → appears in Slack thread
7. Full two-way real-time conversation
8. Owner clicks "Resolve" to end and optionally hand back to bot

**Technical Architecture:**

```
┌──────────────────────────────────────────────────────────────────┐
│                    TECHNICAL ARCHITECTURE                         │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│   Widget                  Cover API                    Slack      │
│   ──────                  ─────────                    ─────      │
│                                                                   │
│  ┌─────────┐           ┌─────────────┐           ┌─────────┐    │
│  │ WebSocket│◀────────▶│ WebSocket   │           │ Slack   │    │
│  │ Client  │           │ Server      │◀─────────▶│ API     │    │
│  └─────────┘           └─────────────┘           └─────────┘    │
│       │                      │                         │         │
│       │                      ▼                         │         │
│       │               ┌─────────────┐                  │         │
│       │               │ Message     │                  │         │
│       └──────────────▶│ Router      │◀─────────────────┘         │
│                       └─────────────┘                            │
│                              │                                    │
│                              ▼                                    │
│                       ┌─────────────┐                            │
│                       │ Supabase    │                            │
│                       │ - messages  │                            │
│                       │ - handoffs  │                            │
│                       │ - sessions  │                            │
│                       └─────────────┘                            │
│                                                                   │
│  Message Flow:                                                    │
│  1. Widget → WebSocket → Cover API → Slack API → Slack Channel   │
│  2. Slack Channel → Slack API → Cover API → WebSocket → Widget   │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

**Pros:**
- Small business owners live in Slack
- True two-way real-time communication
- No separate dashboard needed
- AI summary is the differentiator
- Familiar interface (Slack)

**Cons:**
- Requires Slack app setup/approval
- More complex than Option A
- Need to handle "no response" scenarios
- WebSocket infrastructure needed

**Best For:** Primary recommendation - fits vibe coders and small teams perfectly

---

### Option C: Multi-Channel with Dashboard (Full Enterprise)

**Complexity:** High (10-15 days)
**Architecture:** Full real-time system with agent dashboard

```
┌─────────────────────────────────────────────────────────────────────┐
│                 OPTION C: FULL DASHBOARD FLOW                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Customer              Cover Dashboard              Notifications    │
│  ────────              ───────────────              ─────────────    │
│                                                                      │
│  Widget Chat           ┌────────────────────────┐                   │
│       │                │ Agent Dashboard        │                   │
│       │                │                        │                   │
│       │                │ Queue (3)              │   ┌─────────┐    │
│       │                │ ┌──────────────────┐   │   │ Slack   │    │
│       │                │ │ 🔴 John - 5min   │   │   │ Notify  │    │
│       │                │ │ 🟡 Sarah - 2min  │   │◀─▶│         │    │
│       │                │ │ 🟢 Mike - 1min   │   │   └─────────┘    │
│       │                │ └──────────────────┘   │                   │
│       │                │                        │   ┌─────────┐    │
│       │                │ My Conversations (2)   │   │ Email   │    │
│       └───────────────▶│ ┌──────────────────┐   │◀─▶│ Notify  │    │
│     Escalation         │ │ Emily - Active   │   │   └─────────┘    │
│     request            │ │ Tom - Waiting    │   │                   │
│                        │ └──────────────────┘   │   ┌─────────┐    │
│                        │                        │   │ WhatsApp│    │
│                        │ ┌──────────────────┐   │◀─▶│ Notify  │    │
│                        │ │ Conversation View│   │   └─────────┘    │
│                        │ │                  │   │                   │
│                        │ │ AI Summary:      │   │                   │
│                        │ │ Customer needs   │   │                   │
│                        │ │ help with...     │   │                   │
│                        │ │                  │   │                   │
│                        │ │ [Chat History]   │   │                   │
│                        │ │                  │   │                   │
│                        │ │ [Reply Box]      │   │                   │
│                        │ │                  │   │                   │
│                        │ │ [Resolve] [Transfer]│ │                   │
│                        │ └──────────────────┘   │                   │
│                        │                        │                   │
│                        └────────────────────────┘                   │
│                                                                      │
│  Features:                                                          │
│  • Real-time queue with priority sorting                            │
│  • Multiple notification channels                                   │
│  • Agent availability management                                    │
│  • Conversation transfer between agents                             │
│  • SLA tracking and alerts                                          │
│  • Canned responses / Quick replies                                 │
│  • Customer info sidebar                                            │
│  • Internal notes                                                   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

**What It Does:**
- Full agent dashboard in Cover web app
- Queue management with priority
- Multiple notification channels (Slack, WhatsApp, Email)
- Agent status (available/busy/away)
- Conversation transfer, internal notes
- SLA tracking

**Pros:**
- Complete enterprise solution
- Scales to teams
- Full control and visibility
- Professional support experience

**Cons:**
- 2-3 weeks of development
- Overkill for solopreneurs
- Requires team-collaboration feature
- Maintenance overhead

**Best For:** V2/V3 after you have team-collaboration, for businesses with support teams

---

## Comparison Matrix

| Feature | Option A (Async) | Option B (Slack) | Option C (Dashboard) |
|---------|------------------|------------------|----------------------|
| **Development Time** | 3-4 days | 5-7 days | 10-15 days |
| **Real-time Chat** | ❌ | ✅ | ✅ |
| **Two-way Communication** | ❌ (Email only) | ✅ (Slack ↔ Widget) | ✅ (Dashboard ↔ Widget) |
| **AI Summary** | ✅ | ✅ | ✅ |
| **Notification Channels** | Email | Email + Slack | Email + Slack + WhatsApp |
| **Queue Management** | ❌ | ❌ | ✅ |
| **Agent Dashboard** | ❌ | ❌ | ✅ |
| **Multiple Agents** | ❌ | Limited | ✅ |
| **Best For** | MVP / No real-time | Small teams | Support teams |
| **Dependencies** | Lead-capture | Slack API | Team-collaboration |

---

## Detailed User Flows

### Flow 1: Escalation Trigger Detection

```
┌─────────────────────────────────────────────────────────────────────┐
│                 ESCALATION TRIGGER DETECTION                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│                        Customer Message                              │
│                              │                                       │
│                              ▼                                       │
│                    ┌─────────────────┐                              │
│                    │ Trigger Check   │                              │
│                    └─────────────────┘                              │
│                              │                                       │
│         ┌────────────────────┼────────────────────┐                 │
│         │                    │                    │                 │
│         ▼                    ▼                    ▼                 │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐           │
│  │ KEYWORD     │     │ SENTIMENT   │     │ FAILURE     │           │
│  │ DETECTION   │     │ ANALYSIS    │     │ COUNT       │           │
│  │             │     │             │     │             │           │
│  │ "human"     │     │ Frustration │     │ Bot failed  │           │
│  │ "agent"     │     │ score > 0.7 │     │ 3+ times    │           │
│  │ "person"    │     │             │     │             │           │
│  │ "help"      │     │             │     │             │           │
│  │ "support"   │     │             │     │             │           │
│  └─────────────┘     └─────────────┘     └─────────────┘           │
│         │                    │                    │                 │
│         └────────────────────┴────────────────────┘                 │
│                              │                                       │
│                              ▼                                       │
│                    ┌─────────────────┐                              │
│                    │ Any trigger     │                              │
│                    │ matched?        │                              │
│                    └─────────────────┘                              │
│                        │         │                                   │
│                       YES        NO                                  │
│                        │         │                                   │
│                        ▼         ▼                                   │
│              ┌─────────────┐  Continue                              │
│              │ Check if    │  with bot                              │
│              │ handoff     │                                        │
│              │ enabled     │                                        │
│              └─────────────┘                                        │
│                   │      │                                           │
│                ENABLED  DISABLED                                     │
│                   │      │                                           │
│                   ▼      ▼                                           │
│           Handoff Flow   Lead Capture                               │
│                          Flow                                        │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Flow 2: Availability Check & Mode Selection

```
┌─────────────────────────────────────────────────────────────────────┐
│              AVAILABILITY CHECK & MODE SELECTION                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│                    Handoff Triggered                                 │
│                          │                                           │
│                          ▼                                           │
│               ┌─────────────────┐                                   │
│               │ Check Project   │                                   │
│               │ Settings        │                                   │
│               └─────────────────┘                                   │
│                          │                                           │
│            ┌─────────────┴─────────────┐                            │
│            │                           │                            │
│            ▼                           ▼                            │
│    ┌─────────────┐            ┌─────────────┐                       │
│    │ Business    │            │ Notification│                       │
│    │ Hours Set?  │            │ Channel     │                       │
│    └─────────────┘            │ Configured? │                       │
│         │    │                └─────────────┘                       │
│        YES   NO                    │    │                           │
│         │    │                    YES   NO                          │
│         ▼    │                     │    │                           │
│    ┌─────────┐                     │    ▼                           │
│    │Within   │                     │  ┌─────────────┐               │
│    │hours?   │                     │  │ ASYNC MODE  │               │
│    └─────────┘                     │  │ (Email only)│               │
│      │    │                        │  └─────────────┘               │
│     YES   NO                       │                                │
│      │    │                        │                                │
│      │    ▼                        │                                │
│      │  ┌─────────────┐            │                                │
│      │  │ ASYNC MODE  │            │                                │
│      │  │ (Leave msg) │            │                                │
│      │  └─────────────┘            │                                │
│      │                             │                                │
│      └─────────────────────────────┘                                │
│                     │                                                │
│                     ▼                                                │
│            ┌─────────────────┐                                      │
│            │ SYNC MODE       │                                      │
│            │ (Real-time)     │                                      │
│            └─────────────────┘                                      │
│                     │                                                │
│                     ▼                                                │
│            Notify via configured                                    │
│            channel (Slack/Email)                                    │
│                     │                                                │
│                     ▼                                                │
│            ┌─────────────────┐                                      │
│            │ Response within │                                      │
│            │ X minutes?      │                                      │
│            └─────────────────┘                                      │
│                  │      │                                            │
│                 YES     NO                                           │
│                  │      │                                            │
│                  ▼      ▼                                            │
│           Live Chat   Convert to                                    │
│           Continues   Async Mode                                    │
│                       (Ticket)                                       │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Flow 3: AI Summary Generation

```
┌─────────────────────────────────────────────────────────────────────┐
│                   AI SUMMARY GENERATION                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│                 Conversation History                                 │
│                        │                                             │
│                        ▼                                             │
│              ┌─────────────────┐                                    │
│              │ GPT-4o-mini     │                                    │
│              │ Summarization   │                                    │
│              └─────────────────┘                                    │
│                        │                                             │
│                        ▼                                             │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │                                                                │ │
│  │  📝 CONVERSATION SUMMARY                                       │ │
│  │  ──────────────────────────                                    │ │
│  │                                                                │ │
│  │  Customer: John Smith (john@example.com)                       │ │
│  │  Session Duration: 8 minutes                                   │ │
│  │  Messages Exchanged: 12                                        │ │
│  │                                                                │ │
│  │  🎯 MAIN ISSUE:                                                │ │
│  │  Customer is requesting a refund for Order #1234 placed        │ │
│  │  on Dec 15. They received a damaged product and want           │ │
│  │  a full refund instead of replacement.                         │ │
│  │                                                                │ │
│  │  🤖 WHAT BOT TRIED:                                            │ │
│  │  1. Offered replacement product                                │ │
│  │  2. Explained standard return policy                           │ │
│  │  3. Provided return shipping label                             │ │
│  │                                                                │ │
│  │  ❌ WHY ESCALATED:                                             │ │
│  │  Customer explicitly requested human agent after bot           │ │
│  │  couldn't authorize refund for damaged goods.                  │ │
│  │                                                                │ │
│  │  😤 SENTIMENT: Frustrated (0.72)                               │ │
│  │                                                                │ │
│  │  💡 SUGGESTED ACTION:                                          │ │
│  │  Authorize full refund - customer has valid damage claim       │ │
│  │  with photo evidence shared in chat.                           │ │
│  │                                                                │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  PROMPT TEMPLATE:                                                   │
│  ────────────────                                                   │
│  You are a support assistant summarizing a conversation for a       │
│  human agent who is about to take over. Be concise but thorough.   │
│                                                                      │
│  Include:                                                           │
│  1. Customer identification (name, email if provided)              │
│  2. Main issue in 1-2 sentences                                    │
│  3. What the bot attempted to resolve                              │
│  4. Why escalation happened                                        │
│  5. Customer sentiment (frustrated/neutral/happy)                  │
│  6. Suggested action for the human agent                           │
│                                                                      │
│  Format as a structured summary that can be read in 30 seconds.    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Flow 4: Slack Notification (Option B)

```
┌─────────────────────────────────────────────────────────────────────┐
│                   SLACK NOTIFICATION FLOW                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  SLACK MESSAGE FORMAT:                                              │
│  ─────────────────────                                              │
│                                                                      │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │ 🔔 #support-escalations                                        │ │
│  ├───────────────────────────────────────────────────────────────┤ │
│  │                                                                │ │
│  │  🆘 New Support Request                                        │ │
│  │  ───────────────────────                                       │ │
│  │                                                                │ │
│  │  👤 Customer: John Smith                                       │ │
│  │  📧 Email: john@example.com                                    │ │
│  │  ⏱️ Waiting: Just now                                          │ │
│  │  🌐 Page: /products/widget-pro                                 │ │
│  │                                                                │ │
│  │  ┌─────────────────────────────────────────────────────────┐  │ │
│  │  │ 📝 AI Summary                                            │  │ │
│  │  │                                                          │  │ │
│  │  │ Customer wants refund for Order #1234 (damaged product). │  │ │
│  │  │ Bot offered replacement but customer insists on refund.  │  │ │
│  │  │ Sentiment: Frustrated                                    │  │ │
│  │  └─────────────────────────────────────────────────────────┘  │ │
│  │                                                                │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │ │
│  │  │ 💬 Take Over │  │ 📋 View Full │  │ ⏰ Snooze   │        │ │
│  │  └──────────────┘  └──────────────┘  └──────────────┘        │ │
│  │                                                                │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  BUTTON ACTIONS:                                                    │
│  ───────────────                                                    │
│                                                                      │
│  [Take Over]                                                        │
│    │                                                                │
│    ├──▶ Creates Slack thread for this conversation                 │
│    ├──▶ Notifies customer "Sarah has joined the chat"              │
│    ├──▶ All future messages sync between widget ↔ thread           │
│    └──▶ Updates message: "🟢 Claimed by @sarah"                    │
│                                                                      │
│  [View Full]                                                        │
│    │                                                                │
│    └──▶ Opens modal with full conversation history                 │
│                                                                      │
│  [Snooze]                                                           │
│    │                                                                │
│    └──▶ Snooze for 5/15/30 minutes, reminder will ping again       │
│                                                                      │
│                                                                      │
│  THREAD CONVERSATION:                                               │
│  ────────────────────                                               │
│                                                                      │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │ 🧵 Thread: John Smith - Support Request                        │ │
│  ├───────────────────────────────────────────────────────────────┤ │
│  │                                                                │ │
│  │  @sarah took over this conversation                           │ │
│  │                                                                │ │
│  │  Sarah: Hi John, I see you received a damaged product and     │ │
│  │         want a refund. I can definitely help with that!       │ │
│  │         [Sent to widget ✓]                                    │ │
│  │                                                                │ │
│  │  [Customer] John: Thank you! Yes, the box was completely      │ │
│  │                   crushed when it arrived.                    │ │
│  │                                                                │ │
│  │  Sarah: I understand. I've processed a full refund to your    │ │
│  │         original payment method. You should see it in 3-5     │ │
│  │         business days.                                        │ │
│  │         [Sent to widget ✓]                                    │ │
│  │                                                                │ │
│  │  [Customer] John: Perfect, thank you so much!                 │ │
│  │                                                                │ │
│  │  ┌──────────────┐  ┌──────────────┐                          │ │
│  │  │ ✅ Resolve   │  │ 🔄 Back to Bot│                          │ │
│  │  └──────────────┘  └──────────────┘                          │ │
│  │                                                                │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Flow 5: No Response Timeout

```
┌─────────────────────────────────────────────────────────────────────┐
│                   NO RESPONSE TIMEOUT FLOW                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│             Notification Sent                                        │
│                    │                                                 │
│                    ▼                                                 │
│           ┌─────────────────┐                                       │
│           │ Start Timer     │                                       │
│           │ (configurable:  │                                       │
│           │  2-10 minutes)  │                                       │
│           └─────────────────┘                                       │
│                    │                                                 │
│        ┌───────────┴───────────┐                                    │
│        │                       │                                    │
│        ▼                       ▼                                    │
│  Response received      Timer expires                               │
│        │                       │                                    │
│        ▼                       ▼                                    │
│  Continue with          ┌─────────────────┐                         │
│  live chat              │ Send reminder   │                         │
│                         │ notification    │                         │
│                         └─────────────────┘                         │
│                                │                                     │
│                                ▼                                     │
│                    ┌─────────────────────┐                          │
│                    │ Another X minutes   │                          │
│                    │ (grace period)      │                          │
│                    └─────────────────────┘                          │
│                          │           │                              │
│                    Response       No response                       │
│                          │           │                              │
│                          ▼           ▼                              │
│                    Live chat    ┌─────────────────┐                 │
│                    continues    │ CONVERT TO      │                 │
│                                 │ ASYNC MODE      │                 │
│                                 └─────────────────┘                 │
│                                        │                             │
│                                        ▼                             │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │                                                                │ │
│  │  MESSAGE TO CUSTOMER:                                          │ │
│  │  ──────────────────────                                        │ │
│  │                                                                │ │
│  │  "Our team is currently busy helping other customers.         │ │
│  │   We've saved your conversation and will email you at         │ │
│  │   john@example.com within 2 hours with a response.            │ │
│  │                                                                │ │
│  │   Is there anything else I can help you with in the           │ │
│  │   meantime?"                                                   │ │
│  │                                                                │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                        │                             │
│                                        ▼                             │
│                              Create support ticket                  │
│                              with full context                      │
│                                        │                             │
│                                        ▼                             │
│                              Email owner with                       │
│                              ticket details                         │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Database Schema

```sql
-- Handoff sessions table
CREATE TABLE handoff_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    chat_session_id UUID NOT NULL REFERENCES chat_sessions(id),

    -- Trigger info
    trigger_type TEXT NOT NULL, -- 'keyword', 'sentiment', 'failure', 'manual'
    trigger_reason TEXT, -- Human-readable reason

    -- Status
    status TEXT NOT NULL DEFAULT 'pending',
    -- 'pending', 'notified', 'claimed', 'active', 'resolved', 'abandoned', 'converted_to_ticket'

    -- Assignment
    claimed_by TEXT, -- User ID or email of person who claimed
    claimed_at TIMESTAMP WITH TIME ZONE,

    -- AI Summary
    ai_summary TEXT,
    ai_summary_generated_at TIMESTAMP WITH TIME ZONE,

    -- Notification tracking
    notification_channel TEXT, -- 'slack', 'email', 'whatsapp'
    notification_sent_at TIMESTAMP WITH TIME ZONE,
    notification_id TEXT, -- External ID (Slack message ID, etc.)

    -- Resolution
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolution_notes TEXT,
    handed_back_to_bot BOOLEAN DEFAULT FALSE,

    -- Customer info at time of handoff
    customer_email TEXT,
    customer_name TEXT,
    customer_sentiment_score FLOAT,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for quick lookups
CREATE INDEX idx_handoff_sessions_project_status
ON handoff_sessions(project_id, status);

CREATE INDEX idx_handoff_sessions_chat_session
ON handoff_sessions(chat_session_id);

-- Handoff messages (for two-way sync)
CREATE TABLE handoff_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    handoff_session_id UUID NOT NULL REFERENCES handoff_sessions(id) ON DELETE CASCADE,

    -- Message content
    content TEXT NOT NULL,
    sender_type TEXT NOT NULL, -- 'customer', 'agent', 'system'
    sender_id TEXT, -- User ID for agents
    sender_name TEXT,

    -- External sync
    external_message_id TEXT, -- Slack message ID for sync
    synced_to_widget BOOLEAN DEFAULT FALSE,
    synced_to_external BOOLEAN DEFAULT FALSE,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_handoff_messages_session
ON handoff_messages(handoff_session_id, created_at);

-- Project handoff settings
ALTER TABLE projects ADD COLUMN IF NOT EXISTS handoff_settings JSONB DEFAULT '{
    "enabled": false,
    "notification_channel": "email",
    "slack_webhook_url": null,
    "slack_channel_id": null,
    "business_hours": null,
    "response_timeout_minutes": 5,
    "escalation_keywords": ["human", "agent", "person", "support", "help"],
    "sentiment_threshold": 0.7,
    "failure_count_threshold": 3
}';

-- RLS Policies
ALTER TABLE handoff_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE handoff_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY handoff_sessions_project_isolation ON handoff_sessions
    FOR ALL USING (
        project_id IN (
            SELECT id FROM projects WHERE user_id = auth.uid()
        )
    );

CREATE POLICY handoff_messages_project_isolation ON handoff_messages
    FOR ALL USING (
        handoff_session_id IN (
            SELECT hs.id FROM handoff_sessions hs
            JOIN projects p ON hs.project_id = p.id
            WHERE p.user_id = auth.uid()
        )
    );
```

---

## API Endpoints

### Core Handoff APIs

```typescript
// POST /api/handoff/initiate
// Initiate a handoff (usually called by chat-engine)
{
  sessionId: string;
  triggerType: 'keyword' | 'sentiment' | 'failure' | 'manual';
  triggerReason?: string;
}
// Response: { handoffId: string, status: string }

// GET /api/handoff/:handoffId
// Get handoff status and details
// Response: HandoffSession with messages

// POST /api/handoff/:handoffId/claim
// Claim a handoff (agent takes over)
{
  agentId?: string;
  agentName?: string;
}
// Response: { success: true }

// POST /api/handoff/:handoffId/message
// Send a message (from agent)
{
  content: string;
  senderName: string;
}
// Response: { messageId: string }

// POST /api/handoff/:handoffId/resolve
// Resolve the handoff
{
  notes?: string;
  handBackToBot?: boolean;
}
// Response: { success: true }

// GET /api/handoff/pending
// List pending handoffs for project (for dashboard/polling)
// Response: { handoffs: HandoffSession[] }
```

### Slack Integration APIs

```typescript
// POST /api/integrations/slack/connect
// Connect Slack workspace
{
  code: string; // OAuth code from Slack
}
// Response: { success: true, teamName: string }

// POST /api/integrations/slack/webhook
// Incoming webhook from Slack (button clicks, messages)
// Slack sends events here

// GET /api/integrations/slack/status
// Check Slack connection status
// Response: { connected: boolean, channelName?: string }
```

### Settings APIs

```typescript
// GET /api/projects/:id/handoff-settings
// Get handoff settings
// Response: HandoffSettings

// PUT /api/projects/:id/handoff-settings
// Update handoff settings
{
  enabled: boolean;
  notificationChannel: 'email' | 'slack';
  slackChannelId?: string;
  businessHours?: { start: string, end: string, timezone: string };
  responseTimeoutMinutes: number;
  escalationKeywords: string[];
  sentimentThreshold: number;
  failureCountThreshold: number;
}
```

---

## Settings UI Design

```
┌─────────────────────────────────────────────────────────────────────┐
│                    HANDOFF SETTINGS PAGE                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Human Handoff                                                       │
│  ─────────────                                                       │
│  Allow customers to request human support when the AI can't help.   │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ Enable Human Handoff                              [  ON  ]   │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   │
│                                                                      │
│  Notification Channel                                                │
│  ────────────────────                                               │
│  Where should we notify you when a customer needs help?             │
│                                                                      │
│  ○ Email only                                                       │
│    Receive email notifications. You'll reply via email.             │
│                                                                      │
│  ● Slack (Recommended)                                              │
│    Get notified in Slack and reply directly from there.             │
│                                                                      │
│    ┌─────────────────────────────────────────────────────────┐     │
│    │ Slack Workspace: Acme Corp ✓ Connected                   │     │
│    │ Channel: #customer-support                               │     │
│    │                                                          │     │
│    │ [Disconnect]  [Change Channel]                           │     │
│    └─────────────────────────────────────────────────────────┘     │
│                                                                      │
│    Not connected?  [Connect to Slack]                               │
│                                                                      │
│  ○ WhatsApp (Coming Soon)                                           │
│    Get notified on WhatsApp for mobile support.                     │
│                                                                      │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   │
│                                                                      │
│  Escalation Triggers                                                 │
│  ───────────────────                                                │
│                                                                      │
│  ☑ Customer requests human                                          │
│    Trigger when customer says "human", "agent", "person", etc.      │
│                                                                      │
│    Keywords: [human] [agent] [person] [support] [+Add]              │
│                                                                      │
│  ☑ Frustrated customer                                              │
│    Trigger when negative sentiment is detected.                     │
│                                                                      │
│    Sensitivity: [████████░░] High                                   │
│                                                                      │
│  ☑ Bot can't help                                                   │
│    Trigger after bot fails to answer [3] times.                     │
│                                                                      │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   │
│                                                                      │
│  Response Settings                                                   │
│  ─────────────────                                                  │
│                                                                      │
│  Response timeout                                                   │
│  If no response within this time, convert to email ticket.          │
│  [5 minutes ▼]                                                      │
│                                                                      │
│  Business hours (optional)                                          │
│  Only enable live handoff during business hours.                    │
│  ☐ Enable business hours                                            │
│     Start: [9:00 AM]  End: [5:00 PM]  Timezone: [PST ▼]            │
│                                                                      │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   │
│                                                                      │
│  [Save Changes]                                                     │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🔶 Decision Points Summary

Before implementation, these decisions need to be made:

### Decision 1: Implementation Option

| Option | Effort | Real-time | Best For |
|--------|--------|-----------|----------|
| **A: Async Only** | 3-4 days | ❌ | MVP / Quick ship |
| **B: Slack Integration** | 5-7 days | ✅ | Small teams (Recommended) |
| **C: Full Dashboard** | 10-15 days | ✅ | Support teams |

**Recommendation:** Option B - Slack Integration

### Decision 2: Lead Capture Integration

| Option | Description |
|--------|-------------|
| **A: Keep Separate** | Two distinct features |
| **B: Merge** | One unified escalation system |

**Recommendation:** Option B - Merge into unified system

### Decision 3: Notification Channels for V1

| Channel | Effort | Include in V1? |
|---------|--------|----------------|
| Email | Low | ✅ Yes (always) |
| Slack | Medium | ✅ Yes (primary) |
| WhatsApp | High | ❌ V2 |
| Discord | Medium | ❌ V2 |

**Recommendation:** Email + Slack for V1

### Decision 4: AI Summary

| Option | Description |
|--------|-------------|
| **A: No Summary** | Just forward conversation |
| **B: Basic Summary** | One paragraph summary |
| **C: Rich Summary** | Structured summary with sentiment, suggestions |

**Recommendation:** Option C - Rich Summary (differentiator)

### Decision 5: Two-Way Communication

| Option | Description |
|--------|-------------|
| **A: Notification Only** | Owner notified, replies via email |
| **B: Full Two-Way** | Reply in Slack → appears in widget |

**Recommendation:** Option B - Full Two-Way (for Slack option)

---

## Research Sources

1. **SpurNow** - [Chatbot to Human Handoff: Complete Guide](https://www.spurnow.com/en/blogs/chatbot-to-human-handoff)
   - When to escalate, context transfer best practices

2. **Social Intents** - [AI Chatbot with Human Handoff Setup Guide](https://www.socialintents.com/blog/ai-chatbot-with-human-handoff/)
   - Slack integration patterns, small business focus

3. **Kommunicate** - [Chatbot Human Handoff](https://www.kommunicate.io/blog/chatbot-human-handoff/)
   - Trigger types, seamless transition practices

4. **Quidget** - [When Should Chatbots Escalate to Human Agents](https://quidget.ai/blog/ai-automation/when-should-chatbots-escalate-to-human-agents-with-real-examples/)
   - Real examples, trigger scenarios

5. **JivoChat** - [Offline Messages: How to Engage Customers When Agents Are Away](https://www.jivochat.com/blog/communication/offline-messages.html)
   - Async handling, timeout strategies

6. **TechTarget** - [Best Practices for Initiating Chatbot-to-Human Handoff](https://www.techtarget.com/searchcustomerexperience/tip/Best-practices-for-initiating-chatbot-to-human-handoff)
   - Industry best practices

7. **Zendesk** - [Managing Conversation Handoff and Handback](https://support.zendesk.com/hc/en-us/articles/4408824482586-Managing-conversation-handoff-and-handback)
   - Enterprise patterns

8. **ClearFeed** - [Slack HubSpot Integration](https://clearfeed.ai/blogs/slack-hubspot-integration-to-improve-workflow)
   - Two-way Slack sync patterns

9. **Intercom** - [Fin AI Agent Explained](https://www.intercom.com/help/en/articles/7120684-fin-ai-agent-explained)
   - Automatic handoff patterns

10. **Cyara Blog** - [Biggest Pain Points in Using Chatbots](https://blog.cyara.com/the-biggest-pain-points-in-using-chatbots)
    - User frustration statistics

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Escalation rate | < 20% of conversations | Handoffs / Total chats |
| Response time | < 5 minutes (sync mode) | Time from request to first human reply |
| Resolution rate | > 90% | Resolved handoffs / Total handoffs |
| Customer satisfaction | > 4/5 | Post-handoff survey |
| Context transfer success | > 95% | Agent didn't ask customer to repeat |
| Abandonment rate | < 10% | Customers who left during wait |

---

## Estimated Timeline by Option

### Option A: Async Only
| Task | Days |
|------|------|
| Database schema | 0.5 |
| AI summary service | 1 |
| Trigger detection integration | 1 |
| Settings UI | 0.5 |
| Email notifications | 0.5 |
| Testing | 0.5 |
| **Total** | **4 days** |

### Option B: Slack Integration (Recommended)
| Task | Days |
|------|------|
| Database schema | 0.5 |
| AI summary service | 1 |
| Trigger detection integration | 1 |
| Slack OAuth & app setup | 1 |
| Slack notifications with buttons | 1 |
| Two-way message sync | 1.5 |
| Settings UI | 0.5 |
| Widget updates | 0.5 |
| Testing | 1 |
| **Total** | **8 days** |

### Option C: Full Dashboard
| Task | Days |
|------|------|
| Everything in Option B | 8 |
| Agent dashboard UI | 3 |
| Queue management | 2 |
| Real-time WebSocket infra | 2 |
| Multi-channel notifications | 2 |
| **Total** | **15+ days** |

---

## Out of Scope (Future Versions)

- [ ] Video/voice call escalation
- [ ] AI co-pilot suggestions during human chat
- [ ] Advanced routing (skill-based, language-based)
- [ ] Phone system integration
- [ ] Customer callback scheduling
- [ ] Agent performance analytics
- [ ] Canned responses library
- [ ] WhatsApp Business integration
- [ ] Discord integration

---

## Changelog

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | December 2024 | Product Team | Initial enterprise spec |
| 2.0 | December 2024 | Jordan (PM) | Complete rewrite with research, multiple options, decision framework |
