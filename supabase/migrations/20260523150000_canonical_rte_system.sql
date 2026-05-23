-- Migration: Canonical RTE System
BEGIN;

-- 1. Create native Postgres enum for lesson page types
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'lesson_page_type' AND typnamespace = 'learning'::regnamespace) THEN
    CREATE TYPE learning.lesson_page_type AS ENUM ('TEXT', 'VIDEO', 'CODE', 'MERMAID', 'MATH', 'INLINE_QUIZ_QUESTION');
  END IF;
END $$;

-- 2. Rename table lesson_blocks to lesson_pages (if it hasn't been renamed already)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'learning' AND table_name = 'lesson_blocks') THEN
    ALTER TABLE learning.lesson_blocks RENAME TO lesson_pages;
  END IF;
END $$;

-- 3. Modify columns of lesson_pages to match the new type
ALTER TABLE learning.lesson_pages
  ALTER COLUMN type TYPE learning.lesson_page_type USING type::text::learning.lesson_page_type;

-- 4. Rename indexes for lesson_pages
ALTER INDEX IF EXISTS learning.idx_lesson_blocks_item_position RENAME TO idx_lesson_pages_item_position;
ALTER INDEX IF EXISTS learning.idx_lesson_blocks_type RENAME TO idx_lesson_pages_type;

-- 5. Add new content_json column to learning_items
ALTER TABLE learning.learning_items ADD COLUMN IF NOT EXISTS content_json JSONB;

-- Populate content_json with current content
UPDATE learning.learning_items 
SET content_json = content
WHERE content_json IS NULL;

-- 6. Add instructions_json column to assignments
ALTER TABLE learning.assignments ADD COLUMN IF NOT EXISTS instructions_json JSONB;

-- Populate instructions_json for existing assignments by wrapping description/instructions in rich content blocks.
UPDATE learning.assignments
SET instructions_json = jsonb_build_object(
  'version', 1,
  'blocks', jsonb_build_array(
    jsonb_build_object(
      'id', 'block-init',
      'type', 'paragraph',
      'data', jsonb_build_object('text', COALESCE(instructions, description, ''))
    )
  )
)
WHERE instructions_json IS NULL;

-- 7. Add content_json column to assignment_submissions
ALTER TABLE learning.assignment_submissions ADD COLUMN IF NOT EXISTS content_json JSONB;

-- Populate content_json for existing text answers
UPDATE learning.assignment_submissions
SET content_json = jsonb_build_object(
  'version', 1,
  'blocks', jsonb_build_array(
    jsonb_build_object(
      'id', 'block-init',
      'type', 'paragraph',
      'data', jsonb_build_object('text', COALESCE(text_answer, ''))
    )
  )
)
WHERE text_answer IS NOT NULL AND content_json IS NULL;

-- 8. Add content_json column to submission_versions
ALTER TABLE learning.submission_versions ADD COLUMN IF NOT EXISTS content_json JSONB;

-- Populate submission_versions.content_json from submission_versions.content
UPDATE learning.submission_versions 
SET content_json = content
WHERE content_json IS NULL;

COMMIT;
