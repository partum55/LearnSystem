-- MVP auth/profile canonicalization.
--
-- Supabase Auth owns credentials, identities, sessions, refresh tokens, MFA, and
-- OAuth state in the managed auth schema. LearnSystem owns exactly one app-level
-- user/profile table: public.users.
--
-- Canonical boundary:
--   auth.users.id          = identity/session primary key managed by Supabase
--   public.users.id        = app profile primary key and FK to auth.users(id)
--   public.users.role      = canonical app/global role: ADMIN, TEACHER, USER
--   learning.course_members.role_in_course = course-local role
--
-- This migration deliberately does not drop auth.* tables. They are Supabase
-- internals; deleting them breaks signup, login, refresh tokens, sessions, MFA,
-- identities, invites, and password recovery.

BEGIN;

CREATE SCHEMA IF NOT EXISTS private;

-- Remove app profiles that no longer have an auth identity. In the MVP model
-- profile rows must never outlive auth.users.
DELETE FROM public.users u
WHERE NOT EXISTS (
  SELECT 1
  FROM auth.users au
  WHERE au.id = u.id
);

-- public.users rows are created from auth.users. A generated UUID here can
-- create identities that cannot log in.
ALTER TABLE public.users ALTER COLUMN id DROP DEFAULT;

ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_id_auth_users_fkey;

ALTER TABLE public.users
  ADD CONSTRAINT users_id_auth_users_fkey
  FOREIGN KEY (id)
  REFERENCES auth.users(id)
  ON DELETE CASCADE;

ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users ALTER COLUMN role SET DEFAULT 'USER';
UPDATE public.users SET role = 'USER' WHERE role NOT IN ('ADMIN', 'TEACHER', 'USER') OR role IS NULL;
ALTER TABLE public.users
  ADD CONSTRAINT users_role_check CHECK (role IN ('ADMIN', 'TEACHER', 'USER'));

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_lower
  ON public.users (lower(email));

-- Keep the app profile synchronized from Supabase Auth. This handles both
-- signups and auth-side email/confirmation changes.
CREATE OR REPLACE FUNCTION private.sync_auth_user_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  metadata_role text;
BEGIN
  metadata_role := upper(coalesce(NEW.raw_app_meta_data->>'role', 'USER'));
  IF metadata_role NOT IN ('ADMIN', 'TEACHER', 'USER') THEN
    metadata_role := 'USER';
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
    'UK',
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

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION private.sync_auth_user_profile();

DROP TRIGGER IF EXISTS on_auth_user_profile_updated ON auth.users;
CREATE TRIGGER on_auth_user_profile_updated
  AFTER UPDATE OF email, email_confirmed_at, raw_user_meta_data, raw_app_meta_data ON auth.users
  FOR EACH ROW EXECUTE FUNCTION private.sync_auth_user_profile();

-- public.users.role is the canonical global role, but backend services read the
-- app role from the Supabase JWT. Mirror role to app_metadata so a refreshed
-- token carries ADMIN/TEACHER/USER instead of only Supabase's "authenticated".
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
    AND coalesce(raw_app_meta_data->>'role', '') IS DISTINCT FROM NEW.role;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.sync_auth_role_claim_from_profile() FROM PUBLIC;

DROP TRIGGER IF EXISTS on_public_user_role_claim_changed ON public.users;
CREATE TRIGGER on_public_user_role_claim_changed
  AFTER INSERT OR UPDATE OF role ON public.users
  FOR EACH ROW EXECUTE FUNCTION private.sync_auth_role_claim_from_profile();

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
  AND coalesce(au.raw_app_meta_data->>'role', '') IS DISTINCT FROM u.role;

COMMIT;
