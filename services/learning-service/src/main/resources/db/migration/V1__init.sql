-- V1__init.sql
-- Squashed migration combining V1-V26 into a single clean initial schema.
-- All ALTER TABLE ADD COLUMN statements are folded into the CREATE TABLE.
-- Tables dropped by V20 (peer_review_rubrics, peer_review_ratings, rubric_score_history) are excluded.
-- Columns dropped by V20 (assignments.rubric, submissions.rubric_evaluation) are excluded.
-- All columns reflect their final state after all migrations.

BEGIN;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- COURSES
-- Final state: V1 base + V3 constraints + V17 theme_color
-- ============================================================
CREATE TABLE courses (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    code            VARCHAR(50)  NOT NULL UNIQUE,
    title_uk        VARCHAR(255) NOT NULL,
    title_en        VARCHAR(255),
    description_uk  TEXT,
    description_en  TEXT,
    syllabus        TEXT,
    owner_id        UUID         NOT NULL,
    visibility      VARCHAR(20)  NOT NULL DEFAULT 'DRAFT',
    thumbnail_url   VARCHAR(500),
    start_date      DATE,
    end_date        DATE,
    academic_year   VARCHAR(20),
    department_id   UUID,
    max_students    INTEGER,
    status          VARCHAR(20)  NOT NULL DEFAULT 'DRAFT',
    is_published    BOOLEAN      NOT NULL DEFAULT FALSE,
    theme_color     VARCHAR(20),
    created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_course_code_not_blank     CHECK (length(trim(code)) > 0),
    CONSTRAINT chk_course_title_uk_not_blank CHECK (length(trim(title_uk)) > 0),
    CONSTRAINT chk_course_title_en_not_blank CHECK (title_en IS NULL OR length(trim(title_en)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_course_code          ON courses(code);
CREATE INDEX IF NOT EXISTS idx_course_owner         ON courses(owner_id);
CREATE INDEX IF NOT EXISTS idx_course_published     ON courses(is_published);
CREATE INDEX IF NOT EXISTS idx_course_status        ON courses(status);
CREATE INDEX IF NOT EXISTS idx_course_academic_year ON courses(academic_year);
CREATE INDEX IF NOT EXISTS idx_course_department    ON courses(department_id);

COMMENT ON TABLE  courses            IS 'Main courses table with multilingual support';
COMMENT ON COLUMN courses.visibility IS 'PUBLIC, PRIVATE, or DRAFT';
COMMENT ON COLUMN courses.status     IS 'DRAFT, PUBLISHED, or ARCHIVED';

-- ============================================================
-- COURSE_MEMBERS
-- Final state: V1
-- ============================================================
CREATE TABLE course_members (
    id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id         UUID         NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    user_id           UUID         NOT NULL,
    role_in_course    VARCHAR(20)  NOT NULL,
    added_by          UUID,
    added_at          TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    enrollment_status VARCHAR(20)  NOT NULL DEFAULT 'active',
    completion_date   TIMESTAMP,
    final_grade       DECIMAL(5,2),
    CONSTRAINT uk_course_user UNIQUE (course_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_member_course_user ON course_members(course_id, user_id);
CREATE INDEX IF NOT EXISTS idx_member_role        ON course_members(role_in_course);
CREATE INDEX IF NOT EXISTS idx_member_status      ON course_members(enrollment_status);
CREATE INDEX IF NOT EXISTS idx_member_user        ON course_members(user_id);

COMMENT ON TABLE  course_members                    IS 'Course membership and enrollment tracking';
COMMENT ON COLUMN course_members.role_in_course     IS 'TEACHER, TA, or STUDENT';
COMMENT ON COLUMN course_members.enrollment_status  IS 'active, dropped, or completed';

-- ============================================================
-- MODULES
-- Final state: V1 base + V3 constraint
-- ============================================================
CREATE TABLE modules (
    id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id    UUID         NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    title        VARCHAR(255) NOT NULL,
    description  TEXT,
    position     INTEGER      NOT NULL DEFAULT 0,
    content_meta JSONB        DEFAULT '{}'::jsonb,
    is_published BOOLEAN      NOT NULL DEFAULT FALSE,
    publish_date TIMESTAMP,
    created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_module_title_not_blank CHECK (length(trim(title)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_module_course_position ON modules(course_id, position);
CREATE INDEX IF NOT EXISTS idx_module_published        ON modules(is_published);

COMMENT ON TABLE modules IS 'Course modules for content organization';

-- ============================================================
-- TOPICS
-- Final state: V22
-- Defined before resources/assignments which reference it.
-- ============================================================
CREATE TABLE topics (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id   UUID         NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
    title       VARCHAR(255) NOT NULL,
    description TEXT,
    position    INTEGER      NOT NULL DEFAULT 0,
    created_at  TIMESTAMP    DEFAULT NOW(),
    updated_at  TIMESTAMP    DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_topics_module_position ON topics(module_id, position);

-- ============================================================
-- RESOURCES
-- Final state: V1 base + V22 topic_id
-- ============================================================
CREATE TABLE resources (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id       UUID         NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
    title           VARCHAR(255) NOT NULL,
    description     TEXT,
    resource_type   VARCHAR(20)  NOT NULL,
    file_url        VARCHAR(500),
    external_url    VARCHAR(500),
    file_size       BIGINT,
    mime_type       VARCHAR(100),
    position        INTEGER      NOT NULL DEFAULT 0,
    is_downloadable BOOLEAN      NOT NULL DEFAULT TRUE,
    text_content    TEXT,
    metadata        JSONB        DEFAULT '{}'::jsonb,
    topic_id        UUID         REFERENCES topics(id) ON DELETE SET NULL,
    created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_resource_module   ON resources(module_id);
CREATE INDEX IF NOT EXISTS idx_resource_type     ON resources(resource_type);
CREATE INDEX IF NOT EXISTS idx_resource_position ON resources(module_id, position);
CREATE INDEX IF NOT EXISTS idx_resources_topic   ON resources(topic_id);

COMMENT ON TABLE  resources               IS 'Course resources (files, links, content)';
COMMENT ON COLUMN resources.resource_type IS 'VIDEO, PDF, SLIDE, LINK, TEXT, CODE, or OTHER';

-- ============================================================
-- LESSONS
-- Final state: V2
-- ============================================================
CREATE TABLE lessons (
    id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id        UUID         NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
    title            VARCHAR(255) NOT NULL,
    summary          TEXT,
    position         INTEGER      NOT NULL DEFAULT 0,
    content_meta     JSONB        DEFAULT '{}'::jsonb,
    is_ai_generated  BOOLEAN      NOT NULL DEFAULT FALSE,
    is_published     BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_lesson_module_position ON lessons(module_id, position);
CREATE INDEX IF NOT EXISTS idx_lesson_published       ON lessons(is_published);

COMMENT ON TABLE lessons IS 'Lesson/learning units under modules with LaTeX-capable content blocks.';

-- ============================================================
-- LESSON_CONTENT_BLOCKS
-- Final state: V2 base + V26 questions JSONB
-- ============================================================
CREATE TABLE lesson_content_blocks (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id       UUID         NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    block_type      VARCHAR(30)  NOT NULL,
    title           VARCHAR(255),
    content         TEXT         NOT NULL,
    content_format  VARCHAR(20)  NOT NULL DEFAULT 'MARKDOWN',
    position        INTEGER      NOT NULL DEFAULT 0,
    metadata        JSONB        DEFAULT '{}'::jsonb,
    is_ai_generated BOOLEAN      NOT NULL DEFAULT FALSE,
    questions       JSONB        DEFAULT '[]'::jsonb,
    created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_lesson_block_lesson_position ON lesson_content_blocks(lesson_id, position);
CREATE INDEX IF NOT EXISTS idx_lesson_block_type            ON lesson_content_blocks(block_type);

COMMENT ON TABLE  lesson_content_blocks            IS 'Orderable lesson blocks with LaTeX-capable content.';
COMMENT ON COLUMN lesson_content_blocks.content    IS 'LaTeX-safe content stored losslessly.';
COMMENT ON COLUMN lesson_content_blocks.block_type IS 'Step type: TEXT or QUIZ';
COMMENT ON COLUMN lesson_content_blocks.questions  IS 'Inline quiz questions as JSONB array for QUIZ steps';

-- ============================================================
-- LESSON_OBJECTIVES
-- Final state: V2
-- ============================================================
CREATE TABLE lesson_objectives (
    id              UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id       UUID      NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    objective_text  TEXT      NOT NULL,
    position        INTEGER   NOT NULL DEFAULT 0,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_lesson_objective_lesson_position ON lesson_objectives(lesson_id, position);

COMMENT ON TABLE lesson_objectives IS 'Lesson objectives with LaTeX-capable text.';

-- ============================================================
-- PROGRAMS
-- Final state: V2
-- ============================================================
CREATE TABLE programs (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    code        VARCHAR(50) NOT NULL UNIQUE,
    title       VARCHAR(255) NOT NULL,
    description TEXT,
    owner_id    UUID        NOT NULL,
    status      VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    metadata    JSONB       DEFAULT '{}'::jsonb,
    created_at  TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_program_code   ON programs(code);
CREATE INDEX IF NOT EXISTS idx_program_owner  ON programs(owner_id);
CREATE INDEX IF NOT EXISTS idx_program_status ON programs(status);

COMMENT ON TABLE programs IS 'Programs/degree tracks grouping learning paths.';

-- ============================================================
-- LEARNING_PATHS
-- Final state: V2
-- ============================================================
CREATE TABLE learning_paths (
    id              UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
    program_id      UUID      NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
    title           VARCHAR(255) NOT NULL,
    description     TEXT,
    is_ai_generated BOOLEAN   NOT NULL DEFAULT FALSE,
    metadata        JSONB     DEFAULT '{}'::jsonb,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_learning_path_program ON learning_paths(program_id);

COMMENT ON TABLE learning_paths IS 'Learning paths that compose existing courses/modules.';

-- ============================================================
-- PATH_STEPS
-- Final state: V2
-- ============================================================
CREATE TABLE path_steps (
    id                     UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    learning_path_id       UUID         NOT NULL REFERENCES learning_paths(id) ON DELETE CASCADE,
    step_type              VARCHAR(20)  NOT NULL,
    course_id              UUID,
    module_id              UUID,
    title_override         VARCHAR(255),
    description            TEXT,
    requirements_text      TEXT,
    requirements_format    VARCHAR(20)  NOT NULL DEFAULT 'MARKDOWN',
    completion_criteria    JSONB        DEFAULT '{}'::jsonb,
    position               INTEGER      NOT NULL DEFAULT 0,
    is_optional            BOOLEAN      NOT NULL DEFAULT FALSE,
    is_ai_recommended      BOOLEAN      NOT NULL DEFAULT FALSE,
    ai_recommendation_meta JSONB        DEFAULT '{}'::jsonb,
    created_at             TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at             TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_path_step_target CHECK (
        (course_id IS NOT NULL AND module_id IS NULL)
        OR (course_id IS NULL AND module_id IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_path_step_learning_path_position ON path_steps(learning_path_id, position);
CREATE INDEX IF NOT EXISTS idx_path_step_course                 ON path_steps(course_id);
CREATE INDEX IF NOT EXISTS idx_path_step_module                 ON path_steps(module_id);

COMMENT ON TABLE path_steps IS 'Steps referencing courses or modules with LaTeX-capable requirements.';

-- ============================================================
-- QUIZZES
-- Final state: V4 base + V7 constraint + V21 optional-limit/secure-session columns
-- ============================================================
CREATE TABLE quizzes (
    id                       UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id                UUID         NOT NULL,
    title                    VARCHAR(255) NOT NULL,
    description              TEXT,
    time_limit               INTEGER,
    attempts_allowed         INTEGER      DEFAULT 1,
    shuffle_questions        BOOLEAN      DEFAULT FALSE,
    shuffle_answers          BOOLEAN      DEFAULT FALSE,
    show_correct_answers     BOOLEAN      DEFAULT TRUE,
    show_correct_answers_at  TIMESTAMP,
    pass_percentage          DECIMAL(5,2) DEFAULT 60.00,
    timer_enabled            BOOLEAN      NOT NULL DEFAULT FALSE,
    attempt_limit_enabled    BOOLEAN      NOT NULL DEFAULT FALSE,
    attempt_score_policy     VARCHAR(16)  NOT NULL DEFAULT 'HIGHEST',
    secure_session_enabled   BOOLEAN      NOT NULL DEFAULT FALSE,
    secure_require_fullscreen BOOLEAN     NOT NULL DEFAULT TRUE,
    created_by               UUID         NOT NULL,
    created_at               TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at               TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_quiz_title_not_blank CHECK (length(trim(title)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_quiz_course      ON quizzes(course_id);
CREATE INDEX IF NOT EXISTS idx_quiz_created_by  ON quizzes(created_by);

COMMENT ON TABLE quizzes IS 'Quiz/test definitions with settings';

-- ============================================================
-- QUESTION_BANK
-- Final state: V4 base + V7 constraint + V13 topic/difficulty/tags/is_archived + V17 image_url
-- ============================================================
CREATE TABLE question_bank (
    id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id      UUID,
    question_type  VARCHAR(30)  NOT NULL,
    stem           TEXT         NOT NULL,
    options        JSONB        DEFAULT '{}'::jsonb,
    correct_answer JSONB        DEFAULT '{}'::jsonb,
    explanation    TEXT,
    points         DECIMAL(6,2) NOT NULL DEFAULT 1.00,
    metadata       JSONB        DEFAULT '{}'::jsonb,
    topic          VARCHAR(255),
    difficulty     VARCHAR(20),
    tags           JSONB        NOT NULL DEFAULT '[]'::jsonb,
    is_archived    BOOLEAN      NOT NULL DEFAULT FALSE,
    image_url      VARCHAR(500),
    created_by     UUID         NOT NULL,
    created_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_question_stem_not_blank CHECK (length(trim(stem)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_question_course      ON question_bank(course_id);
CREATE INDEX IF NOT EXISTS idx_question_type        ON question_bank(question_type);
CREATE INDEX IF NOT EXISTS idx_question_created_by  ON question_bank(created_by);
CREATE INDEX IF NOT EXISTS idx_question_bank_topic      ON question_bank(topic);
CREATE INDEX IF NOT EXISTS idx_question_bank_difficulty ON question_bank(difficulty);

COMMENT ON TABLE  question_bank               IS 'Reusable question bank for quizzes';
COMMENT ON COLUMN question_bank.question_type IS 'MULTIPLE_CHOICE, TRUE_FALSE, FILL_BLANK, MATCHING, NUMERICAL, FORMULA, SHORT_ANSWER, ESSAY, CODE, FILE_UPLOAD, ORDERING, HOTSPOT, DRAG_DROP';

-- ============================================================
-- ASSIGNMENTS
-- Final state: V4 base (WITHOUT rubric, WITHOUT max_points default) + V7 constraints + V22 topic_id
-- ============================================================
CREATE TABLE assignments (
    id                      UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id               UUID         NOT NULL,
    module_id               UUID,
    category_id             UUID,
    position                INTEGER      NOT NULL DEFAULT 0,
    assignment_type         VARCHAR(20)  NOT NULL,
    title                   VARCHAR(255) NOT NULL,
    description             TEXT         NOT NULL,
    description_format      VARCHAR(20)  DEFAULT 'MARKDOWN',
    instructions            TEXT,
    instructions_format     VARCHAR(20)  DEFAULT 'MARKDOWN',
    resources               JSONB        DEFAULT '[]'::jsonb,
    starter_code            TEXT,
    solution_code           TEXT,
    programming_language    VARCHAR(50),
    auto_grading_enabled    BOOLEAN      DEFAULT FALSE,
    test_cases              JSONB        DEFAULT '[]'::jsonb,
    max_points              DECIMAL(6,2) NOT NULL,
    due_date                TIMESTAMP,
    available_from          TIMESTAMP,
    available_until         TIMESTAMP,
    allow_late_submission   BOOLEAN      DEFAULT FALSE,
    late_penalty_percent    DECIMAL(5,2) DEFAULT 0,
    submission_types        JSONB        DEFAULT '[]'::jsonb,
    allowed_file_types      JSONB        DEFAULT '[]'::jsonb,
    max_file_size           BIGINT       DEFAULT 10485760,
    max_files               INTEGER      DEFAULT 5,
    quiz_id                 UUID,
    external_tool_url       VARCHAR(500),
    external_tool_config    JSONB        DEFAULT '{}'::jsonb,
    grade_anonymously       BOOLEAN      DEFAULT FALSE,
    peer_review_enabled     BOOLEAN      DEFAULT FALSE,
    peer_reviews_required   INTEGER      DEFAULT 0,
    tags                    JSONB        DEFAULT '[]'::jsonb,
    estimated_duration      INTEGER,
    is_template             BOOLEAN      DEFAULT FALSE,
    is_archived             BOOLEAN      DEFAULT FALSE,
    original_assignment_id  UUID,
    is_published            BOOLEAN      DEFAULT FALSE,
    topic_id                UUID         REFERENCES topics(id) ON DELETE SET NULL,
    created_by              UUID         NOT NULL,
    created_at              TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_assignment_title_not_blank       CHECK (length(trim(title)) > 0),
    CONSTRAINT chk_assignment_description_not_blank CHECK (length(trim(description)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_assignment_course      ON assignments(course_id);
CREATE INDEX IF NOT EXISTS idx_assignment_module      ON assignments(module_id);
CREATE INDEX IF NOT EXISTS idx_assignment_type        ON assignments(assignment_type);
CREATE INDEX IF NOT EXISTS idx_assignment_published   ON assignments(is_published);
CREATE INDEX IF NOT EXISTS idx_assignment_due_date    ON assignments(due_date);
CREATE INDEX IF NOT EXISTS idx_assignment_created_by  ON assignments(created_by);
CREATE INDEX IF NOT EXISTS idx_assignments_topic      ON assignments(topic_id);

COMMENT ON TABLE  assignments                    IS 'Assignments with support for multiple types (QUIZ, FILE_UPLOAD, TEXT, CODE, URL, etc.)';
COMMENT ON COLUMN assignments.assignment_type    IS 'QUIZ, FILE_UPLOAD, TEXT, CODE, URL, MANUAL_GRADE, EXTERNAL, SEMINAR';
COMMENT ON COLUMN assignments.description_format IS 'PLAIN, MARKDOWN, HTML, RICH';
COMMENT ON COLUMN assignments.auto_grading_enabled IS 'Enable automatic grading for code submissions';

-- ============================================================
-- QUIZ_QUESTIONS
-- Final state: V4
-- ============================================================
CREATE TABLE quiz_questions (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id         UUID         NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    question_id     UUID         NOT NULL REFERENCES question_bank(id) ON DELETE CASCADE,
    position        INTEGER      NOT NULL DEFAULT 0,
    points_override DECIMAL(6,2),
    CONSTRAINT uk_quiz_question UNIQUE (quiz_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_quiz_question_quiz      ON quiz_questions(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_question_position  ON quiz_questions(quiz_id, position);

COMMENT ON TABLE quiz_questions IS 'Association between quizzes and questions';

-- ============================================================
-- QUIZ_ATTEMPTS
-- Final state: V4
-- ============================================================
CREATE TABLE quiz_attempts (
    id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id             UUID         NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    user_id             UUID         NOT NULL,
    attempt_number      INTEGER      NOT NULL DEFAULT 1,
    started_at          TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    submitted_at        TIMESTAMP,
    answers             JSONB        DEFAULT '{}'::jsonb,
    auto_score          DECIMAL(6,2),
    manual_score        DECIMAL(6,2),
    final_score         DECIMAL(6,2),
    graded_by           UUID,
    graded_at           TIMESTAMP,
    feedback            TEXT,
    ip_address          VARCHAR(45),
    browser_fingerprint VARCHAR(255),
    proctoring_data     JSONB        DEFAULT '{}'::jsonb,
    CONSTRAINT uk_quiz_user_attempt UNIQUE (quiz_id, user_id, attempt_number)
);

CREATE INDEX IF NOT EXISTS idx_quiz_attempt_quiz    ON quiz_attempts(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempt_user    ON quiz_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempt_started ON quiz_attempts(started_at);

COMMENT ON TABLE quiz_attempts IS 'Student attempts at quizzes with answers and scoring';

-- ============================================================
-- PEER_REVIEWS
-- Final state: V5 (peer_review_rubrics and peer_review_ratings dropped by V20)
-- ============================================================
CREATE TABLE peer_reviews (
    id               BIGSERIAL    PRIMARY KEY,
    assignment_id    BIGINT       NOT NULL,
    reviewer_user_id BIGINT       NOT NULL,
    reviewee_user_id BIGINT       NOT NULL,
    submission_id    BIGINT       NOT NULL,
    is_anonymous     BOOLEAN      NOT NULL DEFAULT TRUE,
    status           VARCHAR(20)  NOT NULL DEFAULT 'PENDING',
    overall_score    DECIMAL(6,2),
    overall_feedback TEXT,
    submitted_at     TIMESTAMP,
    created_at       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_peer_review_assignment  ON peer_reviews(assignment_id);
CREATE INDEX IF NOT EXISTS idx_peer_review_reviewer    ON peer_reviews(reviewer_user_id);
CREATE INDEX IF NOT EXISTS idx_peer_review_reviewee    ON peer_reviews(reviewee_user_id);
CREATE INDEX IF NOT EXISTS idx_peer_review_submission  ON peer_reviews(submission_id);
CREATE INDEX IF NOT EXISTS idx_peer_review_status      ON peer_reviews(status);

COMMENT ON TABLE  peer_reviews           IS 'Peer review assignments with anonymous support';
COMMENT ON COLUMN peer_reviews.status    IS 'PENDING, IN_PROGRESS, COMPLETED, OVERDUE';
COMMENT ON COLUMN peer_reviews.is_anonymous IS 'Whether reviewer identity is hidden from reviewee';

-- ============================================================
-- AI_FEEDBACK_ENTRIES
-- Final state: V6
-- ============================================================
CREATE TABLE ai_feedback_entries (
    id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id    UUID         NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    submission_id    UUID         NOT NULL,
    attempt_number   INTEGER      NOT NULL DEFAULT 1,
    raw_feedback     TEXT         NOT NULL,
    feedback_format  VARCHAR(20)  NOT NULL DEFAULT 'MARKDOWN',
    model_name       VARCHAR(100) NOT NULL,
    model_version    VARCHAR(50),
    model_hash       VARCHAR(64),
    model_metadata   JSONB        DEFAULT '{}'::jsonb,
    created_by       UUID,
    created_at       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ai_feedback_assignment ON ai_feedback_entries(assignment_id);
CREATE INDEX IF NOT EXISTS idx_ai_feedback_submission ON ai_feedback_entries(submission_id);
CREATE INDEX IF NOT EXISTS idx_ai_feedback_created_at ON ai_feedback_entries(created_at);

COMMENT ON TABLE  ai_feedback_entries            IS 'Immutable AI feedback entries linked to assignment submissions with LaTeX-capable content.';
COMMENT ON COLUMN ai_feedback_entries.raw_feedback IS 'LaTeX-safe feedback content stored losslessly.';

-- ============================================================
-- REVISION_FEEDBACK_THREADS
-- Final state: V6
-- ============================================================
CREATE TABLE revision_feedback_threads (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID        NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    submission_id UUID        NOT NULL,
    student_id    UUID        NOT NULL,
    status        VARCHAR(20) NOT NULL DEFAULT 'OPEN',
    created_at    TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_revision_thread_assignment ON revision_feedback_threads(assignment_id);
CREATE INDEX IF NOT EXISTS idx_revision_thread_submission ON revision_feedback_threads(submission_id);
CREATE INDEX IF NOT EXISTS idx_revision_thread_student    ON revision_feedback_threads(student_id);

COMMENT ON TABLE revision_feedback_threads IS 'Feedback threads for student-AI-instructor revision cycles.';

-- ============================================================
-- REVISION_FEEDBACK_MESSAGES
-- Final state: V6
-- ============================================================
CREATE TABLE revision_feedback_messages (
    id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id      UUID         NOT NULL REFERENCES revision_feedback_threads(id) ON DELETE CASCADE,
    sender_role    VARCHAR(20)  NOT NULL,
    message_text   TEXT         NOT NULL,
    message_format VARCHAR(20)  NOT NULL DEFAULT 'MARKDOWN',
    model_name     VARCHAR(100),
    model_version  VARCHAR(50),
    model_hash     VARCHAR(64),
    model_metadata JSONB        DEFAULT '{}'::jsonb,
    created_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_revision_message_thread     ON revision_feedback_messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_revision_message_created_at ON revision_feedback_messages(created_at);

COMMENT ON TABLE revision_feedback_messages IS 'Immutable LaTeX-capable messages for revision threads.';

-- ============================================================
-- GRADEBOOK_CATEGORIES
-- Final state: V8
-- ============================================================
CREATE TABLE gradebook_categories (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id   UUID         NOT NULL,
    name        VARCHAR(100) NOT NULL,
    description TEXT,
    weight      DECIMAL(5,2) NOT NULL DEFAULT 0,
    drop_lowest INTEGER      NOT NULL DEFAULT 0,
    position    INTEGER      NOT NULL DEFAULT 0,
    created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_course_category UNIQUE (course_id, name)
);

CREATE INDEX IF NOT EXISTS idx_gradebook_category_course ON gradebook_categories(course_id);

-- ============================================================
-- GRADEBOOK_ENTRIES
-- Final state: V8
-- ============================================================
CREATE TABLE gradebook_entries (
    id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id      UUID         NOT NULL,
    student_id     UUID         NOT NULL,
    assignment_id  UUID,
    score          DECIMAL(6,2),
    max_score      DECIMAL(6,2) NOT NULL,
    percentage     DECIMAL(5,2),
    status         VARCHAR(20)  NOT NULL DEFAULT 'NOT_SUBMITTED',
    is_late        BOOLEAN      NOT NULL DEFAULT FALSE,
    is_excused     BOOLEAN      NOT NULL DEFAULT FALSE,
    notes          TEXT,
    submission_id  UUID,
    override_score DECIMAL(6,2),
    override_by    UUID,
    override_at    TIMESTAMP,
    override_reason TEXT,
    graded_at      TIMESTAMP,
    created_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_entry_course_student_assignment UNIQUE (course_id, student_id, assignment_id)
);

CREATE INDEX IF NOT EXISTS idx_gradebook_entry_course_student ON gradebook_entries(course_id, student_id);
CREATE INDEX IF NOT EXISTS idx_gradebook_entry_status         ON gradebook_entries(status);
CREATE INDEX IF NOT EXISTS idx_gradebook_entry_graded_at      ON gradebook_entries(graded_at);
CREATE INDEX IF NOT EXISTS idx_gradebook_entry_created_at     ON gradebook_entries(created_at);

-- ============================================================
-- GRADE_HISTORIES
-- Final state: V8
-- ============================================================
CREATE TABLE grade_histories (
    id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    gradebook_entry_id  UUID         NOT NULL REFERENCES gradebook_entries(id) ON DELETE CASCADE,
    old_score           DECIMAL(6,2),
    new_score           DECIMAL(6,2),
    changed_by          UUID,
    change_reason       TEXT,
    changed_at          TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_grade_history_entry      ON grade_histories(gradebook_entry_id);
CREATE INDEX IF NOT EXISTS idx_grade_history_changed_at ON grade_histories(changed_at);

-- ============================================================
-- COURSE_GRADE_SUMMARIES
-- Final state: V8
-- ============================================================
CREATE TABLE course_grade_summaries (
    id                     UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id              UUID         NOT NULL,
    student_id             UUID         NOT NULL,
    total_points_earned    DECIMAL(8,2) NOT NULL DEFAULT 0,
    total_points_possible  DECIMAL(8,2) NOT NULL DEFAULT 0,
    current_grade          DECIMAL(5,2),
    letter_grade           VARCHAR(5),
    category_grades        JSONB        NOT NULL DEFAULT '{}'::jsonb,
    assignments_completed  INTEGER      NOT NULL DEFAULT 0,
    assignments_total      INTEGER      NOT NULL DEFAULT 0,
    final_grade            DECIMAL(5,2),
    is_final               BOOLEAN      NOT NULL DEFAULT FALSE,
    last_calculated        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at             TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_summary_course_student UNIQUE (course_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_grade_summary_course_student ON course_grade_summaries(course_id, student_id);
CREATE INDEX IF NOT EXISTS idx_grade_summary_current_grade  ON course_grade_summaries(current_grade);

-- ============================================================
-- SUBMISSIONS
-- Final state: V9 base (WITHOUT rubric_evaluation) + V19 workflow columns + V26 form_data
-- status is VARCHAR(32) per V19; extra V19 columns folded in.
-- ============================================================
CREATE TABLE submissions (
    id                    UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id         UUID         NOT NULL,
    user_id               UUID         NOT NULL,
    student_name          VARCHAR(255),
    student_email         VARCHAR(255),
    status                VARCHAR(32)  NOT NULL DEFAULT 'DRAFT',
    text_answer           TEXT,
    submission_url        VARCHAR(1000),
    programming_language  VARCHAR(50),
    grade                 DECIMAL(6,2),
    feedback              TEXT,
    is_late               BOOLEAN      NOT NULL DEFAULT FALSE,
    days_late             INTEGER      NOT NULL DEFAULT 0,
    submitted_at          TIMESTAMP,
    graded_at             TIMESTAMP,
    grader_id             UUID,
    submission_version    INTEGER      NOT NULL DEFAULT 1,
    raw_score             DECIMAL(6,2),
    draft_grade           DECIMAL(6,2),
    draft_feedback        TEXT,
    published_grade       DECIMAL(6,2),
    published_feedback    TEXT,
    published_at          TIMESTAMP,
    published_by          UUID,
    review_started_at     TIMESTAMP,
    last_resubmitted_at   TIMESTAMP,
    version               BIGINT       NOT NULL DEFAULT 0,
    form_data             JSONB,
    created_at            TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_submissions_assignment_user UNIQUE (assignment_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_submissions_assignment                ON submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_submissions_user                      ON submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_submissions_status                    ON submissions(status);
CREATE INDEX IF NOT EXISTS idx_submissions_submitted_at              ON submissions(submitted_at);
CREATE INDEX IF NOT EXISTS idx_submissions_assignment_status_updated ON submissions(assignment_id, status, updated_at DESC);

COMMENT ON COLUMN submissions.form_data IS 'Structured form submission data for form-builder assignments';

-- ============================================================
-- SUBMISSION_FILES
-- Final state: V9
-- ============================================================
CREATE TABLE submission_files (
    id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID          NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
    filename      VARCHAR(512)  NOT NULL,
    file_url      VARCHAR(1000) NOT NULL,
    storage_path  VARCHAR(1000) NOT NULL,
    content_type  VARCHAR(255),
    file_size     BIGINT        NOT NULL,
    uploaded_at   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_submission_files_submission ON submission_files(submission_id);

-- ============================================================
-- SUBMISSION_COMMENTS
-- Final state: V9
-- ============================================================
CREATE TABLE submission_comments (
    id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID         NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
    author_id     UUID         NOT NULL,
    author_name   VARCHAR(255),
    author_email  VARCHAR(255),
    comment       TEXT         NOT NULL,
    created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_submission_comments_submission ON submission_comments(submission_id);
CREATE INDEX IF NOT EXISTS idx_submission_comments_created    ON submission_comments(created_at);

-- ============================================================
-- SUBMISSION_GRADE_AUDIT
-- Final state: V19
-- ============================================================
CREATE TABLE submission_grade_audit (
    id                 UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id      UUID         NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
    changed_by         UUID         NOT NULL,
    changed_at         TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    change_type        VARCHAR(32)  NOT NULL,
    prev_raw_score     DECIMAL(6,2),
    new_raw_score      DECIMAL(6,2),
    prev_final_score   DECIMAL(6,2),
    new_final_score    DECIMAL(6,2),
    prev_feedback      TEXT,
    new_feedback       TEXT,
    submission_version INTEGER      NOT NULL DEFAULT 1,
    entity_version     BIGINT       NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_submission_grade_audit_submission
    ON submission_grade_audit(submission_id, changed_at DESC);

-- ============================================================
-- DEADLINES
-- Final state: V10
-- ============================================================
CREATE TABLE deadlines (
    id               BIGSERIAL    PRIMARY KEY,
    course_id        BIGINT       NOT NULL,
    student_group_id BIGINT       NOT NULL,
    title            VARCHAR(255) NOT NULL,
    description      TEXT,
    due_at           TIMESTAMP WITH TIME ZONE NOT NULL,
    estimated_effort INTEGER      NOT NULL,
    type             VARCHAR(32)  NOT NULL,
    created_at       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deadline_student_group_due ON deadlines(student_group_id, due_at);
CREATE INDEX IF NOT EXISTS idx_deadline_type_due          ON deadlines(type, due_at);

-- ============================================================
-- WORKLOAD_SNAPSHOTS
-- Final state: V11
-- ============================================================
CREATE TABLE workload_snapshots (
    id           BIGSERIAL PRIMARY KEY,
    student_id   BIGINT    NOT NULL,
    date         DATE      NOT NULL,
    total_effort INTEGER   NOT NULL,
    generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_workload_student_date ON workload_snapshots(student_id, date);

-- ============================================================
-- MODULE_PAGES
-- Final state: V12
-- ============================================================
CREATE TABLE module_pages (
    id                    UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id             UUID         NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
    parent_page_id        UUID         REFERENCES module_pages(id) ON DELETE CASCADE,
    title                 VARCHAR(255) NOT NULL,
    slug                  VARCHAR(255) NOT NULL,
    position              INTEGER      NOT NULL DEFAULT 0,
    is_published          BOOLEAN      NOT NULL DEFAULT FALSE,
    has_unpublished_changes BOOLEAN    NOT NULL DEFAULT FALSE,
    created_by            UUID         NOT NULL,
    updated_by            UUID         NOT NULL,
    created_at            TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_module_page_slug UNIQUE (module_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_module_pages_module_parent_position
    ON module_pages(module_id, parent_page_id, position);
CREATE INDEX IF NOT EXISTS idx_module_pages_module_published
    ON module_pages(module_id, is_published);

COMMENT ON TABLE module_pages IS 'Hierarchical page tree scoped to a module for block-editor content.';

-- ============================================================
-- PAGE_DOCUMENTS
-- Final state: V12
-- ============================================================
CREATE TABLE page_documents (
    page_id        UUID    PRIMARY KEY REFERENCES module_pages(id) ON DELETE CASCADE,
    doc_json       JSONB   NOT NULL,
    schema_version INTEGER NOT NULL DEFAULT 1,
    doc_hash       VARCHAR(64) NOT NULL,
    updated_at     TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE page_documents IS 'Draft canonical document JSON for module pages.';

-- ============================================================
-- PAGE_PUBLISHED_DOCUMENTS
-- Final state: V12
-- ============================================================
CREATE TABLE page_published_documents (
    page_id        UUID      PRIMARY KEY REFERENCES module_pages(id) ON DELETE CASCADE,
    doc_json       JSONB     NOT NULL,
    schema_version INTEGER   NOT NULL DEFAULT 1,
    doc_hash       VARCHAR(64) NOT NULL,
    published_at   TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    published_by   UUID        NOT NULL
);

COMMENT ON TABLE page_published_documents IS 'Published canonical document snapshots for student-visible pages.';

-- ============================================================
-- ASSIGNMENT_TEMPLATE_DOCUMENTS
-- Final state: V12
-- ============================================================
CREATE TABLE assignment_template_documents (
    assignment_id  UUID      PRIMARY KEY REFERENCES assignments(id) ON DELETE CASCADE,
    doc_json       JSONB     NOT NULL,
    schema_version INTEGER   NOT NULL DEFAULT 1,
    updated_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by     UUID      NOT NULL
);

COMMENT ON TABLE assignment_template_documents IS 'Instructor-defined starter documents for assignments.';

-- ============================================================
-- SUBMISSION_DOCUMENTS
-- Final state: V12
-- ============================================================
CREATE TABLE submission_documents (
    submission_id  UUID      PRIMARY KEY REFERENCES submissions(id) ON DELETE CASCADE,
    doc_json       JSONB     NOT NULL,
    schema_version INTEGER   NOT NULL DEFAULT 1,
    updated_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE submission_documents IS 'Canonical document storage for student submission editor.';

-- ============================================================
-- PAGE_CITATIONS
-- Final state: V13
-- ============================================================
CREATE TABLE page_citations (
    id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    page_id       UUID         NOT NULL REFERENCES module_pages(id) ON DELETE CASCADE,
    block_id      VARCHAR(128),
    author        VARCHAR(255),
    title         VARCHAR(512),
    year          INTEGER,
    url           VARCHAR(1000),
    citation_type VARCHAR(50),
    created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_page_citations_page ON page_citations(page_id);
CREATE INDEX IF NOT EXISTS idx_page_citations_type ON page_citations(citation_type);

-- ============================================================
-- PAGE_FOOTNOTES
-- Final state: V13
-- ============================================================
CREATE TABLE page_footnotes (
    id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    page_id       UUID         NOT NULL REFERENCES module_pages(id) ON DELETE CASCADE,
    footnote_key  VARCHAR(128) NOT NULL,
    ordinal       INTEGER      NOT NULL,
    content_json  JSONB        NOT NULL DEFAULT '{}'::jsonb,
    created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_page_footnote_key UNIQUE (page_id, footnote_key)
);

CREATE INDEX IF NOT EXISTS idx_page_footnotes_page    ON page_footnotes(page_id);
CREATE INDEX IF NOT EXISTS idx_page_footnotes_ordinal ON page_footnotes(page_id, ordinal);

-- ============================================================
-- QUESTION_BANK_VERSIONS
-- Final state: V13
-- ============================================================
CREATE TABLE question_bank_versions (
    id              UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id     UUID      NOT NULL REFERENCES question_bank(id) ON DELETE CASCADE,
    version_number  INTEGER   NOT NULL,
    prompt_doc_json JSONB     NOT NULL,
    payload_jsonb   JSONB     NOT NULL DEFAULT '{}'::jsonb,
    answer_key_jsonb JSONB    NOT NULL DEFAULT '{}'::jsonb,
    created_by      UUID      NOT NULL,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_question_version UNIQUE (question_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_question_versions_question
    ON question_bank_versions(question_id, version_number DESC);

COMMENT ON TABLE question_bank_versions IS 'Immutable question versions used to freeze quiz attempts.';

-- ============================================================
-- QUIZ_SECTIONS
-- Final state: V13
-- ============================================================
CREATE TABLE quiz_sections (
    id             UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id        UUID      NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    title          VARCHAR(255) NOT NULL,
    position       INTEGER   NOT NULL DEFAULT 0,
    question_count INTEGER   NOT NULL DEFAULT 0,
    created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_quiz_sections_quiz_position ON quiz_sections(quiz_id, position);

COMMENT ON TABLE quiz_sections IS 'Quiz sections for quota-based randomized question selection.';

-- ============================================================
-- QUIZ_SECTION_RULES
-- Final state: V13
-- ============================================================
CREATE TABLE quiz_section_rules (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    section_id    UUID        NOT NULL REFERENCES quiz_sections(id) ON DELETE CASCADE,
    question_type VARCHAR(30),
    difficulty    VARCHAR(20),
    tag           VARCHAR(120),
    quota         INTEGER     NOT NULL DEFAULT 1,
    created_at    TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_quiz_section_rule_selector CHECK (
        question_type IS NOT NULL OR difficulty IS NOT NULL OR tag IS NOT NULL
    )
);

CREATE INDEX IF NOT EXISTS idx_quiz_section_rules_section ON quiz_section_rules(section_id);

COMMENT ON TABLE quiz_section_rules IS 'Selection rules by tag/difficulty/type for each quiz section.';

-- ============================================================
-- QUIZ_ATTEMPT_QUESTIONS
-- Final state: V13
-- ============================================================
CREATE TABLE quiz_attempt_questions (
    id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id          UUID         NOT NULL REFERENCES quiz_attempts(id) ON DELETE CASCADE,
    question_id         UUID         NOT NULL REFERENCES question_bank(id),
    question_version_id UUID         REFERENCES question_bank_versions(id),
    position            INTEGER      NOT NULL DEFAULT 0,
    prompt_snapshot     JSONB        NOT NULL,
    payload_snapshot    JSONB        NOT NULL DEFAULT '{}'::jsonb,
    answer_key_snapshot JSONB        NOT NULL DEFAULT '{}'::jsonb,
    points              DECIMAL(6,2) NOT NULL DEFAULT 1.00,
    created_at          TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_attempt_question_position UNIQUE (attempt_id, position)
);

CREATE INDEX IF NOT EXISTS idx_quiz_attempt_questions_attempt  ON quiz_attempt_questions(attempt_id, position);
CREATE INDEX IF NOT EXISTS idx_quiz_attempt_questions_question ON quiz_attempt_questions(question_id);

COMMENT ON TABLE quiz_attempt_questions IS 'Frozen prompt/version snapshots selected at attempt start.';

-- ============================================================
-- QUIZ_RESPONSES
-- Final state: V13
-- ============================================================
CREATE TABLE quiz_responses (
    id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id          UUID         NOT NULL REFERENCES quiz_attempts(id) ON DELETE CASCADE,
    attempt_question_id UUID         NOT NULL REFERENCES quiz_attempt_questions(id) ON DELETE CASCADE,
    response_jsonb      JSONB        NOT NULL DEFAULT '{}'::jsonb,
    is_correct          BOOLEAN,
    score_awarded       DECIMAL(6,2),
    feedback            TEXT,
    graded_at           TIMESTAMP,
    CONSTRAINT uk_quiz_response_attempt_question UNIQUE (attempt_question_id)
);

CREATE INDEX IF NOT EXISTS idx_quiz_responses_attempt ON quiz_responses(attempt_id);

COMMENT ON TABLE quiz_responses IS 'Per-question responses and scoring for each attempt.';

-- ============================================================
-- EDITOR_MEDIA
-- Final state: V14
-- ============================================================
CREATE TABLE editor_media (
    id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    stored_filename   VARCHAR(255) NOT NULL UNIQUE,
    original_filename VARCHAR(255) NOT NULL,
    storage_path      VARCHAR(1200) NOT NULL,
    content_type      VARCHAR(120) NOT NULL,
    file_size         BIGINT       NOT NULL,
    uploaded_by       UUID         NOT NULL,
    created_at        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_editor_media_uploaded_by_created_at
    ON editor_media(uploaded_by, created_at DESC);

COMMENT ON TABLE editor_media IS 'Metadata for uploaded editor assets (images and PDFs).';

-- ============================================================
-- ANNOUNCEMENTS
-- Final state: V15
-- ============================================================
CREATE TABLE announcements (
    id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id  UUID         NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    title      VARCHAR(255) NOT NULL,
    content    TEXT         NOT NULL,
    is_pinned  BOOLEAN      NOT NULL DEFAULT FALSE,
    created_by UUID         NOT NULL,
    updated_by UUID,
    created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_announcement_course_order
    ON announcements(course_id, is_pinned, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_announcement_course_created
    ON announcements(course_id, created_at DESC);

COMMENT ON TABLE announcements IS 'Course announcements visible to enrolled users';

-- ============================================================
-- SIS_IMPORT_RUNS
-- Final state: V16
-- ============================================================
CREATE TABLE sis_import_runs (
    id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    semester_code       VARCHAR(40)  NOT NULL,
    status              VARCHAR(30)  NOT NULL,
    requested_by        UUID         NOT NULL,
    valid               BOOLEAN      NOT NULL DEFAULT FALSE,
    preview_summary     JSONB        NOT NULL DEFAULT '{}'::jsonb,
    row_errors          JSONB        NOT NULL DEFAULT '[]'::jsonb,
    warnings            JSONB        NOT NULL DEFAULT '[]'::jsonb,
    change_set          JSONB        NOT NULL DEFAULT '[]'::jsonb,
    apply_report        JSONB        NOT NULL DEFAULT '{}'::jsonb,
    applied_at          TIMESTAMP,
    rollback_expires_at TIMESTAMP,
    rolled_back_at      TIMESTAMP,
    created_at          TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sis_import_runs_status     ON sis_import_runs(status);
CREATE INDEX IF NOT EXISTS idx_sis_import_runs_semester   ON sis_import_runs(semester_code);
CREATE INDEX IF NOT EXISTS idx_sis_import_runs_created_at ON sis_import_runs(created_at);

COMMENT ON TABLE sis_import_runs IS 'Stores SIS import preview/apply/rollback payloads for admin operations.';

-- ============================================================
-- SIS_AUDIT_LOGS
-- Final state: V16
-- ============================================================
CREATE TABLE sis_audit_logs (
    id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    import_run_id UUID         REFERENCES sis_import_runs(id) ON DELETE SET NULL,
    actor_id      UUID         NOT NULL,
    action        VARCHAR(60)  NOT NULL,
    entity_type   VARCHAR(60)  NOT NULL,
    entity_key    VARCHAR(180),
    details       JSONB        NOT NULL DEFAULT '{}'::jsonb,
    created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sis_audit_logs_import_run  ON sis_audit_logs(import_run_id);
CREATE INDEX IF NOT EXISTS idx_sis_audit_logs_action      ON sis_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_sis_audit_logs_entity_type ON sis_audit_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_sis_audit_logs_created_at  ON sis_audit_logs(created_at);

COMMENT ON TABLE sis_audit_logs IS 'Audit trail for SIS and bulk admin actions.';

-- ============================================================
-- COURSE_ARCHIVE_SNAPSHOTS
-- Final state: V18
-- ============================================================
CREATE TABLE course_archive_snapshots (
    id         UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id  UUID      NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    version    INTEGER   NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID      NOT NULL,
    payload    JSONB     NOT NULL DEFAULT '{}'::jsonb,
    CONSTRAINT uk_archive_course_version UNIQUE (course_id, version)
);

CREATE INDEX IF NOT EXISTS idx_archive_course_id  ON course_archive_snapshots(course_id);
CREATE INDEX IF NOT EXISTS idx_archive_created_at ON course_archive_snapshots(created_at);

COMMENT ON TABLE course_archive_snapshots IS 'Immutable course material snapshots captured when course is archived.';

-- ============================================================
-- INSTALLED_PLUGINS
-- Final state: V23 base + V24 jar_file_name + V25 runtime/process_port
-- ============================================================
CREATE TABLE installed_plugins (
    id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    plugin_id      VARCHAR(255) NOT NULL UNIQUE,
    name           VARCHAR(255) NOT NULL,
    version        VARCHAR(50)  NOT NULL,
    type           VARCHAR(50)  NOT NULL,
    author         VARCHAR(255),
    description    TEXT,
    permissions    JSONB        NOT NULL DEFAULT '[]',
    config         JSONB        NOT NULL DEFAULT '{}',
    status         VARCHAR(20)  NOT NULL DEFAULT 'ENABLED',
    jar_file_name  VARCHAR(255),
    runtime        VARCHAR(20)  DEFAULT 'java',
    process_port   INTEGER,
    installed_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    installed_by   UUID
);

CREATE INDEX IF NOT EXISTS idx_installed_plugins_status ON installed_plugins(status);
CREATE INDEX IF NOT EXISTS idx_installed_plugins_type   ON installed_plugins(type);

-- ============================================================
-- PLUGIN_EVENTS_LOG
-- Final state: V23
-- ============================================================
CREATE TABLE plugin_events_log (
    id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    plugin_id    VARCHAR(255) NOT NULL,
    event_type   VARCHAR(64)  NOT NULL,
    message      TEXT,
    details      JSONB,
    occurred_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    triggered_by UUID
);

CREATE INDEX IF NOT EXISTS idx_plugin_events_plugin_id   ON plugin_events_log(plugin_id);
CREATE INDEX IF NOT EXISTS idx_plugin_events_occurred_at ON plugin_events_log(occurred_at);

-- ============================================================
-- CONTENT_PROGRESS
-- Final state: V26
-- ============================================================
CREATE TABLE content_progress (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID        NOT NULL,
    course_id    UUID        NOT NULL,
    module_id    UUID        NOT NULL,
    content_type VARCHAR(30) NOT NULL,
    content_id   UUID        NOT NULL,
    completed_at TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, content_type, content_id)
);

CREATE INDEX IF NOT EXISTS idx_progress_user_course  ON content_progress(user_id, course_id);
CREATE INDEX IF NOT EXISTS idx_progress_user_module  ON content_progress(user_id, module_id);

COMMENT ON COLUMN content_progress.content_type IS 'MODULE_PAGE, RESOURCE, ASSIGNMENT, QUIZ, LESSON';

-- ============================================================
-- SEMINAR_ATTENDANCE
-- Final state: V26
-- ============================================================
CREATE TABLE seminar_attendance (
    id            UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID      NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    user_id       UUID      NOT NULL,
    attended      BOOLEAN   NOT NULL DEFAULT FALSE,
    marked_by     UUID      NOT NULL,
    marked_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    notes         TEXT,
    UNIQUE (assignment_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_attendance_assignment ON seminar_attendance(assignment_id);

-- ============================================================
-- LESSON_STEP_PROGRESS
-- Final state: V26
-- ============================================================
CREATE TABLE lesson_step_progress (
    id           UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID      NOT NULL,
    lesson_id    UUID      NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    step_id      UUID      NOT NULL REFERENCES lesson_content_blocks(id) ON DELETE CASCADE,
    completed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, step_id)
);

CREATE INDEX IF NOT EXISTS idx_step_progress_user_lesson ON lesson_step_progress(user_id, lesson_id);

COMMIT;
