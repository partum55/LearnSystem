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
