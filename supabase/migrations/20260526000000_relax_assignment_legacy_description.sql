-- Canonical assignments store instructions in instructions_json.
-- The legacy description column remains only for old data and must not block new inserts.
ALTER TABLE learning.assignments
  ALTER COLUMN description DROP NOT NULL;
