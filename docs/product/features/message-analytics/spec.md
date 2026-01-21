# Message Analytics Metadata

## Overview

Capture contextual metadata with each chat message for analytics, reporting, and user insights. This enables businesses to understand their customers better, see where conversations originate, and analyze usage patterns across devices, locations, and pages.

---

## Problem Statement

Currently, SupportBase captures the bare minimum data with each message:
- Message content
- Visitor ID
- Conversation source (widget/api)
- AI response metadata (sources used, tool calls)

We're missing valuable contextual information that would help businesses:
- Understand which pages generate the most support questions
- Know if users are on mobile vs desktop
- See geographic distribution of customers
- Track user journeys through their site during conversations

---

## Current State Analysis

### Schema Fields Already Exist (But NOT Populated)

The `customers` table already has these empty fields:

```sql
last_browser TEXT,       -- NOT POPULATED
last_device TEXT,        -- NOT POPULATED
last_os TEXT,            -- NOT POPULATED
last_page_url TEXT,      -- NOT POPULATED
last_location TEXT,      -- NOT POPULATED (City, Country from IP)
```

### What's Currently Captured

| Data | Stored | Location |
|------|--------|----------|
| Message content | Yes | messages.content |
| Visitor ID | Yes | customers.visitor_id |
| Conversation source | Yes | conversations.source |
| AI metadata (sources, tool calls) | Yes | messages.metadata |
| IP address | No | Only used for rate limiting |
| User agent / Browser | No | Not collected |
| Page URL | No | Schema exists, not populated |
| Device type | No | Schema exists, not populated |

---

## Solution: What to Capture

### Per-Message Metadata

Store in `messages.metadata` JSONB field:

```typescript
interface MessageMetadata {
  // Existing fields
  sourcesUsed?: number;
  toolCallsCount?: number;

  // NEW - Page Context
  pageUrl?: string;        // URL where chat was opened
  pageTitle?: string;      // Page title for context
  referrer?: string;       // How they got to this page

  // NEW - Device Info (only for customer messages)
  userAgent?: string;      // Full user agent string
  browser?: string;        // "Chrome 120"
  browserVersion?: string; // "120.0.0"
  os?: string;             // "macOS"
  osVersion?: string;      // "14.2"
  device?: string;         // "desktop" | "mobile" | "tablet"
  screenWidth?: number;    // Viewport width
  screenHeight?: number;   // Viewport height

  // NEW - Network/Location (server-side)
  ipAddress?: string;      // From request headers
  country?: string;        // From IP geolocation lookup
  city?: string;           // From IP geolocation lookup
  timezone?: string;       // From browser
}
```

### Per-Customer Context (Updated on Each Visit)

Update existing `customers` table fields on every message:

```sql
last_browser      -- "Chrome 120"
last_device       -- "desktop" | "mobile" | "tablet"
last_os           -- "macOS 14.2"
last_page_url     -- "https://example.com/pricing"
last_location     -- "San Francisco, US"
```

### Per-Conversation Metadata

Store in `conversations.metadata` JSONB field:

```typescript
interface ConversationMetadata {
  // First message context (snapshot when conversation started)
  entryPage?: string;      // Page where conversation started
  entryReferrer?: string;  // How they found the site

  // Session tracking
  sessionDuration?: number; // Seconds from first to last message
  pagesVisited?: string[];  // All pages visited during conversation

  // Device snapshot (at conversation start)
  device?: string;
  browser?: string;
  os?: string;
  country?: string;
}
```

---

## Implementation Plan

### Phase 1: Widget - Collect Client-Side Data

#### New File: `apps/widget/src/utils/device-info.ts`

Create utility to collect device and page context:

```typescript
export interface DeviceInfo {
  // Browser
  userAgent: string;
  browser: string;
  browserVersion: string;

  // OS
  os: string;
  osVersion: string;

  // Device
  device: 'desktop' | 'mobile' | 'tablet';
  screenWidth: number;
  screenHeight: number;

  // Page context
  pageUrl: string;
  pageTitle: string;
  referrer: string;

  // Timezone & Language
  timezone: string;
  language: string;
}

export function getDeviceInfo(): DeviceInfo {
  const ua = navigator.userAgent;

  return {
    userAgent: ua,
    browser: detectBrowser(ua),
    browserVersion: detectBrowserVersion(ua),
    os: detectOS(ua),
    osVersion: detectOSVersion(ua),
    device: detectDevice(ua),
    screenWidth: window.innerWidth,
    screenHeight: window.innerHeight,
    pageUrl: window.location.href,
    pageTitle: document.title,
    referrer: document.referrer,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: navigator.language,
  };
}

// Browser detection from user agent
function detectBrowser(ua: string): string {
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Edg')) return 'Edge';
  if (ua.includes('Chrome')) return 'Chrome';
  if (ua.includes('Safari')) return 'Safari';
  if (ua.includes('Opera') || ua.includes('OPR')) return 'Opera';
  return 'Unknown';
}

function detectBrowserVersion(ua: string): string {
  const browser = detectBrowser(ua);
  const patterns: Record<string, RegExp> = {
    Firefox: /Firefox\/(\d+)/,
    Edge: /Edg\/(\d+)/,
    Chrome: /Chrome\/(\d+)/,
    Safari: /Version\/(\d+)/,
    Opera: /(?:Opera|OPR)\/(\d+)/,
  };
  const match = ua.match(patterns[browser]);
  return match ? match[1] : '';
}

// OS detection from user agent
function detectOS(ua: string): string {
  if (ua.includes('Windows')) return 'Windows';
  if (ua.includes('Mac OS')) return 'macOS';
  if (ua.includes('Linux')) return 'Linux';
  if (ua.includes('Android')) return 'Android';
  if (ua.includes('iPhone') || ua.includes('iPad')) return 'iOS';
  return 'Unknown';
}

function detectOSVersion(ua: string): string {
  const os = detectOS(ua);
  const patterns: Record<string, RegExp> = {
    Windows: /Windows NT (\d+\.\d+)/,
    macOS: /Mac OS X (\d+[._]\d+)/,
    Android: /Android (\d+)/,
    iOS: /OS (\d+[._]\d+)/,
  };
  const match = ua.match(patterns[os]);
  if (match) {
    return match[1].replace('_', '.');
  }
  return '';
}

// Device type detection
function detectDevice(ua: string): 'desktop' | 'mobile' | 'tablet' {
  if (/iPad|Android(?!.*Mobile)|Tablet/i.test(ua)) return 'tablet';
  if (/Mobile|iPhone|Android.*Mobile|webOS|BlackBerry/i.test(ua)) return 'mobile';
  return 'desktop';
}
```

#### Modify: `apps/widget/src/utils/api.ts`

Add device info to message payload:

```typescript
import { getDeviceInfo } from './device-info';

export async function sendMessage(options: SendMessageOptions): Promise<SendMessageResponse> {
  const deviceInfo = getDeviceInfo();

  const response = await fetch(`${apiUrl}/api/chat/message`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Visitor-Id": visitorId,
    },
    body: JSON.stringify({
      projectId,
      message,
      visitorId,
      sessionId: sessionId || undefined,
      conversationHistory: conversationHistory || [],
      source: "widget",
      // NEW - Device context
      context: {
        pageUrl: deviceInfo.pageUrl,
        pageTitle: deviceInfo.pageTitle,
        referrer: deviceInfo.referrer,
        browser: deviceInfo.browser,
        browserVersion: deviceInfo.browserVersion,
        os: deviceInfo.os,
        osVersion: deviceInfo.osVersion,
        device: deviceInfo.device,
        screenWidth: deviceInfo.screenWidth,
        screenHeight: deviceInfo.screenHeight,
        timezone: deviceInfo.timezone,
        language: deviceInfo.language,
      },
    }),
  });
}
```

---

### Phase 2: API - Capture Server-Side Data

#### New File: `apps/api/src/services/ip-geo.ts`

IP geolocation service using free ip-api.com (no API key needed, 45 req/min limit):

```typescript
export interface GeoInfo {
  country: string | null;
  city: string | null;
  timezone: string | null;
}

// Check if IP is private/localhost
function isPrivateIP(ip: string): boolean {
  if (!ip || ip === '::1' || ip === '127.0.0.1' || ip === 'localhost') {
    return true;
  }
  // Private ranges
  const privateRanges = [
    /^10\./,
    /^172\.(1[6-9]|2[0-9]|3[01])\./,
    /^192\.168\./,
  ];
  return privateRanges.some(range => range.test(ip));
}

// Free IP geolocation using ip-api.com
export async function getGeoFromIP(ip: string): Promise<GeoInfo | null> {
  // Skip for localhost/private IPs
  if (isPrivateIP(ip)) {
    return null;
  }

  try {
    const response = await fetch(
      `http://ip-api.com/json/${ip}?fields=status,country,city,timezone`
    );
    const data = await response.json();

    if (data.status === 'success') {
      return {
        country: data.country,
        city: data.city,
        timezone: data.timezone,
      };
    }
    return null;
  } catch (error) {
    console.error('IP geolocation failed:', error);
    return null;
  }
}
```

#### Modify: `apps/api/src/routes/chat.ts`

Capture IP address and pass context through:

```typescript
import { getGeoFromIP } from '../services/ip-geo';

router.post("/message", chatRateLimiter, async (req, res) => {
  const {
    projectId,
    message,
    visitorId,
    sessionId,
    conversationHistory,
    source,
    context  // NEW - from widget
  } = req.body;

  // Get IP address (handle proxies)
  const forwardedFor = req.headers['x-forwarded-for'];
  const ipAddress = typeof forwardedFor === 'string'
    ? forwardedFor.split(',')[0].trim()
    : req.ip || '';

  // Get geolocation from IP
  const geo = await getGeoFromIP(ipAddress);

  // Merge context from widget with server-side data
  const fullContext = {
    ...context,
    ipAddress,
    country: geo?.country || context?.country,
    city: geo?.city || context?.city,
  };

  const result = await processChat({
    projectId,
    message,
    visitorId,
    sessionId,
    conversationHistory,
    source,
    context: fullContext, // Pass full context through
  });

  // ... rest of handler
});
```

---

### Phase 3: Store Metadata in Database

#### Modify: `apps/api/src/services/conversation.ts`

##### Update `addMessage()` to include context:

```typescript
export interface MessageContext {
  pageUrl?: string;
  pageTitle?: string;
  referrer?: string;
  browser?: string;
  browserVersion?: string;
  os?: string;
  osVersion?: string;
  device?: string;
  screenWidth?: number;
  screenHeight?: number;
  timezone?: string;
  language?: string;
  ipAddress?: string;
  country?: string;
  city?: string;
}

export async function addMessage(
  conversationId: string,
  senderType: "customer" | "ai" | "agent" | "system",
  content: string,
  metadata?: Record<string, unknown>,
  senderId?: string,
  context?: MessageContext  // NEW parameter
): Promise<string> {
  const { data, error } = await supabaseAdmin
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_type: senderType,
      content,
      metadata: {
        ...metadata,
        // Merge context for customer messages only
        ...(senderType === 'customer' && context ? {
          pageUrl: context.pageUrl,
          pageTitle: context.pageTitle,
          browser: context.browser,
          os: context.os,
          device: context.device,
          country: context.country,
          city: context.city,
          timezone: context.timezone,
          // Note: Don't store full IP by default for privacy
        } : {}),
      },
      sender_id: senderId,
    })
    .select("id")
    .single();

  if (error) throw error;
  return data.id;
}
```

##### Update `getOrCreateCustomer()` to populate device fields:

```typescript
async function getOrCreateCustomer(
  projectId: string,
  visitorId: string,
  context?: MessageContext  // NEW parameter
): Promise<string> {
  const { data: existing } = await supabaseAdmin
    .from("customers")
    .select("id")
    .eq("project_id", projectId)
    .eq("visitor_id", visitorId)
    .single();

  // Build customer update with context
  const customerUpdate: Record<string, unknown> = {
    last_seen_at: new Date().toISOString(),
  };

  // Add device context if provided
  if (context) {
    if (context.browser) {
      customerUpdate.last_browser = context.browserVersion
        ? `${context.browser} ${context.browserVersion}`
        : context.browser;
    }
    if (context.device) {
      customerUpdate.last_device = context.device;
    }
    if (context.os) {
      customerUpdate.last_os = context.osVersion
        ? `${context.os} ${context.osVersion}`
        : context.os;
    }
    if (context.pageUrl) {
      customerUpdate.last_page_url = context.pageUrl;
    }
    if (context.city && context.country) {
      customerUpdate.last_location = `${context.city}, ${context.country}`;
    } else if (context.country) {
      customerUpdate.last_location = context.country;
    }
  }

  if (existing) {
    // Update existing customer
    await supabaseAdmin
      .from("customers")
      .update(customerUpdate)
      .eq("id", existing.id);
    return existing.id;
  }

  // Create new customer with context
  const { data: newCustomer, error } = await supabaseAdmin
    .from("customers")
    .insert({
      project_id: projectId,
      visitor_id: visitorId,
      ...customerUpdate,
    })
    .select("id")
    .single();

  if (error) throw error;
  return newCustomer.id;
}
```

#### Modify: `apps/api/src/services/chat-engine.ts`

Pass context through the processing pipeline:

```typescript
export interface ProcessChatOptions {
  projectId: string;
  message: string;
  visitorId: string;
  sessionId?: string;
  conversationHistory?: ConversationMessage[];
  source: string;
  context?: MessageContext;  // NEW
}

export async function processChat(options: ProcessChatOptions): Promise<ChatResult> {
  const { projectId, message, visitorId, sessionId, conversationHistory, source, context } = options;

  // Get or create customer with context
  const customerId = await getOrCreateCustomer(projectId, visitorId, context);

  // Get or create conversation
  const conversation = await getOrCreateConversation(
    projectId,
    customerId,
    sessionId,
    context  // Pass context for conversation metadata
  );

  // Add customer message with context
  await addMessage(
    conversation.id,
    'customer',
    message,
    undefined,
    customerId,
    context  // Pass context
  );

  // ... rest of processing
}
```

---

## Privacy Considerations

### GDPR Compliance

1. **IP Address Handling**
   - By default, only store geolocation (country/city), NOT the full IP address
   - Optional setting to store IP for businesses that need it
   - IP masking: Store only first 3 octets (e.g., 192.168.1.xxx)

2. **Consent Management**
   - If strict privacy mode enabled, don't collect device info until consent
   - Clear opt-out mechanism in widget settings

3. **Data Retention**
   - Allow configurable retention period for metadata
   - Auto-purge detailed metadata after X days while keeping aggregate stats

4. **Right to Delete**
   - Include metadata in customer data export
   - Delete all metadata when customer requests deletion

### Project-Level Analytics Settings

```typescript
interface AnalyticsSettings {
  collectDeviceInfo: boolean;     // Default: true
  collectPageUrl: boolean;        // Default: true
  collectIpAddress: boolean;      // Default: false (only geo)
  collectGeolocation: boolean;    // Default: true
  maskIpAddress: boolean;         // Default: true (store geo, not IP)
}
```

---

## Dashboard Usage (Future)

### Conversation List View
- Device icon column (desktop/mobile/tablet)
- Country flag column
- Page URL shown on hover

### Conversation Detail
- Sidebar panel showing customer context:
  - Device: Chrome 120 on macOS
  - Location: San Francisco, US
  - Entry page: /pricing
  - Pages visited during conversation

### Analytics Dashboard
- Messages by device type (pie chart)
- Messages by country (map)
- Popular pages for chat initiation
- Browser breakdown
- Time-of-day patterns by timezone

---

## Files to Modify Summary

### Widget (apps/widget)
| File | Action | Description |
|------|--------|-------------|
| `src/utils/device-info.ts` | NEW | Device detection utilities |
| `src/utils/api.ts` | MODIFY | Add context to sendMessage() |

### API (apps/api)
| File | Action | Description |
|------|--------|-------------|
| `src/services/ip-geo.ts` | NEW | IP geolocation service |
| `src/routes/chat.ts` | MODIFY | Capture IP, pass context |
| `src/services/conversation.ts` | MODIFY | Store context in messages & customers |
| `src/services/chat-engine.ts` | MODIFY | Pass context through processing |

### Dashboard (apps/web) - Future Phase
| File | Action | Description |
|------|--------|-------------|
| Conversation list | MODIFY | Add device/location columns |
| Conversation detail | MODIFY | Add context sidebar |

---

## Verification Plan

### 1. Widget Sends Context
- Open widget on a test page
- Send a message
- Check browser Network tab
- Verify request payload includes `context` object with:
  - pageUrl
  - browser/browserVersion
  - os/osVersion
  - device
  - timezone

### 2. API Stores Context
- Send message from widget
- Query Supabase `messages` table:
  ```sql
  SELECT metadata FROM messages
  WHERE conversation_id = '<id>'
  ORDER BY created_at DESC LIMIT 1;
  ```
- Verify metadata contains device/page info
- Query `customers` table:
  ```sql
  SELECT last_browser, last_device, last_os, last_page_url, last_location
  FROM customers
  WHERE visitor_id = '<visitor_id>';
  ```
- Verify fields are populated

### 3. Geolocation Works
- Deploy to production or use a VPN
- Send message from non-localhost IP
- Verify country/city populated in:
  - messages.metadata
  - customers.last_location

### 4. Privacy Controls Work
- Toggle analytics settings off
- Send message
- Verify metadata not captured when disabled

---

## Implementation Priority

1. **Phase 1 - Widget** (High Priority)
   - Client-side data collection is the foundation
   - No backend changes needed to start collecting

2. **Phase 2 - API** (High Priority)
   - IP geolocation adds valuable location data
   - Context passthrough enables storage

3. **Phase 3 - Storage** (High Priority)
   - Populate existing empty fields
   - Store per-message context

4. **Dashboard Updates** (Future)
   - Display captured data
   - Build analytics views

---

## Success Metrics

- 100% of customer messages have device metadata
- 90%+ of messages have location data (excluding localhost)
- Customer table fields populated for all returning visitors
- No performance degradation (IP lookup < 100ms)
