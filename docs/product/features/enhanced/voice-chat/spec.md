# Feature: Voice Chat with Smart Navigation

## Overview

**Feature ID**: `voice-chat`
**Category**: Enhanced (V2)
**Priority**: P1 (High - Competitive Differentiator)
**Complexity**: L (Large)
**Estimated Effort**: 6-8 days

### Summary

Enable real-time voice conversations with the AI chatbot, providing a phone call-like experience. Users can speak to the chatbot and hear spoken responses, with the ability to navigate to relevant pages based on the conversation. This feature uses Deepgram for both Speech-to-Text (Nova-3) and Text-to-Speech (Aura-2) with a manual pipeline architecture.

### Dependencies

- `chat-engine` - Reuses existing RAG and chat processing pipeline
- `widget` - Voice button integrated into existing chat widget
- `url-scraping` - Source URLs already stored for navigation feature

### Why This Feature Matters

**Competitive Differentiation**: No competitor in the SMB chatbot space offers voice chat. This positions our product as cutting-edge and innovative.

**Accessibility**: Voice is more accessible than typing for many users, including those with mobility issues or visual impairments.

**User Experience**: The "phone call" metaphor creates a more personal support experience that builds trust.

**Inspiration**: The feature was inspired by ElevenLabs' documentation site, which offers a compelling voice chat experience with smart navigation.

---

## User Stories

### Primary User Story
> As a website visitor, I want to click a voice button and talk to the chatbot instead of typing, so I can get help faster and more naturally.

### Additional Stories
1. As a visitor, I want the bot to speak its responses so I can listen while multitasking.
2. As a visitor, I want the bot to show me the relevant page when discussing content that has a source URL.
3. As a business owner, I want to offer voice support to differentiate from competitors.
4. As a business owner, I want to customize the voice greeting and voice selection.

---

## User Flow

```
+-----------------------------------------------------------------------+
|                            USER FLOW                                    |
+-----------------------------------------------------------------------+
|                                                                        |
|  STEP 1: INITIATE VOICE CHAT                                          |
|  +------------------------------------------------------------------+ |
|  |  Chat Widget (existing)                                           | |
|  |                                                                   | |
|  |  +-----------------------------------------------------------+   | |
|  |  | [Text chat messages here...]                              |   | |
|  |  +-----------------------------------------------------------+   | |
|  |                                                                   | |
|  |  +-----------------------------------------------------------+   | |
|  |  | Type a message...                    [Mic Button] [Send]  |   | |
|  |  +-----------------------------------------------------------+   | |
|  |                                                                   | |
|  |  User clicks Mic Button                                          | |
|  +------------------------------------------------------------------+ |
|                                                                        |
|  STEP 2: MICROPHONE PERMISSION                                        |
|  +------------------------------------------------------------------+ |
|  |  Browser Permission Dialog                                        | |
|  |  +-----------------------------------------------------------+   | |
|  |  | "mybusiness.com wants to use your microphone"             |   | |
|  |  |                                                            |   | |
|  |  |                         [Block]  [Allow]                   |   | |
|  |  +-----------------------------------------------------------+   | |
|  +------------------------------------------------------------------+ |
|                                                                        |
|  STEP 3: CONNECTING                                                   |
|  +------------------------------------------------------------------+ |
|  |  Voice Chat UI (replaces text input area)                        | |
|  |  +-----------------------------------------------------------+   | |
|  |  |                                                            |   | |
|  |  |           [Pulsing Circle Animation]                       |   | |
|  |  |                                                            |   | |
|  |  |              "Connecting..."                               |   | |
|  |  |                                                            |   | |
|  |  |              [Cancel Button]                               |   | |
|  |  +-----------------------------------------------------------+   | |
|  +------------------------------------------------------------------+ |
|                                                                        |
|  STEP 4: ACTIVE VOICE CALL                                            |
|  +------------------------------------------------------------------+ |
|  |  Voice Chat UI                                                    | |
|  |  +-----------------------------------------------------------+   | |
|  |  |                                                            |   | |
|  |  |        [Animated Orb - blue when listening]               |   | |
|  |  |                                                            |   | |
|  |  |        ----====----  (audio waveform)                     |   | |
|  |  |                                                            |   | |
|  |  |              "Listening..."                                |   | |
|  |  |                                                            |   | |
|  |  |        [End Call Button - Red]                            |   | |
|  |  +-----------------------------------------------------------+   | |
|  +------------------------------------------------------------------+ |
|                                                                        |
|  STEP 5: BOT SPEAKING                                                 |
|  +------------------------------------------------------------------+ |
|  |  Voice Chat UI                                                    | |
|  |  +-----------------------------------------------------------+   | |
|  |  |                                                            |   | |
|  |  |        [Animated Orb - green when speaking]               |   | |
|  |  |                                                            |   | |
|  |  |        ====----====  (audio waveform - output)            |   | |
|  |  |                                                            |   | |
|  |  |              "Speaking..."                                 |   | |
|  |  |                                                            |   | |
|  |  |     Live transcript: "Our return policy allows..."        |   | |
|  |  |                                                            |   | |
|  |  |        [End Call Button - Red]                            |   | |
|  |  +-----------------------------------------------------------+   | |
|  +------------------------------------------------------------------+ |
|                                                                        |
|  STEP 6: SMART NAVIGATION (when source URL available)                 |
|  +------------------------------------------------------------------+ |
|  |  Bot says: "Let me show you that page..."                        | |
|  |                                                                   | |
|  |  Browser navigates to: /returns (same domain)                    | |
|  |  OR opens new tab for: external-site.com (different domain)      | |
|  |                                                                   | |
|  |  Voice call continues on the new page                            | |
|  +------------------------------------------------------------------+ |
|                                                                        |
|  STEP 7: END CALL                                                     |
|  +------------------------------------------------------------------+ |
|  |  User clicks "End Call" button                                    | |
|  |                                                                   | |
|  |  Voice UI transitions back to text chat                          | |
|  |  Conversation transcript appears in chat history                 | |
|  +------------------------------------------------------------------+ |
|                                                                        |
+-----------------------------------------------------------------------+
```

---

## Functional Requirements

### Voice Button & Initiation

| ID | Requirement | Priority | Notes |
|----|-------------|----------|-------|
| VC-001 | Add microphone button to widget text input area | Must Have | Next to send button |
| VC-002 | Request microphone permission on first click | Must Have | Browser standard |
| VC-003 | Show connecting state while establishing connection | Must Have | Pulsing animation |
| VC-004 | Play greeting message when connection established | Should Have | Configurable per project |
| VC-005 | Store permission state to avoid re-prompting | Should Have | Use localStorage |

### Audio Streaming (Deepgram Integration)

| ID | Requirement | Priority | Notes |
|----|-------------|----------|-------|
| VC-006 | Stream microphone audio to backend via WebSocket | Must Have | Real-time streaming |
| VC-007 | Backend streams audio to Deepgram Nova-3 STT | Must Have | Streaming transcription |
| VC-008 | Receive transcript in real-time | Must Have | Partial + final results |
| VC-009 | Implement Voice Activity Detection (VAD) | Must Have | Detect speech start/end |
| VC-010 | Send final transcript to chat engine when speech ends | Must Have | Reuse existing RAG |
| VC-011 | Stream LLM response to Deepgram Aura-2 TTS | Must Have | Generate audio |
| VC-012 | Stream TTS audio back to client | Must Have | Real-time playback |
| VC-013 | Play audio response in browser | Must Have | Use Web Audio API |

### Voice Chat UI

| ID | Requirement | Priority | Notes |
|----|-------------|----------|-------|
| VC-014 | Show animated orb during call | Must Have | Visual feedback |
| VC-015 | Show audio waveform visualization | Should Have | Input/output indicator |
| VC-016 | Show "Listening..." / "Speaking..." status | Must Have | Clear state indication |
| VC-017 | Show live transcript of bot response | Should Have | Accessibility |
| VC-018 | Prominent "End Call" button | Must Have | Easy to find |
| VC-019 | Show call duration timer | Should Have | User awareness |
| VC-020 | Smooth transition back to text chat on end | Must Have | No jarring UI changes |

### Smart Navigation (Part 2)

| ID | Requirement | Priority | Notes |
|----|-------------|----------|-------|
| VC-021 | Include source URLs in chat response when available | Must Have | Already in RAG |
| VC-022 | Add navigation instruction to LLM response | Must Have | "Let me show you..." |
| VC-023 | Navigate to URL on same domain (same tab) | Must Have | Smooth UX |
| VC-024 | Open URL on different domain in new tab | Must Have | Don't lose context |
| VC-025 | Scroll to section if URL has anchor | Should Have | #section-id |
| VC-026 | Maintain voice call during navigation | Should Have | Seamless experience |

### Settings & Customization

| ID | Requirement | Priority | Notes |
|----|-------------|----------|-------|
| VC-027 | Enable/disable voice chat per project | Must Have | Toggle in settings |
| VC-028 | Customize voice greeting message | Should Have | Project settings |
| VC-029 | Select TTS voice from available options | Should Have | Aura-2 voices |
| VC-030 | Set max call duration (default: 5 minutes) | Should Have | Cost control |

### Error Handling & Fallbacks

| ID | Requirement | Priority | Notes |
|----|-------------|----------|-------|
| VC-031 | Show clear error if microphone permission denied | Must Have | Helpful message |
| VC-032 | Fallback to text chat if WebSocket fails | Must Have | Graceful degradation |
| VC-033 | Handle Deepgram API errors gracefully | Must Have | Retry or fallback |
| VC-034 | Auto-end call after max duration | Should Have | Cost protection |
| VC-035 | Handle browser/OS not supporting audio | Should Have | Hide voice button |

---

## Technical Architecture

### System Flow Diagram

```
+-------------------------------------------------------------------------+
|                     VOICE CHAT ARCHITECTURE                               |
+-------------------------------------------------------------------------+
|                                                                          |
|  +----------------+     WebSocket      +------------------+              |
|  |   BROWSER      | <================> |   API BACKEND    |              |
|  |                |                    |                  |              |
|  | +------------+ |                    | +-------------+  |              |
|  | | Widget     | |                    | | Voice       |  |              |
|  | | - Mic      | |  Audio chunks      | | WebSocket   |  |              |
|  | | - Audio    | | =================> | | Handler     |  |              |
|  | | - UI       | |                    | +------+------+  |              |
|  | +------------+ |                    |        |         |              |
|  |       |        |                    |        v         |              |
|  |       |        |                    | +-------------+  |    +-------+ |
|  |       |        |                    | | Deepgram    |  |    |Deepgram|
|  |       |        |                    | | STT Service |<======| Nova-3 |
|  |       |        |                    | +------+------+  |    | API    |
|  |       |        |                    |        |         |    +-------+ |
|  |       |        |                    |        | transcript             |
|  |       |        |                    |        v         |              |
|  |       |        |                    | +-------------+  |              |
|  |       |        |                    | | Chat Engine |  |              |
|  |       |        |                    | | (existing)  |  |              |
|  |       |        |                    | | - RAG       |  |              |
|  |       |        |                    | | - LLM       |  |              |
|  |       |        |                    | | - Tools     |  |              |
|  |       |        |                    | +------+------+  |              |
|  |       |        |                    |        |         |              |
|  |       |        |                    |        | response text          |
|  |       |        |                    |        v         |    +-------+ |
|  |       |        |                    | +-------------+  |    |Deepgram|
|  |       |        |  Audio stream      | | Deepgram    |======>| Aura-2 |
|  | +------------+ | <================= | | TTS Service |  |    | API    |
|  | | Web Audio  | |                    | +-------------+  |    +-------+ |
|  | | Playback   | |                    |                  |              |
|  | +------------+ |                    |                  |              |
|  +----------------+                    +------------------+              |
|                                                                          |
|  +----------------------------------------------------------------------+|
|  |                          SUPABASE                                     ||
|  | +------------------+  +------------------+  +-------------------+     ||
|  | | chat_sessions    |  | chat_messages    |  | projects          |     ||
|  | | - is_voice       |  | - is_voice       |  | - voice_enabled   |     ||
|  | | - voice_duration |  |                  |  | - voice_greeting  |     ||
|  | +------------------+  +------------------+  +-------------------+     ||
|  +----------------------------------------------------------------------+|
+-------------------------------------------------------------------------+
```

### Data Flow for Voice Call

```
1. User clicks voice button in widget
         |
         v
2. Browser requests microphone permission
         |
         v
3. Widget opens WebSocket to /api/voice/stream
   Headers: { projectId, visitorId, sessionId }
         |
         v
4. Backend validates project has voice enabled
         |
         v
5. Backend opens WebSocket to Deepgram STT (Nova-3)
         |
         v
6. Widget captures audio via MediaRecorder
   Sends audio chunks to backend WebSocket
         |
         v
7. Backend forwards audio to Deepgram STT
         |
         v
8. Deepgram returns transcript (interim + final)
   Backend sends interim transcripts to widget (for display)
         |
         v
9. On final transcript, backend calls chat engine
   const result = await processChat({
     message: transcript,
     source: 'voice',
     sessionId,
     projectId
   });
         |
         v
10. Chat engine returns response with optional source_url
          |
          v
11. Backend streams response text to Deepgram TTS (Aura-2)
          |
          v
12. Deepgram returns audio stream
          |
          v
13. Backend forwards audio stream to widget WebSocket
          |
          v
14. Widget plays audio via Web Audio API
    If source_url present, trigger navigation
          |
          v
15. Loop back to step 6 for next user utterance
```

### Database Schema Changes

```sql
-- Add voice settings to projects table
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS voice_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS voice_greeting TEXT DEFAULT 'Hi! How can I help you today?',
ADD COLUMN IF NOT EXISTS voice_id TEXT DEFAULT 'aura-2-thalia-en';

-- Add voice tracking to chat_sessions
ALTER TABLE chat_sessions
ADD COLUMN IF NOT EXISTS is_voice BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS voice_duration_seconds INTEGER DEFAULT 0;

-- Add voice flag to chat_messages
ALTER TABLE chat_messages
ADD COLUMN IF NOT EXISTS is_voice BOOLEAN DEFAULT FALSE;

-- Index for voice analytics
CREATE INDEX IF NOT EXISTS idx_chat_sessions_voice
ON chat_sessions(project_id, is_voice)
WHERE is_voice = TRUE;

-- RLS policies remain unchanged (project_id based)
```

### Environment Variables

```bash
# .env.example additions

# Deepgram Configuration
DEEPGRAM_API_KEY=your_deepgram_api_key_here

# Voice Feature Flags
VOICE_CHAT_ENABLED=true
VOICE_CHAT_MAX_DURATION_SECONDS=300

# Optional: TTS Voice customization
DEEPGRAM_TTS_MODEL=aura-2-thalia-en
```

### API Endpoints

#### WebSocket /api/voice/stream

Main voice streaming endpoint using WebSocket.

```typescript
// Connection URL
ws://api.example.com/api/voice/stream?projectId=xxx&visitorId=yyy&sessionId=zzz

// Client -> Server Messages
interface ClientMessage {
  type: 'audio' | 'end';
  data?: ArrayBuffer;  // PCM audio for 'audio' type
}

// Server -> Client Messages
interface ServerMessage {
  type: 'connected' | 'transcript' | 'audio' | 'navigation' | 'error' | 'ended';

  // For 'connected'
  greeting?: string;

  // For 'transcript'
  text?: string;
  isFinal?: boolean;

  // For 'audio'
  audio?: ArrayBuffer;  // PCM audio chunk

  // For 'navigation'
  url?: string;
  newTab?: boolean;

  // For 'error'
  error?: string;
  code?: string;
}
```

#### GET /api/voice/config

Get voice configuration for a project.

```typescript
// Request
GET /api/voice/config?projectId=xxx

// Response
{
  "enabled": true,
  "greeting": "Hi! How can I help you today?",
  "voiceId": "aura-2-thalia-en",
  "maxDurationSeconds": 300
}
```

#### PATCH /api/projects/:id/voice

Update voice settings for a project.

```typescript
// Request
PATCH /api/projects/:id/voice
{
  "voice_enabled": true,
  "voice_greeting": "Hello! Ask me anything.",
  "voice_id": "aura-2-luna-en"
}

// Response
{
  "success": true,
  "project": { ... }
}
```

---

## Service Implementation

### Deepgram STT Service

```typescript
// apps/api/src/services/deepgram-stt.ts

import { createClient, LiveTranscriptionEvents } from '@deepgram/sdk';

const deepgram = createClient(process.env.DEEPGRAM_API_KEY);

interface STTOptions {
  onTranscript: (text: string, isFinal: boolean) => void;
  onError: (error: Error) => void;
  language?: string;
}

export function createSTTStream(options: STTOptions) {
  const connection = deepgram.listen.live({
    model: 'nova-3',
    language: options.language || 'en',
    smart_format: true,
    interim_results: true,
    utterance_end_ms: 1000,
    vad_events: true,
    encoding: 'linear16',
    sample_rate: 16000,
  });

  connection.on(LiveTranscriptionEvents.Open, () => {
    console.log('Deepgram STT connection opened');
  });

  connection.on(LiveTranscriptionEvents.Transcript, (data) => {
    const transcript = data.channel?.alternatives[0]?.transcript;
    if (transcript) {
      const isFinal = data.is_final || false;
      options.onTranscript(transcript, isFinal);
    }
  });

  connection.on(LiveTranscriptionEvents.Error, (error) => {
    console.error('Deepgram STT error:', error);
    options.onError(new Error(error.message));
  });

  connection.on(LiveTranscriptionEvents.Close, () => {
    console.log('Deepgram STT connection closed');
  });

  return {
    send: (audioData: Buffer) => {
      connection.send(audioData);
    },
    close: () => {
      connection.finish();
    }
  };
}
```

### Deepgram TTS Service

```typescript
// apps/api/src/services/deepgram-tts.ts

import { createClient } from '@deepgram/sdk';

const deepgram = createClient(process.env.DEEPGRAM_API_KEY);

interface TTSOptions {
  voiceId?: string;
  onAudioChunk: (chunk: Buffer) => void;
  onComplete: () => void;
  onError: (error: Error) => void;
}

export async function textToSpeechStream(
  text: string,
  options: TTSOptions
): Promise<void> {
  try {
    const response = await deepgram.speak.request(
      { text },
      {
        model: options.voiceId || process.env.DEEPGRAM_TTS_MODEL || 'aura-2-thalia-en',
        encoding: 'linear16',
        sample_rate: 24000,
      }
    );

    const stream = await response.getStream();

    if (stream) {
      const reader = stream.getReader();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        options.onAudioChunk(Buffer.from(value));
      }
    }

    options.onComplete();
  } catch (error) {
    console.error('Deepgram TTS error:', error);
    options.onError(error instanceof Error ? error : new Error('TTS failed'));
  }
}

// Available Aura-2 voices
export const AVAILABLE_VOICES = [
  { id: 'aura-2-thalia-en', name: 'Thalia', gender: 'female', accent: 'American' },
  { id: 'aura-2-luna-en', name: 'Luna', gender: 'female', accent: 'American' },
  { id: 'aura-2-stella-en', name: 'Stella', gender: 'female', accent: 'American' },
  { id: 'aura-2-athena-en', name: 'Athena', gender: 'female', accent: 'British' },
  { id: 'aura-2-hera-en', name: 'Hera', gender: 'female', accent: 'American' },
  { id: 'aura-2-orion-en', name: 'Orion', gender: 'male', accent: 'American' },
  { id: 'aura-2-arcas-en', name: 'Arcas', gender: 'male', accent: 'American' },
  { id: 'aura-2-perseus-en', name: 'Perseus', gender: 'male', accent: 'American' },
  { id: 'aura-2-angus-en', name: 'Angus', gender: 'male', accent: 'Irish' },
  { id: 'aura-2-orpheus-en', name: 'Orpheus', gender: 'male', accent: 'American' },
];
```

### Voice WebSocket Handler

```typescript
// apps/api/src/routes/voice-ws.ts

import { WebSocket, WebSocketServer } from 'ws';
import { createSTTStream } from '../services/deepgram-stt';
import { textToSpeechStream } from '../services/deepgram-tts';
import { processChat } from '../services/chat-engine';
import { supabase } from '../lib/supabase';

interface VoiceSession {
  projectId: string;
  visitorId: string;
  sessionId: string;
  sttStream: ReturnType<typeof createSTTStream> | null;
  startTime: Date;
  transcriptBuffer: string;
}

export function setupVoiceWebSocket(wss: WebSocketServer) {
  wss.on('connection', async (ws: WebSocket, req) => {
    const url = new URL(req.url!, `http://${req.headers.host}`);
    const projectId = url.searchParams.get('projectId');
    const visitorId = url.searchParams.get('visitorId');
    const sessionId = url.searchParams.get('sessionId');

    if (!projectId || !visitorId) {
      ws.send(JSON.stringify({ type: 'error', error: 'Missing required parameters' }));
      ws.close();
      return;
    }

    // Verify project has voice enabled
    const { data: project } = await supabase
      .from('projects')
      .select('voice_enabled, voice_greeting, voice_id')
      .eq('id', projectId)
      .single();

    if (!project?.voice_enabled) {
      ws.send(JSON.stringify({ type: 'error', error: 'Voice chat not enabled' }));
      ws.close();
      return;
    }

    const session: VoiceSession = {
      projectId,
      visitorId,
      sessionId: sessionId || `voice_${Date.now()}`,
      sttStream: null,
      startTime: new Date(),
      transcriptBuffer: '',
    };

    // Create STT stream
    session.sttStream = createSTTStream({
      onTranscript: async (text, isFinal) => {
        // Send interim transcripts to client
        ws.send(JSON.stringify({
          type: 'transcript',
          text,
          isFinal
        }));

        if (isFinal && text.trim()) {
          session.transcriptBuffer = '';

          // Process through chat engine
          try {
            const result = await processChat({
              projectId,
              message: text,
              sessionId: session.sessionId,
              visitorId,
              source: 'voice'
            });

            // Check for navigation URL
            let navigationUrl: string | null = null;
            if (result.sources?.length > 0) {
              const sourceWithUrl = result.sources.find(s => s.source_url);
              if (sourceWithUrl?.source_url) {
                navigationUrl = sourceWithUrl.source_url;
              }
            }

            // Generate TTS response
            await textToSpeechStream(result.content, {
              voiceId: project.voice_id,
              onAudioChunk: (chunk) => {
                ws.send(chunk);
              },
              onComplete: () => {
                // Send navigation after audio if available
                if (navigationUrl) {
                  ws.send(JSON.stringify({
                    type: 'navigation',
                    url: navigationUrl,
                    newTab: !isSameDomain(navigationUrl, req.headers.origin)
                  }));
                }
              },
              onError: (error) => {
                ws.send(JSON.stringify({
                  type: 'error',
                  error: 'Failed to generate speech'
                }));
              }
            });
          } catch (error) {
            console.error('Chat processing error:', error);
            ws.send(JSON.stringify({
              type: 'error',
              error: 'Failed to process message'
            }));
          }
        } else if (!isFinal) {
          session.transcriptBuffer += text + ' ';
        }
      },
      onError: (error) => {
        ws.send(JSON.stringify({
          type: 'error',
          error: 'Speech recognition error'
        }));
      }
    });

    // Send connected message with greeting
    ws.send(JSON.stringify({
      type: 'connected',
      greeting: project.voice_greeting
    }));

    // Speak greeting
    await textToSpeechStream(project.voice_greeting, {
      voiceId: project.voice_id,
      onAudioChunk: (chunk) => ws.send(chunk),
      onComplete: () => {},
      onError: () => {}
    });

    // Handle incoming messages
    ws.on('message', (data: Buffer) => {
      try {
        // Check if it's a control message (JSON) or audio data
        if (data[0] === 0x7b) { // '{' character
          const message = JSON.parse(data.toString());
          if (message.type === 'end') {
            session.sttStream?.close();
          }
        } else {
          // Audio data - forward to STT
          session.sttStream?.send(data);
        }
      } catch (error) {
        // Treat as audio data if not valid JSON
        session.sttStream?.send(data);
      }
    });

    // Handle close
    ws.on('close', async () => {
      session.sttStream?.close();

      // Record voice session duration
      const durationSeconds = Math.round(
        (Date.now() - session.startTime.getTime()) / 1000
      );

      await supabase
        .from('chat_sessions')
        .update({
          is_voice: true,
          voice_duration_seconds: durationSeconds
        })
        .eq('id', session.sessionId);
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      session.sttStream?.close();
    });
  });
}

function isSameDomain(url: string, origin?: string): boolean {
  if (!origin) return false;
  try {
    const urlHost = new URL(url).hostname;
    const originHost = new URL(origin).hostname;
    return urlHost === originHost;
  } catch {
    return false;
  }
}
```

---

## Frontend Implementation

### Voice Button Component

```typescript
// apps/widget/src/components/VoiceButton.tsx

import { useState } from 'preact/hooks';
import { Mic, MicOff, Phone, PhoneOff } from 'lucide-preact';

interface VoiceButtonProps {
  onClick: () => void;
  isActive: boolean;
  disabled?: boolean;
}

export function VoiceButton({ onClick, isActive, disabled }: VoiceButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        p-2 rounded-full transition-all duration-200
        ${isActive
          ? 'bg-red-500 hover:bg-red-600 text-white'
          : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
      title={isActive ? 'End voice call' : 'Start voice call'}
    >
      {isActive ? (
        <PhoneOff className="w-5 h-5" />
      ) : (
        <Mic className="w-5 h-5" />
      )}
    </button>
  );
}
```

### Voice Chat UI Component

```typescript
// apps/widget/src/components/VoiceChatUI.tsx

import { useState, useEffect, useRef } from 'preact/hooks';

type VoiceState = 'connecting' | 'listening' | 'speaking' | 'error';

interface VoiceChatUIProps {
  state: VoiceState;
  transcript: string;
  botText: string;
  duration: number;
  onEndCall: () => void;
  errorMessage?: string;
}

export function VoiceChatUI({
  state,
  transcript,
  botText,
  duration,
  onEndCall,
  errorMessage
}: VoiceChatUIProps) {
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 space-y-4">
      {/* Animated Orb */}
      <div
        className={`
          w-24 h-24 rounded-full flex items-center justify-center
          transition-all duration-300
          ${state === 'connecting' ? 'bg-gray-200 animate-pulse' : ''}
          ${state === 'listening' ? 'bg-blue-500 animate-pulse' : ''}
          ${state === 'speaking' ? 'bg-green-500' : ''}
          ${state === 'error' ? 'bg-red-500' : ''}
        `}
      >
        {state === 'listening' && (
          <svg className="w-12 h-12 text-white" viewBox="0 0 24 24">
            <path fill="currentColor" d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
            <path fill="currentColor" d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
          </svg>
        )}
        {state === 'speaking' && (
          <svg className="w-12 h-12 text-white" viewBox="0 0 24 24">
            <path fill="currentColor" d="M3 9v6h4l5 5V4L7 9H3z"/>
            <path fill="currentColor" d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
            <path fill="currentColor" d="M14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
          </svg>
        )}
      </div>

      {/* Status Text */}
      <div className="text-center">
        <p className="text-lg font-medium text-gray-700">
          {state === 'connecting' && 'Connecting...'}
          {state === 'listening' && 'Listening...'}
          {state === 'speaking' && 'Speaking...'}
          {state === 'error' && 'Error'}
        </p>
        <p className="text-sm text-gray-500">{formatDuration(duration)}</p>
      </div>

      {/* Live Transcript */}
      {(state === 'listening' || state === 'speaking') && (
        <div className="w-full max-h-20 overflow-y-auto bg-gray-50 rounded-lg p-3">
          <p className="text-sm text-gray-600">
            {state === 'listening' ? transcript : botText}
          </p>
        </div>
      )}

      {/* Error Message */}
      {state === 'error' && errorMessage && (
        <p className="text-sm text-red-600">{errorMessage}</p>
      )}

      {/* End Call Button */}
      <button
        onClick={onEndCall}
        className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-full font-medium transition-colors"
      >
        End Call
      </button>
    </div>
  );
}
```

### Voice Chat Hook

```typescript
// apps/widget/src/hooks/useVoiceChat.ts

import { useState, useRef, useCallback, useEffect } from 'preact/hooks';

type VoiceState = 'idle' | 'connecting' | 'listening' | 'speaking' | 'error';

interface UseVoiceChatOptions {
  projectId: string;
  visitorId: string;
  sessionId?: string;
  apiUrl: string;
  onNavigate?: (url: string, newTab: boolean) => void;
  onMessage?: (userText: string, botText: string) => void;
}

export function useVoiceChat(options: UseVoiceChatOptions) {
  const [state, setState] = useState<VoiceState>('idle');
  const [transcript, setTranscript] = useState('');
  const [botText, setBotText] = useState('');
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const durationIntervalRef = useRef<number | null>(null);

  const startCall = useCallback(async () => {
    try {
      setState('connecting');
      setError(null);

      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000
        }
      });

      // Create WebSocket connection
      const wsUrl = `${options.apiUrl.replace('http', 'ws')}/api/voice/stream?` +
        `projectId=${options.projectId}&visitorId=${options.visitorId}` +
        (options.sessionId ? `&sessionId=${options.sessionId}` : '');

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      // Create audio context for playback
      audioContextRef.current = new AudioContext({ sampleRate: 24000 });

      ws.onopen = () => {
        // Set up MediaRecorder
        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: 'audio/webm;codecs=opus'
        });
        mediaRecorderRef.current = mediaRecorder;

        mediaRecorder.ondataavailable = async (event) => {
          if (event.data.size > 0 && ws.readyState === WebSocket.OPEN) {
            // Convert to PCM and send
            const arrayBuffer = await event.data.arrayBuffer();
            ws.send(arrayBuffer);
          }
        };

        mediaRecorder.start(100); // Send chunks every 100ms
        setState('listening');

        // Start duration timer
        durationIntervalRef.current = window.setInterval(() => {
          setDuration(d => d + 1);
        }, 1000);
      };

      ws.onmessage = async (event) => {
        if (event.data instanceof Blob || event.data instanceof ArrayBuffer) {
          // Audio data - play it
          setState('speaking');
          const audioData = event.data instanceof Blob
            ? await event.data.arrayBuffer()
            : event.data;
          await playAudio(audioData);
          setState('listening');
        } else {
          // JSON message
          const message = JSON.parse(event.data);

          switch (message.type) {
            case 'connected':
              // Greeting will be spoken
              break;
            case 'transcript':
              if (message.isFinal) {
                setTranscript('');
              } else {
                setTranscript(message.text || '');
              }
              break;
            case 'navigation':
              if (options.onNavigate) {
                options.onNavigate(message.url, message.newTab);
              } else if (message.newTab) {
                window.open(message.url, '_blank');
              } else {
                window.location.href = message.url;
              }
              break;
            case 'error':
              setError(message.error);
              setState('error');
              break;
          }
        }
      };

      ws.onerror = () => {
        setError('Connection failed');
        setState('error');
      };

      ws.onclose = () => {
        if (state !== 'error') {
          setState('idle');
        }
        cleanup();
      };

    } catch (err) {
      if (err instanceof Error && err.name === 'NotAllowedError') {
        setError('Microphone permission denied');
      } else {
        setError('Failed to start voice chat');
      }
      setState('error');
    }
  }, [options]);

  const endCall = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({ type: 'end' }));
      wsRef.current.close();
    }
    cleanup();
    setState('idle');
  }, []);

  const cleanup = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
    }
    setDuration(0);
    setTranscript('');
    setBotText('');
  };

  const playAudio = async (audioData: ArrayBuffer) => {
    if (!audioContextRef.current) return;

    try {
      const audioBuffer = await audioContextRef.current.decodeAudioData(audioData.slice(0));
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);
      source.start();
    } catch (err) {
      console.error('Audio playback error:', err);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      cleanup();
    };
  }, []);

  return {
    state,
    transcript,
    botText,
    duration,
    error,
    startCall,
    endCall,
    isActive: state !== 'idle' && state !== 'error'
  };
}
```

### Dashboard Settings Component

```typescript
// apps/web/components/settings/voice-settings.tsx

"use client";

import { useState } from "react";
import { Switch } from "@chatbot/ui";
import { Label } from "@chatbot/ui";
import { Input } from "@chatbot/ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@chatbot/ui";
import { Button } from "@chatbot/ui";
import { Mic, Volume2 } from "lucide-react";

const VOICES = [
  { id: 'aura-2-thalia-en', name: 'Thalia', description: 'Female, American' },
  { id: 'aura-2-luna-en', name: 'Luna', description: 'Female, American' },
  { id: 'aura-2-stella-en', name: 'Stella', description: 'Female, American' },
  { id: 'aura-2-athena-en', name: 'Athena', description: 'Female, British' },
  { id: 'aura-2-orion-en', name: 'Orion', description: 'Male, American' },
  { id: 'aura-2-arcas-en', name: 'Arcas', description: 'Male, American' },
  { id: 'aura-2-perseus-en', name: 'Perseus', description: 'Male, American' },
  { id: 'aura-2-angus-en', name: 'Angus', description: 'Male, Irish' },
];

interface VoiceSettingsProps {
  projectId: string;
  initialEnabled: boolean;
  initialGreeting: string;
  initialVoiceId: string;
  onSave: (settings: {
    voice_enabled: boolean;
    voice_greeting: string;
    voice_id: string;
  }) => Promise<void>;
}

export function VoiceSettings({
  projectId,
  initialEnabled,
  initialGreeting,
  initialVoiceId,
  onSave
}: VoiceSettingsProps) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [greeting, setGreeting] = useState(initialGreeting);
  const [voiceId, setVoiceId] = useState(initialVoiceId);
  const [isSaving, setIsSaving] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave({
        voice_enabled: enabled,
        voice_greeting: greeting,
        voice_id: voiceId
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePreviewVoice = async () => {
    setIsPlaying(true);
    try {
      const response = await fetch(`/api/voice/preview?voiceId=${voiceId}&text=${encodeURIComponent(greeting)}`);
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audio.onended = () => setIsPlaying(false);
      await audio.play();
    } catch (err) {
      console.error('Preview error:', err);
      setIsPlaying(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label htmlFor="voice-enabled" className="text-base">
            <Mic className="w-4 h-4 inline mr-2" />
            Voice Chat
          </Label>
          <p className="text-sm text-muted-foreground">
            Allow visitors to talk to your chatbot using voice
          </p>
        </div>
        <Switch
          id="voice-enabled"
          checked={enabled}
          onCheckedChange={setEnabled}
        />
      </div>

      {enabled && (
        <>
          <div className="space-y-2">
            <Label htmlFor="voice-greeting">Greeting Message</Label>
            <Input
              id="voice-greeting"
              value={greeting}
              onChange={(e) => setGreeting(e.target.value)}
              placeholder="Hi! How can I help you today?"
              maxLength={200}
            />
            <p className="text-xs text-muted-foreground">
              This message will be spoken when a voice call starts
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="voice-select">Voice</Label>
            <div className="flex gap-2">
              <Select value={voiceId} onValueChange={setVoiceId}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select a voice" />
                </SelectTrigger>
                <SelectContent>
                  {VOICES.map((voice) => (
                    <SelectItem key={voice.id} value={voice.id}>
                      {voice.name} - {voice.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="icon"
                onClick={handlePreviewVoice}
                disabled={isPlaying}
              >
                <Volume2 className={`w-4 h-4 ${isPlaying ? 'animate-pulse' : ''}`} />
              </Button>
            </div>
          </div>
        </>
      )}

      <Button onClick={handleSave} disabled={isSaving}>
        {isSaving ? 'Saving...' : 'Save Changes'}
      </Button>
    </div>
  );
}
```

---

## Acceptance Criteria

### Definition of Done

- [ ] Voice button appears in widget chat input area
- [ ] Clicking voice button requests microphone permission
- [ ] Voice call connects and shows animated UI
- [ ] User speech is transcribed in real-time
- [ ] Bot responds with spoken audio
- [ ] Live transcript displays during bot response
- [ ] Navigation works when source URL is available
- [ ] Call can be ended with button
- [ ] Conversation appears in chat history as text
- [ ] Voice settings available in project settings
- [ ] Voice sessions tracked in analytics

### Demo Checklist

- [ ] Open widget on test site
- [ ] Click voice button
- [ ] Grant microphone permission
- [ ] Hear greeting message
- [ ] Ask a question verbally
- [ ] See transcript appear in real-time
- [ ] Hear bot's spoken response
- [ ] Ask about content with source URL
- [ ] See navigation happen (same tab or new tab)
- [ ] End the call
- [ ] See conversation in chat history
- [ ] Check analytics for voice session

---

## Error Handling

| Error | User Message | Recovery |
|-------|--------------|----------|
| Microphone permission denied | "Please allow microphone access to use voice chat" | Show instructions to enable |
| WebSocket connection failed | "Unable to connect. Please try again." | Retry button |
| Deepgram STT error | "Speech recognition unavailable" | Fall back to text chat |
| Deepgram TTS error | "Voice response unavailable" | Show text response |
| Max duration reached | "Call duration limit reached" | End call gracefully |
| Browser not supported | (Hide voice button) | Only show text chat |

---

## Performance Requirements

| Metric | Target |
|--------|--------|
| Time to first audio playback | < 1 second after speech ends |
| STT transcript latency | < 300ms for interim results |
| TTS generation latency | < 500ms to start streaming |
| Total response latency | < 2 seconds end-to-end |
| Audio quality | Acceptable for support conversations |
| CPU usage (browser) | < 15% during call |

---

## Security Considerations

1. **WebSocket Authentication**: Validate projectId and visitorId on connection
2. **Rate Limiting**: Limit voice calls per visitor (e.g., 5 per hour)
3. **Duration Limits**: Enforce max call duration (default: 5 minutes)
4. **API Key Protection**: Deepgram API key only on server, never exposed
5. **Audio Privacy**: Audio is not stored (streamed only)
6. **GDPR Compliance**: Add voice disclaimer before first call

---

## Cost Estimation

| Component | Rate | Per 2-min call | 1K calls/month |
|-----------|------|----------------|----------------|
| Deepgram STT (Nova-3) | $0.0077/min | $0.015 | $15.40 |
| Deepgram TTS (Aura-2) | $0.027/min | $0.054 | $54.00 |
| OpenAI (existing) | Included | Included | Included |
| **Total** | **~$0.035/min** | **$0.07** | **~$70** |

---

## Future Enhancements (Out of Scope)

- [ ] Multiple language support
- [ ] Voice cloning for brand consistency
- [ ] Call recording and playback
- [ ] Voice biometrics for user identification
- [ ] Push-to-talk mode
- [ ] Voice chat in dashboard (header button)
- [ ] Voice message fallback (record and send)

---

## Related Documents

- [Voice Chat Planning & Research](../voice-chat-planning.md) - Full research document with all options evaluated
- [Chat Engine Spec](../../core/chat-engine/spec.md) - Existing RAG infrastructure
- [Widget Spec](../../core/widget/spec.md) - Widget architecture
- [URL Scraping Spec](../url-scraping/spec.md) - Source URL storage

---

## Changelog

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | December 2024 | Product Team | Initial spec with Deepgram implementation |
