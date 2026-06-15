# Product Specification Document
## AI Chatbot for Small Business & Vibe Coders

**Version:** 1.1
**Date:** December 2024
**Status:** V1 Complete, Immediate Priority In Progress

---

# Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Product Vision & Strategy](#2-product-vision--strategy)
3. [Market Analysis](#3-market-analysis)
4. [Target Users & Personas](#4-target-users--personas)
5. [Product Overview](#5-product-overview)
6. [V1 Feature Specifications](#6-v1-feature-specifications)
7. [Technical Architecture](#7-technical-architecture)
8. [Database Schema](#8-database-schema)
9. [API Specifications](#9-api-specifications)
10. [MCP Server Specifications](#10-mcp-server-specifications)
11. [Widget Specifications](#11-widget-specifications)
12. [User Flows](#12-user-flows)
13. [UI/UX Guidelines](#13-uiux-guidelines)
14. [Security Considerations](#14-security-considerations)
15. [Product Roadmap](#15-product-roadmap)
16. [Success Metrics](#16-success-metrics)
17. [Open Questions](#17-open-questions)

---

# 1. Executive Summary

## 1.1 What We're Building

A simple, easy-to-integrate AI chatbot platform for small businesses that offers:

1. **Dashboard-based setup** - Business owners upload knowledge (text, files, PDFs) and configure API endpoints through a clean, modern dashboard
2. **MCP Integration** - AI development platforms (Lovable, Bolt.new, Cursor, Claude Code) can programmatically set up chatbots via Model Context Protocol
3. **One-line embed** - Single script tag to add chatbot to any website

## 1.2 Core Value Proposition

**For Small Businesses:** Get a working AI chatbot on your website in under 20 minutes. Upload your FAQs, connect your APIs, copy one script tag. Done.

**For Vibe Coders:** Add "a customer support chatbot" to your AI-generated website with a single prompt. The MCP handles everything.

## 1.3 Key Differentiators

| Differentiator | Why It Matters |
|----------------|----------------|
| **MCP-first architecture** | First chatbot built for AI development tools |
| **API tool calling** | Real-time data (order status, inventory) not just static FAQs |
| **True simplicity** | Competitors claim "simple" but still confuse users |
| **Script-tag embed** | Works anywhere, like Google Analytics |

---

# 2. Product Vision & Strategy

## 2.1 Vision Statement

Become the default chatbot for AI-generated websites while serving as the simplest chatbot solution for non-technical small business owners.

## 2.2 Strategic Positioning

```
┌─────────────────────────────────────────────────────────────────┐
│                    MARKET POSITIONING                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   Complex/Powerful                                              │
│        ▲                                                        │
│        │    Intercom ●                                          │
│        │                    Drift ●                             │
│        │                                                        │
│        │         ┌─────────────────┐                            │
│        │         │   OUR PRODUCT   │ ← Sweet spot:              │
│        │         │   ●             │   Powerful enough          │
│        │         └─────────────────┘   (API calling)            │
│        │                               Simple enough            │
│        │    Crisp ●      Tidio ●       (15 min setup)           │
│        │                               MCP-ready                │
│   Simple/Basic                                                  │
│        └──────────────────────────────────────────────────▶     │
│              Expensive                          Affordable      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 2.3 Go-to-Market Strategy

### Phase 1: Vibe Coder Distribution (Primary)
- Build MCP server for Lovable, Cursor, Claude Code
- Get listed in MCP directories and ecosystems
- Create tutorials: "Add a chatbot to your Lovable app"
- Leverage AI tool communities for organic growth

### Phase 2: Direct SMB Acquisition (Secondary)
- SEO for "simple chatbot for small business"
- Product Hunt launch
- Integration partnerships (Shopify, WordPress)

## 2.4 Why Now?

1. **MCP adoption is accelerating** - Nearly 5,000 MCP servers as of early 2025
2. **Vibe coding is mainstream** - Lovable, Bolt.new, Replit seeing massive growth
3. **SMB chatbot demand is highest-growth segment** - 25.1% CAGR through 2030
4. **Existing solutions are failing SMBs** - Too complex, too expensive, or underpowered

---

# 3. Market Analysis

## 3.1 Market Size

| Metric | Value | Source |
|--------|-------|--------|
| Global chatbot market (2024) | $7.76 billion | Grand View Research |
| Projected market (2030) | $27.29 billion | Grand View Research |
| CAGR (2025-2030) | 23.3% | Grand View Research |
| SMB segment CAGR | 25.1% (highest) | Grand View Research |
| Cloud deployment share | 78.4% | Grand View Research |
| Customer support use case | 42.4% | Grand View Research |

## 3.2 Key Market Insights

- **75% of SMBs are experimenting with chatbots** vs 42% enterprise deployment
- **Barrier for SMBs:** "High costs associated with maintenance and need for skilled resources"
- **Cost savings:** Customer support automation delivers up to 92% cost reduction
- **Retail & E-commerce:** Dominates with 30% market share in 2024

## 3.3 Competitive Landscape

### Enterprise Players (Not Direct Competitors)

| Product | Pricing | Strengths | Weaknesses |
|---------|---------|-----------|------------|
| **Intercom** | $74+/mo, per seat | Full suite, powerful automation | Expensive, charges per contact, complex |
| **Drift** | $2,500+/mo | Sales-focused, strong lead capture | Very expensive, no knowledge base |

### SMB Players (Direct Competitors)

| Product | Pricing | Strengths | Weaknesses |
|---------|---------|-----------|------------|
| **Tidio** | Free-$29/mo | Easy setup, good chatbot | Setup still confusing, pricing scales |
| **Crisp** | Free-$95/mo | Affordable, unified inbox | Underpowered chatbot |
| **Chatbase** | $19+/mo | Train on docs, simple | No API calling, limited customization |
| **CustomGPT** | $49+/mo | Good RAG, API access | Developer-focused, not simple |

### Competitive Gap

**No competitor offers:**
- MCP integration for AI development platforms
- Simple API tool calling (order status, inventory checks)
- True "15-minute setup" experience

## 3.4 Reddit User Sentiment

Real quotes from Reddit research:

> "Went looking for a simple website chatbot… ended up drowning in options"
> — r/SaaS user

> "Every tool swears it's 'the easiest to set up' and 'the most powerful,' but then you realize..."
> — r/SaaS user

> "I just wanted to try some starfruit delivery" [frustrated with popups/complexity]
> — r/smallbusiness user

**Key pain points identified:**
- Analysis paralysis from too many options
- "Simple" tools still require technical knowledge
- Pricing confusion and hidden costs
- Lack of real-time data capabilities

---

# 4. Target Users & Personas

## 4.1 Primary Persona: Small Business Sam

### Demographics
- **Role:** Small business owner, solo entrepreneur, or small team lead
- **Business type:** E-commerce store, local service business, small SaaS, agency
- **Technical skill:** Low to moderate - can copy/paste code but not build it
- **Team size:** 1-10 employees

### Psychographics
- Values time over money (within reason)
- Frustrated by complex software
- Wants things to "just work"
- Skeptical of overpromised solutions

### Current State
- Has a website (Shopify, WordPress, Squarespace, or custom)
- Receives repetitive customer questions (hours, shipping, returns)
- May have tried chatbots before and given up
- Currently relies on email or manual responses

### Jobs to Be Done
1. **When** I get the same customer question for the 10th time today, **I want** an automated way to answer it **so I can** focus on running my business
2. **When** customers ask about their order status, **I want** them to get real-time info **so they** don't email me and **I** don't have to look it up manually
3. **When** I'm sleeping or busy, **I want** my website to still help customers **so I** don't lose sales

### Success Criteria
- Setup takes less than 20 minutes
- Chatbot answers 80%+ of common questions correctly
- Customers can check order status without contacting support
- Can see it working on their site immediately

### Frustrations with Existing Solutions
- "Too many features I don't need"
- "Pricing is confusing"
- "Setup wizard still required technical knowledge"
- "Had to hire someone to integrate it"

---

## 4.2 Secondary Persona: Vibe Coder Vic

### Demographics
- **Role:** Indie hacker, startup founder, freelance developer, agency developer
- **Tools:** Lovable, Bolt.new, Replit, Cursor, Claude Code
- **Technical skill:** Moderate - comfortable with prompts, basic code, APIs
- **Project type:** MVPs, client projects, side projects

### Psychographics
- Moves fast, ships fast
- Embraces AI-assisted development
- Values tools that integrate seamlessly
- Willing to pay for time savings

### Current State
- Building websites/apps with AI tools
- Clients ask for chatbot functionality
- Currently cobbling together solutions or skipping chatbots
- Wants to focus on core product, not chatbot infrastructure

### Jobs to Be Done
1. **When** I'm building a website with Lovable, **I want** to add a chatbot with one prompt **so I can** deliver a complete solution to my client
2. **When** a client asks for "customer support chat", **I want** a drop-in solution **so I** don't have to build chatbot infrastructure
3. **When** the AI generates my website, **I want** the chatbot to be configured automatically **so I** can move on to the next feature

### Success Criteria
- Single prompt adds working chatbot
- MCP handles all configuration
- Client can update knowledge base themselves
- No manual integration required

### Frustrations with Existing Solutions
- "I have to leave my AI tool to set up the chatbot manually"
- "Integration requires custom code"
- "Client can't manage it themselves"
- "Breaks the vibe coding flow"

---

## 4.3 End User: Website Visitor

### Demographics
- Customer of the small business
- Visiting website for information, purchase, or support
- May be on mobile or desktop
- Expects instant answers

### Jobs to Be Done
1. **When** I have a question about a product, **I want** an immediate answer **so I can** make a purchase decision
2. **When** I want to check my order status, **I want** to get tracking info instantly **so I** don't have to wait for email support
3. **When** the business is closed, **I want** to still get help **so I'm** not blocked until morning

### Success Criteria
- Gets accurate answers quickly
- Can check order/account status
- Clear when chatbot can't help (graceful handoff)
- Doesn't feel like talking to a dumb bot

---

# 5. Product Overview

## 5.1 Product Name

**[TBD]** - Candidates:
- ChatDrop
- DropChat
- QuickBot
- VibeChat
- EmbedAI

## 5.2 One-Liner

> The AI chatbot that installs in one line and works in 15 minutes.

## 5.3 Core Capabilities

### Capability 1: Knowledge Base Q&A
Upload documents, paste text, or add PDFs. The chatbot uses RAG (Retrieval Augmented Generation) to answer questions from this knowledge base accurately.

### Capability 2: API Tool Calling
Configure API endpoints (order status, inventory, account info). The chatbot intelligently decides when to call these APIs and uses the response to answer user questions.

### Capability 3: One-Line Embed
Single `<script>` tag adds the chatbot to any website. No build process, no npm install, no framework dependencies.

### Capability 4: MCP Integration
AI development platforms can configure chatbots programmatically via Model Context Protocol. Enables "add a chatbot" prompts in Lovable, Cursor, etc.

## 5.4 Product Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        YOUR PRODUCT                             │
│                                                                 │
│   ┌─────────────────┐         ┌─────────────────┐              │
│   │    Dashboard    │         │   MCP Server    │              │
│   │  (Next.js App)  │         │  (Node.js)      │              │
│   │                 │         │                 │              │
│   │  • Auth         │         │  • create_project│             │
│   │  • Knowledge    │         │  • upload_knowledge            │
│   │  • API Config   │         │  • add_api_endpoint            │
│   │  • Embed Code   │         │  • get_embed_code│             │
│   └────────┬────────┘         └────────┬────────┘              │
│            │                           │                        │
│            └─────────────┬─────────────┘                        │
│                          ▼                                      │
│            ┌─────────────────────────┐                          │
│            │       Core API          │                          │
│            │      (Node.js)          │                          │
│            │                         │                          │
│            │  • Knowledge processing │                          │
│            │  • Chat engine          │                          │
│            │  • Tool execution       │                          │
│            └────────────┬────────────┘                          │
│                         │                                       │
│            ┌────────────┴────────────┐                          │
│            ▼                         ▼                          │
│   ┌─────────────────┐      ┌─────────────────┐                 │
│   │    Supabase     │      │     OpenAI      │                 │
│   │                 │      │                 │                 │
│   │  • Auth         │      │  • Embeddings   │                 │
│   │  • PostgreSQL   │      │  • GPT-4o-mini  │                 │
│   │  • pgvector     │      │  • Function call│                 │
│   │  • Storage      │      │                 │                 │
│   └─────────────────┘      └─────────────────┘                 │
│                                                                 │
│            ┌─────────────────────────┐                          │
│            │   Embeddable Widget     │                          │
│            │   (Preact/Vanilla JS)   │                          │
│            │                         │                          │
│            │   <script src="...">    │                          │
│            └─────────────────────────┘                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

# 6. V1 Feature Specifications

## 6.1 Feature: Authentication

### Overview
Passwordless authentication using Supabase magic links. User enters email, receives link, clicks to login. Project auto-created on first login.

### User Story
> As a business owner, I want to sign up without creating a password so that I can get started in seconds.

### Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| AUTH-1 | User can enter email address on signup/login page | Must Have |
| AUTH-2 | System sends magic link email via Supabase | Must Have |
| AUTH-3 | Clicking magic link authenticates user and redirects to dashboard | Must Have |
| AUTH-4 | First-time users get a project auto-created | Must Have |
| AUTH-5 | Returning users land on their existing project | Must Have |
| AUTH-6 | Session persists across browser sessions (refresh token) | Must Have |
| AUTH-7 | User can logout from dashboard | Must Have |
| AUTH-8 | Magic link expires after 1 hour | Must Have |
| AUTH-9 | Rate limit magic link requests (max 5 per email per hour) | Should Have |

### User Flow

```
1. User lands on /login or /signup
2. User enters email address
3. User clicks "Send magic link"
4. System displays "Check your email" message
5. User receives email with magic link
6. User clicks link
7. System validates token, creates session
8. IF new user:
   - Create user record
   - Create default project (name: "My Chatbot")
   - Redirect to /dashboard with onboarding state
9. IF existing user:
   - Redirect to /dashboard
```

### UI Components

**Login Page (`/login`)**
```
┌─────────────────────────────────────────────┐
│                                             │
│              [Logo]                         │
│                                             │
│         Welcome back                        │
│                                             │
│    ┌─────────────────────────────────┐      │
│    │ Enter your email                │      │
│    └─────────────────────────────────┘      │
│                                             │
│    ┌─────────────────────────────────┐      │
│    │     Send magic link             │      │
│    └─────────────────────────────────┘      │
│                                             │
│         Don't have an account? Sign up      │
│                                             │
└─────────────────────────────────────────────┘
```

**Email Sent Confirmation**
```
┌─────────────────────────────────────────────┐
│                                             │
│              [Logo]                         │
│                                             │
│         Check your email                    │
│                                             │
│    We sent a magic link to                  │
│    sam@mystore.com                          │
│                                             │
│    Click the link to sign in.               │
│                                             │
│         Didn't receive it? Resend           │
│                                             │
└─────────────────────────────────────────────┘
```

### Technical Implementation

```typescript
// Supabase magic link
const { error } = await supabase.auth.signInWithOtp({
  email: userEmail,
  options: {
    emailRedirectTo: `${origin}/auth/callback`,
  },
});

// Auth callback handler (/auth/callback)
const { data: { session } } = await supabase.auth.getSession();

if (session) {
  // Check if user has a project
  const { data: project } = await supabase
    .from('projects')
    .select('id')
    .eq('user_id', session.user.id)
    .single();

  if (!project) {
    // Create default project for new user
    await supabase.from('projects').insert({
      user_id: session.user.id,
      name: 'My Chatbot',
    });
  }

  redirect('/dashboard');
}
```

### Edge Cases

| Scenario | Handling |
|----------|----------|
| Invalid email format | Show inline validation error |
| Email not delivered | Show "Resend" option after 60 seconds |
| Expired magic link | Show "Link expired" with option to request new one |
| Already logged in user visits /login | Redirect to /dashboard |
| Rate limit exceeded | Show "Too many requests, try again later" |

### Acceptance Criteria

- [ ] User can enter valid email and receive magic link
- [ ] Magic link email arrives within 30 seconds
- [ ] Clicking valid link logs user in
- [ ] New users get project auto-created
- [ ] Returning users see their existing project
- [ ] Invalid/expired links show appropriate error
- [ ] Session persists after browser close/reopen
- [ ] Logout clears session completely

---

## 6.2 Feature: Knowledge Base Management

### Overview
Users upload content that becomes the chatbot's knowledge source. Supports raw text, text files, and PDFs. Content is chunked, embedded, and stored for RAG retrieval.

### User Story
> As a business owner, I want to upload my FAQs and product information so that the chatbot can answer customer questions accurately.

### Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| KB-1 | User can paste raw text as knowledge source | Must Have |
| KB-2 | User can upload .txt files | Must Have |
| KB-3 | User can upload .pdf files | Must Have |
| KB-4 | System chunks content into ~500 token segments | Must Have |
| KB-5 | System generates embeddings for each chunk | Must Have |
| KB-6 | User can see list of all knowledge sources | Must Have |
| KB-7 | User can delete a knowledge source | Must Have |
| KB-8 | Deleting source removes all associated chunks | Must Have |
| KB-9 | User can see processing status (processing/ready/failed) | Must Have |
| KB-10 | System shows chunk count per source | Should Have |
| KB-11 | User can upload .doc/.docx files | Could Have |
| KB-12 | User can provide URL to scrape | Could Have |

### Content Processing Pipeline

```
┌─────────────────────────────────────────────────────────────────┐
│                    KNOWLEDGE PROCESSING PIPELINE                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   INPUT                                                         │
│     │                                                           │
│     ▼                                                           │
│   ┌─────────────────┐                                          │
│   │ Content Ingestion│                                          │
│   │                 │                                          │
│   │ • Raw text      │                                          │
│   │ • .txt file     │                                          │
│   │ • .pdf file     │                                          │
│   └────────┬────────┘                                          │
│            │                                                    │
│            ▼                                                    │
│   ┌─────────────────┐                                          │
│   │ Text Extraction │                                          │
│   │                 │                                          │
│   │ • PDF: pdf-parse│                                          │
│   │ • TXT: direct   │                                          │
│   │ • Clean & normalize                                        │
│   └────────┬────────┘                                          │
│            │                                                    │
│            ▼                                                    │
│   ┌─────────────────┐                                          │
│   │    Chunking     │                                          │
│   │                 │                                          │
│   │ • ~500 tokens/chunk                                        │
│   │ • 50 token overlap                                         │
│   │ • Preserve paragraphs                                      │
│   └────────┬────────┘                                          │
│            │                                                    │
│            ▼                                                    │
│   ┌─────────────────┐                                          │
│   │   Embedding     │                                          │
│   │                 │                                          │
│   │ • OpenAI text-embedding-3-small                            │
│   │ • 1536 dimensions                                          │
│   │ • Batch processing                                         │
│   └────────┬────────┘                                          │
│            │                                                    │
│            ▼                                                    │
│   ┌─────────────────┐                                          │
│   │    Storage      │                                          │
│   │                 │                                          │
│   │ • Chunks → knowledge_chunks table                          │
│   │ • Vectors → pgvector column                                │
│   │ • Files → Supabase Storage                                 │
│   └─────────────────┘                                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Chunking Strategy

```typescript
interface ChunkingConfig {
  maxTokens: 500;           // Maximum tokens per chunk
  overlapTokens: 50;        // Overlap between chunks
  minChunkSize: 100;        // Minimum chunk size (avoid tiny chunks)
  preserveParagraphs: true; // Try to break at paragraph boundaries
  preserveSentences: true;  // Try to break at sentence boundaries
}
```

**Example:**
```
Original document: 2000 tokens
Chunk 1: tokens 0-500
Chunk 2: tokens 450-950 (50 token overlap)
Chunk 3: tokens 900-1400
Chunk 4: tokens 1350-1850
Chunk 5: tokens 1800-2000
```

### User Flow

```
1. User clicks "Add Knowledge" button
2. Modal opens with three tabs: "Paste Text" | "Upload File" | "Upload PDF"
3. User selects input method:

   [Paste Text]
   - User pastes content into textarea
   - User enters name for source
   - User clicks "Add Knowledge"

   [Upload File]
   - User clicks upload area or drags file
   - System validates file type (.txt)
   - User clicks "Add Knowledge"

   [Upload PDF]
   - User clicks upload area or drags file
   - System validates file type (.pdf)
   - User clicks "Add Knowledge"

4. Modal closes, source appears in list with "Processing..." status
5. Background job processes content
6. Status updates to "Ready" with chunk count
7. Knowledge is now available for chatbot queries
```

### UI Components

**Knowledge Base Page (`/dashboard/knowledge`)**
```
┌─────────────────────────────────────────────────────────────────┐
│  Knowledge Base                          [+ Add Knowledge]      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Your chatbot uses this content to answer questions.            │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 📄 FAQ Document                                          │   │
│  │ PDF • 24 chunks • Added Dec 15, 2024                     │   │
│  │ ✓ Ready                                       [Delete]   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 📝 Product Descriptions                                  │   │
│  │ Text • 12 chunks • Added Dec 14, 2024                    │   │
│  │ ✓ Ready                                       [Delete]   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 📄 Shipping Policy                                       │   │
│  │ Text file • Processing...                                │   │
│  │ ⏳ Processing                                             │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Add Knowledge Modal**
```
┌─────────────────────────────────────────────────────────────────┐
│  Add Knowledge                                           [X]    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┬──────────────┬──────────────┐                │
│  │  Paste Text  │  Upload File │  Upload PDF  │                │
│  └──────────────┴──────────────┴──────────────┘                │
│                                                                 │
│  [If Paste Text selected:]                                      │
│                                                                 │
│  Source Name                                                    │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ FAQ Content                                              │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Content                                                        │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Paste your text content here...                         │   │
│  │                                                          │   │
│  │                                                          │   │
│  │                                                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│                              [Cancel]  [Add Knowledge]          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Technical Implementation

```typescript
// API endpoint: POST /api/knowledge
async function createKnowledgeSource(req: Request) {
  const { projectId, type, name, content, file } = req.body;

  // 1. Create knowledge source record
  const { data: source } = await supabase
    .from('knowledge_sources')
    .insert({
      project_id: projectId,
      type,
      name,
      status: 'processing',
    })
    .select()
    .single();

  // 2. If file, upload to Supabase Storage
  if (file) {
    const { data: fileData } = await supabase.storage
      .from('knowledge-files')
      .upload(`${projectId}/${source.id}/${file.name}`, file);

    await supabase
      .from('knowledge_sources')
      .update({ file_path: fileData.path })
      .eq('id', source.id);
  }

  // 3. Queue background job for processing
  await queue.add('process-knowledge', {
    sourceId: source.id,
    content: content || null,
    filePath: file ? fileData.path : null,
  });

  return { source };
}

// Background job: process-knowledge
async function processKnowledge(job) {
  const { sourceId, content, filePath } = job.data;

  try {
    // 1. Extract text
    let text = content;
    if (filePath) {
      const file = await supabase.storage
        .from('knowledge-files')
        .download(filePath);

      if (filePath.endsWith('.pdf')) {
        text = await extractPdfText(file);
      } else {
        text = await file.text();
      }
    }

    // 2. Chunk text
    const chunks = chunkText(text, {
      maxTokens: 500,
      overlapTokens: 50,
    });

    // 3. Generate embeddings (batch)
    const embeddings = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: chunks.map(c => c.content),
    });

    // 4. Store chunks with embeddings
    const chunkRecords = chunks.map((chunk, i) => ({
      source_id: sourceId,
      content: chunk.content,
      embedding: embeddings.data[i].embedding,
      metadata: { position: i },
    }));

    await supabase.from('knowledge_chunks').insert(chunkRecords);

    // 5. Update source status
    await supabase
      .from('knowledge_sources')
      .update({
        status: 'ready',
        chunk_count: chunks.length,
      })
      .eq('id', sourceId);

  } catch (error) {
    await supabase
      .from('knowledge_sources')
      .update({ status: 'failed', error: error.message })
      .eq('id', sourceId);
  }
}
```

### File Constraints

| Constraint | Value |
|------------|-------|
| Max file size | 10 MB |
| Max text paste | 100,000 characters |
| Supported text files | .txt |
| Supported PDFs | .pdf (text-based, not scanned images) |
| Max sources per project (V1) | 20 |
| Max total chunks per project | 1,000 |

### Edge Cases

| Scenario | Handling |
|----------|----------|
| Empty file | Show error "File is empty" |
| Corrupted PDF | Show error "Could not parse file" |
| Scanned PDF (no text) | Show error "PDF contains no extractable text" |
| File too large | Show error "File exceeds 10MB limit" |
| Processing fails | Show "Failed" status with retry option |
| Duplicate file name | Allow (append timestamp internally) |

### Acceptance Criteria

- [ ] User can paste text and it becomes searchable knowledge
- [ ] User can upload .txt file and it becomes searchable knowledge
- [ ] User can upload .pdf file and it becomes searchable knowledge
- [ ] Processing happens asynchronously (UI doesn't block)
- [ ] User can see processing status in real-time
- [ ] User can delete knowledge source
- [ ] Deleting source removes all chunks and embeddings
- [ ] Chatbot can answer questions from uploaded knowledge

---

## 6.3 Feature: API Endpoint Configuration

### Overview
Users configure external APIs that the chatbot can call as "tools" to fetch real-time data. The LLM decides when to call these APIs based on user questions and endpoint descriptions.

### User Story
> As a business owner, I want to connect my order status API so customers can check their orders through the chatbot without contacting me.

### Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| API-1 | User can add new API endpoint | Must Have |
| API-2 | Endpoint config includes: name, description, URL, method | Must Have |
| API-3 | User can select auth type: None, API Key, Bearer Token | Must Have |
| API-4 | User can input auth credentials (stored encrypted) | Must Have |
| API-5 | User can test endpoint from dashboard | Must Have |
| API-6 | User can see list of all configured endpoints | Must Have |
| API-7 | User can edit existing endpoint | Must Have |
| API-8 | User can delete endpoint | Must Have |
| API-9 | LLM uses description to decide when to call endpoint | Must Have |
| API-10 | URL supports {placeholder} syntax for dynamic params | Must Have |
| API-11 | User can configure custom headers | Could Have |
| API-12 | User can configure request body template | Could Have |

### API Configuration Model

```typescript
interface ApiEndpoint {
  id: string;
  projectId: string;
  name: string;                    // "Order Status"
  description: string;             // "Get order status by order ID. Call when user asks about their order."
  url: string;                     // "https://api.store.com/orders/{order_id}"
  method: 'GET' | 'POST';
  authType: 'none' | 'api_key' | 'bearer' | 'custom_header';
  authConfig: {
    apiKey?: string;               // For api_key type
    apiKeyHeader?: string;         // Header name for API key (default: X-API-Key)
    bearerToken?: string;          // For bearer type
    customHeader?: {               // For custom_header type
      name: string;
      value: string;
    };
  };
  requestBody?: object;            // Template for POST requests
  createdAt: Date;
  updatedAt: Date;
}
```

### Description Best Practices (Shown to User)

```
Good descriptions help the AI know WHEN to use your API:

✓ "Get order status and tracking information. Use when customer asks
   about their order, shipping status, or tracking number. Requires order_id."

✓ "Check product inventory and availability. Use when customer asks
   if an item is in stock or available. Requires product_id or product_name."

✗ "Order API" (too vague)
✗ "GET /orders" (doesn't explain when to use)
```

### User Flow

```
1. User navigates to API Endpoints page
2. User clicks "Add Endpoint"
3. Form opens with fields:
   - Name (required)
   - Description (required) - with helper text
   - URL (required) - with placeholder syntax hint
   - Method (dropdown: GET/POST)
   - Auth Type (dropdown)
   - Auth credentials (conditional based on auth type)
4. User clicks "Test Endpoint"
   - System makes test call
   - Shows success (status code, response preview) or error
5. User clicks "Save"
6. Endpoint appears in list
7. Chatbot can now use this endpoint
```

### UI Components

**API Endpoints Page (`/dashboard/api-endpoints`)**
```
┌─────────────────────────────────────────────────────────────────┐
│  API Endpoints                              [+ Add Endpoint]    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Connect APIs so your chatbot can fetch real-time data.         │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 🔌 Order Status                                          │   │
│  │ GET https://api.mystore.com/orders/{order_id}            │   │
│  │ Auth: Bearer Token                                       │   │
│  │                                      [Test] [Edit] [Del] │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 🔌 Product Inventory                                     │   │
│  │ GET https://api.mystore.com/products/{sku}/stock         │   │
│  │ Auth: API Key                                            │   │
│  │                                      [Test] [Edit] [Del] │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐   │
│    No more endpoints. Add one to enable real-time data.    │   │
│  └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Add/Edit Endpoint Modal**
```
┌─────────────────────────────────────────────────────────────────┐
│  Add API Endpoint                                        [X]    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Name *                                                         │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Order Status                                             │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Description *                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Get order status and tracking info. Use when customer   │   │
│  │ asks about their order. Requires order_id.              │   │
│  └─────────────────────────────────────────────────────────┘   │
│  ℹ️ Help the AI understand when to use this endpoint            │
│                                                                 │
│  URL *                                                          │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ https://api.mystore.com/orders/{order_id}               │   │
│  └─────────────────────────────────────────────────────────┘   │
│  ℹ️ Use {param} for dynamic values the AI will fill in          │
│                                                                 │
│  Method                                                         │
│  ┌─────────────┐                                               │
│  │ GET      ▼  │                                               │
│  └─────────────┘                                               │
│                                                                 │
│  Authentication                                                 │
│  ┌─────────────────┐                                           │
│  │ Bearer Token ▼  │                                           │
│  └─────────────────┘                                           │
│                                                                 │
│  Bearer Token *                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ••••••••••••••••••••                                    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────┐                                           │
│  │  Test Endpoint  │  ✓ Connection successful (200 OK)         │
│  └─────────────────┘                                           │
│                                                                 │
│                              [Cancel]  [Save Endpoint]          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Technical Implementation

```typescript
// API endpoint: POST /api/endpoints
async function createEndpoint(req: Request) {
  const {
    projectId, name, description, url, method, authType, authConfig
  } = req.body;

  // Encrypt sensitive credentials
  const encryptedAuthConfig = await encrypt(authConfig);

  const { data: endpoint } = await supabase
    .from('api_endpoints')
    .insert({
      project_id: projectId,
      name,
      description,
      url,
      method,
      auth_type: authType,
      auth_config: encryptedAuthConfig,
    })
    .select()
    .single();

  return { endpoint };
}

// API endpoint: POST /api/endpoints/:id/test
async function testEndpoint(req: Request) {
  const { id } = req.params;

  const { data: endpoint } = await supabase
    .from('api_endpoints')
    .select('*')
    .eq('id', id)
    .single();

  const authConfig = await decrypt(endpoint.auth_config);

  // Build test URL (replace placeholders with test values)
  const testUrl = endpoint.url.replace(/\{(\w+)\}/g, 'test_value');

  try {
    const response = await fetch(testUrl, {
      method: endpoint.method,
      headers: buildAuthHeaders(endpoint.auth_type, authConfig),
    });

    return {
      success: response.ok,
      status: response.status,
      statusText: response.statusText,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

// Helper: Build auth headers
function buildAuthHeaders(authType: string, authConfig: any) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  switch (authType) {
    case 'api_key':
      headers[authConfig.apiKeyHeader || 'X-API-Key'] = authConfig.apiKey;
      break;
    case 'bearer':
      headers['Authorization'] = `Bearer ${authConfig.bearerToken}`;
      break;
    case 'custom_header':
      headers[authConfig.customHeader.name] = authConfig.customHeader.value;
      break;
  }

  return headers;
}
```

### Tool Calling Implementation

When a user asks a question, the chat engine:

1. Retrieves relevant knowledge chunks
2. Includes API endpoints as "tools" in the LLM call
3. LLM decides whether to use tools or answer from knowledge
4. If tool called, executes API and feeds result back to LLM

```typescript
// OpenAI function calling format
const tools = endpoints.map(ep => ({
  type: 'function',
  function: {
    name: ep.id, // Use ID as function name
    description: ep.description,
    parameters: {
      type: 'object',
      properties: extractParamsFromUrl(ep.url), // {order_id: {type: 'string'}}
      required: extractRequiredParams(ep.url),
    },
  },
}));

const response = await openai.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: [...],
  tools,
  tool_choice: 'auto',
});

// Handle tool calls
if (response.choices[0].message.tool_calls) {
  for (const toolCall of response.choices[0].message.tool_calls) {
    const endpoint = endpoints.find(ep => ep.id === toolCall.function.name);
    const args = JSON.parse(toolCall.function.arguments);

    // Execute the API call
    const result = await executeEndpoint(endpoint, args);

    // Feed result back to LLM for final response
    // ...
  }
}
```

### Edge Cases

| Scenario | Handling |
|----------|----------|
| Invalid URL format | Show validation error |
| Test fails (timeout) | Show "Connection timeout - check URL" |
| Test fails (4xx) | Show "Auth error - check credentials" |
| Test fails (5xx) | Show "Server error - API may be down" |
| Missing required fields | Show inline validation errors |
| Duplicate endpoint name | Allow (names don't need to be unique) |
| API call fails during chat | Chatbot says "Couldn't retrieve that info, please try again" |

### Acceptance Criteria

- [ ] User can add API endpoint with all required fields
- [ ] User can test endpoint and see success/failure
- [ ] Auth credentials are stored encrypted
- [ ] User can edit existing endpoints
- [ ] User can delete endpoints
- [ ] Chatbot correctly calls API when relevant to user question
- [ ] Chatbot correctly extracts parameters from user message
- [ ] API results are incorporated into chatbot response

---

## 6.4 Feature: Embeddable Widget

### Overview
A lightweight, self-contained chat widget that users embed on their website via a single script tag. Works on any website regardless of framework.

### User Story
> As a business owner, I want to copy one line of code and have a working chatbot on my website immediately.

### Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| WGT-1 | Widget loads via single script tag | Must Have |
| WGT-2 | Script tag includes project ID as data attribute | Must Have |
| WGT-3 | Widget shows as chat bubble in corner | Must Have |
| WGT-4 | Clicking bubble opens chat window | Must Have |
| WGT-5 | Chat window has header, messages area, input | Must Have |
| WGT-6 | Messages persist during page session | Must Have |
| WGT-7 | Widget is mobile responsive | Must Have |
| WGT-8 | Widget uses Shadow DOM for style isolation | Must Have |
| WGT-9 | Widget loads asynchronously (non-blocking) | Must Have |
| WGT-10 | Widget bundle is <30KB gzipped | Should Have |
| WGT-11 | User can configure bubble position (V2) | Could Have |
| WGT-12 | User can customize colors/branding (V2) | Could Have |

### Embed Code Format

```html
<script
  src="https://cdn.yourproduct.com/widget.js"
  data-project-id="proj_abc123def456"
  async>
</script>
```

### Widget States

```
┌─────────────────────────────────────────────────────────────────┐
│                        WIDGET STATES                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   STATE 1: Collapsed (Bubble Only)                              │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │                                                         │  │
│   │                                                         │  │
│   │                                                         │  │
│   │                                                         │  │
│   │                                                   💬    │  │
│   │                                                  (60px) │  │
│   └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│   STATE 2: Expanded (Chat Window)                               │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │                                      ┌─────────────────┐│  │
│   │                                      │ Chat with us  X ││  │
│   │                                      ├─────────────────┤│  │
│   │                                      │                 ││  │
│   │                                      │ Bot: Hi! How    ││  │
│   │                                      │ can I help?     ││  │
│   │                                      │                 ││  │
│   │                                      │ User: What's    ││  │
│   │                                      │ your return     ││  │
│   │                                      │ policy?         ││  │
│   │                                      │                 ││  │
│   │                                      │ Bot: Our return ││  │
│   │                                      │ policy allows...││  │
│   │                                      │                 ││  │
│   │                                      ├─────────────────┤│  │
│   │                                      │ Type a message..││  │
│   │                                      │            [Send]││  │
│   │                                      └─────────────────┘│  │
│   └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│   STATE 3: Loading                                              │
│   - Shows typing indicator while waiting for response           │
│                                                                 │
│   STATE 4: Error                                                │
│   - Shows error message if API fails                            │
│   - Includes retry option                                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Widget Dimensions

| Element | Desktop | Mobile |
|---------|---------|--------|
| Bubble size | 60x60px | 56x56px |
| Chat window width | 380px | 100% (fullscreen) |
| Chat window height | 520px | 100% (fullscreen) |
| Position from edge | 20px | 0 |
| Header height | 56px | 56px |
| Input area height | 60px | 60px |
| Message max width | 80% | 80% |

### Widget Behavior

**Initialization:**
```javascript
// On script load
1. Parse data-project-id from script tag
2. Create Shadow DOM container
3. Inject widget styles into Shadow DOM
4. Render collapsed bubble
5. Generate or retrieve visitor_id from localStorage
6. Retrieve chat history from sessionStorage (if exists)
```

**User Interactions:**
```javascript
// Click bubble
1. Expand to chat window
2. If first open, show welcome message
3. Focus input field

// Send message
1. Add user message to UI
2. Show typing indicator
3. POST to /api/chat
4. Hide typing indicator
5. Add bot response to UI
6. Save to sessionStorage

// Close chat
1. Collapse to bubble
2. Preserve message history

// Page navigation (SPA)
1. Widget persists across route changes
2. Chat history maintained
```

### Technical Implementation

**Widget Entry Point (`widget.js`):**
```javascript
(function() {
  'use strict';

  // Get project ID from script tag
  const script = document.currentScript;
  const projectId = script?.getAttribute('data-project-id');

  if (!projectId) {
    console.error('[YourProduct] Missing data-project-id');
    return;
  }

  // Configuration
  const API_URL = 'https://api.yourproduct.com';
  const VISITOR_ID_KEY = 'yourproduct_visitor_id';
  const CHAT_HISTORY_KEY = 'yourproduct_chat_history';

  // Generate or get visitor ID
  function getVisitorId() {
    let id = localStorage.getItem(VISITOR_ID_KEY);
    if (!id) {
      id = 'vis_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem(VISITOR_ID_KEY, id);
    }
    return id;
  }

  // Create Shadow DOM container
  const container = document.createElement('div');
  container.id = 'yourproduct-widget';
  const shadow = container.attachShadow({ mode: 'closed' });
  document.body.appendChild(container);

  // Inject styles
  const styles = `/* Widget CSS here */`;
  const styleEl = document.createElement('style');
  styleEl.textContent = styles;
  shadow.appendChild(styleEl);

  // Widget state
  let isOpen = false;
  let messages = JSON.parse(sessionStorage.getItem(CHAT_HISTORY_KEY) || '[]');
  const visitorId = getVisitorId();

  // Render functions
  function render() {
    // Render widget based on state
  }

  // API call
  async function sendMessage(content) {
    const response = await fetch(`${API_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId,
        visitorId,
        message: content,
      }),
    });
    return response.json();
  }

  // Initialize
  render();
})();
```

**Chat Window Component Structure:**
```html
<div class="widget-container">
  <!-- Bubble (collapsed state) -->
  <button class="widget-bubble" aria-label="Open chat">
    <svg><!-- Chat icon --></svg>
  </button>

  <!-- Chat Window (expanded state) -->
  <div class="widget-window" role="dialog" aria-label="Chat">
    <!-- Header -->
    <div class="widget-header">
      <span class="widget-title">Chat with us</span>
      <button class="widget-close" aria-label="Close chat">
        <svg><!-- Close icon --></svg>
      </button>
    </div>

    <!-- Messages -->
    <div class="widget-messages" role="log">
      <div class="message bot">
        <div class="message-content">Hi! How can I help you today?</div>
      </div>
      <div class="message user">
        <div class="message-content">What's your return policy?</div>
      </div>
      <!-- Typing indicator -->
      <div class="message bot typing">
        <div class="typing-indicator">
          <span></span><span></span><span></span>
        </div>
      </div>
    </div>

    <!-- Input -->
    <div class="widget-input">
      <input
        type="text"
        placeholder="Type a message..."
        aria-label="Message input"
      />
      <button class="widget-send" aria-label="Send message">
        <svg><!-- Send icon --></svg>
      </button>
    </div>
  </div>
</div>
```

### Build Configuration

```javascript
// Build with esbuild or similar
{
  entryPoints: ['src/widget.ts'],
  bundle: true,
  minify: true,
  format: 'iife',
  target: ['es2018'],
  outfile: 'dist/widget.js',
}
```

**Target bundle size:** <30KB gzipped

### Get Embed Code UI

**Embed Code Page (`/dashboard/embed`)**
```
┌─────────────────────────────────────────────────────────────────┐
│  Embed Code                                                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Add this script to your website to enable the chatbot.         │
│  Place it just before the closing </body> tag.                  │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ <script                                                 │   │
│  │   src="https://cdn.yourproduct.com/widget.js"          │   │
│  │   data-project-id="proj_abc123def456"                  │   │
│  │   async>                                                │   │
│  │ </script>                                               │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│                                              [📋 Copy Code]     │
│                                                                 │
│  ────────────────────────────────────────────────────────────   │
│                                                                 │
│  Preview                                                        │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                                                         │   │
│  │                                                   💬    │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Edge Cases

| Scenario | Handling |
|----------|----------|
| Invalid project ID | Widget doesn't render, console error |
| API unavailable | Show "Connection error" in chat, retry button |
| Very long message | Wrap text, scroll to bottom |
| Network offline | Show offline indicator, queue messages |
| Multiple widgets on page | Only first one renders |
| Content Security Policy | Document CSP requirements |

### Acceptance Criteria

- [ ] Widget loads via single script tag
- [ ] Widget appears as bubble in bottom-right corner
- [ ] Clicking bubble opens chat window
- [ ] User can send messages and receive responses
- [ ] Messages persist during page session
- [ ] Widget is responsive on mobile
- [ ] Widget doesn't affect host page styles
- [ ] Widget is accessible (keyboard nav, ARIA)
- [ ] Bundle size is under 30KB gzipped

---

## 6.5 Feature: Chat Engine

### Overview
The core AI system that processes user messages, retrieves relevant knowledge, decides whether to call API tools, and generates responses.

### User Story
> As a website visitor, I want to ask questions and get accurate, helpful answers from the business's knowledge or real-time data.

### Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| CHT-1 | Receive and process user messages | Must Have |
| CHT-2 | Embed user message for vector search | Must Have |
| CHT-3 | Retrieve top-k relevant knowledge chunks | Must Have |
| CHT-4 | Include knowledge context in LLM prompt | Must Have |
| CHT-5 | Include API tools in LLM request | Must Have |
| CHT-6 | Execute tool calls when LLM requests | Must Have |
| CHT-7 | Feed tool results back to LLM | Must Have |
| CHT-8 | Generate final response | Must Have |
| CHT-9 | Handle "I don't know" gracefully | Must Have |
| CHT-10 | Maintain conversation context (last N messages) | Should Have |
| CHT-11 | Rate limit requests per visitor | Should Have |
| CHT-12 | Log conversations for debugging | Should Have |

### Chat Flow Architecture

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
│   │ 1. EMBED USER MESSAGE                    │                  │
│   │    OpenAI text-embedding-3-small         │                  │
│   └────────────────────┬────────────────────┘                  │
│                        │                                        │
│                        ▼                                        │
│   ┌─────────────────────────────────────────┐                  │
│   │ 2. VECTOR SEARCH                         │                  │
│   │    pgvector cosine similarity            │                  │
│   │    Top 5 chunks                          │                  │
│   └────────────────────┬────────────────────┘                  │
│                        │                                        │
│                        ▼                                        │
│   ┌─────────────────────────────────────────┐                  │
│   │ 3. BUILD LLM REQUEST                     │                  │
│   │    - System prompt                       │                  │
│   │    - Retrieved context                   │                  │
│   │    - Available tools (API endpoints)     │                  │
│   │    - Conversation history                │                  │
│   │    - User message                        │                  │
│   └────────────────────┬────────────────────┘                  │
│                        │                                        │
│                        ▼                                        │
│   ┌─────────────────────────────────────────┐                  │
│   │ 4. LLM CALL (GPT-4o-mini)                │                  │
│   │    tool_choice: "auto"                   │                  │
│   └────────────────────┬────────────────────┘                  │
│                        │                                        │
│            ┌───────────┴───────────┐                           │
│            ▼                       ▼                           │
│   ┌─────────────────┐    ┌─────────────────┐                   │
│   │ NO TOOL CALL    │    │ TOOL CALL       │                   │
│   │                 │    │                 │                   │
│   │ Return response │    │ 5. Execute API  │                   │
│   │ directly        │    │    with params  │                   │
│   └────────┬────────┘    └────────┬────────┘                   │
│            │                      │                             │
│            │                      ▼                             │
│            │             ┌─────────────────┐                   │
│            │             │ 6. Feed result  │                   │
│            │             │    back to LLM  │                   │
│            │             └────────┬────────┘                   │
│            │                      │                             │
│            │                      ▼                             │
│            │             ┌─────────────────┐                   │
│            │             │ 7. Generate     │                   │
│            │             │    final answer │                   │
│            │             └────────┬────────┘                   │
│            │                      │                             │
│            └──────────┬───────────┘                             │
│                       │                                         │
│                       ▼                                         │
│   ┌─────────────────────────────────────────┐                  │
│   │ 8. RETURN RESPONSE                       │                  │
│   │    "Your order #12345 is out for         │                  │
│   │    delivery and should arrive today!"    │                  │
│   └─────────────────────────────────────────┘                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### System Prompt

```
You are a helpful customer support assistant for {business_name}.

CRITICAL RULES:
1. Only answer questions using the provided CONTEXT and TOOLS
2. If you don't have enough information to answer, say "I don't have information about that. Please contact our support team at {support_email}."
3. NEVER make up information or hallucinate facts
4. Be concise and helpful
5. If a user asks about their order, account, or real-time data, USE THE AVAILABLE TOOLS

CONTEXT FROM KNOWLEDGE BASE:
{retrieved_chunks}

AVAILABLE TOOLS:
{tool_descriptions}

Conversation so far:
{conversation_history}
```

### Vector Search Implementation

```typescript
async function searchKnowledge(
  projectId: string,
  query: string,
  topK: number = 5
): Promise<KnowledgeChunk[]> {
  // 1. Embed the query
  const embedding = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: query,
  });

  const queryVector = embedding.data[0].embedding;

  // 2. Search with pgvector
  const { data: chunks } = await supabase.rpc('match_knowledge_chunks', {
    query_embedding: queryVector,
    match_threshold: 0.7,  // Minimum similarity
    match_count: topK,
    p_project_id: projectId,
  });

  return chunks;
}

// SQL function for vector search
/*
CREATE OR REPLACE FUNCTION match_knowledge_chunks(
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  p_project_id uuid
)
RETURNS TABLE (
  id uuid,
  content text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    kc.id,
    kc.content,
    1 - (kc.embedding <=> query_embedding) as similarity
  FROM knowledge_chunks kc
  JOIN knowledge_sources ks ON kc.source_id = ks.id
  WHERE ks.project_id = p_project_id
    AND 1 - (kc.embedding <=> query_embedding) > match_threshold
  ORDER BY kc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
*/
```

### Chat API Implementation

```typescript
// POST /api/chat
interface ChatRequest {
  projectId: string;
  visitorId: string;
  message: string;
  conversationHistory?: Message[];
}

interface ChatResponse {
  message: string;
  conversationId: string;
}

async function handleChat(req: ChatRequest): Promise<ChatResponse> {
  const { projectId, visitorId, message, conversationHistory = [] } = req;

  // 1. Get project config
  const project = await getProject(projectId);
  if (!project) throw new Error('Project not found');

  // 2. Search knowledge base
  const relevantChunks = await searchKnowledge(projectId, message, 5);
  const context = relevantChunks.map(c => c.content).join('\n\n---\n\n');

  // 3. Get API endpoints as tools
  const endpoints = await getApiEndpoints(projectId);
  const tools = endpoints.map(endpointToTool);

  // 4. Build messages array
  const messages = [
    {
      role: 'system',
      content: buildSystemPrompt(project, context),
    },
    ...conversationHistory.slice(-10), // Last 10 messages for context
    {
      role: 'user',
      content: message,
    },
  ];

  // 5. Call LLM
  let response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages,
    tools: tools.length > 0 ? tools : undefined,
    tool_choice: tools.length > 0 ? 'auto' : undefined,
  });

  // 6. Handle tool calls
  while (response.choices[0].message.tool_calls) {
    const toolCalls = response.choices[0].message.tool_calls;

    // Add assistant message with tool calls
    messages.push(response.choices[0].message);

    // Execute each tool call
    for (const toolCall of toolCalls) {
      const endpoint = endpoints.find(e => e.id === toolCall.function.name);
      const args = JSON.parse(toolCall.function.arguments);

      const result = await executeApiEndpoint(endpoint, args);

      messages.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        content: JSON.stringify(result),
      });
    }

    // Get final response
    response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      tools,
      tool_choice: 'auto',
    });
  }

  // 7. Return response
  const assistantMessage = response.choices[0].message.content;

  // 8. Log conversation (async, don't block)
  logConversation(projectId, visitorId, message, assistantMessage);

  return {
    message: assistantMessage,
    conversationId: generateConversationId(),
  };
}
```

### Tool Execution

```typescript
async function executeApiEndpoint(
  endpoint: ApiEndpoint,
  params: Record<string, string>
): Promise<any> {
  // Build URL with params
  let url = endpoint.url;
  for (const [key, value] of Object.entries(params)) {
    url = url.replace(`{${key}}`, encodeURIComponent(value));
  }

  // Build headers
  const authConfig = await decrypt(endpoint.auth_config);
  const headers = buildAuthHeaders(endpoint.auth_type, authConfig);

  // Make request
  try {
    const response = await fetch(url, {
      method: endpoint.method,
      headers,
      body: endpoint.method === 'POST' ? JSON.stringify(params) : undefined,
    });

    if (!response.ok) {
      return { error: `API returned ${response.status}` };
    }

    return await response.json();
  } catch (error) {
    return { error: 'Failed to fetch data' };
  }
}
```

### Response Handling

**When knowledge is sufficient:**
```
User: "What's your return policy?"
Bot: "Our return policy allows returns within 30 days of purchase. Items must be unused and in original packaging. To initiate a return, please email returns@store.com with your order number."
```

**When tool call is needed:**
```
User: "Where's my order #12345?"
[Bot calls Order Status API with order_id: "12345"]
[API returns: {status: "out_for_delivery", eta: "today by 5pm"}]
Bot: "Your order #12345 is out for delivery and should arrive today by 5pm!"
```

**When no information available:**
```
User: "Do you sell purple widgets?"
Bot: "I don't have information about that specific product. Please contact our support team at support@store.com or check our website for the full product catalog."
```

### Rate Limiting

```typescript
const RATE_LIMITS = {
  messagesPerMinute: 10,
  messagesPerHour: 50,
  messagesPerDay: 200,
};

async function checkRateLimit(visitorId: string): Promise<boolean> {
  const key = `rate_limit:${visitorId}`;
  const now = Date.now();

  // Implementation using Redis or Supabase
  // Returns true if within limits, false if exceeded
}
```

### Edge Cases

| Scenario | Handling |
|----------|----------|
| No relevant chunks found | LLM responds based on general instructions |
| Tool call fails | Include error in tool response, LLM apologizes |
| Multiple tool calls needed | Execute sequentially, feed all results back |
| Very long user message | Truncate to 2000 chars |
| Rate limit exceeded | Return "Please wait before sending more messages" |
| LLM returns empty response | Return fallback "I'm having trouble responding" |

### Acceptance Criteria

- [ ] Chat engine receives messages and returns responses
- [ ] Responses are based on uploaded knowledge
- [ ] API tools are called when appropriate
- [ ] Tool results are incorporated into responses
- [ ] "I don't know" responses are graceful, not hallucinated
- [ ] Conversation context is maintained
- [ ] Rate limiting prevents abuse
- [ ] Response time is under 5 seconds for most queries

---

## 6.6 Feature: MCP Server

### Overview
Model Context Protocol server that allows AI development platforms (Lovable, Cursor, Claude Code) to programmatically configure and manage chatbots.

### User Story
> As a vibe coder using Lovable, I want to prompt "add a customer support chatbot" and have the AI configure everything automatically.

### Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| MCP-1 | Implement MCP server following Anthropic spec | Must Have |
| MCP-2 | Expose create_project tool | Must Have |
| MCP-3 | Expose upload_knowledge tool | Must Have |
| MCP-4 | Expose add_api_endpoint tool | Must Have |
| MCP-5 | Expose get_embed_code tool | Must Have |
| MCP-6 | Expose list_projects tool | Must Have |
| MCP-7 | Support OAuth or API key authentication | Must Have |
| MCP-8 | Expose delete_project tool | Should Have |
| MCP-9 | Expose update_project tool | Should Have |
| MCP-10 | Expose list_knowledge tool | Should Have |

### MCP Tool Definitions

**Tool: create_project**
```json
{
  "name": "create_project",
  "description": "Create a new chatbot project. Returns the project ID needed for other operations.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "name": {
        "type": "string",
        "description": "Name for the chatbot project (e.g., 'My Store Support')"
      }
    },
    "required": ["name"]
  }
}
```

**Response:**
```json
{
  "project_id": "proj_abc123def456",
  "name": "My Store Support",
  "created_at": "2024-12-15T10:30:00Z"
}
```

---

**Tool: upload_knowledge**
```json
{
  "name": "upload_knowledge",
  "description": "Add knowledge content that the chatbot will use to answer questions. Can be FAQ content, product information, policies, etc.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "project_id": {
        "type": "string",
        "description": "The project ID from create_project"
      },
      "name": {
        "type": "string",
        "description": "Name for this knowledge source (e.g., 'FAQ', 'Return Policy')"
      },
      "content": {
        "type": "string",
        "description": "The text content to add as knowledge"
      }
    },
    "required": ["project_id", "name", "content"]
  }
}
```

**Response:**
```json
{
  "source_id": "src_xyz789",
  "name": "FAQ",
  "chunks_created": 12,
  "status": "ready"
}
```

---

**Tool: add_api_endpoint**
```json
{
  "name": "add_api_endpoint",
  "description": "Configure an API endpoint that the chatbot can call to fetch real-time data (e.g., order status, inventory). The chatbot will automatically call this API when users ask relevant questions.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "project_id": {
        "type": "string",
        "description": "The project ID from create_project"
      },
      "name": {
        "type": "string",
        "description": "Name for this endpoint (e.g., 'Order Status')"
      },
      "description": {
        "type": "string",
        "description": "Description of when to use this API. Be specific about what questions trigger it. Example: 'Get order status and tracking info. Use when customer asks about their order, shipping, or tracking.'"
      },
      "url": {
        "type": "string",
        "description": "API URL. Use {param} for dynamic values. Example: 'https://api.store.com/orders/{order_id}'"
      },
      "method": {
        "type": "string",
        "enum": ["GET", "POST"],
        "description": "HTTP method"
      },
      "auth_type": {
        "type": "string",
        "enum": ["none", "api_key", "bearer"],
        "description": "Authentication type"
      },
      "auth_value": {
        "type": "string",
        "description": "API key or bearer token (if auth required)"
      }
    },
    "required": ["project_id", "name", "description", "url", "method"]
  }
}
```

**Response:**
```json
{
  "endpoint_id": "ep_123abc",
  "name": "Order Status",
  "status": "active"
}
```

---

**Tool: get_embed_code**
```json
{
  "name": "get_embed_code",
  "description": "Get the script tag to embed the chatbot on a website. Add this to the HTML just before </body>.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "project_id": {
        "type": "string",
        "description": "The project ID"
      }
    },
    "required": ["project_id"]
  }
}
```

**Response:**
```json
{
  "embed_code": "<script src=\"https://cdn.yourproduct.com/widget.js\" data-project-id=\"proj_abc123def456\" async></script>",
  "instructions": "Add this script tag to your HTML just before the closing </body> tag."
}
```

---

**Tool: list_projects**
```json
{
  "name": "list_projects",
  "description": "List all chatbot projects for the authenticated user.",
  "inputSchema": {
    "type": "object",
    "properties": {},
    "required": []
  }
}
```

**Response:**
```json
{
  "projects": [
    {
      "project_id": "proj_abc123",
      "name": "My Store Support",
      "created_at": "2024-12-15T10:30:00Z"
    }
  ]
}
```

### MCP Server Implementation

```typescript
// mcp-server/index.ts
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

const server = new Server(
  {
    name: 'yourproduct-chatbot',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler('tools/list', async () => {
  return {
    tools: [
      {
        name: 'create_project',
        description: 'Create a new chatbot project...',
        inputSchema: { /* ... */ },
      },
      {
        name: 'upload_knowledge',
        description: 'Add knowledge content...',
        inputSchema: { /* ... */ },
      },
      // ... other tools
    ],
  };
});

// Handle tool calls
server.setRequestHandler('tools/call', async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case 'create_project':
      return await handleCreateProject(args);
    case 'upload_knowledge':
      return await handleUploadKnowledge(args);
    case 'add_api_endpoint':
      return await handleAddApiEndpoint(args);
    case 'get_embed_code':
      return await handleGetEmbedCode(args);
    case 'list_projects':
      return await handleListProjects(args);
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

// Start server
const transport = new StdioServerTransport();
await server.connect(transport);
```

### Authentication

**Option 1: API Key**
```bash
# User generates API key from dashboard
# Configures MCP server with key

# In MCP server config
{
  "yourproduct": {
    "command": "npx",
    "args": ["yourproduct-mcp"],
    "env": {
      "YOURPRODUCT_API_KEY": "sk_live_xxxxx"
    }
  }
}
```

**Option 2: OAuth (for hosted MCP)**
```typescript
// MCP server handles OAuth flow
// Stores refresh token securely
// Auto-refreshes access token
```

### Example Vibe Coding Session

**User prompt to Lovable:**
> "Add a customer support chatbot to my e-commerce site. It should answer questions about products using the product info from my database, and let customers check their order status using the API at https://api.mystore.com/orders/{order_id} with bearer token 'xyz123'."

**Lovable (via MCP) executes:**
```
1. create_project(name: "E-commerce Support")
   → Returns: proj_abc123

2. upload_knowledge(
     project_id: "proj_abc123",
     name: "Product Info",
     content: [extracts product info from database]
   )
   → Returns: 15 chunks created

3. add_api_endpoint(
     project_id: "proj_abc123",
     name: "Order Status",
     description: "Get order status and tracking. Use when customer asks about their order.",
     url: "https://api.mystore.com/orders/{order_id}",
     method: "GET",
     auth_type: "bearer",
     auth_value: "xyz123"
   )
   → Returns: endpoint created

4. get_embed_code(project_id: "proj_abc123")
   → Returns: <script src="..."></script>

5. [Lovable adds script to index.html]
```

**Result:** Working chatbot on the site in ~30 seconds.

### Edge Cases

| Scenario | Handling |
|----------|----------|
| Invalid API key | Return auth error with instructions |
| Project not found | Return clear error message |
| Knowledge upload fails | Return error, allow retry |
| Rate limit exceeded | Return rate limit error with reset time |

### Acceptance Criteria

- [ ] MCP server implements all 5 core tools
- [ ] Authentication works via API key
- [ ] Tools can be called from Lovable/Cursor
- [ ] create_project creates functional project
- [ ] upload_knowledge processes and indexes content
- [ ] add_api_endpoint configures working tool
- [ ] get_embed_code returns valid script tag
- [ ] Error handling is clear and actionable

---

# 7. Technical Architecture

## 7.1 Technology Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| **Frontend** | Next.js 14+ (App Router) | Modern React, SSR, great DX |
| **UI Components** | shadcn/ui + Tailwind CSS | Beautiful, accessible, customizable |
| **Backend** | Node.js (Express or Fastify) | Same language as frontend, fast |
| **Database** | Supabase PostgreSQL | Managed, pgvector support, realtime |
| **Vector Search** | pgvector | Integrated with Supabase, simple |
| **Auth** | Supabase Auth | Magic links, managed, secure |
| **File Storage** | Supabase Storage | Integrated, simple |
| **LLM** | OpenAI GPT-4o-mini | Fast, cheap, good quality |
| **Embeddings** | OpenAI text-embedding-3-small | 1536 dims, good performance |
| **Widget** | Preact or Vanilla JS | Tiny bundle, no dependencies |
| **MCP Server** | Node.js | MCP SDK available |
| **Monorepo** | Turborepo | Fast builds, shared packages |

## 7.2 Monorepo Structure

```
/
├── apps/
│   ├── web/                    # Next.js dashboard
│   │   ├── app/
│   │   │   ├── (auth)/
│   │   │   │   ├── login/
│   │   │   │   └── auth/callback/
│   │   │   ├── (dashboard)/
│   │   │   │   ├── layout.tsx
│   │   │   │   ├── page.tsx           # Overview
│   │   │   │   ├── knowledge/
│   │   │   │   ├── api-endpoints/
│   │   │   │   ├── embed/
│   │   │   │   └── settings/
│   │   │   └── layout.tsx
│   │   ├── components/
│   │   └── lib/
│   │
│   ├── api/                    # Node.js API server
│   │   ├── src/
│   │   │   ├── routes/
│   │   │   │   ├── auth.ts
│   │   │   │   ├── knowledge.ts
│   │   │   │   ├── endpoints.ts
│   │   │   │   └── chat.ts
│   │   │   ├── services/
│   │   │   │   ├── embedding.ts
│   │   │   │   ├── chunking.ts
│   │   │   │   ├── chat-engine.ts
│   │   │   │   └── tool-executor.ts
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── widget/                 # Embeddable chat widget
│   │   ├── src/
│   │   │   ├── widget.ts
│   │   │   ├── components/
│   │   │   └── styles.css
│   │   ├── build.ts
│   │   └── package.json
│   │
│   └── mcp-server/             # MCP server for AI platforms
│       ├── src/
│       │   ├── index.ts
│       │   ├── tools/
│       │   └── auth.ts
│       └── package.json
│
├── packages/
│   ├── ui/                     # Shared UI components
│   │   ├── src/
│   │   │   └── components/
│   │   └── package.json
│   │
│   ├── db/                     # Database client & types
│   │   ├── src/
│   │   │   ├── client.ts
│   │   │   ├── types.ts
│   │   │   └── queries/
│   │   └── package.json
│   │
│   └── shared/                 # Shared utilities
│       ├── src/
│       │   ├── constants.ts
│       │   ├── utils.ts
│       │   └── types.ts
│       └── package.json
│
├── supabase/
│   ├── migrations/
│   └── seed.sql
│
├── turbo.json
├── package.json
└── README.md
```

## 7.3 Environment Variables

```bash
# .env.local (web)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_API_URL=http://localhost:3001

# .env (api)
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...
OPENAI_API_KEY=sk-...
ENCRYPTION_KEY=xxx
RATE_LIMIT_ENABLED=true
RATE_LIMIT_MESSAGES_PER_MINUTE=10

# .env (widget)
API_URL=https://api.yourproduct.com
CDN_URL=https://cdn.yourproduct.com

# .env (mcp-server)
API_URL=https://api.yourproduct.com
```

---

# 8. Database Schema

## 8.1 Complete Schema

```sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Users are managed by Supabase Auth (auth.users)

-- Projects table
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'My Chatbot',
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Knowledge sources table
CREATE TABLE knowledge_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('text', 'file', 'pdf')),
  name TEXT NOT NULL,
  content TEXT,
  file_path TEXT,
  status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'ready', 'failed')),
  chunk_count INTEGER DEFAULT 0,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Knowledge chunks table (with vector)
CREATE TABLE knowledge_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID NOT NULL REFERENCES knowledge_sources(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  embedding VECTOR(1536) NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for vector similarity search
CREATE INDEX ON knowledge_chunks
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- API endpoints table
CREATE TABLE api_endpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  url TEXT NOT NULL,
  method TEXT NOT NULL DEFAULT 'GET' CHECK (method IN ('GET', 'POST')),
  auth_type TEXT NOT NULL DEFAULT 'none' CHECK (auth_type IN ('none', 'api_key', 'bearer', 'custom_header')),
  auth_config JSONB DEFAULT '{}', -- Encrypted
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chat sessions table (for analytics - V2)
CREATE TABLE chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  visitor_id TEXT NOT NULL,
  messages JSONB[] DEFAULT ARRAY[]::JSONB[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- API keys table (for MCP auth)
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL, -- Hashed key
  key_prefix TEXT NOT NULL, -- First 8 chars for identification
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_endpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can access own projects" ON projects
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can access own knowledge sources" ON knowledge_sources
  FOR ALL USING (
    project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can access own knowledge chunks" ON knowledge_chunks
  FOR ALL USING (
    source_id IN (
      SELECT ks.id FROM knowledge_sources ks
      JOIN projects p ON ks.project_id = p.id
      WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can access own api endpoints" ON api_endpoints
  FOR ALL USING (
    project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can access own chat sessions" ON chat_sessions
  FOR ALL USING (
    project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can access own api keys" ON api_keys
  FOR ALL USING (auth.uid() = user_id);

-- Function for vector similarity search
CREATE OR REPLACE FUNCTION match_knowledge_chunks(
  query_embedding VECTOR(1536),
  match_threshold FLOAT,
  match_count INT,
  p_project_id UUID
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    kc.id,
    kc.content,
    1 - (kc.embedding <=> query_embedding) AS similarity
  FROM knowledge_chunks kc
  JOIN knowledge_sources ks ON kc.source_id = ks.id
  WHERE ks.project_id = p_project_id
    AND ks.status = 'ready'
    AND 1 - (kc.embedding <=> query_embedding) > match_threshold
  ORDER BY kc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER api_endpoints_updated_at
  BEFORE UPDATE ON api_endpoints
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER chat_sessions_updated_at
  BEFORE UPDATE ON chat_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

---

# 9. API Specifications

## 9.1 API Overview

**Base URL:** `https://api.yourproduct.com`

**Authentication:**
- Dashboard API: Supabase JWT (from auth session)
- Chat API: Project ID (public, rate limited)
- MCP API: API Key (header: `X-API-Key`)

## 9.2 Endpoints

### Authentication

#### Check Session
```
GET /api/auth/session
Authorization: Bearer {supabase_jwt}

Response 200:
{
  "user": {
    "id": "uuid",
    "email": "user@example.com"
  },
  "project": {
    "id": "proj_xxx",
    "name": "My Chatbot"
  }
}
```

### Knowledge

#### List Knowledge Sources
```
GET /api/knowledge
Authorization: Bearer {supabase_jwt}

Response 200:
{
  "sources": [
    {
      "id": "src_xxx",
      "name": "FAQ",
      "type": "pdf",
      "status": "ready",
      "chunkCount": 24,
      "createdAt": "2024-12-15T10:30:00Z"
    }
  ]
}
```

#### Create Knowledge Source
```
POST /api/knowledge
Authorization: Bearer {supabase_jwt}
Content-Type: multipart/form-data

Body:
- name: string
- type: "text" | "file" | "pdf"
- content?: string (for type=text)
- file?: File (for type=file or pdf)

Response 201:
{
  "source": {
    "id": "src_xxx",
    "name": "FAQ",
    "type": "text",
    "status": "processing"
  }
}
```

#### Delete Knowledge Source
```
DELETE /api/knowledge/:id
Authorization: Bearer {supabase_jwt}

Response 204: No Content
```

### API Endpoints

#### List API Endpoints
```
GET /api/endpoints
Authorization: Bearer {supabase_jwt}

Response 200:
{
  "endpoints": [
    {
      "id": "ep_xxx",
      "name": "Order Status",
      "description": "Get order status...",
      "url": "https://api.store.com/orders/{order_id}",
      "method": "GET",
      "authType": "bearer",
      "createdAt": "2024-12-15T10:30:00Z"
    }
  ]
}
```

#### Create API Endpoint
```
POST /api/endpoints
Authorization: Bearer {supabase_jwt}
Content-Type: application/json

Body:
{
  "name": "Order Status",
  "description": "Get order status and tracking info...",
  "url": "https://api.store.com/orders/{order_id}",
  "method": "GET",
  "authType": "bearer",
  "authConfig": {
    "bearerToken": "xxx"
  }
}

Response 201:
{
  "endpoint": {
    "id": "ep_xxx",
    "name": "Order Status",
    ...
  }
}
```

#### Test API Endpoint
```
POST /api/endpoints/:id/test
Authorization: Bearer {supabase_jwt}

Response 200:
{
  "success": true,
  "status": 200,
  "statusText": "OK"
}

Response 200 (failed):
{
  "success": false,
  "status": 401,
  "error": "Unauthorized"
}
```

#### Update API Endpoint
```
PUT /api/endpoints/:id
Authorization: Bearer {supabase_jwt}
Content-Type: application/json

Body: (same as create)

Response 200:
{
  "endpoint": { ... }
}
```

#### Delete API Endpoint
```
DELETE /api/endpoints/:id
Authorization: Bearer {supabase_jwt}

Response 204: No Content
```

### Chat

#### Send Message
```
POST /api/chat
Content-Type: application/json

Body:
{
  "projectId": "proj_xxx",
  "visitorId": "vis_xxx",
  "message": "What's your return policy?",
  "conversationHistory": [
    { "role": "user", "content": "..." },
    { "role": "assistant", "content": "..." }
  ]
}

Response 200:
{
  "message": "Our return policy allows...",
  "conversationId": "conv_xxx"
}
```

### Embed

#### Get Embed Code
```
GET /api/embed
Authorization: Bearer {supabase_jwt}

Response 200:
{
  "embedCode": "<script src=\"...\" data-project-id=\"proj_xxx\" async></script>",
  "projectId": "proj_xxx"
}
```

### API Keys (for MCP)

#### List API Keys
```
GET /api/keys
Authorization: Bearer {supabase_jwt}

Response 200:
{
  "keys": [
    {
      "id": "key_xxx",
      "name": "MCP Key",
      "prefix": "sk_live_",
      "lastUsedAt": "2024-12-15T10:30:00Z",
      "createdAt": "2024-12-14T10:30:00Z"
    }
  ]
}
```

#### Create API Key
```
POST /api/keys
Authorization: Bearer {supabase_jwt}
Content-Type: application/json

Body:
{
  "name": "MCP Key"
}

Response 201:
{
  "key": "sk_live_xxxxxxxxxxxxx", // Only shown once!
  "id": "key_xxx",
  "name": "MCP Key"
}
```

#### Delete API Key
```
DELETE /api/keys/:id
Authorization: Bearer {supabase_jwt}

Response 204: No Content
```

---

# 10. MCP Server Specifications

(Covered in detail in section 6.6)

---

# 11. Widget Specifications

(Covered in detail in section 6.4)

---

# 12. User Flows

## 12.1 Small Business Sam - Manual Setup

```
┌─────────────────────────────────────────────────────────────────┐
│                    MANUAL SETUP FLOW                            │
│                    Total time: ~15-20 minutes                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   STEP 1: Sign Up (1-2 min)                                     │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │ 1. Visit yourproduct.com                                │  │
│   │ 2. Click "Get Started"                                  │  │
│   │ 3. Enter email                                          │  │
│   │ 4. Click "Send magic link"                              │  │
│   │ 5. Check email, click link                              │  │
│   │ 6. Land on dashboard (project auto-created)             │  │
│   └─────────────────────────────────────────────────────────┘  │
│                              │                                  │
│                              ▼                                  │
│   STEP 2: Add Knowledge (5-10 min)                              │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │ 1. Click "Knowledge Base" in sidebar                    │  │
│   │ 2. Click "+ Add Knowledge"                              │  │
│   │ 3. Select "Upload PDF"                                  │  │
│   │ 4. Upload FAQ document                                  │  │
│   │ 5. Wait for processing (~30 sec)                        │  │
│   │ 6. See "Ready" status with chunk count                  │  │
│   │ 7. Repeat for other documents                           │  │
│   └─────────────────────────────────────────────────────────┘  │
│                              │                                  │
│                              ▼                                  │
│   STEP 3: Configure APIs (5-10 min) [Optional]                  │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │ 1. Click "API Endpoints" in sidebar                     │  │
│   │ 2. Click "+ Add Endpoint"                               │  │
│   │ 3. Enter endpoint details:                              │  │
│   │    - Name: "Order Status"                               │  │
│   │    - Description: "Get order status by ID..."           │  │
│   │    - URL: "https://api.mystore.com/orders/{order_id}"   │  │
│   │    - Method: GET                                        │  │
│   │    - Auth: Bearer Token                                 │  │
│   │    - Token: [paste token]                               │  │
│   │ 4. Click "Test Endpoint"                                │  │
│   │ 5. See "Connection successful"                          │  │
│   │ 6. Click "Save"                                         │  │
│   └─────────────────────────────────────────────────────────┘  │
│                              │                                  │
│                              ▼                                  │
│   STEP 4: Embed on Website (1-2 min)                            │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │ 1. Click "Embed Code" in sidebar                        │  │
│   │ 2. Click "Copy Code"                                    │  │
│   │ 3. Open website code/CMS                                │  │
│   │ 4. Paste before </body>                                 │  │
│   │ 5. Save/publish                                         │  │
│   │ 6. Visit website - see chat bubble!                     │  │
│   └─────────────────────────────────────────────────────────┘  │
│                              │                                  │
│                              ▼                                  │
│                         ✅ DONE!                                │
│                    Chatbot is live                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 12.2 Vibe Coder Vic - MCP Setup

```
┌─────────────────────────────────────────────────────────────────┐
│                      MCP SETUP FLOW                             │
│                      Total time: ~1-2 minutes                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   STEP 1: One-time MCP Setup (1-2 min, only once)               │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │ 1. Sign up at yourproduct.com (magic link)              │  │
│   │ 2. Go to Settings → API Keys                            │  │
│   │ 3. Create new API key, copy it                          │  │
│   │ 4. Add to MCP config (Lovable/Cursor/Claude):           │  │
│   │                                                         │  │
│   │    {                                                    │  │
│   │      "yourproduct": {                                   │  │
│   │        "command": "npx",                                │  │
│   │        "args": ["yourproduct-mcp"],                     │  │
│   │        "env": {                                         │  │
│   │          "YOURPRODUCT_API_KEY": "sk_live_xxx"           │  │
│   │        }                                                │  │
│   │      }                                                  │  │
│   │    }                                                    │  │
│   │                                                         │  │
│   │ 5. MCP connected ✓                                      │  │
│   └─────────────────────────────────────────────────────────┘  │
│                              │                                  │
│                              ▼                                  │
│   STEP 2: Vibe Code the Chatbot (~30 seconds)                   │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │                                                         │  │
│   │   USER PROMPT:                                          │  │
│   │   "Add a customer support chatbot to my site.           │  │
│   │    It should answer questions about products from       │  │
│   │    this FAQ content: [paste FAQ]. Also let customers    │  │
│   │    check order status using my API at                   │  │
│   │    https://api.store.com/orders/{id} with bearer        │  │
│   │    token 'xyz123'."                                     │  │
│   │                                                         │  │
│   │   AI EXECUTES (via MCP):                                │  │
│   │   1. create_project("Store Support")                    │  │
│   │   2. upload_knowledge(projectId, "FAQ", faqContent)     │  │
│   │   3. add_api_endpoint(projectId, orderStatusConfig)     │  │
│   │   4. get_embed_code(projectId)                          │  │
│   │   5. [Adds script to index.html]                        │  │
│   │                                                         │  │
│   │   AI RESPONDS:                                          │  │
│   │   "Done! I've added a customer support chatbot to       │  │
│   │    your site. It can answer questions from your FAQ     │  │
│   │    and check order status. The chat widget will         │  │
│   │    appear in the bottom-right corner."                  │  │
│   │                                                         │  │
│   └─────────────────────────────────────────────────────────┘  │
│                              │                                  │
│                              ▼                                  │
│                         ✅ DONE!                                │
│                    Chatbot is live                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 12.3 Website Visitor - Chat Experience

```
┌─────────────────────────────────────────────────────────────────┐
│                    VISITOR CHAT FLOW                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   SCENARIO 1: FAQ Question                                      │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │ 1. Visitor sees chat bubble on website                  │  │
│   │ 2. Clicks bubble → chat window opens                    │  │
│   │ 3. Bot: "Hi! How can I help you today?"                 │  │
│   │ 4. Visitor: "What's your return policy?"                │  │
│   │ 5. [Bot searches knowledge base]                        │  │
│   │ 6. Bot: "Our return policy allows returns within        │  │
│   │    30 days of purchase. Items must be unused and        │  │
│   │    in original packaging. To start a return, email      │  │
│   │    returns@store.com with your order number."           │  │
│   └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│   SCENARIO 2: Order Status (API call)                           │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │ 1. Visitor: "Where's my order #12345?"                  │  │
│   │ 2. [Bot recognizes order query, calls Order Status API] │  │
│   │ 3. [API returns: {status: "shipped", tracking: "xyz"}]  │  │
│   │ 4. Bot: "Your order #12345 has shipped! Here's your     │  │
│   │    tracking number: xyz. Expected delivery: Dec 18."    │  │
│   └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│   SCENARIO 3: Unknown Question                                  │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │ 1. Visitor: "Do you have purple widgets in stock?"      │  │
│   │ 2. [Bot searches knowledge - no relevant results]       │  │
│   │ 3. [No inventory API configured]                        │  │
│   │ 4. Bot: "I don't have specific inventory information    │  │
│   │    available. Please check our website or contact us    │  │
│   │    at support@store.com for current stock."             │  │
│   └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│   SCENARIO 4: Complex Query (multi-turn)                        │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │ 1. Visitor: "I want to return something"                │  │
│   │ 2. Bot: "I can help with that! What's your order #?"    │  │
│   │ 3. Visitor: "12345"                                     │  │
│   │ 4. [Bot calls Order API to verify order]                │  │
│   │ 5. Bot: "I found order #12345 placed on Dec 10. It's    │  │
│   │    within our 30-day return window. To start your       │  │
│   │    return, email returns@store.com with order #12345    │  │
│   │    and reason for return."                              │  │
│   └─────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

# 13. UI/UX Guidelines

## 13.1 Design System

**Reference:** Modern, minimal dashboard aesthetic like Linear, Vercel, OpenAI

### Colors
```css
/* Light mode */
--background: #ffffff;
--foreground: #0a0a0a;
--muted: #f4f4f5;
--muted-foreground: #71717a;
--border: #e4e4e7;
--primary: #0a0a0a;
--primary-foreground: #fafafa;

/* Dark mode */
--background: #0a0a0a;
--foreground: #fafafa;
--muted: #27272a;
--muted-foreground: #a1a1aa;
--border: #27272a;
--primary: #fafafa;
--primary-foreground: #0a0a0a;
```

### Typography
```css
--font-sans: "Inter", system-ui, sans-serif;
--font-mono: "JetBrains Mono", monospace;

/* Sizes */
--text-xs: 0.75rem;
--text-sm: 0.875rem;
--text-base: 1rem;
--text-lg: 1.125rem;
--text-xl: 1.25rem;
--text-2xl: 1.5rem;
```

### Spacing
```css
--space-1: 0.25rem;
--space-2: 0.5rem;
--space-3: 0.75rem;
--space-4: 1rem;
--space-6: 1.5rem;
--space-8: 2rem;
```

## 13.2 Component Patterns

**shadcn/ui components to use:**
- Button
- Input
- Textarea
- Select
- Dialog/Modal
- Card
- Badge
- Tabs
- Dropdown Menu
- Toast
- Skeleton (loading states)

## 13.3 Dashboard Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  [Logo]                                        [user@email] ▼   │
├────────────┬────────────────────────────────────────────────────┤
│            │                                                    │
│  Overview  │   [Page Title]                                     │
│            │                                                    │
│  Knowledge │   [Page content area]                              │
│  Base      │                                                    │
│            │                                                    │
│  API       │                                                    │
│  Endpoints │                                                    │
│            │                                                    │
│  Embed     │                                                    │
│  Code      │                                                    │
│            │                                                    │
│  ───────── │                                                    │
│            │                                                    │
│  Settings  │                                                    │
│            │                                                    │
│  Docs ↗    │                                                    │
│            │                                                    │
└────────────┴────────────────────────────────────────────────────┘
```

## 13.4 Widget Design

```css
/* Chat bubble */
.widget-bubble {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: #0a0a0a;
  color: #ffffff;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

/* Chat window */
.widget-window {
  width: 380px;
  height: 520px;
  border-radius: 16px;
  background: #ffffff;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
}

/* Message bubbles */
.message.user {
  background: #0a0a0a;
  color: #ffffff;
  border-radius: 18px 18px 4px 18px;
}

.message.bot {
  background: #f4f4f5;
  color: #0a0a0a;
  border-radius: 18px 18px 18px 4px;
}
```

---

# 14. Security Considerations

## 14.1 Authentication Security
- Magic links expire after 1 hour
- Rate limit: 5 magic link requests per email per hour
- Sessions use Supabase JWT with refresh tokens
- API keys are hashed before storage (show only once)

## 14.2 Data Security
- API endpoint credentials encrypted at rest
- Row Level Security (RLS) on all tables
- Users can only access their own data
- File uploads scanned for malware (if implementing)

## 14.3 API Security
- Chat API rate limited per visitor
- API key authentication for MCP
- CORS configured for widget domain
- Input validation on all endpoints

## 14.4 Widget Security
- Shadow DOM prevents CSS injection
- No sensitive data stored in widget
- Project ID is public but rate limited
- XSS prevention in message rendering

## 14.5 Third-party API Calls
- Credentials never exposed to frontend
- API calls made from backend only
- Timeout limits on external calls
- Error responses don't leak credentials

---

# 15. Product Roadmap

> **Competitive roadmap (2026):** see [`chatbase-roadmap/master-plan.md`](./chatbase-roadmap/master-plan.md) for the live-verified Chatbase gap analysis, per-gap decisions, and active subplans (next up: Conversation Insights + Widget Customization).

## 15.1 V1 (MVP) - COMPLETED ✅

**Goal:** Working product that solves core use case

| Feature | Status |
|---------|--------|
| Magic link auth | ✅ Completed |
| Knowledge base (text, file, PDF) | ✅ Completed |
| API endpoint configuration | ✅ Completed |
| Embeddable widget | ✅ Completed |
| Chat engine with RAG | ✅ Completed |
| MCP server (10 tools) | ✅ Completed |

**Success criteria:** ✅ All met
- User can set up working chatbot in <20 min ✅
- Chatbot answers from knowledge accurately ✅
- API tools work for real-time data ✅
- MCP enables vibe coding integration ✅

## 15.2 Immediate Priority (Team Decision - Dec 2024)

**Goal:** Multi-project support and lead generation capabilities

These features have been prioritized by the team to be implemented immediately after V1, before other V2 features.

| Feature | Description | Status |
|---------|-------------|--------|
| Chat analytics | Message count, popular questions, response quality | ✅ Completed |
| **Multiple projects** | Multiple projects per account with header switcher (promoted from V3) | 🔜 Next |
| **Lead capture** | Capture emails when chatbot can't answer, notify business owners (NEW) | 🔜 Queued |

**Why prioritized:**
- **Multiple projects**: Agencies and multi-brand businesses need this now. Database already supports it.
- **Lead capture**: Converts unanswered questions into business opportunities. Key differentiator vs competitors.

**Specs:**
- [multiple-projects spec](./features/core/multiple-projects/spec.md)
- [lead-capture spec](./features/core/lead-capture/spec.md)

## 15.3 V2 - Enhanced Features

**Goal:** Polish, integrations, content expansion

| Feature | Description |
|---------|-------------|
| Conversation history | View past chats in dashboard |
| Custom widget styling | Colors, position, branding |
| Shopify integration | Native MCP for Shopify order/product data |
| URL scraping | Add knowledge from webpage URL |
| .doc/.docx support | More file types |

## 15.4 V3 - Scale & Enterprise

**Goal:** Team features, advanced capabilities

| Feature | Description |
|---------|-------------|
| Team collaboration | Invite team members |
| Human handoff | Escalate to live support |
| More LLM options | Claude, Llama, etc. |
| Webhooks | Notify on events |
| White-label widget | Remove branding |
| Advanced analytics | Sentiment, topics, trends |

*Note: "Multiple chatbots" moved to Immediate Priority (15.2)*

---

# 16. Success Metrics

## 16.1 Product Metrics

| Metric | Target (V1) |
|--------|-------------|
| Time to first chatbot | <20 minutes |
| Setup completion rate | >70% |
| Chat response accuracy | >80% (subjective) |
| Widget load time | <2 seconds |
| Chat response time | <5 seconds |

## 16.2 Business Metrics (Post-Launch)

| Metric | Target |
|--------|--------|
| Signups | Track |
| Active projects | Track |
| Messages per project | Track |
| MCP installations | Track |
| Churn rate | <10% monthly |

---

# 17. Open Questions

## 17.1 Product Questions
- [ ] What should the product be named?
- [x] ~~Should V1 support multiple chatbots per account?~~ **RESOLVED (Dec 2024):** Yes - promoted to Immediate Priority as `multiple-projects` feature
- [ ] What's the free tier limit (messages, knowledge size)?
- [x] ~~Should we support conversation handoff to email in V1?~~ **RESOLVED (Dec 2024):** Yes - added as `lead-capture` feature (email capture when chatbot can't answer)

## 17.2 Technical Questions
- [ ] Which queue system for background jobs? (BullMQ, Supabase Edge Functions)
- [ ] CDN for widget hosting? (Cloudflare, Vercel Edge)
- [ ] How to handle very large knowledge bases? (chunk limits, summarization)
- [ ] Monitoring/alerting setup? (Sentry, Datadog)

## 17.3 Go-to-Market Questions
- [ ] Launch on Product Hunt?
- [ ] Pricing tiers and amounts?
- [ ] Partnership approach with Lovable/Bolt?
- [ ] Documentation and tutorials scope?

---

# Appendix

## A. Glossary

| Term | Definition |
|------|------------|
| **RAG** | Retrieval Augmented Generation - using vector search to find relevant content before generating response |
| **MCP** | Model Context Protocol - standard for AI tools to interact with external systems |
| **pgvector** | PostgreSQL extension for vector similarity search |
| **Embedding** | Vector representation of text for semantic search |
| **Chunk** | Segment of text broken down for embedding/retrieval |
| **Tool calling** | LLM's ability to invoke external functions/APIs |
| **Magic link** | Passwordless auth via email link |
| **Shadow DOM** | Browser API for style encapsulation |

## B. Reference Links

- [Supabase Documentation](https://supabase.com/docs)
- [OpenAI API Reference](https://platform.openai.com/docs)
- [MCP Specification](https://modelcontextprotocol.io)
- [pgvector GitHub](https://github.com/pgvector/pgvector)
- [shadcn/ui Components](https://ui.shadcn.com)
- [Lovable MCP Docs](https://docs.lovable.dev/integrations/mcp-servers)

---

**Document Version:** 1.1
**Last Updated:** December 2024
**Author:** Product Team

---

## Changelog

### v1.1 (December 2024)
- **Section 15.1**: Marked V1 (MVP) as COMPLETED with all features done
- **Section 15.2**: Added new "Immediate Priority" section with:
  - `chat-analytics` (completed)
  - `multiple-projects` (promoted from V3)
  - `lead-capture` (NEW feature)
- **Section 15.3**: Renumbered V2 features (removed chat-analytics, now in 15.2)
- **Section 15.4**: Renumbered V3 features (removed multiple-chatbots, now in 15.2)
- **Section 17.1**: Resolved two open questions regarding multi-project and email handoff

---

*End of Product Specification Document*
