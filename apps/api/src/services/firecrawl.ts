/**
 * Firecrawl Service
 *
 * Handles website crawling using the Firecrawl API.
 * Crawls websites and extracts content as markdown.
 */

import Firecrawl from '@mendable/firecrawl-js';

import { isUrlSafeForFetch, resolveAndValidateUrl } from '../lib/url-guard';

// Initialize Firecrawl client
const firecrawl = new Firecrawl({
  apiKey: process.env.FIRECRAWL_API_KEY || ''
});

export interface CrawlOptions {
  maxPages: number;
}

export interface CrawledPage {
  url: string;
  title: string;
  markdown: string;
  metadata?: {
    description?: string;
    language?: string;
  };
}

export interface CrawlResult {
  success: boolean;
  pages: CrawledPage[];
  error?: string;
}

/**
 * Extract a readable title from a URL path
 */
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

/**
 * Map a Firecrawl Document to our CrawledPage.
 * The per-page URL lives on metadata.sourceURL in SDK v4 (there is no top-level
 * url/sourceURL), so read that first and fall back to the seed URL only as a last resort.
 */
function mapDocToPage(doc: any, seedUrl: string): CrawledPage {
  const pageUrl =
    doc.metadata?.sourceURL || doc.metadata?.url || doc.url || doc.sourceURL || seedUrl;
  return {
    url: pageUrl,
    title: doc.metadata?.title || extractTitleFromUrl(pageUrl),
    markdown: doc.markdown || '',
    metadata: {
      description: doc.metadata?.description,
      language: doc.metadata?.language,
    },
  };
}

function mapDocsToPages(docs: any[], seedUrl: string): CrawledPage[] {
  return docs
    .map((d) => mapDocToPage(d, seedUrl))
    .filter((p) => p.markdown && p.markdown.trim().length > 50); // drop empty/minimal pages
}

export interface LiveCrawlProgress {
  completed: number;
  total: number;
  urls: string[]; // real page URLs discovered so far
}

/**
 * Crawl a website and extract content from all discovered pages
 */
export async function crawlWebsite(
  url: string,
  options: CrawlOptions
): Promise<CrawlResult> {
  try {
    const dnsCheck = await resolveAndValidateUrl(url);
    if (!dnsCheck.ok) {
      return { success: false, pages: [], error: dnsCheck.reason || 'URL blocked' };
    }

    console.log(`[Firecrawl] Starting crawl of ${url} (max ${options.maxPages} pages)`);

    // Start crawl with Firecrawl v1 API
    const crawlResponse = await firecrawl.crawl(url, {
      limit: options.maxPages,
      scrapeOptions: {
        formats: ['markdown'],
        onlyMainContent: true, // Remove nav, footer, etc.
      }
    });

    // Check for completion - Firecrawl v1 uses status instead of success
    const response = crawlResponse as any;
    if (response.status !== 'completed') {
      console.error('[Firecrawl] Crawl failed:', crawlResponse);
      return {
        success: false,
        pages: [],
        error: response.error || 'Crawl failed'
      };
    }

    // Map results to our format (per-page URL comes from metadata.sourceURL).
    const pages: CrawledPage[] = mapDocsToPages(response.data || [], url);

    console.log(`[Firecrawl] Successfully crawled ${pages.length} pages`);

    if (pages.length === 0) {
      return {
        success: false,
        pages: [],
        error: 'No readable content found on this website'
      };
    }

    return {
      success: true,
      pages
    };

  } catch (error) {
    console.error('[Firecrawl] Error:', error);

    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        return {
          success: false,
          pages: [],
          error: 'Firecrawl API key is invalid or missing'
        };
      }
      if (error.message.includes('rate limit')) {
        return {
          success: false,
          pages: [],
          error: 'Rate limit exceeded. Please try again later.'
        };
      }
      return {
        success: false,
        pages: [],
        error: error.message
      };
    }

    return {
      success: false,
      pages: [],
      error: 'Unknown error occurred during crawl'
    };
  }
}

/**
 * Crawl a website with LIVE progress.
 *
 * Uses Firecrawl's async crawl (startCrawl + getCrawlStatus polling) so the caller
 * can surface the real page URLs as they are discovered, instead of the single
 * blocking crawl() that only returns once everything is done. Falls back to the
 * blocking crawl if the async API is unavailable.
 */
export async function crawlWebsiteLive(
  url: string,
  options: CrawlOptions & {
    onProgress?: (p: LiveCrawlProgress) => void;
    pollIntervalMs?: number;
    timeoutMs?: number;
  }
): Promise<CrawlResult> {
  const { maxPages, onProgress } = options;
  const pollIntervalMs = options.pollIntervalMs ?? 1500;
  const timeoutMs = options.timeoutMs ?? 180000;

  try {
    const dnsCheck = await resolveAndValidateUrl(url);
    if (!dnsCheck.ok) {
      return { success: false, pages: [], error: dnsCheck.reason || 'URL blocked' };
    }

    let started: { id: string };
    try {
      started = await firecrawl.startCrawl(url, {
        limit: maxPages,
        scrapeOptions: { formats: ['markdown'], onlyMainContent: true },
      });
    } catch (e) {
      console.warn('[Firecrawl] startCrawl unavailable, falling back to blocking crawl:', e);
      return crawlWebsite(url, { maxPages });
    }

    console.log(`[Firecrawl] Live crawl ${started.id} of ${url} (max ${maxPages} pages)`);

    const seenUrls = new Set<string>();
    const deadline = Date.now() + timeoutMs;
    let job: any = null;

    // Poll until the crawl finishes (or times out).
    // eslint-disable-next-line no-constant-condition
    while (true) {
      job = await firecrawl.getCrawlStatus(started.id);

      for (const doc of job.data || []) {
        const u = doc.metadata?.sourceURL || doc.metadata?.url;
        if (u) seenUrls.add(u);
      }
      onProgress?.({
        completed: job.completed || 0,
        total: job.total || 0,
        urls: Array.from(seenUrls),
      });

      if (job.status === 'completed') break;
      if (job.status === 'failed' || job.status === 'cancelled') {
        return { success: false, pages: [], error: `Crawl ${job.status}` };
      }
      if (Date.now() > deadline) {
        console.warn(`[Firecrawl] Live crawl ${started.id} timed out; using partial results`);
        break;
      }
      await new Promise((r) => setTimeout(r, pollIntervalMs));
    }

    const pages = mapDocsToPages(job?.data || [], url);
    if (pages.length === 0) {
      return { success: false, pages: [], error: 'No readable content found on this website' };
    }
    return { success: true, pages };
  } catch (error) {
    console.error('[Firecrawl] Live crawl error:', error);
    const message =
      error instanceof Error ? error.message : 'Unknown error occurred during crawl';
    return { success: false, pages: [], error: message };
  }
}

/**
 * Scrape a single page (used by recrawl). Returns one CrawledPage on success.
 */
export async function scrapePage(url: string): Promise<CrawlResult> {
  try {
    const dnsCheck = await resolveAndValidateUrl(url);
    if (!dnsCheck.ok) {
      return { success: false, pages: [], error: dnsCheck.reason || 'URL blocked' };
    }

    console.log(`[Firecrawl] Scraping single page ${url}`);

    const doc = (await firecrawl.scrape(url, {
      formats: ['markdown'],
      onlyMainContent: true,
    })) as any;

    const page = mapDocToPage(doc, url);
    if (!page.markdown || page.markdown.trim().length <= 50) {
      return { success: false, pages: [], error: 'No readable content found on this page' };
    }

    return { success: true, pages: [page] };
  } catch (error) {
    console.error('[Firecrawl] Single-page scrape error:', error);
    const message =
      error instanceof Error ? error.message : 'Unknown error occurred during scrape';
    return { success: false, pages: [], error: message };
  }
}

/**
 * Validate a URL for crawling.
 *
 * Normalises the input (adds https:// if missing) then delegates SSRF checking to the
 * shared `isUrlSafeForFetch` guard which covers private IPv4/IPv6, cloud metadata hosts,
 * reserved TLDs, and non-HTTP schemes.
 */
export function validateCrawlUrl(url: string): { valid: boolean; normalizedUrl?: string; error?: string } {
  let normalizedUrl = url.trim();

  if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
    normalizedUrl = 'https://' + normalizedUrl;
  }

  const safety = isUrlSafeForFetch(normalizedUrl);
  if (!safety.ok) {
    return { valid: false, error: safety.reason || 'URL is not allowed' };
  }

  return { valid: true, normalizedUrl };
}
