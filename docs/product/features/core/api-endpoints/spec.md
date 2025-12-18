# Feature: API Endpoint Configuration

## Overview

**Feature ID**: `api-endpoints`
**Category**: Core (V1)
**Priority**: P0 (Core functionality)
**Complexity**: M
**Estimated Effort**: 3-4 days

### Summary
Users configure external APIs that the chatbot can call as "tools" to fetch real-time data. When a customer asks about their order status, inventory, or other dynamic information, the LLM intelligently decides when to call these APIs based on the user's question and endpoint descriptions.

### Dependencies
- `database-setup` - Tables for api_endpoints must exist
- `auth-system` - User must be authenticated to configure endpoints

### Success Criteria
- [ ] Users can add API endpoints with name, description, URL, method, and auth
- [ ] Users can test endpoints from the dashboard
- [ ] Credentials are stored encrypted
- [ ] URL supports {placeholder} syntax for dynamic parameters
- [ ] Users can edit and delete endpoints
- [ ] Endpoints are available to chat engine as tools

---

## User Stories

### Primary User Story
> As a business owner, I want to connect my order status API so customers can check their orders through the chatbot without contacting me.

### Additional Stories
1. As a user, I want to write good descriptions so that the AI knows when to call my API.
2. As a user, I want to test my endpoint so that I know it's configured correctly before customers use it.
3. As a user, I want my API credentials stored securely so that I don't worry about leaks.

---

## Functional Requirements

### Endpoint Configuration

| ID | Requirement | Priority | Notes |
|----|-------------|----------|-------|
| API-001 | User can add new API endpoint | Must Have | Form-based |
| API-002 | Name field (required, max 100 chars) | Must Have | Human readable |
| API-003 | Description field (required, max 500 chars) | Must Have | Guides LLM |
| API-004 | URL field (required, valid URL) | Must Have | Supports placeholders |
| API-005 | Method dropdown (GET/POST) | Must Have | Default: GET |
| API-006 | Auth type dropdown (None/API Key/Bearer) | Must Have | Default: None |
| API-007 | Auth credentials input (conditional) | Must Have | Based on auth type |
| API-008 | Test endpoint button | Must Have | Validates config |
| API-009 | List all configured endpoints | Must Have | With actions |
| API-010 | Edit existing endpoint | Must Have | Full form |
| API-011 | Delete endpoint | Must Have | With confirmation |
| API-012 | Encrypt credentials at rest | Must Have | Security requirement |
| API-013 | Limit 10 endpoints per project (V1) | Should Have | Prevent abuse |

---

## User Interface

### API Endpoints Page (`/dashboard/api-endpoints`)

**Route**: `/dashboard/api-endpoints`
**Purpose**: View and manage API endpoint configurations

**Layout**:
```
┌─────────────────────────────────────────────────────────────────┐
│  Sidebar  │  API Endpoints                    [+ Add Endpoint]  │
│           ├─────────────────────────────────────────────────────│
│           │                                                     │
│           │  Connect APIs so your chatbot can fetch             │
│           │  real-time data like order status or inventory.     │
│           │                                                     │
│           │  ┌───────────────────────────────────────────────┐  │
│           │  │ 🔌 Order Status                               │  │
│           │  │ GET https://api.mystore.com/orders/{order_id} │  │
│           │  │ Auth: Bearer Token                            │  │
│           │  │                           [Test] [Edit] [Del] │  │
│           │  └───────────────────────────────────────────────┘  │
│           │                                                     │
│           │  ┌───────────────────────────────────────────────┐  │
│           │  │ 🔌 Product Inventory                          │  │
│           │  │ GET https://api.mystore.com/stock/{sku}       │  │
│           │  │ Auth: API Key                                 │  │
│           │  │                           [Test] [Edit] [Del] │  │
│           │  └───────────────────────────────────────────────┘  │
│           │                                                     │
│           │  ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐  │
│           │    Empty: No endpoints configured.               │  │
│           │    Add one to enable real-time data.            │  │
│           │  └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘  │
│           │                                                     │
└───────────┴─────────────────────────────────────────────────────┘
```

### Add/Edit Endpoint Modal

**Layout**:
```
┌─────────────────────────────────────────────────────────────────┐
│  Add API Endpoint                                         [X]   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Name *                                                         │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Order Status                                             │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Description *                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Get order status and tracking information. Use when     │   │
│  │ customer asks about their order, shipping, or delivery. │   │
│  │ Requires order_id parameter.                            │   │
│  └─────────────────────────────────────────────────────────┘   │
│  ℹ️ Describe when the AI should call this API.                  │
│                                                                 │
│  URL *                                                          │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ https://api.mystore.com/orders/{order_id}               │   │
│  └─────────────────────────────────────────────────────────┘   │
│  ℹ️ Use {param} for values the AI will extract from the chat.   │
│                                                                 │
│  Method                         Authentication                  │
│  ┌─────────────┐               ┌─────────────────┐             │
│  │ GET      ▼  │               │ Bearer Token ▼  │             │
│  └─────────────┘               └─────────────────┘             │
│                                                                 │
│  Bearer Token *                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ••••••••••••••••••••••••••••                            │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────┐                                           │
│  │  Test Endpoint  │  ✓ Connection successful (200 OK)         │
│  └─────────────────┘                                           │
│                                                                 │
│                                [Cancel]  [Save Endpoint]        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Auth Type Options**:
- **None**: No additional fields
- **API Key**: Shows "API Key" input and "Header Name" input (default: X-API-Key)
- **Bearer Token**: Shows "Token" input

---

## API Specification

### Endpoints

#### GET /api/endpoints

**Purpose**: List all API endpoints for user's project

**Authentication**: Required (Supabase JWT)

**Response**:
```typescript
// 200 OK
{
  "endpoints": [
    {
      "id": "ep_abc123",
      "name": "Order Status",
      "description": "Get order status by order ID...",
      "url": "https://api.mystore.com/orders/{order_id}",
      "method": "GET",
      "authType": "bearer",
      "createdAt": "2024-12-15T10:30:00Z"
    }
  ]
}
```

#### POST /api/endpoints

**Purpose**: Create new API endpoint

**Request**:
```typescript
{
  "name": "Order Status",
  "description": "Get order status and tracking...",
  "url": "https://api.mystore.com/orders/{order_id}",
  "method": "GET",
  "authType": "bearer",
  "authConfig": {
    "bearerToken": "xxx"
  }
}
```

**Response**:
```typescript
// 201 Created
{
  "endpoint": {
    "id": "ep_abc123",
    "name": "Order Status",
    ...
  }
}

// 400 Bad Request
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Description is required"
  }
}
```

#### POST /api/endpoints/:id/test

**Purpose**: Test endpoint configuration

**Response**:
```typescript
// 200 OK - Test succeeded
{
  "success": true,
  "status": 200,
  "statusText": "OK",
  "responseTime": 234
}

// 200 OK - Test failed
{
  "success": false,
  "status": 401,
  "error": "Unauthorized - check credentials"
}
```

#### PUT /api/endpoints/:id

**Purpose**: Update endpoint configuration

#### DELETE /api/endpoints/:id

**Purpose**: Delete endpoint

---

## Data Model

### ApiEndpoint Interface

```typescript
interface ApiEndpoint {
  id: string;
  projectId: string;
  name: string;
  description: string;
  url: string;
  method: 'GET' | 'POST';
  authType: 'none' | 'api_key' | 'bearer';
  authConfig: {
    apiKey?: string;
    apiKeyHeader?: string;    // Default: X-API-Key
    bearerToken?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}
```

### URL Parameter Extraction

```typescript
// Extract parameters from URL template
function extractUrlParams(url: string): string[] {
  const matches = url.match(/\{(\w+)\}/g) || [];
  return matches.map(m => m.slice(1, -1));
}

// Example:
// URL: "https://api.store.com/orders/{order_id}/items/{item_id}"
// Returns: ["order_id", "item_id"]
```

---

## Technical Implementation

### Credential Encryption

```typescript
// apps/api/src/services/encryption.ts
import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY!; // 32 bytes
const ALGORITHM = 'aes-256-gcm';

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

export function decrypt(encryptedText: string): string {
  const [ivHex, authTagHex, encrypted] = encryptedText.split(':');

  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);

  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
```

### Test Endpoint Logic

```typescript
// apps/api/src/routes/endpoints.ts
async function testEndpoint(endpoint: ApiEndpoint): Promise<TestResult> {
  // Replace placeholders with test values
  const testUrl = endpoint.url.replace(/\{(\w+)\}/g, 'test_value');

  // Build headers
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const authConfig = decrypt(endpoint.authConfig);

  switch (endpoint.authType) {
    case 'api_key':
      headers[authConfig.apiKeyHeader || 'X-API-Key'] = authConfig.apiKey;
      break;
    case 'bearer':
      headers['Authorization'] = `Bearer ${authConfig.bearerToken}`;
      break;
  }

  const startTime = Date.now();

  try {
    const response = await fetch(testUrl, {
      method: endpoint.method,
      headers,
      signal: AbortSignal.timeout(10000), // 10s timeout
    });

    return {
      success: response.ok,
      status: response.status,
      statusText: response.statusText,
      responseTime: Date.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Connection failed',
      responseTime: Date.now() - startTime,
    };
  }
}
```

### Convert Endpoint to LLM Tool

```typescript
// apps/api/src/services/tool-executor.ts
function endpointToOpenAITool(endpoint: ApiEndpoint) {
  const params = extractUrlParams(endpoint.url);

  return {
    type: 'function' as const,
    function: {
      name: endpoint.id, // Use ID as unique function name
      description: endpoint.description,
      parameters: {
        type: 'object',
        properties: Object.fromEntries(
          params.map(param => [
            param,
            {
              type: 'string',
              description: `The ${param.replace(/_/g, ' ')} to look up`,
            },
          ])
        ),
        required: params,
      },
    },
  };
}

// Example output:
// {
//   type: 'function',
//   function: {
//     name: 'ep_abc123',
//     description: 'Get order status...',
//     parameters: {
//       type: 'object',
//       properties: {
//         order_id: { type: 'string', description: 'The order id to look up' }
//       },
//       required: ['order_id']
//     }
//   }
// }
```

---

## Error Handling

### Error Codes

| Code | HTTP Status | Message | User-Facing Message |
|------|-------------|---------|---------------------|
| VALIDATION_ERROR | 400 | Field validation failed | "Please check your input" |
| INVALID_URL | 400 | URL format invalid | "Please enter a valid URL" |
| LIMIT_REACHED | 400 | Max endpoints exceeded | "Maximum 10 endpoints per project" |
| TEST_TIMEOUT | 408 | Test request timed out | "Connection timed out (10s)" |
| TEST_AUTH_FAILED | 401 | Auth test failed | "Authentication failed - check credentials" |
| NOT_FOUND | 404 | Endpoint not found | "Endpoint not found" |

---

## Edge Cases

| # | Scenario | Expected Behavior |
|---|----------|-------------------|
| 1 | URL without placeholders | Valid - static endpoint |
| 2 | URL with multiple placeholders | Extract all as required params |
| 3 | Invalid URL format | Show validation error |
| 4 | Test fails (network) | Show "Connection failed" |
| 5 | Test fails (timeout) | Show "Connection timed out" |
| 6 | Test fails (auth) | Show "Authentication failed" |
| 7 | Delete endpoint in use | Graceful - chat handles missing endpoint |
| 8 | 11th endpoint attempt | Show limit error |
| 9 | Edit auth type | Clear previous auth config |
| 10 | Special chars in URL | URL encode appropriately |

---

## Testing Requirements

### Unit Tests
- [ ] URL parameter extraction works correctly
- [ ] Encryption/decryption round-trips correctly
- [ ] Tool conversion produces valid OpenAI format
- [ ] Auth header building for all types

### Integration Tests
- [ ] Create endpoint flow complete
- [ ] Test endpoint makes actual HTTP request
- [ ] Edit preserves encrypted credentials
- [ ] Delete removes from database

### E2E Tests
- [ ] User can add endpoint with bearer auth
- [ ] User can test endpoint and see result
- [ ] User can edit and delete endpoint

---

## Acceptance Criteria

### Definition of Done
- [ ] Add endpoint form with all fields
- [ ] Test button validates configuration
- [ ] Credentials encrypted in database
- [ ] Edit and delete working
- [ ] Endpoints available as tools
- [ ] Limit enforced
- [ ] Error handling complete

### Demo Checklist
- [ ] Add order status endpoint
- [ ] Test endpoint shows success
- [ ] Edit endpoint credentials
- [ ] Show endpoint as tool in LLM

---

## Changelog

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | December 2024 | Morgan (PM) | Initial spec |
