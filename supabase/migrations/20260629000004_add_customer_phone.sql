-- CHAN-001 FR-003: Add phone column to customers for WhatsApp identity.
ALTER TABLE customers ADD COLUMN IF NOT EXISTS phone text;
