# Voice Chat Feature - Planning & Research Document

**Feature Name**: Voice Chat with Smart Navigation
**Status**: ✅ Research Complete - Ready for Implementation
**Created**: December 2024
**Last Updated**: December 2024
**Final Decision**: Deepgram (STT: Nova-3, TTS: Aura-2) - Manual Pipeline

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Inspiration & User Experience](#2-inspiration--user-experience)
3. [Feature Breakdown](#3-feature-breakdown)
4. [Architecture Decision](#4-architecture-decision)
5. [Implementation Options](#5-implementation-options)
6. [Cost Analysis](#6-cost-analysis)
7. [Technical Deep Dive](#7-technical-deep-dive)
8. [Recommended Approach](#8-recommended-approach)
9. [Proposed Architecture](#9-proposed-architecture)
10. [Open Questions](#10-open-questions)
11. [Research Sources](#11-research-sources)
12. [Next Steps](#12-next-steps)

---

## 1. Executive Summary

### What We're Building

A voice-enabled chatbot experience that allows users to have real-time voice conversations with the AI assistant instead of typing. The feature includes two parts:

1. **Voice Chat**: Phone call-like experience where users speak and hear responses
2. **Smart Navigation**: Ability to redirect users to relevant pages/sections based on the conversation

### Why This Matters

- **Differentiation**: No competitor in the SMB chatbot space offers voice chat
- **Accessibility**: Voice is more accessible than typing for many users
- **Experience**: The "phone call" metaphor creates a more personal support experience
- **Innovation**: Positions our product as cutting-edge

### Key Decision

**Use Deepgram for voice (STT/TTS) + Our existing RAG system for intelligence**

After extensive research comparing ElevenLabs, Deepgram, and OpenAI Realtime API, we chose **Deepgram** for both Speech-to-Text (Nova-3) and Text-to-Speech (Aura-2) based on:
- **Cost efficiency**: ~$0.035/minute vs $0.08-0.19 for alternatives
- **Good quality**: Nova-3 is industry-leading STT, Aura-2 is acceptable TTS for SMB market
- **Aligned with pricing strategy**: Our target market is cost-conscious SMBs

Architecture (Manual Pipeline - Option 1):
- Deepgram handles: Speech-to-Text (Nova-3), Text-to-Speech (Aura-2)
- Our backend handles: RAG retrieval, LLM responses, API tool calling, lead capture

This keeps our product as a true platform with maximum control over every component.

---

## 2. Inspiration & User Experience

### The ElevenLabs Documentation Experience

The feature was inspired by ElevenLabs' own documentation site, which offers:

1. **Header Voice Button**: A prominent "VOICE CHAT" button in the header
2. **Widget Voice Button**: A floating widget with "Ask anything" call button
3. **Visual Feedback**: Animated orb/avatar during conversation
4. **Language Selection**: Dropdown to select language
5. **Professional Greeting**: Bot greets with welcoming message when call starts
6. **Smart Navigation**: When discussing a topic, the bot can redirect the user's screen to the relevant documentation page

### Key UX Elements Observed

```
┌─────────────────────────────────────────────────────────────────┐
│  Header Implementation:                                          │
│  ┌─────┐  ┌──────────────────┐  ┌─────────┐                     │
│  │ Orb │  │ 📞 VOICE CHAT    │  │ 🇺🇸 ▼  │                     │
│  └─────┘  └──────────────────┘  └─────────┘                     │
│           Powered by ElevenLabs Agents                          │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  Widget Implementation:                                          │
│  ┌─────────────────────────────────────────┐                    │
│  │  🌀 Need help?                          │                    │
│  │                                          │                    │
│  │  ┌────────────────────────────────────┐ │                    │
│  │  │  📞  Ask anything                  │ │                    │
│  │  └────────────────────────────────────┘ │                    │
│  │         Powered by ElevenLabs Agents    │                    │
│  └─────────────────────────────────────────┘                    │
└─────────────────────────────────────────────────────────────────┘
```

### The "Call" Metaphor

The experience deliberately mimics a phone call:
- Button shows phone icon
- Conversation starts with a greeting ("Hi, I'm here to help...")
- Natural back-and-forth voice conversation
- Can interrupt the bot mid-sentence
- Feels personal and professional

---

## 3. Feature Breakdown

### Part 1: Voice Chat Experience

**Core Functionality:**
- Voice button in widget (and optionally dashboard)
- Click to start "call" with AI assistant
- Real-time bidirectional audio streaming
- Natural conversation with interruption support
- Uses existing knowledge base and API endpoints
- Maintains session context

**User Flow:**
1. User clicks voice/call button
2. Browser requests microphone permission
3. WebRTC connection established
4. Bot greets user with welcome message
5. User speaks their question
6. Speech converted to text
7. Our RAG system processes query
8. Response converted to speech
9. User hears answer
10. Conversation continues until user ends call

**Technical Requirements:**
- WebRTC or WebSocket for real-time audio
- Speech-to-Text (STT) service
- Text-to-Speech (TTS) service
- Voice Activity Detection (VAD)
- Microphone access and audio playback
- Session state management

### Part 2: Smart Navigation/Redirect

**Core Functionality:**
- When answering about content with a known URL, offer to navigate there
- Bot says something like "Let me show you that page" and redirects
- Works with URL-scraped content (already has `source_url`)
- Can scroll to specific sections on same page

**User Flow:**
1. User asks about something (e.g., "How do I use the voice cloning API?")
2. RAG retrieves relevant content WITH source URL
3. Response includes the source URL
4. Bot explains AND offers to show the page
5. Client-side tool triggers navigation
6. User sees the relevant page while bot explains

**Technical Requirements:**
- Source URLs stored with knowledge (already have via url-scraping)
- Client-side tool/function that bot can invoke
- Navigation logic (new tab, same tab, scroll to section)
- Coordination between voice and navigation timing

---

## 4. Architecture Decision

### The Key Question

Should we use ElevenLabs' full agent system (with their knowledge base) or just their voice capabilities?

### Option A: Use ElevenLabs Agents Fully

```
User → ElevenLabs Agent → Their Knowledge Base → Their LLM → Response
```

**Pros:**
- Simpler integration
- Less code to maintain
- ElevenLabs handles everything

**Cons:**
- We become a wrapper around ElevenLabs
- Need to sync knowledge to their system
- Lose control over RAG behavior
- Can't use our API endpoint tool calling
- Can't use our lead capture logic
- Users have two sources of truth for knowledge
- Why would users choose us over ElevenLabs directly?

### Option B: Use ElevenLabs for Voice Only (RECOMMENDED)

```
User → ElevenLabs (STT) → Our Backend (RAG + LLM) → ElevenLabs (TTS) → User
```

**Pros:**
- Our RAG system remains the brain
- Single source of truth for knowledge
- All existing features work (API tools, lead capture, analytics)
- True platform, not a wrapper
- Full control over conversation logic
- Can switch voice providers later

**Cons:**
- More complex integration
- Need to handle webhook from ElevenLabs
- Slightly more latency (but acceptable)

### Decision: Option B

We will use ElevenLabs as the "voice layer" only. Our existing chat-engine handles all intelligence. This is achieved via ElevenLabs' "Custom LLM" webhook feature.

---

## 5. Implementation Options

We researched four main approaches for implementing voice chat:

### Option 1: Manual Pipeline (Build from Scratch)

**Architecture:**
```
User speaks → [STT Service] → Text → [Your Chat Engine] → Text → [TTS Service] → Audio
```

**How it works:**
1. Capture microphone audio via WebAudio API
2. Stream to STT service (e.g., Deepgram, Whisper)
3. Get transcript text
4. Send to our chat-engine
5. Get response text
6. Send to TTS service (e.g., ElevenLabs TTS API)
7. Play audio response

**Provider Options:**
- **STT**: Deepgram Nova-3, OpenAI Whisper, ElevenLabs Scribe
- **TTS**: ElevenLabs, OpenAI TTS, Deepgram Aura, Amazon Polly

**Pricing Estimate:** $0.03-0.06/minute

**Pros:**
- Cheapest option
- Full control over every component
- Can mix and match providers
- Uses existing chat-engine directly

**Cons:**
- Highest latency (300-800ms+ between components)
- Most complex to build
- Need to manage multiple WebSocket connections
- No built-in interruption handling
- VAD must be implemented manually
- Doesn't feel like a natural "call"

**Technical Complexity:** HIGH

**When to Choose:** If cost is the #1 priority and latency is acceptable

---

### Option 2: OpenAI Realtime API

**Architecture:**
```
User speaks → [WebRTC to OpenAI] → OpenAI handles STT + LLM + TTS → Audio response
```

**How it works:**
1. Establish WebRTC connection to OpenAI
2. Stream microphone audio directly
3. OpenAI handles everything in one pipeline
4. Receive audio response stream
5. Can use function calling to integrate with our backend

**Key Features:**
- WebRTC-based (lowest latency)
- Built-in VAD (Voice Activity Detection)
- Natural interruption handling
- Function calling support
- 5 voice options

**Pricing:**
- **GPT-4o-realtime-preview**: ~$0.18-0.30/minute
- **GPT-4o-mini-realtime-preview**: ~$0.10-0.16/minute

**Pros:**
- Ultra-low latency (200-300ms)
- Single API, simple integration
- Natural conversation feel
- Function calling can invoke our RAG
- Already using OpenAI (familiar)

**Cons:**
- Can't inject RAG context directly into system prompt efficiently
- More expensive than other options
- Limited voice options (5 voices)
- OpenAI's knowledge unless using tools
- Function calling adds latency

**Technical Complexity:** MEDIUM

**When to Choose:** If latency is the #1 priority and you want simplicity

**Code Example (Browser):**
```javascript
// Get ephemeral token from your backend
const tokenResponse = await fetch("/api/realtime-token");
const { token } = await tokenResponse.json();

// Create WebRTC connection
const pc = new RTCPeerConnection();

// Set up audio output
const audioEl = document.createElement("audio");
audioEl.autoplay = true;
pc.ontrack = (e) => (audioEl.srcObject = e.streams[0]);

// Add microphone input
const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
pc.addTrack(stream.getTracks()[0]);

// Create data channel for events
const dc = pc.createDataChannel("oai-events");

// Exchange SDP
const offer = await pc.createOffer();
await pc.setLocalDescription(offer);

const sdpResponse = await fetch("https://api.openai.com/v1/realtime/calls", {
    method: "POST",
    body: offer.sdp,
    headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/sdp",
    },
});

const answer = { type: "answer", sdp: await sdpResponse.text() };
await pc.setRemoteDescription(answer);
```

---

### Option 3: ElevenLabs Conversational AI (RECOMMENDED)

**Architecture:**
```
User speaks → [WebRTC to ElevenLabs] → STT → [Webhook to Your Backend] → TTS → Audio
```

**How it works:**
1. Create an ElevenLabs agent with "Custom LLM" configuration
2. Agent uses webhook to call YOUR backend for responses
3. Your backend runs RAG, returns response
4. ElevenLabs converts to speech
5. Client Tools enable browser-side actions (redirect)

**Key Features:**
- Best-in-class voice quality
- WebRTC or WebSocket connection options
- Custom LLM via webhook
- Client Tools (browser-side function calling)
- 31 languages supported
- Built-in VAD

**Pricing:**
- **Creator/Pro plans**: $0.10/minute
- **Business plan (annual)**: $0.08/minute
- **Enterprise**: Custom pricing
- **Testing calls**: Half price

**Pros:**
- Best voice quality in the industry
- Client Tools perfect for redirect feature
- Can use our RAG via webhook
- The exact UX from the inspiration
- Good latency (~300-500ms)
- Extensive language support

**Cons:**
- Need to set up webhook endpoint
- Agent creation/management via their API
- Slightly more expensive than Deepgram
- Vendor dependency on ElevenLabs

**Technical Complexity:** MEDIUM

**When to Choose:** If voice quality and UX are priorities (RECOMMENDED)

**Agent Configuration Example:**
```javascript
const agent = await elevenlabs.conversationalAi.agents.create({
    name: "Customer Support Agent",
    conversationConfig: {
        tts: {
            voiceId: "21m00Tcm4TlvDq8ikWAM", // Rachel voice
            modelId: "eleven_turbo_v2_5"
        },
        agent: {
            firstMessage: "Hi! How can I help you today?",
            prompt: {
                prompt: "You are a helpful customer support agent...",
                // Custom LLM webhook
                llm: {
                    type: "custom",
                    url: "https://your-api.com/api/voice/chat"
                }
            }
        }
    }
});
```

**Client Tool Example (for redirect):**
```javascript
const clientTools = {
    navigateToUrl: async ({ url }) => {
        window.location.href = url;
        return "Navigation initiated";
    },
    scrollToSection: async ({ sectionId }) => {
        document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
        return "Scrolled to section";
    }
};

const conversation = await Conversation.startSession({
    agentId: "<agent-id>",
    connectionType: "webrtc",
    clientTools
});
```

---

### Option 4: Deepgram Voice Agent API

**Architecture:**
```
User speaks → [WebSocket to Deepgram] → STT (Nova-3) → [LLM] → TTS (Aura) → Audio
```

**How it works:**
1. Open WebSocket to Deepgram Voice Agent endpoint
2. Configure STT, LLM, and TTS settings
3. Stream audio bidirectionally
4. Can use OpenAI/Anthropic or bring your own LLM

**Key Features:**
- All-in-one WebSocket connection
- Bring Your Own LLM option
- Strong STT accuracy (Nova-3)
- Built-in TTS (Aura)
- Simple configuration

**Pricing:**
| Tier | Pay-as-you-Go | Growth Plan |
|------|---------------|-------------|
| Standard (STT + LLM + TTS) | $0.08/min | $0.07/min |
| BYO TTS | $0.06/min | $0.05/min |
| BYO LLM | $0.07/min | $0.06/min |
| BYO LLM + TTS | $0.05/min | $0.04/min |

**Pros:**
- Cheapest all-in-one solution
- Simple WebSocket API
- BYO LLM option
- Good STT accuracy
- Single connection

**Cons:**
- Voice quality not as good as ElevenLabs
- Fewer voice options
- No client tools (redirect harder)
- Less polished "call" experience
- Smaller ecosystem

**Technical Complexity:** MEDIUM

**When to Choose:** If cost is a priority and voice quality is secondary

**Code Example:**
```javascript
const deepgram = createClient(process.env.DEEPGRAM_API_KEY);
const connection = deepgram.agent();

connection.on(AgentEvents.Welcome, () => {
    connection.configure({
        audio: {
            input: { encoding: "linear16", sample_rate: 24000 },
            output: { encoding: "linear16", sample_rate: 16000, container: "wav" }
        },
        agent: {
            language: "en",
            listen: { provider: { type: "deepgram", model: "nova-3" } },
            think: {
                provider: { type: "open_ai", model: "gpt-4o-mini" },
                prompt: "You are a friendly AI assistant."
            },
            speak: { provider: { type: "deepgram", model: "aura-2-thalia-en" } },
            greeting: "Hello! How can I help you today?"
        }
    });
});
```

---

## 6. Cost Analysis

### Cost Comparison Table

| Solution | Cost/Min | 100 calls (2min avg) | 1000 calls | Voice Quality | Latency |
|----------|----------|---------------------|------------|---------------|---------|
| Manual Pipeline | $0.03-0.06 | $6-12 | $60-120 | Good | High |
| OpenAI Realtime (mini) | $0.10-0.16 | $20-32 | $200-320 | Good | Best |
| OpenAI Realtime (full) | $0.18-0.30 | $36-60 | $360-600 | Good | Best |
| ElevenLabs ConvAI | $0.08-0.10 | $16-20 | $160-200 | **Best** | Good |
| Deepgram Voice Agent | $0.05-0.08 | $10-16 | $100-160 | Okay | Good |

### Cost Factors to Consider

1. **Average call duration**: Most support calls are 1-3 minutes
2. **Call volume**: Depends on widget traffic
3. **Testing costs**: ElevenLabs charges half price for testing
4. **Silence handling**: Some solutions charge even during silence
5. **Overages**: What happens when you exceed plan limits

### Cost Optimization Strategies

1. **Use VAD properly**: Don't stream silence
2. **Set reasonable timeouts**: Auto-end calls after inactivity
3. **Cache common responses**: For frequent questions
4. **Monitor usage**: Track per-project usage for billing
5. **Offer text fallback**: Let users choose text chat to save costs

---

## 7. Technical Deep Dive

### ElevenLabs Conversational AI - Technical Details

#### Authentication Flow

```
1. Backend creates/retrieves ElevenLabs agent for project
2. Backend generates conversation token via ElevenLabs API
3. Token passed to frontend
4. Frontend initiates WebRTC with token
5. Connection established
```

**Get Conversation Token (Backend):**
```javascript
// POST to your backend
app.post("/api/voice/token", authMiddleware, async (req, res) => {
    const { projectId } = req.body;

    // Get or create ElevenLabs agent for this project
    const agent = await getOrCreateAgent(projectId);

    // Get conversation token
    const response = await fetch(
        `https://api.elevenlabs.io/v1/convai/conversation/token?agent_id=${agent.id}`,
        {
            headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY }
        }
    );

    const { token } = await response.json();
    res.json({ token, agentId: agent.id });
});
```

#### Custom LLM Webhook

When using Custom LLM, ElevenLabs sends requests to your webhook:

**Webhook Request Format:**
```json
{
    "conversation_id": "conv_123",
    "agent_id": "agent_456",
    "user_transcript": "What is your return policy?",
    "conversation_history": [
        { "role": "assistant", "content": "Hi! How can I help?" },
        { "role": "user", "content": "What is your return policy?" }
    ]
}
```

**Webhook Response Format:**
```json
{
    "response": "Our return policy allows returns within 30 days...",
    "tools": [
        {
            "name": "navigateToUrl",
            "parameters": { "url": "https://example.com/returns" }
        }
    ]
}
```

#### Client Tools

Client tools are JavaScript functions that run in the browser:

```javascript
// Define client tools
const clientTools = {
    // Navigate to a URL
    navigateToUrl: async (params) => {
        const { url, newTab } = params;
        if (newTab) {
            window.open(url, '_blank');
        } else {
            window.location.href = url;
        }
        return { success: true };
    },

    // Scroll to section
    scrollToSection: async (params) => {
        const element = document.getElementById(params.sectionId);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
            return { success: true };
        }
        return { success: false, error: "Section not found" };
    },

    // Highlight element
    highlightElement: async (params) => {
        const element = document.querySelector(params.selector);
        if (element) {
            element.classList.add('voice-highlight');
            setTimeout(() => element.classList.remove('voice-highlight'), 3000);
            return { success: true };
        }
        return { success: false };
    }
};

// Start session with tools
const conversation = await Conversation.startSession({
    conversationToken: token,
    connectionType: "webrtc",
    clientTools
});
```

#### Agent Configuration for Custom LLM

```javascript
const agent = await elevenlabs.conversationalAi.agents.create({
    name: `Project ${projectId} Voice Agent`,
    tags: ["customer-support", projectId],
    conversationConfig: {
        tts: {
            voiceId: "21m00Tcm4TlvDq8ikWAM", // Rachel
            modelId: "eleven_turbo_v2_5"     // Fast model
        },
        agent: {
            firstMessage: project.welcomeMessage || "Hi! How can I help you today?",
            prompt: {
                prompt: project.systemPrompt || "You are a helpful assistant...",
                llm: {
                    type: "custom",
                    url: `${process.env.API_URL}/api/voice/webhook`,
                    headers: {
                        "X-Project-ID": projectId,
                        "X-Webhook-Secret": process.env.WEBHOOK_SECRET
                    }
                },
                tools: [
                    {
                        type: "client",
                        name: "navigateToUrl",
                        description: "Navigate the user's browser to a specific URL. Use when discussing content that has a source page.",
                        parameters: {
                            type: "object",
                            properties: {
                                url: { type: "string", description: "The URL to navigate to" },
                                newTab: { type: "boolean", description: "Open in new tab" }
                            },
                            required: ["url"]
                        }
                    }
                ]
            }
        }
    }
});
```

### Voice Webhook Endpoint Implementation

```javascript
// apps/api/src/routes/voice.ts

router.post('/webhook', async (req, res) => {
    // Verify webhook secret
    const secret = req.headers['x-webhook-secret'];
    if (secret !== process.env.WEBHOOK_SECRET) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const projectId = req.headers['x-project-id'];
    const { user_transcript, conversation_history } = req.body;

    // Use existing chat engine
    const result = await processChat({
        projectId,
        message: user_transcript,
        sessionId: req.body.conversation_id,
        visitorId: req.body.conversation_id, // Use conversation ID as visitor
        source: 'voice'
    });

    // Build response with potential navigation
    const response = {
        response: result.content,
        tools: []
    };

    // If we have source URLs from RAG, include navigation tool
    if (result.sources?.length > 0 && result.sources[0].source_url) {
        response.tools.push({
            name: "navigateToUrl",
            parameters: {
                url: result.sources[0].source_url,
                newTab: false
            }
        });
        // Modify response to mention navigation
        response.response += " Let me show you that page.";
    }

    res.json(response);
});
```

### Database Changes Needed

```sql
-- Add ElevenLabs agent tracking
CREATE TABLE elevenlabs_agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    elevenlabs_agent_id TEXT NOT NULL,
    voice_id TEXT DEFAULT '21m00Tcm4TlvDq8ikWAM',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(project_id)
);

-- Add voice session tracking (for analytics)
ALTER TABLE chat_sessions ADD COLUMN is_voice BOOLEAN DEFAULT FALSE;
ALTER TABLE chat_sessions ADD COLUMN voice_duration_seconds INTEGER;

-- Index for voice sessions
CREATE INDEX idx_chat_sessions_voice ON chat_sessions(project_id, is_voice) WHERE is_voice = TRUE;
```

---

## 8. Recommended Approach

### Final Decision: Deepgram Manual Pipeline (Option 1)

**Why Deepgram:**

1. **Cost Efficiency**: At ~$0.035/minute, it's the cheapest option by far. This aligns with our SMB target market and pricing strategy.

2. **Excellent STT**: Deepgram Nova-3 is industry-leading for speech-to-text accuracy and streaming support.

3. **Acceptable TTS**: Deepgram Aura-2 is "good, not great" but perfectly acceptable for customer support use cases.

4. **Full Control**: Manual pipeline gives us complete control over every component - we can optimize, debug, and switch providers for individual pieces.

5. **No Vendor Lock-in**: Unlike ElevenLabs ConvAI or OpenAI Realtime, we're not locked into a single provider's ecosystem.

6. **Aligned with Strategy**: Our target market is cost-conscious SMBs who prioritize value over premium features.

**Trade-offs Accepted:**

- Higher latency than all-in-one solutions (~500-800ms vs 200-300ms)
- No built-in interruption handling (must implement VAD ourselves)
- More complex implementation (multiple WebSocket connections)
- TTS quality not as good as ElevenLabs (but acceptable for use case)

### Implementation Priority

1. **Phase 1**: Voice chat in widget only (MVP)
2. **Phase 2**: Smart navigation/redirect feature (uses existing source URLs)
3. **Phase 3**: Voice button in dashboard playground
4. **Phase 4**: Analytics and optimization

### Fallback Options

If Deepgram doesn't work out:
1. **ElevenLabs ConvAI**: Better voice quality, higher cost ($0.08-0.10/min)
2. **OpenAI Realtime**: Best latency, highest cost ($0.10-0.30/min)

---

## 9. Proposed Architecture

### System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              BROWSER                                         │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                           WIDGET                                      │   │
│  │  ┌─────────────────┐                     ┌─────────────────────────┐ │   │
│  │  │  Voice Button   │                     │  Text Chat (existing)   │ │   │
│  │  │  "Start Call"   │                     │                         │ │   │
│  │  └────────┬────────┘                     └─────────────────────────┘ │   │
│  │           │                                                           │   │
│  │           │ Click                                                     │   │
│  │           ▼                                                           │   │
│  │  ┌─────────────────────────────────────────────────────────────────┐ │   │
│  │  │                    Voice Chat UI                                 │ │   │
│  │  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │ │   │
│  │  │  │ Orb/Avatar  │  │  Waveform   │  │  "Listening..." status  │  │ │   │
│  │  │  │ (animated)  │  │  Visualizer │  │  "Speaking..." status   │  │ │   │
│  │  │  └─────────────┘  └─────────────┘  └─────────────────────────┘  │ │   │
│  │  │                                                                  │ │   │
│  │  │  ┌─────────────────────────────────────────────────────────────┐│ │   │
│  │  │  │                    End Call Button                          ││ │   │
│  │  │  └─────────────────────────────────────────────────────────────┘│ │   │
│  │  └─────────────────────────────────────────────────────────────────┘ │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                    │                                         │               │
│                    │ WebRTC Audio Stream                     │ Client Tools  │
│                    ▼                                         ▼               │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                        ElevenLabs SDK                                    ││
│  │   - Conversation.startSession()                                          ││
│  │   - Audio input/output handling                                          ││
│  │   - Client tool registration                                             ││
│  └─────────────────────────────────────────────────────────────────────────┘│
└────────────────────────────────────────│────────────────────────────────────┘
                                         │
                                         │ WebRTC
                                         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           ELEVENLABS CLOUD                                   │
│                                                                              │
│   ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐        │
│   │ Speech-to-Text  │───▶│  Agent Logic    │───▶│ Text-to-Speech  │        │
│   │ (Scribe)        │    │  (Routing)      │    │ (Turbo v2.5)    │        │
│   └─────────────────┘    └────────┬────────┘    └─────────────────┘        │
│                                   │                                          │
│                                   │ Webhook (Custom LLM)                     │
│                                   ▼                                          │
└───────────────────────────────────│─────────────────────────────────────────┘
                                    │
                                    │ HTTPS POST
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           YOUR BACKEND                                       │
│                                                                              │
│   ┌─────────────────┐                                                       │
│   │ /api/voice/     │                                                       │
│   │   webhook       │◀─────── ElevenLabs sends user transcript              │
│   └────────┬────────┘                                                       │
│            │                                                                 │
│            ▼                                                                 │
│   ┌─────────────────────────────────────────────────────────────────┐       │
│   │                     CHAT ENGINE (existing)                       │       │
│   │                                                                  │       │
│   │   ┌───────────────┐    ┌───────────────┐    ┌───────────────┐   │       │
│   │   │ RAG Retrieval │───▶│ Context Build │───▶│ LLM (GPT-4o)  │   │       │
│   │   │ (pgvector)    │    │               │    │               │   │       │
│   │   └───────────────┘    └───────────────┘    └───────────────┘   │       │
│   │          │                                          │            │       │
│   │          │                                          ▼            │       │
│   │          │                              ┌───────────────────┐    │       │
│   │          │                              │ Tool Calling      │    │       │
│   │          │                              │ (API Endpoints)   │    │       │
│   │          │                              └───────────────────┘    │       │
│   │          │                                                       │       │
│   │          ▼                                                       │       │
│   │   ┌───────────────────────────────────────────────────────┐     │       │
│   │   │ Response + Source URLs (for navigation)               │     │       │
│   │   └───────────────────────────────────────────────────────┘     │       │
│   └─────────────────────────────────────────────────────────────────┘       │
│                                                                              │
│   ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐        │
│   │ /api/voice/     │    │ Analytics       │    │ Lead Capture    │        │
│   │   token         │    │ (existing)      │    │ (existing)      │        │
│   └─────────────────┘    └─────────────────┘    └─────────────────┘        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SUPABASE                                           │
│                                                                              │
│   ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐        │
│   │ knowledge_      │    │ chat_sessions   │    │ elevenlabs_     │        │
│   │ sources         │    │ (+ is_voice)    │    │ agents          │        │
│   │ (+ source_url)  │    │                 │    │                 │        │
│   └─────────────────┘    └─────────────────┘    └─────────────────┘        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Data Flow for Voice Call

```
1. User clicks "Start Call" in widget
         │
         ▼
2. Widget requests token from backend
   GET /api/voice/token?projectId=xxx
         │
         ▼
3. Backend gets/creates ElevenLabs agent for project
   - If new: Create agent via ElevenLabs API
   - Configure with project's system prompt
   - Set webhook URL to /api/voice/webhook
         │
         ▼
4. Backend returns conversation token
   { token: "xxx", agentId: "yyy" }
         │
         ▼
5. Widget starts ElevenLabs session
   Conversation.startSession({ conversationToken, clientTools })
         │
         ▼
6. WebRTC connection established
   - Audio streaming starts
   - Agent speaks greeting
         │
         ▼
7. User speaks question
   "What is your return policy?"
         │
         ▼
8. ElevenLabs STT → transcript
   Webhook called with transcript
         │
         ▼
9. Backend processes via chat-engine
   - RAG retrieval (finds return policy content)
   - LLM generates response
   - Includes source_url if available
         │
         ▼
10. Backend returns to ElevenLabs
    {
      response: "Our return policy...",
      tools: [{ name: "navigateToUrl", parameters: { url: "..." } }]
    }
         │
         ▼
11. ElevenLabs TTS speaks response
    Triggers client tool for navigation
         │
         ▼
12. User hears answer AND sees relevant page
```

---

## 10. Open Questions

### Questions to Resolve

1. **Voice placement in widget**:
   - Separate voice button OR integrate into existing chat?
   - What happens to ongoing text conversation when voice starts?

2. **Navigation behavior**:
   - Navigate in same tab (interrupt current page)?
   - Open in new tab (preserve current context)?
   - Scroll to section (if on same domain)?
   - Should user be asked before navigation?

3. **Voice in dashboard**:
   - Add to playground page?
   - Add to header (like ElevenLabs)?
   - Both?

4. **Agent per project vs shared agent**:
   - Create unique ElevenLabs agent per project?
   - Or use one agent with project context via webhook?
   - Cost implications?

5. **Voice settings customization**:
   - Should users be able to choose voice?
   - Should users be able to customize greeting?
   - Should this be in Settings page?

6. **Mobile support**:
   - Does WebRTC work well on mobile browsers?
   - Any iOS Safari specific issues?
   - Touch interactions for voice button?

7. **Fallback behavior**:
   - What if user's browser doesn't support WebRTC?
   - What if microphone permission denied?
   - What if ElevenLabs is down?

8. **Analytics**:
   - Track voice vs text conversations separately?
   - Track call duration?
   - Track voice-specific metrics?

9. **Cost management**:
   - Set limits per project?
   - Track usage for billing?
   - Show usage in dashboard?

10. **Privacy/Security**:
    - Audio data handling?
    - GDPR compliance?
    - Should we warn users about voice recording?

---

## 11. Research Sources

### ElevenLabs Documentation
- [ElevenLabs Conversational AI Overview](https://elevenlabs.io/docs/agents-platform/quickstart)
- [Custom LLM Webhook Setup](https://elevenlabs.io/docs/agents-platform/customization/llm)
- [Client Tools Documentation](https://elevenlabs.io/docs/agents-platform/customization/tools/client-tools)
- [Knowledge Base Integration](https://elevenlabs.io/docs/agents-platform/customization/knowledge-base)
- [React SDK Documentation](https://www.npmjs.com/package/@elevenlabs/react)
- [Pricing Announcement](https://elevenlabs.io/blog/we-cut-our-pricing-for-conversational-ai)
- [API Pricing Page](https://elevenlabs.io/pricing/api)

### OpenAI Documentation
- [Realtime API Guide](https://platform.openai.com/docs/guides/realtime-conversations)
- [WebRTC Integration](https://platform.openai.com/docs/guides/realtime-webrtc)
- [Realtime API Pricing](https://platform.openai.com/docs/pricing)
- [Function Calling in Realtime](https://platform.openai.com/docs/guides/realtime-conversations#function-calling)

### Deepgram Documentation
- [Voice Agent Overview](https://developers.deepgram.com/docs/voice-agent)
- [Voice Agent API Reference](https://developers.deepgram.com/reference/voice-agent/agent)
- [Pricing Page](https://deepgram.com/pricing)
- [JavaScript SDK](https://developers.deepgram.com/docs/js-sdk)

### Third-Party Analysis
- [OpenAI Realtime API Pricing Analysis](https://frankfu.blog/openai/openai-realtime-api-measured-cost-per-minute/)
- [ElevenLabs vs OpenAI Realtime Comparison](https://elevenlabs.io/blog/comparing-elevenlabs-conversational-ai-v-openai-realtime-api)
- [Speech-to-Text API Pricing Breakdown 2025](https://deepgram.com/learn/speech-to-text-api-pricing-breakdown-2025)

### Context7 Library IDs (for future reference)
- ElevenLabs: `/websites/elevenlabs_io`
- ElevenLabs React: `/websites/npmjs_package__elevenlabs_react`
- ElevenLabs JS SDK: `/elevenlabs/elevenlabs-js`
- OpenAI Platform: `/websites/platform_openai`
- OpenAI Realtime: `/openai/openai-realtime-api-beta`
- Deepgram: `/websites/developers_deepgram`
- Deepgram JS SDK: `/deepgram/deepgram-js-sdk`

---

## 12. Next Steps

### Immediate Actions

1. **Finalize open questions** - Discuss navigation behavior, scope
2. **Create feature spec** - Detailed spec in `docs/product/features/enhanced/voice-chat/spec.md`
3. **Update feature index** - Add to `_index.md` and `progress.md`

### Implementation Order (Proposed)

1. **Voice Chat MVP (Part 1)**
   - Backend: ElevenLabs agent management, webhook endpoint
   - Widget: Voice button, audio UI, ElevenLabs SDK integration
   - Dashboard: Voice settings in project settings

2. **Smart Navigation (Part 2)**
   - Backend: Include source URLs in webhook response
   - Widget: Client tools for navigation
   - Testing: Verify navigation works correctly

3. **Polish & Analytics**
   - Voice session analytics
   - Usage tracking
   - Error handling improvements

### Environment Variables Needed

```env
# Deepgram Configuration
DEEPGRAM_API_KEY=your_deepgram_api_key_here

# Voice feature flags
VOICE_CHAT_ENABLED=true
VOICE_CHAT_MAX_DURATION_SECONDS=300  # 5 minute limit per call

# Optional: TTS Voice customization
DEEPGRAM_TTS_MODEL=aura-2-thalia-en  # Default voice
```

### Dependencies to Add

```json
// apps/api/package.json
{
  "@deepgram/sdk": "^3.0.0"
}

// apps/widget/package.json (or include via CDN)
// No SDK needed - use native WebSocket API
```

---

## Appendix A: Voice UI Component Ideas

### Call Button States

```
┌────────────────────────────────────────────────────────┐
│  IDLE STATE                                            │
│  ┌──────────────────────────────────────────────────┐ │
│  │  📞  Talk to us                                  │ │
│  └──────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────┐
│  CONNECTING STATE                                      │
│  ┌──────────────────────────────────────────────────┐ │
│  │  ⏳  Connecting...                               │ │
│  └──────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────┐
│  ACTIVE CALL STATE                                     │
│  ┌──────────────────────────────────────────────────┐ │
│  │                                                   │ │
│  │       🔵 (animated orb)                          │ │
│  │                                                   │ │
│  │       ▓▓▓░░░░░ (waveform)                        │ │
│  │                                                   │ │
│  │       "Listening..."                             │ │
│  │                                                   │ │
│  │  ┌────────────────────────────────────────────┐  │ │
│  │  │  🔴  End Call                              │  │ │
│  │  └────────────────────────────────────────────┘  │ │
│  └──────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────┐
│  SPEAKING STATE                                        │
│  ┌──────────────────────────────────────────────────┐ │
│  │                                                   │ │
│  │       🟢 (animated orb - different animation)    │ │
│  │                                                   │ │
│  │       ▓▓▓▓▓▓░░ (waveform - output)              │ │
│  │                                                   │ │
│  │       "Speaking..."                              │ │
│  │                                                   │ │
│  │  ┌────────────────────────────────────────────┐  │ │
│  │  │  🔴  End Call                              │  │ │
│  │  └────────────────────────────────────────────┘  │ │
│  └──────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────┘
```

---

## Appendix B: ElevenLabs API Quick Reference

### Create Agent

```javascript
POST /v1/convai/agents/create

{
  "name": "Project Agent",
  "conversation_config": {
    "tts": {
      "voice_id": "21m00Tcm4TlvDq8ikWAM",
      "model_id": "eleven_turbo_v2_5"
    },
    "agent": {
      "first_message": "Hello! How can I help?",
      "prompt": {
        "prompt": "System prompt here...",
        "llm": {
          "type": "custom",
          "url": "https://your-api/webhook"
        },
        "tools": [...]
      }
    }
  }
}
```

### Get Conversation Token

```javascript
GET /v1/convai/conversation/token?agent_id={agent_id}

Headers:
  xi-api-key: your_api_key

Response:
{
  "token": "ephemeral_token_here"
}
```

### Webhook Request/Response

```javascript
// ElevenLabs sends:
POST /api/voice/webhook
{
  "conversation_id": "conv_xxx",
  "agent_id": "agent_xxx",
  "user_transcript": "User's question",
  "conversation_history": [...]
}

// You respond:
{
  "response": "Your answer text",
  "tools": [
    {
      "name": "navigateToUrl",
      "parameters": { "url": "https://..." }
    }
  ]
}
```

---

**Document Version**: 1.1
**Last Updated**: December 2024
**Author**: Jordan (Product Strategist)
**Status**: ✅ Research Complete - Spec Written

---

## Appendix C: Decision Log

### Provider Decision (December 2024)

**Options Evaluated:**
| Provider | Cost/Min | Pros | Cons |
|----------|----------|------|------|
| Deepgram (STT+TTS) | ~$0.035 | Cheapest, excellent STT | Higher latency, TTS "good not great" |
| ElevenLabs ConvAI | $0.08-0.10 | Best voice quality, client tools | More expensive, vendor lock-in |
| OpenAI Realtime | $0.10-0.30 | Lowest latency, simple API | Most expensive, limited voices |
| Manual Pipeline (mixed) | $0.03-0.06 | Full control | Most complex to build |

**Final Decision**: Deepgram for both STT (Nova-3) and TTS (Aura-2)

**Rationale**:
1. Cost is #1 priority for SMB target market
2. Deepgram Nova-3 STT is industry-leading accuracy
3. Aura-2 TTS is acceptable quality for support use case
4. $0.035/min vs $0.08-0.19/min = significant cost savings
5. Full control allows future optimization

### Open Questions Resolved

| Question | Decision | Rationale |
|----------|----------|-----------|
| Voice placement in widget | Integrated voice button in chat widget | Keep UI clean, one widget |
| Navigation behavior | Same tab for same domain, new tab for external | Best UX without disruption |
| Voice in dashboard | Playground page only (MVP) | Test before expanding |
| Part 2 (redirect) scope | Include in MVP | Source URLs already exist from url-scraping |
| Agent per project | No agent - direct API calls | Simpler architecture |
| Voice customization | Basic settings (voice, greeting) | Phase 1 scope |
| Mobile support | WebSocket works on mobile | Will add mobile considerations |
| Fallback behavior | Show text chat, clear error message | Graceful degradation |
| Analytics | Track voice sessions separately | New is_voice column |
| Privacy | Add voice disclaimer in UI | GDPR consideration |

---

## Appendix D: Pricing Comparison Details

### Deepgram Pricing (Final Choice)

| Component | Model | Price | Notes |
|-----------|-------|-------|-------|
| STT | Nova-3 (streaming) | $0.0077/min | Best-in-class accuracy |
| TTS | Aura-2 | $0.030/1000 chars | ~$0.027/min (150 words/min) |
| **Total** | | **~$0.035/min** | |

### Alternative Pricing

| Provider | STT | TTS | Total/Min |
|----------|-----|-----|-----------|
| ElevenLabs Scribe + TTS | $0.0067/min | ~$0.18/min | ~$0.19/min |
| OpenAI Whisper + TTS-1 | $0.006/min | $0.0135/min | ~$0.02/min* |
| OpenAI Realtime API | Bundled | Bundled | $0.10-0.30/min |

*OpenAI Whisper has NO real-time streaming - batch only, unusable for voice chat.

### Cost Projection

| Monthly Volume | Deepgram | ElevenLabs | OpenAI Realtime |
|----------------|----------|------------|-----------------|
| 1,000 minutes | $35 | $190 | $100-300 |
| 5,000 minutes | $175 | $950 | $500-1,500 |
| 10,000 minutes | $350 | $1,900 | $1,000-3,000 |
