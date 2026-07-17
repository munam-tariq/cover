# Inbox List-Scoped Loading Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep the inbox shell stable while tabs, filters, pagination, refreshes, and realtime updates refetch only the conversation results.

**Architecture:** Track the project whose inbox request most recently settled and derive the initial full-page loading state from that project identity. Use a separate `listLoading` state for subsequent requests, and render a reusable conversation-row skeleton only below the persistent filter controls. A monotonically increasing request ID prevents an older filter or project request from overwriting the newest result or clearing its loading state.

**Tech Stack:** Next.js App Router, React state/hooks, TypeScript, Tailwind CSS, `@chatbot/ui` Skeleton, Node test runner.

## Global Constraints

- Keep the full-page skeleton for the first request of each selected project.
- Never show previous-query rows beneath newly selected filters.
- Reuse the existing conversation-fetching path; do not duplicate API or error handling.
- Do not change filtering semantics, API contracts, dependencies, or inbox copy.
- Follow DRY, KISS, and SOLID principles.
- Do not stage, commit, or push any files; the user will review and commit manually.

## File map

- Modify `tests/web/inbox-status-scope.test.ts`: add the loading-scope regression contract.
- Modify `apps/web/app/[locale]/(dashboard)/inbox/page.tsx`: split initial and list loading, guard concurrent requests, and render the localized list skeleton.

---

### Task 1: Add the list-loading regression test

**Files:**

- Test: `tests/web/inbox-status-scope.test.ts`

**Interfaces:**

- Consumes: the inbox page source at `apps/web/app/[locale]/(dashboard)/inbox/page.tsx`.
- Produces: a source-level regression test requiring `listLoading`, project-aware initial loading, and a list-only skeleton branch placed after the filters.

- [ ] **Step 1: Append the failing regression test**

```ts
test("subsequent inbox fetches load only the conversation results", async () => {
  const page = stripComments(
    await read("../../apps/web/app/[locale]/(dashboard)/inbox/page.tsx")
  );

  assert.match(
    page,
    /const \[listLoading, setListLoading\] = useState\(false\)/,
    "subsequent requests need loading state independent from the page shell"
  );
  assert.match(
    page,
    /const isInitialLoading =\s*projectLoading \|\|[\s\S]*loadedProjectIdRef\.current !== currentProject\.id/,
    "initial loading must be derived from the selected project"
  );

  const fullPageLoading = page.slice(
    page.indexOf("if (isInitialLoading)"),
    page.indexOf("if (!currentProject)")
  );
  assert.ok(
    fullPageLoading.length > 0,
    "the initial page skeleton must remain"
  );
  assert.doesNotMatch(
    fullPageLoading,
    /listLoading/,
    "list refetches must not activate the full-page skeleton"
  );

  const filtersIndex = page.indexOf("getStatusFilterOptions(isOwner).map");
  const listSkeletonIndex = page.indexOf("{listLoading ? (");
  assert.ok(filtersIndex >= 0, "status filters must remain rendered");
  assert.ok(
    listSkeletonIndex > filtersIndex,
    "the loading branch must sit inside the results area, after the filters"
  );
  assert.match(
    page,
    /<ConversationListSkeleton label=\{statesT\("loading"\)\} \/>/
  );
});
```

- [ ] **Step 2: Run the focused test and confirm the red state**

Run:

```bash
node --experimental-strip-types --test tests/web/inbox-status-scope.test.ts
```

Expected: the new test fails because `listLoading`, `isInitialLoading`, and `ConversationListSkeleton` do not exist yet; the pre-existing inbox tests remain green.

---

### Task 2: Scope subsequent loading to the conversation results

**Files:**

- Modify: `apps/web/app/[locale]/(dashboard)/inbox/page.tsx:22-29`
- Modify: `apps/web/app/[locale]/(dashboard)/inbox/page.tsx:260-356`
- Modify: `apps/web/app/[locale]/(dashboard)/inbox/page.tsx:502-526`
- Modify: `apps/web/app/[locale]/(dashboard)/inbox/page.tsx:735-803`

**Interfaces:**

- Consumes: `currentProject.id`, `conversationsUrl`, `apiClient`, the existing inbox state setters, and the shared `dashboard.states.loading` translation.
- Produces: `ConversationListSkeleton({ label }: { label: string })`, `loadedProjectIdRef`, `latestRequestIdRef`, `listLoading`, and derived `isInitialLoading`.

- [ ] **Step 1: Import `useRef` and add the reusable row skeleton**

Add `useRef` to the existing React import, then place this component above the main component section:

```tsx
function ConversationListSkeleton({ label }: { label: string }) {
  return (
    <div
      className="space-y-3"
      role="status"
      aria-label={label}
      aria-busy="true"
    >
      {Array.from({ length: 5 }, (_, index) => (
        <div
          key={index}
          className="flex items-start justify-between gap-3 rounded-lg border p-4"
          aria-hidden="true"
        >
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-40 max-w-full" />
              <Skeleton className="h-3 w-64 max-w-full" />
            </div>
          </div>
          <div className="shrink-0 space-y-2">
            <Skeleton className="ms-auto h-3 w-12" />
            <Skeleton className="h-5 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Replace the overloaded loading state with project and request tracking**

Add the shared states translator beside the current translators:

```tsx
const statesT = useTranslations("dashboard.states");
```

Replace `loading` with these focused values beside the existing conversation state:

```tsx
const loadedProjectIdRef = useRef<string | null>(null);
const latestRequestIdRef = useRef(0);
const [listLoading, setListLoading] = useState(false);
```

- [ ] **Step 3: Make the existing fetch path choose initial or list loading and ignore stale requests**

Replace `fetchConversations` with:

```tsx
const fetchConversations = useCallback(async () => {
  if (!currentProject || !conversationsUrl) return;

  const projectId = currentProject.id;
  const requestId = ++latestRequestIdRef.current;
  const isInitialLoad = loadedProjectIdRef.current !== projectId;

  if (!isInitialLoad) setListLoading(true);
  setError(null);

  try {
    const [response, queueResponse] = await Promise.all([
      apiClient<InboxResponse>(conversationsUrl),
      apiClient<{ queue: QueueItem[]; count: number }>(
        `/api/projects/${projectId}/queue`
      ),
    ]);

    if (requestId !== latestRequestIdRef.current) return;

    setConversations(response.conversations || []);
    setIsOwner(response.isOwner || false);
    setPagination(response.pagination);
    setStats(response.stats);
    setQueue(queueResponse.queue || []);
  } catch (err) {
    if (requestId !== latestRequestIdRef.current) return;

    console.error("Failed to fetch conversations:", err);
    setError(t("loadError"));
  } finally {
    if (requestId === latestRequestIdRef.current) {
      loadedProjectIdRef.current = projectId;
      setListLoading(false);
    }
  }
}, [currentProject, t, conversationsUrl]);
```

This preserves one fetch/error path, fetches the independent conversation and queue requests concurrently, and prevents a slower obsolete request from overwriting a later filter or project selection.

- [ ] **Step 4: Limit the full-page early return to an unseen project**

Replace the current `if (projectLoading || loading)` condition with:

```tsx
const isInitialLoading =
  projectLoading ||
  (currentProject !== null &&
    loadedProjectIdRef.current !== currentProject.id);

if (isInitialLoading) {
```

The project-ID comparison is synchronous during render, so changing projects cannot flash the previous project's conversations before the new request effect starts.

- [ ] **Step 5: Branch only the result and pagination markup on `listLoading`**

Keep the filter controls unchanged. Replace the existing conversation-list and pagination markup below them with:

```tsx
{
  listLoading ? (
    <ConversationListSkeleton label={statesT("loading")} />
  ) : (
    <>
      {filteredConversations.length === 0 ? (
        <div className="py-8 text-center">
          <Inbox className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
          {scopeExcludesSelectedStatus ? (
            <>
              <p className="text-muted-foreground">
                {t("empty.unassignedScopeTitle")}
              </p>
              <p className="text-muted-foreground mt-1 text-sm">
                {t("empty.unassignedScopeHint")}
              </p>
            </>
          ) : (
            <p className="text-muted-foreground">{t("empty.title")}</p>
          )}
          {filter !== "all" && (
            <Button
              variant="link"
              onClick={() => {
                setFilter("all");
                setPage(1);
              }}
              className="mt-2"
            >
              {t("empty.showAll")}
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredConversations.map((conversation) => (
            <ConversationListItem
              key={conversation.id}
              conversation={conversation}
            />
          ))}
        </div>
      )}

      {pagination.totalPages > 1 && (
        <div className="mt-5 flex items-center justify-between gap-3 border-t pt-4">
          <p className="text-muted-foreground text-sm">
            {t("pagination.summary", {
              page: pagination.page,
              totalPages: pagination.totalPages,
              total: pagination.total,
            })}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((current) => current - 1)}
            >
              {t("pagination.previous")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((current) => current + 1)}
            >
              {t("pagination.next")}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 6: Run the focused test and confirm the green state**

Run:

```bash
node --experimental-strip-types --test tests/web/inbox-status-scope.test.ts
```

Expected: all tests in `inbox-status-scope.test.ts` pass.

---

### Task 3: Verify behavior and regressions

**Files:**

- Verify: `tests/web/inbox-status-scope.test.ts`
- Verify: `apps/web/app/[locale]/(dashboard)/inbox/page.tsx`

**Interfaces:**

- Consumes: the completed inbox loading implementation.
- Produces: fresh automated and browser evidence for the behavior requested in the design spec.

- [ ] **Step 1: Run the complete automated test suite**

Run:

```bash
pnpm test
```

Expected: all repository tests pass with zero failures.

- [ ] **Step 2: Run the web TypeScript check**

Run:

```bash
pnpm --filter @chatbot/web type-check
```

Expected: `tsc --noEmit` exits successfully with no TypeScript errors.

- [ ] **Step 3: Run lint on the changed TypeScript files**

Run:

```bash
pnpm exec eslint 'apps/web/app/[locale]/(dashboard)/inbox/page.tsx' tests/web/inbox-status-scope.test.ts
```

Expected: ESLint exits successfully with no errors or warnings from either changed file.

- [ ] **Step 4: Check formatting and whitespace**

Run:

```bash
pnpm exec prettier --check 'apps/web/app/[locale]/(dashboard)/inbox/page.tsx' tests/web/inbox-status-scope.test.ts docs/superpowers/specs/2026-07-16-inbox-list-loading-design.md docs/superpowers/plans/2026-07-16-inbox-list-loading.md
git diff --check
```

Expected: Prettier reports all four files formatted, and `git diff --check` reports no whitespace errors.

- [ ] **Step 5: Browser-smoke the loading boundary**

Using the authenticated local inbox at `http://localhost:3000/en/inbox`:

1. Wait for the initial inbox request to settle.
2. Click **My Chats / All**, change **Status**, change **All channels**, and use pagination when available.
3. During each request, confirm the page title, summary cards, queue, tabs, and dropdowns remain visible and stable.
4. Confirm only five compact skeleton rows appear below the filter divider and pagination is hidden while loading.
5. Confirm the new conversations or empty state replaces the skeleton after the request settles.
6. Trigger **Refresh** and confirm it uses the same list-only loading behavior.

Expected: no interaction after the initial load causes the full-page skeleton to reappear.

- [ ] **Step 6: Hand off the uncommitted diff**

Run:

```bash
git status --short
git diff --stat
```

Expected: the implementation, test, spec, and plan remain unstaged and uncommitted for user review; unrelated existing worktree changes are preserved.
