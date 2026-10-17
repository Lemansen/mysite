CREATE OR REPLACE FUNCTION public.is_banned(uid uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF uid IS DISTINCT FROM auth.uid() AND NOT public.is_staff() THEN
    RAISE EXCEPTION 'Нет доступа';
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = uid
      AND (ban_permanent OR banned_until > now())
  );
END;
$function$;
