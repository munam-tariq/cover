# Feature: Database Setup

## Overview

**Feature ID**: `database-setup`
**Category**: Infrastructure
**Priority**: P0 (Must complete before auth and features)
**Complexity**: L
**Estimated Effort**: 2-3 days

### Summary
Set up the Supabase PostgreSQL database with all required tables, pgvector extension for embeddings, Row Level Security (RLS) policies, and database functions. This includes creating migrations, seed data, and configuring the database client in the `@chatbot/db` package.

### Dependencies
- `project-scaffolding` - Monorepo must be set up first

### Success Criteria
- [ ] Supabase project created and configured
- [ ] pgvector extension enabled
- [ ] All tables created with proper relationships
- [ ] RLS policies enforce data isolation
- [ ] Vector similarity search function works
- [ ] Database types generated and exported
- [ ] Migrations are version-controlled

---

## User Stories

### Primary User Story
> As a developer, I want a properly configured database with all tables and security policies so that I can build features without worrying about data access issues.

### Additional Stories
1. As a user, I want my data isolated from other users so that my knowledge base and settings are private.
2. As a developer, I want TypeScript types generated from the schema so that I have type safety when querying the database.

---

## Functional Requirements

### Database Setup

| ID | Requirement | Priority | Notes |
|----|-------------|----------|-------|
| DB-001 | Enable pgvector extension | Must Have | Required for embeddings |
| DB-002 | Create `projects` table | Must Have | One per user (V1) |
| DB-003 | Create `knowledge_sources` table | Must Have | Tracks uploaded content |
| DB-004 | Create `knowledge_chunks` table with vector column | Must Have | Stores embeddings |
| DB-005 | Create `api_endpoints` table | Must Have | Stores API configurations |
| DB-006 | Create `chat_sessions` table | Must Have | For conversation logging |
| DB-007 | Create `api_keys` table | Must Have | For MCP authentication |
| DB-008 | Enable RLS on all tables | Must Have | Security requirement |
| DB-009 | Create RLS policies for user isolation | Must Have | Users access only their data |
| DB-010 | Create vector search function | Must Have | For RAG retrieval |
| DB-011 | Create updated_at triggers | Should Have | Auto-update timestamps |
| DB-012 | Generate TypeScript types | Should Have | Type safety |
| DB-013 | Create IVF index for vectors | Should Have | Performance optimization |

---

## Database Schema

### Entity Relationship Diagram

```
┌─────────────────┐
│   auth.users    │ (Supabase managed)
│─────────────────│
│ id (PK)         │
│ email           │
│ ...             │
└────────┬────────┘
         │
         │ 1:N
         ▼
┌─────────────────┐       1:N        ┌──────────────────┐
│    projects     │──────────────────│ knowledge_sources│
│─────────────────│                  │──────────────────│
│ id (PK)         │                  │ id (PK)          │
│ user_id (FK)    │                  │ project_id (FK)  │
│ name            │                  │ type             │
│ settings        │                  │ name             │
│ created_at      │                  │ status           │
│ updated_at      │                  │ chunk_count      │
└────────┬────────┘                  │ ...              │
         │                           └────────┬─────────┘
         │                                    │
         │ 1:N                                │ 1:N
         │                                    ▼
         │                           ┌──────────────────┐
         │                           │ knowledge_chunks │
         │                           │──────────────────│
         │                           │ id (PK)          │
         │                           │ source_id (FK)   │
         │                           │ content          │
         │                           │ embedding (vector)│
         │                           │ metadata         │
         │                           └──────────────────┘
         │
         │ 1:N
         ├──────────────────────────┐
         │                          │
         ▼                          ▼
┌─────────────────┐        ┌─────────────────┐
│  api_endpoints  │        │  chat_sessions  │
│─────────────────│        │─────────────────│
│ id (PK)         │        │ id (PK)         │
│ project_id (FK) │        │ project_id (FK) │
│ name            │        │ visitor_id      │
│ description     │        │ messages        │
│ url             │        │ ...             │
│ method          │        └─────────────────┘
│ auth_type       │
│ auth_config     │
│ ...             │
└─────────────────┘

┌─────────────────┐
│    api_keys     │
│─────────────────│
│ id (PK)         │
│ user_id (FK)    │
│ name            │
│ key_hash        │
│ key_prefix      │
│ ...             │
└─────────────────┘
```

---

## SQL Migrations

### Migration 001: Enable Extensions

**File**: `supabase/migrations/001_enable_extensions.sql`

```sql
-- Enable pgvector extension for embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Enable pgcrypto for UUID generation (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```

### Migration 002: Create Tables

**File**: `supabase/migrations/002_create_tables.sql`

```sql
-- ============================================
-- PROJECTS TABLE
-- ============================================
-- Each user has projects that contain their chatbot configurations
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'My Chatbot',
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for user lookups
CREATE INDEX idx_projects_user_id ON projects(user_id);

-- ============================================
-- KNOWLEDGE SOURCES TABLE
-- ============================================
-- Tracks uploaded documents, text content, and files
CREATE TABLE knowledge_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('text', 'file', 'pdf', 'url')),
  name TEXT NOT NULL,
  content TEXT,
  file_path TEXT,
  status TEXT NOT NULL DEFAULT 'processing'
    CHECK (status IN ('processing', 'ready', 'failed')),
  chunk_count INTEGER DEFAULT 0,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for project lookups
CREATE INDEX idx_knowledge_sources_project_id ON knowledge_sources(project_id);

-- Index for status filtering
CREATE INDEX idx_knowledge_sources_status ON knowledge_sources(status);

-- ============================================
-- KNOWLEDGE CHUNKS TABLE
-- ============================================
-- Stores chunked content with vector embeddings
CREATE TABLE knowledge_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID NOT NULL REFERENCES knowledge_sources(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  embedding VECTOR(1536) NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for source lookups
CREATE INDEX idx_knowledge_chunks_source_id ON knowledge_chunks(source_id);

-- IVF index for fast vector similarity search
-- Note: lists = 100 is good for up to ~100k vectors per project
CREATE INDEX idx_knowledge_chunks_embedding ON knowledge_chunks
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- ============================================
-- API ENDPOINTS TABLE
-- ============================================
-- Stores external API configurations for tool calling
CREATE TABLE api_endpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  url TEXT NOT NULL,
  method TEXT NOT NULL DEFAULT 'GET' CHECK (method IN ('GET', 'POST')),
  auth_type TEXT NOT NULL DEFAULT 'none'
    CHECK (auth_type IN ('none', 'api_key', 'bearer', 'custom_header')),
  auth_config JSONB DEFAULT '{}'::jsonb, -- Encrypted at application layer
  headers JSONB DEFAULT '{}'::jsonb,
  request_body_template JSONB DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for project lookups
CREATE INDEX idx_api_endpoints_project_id ON api_endpoints(project_id);

-- ============================================
-- CHAT SESSIONS TABLE
-- ============================================
-- Logs conversations for analytics and debugging
CREATE TABLE chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  visitor_id TEXT NOT NULL,
  messages JSONB[] DEFAULT ARRAY[]::JSONB[],
  message_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for project lookups
CREATE INDEX idx_chat_sessions_project_id ON chat_sessions(project_id);

-- Index for visitor lookups
CREATE INDEX idx_chat_sessions_visitor_id ON chat_sessions(visitor_id);

-- Index for recent sessions
CREATE INDEX idx_chat_sessions_created_at ON chat_sessions(created_at DESC);

-- ============================================
-- API KEYS TABLE
-- ============================================
-- Stores hashed API keys for MCP authentication
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  key_prefix TEXT NOT NULL, -- First 8 chars for identification (e.g., "sk_live_")
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for user lookups
CREATE INDEX idx_api_keys_user_id ON api_keys(user_id);

-- Index for key hash lookups (for authentication)
CREATE INDEX idx_api_keys_key_hash ON api_keys(key_hash);
```

### Migration 003: Row Level Security

**File**: `supabase/migrations/003_enable_rls.sql`

```sql
-- ============================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_endpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PROJECTS POLICIES
-- ============================================
-- Users can only access their own projects
CREATE POLICY "Users can view own projects"
  ON projects FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own projects"
  ON projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects"
  ON projects FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects"
  ON projects FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- KNOWLEDGE SOURCES POLICIES
-- ============================================
-- Users can only access knowledge sources for their projects
CREATE POLICY "Users can view own knowledge sources"
  ON knowledge_sources FOR SELECT
  USING (
    project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can insert own knowledge sources"
  ON knowledge_sources FOR INSERT
  WITH CHECK (
    project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update own knowledge sources"
  ON knowledge_sources FOR UPDATE
  USING (
    project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can delete own knowledge sources"
  ON knowledge_sources FOR DELETE
  USING (
    project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
  );

-- ============================================
-- KNOWLEDGE CHUNKS POLICIES
-- ============================================
-- Users can only access chunks for their knowledge sources
CREATE POLICY "Users can view own knowledge chunks"
  ON knowledge_chunks FOR SELECT
  USING (
    source_id IN (
      SELECT ks.id FROM knowledge_sources ks
      JOIN projects p ON ks.project_id = p.id
      WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own knowledge chunks"
  ON knowledge_chunks FOR INSERT
  WITH CHECK (
    source_id IN (
      SELECT ks.id FROM knowledge_sources ks
      JOIN projects p ON ks.project_id = p.id
      WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own knowledge chunks"
  ON knowledge_chunks FOR DELETE
  USING (
    source_id IN (
      SELECT ks.id FROM knowledge_sources ks
      JOIN projects p ON ks.project_id = p.id
      WHERE p.user_id = auth.uid()
    )
  );

-- ============================================
-- API ENDPOINTS POLICIES
-- ============================================
-- Users can only access API endpoints for their projects
CREATE POLICY "Users can view own api endpoints"
  ON api_endpoints FOR SELECT
  USING (
    project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can insert own api endpoints"
  ON api_endpoints FOR INSERT
  WITH CHECK (
    project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update own api endpoints"
  ON api_endpoints FOR UPDATE
  USING (
    project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can delete own api endpoints"
  ON api_endpoints FOR DELETE
  USING (
    project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
  );

-- ============================================
-- CHAT SESSIONS POLICIES
-- ============================================
-- Users can only access chat sessions for their projects
CREATE POLICY "Users can view own chat sessions"
  ON chat_sessions FOR SELECT
  USING (
    project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can insert own chat sessions"
  ON chat_sessions FOR INSERT
  WITH CHECK (
    project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update own chat sessions"
  ON chat_sessions FOR UPDATE
  USING (
    project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
  );

-- ============================================
-- API KEYS POLICIES
-- ============================================
-- Users can only access their own API keys
CREATE POLICY "Users can view own api keys"
  ON api_keys FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own api keys"
  ON api_keys FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own api keys"
  ON api_keys FOR DELETE
  USING (auth.uid() = user_id);
```

### Migration 004: Database Functions

**File**: `supabase/migrations/004_functions.sql`

```sql
-- ============================================
-- VECTOR SIMILARITY SEARCH FUNCTION
-- ============================================
-- Used by the chat engine for RAG retrieval
CREATE OR REPLACE FUNCTION match_knowledge_chunks(
  query_embedding VECTOR(1536),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 5,
  p_project_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  source_id UUID,
  content TEXT,
  metadata JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    kc.id,
    kc.source_id,
    kc.content,
    kc.metadata,
    1 - (kc.embedding <=> query_embedding) AS similarity
  FROM knowledge_chunks kc
  JOIN knowledge_sources ks ON kc.source_id = ks.id
  WHERE ks.project_id = p_project_id
    AND ks.status = 'ready'
    AND 1 - (kc.embedding <=> query_embedding) > match_threshold
  ORDER BY kc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- ============================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to projects
CREATE TRIGGER projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to api_endpoints
CREATE TRIGGER api_endpoints_updated_at
  BEFORE UPDATE ON api_endpoints
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to chat_sessions
CREATE TRIGGER chat_sessions_updated_at
  BEFORE UPDATE ON chat_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- GET PROJECT BY API KEY FUNCTION
-- ============================================
-- Used by MCP server to validate API keys and get user context
CREATE OR REPLACE FUNCTION get_user_by_api_key(
  p_key_hash TEXT
)
RETURNS TABLE (
  user_id UUID,
  key_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update last_used_at
  UPDATE api_keys
  SET last_used_at = NOW()
  WHERE key_hash = p_key_hash;

  -- Return user info
  RETURN QUERY
  SELECT ak.user_id, ak.id as key_id
  FROM api_keys ak
  WHERE ak.key_hash = p_key_hash;
END;
$$;

-- ============================================
-- INCREMENT CHUNK COUNT FUNCTION
-- ============================================
-- Called after knowledge chunks are inserted
CREATE OR REPLACE FUNCTION update_source_chunk_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE knowledge_sources
    SET chunk_count = chunk_count + 1
    WHERE id = NEW.source_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE knowledge_sources
    SET chunk_count = chunk_count - 1
    WHERE id = OLD.source_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_chunk_count
  AFTER INSERT OR DELETE ON knowledge_chunks
  FOR EACH ROW
  EXECUTE FUNCTION update_source_chunk_count();
```

### Migration 005: Service Role Policies

**File**: `supabase/migrations/005_service_role_policies.sql`

```sql
-- ============================================
-- SERVICE ROLE POLICIES FOR BACKEND
-- ============================================
-- These allow the service role (used by API server) to bypass RLS
-- for operations like processing knowledge chunks

-- Allow service role to insert knowledge chunks (for background processing)
CREATE POLICY "Service role can manage knowledge chunks"
  ON knowledge_chunks
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Allow service role to update knowledge sources (for status updates)
CREATE POLICY "Service role can manage knowledge sources"
  ON knowledge_sources
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Allow service role to insert chat sessions (for logging)
CREATE POLICY "Service role can manage chat sessions"
  ON chat_sessions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Allow anonymous users to read projects by ID (for widget/chat)
-- This is needed because the chat API doesn't require authentication
CREATE POLICY "Public can read projects by ID"
  ON projects FOR SELECT
  TO anon
  USING (true);

-- Allow anonymous users to read ready knowledge sources (for chat)
CREATE POLICY "Public can read ready knowledge sources"
  ON knowledge_sources FOR SELECT
  TO anon
  USING (status = 'ready');

-- Allow anonymous users to read api endpoints (for chat tool calling)
CREATE POLICY "Public can read api endpoints"
  ON api_endpoints FOR SELECT
  TO anon
  USING (true);
```

---

## TypeScript Types

### Database Types (`packages/db/src/types.ts`)

```typescript
// This file should be auto-generated using:
// supabase gen types typescript --project-id $SUPABASE_PROJECT_ID > src/types.ts
//
// Below is a manual version for reference:

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      projects: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          settings: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name?: string;
          settings?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          settings?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      knowledge_sources: {
        Row: {
          id: string;
          project_id: string;
          type: 'text' | 'file' | 'pdf' | 'url';
          name: string;
          content: string | null;
          file_path: string | null;
          status: 'processing' | 'ready' | 'failed';
          chunk_count: number;
          error: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          type: 'text' | 'file' | 'pdf' | 'url';
          name: string;
          content?: string | null;
          file_path?: string | null;
          status?: 'processing' | 'ready' | 'failed';
          chunk_count?: number;
          error?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          type?: 'text' | 'file' | 'pdf' | 'url';
          name?: string;
          content?: string | null;
          file_path?: string | null;
          status?: 'processing' | 'ready' | 'failed';
          chunk_count?: number;
          error?: string | null;
          created_at?: string;
        };
      };
      knowledge_chunks: {
        Row: {
          id: string;
          source_id: string;
          content: string;
          embedding: number[]; // vector stored as array
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          source_id: string;
          content: string;
          embedding: number[];
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          source_id?: string;
          content?: string;
          embedding?: number[];
          metadata?: Json;
          created_at?: string;
        };
      };
      api_endpoints: {
        Row: {
          id: string;
          project_id: string;
          name: string;
          description: string;
          url: string;
          method: 'GET' | 'POST';
          auth_type: 'none' | 'api_key' | 'bearer' | 'custom_header';
          auth_config: Json;
          headers: Json;
          request_body_template: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          name: string;
          description: string;
          url: string;
          method?: 'GET' | 'POST';
          auth_type?: 'none' | 'api_key' | 'bearer' | 'custom_header';
          auth_config?: Json;
          headers?: Json;
          request_body_template?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          name?: string;
          description?: string;
          url?: string;
          method?: 'GET' | 'POST';
          auth_type?: 'none' | 'api_key' | 'bearer' | 'custom_header';
          auth_config?: Json;
          headers?: Json;
          request_body_template?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      chat_sessions: {
        Row: {
          id: string;
          project_id: string;
          visitor_id: string;
          messages: Json[];
          message_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          visitor_id: string;
          messages?: Json[];
          message_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          visitor_id?: string;
          messages?: Json[];
          message_count?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      api_keys: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          key_hash: string;
          key_prefix: string;
          last_used_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          key_hash: string;
          key_prefix: string;
          last_used_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          key_hash?: string;
          key_prefix?: string;
          last_used_at?: string | null;
          created_at?: string;
        };
      };
    };
    Functions: {
      match_knowledge_chunks: {
        Args: {
          query_embedding: number[];
          match_threshold?: number;
          match_count?: number;
          p_project_id: string;
        };
        Returns: {
          id: string;
          source_id: string;
          content: string;
          metadata: Json;
          similarity: number;
        }[];
      };
      get_user_by_api_key: {
        Args: {
          p_key_hash: string;
        };
        Returns: {
          user_id: string;
          key_id: string;
        }[];
      };
    };
  };
}

// Convenience types
export type Project = Database['public']['Tables']['projects']['Row'];
export type ProjectInsert = Database['public']['Tables']['projects']['Insert'];
export type ProjectUpdate = Database['public']['Tables']['projects']['Update'];

export type KnowledgeSource = Database['public']['Tables']['knowledge_sources']['Row'];
export type KnowledgeSourceInsert = Database['public']['Tables']['knowledge_sources']['Insert'];
export type KnowledgeSourceUpdate = Database['public']['Tables']['knowledge_sources']['Update'];

export type KnowledgeChunk = Database['public']['Tables']['knowledge_chunks']['Row'];
export type KnowledgeChunkInsert = Database['public']['Tables']['knowledge_chunks']['Insert'];

export type ApiEndpoint = Database['public']['Tables']['api_endpoints']['Row'];
export type ApiEndpointInsert = Database['public']['Tables']['api_endpoints']['Insert'];
export type ApiEndpointUpdate = Database['public']['Tables']['api_endpoints']['Update'];

export type ChatSession = Database['public']['Tables']['chat_sessions']['Row'];
export type ChatSessionInsert = Database['public']['Tables']['chat_sessions']['Insert'];

export type ApiKey = Database['public']['Tables']['api_keys']['Row'];
export type ApiKeyInsert = Database['public']['Tables']['api_keys']['Insert'];
```

---

## Database Client

### Client Setup (`packages/db/src/client.ts`)

```typescript
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Browser client (uses anon key)
export function createBrowserClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  return createClient<Database>(supabaseUrl, supabaseAnonKey);
}

// Server client (uses service role key for full access)
export function createServerClient() {
  const supabaseUrl = process.env.SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

  return createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// Type for the client
export type SupabaseClient = ReturnType<typeof createBrowserClient>;
export type SupabaseServerClient = ReturnType<typeof createServerClient>;
```

---

## Implementation Notes

### Recommended Approach

1. **Start with**: Create Supabase project at supabase.com
   - Note the project URL and anon key
   - Generate service role key for backend

2. **Then**: Set up local development
   ```bash
   cd supabase
   supabase init
   supabase start
   ```

3. **Then**: Create and apply migrations
   ```bash
   # Create migration files as documented above
   supabase db push
   ```

4. **Then**: Generate TypeScript types
   ```bash
   supabase gen types typescript --project-id $PROJECT_ID > packages/db/src/types.ts
   ```

5. **Finally**: Verify with queries
   ```sql
   -- Test vector search works
   SELECT * FROM match_knowledge_chunks(
     '[0.1, 0.2, ...]'::vector,
     0.7,
     5,
     'project-uuid'
   );
   ```

### Gotchas & Warnings

- pgvector IVF index requires at least 100 vectors to work efficiently
- RLS policies can cause confusing "no rows returned" errors - check policies first
- Service role bypasses RLS - only use in backend
- Vector column uses 1536 dimensions (text-embedding-3-small)
- JSONB columns should use `::jsonb` cast when inserting JSON strings

---

## Testing Requirements

### Migration Tests
- [ ] All migrations apply without errors
- [ ] Tables have correct columns and types
- [ ] Foreign key constraints work
- [ ] Indexes are created

### RLS Tests
- [ ] User A cannot read User B's projects
- [ ] User A cannot read User B's knowledge sources
- [ ] User A cannot read User B's API endpoints
- [ ] Service role can access all data
- [ ] Anonymous can read projects by ID

### Function Tests
- [ ] `match_knowledge_chunks` returns similar vectors
- [ ] `match_knowledge_chunks` respects threshold
- [ ] `match_knowledge_chunks` respects project filter
- [ ] `update_updated_at_column` triggers work
- [ ] `update_source_chunk_count` keeps counts accurate

---

## Acceptance Criteria

### Definition of Done
- [ ] All migration files created and version-controlled
- [ ] pgvector extension enabled
- [ ] All tables created with correct schema
- [ ] RLS enabled and policies created
- [ ] Vector search function working
- [ ] TypeScript types generated
- [ ] Database client configured in `@chatbot/db`
- [ ] Local development setup documented

### Demo Checklist
- [ ] Show tables in Supabase dashboard
- [ ] Show RLS blocking cross-user access
- [ ] Show vector similarity search returning results
- [ ] Show TypeScript types providing autocomplete

---

## Open Questions

None - This spec is complete and ready for implementation.

---

## Changelog

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | December 2024 | Morgan (PM) | Initial spec |
