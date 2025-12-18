# Feature: Chat Engine

## Overview

**Feature ID**: `chat-engine`
**Category**: Core (V1)
**Priority**: P0 (Core functionality)
**Complexity**: L
**Estimated Effort**: 4-5 days

### Summary
The core AI system that processes user messages, retrieves relevant knowledge via vector similarity search (RAG), decides whether to call API tools, executes tool calls when needed, and generates helpful responses. This is the brain of the chatbot.

### Dependencies
- `knowledge-base` - Knowledge chunks must exist for RAG
- `api-endpoints` - API tools must be configured for tool calling

### Success Criteria
- [ ] Chat API receives messages and returns responses
- [ ] RAG retrieves relevant knowledge chunks
- [ ] LLM uses knowledge to answer accurately
- [ ] Tool calling works when user asks for dynamic data
- [ ] "I don't know" responses are graceful (no hallucination)
- [ ] Conversation context maintained
- [ ] Response time under 5 seconds for most queries
- [ ] Rate limiting prevents abuse

---

## User Stories

### Primary User Story
> As a website visitor, I want to ask questions and get accurate, helpful answers from the business's knowledge or real-time data.

### Additional Stories
1. As a visitor, I want to check my order status so that I don't have to email support.
2. As a visitor, I want the chatbot to say "I don't know" rather than making up answers.
3. As a visitor, I want follow-up questions to remember context so I don't have to repeat myself.

---

## Functional Requirements

### Chat Processing

| ID | Requirement | Priority | Notes |
|----|-------------|----------|-------|
| CHT-001 | Receive and validate user messages | Must Have | Max 2000 chars |
| CHT-002 | Embed user message for vector search | Must Have | text-embedding-3-small |
| CHT-003 | Retrieve top-5 relevant knowledge chunks | Must Have | Cosine similarity |
| CHT-004 | Include knowledge context in LLM prompt | Must Have | System prompt |
| CHT-005 | Include API tools in LLM request | Must Have | OpenAI functions |
| CHT-006 | Execute tool calls when LLM requests | Must Have | Safe execution |
| CHT-007 | Feed tool results back to LLM | Must Have | Follow-up call |
| CHT-008 | Generate final response | Must Have | GPT-4o-mini |
| CHT-009 | Handle "I don't know" gracefully | Must Have | No hallucination |
| CHT-010 | Maintain conversation context | Should Have | Last 10 messages |
| CHT-011 | Rate limit per visitor | Should Have | 10/min, 50/hour |
| CHT-012 | Log conversations for debugging | Should Have | Async logging |

---

## System Architecture

### Chat Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                       CHAT ENGINE FLOW                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   USER MESSAGE                                                  │
│   "Where is my order #12345?"                                   │
│       │                                                         │
│       ▼                                                         │
│   ┌─────────────────────────────────────────┐                  │
│   │ 1. VALIDATE & RATE LIMIT                 │                  │
│   │    • Check message length                │                  │
│   │    • Check rate limits                   │                  │
│   └────────────────────┬────────────────────┘                  │
│                        │                                        │
│                        ▼                                        │
│   ┌─────────────────────────────────────────┐                  │
│   │ 2. EMBED USER MESSAGE                    │                  │
│   │    OpenAI text-embedding-3-small         │                  │
│   │    → 1536-dim vector                     │                  │
│   └────────────────────┬────────────────────┘                  │
│                        │                                        │
│                        ▼                                        │
│   ┌─────────────────────────────────────────┐                  │
│   │ 3. VECTOR SEARCH (RAG)                   │                  │
│   │    pgvector cosine similarity            │                  │
│   │    Top 5 chunks, threshold 0.7           │                  │
│   └────────────────────┬────────────────────┘                  │
│                        │                                        │
│                        ▼                                        │
│   ┌─────────────────────────────────────────┐                  │
│   │ 4. BUILD LLM REQUEST                     │                  │
│   │    • System prompt with instructions     │                  │
│   │    • Retrieved knowledge context         │                  │
│   │    • Available tools (API endpoints)     │                  │
│   │    • Conversation history (last 10)      │                  │
│   │    • User message                        │                  │
│   └────────────────────┬────────────────────┘                  │
│                        │                                        │
│                        ▼                                        │
│   ┌─────────────────────────────────────────┐                  │
│   │ 5. LLM CALL (GPT-4o-mini)                │                  │
│   │    tool_choice: "auto"                   │                  │
│   └────────────────────┬────────────────────┘                  │
│                        │                                        │
│            ┌───────────┴───────────┐                           │
│            ▼                       ▼                           │
│   ┌─────────────────┐    ┌─────────────────┐                   │
│   │ NO TOOL CALL    │    │ TOOL CALL       │                   │
│   │                 │    │                 │                   │
│   │ Return response │    │ 6. Execute API  │                   │
│   │ directly        │    │    with params  │                   │
│   └────────┬────────┘    └────────┬────────┘                   │
│            │                      │                             │
│            │                      ▼                             │
│            │             ┌─────────────────┐                   │
│            │             │ 7. Feed result  │                   │
│            │             │    back to LLM  │                   │
│            │             └────────┬────────┘                   │
│            │                      │                             │
│            │                      ▼                             │
│            │             ┌─────────────────┐                   │
│            │             │ 8. Generate     │                   │
│            │             │    final answer │                   │
│            │             └────────┬────────┘                   │
│            │                      │                             │
│            └──────────┬───────────┘                             │
│                       │                                         │
│                       ▼                                         │
│   ┌─────────────────────────────────────────┐                  │
│   │ 9. LOG & RETURN RESPONSE                 │                  │
│   │    "Your order #12345 is out for         │                  │
│   │    delivery and should arrive today!"    │                  │
│   └─────────────────────────────────────────┘                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## API Specification

### POST /api/chat

**Purpose**: Process a chat message and return AI response

**Authentication**: None (public, rate-limited by visitor ID)

**Request**:
```typescript
{
  "projectId": "proj_abc123",
  "visitorId": "vis_xyz789",
  "message": "Where is my order #12345?",
  "conversationHistory": [
    { "role": "user", "content": "Hi" },
    { "role": "assistant", "content": "Hello! How can I help?" }
  ]
}
```

**Response**:
```typescript
// 200 OK
{
  "message": "Your order #12345 is out for delivery and should arrive today by 5pm!",
  "conversationId": "conv_abc123"
}

// 400 Bad Request - Message too long
{
  "error": {
    "code": "MESSAGE_TOO_LONG",
    "message": "Message exceeds 2000 character limit"
  }
}

// 429 Too Many Requests - Rate limited
{
  "error": {
    "code": "RATE_LIMITED",
    "message": "Too many messages. Please wait before sending more.",
    "retryAfter": 60
  }
}

// 404 Not Found - Project not found
{
  "error": {
    "code": "PROJECT_NOT_FOUND",
    "message": "Chatbot not found"
  }
}
```

---

## Business Logic

### System Prompt Template

```typescript
const SYSTEM_PROMPT = `You are a helpful customer support assistant for {business_name}.

CRITICAL RULES:
1. ONLY answer questions using the provided CONTEXT and TOOLS
2. If you don't have enough information to answer, say: "I don't have information about that. Please contact us at {support_email} for help."
3. NEVER make up information or hallucinate facts
4. Be concise, friendly, and helpful
5. If a user asks about orders, accounts, or real-time data, USE THE AVAILABLE TOOLS
6. When using tools, extract the relevant parameters from the user's message

AVAILABLE CONTEXT FROM KNOWLEDGE BASE:
---
{retrieved_chunks}
---

{tools_section}

Remember: Only use information from the context above or from tool results. Never guess or make up data.`;
```

### Vector Search Implementation

```typescript
// apps/api/src/services/chat-engine.ts
import { OpenAI } from 'openai';
import { createServerClient } from '@chatbot/db';

const openai = new OpenAI();

interface SearchResult {
  id: string;
  content: string;
  similarity: number;
}

async function searchKnowledge(
  projectId: string,
  query: string,
  topK: number = 5,
  threshold: number = 0.7
): Promise<SearchResult[]> {
  const supabase = createServerClient();

  // 1. Embed the query
  const embeddingResponse = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: query,
  });
  const queryVector = embeddingResponse.data[0].embedding;

  // 2. Search with pgvector
  const { data: chunks, error } = await supabase.rpc('match_knowledge_chunks', {
    query_embedding: queryVector,
    match_threshold: threshold,
    match_count: topK,
    p_project_id: projectId,
  });

  if (error) throw error;

  return chunks || [];
}
```

### Chat Processing Implementation

```typescript
// apps/api/src/services/chat-engine.ts
interface ChatRequest {
  projectId: string;
  visitorId: string;
  message: string;
  conversationHistory?: Message[];
}

interface Message {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  tool_call_id?: string;
}

async function processChat(req: ChatRequest): Promise<string> {
  const { projectId, visitorId, message, conversationHistory = [] } = req;

  // 1. Get project
  const project = await getProject(projectId);
  if (!project) throw new Error('PROJECT_NOT_FOUND');

  // 2. Search knowledge base
  const relevantChunks = await searchKnowledge(projectId, message, 5);
  const contextText = relevantChunks.length > 0
    ? relevantChunks.map(c => c.content).join('\n\n---\n\n')
    : 'No relevant knowledge found.';

  // 3. Get API endpoints as tools
  const endpoints = await getApiEndpoints(projectId);
  const tools = endpoints.map(endpointToOpenAITool);

  // 4. Build system prompt
  const systemPrompt = buildSystemPrompt({
    businessName: project.name,
    context: contextText,
    hasTools: tools.length > 0,
  });

  // 5. Build messages array
  const messages: Message[] = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory.slice(-10), // Last 10 messages
    { role: 'user', content: message },
  ];

  // 6. Call LLM
  let response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages,
    tools: tools.length > 0 ? tools : undefined,
    tool_choice: tools.length > 0 ? 'auto' : undefined,
    max_tokens: 500,
    temperature: 0.7,
  });

  // 7. Handle tool calls (loop until no more tool calls)
  while (response.choices[0].message.tool_calls) {
    const toolCalls = response.choices[0].message.tool_calls;

    // Add assistant message with tool calls
    messages.push(response.choices[0].message as Message);

    // Execute each tool call
    for (const toolCall of toolCalls) {
      const endpoint = endpoints.find(e => e.id === toolCall.function.name);
      if (!endpoint) {
        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify({ error: 'Tool not found' }),
        });
        continue;
      }

      const args = JSON.parse(toolCall.function.arguments);
      const result = await executeEndpoint(endpoint, args);

      messages.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        content: JSON.stringify(result),
      });
    }

    // Get next response
    response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      tools,
      tool_choice: 'auto',
      max_tokens: 500,
    });
  }

  // 8. Extract final response
  const assistantMessage = response.choices[0].message.content;

  if (!assistantMessage) {
    return "I'm having trouble responding right now. Please try again.";
  }

  // 9. Log conversation (async, don't block)
  logConversation(projectId, visitorId, message, assistantMessage).catch(console.error);

  return assistantMessage;
}
```

### Tool Execution

```typescript
// apps/api/src/services/tool-executor.ts
async function executeEndpoint(
  endpoint: ApiEndpoint,
  params: Record<string, string>
): Promise<any> {
  // Build URL with params
  let url = endpoint.url;
  for (const [key, value] of Object.entries(params)) {
    url = url.replace(`{${key}}`, encodeURIComponent(value));
  }

  // Build headers
  const authConfig = await decrypt(endpoint.authConfig);
  const headers = buildAuthHeaders(endpoint.authType, authConfig);

  try {
    const response = await fetch(url, {
      method: endpoint.method,
      headers,
      body: endpoint.method === 'POST' ? JSON.stringify(params) : undefined,
      signal: AbortSignal.timeout(10000), // 10s timeout
    });

    if (!response.ok) {
      return {
        error: `API returned ${response.status}`,
        message: 'Unable to retrieve data at this time',
      };
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Tool execution error:', error);
    return {
      error: 'Failed to fetch data',
      message: 'Unable to retrieve data at this time',
    };
  }
}
```

### Rate Limiting

```typescript
// apps/api/src/middleware/rate-limit.ts
import { Redis } from 'ioredis'; // or use in-memory Map for simple cases

const RATE_LIMITS = {
  messagesPerMinute: 10,
  messagesPerHour: 50,
  messagesPerDay: 200,
};

async function checkRateLimit(visitorId: string): Promise<{
  allowed: boolean;
  retryAfter?: number;
}> {
  const redis = new Redis(process.env.REDIS_URL);
  const now = Date.now();
  const minuteKey = `rate:${visitorId}:minute:${Math.floor(now / 60000)}`;
  const hourKey = `rate:${visitorId}:hour:${Math.floor(now / 3600000)}`;

  // Check minute limit
  const minuteCount = await redis.incr(minuteKey);
  if (minuteCount === 1) {
    await redis.expire(minuteKey, 60);
  }
  if (minuteCount > RATE_LIMITS.messagesPerMinute) {
    return { allowed: false, retryAfter: 60 };
  }

  // Check hour limit
  const hourCount = await redis.incr(hourKey);
  if (hourCount === 1) {
    await redis.expire(hourKey, 3600);
  }
  if (hourCount > RATE_LIMITS.messagesPerHour) {
    return { allowed: false, retryAfter: 3600 };
  }

  return { allowed: true };
}
```

---

## Response Examples

### Knowledge-Based Response
```
User: "What's your return policy?"
Bot: "Our return policy allows returns within 30 days of purchase. Items must be unused and in original packaging. To initiate a return, please email returns@store.com with your order number."
```

### Tool-Based Response
```
User: "Where's my order #12345?"
[Bot calls Order Status API with order_id: "12345"]
[API returns: {status: "out_for_delivery", eta: "today by 5pm"}]
Bot: "Your order #12345 is out for delivery and should arrive today by 5pm!"
```

### "I Don't Know" Response
```
User: "Do you sell purple widgets?"
[Bot searches knowledge - no relevant results]
[No inventory API configured]
Bot: "I don't have information about that specific product. Please check our website or contact us at support@store.com for help with product availability."
```

### Multi-Turn Conversation
```
User: "I want to return something"
Bot: "I'd be happy to help with that! What's your order number?"
User: "12345"
[Bot calls Order API to verify]
Bot: "I found order #12345 placed on Dec 10. It's within our 30-day return window. To start your return, email returns@store.com with order #12345 and your reason for return."
```

---

## Error Handling

### Error Codes

| Code | HTTP | When It Occurs | User Response |
|------|------|----------------|---------------|
| MESSAGE_TOO_LONG | 400 | Message >2000 chars | "Message is too long" |
| RATE_LIMITED | 429 | Rate limit exceeded | "Please wait before sending more" |
| PROJECT_NOT_FOUND | 404 | Invalid project ID | "Chatbot not found" |
| INTERNAL_ERROR | 500 | Processing failed | "Something went wrong" |

### Graceful Degradation

- **No knowledge found**: LLM responds based on instructions only
- **Tool call fails**: Include error in tool response, LLM apologizes
- **LLM returns empty**: Return fallback message
- **Timeout**: Return "taking too long" message

---

## Edge Cases

| # | Scenario | Expected Behavior |
|---|----------|-------------------|
| 1 | No knowledge chunks exist | LLM uses instructions only |
| 2 | No relevant chunks found | LLM says "I don't have info" |
| 3 | Tool call times out | Return error, LLM apologizes |
| 4 | Multiple tools needed | Execute sequentially |
| 5 | Very long message | Truncate to 2000 chars |
| 6 | Empty message | Return validation error |
| 7 | Malicious prompt injection | System prompt guards against |
| 8 | Invalid project ID | Return 404 |
| 9 | Conversation too long | Keep only last 10 messages |
| 10 | LLM returns empty | Return fallback message |

---

## Performance Requirements

| Metric | Target |
|--------|--------|
| Embedding latency | <500ms |
| Vector search latency | <100ms |
| LLM response time | <3s |
| Tool execution timeout | 10s max |
| Total response time | <5s (P95) |

---

## Testing Requirements

### Unit Tests
- [ ] System prompt builds correctly
- [ ] Vector search returns relevant chunks
- [ ] Tool conversion produces valid format
- [ ] Rate limiting tracks correctly
- [ ] Parameter extraction from message works

### Integration Tests
- [ ] Full chat flow without tools
- [ ] Full chat flow with tool calling
- [ ] Multi-turn conversation works
- [ ] Rate limiting blocks excess requests

### E2E Tests
- [ ] Widget sends message, gets response
- [ ] Order status query calls API
- [ ] "I don't know" response for unknown queries

---

## Acceptance Criteria

### Definition of Done
- [ ] Chat API processes messages correctly
- [ ] RAG retrieval working
- [ ] Tool calling working
- [ ] Graceful "I don't know" responses
- [ ] Conversation context maintained
- [ ] Rate limiting functional
- [ ] Response time under 5 seconds
- [ ] Logging implemented

### Demo Checklist
- [ ] Ask FAQ question, get accurate answer
- [ ] Ask order status, see tool called
- [ ] Ask unknown question, get graceful response
- [ ] Show conversation context working

---

## Changelog

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | December 2024 | Morgan (PM) | Initial spec |
