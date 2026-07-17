-- Canonical inbox activity deliberately excludes automated system events.
-- The existing message trigger remains the single writer for message-derived conversation state.

alter table public.conversations
  add column if not exists needs_reply boolean not null default false,
  add column if not exists last_conversation_message_at timestamptz,
  add column if not exists last_conversation_preview text,
  add column if not exists last_conversation_sender_type text;

alter table public.conversations
  drop constraint if exists conversations_last_conversation_sender_type_check;

alter table public.conversations
  add constraint conversations_last_conversation_sender_type_check
  check (
    last_conversation_sender_type is null
    or last_conversation_sender_type in ('customer', 'ai', 'agent')
  );

alter table public.conversations
  add column if not exists meaningful_activity_at timestamptz
  generated always as (
    greatest(last_conversation_message_at, last_voice_activity_at, created_at)
  ) stored;

comment on column public.conversations.needs_reply is
  'True when the latest committed customer/AI/agent message is from the customer. The message trigger updates this under the conversation row lock, avoiding unsafe timestamp comparisons.';
comment on column public.conversations.last_conversation_message_at is
  'Timestamp of the latest customer, AI, or agent message. System events are intentionally excluded.';
comment on column public.conversations.last_conversation_preview is
  'Preview of the latest customer, AI, or agent message. System events are intentionally excluded.';
comment on column public.conversations.last_conversation_sender_type is
  'Sender of the latest customer, AI, or agent message. System events are intentionally excluded.';
comment on column public.conversations.meaningful_activity_at is
  'Latest customer/AI/agent message, real voice activity, or conversation creation time. System events are intentionally excluded.';

-- CREATE OR REPLACE clears function configuration, so the hardened search path must be restated.
create or replace function public.update_conversation_message_count()
returns trigger
language plpgsql
set search_path to 'public', 'pg_temp'
as $function$
begin
  update public.conversations
  set message_count = message_count + 1,
      last_message_at = new.created_at,
      last_message_preview = left(new.content, 200),
      last_message_sender_type = new.sender_type,
      last_customer_message_at = case
        when new.sender_type = 'customer' then new.created_at
        else last_customer_message_at
      end,
      customer_replied_since_warning = case
        when new.sender_type = 'customer'
          and auto_close_warning_sent_at is not null then true
        else customer_replied_since_warning
      end,
      last_conversation_message_at = case
        when new.sender_type in ('customer', 'ai', 'agent') then new.created_at
        else last_conversation_message_at
      end,
      last_conversation_preview = case
        when new.sender_type in ('customer', 'ai', 'agent') then left(new.content, 200)
        else last_conversation_preview
      end,
      last_conversation_sender_type = case
        when new.sender_type in ('customer', 'ai', 'agent') then new.sender_type
        else last_conversation_sender_type
      end,
      needs_reply = case
        when new.sender_type = 'customer' then true
        when new.sender_type in ('ai', 'agent') then false
        else needs_reply
      end
  where id = new.conversation_id;

  return new;
end;
$function$;

-- Preserve historical updated_at values while repairing denormalized inbox state set-wise.
alter table public.conversations disable trigger update_conversations_updated_at;

with latest_conversation_message as (
  select distinct on (conversation_id)
    conversation_id,
    created_at,
    content,
    sender_type
  from public.messages
  where sender_type in ('customer', 'ai', 'agent')
  order by conversation_id, created_at desc, id desc
)
update public.conversations conversation
set last_conversation_message_at = latest.created_at,
    last_conversation_preview = left(latest.content, 200),
    last_conversation_sender_type = latest.sender_type,
    needs_reply = latest.sender_type = 'customer'
from latest_conversation_message latest
where conversation.id = latest.conversation_id;

alter table public.conversations enable trigger update_conversations_updated_at;

create index if not exists idx_conversations_project_meaningful_activity
  on public.conversations (project_id, meaningful_activity_at desc, id);

create index if not exists idx_conversations_agent_needs_reply
  on public.conversations (project_id, last_customer_message_at, id)
  where status = 'agent_active' and needs_reply;

drop index if exists public.idx_conversations_waiting_queue;
create index idx_conversations_waiting_queue
  on public.conversations (project_id, queue_entered_at, id)
  where status = 'waiting';
