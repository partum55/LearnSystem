-- Remove legacy profile columns from public.users and stop syncing them
-- from auth.users.

BEGIN;

ALTER TABLE public.users
  DROP COLUMN IF EXISTS display_name,
  DROP COLUMN IF EXISTS bio,
  DROP COLUMN IF EXISTS is_deleted,
  DROP COLUMN IF EXISTS preferences;

DROP INDEX IF EXISTS idx_users_is_deleted;

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
    id, email, first_name, last_name,
    role, locale, theme, email_verified
  ) VALUES (
    NEW.id,
    lower(NEW.email),
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    metadata_role,
    'UK'::public.user_locale,
    'LIGHT'::public.user_theme,
    NEW.email_confirmed_at IS NOT NULL
  )
  ON CONFLICT (id) DO UPDATE SET
    email          = lower(EXCLUDED.email),
    first_name     = COALESCE(public.users.first_name, EXCLUDED.first_name),
    last_name      = COALESCE(public.users.last_name, EXCLUDED.last_name),
    email_verified = EXCLUDED.email_verified,
    updated_at     = NOW();

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.sync_auth_user_profile() FROM PUBLIC;

REVOKE UPDATE ON public.users FROM anon, authenticated;
GRANT SELECT ON public.users TO authenticated;
GRANT UPDATE (first_name, last_name, avatar_url, locale, theme)
  ON public.users TO authenticated;

COMMIT;
