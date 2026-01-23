# RAG Scalability Enhancements

**Created**: 2026-01-23
**Last Updated**: 2026-01-23
**Category**: Performance / Scalability

---

## Progress Tracker

| # | Enhancement | Priority | Effort | Status | Assigned To | Completed Date |
|---|-------------|----------|--------|--------|-------------|----------------|
| 1 | Add HNSW vector index | P0 | 1-2 hours | Done | Claude | 2026-01-23 |
| 2 | Remove 20-source limit | P0 | 30 min | Pending | - | - |
| 3 | Increase embedding batch size | P1 | 30 min | Pending | - | - |
| 4 | Add async job queue for ingestion | P1 | 2-4 hours | Pending | - | - |
| 5 | Document skipContext for bulk imports | P1 | 15 min | Pending | - | - |
| 6 | Add Redis caching layer | P2 | 4-6 hours | Pending | - | - |
| 7 | Add ingestion metrics/monitoring | P2 | 2-3 hours | Pending | - | - |
| 8 | Vector quantization (reduce dimensions) | P2 | 3-4 hours | Pending | - | - |

**Status Legend**: `Pending` | `In Progress` | `Done` | `Blocked` | `Deferred`

---

## Executive Summary

Current RAG implementation is **production-ready for knowledge bases up to ~1 GB** (approximately 100K-500K chunks). Beyond that, there are critical bottlenecks that need addressing.

| Scale | Status | Notes |
|-------|--------|-------|
| < 1 GB | Ready | Works well with current architecture |
| 1-10 GB | Improved | 20-source limit remains, HNSW index added |
| 10+ GB | Not Ready | Requires architectural changes |

---

## Current Architecture (What's Good)

1. **Contextual Retrieval** - LLM-generated context per chunk (Anthropic's approach)
2. **Hybrid Search** - Vector (70%) + Full-text (30%) with RRF fusion
3. **Semantic Chunking** - Sentence-aware, 400 tokens per chunk
4. **Parallel Processing** - Embedding batches of 20, context batches of 5

---

## Enhancement Details

### 1. Add HNSW Vector Index (P0 - CRITICAL) - COMPLETED

**Status**: DONE - Index created on 2026-01-23

**What was done**: Created HNSW index `idx_knowledge_chunks_embedding_hnsw` with m=16, ef_construction=64

**Previous problem**: Without HNSW index, vector search was O(n) - brute force scanning every chunk.

| Chunks | Estimated Query Time |
|--------|---------------------|
| 10K | ~100ms |
| 100K | ~1 second |
| 1M | ~10 seconds (timeout) |

**Implementation**:
```sql
-- Convert to native vector type if not already
ALTER TABLE knowledge_chunks
ALTER COLUMN embedding TYPE vector(1536) USING embedding::vector;

-- Create HNSW index
CREATE INDEX CONCURRENTLY idx_knowledge_chunks_embedding_hnsw
ON knowledge_chunks
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);
```

**After fix**: Query time stays ~50-100ms regardless of dataset size.

**Files to modify**:
- `supabase/migrations/` - Add new migration

---

### 2. Remove 20-Source Limit (P0 - CRITICAL)

**Current State**: `MAX_SOURCES_PER_PROJECT = 20` hardcoded

**Problem**: Enterprise customers with large documentation, multiple products, or extensive FAQs hit this limit quickly.

| Use Case | Typical Sources Needed |
|----------|----------------------|
| Small SaaS docs | 5-10 |
| Medium product suite | 20-50 |
| Enterprise knowledge base | 100-500 |
| Multi-brand company | 200+ |

**Implementation**: Change limit to 1000 or remove entirely.

**Files to modify**:
- `apps/api/src/routes/knowledge.ts`

---

### 3. Increase Embedding Batch Size (P1)

**Current State**:
- Embedding batch size: 20 (OpenAI allows 2,048)
- Context generation: 5 parallel with 100ms delay

**Problem**: For 1 GB of text (~2.5M chunks):
- Embedding calls: 125,000 API calls (at batch 20)
- Estimated time: 40+ hours

**Implementation**: Increase batch size from 20 to 200-500

**Files to modify**:
- `apps/api/src/services/rag/config.ts`
- `apps/api/src/services/rag/embedder.ts`

---

### 4. Add Async Job Queue (P1)

**Current State**: Synchronous processing only

**Problem**: Large imports block the API, no progress tracking, not resumable

**Implementation**:
- Add Bull with Redis
- Background processing for large imports
- Progress tracking via webhooks
- Resumable jobs on failure

**New files needed**:
- `apps/api/src/lib/queue.ts` - Queue setup
- `apps/api/src/workers/ingestion.ts` - Worker process

---

### 5. Document skipContext for Bulk Imports (P1)

**Current State**: `skipContext: true` option exists but not documented

**Problem**: Users don't know they can skip expensive LLM context generation

**Implementation**:
- Add documentation for bulk import API
- Skip context generation reduces cost by ~80%

**Files to modify**:
- Documentation / API reference

---

### 6. Add Redis Caching Layer (P2)

**Current State**: Every query hits database, no result caching

**Problem**: Repeated questions regenerate embeddings and hit DB

**Implementation**:
- Cache query embeddings (5-15 min TTL)
- Cache retrieval results for common queries
- Cache chunk content to reduce DB reads

**New files needed**:
- `apps/api/src/lib/cache.ts`
- Redis infrastructure setup

---

### 7. Add Ingestion Metrics/Monitoring (P2)

**Current State**: Basic logging present, no structured metrics

**Problem**: No visibility into ingestion pipeline health

**Implementation**:
- Track chunks processed per minute
- Track embedding API latency
- Alert on failures
- Dashboard for monitoring

---

### 8. Vector Quantization (P2)

**Current State**: 1536 dimensions per embedding

**Problem**: Storage and memory overhead for large datasets

**Implementation**:
- Reduce dimensions from 1536 to 256-512
- Use OpenAI's smaller models or post-processing
- Trade-off: Slight accuracy reduction for 3-6x storage savings

---

## What GB-Scale Customers Would Experience (Current State)

### 1 GB Knowledge Base (~250K chunks)
- **Ingestion**: 10-20 hours
- **Query latency**: 1-3 seconds
- **Cost**: ~$100-150 for context generation
- **Verdict**: Works but slow

### 10 GB Knowledge Base (~2.5M chunks)
- **Ingestion**: 4-7 days
- **Query latency**: 10-30 seconds (timeout)
- **Cost**: ~$1,000-1,500
- **Verdict**: Not viable without fixes

### 100 GB Knowledge Base
- **Not possible** with current architecture
- Need specialized vector DB (Pinecone, Qdrant)

---

## Quick Test Commands

```sql
-- Count total chunks
SELECT COUNT(*) FROM knowledge_chunks;

-- Size distribution by project
SELECT p.name, COUNT(kc.id) as chunk_count
FROM knowledge_chunks kc
JOIN knowledge_sources ks ON kc.source_id = ks.id
JOIN projects p ON ks.project_id = p.id
GROUP BY p.id, p.name
ORDER BY chunk_count DESC;
```

**Safe operating range**: < 100K chunks per project with current setup.

---

## Notes

- P0 items should be done before targeting enterprise customers with large knowledge bases
- P1 items needed for > 10 GB datasets
- P2 items are nice-to-have optimizations

---

## Change Log

| Date | Change | By |
|------|--------|-----|
| 2026-01-23 | Initial document created | Claude |
| 2026-01-23 | Added HNSW index (m=16, ef_construction=64) via migration | Claude |
