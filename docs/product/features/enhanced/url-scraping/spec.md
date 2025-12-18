# Feature: URL Scraping

## Overview

**Feature ID**: `url-scraping`
**Category**: Enhanced (V2)
**Priority**: P1 (Post-MVP Enhancement)
**Complexity**: M (Medium)
**Estimated Effort**: 3-4 days

### Summary
Allows business owners to add knowledge to their chatbot by simply providing a webpage URL. The system automatically fetches, cleans, chunks, and indexes the content from the URL, making it much easier to populate the knowledge base compared to manual text entry.

### Dependencies
- `knowledge-base` - Must use same chunking/embedding pipeline
- `dashboard` - UI for adding URLs

### Success Criteria
- [ ] Add knowledge from single URL
- [ ] Automatic content extraction and cleaning
- [ ] Preview extracted content before saving
- [ ] Handle common webpage formats (HTML, blog posts, docs)
- [ ] Support for authenticated pages (optional)
- [ ] Bulk URL import (CSV/list)
- [ ] Success rate >90% for standard webpages

---

## User Stories

### Primary User Story
> As a business owner, I want to add content from my website pages to my chatbot by just pasting URLs instead of copying and pasting text.

### Additional Stories
1. As a business owner, I want to import my entire FAQ page so my chatbot knows all the answers.
2. As a business owner, I want to add content from my blog posts so customers can ask about topics I've written about.
3. As a business owner, I want to bulk import multiple URLs so I can quickly populate my knowledge base.

---

## Functional Requirements

### URL Scraping

| ID | Requirement | Priority | Notes |
|----|-------------|----------|-------|
| URL-001 | Accept single URL input | Must Have | Validate URL format |
| URL-002 | Fetch and parse HTML content | Must Have | Follow redirects |
| URL-003 | Extract main content (remove nav/footer) | Must Have | Use readability algorithm |
| URL-004 | Clean and format text | Must Have | Remove scripts, styles |
| URL-005 | Preview extracted content | Must Have | Before saving |
| URL-006 | Chunk and embed content | Must Have | Same as manual upload |
| URL-007 | Store source URL metadata | Must Have | For reference |
| URL-008 | Bulk URL import | Should Have | CSV or line-separated |
| URL-009 | Handle authentication | Nice to Have | Basic auth, cookies |
| URL-010 | Respect robots.txt | Should Have | Ethical scraping |

---

## UI Mockup

```
┌─────────────────────────────────────────────────────────────┐
│  Add Knowledge from URL                                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Enter webpage URL to extract content                        │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ https://example.com/faq                            │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  [Fetch Content]                                             │
│                                                               │
│  ─────────────────────────────────────────────────────       │
│                                                               │
│  Preview                                                      │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Title: Frequently Asked Questions                    │    │
│  │                                                      │    │
│  │ Content (2,450 words):                               │    │
│  │                                                      │    │
│  │ Q: What's your return policy?                        │    │
│  │ A: We accept returns within 30 days of purchase...  │    │
│  │                                                      │    │
│  │ Q: Do you ship internationally?                      │    │
│  │ A: Yes, we ship to over 100 countries worldwide...  │    │
│  │                                                      │    │
│  │ [Show full content ↓]                                │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  This will create ~12 knowledge chunks                       │
│                                                               │
│  [Cancel]  [Add to Knowledge Base]                           │
│                                                               │
│  ─────────────────────────────────────────────────────       │
│                                                               │
│  Bulk Import                                                  │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Enter one URL per line:                              │    │
│  │                                                      │    │
│  │ https://example.com/page1                            │    │
│  │ https://example.com/page2                            │    │
│  │ https://example.com/page3                            │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  [Import All URLs]                                           │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## Technical Approach

### Database Schema

```sql
-- knowledge_sources table (extends existing)
ALTER TABLE knowledge_sources ADD COLUMN source_url TEXT;
ALTER TABLE knowledge_sources ADD COLUMN fetched_at TIMESTAMP;
ALTER TABLE knowledge_sources ADD COLUMN content_hash TEXT; -- For detecting updates

-- scrape_jobs table (for async processing)
CREATE TABLE scrape_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id),
  url TEXT NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  error_message TEXT,
  extracted_content TEXT,
  word_count INTEGER,
  chunk_count INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);
```

### API Endpoints

```typescript
// POST /api/knowledge/:projectId/scrape
// Initiate URL scraping
{
  "url": "https://example.com/faq"
}

// Response:
{
  "jobId": "job_abc123",
  "status": "processing"
}

// GET /api/knowledge/:projectId/scrape/:jobId
// Check scraping status
{
  "status": "completed",
  "extractedContent": "...",
  "wordCount": 2450,
  "estimatedChunks": 12,
  "title": "Frequently Asked Questions"
}

// POST /api/knowledge/:projectId/scrape/:jobId/save
// Save scraped content to knowledge base
{
  "approve": true
}

// POST /api/knowledge/:projectId/scrape/bulk
// Bulk import URLs
{
  "urls": [
    "https://example.com/page1",
    "https://example.com/page2"
  ]
}
```

### Web Scraping Service

```typescript
// apps/api/src/services/url-scraper.ts
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import fetch from 'node-fetch';

interface ScrapedContent {
  url: string;
  title: string;
  content: string;
  wordCount: number;
  html: string;
}

async function scrapeUrl(url: string): Promise<ScrapedContent> {
  // 1. Validate URL
  const urlObj = new URL(url); // Throws if invalid

  // 2. Check robots.txt (simplified)
  const robotsAllowed = await checkRobotsTxt(url);
  if (!robotsAllowed) {
    throw new Error('URL disallows scraping via robots.txt');
  }

  // 3. Fetch HTML
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'ChatbotScraper/1.0 (+https://chatbot.com/bot)',
    },
    redirect: 'follow',
    timeout: 15000,
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const html = await response.text();

  // 4. Parse with Readability
  const dom = new JSDOM(html, { url });
  const reader = new Readability(dom.window.document);
  const article = reader.parse();

  if (!article) {
    throw new Error('Failed to extract content from page');
  }

  // 5. Clean content
  const cleanContent = cleanText(article.textContent);
  const wordCount = cleanContent.split(/\s+/).length;

  return {
    url,
    title: article.title,
    content: cleanContent,
    wordCount,
    html: article.content,
  };
}

function cleanText(text: string): string {
  return text
    .replace(/\s+/g, ' ') // Collapse whitespace
    .replace(/\n{3,}/g, '\n\n') // Max 2 newlines
    .trim();
}

async function checkRobotsTxt(url: string): Promise<boolean> {
  try {
    const urlObj = new URL(url);
    const robotsUrl = `${urlObj.protocol}//${urlObj.host}/robots.txt`;

    const response = await fetch(robotsUrl, { timeout: 5000 });
    if (!response.ok) return true; // No robots.txt, allow

    const robotsTxt = await response.text();

    // Simple check: look for Disallow in User-agent: * section
    // (Full implementation should use a robots.txt parser library)
    const userAgentSection = robotsTxt.match(/User-agent: \*\n(.*?)\n\n/s);
    if (!userAgentSection) return true;

    const disallows = userAgentSection[1].match(/Disallow: (.+)/g);
    if (!disallows) return true;

    for (const disallow of disallows) {
      const path = disallow.replace('Disallow:', '').trim();
      if (urlObj.pathname.startsWith(path)) {
        return false;
      }
    }

    return true;
  } catch (error) {
    console.warn('Error checking robots.txt:', error);
    return true; // Allow on error
  }
}
```

### Integration with Knowledge Base

```typescript
// apps/api/src/services/url-to-knowledge.ts
async function saveScrapedContent(
  projectId: string,
  jobId: string
): Promise<void> {
  // Get scrape job
  const job = await getScrapeJob(jobId);
  if (!job || job.status !== 'completed') {
    throw new Error('Scrape job not completed');
  }

  // Create knowledge source
  const source = await createKnowledgeSource({
    projectId,
    name: job.title || job.url,
    type: 'url',
    sourceUrl: job.url,
    fetchedAt: new Date(),
  });

  // Chunk content (reuse existing chunking logic)
  const chunks = await chunkText(job.extractedContent, {
    maxChunkSize: 1000,
    overlap: 200,
  });

  // Embed and save chunks
  await embedAndSaveChunks(projectId, source.id, chunks);

  // Update job status
  await updateScrapeJob(jobId, {
    status: 'completed',
    chunkCount: chunks.length,
  });
}
```

### Bulk Import Handler

```typescript
// apps/api/src/services/bulk-scrape.ts
async function bulkScrapeUrls(
  projectId: string,
  urls: string[]
): Promise<BulkScrapeResult> {
  const results = {
    total: urls.length,
    successful: 0,
    failed: 0,
    jobs: [] as ScrapeJob[],
  };

  // Create jobs for each URL
  for (const url of urls) {
    try {
      const job = await createScrapeJob(projectId, url);
      results.jobs.push(job);

      // Process async (queue to background worker)
      processUrlScrapeInBackground(job.id);
    } catch (error) {
      results.failed++;
      console.error(`Failed to create job for ${url}:`, error);
    }
  }

  return results;
}
```

---

## Acceptance Criteria

### Definition of Done
- [ ] Single URL scraping works for standard webpages
- [ ] Content extraction removes navigation and boilerplate
- [ ] Preview shows extracted content before saving
- [ ] Scraped content chunks and embeds correctly
- [ ] Source URL stored with knowledge chunks
- [ ] Bulk import accepts multiple URLs
- [ ] Respects robots.txt
- [ ] Success rate >90% for common sites

### Demo Checklist
- [ ] Paste FAQ page URL and fetch content
- [ ] Preview extracted content
- [ ] Save to knowledge base
- [ ] Verify chatbot can answer from scraped content
- [ ] Bulk import 5 URLs
- [ ] Show robots.txt compliance

---

## Edge Cases

| # | Scenario | Expected Behavior |
|---|----------|-------------------|
| 1 | Invalid URL format | Show validation error immediately |
| 2 | URL returns 404 | Show "Page not found" error |
| 3 | URL behind paywall | Fail gracefully with error message |
| 4 | JavaScript-heavy SPA | Extract what's in initial HTML |
| 5 | Very large page (>100KB) | Process but warn about size |
| 6 | robots.txt disallows | Respect and show error |
| 7 | No readable content | Show "No content found" error |

---

## Performance Requirements

| Metric | Target |
|--------|--------|
| URL fetch time | <5s |
| Content extraction | <2s |
| Total scrape time | <10s |
| Bulk import (10 URLs) | <60s |

---

## Changelog

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | December 2024 | Product Team | Initial spec for V2 |
