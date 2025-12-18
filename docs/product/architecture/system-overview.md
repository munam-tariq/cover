# System Architecture Overview

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           AI CHATBOT PLATFORM                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   CLIENTS                                                                   │
│   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │
│   │   Browser   │  │   Widget    │  │  MCP Host   │  │   Mobile    │       │
│   │ (Dashboard) │  │ (Customer)  │  │  (Lovable)  │  │ (Future)    │       │
│   └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘       │
│          │                │                │                │               │
│          └────────────────┴────────┬───────┴────────────────┘               │
│                                    │                                        │
│   ─────────────────────────────────┼────────────────────────────────────    │
│                                    ▼                                        │
│   APPLICATIONS                                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐  │
│   │                         TURBOREPO MONOREPO                          │  │
│   │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌───────────┐  │  │
│   │  │  apps/web   │  │  apps/api   │  │apps/widget  │  │apps/mcp   │  │  │
│   │  │  (Next.js)  │  │  (Express)  │  │  (Vanilla)  │  │ (Node.js) │  │  │
│   │  │             │  │             │  │             │  │           │  │  │
│   │  │ • Dashboard │  │ • REST API  │  │ • Chat UI   │  │ • MCP SDK │  │  │
│   │  │ • Auth Flow │  │ • Chat      │  │ • Shadow    │  │ • Tools   │  │  │
│   │  │ • Settings  │  │ • RAG       │  │   DOM       │  │           │  │  │
│   │  │             │  │ • Tools     │  │             │  │           │  │  │
│   │  └──────┬──────┘  └──────┬──────┘  └─────────────┘  └─────┬─────┘  │  │
│   │         │                │                                │        │  │
│   │         └────────────────┴────────────────────────────────┘        │  │
│   │                                   │                                 │  │
│   │  ┌─────────────────────────────────────────────────────────────┐   │  │
│   │  │                    SHARED PACKAGES                          │   │  │
│   │  │  ┌───────────┐  ┌───────────┐  ┌───────────┐               │   │  │
│   │  │  │packages/db│  │packages/ui│  │packages/  │               │   │  │
│   │  │  │• Types    │  │• shadcn   │  │shared     │               │   │  │
│   │  │  │• Queries  │  │• Components│  │• Utils    │               │   │  │
│   │  │  └───────────┘  └───────────┘  └───────────┘               │   │  │
│   │  └─────────────────────────────────────────────────────────────┘   │  │
│   └─────────────────────────────────────────────────────────────────────┘  │
│                                    │                                        │
│   ─────────────────────────────────┼────────────────────────────────────    │
│                                    ▼                                        │
│   EXTERNAL SERVICES                                                         │
│   ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐            │
│   │    SUPABASE     │  │     OPENAI      │  │  CUSTOMER APIs  │            │
│   │                 │  │                 │  │                 │            │
│   │ • PostgreSQL    │  │ • GPT-4o-mini   │  │ • Order Status  │            │
│   │ • pgvector      │  │ • Embeddings    │  │ • Inventory     │            │
│   │ • Auth          │  │   (3-small)     │  │ • Custom        │            │
│   │ • Storage       │  │ • Tool Calling  │  │                 │            │
│   │ • Realtime      │  │                 │  │                 │            │
│   └─────────────────┘  └─────────────────┘  └─────────────────┘            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | Next.js 14+ (App Router) | Dashboard application |
| **UI Components** | shadcn/ui + Tailwind CSS | Design system |
| **Widget** | Vanilla JS + Shadow DOM | Embeddable chat widget |
| **API Server** | Node.js (Express) | REST API, chat processing |
| **MCP Server** | Node.js + MCP SDK | AI platform integration |
| **Database** | Supabase PostgreSQL | Data persistence |
| **Vector Search** | pgvector | RAG retrieval |
| **Authentication** | Supabase Auth | Magic links |
| **File Storage** | Supabase Storage | PDF/file uploads |
| **LLM** | OpenAI GPT-4o-mini | Chat responses |
| **Embeddings** | OpenAI text-embedding-3-small | Vector generation |
| **Monorepo** | Turborepo + pnpm | Build system |

## Data Flow

### Knowledge Upload Flow
```
User uploads PDF → API validates → Store in Supabase Storage
                                         ↓
                                   Queue background job
                                         ↓
                            Extract text (pdf-parse)
                                         ↓
                              Chunk text (~500 tokens)
                                         ↓
                          Generate embeddings (OpenAI)
                                         ↓
                      Store chunks + vectors in PostgreSQL
```

### Chat Processing Flow
```
User message → Widget → API → Embed message (OpenAI)
                              ↓
                    Vector search (pgvector)
                              ↓
                    Build LLM prompt:
                    - System prompt
                    - Retrieved context
                    - API tools
                    - Conversation history
                    - User message
                              ↓
                    LLM call (GPT-4o-mini)
                              ↓
                    Tool calls needed?
                    ├── No → Return response
                    └── Yes → Execute API calls
                                   ↓
                              Feed results to LLM
                                   ↓
                              Return final response
```

## Security Architecture

- **Authentication**: Supabase magic links (passwordless)
- **Authorization**: Row Level Security (RLS) on all tables
- **Encryption**: AES-256-GCM for stored API credentials
- **API Security**: Rate limiting, CORS, input validation
- **Widget Security**: Shadow DOM isolation, XSS prevention

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        DEPLOYMENT                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌─────────────┐     ┌─────────────┐     ┌─────────────┐      │
│   │   Vercel    │     │  Railway/   │     │  Cloudflare │      │
│   │   (Web)     │     │  Fly.io     │     │    (CDN)    │      │
│   │             │     │   (API)     │     │             │      │
│   │ • Dashboard │     │ • REST API  │     │ • widget.js │      │
│   │ • SSR       │     │ • Chat      │     │ • Static    │      │
│   │ • Edge      │     │ • Jobs      │     │ • Cache     │      │
│   └──────┬──────┘     └──────┬──────┘     └─────────────┘      │
│          │                   │                                  │
│          └───────────────────┼──────────────────────────────    │
│                              │                                  │
│                       ┌──────┴──────┐                          │
│                       │  Supabase   │                          │
│                       │  (Hosted)   │                          │
│                       │             │                          │
│                       │ • Database  │                          │
│                       │ • Auth      │                          │
│                       │ • Storage   │                          │
│                       └─────────────┘                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Performance Targets

| Metric | Target |
|--------|--------|
| Widget load time | < 2s |
| Chat response time | < 5s (P95) |
| Vector search latency | < 100ms |
| Widget bundle size | < 30KB gzipped |
| Dashboard Lighthouse | > 90 |

---

## Architecture Principles

### Application Responsibilities

This section defines the **strict boundaries** between applications in the monorepo. All contributors must follow these guidelines.

#### `apps/web` (Next.js Dashboard)
**Role**: Frontend-only application

**Responsibilities**:
- Render dashboard UI (React components, pages)
- Handle client-side state and interactions
- Consume APIs from `apps/api` via HTTP requests
- Manage Supabase Auth session (cookies, redirects)

**What belongs here**:
- React components and pages
- Client-side hooks and utilities
- Supabase client for auth and realtime subscriptions
- API client utilities to call `apps/api`

**What does NOT belong here**:
- Business logic API routes
- Database mutations (except through API calls)
- Background processing jobs
- File processing (PDF parsing, chunking, embeddings)

**Exceptions**:
- `/auth/callback` route - Required by Supabase Auth flow to exchange codes for sessions

#### `apps/api` (Express Backend)
**Role**: Centralized backend API server

**Responsibilities**:
- ALL REST API endpoints (CRUD operations)
- Authentication/authorization middleware
- Business logic and data processing
- Background jobs (embeddings, chunking, etc.)
- File uploads and processing
- Integration with external services (OpenAI, customer APIs)

**What belongs here**:
- Express routes and middleware
- Business logic services
- Database operations (via Supabase admin client)
- File processing (PDF extraction, chunking)
- Embedding generation

**API Authentication**:
- All routes require `Authorization: Bearer {supabase_access_token}`
- Middleware validates token with Supabase and extracts user/project info

#### `apps/widget` (Embeddable Chat)
**Role**: Lightweight chat widget for customer websites

**Responsibilities**:
- Render chat UI in shadow DOM
- Communicate with `apps/api` for chat functionality
- Minimal bundle size, framework-agnostic

#### `apps/mcp-server` (MCP Integration)
**Role**: Model Context Protocol server for AI platforms

**Responsibilities**:
- Expose chatbot as MCP tools
- Communicate with `apps/api` for underlying functionality

### Data Flow Pattern

```
┌─────────────────┐     HTTP + Bearer Token     ┌─────────────────┐
│   apps/web      │ ─────────────────────────▶  │   apps/api      │
│   (Frontend)    │                             │   (Backend)     │
│                 │  ◀─────────────────────────  │                 │
│  • React UI     │         JSON Response       │  • REST APIs    │
│  • Auth State   │                             │  • Business     │
│  • API Client   │                             │    Logic        │
└─────────────────┘                             │  • Processing   │
                                                └────────┬────────┘
                                                         │
                    ┌────────────────────────────────────┼────────────────────────────────────┐
                    │                                    │                                    │
                    ▼                                    ▼                                    ▼
           ┌─────────────────┐                 ┌─────────────────┐                 ┌─────────────────┐
           │    Supabase     │                 │     OpenAI      │                 │  Customer APIs  │
           │  • PostgreSQL   │                 │  • GPT-4o-mini  │                 │  • Order Status │
           │  • Storage      │                 │  • Embeddings   │                 │  • Inventory    │
           │  • Auth         │                 │                 │                 │                 │
           └─────────────────┘                 └─────────────────┘                 └─────────────────┘
```

### Frontend-Backend Communication

**From Dashboard (apps/web)**:
```typescript
// apps/web/lib/api-client.ts
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session?.access_token}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'API request failed');
  }

  return response.json();
}
```

**Usage in components**:
```typescript
// Fetch data
const sources = await apiClient<{ sources: KnowledgeSource[] }>('/api/knowledge');

// Create resource
const newSource = await apiClient('/api/knowledge', {
  method: 'POST',
  body: JSON.stringify({ name, content }),
});

// Delete resource
await apiClient(`/api/knowledge/${id}`, { method: 'DELETE' });
```

### Environment Configuration

**apps/web (.env.local)**:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
NEXT_PUBLIC_API_URL=http://localhost:3001  # Backend API URL
```

**apps/api (.env)**:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_KEY=xxx
OPENAI_API_KEY=xxx
CORS_ORIGIN=http://localhost:3000  # Frontend URL for CORS
```

### Why This Architecture?

1. **Deployment Flexibility**: Frontend can be deployed as static/SSG on any platform (Vercel, Netlify, Cloudflare Pages)

2. **Clear Separation**: "Backend code goes in apps/api, frontend code goes in apps/web" - no ambiguity

3. **Single Source of Truth**: One place for all API logic - easier to maintain, test, and debug

4. **Independent Scaling**: Backend can scale separately from frontend based on load

5. **Security**: Sensitive operations (API keys, processing) stay on the backend; frontend only holds user session

6. **Reusability**: Widget and MCP server consume the same APIs as the dashboard
