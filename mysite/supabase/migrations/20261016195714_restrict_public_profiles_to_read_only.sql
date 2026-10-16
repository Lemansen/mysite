-- Public profile cards are intentionally readable by visitors, but must not be writable.
-- The view is updatable at the PostgreSQL level, so explicitly remove DML privileges.
REVOKE ALL PRIVILEGES ON TABLE public.public_profiles FROM anon, authenticated;
GRANT SELECT ON TABLE public.public_profiles TO anon, authenticated;
