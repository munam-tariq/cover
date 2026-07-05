-- CHAN-001 FR-006: Partial unique index so Meta webhook retries cannot create
-- duplicate messages. Belt-and-braces with app-level dedupe in CHAN-002.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_messages_wa_message_id
  ON messages ((metadata->>'wa_message_id'))
  WHERE metadata ? 'wa_message_id';
