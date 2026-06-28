begin;

alter table public.conversations
  drop constraint if exists conversations_handoff_reason_check;

alter table public.conversations
  add constraint conversations_handoff_reason_check
  check (
    handoff_reason is null
    or handoff_reason = any (
      array[
        'low_confidence'::text,
        'keyword'::text,
        'customer_request'::text,
        'button_click'::text,
        'offline_form'::text
      ]
    )
  );

commit;
