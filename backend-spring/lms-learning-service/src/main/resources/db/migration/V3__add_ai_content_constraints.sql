-- Add AI content constraints for courses/modules

ALTER TABLE courses
    ADD CONSTRAINT chk_course_code_not_blank CHECK (length(trim(code)) > 0),
    ADD CONSTRAINT chk_course_title_uk_not_blank CHECK (length(trim(title_uk)) > 0),
    ADD CONSTRAINT chk_course_title_en_not_blank CHECK (title_en IS NULL OR length(trim(title_en)) > 0);

ALTER TABLE modules
    ADD CONSTRAINT chk_module_title_not_blank CHECK (length(trim(title)) > 0);

