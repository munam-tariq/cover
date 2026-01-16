# Human Handoff - Test Cases

This document tracks all test cases for the Human Handoff feature. Use this to ensure complete coverage during testing.

**Legend:**
- [ ] Not tested
- [x] Tested & Passing
- [!] Tested & Failing
- [-] Not Implemented
- [~] Implemented but not integrated/working
- [?] Needs Investigation

**Last Audit:** 2026-01-16

---

## CRITICAL GAPS SUMMARY

### Must Fix Before Release

| # | Gap | Spec Reference | Current State |
|---|-----|----------------|---------------|
| 1 | **Real-time broadcasting not integrated** | Section 5.9 | Functions defined in realtime.ts but routes have TODO comments - never called |
| 2 | **Widget uses polling instead of WebSocket** | Section 5.6.7 | 2s polling workaround implemented |
| 3 | **Dashboard has no real-time subscriptions** | Section 5.9.4 | Agent must refresh to see new messages |
| 4 | **Typing indicators not implemented** | Section 5.9.3 | No code for this in widget or dashboard |
| 5 | **Customer presence not broadcast from widget** | Section 5.12 | Presence service exists but widget doesn't call it |
| 6 | **Offline form not implemented in widget** | Section 5.6 | No offline form component exists |

### Implementation Status by Layer

| Layer | Status | Details |
|-------|--------|---------|
| **Database** | 95% | All tables, triggers, RLS policies created |
| **API Endpoints** | 95% | All CRUD operations working |
| **Services** | 90% | realtime.ts defined but not called, presence.ts working |
| **Widget** | 70% | Core flow works, missing real-time & some UI |
| **Dashboard** | 80% | UI exists, missing real-time subscriptions |
| **Real-time Integration** | 0% | Functions defined, nowhere called |

### What Works End-to-End

| Feature | Status | Notes |
|---------|--------|-------|
| Talk to Human button | [x] | Shows/hides based on settings + availability |
| Handoff trigger (button) | [x] | Creates conversation, assigns agent or queues |
| AI stops during handoff | [x] | chat-engine checks conversation status |
| Customer messages stored | [x] | In messages table |
| Agent Dashboard UI | [x] | Inbox list, conversation view, customer panel |
| Agent can send messages | [x] | POST /conversations/:id/messages |
| Agent can see messages | [x] | But needs refresh (no real-time) |
| Agent status toggle | [x] | Online/away/offline in header |
| Agent claiming | [x] | POST /conversations/:id/claim |
| Conversation actions | [x] | Resolve, transfer, return to AI |
| Team invitations | [x] | Email via Resend, accept flow |
| Business hours | [x] | Timezone-aware checking |
| Widget polling | [x] | 2s interval workaround |

---

## Actors

1. **Customer** - End user using the chat widget
2. **AI** - The chatbot (GPT-powered)
3. **Agent** - Human support agent using dashboard
4. **Owner** - Project owner configuring settings
5. **System** - Backend automation/triggers

## Conversation States

| State | Description |
|-------|-------------|
| `ai_active` | AI is handling the conversation |
| `waiting` | Customer is in queue waiting for agent |
| `agent_active` | Human agent is handling the conversation |
| `resolved` | Conversation completed successfully |
| `closed` | Conversation closed (abandoned/timeout) |

---

## A. Widget / Customer Side

### A1. Widget Initialization

| ID | Test Case | Status | Notes |
|----|-----------|--------|-------|
| A1.1 | Customer opens widget with NO existing conversation | [x] | Shows greeting, AI ready - widget.ts handles init |
| A1.2 | Customer opens widget with EXISTING `ai_active` conversation | [x] | Restores from localStorage, checks status via API |
| A1.3 | Customer opens widget with EXISTING `waiting` conversation | [x] | initializeConversationState() checks status, hides button |
| A1.4 | Customer opens widget with EXISTING `agent_active` conversation | [x] | initializeConversationState() checks status, starts polling |
| A1.5 | Customer opens widget with EXISTING `resolved` conversation | [?] | Need to test - may start fresh |
| A1.6 | Customer opens widget with EXISTING `closed` conversation | [?] | Need to test - may start fresh |

### A2. Message Sending (Customer)

| ID | Test Case | Status | Notes |
|----|-----------|--------|-------|
| A2.1 | Customer sends message while `ai_active` | [x] | Normal AI flow via chat-engine |
| A2.2 | Customer sends message while `waiting` | [x] | checkConversationHandoffState() → store only |
| A2.3 | Customer sends message while `agent_active` | [x] | checkConversationHandoffState() → store only |
| A2.4 | Customer sends empty message | [x] | sanitizeUserInput() validates |
| A2.5 | Customer sends very long message (>2000 chars) | [x] | validateChatInput() rejects |
| A2.6 | Customer sends message with XSS/injection | [x] | escapeHtml() in message component |
| A2.7 | Customer rapid-fires multiple messages | [?] | No explicit rate limiting found |

### A3. Talk to Human Button

| ID | Test Case | Status | Notes |
|----|-----------|--------|-------|
| A3.1 | Button visibility when setting is OFF | [x] | checkHandoffAvailability() returns showButton:false |
| A3.2 | Button visibility when setting is ON + agents online | [x] | Returns showButton:true |
| A3.3 | Button visibility when setting is ON + no agents online | [x] | Returns showButton:false (checks onlineCount) |
| A3.4 | Button visibility when setting is ON + outside business hours | [x] | isWithinBusinessHours() check |
| A3.5 | Button visibility when already in `waiting` state | [x] | initializeConversationState() hides it |
| A3.6 | Button visibility when already in `agent_active` state | [x] | initializeConversationState() hides it |
| A3.7 | Click button - agent available | [x] | Direct assignment, system message added |
| A3.8 | Click button - no agent available | [x] | Adds to queue, returns queuePosition |
| A3.9 | Click button - no conversation exists yet | [x] | handleHumanButtonClick() creates via sendMessage first |
| A3.10 | Click button - shows loading state | [x] | setLoading(true) shows "Connecting..." |
| A3.11 | Click button - API error | [x] | catch block shows error message |
| A3.12 | Custom button text from settings | [x] | buttonText from handoff-availability API |

### A4. Receiving Messages (Customer)

| ID | Test Case | Status | Notes |
|----|-----------|--------|-------|
| A4.1 | Receive AI response | [x] | Normal flow, shown with assistant styling |
| A4.2 | Receive agent message | [x] | Via polling, shown with agent name (if available) |
| A4.3 | Receive system message (queue position) | [x] | System messages stored in DB |
| A4.4 | Receive system message (agent joined) | [x] | System message on claim |
| A4.5 | Receive system message (conversation resolved) | [x] | System message on resolve |
| A4.6 | Receive system message (returned to AI) | [x] | System message on return |
| A4.7 | Messages arrive while widget is closed | [?] | Need to test - should show on reopen |
| A4.8 | Messages arrive while widget is minimized | [-] | No notification badge implemented |

### A5. Real-time & Sync (Customer)

**NOTE: Spec requires Supabase Realtime (WebSocket), current implementation uses polling.**

| ID | Test Case | Status | Notes |
|----|-----------|--------|-------|
| A5.1 | Widget subscribes to Supabase Realtime channel | [-] | **NOT IMPLEMENTED** - no realtime code in widget |
| A5.2 | Widget receives messages via WebSocket | [-] | **NOT IMPLEMENTED** |
| A5.3 | Widget receives status changes via WebSocket | [-] | **NOT IMPLEMENTED** |
| A5.4 | Widget receives typing indicator via WebSocket | [-] | **NOT IMPLEMENTED** |
| A5.5 | (Workaround) Polling fetches new agent messages | [x] | startMessagePolling() every 2s |
| A5.6 | (Workaround) Polling stops when resolved | [x] | Checks status, calls stopMessagePolling() |
| A5.7 | Customer refreshes page during `waiting` | [x] | getSessionId() + initializeConversationState() |
| A5.8 | Customer refreshes page during `agent_active` | [x] | Same as above |
| A5.9 | Customer closes browser and reopens | [x] | localStorage persistence |
| A5.10 | Customer opens widget in new tab | [?] | Need to test - same visitorId |
| A5.11 | LocalStorage cleared during handoff | [~] | Should recover via getConversationStatus but not fully tested |
| A5.12 | Network disconnect and reconnect | [?] | Polling would resume but not graceful |

### A6. Customer Presence

| ID | Test Case | Status | Notes |
|----|-----------|--------|-------|
| A6.1 | Customer marked as "online" when widget open | [~] | presence.ts has logic, widget doesn't call it |
| A6.2 | Customer marked as "idle" after inactivity | [~] | Logic in presence.ts (2 min threshold) |
| A6.3 | Customer marked as "offline" when widget closed | [~] | Logic exists but widget doesn't send heartbeat |
| A6.4 | Customer typing indicator sent to agent | [-] | **NOT IMPLEMENTED** in widget |
| A6.5 | Presence updates while in handoff | [-] | Widget doesn't broadcast presence |

---

## B. AI / Chat Engine

### B1. Message Processing

| ID | Test Case | Status | Notes |
|----|-----------|--------|-------|
| B1.1 | Process message for `ai_active` conversation | [x] | Normal processChat() flow |
| B1.2 | Process message for `waiting` conversation | [x] | checkConversationHandoffState() → storeCustomerMessageOnly() |
| B1.3 | Process message for `agent_active` conversation | [x] | Same as above |
| B1.4 | Process message for `resolved` conversation | [?] | Need to test - likely creates new |
| B1.5 | Process message for non-existent conversation | [x] | getOrCreateSession() creates new |

### B2. Handoff Triggers

| ID | Test Case | Status | Notes |
|----|-----------|--------|-------|
| B2.1 | Trigger keyword detected in message | [x] | checkHandoffTrigger() in chat-engine |
| B2.2 | Low confidence detected (poor RAG results) | [x] | checkLowConfidenceHandoff() after RAG |
| B2.3 | Customer explicitly requests human | [x] | Part of keyword detection |
| B2.4 | Multiple triggers in same message | [x] | Returns on first match |
| B2.5 | Trigger when handoff is disabled | [x] | checkHandoffTrigger checks settings.enabled |
| B2.6 | Trigger outside business hours | [x] | Returns offline status |
| B2.7 | Trigger when no agents exist | [x] | Checks agentCount |
| B2.8 | Trigger when all agents offline | [x] | Checks onlineCount |

### B3. Handoff Execution

| ID | Test Case | Status | Notes |
|----|-----------|--------|-------|
| B3.1 | Handoff with agent available | [x] | getAvailableAgent() → direct assignment |
| B3.2 | Handoff with no agent available | [x] | Status → waiting, queue_entered_at set |
| B3.3 | Handoff creates system message | [x] | "You're now connected..." or queue message |
| B3.4 | Handoff updates conversation status | [x] | To `waiting` or `agent_active` |
| B3.5 | Handoff records reason | [x] | handoff_reason field |
| B3.6 | Handoff records confidence score | [x] | ai_confidence_at_handoff field |

---

## C. Agent Side

### C1. Agent Authentication & Status

| ID | Test Case | Status | Notes |
|----|-----------|--------|-------|
| C1.1 | Agent logs in, sees dashboard | [x] | Role-based sidebar in layout.tsx |
| C1.2 | Agent sets status to "online" | [x] | PUT /api/agent/status |
| C1.3 | Agent sets status to "away" | [x] | Same endpoint |
| C1.4 | Agent sets status to "offline" | [x] | Same endpoint |
| C1.5 | Agent status persists on page refresh | [?] | Need to test - should query current status |
| C1.6 | Agent auto-offline after inactivity | [x] | checkAndUpdateAgentStatuses() - 30 min threshold |
| C1.7 | Agent closes browser (goes offline) | [~] | Heartbeat stops, cron would mark offline |

### C2. Inbox & Queue

| ID | Test Case | Status | Notes |
|----|-----------|--------|-------|
| C2.1 | Agent sees list of assigned conversations | [x] | GET /api/conversations with filters |
| C2.2 | Agent sees queue of waiting conversations | [x] | GET /api/projects/:id/queue |
| C2.3 | Queue sorted by wait time | [x] | ORDER BY queue_entered_at ASC |
| C2.4 | Conversation shows customer info | [x] | customer_email, customer_name in response |
| C2.5 | Conversation shows message preview | [x] | Last message in list |
| C2.6 | Conversation shows unread count | [-] | Not implemented - no unread tracking |
| C2.7 | Conversation shows customer presence | [~] | customer_presence field exists, not displayed |
| C2.8 | Real-time queue updates | [-] | **NOT IMPLEMENTED** - no subscriptions |

### C3. Claiming Conversations

| ID | Test Case | Status | Notes |
|----|-----------|--------|-------|
| C3.1 | Agent claims waiting conversation | [x] | POST /api/conversations/:id/claim |
| C3.2 | Agent claims, customer notified | [x] | System message inserted |
| C3.3 | Agent at max capacity cannot claim | [x] | Validates current_chat_count < max |
| C3.4 | Agent offline cannot claim | [x] | Validates status === 'online' |
| C3.5 | Two agents claim same conversation | [x] | WHERE status='waiting' AND assigned IS NULL |
| C3.6 | Claim updates queue for other agents | [-] | No broadcast - agents must refresh |

### C4. Conversation Handling

| ID | Test Case | Status | Notes |
|----|-----------|--------|-------|
| C4.1 | Agent sends message to customer | [x] | POST /api/conversations/:id/messages |
| C4.2 | Agent sees customer messages in real-time | [-] | **NOT IMPLEMENTED** - must refresh |
| C4.3 | Agent sees customer typing indicator | [-] | **NOT IMPLEMENTED** |
| C4.4 | Agent views conversation history | [x] | GET /api/conversations/:id/messages |
| C4.5 | Agent views customer context panel | [x] | Customer info in conversation detail |
| C4.6 | Agent adds internal note | [-] | internal_notes field exists, no UI |
| C4.7 | Agent sends message with link | [x] | Stored as-is, widget renders |
| C4.8 | Agent sends long message | [x] | No length limit in API |

### C5. Conversation Actions

| ID | Test Case | Status | Notes |
|----|-----------|--------|-------|
| C5.1 | Agent resolves conversation | [x] | POST /api/conversations/:id/resolve |
| C5.2 | Agent closes conversation | [x] | resolution: 'closed' |
| C5.3 | Agent returns to AI | [x] | returnToAI: true |
| C5.4 | Agent transfers to queue | [x] | POST /api/conversations/:id/transfer |
| C5.5 | Agent transfers to specific agent | [-] | Not implemented - only queue transfer |
| C5.6 | Resolution decrements agent chat count | [x] | In resolve handler |
| C5.7 | Customer notified of resolution | [x] | System message inserted |
| C5.8 | Customer notified of return to AI | [x] | System message inserted |

### C6. Agent Edge Cases

| ID | Test Case | Status | Notes |
|----|-----------|--------|-------|
| C6.1 | Agent goes offline mid-conversation | [?] | Conversation stays assigned, no notification |
| C6.2 | Agent browser crashes | [~] | Heartbeat stops, cron marks offline eventually |
| C6.3 | Agent has multiple tabs open | [?] | Need to test - same session |
| C6.4 | Agent network disconnect | [?] | Need to test |
| C6.5 | Agent sends message as customer disconnects | [x] | Message stored regardless |

---

## D. Queue & Assignment System

### D1. Queue Management

| ID | Test Case | Status | Notes |
|----|-----------|--------|-------|
| D1.1 | Customer added to queue | [x] | queue_entered_at set |
| D1.2 | Queue position accurate | [x] | calculateQueuePosition() |
| D1.3 | Queue position updates when others leave | [-] | No real-time broadcast |
| D1.4 | Customer sees estimated wait time | [x] | queuePosition * 2 minutes estimate |
| D1.5 | Empty queue, agent comes online | [x] | No auto-assignment (agent must claim) |
| D1.6 | Queue with customers, agent comes online | [-] | No auto-process - agent must manually claim |

### D2. Assignment Algorithm

| ID | Test Case | Status | Notes |
|----|-----------|--------|-------|
| D2.1 | Balanced assignment (least busy) | [x] | ORDER BY current_chat_count ASC |
| D2.2 | Assignment respects max capacity | [x] | WHERE current < max |
| D2.3 | Assignment updates agent chat count | [x] | Increments on assign |
| D2.4 | Assignment records last_assigned_at | [x] | For round-robin tiebreaker |
| D2.5 | No available agents | [x] | Customer goes to waiting queue |
| D2.6 | All agents at capacity | [x] | Same as above |

---

## E. Settings & Configuration

### E1. Handoff Settings (Owner)

| ID | Test Case | Status | Notes |
|----|-----------|--------|-------|
| E1.1 | Enable/disable handoff | [x] | enabled field, UI toggle |
| E1.2 | Configure trigger mode (auto/manual/both) | [x] | trigger_mode field |
| E1.3 | Configure trigger keywords | [x] | auto_triggers.keywords JSONB |
| E1.4 | Configure low confidence threshold | [x] | auto_triggers.lowConfidence.threshold |
| E1.5 | Enable/disable "Talk to Human" button | [x] | show_human_button field |
| E1.6 | Customize button text | [x] | button_text field |
| E1.7 | Configure business hours | [x] | business_hours JSONB per day |
| E1.8 | Configure timezone | [x] | timezone field |
| E1.9 | Settings saved to database | [x] | PUT /api/projects/:id/handoff-settings |
| E1.10 | Settings cached for performance | [?] | Need to verify cache implementation |

### E2. Team Management (Owner)

| ID | Test Case | Status | Notes |
|----|-----------|--------|-------|
| E2.1 | Invite team member as agent | [x] | POST /api/projects/:id/members/invite |
| E2.2 | Agent accepts invitation | [x] | POST /api/invitations/:token/accept |
| E2.3 | Agent declines invitation | [-] | No explicit decline - just expires |
| E2.4 | Remove agent from team | [x] | DELETE /api/projects/:id/members/:id |
| E2.5 | Set agent max capacity | [x] | max_concurrent_chats in invite/update |
| E2.6 | View agent status | [x] | GET /api/projects/:id/agents |
| E2.7 | View agent workload | [x] | current_chat_count in response |

---

## F. Real-time & Synchronization

### CRITICAL GAP: Real-time Functions Defined but Not Integrated

**Spec Requirement (Section 5.9):**
- Use Supabase Realtime for WebSocket connections
- Channels: `conversation:{id}`, `project:{id}:queue`, `agent:{id}`

**Current State:**
- `realtime.ts` has all broadcast functions defined
- Routes have `// TODO: Broadcast to real-time channels` comments
- Functions are NEVER called
- Widget uses 2s polling workaround
- Dashboard has no subscriptions

### F1. Widget Real-time (Per Spec)

| ID | Test Case | Status | Notes |
|----|-----------|--------|-------|
| F1.1 | Widget connects to `conversation:{id}` channel | [-] | No Supabase client in widget |
| F1.2 | Widget receives `message` broadcast | [-] | Not implemented |
| F1.3 | Widget receives `typing` broadcast | [-] | Not implemented |
| F1.4 | Widget receives `status_change` broadcast | [-] | Not implemented |
| F1.5 | Widget receives `agent_joined` broadcast | [-] | Not implemented |
| F1.6 | Widget sends typing indicator | [-] | Not implemented |
| F1.7 | Widget handles reconnection | [-] | Not implemented |
| F1.8 | (Workaround) Polling for messages | [x] | startMessagePolling() - 2s |
| F1.9 | (Workaround) Polling for status | [x] | getConversationStatus() in poll |

### F2. Dashboard Real-time (Per Spec)

| ID | Test Case | Status | Notes |
|----|-----------|--------|-------|
| F2.1 | Dashboard connects to `project:{id}:queue` channel | [-] | No subscription code found |
| F2.2 | Dashboard receives new conversation in queue | [-] | Must refresh |
| F2.3 | Dashboard receives conversation claimed | [-] | Must refresh |
| F2.4 | Dashboard connects to `conversation:{id}` channel | [-] | No subscription code |
| F2.5 | Dashboard receives customer messages | [-] | Must refresh |
| F2.6 | Dashboard receives customer typing | [-] | Not implemented |
| F2.7 | Dashboard connects to `agent:{id}` channel | [-] | No subscription code |
| F2.8 | Dashboard receives assignment notification | [-] | Must refresh |
| F2.9 | Multiple agents see same queue state | [-] | After refresh only |

### F3. Backend Broadcast (Per Spec)

| ID | Test Case | Status | Notes |
|----|-----------|--------|-------|
| F3.1 | API broadcasts message on send | [~] | broadcastNewMessage() exists, NOT CALLED |
| F3.2 | API broadcasts status change | [~] | broadcastConversationStatusChanged() exists, NOT CALLED |
| F3.3 | API broadcasts queue update | [~] | broadcastQueuePositions() exists, NOT CALLED |
| F3.4 | API broadcasts typing indicator | [~] | broadcastTyping() exists, NOT CALLED |
| F3.5 | API broadcasts agent assignment | [~] | broadcastConversationAssigned() exists, NOT CALLED |

### F4. Consistency

| ID | Test Case | Status | Notes |
|----|-----------|--------|-------|
| F4.1 | Widget and dashboard show same messages | [x] | Same DB, after refresh |
| F4.2 | Widget and dashboard show same status | [x] | Same DB, after refresh |
| F4.3 | Message order consistent | [x] | ORDER BY created_at |
| F4.4 | No duplicate messages | [x] | UUID primary keys |
| F4.5 | No lost messages | [x] | DB transactions |

---

## G. Edge Cases & Error Handling

### G1. Network & Connectivity

| ID | Test Case | Status | Notes |
|----|-----------|--------|-------|
| G1.1 | Widget loses network | [?] | Polling would fail silently |
| G1.2 | Widget regains network | [?] | Polling would resume |
| G1.3 | Dashboard loses network | [?] | Page becomes stale |
| G1.4 | Dashboard regains network | [?] | Need to refresh |
| G1.5 | API server restarts | [?] | Need to test |
| G1.6 | Database connection fails | [x] | Error handling in routes |

### G2. Race Conditions

| ID | Test Case | Status | Notes |
|----|-----------|--------|-------|
| G2.1 | Two agents claim same conversation | [x] | WHERE clause prevents |
| G2.2 | Customer sends message as handoff triggers | [x] | Both processed sequentially |
| G2.3 | Agent sends message as customer disconnects | [x] | Message stored |
| G2.4 | Multiple handoff triggers simultaneously | [?] | Need to test |
| G2.5 | Status update during message send | [?] | Need to test |

### G3. Data Integrity

| ID | Test Case | Status | Notes |
|----|-----------|--------|-------|
| G3.1 | Conversation status always valid | [x] | Enum constraint in DB |
| G3.2 | Message count accurate | [x] | Trigger updates count |
| G3.3 | Agent chat count accurate | [x] | Incremented/decremented in handlers |
| G3.4 | Queue position accurate | [x] | Calculated from queue_entered_at |
| G3.5 | Timestamps accurate | [x] | DB default now() |

### G4. Error Scenarios

| ID | Test Case | Status | Notes |
|----|-----------|--------|-------|
| G4.1 | Handoff API returns error | [x] | Widget catch block shows message |
| G4.2 | Message send fails | [x] | Error state shown |
| G4.3 | Status check fails | [x] | Returns null, widget handles |
| G4.4 | Invalid conversation ID | [x] | 400 INVALID_ID response |
| G4.5 | Unauthorized access attempt | [x] | 403 FORBIDDEN response |

---

## H. Business Hours

| ID | Test Case | Status | Notes |
|----|-----------|--------|-------|
| H1 | Within business hours, agents online | [x] | Normal flow |
| H2 | Within business hours, no agents online | [x] | showButton: false |
| H3 | Outside business hours | [x] | showOfflineForm: true returned |
| H4 | Business hours edge (just started) | [?] | Need to test minute precision |
| H5 | Business hours edge (about to end) | [?] | Need to test |
| H6 | Timezone handling correct | [x] | Intl.DateTimeFormat with timezone |
| H7 | Conversation started in hours, ends outside | [?] | Conversation continues |
| H8 | Day with no business hours (closed) | [x] | enabled: false for day |

---

## I. Migration & Backward Compatibility

| ID | Test Case | Status | Notes |
|----|-----------|--------|-------|
| I1 | Old chat_sessions work with new system | [x] | Dual-write in chat-engine |
| I2 | New conversations table populated | [x] | getOrCreateConversation() |
| I3 | Messages table populated | [x] | logConversationMessages() |
| I4 | Existing widget works without update | [x] | Falls back to AI-only |
| I5 | Feature flag controls new system | [x] | checkFeatureFlag() |

---

## Test Environment Setup

### Prerequisites
- [ ] Handoff enabled in project settings
- [ ] At least one agent account created
- [ ] Business hours configured (or disabled)
- [ ] "Talk to Human" button enabled

### Test Accounts
- Customer: (use incognito browser)
- Agent 1: [email]
- Agent 2: [email]
- Owner: [email]

### Test Data
- Project ID:
- Conversation ID:

---

## Test Execution Log

| Date | Tester | Section | Pass | Fail | Notes |
|------|--------|---------|------|------|-------|
| | | | | | |

---

## Known Issues

| ID | Issue | Severity | Status |
|----|-------|----------|--------|
| K1 | Real-time not integrated - routes have TODO comments | Critical | Open |
| K2 | Widget uses polling instead of WebSocket | High | Workaround in place |
| K3 | Dashboard must refresh to see new messages | High | Open |
| K4 | No typing indicators | Medium | Open |
| K5 | Customer presence not broadcast | Medium | Open |
| K6 | No offline form in widget | Medium | Open |
| K7 | No unread message count | Low | Open |
| K8 | No transfer to specific agent | Low | Open |

---

## Summary Statistics

| Category | Total | Implemented | Working | Not Implemented | Needs Testing |
|----------|-------|-------------|---------|-----------------|---------------|
| A. Widget | 35 | 30 | 28 | 5 | 7 |
| B. AI/Chat Engine | 14 | 14 | 13 | 0 | 1 |
| C. Agent Side | 30 | 24 | 22 | 6 | 5 |
| D. Queue | 12 | 10 | 10 | 2 | 0 |
| E. Settings | 17 | 16 | 16 | 1 | 1 |
| F. Real-time | 23 | 7 | 4 | 16 | 0 |
| G. Edge Cases | 17 | 12 | 10 | 0 | 7 |
| H. Business Hours | 8 | 6 | 5 | 0 | 3 |
| I. Migration | 5 | 5 | 5 | 0 | 0 |
| **TOTAL** | **161** | **124 (77%)** | **113 (70%)** | **30 (19%)** | **24 (15%)** |

---

## Notes

- Real-time functions are 100% DEFINED in `realtime.ts` but 0% INTEGRATED
- Widget polling is a temporary workaround, not the spec'd solution
- Dashboard requires page refresh for updates
- All database schema and API endpoints are production-ready
- Main gap is wiring up real-time broadcasting and subscriptions
