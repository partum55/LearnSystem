-- V1__create_assessment_tables.sql
-- Initial schema for assessment service (assignments, quizzes, questions)

-- Create assignments table
CREATE TABLE IF NOT EXISTS assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL,
    module_id UUID,
    category_id UUID,
    position INTEGER NOT NULL DEFAULT 0,
    assignment_type VARCHAR(20) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    description_format VARCHAR(20) DEFAULT 'MARKDOWN',
    instructions TEXT,
    instructions_format VARCHAR(20) DEFAULT 'MARKDOWN',
    resources JSONB DEFAULT '[]'::jsonb,
    starter_code TEXT,
    solution_code TEXT,
    programming_language VARCHAR(50),
    auto_grading_enabled BOOLEAN DEFAULT FALSE,
    test_cases JSONB DEFAULT '[]'::jsonb,
    max_points DECIMAL(6, 2) NOT NULL DEFAULT 100.00,
    rubric JSONB DEFAULT '{}'::jsonb,
    due_date TIMESTAMP,
    available_from TIMESTAMP,
    available_until TIMESTAMP,
    allow_late_submission BOOLEAN DEFAULT FALSE,
    late_penalty_percent DECIMAL(5, 2) DEFAULT 0,
    submission_types JSONB DEFAULT '[]'::jsonb,
    allowed_file_types JSONB DEFAULT '[]'::jsonb,
    max_file_size BIGINT DEFAULT 10485760,
    max_files INTEGER DEFAULT 5,
    quiz_id UUID,
    external_tool_url VARCHAR(500),
    external_tool_config JSONB DEFAULT '{}'::jsonb,
    grade_anonymously BOOLEAN DEFAULT FALSE,
    peer_review_enabled BOOLEAN DEFAULT FALSE,
    peer_reviews_required INTEGER DEFAULT 0,
    tags JSONB DEFAULT '[]'::jsonb,
    estimated_duration INTEGER,
    is_template BOOLEAN DEFAULT FALSE,
    is_archived BOOLEAN DEFAULT FALSE,
    original_assignment_id UUID,
    is_published BOOLEAN DEFAULT FALSE,
    created_by UUID NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for assignments
CREATE INDEX idx_assignment_course ON assignments(course_id);
CREATE INDEX idx_assignment_module ON assignments(module_id);
CREATE INDEX idx_assignment_type ON assignments(assignment_type);
CREATE INDEX idx_assignment_published ON assignments(is_published);
CREATE INDEX idx_assignment_due_date ON assignments(due_date);
CREATE INDEX idx_assignment_created_by ON assignments(created_by);

-- Create quizzes table
CREATE TABLE IF NOT EXISTS quizzes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    time_limit INTEGER,
    attempts_allowed INTEGER DEFAULT 1,
    shuffle_questions BOOLEAN DEFAULT FALSE,
    shuffle_answers BOOLEAN DEFAULT FALSE,
    show_correct_answers BOOLEAN DEFAULT TRUE,
    show_correct_answers_at TIMESTAMP,
    pass_percentage DECIMAL(5, 2) DEFAULT 60.00,
    created_by UUID NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for quizzes
CREATE INDEX idx_quiz_course ON quizzes(course_id);
CREATE INDEX idx_quiz_created_by ON quizzes(created_by);

-- Create question_bank table
CREATE TABLE IF NOT EXISTS question_bank (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID,
    question_type VARCHAR(30) NOT NULL,
    stem TEXT NOT NULL,
    options JSONB DEFAULT '{}'::jsonb,
    correct_answer JSONB DEFAULT '{}'::jsonb,
    explanation TEXT,
    points DECIMAL(6, 2) NOT NULL DEFAULT 1.00,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_by UUID NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for question_bank
CREATE INDEX idx_question_course ON question_bank(course_id);
CREATE INDEX idx_question_type ON question_bank(question_type);
CREATE INDEX idx_question_created_by ON question_bank(created_by);

-- Create quiz_questions association table
CREATE TABLE IF NOT EXISTS quiz_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES question_bank(id) ON DELETE CASCADE,
    position INTEGER NOT NULL DEFAULT 0,
    points_override DECIMAL(6, 2),
    CONSTRAINT uk_quiz_question UNIQUE (quiz_id, question_id)
);

-- Create indexes for quiz_questions
CREATE INDEX idx_quiz_question_quiz ON quiz_questions(quiz_id);
CREATE INDEX idx_quiz_question_position ON quiz_questions(quiz_id, position);

-- Create quiz_attempts table
CREATE TABLE IF NOT EXISTS quiz_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    attempt_number INTEGER NOT NULL DEFAULT 1,
    started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    submitted_at TIMESTAMP,
    answers JSONB DEFAULT '{}'::jsonb,
    auto_score DECIMAL(6, 2),
    manual_score DECIMAL(6, 2),
    final_score DECIMAL(6, 2),
    graded_by UUID,
    graded_at TIMESTAMP,
    feedback TEXT,
    ip_address VARCHAR(45),
    browser_fingerprint VARCHAR(255),
    proctoring_data JSONB DEFAULT '{}'::jsonb,
    CONSTRAINT uk_quiz_user_attempt UNIQUE (quiz_id, user_id, attempt_number)
);

-- Create indexes for quiz_attempts
CREATE INDEX idx_quiz_attempt_quiz ON quiz_attempts(quiz_id);
CREATE INDEX idx_quiz_attempt_user ON quiz_attempts(user_id);
CREATE INDEX idx_quiz_attempt_started ON quiz_attempts(started_at);

-- Add comments for documentation
COMMENT ON TABLE assignments IS 'Assignments with support for multiple types (QUIZ, FILE_UPLOAD, TEXT, CODE, URL, etc.)';
COMMENT ON TABLE quizzes IS 'Quiz/test definitions with settings';
COMMENT ON TABLE question_bank IS 'Reusable question bank for quizzes';
COMMENT ON TABLE quiz_questions IS 'Association between quizzes and questions';
COMMENT ON TABLE quiz_attempts IS 'Student attempts at quizzes with answers and scoring';

COMMENT ON COLUMN assignments.assignment_type IS 'QUIZ, FILE_UPLOAD, TEXT, CODE, URL, MANUAL_GRADE, EXTERNAL';
COMMENT ON COLUMN assignments.description_format IS 'PLAIN, MARKDOWN, HTML, RICH';
COMMENT ON COLUMN assignments.auto_grading_enabled IS 'Enable automatic grading for code submissions';
COMMENT ON COLUMN question_bank.question_type IS 'MULTIPLE_CHOICE, TRUE_FALSE, FILL_BLANK, MATCHING, NUMERICAL, FORMULA, SHORT_ANSWER, ESSAY, CODE, FILE_UPLOAD, ORDERING, HOTSPOT, DRAG_DROP';

