/**
 * Scrape Job Manager
 *
 * Manages in-memory scrape jobs for URL scraping.
 * Jobs are temporary and expire after 30 minutes.
 */

import { crawlWebsite, CrawledPage } from './firecrawl';
import { structureAllPages, StructuredPage, estimateChunks } from './content-structurer';

export type ScrapeJobStatus =
  | 'crawling'
  | 'structuring'
  | 'ready'
  | 'importing'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface ScrapedPageData {
  id: string;
  url: string;
  title: string;
  wordCount: number;
  preview: string;
  structuredContent: string;
  estimatedChunks: number;
  importStatus: 'pending' | 'importing' | 'completed' | 'failed';
  sourceId?: string;
  error?: string;
}

export interface ScrapeJob {
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
  importProgress: {
    total: number;
    completed: number;
    failed: number;
  };
  pages: ScrapedPageData[];
  totals: {
    pages: number;
    words: number;
    estimatedChunks: number;
  };
  createdAt: Date;
  expiresAt: Date;
}

// In-memory job storage
const jobs = new Map<string, ScrapeJob>();

// Clean up expired jobs every 5 minutes
setInterval(() => {
  const now = new Date();
  for (const [id, job] of jobs) {
    if (job.expiresAt < now) {
      console.log(`[ScrapeJobManager] Cleaning up expired job ${id}`);
      jobs.delete(id);
    }
  }
}, 5 * 60 * 1000);

/**
 * Generate a unique job ID
 */
function generateJobId(): string {
  return `scrape_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Create a new scrape job
 */
export function createScrapeJob(projectId: string, url: string): ScrapeJob {
  const urlObj = new URL(url);
  const jobId = generateJobId();
  const maxPages = parseInt(process.env.MAX_CRAWL_PAGES || '10', 10);

  const job: ScrapeJob = {
    id: jobId,
    projectId,
    url,
    domain: urlObj.hostname,
    status: 'crawling',
    crawlProgress: {
      pagesFound: 0,
      pagesProcessed: 0,
      maxPages
    },
    structureProgress: {
      total: 0,
      completed: 0
    },
    importProgress: {
      total: 0,
      completed: 0,
      failed: 0
    },
    pages: [],
    totals: {
      pages: 0,
      words: 0,
      estimatedChunks: 0
    },
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 30 * 60 * 1000) // 30 min expiry
  };

  jobs.set(jobId, job);
  console.log(`[ScrapeJobManager] Created job ${jobId} for ${url}`);

  return job;
}

/**
 * Get a job by ID
 */
export function getJob(jobId: string): ScrapeJob | undefined {
  return jobs.get(jobId);
}

/**
 * Update a job
 */
export function updateJob(jobId: string, updates: Partial<ScrapeJob>): void {
  const job = jobs.get(jobId);
  if (job) {
    Object.assign(job, updates);
  }
}

/**
 * Delete a job
 */
export function deleteJob(jobId: string): void {
  jobs.delete(jobId);
  console.log(`[ScrapeJobManager] Deleted job ${jobId}`);
}

/**
 * Execute the scrape job (crawl + structure)
 */
export async function executeScrapeJob(jobId: string): Promise<void> {
  const job = jobs.get(jobId);
  if (!job) {
    console.error(`[ScrapeJobManager] Job ${jobId} not found`);
    return;
  }

  try {
    // Step 1: Crawl website
    console.log(`[ScrapeJobManager] Starting crawl for job ${jobId}`);
    job.status = 'crawling';

    const crawlResult = await crawlWebsite(job.url, {
      maxPages: job.crawlProgress.maxPages
    });

    // Check if job was cancelled during crawl
    const currentJob = jobs.get(jobId);
    if (!currentJob || currentJob.status === 'cancelled') {
      console.log(`[ScrapeJobManager] Job ${jobId} was cancelled`);
      return;
    }

    if (!crawlResult.success) {
      job.status = 'failed';
      job.error = crawlResult.error;
      console.error(`[ScrapeJobManager] Crawl failed for job ${jobId}: ${crawlResult.error}`);
      return;
    }

    job.crawlProgress.pagesFound = crawlResult.pages.length;
    job.crawlProgress.pagesProcessed = crawlResult.pages.length;

    if (crawlResult.pages.length === 0) {
      job.status = 'failed';
      job.error = 'No readable content found on this website';
      return;
    }

    // Step 2: Structure content with LLM
    console.log(`[ScrapeJobManager] Starting content structuring for job ${jobId}`);
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

    // Check if job was cancelled during structuring
    const jobAfterStructure = jobs.get(jobId);
    if (!jobAfterStructure || jobAfterStructure.status === 'cancelled') {
      console.log(`[ScrapeJobManager] Job ${jobId} was cancelled`);
      return;
    }

    // Step 3: Prepare pages for preview
    let totalWords = 0;
    let totalEstimatedChunks = 0;

    job.pages = structuredPages.map((page, index) => {
      const chunks = estimateChunks(page.wordCount);
      totalWords += page.wordCount;
      totalEstimatedChunks += chunks;

      return {
        id: `page_${index}`,
        url: crawlResult.pages[index].url,
        title: page.title,
        wordCount: page.wordCount,
        preview: page.content.slice(0, 500) + (page.content.length > 500 ? '...' : ''),
        structuredContent: page.content,
        estimatedChunks: chunks,
        importStatus: 'pending' as const
      };
    });

    job.totals = {
      pages: job.pages.length,
      words: totalWords,
      estimatedChunks: totalEstimatedChunks
    };

    job.importProgress.total = job.pages.length;
    job.status = 'ready';

    console.log(`[ScrapeJobManager] Job ${jobId} ready with ${job.pages.length} pages`);

  } catch (error) {
    console.error(`[ScrapeJobManager] Error executing job ${jobId}:`, error);
    job.status = 'failed';
    job.error = error instanceof Error ? error.message : 'Unknown error occurred';
  }
}

/**
 * Mark a page as importing
 */
export function markPageImporting(jobId: string, pageId: string): void {
  const job = jobs.get(jobId);
  if (job) {
    const page = job.pages.find(p => p.id === pageId);
    if (page) {
      page.importStatus = 'importing';
    }
  }
}

/**
 * Mark a page as completed
 */
export function markPageCompleted(jobId: string, pageId: string, sourceId: string): void {
  const job = jobs.get(jobId);
  if (job) {
    const page = job.pages.find(p => p.id === pageId);
    if (page) {
      page.importStatus = 'completed';
      page.sourceId = sourceId;
      job.importProgress.completed++;

      // Check if all pages are done
      if (job.importProgress.completed + job.importProgress.failed === job.importProgress.total) {
        job.status = 'completed';
        console.log(`[ScrapeJobManager] Job ${jobId} completed`);
      }
    }
  }
}

/**
 * Mark a page as failed
 */
export function markPageFailed(jobId: string, pageId: string, error: string): void {
  const job = jobs.get(jobId);
  if (job) {
    const page = job.pages.find(p => p.id === pageId);
    if (page) {
      page.importStatus = 'failed';
      page.error = error;
      job.importProgress.failed++;

      // Check if all pages are done
      if (job.importProgress.completed + job.importProgress.failed === job.importProgress.total) {
        job.status = 'completed';
        console.log(`[ScrapeJobManager] Job ${jobId} completed with ${job.importProgress.failed} failures`);
      }
    }
  }
}

/**
 * Get public-safe job status for API response
 */
export function getJobStatus(job: ScrapeJob): object {
  return {
    jobId: job.id,
    status: job.status,
    domain: job.domain,
    error: job.error ? { code: 'SCRAPE_ERROR', message: job.error } : undefined,
    crawlProgress: job.status === 'crawling' ? job.crawlProgress : undefined,
    structureProgress: job.status === 'structuring' ? job.structureProgress : undefined,
    pages: ['ready', 'importing', 'completed'].includes(job.status) ? job.pages : undefined,
    totals: ['ready', 'importing', 'completed'].includes(job.status) ? job.totals : undefined
  };
}
