# Cover: AI SDR Agent Platform

## The Big Idea

**An AI-powered SDR (Sales Development Representative) agent that helps businesses capture more leads, answer product questions 24/7, and reduce the cost of human sales reps.**

Cover isn't a chatbot. It's a **sales team member that never sleeps**. It understands your product, answers prospect questions, captures qualified leads, and hands off hot opportunities to your human sales team.

While traditional chatbots wait for users to ask questions and then apologize when they can't answer, Cover **proactively qualifies visitors**, captures their contact information, and ensures every conversation generates business value.

**"Your AI SDR works 24/7, knows your product inside out, captures every lead, and costs a fraction of a human rep."**

---

## The Pivot: From Chatbot to SDR Agent

| Chatbot Mindset | SDR Agent Mindset |
|-----------------|-------------------|
| "Answer user questions" | "Qualify visitors and capture leads" |
| "Deflect support tickets" | "Convert conversations into pipeline" |
| "Reduce support costs" | "Generate revenue and reduce sales costs" |
| "Metric: tickets resolved" | "Metric: leads captured, pipeline generated" |
| "Dead-end: I don't know" | "Dead-end: Let me get our team to follow up (captures email)" |
| "Success: user satisfied" | "Success: lead captured + user satisfied" |

### Why This Matters

Every business that embeds Cover gets:
1. **24/7 lead capture** - 70% of enquiries come after hours
2. **Instant response** - 90% of prospects expect immediate answers
3. **Qualified leads** - Not just emails, but context on what they need
4. **Cost savings** - Replace repetitive SDR tasks with AI
5. **Never misses a lead** - Every conversation is an opportunity

---

## Target Audience

### Primary: Businesses That Need More Leads
- **SaaS companies** - qualify trial users, answer pricing questions, capture enterprise leads
- **Service businesses** - handle enquiries, book consultations, capture client details
- **E-commerce** - answer product questions, capture intent, reduce cart abandonment
- **Agencies** - qualify inbound leads, answer scope questions, route to right team

### Secondary: Vibe Coders (Distribution Channel)
- Developers using **Cursor**, **Claude Code**, or similar AI-assisted development tools
- People who build apps conversationally with AI
- MCP-first setup means Cover can be deployed in minutes from within the editor

### Tertiary: Traditional Developers
- Engineers who want a simple, fast AI agent solution
- Teams needing combined support + lead generation
- Businesses wanting to add AI chat to their websites

---

## Core Value Proposition

### For Business Owners (Buyers)

| Traditional SDR Team | Cover AI SDR |
|----------------------|--------------|
| $50-80K/year per SDR | Fraction of the cost |
| Works 9-5, needs breaks | Works 24/7/365 |
| Takes weeks to train on product | Learns your product in minutes |
| Handles ~50 conversations/day | Handles unlimited conversations |
| Misses after-hours leads | Captures every lead, any time |
| Inconsistent qualification | Consistent, always follows the process |

### For Developers (Implementers)

| Traditional Chatbot Setup | Cover AI SDR |
|---------------------------|--------------|
| Leave editor → Sign up → Dashboard → Configure → Copy code → Return to editor | Stay in editor → Ask AI → Done |
| Multiple tabs, forms, clicks | One conversation via MCP |
| Technical complexity | Natural language setup |
| Context switching | Seamless flow |

### The Promise
- **Install in one line** - Single script tag deployment
- **Live in 15 minutes** - From zero to capturing leads
- **AI SDR from day one** - Not just answering questions, capturing leads
- **MCP-first** - Deploy from your AI editor without leaving the flow

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

### 1. Lead Capture & Qualification (Core SDR Function)
The primary purpose of Cover - capture and qualify every visitor:
- **Smart lead capture form** - Asks for email and phone after first message
- **One-time capture** - New visitors only, returning visitors skip
- **Qualified vs unqualified** - Track which leads gave contact info
- **"We have your info" flow** - When AI can't answer, tells qualified leads their team will follow up
- **Fallback capture** - For unqualified users, asks for email when AI hits dead-ends
- **Leads dashboard** - Email, phone, conversations, qualification status for sales teams

### 2. Product Knowledge Engine
Train the SDR agent on your product so it sells like your best rep:
- **PDF files** - Product manuals, pricing docs, case studies
- **Text files** - FAQs, objection handling, competitive positioning
- **URLs** - Crawl your website, landing pages, docs (via Firecrawl)
- **Markdown** - Structured sales playbooks, feature guides

### 3. RAG (Retrieval Augmented Generation) System
Advanced intelligence that makes the AI SDR knowledgeable:
- **Semantic Chunking** - Intelligent text splitting based on content structure
- **Contextual Embeddings** - Adds surrounding context to chunks
- **Hybrid Search** - Combines vector similarity + full-text search
- **OpenAI Embeddings** - Uses text-embedding-3-small model

### 4. API Tool Calling
Extend the SDR's capabilities with real-time data:
- Configure GET/POST endpoints (pricing, availability, scheduling)
- Support for API Key and Bearer token auth
- Dynamic parameter extraction from URL patterns
- LLM decides when to call which API (e.g., check appointment slots)

### 5. Human Handoff (Escalation)
When the AI SDR needs human backup:
- **Keyword detection** - "talk to human", "speak to agent"
- **Intelligent routing** - Route to available agents
- **Business hours aware** - Appropriate response based on availability
- **Context preservation** - Full conversation history passed to human

### 6. Analytics & Lead Dashboard
Business impact metrics, not just conversation counts:
- **Leads captured** - Total, by day, by source
- **Qualification rate** - % of conversations that captured contact info
- **Top questions** - What prospects are asking about
- **Conversation analytics** - Volume trends, engagement metrics
- **Lead export** - CSV export for CRM import

### 7. Embeddable Widget
Lightweight SDR agent interface for any website:
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

### 8. Multi-Project Support
Manage SDR agents for multiple products or clients:
- Each project has isolated knowledge, settings, and leads
- Easy switching between projects in dashboard or via MCP
- Separate lead pipelines per project

### 9. MCP Server Integration
Deploy and manage from your AI editor:
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

### SDR Conversation Flow
```
Visitor sends first message
    ↓
Is this a new visitor or returning?
    ↓
NEW VISITOR:
    ├── AI acknowledges question: "Great question! Before I answer..."
    ├── Show lead capture form (email required, phone optional, skip button)
    ├── Store contact info → mark as "qualified"
    └── Continue to answer their question
    ↓
RETURNING VISITOR:
    ├── Pull contact info from backend
    ├── Skip lead capture (already qualified)
    └── Answer their question directly
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
Can AI answer confidently?
    ├── YES → Return response + sources
    └── NO → Is visitor qualified?
        ├── YES → "We have your email on file, our team will follow up"
        └── NO  → "What's the best email for our team to reach you?"
    ↓
Store session & analytics
    ↓
Return response
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

### 1. SDR-First, Not Support-First
Other chatbot platforms are built for ticket deflection. Cover is built for **lead generation**. Every conversation is an opportunity to capture a lead, not just resolve a question.

### 2. Leads Are the Primary Output
The dashboard doesn't just show conversations - it shows **leads**. Email, phone, what they asked about, qualification status. Your sales team opens Cover and sees a list of warm leads ready for follow-up.

### 3. Zero Friction Lead Capture
No pre-chat forms that scare visitors away. Lead capture happens **after** the first message when the visitor is already engaged. Email + optional phone, with a skip button to prevent abandonment.

### 4. Smart Dead-End Handling
When the AI can't answer, it's not a failure - it's a **sales opportunity**:
- Qualified visitor: "We have your email on file, our team will follow up"
- Unqualified visitor: "What's the best email for our team to reach you?"
- Never: "I don't know" and leaves the visitor hanging

### 5. MCP-First Deployment
Deploy your AI SDR from your code editor in minutes. No dashboard required for setup. MCP-native means vibe coders can add lead generation to their app in one conversation.

### 6. Product Knowledge That Sells
RAG system trained on your product docs, pricing, FAQs, and objection handling. The AI SDR answers like your best sales rep - knowledgeable, helpful, and always capturing the lead.

### 7. True Isolation
The widget uses Shadow DOM - works on any website without CSS conflicts. Drop a script tag, start capturing leads.

---

## The Vision

**Replace the first human SDR with AI.**

Most businesses can't afford a 24/7 sales team. Prospects visit their website at 11pm, ask a question, get no answer, and leave forever. Cover changes that. Your AI SDR is always online, always knowledgeable, and always capturing the lead.

The goal isn't to replace your entire sales team - it's to handle the **repetitive, redundant work**: answering the same product questions, capturing contact info, qualifying interest. Your human reps focus on closing deals, not answering "what's your pricing?" for the 100th time.

**Cover: Your AI SDR that works 24/7, knows your product, and captures every lead.**
