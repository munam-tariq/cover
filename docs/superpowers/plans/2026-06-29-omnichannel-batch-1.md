# Omnichannel Batch 1: CHAN-001 + CHAN-005 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish the multi-channel data layer (CHAN-001) and ship a visible "digital card" launcher on the widget (CHAN-005) — the first two pieces of FrontFace omnichannel.

**Architecture:** CHAN-001 is pure backend — 4 SQL migrations, TypeScript types, and a `connections` service that encrypts credentials via the existing `encryption.ts`. CHAN-005 is pure frontend — widget appearance types, a Shadow-DOM launcher component, CSS, embed config passthrough, and a dashboard editor section. The two workstreams share no files except a one-line change each in `embed.ts` (non-overlapping functions), so they can be developed in parallel.

**Tech Stack:** Supabase (Postgres migrations, RLS), Express API (TypeScript), esbuild widget (vanilla TS/CSS in closed Shadow DOM), Next.js dashboard (React)

## Global Constraints

- **Security baseline:** All new tables follow the June 2026 hardening pattern — revoke anon+authenticated, RLS enabled, owner-only defense-in-depth policies, no `SECURITY DEFINER` functions, `search_path` pinned if functions are added.
- **Encryption:** Reuse `apps/api/src/services/encryption.ts` (`encryptAuthConfig`/`decryptAuthConfig`). No new crypto.
- **URL safety:** Reject `javascript:` and `data:` URIs in any user-provided URL field (CHAN-005 FR-006). Allow only `https:`, `http:`, `mailto:`, `tel:`.
- **Test runner:** `node:test` + `node:assert/strict`. Tests inspect migration source text or route source (no live DB needed).
- **No auto-commit.** Every "Commit" step is a **STOP — user reviews and commits in IDE**. Do NOT run `git add` or `git commit`.
- **Widget deploy:** Widget CSS is inlined via `__WIDGET_CSS__` at build time by `apps/widget/build.ts`. No separate CSS deploy step.

---

## File Structure

### CHAN-001 (Channel Foundation)

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `supabase/migrations/<ts>_add_whatsapp_source.sql` | Add `'whatsapp'` to conversations source CHECK |
| Create | `supabase/migrations/<ts>_create_channel_connections.sql` | New table with RLS + hardening |
| Create | `supabase/migrations/<ts>_add_customer_phone.sql` | Add `phone` column to customers |
| Create | `supabase/migrations/<ts>_add_wa_message_id_idempotency.sql` | Partial unique index on messages metadata |
| Create | `apps/api/src/types/channels.ts` | TypeScript types: `ChannelProvider`, `ChannelConnection`, `WhatsAppCredentials` |
| Create | `apps/api/src/services/channels/connections.ts` | CRUD service: upsert, get, status updates; encrypts via `encryption.ts` |
| Modify | `apps/api/src/services/chat-engine.ts:69` | Add `'whatsapp'` to `ChatSource` union |
| Modify | `apps/api/src/services/chat-engine.ts:1186` | Add `'whatsapp'` to `validateChatInput` validSources |
| Modify | `apps/api/src/routes/chat.ts:450` | Add `'whatsapp'` to ensure-conversation validSources |
| Modify | `apps/api/src/routes/conversations.ts:44` | Add `'whatsapp'` to zod `.enum()` |
| Modify | `apps/api/src/routes/analytics.ts:95` | Add `'whatsapp'` to `ANALYTICS_SOURCES` |
| Modify | `apps/api/src/routes/lead-capture.ts:36` | Add `'whatsapp'` to `LEAD_SOURCES` |
| Create | `tests/api/whatsapp-source-migration.test.ts` | Verify source CHECK includes 'whatsapp' |
| Create | `tests/api/channel-connections-migration.test.ts` | Verify table + RLS + grants |
| Create | `tests/api/channel-connections-service.test.ts` | Verify connections service logic |

### CHAN-005 (Digital Card Launcher)

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `apps/api/src/lib/url-validation.ts` | Shared URL scheme validators: `isSafeChannelUrl`, `isSafeIconUrl` |
| Modify | `apps/widget/src/utils/widget-appearance.ts` | Add `ChannelButton` type, `channels` to configs, parse+resolve |
| Create | `apps/widget/src/components/channel-launcher.ts` | Launcher component: renders channel buttons in Shadow DOM |
| Modify | `apps/widget/src/widget.ts` | Mount `ChannelLauncher` in `init()` alongside `Bubble` |
| Modify | `apps/widget/src/styles/widget.css` | Launcher positioning + button styles |
| Modify | `apps/api/src/routes/embed.ts` | Pass `channels` through `buildWidgetAppearanceConfig` |
| Modify | `apps/api/src/routes/projects.ts` | URL scheme validation on `widget_appearance.channels` in PUT |
| Modify | `apps/web/app/(dashboard)/embed/page.tsx` | Channels editor section (add/remove/reorder) |
| Create | `tests/api/embed-channels-passthrough.test.ts` | Verify channels in embed config |
| Create | `tests/api/channel-url-validation.test.ts` | Verify URL scheme validation |
| Create | `tests/widget/channel-launcher.test.ts` | Verify launcher parsing + rendering |

---

## CHAN-001 Tasks

### Task 1: WhatsApp Source Migration + Source Enum Threading

**Files:**
- Create: `supabase/migrations/20260629000002_add_whatsapp_source.sql`
- Modify: `apps/api/src/services/chat-engine.ts:69,1186`
- Modify: `apps/api/src/routes/chat.ts:450`
- Modify: `apps/api/src/routes/conversations.ts:44`
- Modify: `apps/api/src/routes/analytics.ts:95`
- Modify: `apps/api/src/routes/lead-capture.ts:36`
- Test: `tests/api/whatsapp-source-migration.test.ts`

**Interfaces:**
- Consumes: Existing `ChatSource` type, existing migration pattern from `20260610000008_add_mobile_source.sql`
- Produces: `ChatSource` union now includes `'whatsapp'`; DB CHECK constraint updated

- [ ] **Step 1: Write the failing test**

```typescript
// tests/api/whatsapp-source-migration.test.ts
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const migrationsDir = path.join(process.cwd(), "supabase/migrations");

test("conversations source CHECK constraint includes whatsapp", async () => {
  const files = await readdir(migrationsDir);
  const migration = files
    .filter((f) => f.includes("add_whatsapp_source"))
    .sort()
    .at(-1);

  assert.ok(migration, "expected a whatsapp source migration file");

  const source = await readFile(path.join(migrationsDir, migration), "utf8");

  assert.match(source, /conversations_source_check/);
  assert.match(source, /'whatsapp'/);
  assert.match(
    source,
    /'widget','playground','mcp','api','voice','public','mobile','whatsapp'/
  );
});

test("ChatSource type union includes whatsapp", async () => {
  const chatEngine = await readFile(
    path.join(process.cwd(), "apps/api/src/services/chat-engine.ts"),
    "utf8"
  );
  assert.match(chatEngine, /["']whatsapp["']/);
});

test("all validSources arrays include whatsapp", async () => {
  const files = [
    "apps/api/src/services/chat-engine.ts",
    "apps/api/src/routes/chat.ts",
    "apps/api/src/routes/conversations.ts",
    "apps/api/src/routes/analytics.ts",
    "apps/api/src/routes/lead-capture.ts",
  ];

  for (const file of files) {
    const source = await readFile(path.join(process.cwd(), file), "utf8");
    assert.match(source, /["']whatsapp["']/, `${file} should include 'whatsapp'`);
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-strip-types --test tests/api/whatsapp-source-migration.test.ts`
Expected: FAIL — no migration file, no 'whatsapp' in source files

- [ ] **Step 3: Write the migration**

```sql
-- supabase/migrations/20260629000002_add_whatsapp_source.sql
-- Add 'whatsapp' to the conversations.source CHECK constraint.
-- Pattern: supabase/migrations/20260610000008_add_mobile_source.sql

ALTER TABLE conversations DROP CONSTRAINT IF EXISTS conversations_source_check;
ALTER TABLE conversations ADD CONSTRAINT conversations_source_check
  CHECK (source IN ('widget','playground','mcp','api','voice','public','mobile','whatsapp'));
```

- [ ] **Step 4: Thread `'whatsapp'` through all 6 source-enum sites**

In `apps/api/src/services/chat-engine.ts:69`:
```typescript
export type ChatSource =
  | "widget"
  | "playground"
  | "mcp"
  | "api"
  | "voice"
  | "public"
  | "mobile"
  | "whatsapp";
```

In `apps/api/src/services/chat-engine.ts:1186` (`validateChatInput`):
```typescript
  const validSources: ChatSource[] = [
    "widget",
    "playground",
    "mcp",
    "api",
    "voice",
    "public",
    "mobile",
    "whatsapp",
  ];
```

In `apps/api/src/routes/chat.ts:450`:
```typescript
    const validSources: ChatSource[] = [
      "widget",
      "playground",
      "mcp",
      "api",
      "voice",
      "public",
      "mobile",
      "whatsapp",
    ];
```

In `apps/api/src/routes/conversations.ts:45` (the zod `.enum()`):
```typescript
    .enum(["widget", "playground", "mcp", "api", "voice", "public", "mobile", "whatsapp"])
```

In `apps/api/src/routes/analytics.ts:95`:
```typescript
const ANALYTICS_SOURCES = [
  "widget",
  "playground",
  "mcp",
  "api",
  "voice",
  "public",
  "mobile",
  "whatsapp",
] as const;
```

In `apps/api/src/routes/lead-capture.ts:36`:
```typescript
const LEAD_SOURCES: ChatSource[] = [
  "widget",
  "playground",
  "mcp",
  "api",
  "voice",
  "public",
  "mobile",
  "whatsapp",
];
```

- [ ] **Step 5: Run test to verify it passes**

Run: `node --experimental-strip-types --test tests/api/whatsapp-source-migration.test.ts`
Expected: All 3 tests PASS

- [ ] **Step 6: STOP — user reviews and commits in IDE**

---

### Task 2: Channel Connections Table + RLS Hardening

**Files:**
- Create: `supabase/migrations/20260629000003_create_channel_connections.sql`
- Test: `tests/api/channel-connections-migration.test.ts`

**Interfaces:**
- Consumes: `projects` table (FK), security hardening patterns from `20260626000001`, `20260627120415`, `20260627174410`
- Produces: `channel_connections` table with RLS, revoked anon+authenticated grants, owner-only defense-in-depth policies, partial unique index for active-per-project

- [ ] **Step 1: Write the failing test**

```typescript
// tests/api/channel-connections-migration.test.ts
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const migrationsDir = path.join(process.cwd(), "supabase/migrations");

async function loadMigration(): Promise<string> {
  const files = await readdir(migrationsDir);
  const migration = files
    .filter((f) => f.includes("create_channel_connections"))
    .sort()
    .at(-1);
  assert.ok(migration, "expected a channel_connections migration file");
  return readFile(path.join(migrationsDir, migration), "utf8");
}

test("channel_connections table has required columns", async () => {
  const sql = await loadMigration();
  assert.match(sql, /CREATE TABLE channel_connections/i);
  assert.match(sql, /project_id\s+uuid\s+NOT NULL/i);
  assert.match(sql, /provider\s+text\s+NOT NULL/i);
  assert.match(sql, /external_id\s+text\s+NOT NULL/i);
  assert.match(sql, /credentials\s+text\s+NOT NULL/i);
  assert.match(sql, /status\s+text\s+NOT NULL/i);
});

test("channel_connections has global (provider, external_id) uniqueness", async () => {
  const sql = await loadMigration();
  assert.match(sql, /UNIQUE\s*\(provider,\s*external_id\)/i);
});

test("channel_connections has partial unique index for one-active-per-project", async () => {
  const sql = await loadMigration();
  assert.match(
    sql,
    /CREATE UNIQUE INDEX.*channel_connections.*project_id.*provider.*WHERE\s+status\s*=\s*'active'/i
  );
});

test("channel_connections RLS is enabled", async () => {
  const sql = await loadMigration();
  assert.match(sql, /ENABLE ROW LEVEL SECURITY/i);
});

test("channel_connections revokes anon and authenticated", async () => {
  const sql = await loadMigration();
  assert.match(sql, /REVOKE ALL ON TABLE.*channel_connections.*FROM anon/i);
  assert.match(sql, /REVOKE ALL ON TABLE.*channel_connections.*FROM authenticated/i);
});

test("channel_connections has owner-only defense-in-depth policies", async () => {
  const sql = await loadMigration();
  assert.match(sql, /CREATE POLICY.*Project owners can read channel connections/i);
  assert.match(sql, /CREATE POLICY.*Project owners can manage channel connections/i);
  assert.match(sql, /auth\.uid\(\)/i);
});

test("channel_connections revokes TRUNCATE, REFERENCES, TRIGGER", async () => {
  const sql = await loadMigration();
  assert.match(sql, /REVOKE TRUNCATE.*REFERENCES.*TRIGGER.*channel_connections/i);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-strip-types --test tests/api/channel-connections-migration.test.ts`
Expected: FAIL — no migration file

- [ ] **Step 3: Write the migration**

```sql
-- supabase/migrations/20260629000003_create_channel_connections.sql
-- CHAN-001: Channel connections table (multi-provider, WhatsApp first).
-- Security: matches June 2026 hardening end-state (revoke anon+auth, RLS, owner-only).

CREATE TABLE channel_connections (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  provider     text NOT NULL CHECK (provider IN ('whatsapp')),
  external_id  text NOT NULL,
  display_name text,
  credentials  text NOT NULL,
  config       jsonb NOT NULL DEFAULT '{}'::jsonb,
  status       text NOT NULL DEFAULT 'active' CHECK (status IN ('active','disabled','error')),
  last_error   text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, external_id)
);

CREATE INDEX idx_channel_connections_project ON channel_connections(project_id);

-- At most one active connection per project+provider (Codex finding #5).
CREATE UNIQUE INDEX idx_channel_connections_active_per_project
  ON channel_connections(project_id, provider) WHERE status = 'active';

-- Security: RLS + lockdown (matching June 2026 hardening end-state).
ALTER TABLE channel_connections ENABLE ROW LEVEL SECURITY;

-- No browser query path — revoke both anon and authenticated (service-role-only table).
REVOKE ALL ON TABLE public.channel_connections FROM anon;
REVOKE ALL ON TABLE public.channel_connections FROM authenticated;
REVOKE TRUNCATE, REFERENCES, TRIGGER ON TABLE public.channel_connections FROM anon, authenticated;

-- Owner-only defense-in-depth policies (active only if authenticated grants are re-added later).
CREATE POLICY "Project owners can read channel connections"
  ON public.channel_connections FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = channel_connections.project_id
      AND p.user_id = (SELECT auth.uid()) AND p.deleted_at IS NULL
  ));

CREATE POLICY "Project owners can manage channel connections"
  ON public.channel_connections FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = channel_connections.project_id
      AND p.user_id = (SELECT auth.uid()) AND p.deleted_at IS NULL
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = channel_connections.project_id
      AND p.user_id = (SELECT auth.uid()) AND p.deleted_at IS NULL
  ));
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --experimental-strip-types --test tests/api/channel-connections-migration.test.ts`
Expected: All 7 tests PASS

- [ ] **Step 5: STOP — user reviews and commits in IDE**

---

### Task 3: Customer Phone + Idempotency Index Migrations

**Files:**
- Create: `supabase/migrations/20260629000004_add_customer_phone.sql`
- Create: `supabase/migrations/20260629000005_add_wa_message_id_idempotency.sql`
- Test: `tests/api/customer-phone-and-idempotency-migration.test.ts`

**Interfaces:**
- Consumes: Existing `customers` table, existing `messages` table
- Produces: `customers.phone` column, partial unique index on `messages.metadata->>'wa_message_id'`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/api/customer-phone-and-idempotency-migration.test.ts
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const migrationsDir = path.join(process.cwd(), "supabase/migrations");

test("customers table has phone column migration", async () => {
  const files = await readdir(migrationsDir);
  const migration = files
    .filter((f) => f.includes("add_customer_phone"))
    .sort()
    .at(-1);
  assert.ok(migration, "expected a customer phone migration file");

  const sql = await readFile(path.join(migrationsDir, migration), "utf8");
  assert.match(sql, /ALTER TABLE customers ADD COLUMN/i);
  assert.match(sql, /phone\s+text/i);
});

test("wa_message_id idempotency index migration exists", async () => {
  const files = await readdir(migrationsDir);
  const migration = files
    .filter((f) => f.includes("wa_message_id_idempotency"))
    .sort()
    .at(-1);
  assert.ok(migration, "expected a wa_message_id idempotency migration file");

  const sql = await readFile(path.join(migrationsDir, migration), "utf8");
  assert.match(sql, /CREATE UNIQUE INDEX/i);
  assert.match(sql, /wa_message_id/);
  assert.match(sql, /WHERE\s+metadata\s*\?\s*'wa_message_id'/i);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-strip-types --test tests/api/customer-phone-and-idempotency-migration.test.ts`
Expected: FAIL — no migration files

- [ ] **Step 3: Write both migrations**

```sql
-- supabase/migrations/20260629000004_add_customer_phone.sql
-- CHAN-001 FR-003: Add phone column to customers for WhatsApp identity.
ALTER TABLE customers ADD COLUMN IF NOT EXISTS phone text;
```

```sql
-- supabase/migrations/20260629000005_add_wa_message_id_idempotency.sql
-- CHAN-001 FR-006: Partial unique index so Meta webhook retries cannot create
-- duplicate messages. Belt-and-braces with app-level dedupe in CHAN-002.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_messages_wa_message_id
  ON messages ((metadata->>'wa_message_id'))
  WHERE metadata ? 'wa_message_id';
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --experimental-strip-types --test tests/api/customer-phone-and-idempotency-migration.test.ts`
Expected: All 2 tests PASS

- [ ] **Step 5: STOP — user reviews and commits in IDE**

---

### Task 4: Channel Types + Connections Service

**Files:**
- Create: `apps/api/src/types/channels.ts`
- Create: `apps/api/src/services/channels/connections.ts`
- Test: `tests/api/channel-connections-service.test.ts`

**Interfaces:**
- Consumes: `encryptAuthConfig(config)` / `decryptAuthConfig(encrypted)` from `apps/api/src/services/encryption.ts`; `supabaseAdmin` from `apps/api/src/lib/supabase`
- Produces:
  - `ChannelProvider` type = `'whatsapp'`
  - `ChannelConnection` interface (id, projectId, provider, externalId, displayName, status, lastError, config, createdAt, updatedAt)
  - `WhatsAppCredentials` interface (accessToken, appSecret, verifyToken, wabaId)
  - `getConnectionByExternalId(provider: ChannelProvider, externalId: string): Promise<(ChannelConnection & { encryptedCredentials: string }) | null>`
  - `getActiveConnection(projectId: string, provider: ChannelProvider): Promise<(ChannelConnection & { encryptedCredentials: string }) | null>`
  - `upsertConnection(projectId: string, provider: ChannelProvider, data: UpsertConnectionData): Promise<ChannelConnection>` (credentials stripped from return)
  - `setConnectionStatus(id: string, status: ChannelConnection['status'], lastError?: string): Promise<void>`
  - `decryptCredentials<T>(encrypted: string): T` (convenience wrapper for CHAN-003 dispatcher)

- [ ] **Step 1: Write the failing test**

```typescript
// tests/api/channel-connections-service.test.ts
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const typesPath = path.join(process.cwd(), "apps/api/src/types/channels.ts");
const servicePath = path.join(
  process.cwd(),
  "apps/api/src/services/channels/connections.ts"
);

test("channel types file exists and exports required types", async () => {
  const source = await readFile(typesPath, "utf8");
  assert.match(source, /ChannelProvider/);
  assert.match(source, /ChannelConnection/);
  assert.match(source, /WhatsAppCredentials/);
  assert.match(source, /['"]whatsapp['"]/);
});

test("connections service exports required functions", async () => {
  const source = await readFile(servicePath, "utf8");
  assert.match(source, /getConnectionByExternalId/);
  assert.match(source, /getActiveConnection/);
  assert.match(source, /upsertConnection/);
  assert.match(source, /setConnectionStatus/);
});

test("connections service uses encryption.ts for credentials", async () => {
  const source = await readFile(servicePath, "utf8");
  assert.match(source, /encryptAuthConfig/);
  assert.match(source, /decryptAuthConfig/);
});

test("connections service uses supabaseAdmin (service role, not user client)", async () => {
  const source = await readFile(servicePath, "utf8");
  assert.match(source, /supabaseAdmin/);
  assert.doesNotMatch(
    source,
    /from\s+["'].*supabase["']\s*(?!.*admin)/i,
    "should use supabaseAdmin, not the user-scoped client"
  );
});

test("upsertConnection does not store credentials in plaintext", async () => {
  const source = await readFile(servicePath, "utf8");
  const upsertBlock =
    source.slice(source.indexOf("upsertConnection"), source.indexOf("setConnectionStatus")) || source;
  assert.match(
    upsertBlock,
    /encryptAuthConfig/,
    "upsertConnection must call encryptAuthConfig before storing"
  );
});

test("service returns encryptedCredentials (not credentials) so callers can't accidentally pass encrypted blobs", async () => {
  const source = await readFile(servicePath, "utf8");
  const upsertBlock =
    source.slice(source.indexOf("upsertConnection"), source.indexOf("setConnectionStatus")) || source;
  assert.match(source, /encryptedCredentials/, "return field must be named encryptedCredentials");
  assert.doesNotMatch(
    source,
    /credentials:\s*row\.credentials/,
    "must not map raw credentials field without the encrypted prefix"
  );
  assert.doesNotMatch(
    upsertBlock,
    /const\s*\{\s*credentials:/,
    "upsertConnection must strip encryptedCredentials from returned payloads, not a non-existent credentials field"
  );
});

test("upsertConnection filters by status=active with maybeSingle", async () => {
  const source = await readFile(servicePath, "utf8");
  const upsertBlock =
    source.slice(source.indexOf("upsertConnection"), source.indexOf("setConnectionStatus")) || source;
  assert.match(upsertBlock, /\.eq\(["']status["'],\s*["']active["']\)/);
  assert.match(upsertBlock, /\.maybeSingle\(\)/);
});
```

- [ ] **Step 2b: Write encryption round-trip unit test**

```typescript
// tests/api/channel-encryption-roundtrip.test.ts
import assert from "node:assert/strict";
import test from "node:test";

const encryptionPath = new URL(
  "../../apps/api/src/services/encryption.ts",
  import.meta.url
);
const TEST_ENCRYPTION_KEY =
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

test("encryptAuthConfig / decryptAuthConfig round-trips JSON objects", async () => {
  const previousKey = process.env.ENCRYPTION_KEY;
  process.env.ENCRYPTION_KEY = TEST_ENCRYPTION_KEY;

  const mod = await import(encryptionPath.href);
  const encrypt = mod.encryptAuthConfig as (config: Record<string, unknown>) => string;
  const decrypt = mod.decryptAuthConfig as (encrypted: string) => Record<string, unknown>;

  const creds = { accessToken: "tok_123", appSecret: "sec_456", verifyToken: "vt_789", wabaId: "waba_0" };
  try {
    const encrypted = encrypt(creds);

    assert.notEqual(encrypted, JSON.stringify(creds), "encrypted output must differ from plaintext");
    assert.match(encrypted, /^[0-9a-f]+:[0-9a-f]+:[0-9a-f]+$/, "format must be iv:authTag:ciphertext");

    const decrypted = decrypt(encrypted);
    assert.deepStrictEqual(decrypted, creds, "decrypted output must match original");
  } finally {
    if (previousKey === undefined) {
      delete process.env.ENCRYPTION_KEY;
    } else {
      process.env.ENCRYPTION_KEY = previousKey;
    }
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-strip-types --test tests/api/channel-connections-service.test.ts`
Expected: FAIL — files don't exist

- [ ] **Step 3: Write the types file**

```typescript
// apps/api/src/types/channels.ts

export type ChannelProvider = 'whatsapp';

export type ChannelConnectionStatus = 'active' | 'disabled' | 'error';

export interface ChannelConnection {
  id: string;
  projectId: string;
  provider: ChannelProvider;
  externalId: string;
  displayName: string | null;
  status: ChannelConnectionStatus;
  lastError: string | null;
  config: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface WhatsAppCredentials {
  accessToken: string;
  appSecret: string;
  verifyToken: string;
  wabaId: string;
}

export interface UpsertConnectionData {
  externalId: string;
  displayName?: string;
  credentials: WhatsAppCredentials;
  config?: Record<string, unknown>;
}
```

- [ ] **Step 4: Write the connections service**

```typescript
// apps/api/src/services/channels/connections.ts

import { supabaseAdmin } from "../../lib/supabase";
import { encryptAuthConfig, decryptAuthConfig } from "../encryption";
import type {
  ChannelConnection,
  ChannelConnectionStatus,
  ChannelProvider,
  UpsertConnectionData,
} from "../../types/channels";

interface ConnectionRow {
  id: string;
  project_id: string;
  provider: string;
  external_id: string;
  display_name: string | null;
  credentials: string;
  config: Record<string, unknown>;
  status: string;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

function toConnection(row: ConnectionRow): ChannelConnection & { encryptedCredentials: string } {
  return {
    id: row.id,
    projectId: row.project_id,
    provider: row.provider as ChannelProvider,
    externalId: row.external_id,
    displayName: row.display_name,
    encryptedCredentials: row.credentials,
    status: row.status as ChannelConnectionStatus,
    lastError: row.last_error,
    config: row.config,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getConnectionByExternalId(
  provider: ChannelProvider,
  externalId: string
): Promise<(ChannelConnection & { encryptedCredentials: string }) | null> {
  const { data, error } = await supabaseAdmin
    .from("channel_connections")
    .select("*")
    .eq("provider", provider)
    .eq("external_id", externalId)
    .eq("status", "active")
    .single();

  if (error || !data) return null;
  return toConnection(data as ConnectionRow);
}

export async function getActiveConnection(
  projectId: string,
  provider: ChannelProvider
): Promise<(ChannelConnection & { encryptedCredentials: string }) | null> {
  const { data, error } = await supabaseAdmin
    .from("channel_connections")
    .select("*")
    .eq("project_id", projectId)
    .eq("provider", provider)
    .eq("status", "active")
    .single();

  if (error || !data) return null;
  return toConnection(data as ConnectionRow);
}

export async function upsertConnection(
  projectId: string,
  provider: ChannelProvider,
  data: UpsertConnectionData
): Promise<ChannelConnection> {
  const encrypted = encryptAuthConfig(data.credentials);

  const row = {
    project_id: projectId,
    provider,
    external_id: data.externalId,
    display_name: data.displayName ?? null,
    credentials: encrypted,
    config: data.config ?? {},
    status: "active" as const,
    last_error: null,
    updated_at: new Date().toISOString(),
  };

  const { data: existing } = await supabaseAdmin
    .from("channel_connections")
    .select("id")
    .eq("project_id", projectId)
    .eq("provider", provider)
    .eq("status", "active")
    .maybeSingle();

  if (existing) {
    const { data: updated, error } = await supabaseAdmin
      .from("channel_connections")
      .update(row)
      .eq("id", existing.id)
      .select("*")
      .single();

    if (error || !updated) throw new Error(`Failed to update connection: ${error?.message}`);
    const full = toConnection(updated as ConnectionRow);
    const { encryptedCredentials: _, ...connection } = full;
    return connection;
  }

  const { data: existingByExternalId } = await supabaseAdmin
    .from("channel_connections")
    .select("id")
    .eq("provider", provider)
    .eq("external_id", data.externalId)
    .maybeSingle();

  if (existingByExternalId) {
    const { data: updated, error } = await supabaseAdmin
      .from("channel_connections")
      .update(row)
      .eq("id", existingByExternalId.id)
      .select("*")
      .single();

    if (error || !updated) throw new Error(`Failed to update connection: ${error?.message}`);
    const full = toConnection(updated as ConnectionRow);
    const { encryptedCredentials: _, ...connection } = full;
    return connection;
  }

  const { data: inserted, error } = await supabaseAdmin
    .from("channel_connections")
    .insert(row)
    .select("*")
    .single();

  if (error || !inserted) throw new Error(`Failed to create connection: ${error?.message}`);
  const full = toConnection(inserted as ConnectionRow);
  const { encryptedCredentials: _, ...connection } = full;
  return connection;
}

export async function setConnectionStatus(
  id: string,
  status: ChannelConnectionStatus,
  lastError?: string
): Promise<void> {
  const { error } = await supabaseAdmin
    .from("channel_connections")
    .update({
      status,
      last_error: lastError ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) throw new Error(`Failed to update connection status: ${error.message}`);
}

export function decryptCredentials<T>(encrypted: string): T {
  return decryptAuthConfig(encrypted) as T;
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `node --experimental-strip-types --test tests/api/channel-connections-service.test.ts`
Expected: All 7 tests PASS

Run: `node --experimental-strip-types --test tests/api/channel-encryption-roundtrip.test.ts`
Expected: PASS

- [ ] **Step 6: STOP — user reviews and commits in IDE**

---

## CHAN-005 Tasks

### Task 5: Widget Appearance Types + Parsing (channels)

**Files:**
- Modify: `apps/widget/src/utils/widget-appearance.ts`
- Test: `tests/widget/channel-launcher.test.ts`

**Interfaces:**
- Consumes: Existing `WidgetDisplayConfig`, `ResolvedWidgetAppearance`, `parseDisplayConfig`, `resolveWidgetAppearanceDefaults`
- Produces:
  - `ChannelButtonType` = `'whatsapp' | 'instagram' | 'facebook' | 'email' | 'phone' | 'custom'`
  - `ChannelButton` = `{ type: ChannelButtonType; url: string; label?: string; iconUrl?: string }`
  - `WidgetDisplayConfig.channels?: ChannelButton[]`
  - `ResolvedWidgetAppearance.channels: ChannelButton[]` (defaults to `[]`)
  - `isAllowedUrl(url: string): boolean` — validates channel URL scheme (https, http, mailto, tel)
  - `isAllowedIconUrl(url: string): boolean` — validates icon URL scheme (https, http only per spec line 66)

- [ ] **Step 1: Write the failing test**

```typescript
// tests/widget/channel-launcher.test.ts
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const appearancePath = path.join(
  process.cwd(),
  "apps/widget/src/utils/widget-appearance.ts"
);
const appearanceModuleUrl = new URL(
  "../../apps/widget/src/utils/widget-appearance.ts",
  import.meta.url
);

test("widget-appearance exports ChannelButton type", async () => {
  const source = await readFile(appearancePath, "utf8");
  assert.match(source, /export\s+interface\s+ChannelButton/);
  assert.match(source, /type:\s*ChannelButtonType/);
  assert.match(source, /url:\s*string/);
});

test("WidgetDisplayConfig has optional channels field", async () => {
  const source = await readFile(appearancePath, "utf8");
  const configBlock = source.slice(
    source.indexOf("interface WidgetDisplayConfig"),
    source.indexOf("interface ResolvedWidgetAppearance")
  );
  assert.match(configBlock, /channels\?.*ChannelButton\[\]/);
});

test("ResolvedWidgetAppearance has channels field", async () => {
  const source = await readFile(appearancePath, "utf8");
  const resolvedBlock = source.slice(
    source.indexOf("interface ResolvedWidgetAppearance"),
    source.indexOf("interface WidgetStrings")
  );
  assert.match(resolvedBlock, /channels:\s*ChannelButton\[\]/);
});

test("parseDisplayConfig handles channels array", async () => {
  const source = await readFile(appearancePath, "utf8");
  assert.match(source, /value\.channels/);
});

test("resolveWidgetAppearanceDefaults defaults channels to empty array", async () => {
  const source = await readFile(appearancePath, "utf8");
  assert.match(source, /channels:\s*config\?\.channels\s*\?\?\s*\[\]/);
});

test("isAllowedUrl allows channel URL schemes and rejects unsafe schemes", async () => {
  const mod = await import(appearanceModuleUrl.href);
  const isAllowedUrl = mod.isAllowedUrl as (url: string) => boolean;

  assert.equal(isAllowedUrl("https://wa.me/15550100042"), true);
  assert.equal(isAllowedUrl("http://example.com"), true);
  assert.equal(isAllowedUrl("mailto:hi@example.com"), true);
  assert.equal(isAllowedUrl("tel:+15550100042"), true);
  assert.equal(isAllowedUrl("javascript:alert(1)"), false);
  assert.equal(isAllowedUrl("data:text/html,<svg></svg>"), false);
});

test("isAllowedIconUrl only allows https/http (not mailto/tel)", async () => {
  const mod = await import(appearanceModuleUrl.href);
  const isAllowedIconUrl = mod.isAllowedIconUrl as (url: string) => boolean;

  assert.equal(isAllowedIconUrl("https://example.com/icon.png"), true);
  assert.equal(isAllowedIconUrl("http://example.com/icon.png"), true);
  assert.equal(isAllowedIconUrl("mailto:hi@example.com"), false);
  assert.equal(isAllowedIconUrl("tel:+15550100042"), false);
  assert.equal(isAllowedIconUrl("javascript:alert(1)"), false);
  assert.equal(isAllowedIconUrl("data:image/svg+xml,<svg></svg>"), false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-strip-types --test tests/widget/channel-launcher.test.ts`
Expected: FAIL — no ChannelButton, no channels field

- [ ] **Step 3: Add types and parsing to widget-appearance.ts**

Add after the existing `isStringArray` type guard (line 13):

```typescript
export type ChannelButtonType =
  | "whatsapp"
  | "instagram"
  | "facebook"
  | "email"
  | "phone"
  | "custom";

const CHANNEL_BUTTON_TYPES: string[] = [
  "whatsapp",
  "instagram",
  "facebook",
  "email",
  "phone",
  "custom",
];

export interface ChannelButton {
  type: ChannelButtonType;
  url: string;
  label?: string;
  iconUrl?: string;
}

const ALLOWED_CHANNEL_SCHEMES = ["https:", "http:", "mailto:", "tel:"];
const ALLOWED_ICON_SCHEMES = ["https:", "http:"];

export function isAllowedUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ALLOWED_CHANNEL_SCHEMES.includes(parsed.protocol);
  } catch {
    return false;
  }
}

export function isAllowedIconUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ALLOWED_ICON_SCHEMES.includes(parsed.protocol);
  } catch {
    return false;
  }
}

function parseChannelButtons(value: unknown): ChannelButton[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const buttons: ChannelButton[] = [];
  for (const item of value) {
    if (
      !isRecord(item) ||
      !isString(item.type) ||
      !CHANNEL_BUTTON_TYPES.includes(item.type) ||
      !isString(item.url) ||
      !isAllowedUrl(item.url)
    ) continue;
    const btn: ChannelButton = { type: item.type as ChannelButtonType, url: item.url };
    if (isString(item.label)) btn.label = item.label;
    if (isString(item.iconUrl) && isAllowedIconUrl(item.iconUrl)) btn.iconUrl = item.iconUrl;
    buttons.push(btn);
  }
  return buttons.length > 0 ? buttons : undefined;
}
```

Add `channels?: ChannelButton[]` to `WidgetDisplayConfig` (after `localeDefault`):
```typescript
  channels?: ChannelButton[];
```

Add `channels: ChannelButton[]` to `ResolvedWidgetAppearance` (after `localeDefault`):
```typescript
  channels: ChannelButton[];
```

In `parseDisplayConfig`, add before the `return config` line:
```typescript
  const channels = parseChannelButtons(value.channels);
  if (channels) config.channels = channels;
```

In `resolveWidgetAppearanceDefaults`, add to the return object:
```typescript
    channels: config?.channels ?? [],
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --experimental-strip-types --test tests/widget/channel-launcher.test.ts`
Expected: All 7 tests PASS

- [ ] **Step 5: STOP — user reviews and commits in IDE**

---

### Task 6: Embed Config Passthrough (channels)

**Files:**
- Create: `apps/api/src/lib/url-validation.ts`
- Modify: `apps/api/src/routes/embed.ts:132-169` (`buildWidgetAppearanceConfig`)
- Test: `tests/api/embed-channels-passthrough.test.ts`

**Interfaces:**
- Consumes: `settings.widget_appearance.channels` (array from JSONB)
- Produces: `channels` field in the embed config response (only if present and valid)

- [ ] **Step 1: Write the failing test**

```typescript
// tests/api/embed-channels-passthrough.test.ts
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const embedPath = path.join(process.cwd(), "apps/api/src/routes/embed.ts");

test("buildWidgetAppearanceConfig reads channels from widget_appearance", async () => {
  const source = await readFile(embedPath, "utf8");
  const fnBlock = source.slice(
    source.indexOf("function buildWidgetAppearanceConfig"),
    source.indexOf("function buildRealtimeClientConfig")
  );
  assert.match(fnBlock, /channels/);
  assert.match(fnBlock, /wa\.channels/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-strip-types --test tests/api/embed-channels-passthrough.test.ts`
Expected: FAIL — no channels in buildWidgetAppearanceConfig

- [ ] **Step 2b: Create the shared URL validation helper**

```typescript
// apps/api/src/lib/url-validation.ts

const ALLOWED_CHANNEL_SCHEMES = ["https:", "http:", "mailto:", "tel:"];
const ALLOWED_ICON_SCHEMES = ["https:", "http:"];
const VALID_CHANNEL_TYPES = ["whatsapp", "instagram", "facebook", "email", "phone", "custom"];

export function isSafeChannelUrl(url: unknown): url is string {
  if (typeof url !== "string") return false;
  try {
    return ALLOWED_CHANNEL_SCHEMES.includes(new URL(url).protocol);
  } catch {
    return false;
  }
}

export function isSafeIconUrl(url: unknown): url is string {
  if (typeof url !== "string") return false;
  try {
    return ALLOWED_ICON_SCHEMES.includes(new URL(url).protocol);
  } catch {
    return false;
  }
}

export { VALID_CHANNEL_TYPES, ALLOWED_CHANNEL_SCHEMES, ALLOWED_ICON_SCHEMES };
```

- [ ] **Step 3: Add channels passthrough to embed.ts**

In `apps/api/src/routes/embed.ts`, add the import at the top:
```typescript
import { isSafeChannelUrl, isSafeIconUrl, VALID_CHANNEL_TYPES } from "../lib/url-validation";
```

In `buildWidgetAppearanceConfig`, add before the `return` statement:

```typescript
  const channels = Array.isArray(wa.channels)
    ? wa.channels.filter(
        (ch: unknown): ch is { type: string; url: string; label?: string; iconUrl?: string } =>
          typeof ch === "object" &&
          ch !== null &&
          typeof (ch as Record<string, unknown>).type === "string" &&
          VALID_CHANNEL_TYPES.includes((ch as Record<string, unknown>).type as string) &&
          isSafeChannelUrl((ch as Record<string, unknown>).url) &&
          ((ch as Record<string, unknown>).iconUrl === undefined || isSafeIconUrl((ch as Record<string, unknown>).iconUrl))
      )
    : [];
```

Add `channels` to the return object (only if non-empty, to keep backward compat):
```typescript
    ...(channels.length > 0 ? { channels } : {}),
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --experimental-strip-types --test tests/api/embed-channels-passthrough.test.ts`
Expected: PASS

- [ ] **Step 5: STOP — user reviews and commits in IDE**

---

### Task 7: Server-Side URL Validation on Settings PUT

**Files:**
- Modify: `apps/api/src/routes/projects.ts:336` (PUT `/:id` handler)
- Test: `tests/api/channel-url-validation.test.ts`

**Interfaces:**
- Consumes: `req.body.settings.widget_appearance.channels` in the PUT body
- Produces: 400 error if any channel URL or iconUrl uses a disallowed scheme

- [ ] **Step 1: Write the failing test**

```typescript
// tests/api/channel-url-validation.test.ts
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const projectsPath = path.join(
  process.cwd(),
  "apps/api/src/routes/projects.ts"
);
const validationModuleUrl = new URL(
  "../../apps/api/src/lib/url-validation.ts",
  import.meta.url
);

test("shared URL validators allow channel schemes but restrict icon schemes", async () => {
  const mod = await import(validationModuleUrl.href);
  const isSafeChannelUrl = mod.isSafeChannelUrl as (url: unknown) => boolean;
  const isSafeIconUrl = mod.isSafeIconUrl as (url: unknown) => boolean;

  assert.equal(isSafeChannelUrl("https://wa.me/15550100042"), true);
  assert.equal(isSafeChannelUrl("http://example.com"), true);
  assert.equal(isSafeChannelUrl("mailto:hi@example.com"), true);
  assert.equal(isSafeChannelUrl("tel:+15550100042"), true);
  assert.equal(isSafeChannelUrl("javascript:alert(1)"), false);
  assert.equal(isSafeChannelUrl("data:text/html,<svg></svg>"), false);

  assert.equal(isSafeIconUrl("https://example.com/icon.png"), true);
  assert.equal(isSafeIconUrl("http://example.com/icon.png"), true);
  assert.equal(isSafeIconUrl("mailto:hi@example.com"), false);
  assert.equal(isSafeIconUrl("tel:+15550100042"), false);
  assert.equal(isSafeIconUrl("javascript:alert(1)"), false);
  assert.equal(isSafeIconUrl("data:image/svg+xml,<svg></svg>"), false);
});

test("projects PUT uses shared channel and icon URL validators", async () => {
  const source = await readFile(projectsPath, "utf8");
  const putBlock = source.slice(
    source.indexOf('router.put("/:id"'),
    source.indexOf("router.delete") > 0
      ? source.indexOf("router.delete")
      : source.length
  );
  assert.match(putBlock, /widget_appearance/);
  assert.match(putBlock, /channels/);
  assert.match(putBlock, /isSafeChannelUrl/);
  assert.match(putBlock, /isSafeIconUrl/);
  assert.match(putBlock, /INVALID_CHANNEL_URL|UNSAFE_URL|INVALID_URL/i);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-strip-types --test tests/api/channel-url-validation.test.ts`
Expected: FAIL — PUT handler has no channel URL validation

- [ ] **Step 3: Add validation to projects.ts PUT handler**

In `apps/api/src/routes/projects.ts`, add the import at the top:
```typescript
import { isSafeChannelUrl, isSafeIconUrl } from "../lib/url-validation";
```

Inside the PUT `/:id` handler, after the `newSettings` type check (around line 378) and before the "Get current project" block, add:

```typescript
    // FR-006: Validate channel URL schemes in widget_appearance.channels
    if (newSettings?.widget_appearance?.channels) {
      const channels = newSettings.widget_appearance.channels;
      if (Array.isArray(channels)) {
        for (const ch of channels) {
          if (typeof ch !== "object" || ch === null) continue;
          const { url, iconUrl } = ch as { url?: string; iconUrl?: string };
          if (url !== undefined && !isSafeChannelUrl(url)) {
            return res.status(400).json({
              error: {
                code: "INVALID_CHANNEL_URL",
                message: `Channel url uses a disallowed scheme or is not a valid URL. Allowed: https, http, mailto, tel`,
              },
            });
          }
          if (iconUrl !== undefined && !isSafeIconUrl(iconUrl)) {
            return res.status(400).json({
              error: {
                code: "INVALID_CHANNEL_URL",
                message: `Channel iconUrl must use https or http`,
              },
            });
          }
        }
      }
    }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --experimental-strip-types --test tests/api/channel-url-validation.test.ts`
Expected: PASS

- [ ] **Step 5: STOP — user reviews and commits in IDE**

---

### Task 8: Channel Launcher Component + CSS

**Files:**
- Create: `apps/widget/src/components/channel-launcher.ts`
- Modify: `apps/widget/src/styles/widget.css`
- Modify: `apps/widget/src/widget.ts` (mount point)

**Interfaces:**
- Consumes: `ChannelButton[]` from `ResolvedWidgetAppearance.channels`, `isAllowedUrl` + `isAllowedIconUrl` from widget-appearance.ts
- Produces: `ChannelLauncher` class with `element: HTMLDivElement`, `setExpanded(boolean)`, `destroy()`

- [ ] **Step 1: Create the ChannelLauncher component**

```typescript
// apps/widget/src/components/channel-launcher.ts

import type { ChannelButton } from "../utils/widget-appearance";
import { isAllowedUrl, isAllowedIconUrl } from "../utils/widget-appearance";

export interface ChannelLauncherOptions {
  channels: ChannelButton[];
  position: "bottom-right" | "bottom-left";
}

const BRAND_ICONS: Record<string, { svg: string; color: string }> = {
  whatsapp: {
    svg: '<path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" fill="currentColor"/><path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.832-1.438A9.955 9.955 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18a8 8 0 01-4.108-1.134l-.29-.174-3.012.79.804-2.94-.192-.302A8 8 0 1112 20z" fill="currentColor"/>',
    color: "#25D366",
  },
  instagram: {
    svg: '<rect x="2" y="2" width="20" height="20" rx="5" ry="5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="17.5" cy="6.5" r="1.5" fill="currentColor"/>',
    color: "#E4405F",
  },
  facebook: {
    svg: '<path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
    color: "#1877F2",
  },
  email: {
    svg: '<rect x="2" y="4" width="20" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M22 7l-10 7L2 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
    color: "#6B7280",
  },
  phone: {
    svg: '<path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
    color: "#6B7280",
  },
};

const DEFAULT_LABELS: Record<string, string> = {
  whatsapp: "WhatsApp",
  instagram: "Instagram",
  facebook: "Facebook",
  email: "Email",
  phone: "Call us",
};

export class ChannelLauncher {
  element: HTMLDivElement;
  private expanded = false;

  constructor(private options: ChannelLauncherOptions) {
    this.element = this.createElement();
  }

  private createElement(): HTMLDivElement {
    const container = document.createElement("div");
    container.className = "channel-launcher";
    container.setAttribute("role", "group");
    container.setAttribute("aria-label", "Contact channels");

    for (const channel of this.options.channels) {
      if (!isAllowedUrl(channel.url)) continue;
      if (channel.iconUrl && !isAllowedIconUrl(channel.iconUrl)) continue;
      container.appendChild(this.createButton(channel));
    }

    return container;
  }

  private createButton(channel: ChannelButton): HTMLAnchorElement {
    const link = document.createElement("a");
    link.className = `channel-btn channel-btn--${channel.type}`;
    link.href = channel.url;
    link.target = "_blank";
    link.rel = "noopener";
    link.setAttribute(
      "aria-label",
      channel.label || DEFAULT_LABELS[channel.type] || channel.type
    );

    const brand = BRAND_ICONS[channel.type];

    if (channel.type === "custom" && channel.iconUrl) {
      const img = document.createElement("img");
      img.src = channel.iconUrl;
      img.alt = "";
      img.setAttribute("aria-hidden", "true");
      img.className = "channel-btn__icon";
      img.onerror = () => { img.style.display = "none"; };
      link.appendChild(img);
    } else if (brand) {
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("class", "channel-btn__icon");
      svg.setAttribute("width", "20");
      svg.setAttribute("height", "20");
      svg.setAttribute("viewBox", "0 0 24 24");
      svg.setAttribute("aria-hidden", "true");
      svg.innerHTML = brand.svg;
      if (brand.color) link.style.setProperty("--channel-color", brand.color);
      link.appendChild(svg);
    }

    if (channel.label) {
      const span = document.createElement("span");
      span.className = "channel-btn__label";
      span.textContent = channel.label;
      link.appendChild(span);
    }

    link.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        link.click();
      }
    });

    return link;
  }

  setExpanded(expanded: boolean): void {
    this.expanded = expanded;
    this.element.classList.toggle("channel-launcher--expanded", expanded);
    this.element.setAttribute("aria-hidden", expanded ? "false" : "true");
  }

  destroy(): void {
    this.element.remove();
  }
}
```

- [ ] **Step 2: Add CSS for the launcher**

Append to `apps/widget/src/styles/widget.css`:

```css
/* ---- Channel Launcher (CHAN-005) ---- */
.channel-launcher {
  display: flex;
  flex-direction: column-reverse;
  gap: 8px;
  position: absolute;
  bottom: 72px;
  right: 0;
  opacity: 0;
  pointer-events: none;
  transform: translateY(8px);
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.chatbot-widget.bottom-left .channel-launcher {
  right: auto;
  left: 0;
}
.channel-launcher--expanded {
  opacity: 1;
  pointer-events: auto;
  transform: translateY(0);
}

.channel-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 44px;
  min-height: 44px;
  padding: 10px 14px;
  border-radius: 22px;
  background: var(--channel-color, #374151);
  color: #fff;
  text-decoration: none;
  font-size: 13px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  white-space: nowrap;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.channel-btn:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}
.channel-btn:focus-visible {
  outline: 2px solid var(--widget-primary, #0a0a0a);
  outline-offset: 2px;
}

.channel-btn__icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}
img.channel-btn__icon {
  border-radius: 50%;
  object-fit: cover;
}

.channel-btn__label {
  font-weight: 500;
}

/* When no label, render as circle icon button */
.channel-btn:not(:has(.channel-btn__label)) {
  padding: 10px;
  border-radius: 50%;
  justify-content: center;
}
```

- [ ] **Step 3: Mount the launcher in widget.ts**

In `apps/widget/src/widget.ts`, add the import at the top:
```typescript
import { ChannelLauncher } from "./components/channel-launcher";
```

Add a property to the ChatbotWidget class:
```typescript
  private channelLauncher: ChannelLauncher | null = null;
```

In `init()`, after creating the Bubble and before creating the ChatWindow (after line 171 `wrapper.appendChild(this.bubble.element);`), add:

```typescript
    // Channel launcher (CHAN-005) — only mount if channels are configured.
    // Starts expanded because chat starts closed; channels should be visible alongside the bubble.
    if (this.appearance.channels.length > 0) {
      this.channelLauncher = new ChannelLauncher({
        channels: this.appearance.channels,
        position: this.config.position as "bottom-right" | "bottom-left",
      });
      this.channelLauncher.setExpanded(true);
      wrapper.appendChild(this.channelLauncher.element);
    }
```

In the `open()` method (line 342), after `this.bubble?.setActive(true);` add:
```typescript
    this.channelLauncher?.setExpanded(false);
```

In the `close()` method (line 359), after `this.bubble?.setActive(false);` add:
```typescript
    this.channelLauncher?.setExpanded(true);
```

No change needed in `toggle()` — it delegates to `open()`/`close()` which already handle the launcher state.

- [ ] **Step 4: STOP — user reviews and commits in IDE**

---

### Task 9: Dashboard Channels Editor Section

**Files:**
- Modify: `apps/web/app/(dashboard)/embed/page.tsx`

**Interfaces:**
- Consumes: `WidgetSettings` (add `channels` field), `fromConfig()`, `toSettingsPayload()`, existing settings PUT
- Produces: A "Channels" section in the embed editor with add/remove/reorder channel buttons

- [ ] **Step 1: Add channels to WidgetSettings**

In `apps/web/app/(dashboard)/embed/page.tsx`:

Add to `WidgetSettings` interface:
```typescript
  channels: Array<{ type: string; url: string; label: string; iconUrl: string }>;
```

Add to `DEFAULTS`:
```typescript
  channels: [],
```

Add to `EmbedConfigResponse.config`:
```typescript
    channels?: Array<{ type: string; url: string; label?: string; iconUrl?: string }>;
```

In `fromConfig()`, add:
```typescript
    channels: (cfg.channels ?? []).map((ch) => ({
      type: ch.type,
      url: ch.url,
      label: ch.label ?? "",
      iconUrl: ch.iconUrl ?? "",
    })),
```

In `toSettingsPayload()`, add to `widget_appearance`:
```typescript
      channels: s.channels
        .filter((ch) => ch.url.trim())
        .map((ch) => ({
          type: ch.type,
          url: ch.url.trim(),
          ...(ch.label.trim() ? { label: ch.label.trim() } : {}),
          ...(ch.iconUrl.trim() ? { iconUrl: ch.iconUrl.trim() } : {}),
        })),
```

- [ ] **Step 2: Add the Channels editor UI**

Add the Channels section after the existing sections (before the Save button area). The exact JSX:

```tsx
{/* ---- Channels ---- */}
<div className="space-y-4">
  <div className="flex items-center justify-between">
    <h3 className="text-sm font-medium">Channels on the widget</h3>
    <button
      type="button"
      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
      onClick={() =>
        update("channels", [
          ...settings.channels,
          { type: "whatsapp", url: "", label: "", iconUrl: "" },
        ])
      }
    >
      <Plus className="h-3 w-3" /> Add channel
    </button>
  </div>
  {settings.channels.length === 0 && (
    <p className="text-xs text-muted-foreground">
      No channels configured. Add one to show contact buttons on the widget.
    </p>
  )}
  {settings.channels.map((ch, idx) => (
    <div
      key={idx}
      className="flex items-start gap-2 rounded-md border border-input p-3"
    >
      <div className="flex-1 space-y-2">
        <div className="flex gap-2">
          <select
            value={ch.type}
            onChange={(e) => {
              const next = [...settings.channels];
              next[idx] = { ...ch, type: e.target.value };
              update("channels", next);
            }}
            className="w-32 px-2 py-1.5 border border-input rounded-md bg-background text-sm"
          >
            <option value="whatsapp">WhatsApp</option>
            <option value="instagram">Instagram</option>
            <option value="facebook">Facebook</option>
            <option value="email">Email</option>
            <option value="phone">Phone</option>
            <option value="custom">Custom</option>
          </select>
          <Input
            value={ch.url}
            placeholder={
              ch.type === "whatsapp"
                ? "https://wa.me/15550100042"
                : ch.type === "email"
                  ? "mailto:hi@acme.com"
                  : ch.type === "phone"
                    ? "tel:+15550100042"
                    : "https://..."
            }
            onChange={(e) => {
              const next = [...settings.channels];
              next[idx] = { ...ch, url: e.target.value };
              update("channels", next);
            }}
            className="flex-1"
          />
        </div>
        <div className="flex gap-2">
          <Input
            value={ch.label}
            placeholder="Label (optional)"
            onChange={(e) => {
              const next = [...settings.channels];
              next[idx] = { ...ch, label: e.target.value };
              update("channels", next);
            }}
            className="flex-1"
          />
          {ch.type === "custom" && (
            <Input
              value={ch.iconUrl}
              placeholder="Icon URL (optional)"
              onChange={(e) => {
                const next = [...settings.channels];
                next[idx] = { ...ch, iconUrl: e.target.value };
                update("channels", next);
              }}
              className="flex-1"
            />
          )}
        </div>
      </div>
      <div className="flex flex-col gap-0.5">
        <button
          type="button"
          disabled={idx === 0}
          onClick={() => {
            const next = [...settings.channels];
            [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
            update("channels", next);
          }}
          className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
          aria-label="Move channel up"
        >
          <ChevronUp className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          disabled={idx === settings.channels.length - 1}
          onClick={() => {
            const next = [...settings.channels];
            [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
            update("channels", next);
          }}
          className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
          aria-label="Move channel down"
        >
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
      </div>
      <button
        type="button"
        onClick={() => {
          const next = settings.channels.filter((_, i) => i !== idx);
          update("channels", next);
        }}
        className="p-1.5 text-muted-foreground hover:text-destructive"
        aria-label="Remove channel"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  ))}
</div>
```

- [ ] **Step 3: Verify icon imports are present**

The `Plus` and `Trash2` icons should already be imported from `lucide-react` at the top. Add `ChevronUp` and `ChevronDown` to that existing import list.

`Input` and the other UI primitives are already in scope.

- [ ] **Step 4: STOP — user reviews and commits in IDE**

---

## Verification Checklist

After all tasks are implemented:

| AC | How to verify | Task |
|----|---------------|------|
| CHAN-001 AC-001 | `node --experimental-strip-types --test tests/api/whatsapp-source-migration.test.ts` | Task 1 |
| CHAN-001 AC-002 | `channel-encryption-roundtrip.test.ts` + source inspection (encryptAuthConfig, encryptedCredentials naming) | Task 4 |
| CHAN-001 AC-003 | `UNIQUE (provider, external_id)` in migration | Task 2 |
| CHAN-001 AC-004 | `idx_channel_connections_active_per_project` partial unique index | Task 2 |
| CHAN-001 AC-005 | `node --experimental-strip-types --test tests/api/customer-phone-and-idempotency-migration.test.ts` | Task 3 |
| CHAN-001 AC-006 | `ALTER TABLE customers ADD COLUMN phone text` in migration | Task 3 |
| CHAN-001 AC-007 | No existing tests broken (run full suite) | All |
| CHAN-001 AC-008 | Verify via `security:probe:supabase` against dev (after migration applied) | Task 2 |
| CHAN-001 AC-009 | RLS policies + revoked authenticated grants in migration | Task 2 |
| CHAN-005 AC-001 | `node --experimental-strip-types --test tests/widget/channel-launcher.test.ts` | Task 5 |
| CHAN-005 AC-002 | Manual test: configure channels, widget renders buttons, links open | Task 8 |
| CHAN-005 AC-003 | Component mounts inside closed Shadow DOM (in widget.ts init) | Task 8 |
| CHAN-005 AC-004 | Manual test: add/remove/reorder in editor, reload widget | Task 9 |
| CHAN-005 AC-005 | Buttons use `<a>` with aria-label, min 44px tap target in CSS | Task 8 |
| CHAN-005 AC-006a | `node --experimental-strip-types --test tests/api/channel-url-validation.test.ts` + client-side `isAllowedUrl` | Task 5, 7 |
| CHAN-005 AC-006b | Same as AC-006a (data: scheme) | Task 5, 7 |
| CHAN-005 AC-006c | `isAllowedIconUrl` rejects non-http(s) iconUrl (separate from channel URL validator) | Task 5 |
