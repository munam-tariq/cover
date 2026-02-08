# SupportBase — Complete Chat & Voice Implementation Flow

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         BROWSER (Widget)                            │
│                                                                     │
│  ┌──────────┐   ┌──────────────┐   ┌──────────────────────────┐    │
│  │  Bubble   │──▶│  ChatWindow  │──▶│  Input / VoiceOverlay    │    │
│  └──────────┘   └──────┬───────┘   └──────────────────────────┘    │
│                        │                                            │
│              ┌─────────┴──────────┐                                 │
│              ▼                    ▼                                  │
│     ┌──────────────┐    ┌──────────────────┐                       │
│     │  Text Chat   │    │  Voice (Vapi SDK)│                       │
│     │  via HTTP    │    │  via WebSocket   │                       │
│     └──────┬───────┘    └────────┬─────────┘                       │
└────────────┼─────────────────────┼──────────────────────────────────┘
             │                     │
             ▼                     ▼
┌────────────────────────────────────────────────────────────────────┐
│                        API SERVER (Express)                        │
│                                                                    │
│  ┌─────────────────┐  ┌──────────────┐  ┌────────────────────┐   │
│  │ /api/chat/*     │  │ /api/vapi/*  │  │ /api/conversations │   │
│  │ (chat-engine)   │  │ (webhooks)   │  │ (handoff)          │   │
│  └────────┬────────┘  └──────┬───────┘  └────────┬───────────┘   │
│           │                  │                    │                │
│           └────────┬─────────┴────────────────────┘                │
│                    ▼                                               │
│  ┌──────────────────────────────────────────────────────┐         │
│  │              SHARED SERVICES                          │         │
│  │  • RAG v2 (hybrid vector + FTS)                      │         │
│  │  • Lead Capture V2 (interceptor + qualifying)        │         │
│  │  • Conversation Service (getOrCreate, addMessage)    │         │
│  │  • Late Answer Detector                              │         │
│  └──────────────────────────────────────────────────────┘         │
└────────────────────────────────────────────────────────────────────┘
             │                     │
             ▼                     ▼
     ┌──────────────┐     ┌──────────────┐
     │   Supabase   │     │   OpenAI     │
     │  (Postgres)  │     │  (gpt-4o-m)  │
     └──────────────┘     └──────────────┘
```

---

## Part 1: Widget Initialization

```
User loads page with <script data-project-id="..." src="widget.js">
│
▼
widget.ts: Auto-init reads data-project-id from script tag
│
├─▶ GET /api/embed/config/:projectId
│     Returns: { enabled, title, greeting, primaryColor,
│                leadCapture: {...}, leadRecovery: {...},
│                voice: { enabled, vapiPublicKey, assistantId, greeting },
│                realtime: { supabaseUrl, supabaseAnonKey } }
│
├─▶ Creates Shadow DOM container
├─▶ Creates Bubble (floating button)
├─▶ Creates ChatWindow with all config
│     │
│     ├─▶ storage.ts: getVisitorId()      → "vis_xxx" (persisted in localStorage)
│     ├─▶ storage.ts: getSessionId(pid)   → conversation UUID or null
│     ├─▶ storage.ts: getStoredMessages() → last 50 messages
│     ├─▶ storage.ts: getLeadCaptureState()
│     │
│     ├─▶ initializeLeadCaptureState()
│     │     GET /api/chat/lead-capture/status?projectId=X&visitorId=Y
│     │     → { hasCompletedForm, hasCompletedQualifying, leadCaptureState }
│     │     → If not completed: shows LeadCaptureForm
│     │
│     ├─▶ initializeConversationState()
│     │     GET /api/widget/conversations/:id/status
│     │     → { status: "ai_active"|"waiting"|"agent_active" }
│     │     → If handoff: starts realtime/polling
│     │
│     └─▶ updateVoiceButtonState()
│           → Disabled if: lead capture pending OR handoff active
│
└─▶ User sees chat widget bubble
```

**Data stored in localStorage:**
| Key | Value | Purpose |
|-----|-------|---------|
| `chatbot_visitor_id` | `vis_abc123` | Persistent across sessions |
| `chatbot_session_{pid}` | `conv-uuid` | Current conversation |
| `chatbot_messages_{pid}` | `[{id,role,content,timestamp}]` | Message history (max 50) |
| `chatbot_lead_state_{pid}` | `{hasCompletedForm, hasCompletedQualifying}` | Skip form on return |

---

## Part 2: Text Chat Flow (Complete)

```
User types message and hits Enter
│
▼
ChatWindow.handleSend(content)
│
├─1─▶ Creates StoredMessage { id, content, role:"user", timestamp }
│     → Appends to this.messages[]
│     → Saves to localStorage
│     → Shows in DOM
│
├─2─▶ Shows typing indicator
│
├─3─▶ POST /api/chat/message
│     Body: {
│       projectId, message, visitorId, sessionId,
│       conversationHistory: last 10 messages,
│       source: "widget",
│       context: { pageUrl, pageTitle, browser, os, device, timezone }
│     }
│
│     ════════════════════════════════════════════════════════════
│     SERVER: chat-engine.ts → processChat(input)
│     ════════════════════════════════════════════════════════════
│     │
│     ├─ Step 1: Sanitize input
│     │
│     ├─ Step 2: CHECK HANDOFF STATE
│     │   SELECT status FROM conversations WHERE id = sessionId
│     │   ┌─ If "waiting" or "agent_active":
│     │   │   → INSERT INTO messages (sender_type='customer')
│     │   │   → return { response: "" }    ◄── AI stays silent
│     │   └─ If "ai_active": continue ▼
│     │
│     ├─ Step 3: LEAD CAPTURE V2 INTERCEPTOR  ◄── SHORT-CIRCUIT
│     │   leadCaptureV2Interceptor(projectId, visitorId, sessionId, msg)
│     │   │
│     │   ├─ Check: V2 enabled? Customer exists? State exists?
│     │   ├─ Check: qualifying_status === "in_progress"?
│     │   │   └─ If not in_progress: return null (normal chat)
│     │   │
│     │   ├─ Check: Human intent keywords?
│     │   │   └─ If yes: return null (let handoff handle)
│     │   │
│     │   ├─ CLASSIFY INTENT via OpenAI:
│     │   │   "Is this an answer, new_question, or off_topic?"
│     │   │
│     │   ├─ If "answer":
│     │   │   ├─ Extract clean answer via OpenAI
│     │   │   ├─ UPDATE customers.lead_capture_state.qualifying_answers
│     │   │   ├─ UPDATE qualified_leads.qualifying_answers
│     │   │   ├─ If more Qs: return next question message
│     │   │   └─ If done: markAsQualified() → return completion msg
│     │   │
│     │   ├─ If "new_question":
│     │   │   ├─ Check for embedded answer (e.g. "500 orders, what's pricing?")
│     │   │   │   └─ If found: save answer + set qualifying_paused=true
│     │   │   └─ Set qualifying_paused=true → return null (let chat answer)
│     │   │
│     │   └─ If "off_topic":
│     │       └─ Skip question → ask next or complete
│     │
│     │   IF INTERCEPTOR RETURNED RESPONSE:
│     │   → getOrCreateConversation()
│     │   → addMessage(user msg) + addMessage(qualifying response)
│     │   → return { response: qualifyingQuestion, sessionId }  ◄── EXIT
│     │
│     ├─ Step 4: Get project config (cached)
│     │   SELECT settings FROM projects WHERE id = projectId
│     │   → system_prompt, support_email, handoff_settings, etc.
│     │
│     ├─ Step 5: CHECK HANDOFF TRIGGERS  ◄── SHORT-CIRCUIT
│     │   checkHandoffTrigger(message, settings.handoff_settings)
│     │   ├─ Keyword match? ("talk to human", "agent", etc.)
│     │   ├─ Button click trigger?
│     │   └─ If triggered:
│     │       UPDATE conversations SET status='waiting'
│     │       INSERT INTO messages (system, "Connecting you...")
│     │       → return { response, handoff: {triggered:true} }  ◄── EXIT
│     │
│     ├─ Step 6: RAG v2 RETRIEVAL
│     │   retrieve(projectId, message, {topK:5, threshold:0.15, hybrid:true})
│     │   │
│     │   ├─ Vector search: pgvector cosine similarity
│     │   ├─ FTS search: PostgreSQL ts_rank
│     │   └─ RRF fusion: combines both scores
│     │   → chunks[] = [{content, combinedScore, sourceName}]
│     │
│     ├─ Step 7: LOW CONFIDENCE HANDOFF  ◄── SHORT-CIRCUIT
│     │   If max(chunk.score) < threshold AND low_confidence_handoff enabled:
│     │   → Same as Step 5 handoff flow
│     │
│     ├─ Step 8: BUILD SYSTEM PROMPT
│     │   buildSystemPrompt({
│     │     projectName, personality: settings.systemPrompt,
│     │     knowledgeContext: formatted chunks,
│     │     tools: [{captureLead}, {handoffToHuman}]
│     │   })
│     │
│     ├─ Step 9: LLM CALL WITH TOOLS
│     │   callLLMWithTools({
│     │     model: "gpt-4o-mini",
│     │     messages: [system, ...conversationHistory, user],
│     │     tools: tool definitions,
│     │     max_tokens: 800, temperature: 0.7
│     │   })
│     │   │
│     │   └─ ITERATIVE TOOL LOOP (max 3):
│     │       OpenAI response → tool_calls?
│     │       ├─ Yes: execute tools → add results → call again
│     │       └─ No:  return final text response
│     │
│     ├─ Step 10: GET/CREATE SESSION
│     │   getOrCreateConversation(projectId, visitorId, sessionId)
│     │   → conversation UUID
│     │
│     ├─ Step 11: V2 LEAD CAPTURE HOOKS (post-response)
│     │   ├─ If qualified: append "we have your email" note
│     │   ├─ If V3 high-intent detected: trigger inline email
│     │   └─ If V3 summary hook threshold: offer email summary
│     │
│     ├─ Step 12: RE-ASK QUALIFYING QUESTION
│     │   If qualifying_paused=true:
│     │   → Append "Oh, one thing I forgot to ask — {question}"
│     │   → Increment retry_count (max 2 before skip)
│     │
│     ├─ Step 13: LATE ANSWER DETECTION (async, non-blocking)
│     │   scanAndSaveLateAnswers(projectId, visitorId, message)
│     │   → Checks if message contains answers to skipped questions
│     │   → Auto-promotes with confidence > 0.7
│     │
│     ├─ Step 14: LOG CONVERSATION
│     │   addMessage(conversationId, "customer", userMessage)
│     │   addMessage(conversationId, "ai", aiResponse)
│     │   UPDATE conversations SET message_count++, last_message_at=now
│     │
│     └─ Step 15: RETURN
│         { response, sessionId, sources[], toolCalls[], processingTime }
│     ════════════════════════════════════════════════════════════
│
├─4─▶ Update this.sessionId, save to localStorage
│
├─5─▶ Create assistant StoredMessage, add to DOM
│
└─6─▶ Hide typing indicator
```

---

## Part 3: Voice Call Flow (Complete)

```
User clicks voice button (header or input)
│
▼
ChatWindow.initiateVoiceCall()
│
├─ Guard: isVoiceCallActive? → return
├─ Guard: voiceConfig.enabled? → return
├─ Guard: conversation in handoff? → return
│
▼
showVoicePermissionPrompt()
│
├─ navigator.permissions.query({name:"microphone"})
│   ├─ "granted" → skip prompt, go to startVoiceCall()
│   └─ not granted → show VoicePermissionPrompt component
│       ├─ User clicks "Allow" → startVoiceCall()
│       └─ User clicks "Cancel" → dismiss
│
▼
startVoiceCall()
│
├─1─▶ ENSURE CONVERSATION EXISTS (P5)
│     If this.sessionId is null:
│     POST /api/chat/ensure-conversation
│     Body: { projectId, visitorId }
│     ════════════════════════════
│     SERVER: getOrCreateConversation(projectId, visitorId)
│     → Finds existing active conv or creates new one
│     → Returns { conversationId }
│     ════════════════════════════
│     → this.sessionId = conversationId
│     → Save to localStorage
│
├─2─▶ Set isVoiceCallActive = true
│
├─3─▶ Create VoiceCallOverlay → show "connecting" state
│
├─4─▶ DISABLE TEXT INPUT
│     this.input.setDisabled(true, "Voice call in progress")
│
├─5─▶ FETCH FRESH VOICE CONFIG (includes dynamic system prompt)
│     GET /api/vapi/config/:projectId?visitorId=vis_xxx
│     │
│     │  ════════════════════════════════════════════════
│     │  SERVER: vapi-config.ts
│     │  ════════════════════════════════════════════════
│     │  │
│     │  ├─ Fetch project settings (name, systemPrompt, voice_greeting)
│     │  │
│     │  ├─ LOOK UP ANSWERED QUALIFYING QUESTIONS (P1)
│     │  │   getCustomerByVisitorId(projectId, visitorId)
│     │  │   → customer.lead_capture_state.qualifying_answers
│     │  │   → Filter out [skipped], get question texts
│     │  │   → answeredQuestions = ["What's your company size?", ...]
│     │  │
│     │  ├─ BUILD VOICE SYSTEM PROMPT
│     │  │   buildVoiceSystemPrompt(projectName, settings, answeredQuestions)
│     │  │   │
│     │  │   ├─ Base: "You are a helpful voice assistant for {name}."
│     │  │   ├─ Personality: settings.systemPrompt (if any)
│     │  │   ├─ Voice guidelines (concise, natural, no markdown)
│     │  │   └─ Qualifying questions section:
│     │  │       ├─ ONLY unanswered questions included
│     │  │       ├─ Note: "do NOT re-ask: [answered list]"
│     │  │       └─ If ALL answered: section omitted entirely
│     │  │
│     │  └─ Return:
│     │      {
│     │        voiceEnabled: true,
│     │        vapiPublicKey: "pk_xxx",
│     │        assistantId: "asst_xxx",
│     │        greeting: "Hi! How can I help you today?",
│     │        assistantOverrides: {
│     │          firstMessage: greeting,
│     │          model: {
│     │            provider: "openai",
│     │            model: "gpt-4o-mini",
│     │            messages: [{ role: "system", content: DYNAMIC_PROMPT }]
│     │          },
│     │          variableValues: { companyName, projectId, greeting }
│     │        }
│     │      }
│     │  ════════════════════════════════════════════════
│
├─6─▶ LOAD VAPI SDK (dynamic import, only when needed)
│     import("@vapi-ai/web") → VapiClass
│     const vapi = new VapiClass(vapiPublicKey)
│
├─7─▶ WIRE UP VAPI EVENTS
│     │
│     ├─ vapi.on("call-start")
│     │   → overlay.setState("active-listening")
│     │
│     ├─ vapi.on("call-end")
│     │   → overlay.setState("ended")
│     │   → isVoiceCallActive = false
│     │   → input.setDisabled(false)  ◄── RE-ENABLE TEXT INPUT (E1)
│     │   → Add "Voice call ended" message to chat
│     │   → REFRESH LEAD STATE AFTER 5s (P6):
│     │       setTimeout(5000) → GET /api/chat/lead-capture/status
│     │       → If hasCompletedQualifying: update localStorage
│     │       → Text chat won't re-ask questions answered in voice
│     │
│     ├─ vapi.on("speech-start")
│     │   → overlay.setState("active-speaking")
│     │
│     ├─ vapi.on("speech-end")
│     │   → overlay.setState("active-listening")
│     │
│     ├─ vapi.on("message")
│     │   → If type="transcript" && transcriptType="final":
│     │     → overlay.addTranscript(role, text)
│     │     → Also add to this.messages[] for chat history
│     │
│     ├─ vapi.on("volume-level")
│     │   → overlay.setAmplitude(level/100)
│     │
│     └─ vapi.on("error")
│         → overlay.setState("error")
│         → isVoiceCallActive = false
│
├─8─▶ BUILD ASSISTANT OVERRIDES
│     {
│       ...freshConfig.assistantOverrides,
│       variableValues: {
│         companyName, projectId, greeting,
│         visitorId: this.visitorId,          ◄── INJECTED BY WIDGET
│         conversationId: this.sessionId      ◄── INJECTED BY WIDGET
│       }
│     }
│
└─9─▶ vapi.start(assistantId, overrides)
      │
      │  ┌──────────────────────────────────────────────┐
      │  │         VAPI CLOUD (External Service)        │
      │  │                                              │
      │  │  Receives: assistantId + overrides           │
      │  │  Uses: model override (gpt-4o-mini)          │
      │  │  Uses: system prompt from overrides          │
      │  │  Uses: variableValues for webhook context    │
      │  │                                              │
      │  │  Sends webhook events to our server:         │
      │  │  → status-update (in-progress, ended)        │
      │  │  → knowledge-base-request                    │
      │  │  → tool-calls                                │
      │  │  → transcript (real-time)                    │
      │  │  → end-of-call-report                        │
      │  └──────────────────────────────────────────────┘


═══════════════════════════════════════════════════════════
 VAPI WEBHOOK EVENTS (server receives during voice call)
═══════════════════════════════════════════════════════════

EVENT: status-update (in-progress)
│
├─ Extract from call.assistantOverrides.variableValues:
│   projectId, visitorId, conversationId
│
├─ Check if call already linked to conversation
│   SELECT id FROM conversations WHERE voice_call_id = callId
│
├─ If conversationId provided:
│   SELECT id FROM conversations WHERE id=conversationId
│   UPDATE conversations SET
│     is_voice_call = true,
│     voice_provider = 'vapi',
│     voice_call_id = callId
│   → LINKS voice call to existing text conversation
│
└─ If NO conversationId:
    INSERT INTO conversations (
      project_id, visitor_id, customer_id,
      status = 'ai_active',
      source = 'voice',
      is_voice_call = true,
      voice_provider = 'vapi',
      voice_call_id = callId
    )
    → Creates NEW voice-only conversation

────────────────────────────────────────────────────────

EVENT: knowledge-base-request
│
├─ Extract latest user message from call transcript
│
├─ REUSES SAME RAG PIPELINE AS TEXT CHAT:
│   retrieve(projectId, query, {topK:5, threshold:0.15, hybrid:true})
│   → vector search + FTS + RRF fusion
│
└─ Return to Vapi:
    { documents: [{ content, similarity, uuid }] }
    → Vapi injects into LLM context for response

────────────────────────────────────────────────────────

EVENT: tool-calls
│
├─ Tool: "captureLead"
│   Arguments: { name, email, phone }
│   │
│   ├─ UPDATE customers SET email, name, phone
│   └─ UPSERT qualified_leads SET
│       capture_source = 'voice',
│       qualification_status = 'qualified'
│
└─ Tool: "handoffToHuman"
    Arguments: { reason }
    │
    ├─ UPDATE conversations SET
    │   status = 'waiting',
    │   handoff_reason = reason,
    │   handoff_triggered_at = now
    │
    └─ INSERT INTO messages (system, "Customer requested human agent...")

────────────────────────────────────────────────────────

EVENT: transcript (real-time, during call)
│
├─ Filter: only transcriptType="final"
│
├─ Find conversation by voice_call_id
│
└─ INSERT INTO messages (
     conversation_id,
     sender_type = 'customer' | 'ai',
     content = transcript text,
     metadata = { source: 'voice', voice_call_id }
   )
   → Messages appear in dashboard inbox in real-time

────────────────────────────────────────────────────────

EVENT: end-of-call-report (after call ends)
│
├─ Extract from message:
│   endedReason, summary, transcript, recordingUrl,
│   cost, costBreakdown, artifact.messages (full call log)
│
├─ Calculate duration from call.startedAt/endedAt
│
├─ Find conversation by voice_call_id
│
├─1─▶ UPDATE conversations SET
│     voice_duration_seconds = duration,
│     voice_cost = totalCost,
│     voice_recording_url = recordingUrl,
│     voice_transcript = callMessages,
│     voice_ended_reason = endedReason
│     ★ NO auto-resolve — keeps existing status (P3)
│
├─2─▶ BACKFILL MESSAGES (if not already logged via transcript events)
│     SELECT count FROM messages WHERE conversation_id = X
│     If count == 0:
│       For each callMessage: INSERT INTO messages
│
├─3─▶ ADD SUMMARY MESSAGE
│     INSERT INTO messages (
│       sender_type = 'system',
│       content = 'Voice call ended (M:SS). Summary: ...',
│       metadata = { type: 'voice_call_summary', duration, cost }
│     )
│
├─4─▶ UPDATE message_count and last_message_at
│
└─5─▶ EXTRACT QUALIFYING ANSWERS (P2, async fire-and-forget)
      extractQualifyingAnswersFromVoiceTranscript(projectId, visitorId, callMessages)
      │
      ├─ Get V2 settings → enabled qualifying questions
      ├─ Get customer → lead_capture_state
      ├─ Determine unanswered questions (exclude [skipped])
      ├─ Build transcript text from callMessages
      │
      ├─ SINGLE LLM CALL (gpt-4o-mini):
      │   "Given this transcript, extract answers to these questions"
      │   → { answers: [{ question, answer, confidence }] }
      │
      ├─ For each answer with confidence > 0.6:
      │   ├─ saveQualifyingAnswer() → UPDATE qualified_leads
      │   └─ UPDATE customers.lead_capture_state
      │       (qualifying_answers, current_qualifying_index)
      │
      └─ If ALL questions now answered:
          markAsQualified(customerId, projectId)
          → customers.qualifying_status = "completed"
          → qualified_leads.qualification_status = "qualified"
```

---

## Part 4: Handoff Flow

```
TRIGGER POINTS:
├─ 1. User clicks "Talk to Human" button
├─ 2. Keyword detected in message ("talk to human", "agent", etc.)
├─ 3. Low RAG confidence (no good knowledge match)
└─ 4. Voice tool call: handoffToHuman

═══════════════════════════════════════════════

Handoff triggered
│
├─ UPDATE conversations SET status = 'waiting'
├─ INSERT INTO messages (system, "Connecting you...")
│
├─ Check agent availability:
│   SELECT * FROM agent_availability
│   WHERE project_id = ? AND status = 'online'
│     AND current_chat_count < max_concurrent_chats
│   ORDER BY current_chat_count ASC
│
├─ AGENT AVAILABLE:
│   │
│   ├─ UPDATE conversations SET
│   │   status = 'agent_active',
│   │   assigned_agent_id = agentId,
│   │   claimed_at = now
│   │
│   ├─ INSERT INTO messages (system, "Connected with {agent_name}")
│   │
│   └─ BROADCAST via Supabase Realtime:
│       "conversation:assigned" → widget shows "Agent joined"
│
└─ NO AGENT AVAILABLE:
    │
    ├─ UPDATE conversations SET
    │   status = 'waiting',
    │   queue_entered_at = now
    │
    ├─ Calculate queue position
    │
    └─ INSERT INTO messages (system, "You are #N in queue")

═══════════════════════════════════════════════

Widget during handoff:
│
├─ Subscribes to Supabase Realtime channel
│   channel: "conversation:{conversationId}"
│   Events:
│   ├─ message:new     → show agent message
│   ├─ conversation:assigned → show "Agent joined"
│   ├─ typing:start/stop    → show typing indicator
│   └─ queue:position_updated → update queue display
│
├─ Voice buttons DISABLED (P4)
│   updateVoiceButtonState() → disabled=true
│   tooltip: "Voice calls unavailable during agent conversation"
│
├─ If realtime fails → falls back to polling (every 2s)
│   GET /api/widget/conversations/:id/messages?since=timestamp
│   GET /api/widget/conversations/:id/status
│
└─ When resolved/returned to AI:
    ├─ Stop realtime/polling
    ├─ Voice buttons RE-ENABLED
    └─ "Talk to Human" button re-shown
```

---

## Part 5: Data Fields & What Moves Where

### What the widget sends TO Vapi (via `vapi.start()`):

```
assistantId: "asst_xxx"     ← from /api/vapi/config
overrides: {
  firstMessage: "Hi! How can I help?",    ← from /api/vapi/config
  model: {
    provider: "openai",
    model: "gpt-4o-mini",
    messages: [{
      role: "system",
      content: "<DYNAMIC PROMPT>"         ← built by server with personality
    }]                                       + filtered qualifying Qs
  },
  variableValues: {
    companyName: "Acme Corp",             ← from /api/vapi/config
    projectId: "proj-uuid",               ← from /api/vapi/config
    greeting: "Hi! How can I help?",      ← from /api/vapi/config
    visitorId: "vis_xxx",                 ← INJECTED BY WIDGET
    conversationId: "conv-uuid"           ← INJECTED BY WIDGET
  }
}
```

### What Vapi sends TO our server (webhooks):

```
POST /api/vapi/webhook

Every event includes:
  message.call = {
    id: "call-uuid",
    assistantOverrides: {
      variableValues: {
        projectId, visitorId, conversationId    ← round-tripped back
      }
    },
    startedAt, endedAt
  }

Event-specific data:
┌──────────────────────┬─────────────────────────────────────┐
│ Event                │ Additional Data                     │
├──────────────────────┼─────────────────────────────────────┤
│ status-update        │ status: "in-progress" | "ended"     │
├──────────────────────┼─────────────────────────────────────┤
│ knowledge-base-req   │ messages: [{role, message/content}]  │
│                      │ (conversation history for RAG query) │
├──────────────────────┼─────────────────────────────────────┤
│ tool-calls           │ toolCallList: [{                     │
│                      │   id, name, arguments               │
│                      │ }]                                   │
├──────────────────────┼─────────────────────────────────────┤
│ transcript           │ role, transcript, transcriptType     │
│                      │ ("partial" | "final")                │
├──────────────────────┼─────────────────────────────────────┤
│ end-of-call-report   │ endedReason, summary, transcript,   │
│                      │ recordingUrl, cost, costBreakdown,   │
│                      │ artifact.messages (full call log)    │
└──────────────────────┴─────────────────────────────────────┘
```

### What our server sends BACK to Vapi (webhook responses):

```
┌──────────────────────┬─────────────────────────────────────┐
│ Event                │ Response                            │
├──────────────────────┼─────────────────────────────────────┤
│ knowledge-base-req   │ { documents: [{                     │
│                      │     content, similarity, uuid       │
│                      │ }] }                                │
├──────────────────────┼─────────────────────────────────────┤
│ tool-calls           │ { results: [{                       │
│                      │     toolCallId, result: JSON string │
│                      │ }] }                                │
├──────────────────────┼─────────────────────────────────────┤
│ All others           │ { received: true }                  │
└──────────────────────┴─────────────────────────────────────┘
```

---

## Part 6: State Machines

### Conversation Status

```
                    ┌─────────────┐
                    │  ai_active  │◄────────────────────────┐
                    └──────┬──────┘                         │
                           │                                │
              ┌────────────┼────────────┐                   │
              │ handoff    │ voice call │                   │
              │ trigger    │ handoff    │                   │
              ▼            │            │         "return to AI"
        ┌──────────┐       │            │                   │
        │ waiting  │       │            │                   │
        └────┬─────┘       │            │                   │
             │             │            │                   │
     agent   │             │            │                   │
     claims  │             │            │                   │
             ▼             │            │                   │
      ┌──────────────┐     │            │                   │
      │ agent_active │     │            │                   │
      └──────┬───────┘     │            │                   │
             │             │            │                   │
    resolve  │             │            │                   │
             ▼             │            │                   │
       ┌──────────┐        │            │                   │
       │ resolved │────────┴────────────┴───────────────────┘
       └──────────┘     (customer sends new message → reopens)
```

### Lead Capture Status

```
┌─────────┐     show form     ┌────────────┐
│ pending │──────────────────▶│ form_shown │
└────┬────┘                   └─────┬──────┘
     │                              │
     │ skip                         │ submit
     ▼                              ▼
┌──────────┐               ┌────────────────┐
│ deferred │               │ form_completed │
└──────────┘               └───────┬────────┘
     │                             │
     │ re-ask                      │ has qualifying Qs
     └─────▶ pending               ▼
                            ┌─────────────┐
                     ┌──────│ qualifying  │
                     │      └──────┬──────┘
                     │             │ all answered
                     │             ▼
                     │      ┌───────────┐
                     └─────▶│ qualified │  ★ FINAL
                  (skip all)└───────────┘
```

### Qualifying Status

```
┌─────────┐   form submitted   ┌─────────────┐
│ pending │───────────────────▶│ in_progress │
└─────────┘                    └──────┬──────┘
                                      │
                         ┌────────────┼────────────┐
                         │            │            │
                    user asks    all answered  max retries
                    new question      │        / off-topic
                         │            │            │
                         ▼            ▼            ▼
                   qualifying    ┌───────────┐   skip to
                   _paused=true  │ completed │   next Q
                         │       └───────────┘
                         │            ▲
                    AI answers        │
                    their Q           │
                         │            │
                    re-ask     voice extraction
                    qualifying  finds answers
                    question         │
                         └───────────┘
```

---

## Part 7: What's Shared vs. Separate

```
┌────────────────────────────────────────────────────────────────┐
│                     SHARED (reused by both)                     │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  • RAG v2 hybrid search        (retrieve, extractSources)      │
│  • Conversation service        (getOrCreateConversation)       │
│  • Message service             (addMessage to DB)              │
│  • Lead capture V2             (qualifying state, answers)     │
│  • Customer table              (visitor tracking, state)       │
│  • qualified_leads table       (lead records)                  │
│  • Knowledge base              (same documents for both)       │
│  • Handoff system              (both can trigger handoff)      │
│  • Dashboard inbox             (all messages in one view)      │
│                                                                 │
├────────────────────────────────────────────────────────────────┤
│                   TEXT CHAT ONLY                                 │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  • chat-engine.ts processChat()   (full pipeline)              │
│  • System prompt builder          (with tool definitions)      │
│  • Iterative tool calling loop    (max 3 iterations)           │
│  • Lead capture V2 interceptor    (qualifying Q&A in text)     │
│  • Late answer detector           (scans messages post-hoc)    │
│  • V3 recovery hooks              (summary hook, re-ask)       │
│  • Message rate limiting          (per-visitor limits)          │
│                                                                 │
├────────────────────────────────────────────────────────────────┤
│                   VOICE ONLY                                    │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  • vapi-config.ts                (dynamic voice prompt)        │
│  • vapi.ts webhook handler       (Vapi event processing)       │
│  • Voice transcript extraction   (post-call LLM extraction)   │
│  • VoiceCallOverlay component    (call UI in widget)           │
│  • VoicePermissionPrompt         (mic permission)              │
│  • Vapi SDK integration          (dynamic import, events)      │
│  • Voice-specific DB columns     (duration, cost, recording)   │
│  • Real-time transcript logging  (messages during call)        │
│                                                                 │
├────────────────────────────────────────────────────────────────┤
│                   SYNC POINTS (voice ↔ text)                    │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  P1: Voice config filters out text-answered qualifying Qs      │
│  P2: Post-call extraction saves answers to same state machine  │
│  P3: No auto-resolve → "Continue chatting" works after call    │
│  P4: Voice buttons disabled during handoff                     │
│  P5: ensure-conversation before voice if no text session       │
│  P6: Widget refreshes lead state 5s after call ends            │
│  E1: Text input disabled during active voice call              │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

---

## Part 8: Database Tables Touched

```
conversations
├─ id, project_id, visitor_id, customer_id
├─ status: ai_active | waiting | agent_active | resolved | closed
├─ source: widget | voice
├─ is_voice_call, voice_provider, voice_call_id
├─ voice_duration_seconds, voice_cost, voice_recording_url
├─ voice_transcript, voice_ended_reason
├─ message_count, last_message_at
├─ handoff_reason, handoff_triggered_at, claimed_at
└─ assigned_agent_id

messages
├─ id, conversation_id
├─ sender_type: customer | ai | agent | system
├─ content
├─ metadata: { source: "voice"|"widget", voice_call_id, type }
└─ created_at

customers
├─ id, project_id, visitor_id
├─ email, name, phone
├─ lead_capture_state: {           ◄── JSONB, shared by both flows
│   lead_capture_status,
│   qualifying_status,
│   qualifying_answers: [{question, answer, raw_response}],
│   current_qualifying_index,
│   qualifying_paused,
│   qualifying_retry_count
│ }
└─ last_seen_at

qualified_leads
├─ id, project_id, customer_id, visitor_id
├─ email, form_data
├─ qualification_status: form_completed | qualifying | qualified
├─ qualifying_answers: [{question, answer, raw_response}]
├─ capture_source: form | voice | inline_email
├─ first_message
└─ qualification_completed_at

projects
└─ settings: {                     ◄── JSONB
     systemPrompt, voice_enabled, voice_greeting,
     lead_capture_v2: { enabled, form_fields, qualifying_questions },
     handoff_settings: { enabled, auto_triggers, ... }
   }
```
