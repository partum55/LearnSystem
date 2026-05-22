-- Harden auth/profile role synchronization triggers.
--
-- public.users.role is public.user_role enum, while raw_app_meta_data->>'role'
-- is text. PostgreSQL does not implicitly compare text = user_role, so the
-- profile -> auth claim trigger must cast NEW.role to text anywhere it compares
-- with JSON metadata.

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

CREATE OR REPLACE FUNCTION private.sync_auth_role_claim_from_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = auth, public, pg_temp
AS $$
BEGIN
  UPDATE auth.users
  SET raw_app_meta_data = jsonb_set(
        coalesce(raw_app_meta_data, '{}'::jsonb),
        '{role}',
        to_jsonb(NEW.role::text),
        true
      ),
      updated_at = NOW()
  WHERE id = NEW.id
    AND coalesce(raw_app_meta_data->>'role', '') IS DISTINCT FROM NEW.role::text;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.sync_auth_role_claim_from_profile() FROM PUBLIC;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION private.sync_auth_user_profile();

DROP TRIGGER IF EXISTS on_auth_user_profile_updated ON auth.users;
CREATE TRIGGER on_auth_user_profile_updated
  AFTER UPDATE OF email, email_confirmed_at, raw_user_meta_data, raw_app_meta_data ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION private.sync_auth_user_profile();

DROP TRIGGER IF EXISTS on_public_user_role_claim_changed ON public.users;
CREATE TRIGGER on_public_user_role_claim_changed
  -- Keep this UPDATE-only. public.users rows are created from auth.users signup
  -- triggers, so INSERT mirroring can try to update the same auth row mid-flow.
  AFTER UPDATE OF role ON public.users
  FOR EACH ROW
  WHEN (OLD.role IS DISTINCT FROM NEW.role)
  EXECUTE FUNCTION private.sync_auth_role_claim_from_profile();

UPDATE auth.users au
SET raw_app_meta_data = jsonb_set(
      coalesce(au.raw_app_meta_data, '{}'::jsonb),
      '{role}',
      to_jsonb(u.role::text),
      true
    ),
    updated_at = NOW()
FROM public.users u
WHERE u.id = au.id
  AND coalesce(au.raw_app_meta_data->>'role', '') IS DISTINCT FROM u.role::text;

COMMIT;
