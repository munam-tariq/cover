import { Router, Response } from "express";
import { z } from "zod";
import multer from "multer";
import {
  authMiddleware,
  projectAuthMiddleware,
  AuthenticatedRequest,
} from "../middleware/auth";
import { supabaseAdmin } from "../lib/supabase";
import pdfParse from "pdf-parse";

// RAG v2 - Contextual Embeddings + Hybrid Search
import {
  createProcessingPipeline,
  type DocumentMetadata,
  type ProcessedChunk,
} from "../services/rag";

// URL Scraping
import { validateCrawlUrl } from "../services/firecrawl";
import {
  createScrapeJob,
  getJob,
  deleteJob,
  executeScrapeJob,
  getJobStatus,
  markPageImporting,
  markPageCompleted,
  markPageFailed,
} from "../services/scrape-job-manager";

export const knowledgeRouter = Router();

// Configure multer for file uploads (10MB limit)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

const MAX_SOURCES_PER_PROJECT = 20;
const MAX_TEXT_LENGTH = 100000;

// Validation schema for text-based knowledge
const createTextKnowledgeSchema = z.object({
  name: z.string().min(1).max(100),
  content: z.string().min(1).max(MAX_TEXT_LENGTH),
});

// Apply auth middleware to all routes
knowledgeRouter.use(authMiddleware);
knowledgeRouter.use(projectAuthMiddleware);

/**
 * GET /api/knowledge
 * List all knowledge sources for the authenticated user's project
 */
knowledgeRouter.get("/", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { data: sources, error } = await supabaseAdmin
      .from("knowledge_sources")
      .select("id, name, type, status, chunk_count, error, created_at")
      .eq("project_id", req.projectId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching sources:", error);
      return res.status(500).json({
        error: { code: "FETCH_ERROR", message: "Failed to fetch sources" },
      });
    }

    res.json({
      sources: sources.map((s) => ({
        id: s.id,
        name: s.name,
        type: s.type,
        status: s.status,
        chunkCount: s.chunk_count || 0,
        error: s.error,
        createdAt: s.created_at,
      })),
    });
  } catch (error) {
    console.error("Knowledge GET error:", error);
    res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Internal server error" },
    });
  }
});

/**
 * GET /api/knowledge/:id
 * Get a single knowledge source with content (for text type)
 */
knowledgeRouter.get("/:id", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const { data: source, error } = await supabaseAdmin
      .from("knowledge_sources")
      .select("*")
      .eq("id", id)
      .eq("project_id", req.projectId)
      .single();

    if (error || !source) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Knowledge source not found" },
      });
    }

    res.json({
      source: {
        id: source.id,
        name: source.name,
        type: source.type,
        status: source.status,
        chunkCount: source.chunk_count || 0,
        error: source.error,
        createdAt: source.created_at,
        content: source.content, // Include content for text/url type
        filePath: source.file_path, // Include file path for download
        sourceUrl: source.source_url, // Include source URL for url type
      },
    });
  } catch (error) {
    console.error("Knowledge GET by ID error:", error);
    res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Internal server error" },
    });
  }
});

/**
 * GET /api/knowledge/:id/download
 * Download the original file for file/pdf knowledge sources
 */
knowledgeRouter.get("/:id/download", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const { data: source, error } = await supabaseAdmin
      .from("knowledge_sources")
      .select("id, name, type, file_path, project_id")
      .eq("id", id)
      .eq("project_id", req.projectId)
      .single();

    if (error || !source) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Knowledge source not found" },
      });
    }

    if (!source.file_path) {
      return res.status(400).json({
        error: { code: "NO_FILE", message: "This knowledge source has no downloadable file" },
      });
    }

    // Get signed URL for the file
    const { data: signedUrlData, error: signedUrlError } = await supabaseAdmin.storage
      .from("knowledge-files")
      .createSignedUrl(source.file_path, 60); // 60 seconds expiry

    if (signedUrlError || !signedUrlData) {
      console.error("Signed URL error:", signedUrlError);
      return res.status(500).json({
        error: { code: "DOWNLOAD_ERROR", message: "Failed to generate download link" },
      });
    }

    // Return the signed URL for the client to download
    const fileExtension = source.file_path.split('.').pop() || 'txt';
    res.json({
      downloadUrl: signedUrlData.signedUrl,
      fileName: `${source.name}.${fileExtension}`,
    });
  } catch (error) {
    console.error("Knowledge download error:", error);
    res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Internal server error" },
    });
  }
});

/**
 * POST /api/knowledge
 * Create a new knowledge source from text
 */
knowledgeRouter.post("/", async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Check source limit
    const { count } = await supabaseAdmin
      .from("knowledge_sources")
      .select("*", { count: "exact", head: true })
      .eq("project_id", req.projectId);

    if (count !== null && count >= MAX_SOURCES_PER_PROJECT) {
      return res.status(400).json({
        error: {
          code: "LIMIT_REACHED",
          message: `Maximum ${MAX_SOURCES_PER_PROJECT} knowledge sources per project`,
        },
      });
    }

    // Validate input
    const validation = createTextKnowledgeSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: validation.error.errors[0].message,
          details: validation.error.errors,
        },
      });
    }

    const { name, content } = validation.data;

    // Create knowledge source
    const { data: source, error: createError } = await supabaseAdmin
      .from("knowledge_sources")
      .insert({
        project_id: req.projectId,
        name,
        type: "text",
        content,
        status: "processing",
      })
      .select()
      .single();

    if (createError) {
      console.error("Error creating source:", createError);
      return res.status(500).json({
        error: { code: "CREATE_ERROR", message: "Failed to create source" },
      });
    }

    // Process in background with RAG v2 pipeline
    processKnowledgeSource(source.id, source.name, source.type, content, null).catch((err) => {
      console.error("Background processing failed:", err);
    });

    res.status(201).json({
      source: {
        id: source.id,
        name: source.name,
        type: source.type,
        status: source.status,
        createdAt: source.created_at,
      },
    });
  } catch (error) {
    console.error("Knowledge POST error:", error);
    res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Internal server error" },
    });
  }
});

/**
 * POST /api/knowledge/upload
 * Upload a file as knowledge source
 */
knowledgeRouter.post(
  "/upload",
  upload.single("file"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      // Check source limit
      const { count } = await supabaseAdmin
        .from("knowledge_sources")
        .select("*", { count: "exact", head: true })
        .eq("project_id", req.projectId);

      if (count !== null && count >= MAX_SOURCES_PER_PROJECT) {
        return res.status(400).json({
          error: {
            code: "LIMIT_REACHED",
            message: `Maximum ${MAX_SOURCES_PER_PROJECT} knowledge sources per project`,
          },
        });
      }

      const file = req.file;
      const name = req.body.name;

      if (!file) {
        return res.status(400).json({
          error: { code: "FILE_REQUIRED", message: "File is required" },
        });
      }

      if (!name || name.trim().length === 0) {
        return res.status(400).json({
          error: { code: "VALIDATION_ERROR", message: "Name is required" },
        });
      }

      // Determine type based on mimetype
      let type: "file" | "pdf";
      if (file.mimetype === "application/pdf") {
        type = "pdf";
      } else if (file.mimetype === "text/plain") {
        type = "file";
      } else {
        return res.status(400).json({
          error: {
            code: "INVALID_FILE_TYPE",
            message: "Only .txt and .pdf files are supported",
          },
        });
      }

      // Create knowledge source record
      const { data: source, error: createError } = await supabaseAdmin
        .from("knowledge_sources")
        .insert({
          project_id: req.projectId,
          name: name.trim(),
          type,
          status: "processing",
        })
        .select()
        .single();

      if (createError) {
        console.error("Error creating source:", createError);
        return res.status(500).json({
          error: { code: "CREATE_ERROR", message: "Failed to create source" },
        });
      }

      // Upload file to storage
      const fileExt = file.originalname.split(".").pop();
      const fileName = `${req.projectId}/${source.id}/${source.id}.${fileExt}`;

      const { error: uploadError } = await supabaseAdmin.storage
        .from("knowledge-files")
        .upload(fileName, file.buffer, {
          contentType: file.mimetype,
          upsert: false,
        });

      if (uploadError) {
        console.error("File upload error:", uploadError);
        // Delete the source record
        await supabaseAdmin
          .from("knowledge_sources")
          .delete()
          .eq("id", source.id);

        return res.status(500).json({
          error: { code: "UPLOAD_ERROR", message: "Failed to upload file" },
        });
      }

      // Update source with file path
      await supabaseAdmin
        .from("knowledge_sources")
        .update({ file_path: fileName })
        .eq("id", source.id);

      // Process in background with RAG v2 pipeline
      processKnowledgeSource(source.id, source.name, source.type, null, fileName).catch((err) => {
        console.error("Background processing failed:", err);
      });

      res.status(201).json({
        source: {
          id: source.id,
          name: source.name,
          type: source.type,
          status: source.status,
          createdAt: source.created_at,
        },
      });
    } catch (error) {
      console.error("Knowledge upload error:", error);
      res.status(500).json({
        error: { code: "INTERNAL_ERROR", message: "Internal server error" },
      });
    }
  }
);

/**
 * DELETE /api/knowledge/:id
 * Delete a knowledge source and all its chunks
 */
knowledgeRouter.delete(
  "/:id",
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;

      // Get the source to check ownership and get file path
      const { data: source, error: sourceError } = await supabaseAdmin
        .from("knowledge_sources")
        .select("id, file_path, project_id")
        .eq("id", id)
        .eq("project_id", req.projectId)
        .single();

      if (sourceError || !source) {
        return res.status(404).json({
          error: { code: "NOT_FOUND", message: "Knowledge source not found" },
        });
      }

      // Delete file from storage if exists
      if (source.file_path) {
        const { error: storageError } = await supabaseAdmin.storage
          .from("knowledge-files")
          .remove([source.file_path]);

        if (storageError) {
          console.error("Storage delete error:", storageError);
        }
      }

      // Delete chunks first (foreign key constraint)
      await supabaseAdmin.from("knowledge_chunks").delete().eq("source_id", id);

      // Delete the source
      const { error: deleteError } = await supabaseAdmin
        .from("knowledge_sources")
        .delete()
        .eq("id", id);

      if (deleteError) {
        console.error("Source delete error:", deleteError);
        return res.status(500).json({
          error: { code: "DELETE_ERROR", message: "Failed to delete source" },
        });
      }

      res.status(204).send();
    } catch (error) {
      console.error("Knowledge DELETE error:", error);
      res.status(500).json({
        error: { code: "INTERNAL_ERROR", message: "Internal server error" },
      });
    }
  }
);

/**
 * Process a knowledge source: extract text, chunk, add context, embed, and store
 *
 * RAG v2 Pipeline:
 * 1. Extract text from content/file
 * 2. Semantic chunking (sentence-aware, ~256 tokens)
 * 3. Generate context for each chunk (Anthropic's Contextual Retrieval)
 * 4. Generate embeddings for contextual content
 * 5. Store chunks with context + embeddings (enables hybrid search)
 */
async function processKnowledgeSource(
  sourceId: string,
  sourceName: string,
  sourceType: string,
  content: string | null,
  filePath: string | null
): Promise<void> {
  try {
    let text = content;

    // Step 1: Extract text from file if needed
    if (filePath) {
      const { data: fileData, error: downloadError } = await supabaseAdmin.storage
        .from("knowledge-files")
        .download(filePath);

      if (downloadError) {
        throw new Error(`Failed to download file: ${downloadError.message}`);
      }

      if (filePath.endsWith(".pdf")) {
        const buffer = Buffer.from(await fileData.arrayBuffer());
        const pdfData = await pdfParse(buffer);
        text = pdfData.text;

        if (!text || text.trim().length < 10) {
          throw new Error(
            "PDF contains no extractable text. Scanned PDFs are not supported."
          );
        }
      } else {
        text = await fileData.text();
      }
    }

    if (!text || text.trim().length === 0) {
      throw new Error("Content is empty");
    }

    // Step 2-4: Process through RAG v2 pipeline
    // This handles: chunking → context generation → embedding
    const pipeline = createProcessingPipeline();
    const documentMetadata: DocumentMetadata = {
      name: sourceName,
      type: sourceType,
    };

    console.log(`[RAG v2] Processing ${sourceName} (${sourceType})...`);

    const processedChunks = await pipeline.process(
      text,
      documentMetadata,
      (stage, completed, total) => {
        console.log(`[RAG v2] ${stage}: ${completed}/${total}`);
      }
    );

    if (processedChunks.length === 0) {
      throw new Error("No valid chunks generated from content");
    }

    console.log(`[RAG v2] Generated ${processedChunks.length} contextual chunks`);

    // Step 5: Store chunks with context + embeddings
    const chunkRecords = processedChunks.map((chunk) => ({
      source_id: sourceId,
      content: chunk.content,
      context: chunk.context,
      embedding: `[${chunk.embedding.join(",")}]`,
      metadata: {
        index: chunk.index,
        tokenEstimate: chunk.metadata?.tokenEstimate,
      },
    }));

    const { error: insertError } = await supabaseAdmin
      .from("knowledge_chunks")
      .insert(chunkRecords);

    if (insertError) {
      throw new Error(`Failed to insert chunks: ${insertError.message}`);
    }

    // Update source status
    await supabaseAdmin
      .from("knowledge_sources")
      .update({
        status: "ready",
        chunk_count: processedChunks.length,
      })
      .eq("id", sourceId);

    console.log(`[RAG v2] Successfully processed ${sourceName}`);
  } catch (error) {
    console.error(`[RAG v2] Processing failed for ${sourceId}:`, error);

    // Update source with failed status
    await supabaseAdmin
      .from("knowledge_sources")
      .update({
        status: "failed",
        error: error instanceof Error ? error.message : "Processing failed",
      })
      .eq("id", sourceId);
  }
}

// ============================================================================
// URL SCRAPING ENDPOINTS
// ============================================================================

const scrapeUrlSchema = z.object({
  url: z.string().min(1, "URL is required"),
});

/**
 * POST /api/knowledge/scrape
 * Start a website scrape job
 */
knowledgeRouter.post("/scrape", async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Validate input
    const validation = scrapeUrlSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: validation.error.errors[0].message,
        },
      });
    }

    const { url } = validation.data;

    // Validate and normalize URL
    const urlValidation = validateCrawlUrl(url);
    if (!urlValidation.valid) {
      return res.status(400).json({
        error: {
          code: "INVALID_URL",
          message: urlValidation.error || "Invalid URL",
        },
      });
    }

    // Check source limit
    const { count } = await supabaseAdmin
      .from("knowledge_sources")
      .select("*", { count: "exact", head: true })
      .eq("project_id", req.projectId);

    const maxPages = parseInt(process.env.MAX_CRAWL_PAGES || "10", 10);
    const availableSlots = MAX_SOURCES_PER_PROJECT - (count || 0);

    if (availableSlots <= 0) {
      return res.status(400).json({
        error: {
          code: "LIMIT_REACHED",
          message: `You have reached the maximum of ${MAX_SOURCES_PER_PROJECT} knowledge sources. Please delete some to import more.`,
        },
      });
    }

    // Create scrape job
    const job = createScrapeJob(req.projectId!, urlValidation.normalizedUrl!);

    // Start crawling in background
    executeScrapeJob(job.id).catch((err) => {
      console.error(`[Scrape] Background job failed: ${err}`);
    });

    // Return job ID for polling
    res.status(202).json({
      jobId: job.id,
      status: "crawling",
      message: "Scanning website...",
    });
  } catch (error) {
    console.error("Scrape POST error:", error);
    res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Internal server error" },
    });
  }
});

/**
 * GET /api/knowledge/scrape/:jobId
 * Get scrape job status
 */
knowledgeRouter.get("/scrape/:jobId", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { jobId } = req.params;

    const job = getJob(jobId);
    if (!job) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Scrape job not found or expired" },
      });
    }

    // Verify job belongs to this project
    if (job.projectId !== req.projectId) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Scrape job not found" },
      });
    }

    res.json(getJobStatus(job));
  } catch (error) {
    console.error("Scrape GET error:", error);
    res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Internal server error" },
    });
  }
});

/**
 * POST /api/knowledge/scrape/:jobId/import
 * Import scraped content as knowledge sources
 */
knowledgeRouter.post("/scrape/:jobId/import", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { jobId } = req.params;

    const job = getJob(jobId);
    if (!job) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Scrape job not found or expired" },
      });
    }

    // Verify job belongs to this project
    if (job.projectId !== req.projectId) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Scrape job not found" },
      });
    }

    // Verify job is ready for import
    if (job.status !== "ready") {
      return res.status(400).json({
        error: {
          code: "NOT_READY",
          message: `Job is not ready for import. Current status: ${job.status}`,
        },
      });
    }

    // Check source limit
    const { count } = await supabaseAdmin
      .from("knowledge_sources")
      .select("*", { count: "exact", head: true })
      .eq("project_id", req.projectId);

    const availableSlots = MAX_SOURCES_PER_PROJECT - (count || 0);
    if (job.pages.length > availableSlots) {
      return res.status(400).json({
        error: {
          code: "LIMIT_EXCEEDED",
          message: `Cannot import ${job.pages.length} pages. You have ${availableSlots} slots available (${MAX_SOURCES_PER_PROJECT} max).`,
        },
      });
    }

    // Mark job as importing
    job.status = "importing";

    // Import pages in background
    importScrapeJobPages(job.id, req.projectId!).catch((err) => {
      console.error(`[Scrape] Import job failed: ${err}`);
    });

    res.status(202).json({
      status: "importing",
      totalPages: job.pages.length,
    });
  } catch (error) {
    console.error("Scrape import error:", error);
    res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Internal server error" },
    });
  }
});

/**
 * DELETE /api/knowledge/scrape/:jobId
 * Cancel a scrape job
 */
knowledgeRouter.delete("/scrape/:jobId", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { jobId } = req.params;

    const job = getJob(jobId);
    if (!job) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Scrape job not found or expired" },
      });
    }

    // Verify job belongs to this project
    if (job.projectId !== req.projectId) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Scrape job not found" },
      });
    }

    // Mark as cancelled and delete
    job.status = "cancelled";
    deleteJob(jobId);

    res.json({ status: "cancelled" });
  } catch (error) {
    console.error("Scrape DELETE error:", error);
    res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Internal server error" },
    });
  }
});

/**
 * Import pages from a scrape job as knowledge sources
 */
async function importScrapeJobPages(jobId: string, projectId: string): Promise<void> {
  const job = getJob(jobId);
  if (!job) return;

  for (const page of job.pages) {
    try {
      markPageImporting(jobId, page.id);

      // Create knowledge source
      const { data: source, error: createError } = await supabaseAdmin
        .from("knowledge_sources")
        .insert({
          project_id: projectId,
          name: `${page.title} - ${job.domain}`,
          type: "url",
          content: page.structuredContent,
          source_url: page.url,
          scraped_at: new Date().toISOString(),
          status: "processing",
        })
        .select()
        .single();

      if (createError || !source) {
        console.error(`[Scrape] Failed to create source for ${page.title}:`, createError);
        markPageFailed(jobId, page.id, "Failed to create knowledge source");
        continue;
      }

      // Process through RAG pipeline
      await processKnowledgeSource(
        source.id,
        source.name,
        "url",
        page.structuredContent,
        null
      );

      markPageCompleted(jobId, page.id, source.id);
      console.log(`[Scrape] Imported page: ${page.title}`);

    } catch (error) {
      console.error(`[Scrape] Error importing page ${page.title}:`, error);
      markPageFailed(
        jobId,
        page.id,
        error instanceof Error ? error.message : "Import failed"
      );
    }
  }
}
