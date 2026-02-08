# SupportBase Widget Redesign Specification

## Vision

Transform the SupportBase chat widget from a generic 2020s-era chat box into a premium, AI-native interface that immediately communicates "this is intelligent software." The design should position SupportBase alongside products like ChatGPT, Gemini, and Linear — not alongside legacy live-chat tools.

**Design language:** Dark glassmorphism with aurora gradients, restrained color, and purposeful motion.

---

## 1. Design System

### 1.1 Color Palette

**Dark theme (default):**

| Token | Value | Usage |
|-------|-------|-------|
| `--bg-deep` | `#0a0a14` | Deepest background layer |
| `--bg-surface` | `rgba(17, 25, 40, 0.75)` | Glass container panels |
| `--bg-elevated` | `rgba(20, 25, 45, 0.6)` | AI message bubbles, cards |
| `--bg-user` | `rgba(99, 102, 241, 0.2)` | User message bubbles |
| `--text-primary` | `#e8e8ed` | Body text |
| `--text-secondary` | `#9ca3af` | Timestamps, metadata |
| `--text-muted` | `#6b7280` | Placeholders, hints |
| `--border-glass` | `rgba(255, 255, 255, 0.08)` | Glass panel edges |
| `--border-accent` | `rgba(99, 102, 241, 0.15)` | User bubble borders |
| `--accent-primary` | `#6366f1` | Buttons, links, active states (Electric Indigo) |
| `--accent-secondary` | `#22d3ee` | Voice waveform, highlights (Neon Cyan) |
| `--accent-gradient` | `#8b5cf6` | Gradient endpoint (Cosmic Purple) |
| `--success` | `#14b8a6` | Success states (Aurora Teal) |
| `--error` | `#ef4444` | Error states |
| `--warning` | `#f59e0b` | Warning banners |

**Light theme (secondary — to be implemented later):**

| Token | Value | Usage |
|-------|-------|-------|
| `--bg-deep` | `#fafaf8` | Background (warm white, NOT pure white) |
| `--bg-surface` | `#ffffff` | Container panels |
| `--bg-elevated` | `#f4f4f5` | AI message bubbles |
| `--bg-user` | `rgba(99, 102, 241, 0.08)` | User bubbles |
| `--text-primary` | `#1a1a1a` | Body text |
| `--accent-primary` | `#4f46e5` | Slightly deeper for contrast on white |

### 1.2 Typography

**Font stack:**
```css
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
```

**Type scale:**

| Element | Size | Weight | Line Height |
|---------|------|--------|-------------|
| Header title | 15px | 600 | 1.25 |
| Message body | 14px | 400 | 1.55 |
| Timestamp | 11px | 400 | 1.3 |
| Input text | 14px | 400 | 1.5 |
| Input placeholder | 14px | 400 | 1.5 |
| Quick reply chips | 13px | 500 | 1.2 |
| Status text | 12px | 500 | 1.3 |
| Agent name/label | 13px | 600 | 1.3 |
| Form field labels | 12px | 500 | 1.3 |

Use **weight variation** (400, 500, 600) for hierarchy — one font family only.

### 1.3 Spacing Scale

```
4px, 8px, 12px, 16px, 20px, 24px, 32px, 48px
```

- Message gap: 8px (same sender), 16px (different sender)
- Container padding: 16px
- Message bubble padding: 12px 16px
- Section spacing: 24px

### 1.4 Border Radius

| Element | Radius |
|---------|--------|
| Widget container | 20px |
| Message bubbles (AI) | 4px 16px 16px 16px |
| Message bubbles (User) | 16px 16px 4px 16px |
| Input field | 24px (pill-shaped) |
| Quick reply chips | 20px |
| Launcher bubble | 50% (circle) |
| Cards (forms, summaries) | 16px |
| Internal buttons | 12px |

### 1.5 Shadows

```css
--shadow-widget: 0 20px 50px -12px rgba(0, 0, 0, 0.4);
--shadow-bubble: 0 4px 16px rgba(99, 102, 241, 0.25);
--shadow-card: 0 4px 12px rgba(0, 0, 0, 0.15);
--shadow-button-hover: 0 4px 16px rgba(99, 102, 241, 0.4);
```

Messages do NOT have shadows — only containers and interactive elements.

### 1.6 Animation Timing

**Universal easing:** `cubic-bezier(0.16, 1, 0.3, 1)` (ease-out-expo feel — fast start, gentle finish)

| Animation | Duration | Easing |
|-----------|----------|--------|
| Widget open/close | 300ms | `cubic-bezier(0.16, 1, 0.3, 1)` |
| Message enter | 250ms | `cubic-bezier(0.16, 1, 0.3, 1)` |
| Button hover | 200ms | `ease-out` |
| State transitions | 250ms | `cubic-bezier(0.16, 1, 0.3, 1)` |
| Ambient gradient drift | 20s | `ease-in-out` |
| Thinking orb pulse | 1.5s | `ease-in-out` |
| Status online pulse | 2s | `ease-in-out` |
| Shimmer loading | 1.5s | `ease-in-out` |

**Reduced motion:** Respect `prefers-reduced-motion: reduce` — replace all transitions with instant opacity changes, keep functional spinners but reduce intensity.

---

## 2. Component Specifications

### 2.1 Widget Container

**Dimensions:**

| Viewport | Width | Height |
|----------|-------|--------|
| Desktop (default) | 380px | 560px |
| Desktop (expanded) | 420px | 640px |
| Mobile (<480px) | 100vw | 100dvh |

- `max-height: min(640px, calc(100vh - 100px))` on desktop
- Bottom-right positioning with 20px margin from viewport edges
- z-index: `2147483647`

**Container style (glassmorphism):**
```css
.chat-window {
  background: rgba(17, 25, 40, 0.75);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 20px;
  box-shadow: 0 20px 50px -12px rgba(0, 0, 0, 0.4);
  overflow: hidden;
}
```

**Ambient background (behind the glass):**
```css
.widget-ambient {
  position: absolute;
  inset: 0;
  background: #0a0a14;
  overflow: hidden;
  z-index: 0;
}

.widget-ambient::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background:
    radial-gradient(circle at 20% 80%, rgba(99, 102, 241, 0.15) 0%, transparent 50%),
    radial-gradient(circle at 80% 20%, rgba(34, 211, 238, 0.1) 0%, transparent 50%),
    radial-gradient(circle at 50% 50%, rgba(139, 92, 246, 0.08) 0%, transparent 50%);
  animation: ambient-drift 20s ease-in-out infinite alternate;
}

@keyframes ambient-drift {
  0% { transform: translate(0, 0) rotate(0deg); }
  100% { transform: translate(-5%, 3%) rotate(3deg); }
}
```

### 2.2 Launcher Bubble

```css
.chatbot-bubble {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  box-shadow: 0 4px 16px rgba(99, 102, 241, 0.4);
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.chatbot-bubble:hover {
  transform: scale(1.08);
  box-shadow:
    0 6px 24px rgba(99, 102, 241, 0.5),
    0 0 0 8px rgba(99, 102, 241, 0.08);
}
```

Icon: White chat icon (24px), transitions to X icon when widget is open with a smooth crossfade + 90deg rotation.

### 2.3 Header

Minimal glass header:
- Height: 56px
- Bottom border: `1px solid rgba(255, 255, 255, 0.06)`
- Left: AI avatar (32px gradient orb) + agent name + online status pulse
- Right: Expand toggle + close button (ghost style, `rgba(255,255,255,0.6)` icons)

**AI Avatar:**
```css
.ai-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, #6366f1, #8b5cf6, #a855f7);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3);
}
/* White sparkle/star SVG icon inside (16px) — NOT a robot icon */
```

### 2.4 Messages Area

- Background: transparent (ambient shows through glass)
- Scroll: `scroll-behavior: smooth; overscroll-behavior: contain;`
- Padding: 16px
- Message gap: 8px same sender, 16px different sender

**AI message bubble:**
```css
.message-ai {
  background: rgba(20, 25, 45, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 4px 16px 16px 16px;
  padding: 12px 16px;
  max-width: 85%;
  color: #e8e8ed;
}
```

**User message bubble:**
```css
.message-user {
  background: rgba(99, 102, 241, 0.2);
  border: 1px solid rgba(99, 102, 241, 0.15);
  border-radius: 16px 16px 4px 16px;
  padding: 12px 16px;
  max-width: 85%;
  color: #e8e8ed;
  margin-left: auto;
}
```

**Message enter animation:**
```css
@keyframes message-enter {
  0% {
    opacity: 0;
    transform: translateY(12px) scale(0.97);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.message {
  animation: message-enter 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
```

### 2.5 Thinking Indicator

Replace the standard bouncing dots with a **pulsing gradient orb + shimmer skeleton**:

```css
.ai-thinking {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
}

.thinking-orb {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  animation: thinking-pulse 1.5s ease-in-out infinite;
}

@keyframes thinking-pulse {
  0%, 100% {
    transform: scale(1);
    box-shadow: 0 0 12px rgba(99, 102, 241, 0.4);
  }
  50% {
    transform: scale(1.15);
    box-shadow: 0 0 24px rgba(139, 92, 246, 0.6);
  }
}

.thinking-shimmer {
  flex: 1;
  height: 14px;
  border-radius: 7px;
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0.04) 25%,
    rgba(255, 255, 255, 0.08) 50%,
    rgba(255, 255, 255, 0.04) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s ease-in-out infinite;
}

@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
```

### 2.6 Input Area

Pill-shaped input at the bottom:

```css
.input-container {
  padding: 12px 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.chat-input {
  width: 100%;
  min-height: 44px;
  max-height: 120px;
  border-radius: 22px;
  padding: 10px 48px 10px 16px;
  background: rgba(15, 15, 25, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #e8e8ed;
  font-size: 14px;
  line-height: 1.5;
  resize: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  /* Soft neumorphic inset */
  box-shadow: inset 1px 1px 3px rgba(0, 0, 0, 0.2);
}

.chat-input:focus {
  border-color: rgba(99, 102, 241, 0.4);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  outline: none;
}

.chat-input::placeholder {
  color: #6b7280;
}
```

**Send button:** Right side of input, 36px circle, gradient background matching accent, white arrow icon. Hidden when input is empty (fade transition).

**Voice button:** Left of send button (or stand-alone when input is empty). Microphone icon in `--accent-secondary` color. Subtle pulse animation when available.

### 2.7 Quick Reply / Suggestion Chips

```css
.suggestion-chip {
  display: inline-flex;
  align-items: center;
  padding: 8px 16px;
  border-radius: 20px;
  background: rgba(99, 102, 241, 0.1);
  border: 1px solid rgba(99, 102, 241, 0.2);
  color: #a5b4fc;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.suggestion-chip:hover {
  background: rgba(99, 102, 241, 0.2);
  border-color: rgba(99, 102, 241, 0.35);
  transform: translateY(-1px);
}
```

### 2.8 Welcome Screen

When the widget opens for the first time (no message history):

- Centered greeting: "Hi there! How can I help?" using 18px weight-600
- AI avatar orb (48px, centered) with subtle breathing glow
- 2-3 suggestion cards below:
  ```
  ┌─────────────────────────────────────┐
  │  💬 "What does your product do?"    │
  │  📋 "Show me your pricing"          │
  │  🎯 "I have a technical question"   │
  └─────────────────────────────────────┘
  ```
  (Cards use the `.suggestion-chip` style, but full-width with 12px padding)
- If voice is enabled, small text below cards: "or start a voice call" with mic icon
- First keypress or card tap transitions to active chat

### 2.9 Scroll-to-Bottom Button

Appears when user scrolls up from bottom:

```css
.scroll-to-bottom {
  position: absolute;
  bottom: 80px;
  left: 50%;
  transform: translateX(-50%);
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(17, 25, 40, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(8px);
  color: #e8e8ed;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  transition: opacity 0.2s ease;
}
```

---

## 3. Voice Call UI

### 3.1 Architecture Decision: Banner, Not Full Overlay

**Current:** Full-screen overlay replaces all chat content.
**New:** Compact 60px banner at the top of the chat window body. Chat messages remain visible and scrollable below. Live transcript entries flow directly into the message stream.

Rationale: Discord and WhatsApp use this pattern. It keeps the conversation unified — when the call ends, there's no awkward "Continue chatting" transition because chat was always visible.

### 3.2 Voice Banner Specification

```
┌─────────────────────────────────────┐
│ ● 01:23  [🔊 |||||||] [🔇] [📞 End] │  ← 60px banner
├─────────────────────────────────────┤
│                                     │
│  [AI transcript message]            │  ← Messages continue
│  [User transcript message]          │    flowing normally
│  [AI response]                      │
│                                     │
└─────────────────────────────────────┘
```

- Height: 60px (80px on mobile for larger touch targets)
- Background: `rgba(17, 25, 40, 0.85)` with `backdrop-filter: blur(12px)`
- Bottom border: `1px solid rgba(255, 255, 255, 0.06)`
- Left: Status dot (green pulsing when connected) + timer
- Center: Mini waveform visualization (8 bars, 3px wide each, gradient cyan-to-indigo)
- Right: Mute button + End call button (red tint)

### 3.3 Waveform Visualization

```css
.waveform-bar {
  width: 3px;
  border-radius: 2px;
  background: linear-gradient(180deg, #22d3ee, #6366f1);
  transition: height 0.1s ease;
  min-height: 4px;
  max-height: 24px;
}
```

8 bars, each driven by audio amplitude data. Stagger animation with 0.05s delays between bars.

### 3.4 Voice States

| State | Banner Appearance | Chat Area |
|-------|------------------|-----------|
| Connecting | Yellow dot + "Connecting..." | "Starting voice call..." system message |
| Active (AI speaking) | Green dot + timer + waveform active | AI transcript appears as messages |
| Active (user speaking) | Green dot + timer + waveform active | User transcript appears as messages |
| Active (muted) | Green dot + timer + muted icon | Same |
| Ended | Banner slides up and disappears | Summary card inserted in chat |

### 3.5 Call End Summary Card

Inserted inline in the message stream:

```
┌─────────────────────────────────────┐
│ 📞 Voice call ended · 2:45          │
│ [Line separator]                     │
│ Discussed: product pricing, features │
└─────────────────────────────────────┘
```

Card style: `background: rgba(20, 25, 45, 0.4)`, `border: 1px solid rgba(255, 255, 255, 0.06)`, `border-radius: 12px`

After the card, the user can immediately continue typing. No mode transition needed.

---

## 4. Lead Capture Form

### 4.1 Conversational Pattern

Replace the current all-fields-at-once card with sequential single-field cards that feel like conversation:

```
AI: "Hey! Quick intro so I know who I'm talking to 👋"

┌─────────────────────────────────────┐
│  📧 Your email                       │
│  [email input field        ] [→]     │
└─────────────────────────────────────┘

[User enters email, card collapses to: ✓ john@example.com]

AI: "Thanks, John! One more thing —"

┌─────────────────────────────────────┐
│  🏢 Company name                     │
│  [company input field      ] [→]     │
└─────────────────────────────────────┘
```

Each field card uses the same styling as AI message bubbles but with an inset input and a submit arrow button.

### 4.2 Form Card Styling

```css
.lead-capture-card {
  background: rgba(20, 25, 45, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 4px 16px 16px 16px;
  padding: 16px;
  max-width: 85%;
}

.lead-capture-input {
  width: 100%;
  height: 40px;
  border-radius: 20px;
  padding: 0 40px 0 14px;
  background: rgba(15, 15, 25, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #e8e8ed;
  font-size: 14px;
  margin-top: 8px;
}
```

### 4.3 Unified Email Capture

The three separate email capture surfaces (lead-capture-form, voice-lead-gate, exit-overlay) must share a visual language and write to a single state. If email was captured through any surface, never ask again.

---

## 5. Widget States

### 5.1 State Machine

Replace boolean flags with an explicit `widgetMode` enum:

```typescript
type WidgetMode =
  | "closed"           // Widget minimized to bubble
  | "welcome"          // First open, no messages yet
  | "lead-capture"     // Showing lead capture form
  | "chat-active"      // Normal chat with AI
  | "chat-handoff"     // Chat with human agent (waiting or active)
  | "voice-active"     // Voice call in progress (chat still visible)
  | "voice-permission" // Requesting mic permission
  | "offline"          // Outside business hours
```

**Valid transitions:**
```
closed → welcome | chat-active | offline
welcome → lead-capture | chat-active
lead-capture → chat-active
chat-active → voice-permission | voice-active | chat-handoff | closed
voice-permission → voice-active | chat-active (denied)
voice-active → chat-active (call ended)
chat-handoff → chat-active (agent left)
any → closed
```

### 5.2 Human Handoff Visuals

When transitioning from AI to human agent:

1. System divider: "--- Connecting you with a team member ---"
2. Typing indicator with human avatar (photo, not bot orb)
3. Agent message shows name + photo: "Sarah from Support"
4. Header subtitle updates to "You're chatting with Sarah"
5. When agent leaves: "--- Sarah has left ---" + AI resumes

---

## 6. Accessibility

### 6.1 ARIA Roles by Mode

| Mode | Container Role | Key Attributes |
|------|---------------|----------------|
| Chat | `role="log"` | `aria-live="polite"`, `aria-atomic="false"` |
| Voice banner | `role="status"` | `aria-live="assertive"` for state changes |
| Lead form | `role="form"` | `aria-label="Contact information"` |
| Exit overlay | `role="alertdialog"` | `aria-modal="true"`, focus trap |

### 6.2 Focus Management

- Widget opens → focus input (or first form field)
- Voice starts → focus end-call button
- Voice ends → focus input
- Widget closes → focus launcher bubble

### 6.3 Contrast Requirements

All body text must meet **4.5:1** contrast against effective background. Glass panel backgrounds must be **minimum 75% opacity** to ensure readability. Provide solid fallback for browsers without `backdrop-filter` support.

---

## 7. Mobile Considerations

- Below 480px: widget takes full screen (`100vw x 100dvh`)
- Launcher: 56px diameter (meets 44px minimum touch target)
- Close button: top-left, 44x44px hit target
- Hide expand toggle on mobile
- Voice banner: 80px height for larger touch targets
- Safe area insets: `env(safe-area-inset-*)` for notched devices

---

## 8. Implementation Notes

### What Changes

| Current | New |
|---------|-----|
| White background, flat design | Dark glassmorphism with aurora gradients |
| Uniform `border-radius: 16px` bubbles | Asymmetric radius (4px-16px) with direction |
| `#0a0a0a` solid user bubbles | `rgba(99, 102, 241, 0.2)` translucent indigo |
| `#f4f4f5` solid AI bubbles | `rgba(20, 25, 45, 0.6)` translucent dark |
| System font stack | Inter (or system fallback) |
| Bouncing dots typing indicator | Gradient orb + shimmer skeleton |
| Full-screen voice overlay | 60px banner + inline transcript |
| All-at-once lead form | Sequential conversational cards |
| Boolean state flags | Explicit state machine enum |
| Standard send button | Gradient circle with hover glow |
| Flat launcher button | Gradient sphere with hover expansion |

### What Stays

- Shadow DOM isolation
- esbuild IIFE bundle
- All existing functionality (lead capture, voice, handoff, RAG, etc.)
- Component architecture (chat-window.ts, input.ts, etc.)
- API contracts with backend
- Positioning system (bottom-right/left)

### Performance Budget

- `backdrop-filter` only on: widget container, voice banner, scroll-to-bottom button (3 layers max)
- NO glassmorphism on individual message bubbles (too many compositing layers)
- Ambient gradient: single pseudo-element with CSS animation (no JS)
- Animations respect `prefers-reduced-motion`
- Total CSS addition: target <5KB gzipped increase

---

## 9. Visual Reference Summary

### The "SupportBase Premium" recipe:

1. **Container:** Dark glass over animated aurora → premium, living, AI-native
2. **Colors:** Electric Indigo + Neon Cyan + Cosmic Purple on deep navy
3. **Messages:** Translucent bubbles with asymmetric radius → directional, modern
4. **Input:** Pill-shaped with soft inset shadow → tactile, conversational
5. **Thinking:** Gradient orb + shimmer → "AI processing" (not "someone typing")
6. **Voice:** Top banner + inline transcript → unified, non-disruptive
7. **Forms:** One field at a time → conversational, higher completion
8. **Avatar:** Gradient orb with sparkle icon → abstract, elegant (no robots)
9. **Launcher:** Gradient sphere with glow → inviting, discoverable
10. **Motion:** Spring-eased everything → fluid, alive

---

*Research basis: Analysis of 8 direct competitors (Chatbase, Intercom, LiveChat, ChatBot, Tidio, Docket, Spara, Tone), 6 AI product interfaces (ChatGPT, Claude, Perplexity, Gemini, Linear, Vercel), current UI/UX design trends (glassmorphism, aurora gradients, spring animations), and multi-modal widget UX best practices.*

*Created: February 2026*
