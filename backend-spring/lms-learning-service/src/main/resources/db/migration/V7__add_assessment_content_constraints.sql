-- Add AI content constraints for assignments/quizzes/questions

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_assignment_title_not_blank'
    ) THEN
        ALTER TABLE assignments
            ADD CONSTRAINT chk_assignment_title_not_blank CHECK (length(trim(title)) > 0);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_assignment_description_not_blank'
    ) THEN
        ALTER TABLE assignments
            ADD CONSTRAINT chk_assignment_description_not_blank CHECK (length(trim(description)) > 0);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_quiz_title_not_blank'
    ) THEN
        ALTER TABLE quizzes
            ADD CONSTRAINT chk_quiz_title_not_blank CHECK (length(trim(title)) > 0);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_question_stem_not_blank'
    ) THEN
        ALTER TABLE question_bank
            ADD CONSTRAINT chk_question_stem_not_blank CHECK (length(trim(stem)) > 0);
    END IF;
END $$;
