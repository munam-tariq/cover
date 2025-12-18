# Feature: DOCX Support

## Overview

**Feature ID**: `docx-support`
**Category**: Enhanced (V2)
**Priority**: P1 (Post-MVP Enhancement)
**Complexity**: S (Small)
**Estimated Effort**: 2 days

### Summary
Extends the knowledge base file upload capability to support Microsoft Word documents (.doc and .docx). Automatically extracts text content from Word files, preserves formatting structure, and processes them through the same chunking and embedding pipeline as plain text files.

### Dependencies
- `knowledge-base` - Must use same processing pipeline
- `dashboard` - File upload UI

### Success Criteria
- [ ] Upload .docx files (modern Word format)
- [ ] Upload .doc files (legacy Word format)
- [ ] Extract text with basic formatting preserved
- [ ] Handle tables and lists
- [ ] Maximum file size: 10MB
- [ ] Processing time: <30s for typical documents

---

## User Stories

### Primary User Story
> As a business owner, I want to upload Word documents directly to my knowledge base instead of converting them to plain text first.

### Additional Stories
1. As a business owner, I want to upload my product documentation Word files so customers can ask about my products.
2. As a business owner, I want to upload policy documents so the chatbot knows company policies.
3. As a business owner, I want tables in my Word docs to be readable so data is preserved.

---

## Functional Requirements

### DOCX Processing

| ID | Requirement | Priority | Notes |
|----|-------------|----------|-------|
| DOC-001 | Accept .docx file uploads | Must Have | Modern format |
| DOC-002 | Accept .doc file uploads | Should Have | Legacy format |
| DOC-003 | Extract text content | Must Have | Preserve paragraphs |
| DOC-004 | Preserve basic formatting | Should Have | Headings, lists |
| DOC-005 | Extract table content | Should Have | Convert to text |
| DOC-006 | Handle images (ignore or OCR) | Nice to Have | Extract captions |
| DOC-007 | File size limit: 10MB | Must Have | Prevent abuse |
| DOC-008 | Show word count after extraction | Must Have | Preview info |
| DOC-009 | Handle corrupted files gracefully | Must Have | Clear error |

---

## UI Mockup

```
┌─────────────────────────────────────────────────────────────┐
│  Upload Knowledge Files                                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Supported formats: .txt, .pdf, .doc, .docx                  │
│  Maximum file size: 10MB                                     │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                                                      │    │
│  │         📄  Drag and drop files here                │    │
│  │                                                      │    │
│  │              or click to browse                      │    │
│  │                                                      │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  ─────────────────────────────────────────────────────       │
│                                                               │
│  Uploaded Files                                               │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ 📄 Product_Documentation.docx                        │    │
│  │    5.2 MB • 3,450 words • Processing... ⏳          │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ 📄 Return_Policy.doc                                 │    │
│  │    1.8 MB • 890 words • Completed ✓                 │    │
│  │    Created 15 knowledge chunks                       │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ 📄 Large_File.docx                                   │    │
│  │    12 MB • Failed ✗                                  │    │
│  │    Error: File exceeds 10MB limit                    │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## Technical Approach

### File Upload Validation

```typescript
// apps/api/src/middleware/file-upload.ts
import multer from 'multer';

const ALLOWED_MIME_TYPES = [
  'text/plain',
  'application/pdf',
  'application/msword', // .doc
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file type'));
    }
  },
});

export default upload;
```

### DOCX Text Extraction

```typescript
// apps/api/src/services/docx-extractor.ts
import mammoth from 'mammoth'; // For .docx
import textract from 'textract'; // For legacy .doc

interface ExtractedDocument {
  text: string;
  wordCount: number;
  metadata: {
    hasImages: boolean;
    hasTables: boolean;
    pageCount?: number;
  };
}

async function extractDocxText(buffer: Buffer): Promise<ExtractedDocument> {
  try {
    // Use mammoth for modern .docx files
    const result = await mammoth.extractRawText({ buffer });

    const text = result.value.trim();
    const wordCount = text.split(/\s+/).length;

    // Check for tables (simple heuristic)
    const hasTables = result.messages.some(
      (msg) => msg.type === 'warning' && msg.message.includes('table')
    );

    return {
      text,
      wordCount,
      metadata: {
        hasImages: false, // mammoth doesn't extract images
        hasTables,
      },
    };
  } catch (error) {
    throw new Error(`Failed to extract DOCX content: ${error.message}`);
  }
}

async function extractDocText(buffer: Buffer): Promise<ExtractedDocument> {
  return new Promise((resolve, reject) => {
    // Use textract for legacy .doc files
    textract.fromBufferWithMime(
      'application/msword',
      buffer,
      (error, text) => {
        if (error) {
          reject(new Error(`Failed to extract DOC content: ${error.message}`));
          return;
        }

        const cleanedText = text.trim();
        const wordCount = cleanedText.split(/\s+/).length;

        resolve({
          text: cleanedText,
          wordCount,
          metadata: {
            hasImages: false,
            hasTables: false,
          },
        });
      }
    );
  });
}

export async function extractWordDocument(
  buffer: Buffer,
  mimeType: string
): Promise<ExtractedDocument> {
  if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    return extractDocxText(buffer);
  } else if (mimeType === 'application/msword') {
    return extractDocText(buffer);
  } else {
    throw new Error('Unsupported Word document format');
  }
}
```

### Table Extraction (Enhanced)

```typescript
// apps/api/src/services/table-extractor.ts
import mammoth from 'mammoth';

async function extractDocxWithTables(buffer: Buffer): Promise<string> {
  // Convert to markdown-like format to preserve structure
  const result = await mammoth.convertToMarkdown({ buffer });

  // Tables will be converted to markdown tables
  return result.value;
}

// Example output:
// | Product | Price | Stock |
// |---------|-------|-------|
// | Widget  | $10   | 50    |
// | Gadget  | $20   | 30    |
```

### API Endpoint Integration

```typescript
// apps/api/src/routes/knowledge.ts
import { extractWordDocument } from '../services/docx-extractor';

router.post('/knowledge/:projectId/upload', upload.single('file'), async (req, res) => {
  const { projectId } = req.params;
  const file = req.file;

  if (!file) {
    return res.status(400).json({ error: 'No file provided' });
  }

  try {
    let extractedText: string;
    let wordCount: number;

    // Handle different file types
    if (file.mimetype === 'text/plain') {
      extractedText = file.buffer.toString('utf-8');
      wordCount = extractedText.split(/\s+/).length;
    } else if (
      file.mimetype === 'application/msword' ||
      file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      const result = await extractWordDocument(file.buffer, file.mimetype);
      extractedText = result.text;
      wordCount = result.wordCount;
    } else if (file.mimetype === 'application/pdf') {
      // Handle PDF (existing logic)
      const result = await extractPdfText(file.buffer);
      extractedText = result.text;
      wordCount = result.wordCount;
    } else {
      return res.status(400).json({ error: 'Unsupported file type' });
    }

    // Create knowledge source
    const source = await createKnowledgeSource({
      projectId,
      name: file.originalname,
      type: 'file',
    });

    // Chunk and embed
    const chunks = await chunkText(extractedText);
    await embedAndSaveChunks(projectId, source.id, chunks);

    res.json({
      success: true,
      source,
      wordCount,
      chunkCount: chunks.length,
    });
  } catch (error) {
    console.error('File processing error:', error);
    res.status(500).json({
      error: 'Failed to process file',
      message: error.message,
    });
  }
});
```

### Error Handling

```typescript
// Common error scenarios
const FILE_ERRORS = {
  TOO_LARGE: {
    code: 'FILE_TOO_LARGE',
    message: 'File exceeds 10MB size limit',
  },
  CORRUPTED: {
    code: 'FILE_CORRUPTED',
    message: 'File appears to be corrupted or invalid',
  },
  UNSUPPORTED: {
    code: 'UNSUPPORTED_FORMAT',
    message: 'File format not supported',
  },
  EMPTY: {
    code: 'EMPTY_FILE',
    message: 'No text content found in file',
  },
};

function handleExtractionError(error: Error) {
  if (error.message.includes('corrupted')) {
    return FILE_ERRORS.CORRUPTED;
  }
  if (error.message.includes('invalid')) {
    return FILE_ERRORS.UNSUPPORTED;
  }
  return {
    code: 'EXTRACTION_FAILED',
    message: 'Failed to extract text from document',
  };
}
```

---

## Acceptance Criteria

### Definition of Done
- [ ] .docx files upload and process successfully
- [ ] .doc files upload and process successfully
- [ ] Text extraction preserves paragraph structure
- [ ] Tables are extracted as readable text
- [ ] File size limit (10MB) enforced
- [ ] Corrupted files show clear error message
- [ ] Empty documents show helpful error
- [ ] Processing completes in <30s for typical docs
- [ ] Extracted content chunks correctly

### Demo Checklist
- [ ] Upload a .docx file with text and tables
- [ ] Upload a legacy .doc file
- [ ] Verify extracted text is readable
- [ ] Try uploading 15MB file (should fail)
- [ ] Upload corrupted file (should fail gracefully)
- [ ] Confirm chatbot can answer from uploaded doc content

---

## Edge Cases

| # | Scenario | Expected Behavior |
|---|----------|-------------------|
| 1 | File >10MB | Reject with size error |
| 2 | Corrupted .docx file | Show "file corrupted" error |
| 3 | Password-protected doc | Show "cannot extract" error |
| 4 | Document with only images | Show "no text content" warning |
| 5 | Very large table | Extract and chunk table rows |
| 6 | Multiple columns | Extract column by column |
| 7 | Embedded objects (charts) | Ignore, extract surrounding text |

---

## Performance Requirements

| Metric | Target |
|--------|--------|
| Upload validation | <100ms |
| Text extraction (.docx) | <10s |
| Text extraction (.doc) | <20s |
| Total processing time | <30s |

---

## Dependencies

```json
// package.json additions
{
  "dependencies": {
    "mammoth": "^1.6.0",
    "textract": "^2.5.0"
  }
}
```

---

## Changelog

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | December 2024 | Product Team | Initial spec for V2 |
