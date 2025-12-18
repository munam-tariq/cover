# Webhooks Feature Specification

## Metadata
- **Feature ID**: ADV-005
- **Feature Name**: Webhooks
- **Category**: Advanced
- **Priority**: P2
- **Complexity**: Medium
- **Target Version**: V3
- **Dependencies**: Core event system, API authentication
- **Owner**: Product Team
- **Status**: Planned

## Summary
Enable users to configure HTTP webhooks that notify external systems of events occurring in Cover (new conversations, escalations, knowledge base updates). Webhooks provide real-time integration with CRMs, support platforms, analytics tools, and custom applications, with support for retries, security, and event filtering.

## User Story
As a Cover user, I want to receive real-time notifications when important events occur in my chatbot so that I can integrate Cover with my existing tools, automate workflows, and build custom integrations without polling the API.

## Functional Requirements

### FR-001: Webhook Configuration
- Users can create multiple webhooks per project
- Each webhook requires: URL, events to subscribe to, optional secret for signing
- Webhook testing: Send test payload to verify endpoint
- Enable/disable webhooks without deleting configuration
- Webhook name and description for identification

### FR-002: Supported Events
- **conversation.started**: New conversation initiated
- **conversation.ended**: Conversation marked as complete
- **conversation.escalated**: Conversation escalated to human
- **message.received**: User sent a message
- **message.sent**: Bot sent a message
- **knowledge.updated**: Knowledge base item added/updated/deleted
- **feedback.submitted**: User provided feedback on response
- **project.settings.changed**: Project settings modified
- All events or selective subscription available

### FR-003: Webhook Payload
- JSON payload with event type, timestamp, project ID, and event data
- Consistent structure across all event types
- Includes relevant entity (conversation, message, knowledge item)
- Webhook signature in header for verification (HMAC-SHA256)
- Retry attempt number in header

### FR-004: Delivery & Retry Logic
- Webhooks delivered via HTTP POST within 1 second of event
- Automatic retry for failed deliveries: 3 attempts with exponential backoff
- Retry schedule: Immediate, 1 minute, 5 minutes
- Failure reasons logged (timeout, 4xx/5xx errors, connection refused)
- Webhook disabled after 10 consecutive failures

### FR-005: Security
- HTTPS-only webhook URLs (enforced)
- Optional webhook secret for payload signing
- Signature sent in `X-Cover-Signature` header
- Request timeout: 10 seconds
- IP whitelist for webhook sources (optional)

### FR-006: Monitoring & Logs
- Dashboard shows webhook delivery status and success rate
- Event log displays recent webhook deliveries (last 100)
- Log includes: timestamp, event type, status code, response time, retry count
- Filter logs by webhook, event type, status
- Export logs as CSV

### FR-007: Rate Limiting
- Webhooks respect rate limits: 100 requests per second per endpoint
- If rate limit exceeded, requests are queued
- Queue capacity: 1000 events, oldest dropped if exceeded
- Rate limit notifications sent to user

### FR-008: Webhook Management
- List all webhooks with status (active, disabled, failed)
- Edit webhook URL, events, and secret
- Delete webhooks with confirmation
- Bulk operations (enable/disable multiple webhooks)
- Webhook health score based on delivery success rate

## UI Mockup

```
Webhooks Dashboard:
+----------------------------------------------------------+
|  Webhooks                               [+ Add Webhook]  |
+----------------------------------------------------------+
|                                                           |
|  Active Webhooks (2)                                      |
|                                                           |
|  +------------------------------------------------------+|
|  | CRM Integration                           [Active]   ||
|  | https://api.crm.com/cover/webhook                    ||
|  | Events: conversation.started, conversation.ended     ||
|  | Success Rate: 99.2% (1,245 / 1,255)                  ||
|  | Last Delivery: 2 minutes ago                         ||
|  |                                                      ||
|  | [View Logs] [Edit] [Disable] [Delete]                ||
|  +------------------------------------------------------+|
|                                                           |
|  +------------------------------------------------------+|
|  | Slack Notifications                      [Disabled]   ||
|  | https://hooks.slack.com/services/T00/B00/X00         ||
|  | Events: conversation.escalated, feedback.submitted   ||
|  | Success Rate: 87.5% (70 / 80)                        ||
|  | Last Delivery: 3 days ago                            ||
|  | Warning: 5 consecutive failures, auto-disabled       ||
|  |                                                      ||
|  | [View Logs] [Edit] [Enable] [Delete]                 ||
|  +------------------------------------------------------+|
|                                                           |
+----------------------------------------------------------+

Add/Edit Webhook Modal:
+----------------------------------------------------------+
|  Add Webhook                                   [x Close] |
+----------------------------------------------------------+
|                                                           |
|  Webhook Name:                                            |
|  [CRM Integration_____________________________]           |
|                                                           |
|  Endpoint URL: *                                          |
|  [https://api.crm.com/cover/webhook___________]           |
|                                                           |
|  Webhook Secret (optional):                               |
|  [Generate Random] [_____________________________]        |
|  Used to verify webhook authenticity                      |
|                                                           |
|  Events: *                                                |
|  [ ] All Events                                           |
|  [x] conversation.started                                 |
|  [x] conversation.ended                                   |
|  [ ] conversation.escalated                               |
|  [x] message.received                                     |
|  [ ] message.sent                                         |
|  [ ] knowledge.updated                                    |
|  [ ] feedback.submitted                                   |
|  [ ] project.settings.changed                             |
|                                                           |
|  [Test Webhook]              [Cancel]  [Create Webhook]  |
+----------------------------------------------------------+

Webhook Logs:
+----------------------------------------------------------+
|  Webhook Logs: CRM Integration                            |
|  Filter: [All Events v] [All Statuses v]  [Last 7 Days v]|
+----------------------------------------------------------+
| Time        | Event                 | Status | Response     |
|-------------|-----------------------|--------|--------------|
| 2 min ago   | conversation.started  | 200 OK | 145ms        |
| 5 min ago   | message.received      | 200 OK | 132ms        |
| 8 min ago   | conversation.ended    | 200 OK | 156ms        |
| 12 min ago  | conversation.started  | 500    | 1,203ms (R1) |
| 12 min ago  | conversation.started  | 200 OK | 178ms (R2)   |
| 15 min ago  | message.received      | 200 OK | 141ms        |
|                                                           |
|                               [< Prev]  [Next >]  [Export]|
+----------------------------------------------------------+

Test Webhook Result:
+----------------------------------+
| Test Webhook                     |
|----------------------------------|
| Status: Success                  |
| HTTP Status: 200 OK              |
| Response Time: 156ms             |
|                                  |
| Sample Payload Sent:             |
| {                                |
|   "event": "test.webhook",       |
|   "timestamp": "2024-01-15...",  |
|   "data": { ... }                |
| }                                |
|                                  |
| Response Body:                   |
| { "status": "received" }         |
|                                  |
|                         [Close]  |
+----------------------------------+
```

## Technical Approach

### Data Model
```typescript
interface Webhook {
  id: string;
  projectId: string;
  name: string;
  url: string;
  secret?: string; // Encrypted
  events: string[]; // Array of event types
  status: 'active' | 'disabled' | 'failed';
  failureCount: number;
  lastDeliveryAt?: Date;
  lastSuccessAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface WebhookDelivery {
  id: string;
  webhookId: string;
  eventType: string;
  payload: Record<string, any>;
  status: 'pending' | 'success' | 'failed';
  httpStatus?: number;
  responseTime?: number;
  retryCount: number;
  errorMessage?: string;
  createdAt: Date;
  deliveredAt?: Date;
}

interface WebhookEvent {
  event: string;
  timestamp: string;
  projectId: string;
  data: Record<string, any>;
}
```

### Event Payload Examples
```typescript
// conversation.started
{
  "event": "conversation.started",
  "timestamp": "2024-01-15T10:30:00Z",
  "projectId": "proj_123abc",
  "data": {
    "conversationId": "conv_456def",
    "customerId": "cust_789ghi",
    "source": "widget",
    "url": "https://example.com/support"
  }
}

// message.received
{
  "event": "message.received",
  "timestamp": "2024-01-15T10:30:15Z",
  "projectId": "proj_123abc",
  "data": {
    "conversationId": "conv_456def",
    "messageId": "msg_111jkl",
    "content": "How do I reset my password?",
    "customerId": "cust_789ghi"
  }
}

// conversation.escalated
{
  "event": "conversation.escalated",
  "timestamp": "2024-01-15T10:32:00Z",
  "projectId": "proj_123abc",
  "data": {
    "conversationId": "conv_456def",
    "escalationId": "esc_222mno",
    "reason": "sentiment",
    "priority": "high",
    "customerId": "cust_789ghi"
  }
}
```

### Webhook Signature
```typescript
function generateSignature(payload: string, secret: string): string {
  return crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
}

// In webhook request header
headers['X-Cover-Signature'] = `sha256=${signature}`;
headers['X-Cover-Timestamp'] = timestamp;
headers['X-Cover-Event'] = eventType;
```

### Webhook Delivery System
```typescript
class WebhookDeliveryService {
  async deliverWebhook(webhook: Webhook, event: WebhookEvent) {
    const payload = JSON.stringify(event);
    const signature = this.generateSignature(payload, webhook.secret);

    const delivery = await this.createDelivery(webhook.id, event);

    try {
      const response = await this.sendRequest(webhook.url, payload, signature);
      await this.recordSuccess(delivery.id, response);
    } catch (error) {
      await this.recordFailure(delivery.id, error);
      await this.scheduleRetry(delivery);
    }
  }

  async scheduleRetry(delivery: WebhookDelivery) {
    if (delivery.retryCount >= 3) {
      await this.markAsFailed(delivery.webhookId);
      return;
    }

    const delay = this.getRetryDelay(delivery.retryCount);
    await this.queue.add('webhook-retry', delivery, { delay });
  }

  getRetryDelay(attempt: number): number {
    return Math.pow(2, attempt) * 60000; // Exponential backoff: 1m, 2m, 4m
  }
}
```

### Event Publishing
```typescript
// Event emitter in core system
class EventPublisher {
  async publish(event: string, data: any) {
    const webhookEvent: WebhookEvent = {
      event,
      timestamp: new Date().toISOString(),
      projectId: data.projectId,
      data
    };

    const webhooks = await this.getActiveWebhooks(data.projectId, event);

    for (const webhook of webhooks) {
      await this.deliveryService.deliverWebhook(webhook, webhookEvent);
    }
  }
}

// Usage in conversation service
await eventPublisher.publish('conversation.started', {
  projectId: conversation.projectId,
  conversationId: conversation.id,
  customerId: conversation.customerId,
  source: 'widget',
  url: conversation.url
});
```

### API Endpoints
```
POST   /api/webhooks                - Create webhook
GET    /api/webhooks                - List webhooks
GET    /api/webhooks/:id            - Get webhook details
PATCH  /api/webhooks/:id            - Update webhook
DELETE /api/webhooks/:id            - Delete webhook
POST   /api/webhooks/:id/test       - Test webhook
GET    /api/webhooks/:id/deliveries - Get delivery logs
POST   /api/webhooks/:id/enable     - Enable webhook
POST   /api/webhooks/:id/disable    - Disable webhook
```

### Infrastructure
- Redis queue for webhook delivery (Bull or BullMQ)
- Worker processes for webhook delivery (horizontally scalable)
- Dead letter queue for permanently failed deliveries
- Rate limiting per endpoint using Redis
- Webhook delivery metrics in Prometheus

## Acceptance Criteria

### AC-001: Webhook Creation
- Given I am in webhooks dashboard, I can create a new webhook
- When I enter URL and select events, webhook is saved
- Test webhook sends sample payload and shows response
- Invalid URLs are rejected with clear error message

### AC-002: Event Delivery
- Given a webhook is active, when subscribed event occurs, webhook is triggered
- Webhook receives HTTP POST within 1 second of event
- Payload contains correct event data and signature
- Headers include event type, timestamp, and signature

### AC-003: Signature Verification
- Given webhook has secret configured, signature is included in request
- Signature is valid HMAC-SHA256 of payload
- Recipient can verify signature using provided secret
- Documentation includes verification examples in common languages

### AC-004: Retry Logic
- Given webhook delivery fails, system retries automatically
- Retries occur after 1 minute, then 2 minutes, then 4 minutes
- After 3 failed attempts, delivery is marked as failed
- Retry attempt number is included in request header

### AC-005: Failure Handling
- Given webhook fails 10 consecutive times, it is automatically disabled
- User receives email notification when webhook is disabled
- Failure reason is logged and visible in webhook logs
- User can re-enable webhook after fixing issue

### AC-006: Monitoring
- Given webhook is active, delivery logs are visible in dashboard
- Logs show timestamp, event type, status code, and response time
- Success rate is calculated and displayed
- Logs can be filtered by event type and status

### AC-007: Security
- Given webhook URL is HTTP (not HTTPS), creation is rejected
- Signature header is always included if secret is configured
- Request timeout is enforced at 10 seconds
- Webhook secrets are encrypted in database

## Out of Scope (V4+)
- Webhook payload transformation/customization
- Webhook batching (multiple events in one request)
- Bidirectional webhooks (response processing)
- Webhook templates for popular integrations
- Advanced filtering (event payload conditions)
- Webhook replay functionality

## Success Metrics
- Percentage of Pro/Enterprise users configuring webhooks
- Average webhook delivery success rate (target: >99%)
- Average webhook response time (target: <500ms)
- Most popular event types subscribed
- Integration use cases (CRM, analytics, support, custom)

## Questions & Decisions
- **Q**: Should we support webhook payload transformation?
  - **A**: V4 feature, start with standard payload format

- **Q**: Maximum number of webhooks per project?
  - **A**: 10 webhooks per project on Pro, 50 on Enterprise

- **Q**: Should we support webhook authentication (Basic Auth, OAuth)?
  - **A**: V3 supports signature verification only, V4 for additional auth methods

- **Q**: Webhook delivery guarantee?
  - **A**: At-least-once delivery, possible duplicates during retries

## References
- [Human Handoff Feature](/docs/product/features/advanced/human-handoff/spec.md)
- [Webhook Security Best Practices](https://docs.github.com/webhooks/using-webhooks/best-practices-for-using-webhooks)
- [Roadmap: V3 Advanced Features](/docs/product/roadmap.md)
