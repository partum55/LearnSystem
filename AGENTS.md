<claude-mem-context>
# Memory Context

# [LearnSystem] recent context, 2026-05-23 12:31pm GMT+3

Legend: 🎯session 🔴bugfix 🟣feature 🔄refactor ✅change 🔵discovery ⚖️decision 🚨security_alert 🔐security_note
Format: ID TIME TYPE TITLE
Fetch details: get_observations([IDs]) | Search: mem-search skill

Stats: 50 obs (22,529t read) | 1,042,397t work | 98% savings

### May 20, 2026
S36 LearnSystem frontend refactor clarifying questions — Q3 corrected (proxy.ts is valid Next.js 16), Q4 asked about courseStore migration scope (May 20, 2:41 AM)
S37 LearnSystem frontend refactor clarifying questions — Q4 answered (courseStore separate track), Q5 asked about domain migration priority order (May 20, 2:44 AM)
S38 LearnSystem frontend refactor — 3 structural approaches proposed, Approach A (full feature-sliced) recommended, awaiting user selection (May 20, 2:45 AM)
S39 LearnSystem frontend refactor — Approach A selected (full feature-sliced), Task 3 complete, Task 4 (present design) now starting (May 20, 2:45 AM)
S40 LearnSystem frontend refactor — Design Section 1 presented: exact file mapping from current structure to target feature-sliced architecture (May 20, 2:46 AM)
S41 LearnSystem frontend refactor — Design Section 2 presented: 9-batch migration plan, awaiting user approval (May 20, 2:46 AM)
S42 LearnSystem frontend refactor — design spec written, committed, and presented for user review before writing-plans handoff (May 20, 2:47 AM)
S43 LearnSystem frontend refactor — spec approved, writing-plans skill now starting to generate implementation plan (May 20, 2:50 AM)
S44 LearnSystem frontend legacy migration — restore old UI design from frontend_legacy/ into apps/web and wire to real production backend API with Supabase Bearer auth (May 20, 2:50 AM)
### May 22, 2026
479 3:50a 🔵 Frontend calls /v1/users/me but backend has no matching route
480 " 🔵 GET /v1/users/me exists in CanonicalUserController but relies on userId RequestAttribute
481 " 🔵 Gateway correctly routes /api/v1/users/** to user-service; auth token sent via Supabase session
482 " 🔵 user-service 401 root cause narrowed: JWT filter returns null if user not found or deleted in DB
484 " 🔵 No Supabase webhook or auto-sync mechanism found for user creation in user-service
483 3:51a 🔵 Full 401 cause map traced through common JwtAuthenticationFilter
485 3:52a 🔵 User creation is manual via UserController.createUser — no auto-provisioning from Supabase signup
486 " 🔵 UserService.createUser() provisions Supabase first then local DB — self-registration bypasses local DB creation
487 " 🔵 UserRole.fromValue() safely handles Supabase "authenticated" role — defaults to USER, not null
488 " ⚖️ Decision to refactor LearnSystem DB to canonical single-table architecture for MVP
S45 Debugging 401 error on GET /users/me API in LearnSystem — full auth flow traced from frontend to backend (May 22, 3:52 AM)
489 11:38p ⚖️ LearnSystem Canonical Schema Defined for Backend/DB Alignment
490 11:39p 🔵 LearnSystem Services Lack SQL Migration Files — Only analytics-service Has Flyway Migrations
491 " 🔵 LearnSystem DB Schema Managed via Supabase Migrations — 14 Migration Files Found
492 " 🔵 LearnSystem Domain Entity Inventory — Significant Entities Beyond Canonical Schema
493 11:40p 🔵 Core DB Schema Gap: No learning_items or lesson_blocks Tables in Baseline — Added in Migration 20260520143204
494 " 🔵 Full Enum Migration History for LearnSystem DB — All Key Domains Now Have Native Postgres Enums
495 " 🔵 Java Entity Enum Alignment — AssignmentType and CourseRole Match Canonical; Submission.status Still String
496 " 🔵 DB Schema vs Canonical Spec Gap Analysis — Full Divergence Map
497 11:41p 🔵 LearningItem and LessonBlock Java Entities Exist and Fully Aligned with Canonical Schema
498 " 🔵 CourseMember and GradebookEntry Entities Fully Aligned with Canonical Schema and DB Enums
499 11:43p 🔵 Legacy Resource Entity and Topic Entity Still Actively Used Across 25+ Service Files
500 " 🔵 CanonicalAssignmentService Dual-Writes to Both canonicalSettings JSONB and Legacy Assignment Columns
501 " 🔵 applySettings() in CanonicalAssignmentService Confirms Triple Source of Truth for VPL and File Settings
502 " 🔵 Submission Status Is String-Based Throughout — SubmissionService Uses Constants, CanonicalAssignmentService Uses Literals
503 11:47p 🔴 Critical Bug: SubmissionService Uses GRADED_DRAFT and GRADED_PUBLISHED Status Values Not in DB Constraint
504 11:48p 🔵 Legacy assessment Package Contains Full Quiz/PeerReview Sub-System — All Candidates for Deletion
505 " ⚖️ Planned DB Migration: Create Missing Canonical Enums, Drop Legacy Tables, Fix Status Columns
506 11:49p ⚖️ 4-Task Plan Created for LearnSystem Canonical Schema Migration
507 " ⚖️ 7-Task Sequential Plan for LearnSystem Canonical Schema Migration with Dependencies
508 " 🟣 Supabase Migration 20260522230000_canonical_schema_consolidation.sql Created
509 11:50p 🟣 4 New Java Enum Files Created Matching Native Postgres Enums
510 11:51p 🔄 Submission.java Entity Refactored — Status Converted to Enum, Legacy Columns Removed
511 " 🔴 Module.java Edit Introduced Duplicate Import — isPublished Boolean and Resource Relationship Still Not Updated
512 " 🔄 Module.java and CourseMember.java Entities Refactored to Use Native Enum Bindings
513 " 🔴 Course.java Bug Fixed — getCurrentEnrollment() Now Uses Enum Comparisons; isPublished Removed
514 11:52p 🔄 Course.isActive() Fixed and CourseStatus Enum Simplified — Lowercase toString() Gotcha Removed
515 " 🔄 CourseVisibility Enum Simplified — Lowercase toString() Gotcha Removed
516 " 🔄 Assignment.java Entity Fully Rewritten — 17 Legacy Fields Removed, AssignmentStatus Enum Added
517 " 🔵 CanonicalAssignmentService Has Multiple Compile Errors After Entity Field Removals
518 11:53p 🔄 CanonicalAssignmentService Task 4 Started — AssignmentStatus and SubmissionStatus Imports Added
519 " 🔄 CanonicalAssignmentService createAssignment() Fixed — AssignmentStatus Enum and applySettings() Dual-Write Removed
520 " 🔄 CanonicalAssignmentService updateAssignment and Submit Paths Fixed — All LATE/SUBMITTED String Literals Replaced with Enum
521 " 🔄 SubmissionService Import Cleanup for Type Safety
523 11:57p 🔄 SubmissionService String Status Constants Removed
524 " 🔄 createOrGetDraft Simplified — Email Identity Logic Removed
### May 23, 2026
522 11:10a 🔵 SubmissionService Partial Enum Migration — Imports Added, Method Bodies Still Use Strings
525 11:11a 🔄 SubmissionService Actively Migrating to SubmissionStatus Enum — Multiple Methods Updated
526 " 🔄 SubmissionService review queue filter simplified to use enum name comparison
527 11:12a 🔄 SubmissionService fully migrated from String status constants to SubmissionStatus enum
528 " 🔄 Auto-grading trigger updated to use AssignmentType.VPL enum and externalToolConfig canonical settings

Access 1042k tokens of past work via get_observations([IDs]) or mem-search skill.
</claude-mem-context>