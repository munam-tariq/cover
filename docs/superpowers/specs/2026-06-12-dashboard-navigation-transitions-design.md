# Dashboard Navigation Transitions

## Goal

Make every dashboard sidebar navigation feel immediate even when the destination
route or its data takes time to load.

The interaction should:

- highlight the clicked sidebar destination immediately;
- replace the current page content with a lightweight skeleton while the route
  resolves;
- keep the dashboard sidebar and header stable and interactive;
- fade the destination content in gently;
- preserve standard browser link behavior and accessibility preferences.

## Current Behavior

The dashboard sidebar derives its active item exclusively from `usePathname()`.
That pathname changes only after Next.js commits the new route, so a click can
appear to do nothing while the route bundle and render resolve.

The dashboard route group has no `loading.tsx` boundary. Individual pages have
loading states for their client-side API requests, but those states do not
provide feedback during the route transition itself.

## Recommended Approach

Use two complementary mechanisms:

1. Add optimistic selection state to the sidebar so a normal click updates the
   highlighted item before the pathname changes.
2. Add a dashboard-level `loading.tsx` with a shared skeleton so Next.js can
   display prefetched fallback UI immediately while preserving the shared
   layout.

This follows the App Router's native loading model and avoids adding a global
navigation store or another animation dependency.

## Interaction Design

### Sidebar

- A client-side navigation to a different sidebar item sets that item as the
  pending destination immediately through Next.js `Link.onNavigate`.
- The pending destination uses the same selected appearance as the active
  destination.
- Background, text, and icon colors transition over approximately 180 ms.
- When `usePathname()` changes, the pending destination is cleared and the URL
  once again becomes the source of truth.
- Clicking the already active destination does not start a pending state.
- Modifier-key, new-tab, external, and download behavior remains untouched
  because `onNavigate` runs only for same-origin client-side navigation.

### Content Area

- The sidebar and header remain mounted and interactive.
- During route resolution, the content area displays a generic dashboard
  skeleton with:
  - a title and subtitle placeholder;
  - an optional action placeholder;
  - a responsive row of summary-card placeholders;
  - one larger body placeholder.
- The skeleton uses the existing `Skeleton` component from `@chatbot/ui`.
- The fallback enters with a subtle opacity animation. Loaded route content
  also receives a short fade-in animation.
- There is no horizontal slide, scale effect, blocking overlay, or artificial
  minimum delay.

### Existing Page Loading States

Page-specific loading states remain unchanged. They continue to represent
client-side API loading after the destination component mounts. The shared
route skeleton represents only the route transition.

## Component Boundaries

### Sidebar Pending State

`apps/web/components/layout/sidebar.tsx` owns the pending destination because
the state is local to sidebar interaction.

The component will:

- store `pendingHref: string | null`;
- choose the visual selection from `pendingHref` first, then `pathname`;
- clear stale pending state when the committed pathname changes;
- set pending state from each sidebar link's `onNavigate` handler.

No context provider is needed.

### Shared Dashboard Skeleton

A reusable dashboard loading component will own the skeleton markup. The
dashboard route group's `loading.tsx` will render it.

Keeping the skeleton separate allows the route fallback and any future
transition tests to share one implementation without duplicating markup.

### Content Entry Animation

The dashboard layout will wrap `ProjectGuard` in a small client-side content
transition component. That component uses `usePathname()` to key an inner
container, restarting only the content fade when the committed route changes.

The wrapper sits inside the existing providers and dashboard chrome, so it does
not remount the providers, sidebar, or header.

## Accessibility

- Links remain semantic Next.js links and retain keyboard navigation.
- Keyboard activation receives both optimistic selection and the native route
  loading fallback without overriding link semantics.
- Focus is not forcibly moved during navigation.
- Animations are disabled or reduced under `prefers-reduced-motion: reduce`.
- Skeletons are decorative and must not create noisy screen-reader output.
- The current route remains identifiable through `aria-current="page"` after
  the pathname commits.

## Failure And Interruption Behavior

- Next.js navigation remains interruptible; clicking another sidebar item
  replaces the pending destination with the newest choice.
- If navigation is prevented before it starts, `onNavigate` does not set the
  pending destination. Subsequent navigations can replace pending state.
- No application data is mutated by optimistic selection.
- Route and page error handling remain responsible for actual load failures.

## Verification

### Automated

- TypeScript type checking passes for the web app.
- Existing web tests and lint checks pass where available.
- Focused tests cover active-route matching and pending-state reset if the
  repository's current test setup supports component tests.

### Manual

Verify in both development and production builds:

1. Every sidebar item highlights immediately on a normal click.
2. The content skeleton appears during a deliberately throttled navigation.
3. Sidebar and header stay mounted and usable.
4. The destination content fades in without layout jumps.
5. Fast or prefetched navigation does not flash an unnecessary long loader.
6. Rapidly clicking two destinations leaves the latest destination selected.
7. Ctrl/Cmd-click and middle-click open links normally without changing the
   current page's optimistic state.
8. Browser back and forward navigation restore the correct active item.
9. Reduced-motion mode removes nonessential transitions.
10. Nested routes such as project details and settings handoff still mark their
    parent sidebar item active.

## Out Of Scope

- Refactoring page-level data fetching.
- Adding per-page route skeleton designs.
- Changing project switching, authentication, or provider initialization.
- Adding a global progress bar or a new animation library.
- Artificially delaying fast navigation for the sake of showing animation.

## References

- Next.js 15 `loading.js` convention:
  https://nextjs.org/docs/15/app/api-reference/file-conventions/loading
- Next.js 15 `Link` and `onNavigate`:
  https://nextjs.org/docs/15/app/api-reference/components/link
- MDN `prefers-reduced-motion`:
  https://developer.mozilla.org/docs/Web/CSS/@media/prefers-reduced-motion
