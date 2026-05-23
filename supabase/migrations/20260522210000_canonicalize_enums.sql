-- Migration: Canonicalize closed domains (CourseRole and AssignmentType) to native enums
-- Resolves legacy string-backed mappings and enforces strict conceptual alignment.

BEGIN;

-- ============================================================
-- 1. Create Native PostgreSQL Enum Types
-- ============================================================

DO $$
BEGIN
  CREATE TYPE learning.course_role AS ENUM ('OWNER', 'TEACHER', 'TA', 'STUDENT');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE assessment.assignment_type AS ENUM (
    'FILE_SUBMISSION',
    'TEXT_SUBMISSION',
    'QUIZ',
    'FORM',
    'VPL',
    'SEMINAR'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- 2. Pre-Validation Auditing of Existing Rows
-- ============================================================

-- Guard course roles to ensure no legacy or unexpected roles exist in course_members
DO $$
DECLARE
  invalid_role_count INT;
BEGIN
  SELECT COUNT(*) INTO invalid_role_count
  FROM learning.course_members
  WHERE role_in_course NOT IN ('OWNER', 'TEACHER', 'TA', 'STUDENT');
  
  IF invalid_role_count > 0 THEN
    RAISE EXCEPTION 'Pre-validation failed: Found % course members with invalid course roles.', invalid_role_count;
  END IF;
END $$;

-- Guard assignment types to ensure only expected legacy types (or already migrated types) exist
DO $$
DECLARE
  invalid_type_count INT;
BEGIN
  SELECT COUNT(*) INTO invalid_type_count
  FROM assessment.assignments
  WHERE assignment_type NOT IN (
    'QUIZ', 'FILE_UPLOAD', 'TEXT', 'CODE', 'URL',
    'MANUAL_GRADE', 'EXTERNAL', 'VIRTUAL_LAB', 'SEMINAR',
    -- Also include canonicalized values for rerun safety
    'FILE_SUBMISSION', 'TEXT_SUBMISSION', 'QUIZ', 'FORM', 'VPL', 'SEMINAR'
  );
  
  IF invalid_type_count > 0 THEN
    RAISE EXCEPTION 'Pre-validation failed: Found % assignments with unknown/invalid assignment types.', invalid_type_count;
  END IF;
END $$;

-- ============================================================
-- 3. Drop Depending RLS Policies Temporarily
-- ============================================================

DROP POLICY IF EXISTS "question_bank_staff_only" ON assessment.question_bank;
DROP POLICY IF EXISTS "course_media_staff_write" ON storage.objects;

-- ============================================================
-- 4. Migrate and Convert learning.course_members.role_in_course
-- ============================================================

ALTER TABLE learning.course_members DROP CONSTRAINT IF EXISTS course_members_role_in_course_check;

ALTER TABLE learning.course_members
  ALTER COLUMN role_in_course TYPE learning.course_role USING role_in_course::learning.course_role;

-- ============================================================
-- 5. Recreate RLS Policies
-- ============================================================

CREATE POLICY "question_bank_staff_only"
  ON assessment.question_bank FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM learning.course_members cm
      WHERE cm.course_id = assessment.question_bank.course_id
        AND cm.user_id = auth.uid()
        -- Cast role_in_course to text for string comparison in existing policy logic
        AND cm.role_in_course::text IN ('TEACHER','TA')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM learning.course_members cm
      WHERE cm.course_id = assessment.question_bank.course_id
        AND cm.user_id = auth.uid()
        AND cm.role_in_course::text IN ('TEACHER','TA')
    )
  );

CREATE POLICY "course_media_staff_write"
  ON storage.objects FOR ALL
  USING (
    bucket_id = 'course-media'
    AND EXISTS (
      SELECT 1 FROM learning.course_members cm
      WHERE cm.course_id::text = (storage.foldername(name))[1]
        AND cm.user_id = auth.uid()
        AND cm.role_in_course::text IN ('TEACHER','TA')
    )
  )
  WITH CHECK (
    bucket_id = 'course-media'
    AND EXISTS (
      SELECT 1 FROM learning.course_members cm
      WHERE cm.course_id::text = (storage.foldername(name))[1]
        AND cm.user_id = auth.uid()
        AND cm.role_in_course::text IN ('TEACHER','TA')
    )
  );

-- ============================================================
-- 6. Migrate and Convert assessment.assignments.assignment_type
-- ============================================================

-- Drop old check constraint if it exists (automatically generated name is assignments_assignment_type_check)
ALTER TABLE assessment.assignments DROP CONSTRAINT IF EXISTS assignments_assignment_type_check;

-- Perform explicit CASE conversion for all legacy representations
ALTER TABLE assessment.assignments
  ALTER COLUMN assignment_type TYPE assessment.assignment_type USING (
    CASE assignment_type
      WHEN 'FILE_UPLOAD'  THEN 'FILE_SUBMISSION'::assessment.assignment_type
      WHEN 'TEXT'         THEN 'TEXT_SUBMISSION'::assessment.assignment_type
      WHEN 'URL'          THEN 'FORM'::assessment.assignment_type
      WHEN 'EXTERNAL'     THEN 'FORM'::assessment.assignment_type
      WHEN 'VIRTUAL_LAB'  THEN 'VPL'::assessment.assignment_type
      WHEN 'CODE'         THEN 'VPL'::assessment.assignment_type
      WHEN 'QUIZ'         THEN 'QUIZ'::assessment.assignment_type
      WHEN 'SEMINAR'      THEN 'SEMINAR'::assessment.assignment_type
      WHEN 'MANUAL_GRADE' THEN 'SEMINAR'::assessment.assignment_type
      -- Casing fallback in case values are already in canonical format
      WHEN 'FILE_SUBMISSION' THEN 'FILE_SUBMISSION'::assessment.assignment_type
      WHEN 'TEXT_SUBMISSION' THEN 'TEXT_SUBMISSION'::assessment.assignment_type
      WHEN 'QUIZ'            THEN 'QUIZ'::assessment.assignment_type
      WHEN 'FORM'            THEN 'FORM'::assessment.assignment_type
      WHEN 'VPL'             THEN 'VPL'::assessment.assignment_type
      WHEN 'SEMINAR'         THEN 'SEMINAR'::assessment.assignment_type
    END
  );

COMMIT;
