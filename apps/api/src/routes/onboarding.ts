/**
 * Onboarding Routes
 *
 * Handles the onboarding flow for new users:
 * 1. POST /api/onboarding/start - Create project with name
 * 2. POST /api/onboarding/crawl - Start website crawl for knowledge base
 * 3. GET /api/onboarding/status/:jobId - Get crawl job status
 * 4. POST /api/onboarding/complete - Import crawled pages and complete onboarding
 */

import { Router, Response } from "express";
import { z } from "zod";

import { supabaseAdmin } from "../lib/supabase";
import { authMiddleware, AuthenticatedRequest } from "../middleware/auth";
import { validateCrawlUrl } from "../services/firecrawl";
import { resolveAndValidateUrl } from "../lib/url-guard";
import { hasCompletedOnboarding } from "../services/onboarding-completion";
import { runSelfTest } from "../services/onboarding-self-test";
import {
  createProcessingPipeline,
  type DocumentMetadata,
} from "../services/rag";
import {
  createScrapeJob,
  getJob,
  getJobFromDb,
  executeScrapeJob,
  getJobStatus,
  getCrawlCapacity,
  markPageImporting,
  markPageCompleted,
  markPageFailed,
} from "../services/scrape-job-manager";
import { notifyCustomerOnboarded } from "../services/slack-notifier";

export const onboardingRouter = Router();

// Apply auth middleware to all routes (user must be authenticated)
onboardingRouter.use(authMiddleware);

// Brandfetch client ID for logo fetching
const BRANDFETCH_CLIENT_ID = process.env.BRANDFETCH_CLIENT_ID || "";

/**
 * Extract domain from URL
 */
function extractDomain(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return url.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
  }
}

/**
 * Generate Brandfetch logo URL
 */
function getBrandfetchLogoUrl(domain: string): string {
  const baseUrl = `https://cdn.brandfetch.io/${domain}`;
  if (BRANDFETCH_CLIENT_ID) {
    return `${baseUrl}/icon/fallback/lettermark?c=${BRANDFETCH_CLIENT_ID}`;
  }
  // Without client ID, still works but with rate limits
  return `${baseUrl}/icon/fallback/lettermark`;
}

// Validation schemas
const startSchema = z.object({
  agentName: z.string().min(1, "Agent name is required").max(50, "Agent name too long"),
  companyName: z.string().min(1, "Company name is required").max(100, "Company name too long"),
  systemPrompt: z.string().max(2000, "System prompt too long").optional(),
  // New onboarding signals (persisted + used to tailor the agent's behavior)
  hear: z.string().max(50).optional(),
  size: z.string().max(50).optional(),
  goal: z.string().max(50).optional(),
  tone: z.string().max(50).optional(),
});

const TONE_GUIDANCE: Record<string, string> = {
  friendly: "Maintain a warm, friendly, approachable tone.",
  professional: "Maintain a professional, concise, and polished tone.",
  playful: "Keep a light, playful, and energetic tone while staying genuinely helpful.",
};

const GOAL_GUIDANCE: Record<string, string> = {
  answer:
    "Your primary goal is to answer customer questions accurately from the knowledge base and deflect common support requests.",
  leads:
    "Your primary goal is to capture and qualify leads — collect contact details and intent for promising conversations.",
  handoff:
    "Your primary goal is to route customers to the human team smoothly the moment a person is needed.",
  all: "Help customers by answering questions, capturing qualified leads, and routing to a human when needed.",
};

/**
 * Build a system prompt from the onboarding tone + goal selections.
 */
function buildOnboardingSystemPrompt(opts: {
  agentName: string;
  companyName: string;
  tone?: string;
  goal?: string;
}): string {
  const toneLine = TONE_GUIDANCE[opts.tone || ""] || TONE_GUIDANCE.professional;
  const goalLine = GOAL_GUIDANCE[opts.goal || ""] || GOAL_GUIDANCE.answer;
  return [
    `You are ${opts.agentName}, the AI assistant for ${opts.companyName}.`,
    goalLine,
    toneLine,
    "Answer using the provided knowledge base. If you don't know the answer, say so honestly and offer to connect the customer with the team.",
  ].join(" ");
}

const crawlSchema = z.object({
  projectId: z.string().uuid("Invalid project ID"),
  websiteUrl: z.string().min(1, "Website URL is required"),
});

const completeSchema = z.object({
  projectId: z.string().uuid("Invalid project ID"),
  jobId: z.string().uuid("Invalid job ID"),
});

/**
 * POST /api/onboarding/start
 * Create a new project with the given name for onboarding
 */
onboardingRouter.post("/start", async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Validate input
    const validation = startSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: validation.error.errors[0].message,
        },
      });
    }

    const { agentName, companyName, systemPrompt, hear, size, goal, tone } = validation.data;

    // Check if user already has projects (shouldn't be in onboarding)
    const { data: existingProjects, error: fetchError } = await supabaseAdmin
      .from("projects")
      .select("id")
      .eq("user_id", req.userId)
      .is("deleted_at", null)
      .limit(1);

    if (fetchError) {
      console.error("Error checking existing projects:", fetchError);
      return res.status(500).json({
        error: { code: "INTERNAL_ERROR", message: "Failed to check existing projects" },
      });
    }

    // If user has projects, they shouldn't be in onboarding
    // But we'll allow them to create another project anyway
    if (existingProjects && existingProjects.length > 0) {
      console.log(`[Onboarding] User ${req.userId} already has projects, creating additional`);
    }

    // Create the project with optional system prompt
    // Widget is disabled by default — it gets enabled when knowledge is imported
    const projectSettings: Record<string, unknown> = {
      widget_enabled: false,
      onboarding: {
        started_at: new Date().toISOString(),
        completed_at: null,
        company_website: null,
        company_logo_url: null,
        crawl_job_id: null,
        // Persisted onboarding signals
        hear: hear || null,
        size: size || null,
        goal: goal || null,
        tone: tone || null,
      },
    };

    // Use an explicit prompt if provided, otherwise derive one from tone + goal.
    projectSettings.systemPrompt = systemPrompt?.trim()
      ? systemPrompt.trim()
      : buildOnboardingSystemPrompt({ agentName, companyName, tone, goal });

    const { data: project, error: createError } = await supabaseAdmin
      .from("projects")
      .insert({
        user_id: req.userId,
        name: agentName,
        company_name: companyName,
        settings: projectSettings,
      })
      .select("id, name")
      .single();

    if (createError || !project) {
      console.error("Error creating project:", createError);
      return res.status(500).json({
        error: { code: "CREATE_ERROR", message: "Failed to create project" },
      });
    }

    res.status(201).json({
      projectId: project.id,
      name: project.name,
      message: "Project created successfully",
    });
  } catch (error) {
    console.error("Onboarding start error:", error);
    res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Internal server error" },
    });
  }
});

/**
 * POST /api/onboarding/crawl
 * Start crawling a website to create knowledge base
 */
onboardingRouter.post("/crawl", async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Validate input
    const validation = crawlSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: validation.error.errors[0].message,
        },
      });
    }

    const { projectId, websiteUrl } = validation.data;

    // Verify project belongs to user
    const { data: project, error: projectError } = await supabaseAdmin
      .from("projects")
      .select("id, settings, allowed_domains")
      .eq("id", projectId)
      .eq("user_id", req.userId)
      .is("deleted_at", null)
      .single();

    if (projectError || !project) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Project not found" },
      });
    }

    // Validate and normalize URL
    const urlValidation = validateCrawlUrl(websiteUrl);
    if (!urlValidation.valid) {
      return res.status(400).json({
        error: {
          code: "INVALID_URL",
          message: urlValidation.error || "Invalid URL",
        },
      });
    }

    const normalizedUrl = urlValidation.normalizedUrl!;

    // DNS-rebinding defense: resolve the hostname and block before creating
    // jobs or writing settings if it maps to a private/metadata IP.
    const dnsCheck = await resolveAndValidateUrl(normalizedUrl);
    if (!dnsCheck.ok) {
      return res.status(400).json({
        error: { code: "INVALID_URL", message: dnsCheck.reason || "URL blocked" },
      });
    }

    const domain = extractDomain(normalizedUrl);
    const logoUrl = getBrandfetchLogoUrl(domain);

    // Bound the crawl by remaining crawled-page capacity (the Train step may have
    // already added some url sources). On a fresh project this is the full cap.
    const capacity = await getCrawlCapacity(projectId);
    if (capacity.remaining <= 0) {
      return res.status(400).json({
        error: {
          code: "LIMIT_REACHED",
          message: `You have reached the maximum of ${capacity.max} scanned pages. Please delete some crawled pages to scan more.`,
        },
      });
    }
    const job = await createScrapeJob(
      projectId,
      req.userId!,
      normalizedUrl,
      capacity.remaining
    );

    // Update project with onboarding data
    const currentSettings = (project.settings as Record<string, unknown>) || {};
    const onboardingSettings = (currentSettings.onboarding as Record<string, unknown>) || {};

    const updatePayload: Record<string, unknown> = {
      settings: {
        ...currentSettings,
        onboarding: {
          ...onboardingSettings,
          company_website: normalizedUrl,
          company_logo_url: logoUrl,
          crawl_job_id: job.id,
        },
      },
    };

    // Auto-populate allowed_domains from the crawl URL if not already configured.
    // This seeds the domain whitelist so the widget gate can enforce origin checks
    // once WIDGET_GATE_ENFORCE is flipped on — zero friction for the user.
    const existingDomains = (project.allowed_domains as string[]) || [];
    if (existingDomains.length === 0) {
      updatePayload.allowed_domains = [domain, `*.${domain}`];
    }

    await supabaseAdmin
      .from("projects")
      .update(updatePayload)
      .eq("id", projectId);

    // Start crawling in background
    executeScrapeJob(job.id).catch((err) => {
      console.error(`[Onboarding] Background crawl job failed: ${err}`);
    });

    res.status(202).json({
      jobId: job.id,
      status: "pending",
      domain,
      logoUrl,
      message: "Crawling website...",
    });
  } catch (error) {
    console.error("Onboarding crawl error:", error);
    res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Internal server error" },
    });
  }
});

/**
 * GET /api/onboarding/status/:jobId
 * Get the status of a crawl job
 */
onboardingRouter.get("/status/:jobId", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { jobId } = req.params;

    // First try to get from in-memory cache (for active jobs)
    const job = getJob(jobId);
    if (job) {
      // Verify job belongs to this user
      if (job.userId !== req.userId) {
        return res.status(404).json({
          error: { code: "NOT_FOUND", message: "Crawl job not found" },
        });
      }
      return res.json(getJobStatus(job));
    }

    // If not in memory, check database (for historical/expired jobs)
    const dbJob = await getJobFromDb(jobId);
    if (!dbJob) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Crawl job not found" },
      });
    }

    // Verify ownership via user_id
    if (dbJob.userId !== req.userId) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Crawl job not found" },
      });
    }

    // Return minimal status from database
    res.json({
      jobId: dbJob.id,
      status: dbJob.status,
      domain: dbJob.domain,
      error: dbJob.error ? { code: "SCRAPE_ERROR", message: dbJob.error } : undefined,
      totals: ["testing", "completed", "failed"].includes(dbJob.status)
        ? {
            pages: dbJob.pagesFound,
            imported: dbJob.pagesImported,
            failed: dbJob.pagesFailed,
          }
        : undefined,
      selfTest: dbJob.selfTest,
    });
  } catch (error) {
    console.error("Onboarding status error:", error);
    res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Internal server error" },
    });
  }
});

/**
 * POST /api/onboarding/complete
 * Import crawled pages as knowledge and complete onboarding
 */
onboardingRouter.post("/complete", async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Validate input
    const validation = completeSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: validation.error.errors[0].message,
        },
      });
    }

    const { projectId, jobId } = validation.data;

    // Verify project belongs to user
    const { data: project, error: projectError } = await supabaseAdmin
      .from("projects")
      .select("id, settings")
      .eq("id", projectId)
      .eq("user_id", req.userId)
      .is("deleted_at", null)
      .single();

    if (projectError || !project) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Project not found" },
      });
    }

    // Get the scrape job
    const job = getJob(jobId);
    if (!job) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Crawl job not found or expired" },
      });
    }

    // Verify job belongs to this project and user
    if (job.projectId !== projectId || job.userId !== req.userId) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Crawl job not found" },
      });
    }

    // Check job is ready for import
    if (job.status !== "ready") {
      return res.status(400).json({
        error: {
          code: "NOT_READY",
          message: `Job is not ready for import. Current status: ${job.status}`,
        },
      });
    }

    // Update job status to importing
    job.status = "importing";

    // Import pages in background
    importPagesAndComplete(job, projectId).catch((err) => {
      console.error(`[Onboarding] Import failed: ${err}`);
    });

    res.status(202).json({
      status: "importing",
      totalPages: job.pages.length,
      message: "Importing knowledge base...",
    });
  } catch (error) {
    console.error("Onboarding complete error:", error);
    res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Internal server error" },
    });
  }
});

/**
 * POST /api/onboarding/skip
 * Skip onboarding and mark as complete without importing
 */
onboardingRouter.post("/skip", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { projectId } = req.body;

    if (!projectId) {
      return res.status(400).json({
        error: { code: "VALIDATION_ERROR", message: "Project ID is required" },
      });
    }

    // Verify project belongs to user
    const { data: project, error: projectError } = await supabaseAdmin
      .from("projects")
      .select("id, settings")
      .eq("id", projectId)
      .eq("user_id", req.userId)
      .is("deleted_at", null)
      .single();

    if (projectError || !project) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Project not found" },
      });
    }

    if (hasCompletedOnboarding(project.settings)) {
      return res.json({
        success: true,
        message: "Onboarding already completed",
      });
    }

    // Mark onboarding as complete (skipped)
    const currentSettings = (project.settings as Record<string, unknown>) || {};
    const onboardingSettings = (currentSettings.onboarding as Record<string, unknown>) || {};

    const { error: completionError } = await supabaseAdmin
      .from("projects")
      .update({
        settings: {
          ...currentSettings,
          onboarding: {
            ...onboardingSettings,
            completed_at: new Date().toISOString(),
            skipped: true,
          },
        },
      })
      .eq("id", projectId);

    if (completionError) {
      console.error("Failed to mark onboarding as skipped:", completionError);
      return res.status(500).json({
        error: { code: "UPDATE_ERROR", message: "Failed to complete onboarding" },
      });
    }

    // Notify Slack that a new customer finished onboarding (fire-and-forget).
    void notifyCustomerOnboarded(projectId);

    res.json({
      success: true,
      message: "Onboarding skipped",
    });
  } catch (error) {
    console.error("Onboarding skip error:", error);
    res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Internal server error" },
    });
  }
});

/**
 * Background function to import pages and complete onboarding
 */
async function importPagesAndComplete(
  job: ReturnType<typeof getJob>,
  projectId: string
): Promise<void> {
  if (!job) return;

  const pipeline = createProcessingPipeline();
  let importedCount = 0;
  let failedCount = 0;

  for (const page of job.pages) {
    if (page.importStatus !== "pending") continue;

    try {
      markPageImporting(job.id, page.id);

      // Create knowledge source
      const { data: source, error: sourceError } = await supabaseAdmin
        .from("knowledge_sources")
        .insert({
          project_id: projectId,
          type: "url",
          name: page.title || `Page: ${page.url}`,
          content: page.structuredContent,
          source_url: page.url,
          status: "processing",
          scraped_at: new Date().toISOString(),
          crawl_job_id: job.id,
        })
        .select("id")
        .single();

      if (sourceError || !source) {
        throw new Error(sourceError?.message || "Failed to create knowledge source");
      }

      // Process with RAG pipeline
      const metadata: DocumentMetadata = {
        name: page.title || page.url,
        type: "url",
        sourceId: source.id,
        sourceName: page.title || page.url,
        sourceType: "url",
        sourceUrl: page.url,
      };

      const chunks = await pipeline.process(page.structuredContent, metadata);

      // Store chunks
      if (chunks.length > 0) {
        const chunkRecords = chunks.map((chunk) => ({
          source_id: source.id,
          content: chunk.content,
          context: chunk.context,
          embedding: chunk.embedding,
          metadata: chunk.metadata,
        }));

        const { error: chunkError } = await supabaseAdmin
          .from("knowledge_chunks")
          .insert(chunkRecords);

        if (chunkError) {
          throw new Error(chunkError.message);
        }
      }

      // Update source status
      await supabaseAdmin
        .from("knowledge_sources")
        .update({
          status: "ready",
          chunk_count: chunks.length,
        })
        .eq("id", source.id);

      markPageCompleted(job.id, page.id, source.id);
      importedCount++;
    } catch (error) {
      console.error(`[Onboarding] Failed to import page ${page.url}:`, error);
      markPageFailed(job.id, page.id, error instanceof Error ? error.message : "Unknown error");
      failedCount++;
    }
  }

  // Agent self-test: ask 2 homepage-derived questions and answer them with the
  // real RAG pipeline, so the onboarding UI can show the agent answering live.
  // Runs server-side only; failures are non-fatal (onboarding still completes).
  if (importedCount > 0) {
    job.status = "testing";
    job.selfTest = { status: "running", questions: [] };
    await supabaseAdmin.from("crawl_jobs").update({ status: "testing" }).eq("id", job.id);

    try {
      const { data: proj } = await supabaseAdmin
        .from("projects")
        .select("name, company_name")
        .eq("id", projectId)
        .single();

      const homepageContent = job.pages[0]?.structuredContent || "";
      const companyName = proj?.company_name || proj?.name || job.domain;
      const agentName = proj?.name || "Assistant";

      const questions = await runSelfTest(projectId, homepageContent, companyName, agentName);
      job.selfTest = { status: "completed", questions };
    } catch (error) {
      console.error("[Onboarding] Self-test failed:", error);
      job.selfTest = { status: "failed", questions: [] };
    }

    await supabaseAdmin
      .from("crawl_jobs")
      .update({ self_test: job.selfTest })
      .eq("id", job.id);
  }

  // Update job status
  job.status = "completed";

  // Update database
  await supabaseAdmin
    .from("crawl_jobs")
    .update({
      status: "completed",
      pages_imported: importedCount,
      pages_failed: failedCount,
      completed_at: new Date().toISOString(),
    })
    .eq("id", job.id);

  // Mark onboarding as complete
  const { data: project, error: projectError } = await supabaseAdmin
    .from("projects")
    .select("settings")
    .eq("id", projectId)
    .single();

  if (projectError || !project) {
    console.error(
      `[Onboarding] Failed to load project ${projectId} for completion:`,
      projectError
    );
    return;
  }

  const currentSettings = (project.settings as Record<string, unknown>) || {};
  const onboardingSettings = (currentSettings.onboarding as Record<string, unknown>) || {};

  const { error: completionError } = await supabaseAdmin
    .from("projects")
    .update({
      settings: {
        ...currentSettings,
        // Auto-enable widget if knowledge was successfully imported
        ...(importedCount > 0 ? { widget_enabled: true } : {}),
        onboarding: {
          ...onboardingSettings,
          completed_at: new Date().toISOString(),
          pages_imported: importedCount,
          pages_failed: failedCount,
        },
      },
    })
    .eq("id", projectId);

  if (completionError) {
    console.error(
      `[Onboarding] Failed to mark project ${projectId} complete:`,
      completionError
    );
    return;
  }

  console.log(`[Onboarding] Completed for project ${projectId}: ${importedCount} imported, ${failedCount} failed`);

  // Notify Slack that a new customer finished onboarding (fire-and-forget).
  void notifyCustomerOnboarded(projectId);
}
