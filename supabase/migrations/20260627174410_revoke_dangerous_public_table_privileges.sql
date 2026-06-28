-- Revoke table privileges that browser/client roles should never need.
--
-- RLS controls SELECT/INSERT/UPDATE/DELETE row access, but TRUNCATE is not
-- subject to RLS. REFERENCES and TRIGGER are also unnecessary for public API
-- clients. Keep ordinary DML grants untouched so existing RLS-backed dashboard
-- and realtime flows continue to work.

revoke truncate, references, trigger
on all tables in schema public
from anon, authenticated;

alter default privileges in schema public
revoke truncate, references, trigger
on tables
from anon, authenticated;
