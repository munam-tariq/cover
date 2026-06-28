# FrontFace E2E Test Report — 2026-06-22

**Scope:** Full end-to-end test of frontface.app — registration → onboarding → widget → invites → AI chat → human handoff (race condition) → back-to-AI → analytics → offline form

**Company under test:** hofmigration.com (HofMigration Assistant, project `50263e55-5d7e-4fac-a8e4-539cd05d8219`)

**Test infrastructure:** Chrome DevTools MCP, isolated browser contexts per actor (Owner, Member1 "Agent One", Member2 "Agent Two", 3 customers)

---

## Results Summary

| Phase | Check | Result |
|-------|-------|--------|
| Phase 1 | Registration + magic link login | ✅ Pass |
| Phase 2 | Onboarding (crawl hofmigration.com, KB built, agent tested) | ✅ Pass |
| Phase 3 | Widget on test.html (prod script, prod API) | ✅ Pass |
| Phase 4 | Member invites (2 members accepted) | ✅ Pass (with bugs — see below) |
| Phase 5 | AI chat — relevant questions | ✅ Pass (KB-grounded answers) |
| Phase 5 | AI chat — irrelevant/OOT questions | ✅ Pass (graceful deflection) |
| Phase 5 | AI chat — adversarial inputs (injection, role hijack, spam) | ✅ Pass (no breakage, no injection) |
| Phase 6 | Single handoff → agent claims + responds in real-time | ✅ Pass |
| Phase 6 | Handoff with all agents offline → "Live support unavailable" | ✅ Pass |
| Phase 6 | Manual Claim mode — queue visible to all agents | ✅ Pass |
| Phase 6 | Multi-agent race condition — atomic claim (one wins) | ✅ Pass |
| Phase 6 | Losing agent sees non-interactive button immediately | ✅ Pass |
| Phase 6 | 3 concurrent handoffs — no cross-conversation bleed | ✅ Pass |
| Phase 7 | "Return to AI" clears from agent inbox | ✅ Pass |
| Phase 7 | Widget shows "This chat has been returned to AI" system message | ✅ Pass |
| Phase 7 | AI responds with KB-grounded content after return | ✅ Pass |
| Phase 7 | Dashboard shows "AI" label (not "Active") on returned conversation | ✅ Pass |
| Phase 8 | App analytics: 5 conversations, 12 messages (last 24h) | ✅ Pass |
| Phase 8 | App analytics top questions: all E2E test questions present | ✅ Pass |
| Phase 8 | PostHog: `human_handoff_requested` (×3), `logged_in` (×1), `magic_link_requested` (×1) | ✅ Pass (server-side events) |
| Phase 8 | PostHog: `signed_up`, `onboarding_started/completed` | ⚠️ Not in results — consent-gated (expected) |
| Phase 8 | Analytics: Topics / Sentiment / Answer Gaps tabs | ❌ Fail — 500 errors (see Bug 3) |
| Additional | Offline form: widget component fully implemented | ✅ Not dead code |
| Additional | Offline form: API saves submission to DB | ✅ Works |
| Additional | Offline form: submission visible in dashboard inbox | ❌ Invisible — see Bug 4 |

---

## Bugs Found

### Bug 1 — Invite email links to `localhost:3000` (pre-existing, documented in e2e-test-blockers-2026-06-22.md)

**Symptom:** Member invite emails contain `http://localhost:3000/invite/<token>` instead of `https://frontface.app/invite/<token>`.

**Fix:** Set `APP_URL=https://frontface.app` (or `NEXT_PUBLIC_APP_URL`) in the production API environment.

---

### Bug 2 — Auth email redirects to `supportbase.app` (pre-existing, documented in e2e-test-blockers-2026-06-22.md)

**Symptom:** New user confirmation emails redirect to `supportbase.app` which has an invalid TLS cert — Chrome blocks the confirmation.

**Fix:** Update Supabase Auth → URL Configuration → Site URL to `https://frontface.app`. Update email templates to remove `supportbase.app`.

---

### Bug 3 — Analytics: Topics / Sentiment / Answer Gaps return 500

**Endpoint:** `GET /api/analytics/topics?projectId=...&days=1` → `{"error":{"code":"INTERNAL_ERROR","message":"Failed to get topics"}}` (same for `/sentiment` and `/gaps`)

**Root cause:** The three endpoints read from the `conversation_insights` table (migration `20260612000001_conversation_insights.sql`). This migration has not been applied to the production database (`hynaqwwofkpaafvlckdm`), so Supabase returns a "relation does not exist" error, which the API converts to a generic 500.

**Additional issue:** The error handler should return `{ topics: [], days }` (empty result) instead of a 500 when the table doesn't exist, to make the UI fail gracefully.

**Fix:**
1. Apply migration `supabase/migrations/20260612000001_conversation_insights.sql` to prod.
2. (Optional hardening) In `fetchInsightRows()`, catch and handle "relation does not exist" Postgres errors as empty results instead of 500.

**Note:** The UI copy ("Topics are detected nightly once conversations are classified") is correct — topic classification is intentionally a nightly batch job. The 500 is the problem, not the empty state.

---

### Bug 4 — Offline form submissions are invisible in the dashboard inbox (CRITICAL UX BUG)

**Symptom:** When a customer submits the offline form (shown when all agents are offline), the submission is saved to the database but agents have no way to see it in the dashboard. There is no notification and no accessible UI.

**Root cause (code path):**

1. Widget (`offline-form.ts` + `handoff.ts`) calls `POST /api/projects/:id/offline-messages`
2. API (`handoff.ts:1299–1408`) creates a `conversation` with `status: "closed"` and `handoff_reason: "offline_form"`, plus a customer message and system message
3. Inbox API (`conversations.ts:226`) defaults to `.neq("status", "closed")` — closed conversations are excluded from all inbox views
4. The inbox page (`/inbox`) fetches `/api/conversations` without a `status` parameter, so it always excludes closed conversations
5. There is no dedicated UI section for offline form submissions

**Impact:** Every offline form submission silently disappears. Agents don't know they exist. Customers are told "We'll get back to you" but will never be contacted.

**Fix options (choose one or combine):**

**Option A — Status-based fix (quickest):** Change the offline message conversation status from `"closed"` to `"waiting"` or a new `"offline_message"` status. Add a filter tab in the inbox for this status.

**Option B — Dedicated section:** Add an "Offline Messages" tab in the inbox (or a separate page) that queries `/api/conversations?status=closed&handoffReason=offline_form`. Show customer name, email, and message.

**Option C — Email notification (complementary):** Send an email to the project owner when an offline form is submitted, containing the customer's name, email, and message. This works even if the agent doesn't check the dashboard.

**Recommended:** Option B + Option C for production. Option A is lowest effort but mixes offline messages into the regular queue.

---

### Bug 5 — Typing indicator ("...") persists after agent sends a message

**Symptom:** After a human agent sends a message in the widget, the "..." typing indicator bubble remains visible and never clears. Confirmed during Phase 6 testing.

**Expected:** Typing indicator should clear when the agent's message is received by the widget.

**Likely location:** `chat-window.ts` — the typing indicator state is not cleared when an agent message arrives via polling/realtime. Check the `addMessage()` or message polling handler to ensure it calls `this.typingIndicator.hide()` after receiving an agent message.

---

## Notes

- **PostHog consent:** Web events (`signed_up`, `onboarding_started`, `onboarding_completed`) are gated behind the analytics consent banner and only fire after user accepts. Server-side events (`human_handoff_requested`) fire regardless. This is correct behavior.
- **Topics/Sentiment/Answer Gaps:** These are nightly batch jobs. Even after Bug 3 is fixed, data won't appear until the next nightly classifier run.
- **Race condition test:** The Supabase real-time atomic claim works correctly. When Member1 and Owner both clicked "Claim" within ~1 second of each other, exactly one agent won. The loser's button became non-interactive immediately. ✅
- **Offline form name field:** During testing, the Name field appeared pre-populated with a chat message. This is a test automation artifact (browser autofill from programmatically-set `textarea.value`). No pre-population code exists in `offline-form.ts`. Not a production bug.
