# Feature: Conversation History

## Overview

**Feature ID**: `conversation-history`
**Category**: Enhanced (V2)
**Priority**: P1 (Post-MVP Enhancement)
**Complexity**: S (Small)
**Estimated Effort**: 2-3 days

### Summary
A dashboard feature that allows business owners to view, search, and replay past chatbot conversations. Helps understand customer interactions, identify common issues, and improve the chatbot's knowledge base and responses.

### Dependencies
- `chat-engine` - Must persist conversation data
- `auth-system` - Dashboard requires authentication

### Success Criteria
- [ ] View list of all conversations
- [ ] Search conversations by keyword or date
- [ ] View full conversation thread
- [ ] Filter by date range, visitor, or status
- [ ] Export individual conversations
- [ ] Performance: List loads in <1s

---

## User Stories

### Primary User Story
> As a business owner, I want to view past chatbot conversations so I can understand what customers are asking and how well my bot is responding.

### Additional Stories
1. As a business owner, I want to search conversations by keyword so I can find specific customer inquiries.
2. As a business owner, I want to see all conversations from a specific visitor so I can understand their journey.
3. As a support agent, I want to review flagged conversations so I can follow up with customers who had issues.

---

## Functional Requirements

### Conversation History Dashboard

| ID | Requirement | Priority | Notes |
|----|-------------|----------|-------|
| HIST-001 | Display list of conversations | Must Have | Paginated, 20 per page |
| HIST-002 | Show conversation metadata | Must Have | Date, visitor, message count |
| HIST-003 | Search by keyword in messages | Must Have | Full-text search |
| HIST-004 | Filter by date range | Must Have | Last 7d, 30d, custom |
| HIST-005 | View full conversation thread | Must Have | All messages in order |
| HIST-006 | Export conversation to text/JSON | Should Have | Single conversation |
| HIST-007 | Mark conversations as reviewed | Should Have | Status tracking |
| HIST-008 | Filter by visitor ID | Should Have | See visitor history |
| HIST-009 | Flag conversations for follow-up | Nice to Have | Manual tagging |

---

## UI Mockup

```
┌─────────────────────────────────────────────────────────────┐
│  Conversation History                      [Search: ______ ]│
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Filters: [Last 30 Days ▼] [All Visitors ▼] [All Status ▼]  │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Dec 17, 2024 • 2:34 PM                              │    │
│  │ Visitor: vis_abc123 • Messages: 8 • Duration: 3m    │    │
│  │                                                      │    │
│  │ "Hi, I need help with my order #12345..."           │    │
│  │ [View Conversation →]                    [Export ↓] │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Dec 17, 2024 • 1:15 PM                              │    │
│  │ Visitor: vis_def456 • Messages: 5 • Duration: 2m    │    │
│  │                                                      │    │
│  │ "What's your return policy?"                         │    │
│  │ [View Conversation →]                    [Export ↓] │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Dec 16, 2024 • 4:52 PM                              │    │
│  │ Visitor: vis_ghi789 • Messages: 12 • Duration: 7m   │    │
│  │                                                      │    │
│  │ "Do you ship to Canada?"                             │    │
│  │ [View Conversation →]                    [Export ↓] │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  Showing 1-20 of 156 conversations     [← Prev] [Next →]    │
│                                                               │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  Conversation Details                          [← Back]      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Visitor: vis_abc123                                         │
│  Started: Dec 17, 2024 at 2:34 PM                           │
│  Duration: 3 minutes                                         │
│  Messages: 8                                                 │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ 👤 User (2:34 PM)                                    │    │
│  │ Hi, I need help with my order #12345                 │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ 🤖 Assistant (2:34 PM)                               │    │
│  │ I'd be happy to help! Let me check on order #12345   │    │
│  │ for you...                                            │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ 🤖 Assistant (2:34 PM)                               │    │
│  │ Your order is out for delivery and should arrive     │    │
│  │ today by 5pm!                                         │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  [Export Conversation ↓]                                     │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## Technical Approach

### Database Schema

```sql
-- conversations table (extends existing)
ALTER TABLE conversations ADD COLUMN started_at TIMESTAMP DEFAULT NOW();
ALTER TABLE conversations ADD COLUMN ended_at TIMESTAMP;
ALTER TABLE conversations ADD COLUMN message_count INTEGER DEFAULT 0;
ALTER TABLE conversations ADD COLUMN duration_seconds INTEGER;
ALTER TABLE conversations ADD COLUMN status TEXT DEFAULT 'active'; -- 'active', 'ended', 'flagged'
ALTER TABLE conversations ADD COLUMN is_reviewed BOOLEAN DEFAULT false;
ALTER TABLE conversations ADD COLUMN search_vector tsvector; -- For full-text search

-- Create index for full-text search
CREATE INDEX conversations_search_idx ON conversations USING GIN(search_vector);

-- Update search vector on message insert/update
CREATE FUNCTION update_conversation_search() RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations
  SET search_vector = to_tsvector('english',
    (SELECT string_agg(content, ' ') FROM messages WHERE conversation_id = NEW.conversation_id)
  )
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER messages_search_update
AFTER INSERT OR UPDATE ON messages
FOR EACH ROW EXECUTE FUNCTION update_conversation_search();
```

### API Endpoints

```typescript
// GET /api/conversations/:projectId
// List conversations with filters
{
  "conversations": [
    {
      "id": "conv_abc123",
      "visitorId": "vis_xyz789",
      "startedAt": "2024-12-17T14:34:00Z",
      "endedAt": "2024-12-17T14:37:00Z",
      "messageCount": 8,
      "durationSeconds": 180,
      "firstMessage": "Hi, I need help with my order #12345",
      "status": "ended"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 156
  }
}

// Query params: ?page=1&limit=20&search=order&startDate=2024-12-01&endDate=2024-12-31&visitorId=vis_xyz

// GET /api/conversations/:conversationId/messages
// Get full conversation thread
{
  "conversation": {
    "id": "conv_abc123",
    "visitorId": "vis_xyz789",
    "startedAt": "2024-12-17T14:34:00Z",
    "messageCount": 8
  },
  "messages": [
    {
      "id": "msg_123",
      "role": "user",
      "content": "Hi, I need help with my order #12345",
      "timestamp": "2024-12-17T14:34:00Z"
    },
    {
      "id": "msg_124",
      "role": "assistant",
      "content": "I'd be happy to help! Let me check...",
      "timestamp": "2024-12-17T14:34:02Z",
      "responseTimeMs": 2300
    }
  ]
}

// POST /api/conversations/:conversationId/export
// Export conversation
{
  "format": "text" // or "json"
}
```

### Search Implementation

```typescript
// apps/api/src/services/conversation-search.ts
async function searchConversations(
  projectId: string,
  searchQuery: string,
  filters: SearchFilters
): Promise<ConversationList> {
  const supabase = createServerClient();

  let query = supabase
    .from('conversations')
    .select('*', { count: 'exact' })
    .eq('project_id', projectId);

  // Full-text search
  if (searchQuery) {
    query = query.textSearch('search_vector', searchQuery);
  }

  // Date range filter
  if (filters.startDate) {
    query = query.gte('started_at', filters.startDate);
  }
  if (filters.endDate) {
    query = query.lte('started_at', filters.endDate);
  }

  // Visitor filter
  if (filters.visitorId) {
    query = query.eq('visitor_id', filters.visitorId);
  }

  // Status filter
  if (filters.status) {
    query = query.eq('status', filters.status);
  }

  // Pagination
  const offset = (filters.page - 1) * filters.limit;
  query = query
    .order('started_at', { ascending: false })
    .range(offset, offset + filters.limit - 1);

  const { data, error, count } = await query;

  if (error) throw error;

  return {
    conversations: data || [],
    pagination: {
      page: filters.page,
      limit: filters.limit,
      total: count || 0,
    },
  };
}
```

---

## Acceptance Criteria

### Definition of Done
- [ ] Conversation list displays with pagination
- [ ] Full-text search works across all messages
- [ ] Date range filter works correctly
- [ ] Visitor filter shows all conversations from one visitor
- [ ] Full conversation thread displays in order
- [ ] Export to text file works
- [ ] List loads in <1 second
- [ ] Search results return in <500ms

### Demo Checklist
- [ ] View list of conversations
- [ ] Search for "order" and see relevant conversations
- [ ] Filter by last 7 days
- [ ] Click conversation to view full thread
- [ ] Export conversation to text file

---

## Edge Cases

| # | Scenario | Expected Behavior |
|---|----------|-------------------|
| 1 | No conversations yet | Show "No conversations yet" placeholder |
| 2 | Search returns no results | Show "No matches found" message |
| 3 | Conversation with 100+ messages | Paginate messages in thread view |
| 4 | Visitor has 50+ conversations | Paginate visitor history |
| 5 | Export very long conversation | Stream file generation |

---

## Performance Requirements

| Metric | Target |
|--------|--------|
| List load time | <1s |
| Search response time | <500ms |
| Conversation thread load | <800ms |
| Export generation | <5s |

---

## Changelog

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | December 2024 | Product Team | Initial spec for V2 |
