# Human Handoff - Pending Implementation Plan

## Overview

This document outlines the implementation plan for pending items discovered during the audit. Items are sorted by dependency order - items at the top must be completed before items below them can work.

**Last Updated:** 2026-01-16

---

## Implementation Phases

### Phase 1: Backend Real-time Integration (Foundation)

**Priority:** CRITICAL
**Dependency:** None (this is the foundation)
**Estimated Impact:** Enables all real-time features

The `realtime.ts` service has all broadcast functions fully implemented, but **none of them are called** from the routes. Every route has `// TODO: Broadcast...` comments.

**Tasks:**

| # | Task | File | Location |
|---|------|------|----------|
| 1.1 | Call `broadcastConversationAssigned()` after direct assignment | `handoff.ts` | Line ~412 |
| 1.2 | Call `broadcastQueuePositions()` after adding to queue | `handoff.ts` | Line ~456 |
| 1.3 | Call `broadcastAgentClaimed()` and `broadcastConversationAssigned()` after claim | `handoff.ts` | Line ~604 |
| 1.4 | Call `broadcastConversationTransferred()` after transfer | `handoff.ts` | Line ~725 |
| 1.5 | Call `broadcastConversationResolved()` after resolve | `handoff.ts` | Line ~870 |
| 1.6 | Call `broadcastNewMessage()` after agent sends message | `conversations.ts` | Line ~682 |
| 1.7 | Call `broadcastAgentStatusChanged()` after status update | `agent.ts` | Line ~131 |

**Design Principles:**
- Broadcasts are fire-and-forget (don't block the response)
- Errors in broadcasting should be logged but not fail the request
- Always broadcast to relevant channels (conversation + queue + agent)

---

### Phase 2: Widget Real-time Connection

**Priority:** HIGH
**Dependency:** Phase 1
**Estimated Impact:** Replaces polling with instant updates

Currently the widget uses 2-second polling in `chat-window.ts`. Per the spec, it should use Supabase Realtime.

**Tasks:**

| # | Task | File | Notes |
|---|------|------|-------|
| 2.1 | Create `realtime.ts` utility in widget | `apps/widget/src/utils/realtime.ts` | New file |
| 2.2 | Add lightweight Supabase Realtime client | Widget bundle | Use `@supabase/realtime-js` (~15KB) |
| 2.3 | Subscribe to `conversation:{id}` channel | `chat-window.ts` | Replace polling |
| 2.4 | Handle `message:new` events | `chat-window.ts` | Add to DOM |
| 2.5 | Handle `conversation:status_changed` events | `chat-window.ts` | Update UI state |
| 2.6 | Handle `queue:position_updated` events | `chat-window.ts` | Show position |
| 2.7 | Implement reconnection logic | `realtime.ts` | Auto-reconnect on disconnect |
| 2.8 | Fallback to polling if WebSocket fails | `chat-window.ts` | Graceful degradation |

**Design Principles:**
- Use a single channel subscription per conversation
- Clean up subscription on widget close
- Fallback to polling if real-time connection fails
- Minimal bundle size impact

---

### Phase 3: Dashboard Real-time Subscriptions

**Priority:** HIGH
**Dependency:** Phase 1
**Estimated Impact:** No more page refreshes needed

The dashboard uses standard React data fetching. Need to add Supabase Realtime subscriptions.

**Tasks:**

| # | Task | Location | Notes |
|---|------|----------|-------|
| 3.1 | Create `useConversationRealtime` hook | `apps/web/hooks/` | New hook |
| 3.2 | Create `useQueueRealtime` hook | `apps/web/hooks/` | New hook |
| 3.3 | Subscribe to `conversation:{id}` in conversation view | `inbox/[id]/page.tsx` | For messages |
| 3.4 | Subscribe to `project:{id}:queue` in inbox | `inbox/page.tsx` | For queue updates |
| 3.5 | Handle incoming messages in real-time | Conversation view | Append to list |
| 3.6 | Handle queue updates in real-time | Inbox | Update queue section |
| 3.7 | Handle assignment notifications | Agent context | Toast + update list |

**Design Principles:**
- Use React hooks for subscription management
- Clean up subscriptions on unmount
- Optimistic updates where possible
- Dedupe events to prevent flickering

---

### Phase 4: Typing Indicators

**Priority:** MEDIUM
**Dependency:** Phases 1, 2, 3
**Estimated Impact:** Better UX during conversations

No typing indicator implementation exists currently.

**Tasks:**

| # | Task | Location | Notes |
|---|------|----------|-------|
| 4.1 | Add `POST /api/conversations/:id/typing` endpoint | `conversations.ts` | New route |
| 4.2 | Add typing state to widget input | `chat-window.ts` | Debounced send |
| 4.3 | Show agent typing indicator in widget | `chat-window.ts` | New UI element |
| 4.4 | Add typing state to dashboard input | `conversation-view.tsx` | Debounced send |
| 4.5 | Show customer typing indicator in dashboard | `conversation-view.tsx` | New UI element |
| 4.6 | Broadcast typing via `broadcastTyping()` | New endpoint | Already defined |

**Design Principles:**
- Debounce typing events (300ms)
- Auto-clear typing after 3 seconds of inactivity
- Don't persist typing state (in-memory only)

---

### Phase 5: Customer Presence Broadcasting

**Priority:** MEDIUM
**Dependency:** Phases 1, 2
**Estimated Impact:** Agents see if customer is active

The `presence.ts` service exists but widget doesn't call it.

**Tasks:**

| # | Task | Location | Notes |
|---|------|----------|-------|
| 5.1 | Add `POST /api/conversations/:id/presence` endpoint | `conversations.ts` | Public endpoint |
| 5.2 | Send heartbeat from widget when active | `chat-window.ts` | Every 30 seconds |
| 5.3 | Send `idle` state after inactivity | `chat-window.ts` | 2 min threshold |
| 5.4 | Send `offline` on widget close/beforeunload | `chat-window.ts` | Cleanup |
| 5.5 | Show customer presence in dashboard | `conversation-view.tsx` | Green/yellow/gray dot |
| 5.6 | Update presence via realtime broadcast | Backend | Use `broadcastPresenceUpdate()` |

**Design Principles:**
- Use `navigator.sendBeacon` for offline notification
- Don't block UI on presence updates
- Debounce presence changes

---

### Phase 6: Offline Form

**Priority:** MEDIUM
**Dependency:** None (independent)
**Estimated Impact:** Capture leads outside business hours

No offline form exists in the widget.

**Tasks:**

| # | Task | Location | Notes |
|---|------|----------|-------|
| 6.1 | Create `OfflineForm` component | `apps/widget/src/components/offline-form.ts` | New file |
| 6.2 | Add form fields (name, email, message) | Component | Required fields |
| 6.3 | Add `POST /api/projects/:id/offline-messages` endpoint | `handoff.ts` | New route |
| 6.4 | Show offline form when `showOfflineForm: true` | `chat-window.ts` | Conditional render |
| 6.5 | Store offline messages in database | New table or existing | `offline_messages` |
| 6.6 | Notify agents of offline messages | Dashboard | When they come online |

**Design Principles:**
- Simple, minimal form
- Email validation
- Success confirmation
- Store for agent follow-up

---

### Phase 7: Lower Priority Items

**Priority:** LOW
**Dependency:** Various

These can be implemented after core features work.

| # | Feature | Dependency | Notes |
|---|---------|------------|-------|
| 7.1 | Notification badge on widget | Phase 2 | Show count when minimized |
| 7.2 | Unread message count in dashboard | Phase 3 | Track last read timestamp |
| 7.3 | Internal notes UI | None | Simple textarea in customer panel |
| 7.4 | Transfer to specific agent | Phase 1 | Dropdown in transfer modal |
| 7.5 | Agent decline invitation | None | Add decline endpoint/UI |

---

## Implementation Order (Recommended)

```
Week 1: Foundation
├── Phase 1: Backend Real-time Integration (Tasks 1.1 - 1.7)
│   └── All routes now broadcast events
└── Testing: Verify broadcasts with Supabase Dashboard

Week 2: Real-time Clients
├── Phase 2: Widget Real-time (Tasks 2.1 - 2.8)
│   └── Widget receives messages instantly
├── Phase 3: Dashboard Real-time (Tasks 3.1 - 3.7)
│   └── Dashboard updates without refresh
└── Testing: End-to-end message flow

Week 3: Enhanced Features
├── Phase 4: Typing Indicators (Tasks 4.1 - 4.6)
├── Phase 5: Customer Presence (Tasks 5.1 - 5.6)
└── Phase 6: Offline Form (Tasks 6.1 - 6.6)

Week 4: Polish
└── Phase 7: Lower Priority Items (as time permits)
```

---

## Technical Decisions

### 1. Widget Real-time Client

**Decision:** Use `@supabase/realtime-js` standalone package

**Reasoning:**
- Lightweight (~15KB gzipped)
- Same API as full Supabase client
- Handles reconnection automatically
- Used by Supabase internally

**Alternative considered:** Custom WebSocket client
- Rejected because: More maintenance, no auto-reconnect, need to implement protocol

### 2. Channel Structure

**Decision:** Use existing channel naming from `realtime.ts`:
- `conversation:{id}` - All conversation events
- `project:{id}:queue` - Queue updates for agents
- `agent:{id}` - Personal notifications

**Reasoning:** Already defined and well-structured

### 3. Typing Indicator Debouncing

**Decision:** 300ms debounce, 3s auto-clear

**Reasoning:**
- 300ms prevents excessive broadcasts while typing
- 3s covers pauses between thoughts
- Standard UX pattern (Slack, Discord use similar)

### 4. Presence Heartbeat

**Decision:** 30s heartbeat, 2min idle threshold

**Reasoning:**
- 30s balances accuracy vs. server load
- 2min matches user expectation of "active"
- Cron already has 30min offline threshold for agents

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Real-time connection fails | Fallback to polling |
| Bundle size increases too much | Tree-shake, lazy load |
| Race conditions with optimistic updates | Use timestamps for ordering |
| Memory leaks from subscriptions | Cleanup on unmount/close |
| Supabase rate limits | Debounce broadcasts, batch where possible |

---

## Testing Checklist

After each phase, verify:

### Phase 1
- [ ] Agent sends message → Customer sees it (via polling still)
- [ ] Check Supabase Dashboard → Realtime → Events appear

### Phase 2
- [ ] Agent sends message → Customer sees it instantly
- [ ] Status changes → Widget updates state
- [ ] Disconnect WiFi → Reconnects automatically
- [ ] Fallback → Polling works when WS fails

### Phase 3
- [ ] Customer sends message → Agent sees it instantly
- [ ] Customer triggers handoff → Queue updates
- [ ] Agent claims → Queue removes item

### Phase 4
- [ ] Customer typing → Agent sees indicator
- [ ] Agent typing → Customer sees indicator
- [ ] Stop typing → Indicator clears after 3s

### Phase 5
- [ ] Widget open → Customer shows as online
- [ ] Widget idle → Customer shows as idle
- [ ] Widget close → Customer shows as offline

### Phase 6
- [ ] Outside hours → Offline form shows
- [ ] Submit form → Data stored
- [ ] Agent comes online → Can see offline messages

---

## Files to Create/Modify

**New Files:**
- `apps/widget/src/utils/realtime.ts` - Widget realtime client
- `apps/widget/src/components/offline-form.ts` - Offline form component
- `apps/widget/src/components/typing-indicator-agent.ts` - Agent typing UI
- `apps/web/hooks/useConversationRealtime.ts` - Dashboard hook
- `apps/web/hooks/useQueueRealtime.ts` - Dashboard hook

**Modified Files:**
- `apps/api/src/routes/handoff.ts` - Add broadcast calls
- `apps/api/src/routes/conversations.ts` - Add broadcast calls + typing endpoint
- `apps/api/src/routes/agent.ts` - Add broadcast call
- `apps/widget/src/components/chat-window.ts` - Real-time integration
- `apps/web/app/(dashboard)/inbox/page.tsx` - Real-time subscription
- `apps/web/app/(dashboard)/inbox/[id]/page.tsx` - Real-time subscription

---

## Notes

- All broadcast functions in `realtime.ts` are production-ready
- Backend is 95% complete, just needs wiring
- Widget real-time requires new package dependency
- Dashboard already has Supabase client, just needs subscriptions
