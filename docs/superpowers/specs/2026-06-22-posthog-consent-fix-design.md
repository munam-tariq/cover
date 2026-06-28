# PostHog Consent Fix Design

## Scope

Repair the existing PostHog integration by implementing the user-approved items 1, 2, 3, 4, and 6:

- Initialize the browser SDK only after explicit analytics consent.
- Remove PostHog identity headers from the shared authenticated API client.
- Use stable visitor or conversation identifiers for server-side lead and handoff events.
- Document the API-side PostHog environment variables.
- Add regression coverage for consent gating and the widget-route CORS boundary.

Node engine alignment is explicitly out of scope.

## Architecture

Browser initialization will move behind a small, idempotent analytics module. It will read the existing `frontface-analytics-consent` value and call `posthog.init` only when the value is `granted`. The consent component will initialize PostHog immediately after a user grants consent; denial will not initialize or contact PostHog. Existing capture calls remain safe because PostHog treats calls made before initialization as no-ops.

The shared API client will stop attaching `X-POSTHOG-DISTINCT-ID` and `X-POSTHOG-SESSION-ID`. The two server-side events do not originate from that client, so these headers do not correlate those events and currently cause widget CORS preflight failures. Server capture will instead use identifiers already present in the corresponding domain flows: `visitorId` for leads and `conversation.visitor_id`, falling back to the conversation ID, for handoffs.

## Components and Data Flow

1. `instrumentation-client.ts` asks the analytics module to initialize from stored consent.
2. With no stored grant or a stored denial, initialization returns without importing remote configuration, creating PostHog persistence, or sending PostHog requests.
3. `AnalyticsConsent` stores the user's decision. A grant calls the same idempotent initializer; a denial does nothing further.
4. Authenticated dashboard requests contain only their existing content and authorization headers.
5. API lead and handoff routes emit PostHog events using their domain identifiers without reading client-provided analytics headers.

## Error Handling

Missing browser or server PostHog tokens continue to disable analytics without affecting application behavior. Initialization remains idempotent so instrumentation and consent flows can both call it safely. Server capture remains optional through the existing nullable PostHog client.

## Testing

Add focused regression tests that verify:

- Browser PostHog initialization is gated by an explicit `granted` consent value.
- The shared API client no longer adds PostHog headers.
- API PostHog events use visitor/conversation identifiers and no longer depend on forwarded headers.
- Widget CORS does not need or advertise PostHog headers after the client-header removal.
- Both web and API environment examples document their respective PostHog settings.

Run the focused tests red before implementation and green afterward, then run changed-file lint, type checks, the production build, and the full test suite. Existing unrelated baseline failures will be reported separately rather than modified.
