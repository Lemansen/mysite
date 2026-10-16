-- Remove non-row-level privileges from public API roles.
-- Keep ordinary DML grants where RLS policies govern row access.
REVOKE TRUNCATE, REFERENCES, TRIGGER, MAINTAIN
ON ALL TABLES IN SCHEMA public FROM anon, authenticated;

-- Keep USAGE for sequence-backed inserts, but prevent sequence inspection/advancement.
REVOKE SELECT, UPDATE
ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
