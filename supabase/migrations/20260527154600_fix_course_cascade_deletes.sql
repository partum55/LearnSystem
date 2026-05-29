-- ============================================================
-- Migration: Fix ON DELETE CASCADE for course-owned data
-- ============================================================
BEGIN;

DO $$
DECLARE
    question_bank_table regclass := to_regclass('learning.question_bank');
    courses_table regclass := to_regclass('learning.courses');
    constraint_name text;
BEGIN
    IF question_bank_table IS NULL THEN
        RAISE NOTICE 'learning.question_bank does not exist; skipping legacy question_bank cascade fix';
        RETURN;
    END IF;

    IF courses_table IS NULL THEN
        RAISE NOTICE 'learning.courses does not exist; skipping legacy question_bank cascade fix';
        RETURN;
    END IF;

    -- Drop existing ON DELETE SET NULL or any foreign key constraint on course_id for learning.question_bank
    SELECT conname INTO constraint_name
    FROM pg_constraint
    WHERE conrelid = question_bank_table
      AND confrelid = courses_table
      AND contype = 'f';

    IF constraint_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE learning.question_bank DROP CONSTRAINT %I', constraint_name);
    END IF;

    -- Re-add the constraint with ON DELETE CASCADE.
    ALTER TABLE learning.question_bank
    ADD CONSTRAINT question_bank_course_id_fkey
    FOREIGN KEY (course_id) REFERENCES learning.courses(id) ON DELETE CASCADE;
END $$;

COMMIT;
