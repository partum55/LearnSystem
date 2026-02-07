# All States User/Data Flow Map

Updated: 2026-02-06
Source of truth: `frontend/src/App.tsx`, `docs/flows/USER_DATA_FLOW_EVENT_CHAINS.md`

## 1. Full State Chains (All Routed States)

### Auth and Entry
- `/` -> `/dashboard` (router redirect) -> if not authenticated then `PrivateRoute` sends to `/login`
- `/login` -> `POST /auth/login` -> `authStore(token,user,isAuthenticated=true)` -> `/dashboard`
- `/login` -> `/register`
- `/register` -> `POST /auth/register` -> `/login`
- Any private route without auth -> `/login`
- Any role-protected route without allowed role -> `/dashboard`

### Dashboard
- `/dashboard` -> `fetchCourses + fetchNotifications` -> widget navigation:
- `/dashboard` -> `/courses`
- `/dashboard` -> `/courses/:id`
- `/dashboard` -> `/assignments`
- `/dashboard` -> `/grades`
- `/dashboard` -> `/dashboard/customize`
- `/dashboard/customize` -> `localStorage.dashboardWidgets save/reset` -> `/dashboard`

### Courses
- `/courses` -> `fetchCourses` -> `/courses/:id`
- `/courses` -> `/courses/create` (role: `TEACHER` or `SUPERADMIN`)
- `/courses/create` -> `POST /courses/` -> `/courses/:newCourseId`
- `/courses/create` -> `/courses` (cancel)
- `/courses/:id` -> `fetchCourseById + fetchModules + fetchAssignments`
- `/courses/:id` -> tab state switch (`modules|assignments|members|grades`) in URL/session (same route)
- `/courses/:id` -> `Add Module` -> `modulesApi.create` -> `/courses/:id` (refresh state)
- `/courses/:id` -> `Add Assignment` -> `assignmentsApi.create` -> `/courses/:id` (refresh state)
- `/courses/:id` -> `Add Resource` -> `resourcesApi.create` -> `/courses/:id` (refresh state)
- `/courses/:id` -> `Enroll Students` -> enrollment APIs -> `/courses/:id` (refresh members)
- `/courses/:id` -> `/assignments/:assignmentId`

### Assignments and Submission
- `/assignments` -> summary state
- `/assignments/:id` -> `GET assignment + submissions` -> `/assignments/:id/submit` (student path)
- `/assignments/:id` -> `/speed-grader` (teacher grading path, currently parameter mismatch in implementation)
- `/assignments/:id` -> `/virtual-lab` (lab path, currently parameter mismatch in implementation)
- `/assignments/:id/edit` -> `GET/PUT assignment` -> intended return `/courses/:id` (current implementation has route param mismatch)
- `/assignments/:id/submit` -> `submit_code|submit_text|submit_url|submit` -> intended return to assignment details

### Quizzes
- `/quiz/:id` -> `GET quiz + question bank` -> add selected questions -> `/quiz/:id`
- `/quiz/:id` -> `/quiz/:id/take`
- `/quiz/:id/take` -> `start_attempt` -> answer autosave -> `submit attempt` -> `/quiz/:id/results` (implementation tries attempt-specific path)
- `/quiz/:id/results` -> result review -> `/courses/:courseId` or `/assignments`
- `/quiz-builder` -> `POST/PUT quiz` -> `/question-bank`

### Grading and Gradebook
- `/grades` -> `GET /gradebook/entries/student/all/` -> `/courses/:courseId`
- `/gradebook` -> intended single-course gradebook (current route has no course param)
- `/speed-grader` -> grading queue -> save grade -> next/prev/exit (assignment context expected by page, route lacks param)

### Profile and Utility
- `/profile` -> read-only user profile state
- `/profile/settings` -> `PATCH profile + POST password change + PUT user preferences`
- `/calendar` -> student group input -> generate subscription URL -> copy to clipboard
- `/virtual-lab` -> code run API -> output panel updates (page expects assignmentId param, route lacks param)

### Shell-Level Navigation States
- Header links: `/profile`, `/profile/settings` (plus currently broken links `/notifications`, `/settings`)
- Sidebar links: `/dashboard`, `/courses`, `/calendar`, `/assignments`, `/grades`, `/question-bank`, `/quiz-builder` (plus currently broken `/admin`)
- Logout from Header -> clear auth/token/cookies -> `/login`

## 2. State-by-State Data Movement

Legend:
- `In`: data required when entering state
- `Calls`: backend/API operations
- `Out`: data produced/updated
- `Next`: target states reachable by user events

| State | In | Calls | Out | Next |
|---|---|---|---|---|
| `/login` | `email,password` form fields | `POST /auth/login` | auth token, user profile, `isAuthenticated=true` | `/dashboard`, `/register` |
| `/register` | registration form fields | `POST /auth/register` | created account acknowledgement | `/login` |
| `/dashboard` | authenticated user context | course + notification fetches | dashboard widgets data, unread counts | `/dashboard/customize`, `/courses`, `/courses/:id`, `/assignments`, `/grades` |
| `/dashboard/customize` | existing widget config | localStorage read/write | updated dashboard layout | `/dashboard` |
| `/courses` | user role + optional filter text | courses fetch | course list state, filter state | `/courses/:id`, `/courses/create` |
| `/courses/create` | new course form fields | `POST /courses/` | new `courseId`, created course | `/courses/:newCourseId`, `/courses` |
| `/courses/:id` | `courseId` route param | `fetchCourseById`, `fetchModules`, `fetchAssignments`, create module/assignment/resource, enrollment APIs | course entity, modules, assignments, resources, members, active tab | `/assignments/:assignmentId`, same route (tab/modal actions) |
| `/assignments` | authenticated user context | none (summary page) | local summary UI state | usually `/assignments/:id` via other pages |
| `/assignments/:id` | `assignmentId` route param | assignment details + submissions fetch | assignment data, submissions list, current tab | `/assignments/:id/submit`, `/speed-grader`, `/virtual-lab` |
| `/assignments/:id/edit` | route `id` (page expects more params) | assignment read/update/duplicate/template APIs | updated assignment content/settings | intended `/courses/:id` (mismatch exists) |
| `/assignments/:id/submit` | route `id`, submission form inputs | submission endpoints (`submit_code`, `submit_text`, `submit_url`, `submit`) | saved submission, status flags, upload refs | intended assignment detail return |
| `/speed-grader` | intended `assignmentId`, selected submission | submission fetch + grade update APIs | saved grade, feedback, rubric/comment updates | next/prev submission, exit route |
| `/question-bank` | intended `courseId`, search/filter state | question list/create/delete APIs | question bank list, selected/filter state | same route, `/quiz-builder`, `/quiz/:id` workflows |
| `/quiz/:id` | `quizId` route param | quiz read, questions read, add questions to quiz | quiz with linked questions | `/quiz/:id/take`, same route |
| `/quiz/:id/take` | `quizId`, timer settings | start attempt + submit attempt APIs | attempt object, answers map, completion result pointer | `/quiz/:id/results` |
| `/quiz/:id/results` | `quizId` and expected `attemptId` context | attempt result fetch | score breakdown, question-level correctness | `/courses/:courseId`, `/assignments` |
| `/quiz-builder` | optional quiz draft data | `POST/PUT` quiz APIs | saved quiz metadata + questions | `/question-bank` |
| `/grades` | authenticated student context | `GET /gradebook/entries/student/all/` | course-grade summaries | `/courses/:courseId` |
| `/gradebook` | intended `courseId` | student gradebook API | assignment grade rows, aggregate stats | assignment/course drill-down |
| `/profile` | user info from auth/profile store | profile fetch/read path | rendered profile fields | `/profile/settings` |
| `/profile/settings` | profile form + password form + preferences | profile patch, password change, preference update | persisted user profile/password/preferences | `/profile`, same route |
| `/calendar` | `studentGroupId` input | none required for URL generation | generated subscription URL, clipboard copy result | same route |
| `/virtual-lab` | intended `assignmentId`, code/input text | `POST /assessments/virtual-lab/execute` | execution output, runtime status, error/output text | same route, return via app nav |

## 3. Broken or Mismatched Transitions (Current Code)

- `/assignments/:id` page logic expects `assignmentId` param key, route provides `id`.
- `/assignments/:id` navigates to `/speedgrader/...`; actual route is `/speed-grader`.
- `/assignments/:id` navigates to `/virtual-lab/:assignmentId`; actual route is `/virtual-lab`.
- `/speed-grader` page expects `assignmentId` param, route has none.
- `/gradebook` page expects `courseId` param, route has none.
- `/question-bank` page expects `courseId` param, route has none.
- `/quiz/:id/results` page expects attempt context not present in route.
- Header links to `/notifications` and `/settings` but these routes are not defined.
- Sidebar links to `/admin` but this route is not defined.

