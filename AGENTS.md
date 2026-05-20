<claude-mem-context>
# Memory Context

# [LearnSystem] recent context, 2026-05-19 8:11pm GMT+3

Legend: 🎯session 🔴bugfix 🟣feature 🔄refactor ✅change 🔵discovery ⚖️decision 🚨security_alert 🔐security_note
Format: ID TIME TYPE TITLE
Fetch details: get_observations([IDs]) | Search: mem-search skill

Stats: 50 obs (21,159t read) | 1,036,368t work | 98% savings

### May 19, 2026
228 3:48a 🔴 Fixed env template variable name mismatch: NEXT_PUBLIC_SUPABASE_ANON_KEY renamed to NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in config/env/.env.local.example
229 " 🔴 config/env/.env.production.example also updated: ANON_KEY renamed to PUBLISHABLE_KEY for consistency with frontend code
S28 LearnSystem Supabase quickstart verification + Docker infrastructure overhaul — confirmed existing Supabase setup is complete, then installed Supabase agent skills (May 19, 3:48 AM)
S27 LearnSystem Docker infrastructure overhaul — triggered by failed ./scripts/dev-all.sh build due to missing libseccomp-dev in execution-service Dockerfile (May 19, 3:48 AM)
230 3:49a 🔵 apps/web Supabase setup confirmed complete: @supabase/ssr installed, browser/server clients exist and use PUBLISHABLE_KEY
231 3:50a 🔵 apps/web/.env.local is already populated with real Supabase credentials using PUBLISHABLE_KEY — frontend is ready to run
232 " ✅ Installed Supabase agent skills into LearnSystem project: supabase and supabase-postgres-best-practices
S29 Supabase migrations push for LearnSystem — linked CLI, fixed uuid_generate_v4 bug, pushed all 8 migrations to remote database successfully (May 19, 3:50 AM)
233 " 🔵 LearnSystem has 8 Supabase migrations covering users, learning, QR attendance, VPL autograding, AI, marketplace, RLS, and storage
234 " 🔵 Supabase CLI v2.98.2 installed; local project_id is "learnsystem" (not linked to remote project ref)
235 3:51a 🔵 Supabase CLI authenticated; LearnSystem project (aarkyaevxuhlkefayzro) visible but not yet linked in local config
236 " ✅ Supabase CLI linked to LearnSystem project (aarkyaevxuhlkefayzro); config.toml needs major_version = 17 update
237 " 🔵 Two migrations use uuid_generate_v4() which requires uuid-ossp extension — should be gen_random_uuid() for modern PostgreSQL
238 " 🔴 Fixed uuid_generate_v4() → gen_random_uuid() in users.sql and ai.sql migrations
239 3:53a 🔵 Old backend-spring architecture confirmed: included lms-eureka-server, lms-common, and full Spring Cloud stack — all deleted in restructure
240 3:54a 🔵 Pre-commit audit: .gitignore missing .next/ and .agents/; git tracks old frontend/ and e2e-tests/ env examples as deleted
241 " 🔵 apps/web/.gitignore is a Vite template, not Next.js — missing .next/ entry causing build artifacts to appear untracked
242 " 🔵 Entire apps/web/ Next.js frontend is untracked — never committed to git; full source, routes, components, and contracts all new
243 " 🔵 apps/web/.gitignore confirmed: 28-line Vite template without .next/ — Next.js build output unprotected at both root and app level
244 " 🔵 Root .gitignore is 213 lines long, Python-focused template ending with Cursor/Marimo entries — has no Next.js, Java, Maven, or Spring Boot entries
245 " ✅ Root .gitignore expanded with LearnSystem-specific section covering Next.js, Java/Maven, agent skills, and explicit env file paths
246 3:55a 🔵 Gitignore verification: all env files and .next/ confirmed ignored, but .agents/ NOT IGNORED despite pattern being added
247 " 🔵 git add -A reveals frontend/ was RENAMED to apps/web/ — git detected content moves; 1137 total staged changes
248 3:56a ✅ Mega commit e09eb0d landed: 1137 files changed, entire repo restructure committed to main
S30 LearnSystem repo restructure committed to main — 1137-file mega commit covering Docker consolidation, frontend rename, backend removal, DB migrations, and gitignore fixes (May 19, 3:56 AM)
249 3:40p 🔵 LearnSystem Supabase Migration Structure Discovered
250 " 🔵 Java Microservices Architecture Mapped
251 " 🔵 users Table Duplicates auth.users — Violates Supabase Auth Pattern
252 " 🔵 Learning Migration Contains 20+ Tables With Schema Issues
253 " 🔵 QR Attendance Domain Exists Outside Target Architecture Scope
254 " 🔵 Marketplace Plugin Tables Exist With No Backend/Frontend Support in Target Architecture
255 " 🔵 RLS Policies Established But Allow Direct Frontend Writes to Critical Domain Tables
256 3:42p 🔵 Supabase and Java Flyway Are Two Parallel Migration Systems
257 " 🔵 Deadline and WorkloadSnapshot Entities Use Long/BIGINT — Type Mismatch With UUID System
258 " 🔵 Full Learning Migration Has 40+ Tables Including Plugins and Legacy Domains
259 " 🔵 Notifications, General Audit Logs, and File Metadata Tables Are Missing From Schema
260 " 🔵 Frontend Supabase Type Definitions Expose password_hash — Security Concern
261 " 🔵 Storage Buckets Defined With Three Buckets and Correct Path-Based Policies
262 " 🔵 user-service Has Its Own Standalone users Table With Full Auth Logic
263 3:43p 🔵 Deadline Module Contains WebSocket Notifications, Calendar Export, and Conflict Detection
264 3:44p 🔵 AI Service Uses String UUID PKs — Source of VARCHAR(36) Column Type in AI Tables
265 " 🔵 file Package in learning-service Is a Single FilePermitController Endpoint
266 " 🔵 analytics-service Has Flyway Disabled — Reads From Shared Tables Created by Other Services
277 3:45p ⚖️ LearnSystem Database Schema Redesign Plan Created
267 4:03p 🔵 LearnSystem Web App Build-Blocking TypeScript Error in Courses Page
268 " 🔵 All Bash Execution Blocked by bwrap Sandbox Permission Error
269 4:04p 🔵 bwrap Sandbox Bypassed via require_escalated Permission Flag
270 " 🔵 LearnSystem Web App Full Stack Identified: Next.js 16 + React 19 + Supabase + TanStack Query
271 " 🔵 courses/page.tsx Root Cause: useCoursesQuery Returns Untyped Data
272 " 🔵 src/middleware.ts Is a Supabase Auth Guard — Needs Rename to proxy.ts
273 " 🔵 useCoursesQuery Returns Untyped TanStack Query Result — Fix Path Identified
274 4:05p 🔵 Type Mismatch: API Returns camelCase Course but Template Uses snake_case Fields
275 " 🔵 Java CourseDto Serializes camelCase — Template Snake_case Access is a Runtime Bug
276 4:06p 🔵 PageResponse.content Is the Courses Array — courseService.getMyCourses() Returns Wrong Shape

Access 1036k tokens of past work via get_observations([IDs]) or mem-search skill.
</claude-mem-context>