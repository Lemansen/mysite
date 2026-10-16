-- Public API roles do not need direct access to sequences in the public schema.
-- Profile IDs are allocated by database-owned signup/profile logic.
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
