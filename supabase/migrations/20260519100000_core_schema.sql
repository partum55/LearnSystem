-- 20260519100000_core_schema.sql
-- Clean baseline schema. DB is empty; replaces all previous migrations.
-- Naming: snake_case tables/columns, UUID PKs, timestamptz for all timestamps.

BEGIN;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- APPLICATION SCHEMAS
-- public: exposed Supabase API surface only.
-- learning/assessment/grading/ai/operations: internal app domains.
-- private: privileged trigger/helper functions, never exposed.
-- ============================================================
CREATE SCHEMA IF NOT EXISTS learning;
CREATE SCHEMA IF NOT EXISTS assessment;
CREATE SCHEMA IF NOT EXISTS grading;
CREATE SCHEMA IF NOT EXISTS ai;
CREATE SCHEMA IF NOT EXISTS operations;
CREATE SCHEMA IF NOT EXISTS private;

REVOKE ALL ON SCHEMA learning   FROM PUBLIC, anon, authenticated;
REVOKE ALL ON SCHEMA assessment FROM PUBLIC, anon, authenticated;
REVOKE ALL ON SCHEMA grading    FROM PUBLIC, anon, authenticated;
REVOKE ALL ON SCHEMA ai         FROM PUBLIC, anon, authenticated;
REVOKE ALL ON SCHEMA operations FROM PUBLIC, anon, authenticated;
REVOKE ALL ON SCHEMA private    FROM PUBLIC, anon, authenticated;

-- ============================================================
-- SHARED TRIGGER: updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION private.trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- USERS
-- Supabase Auth owns identity. This table stores app profile data.
-- id matches auth.users.id via handle_new_auth_user trigger (migration 003).
-- Auth fields removed: password_hash, email_verification_token,
--   password_reset_token, password_reset_expires, is_staff.
-- ============================================================
CREATE TABLE public.users (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    email           TEXT        NOT NULL UNIQUE,
    display_name    TEXT,
    first_name      TEXT,
    last_name       TEXT,
    student_id      TEXT        UNIQUE,
    bio             TEXT,
    avatar_url      TEXT,
    role            TEXT        NOT NULL DEFAULT 'STUDENT'
                                CHECK (role IN ('SUPERADMIN','TEACHER','STUDENT','TA')),
    locale          TEXT        NOT NULL DEFAULT 'UK'
                                CHECK (locale IN ('UK','EN')),
    theme           TEXT        NOT NULL DEFAULT 'light'
                                CHECK (theme IN ('light','dark')),
    is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
    is_deleted      BOOLEAN     NOT NULL DEFAULT FALSE,
    email_verified  BOOLEAN     NOT NULL DEFAULT FALSE,
    preferences     JSONB       NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email       ON public.users(email);
CREATE INDEX idx_users_role        ON public.users(role);
CREATE INDEX idx_users_student_id  ON public.users(student_id);
CREATE INDEX idx_users_is_active   ON public.users(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_users_is_deleted  ON public.users(is_deleted) WHERE is_deleted = FALSE;

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION private.trigger_set_updated_at();

-- ============================================================
-- USER_API_KEYS
-- Encrypted AI provider keys (e.g. Groq) per user.
-- ============================================================
CREATE TABLE ai.user_api_keys (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    provider      TEXT        NOT NULL DEFAULT 'GROQ',
    encrypted_key TEXT        NOT NULL,
    key_hint      TEXT        NOT NULL,
    is_active     BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_user_api_key_provider UNIQUE (user_id, provider)
);

CREATE INDEX idx_user_api_keys_user_id  ON ai.user_api_keys(user_id);
CREATE INDEX idx_user_api_keys_provider ON ai.user_api_keys(provider);

CREATE TRIGGER trg_user_api_keys_updated_at
    BEFORE UPDATE ON ai.user_api_keys
    FOR EACH ROW EXECUTE FUNCTION private.trigger_set_updated_at();

-- ============================================================
-- COURSES
-- qr_attendance_enabled folded in from migration 002.
-- Both status and visibility kept (different semantics).
-- ============================================================
CREATE TABLE learning.courses (
    id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    code                  TEXT        NOT NULL UNIQUE
                                      CHECK (length(trim(code)) > 0),
    title_uk              TEXT        NOT NULL
                                      CHECK (length(trim(title_uk)) > 0),
    title_en              TEXT        CHECK (title_en IS NULL OR length(trim(title_en)) > 0),
    description_uk        TEXT,
    description_en        TEXT,
    syllabus              TEXT,
    owner_id              UUID        NOT NULL REFERENCES public.users(id),
    visibility            TEXT        NOT NULL DEFAULT 'DRAFT'
                                      CHECK (visibility IN ('PUBLIC','PRIVATE','DRAFT')),
    thumbnail_url         TEXT,
    start_date            DATE,
    end_date              DATE,
    academic_year         TEXT,
    department_id         UUID,
    max_students          INTEGER,
    status                TEXT        NOT NULL DEFAULT 'DRAFT'
                                      CHECK (status IN ('DRAFT','PUBLISHED','ARCHIVED')),
    is_published          BOOLEAN     NOT NULL DEFAULT FALSE,
    theme_color           TEXT,
    qr_attendance_enabled BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_courses_code          ON learning.courses(code);
CREATE INDEX idx_courses_owner         ON learning.courses(owner_id);
CREATE INDEX idx_courses_published     ON learning.courses(is_published);
CREATE INDEX idx_courses_status        ON learning.courses(status);
CREATE INDEX idx_courses_academic_year ON learning.courses(academic_year);

CREATE TRIGGER trg_courses_updated_at
    BEFORE UPDATE ON learning.courses
    FOR EACH ROW EXECUTE FUNCTION private.trigger_set_updated_at();

-- ============================================================
-- COURSE_MEMBERS
-- ============================================================
CREATE TABLE learning.course_members (
    id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id         UUID        NOT NULL REFERENCES learning.courses(id) ON DELETE CASCADE,
    user_id           UUID        NOT NULL REFERENCES public.users(id),
    role_in_course    TEXT        NOT NULL CHECK (role_in_course IN ('TEACHER','TA','STUDENT')),
    added_by          UUID        REFERENCES public.users(id),
    enrollment_status TEXT        NOT NULL DEFAULT 'active'
                                  CHECK (enrollment_status IN ('active','dropped','completed')),
    completion_date   TIMESTAMPTZ,
    final_grade       DECIMAL(5,2),
    added_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_course_member UNIQUE (course_id, user_id)
);

CREATE INDEX idx_course_members_course_user ON learning.course_members(course_id, user_id);
CREATE INDEX idx_course_members_user        ON learning.course_members(user_id);
CREATE INDEX idx_course_members_role        ON learning.course_members(role_in_course);
CREATE INDEX idx_course_members_status      ON learning.course_members(enrollment_status);

CREATE TRIGGER trg_course_members_updated_at
    BEFORE UPDATE ON learning.course_members
    FOR EACH ROW EXECUTE FUNCTION private.trigger_set_updated_at();

-- ============================================================
-- MODULES
-- ============================================================
CREATE TABLE learning.modules (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id    UUID        NOT NULL REFERENCES learning.courses(id) ON DELETE CASCADE,
    title        TEXT        NOT NULL CHECK (length(trim(title)) > 0),
    description  TEXT,
    position     INTEGER     NOT NULL DEFAULT 0,
    content_meta JSONB       NOT NULL DEFAULT '{}',
    is_published BOOLEAN     NOT NULL DEFAULT FALSE,
    publish_date TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_modules_course_position ON learning.modules(course_id, position);
CREATE INDEX idx_modules_published       ON learning.modules(is_published);

CREATE TRIGGER trg_modules_updated_at
    BEFORE UPDATE ON learning.modules
    FOR EACH ROW EXECUTE FUNCTION private.trigger_set_updated_at();

-- ============================================================
-- TOPICS
-- ============================================================
CREATE TABLE learning.topics (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id   UUID        NOT NULL REFERENCES learning.modules(id) ON DELETE CASCADE,
    title       TEXT        NOT NULL,
    description TEXT,
    position    INTEGER     NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_topics_module_position ON learning.topics(module_id, position);

CREATE TRIGGER trg_topics_updated_at
    BEFORE UPDATE ON learning.topics
    FOR EACH ROW EXECUTE FUNCTION private.trigger_set_updated_at();

-- ============================================================
-- RESOURCES
-- ============================================================
CREATE TABLE learning.resources (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id       UUID        NOT NULL REFERENCES learning.modules(id) ON DELETE CASCADE,
    topic_id        UUID        REFERENCES learning.topics(id) ON DELETE SET NULL,
    title           TEXT        NOT NULL,
    description     TEXT,
    resource_type   TEXT        NOT NULL
                                CHECK (resource_type IN ('VIDEO','PDF','SLIDE','LINK','TEXT','CODE','OTHER')),
    file_url        TEXT,
    external_url    TEXT,
    file_size       BIGINT,
    mime_type       TEXT,
    position        INTEGER     NOT NULL DEFAULT 0,
    is_downloadable BOOLEAN     NOT NULL DEFAULT TRUE,
    text_content    TEXT,
    metadata        JSONB       NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_resources_module   ON learning.resources(module_id);
CREATE INDEX idx_resources_topic    ON learning.resources(topic_id);
CREATE INDEX idx_resources_type     ON learning.resources(resource_type);
CREATE INDEX idx_resources_position ON learning.resources(module_id, position);

CREATE TRIGGER trg_resources_updated_at
    BEFORE UPDATE ON learning.resources
    FOR EACH ROW EXECUTE FUNCTION private.trigger_set_updated_at();

-- ============================================================
-- LESSONS
-- ============================================================
CREATE TABLE learning.lessons (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id       UUID        NOT NULL REFERENCES learning.modules(id) ON DELETE CASCADE,
    title           TEXT        NOT NULL,
    summary         TEXT,
    position        INTEGER     NOT NULL DEFAULT 0,
    content_meta    JSONB       NOT NULL DEFAULT '{}',
    is_ai_generated BOOLEAN     NOT NULL DEFAULT FALSE,
    is_published    BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_lessons_module_position ON learning.lessons(module_id, position);
CREATE INDEX idx_lessons_published       ON learning.lessons(is_published);

CREATE TRIGGER trg_lessons_updated_at
    BEFORE UPDATE ON learning.lessons
    FOR EACH ROW EXECUTE FUNCTION private.trigger_set_updated_at();

-- ============================================================
-- LESSON_CONTENT_BLOCKS
-- ============================================================
CREATE TABLE learning.lesson_content_blocks (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id       UUID        NOT NULL REFERENCES learning.lessons(id) ON DELETE CASCADE,
    block_type      TEXT        NOT NULL CHECK (block_type IN ('TEXT','QUIZ')),
    title           TEXT,
    content         TEXT        NOT NULL,
    content_format  TEXT        NOT NULL DEFAULT 'MARKDOWN'
                                CHECK (content_format IN ('PLAIN','MARKDOWN','HTML','RICH')),
    position        INTEGER     NOT NULL DEFAULT 0,
    metadata        JSONB       NOT NULL DEFAULT '{}',
    is_ai_generated BOOLEAN     NOT NULL DEFAULT FALSE,
    questions       JSONB       NOT NULL DEFAULT '[]',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_lesson_content_blocks_lesson_pos ON learning.lesson_content_blocks(lesson_id, position);
CREATE INDEX idx_lesson_content_blocks_type       ON learning.lesson_content_blocks(block_type);

CREATE TRIGGER trg_lesson_content_blocks_updated_at
    BEFORE UPDATE ON learning.lesson_content_blocks
    FOR EACH ROW EXECUTE FUNCTION private.trigger_set_updated_at();

-- ============================================================
-- LESSON_OBJECTIVES
-- ============================================================
CREATE TABLE learning.lesson_objectives (
    id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id      UUID        NOT NULL REFERENCES learning.lessons(id) ON DELETE CASCADE,
    objective_text TEXT        NOT NULL,
    position       INTEGER     NOT NULL DEFAULT 0,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_lesson_objectives_lesson_pos ON learning.lesson_objectives(lesson_id, position);

-- ============================================================
-- QUIZZES
-- Added FK: course_id → learning.courses, created_by → public.users
-- ============================================================
CREATE TABLE assessment.quizzes (
    id                        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id                 UUID        NOT NULL REFERENCES learning.courses(id) ON DELETE CASCADE,
    title                     TEXT        NOT NULL CHECK (length(trim(title)) > 0),
    description               TEXT,
    time_limit                INTEGER,
    attempts_allowed          INTEGER     DEFAULT 1,
    shuffle_questions         BOOLEAN     NOT NULL DEFAULT FALSE,
    shuffle_answers           BOOLEAN     NOT NULL DEFAULT FALSE,
    show_correct_answers      BOOLEAN     NOT NULL DEFAULT TRUE,
    show_correct_answers_at   TIMESTAMPTZ,
    pass_percentage           DECIMAL(5,2) DEFAULT 60.00,
    timer_enabled             BOOLEAN     NOT NULL DEFAULT FALSE,
    attempt_limit_enabled     BOOLEAN     NOT NULL DEFAULT FALSE,
    attempt_score_policy      TEXT        NOT NULL DEFAULT 'HIGHEST'
                                          CHECK (attempt_score_policy IN ('HIGHEST','LATEST','FIRST')),
    secure_session_enabled    BOOLEAN     NOT NULL DEFAULT FALSE,
    secure_require_fullscreen BOOLEAN     NOT NULL DEFAULT TRUE,
    created_by                UUID        NOT NULL REFERENCES public.users(id),
    created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_quizzes_course     ON assessment.quizzes(course_id);
CREATE INDEX idx_quizzes_created_by ON assessment.quizzes(created_by);

CREATE TRIGGER trg_quizzes_updated_at
    BEFORE UPDATE ON assessment.quizzes
    FOR EACH ROW EXECUTE FUNCTION private.trigger_set_updated_at();

-- ============================================================
-- QUESTION_BANK
-- Added FK: course_id → learning.courses, created_by → public.users
-- ============================================================
CREATE TABLE assessment.question_bank (
    id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id      UUID        REFERENCES learning.courses(id) ON DELETE SET NULL,
    question_type  TEXT        NOT NULL,
    stem           TEXT        NOT NULL CHECK (length(trim(stem)) > 0),
    options        JSONB       NOT NULL DEFAULT '{}',
    correct_answer JSONB       NOT NULL DEFAULT '{}',
    explanation    TEXT,
    points         DECIMAL(6,2) NOT NULL DEFAULT 1.00,
    metadata       JSONB       NOT NULL DEFAULT '{}',
    topic          TEXT,
    difficulty     TEXT        CHECK (difficulty IN ('EASY','MEDIUM','HARD') OR difficulty IS NULL),
    tags           JSONB       NOT NULL DEFAULT '[]',
    is_archived    BOOLEAN     NOT NULL DEFAULT FALSE,
    image_url      TEXT,
    created_by     UUID        NOT NULL REFERENCES public.users(id),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_question_bank_course     ON assessment.question_bank(course_id);
CREATE INDEX idx_question_bank_type       ON assessment.question_bank(question_type);
CREATE INDEX idx_question_bank_created_by ON assessment.question_bank(created_by);
CREATE INDEX idx_question_bank_topic      ON assessment.question_bank(topic);
CREATE INDEX idx_question_bank_difficulty ON assessment.question_bank(difficulty);

CREATE TRIGGER trg_question_bank_updated_at
    BEFORE UPDATE ON assessment.question_bank
    FOR EACH ROW EXECUTE FUNCTION private.trigger_set_updated_at();

-- ============================================================
-- QUESTION_BANK_VERSIONS
-- ============================================================
CREATE TABLE assessment.question_bank_versions (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id      UUID        NOT NULL REFERENCES assessment.question_bank(id) ON DELETE CASCADE,
    version_number   INTEGER     NOT NULL,
    prompt_doc_json  JSONB       NOT NULL,
    payload_jsonb    JSONB       NOT NULL DEFAULT '{}',
    answer_key_jsonb JSONB       NOT NULL DEFAULT '{}',
    created_by       UUID        NOT NULL REFERENCES public.users(id),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_question_version UNIQUE (question_id, version_number)
);

CREATE INDEX idx_question_bank_versions_question ON assessment.question_bank_versions(question_id, version_number DESC);

-- ============================================================
-- QUIZ_SECTIONS
-- ============================================================
CREATE TABLE assessment.quiz_sections (
    id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id        UUID        NOT NULL REFERENCES assessment.quizzes(id) ON DELETE CASCADE,
    title          TEXT        NOT NULL,
    position       INTEGER     NOT NULL DEFAULT 0,
    question_count INTEGER     NOT NULL DEFAULT 0,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_quiz_sections_quiz_pos ON assessment.quiz_sections(quiz_id, position);

-- ============================================================
-- QUIZ_SECTION_RULES
-- ============================================================
CREATE TABLE assessment.quiz_section_rules (
    id            UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    section_id    UUID    NOT NULL REFERENCES assessment.quiz_sections(id) ON DELETE CASCADE,
    question_type TEXT,
    difficulty    TEXT,
    tag           TEXT,
    quota         INTEGER NOT NULL DEFAULT 1,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_quiz_section_rule_has_selector
        CHECK (question_type IS NOT NULL OR difficulty IS NOT NULL OR tag IS NOT NULL)
);

CREATE INDEX idx_quiz_section_rules_section ON assessment.quiz_section_rules(section_id);

-- ============================================================
-- QUIZ_QUESTIONS
-- ============================================================
CREATE TABLE assessment.quiz_questions (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id         UUID        NOT NULL REFERENCES assessment.quizzes(id) ON DELETE CASCADE,
    question_id     UUID        NOT NULL REFERENCES assessment.question_bank(id) ON DELETE CASCADE,
    position        INTEGER     NOT NULL DEFAULT 0,
    points_override DECIMAL(6,2),
    CONSTRAINT uq_quiz_question UNIQUE (quiz_id, question_id)
);

CREATE INDEX idx_quiz_questions_quiz     ON assessment.quiz_questions(quiz_id);
CREATE INDEX idx_quiz_questions_position ON assessment.quiz_questions(quiz_id, position);

-- ============================================================
-- QUIZ_ATTEMPTS
-- Added FK: user_id → public.users
-- ============================================================
CREATE TABLE assessment.quiz_attempts (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id             UUID        NOT NULL REFERENCES assessment.quizzes(id) ON DELETE CASCADE,
    user_id             UUID        NOT NULL REFERENCES public.users(id),
    attempt_number      INTEGER     NOT NULL DEFAULT 1,
    started_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    submitted_at        TIMESTAMPTZ,
    answers             JSONB       NOT NULL DEFAULT '{}',
    auto_score          DECIMAL(6,2),
    manual_score        DECIMAL(6,2),
    final_score         DECIMAL(6,2),
    graded_by           UUID        REFERENCES public.users(id),
    graded_at           TIMESTAMPTZ,
    feedback            TEXT,
    ip_address          INET,
    browser_fingerprint TEXT,
    proctoring_data     JSONB       NOT NULL DEFAULT '{}',
    CONSTRAINT uq_quiz_user_attempt UNIQUE (quiz_id, user_id, attempt_number)
);

CREATE INDEX idx_quiz_attempts_quiz    ON assessment.quiz_attempts(quiz_id);
CREATE INDEX idx_quiz_attempts_user    ON assessment.quiz_attempts(user_id);
CREATE INDEX idx_quiz_attempts_started ON assessment.quiz_attempts(started_at);

-- ============================================================
-- QUIZ_ATTEMPT_QUESTIONS
-- ============================================================
CREATE TABLE assessment.quiz_attempt_questions (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id          UUID        NOT NULL REFERENCES assessment.quiz_attempts(id) ON DELETE CASCADE,
    question_id         UUID        NOT NULL REFERENCES assessment.question_bank(id),
    question_version_id UUID        REFERENCES assessment.question_bank_versions(id),
    position            INTEGER     NOT NULL DEFAULT 0,
    prompt_snapshot     JSONB       NOT NULL,
    payload_snapshot    JSONB       NOT NULL DEFAULT '{}',
    answer_key_snapshot JSONB       NOT NULL DEFAULT '{}',
    points              DECIMAL(6,2) NOT NULL DEFAULT 1.00,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_attempt_question_pos UNIQUE (attempt_id, position)
);

CREATE INDEX idx_quiz_attempt_questions_attempt  ON assessment.quiz_attempt_questions(attempt_id, position);
CREATE INDEX idx_quiz_attempt_questions_question ON assessment.quiz_attempt_questions(question_id);

-- ============================================================
-- QUIZ_RESPONSES
-- ============================================================
CREATE TABLE assessment.quiz_responses (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id          UUID        NOT NULL REFERENCES assessment.quiz_attempts(id) ON DELETE CASCADE,
    attempt_question_id UUID        NOT NULL REFERENCES assessment.quiz_attempt_questions(id) ON DELETE CASCADE,
    response_jsonb      JSONB       NOT NULL DEFAULT '{}',
    is_correct          BOOLEAN,
    score_awarded       DECIMAL(6,2),
    feedback            TEXT,
    graded_at           TIMESTAMPTZ,
    CONSTRAINT uq_quiz_response_attempt_question UNIQUE (attempt_question_id)
);

CREATE INDEX idx_quiz_responses_attempt ON assessment.quiz_responses(attempt_id);

-- ============================================================
-- ASSIGNMENTS
-- Fixed: Added FK course_id → learning.courses, module_id → learning.modules.
-- Fixed: assignment_type CHECK includes VIRTUAL_LAB.
-- vpl_config folded in from migration 003.
-- ============================================================
CREATE TABLE assessment.assignments (
    id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id            UUID        NOT NULL REFERENCES learning.courses(id) ON DELETE CASCADE,
    module_id            UUID        REFERENCES learning.modules(id) ON DELETE SET NULL,
    topic_id             UUID        REFERENCES learning.topics(id) ON DELETE SET NULL,
    category_id          UUID,
    position             INTEGER     NOT NULL DEFAULT 0,
    assignment_type      TEXT        NOT NULL
                                     CHECK (assignment_type IN (
                                         'QUIZ','FILE_UPLOAD','TEXT','CODE','URL',
                                         'MANUAL_GRADE','EXTERNAL','VIRTUAL_LAB','SEMINAR'
                                     )),
    title                TEXT        NOT NULL CHECK (length(trim(title)) > 0),
    description          TEXT        NOT NULL CHECK (length(trim(description)) > 0),
    description_format   TEXT        NOT NULL DEFAULT 'MARKDOWN'
                                     CHECK (description_format IN ('PLAIN','MARKDOWN','HTML','RICH')),
    instructions         TEXT,
    instructions_format  TEXT        NOT NULL DEFAULT 'MARKDOWN'
                                     CHECK (instructions_format IN ('PLAIN','MARKDOWN','HTML','RICH')),
    resources            JSONB       NOT NULL DEFAULT '[]',
    starter_code         TEXT,
    solution_code        TEXT,
    programming_language TEXT,
    auto_grading_enabled BOOLEAN     NOT NULL DEFAULT FALSE,
    test_cases           JSONB       NOT NULL DEFAULT '[]',
    vpl_config           JSONB,
    max_points           DECIMAL(6,2) NOT NULL,
    due_date             TIMESTAMPTZ,
    available_from       TIMESTAMPTZ,
    available_until      TIMESTAMPTZ,
    allow_late_submission BOOLEAN    NOT NULL DEFAULT FALSE,
    late_penalty_percent DECIMAL(5,2) NOT NULL DEFAULT 0,
    submission_types     JSONB       NOT NULL DEFAULT '[]',
    allowed_file_types   JSONB       NOT NULL DEFAULT '[]',
    max_file_size        BIGINT      NOT NULL DEFAULT 10485760,
    max_files            INTEGER     NOT NULL DEFAULT 5,
    quiz_id              UUID        REFERENCES assessment.quizzes(id) ON DELETE SET NULL,
    external_tool_url    TEXT,
    external_tool_config JSONB       NOT NULL DEFAULT '{}',
    grade_anonymously    BOOLEAN     NOT NULL DEFAULT FALSE,
    peer_review_enabled  BOOLEAN     NOT NULL DEFAULT FALSE,
    peer_reviews_required INTEGER    NOT NULL DEFAULT 0,
    estimated_duration   INTEGER,
    is_template          BOOLEAN     NOT NULL DEFAULT FALSE,
    is_archived          BOOLEAN     NOT NULL DEFAULT FALSE,
    is_published         BOOLEAN     NOT NULL DEFAULT FALSE,
    original_assignment_id UUID      REFERENCES assessment.assignments(id) ON DELETE SET NULL,
    created_by           UUID        NOT NULL REFERENCES public.users(id),
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_assignments_course      ON assessment.assignments(course_id);
CREATE INDEX idx_assignments_module      ON assessment.assignments(module_id);
CREATE INDEX idx_assignments_type        ON assessment.assignments(assignment_type);
CREATE INDEX idx_assignments_published   ON assessment.assignments(is_published);
CREATE INDEX idx_assignments_due_date    ON assessment.assignments(due_date);
CREATE INDEX idx_assignments_created_by  ON assessment.assignments(created_by);
CREATE INDEX idx_assignments_topic       ON assessment.assignments(topic_id);

CREATE TRIGGER trg_assignments_updated_at
    BEFORE UPDATE ON assessment.assignments
    FOR EACH ROW EXECUTE FUNCTION private.trigger_set_updated_at();

-- ============================================================
-- VPL_TEST_CASES
-- ============================================================
CREATE TABLE assessment.vpl_test_cases (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id   UUID        NOT NULL REFERENCES assessment.assignments(id) ON DELETE CASCADE,
    name            TEXT        NOT NULL,
    input           TEXT,
    expected_output TEXT,
    check_mode      TEXT        NOT NULL DEFAULT 'TRIM'
                                CHECK (check_mode IN ('EXACT','TRIM','CONTAINS','REGEX')),
    test_code       TEXT,
    hidden          BOOLEAN     NOT NULL DEFAULT FALSE,
    required        BOOLEAN     NOT NULL DEFAULT FALSE,
    weight          INTEGER     NOT NULL DEFAULT 1,
    position        INTEGER     NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_vpl_test_cases_assignment ON assessment.vpl_test_cases(assignment_id, position);

-- ============================================================
-- PEER_REVIEWS
-- FIXED: Was BIGSERIAL/BIGINT, now UUID throughout.
-- ============================================================
CREATE TABLE assessment.peer_reviews (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id    UUID        NOT NULL REFERENCES assessment.assignments(id) ON DELETE CASCADE,
    reviewer_user_id UUID        NOT NULL REFERENCES public.users(id),
    reviewee_user_id UUID        NOT NULL REFERENCES public.users(id),
    submission_id    UUID        NOT NULL,
    is_anonymous     BOOLEAN     NOT NULL DEFAULT TRUE,
    status           TEXT        NOT NULL DEFAULT 'PENDING'
                                 CHECK (status IN ('PENDING','IN_PROGRESS','COMPLETED','OVERDUE')),
    overall_score    DECIMAL(6,2),
    overall_feedback TEXT,
    submitted_at     TIMESTAMPTZ,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_peer_reviews_assignment  ON assessment.peer_reviews(assignment_id);
CREATE INDEX idx_peer_reviews_reviewer    ON assessment.peer_reviews(reviewer_user_id);
CREATE INDEX idx_peer_reviews_reviewee    ON assessment.peer_reviews(reviewee_user_id);
CREATE INDEX idx_peer_reviews_submission  ON assessment.peer_reviews(submission_id);
CREATE INDEX idx_peer_reviews_status      ON assessment.peer_reviews(status);

CREATE TRIGGER trg_peer_reviews_updated_at
    BEFORE UPDATE ON assessment.peer_reviews
    FOR EACH ROW EXECUTE FUNCTION private.trigger_set_updated_at();

-- ============================================================
-- SUBMISSIONS
-- FIXED: Added FK assignment_id → assessment.assignments, user_id → public.users.
-- auto_grade_result kept as cached summary JSONB.
-- ============================================================
CREATE TABLE assessment.submissions (
    id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id        UUID        NOT NULL REFERENCES assessment.assignments(id) ON DELETE CASCADE,
    user_id              UUID        NOT NULL REFERENCES public.users(id),
    student_name         TEXT,
    student_email        TEXT,
    status               TEXT        NOT NULL DEFAULT 'DRAFT'
                                     CHECK (status IN (
                                         'DRAFT','SUBMITTED','LATE','GRADED',
                                         'RETURNED','PUBLISHED','IN_REVIEW'
                                     )),
    text_answer          TEXT,
    submission_url       TEXT,
    programming_language TEXT,
    form_data            JSONB,
    auto_grade_result    JSONB,
    grade                DECIMAL(6,2),
    raw_score            DECIMAL(6,2),
    draft_grade          DECIMAL(6,2),
    draft_feedback       TEXT,
    published_grade      DECIMAL(6,2),
    published_feedback   TEXT,
    published_at         TIMESTAMPTZ,
    published_by         UUID        REFERENCES public.users(id),
    feedback             TEXT,
    is_late              BOOLEAN     NOT NULL DEFAULT FALSE,
    days_late            INTEGER     NOT NULL DEFAULT 0,
    submitted_at         TIMESTAMPTZ,
    graded_at            TIMESTAMPTZ,
    grader_id            UUID        REFERENCES public.users(id),
    review_started_at    TIMESTAMPTZ,
    last_resubmitted_at  TIMESTAMPTZ,
    submission_version   INTEGER     NOT NULL DEFAULT 1,
    version              BIGINT      NOT NULL DEFAULT 0,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_submission_assignment_user UNIQUE (assignment_id, user_id)
);

CREATE INDEX idx_submissions_assignment        ON assessment.submissions(assignment_id);
CREATE INDEX idx_submissions_user              ON assessment.submissions(user_id);
CREATE INDEX idx_submissions_status            ON assessment.submissions(status);
CREATE INDEX idx_submissions_submitted_at      ON assessment.submissions(submitted_at);
CREATE INDEX idx_submissions_assignment_status ON assessment.submissions(assignment_id, status, updated_at DESC);

CREATE TRIGGER trg_submissions_updated_at
    BEFORE UPDATE ON assessment.submissions
    FOR EACH ROW EXECUTE FUNCTION private.trigger_set_updated_at();

ALTER TABLE assessment.peer_reviews
    ADD CONSTRAINT fk_peer_reviews_submission
    FOREIGN KEY (submission_id) REFERENCES assessment.submissions(id) ON DELETE CASCADE;

-- ============================================================
-- SUBMISSION_FILES
-- ============================================================
CREATE TABLE assessment.submission_files (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID        NOT NULL REFERENCES assessment.submissions(id) ON DELETE CASCADE,
    filename      TEXT        NOT NULL,
    file_url      TEXT        NOT NULL,
    storage_path  TEXT        NOT NULL,
    content_type  TEXT,
    file_size     BIGINT      NOT NULL,
    uploaded_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_submission_files_submission ON assessment.submission_files(submission_id);

-- ============================================================
-- SUBMISSION_COMMENTS
-- Added FK: author_id → public.users
-- ============================================================
CREATE TABLE assessment.submission_comments (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID        NOT NULL REFERENCES assessment.submissions(id) ON DELETE CASCADE,
    author_id     UUID        NOT NULL REFERENCES public.users(id),
    author_name   TEXT,
    author_email  TEXT,
    comment       TEXT        NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_submission_comments_submission ON assessment.submission_comments(submission_id);
CREATE INDEX idx_submission_comments_created    ON assessment.submission_comments(created_at);

-- ============================================================
-- SUBMISSION_GRADE_AUDIT
-- ============================================================
CREATE TABLE grading.submission_grade_audit (
    id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id      UUID        NOT NULL REFERENCES assessment.submissions(id) ON DELETE CASCADE,
    changed_by         UUID        NOT NULL REFERENCES public.users(id),
    changed_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    change_type        TEXT        NOT NULL,
    prev_raw_score     DECIMAL(6,2),
    new_raw_score      DECIMAL(6,2),
    prev_final_score   DECIMAL(6,2),
    new_final_score    DECIMAL(6,2),
    prev_feedback      TEXT,
    new_feedback       TEXT,
    submission_version INTEGER     NOT NULL DEFAULT 1,
    entity_version     BIGINT      NOT NULL DEFAULT 0
);

CREATE INDEX idx_submission_grade_audit_submission
    ON grading.submission_grade_audit(submission_id, changed_at DESC);

-- ============================================================
-- AI_FEEDBACK_ENTRIES
-- ============================================================
CREATE TABLE assessment.ai_feedback_entries (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id   UUID        NOT NULL REFERENCES assessment.assignments(id) ON DELETE CASCADE,
    submission_id   UUID        NOT NULL REFERENCES assessment.submissions(id) ON DELETE CASCADE,
    attempt_number  INTEGER     NOT NULL DEFAULT 1,
    raw_feedback    TEXT        NOT NULL,
    feedback_format TEXT        NOT NULL DEFAULT 'MARKDOWN'
                                CHECK (feedback_format IN ('PLAIN','MARKDOWN','HTML','RICH')),
    model_name      TEXT        NOT NULL,
    model_version   TEXT,
    model_hash      TEXT,
    model_metadata  JSONB       NOT NULL DEFAULT '{}',
    created_by      UUID        REFERENCES public.users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ai_feedback_entries_assignment  ON assessment.ai_feedback_entries(assignment_id);
CREATE INDEX idx_ai_feedback_entries_submission  ON assessment.ai_feedback_entries(submission_id);
CREATE INDEX idx_ai_feedback_entries_created_at  ON assessment.ai_feedback_entries(created_at);

-- ============================================================
-- REVISION_FEEDBACK_THREADS
-- Added FK: submission_id → assessment.submissions, student_id → public.users
-- ============================================================
CREATE TABLE assessment.revision_feedback_threads (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID        NOT NULL REFERENCES assessment.assignments(id) ON DELETE CASCADE,
    submission_id UUID        NOT NULL REFERENCES assessment.submissions(id) ON DELETE CASCADE,
    student_id    UUID        NOT NULL REFERENCES public.users(id),
    status        TEXT        NOT NULL DEFAULT 'OPEN'
                              CHECK (status IN ('OPEN','RESOLVED','CLOSED')),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_revision_threads_assignment ON assessment.revision_feedback_threads(assignment_id);
CREATE INDEX idx_revision_threads_submission ON assessment.revision_feedback_threads(submission_id);
CREATE INDEX idx_revision_threads_student    ON assessment.revision_feedback_threads(student_id);

CREATE TRIGGER trg_revision_feedback_threads_updated_at
    BEFORE UPDATE ON assessment.revision_feedback_threads
    FOR EACH ROW EXECUTE FUNCTION private.trigger_set_updated_at();

-- ============================================================
-- REVISION_FEEDBACK_MESSAGES
-- ============================================================
CREATE TABLE assessment.revision_feedback_messages (
    id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id      UUID        NOT NULL REFERENCES assessment.revision_feedback_threads(id) ON DELETE CASCADE,
    sender_role    TEXT        NOT NULL CHECK (sender_role IN ('STUDENT','TEACHER','AI','TA')),
    message_text   TEXT        NOT NULL,
    message_format TEXT        NOT NULL DEFAULT 'MARKDOWN'
                               CHECK (message_format IN ('PLAIN','MARKDOWN','HTML','RICH')),
    model_name     TEXT,
    model_version  TEXT,
    model_hash     TEXT,
    model_metadata JSONB       NOT NULL DEFAULT '{}',
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_revision_messages_thread     ON assessment.revision_feedback_messages(thread_id);
CREATE INDEX idx_revision_messages_created_at ON assessment.revision_feedback_messages(created_at);

-- ============================================================
-- GRADEBOOK_CATEGORIES
-- Added FK: course_id → learning.courses
-- ============================================================
CREATE TABLE grading.gradebook_categories (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id   UUID        NOT NULL REFERENCES learning.courses(id) ON DELETE CASCADE,
    name        TEXT        NOT NULL,
    description TEXT,
    weight      DECIMAL(5,2) NOT NULL DEFAULT 0,
    drop_lowest INTEGER     NOT NULL DEFAULT 0,
    position    INTEGER     NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_gradebook_category_course_name UNIQUE (course_id, name)
);

CREATE INDEX idx_gradebook_categories_course ON grading.gradebook_categories(course_id);

CREATE TRIGGER trg_gradebook_categories_updated_at
    BEFORE UPDATE ON grading.gradebook_categories
    FOR EACH ROW EXECUTE FUNCTION private.trigger_set_updated_at();

-- ============================================================
-- GRADEBOOK_ENTRIES
-- FIXED: Added FKs course_id → learning.courses, student_id → public.users,
--   assignment_id → assessment.assignments, submission_id → assessment.submissions.
-- ============================================================
CREATE TABLE grading.gradebook_entries (
    id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id      UUID        NOT NULL REFERENCES learning.courses(id) ON DELETE CASCADE,
    student_id     UUID        NOT NULL REFERENCES public.users(id),
    assignment_id  UUID        REFERENCES assessment.assignments(id) ON DELETE SET NULL,
    submission_id  UUID        REFERENCES assessment.submissions(id) ON DELETE SET NULL,
    score          DECIMAL(6,2),
    max_score      DECIMAL(6,2) NOT NULL,
    percentage     DECIMAL(5,2),
    status         TEXT        NOT NULL DEFAULT 'NOT_SUBMITTED'
                               CHECK (status IN (
                                   'NOT_SUBMITTED','SUBMITTED','GRADED','LATE','EXCUSED','MISSING'
                               )),
    is_late        BOOLEAN     NOT NULL DEFAULT FALSE,
    is_excused     BOOLEAN     NOT NULL DEFAULT FALSE,
    notes          TEXT,
    override_score DECIMAL(6,2),
    override_by    UUID        REFERENCES public.users(id),
    override_at    TIMESTAMPTZ,
    override_reason TEXT,
    graded_at      TIMESTAMPTZ,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_gradebook_entry_course_student_assignment
        UNIQUE (course_id, student_id, assignment_id)
);

CREATE INDEX idx_gradebook_entries_course_student ON grading.gradebook_entries(course_id, student_id);
CREATE INDEX idx_gradebook_entries_status         ON grading.gradebook_entries(status);
CREATE INDEX idx_gradebook_entries_graded_at      ON grading.gradebook_entries(graded_at);

CREATE TRIGGER trg_gradebook_entries_updated_at
    BEFORE UPDATE ON grading.gradebook_entries
    FOR EACH ROW EXECUTE FUNCTION private.trigger_set_updated_at();

-- ============================================================
-- GRADE_HISTORIES
-- ============================================================
CREATE TABLE grading.grade_histories (
    id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    gradebook_entry_id UUID        NOT NULL REFERENCES grading.gradebook_entries(id) ON DELETE CASCADE,
    old_score          DECIMAL(6,2),
    new_score          DECIMAL(6,2),
    changed_by         UUID        REFERENCES public.users(id),
    change_reason      TEXT,
    changed_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_grade_histories_entry      ON grading.grade_histories(gradebook_entry_id);
CREATE INDEX idx_grade_histories_changed_at ON grading.grade_histories(changed_at);

-- ============================================================
-- COURSE_GRADE_SUMMARIES
-- FIXED: Added FKs course_id → learning.courses, student_id → public.users
-- ============================================================
CREATE TABLE grading.course_grade_summaries (
    id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id             UUID        NOT NULL REFERENCES learning.courses(id) ON DELETE CASCADE,
    student_id            UUID        NOT NULL REFERENCES public.users(id),
    total_points_earned   DECIMAL(8,2) NOT NULL DEFAULT 0,
    total_points_possible DECIMAL(8,2) NOT NULL DEFAULT 0,
    current_grade         DECIMAL(5,2),
    letter_grade          TEXT,
    category_grades       JSONB       NOT NULL DEFAULT '{}',
    assignments_completed INTEGER     NOT NULL DEFAULT 0,
    assignments_total     INTEGER     NOT NULL DEFAULT 0,
    final_grade           DECIMAL(5,2),
    is_final              BOOLEAN     NOT NULL DEFAULT FALSE,
    last_calculated       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_course_grade_summary UNIQUE (course_id, student_id)
);

CREATE INDEX idx_course_grade_summaries_course_student ON grading.course_grade_summaries(course_id, student_id);

-- ============================================================
-- MODULE_PAGES
-- ============================================================
CREATE TABLE learning.module_pages (
    id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id               UUID        NOT NULL REFERENCES learning.modules(id) ON DELETE CASCADE,
    parent_page_id          UUID        REFERENCES learning.module_pages(id) ON DELETE CASCADE,
    title                   TEXT        NOT NULL,
    slug                    TEXT        NOT NULL,
    position                INTEGER     NOT NULL DEFAULT 0,
    is_published            BOOLEAN     NOT NULL DEFAULT FALSE,
    has_unpublished_changes BOOLEAN     NOT NULL DEFAULT FALSE,
    created_by              UUID        NOT NULL REFERENCES public.users(id),
    updated_by              UUID        NOT NULL REFERENCES public.users(id),
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_module_page_slug UNIQUE (module_id, slug)
);

CREATE INDEX idx_module_pages_module_parent_pos ON learning.module_pages(module_id, parent_page_id, position);
CREATE INDEX idx_module_pages_module_published  ON learning.module_pages(module_id, is_published);

CREATE TRIGGER trg_module_pages_updated_at
    BEFORE UPDATE ON learning.module_pages
    FOR EACH ROW EXECUTE FUNCTION private.trigger_set_updated_at();

-- ============================================================
-- PAGE_DOCUMENTS
-- ============================================================
CREATE TABLE learning.page_documents (
    page_id        UUID        PRIMARY KEY REFERENCES learning.module_pages(id) ON DELETE CASCADE,
    doc_json       JSONB       NOT NULL,
    schema_version INTEGER     NOT NULL DEFAULT 1,
    doc_hash       TEXT        NOT NULL,
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PAGE_PUBLISHED_DOCUMENTS
-- ============================================================
CREATE TABLE learning.page_published_documents (
    page_id        UUID        PRIMARY KEY REFERENCES learning.module_pages(id) ON DELETE CASCADE,
    doc_json       JSONB       NOT NULL,
    schema_version INTEGER     NOT NULL DEFAULT 1,
    doc_hash       TEXT        NOT NULL,
    published_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    published_by   UUID        NOT NULL REFERENCES public.users(id)
);

-- ============================================================
-- ASSIGNMENT_TEMPLATE_DOCUMENTS
-- ============================================================
CREATE TABLE assessment.assignment_template_documents (
    assignment_id  UUID        PRIMARY KEY REFERENCES assessment.assignments(id) ON DELETE CASCADE,
    doc_json       JSONB       NOT NULL,
    schema_version INTEGER     NOT NULL DEFAULT 1,
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by     UUID        NOT NULL REFERENCES public.users(id)
);

-- ============================================================
-- SUBMISSION_DOCUMENTS
-- ============================================================
CREATE TABLE assessment.submission_documents (
    submission_id  UUID        PRIMARY KEY REFERENCES assessment.submissions(id) ON DELETE CASCADE,
    doc_json       JSONB       NOT NULL,
    schema_version INTEGER     NOT NULL DEFAULT 1,
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PAGE_CITATIONS
-- ============================================================
CREATE TABLE learning.page_citations (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    page_id       UUID        NOT NULL REFERENCES learning.module_pages(id) ON DELETE CASCADE,
    block_id      TEXT,
    author        TEXT,
    title         TEXT,
    year          INTEGER,
    url           TEXT,
    citation_type TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_page_citations_page ON learning.page_citations(page_id);

-- ============================================================
-- PAGE_FOOTNOTES
-- ============================================================
CREATE TABLE learning.page_footnotes (
    id           UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    page_id      UUID    NOT NULL REFERENCES learning.module_pages(id) ON DELETE CASCADE,
    footnote_key TEXT    NOT NULL,
    ordinal      INTEGER NOT NULL,
    content_json JSONB   NOT NULL DEFAULT '{}',
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_page_footnote_key UNIQUE (page_id, footnote_key)
);

CREATE INDEX idx_page_footnotes_page    ON learning.page_footnotes(page_id);
CREATE INDEX idx_page_footnotes_ordinal ON learning.page_footnotes(page_id, ordinal);

-- ============================================================
-- EDITOR_MEDIA
-- ============================================================
CREATE TABLE learning.editor_media (
    id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    stored_filename   TEXT        NOT NULL UNIQUE,
    original_filename TEXT        NOT NULL,
    storage_path      TEXT        NOT NULL,
    content_type      TEXT        NOT NULL,
    file_size         BIGINT      NOT NULL,
    uploaded_by       UUID        NOT NULL REFERENCES public.users(id),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_editor_media_uploaded_by ON learning.editor_media(uploaded_by, created_at DESC);

-- ============================================================
-- ANNOUNCEMENTS
-- ============================================================
CREATE TABLE learning.announcements (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id  UUID        NOT NULL REFERENCES learning.courses(id) ON DELETE CASCADE,
    title      TEXT        NOT NULL,
    content    TEXT        NOT NULL,
    is_pinned  BOOLEAN     NOT NULL DEFAULT FALSE,
    created_by UUID        NOT NULL REFERENCES public.users(id),
    updated_by UUID        REFERENCES public.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_announcements_course_order
    ON learning.announcements(course_id, is_pinned, created_at DESC);

CREATE TRIGGER trg_announcements_updated_at
    BEFORE UPDATE ON learning.announcements
    FOR EACH ROW EXECUTE FUNCTION private.trigger_set_updated_at();

-- ============================================================
-- SIS_IMPORT_RUNS
-- ============================================================
CREATE TABLE operations.sis_import_runs (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    semester_code       TEXT        NOT NULL,
    status              TEXT        NOT NULL,
    requested_by        UUID        NOT NULL REFERENCES public.users(id),
    valid               BOOLEAN     NOT NULL DEFAULT FALSE,
    preview_summary     JSONB       NOT NULL DEFAULT '{}',
    row_errors          JSONB       NOT NULL DEFAULT '[]',
    warnings            JSONB       NOT NULL DEFAULT '[]',
    change_set          JSONB       NOT NULL DEFAULT '[]',
    apply_report        JSONB       NOT NULL DEFAULT '{}',
    applied_at          TIMESTAMPTZ,
    rollback_expires_at TIMESTAMPTZ,
    rolled_back_at      TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sis_import_runs_status     ON operations.sis_import_runs(status);
CREATE INDEX idx_sis_import_runs_semester   ON operations.sis_import_runs(semester_code);
CREATE INDEX idx_sis_import_runs_created_at ON operations.sis_import_runs(created_at);

CREATE TRIGGER trg_sis_import_runs_updated_at
    BEFORE UPDATE ON operations.sis_import_runs
    FOR EACH ROW EXECUTE FUNCTION private.trigger_set_updated_at();

-- ============================================================
-- SIS_AUDIT_LOGS
-- ============================================================
CREATE TABLE operations.sis_audit_logs (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    import_run_id UUID        REFERENCES operations.sis_import_runs(id) ON DELETE SET NULL,
    actor_id      UUID        NOT NULL REFERENCES public.users(id),
    action        TEXT        NOT NULL,
    entity_type   TEXT        NOT NULL,
    entity_key    TEXT,
    details       JSONB       NOT NULL DEFAULT '{}',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sis_audit_logs_import_run  ON operations.sis_audit_logs(import_run_id);
CREATE INDEX idx_sis_audit_logs_actor       ON operations.sis_audit_logs(actor_id);
CREATE INDEX idx_sis_audit_logs_action      ON operations.sis_audit_logs(action);
CREATE INDEX idx_sis_audit_logs_entity_type ON operations.sis_audit_logs(entity_type);
CREATE INDEX idx_sis_audit_logs_created_at  ON operations.sis_audit_logs(created_at);

-- ============================================================
-- COURSE_ARCHIVE_SNAPSHOTS
-- ============================================================
CREATE TABLE operations.course_archive_snapshots (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id  UUID        NOT NULL REFERENCES learning.courses(id) ON DELETE CASCADE,
    version    INTEGER     NOT NULL,
    created_by UUID        NOT NULL REFERENCES public.users(id),
    payload    JSONB       NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_archive_course_version UNIQUE (course_id, version)
);

CREATE INDEX idx_course_archive_snapshots_course ON operations.course_archive_snapshots(course_id);
CREATE INDEX idx_course_archive_snapshots_created ON operations.course_archive_snapshots(created_at);

-- ============================================================
-- CONTENT_PROGRESS
-- FIXED: Added FKs user_id → public.users, course_id → learning.courses, module_id → learning.modules
-- ============================================================
CREATE TABLE learning.content_progress (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    course_id    UUID        NOT NULL REFERENCES learning.courses(id) ON DELETE CASCADE,
    module_id    UUID        NOT NULL REFERENCES learning.modules(id) ON DELETE CASCADE,
    content_type TEXT        NOT NULL
                             CHECK (content_type IN ('MODULE_PAGE','RESOURCE','ASSIGNMENT','QUIZ','LESSON')),
    content_id   UUID        NOT NULL,
    completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_content_progress UNIQUE (user_id, content_type, content_id)
);

CREATE INDEX idx_content_progress_user_course ON learning.content_progress(user_id, course_id);
CREATE INDEX idx_content_progress_user_module ON learning.content_progress(user_id, module_id);

-- ============================================================
-- SEMINAR_ATTENDANCE
-- FIXED: Added FK user_id → public.users, marked_by → public.users
-- ============================================================
CREATE TABLE assessment.seminar_attendance (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID        NOT NULL REFERENCES assessment.assignments(id) ON DELETE CASCADE,
    user_id       UUID        NOT NULL REFERENCES public.users(id),
    attended      BOOLEAN     NOT NULL DEFAULT FALSE,
    marked_by     UUID        NOT NULL REFERENCES public.users(id),
    marked_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    notes         TEXT,
    CONSTRAINT uq_seminar_attendance UNIQUE (assignment_id, user_id)
);

CREATE INDEX idx_seminar_attendance_assignment ON assessment.seminar_attendance(assignment_id);
CREATE INDEX idx_seminar_attendance_user       ON assessment.seminar_attendance(user_id);

-- ============================================================
-- LESSON_STEP_PROGRESS
-- FIXED: Added FK user_id → public.users
-- ============================================================
CREATE TABLE learning.lesson_step_progress (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    lesson_id    UUID        NOT NULL REFERENCES learning.lessons(id) ON DELETE CASCADE,
    step_id      UUID        NOT NULL REFERENCES learning.lesson_content_blocks(id) ON DELETE CASCADE,
    completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_lesson_step_progress UNIQUE (user_id, step_id)
);

CREATE INDEX idx_lesson_step_progress_user_lesson ON learning.lesson_step_progress(user_id, lesson_id);

-- ============================================================
-- ATTENDANCE_QR_TOKENS
-- ============================================================
CREATE TABLE assessment.attendance_qr_tokens (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID        NOT NULL REFERENCES assessment.assignments(id) ON DELETE CASCADE,
    token         TEXT        NOT NULL UNIQUE,
    expires_at    TIMESTAMPTZ NOT NULL,
    created_by    UUID        NOT NULL REFERENCES public.users(id),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_attendance_qr_tokens_assignment ON assessment.attendance_qr_tokens(assignment_id);
CREATE INDEX idx_attendance_qr_tokens_token      ON assessment.attendance_qr_tokens(token);

-- ============================================================
-- NOTIFICATIONS  (NEW)
-- ============================================================
CREATE TABLE public.notifications (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    type       TEXT        NOT NULL
                           CHECK (type IN (
                               'assignment_due','grade_posted','announcement',
                               'course_update','submission_graded','peer_review_assigned','system'
                           )),
    title      TEXT        NOT NULL,
    message    TEXT        NOT NULL,
    payload    JSONB,
    is_read    BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_unread ON public.notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX idx_notifications_user        ON public.notifications(user_id, created_at DESC);

-- ============================================================
-- AUDIT_LOGS  (NEW)
-- General-purpose immutable audit trail for all domain actions.
-- ============================================================
CREATE TABLE operations.audit_logs (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id    UUID        REFERENCES public.users(id) ON DELETE SET NULL,
    action      TEXT        NOT NULL,
    entity_type TEXT        NOT NULL,
    entity_id   TEXT,
    details     JSONB       NOT NULL DEFAULT '{}',
    ip_address  INET,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_actor       ON operations.audit_logs(actor_id);
CREATE INDEX idx_audit_logs_entity      ON operations.audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created_at  ON operations.audit_logs(created_at DESC);

-- ============================================================
-- EXECUTION_RUNS  (NEW)
-- Tracks each VPL code execution request from execution-service.
-- ============================================================
CREATE TABLE operations.execution_runs (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID        REFERENCES assessment.submissions(id) ON DELETE CASCADE,
    assignment_id UUID        NOT NULL REFERENCES assessment.assignments(id),
    user_id       UUID        NOT NULL REFERENCES public.users(id),
    language      TEXT        NOT NULL,
    code          TEXT        NOT NULL,
    status        TEXT        NOT NULL DEFAULT 'queued'
                              CHECK (status IN ('queued','running','passed','failed','error','timeout')),
    started_at    TIMESTAMPTZ,
    completed_at  TIMESTAMPTZ,
    exit_code     INTEGER,
    stdout        TEXT,
    stderr        TEXT,
    time_ms       INTEGER,
    memory_mb     INTEGER,
    pylint_score  DECIMAL(4,2),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_execution_runs_submission  ON operations.execution_runs(submission_id);
CREATE INDEX idx_execution_runs_assignment  ON operations.execution_runs(assignment_id);
CREATE INDEX idx_execution_runs_user        ON operations.execution_runs(user_id);
CREATE INDEX idx_execution_runs_status      ON operations.execution_runs(status);
CREATE INDEX idx_execution_runs_created_at  ON operations.execution_runs(created_at DESC);

-- ============================================================
-- EXECUTION_TEST_RESULTS  (NEW)
-- Per-test-case result rows for each execution run.
-- ============================================================
CREATE TABLE operations.execution_test_results (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id          UUID        NOT NULL REFERENCES operations.execution_runs(id) ON DELETE CASCADE,
    test_case_id    UUID        REFERENCES assessment.vpl_test_cases(id) ON DELETE SET NULL,
    name            TEXT        NOT NULL,
    passed          BOOLEAN     NOT NULL,
    expected_output TEXT,
    actual_output   TEXT,
    points_awarded  DECIMAL(6,2),
    error_message   TEXT,
    position        INTEGER     NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_execution_test_results_run ON operations.execution_test_results(run_id);

COMMIT;
