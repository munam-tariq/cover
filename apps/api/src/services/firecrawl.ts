/**
 * Firecrawl Service
 *
 * Handles website crawling using the Firecrawl API.
 * Crawls websites and extracts content as markdown.
 */

import Firecrawl from '@mendable/firecrawl-js';

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
 * Crawl a website and extract content from all discovered pages
 */
export async function crawlWebsite(
  url: string,
  options: CrawlOptions
): Promise<CrawlResult> {
  try {
    // Validate URL
    const urlObj = new URL(url);

    // Ensure it's HTTP/HTTPS
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return {
        success: false,
        pages: [],
        error: 'Only HTTP and HTTPS URLs are supported'
      };
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

    // Map results to our format
    const pages: CrawledPage[] = (response.data || []).map((page: any) => ({
      url: page.url || page.sourceURL || url,
      title: page.metadata?.title || extractTitleFromUrl(page.url || page.sourceURL || url),
      markdown: page.markdown || '',
      metadata: {
        description: page.metadata?.description,
        language: page.metadata?.language
      }
    })).filter((page: CrawledPage) => page.markdown && page.markdown.trim().length > 50); // Filter out empty/minimal pages

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
 * Validate a URL for crawling
 */
export function validateCrawlUrl(url: string): { valid: boolean; normalizedUrl?: string; error?: string } {
  let normalizedUrl = url.trim();

  // Add https:// if missing
  if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
    normalizedUrl = 'https://' + normalizedUrl;
  }

  try {
    const urlObj = new URL(normalizedUrl);

    // Only allow HTTP/HTTPS
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return { valid: false, error: 'Only HTTP and HTTPS URLs are supported' };
    }

    // Block localhost and private IPs (basic SSRF protection)
    const hostname = urlObj.hostname.toLowerCase();
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('10.') ||
      hostname.startsWith('172.16.') ||
      hostname.endsWith('.local')
    ) {
      return { valid: false, error: 'Private/local URLs are not allowed' };
    }

    return { valid: true, normalizedUrl };
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }
}
