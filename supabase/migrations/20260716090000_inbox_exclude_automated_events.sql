-- Inactivity warnings are delivered with sender_type = 'ai' so they render as an AI bubble in the
-- thread, but metadata.event identifies them as automated lifecycle events. Keep those events in
-- the audit trail without letting them replace the inbox preview or meaningful activity.

create or replace function public.update_conversation_message_count()
returns trigger
language plpgsql
set search_path to 'public', 'pg_temp'
as $function$
declare
  is_conversation_message boolean :=
    new.sender_type in ('customer', 'ai', 'agent')
    and not (new.metadata ? 'event');
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
        when is_conversation_message then new.created_at
        else last_conversation_message_at
      end,
      last_conversation_preview = case
        when is_conversation_message then left(new.content, 200)
        else last_conversation_preview
      end,
      last_conversation_sender_type = case
        when is_conversation_message then new.sender_type
        else last_conversation_sender_type
      end,
      needs_reply = case
        when is_conversation_message and new.sender_type = 'customer' then true
        when is_conversation_message and new.sender_type in ('ai', 'agent') then false
        else needs_reply
      end
  where id = new.conversation_id;

  return new;
end;
$function$;

comment on column public.conversations.last_conversation_message_at is
  'Timestamp of the latest customer, AI, or agent message that is not an automated metadata.event. Sender_type system and automated lifecycle events are excluded.';
comment on column public.conversations.last_conversation_preview is
  'Preview of the latest customer, AI, or agent message that is not an automated metadata.event. Sender_type system and automated lifecycle events are excluded.';
comment on column public.conversations.last_conversation_sender_type is
  'Sender of the latest customer, AI, or agent message that is not an automated metadata.event. Sender_type system and automated lifecycle events are excluded.';
comment on column public.conversations.meaningful_activity_at is
  'Latest non-event customer/AI/agent message, real voice activity, or conversation creation time. Automated lifecycle events are excluded.';

-- Repair every conversation, including rows whose only otherwise-eligible message is an AI-styled
-- automated event. The LEFT JOIN deliberately clears stale canonical fields on those rows.
alter table public.conversations disable trigger update_conversations_updated_at;

with latest_conversation_message as (
  select distinct on (conversation_id)
    conversation_id,
    created_at,
    content,
    sender_type
  from public.messages
  where sender_type in ('customer', 'ai', 'agent')
    and not (metadata ? 'event')
  order by conversation_id, created_at desc, id desc
), reconciled as (
  select
    conversation.id as conversation_id,
    latest.created_at,
    latest.content,
    latest.sender_type
  from public.conversations conversation
  left join latest_conversation_message latest
    on latest.conversation_id = conversation.id
)
update public.conversations conversation
set last_conversation_message_at = reconciled.created_at,
    last_conversation_preview = left(reconciled.content, 200),
    last_conversation_sender_type = reconciled.sender_type,
    needs_reply = coalesce(reconciled.sender_type = 'customer', false)
from reconciled
where conversation.id = reconciled.conversation_id;

alter table public.conversations enable trigger update_conversations_updated_at;
