# Refactoring Plan: Knowledge Base API Migration

## Overview

**Purpose**: Move all API logic from Next.js app to Express API server
**Affected Feature**: #4 knowledge-base
**Date**: 2025-12-17

## Current State (Before Refactoring)

### Files with API Logic in Next.js (TO BE REMOVED)
```
apps/web/app/api/knowledge/
├── route.ts           # GET (list) + POST (create)
├── [id]/
│   └── route.ts       # GET (single) + DELETE
└── process/
    └── route.ts       # POST (background processing)
```

### Files with API Logic in Express (ALREADY COMPLETE)
```
apps/api/src/
├── routes/
│   └── knowledge.ts   # All CRUD endpoints + file upload
├── middleware/
│   └── auth.ts        # Authentication middleware
├── services/
│   ├── chunking.ts    # Text chunking service
│   └── embedding.ts   # Embedding service
└── lib/
    ├── supabase.ts    # Supabase admin client
    └── openai.ts      # OpenAI client
```

### Frontend Components (TO BE UPDATED)
```
apps/web/components/knowledge/
├── knowledge-list.tsx      # Calls /api/knowledge (local)
└── add-knowledge-modal.tsx # Calls /api/knowledge (local)
```

---

## Refactoring Steps

### Step 1: Create API Client Utility

**File**: `apps/web/lib/api-client.ts`

**Purpose**: Centralized utility for making authenticated API calls to Express backend

**Implementation**:
```typescript
// Handles:
// - Getting Supabase access token
// - Adding Authorization header
// - API URL configuration
// - Error handling
// - JSON and FormData support
```

---

### Step 2: Update Frontend Components

#### 2.1 Knowledge List (`knowledge-list.tsx`)

**Current API calls**:
- Line 36: `fetch("/api/knowledge")` - GET list
- Line 94: `fetch(\`/api/knowledge/${id}\`)` - DELETE

**Changes needed**:
- Import api-client
- Replace fetch calls with api-client calls
- Pass Bearer token in Authorization header

#### 2.2 Add Knowledge Modal (`add-knowledge-modal.tsx`)

**Current API calls**:
- Line 145: `fetch("/api/knowledge", { method: "POST", body: formData })` - CREATE

**Changes needed**:
- Import api-client
- For file uploads: need special handling for FormData with auth header
- Call Express API instead of local Next.js API

---

### Step 3: Add Environment Configuration

**File**: `apps/web/.env.local`

**Add**:
```bash
NEXT_PUBLIC_API_URL=http://localhost:3001
```

**File**: `apps/web/.env.example` (create if not exists)
```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
NEXT_PUBLIC_API_URL=http://localhost:3001
```

---

### Step 4: Delete Next.js API Routes

**Files to delete**:
```
apps/web/app/api/knowledge/route.ts
apps/web/app/api/knowledge/[id]/route.ts
apps/web/app/api/knowledge/process/route.ts
apps/web/app/api/knowledge/  (entire directory)
```

---

### Step 5: Remove Unused Dependencies from Web App

**Dependencies to remove from `apps/web/package.json`**:
- `pdf-parse` - Only needed in API for PDF text extraction
- `openai` - Only needed in API for embeddings

**Command**:
```bash
pnpm --filter @chatbot/web remove pdf-parse openai
```

---

## Detailed Code Changes

### 1. API Client (`apps/web/lib/api-client.ts`)

```typescript
import { createClient } from "@/lib/supabase/client";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

interface ApiResponse<T> {
  data?: T;
  error?: ApiError;
}

/**
 * Get the current Supabase access token
 */
async function getAccessToken(): Promise<string | null> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
}

/**
 * Make an authenticated API request to the backend
 */
export async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getAccessToken();

  if (!token) {
    throw new Error("Not authenticated");
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    if (response.status === 204) {
      return undefined as T;
    }
    const error = await response.json();
    throw new Error(error.error?.message || "API request failed");
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

/**
 * Make an authenticated API request with FormData (for file uploads)
 */
export async function apiClientFormData<T>(
  endpoint: string,
  formData: FormData
): Promise<T> {
  const token = await getAccessToken();

  if (!token) {
    throw new Error("Not authenticated");
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      // Don't set Content-Type - browser will set it with boundary for FormData
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || "API request failed");
  }

  return response.json();
}
```

### 2. Updated Knowledge List (`knowledge-list.tsx`)

**Key changes**:
```typescript
// Add import
import { apiClient } from "@/lib/api-client";

// Change fetchSources
const fetchSources = useCallback(async () => {
  try {
    setError(null);
    const data = await apiClient<{ sources: KnowledgeSource[] }>("/api/knowledge");
    setSources(data.sources);
  } catch (err) {
    // ... error handling
  } finally {
    setLoading(false);
  }
}, []);

// Change handleDelete
const handleDelete = async (id: string) => {
  // ... confirm dialog
  try {
    await apiClient(`/api/knowledge/${id}`, { method: "DELETE" });
    setSources((prev) => prev.filter((s) => s.id !== id));
  } catch (err) {
    // ... error handling
  }
};
```

### 3. Updated Add Knowledge Modal (`add-knowledge-modal.tsx`)

**Key changes**:
```typescript
// Add imports
import { apiClient, apiClientFormData } from "@/lib/api-client";

// Change handleSubmit
const handleSubmit = async () => {
  // ... validation

  setLoading(true);
  try {
    if (activeTab === "text") {
      // For text, use JSON
      await apiClient("/api/knowledge", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          content,
        }),
      });
    } else if (selectedFile) {
      // For files, use FormData with /upload endpoint
      const formData = new FormData();
      formData.append("name", name.trim());
      formData.append("file", selectedFile);
      await apiClientFormData("/api/knowledge/upload", formData);
    }

    resetForm();
    onSuccess();
  } catch (err) {
    // ... error handling
  } finally {
    setLoading(false);
  }
};
```

---

## Testing Checklist

After refactoring, verify:

- [ ] **Development servers running**:
  - `pnpm --filter @chatbot/web dev` on port 3000
  - `pnpm --filter @chatbot/api dev` on port 3001

- [ ] **Authentication flow**:
  - [ ] Logged-in user can access Knowledge page
  - [ ] API calls include Bearer token
  - [ ] Unauthenticated requests return 401

- [ ] **CRUD Operations**:
  - [ ] List sources shows existing sources
  - [ ] Add text knowledge creates source and processes it
  - [ ] Add TXT file creates source and processes it
  - [ ] Add PDF file creates source and processes it
  - [ ] Delete removes source and chunks

- [ ] **Real-time updates**:
  - [ ] Status changes from "processing" to "ready"
  - [ ] Error states show correct messages

- [ ] **Build passes**:
  - [ ] `pnpm --filter @chatbot/web build` succeeds
  - [ ] `pnpm --filter @chatbot/api type-check` succeeds

---

## Rollback Plan

If issues arise:
1. Restore deleted files from git: `git checkout HEAD -- apps/web/app/api/knowledge/`
2. Revert component changes
3. Remove api-client.ts

---

## Notes

- The Express API routes (`apps/api/src/routes/knowledge.ts`) are already fully implemented and tested
- The auth middleware (`apps/api/src/middleware/auth.ts`) validates Supabase tokens
- CORS is configured in Express to allow requests from localhost:3000
- Background processing happens in the API server, not in Next.js
