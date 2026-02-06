-- Add AI content constraints for assignments/quizzes/questions

ALTER TABLE assignments
    ADD CONSTRAINT chk_assignment_title_not_blank CHECK (length(trim(title)) > 0),
    ADD CONSTRAINT chk_assignment_description_not_blank CHECK (length(trim(description)) > 0);

ALTER TABLE quizzes
    ADD CONSTRAINT chk_quiz_title_not_blank CHECK (length(trim(title)) > 0);

ALTER TABLE question_bank
    ADD CONSTRAINT chk_question_stem_not_blank CHECK (length(trim(stem)) > 0);

