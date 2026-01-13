# Chatbot Platform: Project Vision & Overview

## The Big Idea

**An AI-native chatbot platform built for vibe coders.**

While other chatbot platforms require you to leave your coding environment, navigate dashboards, fill forms, and copy-paste embed codes - this platform lets you do everything from within your AI coding tool.

**"You're vibe coding your app. You need a chatbot. Just ask your AI assistant to add one."**

---

## Target Audience

### Primary: Vibe Coders
- Developers using **Cursor**, **Claude Code**, or similar AI-assisted development tools
- People who build apps conversationally with AI
- Both technical and non-technical users who prefer natural language over complex UIs

### Secondary: Traditional Developers
- Engineers who want a simple, fast chatbot solution
- Teams needing customer support automation
- Businesses wanting to add AI chat to their websites

---

## Core Value Proposition

| Traditional Chatbot Setup | This Platform |
|---------------------------|---------------|
| Leave editor → Sign up → Dashboard → Configure → Copy code → Return to editor | Stay in editor → Ask AI → Done |
| Multiple tabs, forms, clicks | One conversation |
| Technical complexity | Natural language |
| Context switching | Seamless flow |

### The Promise
- **Install in one line** - Single script tag deployment
- **Work in 15 minutes** - From zero to live chatbot
- **No friction** - MCP-first, dashboard-second approach

---

## How It Works: The MCP-First Workflow

The entire chatbot setup happens **inside your AI editor**:

```
You (in Cursor/Claude): "Add a chatbot to my app that knows about my product documentation"

Claude/Cursor:
  → Creates project via MCP
  → Uploads your docs to knowledge base
  → Configures any API endpoints needed
  → Gets embed code
  → Pastes it into your code

Done. Chatbot is live.
```

### MCP Tools Available

From within any MCP-compatible editor, users can:

| Tool | Purpose |
|------|---------|
| `create_project` | Spin up a new chatbot project |
| `upload_knowledge` | Add documents, FAQs, product info |
| `add_api_endpoint` | Connect external APIs for real-time data |
| `get_embed_code` | Get the script tag for deployment |
| `ask_question` | Test the chatbot's responses |
| `list_projects` | View all chatbot projects |
| `list_knowledge` | See uploaded knowledge sources |
| `update_project_settings` | Configure chatbot behavior |

---

## Architecture Overview

### Monorepo Structure (Turborepo + pnpm)

```
cover/
├── apps/
│   ├── web/          # Next.js 14 Dashboard (port 3000)
│   ├── api/          # Express.js API Server (port 3001)
│   └── widget/       # Embeddable Chat Widget (vanilla JS)
│
├── packages/
│   ├── db/           # Supabase client & types
│   ├── ui/           # shadcn/ui components
│   ├── shared/       # Utilities & constants
│   ├── eslint-config/
│   └── typescript-config/
│
├── supabase/         # Database migrations
└── docs/             # Documentation
```

### Tech Stack

#### Frontend (Dashboard)
- **Next.js 14** with App Router
- **React 18** with TypeScript
- **shadcn/ui** (Radix UI components)
- **Tailwind CSS** for styling
- **Recharts** for analytics visualization

#### Backend (API Server)
- **Express.js** with TypeScript
- **OpenAI API** (GPT-4o-mini for chat, text-embedding-3-small for embeddings)
- **Firecrawl** for web scraping/crawling
- **Resend** for email notifications
- **MCP SDK** for AI platform integration

#### Database
- **Supabase PostgreSQL** with pgvector extension
- **Supabase Auth** (magic links)
- **Supabase Storage** for file uploads

#### Widget
- **Vanilla TypeScript/JavaScript** (no framework dependencies)
- **Shadow DOM** for complete style isolation
- **esbuild** for fast bundling
- Single `<script>` tag deployment

---

## Key Features

### 1. Multi-Project Support
- Users can create and manage multiple chatbot projects
- Each project has isolated knowledge, settings, and analytics
- Easy switching between projects in dashboard or via MCP

### 2. Knowledge Base Management
Upload and manage knowledge sources that train your chatbot:
- **PDF files** - Product manuals, documentation
- **Text files** - FAQs, policies, guides
- **URLs** - Crawl websites for content (via Firecrawl)
- **Markdown** - Structured documentation

### 3. RAG (Retrieval Augmented Generation) System
Advanced document processing pipeline:
- **Semantic Chunking** - Intelligent text splitting based on content structure
- **Contextual Embeddings** - Adds surrounding context to chunks
- **Hybrid Search** - Combines vector similarity + full-text search
- **OpenAI Embeddings** - Uses text-embedding-3-small model

### 4. API Tool Calling
Extend chatbot capabilities with external APIs:
- Configure GET/POST endpoints
- Support for API Key and Bearer token auth
- Dynamic parameter extraction from URL patterns
- LLM decides when to call which API

### 5. Lead Capture
Automatic email collection when the bot can't answer:
- Detects conversation dead-ends
- Politely asks for visitor email
- Stores leads linked to projects
- Email notifications via Resend

### 6. Analytics Dashboard
Conversation insights and metrics:
- Message counts with trend analysis
- Top questions clustering
- Timeline visualization
- Period comparisons (24h, 7d, 30d)

### 7. Embeddable Widget
Lightweight, isolated chat interface:
```html
<script
  src="https://your-cdn.com/widget.js"
  data-project-id="your-project-id"
  data-position="bottom-right"
  data-primary-color="#2563eb"
></script>
```
- Shadow DOM prevents CSS conflicts
- Customizable colors, position, greeting
- Mobile responsive
- Minimal footprint

### 8. MCP Server Integration
First-class support for AI coding tools:
- Account-level API key authentication
- Full project management capabilities
- Knowledge base operations
- Seamless vibe coding workflow

---

## Data Model

### Core Tables

```
projects
├── id (uuid)
├── user_id (uuid)
├── name (text)
├── settings (jsonb)
├── system_prompt (text)
├── welcome_message (text)
└── created_at, updated_at

knowledge_sources
├── id (uuid)
├── project_id (uuid)
├── name (text)
├── type (pdf|txt|url|markdown)
├── status (pending|processing|completed|failed)
└── created_at

knowledge_chunks
├── id (uuid)
├── source_id (uuid)
├── content (text)
├── embedding (vector[1536])
└── metadata (jsonb)

chat_sessions
├── id (uuid)
├── project_id (uuid)
├── visitor_id (text)
├── messages (jsonb)
├── message_count (int)
└── created_at

api_endpoints
├── id (uuid)
├── project_id (uuid)
├── name (text)
├── url (text)
├── method (GET|POST)
├── auth_type (none|api_key|bearer)
├── auth_config (encrypted)
└── description (text)

api_keys
├── id (uuid)
├── user_id (uuid)
├── key_hash (text)
├── key_prefix (text)
└── created_at
```

---

## Data Flow

### Knowledge Upload Flow
```
User uploads document (PDF/TXT/URL)
    ↓
Store in Supabase Storage
    ↓
Create knowledge_source record (status: pending)
    ↓
Process with RAG pipeline:
    ├── Extract text content
    ├── Chunk semantically (~1000 tokens)
    ├── Add contextual information
    ├── Generate embeddings (batch via OpenAI)
    └── Store chunks in knowledge_chunks
    ↓
Mark source as "completed"
```

### Chat Message Flow
```
Visitor sends message
    ↓
Validate input (length, content)
    ↓
Retrieve/create session
    ↓
RAG retrieval:
    ├── Generate query embedding
    ├── Vector similarity search
    ├── Full-text search
    └── Combine & rank results
    ↓
Build prompt with context
    ↓
Call OpenAI (GPT-4o-mini)
    ↓
Check for tool calls → Execute if needed
    ↓
Check lead capture conditions
    ↓
Store session & analytics
    ↓
Return response + sources
```

### MCP Integration Flow
```
AI Editor (Cursor/Claude Code)
    ↓
Configure MCP with API key
    ↓
User asks to add chatbot
    ↓
MCP tool calls:
    ├── create_project
    ├── upload_knowledge
    ├── get_embed_code
    └── (paste into code)
    ↓
Chatbot live!
```

---

## API Endpoints

### Dashboard Routes (Auth Required)
```
POST   /api/auth/login          # Magic link login
GET    /api/projects            # List projects
POST   /api/projects            # Create project
GET    /api/knowledge           # List knowledge sources
POST   /api/knowledge           # Upload knowledge
GET    /api/endpoints           # List API endpoints
POST   /api/endpoints           # Add API endpoint
GET    /api/analytics/summary   # Get metrics
POST   /api/account/api-keys    # Generate API key
GET    /api/embed               # Get embed code
```

### Public Routes (Rate Limited)
```
POST   /api/chat/message        # Main chat endpoint
```

### MCP Routes (API Key Auth)
```
POST   /mcp                     # MCP server endpoint
```

---

## Security & Performance

### Security Measures
- **JWT Authentication** - Token-based dashboard access
- **API Key Hashing** - Bcrypt-style verification for MCP
- **Encryption** - AES-256 for stored auth configs
- **Rate Limiting** - Per-IP chat request limits
- **Project Isolation** - Users only access own data
- **CORS Configuration** - Separated by endpoint type
- **Helmet.js** - Secure HTTP headers

### Performance Optimizations
- **Batch Embeddings** - Process chunks in batches
- **Hybrid Search** - Fast vector + text retrieval
- **Session Caching** - Conversation context reuse
- **Shadow DOM** - Widget style isolation
- **CDN Distribution** - Widget served from edge

---

## Development

### Prerequisites
- Node.js 18+
- pnpm 8.15.0+
- Supabase account
- OpenAI API key

### Quick Start
```bash
# Install dependencies
pnpm install

# Set up environment
cp .env.example .env
# Edit .env with your credentials

# Run all apps
pnpm dev

# Or run individually
pnpm --filter @chatbot/web dev    # Dashboard at :3000
pnpm --filter @chatbot/api dev    # API at :3001
```

### Build
```bash
pnpm build                        # All apps
pnpm --filter @chatbot/widget build  # Widget only
```

---

## What Makes This Different

### 1. MCP-First Design
Other platforms bolt on API access as an afterthought. This platform was designed from the ground up with MCP as the primary interface. The dashboard exists for those who want it, but the real magic happens in your AI editor.

### 2. Zero Context Switching
Vibe coders stay in flow. No tab switching, no form filling, no copy-pasting between windows. Ask your AI to add a chatbot, and it happens.

### 3. Instant Value
15 minutes from nothing to a working chatbot. Upload a PDF, get an embed code, paste it in your app. Done.

### 4. Smart Defaults
The platform makes intelligent choices so users don't have to:
- Semantic chunking (not arbitrary splits)
- Hybrid search (vector + text)
- Contextual embeddings (better retrieval)
- Lead capture (automatic business value)

### 5. True Isolation
The widget uses Shadow DOM - it won't break your site's styles, and your site won't break the widget. Works everywhere.

---

## The Vision

**Democratize AI chatbots for the vibe coding era.**

As more people build software through conversation with AI, the tools they use should work the same way. This platform removes the last friction point - now adding an intelligent, knowledge-aware chatbot to your app is as simple as asking for it.

No dashboard required. No technical expertise needed. Just vibe.
