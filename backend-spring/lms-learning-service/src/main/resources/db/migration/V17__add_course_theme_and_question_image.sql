-- Add visual customization and question image support columns

ALTER TABLE courses
    ADD COLUMN IF NOT EXISTS theme_color VARCHAR(20);

ALTER TABLE question_bank
    ADD COLUMN IF NOT EXISTS image_url VARCHAR(500);
