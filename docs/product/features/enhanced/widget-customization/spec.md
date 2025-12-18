# Feature: Widget Customization

## Overview

**Feature ID**: `widget-customization`
**Category**: Enhanced (V2)
**Priority**: P1 (Post-MVP Enhancement)
**Complexity**: M (Medium)
**Estimated Effort**: 3-4 days

### Summary
Allows business owners to customize the chat widget appearance including colors, position, size, branding, and display behavior. Enables white-label capability and brand alignment for professional integration into any website.

### Dependencies
- `widget` - Core widget must be functional
- `dashboard` - UI for customization settings

### Success Criteria
- [ ] Customize primary and accent colors
- [ ] Choose widget position (bottom-right, bottom-left, etc.)
- [ ] Adjust widget size (compact, default, large)
- [ ] Upload custom avatar/logo
- [ ] Configure welcome message and placeholder text
- [ ] Preview changes in real-time
- [ ] Changes apply instantly without re-embedding

---

## User Stories

### Primary User Story
> As a business owner, I want to customize my chat widget's appearance so it matches my website's brand and design.

### Additional Stories
1. As a business owner, I want to change the widget color to match my brand colors so it looks professional.
2. As a business owner, I want to position the widget on the left side so it doesn't conflict with my existing chat support.
3. As a business owner, I want to upload my logo so customers know they're talking to my business.

---

## Functional Requirements

### Customization Options

| ID | Requirement | Priority | Notes |
|----|-------------|----------|-------|
| WDG-001 | Customize primary color | Must Have | Background, buttons |
| WDG-002 | Customize text color | Must Have | Ensure contrast |
| WDG-003 | Choose widget position | Must Have | 4 corners |
| WDG-004 | Adjust widget size | Must Have | Compact/default/large |
| WDG-005 | Upload custom avatar | Must Have | Max 500KB, square |
| WDG-006 | Configure welcome message | Must Have | Max 200 chars |
| WDG-007 | Customize message placeholder | Must Have | Max 100 chars |
| WDG-008 | Real-time preview in dashboard | Must Have | Live preview |
| WDG-009 | Add business name/branding | Should Have | Header display |
| WDG-010 | Choose bubble icon | Should Have | Predefined icons |
| WDG-011 | Configure auto-open behavior | Should Have | On page load, delay |
| WDG-012 | Customize button text | Nice to Have | CTA customization |

---

## UI Mockup

```
┌─────────────────────────────────────────────────────────────┐
│  Widget Customization                      [Save Changes]    │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────────┐  ┌──────────────────────────┐     │
│  │ Customization        │  │ Live Preview             │     │
│  │                      │  │                          │     │
│  │ Appearance           │  │                          │     │
│  │ ─────────────────    │  │                          │     │
│  │ Primary Color        │  │                          │     │
│  │ [#4F46E5] 🎨        │  │        ┌────────────┐    │     │
│  │                      │  │        │ 💬 Chat    │    │     │
│  │ Text Color           │  │        └────────────┘    │     │
│  │ [#FFFFFF] 🎨        │  │                          │     │
│  │                      │  │                          │     │
│  │ Avatar               │  │                          │     │
│  │ [Upload Image] 📷   │  │                          │     │
│  │ Current: default.png │  │                          │     │
│  │                      │  │                          │     │
│  │ Position & Size      │  │                          │     │
│  │ ─────────────────    │  │                          │     │
│  │ Position:            │  │                          │     │
│  │ ○ Top Left          │  │                          │     │
│  │ ○ Top Right         │  │                          │     │
│  │ ○ Bottom Left       │  │                          │     │
│  │ ● Bottom Right      │  └──────────────────────────┘     │
│  │                      │                                   │
│  │ Size:                │  [Reset to Defaults]              │
│  │ ○ Compact           │                                   │
│  │ ● Default           │                                   │
│  │ ○ Large             │                                   │
│  │                      │                                   │
│  │ Messages             │                                   │
│  │ ─────────────────    │                                   │
│  │ Welcome Message      │                                   │
│  │ ┌──────────────────┐│                                   │
│  │ │Hi! How can I help││                                   │
│  │ │you today?        ││                                   │
│  │ └──────────────────┘│                                   │
│  │                      │                                   │
│  │ Input Placeholder    │                                   │
│  │ ┌──────────────────┐│                                   │
│  │ │Type a message... ││                                   │
│  │ └──────────────────┘│                                   │
│  │                      │                                   │
│  │ Behavior             │                                   │
│  │ ─────────────────    │                                   │
│  │ ☑ Auto-open widget   │                                   │
│  │   Delay: [3] seconds │                                   │
│  │                      │                                   │
│  └──────────────────────┘                                   │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## Technical Approach

### Database Schema

```sql
-- widget_config table
CREATE TABLE widget_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) UNIQUE,

  -- Colors
  primary_color TEXT DEFAULT '#4F46E5',
  text_color TEXT DEFAULT '#FFFFFF',
  background_color TEXT DEFAULT '#FFFFFF',

  -- Position & Size
  position TEXT DEFAULT 'bottom-right', -- 'top-left', 'top-right', 'bottom-left', 'bottom-right'
  size TEXT DEFAULT 'default', -- 'compact', 'default', 'large'

  -- Branding
  avatar_url TEXT,
  business_name TEXT,
  bubble_icon TEXT DEFAULT 'chat', -- 'chat', 'help', 'message'

  -- Messages
  welcome_message TEXT DEFAULT 'Hi! How can I help you today?',
  input_placeholder TEXT DEFAULT 'Type a message...',

  -- Behavior
  auto_open BOOLEAN DEFAULT false,
  auto_open_delay INTEGER DEFAULT 3, -- seconds

  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX widget_config_project_idx ON widget_config(project_id);
```

### API Endpoints

```typescript
// GET /api/widget/:projectId/config
// Returns current widget configuration
{
  "primaryColor": "#4F46E5",
  "textColor": "#FFFFFF",
  "position": "bottom-right",
  "size": "default",
  "avatarUrl": "https://cdn.example.com/avatars/abc123.png",
  "businessName": "Acme Corp",
  "welcomeMessage": "Hi! How can I help you today?",
  "inputPlaceholder": "Type a message...",
  "autoOpen": false,
  "autoOpenDelay": 3
}

// PUT /api/widget/:projectId/config
// Update widget configuration
{
  "primaryColor": "#10B981",
  "position": "bottom-left"
}

// POST /api/widget/:projectId/avatar
// Upload custom avatar (multipart/form-data)
// Returns: { "avatarUrl": "https://cdn.example.com/avatars/xyz789.png" }
```

### Widget Loading with Config

```typescript
// apps/widget/src/widget.ts
interface WidgetConfig {
  projectId: string;
  primaryColor?: string;
  textColor?: string;
  position?: string;
  size?: string;
  avatarUrl?: string;
  welcomeMessage?: string;
  inputPlaceholder?: string;
  autoOpen?: boolean;
  autoOpenDelay?: number;
}

class ChatWidget {
  private config: WidgetConfig;

  async init(projectId: string) {
    // Fetch config from API
    const response = await fetch(`https://api.chatbot.com/api/widget/${projectId}/config`);
    this.config = await response.json();

    // Apply customizations
    this.applyStyles();
    this.setPosition();
    this.setWelcomeMessage();

    // Auto-open if configured
    if (this.config.autoOpen) {
      setTimeout(() => this.open(), this.config.autoOpenDelay * 1000);
    }
  }

  private applyStyles() {
    const root = document.documentElement;
    root.style.setProperty('--widget-primary-color', this.config.primaryColor);
    root.style.setProperty('--widget-text-color', this.config.textColor);

    const widget = document.getElementById('chatbot-widget');
    widget?.classList.add(`position-${this.config.position}`);
    widget?.classList.add(`size-${this.config.size}`);
  }

  private setPosition() {
    const widget = document.getElementById('chatbot-widget');
    const positions = {
      'top-left': { top: '20px', left: '20px' },
      'top-right': { top: '20px', right: '20px' },
      'bottom-left': { bottom: '20px', left: '20px' },
      'bottom-right': { bottom: '20px', right: '20px' },
    };

    const pos = positions[this.config.position] || positions['bottom-right'];
    Object.assign(widget.style, pos);
  }

  private setWelcomeMessage() {
    const welcomeElement = document.getElementById('welcome-message');
    if (welcomeElement) {
      welcomeElement.textContent = this.config.welcomeMessage;
    }
  }
}

// Initialize widget
window.ChatWidget = new ChatWidget();
window.ChatWidget.init('proj_abc123');
```

### Avatar Upload Service

```typescript
// apps/api/src/services/avatar-upload.ts
import { S3 } from '@aws-sdk/client-s3';
import sharp from 'sharp';

async function uploadAvatar(
  projectId: string,
  file: File
): Promise<string> {
  // Validate file
  if (file.size > 500 * 1024) {
    throw new Error('File too large (max 500KB)');
  }

  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    throw new Error('Invalid file type');
  }

  // Process image: resize and optimize
  const buffer = await file.arrayBuffer();
  const processedImage = await sharp(Buffer.from(buffer))
    .resize(200, 200, { fit: 'cover' })
    .webp({ quality: 85 })
    .toBuffer();

  // Upload to S3 or CDN
  const s3 = new S3({ region: 'us-east-1' });
  const key = `avatars/${projectId}/${Date.now()}.webp`;

  await s3.putObject({
    Bucket: 'chatbot-assets',
    Key: key,
    Body: processedImage,
    ContentType: 'image/webp',
    CacheControl: 'public, max-age=31536000',
  });

  const url = `https://cdn.chatbot.com/${key}`;

  // Update widget config
  await updateWidgetConfig(projectId, { avatarUrl: url });

  return url;
}
```

### Color Validation

```typescript
// apps/api/src/utils/color-validator.ts
function isValidHexColor(color: string): boolean {
  return /^#[0-9A-F]{6}$/i.test(color);
}

function ensureContrast(
  backgroundColor: string,
  textColor: string
): { valid: boolean; ratio: number } {
  const bgLuminance = calculateLuminance(backgroundColor);
  const fgLuminance = calculateLuminance(textColor);

  const ratio =
    (Math.max(bgLuminance, fgLuminance) + 0.05) /
    (Math.min(bgLuminance, fgLuminance) + 0.05);

  // WCAG AA requires 4.5:1 for normal text
  return { valid: ratio >= 4.5, ratio };
}
```

---

## Acceptance Criteria

### Definition of Done
- [ ] Dashboard displays all customization options
- [ ] Color picker updates colors in real-time
- [ ] Position selector changes widget position
- [ ] Avatar upload works (max 500KB)
- [ ] Welcome message updates in preview
- [ ] Auto-open behavior works as configured
- [ ] Changes save and persist across sessions
- [ ] Widget loads with custom config on websites
- [ ] Color contrast validation prevents inaccessible combinations

### Demo Checklist
- [ ] Change primary color and see preview update
- [ ] Change widget position from bottom-right to bottom-left
- [ ] Upload custom avatar image
- [ ] Change welcome message
- [ ] Enable auto-open with 5-second delay
- [ ] Save changes and verify widget updates on test site

---

## Edge Cases

| # | Scenario | Expected Behavior |
|---|----------|-------------------|
| 1 | Invalid hex color | Show validation error |
| 2 | Low contrast colors | Warn user, suggest alternatives |
| 3 | Avatar upload fails | Show error, keep existing avatar |
| 4 | Avatar >500KB | Show size error before upload |
| 5 | Very long welcome message | Truncate at 200 chars |
| 6 | Conflicting position with site | User can override |

---

## Performance Requirements

| Metric | Target |
|--------|--------|
| Config load time | <300ms |
| Preview update latency | <100ms (instant) |
| Avatar upload time | <3s |
| Widget init with config | <500ms |

---

## Changelog

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | December 2024 | Product Team | Initial spec for V2 |
