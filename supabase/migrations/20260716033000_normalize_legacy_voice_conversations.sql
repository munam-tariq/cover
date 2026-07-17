-- Voice is an activity within a conversation, not a current conversation source.
--
-- The old standalone voice UI created source='voice' rows. The current widget/public voice flows
-- first create their normal channel conversation, then append the call transcript to that thread.
-- All surviving source='voice' rows predate the public-page channel, so their originating surface
-- was the widget. Preserve any real end reason and fill the legacy rows that predate that field so
-- the existing hasVoiceActivity projection renders them as "Voice used".
--
-- This is historical normalization, not customer activity. Avoid moving updated_at to migration
-- time or old empty rows would jump to the top of inboxes that fall back to updated_at for sorting.
alter table public.conversations disable trigger update_conversations_updated_at;

update public.conversations
set source = 'widget',
    voice_ended_reason = coalesce(voice_ended_reason, 'legacy_voice_source')
where source = 'voice';

alter table public.conversations enable trigger update_conversations_updated_at;
