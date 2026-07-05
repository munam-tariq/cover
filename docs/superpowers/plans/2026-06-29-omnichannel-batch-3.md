# Omnichannel Batch 3 — Dashboard Channel Awareness + Onboarding & Ops

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the existing dashboard channel-aware (CHAN-004) and complete env/ops documentation (CHAN-006), so agents see WhatsApp badges, filter by source, manage connections from settings, and the 24h window state is surfaced in the composer.

**Architecture:** A shared `getChannelMeta` helper provides consistent channel cues (label, icon, color) across inbox, analytics, and settings. New project-scoped channel API endpoints (owner-only, behind `authMiddleware`) power a Channels settings tab modeled on the existing `public-page-tab.tsx` pattern. The inbox detail composer reflects the server's 24h window state. Credentials are write-only — GET never returns secrets.

**Tech Stack:** Next.js 14 (App Router), React, Express, Supabase (service-role via `supabaseAdmin`), `@chatbot/ui` (shadcn), lucide-react icons, `node:test` + `node:assert/strict` for tests.

## Global Constraints

- **Never auto-commit.** User reviews all changes in IDE before committing.
- **Security:** All channel endpoints use `authMiddleware` + owner-only guard (`getAccessibleProject(id, userId, false)`). Credentials encrypted via `encryptAuthConfig`/`decryptAuthConfig` from `apps/api/src/services/encryption.ts`. GET endpoints return NO credential material. `channel_connections` has no `authenticated` SELECT grant — service-role only.
- **URL safety:** Channel URLs allow `https`/`http`/`mailto`/`tel`. Icon URLs allow `https`/`http` only. Reject `javascript:` and `data:` URIs.
- **Verify token:** Platform-level env var `WHATSAPP_VERIFY_TOKEN` (not per-connection). Meta's webhook challenge carries no `phone_number_id`, so per-connection lookup is impossible. The Channels tab displays the webhook URL for Meta registration but does NOT manage verify tokens per-connection.
- **HMAC:** Per-connection `creds.appSecret` (already wired in `whatsapp.ts:61`). Do NOT add or use a `WHATSAPP_APP_SECRET` env fallback — the Channels tab requires `appSecret` and stores it encrypted per connection.
- **Encryption helpers** accept `object` not narrow types (feedback memory).
- **Upsert on globally-unique keys** must check project ownership before updating (feedback memory).
- **Test runner:** `node --experimental-strip-types --test` (NOT plain `node --test`).
- **Test pattern:** `node:test` + `node:assert/strict`, source inspection for modules with transitive deps.

---

### Task 1: `getChannelMeta` Helper

**Files:**
- Create: `apps/web/lib/channels.ts`
- Test: `tests/web/channel-meta.test.ts`

**Interfaces:**
- Consumes: nothing (standalone utility)
- Produces: `getChannelMeta(source: string): { label: string; icon: string; color: string }` — used by Tasks 3, 4, 5, 6, 7

The helper returns a static mapping. Icons are lucide-react icon *names* as strings (the consumer imports the actual component). This avoids coupling the helper to React.

- [ ] **Step 1: Write the test**

```typescript
// tests/web/channel-meta.test.ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { getChannelMeta } from "../../apps/web/lib/channels";

describe("getChannelMeta", () => {
  it("returns WhatsApp metadata", () => {
    const meta = getChannelMeta("whatsapp");
    assert.equal(meta.label, "WhatsApp");
    assert.equal(meta.icon, "MessageCircle");
    assert.equal(meta.color, "#25D366");
  });

  it("returns widget metadata for 'widget' source", () => {
    const meta = getChannelMeta("widget");
    assert.equal(meta.label, "Widget");
    assert.equal(meta.icon, "MessageSquare");
  });

  it("returns public page metadata", () => {
    const meta = getChannelMeta("public");
    assert.equal(meta.label, "Public Page");
    assert.equal(meta.icon, "Globe");
  });

  it("returns voice metadata", () => {
    const meta = getChannelMeta("voice");
    assert.equal(meta.label, "Voice");
    assert.equal(meta.icon, "Phone");
  });

  it("returns mobile metadata", () => {
    const meta = getChannelMeta("mobile");
    assert.equal(meta.label, "Mobile");
    assert.equal(meta.icon, "Smartphone");
  });

  it("returns fallback for unknown source", () => {
    const meta = getChannelMeta("something_new");
    assert.equal(meta.label, "Chat");
    assert.equal(meta.icon, "MessageSquare");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /media/ubuntu/external/cover/cover && node --experimental-strip-types --test tests/web/channel-meta.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement `getChannelMeta`**

```typescript
// apps/web/lib/channels.ts
export interface ChannelMeta {
  label: string;
  icon: string;
  color: string;
}

const CHANNEL_MAP: Record<string, ChannelMeta> = {
  whatsapp: { label: "WhatsApp", icon: "MessageCircle", color: "#25D366" },
  widget: { label: "Widget", icon: "MessageSquare", color: "var(--ink-500)" },
  public: { label: "Public Page", icon: "Globe", color: "var(--ink-500)" },
  voice: { label: "Voice", icon: "Phone", color: "var(--ink-500)" },
  mobile: { label: "Mobile", icon: "Smartphone", color: "var(--ink-500)" },
  playground: { label: "Playground", icon: "Play", color: "var(--ink-500)" },
  api: { label: "API", icon: "Code", color: "var(--ink-500)" },
  mcp: { label: "MCP", icon: "Terminal", color: "var(--ink-500)" },
};

const FALLBACK: ChannelMeta = { label: "Chat", icon: "MessageSquare", color: "var(--ink-500)" };

export function getChannelMeta(source: string): ChannelMeta {
  return CHANNEL_MAP[source] ?? FALLBACK;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /media/ubuntu/external/cover/cover && node --experimental-strip-types --test tests/web/channel-meta.test.ts`
Expected: All 6 tests PASS

- [ ] **Step 5: Review checkpoint**

```
Do not git add or commit. Leave changes unstaged for user review.
Checkpoint label: getChannelMeta helper for consistent channel cues
```

---

### Task 2: Channel API Endpoints

**Files:**
- Modify: `apps/api/src/types/channels.ts` (align `WhatsAppCredentials` with platform-level verify token)
- Modify: `apps/api/src/services/channels/connections.ts` (add `getProjectConnection` and `setProjectConnectionStatus`)
- Modify: `apps/api/src/routes/projects.ts` (add GET/POST/DELETE/test endpoints)
- Test: `tests/api/channel-api-endpoints.test.ts`

**Interfaces:**
- Consumes: `getAccessibleProject(id, userId, false)` from `projects.ts:773` (owner-only), `upsertConnection` from `connections.ts:74`, `encryptAuthConfig`/`decryptAuthConfig` from `encryption.ts`
- Produces: REST endpoints consumed by Task 7 (Channels tab):
  - `GET /api/projects/:id/channels` → `{ connections: [{ id, provider, externalId, displayName, status, lastError, createdAt, updatedAt }] }`
  - `POST /api/projects/:id/channels/whatsapp` → `{ connection: ChannelConnection }`
  - `POST /api/projects/:id/channels/whatsapp/test` → `{ ok: boolean; error?: string }`
  - `DELETE /api/projects/:id/channels/whatsapp/:connectionId` → `204`
  - `setProjectConnectionStatus(projectId, provider, connectionId, "disabled")` — scoped status update so one project owner cannot disable another project's connection by UUID

#### Step-by-step

- [ ] **Step 1: Write the test**

This test uses source inspection (like existing channel tests) to verify the route wiring, guard patterns, and credential secrecy.

```typescript
// tests/api/channel-api-endpoints.test.ts
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

const projectsPath = new URL(
  "../../apps/api/src/routes/projects.ts",
  import.meta.url
);
const connectionsPath = new URL(
  "../../apps/api/src/services/channels/connections.ts",
  import.meta.url
);
const channelTypesPath = new URL(
  "../../apps/api/src/types/channels.ts",
  import.meta.url
);

describe("channel API endpoints in projects.ts", () => {
  let src: string;

  it("loads source", async () => {
    src = await readFile(projectsPath, "utf-8");
    assert.ok(src.length > 0);
  });

  it("has GET /:id/channels endpoint", () => {
    assert.ok(src.includes('/:id/channels"'));
  });

  it("has POST /:id/channels/whatsapp endpoint", () => {
    assert.ok(src.includes('/:id/channels/whatsapp"'));
  });

  it("has DELETE /:id/channels/whatsapp/:connectionId endpoint", () => {
    assert.ok(src.includes("/:id/channels/whatsapp/:connectionId"));
  });

  it("has POST /:id/channels/whatsapp/test endpoint", () => {
    assert.ok(src.includes('/:id/channels/whatsapp/test"'));
  });

  it("disconnect uses disabled status, not disconnected", () => {
    assert.ok(!src.includes('"disconnected"'));
    assert.ok(!src.includes("'disconnected'"));
    assert.ok(src.includes('"disabled"') || src.includes("'disabled'"));
  });

  it("disconnect scopes status update to project and provider", () => {
    assert.ok(
      src.includes('setProjectConnectionStatus(id, "whatsapp", connectionId, "disabled")') ||
        src.includes("setProjectConnectionStatus(id, 'whatsapp', connectionId, 'disabled')"),
      "DELETE must scope connection update by projectId + provider + connectionId"
    );
    assert.ok(
      !src.includes("setConnectionStatus(connectionId"),
      "DELETE must not update arbitrary connectionId without project scope"
    );
  });

  it("uses owner-only access (allowMember=false) for all channel endpoints", () => {
    // Find all channel endpoint blocks
    const channelSection = src.slice(src.indexOf("/:id/channels"));
    const accessCalls = [...channelSection.matchAll(/getAccessibleProject\([^)]+\)/g)];
    for (const match of accessCalls) {
      assert.ok(
        match[0].includes("false"),
        `Channel endpoint must use owner-only access: ${match[0]}`
      );
    }
  });

  it("GET channels does NOT return credentials or encryptedCredentials", () => {
    const getBlock = src.slice(
      src.indexOf('get(\n    "/:id/channels"') !== -1
        ? src.indexOf('get(\n    "/:id/channels"')
        : src.indexOf('/:id/channels"')
    );
    const endpointBlock = getBlock.slice(0, getBlock.indexOf("router.") > 0 ? getBlock.indexOf("router.") : 2000);
    assert.ok(
      !endpointBlock.includes("encryptedCredentials") || endpointBlock.includes("encryptedCredentials: _") || endpointBlock.includes("encryptedCredentials, ..."),
      "GET channels must strip encryptedCredentials from response"
    );
  });
});

describe("getProjectConnection in connections.ts", () => {
  let src: string;

  it("loads source", async () => {
    src = await readFile(connectionsPath, "utf-8");
    assert.ok(src.length > 0);
  });

  it("exports getProjectConnection function", () => {
    assert.ok(
      src.includes("export async function getProjectConnection") ||
        src.includes("export function getProjectConnection"),
      "Must export getProjectConnection for GET channels endpoint"
    );
  });

  it("exports scoped setProjectConnectionStatus helper", () => {
    assert.ok(
      src.includes("export async function setProjectConnectionStatus") ||
        src.includes("export function setProjectConnectionStatus"),
      "Must export project-scoped status update helper for DELETE endpoint"
    );
    assert.ok(src.includes(".eq(\"project_id\", projectId)") || src.includes(".eq('project_id', projectId)"));
    assert.ok(src.includes(".eq(\"provider\", provider)") || src.includes(".eq('provider', provider)"));
  });
});

describe("WhatsAppCredentials type", () => {
  let src: string;

  it("loads source", async () => {
    src = await readFile(channelTypesPath, "utf-8");
    assert.ok(src.length > 0);
  });

  it("does not require per-connection verifyToken", () => {
    const match = src.match(/export interface WhatsAppCredentials \{([\s\S]*?)\}/);
    assert.ok(match, "expected WhatsAppCredentials interface");
    assert.ok(!match[1].includes("verifyToken"));
  });

  it("allows optional wabaId", () => {
    const match = src.match(/export interface WhatsAppCredentials \{([\s\S]*?)\}/);
    assert.ok(match, "expected WhatsAppCredentials interface");
    assert.match(match[1], /wabaId\?:\s*string/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /media/ubuntu/external/cover/cover && node --experimental-strip-types --test tests/api/channel-api-endpoints.test.ts`
Expected: FAIL — endpoints and function don't exist yet

- [ ] **Step 3: Align WhatsApp credential type and add scoped connection helpers**

First update `apps/api/src/types/channels.ts` so the credential type matches the platform-level verify-token decision. Replace the existing `WhatsAppCredentials` interface with:

```typescript
export interface WhatsAppCredentials {
  accessToken: string;
  appSecret: string;
  wabaId?: string;
}
```

Then add `getProjectConnection` to `apps/api/src/services/channels/connections.ts`.

Add this function after the existing `getActiveConnection` (after line 72):

```typescript
export async function getProjectConnection(
  projectId: string,
  provider: ChannelProvider
): Promise<ChannelConnection | null> {
  const { data, error } = await supabaseAdmin
    .from("channel_connections")
    .select("*")
    .eq("project_id", projectId)
    .eq("provider", provider)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  const full = toConnection(data as ConnectionRow);
  const { encryptedCredentials: _, ...safe } = full;
  return safe;
}
```

Add this scoped helper after the existing `setConnectionStatus` function. DELETE routes must use this helper instead of updating by bare `connectionId`.

```typescript
export async function setProjectConnectionStatus(
  projectId: string,
  provider: ChannelProvider,
  id: string,
  status: ChannelConnectionStatus,
  lastError?: string
): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from("channel_connections")
    .update({
      status,
      last_error: lastError ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("project_id", projectId)
    .eq("provider", provider)
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to update connection status: ${error.message}`);
  }

  return Boolean(data);
}
```

- [ ] **Step 4: Add channel endpoints to `projects.ts`**

Add these routes at the bottom of `projects.ts`, before the final `export`. Import the necessary functions at the top.

New imports to add:

```typescript
import {
  decryptCredentials,
  getActiveConnection,
  getProjectConnection,
  setProjectConnectionStatus,
  upsertConnection,
} from "../services/channels/connections";
import type { WhatsAppCredentials } from "../types/channels";
```

New endpoints:

```typescript
/**
 * GET /api/projects/:id/channels
 * List channel connections for this project (owner only). No credential material returned.
 */
router.get(
  "/:id/channels",
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const { userId } = req as AuthenticatedRequest;
      const { id } = req.params;

      const project = await getAccessibleProject(id, userId, false);
      if (!project) {
        return res.status(404).json({
          error: { code: "NOT_FOUND", message: "Project not found" },
        });
      }

      const whatsapp = await getProjectConnection(id, "whatsapp");
      const connections = whatsapp ? [whatsapp] : [];

      res.json({ connections });
    } catch (error) {
      console.error("Error in GET /projects/:id/channels:", error);
      res.status(500).json({
        error: { code: "INTERNAL_ERROR", message: "Internal server error" },
      });
    }
  }
);

/**
 * POST /api/projects/:id/channels/whatsapp
 * Create or update WhatsApp connection (owner only). Encrypts credentials immediately.
 */
router.post(
  "/:id/channels/whatsapp",
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const { userId } = req as AuthenticatedRequest;
      const { id } = req.params;

      const project = await getAccessibleProject(id, userId, false);
      if (!project) {
        return res.status(404).json({
          error: { code: "NOT_FOUND", message: "Project not found" },
        });
      }

      const { phoneNumberId, wabaId, accessToken, appSecret, displayName } =
        req.body ?? {};

      if (!phoneNumberId || !accessToken || !appSecret) {
        return res.status(400).json({
          error: {
            code: "MISSING_FIELDS",
            message:
              "phoneNumberId, accessToken, and appSecret are required",
          },
        });
      }

      const connection = await upsertConnection(id, "whatsapp", {
        externalId: phoneNumberId,
        displayName: displayName ?? null,
        credentials: {
          accessToken,
          appSecret,
          ...(wabaId ? { wabaId } : {}),
        },
        config: wabaId ? { wabaId } : {},
      });

      res.status(200).json({ connection });
    } catch (error) {
      console.error("Error in POST /projects/:id/channels/whatsapp:", error);
      res.status(500).json({
        error: { code: "INTERNAL_ERROR", message: "Internal server error" },
      });
    }
  }
);

/**
 * POST /api/projects/:id/channels/whatsapp/test
 * Test WhatsApp connection by calling the Graph API (owner only).
 */
router.post(
  "/:id/channels/whatsapp/test",
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const { userId } = req as AuthenticatedRequest;
      const { id } = req.params;

      const project = await getAccessibleProject(id, userId, false);
      if (!project) {
        return res.status(404).json({
          error: { code: "NOT_FOUND", message: "Project not found" },
        });
      }

      const conn = await getActiveConnection(id, "whatsapp");
      if (!conn) {
        return res.json({ ok: false, error: "No active WhatsApp connection" });
      }

      const creds = decryptCredentials<WhatsAppCredentials>(
        conn.encryptedCredentials
      );

      const graphVersion = process.env.GRAPH_API_VERSION || "v21.0";
      const url = `https://graph.facebook.com/${graphVersion}/${conn.externalId}`;

      const resp = await fetch(url, {
        headers: { Authorization: `Bearer ${creds.accessToken}` },
      });

      if (resp.ok) {
        return res.json({ ok: true });
      }
      const body = await resp.json().catch(() => ({}));
      const graphError = body as { error?: { message?: string } };
      return res.json({
        ok: false,
        error: graphError.error?.message || `HTTP ${resp.status}`,
      });
    } catch (error) {
      console.error("Error in POST /projects/:id/channels/whatsapp/test:", error);
      res.json({
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

/**
 * DELETE /api/projects/:id/channels/whatsapp/:connectionId
 * Disconnect a WhatsApp channel (owner only). Soft-delete via status='disabled'.
 */
router.delete(
  "/:id/channels/whatsapp/:connectionId",
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const { userId } = req as AuthenticatedRequest;
      const { id, connectionId } = req.params;

      const project = await getAccessibleProject(id, userId, false);
      if (!project) {
        return res.status(404).json({
          error: { code: "NOT_FOUND", message: "Project not found" },
        });
      }

      const disabled = await setProjectConnectionStatus(
        id,
        "whatsapp",
        connectionId,
        "disabled"
      );
      if (!disabled) {
        return res.status(404).json({
          error: { code: "NOT_FOUND", message: "Connection not found" },
        });
      }

      res.sendStatus(204);
    } catch (error) {
      console.error("Error in DELETE /projects/:id/channels/whatsapp:", error);
      res.status(500).json({
        error: { code: "INTERNAL_ERROR", message: "Internal server error" },
      });
    }
  }
);
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd /media/ubuntu/external/cover/cover && node --experimental-strip-types --test tests/api/channel-api-endpoints.test.ts`
Expected: All tests PASS

- [ ] **Step 6: Review checkpoint**

```
Do not git add or commit. Leave changes unstaged for user review.
Checkpoint label: project channel API endpoints (GET/POST/DELETE/test) with owner-only guard
```

---

### Task 3: Inbox List — Source Type, Badge, and Filter

**Files:**
- Modify: `apps/web/app/(dashboard)/inbox/page.tsx`

**Interfaces:**
- Consumes: `getChannelMeta` from `apps/web/lib/channels.ts` (Task 1)
- Produces: Source-filtered conversation list with channel badges visible in the inbox

No test file — this is a UI task. Verify manually in the browser.

- [ ] **Step 1: Add `source` to the `Conversation` interface**

In `apps/web/app/(dashboard)/inbox/page.tsx`, add `source` to the `Conversation` interface (after `isVoiceCall` at line 43). The API already returns this field.

```typescript
// In the Conversation interface (~line 30), add after isVoiceCall:
  source?: string;
```

- [ ] **Step 2: Import `getChannelMeta` and icon components**

Add at the top of the file. Extend the existing `lucide-react` and `react` imports rather than duplicating them:

```typescript
import { getChannelMeta } from "@/lib/channels";
import { Code, Globe, MessageCircle, MessageSquare, Phone, Play, Smartphone, Terminal } from "lucide-react";
import { type ComponentType, type CSSProperties, useState, useEffect, useCallback, useMemo } from "react";
```

Add a helper to resolve icon component from string name (place before `ConversationListItem`):

```typescript
const CHANNEL_ICONS: Record<string, ComponentType<{ className?: string; style?: CSSProperties }>> = {
  MessageCircle,
  MessageSquare,
  Globe,
  Phone,
  Smartphone,
  Play,
  Code,
  Terminal,
};

function ChannelIcon({ source, className }: { source: string; className?: string }) {
  const meta = getChannelMeta(source);
  const IconComponent = CHANNEL_ICONS[meta.icon] || MessageSquare;
  return <IconComponent className={className} style={{ color: meta.color }} />;
}
```

- [ ] **Step 3: Add channel badge to `ConversationListItem`**

Replace the voice-call icon block (`conversation.isVoiceCall && ...` at ~line 113) with a unified channel badge that handles both voice and WhatsApp:

```typescript
{/* Channel badge */}
{conversation.source && conversation.source !== "widget" && (
  <ChannelIcon source={conversation.source} className="h-3.5 w-3.5 shrink-0" />
)}
```

Keep the existing voice call logic — voice calls already have `isVoiceCall` flag. The channel badge complements it:

```typescript
{conversation.isVoiceCall && (
  <Phone className="h-3.5 w-3.5 text-blue-500 shrink-0" />
)}
{!conversation.isVoiceCall && conversation.source && conversation.source !== "widget" && (
  <ChannelIcon source={conversation.source} className="h-3.5 w-3.5 shrink-0" />
)}
```

- [ ] **Step 4: Add source filter state and dropdown**

Add state for source filter near the existing `filter` state:

```typescript
const [sourceFilter, setSourceFilter] = useState<string>("all");
```

Add source filter options (after the existing status filter tabs at ~line 540):

```typescript
{/* Source filter */}
<select
  value={sourceFilter}
  onChange={(e) => setSourceFilter(e.target.value)}
  className="ml-auto px-2 py-1.5 text-sm border rounded-md bg-background"
>
  <option value="all">All channels</option>
  <option value="widget">Widget</option>
  <option value="whatsapp">WhatsApp</option>
  <option value="public">Public Page</option>
  <option value="voice">Voice</option>
  <option value="mobile">Mobile</option>
</select>
```

- [ ] **Step 5: Apply source filter to `filteredConversations`**

Find the existing `filteredConversations` logic. It currently chains `.filter(...).sort(...)`; add a second filter between the status/assignment filter and the sort:

```typescript
const filteredConversations = conversations
  .filter((conv) => {
    switch (filter) {
      case "active":
        return conv.status === "agent_active";
      case "waiting":
        return conv.status === "waiting";
      case "mine":
        return conv.assignedAgent?.id === agent?.id;
      case "all":
      default:
        return true;
    }
  })
  .filter((conv) => sourceFilter === "all" || conv.source === sourceFilter)
  .sort((a, b) => {
    const dateA = new Date(a.lastMessageAt || a.updatedAt || a.createdAt).getTime() || 0;
    const dateB = new Date(b.lastMessageAt || b.updatedAt || b.createdAt).getTime() || 0;
    return dateB - dateA;
  });
```

- [ ] **Step 6: Test in browser**

1. Open the inbox at `http://localhost:3000/inbox`
2. Verify conversations show channel badges (WhatsApp icon for `source: "whatsapp"`)
3. Verify the source dropdown filters correctly
4. Verify "All channels" shows everything
5. Verify existing voice call icon still works

- [ ] **Step 7: Review checkpoint**

```
Do not git add or commit. Leave changes unstaged for user review.
Checkpoint label: channel badge and source filter in inbox list
```

---

### Task 4: Inbox Detail — Header Badge + 24h Window Composer Guard

**Files:**
- Modify: `apps/web/app/(dashboard)/inbox/[id]/page.tsx`

**Interfaces:**
- Consumes: `getChannelMeta` from `apps/web/lib/channels.ts` (Task 1), conversation `source` and `metadata.last_inbound_at` from API response
- Produces: Channel badge in header, disabled composer with explanatory message for closed WhatsApp windows

No test file — UI task. Verify manually.

- [ ] **Step 1: Add `source` and `metadata` to the detail `Conversation` interface**

In `apps/web/app/(dashboard)/inbox/[id]/page.tsx`, add to the `Conversation` interface (~line 42):

```typescript
  source?: string;
  metadata?: Record<string, unknown>;
```

- [ ] **Step 2: Import channel helpers and icons**

Add imports:

```typescript
import { getChannelMeta } from "@/lib/channels";
import { Code, Globe, MessageCircle, MessageSquare, Phone, Play, Smartphone, Terminal } from "lucide-react";
import { type ComponentType, type CSSProperties, useState, useEffect, useCallback, useRef, useMemo } from "react";
```

Add the same `CHANNEL_ICONS` and `ChannelIcon` helper as Task 3 (copy from inbox/page.tsx). It must use `ComponentType` + `CSSProperties` and include every icon referenced by `getChannelMeta`: `MessageCircle`, `MessageSquare`, `Globe`, `Phone`, `Smartphone`, `Play`, `Code`, and `Terminal`.

- [ ] **Step 3: Add channel badge to the header**

In the header section (~line 819), after the `displayName` heading, add:

```typescript
<h1 className="font-semibold flex items-center gap-2">
  {displayName}
  {conversation.source && conversation.source !== "widget" && (
    <span
      className="inline-flex items-center gap-1 text-xs font-normal px-1.5 py-0.5 rounded-full bg-muted"
      title={getChannelMeta(conversation.source).label}
    >
      <ChannelIcon source={conversation.source} className="h-3 w-3" />
      {getChannelMeta(conversation.source).label}
    </span>
  )}
</h1>
```

- [ ] **Step 4: Add 24h window check logic**

Add a helper function and computed state (before the `return` statement, near other computed values):

```typescript
const WINDOW_MS = 24 * 60 * 60 * 1000;

function isWhatsAppWindowOpen(metadata?: Record<string, unknown>): boolean {
  const raw = metadata?.last_inbound_at;
  if (typeof raw !== "string") return false;
  const lastInbound = new Date(raw);
  if (Number.isNaN(lastInbound.getTime())) return false;
  return Date.now() - lastInbound.getTime() < WINDOW_MS;
}

const isWhatsApp = conversation?.source === "whatsapp";
const windowOpen = isWhatsApp ? isWhatsAppWindowOpen(conversation?.metadata) : true;
```

- [ ] **Step 5: Update `canSendMessage` to include window check**

Replace the existing `canSendMessage` at line 789:

```typescript
const canSendMessage = conversation.status === "agent_active" && windowOpen;
```

- [ ] **Step 6: Add window-closed message to composer**

Update the composer disabled state (the `else` branch at ~line 976). Replace the existing disabled composer block:

```typescript
) : (
  <div className="p-4 border-t bg-muted/50 text-center">
    <p className="text-sm text-muted-foreground">
      {isWhatsApp && conversation.status === "agent_active" && !windowOpen
        ? "24h window closed — re-engagement templates coming soon."
        : conversation.status === "waiting"
        ? "This conversation is waiting for an agent"
        : conversation.status === "resolved"
        ? "This conversation is resolved"
        : "This conversation is closed"}
    </p>
  </div>
)}
```

- [ ] **Step 7: Handle window-closed server response from send**

In `handleSendMessage` catch block (~line 685), add specific handling for the server's window-closed message. `apiClient` currently throws `error.error.message`, not `error.error.code`, so do not check for the literal `WINDOW_CLOSED` code unless you also change `apiClient` to preserve structured errors.

```typescript
} catch (err) {
  console.error("Failed to send message:", err);
  setMessages((prev) => prev.filter((m) => m.id !== optimisticMessage.id));
  setNewMessage(messageContent);
  const errMsg = err instanceof Error ? err.message : String(err);
  const isWindowClosed =
    errMsg.includes("24-hour service window") ||
    errMsg.includes("24h window");
  setError(
    isWindowClosed
      ? "24h window closed — cannot send free-form messages."
      : "Failed to send message"
  );
}
```

- [ ] **Step 8: Test in browser**

1. Open a WhatsApp conversation in the inbox detail view
2. Verify the WhatsApp badge shows in the header
3. If the conversation's `last_inbound_at` is > 24h ago, verify:
   - Composer is disabled
   - Shows "24h window closed — re-engagement templates coming soon."
4. If within 24h, verify composer works normally
5. Verify non-WhatsApp conversations are unaffected

- [ ] **Step 9: Review checkpoint**

```
Do not git add or commit. Leave changes unstaged for user review.
Checkpoint label: inbox detail channel badge and 24h window composer guard
```

---

### Task 5: Analytics — WhatsApp Source Option

**Files:**
- Modify: `apps/web/app/(dashboard)/analytics/page.tsx`

**Interfaces:**
- Consumes: nothing new (API already filters by `source=whatsapp`)
- Produces: WhatsApp option in the analytics source filter dropdown

This is a small, focused change.

- [ ] **Step 1: Update `SourceFilter` type and `SOURCE_OPTIONS`**

In `apps/web/app/(dashboard)/analytics/page.tsx`, update the type at line 71 and array at lines 73-79:

Replace:

```typescript
type SourceFilter = "all" | "widget" | "public" | "mobile" | "playground";

const SOURCE_OPTIONS: { value: SourceFilter; label: string }[] = [
  { value: "all", label: "All sources" },
  { value: "widget", label: "Widget" },
  { value: "public", label: "Public page" },
  { value: "mobile", label: "Mobile" },
  { value: "playground", label: "Playground" },
];
```

With:

```typescript
type SourceFilter = "all" | "widget" | "public" | "mobile" | "playground" | "whatsapp";

const SOURCE_OPTIONS: { value: SourceFilter; label: string }[] = [
  { value: "all", label: "All sources" },
  { value: "widget", label: "Widget" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "public", label: "Public page" },
  { value: "mobile", label: "Mobile" },
  { value: "playground", label: "Playground" },
];
```

- [ ] **Step 2: Test in browser**

1. Open analytics at `http://localhost:3000/analytics`
2. Verify "WhatsApp" appears in the source filter dropdown
3. Select it — verify the API calls include `&source=whatsapp`
4. Verify metrics update correctly

- [ ] **Step 3: Review checkpoint**

```
Do not git add or commit. Leave changes unstaged for user review.
Checkpoint label: WhatsApp option in analytics source filter
```

---

### Task 6: Leads — Phone from `customers.phone`

**Files:**
- Modify: `apps/api/src/routes/lead-capture.ts` (add phone to leads response)
- Modify: `apps/web/app/(dashboard)/leads/constants.ts` (add `phone` to Lead type)
- Modify: `apps/web/app/(dashboard)/leads/components/lead-detail-panel.tsx` (prefer `customers.phone`)
- Test: `tests/api/leads-phone-field.test.ts`

**Interfaces:**
- Consumes: `customers.phone` column (written by WhatsApp inbound in `inbound.ts:88-98`)
- Produces: `phone` field in leads API response, displayed in lead detail panel

- [ ] **Step 1: Write the test**

```typescript
// tests/api/leads-phone-field.test.ts
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

const leadCapturePath = new URL(
  "../../apps/api/src/routes/lead-capture.ts",
  import.meta.url
);

describe("leads phone field", () => {
  let src: string;

  it("loads source", async () => {
    src = await readFile(leadCapturePath, "utf-8");
    assert.ok(src.length > 0);
  });

  it("queries customers.phone for leads", () => {
    assert.ok(
      src.includes("customers") && src.includes("phone"),
      "Must join or query customers.phone for lead responses"
    );
  });

  it("includes phone in the lead response mapping", () => {
    const mapSection = src.slice(src.indexOf("leads:"));
    assert.ok(
      mapSection.includes("phone"),
      "Lead response mapping must include phone field"
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /media/ubuntu/external/cover/cover && node --experimental-strip-types --test tests/api/leads-phone-field.test.ts`
Expected: FAIL — customers.phone not queried

- [ ] **Step 3: Add customer phone lookup to leads API**

In `apps/api/src/routes/lead-capture.ts`, after the `convByCustomer` batch lookup (~line 556), add a batch lookup for customer phones:

```typescript
// Batch-fetch customer phones
const phoneByCustomer: Record<string, string> = {};
const allCustomerIds = (leads || [])
  .map((l) => l.customer_id)
  .filter(Boolean);

if (allCustomerIds.length > 0) {
  const { data: customers } = await supabaseAdmin
    .from("customers")
    .select("id, phone")
    .in("id", allCustomerIds)
    .not("phone", "is", null);

  if (customers) {
    for (const c of customers) {
      if (c.phone) phoneByCustomer[c.id] = c.phone;
    }
  }
}
```

Then add `phone` to the lead response mapping (~line 559):

```typescript
phone: lead.customer_id ? (phoneByCustomer[lead.customer_id] ?? null) : null,
```

- [ ] **Step 4: Add `phone` to the Lead type**

In `apps/web/app/(dashboard)/leads/constants.ts`, add to the `Lead` interface:

```typescript
phone: string | null;
```

- [ ] **Step 5: Update lead detail panel to prefer `customers.phone`**

In `apps/web/app/(dashboard)/leads/components/lead-detail-panel.tsx`, update the phone display (~line 57-62):

Replace:

```typescript
<ContactRow
  icon={Phone}
  label="Phone"
  value={phoneField?.value || "Not provided"}
  muted={!phoneField?.value}
/>
```

With:

```typescript
<ContactRow
  icon={Phone}
  label="Phone"
  value={lead.phone || phoneField?.value || "Not provided"}
  muted={!lead.phone && !phoneField?.value}
/>
```

- [ ] **Step 6: Run test to verify it passes**

Run: `cd /media/ubuntu/external/cover/cover && node --experimental-strip-types --test tests/api/leads-phone-field.test.ts`
Expected: All tests PASS

- [ ] **Step 7: Review checkpoint**

```
Do not git add or commit. Leave changes unstaged for user review.
Checkpoint label: customers.phone in leads API and detail panel
```

---

### Task 7: Channels Settings Tab + Agent Studio Integration

**Files:**
- Create: `apps/web/app/(dashboard)/projects/[projectId]/components/channels-tab.tsx`
- Modify: `apps/web/app/(dashboard)/projects/[projectId]/page.tsx` (add Channels tab)
- Modify: `apps/api/.env.example` (add env documentation)

**Interfaces:**
- Consumes: Channel API endpoints from Task 2 (`GET/POST/DELETE /api/projects/:id/channels/whatsapp`), `getChannelMeta` from Task 1, `apiClient` from `@/lib/api-client`
- Produces: Complete channel management UI in Agent Studio

- [ ] **Step 1: Create `channels-tab.tsx`**

Create `apps/web/app/(dashboard)/projects/[projectId]/components/channels-tab.tsx` following the `public-page-tab.tsx` pattern:

```typescript
"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Label,
  Badge,
} from "@chatbot/ui";
import { Loader2, Copy, Check, AlertCircle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { apiClient } from "@/lib/api-client";

interface ChannelConnection {
  id: string;
  provider: string;
  externalId: string;
  displayName: string | null;
  status: string;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
}

interface WhatsAppFormState {
  phoneNumberId: string;
  wabaId: string;
  accessToken: string;
  appSecret: string;
  displayName: string;
}

const EMPTY_FORM: WhatsAppFormState = {
  phoneNumberId: "",
  wabaId: "",
  accessToken: "",
  appSecret: "",
  displayName: "",
};

export function ChannelsTab({ projectId }: { projectId: string }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [connection, setConnection] = useState<ChannelConnection | null>(null);
  const [form, setForm] = useState<WhatsAppFormState>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const apiBaseUrl =
    process.env.NEXT_PUBLIC_API_URL || "https://api.frontface.app";
  const webhookUrl =
    `${apiBaseUrl.replace(/\/$/, "")}/api/channels/whatsapp/webhook`;

  const fetchConnection = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiClient<{ connections: ChannelConnection[] }>(
        `/api/projects/${projectId}/channels`
      );
      const whatsapp = data.connections.find((c) => c.provider === "whatsapp");
      setConnection(whatsapp ?? null);
    } catch {
      setError("Failed to load channel connections");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchConnection();
  }, [fetchConnection]);

  const handleConnect = async () => {
    setError(null);
    setSuccess(null);

    if (!form.phoneNumberId || !form.accessToken || !form.appSecret) {
      setError("Phone Number ID, Access Token, and App Secret are required.");
      return;
    }

    setSaving(true);
    try {
      await apiClient(`/api/projects/${projectId}/channels/whatsapp`, {
        method: "POST",
        body: JSON.stringify({
          phoneNumberId: form.phoneNumberId,
          wabaId: form.wabaId || undefined,
          accessToken: form.accessToken,
          appSecret: form.appSecret,
          displayName: form.displayName || undefined,
        }),
      });
      setSuccess("WhatsApp connected successfully!");
      setForm(EMPTY_FORM);
      await fetchConnection();
    } catch {
      setError("Failed to connect WhatsApp. Check your credentials.");
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setError(null);
    setSuccess(null);
    setTesting(true);
    try {
      const result = await apiClient<{ ok: boolean; error?: string }>(
        `/api/projects/${projectId}/channels/whatsapp/test`,
        { method: "POST" }
      );
      if (result.ok) {
        setSuccess("Connection test passed!");
      } else {
        setError(`Connection test failed: ${result.error}`);
      }
    } catch {
      setError("Failed to test connection.");
    } finally {
      setTesting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!connection) return;
    setError(null);
    setSuccess(null);
    setSaving(true);
    try {
      await apiClient(
        `/api/projects/${projectId}/channels/whatsapp/${connection.id}`,
        { method: "DELETE" }
      );
      setConnection(null);
      setSuccess("WhatsApp disconnected.");
    } catch {
      setError("Failed to disconnect.");
    } finally {
      setSaving(false);
    }
  };

  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="flex items-center gap-2 p-3 text-sm text-red-600 bg-red-50 rounded-md border border-red-200">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="p-3 text-sm text-green-600 bg-green-50 rounded-md border border-green-200">
          {success}
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>WhatsApp</CardTitle>
              <CardDescription>
                Connect your WhatsApp Business number to receive and reply to messages.
              </CardDescription>
            </div>
            {connection && (
              <Badge
                variant={connection.status === "active" ? "default" : "secondary"}
              >
                {connection.status === "active" ? "Connected" : connection.status}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {connection && connection.status === "active" ? (
            <div className="space-y-4">
              <div className="grid gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Display Name</Label>
                  <p className="text-sm font-medium">
                    {connection.displayName || connection.externalId}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Phone Number ID</Label>
                  <p className="text-sm font-medium">{connection.externalId}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Credentials</Label>
                  <p className="text-sm text-muted-foreground">••••••••</p>
                </div>
              </div>

              {/* Webhook URL */}
              <div className="p-3 bg-muted/50 rounded-md space-y-1">
                <Label className="text-xs text-muted-foreground">
                  Webhook URL (register in Meta App Dashboard)
                </Label>
                <div className="flex items-center gap-2">
                  <code className="text-xs flex-1 break-all">{webhookUrl}</code>
                  <Button variant="ghost" size="sm" onClick={copyWebhookUrl}>
                    {copied ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>
              </div>

              {connection.lastError && (
                <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
                  Last error: {connection.lastError}
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleTest}
                  disabled={testing}
                >
                  {testing ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Test Connection
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDisconnect}
                  disabled={saving}
                >
                  Disconnect
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="displayName">Display Name (optional)</Label>
                  <Input
                    id="displayName"
                    placeholder="e.g. Support Line"
                    value={form.displayName}
                    onChange={(e) =>
                      setForm({ ...form, displayName: e.target.value })
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="phoneNumberId">Phone Number ID *</Label>
                  <Input
                    id="phoneNumberId"
                    placeholder="e.g. 109876543210987"
                    value={form.phoneNumberId}
                    onChange={(e) =>
                      setForm({ ...form, phoneNumberId: e.target.value })
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="wabaId">WABA ID (optional)</Label>
                  <Input
                    id="wabaId"
                    placeholder="e.g. 102938475610293"
                    value={form.wabaId}
                    onChange={(e) =>
                      setForm({ ...form, wabaId: e.target.value })
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="accessToken">Access Token *</Label>
                  <Input
                    id="accessToken"
                    type="password"
                    placeholder="Permanent access token from Meta"
                    value={form.accessToken}
                    onChange={(e) =>
                      setForm({ ...form, accessToken: e.target.value })
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="appSecret">App Secret *</Label>
                  <Input
                    id="appSecret"
                    type="password"
                    placeholder="From Meta App Dashboard → Settings → Basic"
                    value={form.appSecret}
                    onChange={(e) =>
                      setForm({ ...form, appSecret: e.target.value })
                    }
                  />
                </div>
              </div>

              <Button onClick={handleConnect} disabled={saving}>
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Connect WhatsApp
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Add Channels tab to Agent Studio page**

In `apps/web/app/(dashboard)/projects/[projectId]/page.tsx`:

Add import:

```typescript
import { ChannelsTab } from "./components/channels-tab";
import { Radio } from "lucide-react";
```

Add tab trigger after the Public Page trigger (~line 124):

```typescript
<TabsTrigger value="channels" className="gap-2">
  <Radio className="h-4 w-4" />
  <span className="hidden sm:inline">Channels</span>
</TabsTrigger>
```

Add tab content (after the Public Page TabsContent):

```typescript
<TabsContent value="channels" className="mt-6">
  <ChannelsTab projectId={project.id} />
</TabsContent>
```

- [ ] **Step 3: Update `.env.example` with WhatsApp env vars**

In `apps/api/.env.example`, add a WhatsApp section:

```env
# ── WhatsApp (Cloud API) ──────────────────────────────────────
# Verify token for Meta webhook challenge handshake (platform-level, one per deployment).
# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
WHATSAPP_VERIFY_TOKEN=
# HMAC app secrets are per-connection and stored encrypted in channel_connections.
# Do not add a WHATSAPP_APP_SECRET fallback in v1.
# Graph API version. Default: v21.0
GRAPH_API_VERSION=v21.0
```

- [ ] **Step 4: Test in browser**

1. Go to Agent Studio → Channels tab
2. Verify the empty state shows the connect form
3. Fill in credentials and click "Connect WhatsApp"
4. Verify the connected state shows:
   - Display name, Phone Number ID, masked credentials
   - Webhook URL with copy button
   - Test Connection and Disconnect buttons
5. Test the "Test Connection" button
6. Test "Disconnect" → verify it returns to the connect form
7. Verify non-owner user gets 403 (if testable)

- [ ] **Step 5: Review checkpoint**

```
Do not git add or commit. Leave changes unstaged for user review.
Checkpoint label: Channels settings tab with WhatsApp connect/disconnect/test
```

---

## Summary of Files Changed

### Created
| File | Task | Purpose |
|------|------|---------|
| `apps/web/lib/channels.ts` | 1 | `getChannelMeta` helper |
| `apps/web/app/(dashboard)/projects/[projectId]/components/channels-tab.tsx` | 7 | Channels settings tab |
| `tests/web/channel-meta.test.ts` | 1 | Test for getChannelMeta |
| `tests/api/channel-api-endpoints.test.ts` | 2 | Test for channel API routes |
| `tests/api/leads-phone-field.test.ts` | 6 | Test for leads phone field |

### Modified
| File | Task | Change |
|------|------|--------|
| `apps/api/src/types/channels.ts` | 2 | Align `WhatsAppCredentials` with platform-level verify token |
| `apps/api/src/services/channels/connections.ts` | 2 | Add `getProjectConnection` and `setProjectConnectionStatus` |
| `apps/api/src/routes/projects.ts` | 2 | Add GET/POST/DELETE/test channel endpoints |
| `apps/web/app/(dashboard)/inbox/page.tsx` | 3 | Source type, channel badge, source filter |
| `apps/web/app/(dashboard)/inbox/[id]/page.tsx` | 4 | Header badge, 24h window composer guard |
| `apps/web/app/(dashboard)/analytics/page.tsx` | 5 | WhatsApp in SOURCE_OPTIONS |
| `apps/api/src/routes/lead-capture.ts` | 6 | Add customers.phone to leads response |
| `apps/web/app/(dashboard)/leads/constants.ts` | 6 | Add phone to Lead type |
| `apps/web/app/(dashboard)/leads/components/lead-detail-panel.tsx` | 6 | Prefer customers.phone |
| `apps/web/app/(dashboard)/projects/[projectId]/page.tsx` | 7 | Add Channels tab trigger + content |
| `apps/api/.env.example` | 7 | WHATSAPP_VERIFY_TOKEN, GRAPH_API_VERSION |

## Final Verification

After all tasks are complete, run these commands before reporting success:

```bash
cd /media/ubuntu/external/cover/cover
node --experimental-strip-types --test tests/api/channel-api-endpoints.test.ts tests/web/channel-meta.test.ts tests/api/leads-phone-field.test.ts
pnpm --filter @chatbot/api type-check
pnpm --filter @chatbot/web type-check
pnpm --filter @chatbot/api exec eslint src/routes/projects.ts src/services/channels/connections.ts src/types/channels.ts
pnpm test
```

Expected:
- Targeted tests PASS.
- API and web type-checks exit 0.
- Targeted eslint exits 0.
- Full `pnpm test` exits 0.

## Spec Deviations

1. **Verify token is platform-level, not per-connection.** CHAN-006 FR-008 says auto-generate per-connection, but Meta's webhook challenge carries no `phone_number_id` — there's no way to look up a per-connection token at handshake time. The running code (`whatsapp.ts:25`) uses `process.env.WHATSAPP_VERIFY_TOKEN`. The Channels tab shows the webhook URL for Meta registration but does not manage verify tokens.

2. **"Message on WhatsApp" action deferred.** Spec FR-005 mentions it as a placeholder — this plan implements the phone display but not the action button (marked out-of-scope in the spec).

3. **Template picker deferred.** The 24h window guard shows an explanatory message ("re-engagement templates coming soon") rather than a template picker (marked fast-follow in the spec).
