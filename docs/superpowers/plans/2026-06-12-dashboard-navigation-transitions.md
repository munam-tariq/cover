# Dashboard Navigation Transitions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every dashboard sidebar navigation respond immediately with optimistic selection, a route-level skeleton, and restrained content fades.

**Architecture:** Keep pending navigation state local to the existing sidebar and extract only pure pathname selection helpers for focused unit coverage. Use the Next.js App Router `loading.tsx` convention for the route fallback, plus a small client wrapper keyed by `usePathname()` to restart the loaded-content fade without remounting dashboard providers or chrome.

**Tech Stack:** Next.js 15 App Router, React 18, TypeScript, Tailwind CSS 3, `tailwindcss-animate`, Node 22 built-in test runner.

---

## File Structure

- Create `apps/web/components/layout/sidebar-navigation.ts`: pure pathname matching and optimistic selection helpers.
- Create `tests/web/sidebar-navigation.test.ts`: Node built-in unit tests for exact, nested, and pending route selection, kept outside the web tsconfig because Node requires explicit TypeScript import extensions.
- Modify `apps/web/components/layout/sidebar.tsx`: apply optimistic pending state through `Link.onNavigate`.
- Create `apps/web/components/layout/dashboard-loading-skeleton.tsx`: reusable route transition skeleton.
- Create `apps/web/app/(dashboard)/loading.tsx`: Next.js route-group loading boundary.
- Create `apps/web/components/layout/dashboard-content-transition.tsx`: keyed content fade wrapper.
- Modify `apps/web/app/(dashboard)/layout.tsx`: wrap guarded route content without remounting shared providers.
- Modify `apps/web/package.json`: expose the focused Node test command.

### Task 1: Sidebar Navigation State

**Files:**
- Create: `tests/web/sidebar-navigation.test.ts`
- Create: `apps/web/components/layout/sidebar-navigation.ts`
- Modify: `apps/web/components/layout/sidebar.tsx`
- Modify: `apps/web/package.json`

- [x] **Step 1: Write the failing pure-state tests**

```ts
import assert from "node:assert/strict";
import test from "node:test";

import {
  getSelectedPathname,
  isSidebarItemActive,
} from "../../apps/web/components/layout/sidebar-navigation.ts";

test("uses the pending destination before the committed pathname", () => {
  assert.equal(getSelectedPathname("/dashboard", "/analytics"), "/analytics");
});

test("uses the committed pathname when no destination is pending", () => {
  assert.equal(getSelectedPathname("/dashboard", null), "/dashboard");
});

test("matches exact and nested sidebar routes without matching siblings", () => {
  assert.equal(isSidebarItemActive("/settings", "/settings"), true);
  assert.equal(isSidebarItemActive("/settings/handoff", "/settings"), true);
  assert.equal(isSidebarItemActive("/settings-old", "/settings"), false);
});
```

- [x] **Step 2: Run the focused test and verify the missing module failure**

Run:

```bash
node --experimental-strip-types --test tests/web/sidebar-navigation.test.ts
```

Expected: FAIL because `sidebar-navigation.ts` does not exist.

- [x] **Step 3: Implement the minimal pure helpers**

```ts
export function getSelectedPathname(
  pathname: string,
  pendingHref: string | null
) {
  return pendingHref ?? pathname;
}

export function isSidebarItemActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}
```

- [x] **Step 4: Run the focused test and verify it passes**

Run:

```bash
node --experimental-strip-types --test tests/web/sidebar-navigation.test.ts
```

Expected: 3 passing tests and exit code 0.

- [x] **Step 5: Wire optimistic selection into the sidebar**

Update `Sidebar` to:

```tsx
const [pendingHref, setPendingHref] = useState<string | null>(null);
const selectedPathname = getSelectedPathname(pathname, pendingHref);

useEffect(() => {
  setPendingHref(null);
}, [pathname]);
```

For each navigation link:

```tsx
const isActive = isSidebarItemActive(selectedPathname, item.href);
const isCurrentPage = isSidebarItemActive(pathname, item.href);

<Link
  href={item.href}
  aria-current={isCurrentPage ? "page" : undefined}
  onNavigate={() => {
    if (!isCurrentPage) setPendingHref(item.href);
  }}
  className="... transition-colors duration-200 motion-reduce:transition-none ..."
>
```

- [x] **Step 6: Add the focused test script**

Add to `apps/web/package.json`:

```json
"test:navigation": "node --experimental-strip-types --test ../../tests/web/sidebar-navigation.test.ts"
```

### Task 2: Route Loading Skeleton

**Files:**
- Create: `apps/web/components/layout/dashboard-loading-skeleton.tsx`
- Create: `apps/web/app/(dashboard)/loading.tsx`

- [x] **Step 1: Build the reusable skeleton**

Create a decorative `DashboardLoadingSkeleton` using the existing
`@chatbot/ui` `Skeleton` component. It must include title, subtitle, action,
three summary cards, and one large content block:

```tsx
import { Skeleton } from "@chatbot/ui";

export function DashboardLoadingSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="space-y-6 animate-in fade-in-0 duration-200 motion-reduce:animate-none"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-64 max-w-[70vw]" />
        </div>
        <Skeleton className="h-10 w-28 sm:w-32" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-28 w-full" />
        ))}
      </div>

      <Skeleton className="h-[min(26rem,50vh)] w-full" />
    </div>
  );
}
```

- [x] **Step 2: Add the route-group loading boundary**

```tsx
import { DashboardLoadingSkeleton } from "@/components/layout/dashboard-loading-skeleton";

export default function DashboardLoading() {
  return <DashboardLoadingSkeleton />;
}
```

### Task 3: Loaded Content Fade

**Files:**
- Create: `apps/web/components/layout/dashboard-content-transition.tsx`
- Modify: `apps/web/app/(dashboard)/layout.tsx`

- [x] **Step 1: Create the focused client wrapper**

```tsx
"use client";

import { usePathname } from "next/navigation";

export function DashboardContentTransition({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div
      key={pathname}
      className="animate-in fade-in-0 duration-200 motion-reduce:animate-none"
    >
      {children}
    </div>
  );
}
```

- [x] **Step 2: Wrap only guarded page content**

In the dashboard layout:

```tsx
<ProjectGuard>
  <DashboardContentTransition>{children}</DashboardContentTransition>
</ProjectGuard>
```

The sidebar, header, providers, and `ProjectGuard` remain outside the keyed
container.

### Task 4: Verification

**Files:**
- Verify all files above.

- [x] **Step 1: Run focused navigation tests**

Run:

```bash
pnpm --filter @chatbot/web test:navigation
```

Expected: all tests pass.

- [x] **Step 2: Run web type checking**

Run:

```bash
pnpm --filter @chatbot/web type-check
```

Expected: exit code 0.

- [x] **Step 3: Run the production web build**

Run:

```bash
pnpm --filter @chatbot/web build
```

Expected: Next.js production build completes with exit code 0.

- [x] **Step 4: Inspect the final diff**

Run:

```bash
git diff --check
git status --short
```

Expected: no whitespace errors; `.mcp.json` remains untouched; no files are
staged or committed.

- [x] **Step 5: Browser-check the interaction when the local app is available**

Verify immediate sidebar highlight, route skeleton under throttling, latest
selection after rapid clicks, browser back/forward state, modified clicks, and
reduced-motion behavior.

The available browser session reached the local app but redirected the
dashboard to `/login`, so signed-in interaction checks require the user's
authenticated browser session.

## Workflow Note

Do not run `git add`, `git commit`, or `git push`. The user will review and
commit changes manually.
