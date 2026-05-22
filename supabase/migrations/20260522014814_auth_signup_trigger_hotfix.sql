-- Fix Supabase Auth signup failures caused by app-profile triggers.
--
-- Supabase runs this function while inserting/updating auth.users. The profile
-- sync must not throw for non-canonical app_metadata.role values, and the role
-- claim mirror must not update auth.users during the same auth.users INSERT.

BEGIN;

CREATE OR REPLACE FUNCTION private.sync_auth_user_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  raw_role text;
  metadata_role public.user_role := 'USER'::public.user_role;
BEGIN
  raw_role := upper(coalesce(NEW.raw_app_meta_data->>'role', 'USER'));
  IF raw_role IN ('ADMIN', 'TEACHER', 'USER') THEN
    metadata_role := raw_role::public.user_role;
  END IF;

  INSERT INTO public.users (
    id, email, display_name, first_name, last_name,
    role, locale, theme, email_verified
  ) VALUES (
    NEW.id,
    lower(NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    metadata_role,
    'UK'::public.user_locale,
    'light',
    NEW.email_confirmed_at IS NOT NULL
  )
  ON CONFLICT (id) DO UPDATE SET
    email          = lower(EXCLUDED.email),
    display_name   = COALESCE(public.users.display_name, EXCLUDED.display_name),
    first_name     = COALESCE(public.users.first_name, EXCLUDED.first_name),
    last_name      = COALESCE(public.users.last_name, EXCLUDED.last_name),
    email_verified = EXCLUDED.email_verified,
    updated_at     = NOW();

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.sync_auth_user_profile() FROM PUBLIC;

DROP TRIGGER IF EXISTS on_public_user_role_claim_changed ON public.users;
CREATE TRIGGER on_public_user_role_claim_changed
  AFTER UPDATE OF role ON public.users
  FOR EACH ROW
  WHEN (OLD.role IS DISTINCT FROM NEW.role)
  EXECUTE FUNCTION private.sync_auth_role_claim_from_profile();

COMMIT;
