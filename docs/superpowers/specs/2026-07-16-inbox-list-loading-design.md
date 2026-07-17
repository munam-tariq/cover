# Inbox List-Scoped Loading Design

## Problem

The inbox currently uses one loading state for both the initial page request and later conversation refetches. Changing the **My Chats / All** tab, status filter, channel filter, or page therefore replaces the entire inbox with its full-page skeleton. This removes stable controls and context even though only the conversation result set is changing.

## Desired behavior

- Keep the existing full-page skeleton for the first inbox load and when a newly selected project has not loaded yet.
- During tab, filter, pagination, manual refresh, or realtime-driven refetches, keep the page header, statistics, tabs, filters, and other inbox sections mounted.
- Replace only the conversation results and their pagination area with compact conversation-row skeletons until the request settles.
- Do not show rows from the previous query beneath newly selected filters because those rows can conflict with the visible filter state.
- Preserve existing empty and error states after a request settles.

## Implementation design

Separate initial loading from subsequent list loading while keeping a single conversation-fetching path. The fetch path will determine whether the active project has previously completed an inbox request:

- An unseen project activates the initial loading state.
- A project that has already loaded activates the list loading state.

The full-page early return will depend only on project loading or initial inbox loading. The conversation card will own the list-scoped skeleton branch. This keeps the behavior DRY and avoids duplicating request, response, or error handling.

Project identity must be part of the initial-load decision so switching projects does not momentarily display another project's inbox shell as loaded. Loading flags must be cleared in the request's `finally` path so success and failure produce consistent UI state.

## Error handling

Existing request errors remain page-visible after the request completes. A failed subsequent refetch must stop the list skeleton and render the established error state rather than leaving the inbox busy indefinitely.

## Verification

Add a focused regression test before changing production code. It will verify that:

- initial and list loading are distinct;
- the full-page skeleton is not controlled by list refetch loading; and
- the conversation results area renders a localized skeleton during a list refetch.

Then run the focused inbox test, the relevant web test suite, type checking, and changed-file linting. Browser verification should confirm that tabs, filters, and pagination remain visible while only the conversation list loads.

## Out of scope

- Changing inbox filtering semantics or API contracts.
- Adding request caching, optimistic filtering, or a new data-fetching library.
- Redesigning the inbox controls or conversation rows.
