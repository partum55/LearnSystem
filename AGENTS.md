<claude-mem-context>
# Memory Context

# [LearnSystem] recent context, 2026-05-21 2:03pm GMT+3

Legend: 🎯session 🔴bugfix 🟣feature 🔄refactor ✅change 🔵discovery ⚖️decision 🚨security_alert 🔐security_note
Format: ID TIME TYPE TITLE
Fetch details: get_observations([IDs]) | Search: mem-search skill

Stats: 50 obs (21,800t read) | 2,310,334t work | 99% savings

### May 20, 2026
S35 LearnSystem frontend refactor — clarifying questions in progress, Q1 presented (architecture choice), awaiting user response (May 20, 2:41 AM)
S32 LearnSystem frontend refactor planning — clarifying questions phase started, first question asked about views/ vs features/ architecture approach (May 20, 2:41 AM)
S36 LearnSystem frontend refactor clarifying questions — Q3 corrected (proxy.ts is valid Next.js 16), Q4 asked about courseStore migration scope (May 20, 2:41 AM)
S37 LearnSystem frontend refactor clarifying questions — Q4 answered (courseStore separate track), Q5 asked about domain migration priority order (May 20, 2:44 AM)
S38 LearnSystem frontend refactor — 3 structural approaches proposed, Approach A (full feature-sliced) recommended, awaiting user selection (May 20, 2:45 AM)
S39 LearnSystem frontend refactor — Approach A selected (full feature-sliced), Task 3 complete, Task 4 (present design) now starting (May 20, 2:45 AM)
S40 LearnSystem frontend refactor — Design Section 1 presented: exact file mapping from current structure to target feature-sliced architecture (May 20, 2:46 AM)
S41 LearnSystem frontend refactor — Design Section 2 presented: 9-batch migration plan, awaiting user approval (May 20, 2:46 AM)
S42 LearnSystem frontend refactor — design spec written, committed, and presented for user review before writing-plans handoff (May 20, 2:47 AM)
S43 LearnSystem frontend refactor — spec approved, writing-plans skill now starting to generate implementation plan (May 20, 2:50 AM)
367 2:49p 🔄 Task 14 Complete: Lesson Views and LessonPlayer Fix Committed — 15d17e1
371 " 🔄 Task 15 Complete: Grades/Teacher Views Committed — ea64ae4
369 2:50p 🔵 Grades/Teacher Page Routes Confirmed: AllGrades Uses Named Import, 5 Files to Update
372 2:51p ✅ Tasks 17-22 Bulk-Marked Completed; Task 23 (Final Remaining Views) Now In Progress
373 2:52p 🔄 Task 16: All Remaining View Files Moved — src/views/ Now Empty
374 2:53p 🔵 10 @/views/ Imports Remaining — All for Task 16 Domains, Dashboard Imports Resolved
375 " 🔄 Phase 3 Complete: Zero @/views/ Imports Remain Anywhere in the Codebase
377 " 🔄 Task 16 Complete: Final View Migration Committed — 7f687ae; Phase 3 Fully Done
378 " 🔵 Phase 4 Plan: Components Migration Covers 3 Tasks — courses, assignments/quiz, dashboard/AI/virtual-lab
376 2:54p 🔄 Phase 3 TypeScript Check Passes — Zero Errors After Full View Migration
380 " 🔄 Phase 4 Component Moves Partially Executed: 30+ Components Staged Across courses/assignments/AI Feature Domains
379 2:55p 🔵 src/components/ Full Inventory Before Phase 4: Unexpected Subdirectories Not in Migration Plan
381 2:57p 🔄 Phase 4 Nearly Complete: analytics/ Was Last Remaining Domain Component, Now Moved to admin Feature
382 " 🔄 Phase 4 Complete: Zero TypeScript Errors After Component Moves; components/index.ts Barrel Reduced to Shared UI Only
383 " 🔄 Phase 4 Complete: 50 Domain Components Moved to Feature Domains — Committed 22eb1be
384 3:09p 🔵 Phase 5 Plan: Feature Domain Barrel Files + useCourseQueries Exports Confirmed
385 " 🟣 Phase 5 Complete: 16 Feature Domain Barrel index.ts Files Written
386 " 🔵 pnpm tsc Must Be Run from apps/web — Fails with ERR_PNPM_NO_IMPORTER_MANIFEST_FOUND from Monorepo Root
387 " 🟣 Phase 6: Domain-Local Type Files Created for courses and assignments
### May 21, 2026
388 1:12p 🔵 LearnSystem learning-service canonicalization work-in-progress state
389 1:13p 🔵 Complete canonical /api/v1 endpoint inventory for LearnSystem learning-service
390 " 🔵 Large legacy unversioned controller layer coexists with canonical /api/v1 layer
391 " 🔵 LearningItem and LessonBlock JPA entities mapped to canonical schema tables
392 " 🔵 Canonical migration migrates legacy resources/lessons to learning_items table with data backfill
393 " 🔵 LearningContentService enforces canonical business rules for learning items and lesson blocks
394 " 🔵 Assignment settings stored as Map&lt;String, Object&gt; internally despite typed DTOs at input boundary
395 " 🔵 Supabase migration history shows 6 migrations with canonical grade/submission model before learning_items
396 1:15p 🔵 CanonicalGradebookService has critical gaps: quiz autoscoring is placeholder and teacher gradebook lacks student names
397 " 🔵 VPL submissions store execution reference only — actual code execution belongs to vpl-service boundary
398 " 🔵 CourseModuleDto correctly returns learningItems and assignments as separate arrays
399 " 🔵 LearningItemMapper merges content and settings into a single flat map in the LearningItemDto response
400 " 🔵 Assignment type mapping uses dual-layer translation between canonical API names and legacy storage strings
401 " 🔵 Security architecture: JWT validates tokens without DB lookup; role enforcement is service-layer via CourseAccessService only
402 " 🔵 Canonical error format is consistent: ApiErrorResponse with message, code, and fieldErrors
403 " 🔵 Contract test LearningEndpointContractTest verifies canonical API paths, naming, and repository isolation at compile/unit test level
404 " 🔵 Submission versioning is implemented: each submit() creates a SubmissionVersion record preserving full content history
405 " 🔵 Core schema audit: legacy learning.resources, learning.lessons, and learning.lesson_content_blocks tables still exist alongside canonical tables
406 1:18p 🔵 Database schema uses strict security isolation: internal schemas REVOKED from Supabase API roles, but new canonical tables lack RLS policies
407 " 🔵 Legacy AssignmentController has 6 capabilities the canonical CanonicalAssignmentController lacks
408 " 🔵 Legacy VplTestCaseController uses JWT role claim for authorization — a security anti-pattern compared to canonical CourseAccessService
409 " 🔵 Zero unit tests cover canonical service layer — all 15 existing tests cover legacy or shared services only
410 " 🔵 LearnSystem learning-service is built on Java 25 with Spring Boot
411 1:19p 🔵 Legacy QuizAttemptService has real autoscoring; CanonicalQuizAttemptService does not — quiz scores will always be zero via /api/v1
412 " 🔴 Fixed: students could see locked modules and unpublished assignments via GET /v1/courses/{courseId}/modules
413 " 🔴 Fixed: CanonicalAssignmentService now enforces type immutability, availability for students, and syncs Quiz entity on update
414 " 🔴 Fixed: CanonicalAssignmentMapper canResubmit now checks allowResubmission setting; canEdit hardened to false
415 " 🔴 Fixed: CanonicalQuizAttemptService now enforces time limit, respects review/score visibility settings, and guards review endpoint
416 1:20p ✅ 8 legacy controllers annotated @Deprecated(forRemoval=false, since="canonical-api-v1") to mark superseded status
417 " 🔵 GradebookEntryController uses @PreAuthorize Spring Security with JWT role claims and raw JdbcTemplate — third authorization pattern in learning-service
418 " 🟣 New CanonicalFrontendReadinessTest created with 9 tests covering all bugs fixed during the audit

Access 2310k tokens of past work via get_observations([IDs]) or mem-search skill.
</claude-mem-context>