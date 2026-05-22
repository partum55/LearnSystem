-- Fix role edits in Supabase Table Editor.
--
-- public.users.role is public.user_role enum, while raw_app_meta_data->>'role'
-- is text. PostgreSQL does not implicitly compare text = user_role, so the
-- trigger must cast NEW.role to text anywhere it compares with JSON metadata.

BEGIN;

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

DROP TRIGGER IF EXISTS on_public_user_role_claim_changed ON public.users;
CREATE TRIGGER on_public_user_role_claim_changed
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
