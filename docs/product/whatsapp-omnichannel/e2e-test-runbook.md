# WhatsApp Omnichannel E2E Test Runbook

**Last updated:** 2026-06-30

**Goal:** sequentially verify everything delivered across omnichannel batches 1-3: channel foundation, WhatsApp inbound/outbound, dashboard awareness, channel settings, widget digital-card launcher, env/ops, and security guardrails.

**Recommended test mode:** start with Meta's WhatsApp Cloud API test phone number. Move to a real pilot number only after the sandbox path is green.

**Important v1 scope:** FrontFace must be the only inbox/sender for the connected WhatsApp number. Do not test Chatwoot, WhatsApp Business App coexistence, or a second system sending on the same number as a supported flow. If another system sends on the same number, FrontFace will not reliably know about those human replies in v1.

## Reference Links

- Meta WhatsApp Cloud API getting started: https://developers.facebook.com/documentation/business-messaging/whatsapp/get-started
- Meta WhatsApp Cloud API webhooks: https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/overview
- Meta messages endpoint: https://developers.facebook.com/documentation/business-messaging/whatsapp/reference/whatsapp-business-phone-number/message-api
- Meta WABA subscribed apps endpoint: https://developers.facebook.com/documentation/business-messaging/whatsapp/reference/whatsapp-business-account/subscribed-apps-api
- Local specs:
  - `docs/product/whatsapp-omnichannel/01-channel-foundation/spec.md`
  - `docs/product/whatsapp-omnichannel/02-whatsapp-inbound/spec.md`
  - `docs/product/whatsapp-omnichannel/03-outbound-dispatcher/spec.md`
  - `docs/product/whatsapp-omnichannel/04-dashboard-channel-awareness/spec.md`
  - `docs/product/whatsapp-omnichannel/05-digital-card-launcher/spec.md`
  - `docs/product/whatsapp-omnichannel/06-onboarding-and-ops/spec.md`

Meta changes dashboard labels often. Treat the official docs and current dashboard UI as the authority for exact button names. This runbook is the FrontFace-specific sequence and expected behavior.

## Test Record

Fill this out before starting.

| Field | Value |
| --- | --- |
| Tester | Hassan |
| Date |  30 Jun 2026 |
| Environment | local + ngrok |
| API public URL | https://cf0d-110-38-244-76.ngrok-free.app |
| Web dashboard URL | http://localhost:3000 |
| Project ID |  |
| Project owner email | arshadhassan420@gmail.com |
| Non-owner test user email | arshadhassan420@gmail.com |
| Meta app ID | 1002038065780057 |
| Meta WABA ID |1574928874271035  |
| WhatsApp phone number ID | 1206674162528205 |
| WhatsApp display/test number |15556731450  |
| Recipient phone `wa_id` | 923323146585 |
| Access token type | system-user |
| `GRAPH_API_VERSION` | v25.0 |

## Phase 0: Decide Which WhatsApp Number You Are Testing

- [ ] Choose **Meta test phone number** for the first complete E2E pass.
  - Use this when validating code and webhooks.
  - Expect recipient allowlisting and token limitations.
- [ ] Choose **brand-new or dedicated real number** only after sandbox success.
  - The number must not be actively used in WhatsApp Business App or another inbox for this v1 test.
  - If the number is already live in WhatsApp Business App, stop. That is a coexistence/migration path, not the current v1 flow.
- [ ] Do not use a customer's production number for the first run.

Pass criteria:

- [ ] You know which phone number ID will be stored as `channel_connections.external_id`.
- [ ] No external inbox is connected to this number during the test.

## Phase 1: Local/Staging Environment Readiness

### 1.1 Apply/check migrations

Do not start E2E until the six omnichannel migrations are applied to the database under test:

- [ ] `20260629000002_add_whatsapp_source.sql`
- [ ] `20260629000003_create_channel_connections.sql`
- [ ] `20260629000004_add_customer_phone.sql`
- [ ] `20260629000005_add_wa_message_id_idempotency.sql`
- [ ] `20260629000006_create_channel_inbound_events.sql`
- [ ] `20260629000001_realtime_private_channel_policies.sql` if private realtime is part of the environment

Suggested SQL probes:

```sql
select to_regclass('public.channel_connections') as channel_connections;
select to_regclass('public.channel_inbound_events') as channel_inbound_events;

select conname, pg_get_constraintdef(oid)
from pg_constraint
where conname = 'conversations_source_check';

select column_name
from information_schema.columns
where table_schema = 'public'
  and table_name = 'customers'
  and column_name = 'phone';
```

Expected:

- [ ] `channel_connections` exists.
- [ ] `channel_inbound_events` exists.
- [ ] `conversations_source_check` includes `'whatsapp'`.
- [ ] `customers.phone` exists.

### 1.2 API env

Set these in the API environment:

```env
ENCRYPTION_KEY=<64-character-hex-key>
WHATSAPP_VERIFY_TOKEN=<random-webhook-verify-token>
GRAPH_API_VERSION=v25.0
```

Do not add `WHATSAPP_APP_SECRET`. The current implementation stores each connection's app secret encrypted in `channel_connections`, and the webhook verifies HMAC with the per-connection app secret.

Generate a verify token:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Expected:

- [ ] `apps/api/.env.example` documents `WHATSAPP_VERIFY_TOKEN`.
- [ ] `apps/api/.env.example` documents `GRAPH_API_VERSION=v25.0`.
- [ ] No global `WHATSAPP_APP_SECRET` fallback is configured.

### 1.3 Run automated checks before manual E2E

From repo root:

```bash
pnpm test
pnpm --filter @chatbot/api type-check
pnpm --filter @chatbot/web type-check
pnpm --filter @chatbot/widget type-check
pnpm --filter @chatbot/widget lint
```

Expected:

- [ ] All automated tests pass.
- [ ] API, web, and widget type-checks pass.
- [ ] Widget lint passes.

### 1.4 Start services

Local example:

```bash
pnpm --filter @chatbot/api dev
pnpm --filter @chatbot/web dev
```

Expose the API to Meta with a stable HTTPS tunnel:

```bash
ngrok http 3001
```

Expected:

- [ ] API is reachable at `https://<tunnel-or-host>`.
- [ ] Dashboard is reachable.
- [ ] `NEXT_PUBLIC_API_URL` used by the web app points to the API URL you are testing.

## Phase 2: Create the Meta/WhatsApp Test Setup

### 2.1 Create or reuse a Meta developer app

- [ ] Log in to https://developers.facebook.com/.
- [ ] Create a Meta app suitable for business/WhatsApp testing, or reuse the existing FrontFace test app.
- [ ] Add the WhatsApp product to the app.
- [ ] In app settings, copy the **App Secret** from Meta App Dashboard -> Settings -> Basic.
- [ ] Store the app secret only in your password manager/test note. Do not paste it into chats or commits.

Expected:

- [ ] You have a Meta app ID.
- [ ] You have the app secret for HMAC validation.
- [ ] WhatsApp product appears in the app dashboard.

### 2.2 Set up the Meta test phone number

In the WhatsApp product setup/API setup page:

- [ ] Copy the **WhatsApp Business Account ID** (`WABA_ID`).
- [ ] Copy the **Phone Number ID** (`PHONE_NUMBER_ID`).
- [ ] Copy the test business phone number shown by Meta.
- [ ] Generate/copy a temporary access token, or create a system-user token for longer tests.
- [ ] Add your personal WhatsApp number as a test recipient.
- [ ] Complete the OTP verification for that recipient.

Temporary-token path:

- [ ] Use it only for the current test session.
- [ ] Expect it to expire quickly.

System-user token path:

- [ ] Create a system user in Meta Business settings.
- [ ] Assign the WhatsApp Business Account asset to that system user.
- [ ] Generate a token with WhatsApp messaging/management permissions.
- [ ] Store it as the test access token.

Expected:

- [ ] You have `WABA_ID`, `PHONE_NUMBER_ID`, `WA_ACCESS_TOKEN`, and `WA_APP_SECRET`.
- [ ] Your personal WhatsApp number is allowed to receive/send messages with the test number.

### 2.3 Send Meta's first test message

This confirms the token and phone number ID are valid before FrontFace is involved.

```bash
curl -sS -X POST "https://graph.facebook.com/v25.0/$PHONE_NUMBER_ID/messages" \
  -H "Authorization: Bearer $WA_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{
    "messaging_product": "whatsapp",
    "to": "<RECIPIENT_WA_ID>",
    "type": "template",
    "template": {
      "name": "hello_world",
      "language": { "code": "en_US" }
    }
  }'
```

Expected:

- [ ] Graph API returns a message ID.
- [ ] The recipient phone receives the WhatsApp template message.

If this fails, fix Meta token/recipient setup before continuing.

### 2.4 Configure Meta webhook callback

Callback URL:

```text
https://<api-host>/api/channels/whatsapp/webhook
```

Verify token:

```text
same value as WHATSAPP_VERIFY_TOKEN in the API environment
```

In Meta:

- [ ] Go to WhatsApp product webhook/configuration.
- [ ] Add the callback URL.
- [ ] Paste the verify token.
- [ ] Verify and save.
- [ ] Subscribe to the `messages` field.

Manual local verification:

```bash
curl -G "$API_URL/api/channels/whatsapp/webhook" \
  --data-urlencode "hub.mode=subscribe" \
  --data-urlencode "hub.verify_token=$WHATSAPP_VERIFY_TOKEN" \
  --data-urlencode "hub.challenge=frontface-check"
```

Expected:

- [ ] Meta accepts the callback.
- [ ] Manual GET returns `frontface-check`.
- [ ] A wrong verify token returns `403`.

### 2.5 Subscribe the app to the WABA (required)

Do not skip this step and do not assume dashboard setup already did it. Inbound webhooks will not arrive until the app is explicitly subscribed to the WABA — this has been confirmed in our own E2E testing: webhooks only started arriving after running this call.

```bash
curl -sS -X POST "https://graph.facebook.com/v25.0/$WABA_ID/subscribed_apps" \
  -H "Authorization: Bearer $WA_ACCESS_TOKEN"
```

Expected:

- [ ] Response indicates success.
- [ ] The app is subscribed to WABA `messages` webhooks.

If this call fails with an "object ID not found" (or similar permission) error, see the Failure Triage Quick Map at the end of this runbook before continuing.

## Phase 3: Connect WhatsApp in FrontFace

### 3.1 Dashboard Channels tab

As the project owner:

- [ ] Open the dashboard.
- [ ] Go to the target project.
- [ ] Open the **Channels** tab.
- [ ] Confirm the webhook URL shown matches `https://<api-host>/api/channels/whatsapp/webhook`.
- [ ] Enter:
  - Display Name: `WhatsApp Sandbox` or similar
  - Phone Number ID: `PHONE_NUMBER_ID`
  - WABA ID: `WABA_ID`
  - Access Token: `WA_ACCESS_TOKEN`
  - App Secret: `WA_APP_SECRET`
- [ ] Click **Connect WhatsApp**.
- [ ] Click **Test Connection**.

Expected:

- [ ] UI shows `Connected`.
- [ ] Test connection passes.
- [ ] The GET/list view masks credentials as bullets and does not echo access token/app secret.

### 3.2 Database sanity check

SQL:

```sql
select
  id,
  project_id,
  provider,
  external_id,
  display_name,
  status,
  encrypted_credentials is not null as has_encrypted_credentials,
  config,
  created_at,
  updated_at
from channel_connections
where provider = 'whatsapp'
order by created_at desc
limit 5;
```

Expected:

- [ ] `provider = 'whatsapp'`.
- [ ] `external_id = PHONE_NUMBER_ID`.
- [ ] `status = 'active'`.
- [ ] `has_encrypted_credentials = true`.
- [ ] No plaintext token or app secret is visible.

## Phase 4: Inbound AI Flow

### 4.1 Send first inbound customer message

From your personal WhatsApp account, send this to the Meta test business number:

```text
Hello, what can you help me with?
```

Expected in WhatsApp:

- [ ] Customer message sends successfully.
- [ ] FrontFace AI replies back in WhatsApp.

Expected in API/logs:

- [ ] Webhook POST returns 200 quickly after HMAC verification.
- [ ] No HMAC warning appears.
- [ ] No "No active connection for phone_number_id" warning appears.

Expected in database:

```sql
select id, source, visitor_id, status, metadata
from conversations
where project_id = '<PROJECT_ID>'
  and source = 'whatsapp'
order by created_at desc
limit 3;

select sender_type, content, metadata, created_at
from messages
where conversation_id = '<CONVERSATION_ID>'
order by created_at asc;

select provider, external_message_id, project_id, conversation_id, status
from channel_inbound_events
where provider = 'whatsapp'
order by created_at desc
limit 5;
```

Expected:

- [ ] One `source = 'whatsapp'` conversation exists.
- [ ] `visitor_id = 'whatsapp:<RECIPIENT_WA_ID>'`.
- [ ] `metadata.last_inbound_at` is set.
- [ ] Customer row has `phone = RECIPIENT_WA_ID`.
- [ ] Customer message has `metadata.wa_message_id`.
- [ ] One AI message is persisted.
- [ ] `channel_inbound_events.status` is completed for the message.

### 4.2 Conversation memory/history

Send a second WhatsApp message:

```text
What did I ask you in my previous message?
```

Expected:

- [ ] AI answer references the previous message or context.
- [ ] No duplicate copy of the just-sent customer message appears in the LLM context symptoms.
- [ ] Database history has exactly one customer row per inbound message.

### 4.3 Unsupported media

Send a sticker, image, voice note, or location from WhatsApp.

Expected:

- [ ] Customer inbound is stored as `[unsupported WhatsApp message]`.
- [ ] WhatsApp receives: `I can read text messages right now - please type your question.`
- [ ] No LLM-generated answer is sent for unsupported content.

## Phase 5: Idempotency and Webhook Safety

### 5.1 Duplicate webhook delivery

Use API logs or captured payloads if available. Re-send the same signed payload with the same WhatsApp message ID twice.

Expected:

- [ ] First delivery reserves and processes the message.
- [ ] Second delivery returns 200 but logs/skips as duplicate.
- [ ] Only one `messages` row has that `metadata.wa_message_id`.
- [ ] Only one `channel_inbound_events` row exists for the provider/message ID.

### 5.2 Unknown phone number

Send a valid WhatsApp-shaped webhook payload using a `phone_number_id` that is not in `channel_connections`.

Expected:

- [ ] HTTP response is 200.
- [ ] Log says no active connection for phone number ID.
- [ ] No conversation, customer, message, or inbound event is created.

### 5.3 Invalid HMAC

POST a tampered payload or wrong `X-Hub-Signature-256`.

Expected:

- [ ] HTTP response is 401.
- [ ] No message or conversation is created.
- [ ] No provider event is reserved.

### 5.4 Webhook rate limit

Send more than 30 valid inbound webhook events inside one minute for the same sender key.

Expected:

- [ ] HTTP responses stay 200 for valid signed requests.
- [ ] After the limit, processing is dropped/logged as sender rate-limited.
- [ ] Meta does not retry because FrontFace still ACKs.

## Phase 6: Handoff, Human Replies, and AI Suppression

### 6.1 Trigger handoff from WhatsApp

Send a message that should trigger handoff for the project, for example:

```text
I need a human agent
```

Expected:

- [ ] Conversation transitions to `waiting` or `agent_active` according to existing handoff flow.
- [ ] WhatsApp receives the same-turn handoff acknowledgement.
- [ ] The acknowledgement is persisted and dispatched even though the conversation status changed to waiting.

### 6.2 Dashboard claim and agent reply

In dashboard inbox:

- [ ] Open the WhatsApp conversation.
- [ ] Confirm the channel badge says WhatsApp.
- [ ] Confirm the contact phone is visible.
- [ ] Claim/assign the conversation if needed.
- [ ] Send an agent reply from the composer.

Expected:

- [ ] Agent reply reaches WhatsApp.
- [ ] Agent reply appears in conversation history once.
- [ ] API awaited `dispatchToChannel`; there is no optimistic "sent" row if dispatch fails.

### 6.3 Inbound while human is handling

While the conversation is `waiting` or `agent_active`, send another WhatsApp message from the customer.

Expected:

- [ ] The same conversation is reused.
- [ ] No new conversation is created for the same `project + source + phone`.
- [ ] Customer message appears in the dashboard.
- [ ] No AI reply is sent while human handling is active.

### 6.4 Stale-state race guard

Best-effort manual test:

- [ ] Send a customer message likely to trigger a slower AI response.
- [ ] Immediately claim the conversation or send an agent reply before the AI response returns.

Expected:

- [ ] Customer message remains stored.
- [ ] If agent reply/status change happened first, AI reply is suppressed.
- [ ] Suppressed AI reply is not persisted and is not sent to WhatsApp.

Database check:

```sql
select sender_type, content, created_at
from messages
where conversation_id = '<CONVERSATION_ID>'
order by created_at desc
limit 10;
```

## Phase 7: Channel Config Behavior

The current UI does not expose all config flags. Use SQL for E2E validation.

### 7.1 `aiAutoReply = false`

Disable AI auto-reply for the active connection:

```sql
update channel_connections
set config = jsonb_set(coalesce(config, '{}'::jsonb), '{aiAutoReply}', 'false'::jsonb, true)
where provider = 'whatsapp'
  and external_id = '<PHONE_NUMBER_ID>'
  and status = 'active';
```

Send a WhatsApp inbound.

Expected:

- [ ] Customer message is stored and broadcast to dashboard.
- [ ] No AI message is created.
- [ ] No outbound WhatsApp AI reply is sent.

Restore:

```sql
update channel_connections
set config = jsonb_set(coalesce(config, '{}'::jsonb), '{aiAutoReply}', 'true'::jsonb, true)
where provider = 'whatsapp'
  and external_id = '<PHONE_NUMBER_ID>'
  and status = 'active';
```

### 7.2 `resolutionStrategy = latest_open`

Confirm WhatsApp default is latest open:

```sql
select config
from channel_connections
where provider = 'whatsapp'
  and external_id = '<PHONE_NUMBER_ID>'
  and status = 'active';
```

Expected:

- [ ] Missing strategy or explicit `"latest_open"` both resolve to latest open behavior.
- [ ] New inbound reuses latest `ai_active`, `waiting`, or `agent_active` WhatsApp conversation for the same phone.
- [ ] New inbound creates a new conversation only after earlier conversations are resolved/closed.

## Phase 8: 24-Hour WhatsApp Window

### 8.1 In-window agent send

After any fresh inbound:

- [ ] Open dashboard conversation.
- [ ] Ensure status is `agent_active`.
- [ ] Send an agent reply.

Expected:

- [ ] Message is persisted.
- [ ] Message reaches WhatsApp.
- [ ] No window-closed warning appears.

### 8.2 Closed-window send

Set the last inbound timestamp older than 24 hours:

```sql
update conversations
set metadata = jsonb_set(
  coalesce(metadata, '{}'::jsonb),
  '{last_inbound_at}',
  to_jsonb((now() - interval '25 hours')::text),
  true
)
where id = '<CONVERSATION_ID>';
```

Refresh the dashboard conversation detail.

Expected in UI:

- [ ] Composer is disabled for WhatsApp.
- [ ] Message communicates `24h window closed` and `re-engagement templates coming soon`.

Attempt an agent send through the API/UI if possible.

Expected:

- [ ] API rejects with window closed behavior.
- [ ] No ghost agent message is persisted.
- [ ] No realtime broadcast shows a sent message.

Restore:

```sql
update conversations
set metadata = jsonb_set(
  coalesce(metadata, '{}'::jsonb),
  '{last_inbound_at}',
  to_jsonb(now()::text),
  true
)
where id = '<CONVERSATION_ID>';
```

## Phase 9: Dashboard Channel Awareness

### 9.1 Inbox list

- [ ] Open `/inbox`.
- [ ] Confirm WhatsApp conversations show WhatsApp channel icon/badge.
- [ ] Confirm WhatsApp conversations display the customer phone number when no name/email exists.
- [ ] Use the source/channel filter.
- [ ] Select WhatsApp.
- [ ] Select All channels.

Expected:

- [ ] WhatsApp filter shows only `source = 'whatsapp'`.
- [ ] All channels restores widget/public/voice/mobile conversations.
- [ ] Existing status tabs still work with the source filter.

### 9.2 Inbox detail

- [ ] Open a WhatsApp conversation.
- [ ] Confirm header badge says WhatsApp.
- [ ] Confirm contact phone is visible where customer details appear.
- [ ] Confirm 24h composer state matches `metadata.last_inbound_at`.

Expected:

- [ ] Channel cue is visible and not confused with voice/widget.
- [ ] Header/customer panel display known phone/email/name before falling back to `Visitor ...`.
- [ ] Composer and server agree on window state.

### 9.3 Analytics

- [ ] Open analytics.
- [ ] Select source/channel `WhatsApp`.
- [ ] Compare counts with direct database query for `conversations.source = 'whatsapp'`.

Expected:

- [ ] WhatsApp appears as a source option.
- [ ] Analytics calls respect the WhatsApp source filter.

### 9.4 Leads/contact phone

- [ ] Open `/leads`.
- [ ] Search for the WhatsApp `wa_id` / phone number.
- [ ] Confirm the lead row shows the phone number when `customers.phone` is present.
- [ ] Select the lead/contact created by WhatsApp inbound.
- [ ] Confirm the detail panel phone field is visible as first-class data.

Expected:

- [ ] Phone comes from `customers.phone`, not regex-scraped form data.

## Phase 10: Channels API Security

### 10.1 Credential secrecy

As project owner, call:

```bash
curl -sS "$API_URL/api/projects/$PROJECT_ID/channels" \
  -H "Authorization: Bearer $OWNER_TOKEN"
```

Expected:

- [ ] Response includes connection status/details.
- [ ] Response does not include `accessToken`.
- [ ] Response does not include `appSecret`.
- [ ] Response does not include `encryptedCredentials`.

### 10.2 Non-owner access

As a logged-in user who is not the project owner:

- [ ] Try `GET /api/projects/:id/channels`.
- [ ] Try `POST /api/projects/:id/channels/whatsapp`.
- [ ] Try `DELETE /api/projects/:id/channels/whatsapp/:connectionId`.

Expected:

- [ ] Non-owner is denied.
- [ ] Project members are not enough for channel credential management.

### 10.3 Direct Supabase anon probe

Using anon key/PostgREST:

```bash
curl -sS "$SUPABASE_URL/rest/v1/channel_connections?select=*" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY"
```

Expected:

- [ ] Zero rows or permission denied.
- [ ] No credential material exposed.

## Phase 11: Widget Digital-Card Launcher

### 11.1 Configure channel buttons

In dashboard Embed/Widget settings:

- [ ] Add WhatsApp channel:
  - Type: `whatsapp`
  - URL: `https://wa.me/<number>`
  - Label: `WhatsApp`
- [ ] Add `tel:` and `mailto:` channel buttons if desired.
- [ ] Test up/down reorder buttons.
- [ ] Save settings.

Expected:

- [ ] Settings persist under `projects.settings.widget_appearance.channels`.
- [ ] Reorder persists after refresh.
- [ ] Server accepts `https`, `http`, `mailto`, and `tel` channel URLs.

### 11.2 Negative URL validation

Try saving:

- [ ] `javascript:alert(1)` as channel URL.
- [ ] `data:text/html,hello` as channel URL.
- [ ] `mailto:test@example.com` as icon URL.

Expected:

- [ ] `javascript:` and `data:` are rejected.
- [ ] Icon URL rejects `mailto:` because icon URLs allow only `https` and `http`.
- [ ] Valid `https` icon URL is accepted.

### 11.3 Widget render

Load a page with the embed script.

Expected:

- [ ] Channel launcher renders next to the chat bubble when one or more channels exist.
- [ ] Clicking WhatsApp opens `https://wa.me/<number>`.
- [ ] Clicking `tel:` and `mailto:` buttons opens the native handlers.
- [ ] Main chat still opens/closes normally.
- [ ] `Powered by FrontFace` links to `https://frontface.app`.

## Phase 12: Disconnect and Cleanup

### 12.1 Disconnect in FrontFace

In Channels tab:

- [ ] Click Disconnect.
- [ ] Refresh.

Expected:

- [ ] Connection status is no longer active.
- [ ] New inbound for the phone number is ACKed 200 but dropped as unknown/no active connection.

### 12.2 Meta cleanup

- [ ] Remove or disable webhook subscription if the app is temporary.
- [ ] Revoke temporary/system-user token if it was created only for testing.
- [ ] Stop ngrok/tunnel.
- [ ] Delete test recipient if no longer needed.

### 12.3 Data cleanup

Optional SQL cleanup for local/staging only:

```sql
update channel_connections
set status = 'disabled'
where provider = 'whatsapp'
  and external_id = '<PHONE_NUMBER_ID>';
```

Do not delete production-like evidence until screenshots/logs are captured.

## Final Acceptance Checklist

Mark this section after all phases above.

### Batch 1: Foundation + Widget Launcher

- [ ] `whatsapp` source works end-to-end.
- [ ] `channel_connections` stores encrypted per-connection credentials.
- [ ] `customers.phone` is populated for WhatsApp users.
- [ ] Inbound idempotency tables/indexes prevent duplicates.
- [ ] Embed config passes `channels` through.
- [ ] Widget channel launcher renders and opens links.
- [ ] Dashboard editor can add/remove/reorder channels.
- [ ] URL scheme validation blocks unsafe links.

### Batch 2: Inbound + Outbound

- [ ] Meta webhook GET verification works.
- [ ] Webhook POST validates HMAC with per-connection app secret.
- [ ] Unknown phone numbers return 200 and drop.
- [ ] Inbound text creates/reuses WhatsApp conversation.
- [ ] Conversation memory works across WhatsApp turns.
- [ ] Unsupported media gets graceful notice.
- [ ] Duplicate webhook delivery is idempotent.
- [ ] Handoff acknowledgement is sent on same-turn handoff.
- [ ] Human-handled conversations suppress AI.
- [ ] Agent replies dispatch to WhatsApp.
- [ ] 24h window blocks free-form sends with no ghost messages.
- [ ] `aiAutoReply = false` stores inbound without AI reply.
- [ ] `latest_open` resolution reuses waiting/agent-active conversations.

### Batch 3: Dashboard + Ops

- [ ] Channels tab connects, tests, and disconnects WhatsApp.
- [ ] Webhook URL shown in UI is correct.
- [ ] Credentials are write-only in API responses.
- [ ] Owner-only checks protect channel endpoints.
- [ ] Inbox list shows WhatsApp badge and source filter.
- [ ] Inbox detail shows channel badge and window state.
- [ ] Analytics supports WhatsApp source filtering.
- [ ] Leads/contact view shows phone.
- [ ] Env docs are correct: `WHATSAPP_VERIFY_TOKEN`, `GRAPH_API_VERSION`, no `WHATSAPP_APP_SECRET`.

## Failure Triage Quick Map

| Symptom | Likely cause | First check |
| --- | --- | --- |
| Meta cannot verify webhook | API not public, wrong verify token, wrong path | `curl -G .../api/channels/whatsapp/webhook` with challenge |
| Webhook POST returns 401 | Wrong app secret, raw body missing, bad signature | Check `WHATSAPP_VERIFY_TOKEN` vs app secret confusion; app secret belongs in Channels tab |
| Webhook POST returns 200 but no conversation | Unknown `phone_number_id` or inactive connection | `channel_connections.external_id = PHONE_NUMBER_ID` and `status='active'` |
| Customer message stored but no AI reply | `aiAutoReply=false`, handoff state, stale guard, LLM error | Conversation status and connection config |
| AI replies while human is handling | Conversation resolution/status bug | Confirm latest inbound reused same `agent_active` conversation |
| Agent message appears but not in WhatsApp | Dispatcher/send failed after insert path regression | API logs and `dispatchToChannel` result |
| Agent send blocked | `last_inbound_at` older than 24h | Conversation metadata |
| Dashboard lacks WhatsApp badge | API missing `source`, stale web build | Network response for conversations |
| Channel launcher missing | No saved `widget_appearance.channels` or embed cache | Project settings and embed config response |
| Inbound never arrives from Meta | WABA/app not subscribed to messages | Meta webhook subscription and `/{waba-id}/subscribed_apps` |
| `subscribed_apps` call returns "object ID not found" | Wrong ID type (phone number or Business ID passed instead of WABA ID), WABA not shared with FrontFace's app (asset-sharing), access token belongs to a different Business/system user than the WABA, token missing `whatsapp_business_management` permission, or app not linked to that WABA in Meta Business Settings | Confirm the ID in the URL is the WABA ID (not phone number ID or Business ID); confirm asset-sharing between the WABA and FrontFace's app; confirm the token's Business matches the WABA's Business; confirm token permissions |
