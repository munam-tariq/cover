/**
 * Scrape Job Manager
 *
 * Manages scrape jobs for URL scraping.
 * Jobs are persisted to the database for auditing and also cached in-memory for fast access.
 * In-memory cache expires after 30 minutes, but database records are permanent.
 */

import { crawlWebsite, CrawledPage } from './firecrawl';
import { structureAllPages, StructuredPage, estimateChunks } from './content-structurer';
import { supabaseAdmin } from '../lib/supabase';

export type ScrapeJobStatus =
  | 'pending'
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
  userId: string;
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
 * Save crawl job to database
 */
async function saveCrawlJobToDb(
  projectId: string,
  userId: string,
  url: string,
  domain: string
): Promise<string> {
  const { data, error } = await supabaseAdmin
    .from('crawl_jobs')
    .insert({
      project_id: projectId,
      user_id: userId,
      url,
      domain,
      status: 'pending',
    })
    .select('id')
    .single();

  if (error) {
    console.error('[ScrapeJobManager] Failed to save crawl job to DB:', error);
    throw new Error('Failed to create crawl job');
  }

  return data.id;
}

/**
 * Update crawl job in database
 */
async function updateCrawlJobInDb(
  jobId: string,
  updates: {
    status?: ScrapeJobStatus;
    error?: string | null;
    pages_found?: number;
    pages_processed?: number;
    pages_imported?: number;
    pages_failed?: number;
    total_words?: number;
    total_chunks?: number;
    started_at?: string;
    completed_at?: string;
  }
): Promise<void> {
  const { error } = await supabaseAdmin
    .from('crawl_jobs')
    .update(updates)
    .eq('id', jobId);

  if (error) {
    console.error(`[ScrapeJobManager] Failed to update crawl job ${jobId} in DB:`, error);
  }
}

/**
 * Create a new scrape job
 * Saves to database first, then creates in-memory cache
 */
export async function createScrapeJob(
  projectId: string,
  userId: string,
  url: string
): Promise<ScrapeJob> {
  const urlObj = new URL(url);
  const domain = urlObj.hostname;
  const maxPages = parseInt(process.env.MAX_CRAWL_PAGES || '10', 10);

  // Save to database first to get the job ID
  const jobId = await saveCrawlJobToDb(projectId, userId, url, domain);

  const job: ScrapeJob = {
    id: jobId,
    projectId,
    userId,
    url,
    domain,
    status: 'pending',
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
    expiresAt: new Date(Date.now() + 30 * 60 * 1000) // 30 min expiry for in-memory cache
  };

  jobs.set(jobId, job);
  console.log(`[ScrapeJobManager] Created job ${jobId} for ${url} (user: ${userId})`);

  return job;
}

/**
 * Get a job by ID from memory
 */
export function getJob(jobId: string): ScrapeJob | undefined {
  return jobs.get(jobId);
}

/**
 * Get a job from database (for historical/expired jobs)
 * Returns a minimal job object for status display
 */
export async function getJobFromDb(jobId: string): Promise<{
  id: string;
  projectId: string;
  userId: string;
  status: ScrapeJobStatus;
  domain: string;
  error?: string;
  pagesFound: number;
  pagesImported: number;
  pagesFailed: number;
  createdAt: string;
  completedAt?: string;
} | null> {
  const { data, error } = await supabaseAdmin
    .from('crawl_jobs')
    .select('id, project_id, user_id, status, domain, error, pages_found, pages_imported, pages_failed, created_at, completed_at')
    .eq('id', jobId)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    id: data.id,
    projectId: data.project_id,
    userId: data.user_id,
    status: data.status as ScrapeJobStatus,
    domain: data.domain,
    error: data.error,
    pagesFound: data.pages_found || 0,
    pagesImported: data.pages_imported || 0,
    pagesFailed: data.pages_failed || 0,
    createdAt: data.created_at,
    completedAt: data.completed_at,
  };
}

/**
 * Update a job in memory
 */
export function updateJob(jobId: string, updates: Partial<ScrapeJob>): void {
  const job = jobs.get(jobId);
  if (job) {
    Object.assign(job, updates);
  }
}

/**
 * Delete a job from memory
 */
export function deleteJob(jobId: string): void {
  jobs.delete(jobId);
  console.log(`[ScrapeJobManager] Deleted job ${jobId} from memory`);
}

/**
 * Cancel a job
 */
export async function cancelJob(jobId: string): Promise<boolean> {
  const job = jobs.get(jobId);
  if (job) {
    job.status = 'cancelled';
    await updateCrawlJobInDb(jobId, {
      status: 'cancelled',
      completed_at: new Date().toISOString(),
    });
    jobs.delete(jobId);
    console.log(`[ScrapeJobManager] Cancelled job ${jobId}`);
    return true;
  }
  return false;
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
    await updateCrawlJobInDb(jobId, {
      status: 'crawling',
      started_at: new Date().toISOString(),
    });

    const crawlResult = await crawlWebsite(job.url, {
      maxPages: job.crawlProgress.maxPages
    });

    // Check if job was cancelled during crawl
    const currentJob = jobs.get(jobId);
    if (!currentJob || currentJob.status === 'cancelled') {
      console.log(`[ScrapeJobManager] Job ${jobId} was cancelled`);
      await updateCrawlJobInDb(jobId, { status: 'cancelled', completed_at: new Date().toISOString() });
      return;
    }

    if (!crawlResult.success) {
      job.status = 'failed';
      job.error = crawlResult.error;
      await updateCrawlJobInDb(jobId, {
        status: 'failed',
        error: crawlResult.error,
        completed_at: new Date().toISOString(),
      });
      console.error(`[ScrapeJobManager] Crawl failed for job ${jobId}: ${crawlResult.error}`);
      return;
    }

    job.crawlProgress.pagesFound = crawlResult.pages.length;
    job.crawlProgress.pagesProcessed = crawlResult.pages.length;

    // Update pages found in database
    await updateCrawlJobInDb(jobId, {
      pages_found: crawlResult.pages.length,
    });

    if (crawlResult.pages.length === 0) {
      job.status = 'failed';
      job.error = 'No readable content found on this website';
      await updateCrawlJobInDb(jobId, {
        status: 'failed',
        error: 'No readable content found on this website',
        completed_at: new Date().toISOString(),
      });
      return;
    }

    // Step 2: Structure content with LLM
    console.log(`[ScrapeJobManager] Starting content structuring for job ${jobId}`);
    job.status = 'structuring';
    job.structureProgress.total = crawlResult.pages.length;
    await updateCrawlJobInDb(jobId, { status: 'structuring' });

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
      await updateCrawlJobInDb(jobId, { status: 'cancelled', completed_at: new Date().toISOString() });
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

    // Update database with final metrics
    await updateCrawlJobInDb(jobId, {
      status: 'ready',
      pages_processed: job.pages.length,
      total_words: totalWords,
      total_chunks: totalEstimatedChunks,
    });

    console.log(`[ScrapeJobManager] Job ${jobId} ready with ${job.pages.length} pages`);

  } catch (error) {
    console.error(`[ScrapeJobManager] Error executing job ${jobId}:`, error);
    job.status = 'failed';
    job.error = error instanceof Error ? error.message : 'Unknown error occurred';
    await updateCrawlJobInDb(jobId, {
      status: 'failed',
      error: job.error,
      completed_at: new Date().toISOString(),
    });
  }
}

/**
 * Mark a page as importing
 */
export async function markPageImporting(jobId: string, pageId: string): Promise<void> {
  const job = jobs.get(jobId);
  if (job) {
    const page = job.pages.find(p => p.id === pageId);
    if (page) {
      page.importStatus = 'importing';
    }
    // Update status to importing if this is the first page
    if (job.status === 'ready') {
      job.status = 'importing';
      await updateCrawlJobInDb(jobId, { status: 'importing' });
    }
  }
}

/**
 * Mark a page as completed
 */
export async function markPageCompleted(jobId: string, pageId: string, sourceId: string): Promise<void> {
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
        await updateCrawlJobInDb(jobId, {
          status: 'completed',
          pages_imported: job.importProgress.completed,
          pages_failed: job.importProgress.failed,
          completed_at: new Date().toISOString(),
        });
        console.log(`[ScrapeJobManager] Job ${jobId} completed`);
      } else {
        // Update progress
        await updateCrawlJobInDb(jobId, {
          pages_imported: job.importProgress.completed,
        });
      }
    }
  }
}

/**
 * Mark a page as failed
 */
export async function markPageFailed(jobId: string, pageId: string, error: string): Promise<void> {
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
        await updateCrawlJobInDb(jobId, {
          status: 'completed',
          pages_imported: job.importProgress.completed,
          pages_failed: job.importProgress.failed,
          completed_at: new Date().toISOString(),
        });
        console.log(`[ScrapeJobManager] Job ${jobId} completed with ${job.importProgress.failed} failures`);
      } else {
        // Update progress
        await updateCrawlJobInDb(jobId, {
          pages_failed: job.importProgress.failed,
        });
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
