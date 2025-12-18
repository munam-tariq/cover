# Lead Capture Feature Specification

## Metadata
- **Feature ID**: `lead-capture`
- **Feature Name**: Lead Capture on Unanswered Questions
- **Category**: Immediate Priority (NEW - Dec 2024)
- **Priority**: P0
- **Complexity**: Medium
- **Dependencies**: chat-engine, widget
- **Owner**: Product Team
- **Status**: Ready for Implementation

---

## Summary

When the chatbot cannot answer a user's question (low knowledge base relevance), it offers to collect the user's email so the business can follow up. Captured leads are stored and business owners receive digest email notifications with unanswered questions and user contact info.

---

## User Stories

### Business Owner
> As a business owner, I want to capture potential customer emails when my chatbot can't help them, so I can improve my knowledge base and follow up with leads I would otherwise lose.

### End User (Website Visitor)
> As a website visitor, I want the option to leave my email when the chatbot can't answer my question, so the business can get back to me with an answer.

---

## Functional Requirements

### FR-001: Project Settings

| ID | Requirement | Priority |
|----|-------------|----------|
| LC-001 | Settings page has "Lead Capture" section | Must Have |
| LC-002 | Email field for notification recipient (project-level) | Must Have |
| LC-003 | Toggle to enable/disable lead capture | Must Have |
| LC-004 | Toggle to enable/disable email notifications | Must Have |
| LC-005 | Settings stored in project.settings JSON | Must Have |

### FR-002: Answer Detection

| ID | Requirement | Priority |
|----|-------------|----------|
| LC-006 | LLM returns structured response with `foundAnswer` boolean | Must Have |
| LC-007 | `foundAnswer = false` when RAG returns no relevant chunks (similarity < threshold) | Must Have |
| LC-008 | `foundAnswer = false` when LLM explicitly says it doesn't have information | Must Have |
| LC-009 | Detection logic runs on every chat response | Must Have |

### FR-003: Email Capture Flow

| ID | Requirement | Priority |
|----|-------------|----------|
| LC-010 | When `foundAnswer = false` AND lead_capture enabled, LLM asks for email | Must Have |
| LC-011 | Email request is conversational, not pushy | Must Have |
| LC-012 | Store `awaiting_email: true` state in session | Must Have |
| LC-013 | User can decline by saying "no" or asking a different question | Must Have |
| LC-014 | If user provides email, validate format and store | Must Have |
| LC-015 | Confirm email capture to user: "Got it! We'll follow up at [email]" | Must Have |
| LC-016 | Clear `awaiting_email` state after capture or decline | Must Have |

### FR-004: Session Context Management

| ID | Requirement | Priority |
|----|-------------|----------|
| LC-017 | Include last 6 messages in LLM context | Must Have |
| LC-018 | If >30 mins since last message, treat as new conversation | Must Have |
| LC-019 | Clear `awaiting_email` state on new conversation | Must Have |
| LC-020 | Don't ask for email twice in same session | Should Have |

### FR-005: Lead Storage

| ID | Requirement | Priority |
|----|-------------|----------|
| LC-021 | Create `lead_captures` table to store leads | Must Have |
| LC-022 | Store: project_id, email (if provided), question, session_id, created_at | Must Have |
| LC-023 | Store lead even if user doesn't provide email (for analytics) | Must Have |
| LC-024 | Link to chat_session for full conversation context | Must Have |

### FR-006: Email Notifications

| ID | Requirement | Priority |
|----|-------------|----------|
| LC-025 | Digest email sent daily (if there are new leads) | Must Have |
| LC-026 | Email contains: project name, list of questions, user emails (if provided) | Must Have |
| LC-027 | Generic message: "Consider updating your knowledge base" | Must Have |
| LC-028 | Track `last_digest_sent_at` per project | Must Have |
| LC-029 | Only send if notifications toggle is ON | Must Have |
| LC-030 | Background job/cron to send digest emails | Must Have |

---

## UI Design

### Settings Page - Lead Capture Section

```
┌─────────────────────────────────────────────────────────────────┐
│ Lead Capture                                                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ When your chatbot can't answer a question, it can offer to      │
│ collect the visitor's email so you can follow up.               │
│                                                                 │
│ Enable Lead Capture                              [Toggle: ON]   │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐│
│ │                                                             ││
│ │ Notification Email                                          ││
│ │ ┌─────────────────────────────────────────────────────────┐││
│ │ │ support@mybusiness.com                                  │││
│ │ └─────────────────────────────────────────────────────────┘││
│ │ We'll send a daily digest of captured leads to this email  ││
│ │                                                             ││
│ │ Send Email Notifications                       [Toggle: ON] ││
│ │                                                             ││
│ └─────────────────────────────────────────────────────────────┘│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Chat Widget - Lead Capture Flow

```
┌─────────────────────────────────┐
│ User: What's your return policy │
│       for electronics?          │
│                                 │
│ Bot: I don't have specific      │
│      information about          │
│      electronics returns in my  │
│      knowledge base.            │
│                                 │
│      Would you like to leave    │
│      your email? Someone from   │
│      our team can follow up     │
│      with the answer.           │
│                                 │
│ User: Sure, john@example.com    │
│                                 │
│ Bot: Thanks! I've noted your    │
│      email (john@example.com).  │
│      Our team will get back to  │
│      you about electronics      │
│      returns.                   │
│                                 │
│      Is there anything else I   │
│      can help with?             │
└─────────────────────────────────┘
```

### Alternative Flow - User Declines

```
┌─────────────────────────────────┐
│ User: What's your return policy │
│       for electronics?          │
│                                 │
│ Bot: I don't have specific      │
│      information about that.    │
│                                 │
│      Would you like to leave    │
│      your email? Someone can    │
│      follow up with the answer. │
│                                 │
│ User: No thanks                 │
│                                 │
│ Bot: No problem! Is there       │
│      anything else I can help   │
│      with?                      │
└─────────────────────────────────┘
```

### Alternative Flow - User Asks Different Question

```
┌─────────────────────────────────┐
│ User: What's your return policy │
│       for electronics?          │
│                                 │
│ Bot: I don't have specific      │
│      information about that.    │
│                                 │
│      Would you like to leave    │
│      your email? Someone can    │
│      follow up with the answer. │
│                                 │
│ User: What are your hours?      │
│                                 │
│ Bot: We're open Monday-Friday   │
│      9am-5pm EST.               │
│      (proceeds with normal      │
│       answer, no more email     │
│       prompts)                  │
└─────────────────────────────────┘
```

### Digest Email Template

```
Subject: [Support Bot] 3 Unanswered Questions (Dec 18)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Hi,

Your chatbot "Support Bot" couldn't answer 3 questions in the
last 24 hours. Here's a summary:

───────────────────────────────────────────────────────────────

1. "What's your return policy for electronics?"
   📧 Contact: john@example.com

2. "Do you ship to Canada?"
   📧 Contact: Not provided

3. "What are your holiday hours?"
   📧 Contact: sarah@test.com

───────────────────────────────────────────────────────────────

💡 Tip: Consider adding this information to your knowledge base
   to help future visitors get instant answers.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

— Your Chatbot Platform

You're receiving this because you enabled lead capture notifications
for "Support Bot". Manage settings in your dashboard.
```

---

## Technical Approach

### Database Changes

```sql
-- Migration: create_lead_captures_table

-- Create lead_captures table
CREATE TABLE lead_captures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  session_id UUID REFERENCES chat_sessions(id) ON DELETE SET NULL,
  question TEXT NOT NULL,
  user_email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  notified_at TIMESTAMPTZ
);

-- Indexes for efficient queries
CREATE INDEX idx_lead_captures_project ON lead_captures(project_id);
CREATE INDEX idx_lead_captures_pending ON lead_captures(project_id)
  WHERE notified_at IS NULL;
CREATE INDEX idx_lead_captures_created ON lead_captures(created_at DESC);

-- RLS policies
ALTER TABLE lead_captures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their project leads"
ON lead_captures FOR SELECT
USING (
  project_id IN (
    SELECT id FROM projects WHERE user_id = auth.uid()
  )
);

-- Service role can insert (from API)
CREATE POLICY "Service role can insert leads"
ON lead_captures FOR INSERT
WITH CHECK (true);

-- Service role can update (for marking notified)
CREATE POLICY "Service role can update leads"
ON lead_captures FOR UPDATE
USING (true);
```

```sql
-- Migration: add_lead_capture_fields_to_sessions

-- Add awaiting_email state to chat_sessions
ALTER TABLE chat_sessions
ADD COLUMN IF NOT EXISTS awaiting_email BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMPTZ DEFAULT NOW();

-- Index for session state queries
CREATE INDEX idx_chat_sessions_awaiting
ON chat_sessions(project_id, awaiting_email)
WHERE awaiting_email = TRUE;
```

### Project Settings Schema

Settings stored in `projects.settings` JSON column:

```typescript
interface ProjectSettings {
  system_prompt?: string;
  // ... existing settings

  // Lead Capture settings (NEW)
  lead_capture_enabled?: boolean;      // Default: false
  lead_capture_email?: string;         // Notification recipient
  lead_notifications_enabled?: boolean; // Default: true (if lead_capture_enabled)
  last_lead_digest_at?: string;        // ISO timestamp
}
```

### LLM Response Structure

Modify chat engine to use JSON response format:

```typescript
interface StructuredChatResponse {
  message: string;
  foundAnswer: boolean;
}
```

**Updated System Prompt Addition:**

```
## Response Format

You must respond with a valid JSON object containing exactly these fields:
{
  "message": "Your response to the user",
  "foundAnswer": true or false
}

Set "foundAnswer" to:
- true: If you found relevant information in the CONTEXT to answer the question
- false: If you had to say you don't have information or couldn't help

IMPORTANT: Always respond with valid JSON. No text outside the JSON object.
```

**Alternative: Use OpenAI Function Calling for structured output**

```typescript
const functions = [{
  name: "respond",
  description: "Respond to the user's message",
  parameters: {
    type: "object",
    properties: {
      message: {
        type: "string",
        description: "The response message to show the user"
      },
      foundAnswer: {
        type: "boolean",
        description: "Whether relevant information was found to answer the question"
      }
    },
    required: ["message", "foundAnswer"]
  }
}];
```

### Email Detection Logic

```typescript
// apps/api/src/services/lead-capture.ts

/**
 * Extract email address from user message
 */
export function extractEmailFromMessage(message: string): string | null {
  // Standard email regex
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi;
  const matches = message.match(emailRegex);

  if (matches && matches.length > 0) {
    // Return first valid email, lowercase
    return matches[0].toLowerCase();
  }

  return null;
}

/**
 * Check if user message is declining email capture
 */
export function isDeclineResponse(message: string): boolean {
  const normalizedMessage = message.trim().toLowerCase();

  const declinePatterns = [
    /^no$/,
    /^nope$/,
    /^no thanks?$/,
    /^no,? thanks?$/,
    /^nah$/,
    /^skip$/,
    /^never ?mind$/,
    /^not now$/,
    /^maybe later$/,
    /^i'?m (good|ok|okay)$/,
    /^pass$/,
  ];

  return declinePatterns.some(pattern => pattern.test(normalizedMessage));
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
}
```

### Session State Management

```typescript
// apps/api/src/services/lead-capture.ts

const CONVERSATION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Check if this is a new conversation (session timeout)
 */
export function isNewConversation(lastMessageAt: Date | null): boolean {
  if (!lastMessageAt) return true;

  const timeSinceLastMessage = Date.now() - lastMessageAt.getTime();
  return timeSinceLastMessage > CONVERSATION_TIMEOUT_MS;
}

/**
 * Handle lead capture flow in chat engine
 */
export async function handleLeadCaptureFlow(
  sessionId: string,
  projectId: string,
  userMessage: string,
  foundAnswer: boolean,
  projectSettings: ProjectSettings
): Promise<LeadCaptureResult> {

  // Get current session state
  const session = await getSessionState(sessionId);

  // Check if conversation timed out - reset state
  if (isNewConversation(session?.last_message_at)) {
    await resetSessionState(sessionId);
    session.awaiting_email = false;
  }

  // If we were awaiting email from previous turn
  if (session?.awaiting_email) {
    const email = extractEmailFromMessage(userMessage);

    if (email && isValidEmail(email)) {
      // User provided valid email - capture lead with email
      await storeLead(projectId, sessionId, session.pending_question, email);
      await clearAwaitingEmailState(sessionId);

      return {
        type: 'email_captured',
        email,
        shouldModifyResponse: true,
        responseAddition: `Thanks! I've noted your email (${email}). Our team will get back to you.`
      };
    }

    if (isDeclineResponse(userMessage)) {
      // User declined - store lead without email, clear state
      await storeLead(projectId, sessionId, session.pending_question, null);
      await clearAwaitingEmailState(sessionId);

      return {
        type: 'declined',
        shouldModifyResponse: false
      };
    }

    // User asked different question - store lead without email, process new question
    await storeLead(projectId, sessionId, session.pending_question, null);
    await clearAwaitingEmailState(sessionId);

    // Continue with normal flow for new question
  }

  // Check if we should ask for email (chatbot couldn't answer)
  if (!foundAnswer && projectSettings.lead_capture_enabled) {
    // Check if we already asked in this session
    const alreadyAsked = await hasAskedForEmailInSession(sessionId);

    if (!alreadyAsked) {
      // Set state to await email
      await setAwaitingEmailState(sessionId, userMessage);

      return {
        type: 'ask_for_email',
        shouldModifyResponse: true,
        responseAddition: "\n\nWould you like to leave your email? Someone from our team can follow up with the answer."
      };
    }
  }

  return {
    type: 'no_action',
    shouldModifyResponse: false
  };
}

interface LeadCaptureResult {
  type: 'email_captured' | 'declined' | 'ask_for_email' | 'no_action';
  email?: string;
  shouldModifyResponse: boolean;
  responseAddition?: string;
}
```

### Lead Storage

```typescript
// apps/api/src/services/lead-capture.ts

export async function storeLead(
  projectId: string,
  sessionId: string,
  question: string,
  email: string | null
): Promise<void> {
  await supabaseAdmin
    .from('lead_captures')
    .insert({
      project_id: projectId,
      session_id: sessionId,
      question,
      user_email: email,
    });
}

export async function getPendingLeads(projectId: string): Promise<LeadCapture[]> {
  const { data } = await supabaseAdmin
    .from('lead_captures')
    .select('*')
    .eq('project_id', projectId)
    .is('notified_at', null)
    .order('created_at', { ascending: true });

  return data || [];
}

export async function markLeadsAsNotified(leadIds: string[]): Promise<void> {
  await supabaseAdmin
    .from('lead_captures')
    .update({ notified_at: new Date().toISOString() })
    .in('id', leadIds);
}
```

### Digest Email Job

```typescript
// apps/api/src/jobs/lead-digest.ts

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Send daily lead digest emails
 * Run via cron: 0 9 * * * (daily at 9 AM)
 */
export async function sendLeadDigests(): Promise<void> {
  // Get all projects with lead capture and notifications enabled
  const { data: projects } = await supabaseAdmin
    .from('projects')
    .select('id, name, settings, user_id')
    .not('settings->lead_capture_enabled', 'is', null)
    .eq('settings->lead_capture_enabled', true)
    .eq('settings->lead_notifications_enabled', true);

  if (!projects) return;

  for (const project of projects) {
    try {
      const settings = project.settings as ProjectSettings;
      const notificationEmail = settings.lead_capture_email;

      if (!notificationEmail) continue;

      // Get pending leads for this project
      const leads = await getPendingLeads(project.id);

      if (leads.length === 0) continue;

      // Build and send email
      const emailHtml = buildDigestEmailHtml(project.name, leads);

      await resend.emails.send({
        from: 'Chatbot Platform <notifications@yourplatform.com>',
        to: notificationEmail,
        subject: `[${project.name}] ${leads.length} Unanswered Question${leads.length > 1 ? 's' : ''} (${formatDate(new Date())})`,
        html: emailHtml,
      });

      // Mark leads as notified
      await markLeadsAsNotified(leads.map(l => l.id));

      // Update last digest time
      await supabaseAdmin
        .from('projects')
        .update({
          settings: {
            ...settings,
            last_lead_digest_at: new Date().toISOString()
          }
        })
        .eq('id', project.id);

      console.log(`Sent lead digest for project ${project.id}: ${leads.length} leads`);

    } catch (error) {
      console.error(`Failed to send digest for project ${project.id}:`, error);
    }
  }
}

function buildDigestEmailHtml(projectName: string, leads: LeadCapture[]): string {
  const leadsList = leads.map((lead, i) => `
    <tr>
      <td style="padding: 16px; border-bottom: 1px solid #e5e7eb;">
        <div style="font-weight: 500; margin-bottom: 4px;">${i + 1}. "${escapeHtml(lead.question)}"</div>
        <div style="color: #6b7280; font-size: 14px;">
          ${lead.user_email
            ? `📧 Contact: <a href="mailto:${lead.user_email}">${lead.user_email}</a>`
            : '📧 Contact: Not provided'}
        </div>
      </td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #374151; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #f9fafb; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
        <h1 style="margin: 0 0 8px 0; font-size: 20px; color: #111827;">
          Unanswered Questions
        </h1>
        <p style="margin: 0; color: #6b7280;">
          Your chatbot "${escapeHtml(projectName)}" couldn't answer ${leads.length} question${leads.length > 1 ? 's' : ''} in the last 24 hours.
        </p>
      </div>

      <table style="width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        ${leadsList}
      </table>

      <div style="margin-top: 24px; padding: 16px; background: #fef3c7; border-radius: 8px;">
        <p style="margin: 0; font-size: 14px;">
          💡 <strong>Tip:</strong> Consider adding this information to your knowledge base to help future visitors get instant answers.
        </p>
      </div>

      <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb; color: #9ca3af; font-size: 12px;">
        <p style="margin: 0;">
          You're receiving this because you enabled lead capture notifications for "${escapeHtml(projectName)}".
          <br>Manage settings in your dashboard.
        </p>
      </div>
    </body>
    </html>
  `;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  });
}
```

### Cron Job Setup

**Option A: Vercel Cron (if using Vercel)**

```typescript
// apps/api/src/routes/cron.ts

import { Router } from 'express';
import { sendLeadDigests } from '../jobs/lead-digest';

const router = Router();

// Vercel cron calls this endpoint
router.get('/cron/lead-digest', async (req, res) => {
  // Verify cron secret
  const cronSecret = req.headers['authorization'];
  if (cronSecret !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    await sendLeadDigests();
    res.json({ success: true });
  } catch (error) {
    console.error('Lead digest cron failed:', error);
    res.status(500).json({ error: 'Failed to send digests' });
  }
});

export default router;
```

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/lead-digest",
      "schedule": "0 9 * * *"
    }
  ]
}
```

**Option B: Supabase Edge Function with pg_cron**

```sql
-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule daily job at 9 AM UTC
SELECT cron.schedule(
  'lead-digest-daily',
  '0 9 * * *',
  $$
  SELECT net.http_post(
    url := 'https://your-api.com/api/cron/lead-digest',
    headers := '{"Authorization": "Bearer YOUR_CRON_SECRET"}'::jsonb
  );
  $$
);
```

---

## Files to Create

| File | Purpose |
|------|---------|
| `apps/api/src/services/lead-capture.ts` | Lead capture logic, email detection, state management |
| `apps/api/src/jobs/lead-digest.ts` | Cron job for sending digest emails |
| `apps/api/src/routes/cron.ts` | Cron endpoint routes |
| `apps/web/components/settings/lead-capture-settings.tsx` | Settings UI component |

## Files to Modify

| File | Changes |
|------|---------|
| `apps/api/src/services/chat-engine.ts` | Integrate lead capture flow, structured response |
| `apps/api/src/services/prompt-builder.ts` | Add JSON response format instructions |
| `apps/api/src/routes/projects.ts` | Handle lead capture settings in PUT |
| `apps/api/src/index.ts` | Add cron routes |
| `apps/web/app/(dashboard)/settings/page.tsx` | Add Lead Capture section |
| `packages/db/src/types.ts` | Regenerate after migration |

---

## Acceptance Criteria

| ID | Scenario | Expected Result |
|----|----------|-----------------|
| AC-001 | Chatbot can't answer question, lead capture ON | Bot says it doesn't know AND offers email capture |
| AC-002 | Chatbot can't answer question, lead capture OFF | Bot says it doesn't know, NO email ask |
| AC-003 | User provides valid email | Email stored in lead_captures, confirmation shown |
| AC-004 | User provides invalid email format | Treated as regular message, not stored |
| AC-005 | User says "no" / "no thanks" | State cleared, no email stored, conversation continues |
| AC-006 | User asks different question (ignores email ask) | Lead stored without email, new question answered |
| AC-007 | User returns after 30+ minutes | Fresh context, no reference to old email request |
| AC-008 | Same session, bot can't answer 2nd question | Only asks for email once per session |
| AC-009 | Daily cron runs, leads pending | Digest email sent with all pending questions |
| AC-010 | Daily cron runs, no leads | No email sent |
| AC-011 | Notifications disabled, capture enabled | Leads stored in DB, no digest email sent |
| AC-012 | Email field empty in settings | Lead capture disabled (validation) |

---

## Out of Scope (Future Versions)

- Real-time notifications (webhook to Slack/Discord/CRM)
- Custom email templates
- Lead scoring/prioritization
- CRM integrations (HubSpot, Salesforce, Pipedrive)
- SMS notifications
- Analytics dashboard for leads (conversion rates, etc.)
- Configurable digest frequency (hourly, weekly)
- Lead export (CSV download)
- Auto-reply to captured leads

---

## Environment Variables

```bash
# Email sending (Resend)
RESEND_API_KEY=re_xxxxxxxxxxxx

# Cron job security
CRON_SECRET=your-secure-random-string

# Optional: Custom from address
EMAIL_FROM_ADDRESS=notifications@yourplatform.com
```

---

## Testing Checklist

### Unit Tests
- [ ] `extractEmailFromMessage` extracts emails correctly
- [ ] `isDeclineResponse` detects decline patterns
- [ ] `isValidEmail` validates email format
- [ ] `isNewConversation` detects timeout correctly

### Integration Tests
- [ ] Lead capture settings save correctly
- [ ] Lead is stored when chatbot can't answer
- [ ] Email is captured and stored when provided
- [ ] Session state is managed correctly
- [ ] Digest email job processes leads correctly

### E2E Tests (Playwright)
- [ ] Settings page shows lead capture section
- [ ] Toggle enables/disables correctly
- [ ] Email field validates format
- [ ] Widget shows email prompt when chatbot can't answer
- [ ] Email capture flow works end-to-end
- [ ] Declining works correctly

---

## Success Metrics

- Lead capture rate: % of unanswered questions that result in email capture
- Email open rate for digest emails
- Knowledge base updates following lead notifications
- Reduction in repeated unanswered questions over time

---

## References

- [MyAskAI Lead Capture](https://support.myaskai.com/features/lead-email-capture) - Similar feature implementation
- [Vellum LLM Memory Management](https://www.vellum.ai/blog/how-should-i-manage-memory-for-my-llm-chatbot) - Context management best practices
- [LivePerson Fallback Dialogs](https://developers.liveperson.com/conversation-builder-dialogs-fallback-dialogs.html) - Fallback flow patterns
- [Resend Documentation](https://resend.com/docs) - Email API

---

**Document Version**: 1.0
**Created**: December 2024
**Author**: Product Team
