# Human Handoff Feature Specification

## Metadata
- **Feature ID**: ADV-003
- **Feature Name**: Human Handoff
- **Category**: Advanced
- **Priority**: P2
- **Complexity**: High
- **Target Version**: V3
- **Dependencies**: Team Collaboration (ADV-002), Webhooks (ADV-005)
- **Owner**: Product Team
- **Status**: Planned

## Summary
Enable seamless escalation from AI chatbot to human support agents when conversations require human intervention. The system detects escalation triggers (user request, sentiment, complexity) and routes conversations to available team members. Includes agent dashboard, queue management, and conversation handback to AI after resolution.

## User Story
As a customer support manager, I want conversations to automatically escalate to human agents when the AI cannot help so that complex issues are handled by humans while routine queries remain automated, ensuring high customer satisfaction.

## Functional Requirements

### FR-001: Escalation Triggers
- Manual trigger: User explicitly requests human help ("talk to a person", "agent please")
- Sentiment trigger: Negative sentiment detected (frustration, anger)
- Complexity trigger: AI confidence score below threshold after N attempts
- Custom trigger: Specific keywords or phrases configured by admin
- Business hours: Optionally limit escalation to business hours only

### FR-002: Agent Queue & Assignment
- Escalated conversations enter a queue visible to all agents
- Queue shows: customer name, wait time, conversation preview, priority
- Round-robin assignment distributes conversations evenly
- Manual assignment: Agents can pick conversations from queue
- Priority levels: High, Normal, Low (based on sentiment, wait time, VIP status)
- Queue capacity limits prevent agent overload

### FR-003: Agent Dashboard
- Live view of assigned conversations with real-time updates
- Conversation history shows full AI transcript before escalation
- Agent can send messages, view customer details, add notes
- Multiple conversations handled in tabs/panels
- Status indicators: Waiting, In Progress, Resolved, Escalated Again

### FR-004: Conversation Context
- Agent receives full conversation history with AI
- Customer information displayed (name, email, previous conversations)
- Relevant knowledge base articles suggested
- Internal notes from AI system (detected intent, entities, issues)
- Timeline view shows AI attempts and escalation reason

### FR-005: Agent Features
- Real-time typing indicators for both agent and customer
- Quick replies/canned responses for common questions
- File sharing (images, PDFs) between agent and customer
- Conversation transfer to another agent
- Conversation escalation to supervisor/manager
- Internal notes visible only to team members

### FR-006: Handback to AI
- Agent marks conversation as resolved
- Option to hand back to AI for follow-up or related questions
- AI resumes with context from human conversation
- Customer notified of handback: "I'm back to help with anything else"
- Feedback collection: "Was your issue resolved?"

### FR-007: Availability Management
- Agents set status: Available, Busy, Away, Offline
- Automatic status changes based on active conversations
- Max concurrent conversations per agent (configurable)
- Out-of-office mode with custom message
- Business hours configuration per project or team

### FR-008: Notifications & Alerts
- Real-time browser/desktop notifications for new escalations
- Email alerts for waiting customers (after X minutes)
- Slack/Teams integration for team notifications
- Escalation reports sent to managers (daily/weekly)
- SLA warnings for approaching timeout thresholds

## UI Mockup

```
Agent Dashboard:
+----------------------------------------------------------+
|  Cover - Agent Dashboard            [John Doe - Online v]|
+----------------------------------------------------------+
|  Queue (3)  |  My Conversations (2)  |  Resolved (12)     |
+----------------------------------------------------------+
| QUEUE                                                     |
| +------------------------------------------------------+ |
| | High Priority | Sarah Johnson | Waiting 8 min        | |
| | "Your bot doesn't understand, I need help now"       | |
| | [Claim]                                              | |
| +------------------------------------------------------+ |
| | Normal | Mike Davis | Waiting 3 min                  | |
| | "Can I get a refund for my order?"                   | |
| | [Claim]                                              | |
| +------------------------------------------------------+ |
|                                                           |
| MY CONVERSATIONS                                          |
| +------------------------------------------------------+ |
| | [Active] Emily Chen - In Progress (12 min)           | |
| | "Billing issue with subscription..."      [Open]     | |
| +------------------------------------------------------+ |
| | [Active] Tom Wilson - Waiting for Customer (5 min)   | |
| | "Technical error on checkout page..."     [Open]     | |
| +------------------------------------------------------+ |
+----------------------------------------------------------+

Conversation View:
+----------------------------------------------------------+
|  < Back to Queue          Emily Chen - In Progress       |
|                           emily@example.com              |
|                           [Transfer] [Escalate] [Resolve]|
+----------------------------------------------------------+
| CONVERSATION HISTORY                      | CUSTOMER INFO|
|                                           |              |
| [AI] Hello! How can I help?               | Emily Chen   |
| [Customer] I was charged twice            | VIP Customer |
|                                           | Member since:|
| [AI] I can help with billing. Let me...   | Jan 2024     |
|                                           |              |
| [Customer] This is frustrating! I need... | Recent:      |
|                                           | - Order #1234|
| >>> ESCALATED TO HUMAN (Negative sentiment)| - 3 convos  |
|                                           |              |
| [YOU] Hi Emily, I'm John from support...  | Notes:       |
| [Customer] Thank you! Here's my...        | [Add Note]   |
|                                           |              |
| [Type your message...]       [Send]       |              |
| [Quick Replies v] [Attach File]           |              |
+----------------------------------------------------------+

Quick Replies:
+----------------------------------+
| Quick Replies                    |
|----------------------------------|
| - I understand your frustration  |
| - Let me look into that for you  |
| - Can you provide more details?  |
| - I've resolved the issue        |
| - Is there anything else?        |
|                                  |
| [Edit Quick Replies]             |
+----------------------------------+
```

## Technical Approach

### Data Model
```typescript
interface Escalation {
  id: string;
  conversationId: string;
  projectId: string;
  reason: 'manual' | 'sentiment' | 'complexity' | 'keyword';
  trigger: string; // What caused escalation
  priority: 'high' | 'normal' | 'low';
  status: 'queued' | 'assigned' | 'in_progress' | 'resolved' | 'escalated_again';
  assignedTo?: string; // Agent user ID
  assignedAt?: Date;
  resolvedAt?: Date;
  resolutionNotes?: string;
  queuedAt: Date;
  handedBackToAI: boolean;
}

interface AgentStatus {
  userId: string;
  status: 'available' | 'busy' | 'away' | 'offline';
  maxConcurrent: number;
  activeConversations: string[];
  lastActivityAt: Date;
}

interface ConversationNote {
  id: string;
  conversationId: string;
  userId: string;
  content: string;
  internal: boolean; // Visible only to team
  createdAt: Date;
}
```

### Escalation Detection
```typescript
// AI Confidence Check
if (aiResponse.confidence < 0.5 && attemptCount > 2) {
  triggerEscalation('complexity', 'Low confidence after multiple attempts');
}

// Sentiment Analysis
if (sentimentScore < -0.6) {
  triggerEscalation('sentiment', 'Negative sentiment detected');
}

// Keyword Detection
const escalationKeywords = ['speak to human', 'real person', 'agent please'];
if (userMessage.matchesAny(escalationKeywords)) {
  triggerEscalation('manual', 'User requested human assistance');
}
```

### Queue Management
- Redis-based queue for real-time updates
- Priority queue with weighted scoring
- Round-robin assignment with load balancing
- Automatic reassignment if agent becomes unavailable
- Queue metrics: average wait time, longest wait, resolution rate

### Real-Time Communication
- WebSocket connections for agents and customers
- Presence system tracks agent availability
- Typing indicators via WebSocket events
- Message delivery confirmation
- Automatic reconnection on network issues

### API Endpoints
```
GET    /api/escalations/queue          - Get escalation queue
POST   /api/escalations/:id/claim      - Claim escalation
POST   /api/escalations/:id/transfer   - Transfer to another agent
POST   /api/escalations/:id/resolve    - Mark as resolved
POST   /api/escalations/:id/handback   - Hand back to AI
GET    /api/agent/status               - Get agent status
PATCH  /api/agent/status               - Update agent status
GET    /api/agent/conversations        - Get assigned conversations
POST   /api/conversations/:id/notes    - Add internal note
```

### Integration Points
- Webhooks for external systems (Zendesk, Intercom, custom CRM)
- Slack/Teams bot for notifications
- Email integration for escalation alerts
- Analytics pipeline for escalation metrics

## Acceptance Criteria

### AC-001: Escalation Detection
- Given user says "I need to speak to a person", conversation is escalated immediately
- Given AI confidence is below 50% for 3 consecutive messages, conversation is escalated
- Given negative sentiment is detected, conversation is escalated with high priority
- Escalation reason is clearly displayed to agent

### AC-002: Queue Management
- Escalated conversations appear in agent queue within 1 second
- Queue shows priority, wait time, and conversation preview
- Agents can claim conversations from queue
- Claimed conversations are removed from queue for other agents
- Queue automatically reorders by priority and wait time

### AC-003: Agent Assignment
- Given agent status is "Available", they receive new escalations
- Given agent is at max concurrent limit, they do not receive new escalations
- Given no agents available, customer is notified of wait time
- Round-robin ensures even distribution across available agents

### AC-004: Conversation Handoff
- Agent sees full conversation history including AI messages
- Agent can send messages in real-time to customer
- Customer sees typing indicator when agent is typing
- Conversation context is preserved throughout handoff

### AC-005: Resolution & Handback
- Agent can mark conversation as resolved with notes
- Agent can hand conversation back to AI for continued assistance
- When handed back, AI has context from human conversation
- Customer is notified when conversation is resolved

### AC-006: Agent Dashboard
- Dashboard shows live queue and assigned conversations
- Real-time updates without page refresh
- Agents can manage multiple conversations simultaneously
- Conversation history and customer info displayed side-by-side

### AC-007: Notifications
- Agents receive browser notification for new escalations
- Email alert sent if customer waits more than 5 minutes
- Managers receive daily report of escalation metrics
- Slack notification sent for high-priority escalations

## Out of Scope (V4+)
- Video/voice call escalation
- AI assistant suggestions during agent conversation
- Advanced routing rules (skill-based, language-based)
- Integration with phone systems
- Customer callback scheduling
- Chatbot takeover during agent unavailability

## Success Metrics
- Average time to claim escalation (target: < 60 seconds)
- Average resolution time (target: < 5 minutes)
- Escalation rate (conversations escalated / total conversations)
- Customer satisfaction after escalation (CSAT score)
- Handback success rate (issues resolved after AI handback)
- Agent utilization rate

## Questions & Decisions
- **Q**: What happens if no agents are available?
  - **A**: Queue the escalation and notify customer of estimated wait time, offer email follow-up option

- **Q**: Should AI interrupt agent conversations with suggestions?
  - **A**: V4 feature - AI co-pilot for agents

- **Q**: Maximum concurrent conversations per agent?
  - **A**: Configurable, default 3

- **Q**: Should we support voice/video escalation?
  - **A**: No, text-only for V3

## References
- [Team Collaboration Feature](/docs/product/features/advanced/team-collaboration/spec.md)
- [Webhooks Feature](/docs/product/features/advanced/webhooks/spec.md)
- [Roadmap: V3 Advanced Features](/docs/product/roadmap.md)
