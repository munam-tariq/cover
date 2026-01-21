# Lead Capture: Research & Implementation Strategy

## Executive Summary

This document analyzes whether SupportBase should implement a **pre-chat form** (asking for visitor name/email before chat starts) and provides a comprehensive strategy for lead capture in the chatbot widget.

**TL;DR:** Pre-chat forms are an anti-pattern that causes abandonment. Instead, we should capture email **during the conversation** at natural moments using AI-driven prompts.

---

## The Question

Many customer support chatbots (Intercom, Drift, Zendesk, Crisp, tawk.to) offer the option to collect visitor information before the chat begins. Should SupportBase do the same?

---

## Research Findings

### Industry Consensus: DON'T Gate the Conversation

The overwhelming best practice is **NOT** to require information before chat starts:

> "If your chatbot immediately asks 'Hi, what's your name? Company? Email? Phone?,' it's no better than a form. Likely worse, because it's a very one-sided conversation."
> — [Lindy.ai](https://www.lindy.ai/blog/how-do-chatbots-qualify-leads)

> "Businesses that use AI chatbots have **3x better conversion** into sales than those who use website forms."
> — [Tidio Statistics](https://www.tidio.com/blog/live-chat-statistics/)

> "Users find pre-chat forms 'off-putting' when they just want to ask a quick question."
> — [Zendesk Community](https://chat.zendesk.com/hc/en-us/community/posts/209463818-Feature-Request-Stat-tracking-of-chat-abandonment-due-to-pre-chat-form)

### Pre-Chat Forms Cause Abandonment

> "You can add as many fields as you like, but the more fields you add and make required, **the less likely people will chat with you**."
> — [LiveChat](https://www.livechat.com/help/chat-surveys/)

> "Making fields mandatory is great if you absolutely must capture a visitor's email address. However, you should only have **1-2 mandatory fields** in your Pre-Chat Form, so as to not scare away customers."
> — [tawk.to](https://www.tawk.to/academy/pre-chat-form/)

> "Any field that isn't absolutely necessary shouldn't be there, as this information can be collected while on the chat."
> — [SnapEngage](https://help.snapengage.com/how-to-set-up-the-pre-chat-form/)

### The Better Approach: Progressive Profiling

> "Instead, practice **progressive profiling**: ask one question at a time, and only ask what's necessary in that moment. Begin with something easy and engaging. Only **after some rapport** (and ideally after you've provided some value or answers) should you ask for contact info."
> — [Lindy.ai](https://www.lindy.ai/blog/how-do-chatbots-qualify-leads)

> "Frame the request naturally: 'I can get a detailed answer for you from one of our specialists. The quickest way is to email you. **What address should I send that to?**' This way the user understands why you're asking and feels they'll get something in return."
> — [Lindy.ai](https://www.lindy.ai/blog/how-do-chatbots-qualify-leads)

> "Prompt email **after conversation has started** (no gate) — Less frustrating than forcing the user to enter an email first."
> — [Crisp](https://crisp.chat/en/blog/intercom-vs-drift/)

### Conversion Statistics

| Metric | Value | Source |
|--------|-------|--------|
| Chatbot vs form conversion | **3x better** | Tidio |
| AI proactive chat conversion boost | **+15%** | Industry average |
| E-commerce conversion with AI chatbots | **+30%** | Multiple studies |
| Customer preference for chatbots | **62%** prefer over waiting | HubSpot |
| Expect immediate response | **90%** | HubSpot |

---

## Competitor Analysis

### What Top Competitors Do

| Platform | Pre-Chat Form | Default | Email Capture Strategy |
|----------|---------------|---------|----------------------|
| **Intercom** | Optional, configurable | OFF | Captures email during conversation via chatbot flows |
| **Drift** | No mandatory form | N/A | Asks qualifying questions first, then captures email |
| **Crisp** | Optional | OFF | Offers both approaches |
| **Zendesk** | Optional, trackable | OFF | Provides analytics on form abandonment |
| **tawk.to** | Optional | OFF | Recommends 1-2 fields max if used |
| **LiveChat** | Optional | OFF | Warns about abandonment with more fields |

**Key insight:** All major platforms make pre-chat forms **optional** and **OFF by default**, and recommend asking for info **during** the conversation.

### Platform-Specific Approaches

**Intercom:**
- Chatbots can automatically capture email addresses during conversation
- Suggests help center articles based on user input
- Collects contextual info (name, issue type) conversationally
- Routes to right team based on collected info

**Drift:**
- No mandatory pre-chat form
- AI chatbot greets visitors, asks qualifying questions
- Captures contact info AFTER qualifying the lead
- Routes high-value prospects to human reps
- Sales-focused: qualifies before capturing

**Zendesk:**
- Offers pre-chat form but tracks abandonment
- Community requests for better abandonment analytics
- Recognizes forms cause drop-off

---

## Pros & Cons Analysis

### Option A: Pre-Chat Form (Ask BEFORE Chat)

**Pros:**
- ✅ Guaranteed contact info if they chat
- ✅ Can follow up via email if chat drops
- ✅ Routing: know customer type before chat starts
- ✅ Personalization: greet by name immediately
- ✅ Business owners feel "in control" of lead capture

**Cons:**
- ❌ **Major friction** - users just want quick answers
- ❌ **Abandonment** - many leave instead of filling form
- ❌ **Feels like a form** - defeats purpose of conversational UI
- ❌ **Privacy concerns** - users don't want to be added to mailing lists for simple questions
- ❌ **Worse conversion** - forms convert 3x worse than chatbots
- ❌ **Against industry best practice** - all competitors recommend against
- ❌ **Contradicts "instant support" promise** - adds delay before help

### Option B: Progressive Capture (Ask DURING Chat)

**Pros:**
- ✅ **Zero friction** - users get help immediately
- ✅ **Higher engagement** - conversation feels natural
- ✅ **Value exchange** - ask for email when offering something (follow-up, detailed info)
- ✅ **Better conversion** - chatbot leads convert 3x better than form leads
- ✅ **Feels conversational** - not like a form
- ✅ **Aligns with AI-first positioning** - smart, contextual capture
- ✅ **Industry best practice** - what leaders recommend

**Cons:**
- ❌ May miss email if user leaves mid-conversation
- ❌ Some users never provide email
- ❌ Need smart flow to ask at right moment
- ❌ More complex to implement (AI logic needed)

---

## Recommendation

### Primary Strategy: Smart In-Chat Email Capture

Based on research, **pre-chat forms are an anti-pattern** for AI chatbots. They:
1. Create friction that reduces engagement
2. Feel like forms, not conversations
3. Convert worse than conversational approaches
4. Go against industry best practices

**Instead, build smart in-chat email capture** that asks for email **during the conversation** at natural moments:

#### Trigger Points for Email Ask

1. **When AI can't fully answer:**
   > "I'd love to have our team follow up with more details. What's the best email to reach you?"

2. **When user requests human:**
   > "Let me connect you with our team. In case we miss you, what email can we reach you at?"

3. **Before ending chat:**
   > "Want me to send you a summary of what we discussed? Just drop your email."

4. **Proactive value offer:**
   > "I can send you a link to our [pricing/guide/docs]. What's your email?"

5. **Low confidence response:**
   > "I want to make sure you get the right answer. Can I have someone from our team email you?"

6. **After providing value:**
   > "Happy I could help! If you want, I can email you this info for reference."

#### Why This Works Better

- Provides value BEFORE asking
- Feels like natural conversation
- Gives user reason to share email
- Higher conversion than mandatory forms
- User is already engaged (not bouncing from form)
- Context: AI knows WHAT the user asked about

---

## Secondary Strategy: Optional Pre-Chat Form

For business owners who **insist** on upfront capture, offer it as an **optional, configurable** feature:

### Configuration Options

```typescript
interface LeadCaptureSettings {
  // Pre-chat form settings
  preChatForm: {
    enabled: boolean;           // Default: false
    fields: {
      email: {
        enabled: boolean;       // Default: true (if form enabled)
        required: boolean;      // Default: true
      };
      name: {
        enabled: boolean;       // Default: false
        required: boolean;      // Default: false
      };
    };
    skipForReturningVisitors: boolean;  // Default: true
    customMessage: string;      // Default: "So we can follow up if needed"
  };

  // In-chat capture settings
  inChatCapture: {
    enabled: boolean;           // Default: true
    triggers: {
      onHandoff: boolean;       // Default: true
      onLowConfidence: boolean; // Default: true
      onEndChat: boolean;       // Default: false
      afterNMessages: number;   // Default: 0 (disabled)
    };
  };
}
```

### UI Guidelines (if form is enabled)

- **Maximum 2 fields** - email + optional name
- **Clear value proposition** - "So we can follow up if needed"
- **Skip for returning visitors** - check localStorage
- **Quick dismiss option** - "Skip and chat now"
- **Mobile-friendly** - large touch targets

---

## Implementation Plan

### Phase 1: Smart In-Chat Email Capture (Recommended First)

#### 1.1 System Prompt Enhancement
Add email capture instructions to the AI system prompt:

```
When appropriate, ask for the visitor's email:
- If you can't fully answer their question
- If they request human support
- Before ending a successful conversation (offer to email summary)

Frame it naturally: "I can have our team follow up. What's your email?"
When they provide an email, confirm: "Got it! [email]"
```

#### 1.2 Email Detection & Storage
- Detect email in user messages using regex
- Call `/api/customers/identify` endpoint (already exists)
- Update `conversations.customer_email` field

#### 1.3 API Changes
None required - `/api/customers/identify` already exists:
```
POST /api/customers/identify
{
  visitorId: string,
  projectId: string,
  email: string,
  name?: string
}
```

#### 1.4 Widget Changes
- Detect when AI asks for email (track conversation state)
- Auto-detect email in user response
- Call identify API to store

#### 1.5 Dashboard Changes
- Show captured emails in conversation list
- Show email in conversation detail view
- Filter conversations by "has email" / "no email"

### Phase 2: Optional Pre-Chat Form

#### 2.1 Database Changes
Add to `projects` table:
```sql
ALTER TABLE projects ADD COLUMN lead_capture_settings JSONB DEFAULT '{
  "preChatForm": {
    "enabled": false,
    "fields": {
      "email": { "enabled": true, "required": true },
      "name": { "enabled": false, "required": false }
    },
    "skipForReturningVisitors": true,
    "customMessage": "So we can follow up if needed"
  },
  "inChatCapture": {
    "enabled": true,
    "triggers": {
      "onHandoff": true,
      "onLowConfidence": true,
      "onEndChat": false,
      "afterNMessages": 0
    }
  }
}';
```

#### 2.2 API Changes
- `GET /api/embed/config/:projectId` - include lead capture settings
- `PATCH /api/projects/:id` - update lead capture settings

#### 2.3 Widget Changes
Create `PreChatForm` component:
```typescript
// src/components/pre-chat-form.ts
export class PreChatForm {
  constructor(
    private config: LeadCaptureSettings['preChatForm'],
    private onSubmit: (data: { email?: string; name?: string }) => void,
    private onSkip: () => void
  ) {}

  // Show form before chat window opens
  // Store captured data in localStorage
  // Skip if returning visitor
}
```

#### 2.4 Dashboard Changes
- Project Settings > Lead Capture section
- Toggle pre-chat form on/off
- Configure fields (email, name)
- Configure skip for returning visitors
- Preview of form appearance

### Phase 3: Lead Management Dashboard

#### 3.1 Leads List View
- `/dashboard/leads` - all captured emails
- Columns: Email, Name, First Seen, Last Seen, Conversations, Source
- Filters: Date range, has email, source (pre-chat vs in-chat)
- Bulk actions: Export CSV, Delete

#### 3.2 Lead Detail View
- All conversations with this lead
- Contact info history
- Activity timeline

#### 3.3 Export Functionality
- Export to CSV
- Fields: email, name, first_seen, last_seen, total_conversations, source
- Future: Webhook/Zapier integration

---

## Data Model

### Existing Tables (No Changes Needed for Phase 1)

**customers table:**
```sql
CREATE TABLE customers (
  id UUID PRIMARY KEY,
  project_id UUID NOT NULL,
  visitor_id TEXT NOT NULL,
  email TEXT,                    -- Captured email
  name TEXT,                     -- Captured name
  first_seen_at TIMESTAMPTZ,
  last_seen_at TIMESTAMPTZ,
  total_conversations INTEGER,
  -- ... other fields
);
```

**conversations table:**
```sql
CREATE TABLE conversations (
  id UUID PRIMARY KEY,
  customer_id UUID,
  customer_email TEXT,           -- Denormalized for quick access
  customer_name TEXT,            -- Denormalized for quick access
  -- ... other fields
);
```

### New Fields (Phase 2)

**projects table:**
```sql
ALTER TABLE projects ADD COLUMN lead_capture_settings JSONB;
```

---

## Widget Integration

### Current Flow (No Pre-Chat Form)
```
User clicks chat bubble
    ↓
Chat window opens immediately
    ↓
User sends first message
    ↓
AI responds
    ↓
[AI may ask for email during conversation]
    ↓
Email captured via /api/customers/identify
```

### New Flow (With Optional Pre-Chat Form)
```
User clicks chat bubble
    ↓
Check: Is pre-chat form enabled?
    ↓
YES → Check: Is returning visitor with email?
    ↓
    YES → Skip form, open chat
    NO → Show pre-chat form
        ↓
        User fills form OR clicks "Skip"
        ↓
        Store email in localStorage + call identify API
        ↓
        Open chat window
    ↓
NO → Open chat immediately (current behavior)
```

### Storage Keys
```typescript
// Existing
const VISITOR_ID_KEY = 'chatbot_visitor_id';
const SESSION_KEY = (projectId: string) => `chatbot_session_${projectId}`;
const MESSAGES_KEY = (projectId: string) => `chatbot_messages_${projectId}`;

// New for lead capture
const VISITOR_EMAIL_KEY = 'chatbot_visitor_email';
const VISITOR_NAME_KEY = 'chatbot_visitor_name';
const LEAD_CAPTURED_KEY = (projectId: string) => `chatbot_lead_captured_${projectId}`;
```

---

## Critical Files to Modify

### Phase 1: In-Chat Capture

**API:**
- No changes needed - `/api/customers/identify` exists

**Widget:**
- `src/services/api.ts` - add identifyVisitor() method
- `src/chat-window.ts` - detect email in messages, call identify API
- `src/utils/helpers.ts` - add email regex detection

**Dashboard:**
- `app/dashboard/conversations/page.tsx` - show email column
- `app/dashboard/conversations/[id]/page.tsx` - show customer email

### Phase 2: Pre-Chat Form

**Database:**
- Migration: add `lead_capture_settings` to projects

**API:**
- `src/routes/embed.ts` - include lead capture settings in config
- `src/routes/projects.ts` - CRUD for lead capture settings

**Widget:**
- `src/components/pre-chat-form.ts` - NEW: form component
- `src/widget.ts` - check for form before opening chat
- `src/utils/storage.ts` - add email/name storage methods
- `src/styles/widget.css` - pre-chat form styles

**Dashboard:**
- `app/dashboard/settings/page.tsx` - lead capture settings UI

### Phase 3: Lead Management

**Dashboard:**
- `app/dashboard/leads/page.tsx` - NEW: leads list
- `app/dashboard/leads/[id]/page.tsx` - NEW: lead detail
- `app/dashboard/leads/export/route.ts` - NEW: CSV export API

---

## Verification Plan

### Phase 1 Testing

1. **In-Chat Capture:**
   - Start conversation with widget
   - Wait for AI to ask for email (trigger handoff or low confidence)
   - Provide email in response
   - Verify email appears in dashboard conversation view
   - Verify email stored in `customers` table

2. **Email Detection:**
   - Test various email formats: user@example.com, user+tag@example.co.uk
   - Test email in middle of message: "my email is user@example.com, thanks"
   - Verify false positives don't trigger (e.g., "email me at...")

### Phase 2 Testing

1. **Pre-Chat Form:**
   - Enable pre-chat form in project settings
   - Open widget as new visitor → should see form
   - Fill form → should proceed to chat
   - Close and reopen → should skip form (returning visitor)
   - Clear localStorage → should see form again

2. **Skip Functionality:**
   - Click "Skip and chat now"
   - Verify chat opens without email
   - Verify no email stored

### Phase 3 Testing

1. **Leads Dashboard:**
   - Capture several emails via both methods
   - Verify all appear in leads list
   - Test filters (date, source)
   - Export CSV and verify data

---

## Success Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Email capture rate (in-chat) | 20-30% | Emails captured / total conversations |
| Form abandonment rate | < 10% | Users who see form but leave |
| Conversation engagement | No decrease | Messages per conversation |
| Time to first response | No increase | Time from open to first message |

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Pre-chat form causes abandonment | Default OFF, warn in settings UI |
| In-chat capture feels spammy | Limit to natural moments, provide value |
| Privacy concerns | Clear messaging about why we ask |
| GDPR compliance | Add consent checkbox option |
| Email validation failures | Use relaxed regex, allow retry |

---

## Final Recommendation

| Approach | Priority | Recommendation |
|----------|----------|----------------|
| Mandatory Pre-Chat Form | ❌ | **Don't build** - causes abandonment |
| Optional Pre-Chat Form | Phase 2 | **Offer as option** - for those who insist |
| **Smart In-Chat Capture** | Phase 1 | **Primary approach** - conversational, higher conversion |

**SupportBase should differentiate by being frictionless** - let users chat immediately, and capture email naturally through AI conversation. This aligns with our "AI-first" positioning and proven industry best practices.

---

## Sources

- [Tidio - Live Chat Statistics](https://www.tidio.com/blog/live-chat-statistics/)
- [Lindy - How Chatbots Qualify Leads](https://www.lindy.ai/blog/how-do-chatbots-qualify-leads)
- [LiveChat - Chat Surveys](https://www.livechat.com/help/chat-surveys/)
- [tawk.to - Pre-Chat Form](https://www.tawk.to/academy/pre-chat-form/)
- [Zendesk - Pre-Chat Form Abandonment](https://chat.zendesk.com/hc/en-us/community/posts/209463818-Feature-Request-Stat-tracking-of-chat-abandonment-due-to-pre-chat-form)
- [Crisp - Intercom vs Drift](https://crisp.chat/en/blog/intercom-vs-drift/)
- [SnapEngage - Pre-Chat Form Setup](https://help.snapengage.com/how-to-set-up-the-pre-chat-form/)
- [Glassix - AI Chatbot Conversion Study](https://www.glassix.com/article/study-shows-ai-chatbots-enhance-conversions-and-resolve-issues-faster)
- [Social Intents - Drift vs Intercom](https://www.socialintents.com/blog/drift-vs-intercom/)
