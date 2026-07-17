-- Preserve every frozen chat_sessions row before the legacy table is retired.
--
-- The 2025 migration treated messages as a JSONB value, but the deployed column is
-- JSONB[]. That left some sessions without a conversation. Keep this repair additive so it can
-- ship before the later, post-deploy cleanup migration.

create temporary table legacy_chat_sessions_to_reconcile
on commit drop
as
select cs.*
from public.chat_sessions cs
where not exists (
  select 1
  from public.conversations c
  where c.id = cs.id
);

insert into public.customers (
  project_id,
  visitor_id,
  first_seen_at,
  last_seen_at,
  total_conversations,
  created_at,
  updated_at
)
select
  cs.project_id,
  cs.visitor_id,
  coalesce(min(cs.created_at), now()),
  coalesce(max(coalesce(cs.updated_at, cs.created_at)), now()),
  0,
  coalesce(min(cs.created_at), now()),
  coalesce(max(coalesce(cs.updated_at, cs.created_at)), now())
from legacy_chat_sessions_to_reconcile cs
group by cs.project_id, cs.visitor_id
on conflict (project_id, visitor_id) do update
set first_seen_at = least(public.customers.first_seen_at, excluded.first_seen_at),
    last_seen_at = greatest(public.customers.last_seen_at, excluded.last_seen_at);

insert into public.conversations (
  id,
  project_id,
  customer_id,
  visitor_id,
  status,
  resolved_at,
  source,
  metadata,
  awaiting_email,
  pending_question,
  email_asked,
  is_voice,
  voice_duration_seconds,
  message_count,
  created_at,
  updated_at,
  last_message_at
)
select
  cs.id,
  cs.project_id,
  customer.id,
  cs.visitor_id,
  'closed',
  coalesce(cs.last_message_at, cs.updated_at, cs.created_at, now()),
  case
    when cs.source in ('widget', 'playground', 'mcp', 'api', 'voice', 'public', 'mobile', 'whatsapp')
      then cs.source
    else 'widget'
  end,
  jsonb_build_object(
    'legacy_chat_session_reconciled', true,
    'legacy_is_voice', coalesce(cs.is_voice, false)
  ),
  coalesce(cs.awaiting_email, false),
  cs.pending_question,
  coalesce(cs.email_asked, false),
  coalesce(cs.is_voice, false),
  coalesce(cs.voice_duration_seconds, 0),
  0,
  coalesce(cs.created_at, now()),
  coalesce(cs.updated_at, cs.created_at, now()),
  coalesce(cs.last_message_at, cs.updated_at, cs.created_at, now())
from legacy_chat_sessions_to_reconcile cs
join public.customers customer
  on customer.project_id = cs.project_id
 and customer.visitor_id = cs.visitor_id
on conflict (id) do nothing;

-- Message inserts update conversations through update_conversation_message_count(). Prevent that
-- trigger's nested conversation update from replacing historical updated_at values with now().
alter table public.conversations disable trigger update_conversations_updated_at;

insert into public.messages (
  conversation_id,
  sender_type,
  content,
  metadata,
  created_at
)
select
  cs.id,
  case message.item->>'role'
    when 'user' then 'customer'
    when 'assistant' then 'ai'
    when 'agent' then 'agent'
    else 'system'
  end,
  message.item->>'content',
  case
    when jsonb_typeof(message.item->'metadata') = 'object'
      then message.item->'metadata'
    else '{}'::jsonb
  end || jsonb_build_object(
    'legacy_chat_session', true,
    'legacy_ordinal', message.ordinality
  ),
  case
    when jsonb_typeof(message.item->'timestamp') = 'string'
     and message.item->>'timestamp'
       ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}'
      then (message.item->>'timestamp')::timestamptz
    else coalesce(cs.created_at, now())
         + ((message.ordinality - 1) * interval '1 microsecond')
  end
from legacy_chat_sessions_to_reconcile cs
cross join lateral unnest(cs.messages) with ordinality as message(item, ordinality)
where nullif(btrim(message.item->>'content'), '') is not null
  and not exists (
    select 1
    from public.messages existing
    where existing.conversation_id = cs.id
  );

with message_rollup as (
  select
    cs.id as conversation_id,
    count(message.id)::integer as message_count,
    max(message.created_at) as last_message_at,
    max(message.created_at) filter (where message.sender_type = 'customer')
      as last_customer_message_at
  from legacy_chat_sessions_to_reconcile cs
  left join public.messages message on message.conversation_id = cs.id
  group by cs.id
),
last_message as (
  select distinct on (message.conversation_id)
    message.conversation_id,
    message.content,
    message.sender_type
  from public.messages message
  join legacy_chat_sessions_to_reconcile cs on cs.id = message.conversation_id
  order by message.conversation_id, message.created_at desc, message.id desc
)
update public.conversations conversation
set message_count = rollup.message_count,
    last_message_at = coalesce(
      rollup.last_message_at,
      legacy.last_message_at,
      legacy.updated_at,
      legacy.created_at,
      conversation.last_message_at
    ),
    last_customer_message_at = rollup.last_customer_message_at,
    last_message_preview = left(last_message.content, 200),
    last_message_sender_type = last_message.sender_type,
    updated_at = coalesce(legacy.updated_at, legacy.created_at, conversation.updated_at),
    resolved_at = coalesce(
      legacy.last_message_at,
      legacy.updated_at,
      legacy.created_at,
      conversation.resolved_at
    )
from legacy_chat_sessions_to_reconcile legacy
join message_rollup rollup on rollup.conversation_id = legacy.id
left join last_message on last_message.conversation_id = legacy.id
where conversation.id = legacy.id;

alter table public.conversations enable trigger update_conversations_updated_at;

with affected_customers as (
  select distinct customer.id
  from public.customers customer
  join legacy_chat_sessions_to_reconcile legacy
    on legacy.project_id = customer.project_id
   and legacy.visitor_id = customer.visitor_id
),
conversation_totals as (
  select
    customer.id,
    count(conversation.id)::integer as total_conversations
  from affected_customers affected
  join public.customers customer on customer.id = affected.id
  left join public.conversations conversation on conversation.customer_id = customer.id
  group by customer.id
)
update public.customers customer
set total_conversations = totals.total_conversations
from conversation_totals totals
where customer.id = totals.id;

