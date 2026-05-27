# Database Schema Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the fragmented, inconsistent multi-service Flyway+Supabase dual-schema with a single clean Supabase-owned schema that all Java services read via `ddl-auto: validate`.

**Architecture:** Supabase migrations are the single source of truth. Java services disable Flyway and use `ddl-auto: validate`. Frontend accesses Supabase directly only for auth/profiles/safe reads; domain writes go through Java gateway.

**Tech Stack:** PostgreSQL 17 (Supabase), Spring Boot 3 + Hibernate 6, Next.js 14, Supabase CLI

---

## DATABASE AUDIT SUMMARY

### Critical bugs in current schema
| Issue | Tables | Impact |
|-------|--------|--------|
| BIGSERIAL/BIGINT PKs in UUID schema | `peer_reviews`, `deadlines`, `workload_snapshots` | JPA entities use `Long id`, FKs are type-incompatible |
| VARCHAR(36) PKs instead of UUID | `prompt_templates`, `ai_generation_logs`, `ai_user_usage`, `ai_prompt_ab_test` | Hibernate generates UUID-as-String; inconsistent with native UUID columns |
| Dual Flyway + Supabase schema management | `user-service V1`, `learning-service V1-V5`, `ai-service V1` | Same tables defined twice; race condition on fresh deploy |
| Missing FK constraints | `assignments.course_id`, `submissions.assignment_id/user_id`, `gradebook_*`, `quizzes.course_id`, 12 more | No referential integrity enforced |
| Auth fields in public.users | `password_hash`, `email_verification_token`, `password_reset_token`, `password_reset_expires` | Supabase Auth owns these; sync trigger copies just profile data |

### Tables to DROP
- `programs`, `learning_paths`, `path_steps` — no Java code exists; over-engineered
- `deadlines`, `workload_snapshots` — broken BIGSERIAL types; reference non-existent `student_groups`
- `installed_plugins`, `plugin_events_log` — plugin system disabled
- `marketplace_plugins`, `marketplace_plugin_versions`, `marketplace_reviews` — marketplace disabled

### Tables to ADD
- `notifications` — in frontend types but no DB table
- `audit_logs` — general-purpose audit; only SIS-specific audit exists
- `execution_runs` — VPL code execution tracking (currently only JSONB blob on submission)
- `execution_test_results` — per-test-case result rows

### Java packages to DELETE
- `services/learning-service/.../deadline/` (32 files) — entire deadline calendar/workload/websocket system references broken schema
- `services/learning-service/.../marketplace/` (15 files) — marketplace disabled

---

## File Map

### Supabase migrations (delete all 8, create 4)
- Delete: `supabase/migrations/20260518000000_users.sql` through `20260518007000_storage_buckets.sql`
- Create: `supabase/migrations/20260519100000_core_schema.sql`
- Create: `supabase/migrations/20260519100001_ai_schema.sql`
- Create: `supabase/migrations/20260519100002_rls_policies.sql`
- Create: `supabase/migrations/20260519100003_storage.sql`
- Create: `supabase/seed.sql`

### Java service configs (disable Flyway)
- Modify: `services/user-service/src/main/resources/application.yml`
- Modify: `services/learning-service/src/main/resources/application.yml`
- Modify: `services/ai-service/src/main/resources/application.yml`

### Java Flyway migration files (delete)
- Delete: `services/user-service/src/main/resources/db/migration/V1__init.sql`
- Delete: `services/learning-service/src/main/resources/db/migration/` (V1-V5)
- Delete: `services/ai-service/src/main/resources/db/migration/V1__init.sql`

### Java entities (update)
- Modify: `services/user-service/src/main/java/.../domain/User.java` — remove auth token fields
- Modify: `services/user-service/src/main/java/.../service/UserMapper.java` — remove auth token mappings
- Modify: `services/user-service/src/main/java/.../config/DataInitializer.java` — remove auth token usage
- Modify: `services/ai-service/src/main/java/.../domain/entity/AIGenerationLog.java` — String→UUID id
- Modify: `services/ai-service/src/main/java/.../domain/entity/AIUserUsage.java` — String→UUID id
- Modify: `services/ai-service/src/main/java/.../domain/entity/PromptTemplate.java` — String→UUID id
- Modify: `services/ai-service/src/main/java/.../domain/entity/PromptABTest.java` — String→UUID id
- Modify: `services/learning-service/src/main/java/.../assessment/domain/PeerReview.java` — Long→UUID
- Delete: `services/learning-service/src/main/java/.../deadline/` (entire package)
- Delete: `services/learning-service/src/main/java/.../marketplace/` (entire package)

### Frontend types (update)
- Modify: `apps/web/src/types/supabase.ts`
- Modify: `apps/web/src/types/index.ts`

### Documentation (update)
- Create: `docs/database.md`

---

## Task 1: Delete old Supabase migrations

**Files:**
- Delete: `supabase/migrations/20260518000000_users.sql`
- Delete: `supabase/migrations/20260518001000_learning.sql`
- Delete: `supabase/migrations/20260518002000_qr_attendance.sql`
- Delete: `supabase/migrations/20260518003000_vpl_autograding.sql`
- Delete: `supabase/migrations/20260518004000_ai.sql`
- Delete: `supabase/migrations/20260518005000_marketplace.sql`
- Delete: `supabase/migrations/20260518006000_supabase_auth_rls.sql`
- Delete: `supabase/migrations/20260518007000_storage_buckets.sql`

- [ ] **Step 1: Delete all 8 old migration files**

```bash
rm supabase/migrations/20260518000000_users.sql
rm supabase/migrations/20260518001000_learning.sql
rm supabase/migrations/20260518002000_qr_attendance.sql
rm supabase/migrations/20260518003000_vpl_autograding.sql
rm supabase/migrations/20260518004000_ai.sql
rm supabase/migrations/20260518005000_marketplace.sql
rm supabase/migrations/20260518006000_supabase_auth_rls.sql
rm supabase/migrations/20260518007000_storage_buckets.sql
```

Expected: All 8 files removed. `ls supabase/migrations/` shows empty or only the new files.

---

## Task 2: Create core schema migration

**Files:**
- Create: `supabase/migrations/20260519100000_core_schema.sql`

- [ ] **Step 1: Create the file with full core schema**

Create `supabase/migrations/20260519100000_core_schema.sql`:

```sql
-- 20260519100000_core_schema.sql
-- Clean baseline schema. DB is empty; replaces all previous migrations.
-- Naming: snake_case tables/columns, UUID PKs, timestamptz for all timestamps.

BEGIN;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- SHARED TRIGGER: updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
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
CREATE TABLE users (
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

CREATE INDEX idx_users_email       ON users(email);
CREATE INDEX idx_users_role        ON users(role);
CREATE INDEX idx_users_student_id  ON users(student_id);
CREATE INDEX idx_users_is_active   ON users(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_users_is_deleted  ON users(is_deleted) WHERE is_deleted = FALSE;

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
-- USER_API_KEYS
-- Encrypted AI provider keys (e.g. Groq) per user.
-- ============================================================
CREATE TABLE user_api_keys (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider      TEXT        NOT NULL DEFAULT 'GROQ',
    encrypted_key TEXT        NOT NULL,
    key_hint      TEXT        NOT NULL,
    is_active     BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_user_api_key_provider UNIQUE (user_id, provider)
);

CREATE INDEX idx_user_api_keys_user_id  ON user_api_keys(user_id);
CREATE INDEX idx_user_api_keys_provider ON user_api_keys(provider);

CREATE TRIGGER trg_user_api_keys_updated_at
    BEFORE UPDATE ON user_api_keys
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
-- COURSES
-- qr_attendance_enabled folded in from migration 002.
-- Both status and visibility kept (different semantics).
-- ============================================================
CREATE TABLE courses (
    id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    code                  TEXT        NOT NULL UNIQUE
                                      CHECK (length(trim(code)) > 0),
    title_uk              TEXT        NOT NULL
                                      CHECK (length(trim(title_uk)) > 0),
    title_en              TEXT        CHECK (title_en IS NULL OR length(trim(title_en)) > 0),
    description_uk        TEXT,
    description_en        TEXT,
    syllabus              TEXT,
    owner_id              UUID        NOT NULL REFERENCES users(id),
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

CREATE INDEX idx_courses_code          ON courses(code);
CREATE INDEX idx_courses_owner         ON courses(owner_id);
CREATE INDEX idx_courses_published     ON courses(is_published);
CREATE INDEX idx_courses_status        ON courses(status);
CREATE INDEX idx_courses_academic_year ON courses(academic_year);

CREATE TRIGGER trg_courses_updated_at
    BEFORE UPDATE ON courses
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
-- COURSE_MEMBERS
-- ============================================================
CREATE TABLE course_members (
    id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id         UUID        NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    user_id           UUID        NOT NULL REFERENCES users(id),
    role_in_course    TEXT        NOT NULL CHECK (role_in_course IN ('TEACHER','TA','STUDENT')),
    added_by          UUID        REFERENCES users(id),
    enrollment_status TEXT        NOT NULL DEFAULT 'active'
                                  CHECK (enrollment_status IN ('active','dropped','completed')),
    completion_date   TIMESTAMPTZ,
    final_grade       DECIMAL(5,2),
    added_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_course_member UNIQUE (course_id, user_id)
);

CREATE INDEX idx_course_members_course_user ON course_members(course_id, user_id);
CREATE INDEX idx_course_members_user        ON course_members(user_id);
CREATE INDEX idx_course_members_role        ON course_members(role_in_course);
CREATE INDEX idx_course_members_status      ON course_members(enrollment_status);

CREATE TRIGGER trg_course_members_updated_at
    BEFORE UPDATE ON course_members
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
-- MODULES
-- ============================================================
CREATE TABLE modules (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id    UUID        NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    title        TEXT        NOT NULL CHECK (length(trim(title)) > 0),
    description  TEXT,
    position     INTEGER     NOT NULL DEFAULT 0,
    content_meta JSONB       NOT NULL DEFAULT '{}',
    is_published BOOLEAN     NOT NULL DEFAULT FALSE,
    publish_date TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_modules_course_position ON modules(course_id, position);
CREATE INDEX idx_modules_published       ON modules(is_published);

CREATE TRIGGER trg_modules_updated_at
    BEFORE UPDATE ON modules
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
-- TOPICS
-- ============================================================
CREATE TABLE topics (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id   UUID        NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
    title       TEXT        NOT NULL,
    description TEXT,
    position    INTEGER     NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_topics_module_position ON topics(module_id, position);

CREATE TRIGGER trg_topics_updated_at
    BEFORE UPDATE ON topics
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
-- RESOURCES
-- ============================================================
CREATE TABLE resources (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id       UUID        NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
    topic_id        UUID        REFERENCES topics(id) ON DELETE SET NULL,
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

CREATE INDEX idx_resources_module   ON resources(module_id);
CREATE INDEX idx_resources_topic    ON resources(topic_id);
CREATE INDEX idx_resources_type     ON resources(resource_type);
CREATE INDEX idx_resources_position ON resources(module_id, position);

CREATE TRIGGER trg_resources_updated_at
    BEFORE UPDATE ON resources
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
-- LESSONS
-- ============================================================
CREATE TABLE lessons (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id       UUID        NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
    title           TEXT        NOT NULL,
    summary         TEXT,
    position        INTEGER     NOT NULL DEFAULT 0,
    content_meta    JSONB       NOT NULL DEFAULT '{}',
    is_ai_generated BOOLEAN     NOT NULL DEFAULT FALSE,
    is_published    BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_lessons_module_position ON lessons(module_id, position);
CREATE INDEX idx_lessons_published       ON lessons(is_published);

CREATE TRIGGER trg_lessons_updated_at
    BEFORE UPDATE ON lessons
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
-- LESSON_CONTENT_BLOCKS
-- ============================================================
CREATE TABLE lesson_content_blocks (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id       UUID        NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
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

CREATE INDEX idx_lesson_content_blocks_lesson_pos ON lesson_content_blocks(lesson_id, position);
CREATE INDEX idx_lesson_content_blocks_type       ON lesson_content_blocks(block_type);

CREATE TRIGGER trg_lesson_content_blocks_updated_at
    BEFORE UPDATE ON lesson_content_blocks
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
-- LESSON_OBJECTIVES
-- ============================================================
CREATE TABLE lesson_objectives (
    id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id      UUID        NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    objective_text TEXT        NOT NULL,
    position       INTEGER     NOT NULL DEFAULT 0,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_lesson_objectives_lesson_pos ON lesson_objectives(lesson_id, position);

-- ============================================================
-- QUIZZES
-- Added FK: course_id → courses, created_by → users
-- ============================================================
CREATE TABLE quizzes (
    id                        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id                 UUID        NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
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
    created_by                UUID        NOT NULL REFERENCES users(id),
    created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_quizzes_course     ON quizzes(course_id);
CREATE INDEX idx_quizzes_created_by ON quizzes(created_by);

CREATE TRIGGER trg_quizzes_updated_at
    BEFORE UPDATE ON quizzes
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
-- QUESTION_BANK
-- Added FK: course_id → courses, created_by → users
-- ============================================================
CREATE TABLE question_bank (
    id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id      UUID        REFERENCES courses(id) ON DELETE SET NULL,
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
    created_by     UUID        NOT NULL REFERENCES users(id),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_question_bank_course     ON question_bank(course_id);
CREATE INDEX idx_question_bank_type       ON question_bank(question_type);
CREATE INDEX idx_question_bank_created_by ON question_bank(created_by);
CREATE INDEX idx_question_bank_topic      ON question_bank(topic);
CREATE INDEX idx_question_bank_difficulty ON question_bank(difficulty);

CREATE TRIGGER trg_question_bank_updated_at
    BEFORE UPDATE ON question_bank
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
-- QUESTION_BANK_VERSIONS
-- ============================================================
CREATE TABLE question_bank_versions (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id      UUID        NOT NULL REFERENCES question_bank(id) ON DELETE CASCADE,
    version_number   INTEGER     NOT NULL,
    prompt_doc_json  JSONB       NOT NULL,
    payload_jsonb    JSONB       NOT NULL DEFAULT '{}',
    answer_key_jsonb JSONB       NOT NULL DEFAULT '{}',
    created_by       UUID        NOT NULL REFERENCES users(id),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_question_version UNIQUE (question_id, version_number)
);

CREATE INDEX idx_question_bank_versions_question ON question_bank_versions(question_id, version_number DESC);

-- ============================================================
-- QUIZ_SECTIONS
-- ============================================================
CREATE TABLE quiz_sections (
    id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id        UUID        NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    title          TEXT        NOT NULL,
    position       INTEGER     NOT NULL DEFAULT 0,
    question_count INTEGER     NOT NULL DEFAULT 0,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_quiz_sections_quiz_pos ON quiz_sections(quiz_id, position);

-- ============================================================
-- QUIZ_SECTION_RULES
-- ============================================================
CREATE TABLE quiz_section_rules (
    id            UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    section_id    UUID    NOT NULL REFERENCES quiz_sections(id) ON DELETE CASCADE,
    question_type TEXT,
    difficulty    TEXT,
    tag           TEXT,
    quota         INTEGER NOT NULL DEFAULT 1,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_quiz_section_rule_has_selector
        CHECK (question_type IS NOT NULL OR difficulty IS NOT NULL OR tag IS NOT NULL)
);

CREATE INDEX idx_quiz_section_rules_section ON quiz_section_rules(section_id);

-- ============================================================
-- QUIZ_QUESTIONS
-- ============================================================
CREATE TABLE quiz_questions (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id         UUID        NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    question_id     UUID        NOT NULL REFERENCES question_bank(id) ON DELETE CASCADE,
    position        INTEGER     NOT NULL DEFAULT 0,
    points_override DECIMAL(6,2),
    CONSTRAINT uq_quiz_question UNIQUE (quiz_id, question_id)
);

CREATE INDEX idx_quiz_questions_quiz     ON quiz_questions(quiz_id);
CREATE INDEX idx_quiz_questions_position ON quiz_questions(quiz_id, position);

-- ============================================================
-- QUIZ_ATTEMPTS
-- Added FK: user_id → users
-- ============================================================
CREATE TABLE quiz_attempts (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id             UUID        NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    user_id             UUID        NOT NULL REFERENCES users(id),
    attempt_number      INTEGER     NOT NULL DEFAULT 1,
    started_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    submitted_at        TIMESTAMPTZ,
    answers             JSONB       NOT NULL DEFAULT '{}',
    auto_score          DECIMAL(6,2),
    manual_score        DECIMAL(6,2),
    final_score         DECIMAL(6,2),
    graded_by           UUID        REFERENCES users(id),
    graded_at           TIMESTAMPTZ,
    feedback            TEXT,
    ip_address          INET,
    browser_fingerprint TEXT,
    proctoring_data     JSONB       NOT NULL DEFAULT '{}',
    CONSTRAINT uq_quiz_user_attempt UNIQUE (quiz_id, user_id, attempt_number)
);

CREATE INDEX idx_quiz_attempts_quiz    ON quiz_attempts(quiz_id);
CREATE INDEX idx_quiz_attempts_user    ON quiz_attempts(user_id);
CREATE INDEX idx_quiz_attempts_started ON quiz_attempts(started_at);

-- ============================================================
-- QUIZ_ATTEMPT_QUESTIONS
-- ============================================================
CREATE TABLE quiz_attempt_questions (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id          UUID        NOT NULL REFERENCES quiz_attempts(id) ON DELETE CASCADE,
    question_id         UUID        NOT NULL REFERENCES question_bank(id),
    question_version_id UUID        REFERENCES question_bank_versions(id),
    position            INTEGER     NOT NULL DEFAULT 0,
    prompt_snapshot     JSONB       NOT NULL,
    payload_snapshot    JSONB       NOT NULL DEFAULT '{}',
    answer_key_snapshot JSONB       NOT NULL DEFAULT '{}',
    points              DECIMAL(6,2) NOT NULL DEFAULT 1.00,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_attempt_question_pos UNIQUE (attempt_id, position)
);

CREATE INDEX idx_quiz_attempt_questions_attempt  ON quiz_attempt_questions(attempt_id, position);
CREATE INDEX idx_quiz_attempt_questions_question ON quiz_attempt_questions(question_id);

-- ============================================================
-- QUIZ_RESPONSES
-- ============================================================
CREATE TABLE quiz_responses (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id          UUID        NOT NULL REFERENCES quiz_attempts(id) ON DELETE CASCADE,
    attempt_question_id UUID        NOT NULL REFERENCES quiz_attempt_questions(id) ON DELETE CASCADE,
    response_jsonb      JSONB       NOT NULL DEFAULT '{}',
    is_correct          BOOLEAN,
    score_awarded       DECIMAL(6,2),
    feedback            TEXT,
    graded_at           TIMESTAMPTZ,
    CONSTRAINT uq_quiz_response_attempt_question UNIQUE (attempt_question_id)
);

CREATE INDEX idx_quiz_responses_attempt ON quiz_responses(attempt_id);

-- ============================================================
-- ASSIGNMENTS
-- Fixed: Added FK course_id → courses, module_id → modules.
-- Fixed: assignment_type CHECK includes VIRTUAL_LAB.
-- vpl_config folded in from migration 003.
-- ============================================================
CREATE TABLE assignments (
    id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id            UUID        NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    module_id            UUID        REFERENCES modules(id) ON DELETE SET NULL,
    topic_id             UUID        REFERENCES topics(id) ON DELETE SET NULL,
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
    quiz_id              UUID        REFERENCES quizzes(id) ON DELETE SET NULL,
    external_tool_url    TEXT,
    external_tool_config JSONB       NOT NULL DEFAULT '{}',
    grade_anonymously    BOOLEAN     NOT NULL DEFAULT FALSE,
    peer_review_enabled  BOOLEAN     NOT NULL DEFAULT FALSE,
    peer_reviews_required INTEGER    NOT NULL DEFAULT 0,
    estimated_duration   INTEGER,
    is_template          BOOLEAN     NOT NULL DEFAULT FALSE,
    is_archived          BOOLEAN     NOT NULL DEFAULT FALSE,
    is_published         BOOLEAN     NOT NULL DEFAULT FALSE,
    original_assignment_id UUID      REFERENCES assignments(id) ON DELETE SET NULL,
    created_by           UUID        NOT NULL REFERENCES users(id),
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_assignments_course      ON assignments(course_id);
CREATE INDEX idx_assignments_module      ON assignments(module_id);
CREATE INDEX idx_assignments_type        ON assignments(assignment_type);
CREATE INDEX idx_assignments_published   ON assignments(is_published);
CREATE INDEX idx_assignments_due_date    ON assignments(due_date);
CREATE INDEX idx_assignments_created_by  ON assignments(created_by);
CREATE INDEX idx_assignments_topic       ON assignments(topic_id);

CREATE TRIGGER trg_assignments_updated_at
    BEFORE UPDATE ON assignments
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
-- VPL_TEST_CASES
-- ============================================================
CREATE TABLE vpl_test_cases (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id   UUID        NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
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

CREATE INDEX idx_vpl_test_cases_assignment ON vpl_test_cases(assignment_id, position);

-- ============================================================
-- PEER_REVIEWS
-- FIXED: Was BIGSERIAL/BIGINT, now UUID throughout.
-- ============================================================
CREATE TABLE peer_reviews (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id    UUID        NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    reviewer_user_id UUID        NOT NULL REFERENCES users(id),
    reviewee_user_id UUID        NOT NULL REFERENCES users(id),
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

CREATE INDEX idx_peer_reviews_assignment  ON peer_reviews(assignment_id);
CREATE INDEX idx_peer_reviews_reviewer    ON peer_reviews(reviewer_user_id);
CREATE INDEX idx_peer_reviews_reviewee    ON peer_reviews(reviewee_user_id);
CREATE INDEX idx_peer_reviews_submission  ON peer_reviews(submission_id);
CREATE INDEX idx_peer_reviews_status      ON peer_reviews(status);

CREATE TRIGGER trg_peer_reviews_updated_at
    BEFORE UPDATE ON peer_reviews
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
-- SUBMISSIONS
-- FIXED: Added FK assignment_id → assignments, user_id → users.
-- auto_grade_result kept as cached summary JSONB.
-- ============================================================
CREATE TABLE submissions (
    id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id        UUID        NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    user_id              UUID        NOT NULL REFERENCES users(id),
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
    published_by         UUID        REFERENCES users(id),
    feedback             TEXT,
    is_late              BOOLEAN     NOT NULL DEFAULT FALSE,
    days_late            INTEGER     NOT NULL DEFAULT 0,
    submitted_at         TIMESTAMPTZ,
    graded_at            TIMESTAMPTZ,
    grader_id            UUID        REFERENCES users(id),
    review_started_at    TIMESTAMPTZ,
    last_resubmitted_at  TIMESTAMPTZ,
    submission_version   INTEGER     NOT NULL DEFAULT 1,
    version              BIGINT      NOT NULL DEFAULT 0,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_submission_assignment_user UNIQUE (assignment_id, user_id)
);

CREATE INDEX idx_submissions_assignment        ON submissions(assignment_id);
CREATE INDEX idx_submissions_user              ON submissions(user_id);
CREATE INDEX idx_submissions_status            ON submissions(status);
CREATE INDEX idx_submissions_submitted_at      ON submissions(submitted_at);
CREATE INDEX idx_submissions_assignment_status ON submissions(assignment_id, status, updated_at DESC);

CREATE TRIGGER trg_submissions_updated_at
    BEFORE UPDATE ON submissions
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
-- SUBMISSION_FILES
-- ============================================================
CREATE TABLE submission_files (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID        NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
    filename      TEXT        NOT NULL,
    file_url      TEXT        NOT NULL,
    storage_path  TEXT        NOT NULL,
    content_type  TEXT,
    file_size     BIGINT      NOT NULL,
    uploaded_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_submission_files_submission ON submission_files(submission_id);

-- ============================================================
-- SUBMISSION_COMMENTS
-- Added FK: author_id → users
-- ============================================================
CREATE TABLE submission_comments (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID        NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
    author_id     UUID        NOT NULL REFERENCES users(id),
    author_name   TEXT,
    author_email  TEXT,
    comment       TEXT        NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_submission_comments_submission ON submission_comments(submission_id);
CREATE INDEX idx_submission_comments_created    ON submission_comments(created_at);

-- ============================================================
-- SUBMISSION_GRADE_AUDIT
-- ============================================================
CREATE TABLE submission_grade_audit (
    id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id      UUID        NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
    changed_by         UUID        NOT NULL REFERENCES users(id),
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
    ON submission_grade_audit(submission_id, changed_at DESC);

-- ============================================================
-- AI_FEEDBACK_ENTRIES
-- ============================================================
CREATE TABLE ai_feedback_entries (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id   UUID        NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    submission_id   UUID        NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
    attempt_number  INTEGER     NOT NULL DEFAULT 1,
    raw_feedback    TEXT        NOT NULL,
    feedback_format TEXT        NOT NULL DEFAULT 'MARKDOWN'
                                CHECK (feedback_format IN ('PLAIN','MARKDOWN','HTML','RICH')),
    model_name      TEXT        NOT NULL,
    model_version   TEXT,
    model_hash      TEXT,
    model_metadata  JSONB       NOT NULL DEFAULT '{}',
    created_by      UUID        REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ai_feedback_entries_assignment  ON ai_feedback_entries(assignment_id);
CREATE INDEX idx_ai_feedback_entries_submission  ON ai_feedback_entries(submission_id);
CREATE INDEX idx_ai_feedback_entries_created_at  ON ai_feedback_entries(created_at);

-- ============================================================
-- REVISION_FEEDBACK_THREADS
-- Added FK: submission_id → submissions, student_id → users
-- ============================================================
CREATE TABLE revision_feedback_threads (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID        NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    submission_id UUID        NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
    student_id    UUID        NOT NULL REFERENCES users(id),
    status        TEXT        NOT NULL DEFAULT 'OPEN'
                              CHECK (status IN ('OPEN','RESOLVED','CLOSED')),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_revision_threads_assignment ON revision_feedback_threads(assignment_id);
CREATE INDEX idx_revision_threads_submission ON revision_feedback_threads(submission_id);
CREATE INDEX idx_revision_threads_student    ON revision_feedback_threads(student_id);

CREATE TRIGGER trg_revision_feedback_threads_updated_at
    BEFORE UPDATE ON revision_feedback_threads
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
-- REVISION_FEEDBACK_MESSAGES
-- ============================================================
CREATE TABLE revision_feedback_messages (
    id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id      UUID        NOT NULL REFERENCES revision_feedback_threads(id) ON DELETE CASCADE,
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

CREATE INDEX idx_revision_messages_thread     ON revision_feedback_messages(thread_id);
CREATE INDEX idx_revision_messages_created_at ON revision_feedback_messages(created_at);

-- ============================================================
-- GRADEBOOK_CATEGORIES
-- Added FK: course_id → courses
-- ============================================================
CREATE TABLE gradebook_categories (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id   UUID        NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    name        TEXT        NOT NULL,
    description TEXT,
    weight      DECIMAL(5,2) NOT NULL DEFAULT 0,
    drop_lowest INTEGER     NOT NULL DEFAULT 0,
    position    INTEGER     NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_gradebook_category_course_name UNIQUE (course_id, name)
);

CREATE INDEX idx_gradebook_categories_course ON gradebook_categories(course_id);

CREATE TRIGGER trg_gradebook_categories_updated_at
    BEFORE UPDATE ON gradebook_categories
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
-- GRADEBOOK_ENTRIES
-- FIXED: Added FKs course_id → courses, student_id → users,
--   assignment_id → assignments, submission_id → submissions.
-- ============================================================
CREATE TABLE gradebook_entries (
    id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id      UUID        NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    student_id     UUID        NOT NULL REFERENCES users(id),
    assignment_id  UUID        REFERENCES assignments(id) ON DELETE SET NULL,
    submission_id  UUID        REFERENCES submissions(id) ON DELETE SET NULL,
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
    override_by    UUID        REFERENCES users(id),
    override_at    TIMESTAMPTZ,
    override_reason TEXT,
    graded_at      TIMESTAMPTZ,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_gradebook_entry_course_student_assignment
        UNIQUE (course_id, student_id, assignment_id)
);

CREATE INDEX idx_gradebook_entries_course_student ON gradebook_entries(course_id, student_id);
CREATE INDEX idx_gradebook_entries_status         ON gradebook_entries(status);
CREATE INDEX idx_gradebook_entries_graded_at      ON gradebook_entries(graded_at);

CREATE TRIGGER trg_gradebook_entries_updated_at
    BEFORE UPDATE ON gradebook_entries
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
-- GRADE_HISTORIES
-- ============================================================
CREATE TABLE grade_histories (
    id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    gradebook_entry_id UUID        NOT NULL REFERENCES gradebook_entries(id) ON DELETE CASCADE,
    old_score          DECIMAL(6,2),
    new_score          DECIMAL(6,2),
    changed_by         UUID        REFERENCES users(id),
    change_reason      TEXT,
    changed_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_grade_histories_entry      ON grade_histories(gradebook_entry_id);
CREATE INDEX idx_grade_histories_changed_at ON grade_histories(changed_at);

-- ============================================================
-- COURSE_GRADE_SUMMARIES
-- FIXED: Added FKs course_id → courses, student_id → users
-- ============================================================
CREATE TABLE course_grade_summaries (
    id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id             UUID        NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    student_id            UUID        NOT NULL REFERENCES users(id),
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

CREATE INDEX idx_course_grade_summaries_course_student ON course_grade_summaries(course_id, student_id);

-- ============================================================
-- MODULE_PAGES
-- ============================================================
CREATE TABLE module_pages (
    id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id               UUID        NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
    parent_page_id          UUID        REFERENCES module_pages(id) ON DELETE CASCADE,
    title                   TEXT        NOT NULL,
    slug                    TEXT        NOT NULL,
    position                INTEGER     NOT NULL DEFAULT 0,
    is_published            BOOLEAN     NOT NULL DEFAULT FALSE,
    has_unpublished_changes BOOLEAN     NOT NULL DEFAULT FALSE,
    created_by              UUID        NOT NULL REFERENCES users(id),
    updated_by              UUID        NOT NULL REFERENCES users(id),
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_module_page_slug UNIQUE (module_id, slug)
);

CREATE INDEX idx_module_pages_module_parent_pos ON module_pages(module_id, parent_page_id, position);
CREATE INDEX idx_module_pages_module_published  ON module_pages(module_id, is_published);

CREATE TRIGGER trg_module_pages_updated_at
    BEFORE UPDATE ON module_pages
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
-- PAGE_DOCUMENTS
-- ============================================================
CREATE TABLE page_documents (
    page_id        UUID        PRIMARY KEY REFERENCES module_pages(id) ON DELETE CASCADE,
    doc_json       JSONB       NOT NULL,
    schema_version INTEGER     NOT NULL DEFAULT 1,
    doc_hash       TEXT        NOT NULL,
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PAGE_PUBLISHED_DOCUMENTS
-- ============================================================
CREATE TABLE page_published_documents (
    page_id        UUID        PRIMARY KEY REFERENCES module_pages(id) ON DELETE CASCADE,
    doc_json       JSONB       NOT NULL,
    schema_version INTEGER     NOT NULL DEFAULT 1,
    doc_hash       TEXT        NOT NULL,
    published_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    published_by   UUID        NOT NULL REFERENCES users(id)
);

-- ============================================================
-- ASSIGNMENT_TEMPLATE_DOCUMENTS
-- ============================================================
CREATE TABLE assignment_template_documents (
    assignment_id  UUID        PRIMARY KEY REFERENCES assignments(id) ON DELETE CASCADE,
    doc_json       JSONB       NOT NULL,
    schema_version INTEGER     NOT NULL DEFAULT 1,
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by     UUID        NOT NULL REFERENCES users(id)
);

-- ============================================================
-- SUBMISSION_DOCUMENTS
-- ============================================================
CREATE TABLE submission_documents (
    submission_id  UUID        PRIMARY KEY REFERENCES submissions(id) ON DELETE CASCADE,
    doc_json       JSONB       NOT NULL,
    schema_version INTEGER     NOT NULL DEFAULT 1,
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PAGE_CITATIONS
-- ============================================================
CREATE TABLE page_citations (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    page_id       UUID        NOT NULL REFERENCES module_pages(id) ON DELETE CASCADE,
    block_id      TEXT,
    author        TEXT,
    title         TEXT,
    year          INTEGER,
    url           TEXT,
    citation_type TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_page_citations_page ON page_citations(page_id);

-- ============================================================
-- PAGE_FOOTNOTES
-- ============================================================
CREATE TABLE page_footnotes (
    id           UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    page_id      UUID    NOT NULL REFERENCES module_pages(id) ON DELETE CASCADE,
    footnote_key TEXT    NOT NULL,
    ordinal      INTEGER NOT NULL,
    content_json JSONB   NOT NULL DEFAULT '{}',
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_page_footnote_key UNIQUE (page_id, footnote_key)
);

CREATE INDEX idx_page_footnotes_page    ON page_footnotes(page_id);
CREATE INDEX idx_page_footnotes_ordinal ON page_footnotes(page_id, ordinal);

-- ============================================================
-- EDITOR_MEDIA
-- ============================================================
CREATE TABLE editor_media (
    id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    stored_filename   TEXT        NOT NULL UNIQUE,
    original_filename TEXT        NOT NULL,
    storage_path      TEXT        NOT NULL,
    content_type      TEXT        NOT NULL,
    file_size         BIGINT      NOT NULL,
    uploaded_by       UUID        NOT NULL REFERENCES users(id),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_editor_media_uploaded_by ON editor_media(uploaded_by, created_at DESC);

-- ============================================================
-- ANNOUNCEMENTS
-- ============================================================
CREATE TABLE announcements (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id  UUID        NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    title      TEXT        NOT NULL,
    content    TEXT        NOT NULL,
    is_pinned  BOOLEAN     NOT NULL DEFAULT FALSE,
    created_by UUID        NOT NULL REFERENCES users(id),
    updated_by UUID        REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_announcements_course_order
    ON announcements(course_id, is_pinned, created_at DESC);

CREATE TRIGGER trg_announcements_updated_at
    BEFORE UPDATE ON announcements
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
-- SIS_IMPORT_RUNS
-- ============================================================
CREATE TABLE sis_import_runs (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    semester_code       TEXT        NOT NULL,
    status              TEXT        NOT NULL,
    requested_by        UUID        NOT NULL REFERENCES users(id),
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

CREATE INDEX idx_sis_import_runs_status     ON sis_import_runs(status);
CREATE INDEX idx_sis_import_runs_semester   ON sis_import_runs(semester_code);
CREATE INDEX idx_sis_import_runs_created_at ON sis_import_runs(created_at);

CREATE TRIGGER trg_sis_import_runs_updated_at
    BEFORE UPDATE ON sis_import_runs
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
-- SIS_AUDIT_LOGS
-- ============================================================
CREATE TABLE sis_audit_logs (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    import_run_id UUID        REFERENCES sis_import_runs(id) ON DELETE SET NULL,
    actor_id      UUID        NOT NULL REFERENCES users(id),
    action        TEXT        NOT NULL,
    entity_type   TEXT        NOT NULL,
    entity_key    TEXT,
    details       JSONB       NOT NULL DEFAULT '{}',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sis_audit_logs_import_run  ON sis_audit_logs(import_run_id);
CREATE INDEX idx_sis_audit_logs_actor       ON sis_audit_logs(actor_id);
CREATE INDEX idx_sis_audit_logs_action      ON sis_audit_logs(action);
CREATE INDEX idx_sis_audit_logs_entity_type ON sis_audit_logs(entity_type);
CREATE INDEX idx_sis_audit_logs_created_at  ON sis_audit_logs(created_at);

-- ============================================================
-- COURSE_ARCHIVE_SNAPSHOTS
-- ============================================================
CREATE TABLE course_archive_snapshots (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id  UUID        NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    version    INTEGER     NOT NULL,
    created_by UUID        NOT NULL REFERENCES users(id),
    payload    JSONB       NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_archive_course_version UNIQUE (course_id, version)
);

CREATE INDEX idx_course_archive_snapshots_course ON course_archive_snapshots(course_id);
CREATE INDEX idx_course_archive_snapshots_created ON course_archive_snapshots(created_at);

-- ============================================================
-- CONTENT_PROGRESS
-- FIXED: Added FKs user_id → users, course_id → courses, module_id → modules
-- ============================================================
CREATE TABLE content_progress (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id    UUID        NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    module_id    UUID        NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
    content_type TEXT        NOT NULL
                             CHECK (content_type IN ('MODULE_PAGE','RESOURCE','ASSIGNMENT','QUIZ','LESSON')),
    content_id   UUID        NOT NULL,
    completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_content_progress UNIQUE (user_id, content_type, content_id)
);

CREATE INDEX idx_content_progress_user_course ON content_progress(user_id, course_id);
CREATE INDEX idx_content_progress_user_module ON content_progress(user_id, module_id);

-- ============================================================
-- SEMINAR_ATTENDANCE
-- FIXED: Added FK user_id → users, marked_by → users
-- ============================================================
CREATE TABLE seminar_attendance (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID        NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    user_id       UUID        NOT NULL REFERENCES users(id),
    attended      BOOLEAN     NOT NULL DEFAULT FALSE,
    marked_by     UUID        NOT NULL REFERENCES users(id),
    marked_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    notes         TEXT,
    CONSTRAINT uq_seminar_attendance UNIQUE (assignment_id, user_id)
);

CREATE INDEX idx_seminar_attendance_assignment ON seminar_attendance(assignment_id);
CREATE INDEX idx_seminar_attendance_user       ON seminar_attendance(user_id);

-- ============================================================
-- LESSON_STEP_PROGRESS
-- FIXED: Added FK user_id → users
-- ============================================================
CREATE TABLE lesson_step_progress (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    lesson_id    UUID        NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    step_id      UUID        NOT NULL REFERENCES lesson_content_blocks(id) ON DELETE CASCADE,
    completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_lesson_step_progress UNIQUE (user_id, step_id)
);

CREATE INDEX idx_lesson_step_progress_user_lesson ON lesson_step_progress(user_id, lesson_id);

-- ============================================================
-- ATTENDANCE_QR_TOKENS
-- ============================================================
CREATE TABLE attendance_qr_tokens (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID        NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    token         TEXT        NOT NULL UNIQUE,
    expires_at    TIMESTAMPTZ NOT NULL,
    created_by    UUID        NOT NULL REFERENCES users(id),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_attendance_qr_tokens_assignment ON attendance_qr_tokens(assignment_id);
CREATE INDEX idx_attendance_qr_tokens_token      ON attendance_qr_tokens(token);

-- ============================================================
-- NOTIFICATIONS  (NEW)
-- ============================================================
CREATE TABLE notifications (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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

CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX idx_notifications_user        ON notifications(user_id, created_at DESC);

-- ============================================================
-- AUDIT_LOGS  (NEW)
-- General-purpose immutable audit trail for all domain actions.
-- ============================================================
CREATE TABLE audit_logs (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id    UUID        REFERENCES users(id) ON DELETE SET NULL,
    action      TEXT        NOT NULL,
    entity_type TEXT        NOT NULL,
    entity_id   TEXT,
    details     JSONB       NOT NULL DEFAULT '{}',
    ip_address  INET,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_actor       ON audit_logs(actor_id);
CREATE INDEX idx_audit_logs_entity      ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created_at  ON audit_logs(created_at DESC);

-- ============================================================
-- EXECUTION_RUNS  (NEW)
-- Tracks each VPL code execution request from execution-service.
-- ============================================================
CREATE TABLE execution_runs (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID        REFERENCES submissions(id) ON DELETE CASCADE,
    assignment_id UUID        NOT NULL REFERENCES assignments(id),
    user_id       UUID        NOT NULL REFERENCES users(id),
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

CREATE INDEX idx_execution_runs_submission  ON execution_runs(submission_id);
CREATE INDEX idx_execution_runs_assignment  ON execution_runs(assignment_id);
CREATE INDEX idx_execution_runs_user        ON execution_runs(user_id);
CREATE INDEX idx_execution_runs_status      ON execution_runs(status);
CREATE INDEX idx_execution_runs_created_at  ON execution_runs(created_at DESC);

-- ============================================================
-- EXECUTION_TEST_RESULTS  (NEW)
-- Per-test-case result rows for each execution run.
-- ============================================================
CREATE TABLE execution_test_results (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id          UUID        NOT NULL REFERENCES execution_runs(id) ON DELETE CASCADE,
    test_case_id    UUID        REFERENCES vpl_test_cases(id) ON DELETE SET NULL,
    name            TEXT        NOT NULL,
    passed          BOOLEAN     NOT NULL,
    expected_output TEXT,
    actual_output   TEXT,
    points_awarded  DECIMAL(6,2),
    error_message   TEXT,
    position        INTEGER     NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_execution_test_results_run ON execution_test_results(run_id);

COMMIT;
```

- [ ] **Step 2: Verify file was created**

```bash
wc -l supabase/migrations/20260519100000_core_schema.sql
```

Expected: ~700 lines.

---

## Task 3: Create AI schema migration

**Files:**
- Create: `supabase/migrations/20260519100001_ai_schema.sql`

- [ ] **Step 1: Create the file**

Create `supabase/migrations/20260519100001_ai_schema.sql`:

```sql
-- 20260519100001_ai_schema.sql
-- AI tables. FIXED: All PKs changed from VARCHAR(36) to native UUID.

BEGIN;

CREATE TABLE ai_course_templates (
    id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name           TEXT        NOT NULL,
    description    TEXT,
    category       TEXT        NOT NULL,
    prompt_template TEXT       NOT NULL,
    is_public      BOOLEAN     NOT NULL DEFAULT TRUE,
    is_active      BOOLEAN     NOT NULL DEFAULT TRUE,
    created_by     UUID        REFERENCES users(id) ON DELETE SET NULL,
    usage_count    INTEGER     NOT NULL DEFAULT 0,
    average_rating DECIMAL(3,2) NOT NULL DEFAULT 0.0,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ai_course_templates_category ON ai_course_templates(category);
CREATE INDEX idx_ai_course_templates_active   ON ai_course_templates(is_active);
CREATE INDEX idx_ai_course_templates_public   ON ai_course_templates(is_public);

CREATE TABLE template_variables (
    template_id    UUID NOT NULL REFERENCES ai_course_templates(id) ON DELETE CASCADE,
    variable_name  TEXT NOT NULL,
    default_value  TEXT,
    PRIMARY KEY (template_id, variable_name)
);

CREATE TABLE template_options (
    template_id  UUID NOT NULL REFERENCES ai_course_templates(id) ON DELETE CASCADE,
    option_key   TEXT NOT NULL,
    option_value TEXT,
    PRIMARY KEY (template_id, option_key)
);

-- FIXED: id is now UUID (was VARCHAR(36))
CREATE TABLE prompt_templates (
    id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name                 TEXT        NOT NULL UNIQUE,
    description          TEXT,
    system_prompt        TEXT        NOT NULL,
    user_prompt_template TEXT        NOT NULL,
    version              INTEGER     NOT NULL DEFAULT 0,
    active               BOOLEAN     NOT NULL DEFAULT TRUE,
    category             TEXT        NOT NULL DEFAULT 'general',
    preferred_model      TEXT,
    temperature          DECIMAL(3,2) DEFAULT 0.7,
    max_tokens           INTEGER     DEFAULT 4000,
    modified_by          TEXT,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_prompt_templates_name_active ON prompt_templates(name, active);
CREATE INDEX idx_prompt_templates_category    ON prompt_templates(category);

-- FIXED: id is now UUID (was VARCHAR(36)); user_id is now UUID (was VARCHAR(36))
CREATE TABLE ai_generation_logs (
    id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    content_type         TEXT        NOT NULL,
    prompt_template_name TEXT,
    provider             TEXT        NOT NULL,
    model                TEXT,
    prompt_tokens        INTEGER     NOT NULL DEFAULT 0,
    completion_tokens    INTEGER     NOT NULL DEFAULT 0,
    latency_ms           BIGINT      NOT NULL DEFAULT 0,
    success              BOOLEAN     NOT NULL DEFAULT TRUE,
    error_message        TEXT,
    user_id              UUID        REFERENCES users(id) ON DELETE SET NULL,
    course_id            UUID        REFERENCES courses(id) ON DELETE SET NULL,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ai_generation_logs_user    ON ai_generation_logs(user_id);
CREATE INDEX idx_ai_generation_logs_created ON ai_generation_logs(created_at);
CREATE INDEX idx_ai_generation_logs_type    ON ai_generation_logs(content_type);

-- FIXED: id is now UUID (was VARCHAR(36)); user_id is now UUID (was VARCHAR(36))
CREATE TABLE ai_user_usage (
    id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id              UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    usage_period         TEXT        NOT NULL, -- YYYY-MM format
    prompt_tokens        BIGINT      NOT NULL DEFAULT 0,
    completion_tokens    BIGINT      NOT NULL DEFAULT 0,
    total_tokens         BIGINT      NOT NULL DEFAULT 0,
    request_count        INTEGER     NOT NULL DEFAULT 0,
    failed_request_count INTEGER     NOT NULL DEFAULT 0,
    estimated_cost_usd   DECIMAL(10,6) NOT NULL DEFAULT 0,
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_ai_user_usage_user_period UNIQUE (user_id, usage_period)
);

CREATE INDEX idx_ai_user_usage_user_period ON ai_user_usage(user_id, usage_period);
CREATE INDEX idx_ai_user_usage_period      ON ai_user_usage(usage_period);

-- FIXED: id is now UUID (was VARCHAR(36)); user_id is now UUID (was VARCHAR(36))
CREATE TABLE ai_prompt_ab_test (
    id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    experiment_name      TEXT        NOT NULL,
    variant_name         TEXT        NOT NULL,
    prompt_template_name TEXT        NOT NULL,
    user_id              UUID        REFERENCES users(id) ON DELETE SET NULL,
    success              BOOLEAN     NOT NULL,
    latency_ms           BIGINT,
    total_tokens         INTEGER,
    quality_score        INTEGER,
    user_rating          INTEGER,
    metadata             JSONB,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ai_prompt_ab_test_experiment ON ai_prompt_ab_test(experiment_name);
CREATE INDEX idx_ai_prompt_ab_test_variant    ON ai_prompt_ab_test(variant_name);
CREATE INDEX idx_ai_prompt_ab_test_created    ON ai_prompt_ab_test(created_at);

-- Seed: default prompt templates
INSERT INTO prompt_templates (name, description, system_prompt, user_prompt_template, category, temperature, max_tokens)
VALUES
(
    'course.generation.default',
    'Default course generation prompt',
    'You are an expert educational content creator. Create well-structured, engaging course content that follows pedagogical best practices.',
    'Create a comprehensive course about: {{topic}}

Level: {{level}}
Target audience: {{audience}}
Duration: {{duration}}

Please include:
1. Course title and description
2. Learning objectives
3. {{moduleCount}} modules with detailed content
4. Assessment suggestions',
    'course', 0.7, 8000
),
(
    'quiz.generation.default',
    'Default quiz generation prompt',
    'You are an expert assessment designer. Create educational quizzes that effectively test understanding.',
    'Create a quiz about: {{topic}}

Module context: {{moduleContext}}
Number of questions: {{questionCount}}
Question types: {{questionTypes}}
Difficulty: {{difficulty}}',
    'assessment', 0.5, 4000
),
(
    'explanation.generation.default',
    'Default explanation generation prompt',
    'You are a patient and clear educator. Explain concepts in a way that is easy to understand.',
    'Explain the following concept: {{concept}}

Level: {{level}}
Context: {{context}}',
    'content', 0.3, 2000
)
ON CONFLICT (name) DO NOTHING;

COMMIT;
```

---

## Task 4: Create RLS policies migration

**Files:**
- Create: `supabase/migrations/20260519100002_rls_policies.sql`

- [ ] **Step 1: Create the file**

Create `supabase/migrations/20260519100002_rls_policies.sql`:

```sql
-- 20260519100002_rls_policies.sql
-- Auth sync trigger + RLS policies.
-- Java services connect via service-role key (bypasses RLS).
-- Frontend uses anon/user key (subject to RLS).

BEGIN;

-- ============================================================
-- AUTH SYNC TRIGGER
-- Mirrors auth.users inserts to public.users as profiles.
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (
    id, email, display_name, first_name, last_name,
    role, locale, theme, email_verified
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    COALESCE(NEW.raw_user_meta_data->>'role', 'STUDENT'),
    'UK',
    'light',
    NEW.email_confirmed_at IS NOT NULL
  )
  ON CONFLICT (id) DO UPDATE SET
    email          = EXCLUDED.email,
    display_name   = COALESCE(public.users.display_name, EXCLUDED.display_name),
    email_verified = EXCLUDED.email_verified,
    updated_at     = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- ============================================================
-- Enable RLS on frontend-accessible tables
-- ============================================================
ALTER TABLE public.users                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_api_keys            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_members           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modules                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resources                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_content_blocks    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_bank            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_progress         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gradebook_entries        ENABLE ROW LEVEL SECURITY;

-- Java-only tables: enable RLS but NO permissive policies
-- (Java uses service-role key which bypasses RLS)
ALTER TABLE public.audit_logs               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.execution_runs           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.execution_test_results   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submission_grade_audit   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sis_import_runs          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sis_audit_logs           ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- USERS policies
-- ============================================================
CREATE POLICY "users_select_own"
  ON public.users FOR SELECT USING (id = auth.uid());

CREATE POLICY "users_update_own"
  ON public.users FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "users_insert_own"
  ON public.users FOR INSERT
  WITH CHECK (id = auth.uid());

-- ============================================================
-- USER_API_KEYS policies
-- ============================================================
CREATE POLICY "user_api_keys_own"
  ON public.user_api_keys FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================
-- COURSES policies
-- ============================================================
CREATE POLICY "courses_select_published_or_owned"
  ON public.courses FOR SELECT
  USING (is_published = TRUE OR owner_id = auth.uid());

-- Course creation/update/delete: Java gateway only (service-role bypasses)
-- No frontend write policies for courses.

-- ============================================================
-- COURSE_MEMBERS policies
-- ============================================================
CREATE POLICY "course_members_select_own"
  ON public.course_members FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "course_members_select_as_owner"
  ON public.course_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = course_members.course_id AND c.owner_id = auth.uid()
    )
  );

-- ============================================================
-- MODULES policies
-- ============================================================
CREATE POLICY "modules_select_published_or_member"
  ON public.modules FOR SELECT
  USING (
    is_published = TRUE
    OR EXISTS (
      SELECT 1 FROM public.course_members cm
      WHERE cm.course_id = modules.course_id
        AND cm.user_id = auth.uid()
        AND cm.enrollment_status = 'active'
    )
  );

-- ============================================================
-- RESOURCES policies
-- ============================================================
CREATE POLICY "resources_select_member"
  ON public.resources FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.modules m
      JOIN public.course_members cm ON cm.course_id = m.course_id
      WHERE m.id = resources.module_id
        AND cm.user_id = auth.uid()
        AND cm.enrollment_status = 'active'
    )
  );

-- ============================================================
-- LESSONS policies
-- ============================================================
CREATE POLICY "lessons_select_member"
  ON public.lessons FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.modules m
      JOIN public.course_members cm ON cm.course_id = m.course_id
      WHERE m.id = lessons.module_id
        AND cm.user_id = auth.uid()
        AND cm.enrollment_status = 'active'
    )
  );

-- ============================================================
-- LESSON_CONTENT_BLOCKS policies
-- ============================================================
CREATE POLICY "lesson_content_blocks_select_member"
  ON public.lesson_content_blocks FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.lessons l
      JOIN public.modules m ON m.id = l.module_id
      JOIN public.course_members cm ON cm.course_id = m.course_id
      WHERE l.id = lesson_content_blocks.lesson_id
        AND cm.user_id = auth.uid()
        AND cm.enrollment_status = 'active'
    )
  );

-- ============================================================
-- ASSIGNMENTS policies
-- ============================================================
CREATE POLICY "assignments_select_member"
  ON public.assignments FOR SELECT
  USING (
    is_published = TRUE
    AND EXISTS (
      SELECT 1 FROM public.course_members cm
      WHERE cm.course_id = assignments.course_id
        AND cm.user_id = auth.uid()
        AND cm.enrollment_status = 'active'
    )
  );

-- ============================================================
-- QUIZZES policies
-- ============================================================
CREATE POLICY "quizzes_select_member"
  ON public.quizzes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.course_members cm
      WHERE cm.course_id = quizzes.course_id
        AND cm.user_id = auth.uid()
        AND cm.enrollment_status = 'active'
    )
  );

-- ============================================================
-- QUESTION_BANK policies (staff only)
-- ============================================================
CREATE POLICY "question_bank_staff_only"
  ON public.question_bank FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.course_members cm
      WHERE cm.course_id = question_bank.course_id
        AND cm.user_id = auth.uid()
        AND cm.role_in_course IN ('TEACHER','TA')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.course_members cm
      WHERE cm.course_id = question_bank.course_id
        AND cm.user_id = auth.uid()
        AND cm.role_in_course IN ('TEACHER','TA')
    )
  );

-- ============================================================
-- SUBMISSIONS policies
-- Students can SELECT their own submissions only.
-- NO frontend INSERT/UPDATE — all submission writes go through Java.
-- ============================================================
CREATE POLICY "submissions_select_own"
  ON public.submissions FOR SELECT
  USING (user_id = auth.uid());

-- ============================================================
-- NOTIFICATIONS policies
-- ============================================================
CREATE POLICY "notifications_own"
  ON public.notifications FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================
-- CONTENT_PROGRESS policies
-- ============================================================
CREATE POLICY "content_progress_own"
  ON public.content_progress FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================
-- GRADEBOOK_ENTRIES policies
-- Students can read their own grades only.
-- ============================================================
CREATE POLICY "gradebook_entries_select_own"
  ON public.gradebook_entries FOR SELECT
  USING (student_id = auth.uid());

COMMIT;
```

---

## Task 5: Create storage migration

**Files:**
- Create: `supabase/migrations/20260519100003_storage.sql`

- [ ] **Step 1: Create the file**

Create `supabase/migrations/20260519100003_storage.sql`:

```sql
-- 20260519100003_storage.sql
-- Storage buckets and access policies.

BEGIN;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('avatars',      'avatars',      TRUE,  5242880,   ARRAY['image/jpeg','image/png','image/webp','image/gif']),
  ('course-media', 'course-media', FALSE, 52428800,  NULL),
  ('submissions',  'submissions',  FALSE, 104857600, NULL)
ON CONFLICT (id) DO UPDATE SET
  public             = EXCLUDED.public,
  file_size_limit    = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Avatars: public read, owner write
CREATE POLICY "avatars_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "avatars_owner_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "avatars_owner_update"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Course media: enrolled member read, course staff write
CREATE POLICY "course_media_member_read"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'course-media'
    AND EXISTS (
      SELECT 1 FROM public.course_members cm
      WHERE cm.course_id::text = (storage.foldername(name))[1]
        AND cm.user_id = auth.uid()
        AND cm.enrollment_status = 'active'
    )
  );

CREATE POLICY "course_media_staff_write"
  ON storage.objects FOR ALL
  USING (
    bucket_id = 'course-media'
    AND EXISTS (
      SELECT 1 FROM public.course_members cm
      WHERE cm.course_id::text = (storage.foldername(name))[1]
        AND cm.user_id = auth.uid()
        AND cm.role_in_course IN ('TEACHER','TA')
    )
  )
  WITH CHECK (
    bucket_id = 'course-media'
    AND EXISTS (
      SELECT 1 FROM public.course_members cm
      WHERE cm.course_id::text = (storage.foldername(name))[1]
        AND cm.user_id = auth.uid()
        AND cm.role_in_course IN ('TEACHER','TA')
    )
  );

-- Submissions: owner only
CREATE POLICY "submissions_owner_only"
  ON storage.objects FOR ALL
  USING (
    bucket_id = 'submissions'
    AND auth.uid()::text = (storage.foldername(name))[1]
  )
  WITH CHECK (
    bucket_id = 'submissions'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

COMMIT;
```

---

## Task 6: Create seed.sql

**Files:**
- Create: `supabase/seed.sql`

- [ ] **Step 1: Create the seed file**

Create `supabase/seed.sql`:

```sql
-- seed.sql
-- Minimal demo data. No real credentials. Supabase Auth users must be
-- created manually in the Supabase Dashboard before these profiles work
-- with auth.uid() RLS policies.
--
-- Manual step: Create demo users in Supabase Dashboard > Authentication
-- with emails matching the UUIDs below, then update these UUIDs.
--
-- For local dev with `supabase start`, use the seed API instead:
--   supabase functions serve seed  (if a seed function is added)

-- Demo roles are embedded in the users.role column (no separate roles table needed).

-- Insert sample prompt templates only (safe, no user data)
INSERT INTO prompt_templates (name, description, system_prompt, user_prompt_template, category, temperature, max_tokens)
VALUES (
    'syllabus.generation.default',
    'Generate a course syllabus from title and objectives',
    'You are a curriculum designer. Generate clear, professional course syllabi.',
    'Generate a syllabus for: {{courseTitle}}
Objectives: {{objectives}}
Duration: {{duration}} weeks',
    'course', 0.5, 3000
)
ON CONFLICT (name) DO NOTHING;
```

---

## Task 7: Disable Flyway in Java services

**Files:**
- Modify: `services/user-service/src/main/resources/application.yml`
- Modify: `services/learning-service/src/main/resources/application.yml`
- Modify: `services/ai-service/src/main/resources/application.yml`

- [ ] **Step 1: Disable Flyway in user-service**

In `services/user-service/src/main/resources/application.yml`, find:
```yaml
  flyway:
    enabled: true
    baseline-on-migrate: true
    baseline-version: 0
    locations: classpath:db/migration
    table: user_flyway_schema_history
    validate-on-migrate: true
```
Replace with:
```yaml
  flyway:
    enabled: false
    # Schema managed exclusively by Supabase migrations.
    # Java service uses ddl-auto: validate only.
```

- [ ] **Step 2: Disable Flyway in learning-service**

In `services/learning-service/src/main/resources/application.yml`, find:
```yaml
  flyway:
    enabled: true
    baseline-on-migrate: true
    baseline-version: 0
    locations: classpath:db/migration
    table: course_flyway_schema_history
    schemas: public
```
Replace with:
```yaml
  flyway:
    enabled: false
    # Schema managed exclusively by Supabase migrations.
```

- [ ] **Step 3: Disable Flyway in ai-service**

In `services/ai-service/src/main/resources/application.yml`, find:
```yaml
  flyway:
    enabled: true
    baseline-on-migrate: true
    baseline-version: 0
    locations: classpath:db/migration
    table: ai_flyway_schema_history
```
Replace with:
```yaml
  flyway:
    enabled: false
    # Schema managed exclusively by Supabase migrations.
```

- [ ] **Step 4: Delete Java Flyway migration files**

```bash
rm services/user-service/src/main/resources/db/migration/V1__init.sql
rm services/learning-service/src/main/resources/db/migration/V1__init.sql
rm services/learning-service/src/main/resources/db/migration/V2__qr_attendance.sql
rm services/learning-service/src/main/resources/db/migration/V3__drop_assignment_tags.sql
rm services/learning-service/src/main/resources/db/migration/V4__vpl_autograding.sql
rm services/learning-service/src/main/resources/db/migration/V5__marketplace.sql
rm services/ai-service/src/main/resources/db/migration/V1__init.sql
```

Expected: All files deleted. `find services -path "*/db/migration/*.sql" | sort` returns empty (analytics-service had no .sql files).

---

## Task 8: Fix User entity — remove auth token fields

**Files:**
- Modify: `services/user-service/src/main/java/com/university/lms/user/domain/User.java`
- Modify: `services/user-service/src/main/java/com/university/lms/user/service/UserMapper.java`
- Modify: `services/user-service/src/main/java/com/university/lms/user/config/DataInitializer.java`

- [ ] **Step 1: Read current User entity**

Read `services/user-service/src/main/java/com/university/lms/user/domain/User.java`.

- [ ] **Step 2: Remove auth token fields from User entity**

Remove from `User.java` these fields (they are managed by Supabase Auth, not the profile table):
- `private String passwordHash;`
- `private boolean isStaff;`
- `private String emailVerificationToken;`
- `private String passwordResetToken;`
- `private LocalDateTime passwordResetExpires;`

The fields to KEEP: `id`, `email`, `displayName`, `firstName`, `lastName`, `studentId`, `role`, `locale`, `theme`, `avatarUrl`, `bio`, `isActive`, `isDeleted`, `emailVerified`, `createdAt`, `updatedAt`.

Full `User.java` after removal:

```java
@Entity
@Table(name = "users", indexes = {
    @Index(name = "idx_users_email", columnList = "email"),
    @Index(name = "idx_users_role", columnList = "role"),
    @Index(name = "idx_users_student_id", columnList = "student_id")
})
@EntityListeners(AuditingEntityListener.class)
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(unique = true, nullable = false)
    private String email;

    @Column(name = "display_name")
    private String displayName;

    @Column(name = "first_name")
    private String firstName;

    @Column(name = "last_name")
    private String lastName;

    @Column(name = "student_id", unique = true)
    private String studentId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private UserRole role = UserRole.STUDENT;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private UserLocale locale = UserLocale.UK;

    @Column
    @Builder.Default
    private String theme = "light";

    @Column(name = "avatar_url")
    private String avatarUrl;

    @Column(columnDefinition = "TEXT")
    private String bio;

    @Column(name = "is_active")
    @Builder.Default
    private boolean isActive = true;

    @Column(name = "is_deleted")
    @Builder.Default
    private boolean isDeleted = false;

    @Column(name = "email_verified")
    @Builder.Default
    private boolean emailVerified = false;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    @Builder.Default
    private Map<String, Object> preferences = new HashMap<>();

    @CreatedDate
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
```

- [ ] **Step 3: Update UserMapper to remove auth token mappings**

Read `services/user-service/src/main/java/com/university/lms/user/service/UserMapper.java`.

Remove any references to `passwordHash`, `emailVerificationToken`, `passwordResetToken`, `passwordResetExpires`, `isStaff` from the mapper.

- [ ] **Step 4: Update DataInitializer to remove auth token usage**

Read `services/user-service/src/main/java/com/university/lms/user/config/DataInitializer.java`.

Remove any `.passwordHash(...)`, `.emailVerificationToken(...)`, `.passwordResetToken(...)`, `.isStaff(...)` builder calls.

---

## Task 9: Fix AI entity PKs — String → UUID

**Files:**
- Modify: `services/ai-service/src/main/java/com/university/lms/ai/domain/entity/AIGenerationLog.java`
- Modify: `services/ai-service/src/main/java/com/university/lms/ai/domain/entity/AIUserUsage.java`
- Modify: `services/ai-service/src/main/java/com/university/lms/ai/domain/entity/PromptTemplate.java`
- Modify: `services/ai-service/src/main/java/com/university/lms/ai/domain/entity/PromptABTest.java`
- Modify: `services/ai-service/src/main/java/com/university/lms/ai/repository/AIGenerationLogRepository.java`
- Modify: `services/ai-service/src/main/java/com/university/lms/ai/repository/AIUserUsageRepository.java`
- Modify: `services/ai-service/src/main/java/com/university/lms/ai/repository/PromptTemplateRepository.java`
- Modify: `services/ai-service/src/main/java/com/university/lms/ai/repository/PromptABTestRepository.java`

- [ ] **Step 1: Read the 4 AI entity files**

Read all 4 files to find exact `private String id` and `private String userId` / `private String courseId` fields.

- [ ] **Step 2: In each entity, change `private String id` to `private UUID id`**

For each of the 4 entities:
1. Change `@Id private String id;` → `@Id @GeneratedValue(strategy = GenerationType.UUID) private UUID id;`
2. For `AIGenerationLog`: change `private String userId;` → `private UUID userId;` and `private String courseId;` → `private UUID courseId;`
3. For `AIUserUsage`: change `private String userId;` → `private UUID userId;`
4. For `PromptABTest`: change `private String userId;` → `private UUID userId;`
5. Add `import java.util.UUID;` to each file

- [ ] **Step 3: Update repository interfaces — change `JpaRepository<X, String>` to `JpaRepository<X, UUID>`**

For each repository, change the second type parameter from `String` to `UUID`:
- `AIGenerationLogRepository extends JpaRepository<AIGenerationLog, UUID>`
- `AIUserUsageRepository extends JpaRepository<AIUserUsage, UUID>`
- `PromptTemplateRepository extends JpaRepository<PromptTemplate, UUID>`
- `PromptABTestRepository extends JpaRepository<PromptABTest, UUID>`

- [ ] **Step 4: Read and update all service classes that call `repository.findById(String)`**

Run:
```bash
grep -rn "\.findById\|\.getReferenceById" services/ai-service/src/main/java/ | grep -v "test"
```

For each call that passes a `String` ID, update to parse UUID first:
- Old: `repo.findById(id)` where `id` is `String`
- New: `repo.findById(UUID.fromString(id))` OR change the method parameter to `UUID`

---

## Task 10: Fix PeerReview entity — Long → UUID

**Files:**
- Modify: `services/learning-service/src/main/java/com/university/lms/course/assessment/domain/PeerReview.java`
- Modify: `services/learning-service/src/main/java/com/university/lms/course/assessment/repository/PeerReviewRepository.java`
- Modify: `services/learning-service/src/main/java/com/university/lms/course/assessment/dto/PeerReviewDto.java`
- Modify: `services/learning-service/src/main/java/com/university/lms/course/assessment/service/PeerReviewService.java`
- Modify: `services/learning-service/src/main/java/com/university/lms/course/assessment/web/PeerReviewController.java`

- [ ] **Step 1: Read PeerReview.java and fix types**

Replace `PeerReview.java` with:

```java
@Entity
@Table(name = "peer_reviews")
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class PeerReview {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "assignment_id", nullable = false)
    private UUID assignmentId;

    @Column(name = "reviewer_user_id", nullable = false)
    private UUID reviewerUserId;

    @Column(name = "reviewee_user_id", nullable = false)
    private UUID revieweeUserId;

    @Column(name = "submission_id", nullable = false)
    private UUID submissionId;

    @Column(name = "is_anonymous", nullable = false)
    @Builder.Default
    private Boolean isAnonymous = true;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private PeerReviewStatus status = PeerReviewStatus.PENDING;

    @Column(name = "overall_score")
    private BigDecimal overallScore;

    @Column(name = "overall_feedback", columnDefinition = "TEXT")
    private String overallFeedback;

    @Column(name = "submitted_at")
    private LocalDateTime submittedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() { createdAt = LocalDateTime.now(); updatedAt = LocalDateTime.now(); }

    @PreUpdate
    protected void onUpdate() { updatedAt = LocalDateTime.now(); }

    public enum PeerReviewStatus { PENDING, IN_PROGRESS, COMPLETED, OVERDUE }
}
```

- [ ] **Step 2: Update PeerReviewRepository — JpaRepository<PeerReview, Long> → JpaRepository<PeerReview, UUID>**

Change:
```java
// Before
public interface PeerReviewRepository extends JpaRepository<PeerReview, Long> {
    List<PeerReview> findByAssignmentId(Long assignmentId);
```
To:
```java
// After
public interface PeerReviewRepository extends JpaRepository<PeerReview, UUID> {
    List<PeerReview> findByAssignmentId(UUID assignmentId);
```

- [ ] **Step 3: Update PeerReviewDto — change Long fields to UUID/String**

Read `PeerReviewDto.java` and change any `Long` ID fields to `UUID` or `String`.

- [ ] **Step 4: Update PeerReviewService and PeerReviewController**

Read both files and fix any method signatures that accept/return `Long` IDs for peer reviews, assignments, users, submissions → change to `UUID`.

---

## Task 11: Delete Deadline package

The entire `deadline` package (32 files) references broken BIGSERIAL/BIGINT schema with non-existent `student_groups` table. Delete it.

- [ ] **Step 1: Verify what references the deadline package from outside it**

```bash
grep -rn "deadline\|Deadline\|WorkloadSnapshot\|workload" \
  services/learning-service/src/main/java/com/university/lms/course/ \
  services/learning-service/src/main/java/com/university/lms/gradebook/ \
  services/learning-service/src/main/java/com/university/lms/submission/ \
  services/learning-service/src/main/java/com/university/lms/marketplace/ \
  services/learning-service/src/main/java/com/university/lms/file/ \
  2>/dev/null | grep -v "\.java~"
```

Expected: Little or no cross-references from other packages.

- [ ] **Step 2: Check main application class for component scan exclusions needed**

Read the learning-service main `@SpringBootApplication` class. Note its package path:
```bash
find services/learning-service/src/main/java -name "*Application.java" | head -3
```

- [ ] **Step 3: Delete entire deadline package**

```bash
rm -rf services/learning-service/src/main/java/com/university/lms/deadline/
```

Expected: All 32 files removed.

- [ ] **Step 4: Verify compilation would not break other packages**

```bash
grep -rn "import com.university.lms.deadline" \
  services/learning-service/src/main/java/com/university/lms/ 2>/dev/null
```

Expected: No references. If any found, remove those import statements.

---

## Task 12: Delete Marketplace package

The marketplace is disabled. Drop the 15 Java files.

- [ ] **Step 1: Verify marketplace is not wired in elsewhere**

```bash
grep -rn "marketplace\|Marketplace\|MarketplacePlugin" \
  services/learning-service/src/main/java/com/university/lms/course/ \
  services/learning-service/src/main/java/com/university/lms/gradebook/ \
  2>/dev/null
```

Expected: No references from outside the marketplace package itself.

- [ ] **Step 2: Delete marketplace package**

```bash
rm -rf services/learning-service/src/main/java/com/university/lms/marketplace/
```

- [ ] **Step 3: Verify no remaining references**

```bash
grep -rn "import com.university.lms.marketplace" \
  services/learning-service/src/main/java/ 2>/dev/null
```

Expected: Empty.

---

## Task 13: Update frontend types

**Files:**
- Modify: `apps/web/src/types/supabase.ts`
- Modify: `apps/web/src/types/index.ts`

- [ ] **Step 1: Update supabase.ts — remove auth token fields from UserProfileRow**

Read `apps/web/src/types/supabase.ts`.

Remove from `UserProfileRow`:
- `password_hash`
- `email_verification_token`
- `password_reset_token`
- `password_reset_expires`
- `is_staff`

Keep: `id`, `email`, `display_name`, `first_name`, `last_name`, `student_id`, `bio`, `avatar_url`, `role`, `locale`, `theme`, `is_active`, `is_deleted`, `email_verified`, `preferences`, `created_at`, `updated_at`.

Also remove from `UserProfileInsert` any auth token fields.

- [ ] **Step 2: Add Notification type to supabase.ts**

Add to the `Database['public']['Tables']` section:

```typescript
notifications: {
  Row: {
    id: string;
    user_id: string;
    type: 'assignment_due' | 'grade_posted' | 'announcement' | 'course_update' | 'submission_graded' | 'peer_review_assigned' | 'system';
    title: string;
    message: string;
    payload: Json | null;
    is_read: boolean;
    created_at: string;
  };
  Insert: Omit<Database['public']['Tables']['notifications']['Row'], 'id' | 'created_at'>;
  Update: Partial<Pick<Database['public']['Tables']['notifications']['Row'], 'is_read'>>;
  Relationships: [];
};
```

- [ ] **Step 3: Update index.ts — remove InstalledPlugin and PluginType/PluginStatus types**

Read `apps/web/src/types/index.ts`.

Remove:
- `export type PluginType = ...`
- `export type PluginStatus = ...`
- `export interface InstalledPlugin { ... }`

These reference the disabled plugin system. If needed in the future, they can be restored.

- [ ] **Step 4: Add ExecutionRun type to index.ts**

Add after the VPL types section:

```typescript
// Execution run types
export type ExecutionStatus = 'queued' | 'running' | 'passed' | 'failed' | 'error' | 'timeout';

export interface ExecutionRun {
  id: string;
  submissionId?: string;
  assignmentId: string;
  userId: string;
  language: string;
  status: ExecutionStatus;
  startedAt?: string;
  completedAt?: string;
  timeMs?: number;
  memoryMb?: number;
  pylintScore?: number;
  createdAt: string;
}

export interface ExecutionTestResult {
  id: string;
  runId: string;
  testCaseId?: string;
  name: string;
  passed: boolean;
  expectedOutput?: string;
  actualOutput?: string;
  pointsAwarded?: number;
  errorMessage?: string;
  position: number;
}
```

---

## Task 14: Validate schema migrations locally

- [ ] **Step 1: Verify migration files exist**

```bash
ls -la supabase/migrations/
```

Expected: Exactly 4 files:
- `20260519100000_core_schema.sql`
- `20260519100001_ai_schema.sql`
- `20260519100002_rls_policies.sql`
- `20260519100003_storage.sql`

- [ ] **Step 2: Validate SQL syntax by dry-run with psql (if local Supabase running)**

If `supabase start` is running locally:
```bash
supabase db reset
```
Expected: Output shows all 4 migrations applied without errors.

If not running locally, skip to Step 3.

- [ ] **Step 3: Check migration for obvious SQL errors**

```bash
grep -n "REFERENCES" supabase/migrations/20260519100000_core_schema.sql | head -20
```

Expected: All REFERENCES point to tables defined earlier in the same file.

- [ ] **Step 4: Verify Java Flyway files are gone**

```bash
find services -path "*/db/migration/*.sql" | sort
```

Expected: Only `services/analytics-service/src/main/resources/db/migration/V1__create_course_tables.sql` (kept because analytics-service already has `flyway.enabled: false` and uses it as documentation only).

- [ ] **Step 5: Verify no remaining references to dropped tables in Java**

```bash
grep -rn "deadlines\|workload_snapshots\|installed_plugins\|marketplace_plugins\|programs\b\|learning_paths" \
  services/learning-service/src/main/java/ \
  services/user-service/src/main/java/ \
  services/ai-service/src/main/java/ 2>/dev/null | grep -v "\.class"
```

Expected: No results (or only comments).

- [ ] **Step 6: Verify no BIGSERIAL/BIGINT schema remains in Java entities**

```bash
grep -rn "Long id\b\|Long courseId\b\|Long studentGroupId\b\|Long assignmentId\b\|Long submissionId\b" \
  services/learning-service/src/main/java/ \
  services/user-service/src/main/java/ 2>/dev/null | grep -v "//\|test"
```

Expected: No results.

---

## Task 15: Update documentation

**Files:**
- Create: `docs/database.md`

- [ ] **Step 1: Create docs/database.md**

Create `docs/database.md`:

```markdown
# Database Schema

Supabase Postgres is the single source of truth. Schema is managed via
`supabase/migrations/`. Java services use `ddl-auto: validate` and do NOT run Flyway.

## Migration Files

| File | Contents |
|------|----------|
| `20260519100000_core_schema.sql` | All core tables: users, courses, learning, assignments, submissions, gradebook, content, admin, notifications, audit_logs, execution_runs |
| `20260519100001_ai_schema.sql` | AI tables: templates, prompt_templates, generation_logs, user_usage, ab_tests |
| `20260519100002_rls_policies.sql` | Auth trigger + RLS for frontend-accessible tables |
| `20260519100003_storage.sql` | Storage buckets: avatars (public), course-media (members), submissions (owner) |
| `seed.sql` | Demo prompt templates only |

## Table Inventory (54 tables)

### Users
| Table | Owner | RLS |
|-------|-------|-----|
| `users` | user-service + Supabase Auth trigger | ✅ user reads/updates own row |
| `user_api_keys` | user-service | ✅ user manages own keys |

### Courses & Enrollment
| Table | Owner | RLS |
|-------|-------|-----|
| `courses` | learning-service | ✅ published or owned |
| `course_members` | learning-service | ✅ user sees own membership |
| `announcements` | learning-service | ✅ via course membership |

### Learning Content
| Table | Owner | RLS |
|-------|-------|-----|
| `modules` | learning-service | ✅ enrolled members |
| `topics` | learning-service | ❌ Java-only |
| `resources` | learning-service | ✅ enrolled members |
| `lessons` | learning-service | ✅ enrolled members |
| `lesson_content_blocks` | learning-service | ✅ enrolled members |
| `lesson_objectives` | learning-service | ❌ Java-only |

### Module Pages (Block Editor)
| Table | Owner |
|-------|-------|
| `module_pages`, `page_documents`, `page_published_documents` | learning-service |
| `page_citations`, `page_footnotes`, `editor_media` | learning-service |

### Assessments
| Table | Owner | RLS |
|-------|-------|-----|
| `assignments` | learning-service | ✅ enrolled + published |
| `vpl_test_cases` | learning-service | ❌ Java-only |
| `peer_reviews` | learning-service | ❌ Java-only |
| `quizzes` | learning-service | ✅ enrolled |
| `question_bank` | learning-service | ✅ staff only |
| `question_bank_versions` | learning-service | ❌ Java-only |
| `quiz_sections`, `quiz_section_rules`, `quiz_questions` | learning-service | ❌ Java-only |
| `quiz_attempts`, `quiz_attempt_questions`, `quiz_responses` | learning-service | ❌ Java-only |
| `assignment_template_documents`, `submission_documents` | learning-service | ❌ Java-only |
| `attendance_qr_tokens`, `seminar_attendance` | learning-service | ❌ Java-only |

### Submissions & Grading
| Table | Owner | RLS |
|-------|-------|-----|
| `submissions` | learning-service | ✅ user reads own |
| `submission_files`, `submission_comments` | learning-service | ❌ Java-only |
| `submission_grade_audit` | learning-service | ❌ Java-only (no SELECT policy) |
| `gradebook_categories` | learning-service | ❌ Java-only |
| `gradebook_entries` | learning-service | ✅ student reads own grade |
| `grade_histories`, `course_grade_summaries` | learning-service | ❌ Java-only |

### AI Feedback
| Table | Owner |
|-------|-------|
| `ai_feedback_entries` | learning-service |
| `revision_feedback_threads`, `revision_feedback_messages` | learning-service |

### VPL Execution
| Table | Owner |
|-------|-------|
| `execution_runs` | learning-service (via execution-service results) |
| `execution_test_results` | learning-service |

### AI Tables
| Table | Owner |
|-------|-------|
| `ai_course_templates`, `template_variables`, `template_options` | ai-service |
| `prompt_templates` | ai-service |
| `ai_generation_logs`, `ai_user_usage`, `ai_prompt_ab_test` | ai-service |

### Progress & Notifications
| Table | Owner | RLS |
|-------|-------|-----|
| `content_progress` | learning-service | ✅ user owns |
| `lesson_step_progress` | learning-service | ❌ Java-only |
| `notifications` | any service | ✅ user owns |

### Admin / Audit
| Table | Owner | RLS |
|-------|-------|-----|
| `sis_import_runs`, `sis_audit_logs` | learning-service | ❌ Java-only (no SELECT policy) |
| `audit_logs` | any service | ❌ Java-only |
| `course_archive_snapshots` | learning-service | ❌ Java-only |

## Role Model

Roles are stored in `users.role` (TEXT CHECK constraint):
- `SUPERADMIN` — platform admin
- `TEACHER` — course owner/instructor
- `TA` — teaching assistant in a course
- `STUDENT` — enrolled learner

Course-level roles in `course_members.role_in_course`: `TEACHER`, `TA`, `STUDENT`.

Java services verify authorization server-side. RLS provides defense-in-depth.

## Dropped Tables (vs previous schema)

| Table | Reason |
|-------|--------|
| `programs`, `learning_paths`, `path_steps` | No Java code; over-engineered for current scope |
| `deadlines`, `workload_snapshots` | BIGSERIAL PKs incompatible with UUID schema; referenced non-existent student_groups |
| `installed_plugins`, `plugin_events_log` | Plugin system disabled |
| `marketplace_plugins`, `marketplace_plugin_versions`, `marketplace_reviews` | Marketplace disabled |

## Destructive Changes Made

1. **`users` table**: Removed `password_hash`, `email_verification_token`, `password_reset_token`, `password_reset_expires`, `is_staff` — these are Supabase Auth concerns
2. **`peer_reviews`**: PKs changed from BIGSERIAL to UUID
3. **AI tables**: PKs changed from VARCHAR(36) to UUID native type
4. **All FK constraints**: Added ~20 missing FK constraints for referential integrity
5. **Timestamps**: All timestamps changed from TIMESTAMP to TIMESTAMPTZ for timezone safety

## Naming Conventions

- DB: `snake_case` tables and columns
- Java: `camelCase` fields mapped with `@Column(name = "snake_case")`
- TypeScript/JSON: `camelCase`
- No quoted identifiers (no `"createdAt"` in DB)

## Manual Supabase Steps Required

1. **Reset remote DB**: `supabase db reset --linked` (destructive, safe because DB is empty)
2. **Bootstrap admin user**: Create in Supabase Dashboard > Authentication, then update `users.role = 'SUPERADMIN'` via SQL editor
3. **Verify storage buckets**: Check Supabase Dashboard > Storage for `avatars`, `course-media`, `submissions`
```

---

## Task 16: Push clean schema to remote Supabase

- [ ] **Step 1: Verify local migration files are correct**

```bash
ls supabase/migrations/
```

Expected: 4 files (20260519100000-20260519100003).

- [ ] **Step 2: Reset remote database (DESTRUCTIVE — DB is empty, safe to run)**

```bash
supabase db reset --linked
```

Expected output: `Resetting database...` then `Migration successful` for all 4 migrations.

This command:
1. Drops all tables in the remote DB
2. Re-applies all migrations in `supabase/migrations/` in order
3. Applies `supabase/seed.sql`

**Note:** Requires Supabase CLI to be linked (`supabase/.temp/linked-project.json` must exist). If not linked: `supabase link --project-ref aarkyaevxuhlkefayzro`

- [ ] **Step 3: Verify tables exist in remote DB**

```bash
supabase db diff --linked 2>&1 | head -30
```

Expected: No diff (schema matches migrations exactly).

---

## Unclear / Needs Human Decision

- **`user-service` auth vs Supabase Auth**: The user-service has its own full JWT system (JwtService, tokens, password reset via email). The frontend uses Supabase JWTs passed as `Authorization: Bearer`. Currently these are both active simultaneously. A decision is needed: should the user-service validate Supabase JWTs (removing its own JWT issuance), or keep dual auth? This plan keeps both active but removes the DB overlap.

- **`peer_reviews.submission_id` FK**: The FK to `submissions(id)` was added but Hibernate `ddl-auto: validate` will now verify it. If the PeerReviewService creates reviews before submissions exist, this FK might cause issues. Verify the business logic.

- **Analytics-service `EurekaConfig`**: Still references Eureka which was deleted. This config should be removed, but it was not in scope for this plan.

- **Deadline feature replacement**: The deadline/calendar/workload system was deleted (32 files). A replacement using proper UUID types and `assignments.due_date` as the data source should be planned separately.

- **`execution_runs` write path**: The execution-service is Python FastAPI. It needs to write to the new `execution_runs` and `execution_test_results` tables. Currently it returns results as JSON to the learning-service. Decide: should the execution-service write directly to Supabase (via service-role key), or should the learning-service write after receiving results?
