# Feature: Chat Analytics

## Overview

**Feature ID**: `chat-analytics`
**Category**: Enhanced (V2)
**Priority**: P1 (Post-MVP Enhancement)
**Complexity**: M (Medium)
**Estimated Effort**: 3-4 days

### Summary
A dashboard analytics feature that tracks and displays key chatbot metrics including message volume, popular questions, response quality indicators, and conversation trends. Provides business owners with actionable insights into how their chatbot is performing and what customers are asking about.

### Dependencies
- `chat-engine` - Must log conversations for analysis
- `auth-system` - Dashboard requires authentication

### Success Criteria
- [ ] Display total message count (daily, weekly, monthly)
- [ ] Show most frequently asked questions
- [ ] Track response quality metrics (sentiment, user feedback)
- [ ] Generate exportable reports
- [ ] Real-time metric updates
- [ ] Performance: Dashboard loads in <2s

---

## User Stories

### Primary User Story
> As a business owner, I want to see analytics about my chatbot conversations so I can understand what customers are asking and improve my knowledge base.

### Additional Stories
1. As a business owner, I want to identify the most common questions so I can add better answers to my knowledge base.
2. As a business owner, I want to see how many conversations happen daily so I can justify the cost of the chatbot.
3. As a business owner, I want to export analytics reports so I can share insights with my team.

---

## Functional Requirements

### Analytics Dashboard

| ID | Requirement | Priority | Notes |
|----|-------------|----------|-------|
| ANA-001 | Display total message count (24h, 7d, 30d) | Must Have | Widget with trend indicator |
| ANA-002 | Show top 10 most asked questions | Must Have | Clustered by similarity |
| ANA-003 | Track conversations per day (line chart) | Must Have | Last 30 days |
| ANA-004 | Display average response time | Should Have | Per conversation |
| ANA-005 | Show user satisfaction metrics | Should Have | Based on feedback |
| ANA-006 | Export analytics to CSV/PDF | Should Have | Date range filter |
| ANA-007 | Filter analytics by date range | Should Have | Custom ranges |
| ANA-008 | Show bounce rate (1-message conversations) | Nice to Have | Engagement metric |

---

## UI Mockup

```
┌─────────────────────────────────────────────────────────────┐
│  Analytics Dashboard                          Last 30 Days ▼│
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Total Messages│  │ Conversations│  │ Avg Response │      │
│  │              │  │              │  │              │      │
│  │    1,247     │  │     856      │  │    2.3s      │      │
│  │   +12% ↑     │  │   +8% ↑      │  │   -0.5s ↓    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Messages Over Time                                   │    │
│  │                                                      │    │
│  │  120│     ╱╲                                        │    │
│  │   80│   ╱    ╲      ╱╲                             │    │
│  │   40│ ╱        ╲  ╱    ╲                           │    │
│  │    0└────────────────────────────────────────────  │    │
│  │      Dec 1    Dec 8    Dec 15    Dec 22    Dec 29  │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Top Questions                                        │    │
│  │                                                      │    │
│  │  1. Where is my order? ......................... 89  │    │
│  │  2. What's your return policy? ................ 67  │    │
│  │  3. Do you ship internationally? .............. 54  │    │
│  │  4. How long does shipping take? .............. 43  │    │
│  │  5. Do you offer refunds? ..................... 38  │    │
│  │                                                      │    │
│  │  [View All Questions →]                              │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  [Export Report ↓]                                           │
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
ALTER TABLE conversations ADD COLUMN user_feedback TEXT; -- 'positive', 'negative', 'neutral'

-- messages table (extends existing)
ALTER TABLE messages ADD COLUMN response_time_ms INTEGER; -- Time to generate response

-- analytics_cache table (for performance)
CREATE TABLE analytics_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id),
  metric_type TEXT NOT NULL, -- 'daily_messages', 'top_questions', etc.
  date DATE NOT NULL,
  value JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(project_id, metric_type, date)
);
```

### API Endpoints

```typescript
// GET /api/analytics/:projectId/summary
// Returns overview metrics
{
  "totalMessages": 1247,
  "totalConversations": 856,
  "avgResponseTime": 2.3,
  "periodStart": "2024-12-01",
  "periodEnd": "2024-12-31",
  "trends": {
    "messagesChange": 12,
    "conversationsChange": 8
  }
}

// GET /api/analytics/:projectId/top-questions?limit=10
// Returns most common questions
[
  { "question": "Where is my order?", "count": 89, "cluster": "order_status" },
  { "question": "What's your return policy?", "count": 67, "cluster": "returns" }
]

// GET /api/analytics/:projectId/timeline?days=30
// Returns daily message counts
[
  { "date": "2024-12-01", "messages": 45, "conversations": 32 },
  { "date": "2024-12-02", "messages": 52, "conversations": 38 }
]

// POST /api/analytics/:projectId/export
// Generates CSV/PDF report
{
  "format": "csv", // or "pdf"
  "startDate": "2024-12-01",
  "endDate": "2024-12-31"
}
```

### Question Clustering

```typescript
// apps/api/src/services/question-clustering.ts
import { OpenAI } from 'openai';

async function clusterQuestions(projectId: string): Promise<QuestionCluster[]> {
  const supabase = createServerClient();

  // Get all user messages from last 30 days
  const { data: messages } = await supabase
    .from('messages')
    .select('content')
    .eq('project_id', projectId)
    .eq('role', 'user')
    .gte('created_at', thirtyDaysAgo())
    .limit(1000);

  if (!messages || messages.length === 0) return [];

  // Embed all questions
  const openai = new OpenAI();
  const embeddings = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: messages.map(m => m.content),
  });

  // Simple clustering: group by similarity threshold
  const clusters: QuestionCluster[] = [];
  const processed = new Set<number>();

  for (let i = 0; i < embeddings.data.length; i++) {
    if (processed.has(i)) continue;

    const cluster: QuestionCluster = {
      representative: messages[i].content,
      questions: [messages[i].content],
      count: 1,
    };

    // Find similar questions
    for (let j = i + 1; j < embeddings.data.length; j++) {
      if (processed.has(j)) continue;

      const similarity = cosineSimilarity(
        embeddings.data[i].embedding,
        embeddings.data[j].embedding
      );

      if (similarity > 0.85) { // High similarity threshold
        cluster.questions.push(messages[j].content);
        cluster.count++;
        processed.add(j);
      }
    }

    processed.add(i);
    clusters.push(cluster);
  }

  // Sort by count and return top 10
  return clusters.sort((a, b) => b.count - a.count).slice(0, 10);
}
```

### Caching Strategy

```typescript
// Cache daily metrics at midnight
// Run as cron job: 0 0 * * * (daily at midnight)
async function cacheAnalytics(projectId: string) {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  const metrics = await calculateDailyMetrics(projectId, yesterday);

  await supabase.from('analytics_cache').upsert({
    project_id: projectId,
    metric_type: 'daily_summary',
    date: yesterday.toISOString().split('T')[0],
    value: metrics,
  });
}
```

---

## Acceptance Criteria

### Definition of Done
- [ ] Dashboard displays total messages, conversations, and avg response time
- [ ] Top 10 questions shown with counts
- [ ] Timeline chart shows daily message volume for last 30 days
- [ ] Date range filter works (7d, 30d, custom)
- [ ] Export to CSV generates downloadable file
- [ ] Analytics update in near real-time (<5 min delay)
- [ ] Dashboard loads in <2 seconds
- [ ] Question clustering groups similar queries

### Demo Checklist
- [ ] Show analytics dashboard with real data
- [ ] Filter by different date ranges
- [ ] Click on top question to see similar queries
- [ ] Export report and verify data accuracy
- [ ] Demonstrate real-time updates after new conversation

---

## Edge Cases

| # | Scenario | Expected Behavior |
|---|----------|-------------------|
| 1 | No conversations yet | Show "No data yet" placeholder |
| 2 | Only 1-2 conversations | Display available data, note limited insights |
| 3 | Very high traffic (1000+ msgs/day) | Use cached metrics, update hourly |
| 4 | Question clustering fails | Fall back to simple frequency count |
| 5 | Export with large date range | Limit to 90 days max |

---

## Performance Requirements

| Metric | Target |
|--------|--------|
| Dashboard load time | <2s |
| Metric calculation | <500ms |
| Question clustering | <5s (background job) |
| Export generation | <10s |

---

## Changelog

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | December 2024 | Product Team | Initial spec for V2 |
