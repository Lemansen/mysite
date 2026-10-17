-- Helpers should only see the public user directory, not ban and appeal fields.
DROP POLICY IF EXISTS "profiles read" ON public.profiles;
CREATE POLICY "profiles read own or staff" ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR is_staff());

CREATE OR REPLACE VIEW public.helper_profiles AS
  SELECT id, public_id, username, role, created_at
  FROM public.profiles;

REVOKE ALL PRIVILEGES ON TABLE public.helper_profiles FROM anon, authenticated;
GRANT SELECT ON TABLE public.helper_profiles TO authenticated;
