/**
 * Re-process Knowledge Sources with RAG v2 Pipeline
 *
 * This script re-processes all existing knowledge sources through the new
 * RAG v2 pipeline which includes:
 * - Semantic chunking (~256 tokens, sentence-aware)
 * - Contextual embeddings (Anthropic's approach)
 * - Hybrid search support (vector + FTS)
 *
 * Usage: npm run reprocess-knowledge
 */

import dotenv from "dotenv";
import path from "path";

// Load environment variables BEFORE any other imports
dotenv.config({ path: path.resolve(__dirname, "../.env") });

// Now load modules that depend on env vars
async function loadModules() {
  const pdfParseModule = await import("pdf-parse");
  const supabaseModule = await import("../src/lib/supabase");
  const ragModule = await import("../src/services/rag");

  return {
    pdfParse: pdfParseModule.default,
    supabase: supabaseModule.supabaseAdmin,
    createProcessingPipeline: ragModule.createProcessingPipeline,
  };
}

interface KnowledgeSource {
  id: string;
  project_id: string;
  name: string;
  type: string;
  content: string | null;
  file_path: string | null;
  status: string;
}

interface DocumentMetadata {
  name: string;
  type: string;
  description?: string;
  [key: string]: unknown;
}

async function main(): Promise<void> {
  console.log("============================================");
  console.log("RAG v2 Knowledge Re-processing");
  console.log("============================================\n");

  // Load modules with env vars set
  const { pdfParse, supabase, createProcessingPipeline } = await loadModules();

  // Fetch all knowledge sources
  const { data: sources, error } = await supabase
    .from("knowledge_sources")
    .select("id, project_id, name, type, content, file_path, status")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Failed to fetch knowledge sources:", error);
    process.exit(1);
  }

  if (!sources || sources.length === 0) {
    console.log("No knowledge sources found.");
    return;
  }

  console.log(`Found ${sources.length} knowledge source(s) to process.\n`);

  let success = 0;
  let failed = 0;

  for (const source of sources as KnowledgeSource[]) {
    console.log(`\n[${source.id}] Processing: ${source.name} (${source.type})`);

    try {
      let text: string | null = source.content;

      // Extract text from file if needed
      if (source.file_path) {
        console.log(`  Downloading file: ${source.file_path}`);
        const { data: fileData, error: downloadError } = await supabase.storage
          .from("knowledge-files")
          .download(source.file_path);

        if (downloadError) {
          throw new Error(`Failed to download file: ${downloadError.message}`);
        }

        if (source.file_path.endsWith(".pdf")) {
          const buffer = Buffer.from(await fileData.arrayBuffer());
          const pdfData = await pdfParse(buffer);
          text = pdfData.text;

          if (!text || text.trim().length < 10) {
            throw new Error("PDF contains no extractable text");
          }
        } else {
          text = await fileData.text();
        }
      }

      if (!text || text.trim().length === 0) {
        throw new Error("Content is empty");
      }

      // Update status to processing
      await supabase
        .from("knowledge_sources")
        .update({ status: "processing", error: null })
        .eq("id", source.id);

      // Process through RAG v2 pipeline
      console.log(`  Processing with RAG v2 pipeline...`);
      const pipeline = createProcessingPipeline();
      const documentMetadata: DocumentMetadata = {
        name: source.name,
        type: source.type,
      };

      const processedChunks = await pipeline.process(
        text,
        documentMetadata,
        (stage: string, completed: number, total: number) => {
          console.log(`    ${stage}: ${completed}/${total}`);
        }
      );

      if (processedChunks.length === 0) {
        throw new Error("No valid chunks generated from content");
      }

      console.log(`  Generated ${processedChunks.length} contextual chunks`);

      // Delete old chunks
      console.log(`  Deleting old chunks...`);
      const { error: deleteError } = await supabase
        .from("knowledge_chunks")
        .delete()
        .eq("source_id", source.id);

      if (deleteError) {
        console.error(`  Warning: Failed to delete old chunks: ${deleteError.message}`);
      }

      // Insert new chunks
      console.log(`  Inserting new chunks...`);
      const chunkRecords = processedChunks.map((chunk) => ({
        source_id: source.id,
        content: chunk.content,
        context: chunk.context,
        embedding: `[${chunk.embedding.join(",")}]`,
        metadata: {
          index: chunk.index,
          tokenEstimate: chunk.metadata?.tokenEstimate,
        },
      }));

      const { error: insertError } = await supabase
        .from("knowledge_chunks")
        .insert(chunkRecords);

      if (insertError) {
        throw new Error(`Failed to insert chunks: ${insertError.message}`);
      }

      // Update source status
      await supabase
        .from("knowledge_sources")
        .update({
          status: "ready",
          chunk_count: processedChunks.length,
          error: null,
        })
        .eq("id", source.id);

      console.log(`  Done! ${processedChunks.length} chunks stored.`);
      success++;
    } catch (error) {
      console.error(`  Failed: ${error instanceof Error ? error.message : String(error)}`);

      // Update source with failed status
      await supabase
        .from("knowledge_sources")
        .update({
          status: "failed",
          error: error instanceof Error ? error.message : "Processing failed",
        })
        .eq("id", source.id);

      failed++;
    }
  }

  console.log("\n============================================");
  console.log("Re-processing Complete!");
  console.log("============================================");
  console.log(`  Success: ${success}`);
  console.log(`  Failed: ${failed}`);
  console.log(`  Total: ${sources.length}`);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
