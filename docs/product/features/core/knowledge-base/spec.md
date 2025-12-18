# Feature: Knowledge Base Management

## Overview

**Feature ID**: `knowledge-base`
**Category**: Core (V1)
**Priority**: P0 (Core functionality)
**Complexity**: L
**Estimated Effort**: 4-5 days

### Summary
Users upload content (raw text, .txt files, .pdf files) that becomes the chatbot's knowledge source. Content is processed through a pipeline: text extraction, chunking, embedding generation, and vector storage. The chatbot uses this knowledge via RAG (Retrieval Augmented Generation) to answer user questions accurately.

### Dependencies
- `database-setup` - Tables for knowledge_sources and knowledge_chunks must exist
- `auth-system` - User must be authenticated to manage knowledge

### Success Criteria
- [ ] Users can add knowledge via text paste, .txt upload, or .pdf upload
- [ ] Content is chunked into ~500 token segments with overlap
- [ ] Embeddings are generated using OpenAI text-embedding-3-small
- [ ] Processing happens asynchronously (UI doesn't block)
- [ ] Users can see processing status (processing/ready/failed)
- [ ] Users can delete knowledge sources (cascades to chunks)
- [ ] Knowledge is searchable via vector similarity

---

## User Stories

### Primary User Story
> As a business owner, I want to upload my FAQs and product information so that the chatbot can answer customer questions accurately.

### Additional Stories
1. As a user, I want to paste text directly so that I can quickly add short content without creating a file.
2. As a user, I want to upload PDF documents so that I can use my existing documentation.
3. As a user, I want to see when my content is ready so that I know when the chatbot can use it.
4. As a user, I want to delete outdated knowledge so that my chatbot gives accurate answers.
5. As a user, I want to view my text knowledge content so that I can verify what was added.
6. As a user, I want to download uploaded files (TXT/PDF) so that I can verify the original content.

---

## Functional Requirements

### Knowledge Management

| ID | Requirement | Priority | Notes |
|----|-------------|----------|-------|
| KB-001 | User can paste raw text as knowledge source | Must Have | Direct text input |
| KB-002 | User can upload .txt files | Must Have | Plain text files |
| KB-003 | User can upload .pdf files | Must Have | PDF text extraction |
| KB-004 | User can provide name for knowledge source | Must Have | Required field |
| KB-005 | System validates file type before upload | Must Have | Only .txt, .pdf |
| KB-006 | System validates file size (max 10MB) | Must Have | Prevent abuse |
| KB-007 | System shows list of all knowledge sources | Must Have | With status |
| KB-008 | User can delete a knowledge source | Must Have | Cascade delete chunks |
| KB-009 | System shows processing status | Must Have | processing/ready/failed |
| KB-010 | System shows chunk count per source | Should Have | Post-processing |
| KB-011 | System shows error message on failure | Should Have | Debugging aid |
| KB-012 | Limit 20 sources per project (V1) | Should Have | Prevent abuse |
| KB-013 | Limit 1,000 total chunks per project | Should Have | Cost control |
| KB-014 | User can view text content in modal | Must Have | View original text |
| KB-015 | User can download uploaded files (TXT/PDF) | Must Have | Retrieve original file |

### Content Processing Pipeline

| ID | Requirement | Priority | Notes |
|----|-------------|----------|-------|
| KB-101 | Extract text from PDF files | Must Have | Use pdf-parse library |
| KB-102 | Chunk text into ~500 token segments | Must Have | Configurable |
| KB-103 | Include 50 token overlap between chunks | Must Have | Context preservation |
| KB-104 | Preserve paragraph/sentence boundaries | Should Have | Better context |
| KB-105 | Generate embeddings using text-embedding-3-small | Must Have | 1536 dimensions |
| KB-106 | Store chunks with embeddings in database | Must Have | pgvector column |
| KB-107 | Process asynchronously (background job) | Must Have | Non-blocking |
| KB-108 | Update source status after processing | Must Have | Status tracking |
| KB-109 | Handle processing errors gracefully | Must Have | Set failed status |

---

## User Interface

### Knowledge Base Page (`/dashboard/knowledge`)

**Route**: `/dashboard/knowledge`
**Purpose**: View and manage all knowledge sources

**Layout**:
```
┌─────────────────────────────────────────────────────────────────┐
│  Sidebar  │  Knowledge Base                   [+ Add Knowledge] │
│           ├─────────────────────────────────────────────────────│
│           │                                                     │
│           │  Your chatbot uses this content to answer           │
│           │  questions from your customers.                     │
│           │                                                     │
│           │  ┌───────────────────────────────────────────────┐  │
│           │  │ 📄 FAQ Document                               │  │
│           │  │ PDF • 24 chunks • Added Dec 15, 2024          │  │
│           │  │ ✓ Ready                          [🗑 Delete]   │  │
│           │  └───────────────────────────────────────────────┘  │
│           │                                                     │
│           │  ┌───────────────────────────────────────────────┐  │
│           │  │ 📝 Product Descriptions                       │  │
│           │  │ Text • 12 chunks • Added Dec 14, 2024         │  │
│           │  │ ✓ Ready                          [🗑 Delete]   │  │
│           │  └───────────────────────────────────────────────┘  │
│           │                                                     │
│           │  ┌───────────────────────────────────────────────┐  │
│           │  │ 📄 Shipping Policy                            │  │
│           │  │ Text file • Processing...                     │  │
│           │  │ ⏳ Processing                                  │  │
│           │  └───────────────────────────────────────────────┘  │
│           │                                                     │
│           │  ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐  │
│           │    Empty state: No knowledge sources yet.        │  │
│           │    Add your first knowledge to get started.      │  │
│           │  └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘  │
│           │                                                     │
└───────────┴─────────────────────────────────────────────────────┘
```

**Components**:
| Component | Type | Props/State | Behavior |
|-----------|------|-------------|----------|
| Page Header | Header | title | Shows page title and add button |
| Add Button | Button | onClick | Opens add knowledge modal |
| Source Card | Card | source | Displays source info, status, delete |
| Status Badge | Badge | status | Shows processing/ready/failed |
| Delete Button | Button | onClick | Confirms and deletes source |
| Empty State | Component | - | Shows when no sources exist |

**States**:
- **Loading**: Skeleton cards while fetching sources
- **Empty**: Empty state message with CTA
- **Populated**: List of source cards
- **Error**: Error message with retry option

### Add Knowledge Modal

**Purpose**: Add new knowledge source via text, file, or PDF

**Layout**:
```
┌─────────────────────────────────────────────────────────────────┐
│  Add Knowledge                                            [X]   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌────────────────┬────────────────┬────────────────┐          │
│  │   Paste Text   │   Upload File  │   Upload PDF   │          │
│  │    (active)    │                │                │          │
│  └────────────────┴────────────────┴────────────────┘          │
│                                                                 │
│  Source Name *                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ FAQ Content                                              │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Content *                                                      │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Paste your text content here...                         │   │
│  │                                                          │   │
│  │                                                          │   │
│  │                                                          │   │
│  │                                                          │   │
│  │                                                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│  ℹ️ Maximum 100,000 characters                                  │
│                                                                 │
│                                                                 │
│                              [Cancel]  [Add Knowledge]          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Tab: Upload File**:
```
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                                                          │   │
│  │     ┌──────────────────────────────────────────┐        │   │
│  │     │                                          │        │   │
│  │     │    📄 Drag and drop your .txt file      │        │   │
│  │     │         or click to browse              │        │   │
│  │     │                                          │        │   │
│  │     │         Maximum size: 10MB              │        │   │
│  │     │                                          │        │   │
│  │     └──────────────────────────────────────────┘        │   │
│  │                                                          │   │
│  └─────────────────────────────────────────────────────────┘   │
```

**Tab: Upload PDF**:
```
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                                                          │   │
│  │     ┌──────────────────────────────────────────┐        │   │
│  │     │                                          │        │   │
│  │     │    📄 Drag and drop your .pdf file      │        │   │
│  │     │         or click to browse              │        │   │
│  │     │                                          │        │   │
│  │     │         Maximum size: 10MB              │        │   │
│  │     │                                          │        │   │
│  │     └──────────────────────────────────────────┘        │   │
│  │                                                          │   │
│  │  ⚠️ Note: Scanned PDFs (images) are not supported.       │   │
│  │     PDF must contain actual text.                        │   │
│  │                                                          │   │
│  └─────────────────────────────────────────────────────────┘   │
```

---

## User Flow

### Adding Knowledge

```
┌─────────────────────────────────────────────────────────────────┐
│                  ADD KNOWLEDGE FLOW                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   1. User clicks "+ Add Knowledge" button                       │
│      │                                                          │
│      ▼                                                          │
│   2. Modal opens with three tabs                                │
│      │                                                          │
│      ├── [Paste Text]                                           │
│      │   • User enters name                                     │
│      │   • User pastes content                                  │
│      │   • Click "Add Knowledge"                                │
│      │                                                          │
│      ├── [Upload File]                                          │
│      │   • User selects/drops .txt file                         │
│      │   • Name auto-fills from filename                        │
│      │   • Click "Add Knowledge"                                │
│      │                                                          │
│      └── [Upload PDF]                                           │
│          • User selects/drops .pdf file                         │
│          • Name auto-fills from filename                        │
│          • Click "Add Knowledge"                                │
│      │                                                          │
│      ▼                                                          │
│   3. Validation                                                 │
│      │                                                          │
│      ├── [Invalid] → Show error, stay in modal                  │
│      │                                                          │
│      └── [Valid] → Continue                                     │
│           │                                                     │
│           ▼                                                     │
│   4. Submit to API                                              │
│      • Create knowledge source record (status: processing)      │
│      • Upload file to Supabase Storage (if file)                │
│      • Queue background processing job                          │
│      │                                                          │
│      ▼                                                          │
│   5. Modal closes, source appears in list                       │
│      • Shows "Processing..." status                             │
│      │                                                          │
│      ▼                                                          │
│   6. Background job processes content                           │
│      • Extract text (if PDF)                                    │
│      • Chunk content                                            │
│      • Generate embeddings                                      │
│      • Store chunks                                             │
│      │                                                          │
│      ▼                                                          │
│   7. Status updates to "Ready" (or "Failed")                    │
│      • UI polls or uses realtime subscription                   │
│      • Shows chunk count                                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## API Specification

### Endpoints

#### GET /api/knowledge

**Purpose**: List all knowledge sources for the authenticated user's project

**Authentication**: Required (Supabase JWT)

**Response**:
```typescript
// 200 OK
{
  "sources": [
    {
      "id": "src_abc123",
      "name": "FAQ Document",
      "type": "pdf",
      "status": "ready",
      "chunkCount": 24,
      "createdAt": "2024-12-15T10:30:00Z"
    },
    {
      "id": "src_def456",
      "name": "Product Info",
      "type": "text",
      "status": "processing",
      "chunkCount": 0,
      "createdAt": "2024-12-15T11:00:00Z"
    }
  ]
}
```

#### POST /api/knowledge

**Purpose**: Create a new knowledge source

**Authentication**: Required (Supabase JWT)

**Request**:
```typescript
// Headers
{
  "Authorization": "Bearer {jwt}",
  "Content-Type": "multipart/form-data"
}

// Body (FormData)
{
  "name": "FAQ Document",        // Required
  "type": "text" | "file" | "pdf", // Required
  "content": "...",              // Required for type=text
  "file": File                   // Required for type=file or pdf
}
```

**Response**:
```typescript
// 201 Created
{
  "source": {
    "id": "src_abc123",
    "name": "FAQ Document",
    "type": "text",
    "status": "processing",
    "createdAt": "2024-12-15T10:30:00Z"
  }
}

// 400 Bad Request - Validation error
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Name is required",
    "details": { "field": "name" }
  }
}

// 400 Bad Request - File too large
{
  "error": {
    "code": "FILE_TOO_LARGE",
    "message": "File exceeds 10MB limit"
  }
}

// 400 Bad Request - Invalid file type
{
  "error": {
    "code": "INVALID_FILE_TYPE",
    "message": "Only .txt and .pdf files are supported"
  }
}

// 400 Bad Request - Limit reached
{
  "error": {
    "code": "LIMIT_REACHED",
    "message": "Maximum 20 knowledge sources per project"
  }
}
```

#### DELETE /api/knowledge/:id

**Purpose**: Delete a knowledge source and all its chunks

**Authentication**: Required (Supabase JWT)

**Response**:
```typescript
// 204 No Content - Success

// 404 Not Found
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Knowledge source not found"
  }
}
```

---

## Business Logic

### Content Processing Pipeline

**Purpose**: Transform uploaded content into searchable knowledge chunks

**Input**:
- `sourceId`: UUID - Knowledge source record ID
- `content`: string | null - Raw text content (for type=text)
- `filePath`: string | null - Storage path (for type=file or pdf)

**Output**:
- Chunks stored in `knowledge_chunks` table
- Source status updated to `ready` or `failed`

**Algorithm**:
```
1. IF filePath exists:
   a. Download file from Supabase Storage
   b. IF PDF:
      - Extract text using pdf-parse
      - Handle extraction errors
   c. ELSE (txt):
      - Read as plain text
2. ELSE:
   a. Use content directly

3. Validate text is not empty

4. Chunk text:
   a. Target: ~500 tokens per chunk
   b. Overlap: 50 tokens
   c. Preserve paragraph/sentence boundaries
   d. Skip chunks smaller than 100 tokens

5. Generate embeddings:
   a. Batch chunks (max 100 per request to OpenAI)
   b. Call text-embedding-3-small
   c. Handle rate limits/errors

6. Store chunks:
   a. Insert all chunks with embeddings
   b. Update source chunk_count

7. Update source status:
   a. IF success: status = 'ready'
   b. IF error: status = 'failed', error = message
```

### Chunking Algorithm

```typescript
interface ChunkingConfig {
  maxTokens: number;      // 500
  overlapTokens: number;  // 50
  minChunkSize: number;   // 100
}

interface Chunk {
  content: string;
  metadata: {
    position: number;
    startChar: number;
    endChar: number;
  };
}

function chunkText(text: string, config: ChunkingConfig): Chunk[] {
  const chunks: Chunk[] = [];
  const paragraphs = text.split(/\n\n+/);

  let currentChunk = '';
  let currentTokens = 0;
  let position = 0;
  let startChar = 0;

  for (const paragraph of paragraphs) {
    const paragraphTokens = estimateTokens(paragraph);

    // If paragraph alone exceeds max, split by sentences
    if (paragraphTokens > config.maxTokens) {
      // Split into sentences and process
      const sentences = paragraph.match(/[^.!?]+[.!?]+/g) || [paragraph];
      for (const sentence of sentences) {
        // Add to current chunk or start new one
        // ... (sentence-level logic)
      }
    } else if (currentTokens + paragraphTokens > config.maxTokens) {
      // Save current chunk and start new one with overlap
      if (currentTokens >= config.minChunkSize) {
        chunks.push({
          content: currentChunk.trim(),
          metadata: { position, startChar, endChar: startChar + currentChunk.length }
        });
        position++;
      }

      // Start new chunk with overlap from previous
      const overlapText = getOverlapText(currentChunk, config.overlapTokens);
      currentChunk = overlapText + paragraph + '\n\n';
      currentTokens = estimateTokens(currentChunk);
      startChar = startChar + currentChunk.length - overlapText.length;
    } else {
      // Add paragraph to current chunk
      currentChunk += paragraph + '\n\n';
      currentTokens += paragraphTokens;
    }
  }

  // Don't forget the last chunk
  if (currentTokens >= config.minChunkSize) {
    chunks.push({
      content: currentChunk.trim(),
      metadata: { position, startChar, endChar: startChar + currentChunk.length }
    });
  }

  return chunks;
}

function estimateTokens(text: string): number {
  // Rough estimate: 1 token ≈ 4 characters for English
  return Math.ceil(text.length / 4);
}
```

---

## Technical Implementation

### API Route Handler

```typescript
// apps/api/src/routes/knowledge.ts
import { Router } from 'express';
import { createServerClient } from '@chatbot/db';
import { z } from 'zod';
import multer from 'multer';

const router = Router();
const upload = multer({ limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB

// Validation schema
const createKnowledgeSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(['text', 'file', 'pdf']),
  content: z.string().max(100000).optional(),
});

// POST /api/knowledge
router.post('/', upload.single('file'), async (req, res) => {
  try {
    const supabase = createServerClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      req.headers.authorization?.replace('Bearer ', '')
    );

    if (authError || !user) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED' } });
    }

    // Get user's project
    const { data: project } = await supabase
      .from('projects')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!project) {
      return res.status(404).json({ error: { code: 'PROJECT_NOT_FOUND' } });
    }

    // Validate input
    const body = createKnowledgeSchema.parse(req.body);

    // Check source limit
    const { count } = await supabase
      .from('knowledge_sources')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', project.id);

    if (count && count >= 20) {
      return res.status(400).json({
        error: { code: 'LIMIT_REACHED', message: 'Maximum 20 sources per project' }
      });
    }

    // Validate file if provided
    const file = req.file;
    if (body.type !== 'text' && !file) {
      return res.status(400).json({
        error: { code: 'FILE_REQUIRED', message: 'File is required for this type' }
      });
    }

    if (file) {
      const allowedTypes = {
        file: ['text/plain'],
        pdf: ['application/pdf'],
      };
      if (!allowedTypes[body.type]?.includes(file.mimetype)) {
        return res.status(400).json({
          error: { code: 'INVALID_FILE_TYPE' }
        });
      }
    }

    // Create knowledge source record
    const { data: source, error: createError } = await supabase
      .from('knowledge_sources')
      .insert({
        project_id: project.id,
        type: body.type,
        name: body.name,
        content: body.type === 'text' ? body.content : null,
        status: 'processing',
      })
      .select()
      .single();

    if (createError) throw createError;

    // Upload file to storage if present
    let filePath: string | null = null;
    if (file) {
      const fileName = `${project.id}/${source.id}/${file.originalname}`;
      const { error: uploadError } = await supabase.storage
        .from('knowledge-files')
        .upload(fileName, file.buffer, {
          contentType: file.mimetype,
        });

      if (uploadError) throw uploadError;

      filePath = fileName;

      // Update source with file path
      await supabase
        .from('knowledge_sources')
        .update({ file_path: filePath })
        .eq('id', source.id);
    }

    // Queue background processing job
    await queueKnowledgeProcessing({
      sourceId: source.id,
      content: body.content || null,
      filePath,
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
    console.error('Knowledge creation error:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR' } });
  }
});

export default router;
```

### Background Processing Job

```typescript
// apps/api/src/services/knowledge-processor.ts
import { createServerClient } from '@chatbot/db';
import { OpenAI } from 'openai';
import pdfParse from 'pdf-parse';
import { chunkText } from './chunking';

const openai = new OpenAI();

interface ProcessJobData {
  sourceId: string;
  content: string | null;
  filePath: string | null;
}

export async function processKnowledge(data: ProcessJobData): Promise<void> {
  const supabase = createServerClient();
  const { sourceId, content, filePath } = data;

  try {
    // Step 1: Get text content
    let text = content;

    if (filePath) {
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('knowledge-files')
        .download(filePath);

      if (downloadError) throw downloadError;

      if (filePath.endsWith('.pdf')) {
        const pdfData = await pdfParse(Buffer.from(await fileData.arrayBuffer()));
        text = pdfData.text;

        if (!text || text.trim().length < 10) {
          throw new Error('PDF contains no extractable text');
        }
      } else {
        text = await fileData.text();
      }
    }

    if (!text || text.trim().length === 0) {
      throw new Error('Content is empty');
    }

    // Step 2: Chunk the text
    const chunks = chunkText(text, {
      maxTokens: 500,
      overlapTokens: 50,
      minChunkSize: 100,
    });

    if (chunks.length === 0) {
      throw new Error('No valid chunks generated');
    }

    // Step 3: Generate embeddings in batches
    const BATCH_SIZE = 100;
    const allEmbeddings: number[][] = [];

    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE);
      const response = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: batch.map(c => c.content),
      });

      allEmbeddings.push(...response.data.map(d => d.embedding));
    }

    // Step 4: Store chunks with embeddings
    const chunkRecords = chunks.map((chunk, i) => ({
      source_id: sourceId,
      content: chunk.content,
      embedding: allEmbeddings[i],
      metadata: chunk.metadata,
    }));

    const { error: insertError } = await supabase
      .from('knowledge_chunks')
      .insert(chunkRecords);

    if (insertError) throw insertError;

    // Step 5: Update source status
    await supabase
      .from('knowledge_sources')
      .update({
        status: 'ready',
        chunk_count: chunks.length,
      })
      .eq('id', sourceId);

  } catch (error) {
    console.error(`Knowledge processing failed for ${sourceId}:`, error);

    // Update source with failed status
    await supabase
      .from('knowledge_sources')
      .update({
        status: 'failed',
        error: error instanceof Error ? error.message : 'Processing failed',
      })
      .eq('id', sourceId);
  }
}
```

### Frontend Component

```typescript
// apps/web/components/features/knowledge/knowledge-list.tsx
'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button, Card, Badge, Dialog, Tabs } from '@chatbot/ui';
import { Trash2, Plus, FileText, File } from 'lucide-react';
import { AddKnowledgeModal } from './add-knowledge-modal';

interface KnowledgeSource {
  id: string;
  name: string;
  type: 'text' | 'file' | 'pdf';
  status: 'processing' | 'ready' | 'failed';
  chunkCount: number;
  createdAt: string;
  error?: string;
}

export function KnowledgeList() {
  const [sources, setSources] = useState<KnowledgeSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    fetchSources();

    // Set up realtime subscription for status updates
    const channel = supabase
      .channel('knowledge-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'knowledge_sources',
        },
        (payload) => {
          setSources(prev =>
            prev.map(s =>
              s.id === payload.new.id
                ? { ...s, status: payload.new.status, chunkCount: payload.new.chunk_count }
                : s
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchSources = async () => {
    const response = await fetch('/api/knowledge', {
      headers: { Authorization: `Bearer ${await getAccessToken()}` },
    });
    const data = await response.json();
    setSources(data.sources);
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this knowledge source?')) return;

    await fetch(`/api/knowledge/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${await getAccessToken()}` },
    });

    setSources(prev => prev.filter(s => s.id !== id));
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ready':
        return <Badge variant="success">Ready</Badge>;
      case 'processing':
        return <Badge variant="warning">Processing...</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return null;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'pdf':
        return <File className="h-5 w-5 text-red-500" />;
      default:
        return <FileText className="h-5 w-5 text-blue-500" />;
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Knowledge Base</h1>
          <p className="text-muted-foreground">
            Your chatbot uses this content to answer questions.
          </p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Knowledge
        </Button>
      </div>

      {sources.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">
            No knowledge sources yet. Add your first knowledge to get started.
          </p>
          <Button className="mt-4" onClick={() => setModalOpen(true)}>
            Add Knowledge
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {sources.map((source) => (
            <Card key={source.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getTypeIcon(source.type)}
                  <div>
                    <h3 className="font-medium">{source.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {source.type.toUpperCase()}
                      {source.status === 'ready' && ` • ${source.chunkCount} chunks`}
                      {' • Added '}
                      {new Date(source.createdAt).toLocaleDateString()}
                    </p>
                    {source.error && (
                      <p className="text-sm text-red-500">{source.error}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {getStatusBadge(source.status)}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(source.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <AddKnowledgeModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSuccess={() => {
          fetchSources();
          setModalOpen(false);
        }}
      />
    </div>
  );
}
```

---

## Error Handling

### Error Codes

| Code | HTTP Status | Message | When It Occurs | User-Facing Message |
|------|-------------|---------|----------------|---------------------|
| VALIDATION_ERROR | 400 | Field validation failed | Missing/invalid input | "Please check your input" |
| FILE_TOO_LARGE | 400 | File exceeds 10MB | File >10MB uploaded | "File is too large (max 10MB)" |
| INVALID_FILE_TYPE | 400 | Unsupported file type | Wrong file extension | "Only .txt and .pdf files supported" |
| LIMIT_REACHED | 400 | Max sources exceeded | >20 sources | "Maximum 20 sources per project" |
| EMPTY_CONTENT | 400 | No text extracted | PDF is scanned/empty | "No text found in file" |
| PROCESSING_FAILED | 500 | Background job failed | Embedding/storage error | "Processing failed, please try again" |

---

## Edge Cases

| # | Scenario | Expected Behavior | Test Case |
|---|----------|-------------------|-----------|
| 1 | Empty text pasted | Show validation error | Paste empty string |
| 2 | Text exceeds 100k chars | Show error, prevent submit | Paste 150k chars |
| 3 | Upload 15MB file | Show error before upload | Select large file |
| 4 | Upload .docx file | Show "unsupported type" error | Select .docx |
| 5 | Scanned PDF (no text) | Set status to "failed" with message | Upload image-only PDF |
| 6 | Corrupt PDF | Set status to "failed" with message | Upload malformed PDF |
| 7 | Delete while processing | Delete succeeds, job handles gracefully | Delete processing source |
| 8 | Upload duplicate filename | Allow (names don't need to be unique) | Upload same file twice |
| 9 | 21st source attempt | Show limit error | Try to add 21st source |
| 10 | Network error during upload | Show error, allow retry | Disable network mid-upload |

---

## Testing Requirements

### Unit Tests
- [ ] chunkText correctly splits text at boundaries
- [ ] chunkText includes proper overlap
- [ ] chunkText handles edge cases (empty, single paragraph)
- [ ] Token estimation is reasonably accurate
- [ ] PDF extraction handles normal PDFs
- [ ] Validation catches all error cases

### Integration Tests
- [ ] Full upload flow for text content
- [ ] Full upload flow for .txt file
- [ ] Full upload flow for .pdf file
- [ ] Background job completes successfully
- [ ] Chunks are searchable after processing
- [ ] Delete cascades to chunks

### E2E Tests
- [ ] User can add text knowledge
- [ ] User can upload file knowledge
- [ ] Status updates in real-time
- [ ] User can delete knowledge
- [ ] Error states display correctly

---

## Acceptance Criteria

### Definition of Done
- [ ] All three input methods working (text, file, PDF)
- [ ] Processing pipeline completes successfully
- [ ] Chunks stored with valid embeddings
- [ ] Status updates reflected in UI
- [ ] Delete removes source and all chunks
- [ ] Error handling covers all cases
- [ ] File size and type validation working
- [ ] Source limit enforced
- [ ] Vector similarity search working

### Demo Checklist
- [ ] Upload a PDF and show chunks created
- [ ] Paste text and show processing
- [ ] Delete a source and verify chunks removed
- [ ] Show error handling for invalid file
- [ ] Show real-time status updates

---

## Open Questions

None - This spec is complete and ready for implementation.

---

## Changelog

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | December 2024 | Morgan (PM) | Initial spec |
