# Feature: URL Scraping (Website Import)

## Overview

**Feature ID**: `url-scraping`
**Category**: Enhanced (V2) → Promoted to Immediate Priority
**Priority**: P0 (Critical for Value Proposition)
**Complexity**: M (Medium)
**Estimated Effort**: 4-5 days

### Summary

Allow business owners to train their chatbot by simply entering their website URL. The system crawls the website, extracts content from all pages, uses an LLM to structure and clean the content, and imports it into the knowledge base. This is the **#1 feature** for achieving our "works in 15 minutes" value proposition.

### Dependencies

- `knowledge-base` ✅ - Reuses existing chunking/embedding pipeline
- `chat-engine` ✅ - Uses same RAG infrastructure

### Why This Feature Matters

From user research:
> "Multiple Reddit posts about wanting to 'just enter a URL' and have the bot trained."

Current friction:
- Users must manually copy/paste content
- Users must upload files
- Users must write knowledge manually

With URL scraping:
- Enter website URL → Bot crawls and trains → Done
- **15-minute setup becomes real, not aspirational**

---

## User Stories

### Primary User Story
> As a small business owner, I want to enter my website URL and have my chatbot automatically learn from all my pages, so I don't have to manually copy content.

### Additional Stories
1. As a business owner, I want my FAQ page automatically imported so customers get instant answers.
2. As a business owner, I want the content cleaned and structured for better chatbot responses.
3. As a business owner, I want to see what was imported before it's saved.

---

## User Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER FLOW                                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  STEP 1: ENTER URL                                                  │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │  Import from Website                                        │    │
│  │                                                             │    │
│  │  Enter your website URL and we'll automatically import     │    │
│  │  content from your pages.                                   │    │
│  │                                                             │    │
│  │  ┌─────────────────────────────────────────────────────┐   │    │
│  │  │ https://mybusiness.com                              │   │    │
│  │  └─────────────────────────────────────────────────────┘   │    │
│  │                                                             │    │
│  │  We'll scan up to 10 pages from your website.              │    │
│  │                                                             │    │
│  │  [Cancel]                              [Scan Website]       │    │
│  └────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  STEP 2: CRAWLING PROGRESS                                          │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │  Scanning your website...                                   │    │
│  │                                                             │    │
│  │  🔄 Discovering pages...                                   │    │
│  │  ████████████░░░░░░░░ 6/10 pages found                     │    │
│  │                                                             │    │
│  │  Pages found:                                               │    │
│  │  • /faq                                                     │    │
│  │  • /about                                                   │    │
│  │  • /returns                                                 │    │
│  │  • /shipping                                                │    │
│  │  • /contact                                                 │    │
│  │  • /products                                                │    │
│  │                                                             │    │
│  │  [Cancel]                                                   │    │
│  └────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  STEP 3: LLM STRUCTURING                                            │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │  Structuring content...                                     │    │
│  │                                                             │    │
│  │  🤖 Processing 6 pages with AI...                          │    │
│  │  ████████░░░░░░░░░░░░ 3/6 pages processed                  │    │
│  │                                                             │    │
│  │  • Extracting key information                               │    │
│  │  • Organizing Q&A pairs                                     │    │
│  │  • Removing boilerplate                                     │    │
│  │                                                             │    │
│  └────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  STEP 4: PREVIEW & CONFIRM                                          │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │  Review imported content                                    │    │
│  │                                                             │    │
│  │  Found 6 pages with 8,450 words total                      │    │
│  │  This will create 6 knowledge sources (~45 chunks)         │    │
│  │                                                             │    │
│  │  ┌─────────────────────────────────────────────────────┐   │    │
│  │  │ 📄 FAQ - mybusiness.com                              │   │    │
│  │  │    2,450 words • 12 Q&A pairs extracted             │   │    │
│  │  │    ─────────────────────────────────────────────    │   │    │
│  │  │    Q: What is your return policy?                   │   │    │
│  │  │    A: We accept returns within 30 days of...        │   │    │
│  │  │    [Show more...]                                   │   │    │
│  │  └─────────────────────────────────────────────────────┘   │    │
│  │  ┌─────────────────────────────────────────────────────┐   │    │
│  │  │ 📄 About Us - mybusiness.com                         │   │    │
│  │  │    890 words • Company overview                     │   │    │
│  │  └─────────────────────────────────────────────────────┘   │    │
│  │  ┌─────────────────────────────────────────────────────┐   │    │
│  │  │ 📄 Return Policy - mybusiness.com                    │   │    │
│  │  │    1,200 words • Policy details                     │   │    │
│  │  └─────────────────────────────────────────────────────┘   │    │
│  │  [+ 3 more pages...]                                       │    │
│  │                                                             │    │
│  │  [Cancel]                    [Import 6 Pages]              │    │
│  └────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  STEP 5: IMPORTING                                                  │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │  Importing content...                                       │    │
│  │                                                             │    │
│  │  ████████████████░░░░ 4/6 pages imported                   │    │
│  │                                                             │    │
│  │  ✅ FAQ - mybusiness.com                                   │    │
│  │  ✅ About Us - mybusiness.com                              │    │
│  │  ✅ Return Policy - mybusiness.com                         │    │
│  │  🔄 Shipping - mybusiness.com                              │    │
│  │  ⏳ Contact - mybusiness.com                                │    │
│  │  ⏳ Products - mybusiness.com                               │    │
│  │                                                             │    │
│  └────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  STEP 6: SUCCESS                                                    │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │  ✅ Import complete!                                        │    │
│  │                                                             │    │
│  │  Successfully imported 6 pages from mybusiness.com         │    │
│  │  Your chatbot can now answer questions about:              │    │
│  │  • FAQ (12 Q&A pairs)                                      │    │
│  │  • Return Policy                                           │    │
│  │  • Shipping Information                                    │    │
│  │  • And more...                                             │    │
│  │                                                             │    │
│  │  💡 Tip: Test your chatbot in the Playground!              │    │
│  │                                                             │    │
│  │  [Go to Playground]                          [Done]        │    │
│  └────────────────────────────────────────────────────────────┘    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Functional Requirements

### URL Input & Validation

| ID | Requirement | Priority | Notes |
|----|-------------|----------|-------|
| URL-001 | Accept single website URL | Must Have | Homepage or any page |
| URL-002 | Validate URL format | Must Have | Must be valid HTTP/HTTPS URL |
| URL-003 | Show helpful error for invalid URLs | Must Have | "Please enter a valid website URL" |
| URL-004 | Auto-add https:// if missing | Should Have | User can type "mybusiness.com" |

### Website Crawling (Firecrawl Integration)

| ID | Requirement | Priority | Notes |
|----|-------------|----------|-------|
| URL-005 | Crawl website using Firecrawl API | Must Have | Use /v1/crawl endpoint |
| URL-006 | Limit to MAX_CRAWL_PAGES (env: 10) | Must Have | Prevent runaway crawls |
| URL-007 | Show real-time crawl progress | Must Have | Pages discovered, pages processed |
| URL-008 | Handle crawl errors gracefully | Must Have | Timeout, blocked, no content |
| URL-009 | Respect robots.txt | Should Have | Firecrawl handles this |
| URL-010 | Allow user to cancel crawl | Should Have | Stop button during crawl |

### LLM Content Structuring

| ID | Requirement | Priority | Notes |
|----|-------------|----------|-------|
| URL-011 | Process each page through LLM | Must Have | GPT-4o-mini for cost efficiency |
| URL-012 | Extract Q&A pairs from FAQ pages | Must Have | Detect and structure Q&A format |
| URL-013 | Remove navigation/boilerplate | Must Have | Clean content for RAG |
| URL-014 | Organize content by topic | Should Have | Group related information |
| URL-015 | Generate page title/summary | Must Have | For source naming |
| URL-016 | Show structuring progress | Must Have | "Processing 3/6 pages..." |

### Preview & Confirmation

| ID | Requirement | Priority | Notes |
|----|-------------|----------|-------|
| URL-017 | Show all pages found with preview | Must Have | Expandable content preview |
| URL-018 | Display word count per page | Must Have | Help user understand scope |
| URL-019 | Show estimated chunks | Should Have | "~45 chunks will be created" |
| URL-020 | Allow user to cancel before import | Must Have | Don't import without consent |

### Import & Storage

| ID | Requirement | Priority | Notes |
|----|-------------|----------|-------|
| URL-021 | Create one knowledge source per page | Must Have | Better RAG context |
| URL-022 | Name sources as "[Page Title] - [domain]" | Must Have | e.g., "FAQ - mybusiness.com" |
| URL-023 | Set source type to "url" | Must Have | Distinguish from text/file/pdf |
| URL-024 | Store source URL in metadata | Must Have | For reference and re-crawl |
| URL-025 | Process through existing RAG pipeline | Must Have | Chunking, context, embedding |
| URL-026 | Show import progress per page | Must Have | Real-time status updates |
| URL-027 | Handle partial failures | Should Have | Import successful pages, report failed |

### Limits & Guardrails

| ID | Requirement | Priority | Notes |
|----|-------------|----------|-------|
| URL-028 | Enforce MAX_CRAWL_PAGES limit | Must Have | Default: 10 (env configurable) |
| URL-029 | Check source limit before import | Must Have | MAX_SOURCES_PER_PROJECT = 20 |
| URL-030 | Warn if import would exceed limit | Must Have | "You have 15/20 sources, importing 6 pages would exceed limit" |
| URL-031 | Max content size per page | Should Have | Skip pages > 50KB text |

---

## Technical Architecture

### System Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                     URL SCRAPING ARCHITECTURE                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────┐     ┌──────────────┐     ┌─────────────────────┐     │
│  │ Frontend │────▶│ API Backend  │────▶│ Firecrawl API       │     │
│  │ (Next.js)│     │ (Express)    │     │ (External Service)  │     │
│  └──────────┘     └──────────────┘     └─────────────────────┘     │
│       │                  │                       │                  │
│       │                  │                       │                  │
│       │           ┌──────▼──────┐               │                  │
│       │           │  Scrape Job │◀──────────────┘                  │
│       │           │  (In Memory)│   Crawl results                  │
│       │           └──────┬──────┘                                  │
│       │                  │                                          │
│       │           ┌──────▼──────┐                                  │
│       │           │ LLM Service │  Structure content               │
│       │           │ (GPT-4o-mini)│  Extract Q&A pairs              │
│       │           └──────┬──────┘                                  │
│       │                  │                                          │
│       │           ┌──────▼──────┐                                  │
│       │           │  Preview    │  Return structured pages         │
│       │           │  Response   │  for user confirmation           │
│       │           └──────┬──────┘                                  │
│       │                  │                                          │
│       │  User confirms   │                                          │
│       │◀─────────────────┘                                          │
│       │                                                             │
│       │           ┌──────▼──────┐                                  │
│       └──────────▶│ Knowledge   │  Existing pipeline:              │
│                   │ Pipeline    │  Chunk → Context → Embed → Store │
│                   └──────┬──────┘                                  │
│                          │                                          │
│                   ┌──────▼──────┐                                  │
│                   │  Supabase   │  knowledge_sources               │
│                   │  pgvector   │  knowledge_chunks                │
│                   └─────────────┘                                  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Database Schema Changes

```sql
-- Extend knowledge_sources table for URL type
-- (No schema changes needed - use existing columns)

-- knowledge_sources table already has:
-- - id, project_id, name, type, content, status, chunk_count, error, created_at
--
-- For URL sources:
-- - type = 'url'
-- - content = structured markdown from LLM
-- - Add metadata column for source_url

-- Add source_url column to knowledge_sources
ALTER TABLE knowledge_sources
ADD COLUMN IF NOT EXISTS source_url TEXT;

-- Add scraped_at timestamp
ALTER TABLE knowledge_sources
ADD COLUMN IF NOT EXISTS scraped_at TIMESTAMP WITH TIME ZONE;
```

### Environment Variables

```bash
# .env.example additions

# Firecrawl API
FIRECRAWL_API_KEY=fc-xxxxxxxxxxxxxxxxxxxx

# Crawl limits
MAX_CRAWL_PAGES=10
```

### API Endpoints

#### POST /api/knowledge/scrape

Initiate website scraping. Returns job ID for polling.

```typescript
// Request
POST /api/knowledge/scrape?projectId=xxx
{
  "url": "https://mybusiness.com"
}

// Response (202 Accepted)
{
  "jobId": "scrape_abc123",
  "status": "crawling",
  "message": "Scanning website..."
}
```

#### GET /api/knowledge/scrape/:jobId

Poll for scrape job status and results.

```typescript
// Response - Crawling
{
  "jobId": "scrape_abc123",
  "status": "crawling",
  "progress": {
    "pagesFound": 6,
    "pagesProcessed": 4,
    "maxPages": 10
  },
  "pages": [
    { "url": "/faq", "status": "found" },
    { "url": "/about", "status": "found" }
  ]
}

// Response - Structuring
{
  "jobId": "scrape_abc123",
  "status": "structuring",
  "progress": {
    "pagesTotal": 6,
    "pagesStructured": 3
  }
}

// Response - Ready for Preview
{
  "jobId": "scrape_abc123",
  "status": "ready",
  "domain": "mybusiness.com",
  "pages": [
    {
      "id": "page_1",
      "url": "https://mybusiness.com/faq",
      "title": "FAQ",
      "wordCount": 2450,
      "preview": "Q: What is your return policy?\nA: We accept returns within 30 days...",
      "structuredContent": "## Frequently Asked Questions\n\n### Return Policy\n...",
      "estimatedChunks": 12
    },
    {
      "id": "page_2",
      "url": "https://mybusiness.com/about",
      "title": "About Us",
      "wordCount": 890,
      "preview": "We are a family-owned business...",
      "structuredContent": "## About Us\n\nWe are a family-owned business...",
      "estimatedChunks": 5
    }
  ],
  "totals": {
    "pages": 6,
    "words": 8450,
    "estimatedChunks": 45
  }
}

// Response - Error
{
  "jobId": "scrape_abc123",
  "status": "failed",
  "error": {
    "code": "CRAWL_FAILED",
    "message": "Unable to access website. Please check the URL and try again."
  }
}
```

#### POST /api/knowledge/scrape/:jobId/import

Confirm and import scraped content.

```typescript
// Request
POST /api/knowledge/scrape/:jobId/import?projectId=xxx
{
  "confirm": true
}

// Response (202 Accepted)
{
  "status": "importing",
  "totalPages": 6
}
```

#### GET /api/knowledge/scrape/:jobId/import-status

Poll for import progress.

```typescript
// Response
{
  "status": "importing", // or "completed" or "failed"
  "progress": {
    "total": 6,
    "completed": 4,
    "failed": 0
  },
  "pages": [
    { "title": "FAQ - mybusiness.com", "status": "completed", "sourceId": "src_123" },
    { "title": "About Us - mybusiness.com", "status": "completed", "sourceId": "src_124" },
    { "title": "Return Policy - mybusiness.com", "status": "completed", "sourceId": "src_125" },
    { "title": "Shipping - mybusiness.com", "status": "importing" },
    { "title": "Contact - mybusiness.com", "status": "pending" },
    { "title": "Products - mybusiness.com", "status": "pending" }
  ]
}
```

#### DELETE /api/knowledge/scrape/:jobId

Cancel an in-progress scrape job.

```typescript
// Response
{
  "status": "cancelled"
}
```

---

## Service Implementation

### Firecrawl Service

```typescript
// apps/api/src/services/firecrawl.ts

import FirecrawlApp from '@mendable/firecrawl-js';

const firecrawl = new FirecrawlApp({
  apiKey: process.env.FIRECRAWL_API_KEY
});

interface CrawlOptions {
  maxPages: number;
  onProgress?: (pagesFound: number, pagesProcessed: number) => void;
}

interface CrawledPage {
  url: string;
  title: string;
  markdown: string;
  metadata?: {
    description?: string;
    language?: string;
  };
}

interface CrawlResult {
  success: boolean;
  pages: CrawledPage[];
  error?: string;
}

export async function crawlWebsite(
  url: string,
  options: CrawlOptions
): Promise<CrawlResult> {
  try {
    // Validate URL
    const urlObj = new URL(url);

    // Start crawl
    const crawlResponse = await firecrawl.crawlUrl(url, {
      limit: options.maxPages,
      scrapeOptions: {
        formats: ['markdown'],
        onlyMainContent: true, // Remove nav, footer, etc.
      }
    });

    if (!crawlResponse.success) {
      return {
        success: false,
        pages: [],
        error: crawlResponse.error || 'Crawl failed'
      };
    }

    // Map results to our format
    const pages: CrawledPage[] = crawlResponse.data.map((page: any) => ({
      url: page.url || page.sourceURL,
      title: page.metadata?.title || extractTitleFromUrl(page.url),
      markdown: page.markdown,
      metadata: {
        description: page.metadata?.description,
        language: page.metadata?.language
      }
    }));

    return {
      success: true,
      pages
    };

  } catch (error) {
    console.error('Firecrawl error:', error);
    return {
      success: false,
      pages: [],
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

function extractTitleFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    const path = urlObj.pathname;

    if (path === '/' || path === '') {
      return 'Home';
    }

    // Convert /about-us to "About Us"
    const lastSegment = path.split('/').filter(Boolean).pop() || 'Page';
    return lastSegment
      .replace(/-/g, ' ')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
  } catch {
    return 'Page';
  }
}
```

### Content Structuring Service

```typescript
// apps/api/src/services/content-structurer.ts

import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

interface StructuredPage {
  title: string;
  content: string;
  wordCount: number;
  summary: string;
  hasQAPairs: boolean;
}

const STRUCTURING_PROMPT = `You are a content structuring assistant. Your job is to take raw webpage content and restructure it for a chatbot knowledge base.

Instructions:
1. Remove any navigation, footer, cookie notices, or boilerplate content
2. If this is an FAQ page, extract and format as clear Q&A pairs
3. Organize content with clear headers and sections
4. Keep all factual information - don't summarize away important details
5. Use markdown formatting for structure
6. Generate a clear, descriptive title for this page

Output format:
---
TITLE: [Descriptive page title]
SUMMARY: [One sentence summary of what this page is about]
HAS_QA_PAIRS: [true/false]
---

[Structured markdown content here]

If this is an FAQ or Q&A page, format questions and answers like:
### Q: [Question]
[Answer]

For other content, use appropriate headers and paragraphs.`;

export async function structurePageContent(
  url: string,
  rawMarkdown: string,
  originalTitle: string
): Promise<StructuredPage> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: STRUCTURING_PROMPT },
        {
          role: 'user',
          content: `URL: ${url}\nOriginal Title: ${originalTitle}\n\nContent:\n${rawMarkdown.slice(0, 15000)}` // Limit input size
        }
      ],
      temperature: 0.3,
      max_tokens: 4000
    });

    const output = response.choices[0]?.message?.content || '';

    // Parse the structured output
    const titleMatch = output.match(/TITLE:\s*(.+)/);
    const summaryMatch = output.match(/SUMMARY:\s*(.+)/);
    const hasQAMatch = output.match(/HAS_QA_PAIRS:\s*(true|false)/i);

    // Extract content after the metadata block
    const contentMatch = output.match(/---\n[\s\S]*?---\n([\s\S]*)/);
    const content = contentMatch ? contentMatch[1].trim() : output;

    return {
      title: titleMatch ? titleMatch[1].trim() : originalTitle,
      content,
      wordCount: content.split(/\s+/).length,
      summary: summaryMatch ? summaryMatch[1].trim() : '',
      hasQAPairs: hasQAMatch ? hasQAMatch[1].toLowerCase() === 'true' : false
    };

  } catch (error) {
    console.error('Content structuring error:', error);

    // Fallback: return cleaned raw content
    return {
      title: originalTitle,
      content: rawMarkdown,
      wordCount: rawMarkdown.split(/\s+/).length,
      summary: '',
      hasQAPairs: false
    };
  }
}

export async function structureAllPages(
  pages: Array<{ url: string; markdown: string; title: string }>,
  onProgress?: (completed: number, total: number) => void
): Promise<StructuredPage[]> {
  const results: StructuredPage[] = [];

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const structured = await structurePageContent(page.url, page.markdown, page.title);
    results.push(structured);

    if (onProgress) {
      onProgress(i + 1, pages.length);
    }
  }

  return results;
}
```

### Scrape Job Manager

```typescript
// apps/api/src/services/scrape-job-manager.ts

import { crawlWebsite, CrawledPage } from './firecrawl';
import { structureAllPages, StructuredPage } from './content-structurer';

type ScrapeJobStatus =
  | 'crawling'
  | 'structuring'
  | 'ready'
  | 'importing'
  | 'completed'
  | 'failed'
  | 'cancelled';

interface ScrapeJob {
  id: string;
  projectId: string;
  url: string;
  domain: string;
  status: ScrapeJobStatus;
  error?: string;
  crawlProgress: {
    pagesFound: number;
    pagesProcessed: number;
    maxPages: number;
  };
  structureProgress: {
    total: number;
    completed: number;
  };
  pages: Array<{
    id: string;
    url: string;
    title: string;
    wordCount: number;
    preview: string;
    structuredContent: string;
    estimatedChunks: number;
    importStatus?: 'pending' | 'importing' | 'completed' | 'failed';
    sourceId?: string;
  }>;
  createdAt: Date;
  expiresAt: Date;
}

// In-memory job storage (consider Redis for production)
const jobs = new Map<string, ScrapeJob>();

// Clean up expired jobs every 5 minutes
setInterval(() => {
  const now = new Date();
  for (const [id, job] of jobs) {
    if (job.expiresAt < now) {
      jobs.delete(id);
    }
  }
}, 5 * 60 * 1000);

export function createScrapeJob(projectId: string, url: string): ScrapeJob {
  const urlObj = new URL(url);
  const jobId = `scrape_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const job: ScrapeJob = {
    id: jobId,
    projectId,
    url,
    domain: urlObj.hostname,
    status: 'crawling',
    crawlProgress: {
      pagesFound: 0,
      pagesProcessed: 0,
      maxPages: parseInt(process.env.MAX_CRAWL_PAGES || '10', 10)
    },
    structureProgress: {
      total: 0,
      completed: 0
    },
    pages: [],
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 30 * 60 * 1000) // 30 min expiry
  };

  jobs.set(jobId, job);
  return job;
}

export function getJob(jobId: string): ScrapeJob | undefined {
  return jobs.get(jobId);
}

export function updateJob(jobId: string, updates: Partial<ScrapeJob>): void {
  const job = jobs.get(jobId);
  if (job) {
    Object.assign(job, updates);
  }
}

export function deleteJob(jobId: string): void {
  jobs.delete(jobId);
}

export async function executeScrapeJob(jobId: string): Promise<void> {
  const job = jobs.get(jobId);
  if (!job) return;

  try {
    // Step 1: Crawl website
    job.status = 'crawling';

    const crawlResult = await crawlWebsite(job.url, {
      maxPages: job.crawlProgress.maxPages
    });

    if (!crawlResult.success) {
      job.status = 'failed';
      job.error = crawlResult.error;
      return;
    }

    job.crawlProgress.pagesFound = crawlResult.pages.length;
    job.crawlProgress.pagesProcessed = crawlResult.pages.length;

    // Step 2: Structure content with LLM
    job.status = 'structuring';
    job.structureProgress.total = crawlResult.pages.length;

    const structuredPages = await structureAllPages(
      crawlResult.pages.map(p => ({
        url: p.url,
        markdown: p.markdown,
        title: p.title
      })),
      (completed, total) => {
        job.structureProgress.completed = completed;
      }
    );

    // Step 3: Prepare pages for preview
    job.pages = structuredPages.map((page, index) => ({
      id: `page_${index}`,
      url: crawlResult.pages[index].url,
      title: page.title,
      wordCount: page.wordCount,
      preview: page.content.slice(0, 500) + (page.content.length > 500 ? '...' : ''),
      structuredContent: page.content,
      estimatedChunks: Math.ceil(page.wordCount / 200), // Rough estimate
      importStatus: 'pending' as const
    }));

    job.status = 'ready';

  } catch (error) {
    console.error('Scrape job error:', error);
    job.status = 'failed';
    job.error = error instanceof Error ? error.message : 'Unknown error';
  }
}
```

---

## Frontend Implementation

### Add URL Tab to Knowledge Modal

```typescript
// apps/web/components/knowledge/add-knowledge-modal.tsx
// Add new tab: "Import URL"

type InputType = "text" | "file" | "pdf" | "url";

// In TabsList:
<TabsList className="grid w-full grid-cols-4">
  <TabsTrigger value="text">Paste Text</TabsTrigger>
  <TabsTrigger value="file">Upload TXT</TabsTrigger>
  <TabsTrigger value="pdf">Upload PDF</TabsTrigger>
  <TabsTrigger value="url">Import URL</TabsTrigger>
</TabsList>

// New TabsContent for URL
<TabsContent value="url" className="mt-0">
  <UrlImportFlow
    projectId={projectId}
    onSuccess={onSuccess}
    onClose={handleClose}
  />
</TabsContent>
```

### URL Import Flow Component

```typescript
// apps/web/components/knowledge/url-import-flow.tsx

"use client";

import { useState, useEffect } from "react";
import { Button, Input, Progress } from "@chatbot/ui";
import { Globe, Loader2, Check, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import { apiClient } from "@/lib/api-client";

type ImportStep = 'input' | 'crawling' | 'structuring' | 'preview' | 'importing' | 'success' | 'error';

interface UrlImportFlowProps {
  projectId: string;
  onSuccess: () => void;
  onClose: () => void;
}

interface ScrapedPage {
  id: string;
  url: string;
  title: string;
  wordCount: number;
  preview: string;
  estimatedChunks: number;
  importStatus?: string;
  sourceId?: string;
}

interface ScrapeJob {
  jobId: string;
  status: string;
  domain?: string;
  error?: { message: string };
  crawlProgress?: { pagesFound: number; pagesProcessed: number; maxPages: number };
  structureProgress?: { total: number; completed: number };
  pages?: ScrapedPage[];
  totals?: { pages: number; words: number; estimatedChunks: number };
}

export function UrlImportFlow({ projectId, onSuccess, onClose }: UrlImportFlowProps) {
  const [step, setStep] = useState<ImportStep>('input');
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [job, setJob] = useState<ScrapeJob | null>(null);
  const [expandedPage, setExpandedPage] = useState<string | null>(null);

  // Start scraping
  const handleStartScrape = async () => {
    if (!url.trim()) {
      setError('Please enter a website URL');
      return;
    }

    // Add https:// if missing
    let normalizedUrl = url.trim();
    if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
      normalizedUrl = 'https://' + normalizedUrl;
    }

    try {
      new URL(normalizedUrl);
    } catch {
      setError('Please enter a valid website URL');
      return;
    }

    setError(null);
    setStep('crawling');

    try {
      const response = await apiClient(`/api/knowledge/scrape?projectId=${projectId}`, {
        method: 'POST',
        body: JSON.stringify({ url: normalizedUrl })
      });

      setJob(response);
      pollJobStatus(response.jobId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start scraping');
      setStep('error');
    }
  };

  // Poll for job status
  const pollJobStatus = async (jobId: string) => {
    const poll = async () => {
      try {
        const response = await apiClient(`/api/knowledge/scrape/${jobId}?projectId=${projectId}`);
        setJob(response);

        if (response.status === 'crawling') {
          setStep('crawling');
          setTimeout(poll, 1000);
        } else if (response.status === 'structuring') {
          setStep('structuring');
          setTimeout(poll, 1000);
        } else if (response.status === 'ready') {
          setStep('preview');
        } else if (response.status === 'importing') {
          setStep('importing');
          setTimeout(poll, 1000);
        } else if (response.status === 'completed') {
          setStep('success');
        } else if (response.status === 'failed') {
          setError(response.error?.message || 'Scraping failed');
          setStep('error');
        }
      } catch (err) {
        setError('Failed to check scrape status');
        setStep('error');
      }
    };

    poll();
  };

  // Confirm import
  const handleConfirmImport = async () => {
    if (!job) return;

    setStep('importing');

    try {
      await apiClient(`/api/knowledge/scrape/${job.jobId}/import?projectId=${projectId}`, {
        method: 'POST',
        body: JSON.stringify({ confirm: true })
      });

      pollJobStatus(job.jobId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import');
      setStep('error');
    }
  };

  // Cancel scrape
  const handleCancel = async () => {
    if (job && ['crawling', 'structuring'].includes(step)) {
      try {
        await apiClient(`/api/knowledge/scrape/${job.jobId}?projectId=${projectId}`, {
          method: 'DELETE'
        });
      } catch (err) {
        console.error('Failed to cancel:', err);
      }
    }
    onClose();
  };

  // Render based on current step
  const renderStep = () => {
    switch (step) {
      case 'input':
        return (
          <div className="space-y-4">
            <div className="text-center space-y-2">
              <Globe className="h-12 w-12 mx-auto text-primary" />
              <h3 className="font-semibold">Import from Website</h3>
              <p className="text-sm text-muted-foreground">
                Enter your website URL and we'll automatically import content from your pages.
              </p>
            </div>

            <div className="space-y-2">
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://mybusiness.com"
                onKeyDown={(e) => e.key === 'Enter' && handleStartScrape()}
              />
              <p className="text-xs text-muted-foreground">
                We'll scan up to {process.env.NEXT_PUBLIC_MAX_CRAWL_PAGES || 10} pages from your website.
              </p>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button onClick={handleStartScrape}>
                <Globe className="h-4 w-4 mr-2" />
                Scan Website
              </Button>
            </div>
          </div>
        );

      case 'crawling':
        return (
          <div className="space-y-4 text-center">
            <Loader2 className="h-12 w-12 mx-auto text-primary animate-spin" />
            <h3 className="font-semibold">Scanning your website...</h3>
            {job?.crawlProgress && (
              <div className="space-y-2">
                <Progress
                  value={(job.crawlProgress.pagesFound / job.crawlProgress.maxPages) * 100}
                />
                <p className="text-sm text-muted-foreground">
                  Found {job.crawlProgress.pagesFound} pages
                </p>
              </div>
            )}
            <Button variant="outline" onClick={handleCancel}>Cancel</Button>
          </div>
        );

      case 'structuring':
        return (
          <div className="space-y-4 text-center">
            <Loader2 className="h-12 w-12 mx-auto text-primary animate-spin" />
            <h3 className="font-semibold">Structuring content...</h3>
            {job?.structureProgress && (
              <div className="space-y-2">
                <Progress
                  value={(job.structureProgress.completed / job.structureProgress.total) * 100}
                />
                <p className="text-sm text-muted-foreground">
                  Processing {job.structureProgress.completed}/{job.structureProgress.total} pages
                </p>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Extracting key information and organizing content...
            </p>
          </div>
        );

      case 'preview':
        return (
          <div className="space-y-4">
            <div className="text-center space-y-1">
              <h3 className="font-semibold">Review imported content</h3>
              <p className="text-sm text-muted-foreground">
                Found {job?.totals?.pages} pages with {job?.totals?.words?.toLocaleString()} words
              </p>
            </div>

            <div className="max-h-[300px] overflow-y-auto space-y-2 border rounded-lg p-2">
              {job?.pages?.map((page) => (
                <div key={page.id} className="border rounded-lg p-3 bg-muted/30">
                  <div
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => setExpandedPage(expandedPage === page.id ? null : page.id)}
                  >
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      <span className="font-medium">{page.title}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{page.wordCount.toLocaleString()} words</span>
                      {expandedPage === page.id ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </div>
                  </div>
                  {expandedPage === page.id && (
                    <div className="mt-2 pt-2 border-t text-sm text-muted-foreground whitespace-pre-wrap">
                      {page.preview}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <p className="text-sm text-center text-muted-foreground">
              This will create {job?.totals?.pages} knowledge sources (~{job?.totals?.estimatedChunks} chunks)
            </p>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleCancel}>Cancel</Button>
              <Button onClick={handleConfirmImport}>
                Import {job?.totals?.pages} Pages
              </Button>
            </div>
          </div>
        );

      case 'importing':
        return (
          <div className="space-y-4">
            <div className="text-center space-y-1">
              <Loader2 className="h-12 w-12 mx-auto text-primary animate-spin" />
              <h3 className="font-semibold">Importing content...</h3>
            </div>

            <div className="space-y-2">
              {job?.pages?.map((page) => (
                <div key={page.id} className="flex items-center gap-2 text-sm">
                  {page.importStatus === 'completed' ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : page.importStatus === 'importing' ? (
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  ) : page.importStatus === 'failed' ? (
                    <AlertCircle className="h-4 w-4 text-destructive" />
                  ) : (
                    <div className="h-4 w-4 rounded-full border-2" />
                  )}
                  <span className={page.importStatus === 'completed' ? 'text-muted-foreground' : ''}>
                    {page.title}
                  </span>
                </div>
              ))}
            </div>
          </div>
        );

      case 'success':
        return (
          <div className="space-y-4 text-center">
            <div className="h-12 w-12 mx-auto rounded-full bg-green-100 flex items-center justify-center">
              <Check className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="font-semibold">Import complete!</h3>
            <p className="text-sm text-muted-foreground">
              Successfully imported {job?.totals?.pages} pages from {job?.domain}
            </p>
            <div className="flex justify-center gap-2">
              <Button variant="outline" onClick={() => { onSuccess(); onClose(); }}>
                Done
              </Button>
              <Button onClick={() => window.location.href = '/playground'}>
                Test in Playground
              </Button>
            </div>
          </div>
        );

      case 'error':
        return (
          <div className="space-y-4 text-center">
            <div className="h-12 w-12 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <h3 className="font-semibold">Import failed</h3>
            <p className="text-sm text-destructive">{error}</p>
            <div className="flex justify-center gap-2">
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button onClick={() => { setStep('input'); setError(null); }}>
                Try Again
              </Button>
            </div>
          </div>
        );
    }
  };

  return <div className="py-4">{renderStep()}</div>;
}
```

---

## Acceptance Criteria

### Definition of Done

- [ ] User can enter website URL in new "Import URL" tab
- [ ] System crawls website using Firecrawl API
- [ ] Content is structured using LLM (GPT-4o-mini)
- [ ] User sees preview of all pages found
- [ ] User can confirm and import all pages
- [ ] Each page creates separate knowledge source
- [ ] Sources are processed through existing RAG pipeline
- [ ] Progress is shown at each step
- [ ] Errors are handled gracefully
- [ ] Source limit check before import

### Demo Checklist

- [ ] Enter "mybusiness.com" in URL field
- [ ] Watch crawling progress (pages found)
- [ ] Watch structuring progress (AI processing)
- [ ] Review pages in preview
- [ ] Confirm import
- [ ] See sources appear in knowledge list
- [ ] Test chatbot with questions from scraped content
- [ ] Verify source attribution shows URL source

---

## Error Handling

| Error | User Message | Recovery |
|-------|--------------|----------|
| Invalid URL | "Please enter a valid website URL" | Fix URL and retry |
| Crawl timeout | "Website took too long to respond" | Retry or try different URL |
| No content found | "No readable content found on this website" | Try different URL |
| Blocked by robots.txt | "This website doesn't allow scraping" | Manual copy required |
| Source limit exceeded | "You've reached the 20 source limit" | Delete existing sources |
| Firecrawl API error | "Unable to scan website. Please try again." | Retry |

---

## Performance Requirements

| Metric | Target |
|--------|--------|
| Crawl initiation | < 2s |
| Average crawl time (10 pages) | < 30s |
| Content structuring (per page) | < 5s |
| Total import time (10 pages) | < 2 minutes |
| UI responsiveness during polling | No blocking |

---

## Security Considerations

1. **URL Validation**: Prevent SSRF by validating URLs are public HTTP/HTTPS
2. **Rate Limiting**: Limit scrape requests per project/user
3. **Content Sanitization**: Sanitize scraped content before display
4. **API Key Protection**: Firecrawl API key stored in environment only

---

## Future Enhancements (Out of Scope)

- [ ] Scheduled re-crawling (keep knowledge updated)
- [ ] Selective page import (checkboxes)
- [ ] Sitemap import
- [ ] Authentication support (login-protected pages)
- [ ] JavaScript-rendered SPA support

---

## Changelog

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | December 2024 | Product Team | Initial spec for V2 |
| 2.0 | December 2024 | Jordan (PM) | Major rewrite: Firecrawl integration, LLM structuring, multiple sources per page |
