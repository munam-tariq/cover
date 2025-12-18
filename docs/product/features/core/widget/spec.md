# Feature: Embeddable Chat Widget

## Overview

**Feature ID**: `widget`
**Category**: Core (V1)
**Priority**: P0 (Core functionality)
**Complexity**: L
**Estimated Effort**: 4-5 days

### Summary
A lightweight, self-contained chat widget that users embed on their website via a single script tag. The widget loads asynchronously, uses Shadow DOM for style isolation, and works on any website regardless of framework. Target bundle size: <30KB gzipped.

### Dependencies
- `chat-engine` - Chat API must be available for sending messages

### Success Criteria
- [x] Widget loads via single `<script>` tag
- [x] Widget appears as chat bubble in bottom-right corner
- [x] Clicking bubble opens chat window
- [x] User can send messages and receive responses
- [x] Messages persist during page session
- [x] Widget is mobile responsive
- [x] Widget doesn't affect host page styles (Shadow DOM)
- [x] Bundle size under 30KB gzipped (~8KB actual)
- [x] Accessible (keyboard nav, ARIA labels)
- [x] Widget hosted on Supabase Storage with public URL
- [x] Dashboard embed page with live preview
- [x] Interactive customization (position, color, title, greeting)

---

## User Stories

### Primary User Story
> As a business owner, I want to copy one line of code and have a working chatbot on my website immediately.

### Additional Stories
1. As a website visitor, I want to click a chat bubble to get help without leaving the page.
2. As a visitor on mobile, I want the chat to work well on my phone.
3. As a developer, I want the widget to not break my website's styles.

---

## Functional Requirements

### Widget Behavior

| ID | Requirement | Priority | Notes |
|----|-------------|----------|-------|
| WGT-001 | Widget loads via single script tag | Must Have | Async loading |
| WGT-002 | Script tag includes project ID as data attribute | Must Have | Configuration |
| WGT-003 | Widget shows as chat bubble (60x60px) | Must Have | Bottom-right |
| WGT-004 | Clicking bubble opens chat window | Must Have | Animated transition |
| WGT-005 | Chat window has header, messages, input | Must Have | Standard layout |
| WGT-006 | Messages persist during page session | Must Have | sessionStorage |
| WGT-007 | Widget is mobile responsive | Must Have | Fullscreen on mobile |
| WGT-008 | Widget uses Shadow DOM | Must Have | Style isolation |
| WGT-009 | Widget loads asynchronously | Must Have | Non-blocking |
| WGT-010 | Show typing indicator while waiting | Should Have | UX feedback |
| WGT-011 | Auto-scroll to new messages | Should Have | UX improvement |
| WGT-012 | Keyboard accessible | Should Have | Accessibility |
| WGT-013 | Bundle size <30KB gzipped | Should Have | Performance |

---

## User Interface

### Widget States

```
┌─────────────────────────────────────────────────────────────────┐
│                        WIDGET STATES                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   STATE 1: Collapsed (Bubble)                                   │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │                                                         │  │
│   │                                              [Website]  │  │
│   │                                                         │  │
│   │                                                         │  │
│   │                                                   ┌──┐  │  │
│   │                                                   │💬│  │  │
│   │                                                   └──┘  │  │
│   │                                                  60x60  │  │
│   └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│   STATE 2: Expanded (Desktop)                                   │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │                                      ┌────────────────┐ │  │
│   │                                      │ Chat with us X │ │  │
│   │                                      ├────────────────┤ │  │
│   │                                      │                │ │  │
│   │                                      │ Hi! How can I  │ │  │
│   │                                      │ help you?      │ │  │
│   │                                      │                │ │  │
│   │                                      │    What's your │ │  │
│   │                                      │    return pol? │ │  │
│   │                                      │                │ │  │
│   │                                      │ Returns are... │ │  │
│   │                                      │                │ │  │
│   │                                      ├────────────────┤ │  │
│   │                                      │ Type message...│ │  │
│   │                                      │           [→]  │ │  │
│   │                                      └────────────────┘ │  │
│   └─────────────────────────────────────────────────────────┘  │
│   Window: 380x520px, 20px from edges                           │
│                                                                 │
│   STATE 3: Expanded (Mobile)                                    │
│   ┌───────────────────────┐                                    │
│   │ Chat with us       X  │                                    │
│   ├───────────────────────┤                                    │
│   │                       │                                    │
│   │ Hi! How can I help?   │                                    │
│   │                       │                                    │
│   │      What's your      │                                    │
│   │      return policy?   │                                    │
│   │                       │                                    │
│   │ Our return policy...  │                                    │
│   │                       │                                    │
│   │                       │                                    │
│   ├───────────────────────┤                                    │
│   │ Type message...    →  │                                    │
│   └───────────────────────┘                                    │
│   Fullscreen on mobile (<640px)                                │
│                                                                 │
│   STATE 4: Loading/Typing                                       │
│   • Shows typing indicator (three dots animation)               │
│   • Input disabled while waiting                                │
│                                                                 │
│   STATE 5: Error                                                │
│   • Shows error message in chat                                 │
│   • "Something went wrong. Please try again."                   │
│   • Retry option available                                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Widget Dimensions

| Element | Desktop | Mobile (<640px) |
|---------|---------|-----------------|
| Bubble size | 60x60px | 56x56px |
| Bubble position | 20px from bottom-right | 16px from bottom-right |
| Window width | 380px | 100% |
| Window height | 520px | 100% |
| Window position | 20px from edge | 0 (fullscreen) |
| Header height | 56px | 56px |
| Input area height | 60px | 60px |
| Message max width | 80% of container | 80% of container |
| Border radius | 16px | 0 (fullscreen) |

---

## Embed Code Format

### Script Tag (Basic)

```html
<script
  src="https://hynaqwwofkpaafvlckdm.supabase.co/storage/v1/object/public/assets/widget.js"
  data-project-id="YOUR_PROJECT_ID"
  async>
</script>
```

### Script Tag (With Customization)

```html
<script
  src="https://hynaqwwofkpaafvlckdm.supabase.co/storage/v1/object/public/assets/widget.js"
  data-project-id="YOUR_PROJECT_ID"
  data-api-url="https://api.yoursite.com"
  data-position="bottom-right"
  data-primary-color="#0a0a0a"
  data-title="Chat with us"
  data-greeting="Hi! How can I help you today?"
  async>
</script>
```

### Configuration Options

| Attribute | Default | Description |
|-----------|---------|-------------|
| `data-project-id` | required | Your project ID from the dashboard |
| `data-api-url` | Auto-detected | API server URL |
| `data-position` | `bottom-right` | `bottom-right` or `bottom-left` |
| `data-primary-color` | `#0a0a0a` | Primary theme color (hex) |
| `data-title` | `Chat with us` | Chat window title |
| `data-greeting` | `Hi! How can I help?` | Initial greeting message |

### Widget Hosting

**Current Production URL:**
```
https://hynaqwwofkpaafvlckdm.supabase.co/storage/v1/object/public/assets/widget.js
```

The widget is hosted on Supabase Storage in a public `assets` bucket. To update:
1. Build the widget: `npm run build` in `apps/widget/`
2. Upload to storage: `SUPABASE_SERVICE_KEY=xxx npx tsx upload-to-supabase.ts`

### Dashboard Embed Page

The dashboard provides an interactive embed page with:
- **Live Preview**: Loads the real widget with the user's project ID
- **Desktop/Mobile Toggle**: Preview widget in different viewport sizes
- **Interactive Customization Panel**: Real-time editing of position, color, title, greeting
- **Dynamic Embed Code**: Auto-updates with user's custom settings
- **Copy to Clipboard**: One-click copy of customized embed code

```
┌─────────────────────────────────────────────────────────────────┐
│  Embed Widget                               Project: My Chatbot │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌───────────────────────────────────┐  ┌───────────────────┐  │
│  │ Live Preview       [Desktop] [📱] │  │ Customize Widget  │  │
│  │ ┌───────────────────────────────┐ │  │                   │  │
│  │ │                               │ │  │ Position          │  │
│  │ │   Your Website               │ │  │ [▼ Bottom Right ] │  │
│  │ │                               │ │  │                   │  │
│  │ │   This is a live preview...  │ │  │ Primary Color     │  │
│  │ │                               │ │  │ [🎨] [#0a0a0a  ] │  │
│  │ │                      [💬]    │ │  │                   │  │
│  │ └───────────────────────────────┘ │  │ Chat Title        │  │
│  │                                   │  │ [Chat with us   ] │  │
│  │ Live widget connected to your     │  │                   │  │
│  │ knowledge base. Test it here!     │  │ Greeting Message  │  │
│  └───────────────────────────────────┘  │ [Hi! How can I  ] │  │
│                                         │ [help you today?] │  │
│                                         │                   │  │
│                                         │ [Reset Defaults]  │  │
│                                         └───────────────────┘  │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Your Embed Code                            [Copy Code]  │   │
│  │ ┌─────────────────────────────────────────────────────┐ │   │
│  │ │ <script                                             │ │   │
│  │ │   src="https://...supabase.co/.../widget.js"       │ │   │
│  │ │   data-project-id="abc123"                         │ │   │
│  │ │   data-position="bottom-right"                     │ │   │
│  │ │   data-primary-color="#0a0a0a"                     │ │   │
│  │ │   data-title="Chat with us"                        │ │   │
│  │ │   data-greeting="Hi! How can I help you today?"    │ │   │
│  │ │   async>                                           │ │   │
│  │ │ </script>                                          │ │   │
│  │ └─────────────────────────────────────────────────────┘ │   │
│  │ Paste before closing </body> tag                        │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Integration Guides                                             │
│  [✓ HTML/Static] [○ WordPress Soon] [○ Shopify Soon]          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Technical Implementation

### Widget Entry Point

```typescript
// apps/widget/src/widget.ts
(function() {
  'use strict';

  // Prevent double initialization
  if (window.__CHATBOT_WIDGET_LOADED__) return;
  window.__CHATBOT_WIDGET_LOADED__ = true;

  // Get configuration from script tag
  const script = document.currentScript as HTMLScriptElement;
  const projectId = script?.getAttribute('data-project-id');

  if (!projectId) {
    console.error('[Chatbot] Missing data-project-id attribute');
    return;
  }

  // Configuration
  const CONFIG = {
    apiUrl: 'https://api.yourproduct.com',
    projectId,
  };

  // Storage keys
  const VISITOR_ID_KEY = 'chatbot_visitor_id';
  const MESSAGES_KEY = 'chatbot_messages';

  // Generate or retrieve visitor ID
  function getVisitorId(): string {
    let id = localStorage.getItem(VISITOR_ID_KEY);
    if (!id) {
      id = 'vis_' + Math.random().toString(36).substring(2, 11);
      localStorage.setItem(VISITOR_ID_KEY, id);
    }
    return id;
  }

  // Create widget container with Shadow DOM
  const container = document.createElement('div');
  container.id = 'chatbot-widget-container';
  const shadow = container.attachShadow({ mode: 'closed' });
  document.body.appendChild(container);

  // Inject styles
  const styles = document.createElement('style');
  styles.textContent = WIDGET_STYLES; // Defined below
  shadow.appendChild(styles);

  // Widget state
  let isOpen = false;
  let isLoading = false;
  let messages: Message[] = JSON.parse(
    sessionStorage.getItem(MESSAGES_KEY) || '[]'
  );
  const visitorId = getVisitorId();

  interface Message {
    role: 'user' | 'assistant';
    content: string;
  }

  // Render widget
  function render() {
    const root = shadow.getElementById('widget-root') || document.createElement('div');
    root.id = 'widget-root';

    root.innerHTML = `
      <div class="widget-container ${isOpen ? 'open' : ''}">
        <!-- Bubble -->
        <button class="widget-bubble" aria-label="Open chat" ${isOpen ? 'style="display:none"' : ''}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
        </button>

        <!-- Chat Window -->
        <div class="widget-window ${isOpen ? 'visible' : ''}" role="dialog" aria-label="Chat">
          <div class="widget-header">
            <span class="widget-title">Chat with us</span>
            <button class="widget-close" aria-label="Close chat">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          <div class="widget-messages" role="log">
            ${messages.length === 0 ? `
              <div class="message assistant">
                <div class="message-content">Hi! How can I help you today?</div>
              </div>
            ` : messages.map(m => `
              <div class="message ${m.role}">
                <div class="message-content">${escapeHtml(m.content)}</div>
              </div>
            `).join('')}
            ${isLoading ? `
              <div class="message assistant">
                <div class="typing-indicator">
                  <span></span><span></span><span></span>
                </div>
              </div>
            ` : ''}
          </div>

          <div class="widget-input-area">
            <input
              type="text"
              class="widget-input"
              placeholder="Type a message..."
              aria-label="Message input"
              ${isLoading ? 'disabled' : ''}
            />
            <button class="widget-send" aria-label="Send message" ${isLoading ? 'disabled' : ''}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            </button>
          </div>
        </div>
      </div>
    `;

    if (!shadow.getElementById('widget-root')) {
      shadow.appendChild(root);
    }

    // Attach event listeners
    attachEventListeners();
  }

  function attachEventListeners() {
    const bubble = shadow.querySelector('.widget-bubble');
    const closeBtn = shadow.querySelector('.widget-close');
    const input = shadow.querySelector('.widget-input') as HTMLInputElement;
    const sendBtn = shadow.querySelector('.widget-send');
    const messagesEl = shadow.querySelector('.widget-messages');

    bubble?.addEventListener('click', () => {
      isOpen = true;
      render();
      setTimeout(() => input?.focus(), 100);
    });

    closeBtn?.addEventListener('click', () => {
      isOpen = false;
      render();
    });

    input?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage(input.value);
      }
    });

    sendBtn?.addEventListener('click', () => {
      sendMessage(input?.value || '');
    });

    // Auto-scroll
    if (messagesEl) {
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }
  }

  async function sendMessage(content: string) {
    content = content.trim();
    if (!content || isLoading) return;

    // Add user message
    messages.push({ role: 'user', content });
    sessionStorage.setItem(MESSAGES_KEY, JSON.stringify(messages));
    isLoading = true;
    render();

    try {
      const response = await fetch(`${CONFIG.apiUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: CONFIG.projectId,
          visitorId,
          message: content,
          conversationHistory: messages.slice(-10),
        }),
      });

      if (!response.ok) {
        throw new Error('Chat request failed');
      }

      const data = await response.json();
      messages.push({ role: 'assistant', content: data.message });
      sessionStorage.setItem(MESSAGES_KEY, JSON.stringify(messages));
    } catch (error) {
      messages.push({
        role: 'assistant',
        content: 'Sorry, something went wrong. Please try again.',
      });
    } finally {
      isLoading = false;
      render();
    }
  }

  function escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Initialize
  render();
})();
```

### Widget Styles

```css
/* apps/widget/src/styles/widget.css */

/* Reset and base */
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

.widget-container {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  font-size: 14px;
  line-height: 1.5;
  color: #0a0a0a;
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 2147483647;
}

/* Bubble */
.widget-bubble {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: #0a0a0a;
  color: white;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transition: transform 0.2s, box-shadow 0.2s;
}

.widget-bubble:hover {
  transform: scale(1.05);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
}

.widget-bubble:focus {
  outline: 2px solid #0066ff;
  outline-offset: 2px;
}

/* Chat Window */
.widget-window {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 380px;
  height: 520px;
  background: white;
  border-radius: 16px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
  display: flex;
  flex-direction: column;
  opacity: 0;
  visibility: hidden;
  transform: translateY(20px) scale(0.95);
  transition: opacity 0.2s, transform 0.2s, visibility 0.2s;
}

.widget-window.visible {
  opacity: 1;
  visibility: visible;
  transform: translateY(0) scale(1);
}

/* Header */
.widget-header {
  height: 56px;
  padding: 0 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #e4e4e7;
  flex-shrink: 0;
}

.widget-title {
  font-weight: 600;
  font-size: 15px;
}

.widget-close {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: transparent;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #71717a;
}

.widget-close:hover {
  background: #f4f4f5;
}

/* Messages */
.widget-messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.message {
  display: flex;
  max-width: 80%;
}

.message.user {
  margin-left: auto;
}

.message.assistant {
  margin-right: auto;
}

.message-content {
  padding: 10px 14px;
  border-radius: 18px;
  word-wrap: break-word;
}

.message.user .message-content {
  background: #0a0a0a;
  color: white;
  border-radius: 18px 18px 4px 18px;
}

.message.assistant .message-content {
  background: #f4f4f5;
  color: #0a0a0a;
  border-radius: 18px 18px 18px 4px;
}

/* Typing indicator */
.typing-indicator {
  display: flex;
  gap: 4px;
  padding: 12px 14px;
}

.typing-indicator span {
  width: 8px;
  height: 8px;
  background: #a1a1aa;
  border-radius: 50%;
  animation: typing 1.4s infinite ease-in-out;
}

.typing-indicator span:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-indicator span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes typing {
  0%, 80%, 100% {
    transform: scale(0.8);
    opacity: 0.5;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}

/* Input Area */
.widget-input-area {
  height: 60px;
  padding: 10px 16px;
  border-top: 1px solid #e4e4e7;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.widget-input {
  flex: 1;
  height: 40px;
  padding: 0 12px;
  border: 1px solid #e4e4e7;
  border-radius: 20px;
  font-size: 14px;
  outline: none;
}

.widget-input:focus {
  border-color: #a1a1aa;
}

.widget-input:disabled {
  background: #f4f4f5;
}

.widget-send {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #0a0a0a;
  color: white;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.widget-send:disabled {
  background: #a1a1aa;
  cursor: not-allowed;
}

.widget-send:hover:not(:disabled) {
  background: #27272a;
}

/* Mobile Responsive */
@media (max-width: 640px) {
  .widget-container {
    bottom: 16px;
    right: 16px;
  }

  .widget-bubble {
    width: 56px;
    height: 56px;
  }

  .widget-window {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    width: 100%;
    height: 100%;
    border-radius: 0;
  }
}
```

### Build Configuration

```typescript
// apps/widget/build.ts
import * as esbuild from 'esbuild';
import * as fs from 'fs';

const isDev = process.argv.includes('--dev');

// Read CSS and inline it
const css = fs.readFileSync('src/styles/widget.css', 'utf-8');
const cssMinified = isDev ? css : css.replace(/\s+/g, ' ').trim();

async function build() {
  const ctx = await esbuild.context({
    entryPoints: ['src/widget.ts'],
    bundle: true,
    minify: !isDev,
    format: 'iife',
    target: ['es2018'],
    outfile: 'dist/widget.js',
    sourcemap: isDev,
    define: {
      'WIDGET_STYLES': JSON.stringify(cssMinified),
    },
  });

  if (isDev) {
    await ctx.watch();
    console.log('Watching for changes...');
  } else {
    await ctx.rebuild();
    await ctx.dispose();

    const stat = fs.statSync('dist/widget.js');
    console.log(`Build complete! Size: ${(stat.size / 1024).toFixed(2)}KB`);
  }
}

build();
```

---

## Error Handling

| Scenario | Handling |
|----------|----------|
| Invalid project ID | Widget doesn't render, console error |
| API unavailable | Show error message in chat |
| Network offline | Show "You're offline" message |
| Message too long | Truncate at 2000 chars |
| Multiple widgets | Only first one renders |

---

## Accessibility Requirements

- [ ] Keyboard navigable (Tab, Enter, Escape)
- [ ] ARIA labels on all interactive elements
- [ ] Focus trap when window is open
- [ ] Escape key closes window
- [ ] Screen reader compatible
- [ ] Sufficient color contrast

---

## Testing Requirements

### Unit Tests
- [ ] escapeHtml prevents XSS
- [ ] Visitor ID generation is unique
- [ ] Message storage works correctly

### Integration Tests
- [ ] Widget loads on page
- [ ] Click bubble opens window
- [ ] Send message calls API
- [ ] Close button works

### E2E Tests
- [ ] Complete conversation flow
- [ ] Mobile responsive layout
- [ ] Messages persist on page refresh

---

## Acceptance Criteria

### Definition of Done
- [x] Widget loads via single script tag
- [x] Bubble and window render correctly
- [x] Chat functionality works
- [x] Style isolation (Shadow DOM)
- [x] Mobile responsive
- [x] Bundle size <30KB (~8KB actual)
- [x] Accessible
- [x] Error handling complete
- [x] Hosted on Supabase Storage
- [x] Dashboard embed page with live preview
- [x] Interactive customization panel

### Demo Checklist
- [x] Add script to test page
- [x] Open chat window
- [x] Send message, receive response
- [x] Test on mobile viewport
- [x] Show style isolation
- [x] Customize widget appearance in dashboard
- [x] Copy embed code with custom settings

---

## Changelog

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | December 2024 | Morgan (PM) | Initial spec |
| 1.1 | December 2024 | Dev Team | Implemented widget with all success criteria met |
| 1.2 | December 2024 | Dev Team | Added Supabase Storage hosting, upload script |
| 1.3 | December 2024 | Dev Team | Added dashboard embed page with live preview and interactive customization |

## Implementation Notes

### Files Created/Modified
- `apps/widget/` - Complete widget implementation
  - `src/widget.ts` - Main entry point
  - `src/components/` - UI components (bubble, chat-window, message, input)
  - `src/utils/` - API client, storage, helpers
  - `src/styles/widget.css` - All widget styles
  - `upload-to-supabase.ts` - Deployment script
  - `README.md` - Documentation
- `apps/web/app/(dashboard)/embed/page.tsx` - Interactive embed page
- `apps/api/src/routes/chat.ts` - Chat endpoint for widget

### Architecture Decisions
1. **Shadow DOM (closed mode)**: Complete style isolation from host page
2. **Supabase Storage**: Interim hosting solution, can migrate to CDN later
3. **Session persistence**: Uses sessionStorage for message history
4. **Visitor tracking**: Uses localStorage for consistent visitor ID across sessions
5. **API Architecture**: Widget calls API server, never directly to Supabase
