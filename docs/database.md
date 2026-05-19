## Schema Ownership

The database is split by exposure boundary and domain:

- `public`: Supabase-facing API surface (`users`, `notifications`) with strict RLS.
- `learning`: course structure, content, pages, announcements, and progress.
- `assessment`: quizzes, assignments, submissions, peer review, VPL, attendance, and feedback workflows.
- `grading`: gradebook entries, grade history, summaries, and submission grade audit.
- `ai`: AI templates, usage, generation logs, and encrypted user provider keys.
- `operations`: audit logs, SIS import state, archives, and execution-service run records.
- `private`: privileged trigger/helper functions only; never expose this schema.

Only `public` should remain in Supabase exposed schemas for browser clients unless a specific future feature deliberately exposes another schema and adds matching RLS/grants.

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
