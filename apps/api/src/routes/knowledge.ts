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
        content: source.content, // Include content for text type
        filePath: source.file_path, // Include file path for download
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
