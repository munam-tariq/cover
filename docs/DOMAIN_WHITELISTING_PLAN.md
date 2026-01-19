# Domain Whitelisting Implementation Plan

## Overview

Add domain whitelisting to SupportBase so widget owners can restrict which domains their chat widget can be used on. This prevents unauthorized sites from embedding the widget and using the project's AI credits.

**MCP-First Design**: Domain whitelisting must work seamlessly with the MCP workflow. Developers using Cursor/Claude Code should be able to whitelist domains without leaving their editor.

---

## MCP Integration (Critical)

### The Vibe Coding Flow

```
User in Cursor: "Add a chatbot to my website example.com"

Claude via MCP:
1. create_project(name: "Example Support", allowed_domains: ["example.com"])
2. upload_knowledge(content: "...")
3. get_embed_code()
→ Done! Widget only works on example.com
```

### MCP Tool Changes

#### 1. Update `create_project` tool
Add `allowed_domains` parameter:
```typescript
server.tool(
  "create_project",
  "Create a new chatbot project...",
  {
    name: z.string()...,
    system_prompt: z.string()...,
    allowed_domains: z  // NEW
      .array(z.string())
      .optional()
      .describe(
        "Domains where this chatbot can be embedded. " +
        "Example: ['example.com', '*.example.com']. " +
        "Leave empty to allow all domains (less secure)."
      ),
  },
  async ({ name, system_prompt, allowed_domains }) => {
    // Include allowed_domains in project creation
  }
);
```

#### 2. Add new `set_allowed_domains` tool
```typescript
server.tool(
  "set_allowed_domains",
  "Configure which domains can embed the chatbot widget. " +
  "This is a security feature to prevent unauthorized usage. " +
  "Use wildcards like *.example.com for subdomains.",
  {
    project_id: z.string().uuid().optional()...,
    domains: z
      .array(z.string())
      .describe(
        "List of allowed domains. Examples: " +
        "['mysite.com'] - only mysite.com and www.mysite.com, " +
        "['*.mysite.com'] - all subdomains, " +
        "[] - allow ALL domains (removes restriction)"
      ),
  },
  async ({ project_id, domains }) => {
    // Validate and save domains
    // Clear cache
    // Return success with current domain list
  }
);
```

#### 3. Update `get_embed_code` response
Include domain warning if no domains are whitelisted:
```typescript
// In get_embed_code response:
{
  embed_code: "...",
  instructions: "...",
  security_note: domains.length === 0
    ? "⚠️ No domain whitelist configured. Widget can be used on any site. Use set_allowed_domains to restrict."
    : `✓ Widget restricted to: ${domains.join(', ')}`,
}
```

#### 4. Update `get_project_info` response
Include allowed_domains in project info:
```typescript
{
  project_id: "...",
  name: "...",
  allowed_domains: ["example.com", "*.example.com"],
  domain_whitelist_enabled: true,
  // ...
}
```

### MCP Usage Examples

**Creating a project with domains:**
```
User: "Create a support chatbot for myapp.io"
Claude: Uses create_project with allowed_domains: ["myapp.io"]
```

**Adding domains later:**
```
User: "Also allow the chatbot on staging.myapp.io"
Claude: Uses set_allowed_domains with domains: ["myapp.io", "*.myapp.io"]
```

**Checking current domains:**
```
User: "What domains can use my chatbot?"
Claude: Uses get_project_info, reads allowed_domains field
```

**Removing restrictions:**
```
User: "Let anyone embed the chatbot"
Claude: Uses set_allowed_domains with domains: []
```

---

## Design Decisions

### 1. Storage Location
**Decision:** Store `allowed_domains` as a TEXT[] column in the `projects` table (not in settings JSONB)

**Reasoning:**
- Easier to query and validate in SQL
- Can add indexes for performance
- Cleaner separation from other settings

### 2. Default Behavior (CRITICAL - No Breaking Changes)
**Decision:** Domain whitelisting is **DISABLED by default**

**Reasoning:**
- Existing customers' widgets continue working immediately
- Opt-in security feature
- No migration headaches

**Implementation:**
- If `allowed_domains` is empty array `[]` or NULL → Allow ALL domains (current behavior)
- If `allowed_domains` has entries → ONLY allow those domains

### 3. Domain Matching Rules
```
Stored: "example.com"
Matches:
  ✅ example.com
  ✅ www.example.com (auto-include www)
  ✅ https://example.com/any/path
  ✅ http://example.com (both protocols)

Stored: "*.example.com" (wildcard)
Matches:
  ✅ sub.example.com
  ✅ deep.sub.example.com
  ✅ www.example.com

Stored: "app.example.com" (specific subdomain)
Matches:
  ✅ app.example.com
  ❌ other.example.com
  ❌ example.com
```

### 4. Special Domains (Always Allowed)
```
localhost
127.0.0.1
*.localhost
*.local
*.vercel.app (preview deployments)
*.netlify.app (preview deployments)
```

**Reasoning:** Development and preview URLs should always work

### 5. Validation Headers
**Check in order:**
1. `Origin` header (preferred - set by browser on CORS requests)
2. `Referer` header (fallback - contains full URL)

**If both missing:**
- For `/api/chat/message`: Block (requires browser context)
- For `/api/embed/config`: Allow (might be server-side fetch)

---

## Database Schema

### Migration File
**File:** `supabase/migrations/YYYYMMDDHHMMSS_add_domain_whitelist.sql`

```sql
-- Migration: Add domain whitelisting to projects
-- This is an opt-in security feature. Empty array = allow all domains.

-- 1. Add allowed_domains column
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS allowed_domains TEXT[] DEFAULT '{}';

-- 2. Add index for performance (GIN index for array containment queries)
CREATE INDEX IF NOT EXISTS idx_projects_allowed_domains
ON projects USING GIN (allowed_domains);

-- 3. Add helper function to check domain
CREATE OR REPLACE FUNCTION check_domain_allowed(
  project_allowed_domains TEXT[],
  request_domain TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  domain TEXT;
  pattern TEXT;
BEGIN
  -- If no domains configured, allow all (opt-in feature)
  IF project_allowed_domains IS NULL OR array_length(project_allowed_domains, 1) IS NULL THEN
    RETURN TRUE;
  END IF;

  -- Check each allowed domain
  FOREACH domain IN ARRAY project_allowed_domains LOOP
    -- Exact match
    IF request_domain = domain THEN
      RETURN TRUE;
    END IF;

    -- Auto-include www variant
    IF request_domain = 'www.' || domain THEN
      RETURN TRUE;
    END IF;

    -- Wildcard match (*.example.com)
    IF domain LIKE '*.%' THEN
      pattern := substring(domain from 3); -- Remove '*.'
      IF request_domain LIKE '%.' || pattern OR request_domain = pattern THEN
        RETURN TRUE;
      END IF;
    END IF;
  END LOOP;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 4. Add comments
COMMENT ON COLUMN projects.allowed_domains IS 'Domains allowed to embed the chat widget. Empty array = allow all (default).';
```

---

## API Changes

### New Middleware: `domain-whitelist.ts`

**File:** `apps/api/src/middleware/domain-whitelist.ts`

```typescript
/**
 * Domain Whitelist Middleware
 *
 * Validates that requests to widget APIs come from allowed domains.
 * This is an opt-in security feature - if no domains are configured,
 * all requests are allowed (preserving current behavior).
 */

import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../lib/supabase';

// Domains that are always allowed (development/preview)
const ALWAYS_ALLOWED_PATTERNS = [
  'localhost',
  '127.0.0.1',
  /\.localhost$/,
  /\.local$/,
  /\.vercel\.app$/,
  /\.netlify\.app$/,
  /\.pages\.dev$/,  // Cloudflare Pages
];

/**
 * Extract domain from Origin or Referer header
 */
function extractDomain(req: Request): string | null {
  // Try Origin header first (most reliable for CORS requests)
  const origin = req.headers.origin;
  if (origin) {
    try {
      const url = new URL(origin);
      return url.hostname.toLowerCase();
    } catch {
      // Invalid URL, try next
    }
  }

  // Fallback to Referer header
  const referer = req.headers.referer;
  if (referer) {
    try {
      const url = new URL(referer);
      return url.hostname.toLowerCase();
    } catch {
      // Invalid URL
    }
  }

  return null;
}

/**
 * Check if domain matches an allowed pattern
 */
function isDomainAllowed(
  domain: string,
  allowedDomains: string[]
): boolean {
  // Check always-allowed patterns (dev/preview)
  for (const pattern of ALWAYS_ALLOWED_PATTERNS) {
    if (typeof pattern === 'string') {
      if (domain === pattern) return true;
    } else if (pattern.test(domain)) {
      return true;
    }
  }

  // If no domains configured, allow all (opt-in feature)
  if (!allowedDomains || allowedDomains.length === 0) {
    return true;
  }

  // Check against configured domains
  for (const allowed of allowedDomains) {
    const normalizedAllowed = allowed.toLowerCase().trim();

    // Exact match
    if (domain === normalizedAllowed) {
      return true;
    }

    // Auto-include www variant
    if (domain === `www.${normalizedAllowed}`) {
      return true;
    }

    // Wildcard match (*.example.com)
    if (normalizedAllowed.startsWith('*.')) {
      const baseDomain = normalizedAllowed.slice(2); // Remove '*.'
      if (domain === baseDomain || domain.endsWith(`.${baseDomain}`)) {
        return true;
      }
    }
  }

  return false;
}

// Cache for project domains (5 minute TTL)
const domainCache = new Map<string, { domains: string[]; expires: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Get allowed domains for a project (with caching)
 */
async function getProjectAllowedDomains(projectId: string): Promise<string[]> {
  // Check cache
  const cached = domainCache.get(projectId);
  if (cached && cached.expires > Date.now()) {
    return cached.domains;
  }

  // Fetch from database
  const { data, error } = await supabaseAdmin
    .from('projects')
    .select('allowed_domains')
    .eq('id', projectId)
    .is('deleted_at', null)
    .single();

  if (error || !data) {
    // Project not found - will be handled by other middleware
    return [];
  }

  const domains = data.allowed_domains || [];

  // Update cache
  domainCache.set(projectId, {
    domains,
    expires: Date.now() + CACHE_TTL_MS,
  });

  return domains;
}

/**
 * Clear cache for a project (call when domains are updated)
 */
export function clearDomainCache(projectId: string): void {
  domainCache.delete(projectId);
}

/**
 * Middleware factory for domain whitelisting
 *
 * @param options.requireDomain - If true, block requests with no domain header
 * @param options.projectIdSource - Where to find projectId ('body', 'query', 'params')
 */
export function domainWhitelistMiddleware(options: {
  requireDomain?: boolean;
  projectIdSource?: 'body' | 'query' | 'params';
} = {}) {
  const { requireDomain = false, projectIdSource = 'body' } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    // Extract project ID based on source
    let projectId: string | undefined;

    switch (projectIdSource) {
      case 'body':
        projectId = req.body?.projectId;
        break;
      case 'query':
        projectId = req.query.projectId as string;
        break;
      case 'params':
        projectId = req.params.projectId;
        break;
    }

    if (!projectId) {
      // No project ID - let other middleware handle this error
      return next();
    }

    // Extract domain from request
    const domain = extractDomain(req);

    if (!domain) {
      if (requireDomain) {
        return res.status(403).json({
          error: {
            code: 'MISSING_ORIGIN',
            message: 'Request must include Origin or Referer header',
          },
        });
      }
      // Domain not required, allow request
      return next();
    }

    // Get allowed domains for project
    const allowedDomains = await getProjectAllowedDomains(projectId);

    // Check if domain is allowed
    if (!isDomainAllowed(domain, allowedDomains)) {
      console.warn(
        `[DomainWhitelist] Blocked request from unauthorized domain: ${domain} for project: ${projectId}`
      );

      return res.status(403).json({
        error: {
          code: 'DOMAIN_NOT_ALLOWED',
          message: `This widget is not authorized for use on ${domain}`,
        },
      });
    }

    // Domain is allowed, continue
    next();
  };
}

export { extractDomain, isDomainAllowed, getProjectAllowedDomains };
```

---

### Apply Middleware to Routes

**File:** `apps/api/src/routes/chat.ts`

Add at top of file:
```typescript
import { domainWhitelistMiddleware } from '../middleware/domain-whitelist';
```

Modify the POST /message route:
```typescript
// BEFORE:
router.post("/message", chatRateLimiter, async (req, res) => {

// AFTER:
router.post(
  "/message",
  domainWhitelistMiddleware({ requireDomain: true, projectIdSource: 'body' }),
  chatRateLimiter,
  async (req, res) => {
```

**File:** `apps/api/src/routes/embed.ts`

Add domain whitelist to config endpoint:
```typescript
// For /api/embed/config/:projectId
router.get(
  "/config/:projectId",
  domainWhitelistMiddleware({ requireDomain: false, projectIdSource: 'params' }),
  async (req, res) => {
```

**File:** `apps/api/src/routes/widget.ts` (if exists, for conversation endpoints)

Apply to all widget routes:
```typescript
router.use(domainWhitelistMiddleware({ requireDomain: true, projectIdSource: 'params' }));
```

---

### API Endpoint for Managing Domains

**File:** `apps/api/src/routes/projects.ts`

Add new endpoint:
```typescript
/**
 * GET /api/projects/:id/allowed-domains
 * Get allowed domains for a project
 */
router.get("/:id/allowed-domains", authMiddleware, async (req, res) => {
  try {
    const projectId = req.params.id;

    // Verify ownership
    const { data: project, error } = await supabaseAdmin
      .from("projects")
      .select("id, allowed_domains")
      .eq("id", projectId)
      .eq("user_id", req.userId)
      .is("deleted_at", null)
      .single();

    if (error || !project) {
      return res.status(404).json({ error: { message: "Project not found" } });
    }

    res.json({
      domains: project.allowed_domains || [],
      enabled: (project.allowed_domains || []).length > 0,
    });
  } catch (error) {
    console.error("Failed to get allowed domains:", error);
    res.status(500).json({ error: { message: "Internal server error" } });
  }
});

/**
 * PUT /api/projects/:id/allowed-domains
 * Update allowed domains for a project
 */
router.put("/:id/allowed-domains", authMiddleware, async (req, res) => {
  try {
    const projectId = req.params.id;
    const { domains } = req.body;

    // Validate input
    if (!Array.isArray(domains)) {
      return res.status(400).json({
        error: { message: "domains must be an array" }
      });
    }

    // Validate each domain
    const validatedDomains: string[] = [];
    for (const domain of domains) {
      if (typeof domain !== 'string') continue;

      const trimmed = domain.trim().toLowerCase();
      if (!trimmed) continue;

      // Basic domain validation (allows wildcards)
      const domainRegex = /^(\*\.)?[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/;
      if (!domainRegex.test(trimmed)) {
        return res.status(400).json({
          error: { message: `Invalid domain format: ${domain}` }
        });
      }

      validatedDomains.push(trimmed);
    }

    // Remove duplicates
    const uniqueDomains = [...new Set(validatedDomains)];

    // Update project
    const { data: project, error } = await supabaseAdmin
      .from("projects")
      .update({ allowed_domains: uniqueDomains })
      .eq("id", projectId)
      .eq("user_id", req.userId)
      .is("deleted_at", null)
      .select("id, allowed_domains")
      .single();

    if (error || !project) {
      return res.status(404).json({ error: { message: "Project not found" } });
    }

    // Clear cache
    const { clearDomainCache } = await import('../middleware/domain-whitelist');
    clearDomainCache(projectId);

    res.json({
      domains: project.allowed_domains || [],
      enabled: (project.allowed_domains || []).length > 0,
      message: uniqueDomains.length > 0
        ? `Domain whitelist updated with ${uniqueDomains.length} domain(s)`
        : 'Domain whitelist disabled (all domains allowed)',
    });
  } catch (error) {
    console.error("Failed to update allowed domains:", error);
    res.status(500).json({ error: { message: "Internal server error" } });
  }
});
```

---

## Frontend Changes

### Settings Page Update

**File:** `apps/web/app/(dashboard)/settings/page.tsx`

Add new state variables (near other state declarations ~line 50):
```typescript
// Domain Whitelist State
const [allowedDomains, setAllowedDomains] = useState<string[]>([]);
const [newDomain, setNewDomain] = useState("");
const [domainError, setDomainError] = useState<string | null>(null);
const [savingDomains, setSavingDomains] = useState(false);
```

Add fetch function (near other fetch functions ~line 100):
```typescript
// Fetch allowed domains
const fetchAllowedDomains = useCallback(async () => {
  if (!currentProject) return;
  try {
    const response = await apiClient(
      `/api/projects/${currentProject.id}/allowed-domains`
    );
    setAllowedDomains(response.domains || []);
  } catch (error) {
    console.error("Failed to fetch allowed domains:", error);
  }
}, [currentProject]);

// Call in useEffect
useEffect(() => {
  if (currentProject) {
    fetchAllowedDomains();
  }
}, [currentProject, fetchAllowedDomains]);
```

Add save function (near other save functions ~line 200):
```typescript
// Save allowed domains
const handleSaveDomains = async () => {
  if (!currentProject) return;

  setSavingDomains(true);
  setDomainError(null);

  try {
    await apiClient(`/api/projects/${currentProject.id}/allowed-domains`, {
      method: "PUT",
      body: JSON.stringify({ domains: allowedDomains }),
    });
    toast.success(
      allowedDomains.length > 0
        ? "Domain whitelist updated"
        : "Domain whitelist disabled"
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save";
    setDomainError(message);
    toast.error(message);
  } finally {
    setSavingDomains(false);
  }
};

// Add domain to list
const handleAddDomain = () => {
  const domain = newDomain.trim().toLowerCase();

  if (!domain) return;

  // Basic validation
  const domainRegex = /^(\*\.)?[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/;
  if (!domainRegex.test(domain)) {
    setDomainError("Invalid domain format. Example: example.com or *.example.com");
    return;
  }

  if (allowedDomains.includes(domain)) {
    setDomainError("Domain already added");
    return;
  }

  setAllowedDomains([...allowedDomains, domain]);
  setNewDomain("");
  setDomainError(null);
};

// Remove domain from list
const handleRemoveDomain = (domain: string) => {
  setAllowedDomains(allowedDomains.filter(d => d !== domain));
};
```

Add UI section (after Lead Capture section, before Delete Project ~line 760):
```tsx
{/* Domain Whitelist Section */}
<Card>
  <CardHeader>
    <CardTitle className="flex items-center gap-2">
      <Shield className="h-5 w-5" />
      Domain Whitelist
    </CardTitle>
    <CardDescription>
      Restrict which websites can embed your chat widget. Leave empty to allow all domains.
    </CardDescription>
  </CardHeader>
  <CardContent className="space-y-4">
    {/* Current Domains */}
    {allowedDomains.length > 0 && (
      <div className="space-y-2">
        <Label>Allowed Domains</Label>
        <div className="flex flex-wrap gap-2">
          {allowedDomains.map((domain) => (
            <Badge
              key={domain}
              variant="secondary"
              className="flex items-center gap-1 px-3 py-1"
            >
              {domain}
              <button
                onClick={() => handleRemoveDomain(domain)}
                className="ml-1 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      </div>
    )}

    {/* Add Domain Input */}
    <div className="space-y-2">
      <Label htmlFor="new-domain">Add Domain</Label>
      <div className="flex gap-2">
        <Input
          id="new-domain"
          value={newDomain}
          onChange={(e) => {
            setNewDomain(e.target.value);
            setDomainError(null);
          }}
          onKeyDown={(e) => e.key === "Enter" && handleAddDomain()}
          placeholder="example.com or *.example.com"
          className="flex-1"
        />
        <Button
          variant="outline"
          onClick={handleAddDomain}
          disabled={!newDomain.trim()}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      {domainError && (
        <p className="text-sm text-destructive">{domainError}</p>
      )}
      <p className="text-xs text-muted-foreground">
        Use *.example.com to allow all subdomains. localhost and preview URLs are always allowed.
      </p>
    </div>

    {/* Status Indicator */}
    <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
      {allowedDomains.length > 0 ? (
        <>
          <ShieldCheck className="h-4 w-4 text-green-500" />
          <span className="text-sm">
            Widget restricted to {allowedDomains.length} domain{allowedDomains.length !== 1 ? 's' : ''}
          </span>
        </>
      ) : (
        <>
          <ShieldAlert className="h-4 w-4 text-yellow-500" />
          <span className="text-sm">
            Widget can be embedded on any domain
          </span>
        </>
      )}
    </div>
  </CardContent>
  <CardFooter>
    <Button
      onClick={handleSaveDomains}
      disabled={savingDomains}
    >
      {savingDomains ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Saving...
        </>
      ) : (
        "Save Domain Settings"
      )}
    </Button>
  </CardFooter>
</Card>
```

Add imports at top of file:
```typescript
import { Shield, ShieldCheck, ShieldAlert, Plus, X } from "lucide-react";
import { Badge } from "@chatbot/ui";
```

---

## Widget Changes (Error Handling)

**File:** `apps/widget/src/utils/api.ts`

Add handling for domain blocked error:
```typescript
// In sendMessage function, add after rate limit handling:

// Handle domain not allowed
if (response.status === 403) {
  const errorData = await response.json().catch(() => ({}));
  const error = errorData.error;

  if (error?.code === 'DOMAIN_NOT_ALLOWED') {
    throw new ChatApiError(
      'DOMAIN_NOT_ALLOWED',
      'This chat widget is not authorized for this website.'
    );
  }

  throw new ChatApiError(
    error?.code || 'FORBIDDEN',
    error?.message || 'Access denied'
  );
}
```

**File:** `apps/widget/src/components/chat-window.ts`

Handle the error gracefully in the UI:
```typescript
// In handleSendMessage or similar, add error handling:

if (error instanceof ChatApiError && error.code === 'DOMAIN_NOT_ALLOWED') {
  // Show a user-friendly message
  this.addSystemMessage(
    'This chat widget is not configured for this website. Please contact the site owner.'
  );
  // Optionally hide the input
  this.disableInput();
  return;
}
```

---

## Testing Checklist

### Unit Tests
- [ ] `isDomainAllowed` function with various inputs
- [ ] Wildcard matching (*.example.com)
- [ ] www auto-inclusion
- [ ] Always-allowed patterns (localhost, vercel.app, etc.)
- [ ] Cache behavior

### Integration Tests
- [ ] Request with valid Origin header and matching domain → 200
- [ ] Request with valid Origin header and non-matching domain → 403
- [ ] Request with no Origin/Referer and requireDomain=true → 403
- [ ] Request with no Origin/Referer and requireDomain=false → 200
- [ ] Empty allowed_domains array → allow all
- [ ] NULL allowed_domains → allow all

### E2E Tests
- [ ] Add domain via UI → domain saved
- [ ] Remove domain via UI → domain removed
- [ ] Widget on allowed domain → works
- [ ] Widget on blocked domain → shows error message
- [ ] Widget on localhost → always works
- [ ] Widget on vercel.app preview → always works

---

## Rollout Plan

### Phase 1: Deploy Backend (No Breaking Changes)
1. Apply database migration
2. Deploy API with new middleware (disabled by default)
3. Deploy new API endpoints for managing domains
4. Monitor for errors

### Phase 2: Deploy Frontend
1. Deploy settings UI with domain management
2. Announce feature to users
3. Document in help center

### Phase 3: Monitor & Iterate
1. Watch for blocked requests in logs
2. Gather user feedback
3. Add more always-allowed patterns if needed (e.g., other preview URL providers)

---

## Files Summary

| File | Action | Description |
|------|--------|-------------|
| `supabase/migrations/YYYYMMDD_add_domain_whitelist.sql` | CREATE | Add allowed_domains column |
| `apps/api/src/middleware/domain-whitelist.ts` | CREATE | Domain validation middleware |
| `apps/api/src/routes/chat.ts` | MODIFY | Apply middleware to /message |
| `apps/api/src/routes/embed.ts` | MODIFY | Apply middleware to /config |
| `apps/api/src/routes/projects.ts` | MODIFY | Add domain management endpoints |
| `apps/web/app/(dashboard)/settings/page.tsx` | MODIFY | Add domain management UI |
| `apps/widget/src/utils/api.ts` | MODIFY | Handle 403 domain error |
| `apps/widget/src/components/chat-window.ts` | MODIFY | Show user-friendly error |

---

## Security Considerations

1. **Cache invalidation**: Clear domain cache when domains are updated
2. **Case sensitivity**: All domain comparisons should be case-insensitive
3. **Header spoofing**: Origin header can't be spoofed by browsers, but can be by non-browser clients. This is acceptable - we're protecting against accidental misuse, not determined attackers.
4. **Timing attacks**: Use constant-time comparison if this becomes a concern (unlikely for domain matching)

---

## Future Enhancements

1. **Wildcard validation**: Warn users if wildcard is too broad (e.g., *.com)
2. **Domain verification**: Optional DNS TXT record verification for high-security customers
3. **Analytics**: Show which domains are using the widget
4. **Alerts**: Notify when requests from unauthorized domains are blocked
