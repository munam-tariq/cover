-- One-time reconciliation of conversations.message_count.
--
-- storeCustomerMessageOnly (handoff path) used to increment message_count in app code on top of
-- the update_message_count_on_insert trigger, double-counting those customer messages. The app
-- increment is now removed; this backfills the denormalized counter to match the actual message
-- rows (the trigger counts every insert, so we recompute the same way). Only rows that differ
-- are touched.
UPDATE conversations c
SET message_count = sub.cnt
FROM (
  SELECT conversation_id, COUNT(*) AS cnt
  FROM messages
  GROUP BY conversation_id
) sub
WHERE sub.conversation_id = c.id
  AND c.message_count IS DISTINCT FROM sub.cnt;
