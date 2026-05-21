-- Migration: Access Control & Role Model Hardening
-- Decouples global roles and course roles, updates constraints and defaults, and migrates existing data.

-- 1. Drop old constraint and set new default on public.users first
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users ALTER COLUMN role SET DEFAULT 'USER';

-- 2. Migrate global roles in public.users: STUDENT and TA become USER, SUPERADMIN becomes ADMIN
UPDATE public.users SET role = 'USER' WHERE role IN ('STUDENT', 'TA', 'ASSISTANT');
UPDATE public.users SET role = 'ADMIN' WHERE role = 'SUPERADMIN';

-- 3. Add new check constraint to public.users
ALTER TABLE public.users ADD CONSTRAINT users_role_check CHECK (role IN ('ADMIN', 'TEACHER', 'USER'));

-- 4. Drop old constraint on learning.course_members first
ALTER TABLE learning.course_members DROP CONSTRAINT IF EXISTS course_members_role_in_course_check;

-- 5. Migrate course-level roles in learning.course_members: ASSISTANT becomes TA
UPDATE learning.course_members SET role_in_course = 'TA' WHERE role_in_course = 'ASSISTANT';

-- 6. Add new check constraint to learning.course_members
ALTER TABLE learning.course_members ADD CONSTRAINT course_members_role_in_course_check CHECK (role_in_course IN ('OWNER', 'TEACHER', 'TA', 'STUDENT'));

-- 7. Ensure exactly one role per user per course and efficient membership lookups.
CREATE UNIQUE INDEX IF NOT EXISTS uk_course_user ON learning.course_members (course_id, user_id);
CREATE INDEX IF NOT EXISTS idx_course_members_course_id ON learning.course_members (course_id);
CREATE INDEX IF NOT EXISTS idx_course_members_user_id ON learning.course_members (user_id);
CREATE INDEX IF NOT EXISTS idx_course_members_course_role_status
  ON learning.course_members (course_id, role_in_course, enrollment_status);

-- 8. Fix the handle_new_auth_user trigger to insert 'USER' role instead of legacy 'STUDENT'
CREATE OR REPLACE FUNCTION private.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.users (
    id, email, display_name, first_name, last_name,
    role, locale, theme, email_verified
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    'USER', -- Matches new global role check constraint
    'UK',
    'light',
    NEW.email_confirmed_at IS NOT NULL
  )
  ON CONFLICT (id) DO UPDATE SET
    email          = EXCLUDED.email,
    display_name   = COALESCE(public.users.display_name, EXCLUDED.display_name),
    email_verified = EXCLUDED.email_verified,
    updated_at     = NOW();
  RETURN NEW;
END;
$$;

