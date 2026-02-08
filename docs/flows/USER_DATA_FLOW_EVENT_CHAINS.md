# User + Data Flow Event Chains (Full Static Audit)

> [!WARNING]
> Historical snapshot: this report was generated during a pre-consolidation audit and includes references to former split services (`course`, `assessment`, `gradebook`, `deadline`, `submission`).
> For the current architecture, use `lms-learning-service` docs and `docs/adr/0001-learning-service-modular-monolith.md`.

Audit timestamp: 2026-02-06

## Scope
- Repository files scanned: 581
- Interactive frontend files with user events: 74
- Interactive pages audited: 22
- Interactive components audited: 48
- Backend controllers/mappings audited: user, learning (course + assessment + gradebook + submission + deadline), analytics, AI, gateway admin

This document maps how user actions (clicks, form fills, submits, redirects) move through UI state, API requests, and backend routes.

## Chain Notation
- `UI event` -> `handler/state update` -> `API call(s)` -> `navigation/render outcome`
- `BROKEN` means chain mismatch in route params, route path, endpoint contract, or missing backend target.
- `UNWIRED` means code exists but no route or no real handler attached.

## 1. Global App Flow
### App boot + auth gate
- `App mount` -> `useAuthStore.fetchCurrentUser()` -> if token exists call `GET /users/me` -> set `user/isAuthenticated` -> route rendering.
- `PrivateRoute` blocks protected routes when `isAuthenticated=false` and redirects to `/login`.
- `RoleRoute` blocks unauthorized role access and redirects to `/dashboard`.

### API client behavior
- Every request goes through `apiClient` with `Authorization: Bearer <token>` when present.
- `429` responses retry once after `retry-after`/fallback delay.
- `401` responses attempt token refresh (currently stubbed to `null`), then fail through.

### Shell navigation (Header + Sidebar)
- Sidebar `NavLink` drives primary app navigation.
- Header supports theme toggle, language toggle, user menu, notifications link, logout.
- Logout chain: `Header.handleLogout` -> `authStore.logout()` clears state/token/cookies + `window.location.replace('/login')` -> Header also sets `window.location.href='/login'` (redundant second redirect).

## 2. Route-Level User/Data Flow Chains

### `/login`
- `Submit login form` -> `authStore.login(email,password)` -> `POST /auth/login` -> token/user stored -> `isAuthenticated=true` -> effect redirects to `/dashboard`.
- `Click Register` -> route `/register`.
- `Forgot password button` -> no API or navigation attached (`UNWIRED`).

### `/register`
- `Submit register form` -> client validation -> `POST /auth/register` -> success navigate `/login` with success state.
- `Click Login` -> route `/login`.

### `/dashboard`
- Page load -> `fetchCourses()` + `fetchNotifications()`.
- `Customize Dashboard` button -> navigate `/dashboard/customize`.
- Widget links route to `/courses/:id`, `/courses`, `/assignments`, `/grades`.

### `/dashboard/customize`
- Load/save/reset dashboard config in `localStorage.dashboardWidgets`.
- `Back` -> `/dashboard`.
- `Reset` -> confirm -> localStorage cleared -> default widgets restored.

### `/courses`
- Page load -> `fetchCourses()`.
- Search/filter controls update local state only.
- `AI Generator` opens `AICourseGenerator` modal.
- `Create Course` -> `/courses/create`.
- Course card click -> `/courses/:id`.

### `/courses/create`
- Fill form fields -> local state + validation.
- `Submit` -> `useCourseStore.createCourse` -> `POST /courses/` -> navigate `/courses/${newCourse.id}`.
- `Cancel/back` -> `/courses`.

### `/courses/:id`
- Page load -> `fetchCourseById(id)` + `fetchModules(id)` + `fetchAssignments(id)`.
- Tab clicks (`modules/assignments/members/grades`) sync tab in URL query and session storage.
- Instructor actions:
  - `Add module` -> `CreateModuleModal` -> `modulesApi.create`.
  - `Add assignment` -> `CreateAssignmentModal` -> `assignmentsApi.create`.
  - `Add resource` -> `CreateResourceModal` -> `resourcesApi.create`.
  - `Enroll students` -> `EnrollStudentsModal`.
  - `AI module/assignment generation` -> `AIElementGenerator` -> `aiApi.generateModules|generateAssignments`.
- Module header click toggles expand/collapse.
- Resource link click opens file/url in new tab.
- Assignment link click -> `/assignments/:assignmentId`.
- `BROKEN`: `/courses/${id}/edit` link has no matching route in `App.tsx`.

### `/assignments`
- Static summary page only (no actionable assignment list yet).

### `/assignments/:id` (AssignmentDetail)
- Page load -> `GET assessments/assignments/${assignmentId}/` + `GET submissions/submissions/?assignment=${assignmentId}`.
- Student actions:
  - `Submit assignment` -> navigate `/assignments/${assignmentId}/submit`.
  - `Open virtual lab` -> navigate `/virtual-lab/${assignmentId}`.
- Teacher actions:
  - Switch `details/submissions` tab.
  - `Open SpeedGrader` -> navigate `/speedgrader/${assignmentId}`.
  - Per-row `Grade` -> navigate `/speedgrader/${assignmentId}?submission=...`.
- `BROKEN`: route param key mismatch (`App` uses `:id`, page expects `assignmentId`).
- `BROKEN`: navigates to `/speedgrader/...` but defined route is `/speed-grader`.
- `BROKEN`: navigates to `/virtual-lab/:assignmentId` but defined route is `/virtual-lab`.

### `/assignments/:id/edit` (AssignmentEditor)
- Intended: load assignment, edit tabs, submit save/update, duplicate, save template.
- Actual handlers call:
  - `GET assessments/assignments/?course=${courseId}`
  - `GET/PUT assessments/assignments/${assignmentId}/`
  - `POST .../${assignmentId}/duplicate/`
  - `POST .../${assignmentId}/save_as_template/`
- `BROKEN`: page expects `courseId` and optional `assignmentId`, but route only provides `:id`.
- `BROKEN`: post-save and cancel navigation expect `/courses/${courseId}` which is undefined when param missing.
- `BROKEN`: duplicate redirect `/courses/${courseId}/assignments/${data.id}/edit` has no matching route.

### `/assignments/:id/submit` (SubmitAssignment)
- Intended chain:
  - Load assignment + fetch/create submission draft.
  - Fill submission inputs (code/text/url/files).
  - Submit via one of `submit_code`, `submit_text`, `submit_url`, `submit` endpoints.
  - Redirect to assignment details.
- `BROKEN`: page expects `courseId` + `assignmentId`, route only has `:id`.
- `BROKEN`: redirects to `/courses/${courseId}/assignments/${assignmentId}` (no such route).

### `/speed-grader` (SpeedGrader)
- Intended chain:
  - Load assignment + submissions queue.
  - Edit grade/feedback/rubric/comments.
  - Save grade -> API -> next/prev/exit navigation.
  - Unsaved-changes modal gates navigation.
- `BROKEN`: page expects `assignmentId` route param, route has none (`/speed-grader`).
- `BROKEN`: endpoints use `/submissions/submissions/...` paths (submission service not present in repo).

### `/question-bank`
- Page load -> fetch questions -> filter/search.
- `Create question` -> `CreateQuestionModal` -> `POST /assessments/questions/`.
- `Delete` -> confirmation -> `DELETE /assessments/questions/:id/`.
- `Edit` currently just opens create modal without loading selected question.
- `BROKEN`: page expects `courseId` param but route has none.

### `/quiz/:id` (QuizDetail)
- Load quiz + available questions.
- `Create question` opens modal, refreshes list.
- Select question checkboxes + `Add selected` -> add-to-quiz API.
- `BROKEN`: page expects `quizId`, route provides `id`.
- `BROKEN`: fetch/add endpoints use query/legacy forms (`/assessments/questions/?course=...`, `/add_questions/`) that do not match controller mappings.

### `/quiz/:id/take` (QuizTaking)
- Start chain:
  - `GET /assessments/quizzes/${quizId}/`
  - `POST /assessments/quizzes/${quizId}/start_attempt/`
  - initialize timer + auto-save to localStorage.
- Question answer events update `answers` and persist locally.
- Submit chain:
  - `POST /assessments/attempts/${attempt.id}/submit/` with answers.
  - local saved answers cleared.
  - navigate `/quiz/${quizId}/attempt/${attempt.id}/results`.
- `BROKEN`: result route `/quiz/:id/results` has no `attempt` segment.

### `/quiz/:id/results` (QuizResults)
- Load result -> `GET /assessments/attempts/${attemptId}/`.
- Per-question expand toggle shows answer details.
- Actions:
  - `Back to course` -> `/courses/${result.quiz.id}`.
  - `View all assignments` -> `/assignments`.
- `BROKEN`: route has no `attemptId` param but page requires it.
- `POTENTIAL DATA BUG`: `result.quiz.id` is quiz id, not guaranteed course id.

### `/quiz-builder` (QuizBuilder)
- Create/edit quiz across tabs (`basic/questions/settings`).
- Add/remove/reorder/duplicate questions; edit choices and correct answers.
- Save -> `POST/PUT /assessments/quizzes/...` -> navigate `/question-bank`.
- `BROKEN`: page expects `quizId` param but route has none.

### `/grades` (AllGrades)
- Load all courses summary -> `GET /gradebook/entries/student/all/`.
- Course row `View details` link -> `/courses/:courseId`.

### `/gradebook` (StudentGradebook)
- Intended: fetch student gradebook for one course + filter/sort + assignment links.
- `BROKEN`: route has no `courseId`, page expects one.
- `BROKEN`: API path used `/api/gradebook/student/${courseId}/` does not match gradebook controllers in repo.

### `/profile`
- Read-only profile display (no form events).

### `/profile/settings`
- Profile form submit -> `PATCH /auth/me/`.
- Password form submit -> `POST /auth/change-password/`.
- Theme/language buttons -> UI store + `updateUserPreferences` (`PUT /users/me`).
- `BROKEN`: profile/password endpoints should target user service paths (`/users/me`, `/users/me/change-password`).

### `/calendar`
- Fill `studentGroupId` -> `Generate subscription URL` -> local computed `/api/calendar/student/{id}/subscribe`.
- `Copy` -> clipboard API.

### `/virtual-lab`
- Load assignment by `assignmentId`.
- Code/input change events update local state.
- `Run Code` -> `POST /assessments/virtual-lab/execute`.
- `Stop` aborts request.
- `BROKEN`: route has no `assignmentId` param but page requires one.

## 3. Cross-Cutting Component Chains

### Header (`frontend/src/components/Header.tsx`)
- Theme toggle -> localStorage + DOM class + `updateUserPreferences`.
- Language menu -> i18n + `updateUserPreferences`.
- Notifications icon -> `/notifications`.
- User menu links -> `/profile`, `/settings`, logout.
- `BROKEN`: `/notifications` and `/settings` are not defined routes (`/profile/settings` exists instead).

### Sidebar (`frontend/src/components/Sidebar.tsx`)
- Nav links to dashboard/courses/calendar/assignments/grades/profile.
- Teacher extras: `/question-bank`, `/quiz-builder`.
- Superadmin extra: `/admin`.
- `BROKEN`: `/admin` route missing from `App.tsx`.

### Enrollment and members
- `EnrollStudentsModal` manual/csv forms -> enrollment APIs.
- `CourseMembersTab` role filter + unenroll action.
- `BROKEN`: endpoints do not match course service controller contracts (`/members/{queryString}`, `/unenroll/`, `/enroll_students/`, `/enroll-csv/`).

### Gradebook components
- `TeacherGradebook` supports inline grade edit, filters, expand/collapse, recalc action.
- `BROKEN`: update/recalc endpoints differ from controllers (`/update_grade/`, `/entries/recalculate/...`).
- `CourseGradesTab` student module grades with expand toggles.
- `BROKEN`: endpoint `/gradebook/entries/student/${courseId}/` not present in mapped controllers.

### Resource components
- `CreateResourceModal` uses `resourcesApi.create` (matches course resource routes).
- `AddResourceModal` uploads to `/courses/resources/upload/`.
- `BROKEN`: no backend mapping for `/courses/resources/upload/`.

### AI components
- `AICourseGenerator`: prompt/options -> `aiApi.generateCourse` -> preview -> save via `generateAndSaveCourse`.
- `AIElementGenerator`: module/assignment/quiz generation with context + cancelable request.
- `AIContentGenerator`: generic generator using `/v1/ai/generate/{type}`.
- `AIContentEditor`, `AIAssistantPanel`, template selection all map to `aiApi` endpoints.
- `BROKEN RISK`: `apiClient` baseURL often `/api`; `aiApi` default paths start with `/api/ai`, producing `/api/api/ai/...` unless env overrides with absolute URL.

### Authoring components (`frontend/src/features/authoring/...`)
- User edits task metadata/settings/rubric/questions and triggers save/validate/preview.
- API targets `/authoring/tasks*`.
- `BROKEN/UNVERIFIED`: no matching backend authoring controller found in this repo.

## 4. Backend Routing Contract Notes (Critical)

### Gateway forwarding mismatch (assessment)
- Gateway routes to assessment use `Path=/api/assessments/**` with no rewrite.
- Assessment service controllers are mounted at `/assignments`, `/quizzes`, `/questions`, `/quiz-attempts`, `/virtual-lab` under context `/api`.
- This implies `/api/assessments/...` requests likely do not hit controllers without rewrite/strip rules.

### Double `/api` risk in several services
- Services with `server.servlet.context-path: /api` and controllers also using `@RequestMapping("/api/...")` can expose effective paths as `/api/api/...`.
- Observed in gradebook and analytics controllers.

### Submission service gap
- Frontend heavily uses `/submissions/submissions/...` style endpoints.
- Gateway declares `lms-submission-service`, but this repository has no such service module.

## 5. Broken Chain Matrix (Prioritized)

1. Route params do not match route definitions (assignment/quiz/speed-grader/virtual-lab/gradebook/question-bank).
2. Navigation links target undefined routes (`/settings`, `/notifications`, `/admin`, `/courses/:id/edit`, multiple `/speedgrader/*`).
3. Submission/grading flows call endpoints for a service not present in repo (`lms-submission-service`).
4. Multiple frontend API paths do not match backend controller contracts (question/quiz attempt/member/gradebook/profile flows).
5. Gateway and service prefixing likely breaks assessment and some analytics/gradebook paths without rewrite fixes.

## 6. Coverage Artifacts
The appendices below include the full line-level event inventory so every discovered button/click/form/navigation chain is traceable back to source files.

## Appendix A: Interactive Files (74)
```text
frontend/src/api/client.ts
frontend/src/components/AddResourceModal.tsx
frontend/src/components/AtRiskStudents.tsx
frontend/src/components/Card.tsx
frontend/src/components/CodeEditor.tsx
frontend/src/components/CourseGradesTab.tsx
frontend/src/components/CourseMembersTab.tsx
frontend/src/components/CreateAssignmentModal.tsx
frontend/src/components/CreateModuleModal.tsx
frontend/src/components/CreateQuestionModal.tsx
frontend/src/components/CreateQuizModal.tsx
frontend/src/components/CreateResourceModal.tsx
frontend/src/components/DashboardBuilder.tsx
frontend/src/components/DashboardCustomizer.tsx
frontend/src/components/DashboardWidgets.tsx
frontend/src/components/EnrollStudentsModal.tsx
frontend/src/components/Header.tsx
frontend/src/components/LanguageSwitcher.tsx
frontend/src/components/Modal.tsx
frontend/src/components/ResourceItem.tsx
frontend/src/components/RichTextEditor.tsx
frontend/src/components/SettingsBar.tsx
frontend/src/components/Sidebar.tsx
frontend/src/components/TeacherGradebook.tsx
frontend/src/components/TemplateSelection.tsx
frontend/src/components/ai/AIAssistantPanel.tsx
frontend/src/components/ai/AIContentEditor.tsx
frontend/src/components/ai/AIContentGenerator.tsx
frontend/src/components/ai/AICourseGenerator.tsx
frontend/src/components/ai/AIElementGenerator.tsx
frontend/src/components/ai/AIErrorFallback.tsx
frontend/src/components/analytics/AnalyticsDashboard.tsx
frontend/src/components/common/ConfirmModal.tsx
frontend/src/components/common/ErrorBoundary.tsx
frontend/src/components/common/UnsavedChangesPrompt.tsx
frontend/src/components/questions/CodeQuestion.tsx
frontend/src/components/questions/EssayQuestion.tsx
frontend/src/components/questions/FileUploadQuestion.tsx
frontend/src/components/questions/HotspotQuestion.tsx
frontend/src/components/questions/OrderingQuestion.tsx
frontend/src/components/questions/QuestionTypeSelector.tsx
frontend/src/features/authoring/components/AIReviewPanel.tsx
frontend/src/features/authoring/components/LatexEditor.tsx
frontend/src/features/authoring/components/QuestionEditor.tsx
frontend/src/features/authoring/components/QuizBuilder.tsx
frontend/src/features/authoring/components/RubricEditor.tsx
frontend/src/features/authoring/components/TaskEditor.tsx
frontend/src/features/authoring/components/TaskMetadataForm.tsx
frontend/src/features/authoring/components/TaskSettingsForm.tsx
frontend/src/hooks/useUnsavedChangesWarning.ts
frontend/src/pages/AdminDashboard.tsx
frontend/src/pages/AllGrades.tsx
frontend/src/pages/AssignmentDetail.tsx
frontend/src/pages/AssignmentEditor.tsx
frontend/src/pages/CalendarPage.tsx
frontend/src/pages/CourseCreate.tsx
frontend/src/pages/CourseDetail.tsx
frontend/src/pages/CourseList.tsx
frontend/src/pages/Dashboard.tsx
frontend/src/pages/DashboardCustomize.tsx
frontend/src/pages/Login.tsx
frontend/src/pages/ProfileSettings.tsx
frontend/src/pages/QuestionBank.tsx
frontend/src/pages/QuizBuilder.tsx
frontend/src/pages/QuizDetail.tsx
frontend/src/pages/QuizResults.tsx
frontend/src/pages/QuizTaking.tsx
frontend/src/pages/Register.tsx
frontend/src/pages/SpeedGrader.tsx
frontend/src/pages/StudentGradebook.tsx
frontend/src/pages/SubmitAssignment.tsx
frontend/src/pages/VirtualLab.tsx
frontend/src/store/authStore.ts
frontend/src/utils/serviceWorkerRegistration.ts
```

## Appendix B: Page Event + Handler + API Inventory
```text
## frontend/src/pages/AdminDashboard.tsx
### handlers
72:  const fetchSystemHealth = useCallback(async () => {
95:  const fetchAnalytics = async () => {
### user-events
139:                onClick={() => setActiveTab('services')}
150:                onClick={() => setActiveTab('overview')}
160:                onClick={() => setActiveTab('courses')}
170:                onClick={() => setActiveTab('instructors')}
191:                  onClick={fetchSystemHealth}
### api
5:import { getSystemHealth, SystemHealth, ServiceStatus } from '../api/admin';
76:      const health = await getSystemHealth();
99:        fetch('/api/admin/analytics/platform-usage'),
100:        fetch('/api/admin/analytics/course-effectiveness'),
101:        fetch('/api/admin/analytics/instructor-productivity'),

## frontend/src/pages/AllGrades.tsx
### handlers
37:  const fetchAllGrades = async () => {
### user-events
243:                                <Link
### api
41:      const response = await apiClient.get<AllGradesData>('/gradebook/entries/student/all/');

## frontend/src/pages/AssignmentDetail.tsx
### handlers
42:  const navigate = useNavigate();
59:  const fetchAssignment = async () => {
70:  const fetchSubmissions = async () => {
86:  const handleSubmitAssignment = () => {
91:  const openVirtualLab = () => {
95:  const openSpeedGrader = () => {
### user-events
88:    navigate(`/assignments/${assignmentId}/submit`);
92:    navigate(`/virtual-lab/${assignmentId}`);
96:    navigate(`/speedgrader/${assignmentId}`);
143:                      <Button onClick={openVirtualLab} className="bg-green-600 hover:bg-green-700">
160:                        <Button onClick={handleSubmitAssignment} variant="outline">
165:                      <Button onClick={handleSubmitAssignment} className="bg-blue-600 hover:bg-blue-700">
233:                  onClick={() => setActiveTab('details')}
244:                    onClick={() => setActiveTab('submissions')}
318:                    <Button onClick={openSpeedGrader}>
383:                                  onClick={() => navigate(`/speedgrader/${assignmentId}?submission=${submission.id}`)}
### api

## frontend/src/pages/AssignmentEditor.tsx
### handlers
42:  const navigate = useNavigate();
106:  const fetchAvailableAssignments = async () => {
141:  const fetchAssignment = async () => {
155:  const handleSubmit = async (e: React.FormEvent) => {
184:  const handleDuplicate = async () => {
201:  const handleSaveAsTemplate = async () => {
212:  const addResource = () => {
219:  const updateResource = (index: number, field: string, value: string) => {
225:  const removeResource = (index: number) => {
232:  const addTestCase = () => {
239:  const updateTestCase = (index: number, field: string, value: any) => {
245:  const removeTestCase = (index: number) => {
### user-events
176:      navigate(`/courses/${courseId}`);
193:      navigate(`/courses/${courseId}/assignments/${data.id}/edit`);
261:          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
278:          onChange={(e) => setFormData({ ...formData, assignment_type: e.target.value })}
298:            onChange={(e) => setFormData({ ...formData, max_points: parseFloat(e.target.value) })}
313:            onChange={(e) => setFormData({ ...formData, available_from: e.target.value })}
325:            onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
342:            onChange={(e) => setFormData({ ...formData, description_format: e.target.value })}
352:          onChange={(value) => setFormData({ ...formData, description: value })}
367:            onChange={(e) => setFormData({ ...formData, instructions_format: e.target.value })}
377:          onChange={(value) => setFormData({ ...formData, instructions: value })}
393:            onClick={addResource}
404:              onChange={(e) => updateResource(index, 'name', e.target.value)}
411:              onChange={(e) => updateResource(index, 'url', e.target.value)}
417:              onClick={() => removeResource(index)}
435:              onChange={(e) => setFormData({ ...formData, programming_language: e.target.value })}
455:              onChange={(value: string) => setFormData({ ...formData, starter_code: value })}
467:              onChange={(value: string) => setFormData({ ...formData, solution_code: value })}
484:              onChange={(e) => setFormData({ ...formData, programming_language: e.target.value })}
501:              onChange={(value: string) => setFormData({ ...formData, starter_code: value })}
513:              onChange={(value: string) => setFormData({ ...formData, solution_code: value })}
523:              onChange={(e) => setFormData({ ...formData, auto_grading_enabled: e.target.checked })}
550:              onChange={(e) => setFormData({ 
567:                onChange={(e) => setFormData({ ...formData, max_files: parseInt(e.target.value) })}
580:                onChange={(e) => setFormData({ ...formData, max_file_size: parseFloat(e.target.value) * 1048576 })}
600:            onChange={(e) => setFormData({ ...formData, allow_late_submission: e.target.checked })}
616:              onChange={(e) => setFormData({ ...formData, late_penalty_percent: parseFloat(e.target.value) })}
638:          onChange={(e) => setFormData({
658:          onChange={(e) => setFormData({
676:          onChange={(e) => {
702:          onChange={(e) => setFormData({ ...formData, is_template: e.target.checked })}
721:              onChange={(e) => setFormData({ ...formData, auto_grading_enabled: e.target.checked })}
737:                  onClick={addTestCase}
752:                      onClick={() => removeTestCase(index)}
763:                        onChange={(e) => updateTestCase(index, 'input', e.target.value)}
772:                        onChange={(e) => updateTestCase(index, 'expected_output', e.target.value)}
782:                        onChange={(e) => updateTestCase(index, 'points', parseFloat(e.target.value))}
846:      <form onSubmit={handleSubmit}>
854:                onClick={() => setActiveTab(tab.id as any)}
879:            type="submit"
890:                onClick={handleDuplicate}
898:                onClick={handleSaveAsTemplate}
909:            onClick={() => navigate(`/courses/${courseId}`)}
### api
108:      const response = await api.get(`assessments/assignments/?course=${courseId}`);
168:        await api.put(`assessments/assignments/${assignmentId}/`, formData);
170:        await api.post('assessments/assignments/', {
189:      const response = await api.post(`assessments/assignments/${assignmentId}/duplicate/`, {
205:      await api.post(`assessments/assignments/${assignmentId}/save_as_template/`);

## frontend/src/pages/CalendarPage.tsx
### handlers
18:  const handleGenerateUrl = () => {
27:  const handleCopyUrl = () => {
### user-events
23:    const url = `${window.location.origin}/api/calendar/student/${studentGroupId}/subscribe`;
54:                onChange={(e) => setStudentGroupId(e.target.value)}
61:            <Button onClick={handleGenerateUrl} className="w-full sm:w-auto">
75:                <Button onClick={handleCopyUrl} variant="secondary">
### api

## frontend/src/pages/CourseCreate.tsx
### handlers
13:  const navigate = useNavigate();
28:  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
64:  const handleSubmit = async (e: React.FormEvent) => {
### user-events
86:      navigate(`/courses/${newCourse.id}`);
100:                onClick={() => navigate('/courses')}
121:            <form onSubmit={handleSubmit}>
136:                        onChange={handleChange}
152:                        onChange={handleChange}
167:                        onChange={handleChange}
188:                        onChange={handleChange}
210:                          onChange={handleChange}
219:                          onChange={handleChange}
233:                        onChange={handleChange}
259:                  onClick={() => navigate('/courses')}
265:                  type="submit"
### api

## frontend/src/pages/CourseDetail.tsx
### handlers
76:  const handleTabChange = useCallback((tab: 'modules' | 'assignments' | 'members' | 'grades') => {
95:  const handleModuleCreated = () => {
101:  const handleAssignmentCreated = () => {
108:  const handleResourceCreated = () => {
114:  const handleAddResource = (moduleId: string) => {
119:  const handleAddAssignment = (moduleId: string) => {
124:  const toggleModule = (moduleId: string) => {
### user-events
159:                <Link to="/courses" className="hover:text-blue-600 dark:hover:text-blue-400">
182:                        <Link to={`/courses/${id}/edit`}>
187:                        <Button size="sm" onClick={() => setShowEnrollModal(true)}>
225:                    onClick={() => handleTabChange(tab.id as 'modules' | 'assignments' | 'members' | 'grades')}
250:                        onClick={() => setShowAIModuleGenerator(true)}
255:                      <Button onClick={() => setShowModuleModal(true)}>
275:                            onClick={() => toggleModule(module.id)}
309:                                  onClick={(e) => {
322:                                  onClick={(e) => {
333:                                  onClick={(e) => {
401:                                    <Link
453:                      <Button onClick={() => setShowAssignmentModal(true)}>
470:                        <Link key={assignment.id} to={`/assignments/${assignment.id}`}>
### api
41:    const urlTab = searchParams.get('tab');
128:        newSet.delete(moduleId);

## frontend/src/pages/CourseList.tsx
### handlers
### user-events
69:                    onClick={() => setShowAIGenerator(true)}
74:                  <Link to="/courses/create">
94:                      onChange={(e) => setSearchTerm(e.target.value)}
104:                        onClick={() => setFilterVisibility(filter)}
126:                  <Link key={course.id} to={`/courses/${course.id}`}>
### api

## frontend/src/pages/Dashboard.tsx
### handlers
23:  const navigate = useNavigate();
28:    const saved = localStorage.getItem('dashboardWidgets');
39:    const handleStorageChange = (e: StorageEvent) => {
### user-events
91:                  onClick={() => navigate('/dashboard/customize')}
126:                <Button onClick={() => navigate('/dashboard/customize')}>
### api

## frontend/src/pages/DashboardCustomize.tsx
### handlers
18:  const navigate = useNavigate();
26:  const loadDashboardConfig = () => {
28:      const saved = localStorage.getItem('dashboardWidgets');
42:  const handleSave = (updatedWidgets: DashboardWidgetConfig[]) => {
54:  const handleReset = () => {
### user-events
84:                  onClick={() => navigate('/dashboard')}
107:                  onClick={handleReset}
### api

## frontend/src/pages/Login.tsx
### handlers
13:  const navigate = useNavigate();
40:  const handleSubmit = async (e: React.FormEvent) => {
59:      const savedLanguage = localStorage.getItem('language');
### user-events
24:      navigate('/dashboard', { replace: true });
85:        <form className="mt-6 sm:mt-8 space-y-4 sm:space-y-6" onSubmit={handleSubmit}>
91:              onChange={(e) => setEmail(e.target.value)}
99:              onChange={(e) => setPassword(e.target.value)}
142:            type="submit"
153:            <Link
### api

## frontend/src/pages/ProfileSettings.tsx
### handlers
51:  const handleProfileUpdate = async (e: React.FormEvent) => {
68:  const handlePasswordChange = async (e: React.FormEvent) => {
99:  const handleThemeChange = async (newTheme: 'light' | 'dark') => {
104:  const handleLanguageChange = async (newLanguage: 'uk' | 'en') => {
### user-events
145:                <form onSubmit={handleProfileUpdate} className="space-y-4">
166:                      onChange={(e) => setProfileData({ ...profileData, display_name: e.target.value })}
180:                        onChange={(e) => setProfileData({ ...profileData, first_name: e.target.value })}
193:                        onChange={(e) => setProfileData({ ...profileData, last_name: e.target.value })}
206:                      onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
214:                    <Button type="submit" disabled={loading}>
241:                        onClick={() => handleThemeChange('light')}
260:                        onClick={() => handleThemeChange('dark')}
287:                        onClick={() => handleLanguageChange('en')}
304:                        onClick={() => handleLanguageChange('uk')}
336:                <form onSubmit={handlePasswordChange} className="space-y-4">
344:                      onChange={(e) => setPasswordData({ ...passwordData, old_password: e.target.value })}
357:                      onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
370:                      onChange={(e) => setPasswordData({ ...passwordData, new_password_confirm: e.target.value })}
377:                    <Button type="submit" disabled={loading} variant="secondary">
### api
57:      await apiClient.patch('/auth/me/', profileData);
85:      await apiClient.post('/auth/change-password/', passwordData);

## frontend/src/pages/QuestionBank.tsx
### handlers
60:  const fetchQuestions = async () => {
74:  const handleDeleteQuestion = async (questionId: string) => {
94:  const handleEditQuestion = () => {
### user-events
160:                <Button onClick={() => setShowCreateModal(true)}>
230:                      onChange={(e) => setSearchQuery(e.target.value)}
239:                      onChange={(e) => setFilterType(e.target.value)}
264:                      <Button onClick={() => setShowCreateModal(true)}>
332:                            onClick={handleEditQuestion}
339:                            onClick={() => handleDeleteQuestion(question.id)}
### api
63:      const response = await apiClient.get(`/assessments/questions/?course=${courseId}`);
83:      await apiClient.delete(`/assessments/questions/${deleteConfirm.questionId}/`);

## frontend/src/pages/QuizBuilder.tsx
### handlers
69:  const navigate = useNavigate();
103:  const fetchCourses = async () => {
112:  const fetchQuiz = useCallback(async () => {
117:      const loadedQuiz = {
140:  const handleSave = async () => {
171:  const addQuestion = (type: Question['question_type'] = 'multiple_choice') => {
193:  const duplicateQuestion = (index: number) => {
206:  const removeQuestion = (index: number) => {
213:  const moveQuestion = (index: number, direction: 'up' | 'down') => {
222:  const updateQuestion = (index: number, field: keyof Question, value: any) => {
243:  const updateChoice = (questionIndex: number, choiceIndex: number, value: string) => {
251:  const addChoice = (questionIndex: number) => {
259:  const removeChoice = (questionIndex: number, choiceIndex: number) => {
266:  const toggleCorrectAnswer = (questionIndex: number, choice: string) => {
### user-events
162:      navigate('/question-bank');
299:                onClick={() => moveQuestion(index, 'up')}
307:                onClick={() => moveQuestion(index, 'down')}
315:                onClick={() => duplicateQuestion(index)}
322:                onClick={() => removeQuestion(index)}
339:                  onChange={(e) => updateQuestion(index, 'question_type', e.target.value)}
359:                  onChange={(e) => updateQuestion(index, 'points', parseInt(e.target.value) || 0)}
371:                onChange={(e) => updateQuestion(index, 'question_text', e.target.value)}
387:                    onClick={() => addChoice(index)}
403:                        onChange={() => toggleCorrectAnswer(index, choice)}
409:                        onChange={(e) => updateChoice(index, choiceIndex, e.target.value)}
415:                          onClick={() => removeChoice(index, choiceIndex)}
444:                        onChange={() => updateQuestion(index, 'correct_answer', choice)}
463:                  onChange={(e) => updateQuestion(index, 'correct_answer', e.target.value)}
480:                onChange={(e) => updateQuestion(index, 'explanation', e.target.value)}
518:                <Button variant="secondary" onClick={() => navigate('/question-bank')}>
521:                <Button onClick={handleSave} disabled={saving}>
531:                  onClick={() => setActiveTab('basic')}
542:                  onClick={() => setActiveTab('questions')}
553:                  onClick={() => setActiveTab('settings')}
583:                        onChange={(e) => setQuiz({ ...quiz, title: e.target.value })}
596:                        onChange={(e) => setQuiz({ ...quiz, description: e.target.value })}
609:                        onChange={(e) => setQuiz({ ...quiz, instructions: e.target.value })}
622:                        onChange={(e) => setQuiz({ ...quiz, course: e.target.value })} // store as string
643:                          onChange={(e) => setQuiz({ ...quiz, available_from: e.target.value })}
655:                          onChange={(e) => setQuiz({ ...quiz, available_until: e.target.value })}
679:                        onChange={(e) => {
738:                            onChange={(e) => setQuiz({ ...quiz, time_limit: parseInt(e.target.value) || undefined })}
755:                            onChange={(e) => setQuiz({ ...quiz, attempts_allowed: parseInt(e.target.value) || 1 })}
770:                          onChange={(e) => setQuiz({ ...quiz, passing_score: parseInt(e.target.value) || undefined })}
793:                          onChange={(e) => setQuiz({
819:                              onChange={(e) => setQuiz({
### api
105:      const response = await apiClient.get<any>('/courses/');
116:      const response = await apiClient.get<Quiz>(`/assessments/quizzes/${quizId}/`);
155:        await apiClient.put(`/assessments/quizzes/${quizId}/`, payload);
157:        await apiClient.post('/assessments/quizzes/', payload);

## frontend/src/pages/QuizDetail.tsx
### handlers
53:  const fetchQuiz = useCallback(async () => {
65:  const fetchAvailableQuestions = useCallback(async () => {
86:  const handleAddQuestions = async () => {
### user-events
195:                  <Button onClick={() => setIsQuestionModalOpen(true)}>
265:                            onChange={(e) => {
291:                      onClick={handleAddQuestions}
### api
56:      const response = await apiClient.get<Quiz>(`/assessments/quizzes/${quizId}/`);
68:      const response = await apiClient.get<{ results?: Question[] } | Question[]>(`/assessments/questions/?course=${quiz?.course}`);
88:      await apiClient.post(`/assessments/quizzes/${quizId}/add_questions/`, { question_ids: selectedQuestions });

## frontend/src/pages/QuizResults.tsx
### handlers
46:  const navigate = useNavigate();
54:  const fetchResults = useCallback(async () => {
74:  const toggleQuestion = (questionId: string) => {
87:    const startTime = new Date(start).getTime();
### user-events
284:                          onClick={() => toggleQuestion(item.question.id)}
379:              <Button variant="secondary" onClick={() => navigate(`/courses/${result.quiz.id}`)}>
382:              <Button onClick={() => navigate('/assignments')}>
### api
58:      const response = await apiClient.get(`/assessments/attempts/${attemptId}/`);
78:        newSet.delete(questionId);

## frontend/src/pages/QuizTaking.tsx
### handlers
38:  const navigate = useNavigate();
73:  const saveAnswersToStorage = useCallback((answersToSave: Record<string, any>) => {
88:  const loadAnswersFromStorage = useCallback(() => {
118:    const saveInterval = setInterval(() => {
137:  const startQuiz = useCallback(async () => {
174:  const handleAnswerChange = (questionId: string, answer: any) => {
184:  const handleSubmit = useCallback(async () => {
### user-events
206:      navigate(`/quiz/${quizId}/attempt/${attempt.id}/results`);
284:                  onChange={() => handleAnswerChange(questionId, { selected_index: index })}
300:                onChange={() => handleAnswerChange(questionId, { value: true })}
310:                onChange={() => handleAnswerChange(questionId, { value: false })}
322:            onChange={(e) => handleAnswerChange(questionId, { text: e.target.value })}
331:            onChange={(e) => handleAnswerChange(questionId, { text: e.target.value })}
341:            onChange={(e) => handleAnswerChange(questionId, { text: e.target.value })}
488:                onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
498:                    onClick={() => setCurrentQuestionIndex(index)}
514:                  onClick={handleSubmit}
523:                  onClick={() => setCurrentQuestionIndex(prev => Math.min(quiz.questions.length - 1, prev + 1))}
### api
142:      const quizResponse = await apiClient.get(`/assessments/quizzes/${quizId}/`);
147:      const attemptResponse = await apiClient.post(`/assessments/quizzes/${quizId}/start_attempt/`);
198:      await apiClient.post(`/assessments/attempts/${attempt.id}/submit/`, {

## frontend/src/pages/Register.tsx
### handlers
11:  const navigate = useNavigate();
22:  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
30:  const handleSubmit = async (e: React.FormEvent) => {
### user-events
68:        navigate('/login', {
113:        <form className="mt-6 sm:mt-8 space-y-4 sm:space-y-6" onSubmit={handleSubmit}>
120:              onChange={handleChange}
130:              onChange={handleChange}
142:                onChange={handleChange}
158:              onChange={handleChange}
168:              onChange={handleChange}
192:              type="submit"
203:              <Link
### api
60:      const response = await apiClient.post('/auth/register', {

## frontend/src/pages/SpeedGrader.tsx
### handlers
45:  const navigate = useNavigate();
71:    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
113:  const fetchAssignment = useCallback(async () => {
123:  const fetchSubmissions = useCallback(async () => {
142:  const handleSaveGrade = async (navigateAfter?: 'prev' | 'next' | 'exit') => {
178:  const handleAddComment = async () => {
191:  const handleNavigation = (direction: 'prev' | 'next' | 'exit') => {
200:  const executeNavigation = (direction: 'prev' | 'next' | 'exit') => {
210:  const handleDiscardChanges = () => {
218:  const handleSaveAndNavigate = () => {
224:  const navigateToPrevious = () => {
228:  const navigateToNext = () => {
232:  const handleExit = () => {
240:  const applyRubricToGrade = () => {
### user-events
163:        navigate(`/assignments/${assignmentId}`);
206:      navigate(`/assignments/${assignmentId}`);
257:            <Button onClick={() => navigate(`/assignments/${assignmentId}`)}>
312:                onClick={navigateToPrevious}
319:                onClick={navigateToNext}
325:              <Button onClick={handleExit}>
465:                        onChange={(e) => setComment(e.target.value)}
471:                        onClick={handleAddComment}
502:                          onChange={(e) => setGrade(e.target.value)}
525:                        onChange={(e) => setFeedback(e.target.value)}
543:                      <Button onClick={applyRubricToGrade} variant="secondary" size="sm">
558:                            onChange={(e) => setRubricScores({
584:                onClick={() => handleSaveGrade()}
### api
84:    const submissionId = searchParams.get('submission');
116:      const response = await apiClient.get<Assignment>(`/assessments/assignments/${assignmentId}/`);
126:      const response = await apiClient.get<any>(`/submissions/submissions/speedgrader/?assignment=${assignmentId}`);
147:      await apiClient.post(`/submissions/submissions/${currentSubmission.id}/grade/`, {
182:      await apiClient.post(`/submissions/submissions/${currentSubmission.id}/add_comment/`, { comment });

## frontend/src/pages/StudentGradebook.tsx
### handlers
53:  const fetchGradebook = async () => {
### user-events
155:        <Link to={`/courses/${courseId}`} className="text-blue-600 hover:text-blue-800 dark:text-blue-400 mb-2 inline-block">
214:              onChange={(e) => setFilterCategory(e.target.value)}
229:              onChange={(e) => setSortBy(e.target.value as any)}
267:                    <Link
### api

## frontend/src/pages/SubmitAssignment.tsx
### handlers
40:  const navigate = useNavigate();
85:  const fetchAssignment = async () => {
99:  const fetchOrCreateSubmission = async () => {
124:          const createResponse = await api.post<Submission>('submissions/submissions/', {
144:  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
167:  const uploadFiles = async () => {
194:  const handleSubmit = async (e: React.FormEvent) => {
### user-events
237:      navigate(`/courses/${courseId}/assignments/${assignmentId}`, {
260:                onChange={(e) => setCodeAnswer(e.target.value)}
280:              onChange={(e) => setTextAnswer(e.target.value)}
298:              onChange={(e) => setUrlAnswer(e.target.value)}
319:                onChange={handleFileChange}
421:          onClick={() => navigate(`/courses/${courseId}`)}
530:        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
545:              type="submit"
553:              onClick={() => navigate(`/courses/${courseId}`)}
### api
175:        await api.post(`submissions/submissions/${submission.id}/upload_file/`, fileFormData, {
205:          await api.post(`submissions/submissions/${submission.id}/submit_code/`, {
212:          await api.post(`submissions/submissions/${submission.id}/submit_text/`, {
218:          await api.post(`submissions/submissions/${submission.id}/submit_url/`, {
229:          await api.post(`submissions/submissions/${submission.id}/submit/`);
233:          await api.post(`submissions/submissions/${submission.id}/submit/`);

## frontend/src/pages/VirtualLab.tsx
### handlers
44:  const fetchAssignment = async () => {
80:  const handleAbortExecution = () => {
92:  const executeCode = async () => {
### user-events
219:              onChange={(value: string) => setCode(value)}
231:              onChange={(e) => setInput(e.target.value)}
240:              onClick={executeCode}
259:                onClick={handleAbortExecution}
### api
47:      const response = await api.get(`/assessments/assignments/${assignmentId}`);
115:      const response = await api.post('/assessments/virtual-lab/execute', {

```

## Appendix C: Component Event + Handler + API Inventory
```text
## frontend/src/components/AddResourceModal.tsx
### handlers
67:  const handleTypeSelect = (type: ResourceType) => {
72:  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
79:  const handleSubmit = async (e: React.FormEvent) => {
127:  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
135:  const handleBack = () => {
140:  const handleModalClose = () => {
### user-events
167:                onClick={() => handleTypeSelect(type)}
182:        <form onSubmit={handleSubmit} className="space-y-4">
193:            onChange={handleChange}
205:              onChange={handleChange}
218:              onChange={handleChange}
230:                onChange={handleChange}
244:                onChange={handleFileChange}
272:              onChange={handleChange}
284:              onClick={handleBack}
293:                onClick={handleModalClose}
299:                type="submit"
### api
101:      await apiClient.upload('/courses/resources/upload/', formDataToSend, (e: AxiosProgressEvent) => {

## frontend/src/components/AtRiskStudents.tsx
### handlers
44:  const fetchAtRiskStudents = async () => {
### user-events
96:          onClick={fetchAtRiskStudents}
116:                onClick={() => setSelectedStudent(student)}
### api
47:      const response = await fetch(`/api/analytics/courses/${courseId}/at-risk-students`);

## frontend/src/components/Card.tsx
### handlers
### user-events
25:      onClick={onClick}
### api

## frontend/src/components/CodeEditor.tsx
### handlers
21:  const handleEditorChange = (value: string | undefined) => {
### user-events
57:          onClick={() => setTheme(theme === 'vs-dark' ? 'light' : 'vs-dark')}
67:        onChange={handleEditorChange}
### api

## frontend/src/components/CourseGradesTab.tsx
### handlers
73:  const fetchGradebook = async () => {
94:  const toggleModule = (moduleId: string | null) => {
### user-events
272:                  onClick={() => toggleModule(module.module_id)}
### api
77:      const response = await apiClient.get<GradebookData>(`/gradebook/entries/student/${courseId}/`);
99:        newSet.delete(moduleId);

## frontend/src/components/CourseMembersTab.tsx
### handlers
36:  const fetchMembers = useCallback(async () => {
54:  const handleUnenroll = async (memberId: string, userId: string) => {
### user-events
149:          onChange={(e) => setFilterRole(e.target.value as any)}
230:                              onClick={() => handleUnenroll(member.id, member.user)}
### api
40:      const response = await apiClient.get<Member[]>(`/courses/${courseId}/members/${roleParam}`);
60:      await apiClient.post(`/courses/${courseId}/unenroll/`, { user_id: userId });

## frontend/src/components/CreateAssignmentModal.tsx
### handlers
90:  const fetchAvailableQuizzes = useCallback(async () => {
110:  const handleSubmit = async (e: React.FormEvent) => {
208:  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
### user-events
218:      <form onSubmit={handleSubmit} className="space-y-6">
247:                  onChange={handleChange}
282:              onChange={handleChange}
294:                onChange={handleChange}
309:                onChange={handleChange}
330:              onChange={handleChange}
341:              onChange={handleChange}
349:              onChange={handleChange}
357:              onChange={handleChange}
368:                onChange={handleChange}
382:                onChange={handleChange}
406:                  onChange={handleChange}
424:                    onChange={(e) => {
441:                  onChange={handleChange}
462:                  onChange={handleChange}
477:                  onChange={handleChange}
504:              onChange={handleChange}
523:                onChange={handleChange}
555:                onChange={handleChange}
569:                onChange={handleChange}
583:                onChange={handleChange}
599:              onChange={handleChange}
612:            onClick={onClose}
618:            type="submit"
### api
7:import { assignmentsApi, quizzesApi } from '../api/assessments';
93:      const response = await quizzesApi.getAll(courseId);
173:      await assignmentsApi.create(payload);

## frontend/src/components/CreateModuleModal.tsx
### handlers
30:  const handleSubmit = async (e: React.FormEvent) => {
53:  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
### user-events
63:      <form onSubmit={handleSubmit} className="space-y-4">
74:          onChange={handleChange}
86:            onChange={handleChange}
99:            onChange={handleChange}
111:            onClick={onClose}
117:            type="submit"
### api
6:import { modulesApi } from '../api/courses';
36:      await modulesApi.create({

## frontend/src/components/CreateQuestionModal.tsx
### handlers
54:  const handleSubmit = async (e: React.FormEvent) => {
133:  const handleOptionChange = (index: number, value: string) => {
139:  const addOption = () => {
143:  const removeOption = (index: number) => {
153:  const addBlank = () => {
157:  const handleBlankChange = (index: number, value: string) => {
### user-events
165:      <form onSubmit={handleSubmit} className="space-y-6">
179:            onChange={(e) => setFormData(prev => ({ ...prev, question_type: e.target.value as QuestionType }))}
197:            onChange={(e) => setFormData(prev => ({ ...prev, stem: e.target.value }))}
217:                  onChange={() => setFormData(prev => ({ ...prev, correct_answer_index: index }))}
223:                  onChange={(e) => handleOptionChange(index, e.target.value)}
230:                    onClick={() => removeOption(index)}
240:              onClick={addOption}
258:                  onChange={() => setFormData(prev => ({ ...prev, true_false_answer: true }))}
267:                  onChange={() => setFormData(prev => ({ ...prev, true_false_answer: false }))}
287:                onChange={(e) => handleBlankChange(index, e.target.value)}
293:              onClick={addBlank}
309:              onChange={(e) => setFormData(prev => ({ ...prev, short_answer_keywords: e.target.value }))}
333:          onChange={(e) => setFormData(prev => ({ ...prev, points: e.target.value }))}
346:            onChange={(e) => setFormData(prev => ({ ...prev, explanation: e.target.value }))}
354:          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
357:          <Button type="submit" isLoading={loading}>
### api
103:      const response = await apiClient.post('/assessments/questions/', payload);

## frontend/src/components/CreateQuizModal.tsx
### handlers
46:  const fetchQuestions = useCallback(async () => {
66:  const handleBasicSubmit = (e: React.FormEvent) => {
75:  const handleFinalSubmit = async () => {
129:  const toggleQuestion = (questionId: string) => {
137:  const handleBack = () => {
### user-events
150:        <form onSubmit={handleBasicSubmit} className="space-y-6">
161:            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
172:              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
185:              onChange={(e) => setFormData(prev => ({ ...prev, time_limit: e.target.value }))}
195:              onChange={(e) => setFormData(prev => ({ ...prev, attempts_allowed: e.target.value }))}
206:            onChange={(e) => setFormData(prev => ({ ...prev, pass_percentage: e.target.value }))}
219:                onChange={(e) => setFormData(prev => ({ ...prev, shuffle_questions: e.target.checked }))}
232:                onChange={(e) => setFormData(prev => ({ ...prev, shuffle_answers: e.target.checked }))}
245:                onChange={(e) => setFormData(prev => ({ ...prev, show_correct_answers: e.target.checked }))}
255:            <Button type="button" variant="secondary" onClick={onClose}>
258:            <Button type="submit">
303:                    onChange={() => toggleQuestion(question.id)}
323:            <Button type="button" variant="secondary" onClick={handleBack}>
327:              onClick={handleFinalSubmit}
### api
49:      const response = await apiClient.get(`/assessments/questions/?course=${courseId}`);
98:      const quizResponse = await apiClient.post('/assessments/quizzes/', quizPayload);
102:      await apiClient.post(`/assessments/quizzes/${quizId}/add_questions/`, {

## frontend/src/components/CreateResourceModal.tsx
### handlers
48:  const handleSubmit = async (e: React.FormEvent) => {
88:  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
96:  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
### user-events
111:      <form onSubmit={handleSubmit} className="space-y-4">
125:            onChange={handleChange}
140:          onChange={handleChange}
152:            onChange={handleChange}
166:              onChange={handleFileChange}
190:            onChange={handleChange}
204:              onChange={handleChange}
220:              onChange={handleChange}
242:            onClick={onClose}
248:            type="submit"
### api
6:import { resourcesApi } from '../api/courses';
67:      await resourcesApi.create(resourceData);

## frontend/src/components/DashboardBuilder.tsx
### handlers
137:  const handleOpen = () => {
142:  const handleSave = () => {
149:  const handleDragEnd = (result: DropResult) => {
157:    const updatedItems = items.map((item, index) => ({
165:  const toggleWidget = (id: string) => {
177:  const removeWidget = (id: string) => {
181:  const addWidget = (typeId: string) => {
### user-events
215:        <Button onClick={() => setShowAddWidget(!showAddWidget)} size="sm">
231:                onClick={() => addWidget(type.id)}
248:      <DragDropContext onDragEnd={handleDragEnd}>
300:                                  onChange={() => toggleWidget(widget.id)}
311:                                onChange={(e) => changeWidgetSize(widget.id, e.target.value as any)}
322:                                onClick={() => removeWidget(widget.id)}
344:          <Button onClick={handleSave}>
359:        onClick={handleOpen}
378:          <Button variant="secondary" onClick={() => setIsOpen(false)}>
381:          <Button onClick={handleSave}>
### api

## frontend/src/components/DashboardCustomizer.tsx
### handlers
24:  const handleOpen = () => {
29:  const handleSave = () => {
34:  const toggleWidget = (id: string) => {
40:  const moveWidget = (id: string, direction: 'up' | 'down') => {
### user-events
64:        onClick={handleOpen}
89:                    onChange={() => toggleWidget(widget.id)}
98:                    onClick={() => moveWidget(widget.id, 'up')}
106:                    onClick={() => moveWidget(widget.id, 'down')}
119:            <Button variant="secondary" onClick={() => setIsOpen(false)}>
122:            <Button onClick={handleSave}>
### api

## frontend/src/components/DashboardWidgets.tsx
### handlers
### user-events
168:              <Link
491:          <LinkIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
502:              <Link
### api

## frontend/src/components/EnrollStudentsModal.tsx
### handlers
51:  const handleManualEnroll = async () => {
86:  const handleCsvEnroll = async () => {
115:  const handleClose = () => {
124:  const downloadSampleCsv = () => {
### user-events
143:            onClick={() => setMethod('manual')}
154:            onClick={() => setMethod('csv')}
186:                onChange={(e) => setRole(e.target.value as 'STUDENT' | 'TA')}
200:                onChange={(e) => setEmailList(e.target.value)}
231:                    onClick={downloadSampleCsv}
247:                onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
334:              <Button variant="secondary" onClick={handleClose}>
337:              <Button onClick={() => {
347:              <Button variant="secondary" onClick={handleClose} disabled={loading}>
351:                onClick={method === 'manual' ? handleManualEnroll : handleCsvEnroll}
### api
68:      const response = await apiClient.post<EnrollmentResult>(`/courses/${courseId}/enroll_students/`, {
100:      const response = await apiClient.upload<EnrollmentResult>(`/courses/${courseId}/enroll-csv/`, formData);

## frontend/src/components/Header.tsx
### handlers
18:    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark';
22:  const toggleTheme = () => {
43:  const handleLogout = () => {
### user-events
45:    window.location.href = '/login';
55:              onClick={onMenuClick}
61:            <Link to="/dashboard" className="flex items-center space-x-2">
72:              onClick={toggleTheme}
101:                          onClick={() => changeLanguage('uk')}
113:                          onClick={() => changeLanguage('en')}
128:            <Link
160:                        <Link
172:                        <Link
185:                          onClick={handleLogout}
### api

## frontend/src/components/LanguageSwitcher.tsx
### handlers
### user-events
21:        onClick={() => changeLanguage('en')}
31:        onClick={() => changeLanguage('uk')}
### api

## frontend/src/components/Modal.tsx
### handlers
### user-events
26:          onClick={onClose}
37:                onClick={onClose}
### api

## frontend/src/components/ResourceItem.tsx
### handlers
55:  const handleView = () => {
63:  const handleDownload = () => {
74:  const handleDelete = () => {
### user-events
115:          onClick={handleView}
124:            onClick={handleDownload}
134:            onClick={handleDelete}
### api

## frontend/src/components/RichTextEditor.tsx
### handlers
29:    const start = textarea.selectionStart;
### user-events
123:            onClick={btn.action}
133:          onClick={() => setShowPreview(!showPreview)}
140:          onClick={() => setShowHelp(!showHelp)}
181:          onChange={(e) => onChange(e.target.value)}
### api

## frontend/src/components/SettingsBar.tsx
### handlers
### user-events
41:              onChange={(e) => onLangChange(e.target.value as 'en' | 'uk')}
55:              onChange={(e) => setSize(e.target.value as any)}
65:            onClick={onToggleTheme}
### api

## frontend/src/components/Sidebar.tsx
### handlers
### user-events
58:          onClick={onClose}
73:            onClick={onClose}
86:              onClick={onClose}
### api

## frontend/src/components/TeacherGradebook.tsx
### handlers
92:  const fetchGradebook = async () => {
164:  const toggleStudentExpansion = (studentId: string) => {
186:  const startEdit = (studentId: string, assignmentId: string, currentScore?: number) => {
196:  const saveGrade = async (entryId?: string) => {
226:  const recalculateGrades = async () => {
### user-events
251:        <Button onClick={fetchGradebook} className="mt-4">
270:          <Button onClick={() => setShowFilters(!showFilters)} variant="outline">
274:          <Button onClick={recalculateGrades} variant="outline">
296:                  onChange={(e) => setSearchQuery(e.target.value)}
307:                  onChange={(e) => setSelectedModule(e.target.value)}
326:                  onChange={(e) => setGradeFilter(e.target.value as any)}
339:              <Button onClick={expandAll} variant="outline" size="sm">
342:              <Button onClick={collapseAll} variant="outline" size="sm">
366:                  onClick={() => toggleStudentExpansion(student.student_id)}
451:                                        onChange={(e) => setEditValue(e.target.value)}
461:                                        onClick={() => saveGrade(grade?.entry_id)}
468:                                        onClick={cancelEdit}
518:                                        onClick={() => startEdit(student.student_id, assignment.id, grade?.score ?? undefined)}
### api
96:      const response = await apiClient.get<TeacherGradebookData>(`/gradebook/entries/course/${courseId}/`);
124:      moduleMap.get(moduleId)!.assignments.push(assignment);
168:        newSet.delete(studentId);
205:        await apiClient.patch(`/gradebook/entries/${entryId}/update_grade/`, {
231:      await apiClient.post(`/gradebook/entries/recalculate/${courseId}/`);

## frontend/src/components/TemplateSelection.tsx
### handlers
37:  const fetchTemplates = useCallback(async () => {
### user-events
78:              onClick={() => setSelectedCategory(category.id)}
97:            onClick={() => onSelectTemplate(template)}
128:          onClick={onSkip}
### api
3:import { aiApi, CourseTemplate } from '../api/ai';
42:          ? await aiApi.templates.getAll()
43:          : await aiApi.templates.getByCategory(selectedCategory);

## frontend/src/components/ai/AIAssistantPanel.tsx
### handlers
45:  const handleGenerateModules = async () => {
72:  const handleGenerateAssignments = async () => {
99:  const handleGenerateQuiz = async () => {
### user-events
152:                onChange={(e) => setModulePrompt(e.target.value)}
166:                onChange={(e) => setModuleCount(Number(e.target.value))}
173:            <Button onClick={handleGenerateModules} disabled={!modulePrompt.trim()}>
193:                onChange={(e) => setAssignmentTopic(e.target.value)}
206:                onChange={(e) => setAssignmentCount(Number(e.target.value))}
213:            <Button onClick={handleGenerateAssignments} disabled={!assignmentTopic.trim()}>
233:                onChange={(e) => setQuizTopic(e.target.value)}
246:                onChange={(e) => setQuestionCount(Number(e.target.value))}
260:                onChange={(e) => setTimeLimit(Number(e.target.value))}
267:            <Button onClick={handleGenerateQuiz} disabled={!quizTopic.trim()}>
290:        <button onClick={onClose} className="hover:bg-purple-700 dark:hover:bg-purple-800 rounded p-1">
307:                  onClick={() => setActiveFunction('modules')}
325:                  onClick={() => setActiveFunction('assignments')}
343:                  onClick={() => setActiveFunction('quiz')}
365:              onClick={() => {
### api
3:import { aiApi } from '../../api/ai';
52:      const result = await aiApi.generateModules({
79:      const result = await aiApi.generateAssignments({
106:      const result = await aiApi.generateQuiz({

## frontend/src/components/ai/AIContentEditor.tsx
### handlers
44:  const handleEdit = async (customPrompt?: string) => {
73:  const handleApply = () => {
80:  const handleCancel = () => {
### user-events
92:        onClick={() => setIsOpen(true)}
109:          onClick={handleCancel}
125:              onClick={() => handleEdit(suggestion)}
146:            onChange={(e) => setPrompt(e.target.value)}
153:            onClick={() => handleEdit()}
192:            <Button variant="secondary" size="sm" onClick={() => setEditedContent('')}>
195:            <Button size="sm" onClick={handleApply}>
### api
4:import { aiApi, CourseEditRequest } from '../../api/ai';
63:      const result = await aiApi.editContent(request);

## frontend/src/components/ai/AIContentGenerator.tsx
### handlers
24:  const handleGenerate = async () => {
60:  const handleReject = () => {
65:  const handleConfirm = () => {
81:  const handleClose = () => {
### user-events
92:        onClick={() => setIsOpen(true)}
131:                  onChange={(e) => setPreviewJson(e.target.value)}
136:                <Button onClick={handleReject} variant="secondary" disabled={loading}>
139:                <Button onClick={handleConfirm} variant="primary" disabled={loading}>
152:              onChange={(e) => setTopic(e.target.value)}
165:              onChange={(e) => setDifficulty(e.target.value)}
182:                onChange={(e) => setQuestionCount(parseInt(e.target.value))}
198:                onChange={(e) => setWeekDuration(parseInt(e.target.value))}
208:              onClick={handleClose}
215:              onClick={handleGenerate}
### api
49:      const data = await apiClient.post(endpoint, requestBody);

## frontend/src/components/ai/AICourseGenerator.tsx
### handlers
42:  const handleGenerate = async () => {
67:  const handleSave = async () => {
93:  const handleClose = () => {
### user-events
118:          onChange={(e) => setPrompt(e.target.value)}
134:        <Button variant="secondary" onClick={handleClose}>
137:        <Button onClick={() => setStep('options')}>
156:          onChange={(e) => setOptions({ ...options, language: e.target.value as 'uk' | 'en' })}
172:          onChange={(e) => setOptions({ ...options, academic_year: e.target.value })}
182:            onChange={(e) => setOptions({ ...options, include_modules: e.target.checked })}
194:            onChange={(e) => setOptions({ ...options, include_assignments: e.target.checked })}
207:            onChange={(e) => setOptions({ ...options, include_quizzes: e.target.checked })}
218:        <Button variant="secondary" onClick={() => setStep('prompt')}>
221:        <Button onClick={handleGenerate} className="bg-purple-600 hover:bg-purple-700">
317:          <Button variant="secondary" onClick={handleClose}>
320:          <Button variant="secondary" onClick={() => setStep('options')}>
323:          <Button onClick={handleSave} disabled={saving}>
342:      <Button onClick={handleClose}>{t('common.close')}</Button>
### api
6:import { aiApi, CourseGenerationRequest, GeneratedCourse } from '../../api/ai';
57:      const result = await aiApi.generateCourse(request);
79:      await aiApi.generateAndSaveCourse(request, userId, authToken);

## frontend/src/components/ai/AIElementGenerator.tsx
### handlers
66:  const handleCancel = () => {
76:  const handleGenerate = async () => {
### user-events
201:          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
211:            onClick={() => setError(null)}
230:              onClick={handleCancel}
264:            onChange={(e) =>
295:            onChange={(e) => setFormData({ ...formData, context: e.target.value })}
309:            onChange={(e) => setFormData({ ...formData, prompt: e.target.value })}
334:                onChange={(e) =>
353:                onChange={(e) =>
373:                  onChange={(e) =>
387:                  onChange={(e) =>
411:                  onChange={(e) =>
425:                  onChange={(e) =>
456:              onClick={onClose}
464:            onClick={handleGenerate}
### api
2:import { aiApi } from '../../api/ai';
121:          result = await aiApi.generateModules({
133:          result = await aiApi.generateAssignments({
145:          result = await aiApi.generateQuiz({

## frontend/src/components/ai/AIErrorFallback.tsx
### handlers
### user-events
68:              onClick={onRetry}
79:            onClick={() => window.location.reload()}
### api

## frontend/src/components/analytics/AnalyticsDashboard.tsx
### handlers
35:  const fetchAnalytics = async () => {
### user-events
75:          onChange={(e) => setTimeRange(e.target.value as any)}
### api
39:      const statsResponse = await fetch(`/api/analytics/courses/${courseId}/stats?range=${timeRange}`);
44:      const studentsResponse = await fetch(`/api/analytics/courses/${courseId}/student-progress`);

## frontend/src/components/common/ConfirmModal.tsx
### handlers
82:  const handleConfirm = () => {
172:  const handleClose = React.useCallback(() => {
177:  const handleConfirm = React.useCallback(() => {
### user-events
118:            onClick={thirdAction.onClick}
126:          onClick={handleConfirm}
134:          onClick={onClose}
### api

## frontend/src/components/common/ErrorBoundary.tsx
### handlers
### user-events
75:                onClick={this.handleReset}
### api

## frontend/src/components/common/UnsavedChangesPrompt.tsx
### handlers
### user-events
56:            onClick={onLeaveWithoutSaving}
63:            onClick={onStay}
69:            onClick={onSaveAndLeave}
### api

## frontend/src/components/questions/CodeQuestion.tsx
### handlers
29:  const starterCode = question.metadata?.starter_code || '';
39:  const handleRun = () => {
### user-events
54:              onClick={() => setShowTests(!showTests)}
86:            onClick={handleRun}
96:          onChange={(e) => onChange(e.target.value)}
### api

## frontend/src/components/questions/EssayQuestion.tsx
### handlers
32:  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
### user-events
51:            onClick={() => {/* Open rubric modal */}}
61:          onChange={handleChange}
### api

## frontend/src/components/questions/FileUploadQuestion.tsx
### handlers
48:  const handleFiles = (files: FileList | null) => {
68:  const handleDrag = (e: React.DragEvent) => {
78:  const handleDrop = (e: React.DragEvent) => {
87:  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
93:  const removeFile = (index: number) => {
### user-events
118:        onDragEnter={handleDrag}
119:        onDragLeave={handleDrag}
120:        onDragOver={handleDrag}
121:        onDrop={handleDrop}
126:          onChange={handleChange}
187:                  onClick={() => removeFile(index)}
### api

## frontend/src/components/questions/HotspotQuestion.tsx
### handlers
83:  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
107:  const removeRegion = (index: number) => {
116:  const handleImageLoad = () => {
### user-events
137:              onChange={(e) => setRadiusInput(Number(e.target.value))}
158:          onClick={handleCanvasClick}
178:                onClick={() => setSelectedRegionIndex(index)}
186:                  onClick={(e) => {
### api

## frontend/src/components/questions/OrderingQuestion.tsx
### handlers
24:  const handleDragEnd = (result: DropResult) => {
46:  const addItem = () => {
54:  const removeItem = (index: number) => {
62:  const updateItem = (index: number, value: string) => {
### user-events
75:      <DragDropContext onDragEnd={handleDragEnd}>
97:                          onChange={(e) => updateItem(index, e.target.value)}
107:                          onClick={() => removeItem(index)}
125:          <button type="button" onClick={addItem} className="btn btn-secondary btn-sm">
### api

## frontend/src/components/questions/QuestionTypeSelector.tsx
### handlers
### user-events
121:            onClick={() => !disabled && onChange(type.value)}
### api

## frontend/src/features/authoring/components/AIReviewPanel.tsx
### handlers
### user-events
43:                onClick={() => onApprove(draft.id)}
51:                onClick={() => onApply(draft.id)}
59:                onClick={() => onReject(draft.id)}
### api

## frontend/src/features/authoring/components/LatexEditor.tsx
### handlers
### user-events
34:            onChange={(event) => onFormatChange(event.target.value as LatexFormat)}
44:        onChange={onChange}
### api

## frontend/src/features/authoring/components/QuestionEditor.tsx
### handlers
15:  const updateOption = (optionIndex: number, updated: QuestionOption) => {
21:  const addOption = () => {
32:  const removeOption = (optionIndex: number) => {
### user-events
45:          <button type="button" className="text-sm text-red-600" onClick={onRemove}>
57:            onChange={(event) => onChange({ ...question, type: event.target.value as QuestionDraft['type'] })}
72:          onChange={(event) => onChange({ ...question, points: Number(event.target.value) })}
79:            onChange={(event) => onChange({ ...question, correctAnswer: event.target.value })}
87:        onChange={(value) => onChange({ ...question, prompt: value })}
95:        onChange={(value) => onChange({ ...question, explanation: value })}
106:              onClick={addOption}
118:                onChange={(event) => updateOption(optionIndex, { ...option, text: event.target.value })}
125:                  onChange={(event) =>
138:                  onClick={() => removeOption(optionIndex)}
### api

## frontend/src/features/authoring/components/QuizBuilder.tsx
### handlers
12:  const updateQuestion = (index: number, updated: QuestionDraft) => {
18:  const addQuestion = () => {
37:  const removeQuestion = (index: number) => {
### user-events
50:          onClick={addQuestion}
64:            onChange={(updated) => updateQuestion(index, updated)}
### api

## frontend/src/features/authoring/components/RubricEditor.tsx
### handlers
13:  const updateCriterion = (index: number, updated: RubricCriterion) => {
19:  const addCriterion = () => {
37:  const removeCriterion = (index: number) => {
### user-events
52:          onClick={addCriterion}
65:              onChange={(event) => updateCriterion(index, { ...criterion, title: event.target.value })}
73:              onChange={(event) => updateCriterion(index, { ...criterion, weight: Number(event.target.value) })}
80:            onChange={(value) => updateCriterion(index, { ...criterion, description: value })}
88:            onChange={(value) => updateCriterion(index, { ...criterion, explanation: value })}
96:              onClick={() => removeCriterion(index)}
### api

## frontend/src/features/authoring/components/TaskEditor.tsx
### handlers
40:  const handleSave = async () => {
67:  const handleValidate = async () => {
79:  const handlePreview = async () => {
88:  const handleReset = () => {
96:  const updateDraft = (partial: Partial<TaskDraft>) => setDraft({ ...draft, ...partial });
### user-events
110:          onClick={handleSave}
118:          onClick={handleValidate}
125:          onClick={handlePreview}
132:          onClick={handleReset}
142:        onChange={(metadata) => updateDraft({ metadata })}
147:        onChange={(settings) => updateDraft({ settings })}
153:        onChange={(rubric) => updateDraft({ rubric })}
159:        onChange={(questions) => updateDraft({ questions })}
### api
9:import { createAuthoringApi } from '../api/authoringApi';
38:  const api = useMemo(() => createAuthoringApi(), []);

## frontend/src/features/authoring/components/TaskMetadataForm.tsx
### handlers
12:  const updateField = (field: keyof TaskMetadata, value: TaskMetadata[keyof TaskMetadata]) => {
### user-events
23:        onChange={(event) => updateField('title', event.target.value)}
29:        onChange={(value) => updateField('description', value)}
39:            onChange={(event) => updateField('difficulty', event.target.value as TaskMetadata['difficulty'])}
51:            onChange={(event) => updateField('tags', event.target.value.split(',').map((tag) => tag.trim()).filter(Boolean))}
### api

## frontend/src/features/authoring/components/TaskSettingsForm.tsx
### handlers
12:  const updateField = (field: keyof TaskSettings, value: TaskSettings[keyof TaskSettings]) => {
### user-events
26:          onChange={(event) => updateField('timeLimitMinutes', event.target.value ? Number(event.target.value) : undefined)}
34:          onChange={(event) => updateField('attemptsAllowed', Number(event.target.value))}
42:            onChange={(event) => updateField('gradingMode', event.target.value as TaskSettings['gradingMode'])}
56:            onChange={(event) => updateField('allowLateSubmission', event.target.checked)}
65:            onChange={(event) => updateField('draftState', event.target.checked ? 'PUBLISHED' : 'DRAFT')}
### api

```

## Appendix D: Backend Mapping Inventory
```text
backend-spring/lms-user-service/src/main/java/com/university/lms/user/web/UserController.java:26:@RequestMapping("/users")
backend-spring/lms-user-service/src/main/java/com/university/lms/user/web/UserController.java:37:    @GetMapping("/me")
backend-spring/lms-user-service/src/main/java/com/university/lms/user/web/UserController.java:49:    @PutMapping("/me")
backend-spring/lms-user-service/src/main/java/com/university/lms/user/web/UserController.java:63:    @PostMapping("/me/change-password")
backend-spring/lms-user-service/src/main/java/com/university/lms/user/web/UserController.java:77:    @GetMapping("/{id}")
backend-spring/lms-user-service/src/main/java/com/university/lms/user/web/UserController.java:89:    @GetMapping
backend-spring/lms-user-service/src/main/java/com/university/lms/user/web/UserController.java:114:    @PutMapping("/{id}")
backend-spring/lms-user-service/src/main/java/com/university/lms/user/web/UserController.java:128:    @PostMapping("/{id}/deactivate")
backend-spring/lms-user-service/src/main/java/com/university/lms/user/web/UserController.java:140:    @PostMapping("/{id}/activate")
backend-spring/lms-user-service/src/main/java/com/university/lms/user/web/UserController.java:152:    @DeleteMapping("/{id}")
backend-spring/lms-user-service/src/main/java/com/university/lms/user/web/AuthController.java:17:@RequestMapping("/auth")
backend-spring/lms-user-service/src/main/java/com/university/lms/user/web/AuthController.java:28:    @PostMapping("/register")
backend-spring/lms-user-service/src/main/java/com/university/lms/user/web/AuthController.java:39:    @PostMapping("/login")
backend-spring/lms-user-service/src/main/java/com/university/lms/user/web/AuthController.java:50:    @PostMapping("/verify-email")
backend-spring/lms-user-service/src/main/java/com/university/lms/user/web/AuthController.java:61:    @PostMapping("/forgot-password")
backend-spring/lms-user-service/src/main/java/com/university/lms/user/web/AuthController.java:72:    @PostMapping("/reset-password")
backend-spring/lms-user-service/src/main/java/com/university/lms/user/web/AuthController.java:83:    @PostMapping("/refresh")
backend-spring/lms-user-service/src/main/java/com/university/lms/user/web/AuthController.java:96:    @PostMapping("/logout")
backend-spring/lms-api-gateway/src/main/java/com/university/lms/apigateway/controller/AdminController.java:15:@RequestMapping("/api/admin")
backend-spring/lms-api-gateway/src/main/java/com/university/lms/apigateway/controller/AdminController.java:24:    @GetMapping("/services")
backend-spring/lms-api-gateway/src/main/java/com/university/lms/apigateway/controller/AdminController.java:75:    @GetMapping("/services/{serviceName}")
backend-spring/lms-api-gateway/src/main/java/com/university/lms/apigateway/controller/AdminController.java:94:    @GetMapping("/services/names")
backend-spring/lms-api-gateway/src/main/java/com/university/lms/apigateway/controller/FallbackController.java:17:@RequestMapping("/fallback")
backend-spring/lms-api-gateway/src/main/java/com/university/lms/apigateway/controller/FallbackController.java:23:    @GetMapping("/ai")
backend-spring/lms-api-gateway/src/main/java/com/university/lms/apigateway/controller/FallbackController.java:39:    @GetMapping("/generic")
backend-spring/lms-deadline-service/src/main/java/com/university/lms/deadline/calendar/web/CalendarController.java:23:@RequestMapping("/api/calendar")
backend-spring/lms-deadline-service/src/main/java/com/university/lms/deadline/calendar/web/CalendarController.java:31:    @GetMapping("/student/{studentGroupId}/month")
backend-spring/lms-deadline-service/src/main/java/com/university/lms/deadline/calendar/web/CalendarController.java:39:    @GetMapping("/student/{studentGroupId}/conflicts")
backend-spring/lms-deadline-service/src/main/java/com/university/lms/deadline/calendar/web/CalendarController.java:44:    @GetMapping("/student/{studentGroupId}/ics")
backend-spring/lms-deadline-service/src/main/java/com/university/lms/deadline/calendar/web/CalendarController.java:54:    @GetMapping("/student/{studentGroupId}/subscribe")
backend-spring/lms-course-service/src/main/java/com/university/lms/course/web/ResourceController.java:34:    @GetMapping("/courses/{courseId}/resources")
backend-spring/lms-course-service/src/main/java/com/university/lms/course/web/ResourceController.java:47:    @GetMapping("/courses/{courseId}/modules/{moduleId}/resources")
backend-spring/lms-course-service/src/main/java/com/university/lms/course/web/ResourceController.java:61:    @GetMapping("/courses/{courseId}/modules/{moduleId}/resources/{resourceId}")
backend-spring/lms-course-service/src/main/java/com/university/lms/course/web/ResourceController.java:76:    @PostMapping("/courses/{courseId}/modules/{moduleId}/resources")
backend-spring/lms-course-service/src/main/java/com/university/lms/course/web/ResourceController.java:91:    @PutMapping("/courses/{courseId}/modules/{moduleId}/resources/{resourceId}")
backend-spring/lms-course-service/src/main/java/com/university/lms/course/web/ResourceController.java:107:    @DeleteMapping("/courses/{courseId}/modules/{moduleId}/resources/{resourceId}")
backend-spring/lms-course-service/src/main/java/com/university/lms/course/web/ResourceController.java:122:    @PutMapping("/courses/{courseId}/modules/{moduleId}/resources/reorder")
backend-spring/lms-course-service/src/main/java/com/university/lms/course/web/ModuleController.java:23:@RequestMapping("/courses/{courseId}/modules")
backend-spring/lms-course-service/src/main/java/com/university/lms/course/web/ModuleController.java:34:    @GetMapping
backend-spring/lms-course-service/src/main/java/com/university/lms/course/web/ModuleController.java:47:    @GetMapping("/{moduleId}")
backend-spring/lms-course-service/src/main/java/com/university/lms/course/web/ModuleController.java:61:    @PostMapping
backend-spring/lms-course-service/src/main/java/com/university/lms/course/web/ModuleController.java:75:    @PutMapping("/{moduleId}")
backend-spring/lms-course-service/src/main/java/com/university/lms/course/web/ModuleController.java:90:    @DeleteMapping("/{moduleId}")
backend-spring/lms-course-service/src/main/java/com/university/lms/course/web/ModuleController.java:104:    @PutMapping("/reorder")
backend-spring/lms-course-service/src/main/java/com/university/lms/course/web/ModuleController.java:118:    @PostMapping("/{moduleId}/publish")
backend-spring/lms-course-service/src/main/java/com/university/lms/course/web/ModuleController.java:132:    @PostMapping("/{moduleId}/unpublish")
backend-spring/lms-course-service/src/main/java/com/university/lms/course/web/CourseController.java:26:@RequestMapping("/courses")
backend-spring/lms-course-service/src/main/java/com/university/lms/course/web/CourseController.java:38:    @GetMapping({"", "/"})
backend-spring/lms-course-service/src/main/java/com/university/lms/course/web/CourseController.java:54:    @GetMapping("/published")
backend-spring/lms-course-service/src/main/java/com/university/lms/course/web/CourseController.java:74:    @GetMapping("/search")
backend-spring/lms-course-service/src/main/java/com/university/lms/course/web/CourseController.java:88:    @GetMapping("/my")
backend-spring/lms-course-service/src/main/java/com/university/lms/course/web/CourseController.java:111:    @GetMapping("/owner/{ownerId}")
backend-spring/lms-course-service/src/main/java/com/university/lms/course/web/CourseController.java:126:    @GetMapping("/{id}")
backend-spring/lms-course-service/src/main/java/com/university/lms/course/web/CourseController.java:138:    @GetMapping("/code/{code}")
backend-spring/lms-course-service/src/main/java/com/university/lms/course/web/CourseController.java:147:    @PostMapping({"", "/"})
backend-spring/lms-course-service/src/main/java/com/university/lms/course/web/CourseController.java:160:    @PutMapping("/{id}")
backend-spring/lms-course-service/src/main/java/com/university/lms/course/web/CourseController.java:174:    @DeleteMapping("/{id}")
backend-spring/lms-course-service/src/main/java/com/university/lms/course/web/CourseController.java:185:    @PostMapping("/{id}/publish")
backend-spring/lms-course-service/src/main/java/com/university/lms/course/web/CourseController.java:198:    @PostMapping("/{id}/unpublish")
backend-spring/lms-course-service/src/main/java/com/university/lms/course/web/CourseController.java:211:    @PostMapping("/{courseId}/enroll")
backend-spring/lms-course-service/src/main/java/com/university/lms/course/web/CourseController.java:226:    @DeleteMapping("/{courseId}/enroll/{userId}")
backend-spring/lms-course-service/src/main/java/com/university/lms/course/web/CourseController.java:241:    @PostMapping("/{courseId}/drop")
backend-spring/lms-course-service/src/main/java/com/university/lms/course/web/CourseController.java:253:    @GetMapping("/{courseId}/members")
backend-spring/lms-course-service/src/main/java/com/university/lms/course/web/CourseController.java:276:    @GetMapping("/{courseId}/enrollment")
backend-spring/lms-course-service/src/main/java/com/university/lms/course/web/CourseController.java:288:    @GetMapping("/{courseId}/enrollment/check")
backend-spring/lms-course-service/src/main/java/com/university/lms/course/web/CourseController.java:301:    @GetMapping("/{id}/students")
backend-spring/lms-deadline-service/src/main/java/com/university/lms/deadline/ingestion/web/IngestionController.java:16:@RequestMapping("/api/ingestion")
backend-spring/lms-deadline-service/src/main/java/com/university/lms/deadline/ingestion/web/IngestionController.java:23:    @PostMapping("/webhook/course/{courseId}")
backend-spring/lms-deadline-service/src/main/java/com/university/lms/deadline/deadline/web/DeadlineController.java:16:@RequestMapping("/api/deadlines")
backend-spring/lms-deadline-service/src/main/java/com/university/lms/deadline/deadline/web/DeadlineController.java:22:    @GetMapping("/group/{studentGroupId}")
backend-spring/lms-deadline-service/src/main/java/com/university/lms/deadline/deadline/web/DeadlineController.java:32:    @GetMapping("/{id}")
backend-spring/lms-deadline-service/src/main/java/com/university/lms/deadline/deadline/web/DeadlineController.java:37:    @PostMapping
backend-spring/lms-gradebook-service/src/main/java/com/university/lms/gradebook/web/GradebookCategoryController.java:21:@RequestMapping("/api/gradebook/categories")
backend-spring/lms-gradebook-service/src/main/java/com/university/lms/gradebook/web/GradebookCategoryController.java:28:    @GetMapping("/course/{courseId}")
backend-spring/lms-gradebook-service/src/main/java/com/university/lms/gradebook/web/GradebookCategoryController.java:35:    @GetMapping("/{categoryId}")
backend-spring/lms-gradebook-service/src/main/java/com/university/lms/gradebook/web/GradebookCategoryController.java:42:    @PostMapping
backend-spring/lms-gradebook-service/src/main/java/com/university/lms/gradebook/web/GradebookCategoryController.java:50:    @PutMapping("/{categoryId}")
backend-spring/lms-gradebook-service/src/main/java/com/university/lms/gradebook/web/GradebookCategoryController.java:60:    @DeleteMapping("/{categoryId}")
backend-spring/lms-gradebook-service/src/main/java/com/university/lms/gradebook/web/AdminAnalyticsController.java:18:@RequestMapping("/api/admin/analytics")
backend-spring/lms-gradebook-service/src/main/java/com/university/lms/gradebook/web/AdminAnalyticsController.java:28:    @GetMapping("/platform-usage")
backend-spring/lms-gradebook-service/src/main/java/com/university/lms/gradebook/web/AdminAnalyticsController.java:38:    @GetMapping("/course-effectiveness")
backend-spring/lms-gradebook-service/src/main/java/com/university/lms/gradebook/web/AdminAnalyticsController.java:48:    @GetMapping("/course-effectiveness/{courseId}")
backend-spring/lms-gradebook-service/src/main/java/com/university/lms/gradebook/web/AdminAnalyticsController.java:59:    @GetMapping("/instructor-productivity")
backend-spring/lms-gradebook-service/src/main/java/com/university/lms/gradebook/web/AdminAnalyticsController.java:69:    @GetMapping("/instructor-productivity/{instructorId}")
backend-spring/lms-deadline-service/src/main/java/com/university/lms/deadline/notification/web/NotificationController.java:21:@RequestMapping("/api/notifications")
backend-spring/lms-deadline-service/src/main/java/com/university/lms/deadline/notification/web/NotificationController.java:32:    @GetMapping
backend-spring/lms-deadline-service/src/main/java/com/university/lms/deadline/notification/web/NotificationController.java:65:    @GetMapping("/count")
backend-spring/lms-gradebook-service/src/main/java/com/university/lms/gradebook/web/GradebookEntryController.java:27:@RequestMapping("/api/gradebook/entries")
backend-spring/lms-gradebook-service/src/main/java/com/university/lms/gradebook/web/GradebookEntryController.java:38:    @GetMapping("/course/{courseId}")
backend-spring/lms-gradebook-service/src/main/java/com/university/lms/gradebook/web/GradebookEntryController.java:49:    @GetMapping("/course/{courseId}/student/{studentId}")
backend-spring/lms-gradebook-service/src/main/java/com/university/lms/gradebook/web/GradebookEntryController.java:71:    @PatchMapping("/{entryId}")
backend-spring/lms-gradebook-service/src/main/java/com/university/lms/gradebook/web/GradebookEntryController.java:89:    @GetMapping("/{entryId}/history")
backend-spring/lms-gradebook-service/src/main/java/com/university/lms/gradebook/web/GradebookRecalculationController.java:18:@RequestMapping("/api/gradebook")
backend-spring/lms-gradebook-service/src/main/java/com/university/lms/gradebook/web/GradebookRecalculationController.java:25:    @PostMapping("/recalculate/course/{courseId}/student/{studentId}")
backend-spring/lms-gradebook-service/src/main/java/com/university/lms/gradebook/web/GradebookRecalculationController.java:35:    @PostMapping("/recalculate/course/{courseId}")
backend-spring/lms-gradebook-service/src/main/java/com/university/lms/gradebook/web/PredictiveAnalyticsController.java:16:@RequestMapping("/api/analytics")
backend-spring/lms-gradebook-service/src/main/java/com/university/lms/gradebook/web/PredictiveAnalyticsController.java:26:    @GetMapping("/courses/{courseId}/at-risk-students")
backend-spring/lms-gradebook-service/src/main/java/com/university/lms/gradebook/web/PredictiveAnalyticsController.java:37:    @GetMapping("/courses/{courseId}/students/{studentId}/risk")
backend-spring/lms-ai-service/src/main/java/com/university/lms/ai/web/AIUsageController.java:26:@RequestMapping("/v1/ai/usage")
backend-spring/lms-ai-service/src/main/java/com/university/lms/ai/web/AIUsageController.java:37:    @GetMapping("/user/{userId}")
backend-spring/lms-ai-service/src/main/java/com/university/lms/ai/web/AIUsageController.java:49:    @GetMapping("/me")
backend-spring/lms-ai-service/src/main/java/com/university/lms/ai/web/AIUsageController.java:61:    @GetMapping("/user/{userId}/history")
backend-spring/lms-ai-service/src/main/java/com/university/lms/ai/web/AIUsageController.java:72:    @GetMapping("/user/{userId}/quota")
backend-spring/lms-ai-service/src/main/java/com/university/lms/ai/web/AIUsageController.java:83:    @GetMapping("/user/{userId}/remaining")
backend-spring/lms-ai-service/src/main/java/com/university/lms/ai/web/AIUsageController.java:94:    @GetMapping("/summary")
backend-spring/lms-ai-service/src/main/java/com/university/lms/ai/web/AIUsageController.java:104:    @GetMapping("/top-users")
backend-spring/lms-ai-service/src/main/java/com/university/lms/ai/web/AIUsageController.java:115:    @GetMapping("/stats")
backend-spring/lms-ai-service/src/main/java/com/university/lms/ai/web/ABTestController.java:19:@RequestMapping("/v1/ai/ab-tests")
backend-spring/lms-ai-service/src/main/java/com/university/lms/ai/web/ABTestController.java:29:    @PostMapping("/experiments")
backend-spring/lms-ai-service/src/main/java/com/university/lms/ai/web/ABTestController.java:43:    @GetMapping("/experiments/{experimentName}/results")
backend-spring/lms-ai-service/src/main/java/com/university/lms/ai/web/ABTestController.java:53:    @GetMapping("/experiments/active")
backend-spring/lms-ai-service/src/main/java/com/university/lms/ai/web/ABTestController.java:62:    @GetMapping("/experiments")
backend-spring/lms-ai-service/src/main/java/com/university/lms/ai/web/ABTestController.java:71:    @DeleteMapping("/experiments/{experimentName}")
backend-spring/lms-ai-service/src/main/java/com/university/lms/ai/web/ABTestController.java:81:    @PostMapping("/results/{resultId}/rating")
backend-spring/lms-ai-service/src/main/java/com/university/lms/ai/web/PredictionController.java:19:@RequestMapping("/v1/ai")
backend-spring/lms-ai-service/src/main/java/com/university/lms/ai/web/PredictionController.java:25:    @PostMapping("/predict-grades")
backend-spring/lms-ai-service/src/main/java/com/university/lms/ai/web/AiCourseController.java:31:@RequestMapping("/v1/ai")
backend-spring/lms-ai-service/src/main/java/com/university/lms/ai/web/AiCourseController.java:47:    @PostMapping("/courses/generate")
backend-spring/lms-ai-service/src/main/java/com/university/lms/ai/web/AiCourseController.java:61:    @PostMapping(value = "/courses/generate-stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
backend-spring/lms-ai-service/src/main/java/com/university/lms/ai/web/AiCourseController.java:74:    @PostMapping(value = "/modules/generate-stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
backend-spring/lms-ai-service/src/main/java/com/university/lms/ai/web/AiCourseController.java:89:    @PostMapping("/courses/generate-and-save")
backend-spring/lms-ai-service/src/main/java/com/university/lms/ai/web/AiCourseController.java:116:    @PostMapping("/courses/confirm-save")
backend-spring/lms-ai-service/src/main/java/com/university/lms/ai/web/AiCourseController.java:139:    @PostMapping("/content/edit")
backend-spring/lms-ai-service/src/main/java/com/university/lms/ai/web/AiCourseController.java:153:    @PostMapping("/modules/generate")
backend-spring/lms-ai-service/src/main/java/com/university/lms/ai/web/AiCourseController.java:183:    @PostMapping("/assignments/generate")
backend-spring/lms-ai-service/src/main/java/com/university/lms/ai/web/AiCourseController.java:217:    @PostMapping("/quizzes/generate")
backend-spring/lms-ai-service/src/main/java/com/university/lms/ai/web/ContentGenerationController.java:16:@RequestMapping("/v1/ai/generate")
backend-spring/lms-ai-service/src/main/java/com/university/lms/ai/web/ContentGenerationController.java:28:    @PostMapping("/quiz")
backend-spring/lms-ai-service/src/main/java/com/university/lms/ai/web/ContentGenerationController.java:45:    @PostMapping("/assignment")
backend-spring/lms-ai-service/src/main/java/com/university/lms/ai/web/ContentGenerationController.java:64:    @PostMapping("/module")
backend-spring/lms-ai-service/src/main/java/com/university/lms/ai/web/AIHealthController.java:22:@RequestMapping("/v1/ai")
backend-spring/lms-ai-service/src/main/java/com/university/lms/ai/web/AIHealthController.java:32:    @GetMapping("/health")
backend-spring/lms-ai-service/src/main/java/com/university/lms/ai/web/AIHealthController.java:71:    @GetMapping("/ready")
backend-spring/lms-ai-service/src/main/java/com/university/lms/ai/web/AIHealthController.java:105:    @GetMapping("/alive")
backend-spring/lms-ai-service/src/main/java/com/university/lms/ai/web/AITemplateController.java:23:@RequestMapping("/v1/ai/templates")
backend-spring/lms-ai-service/src/main/java/com/university/lms/ai/web/AITemplateController.java:35:    @GetMapping
backend-spring/lms-ai-service/src/main/java/com/university/lms/ai/web/AITemplateController.java:45:    @GetMapping(params = "category")
backend-spring/lms-ai-service/src/main/java/com/university/lms/ai/web/AITemplateController.java:56:    @GetMapping("/popular")
backend-spring/lms-ai-service/src/main/java/com/university/lms/ai/web/AITemplateController.java:66:    @GetMapping("/{id}")
backend-spring/lms-ai-service/src/main/java/com/university/lms/ai/web/AITemplateController.java:76:    @PostMapping
backend-spring/lms-ai-service/src/main/java/com/university/lms/ai/web/AITemplateController.java:88:    @PutMapping("/{id}")
backend-spring/lms-ai-service/src/main/java/com/university/lms/ai/web/AITemplateController.java:100:    @DeleteMapping("/{id}")
backend-spring/lms-ai-service/src/main/java/com/university/lms/ai/web/AITemplateController.java:111:    @PostMapping("/{id}/generate")
backend-spring/lms-ai-service/src/main/java/com/university/lms/ai/web/AITemplateController.java:124:    @PostMapping("/initialize")
backend-spring/lms-analytics-service/src/main/java/com/university/lms/analytics/controller/AnalyticsController.java:19:@RequestMapping("/api/analytics")
backend-spring/lms-analytics-service/src/main/java/com/university/lms/analytics/controller/AnalyticsController.java:36:    @GetMapping("/courses/{courseId}/stats")
backend-spring/lms-analytics-service/src/main/java/com/university/lms/analytics/controller/AnalyticsController.java:53:    @GetMapping("/courses/{courseId}/student-progress")
backend-spring/lms-assessment-service/src/main/java/com/university/lms/assessment/web/VirtualLabController.java:20:@RequestMapping("/virtual-lab")
backend-spring/lms-assessment-service/src/main/java/com/university/lms/assessment/web/VirtualLabController.java:31:    @PostMapping("/execute")
backend-spring/lms-assessment-service/src/main/java/com/university/lms/assessment/web/QuestionController.java:25:@RequestMapping("/questions")
backend-spring/lms-assessment-service/src/main/java/com/university/lms/assessment/web/QuestionController.java:36:    @GetMapping("/{id}")
backend-spring/lms-assessment-service/src/main/java/com/university/lms/assessment/web/QuestionController.java:45:    @GetMapping("/course/{courseId}")
backend-spring/lms-assessment-service/src/main/java/com/university/lms/assessment/web/QuestionController.java:59:    @GetMapping("/course/{courseId}/type/{type}")
backend-spring/lms-assessment-service/src/main/java/com/university/lms/assessment/web/QuestionController.java:74:    @GetMapping("/global")
backend-spring/lms-assessment-service/src/main/java/com/university/lms/assessment/web/QuestionController.java:87:    @GetMapping("/course/{courseId}/search")
backend-spring/lms-assessment-service/src/main/java/com/university/lms/assessment/web/QuestionController.java:102:    @GetMapping("/course/{courseId}/difficulty/{difficulty}")
backend-spring/lms-assessment-service/src/main/java/com/university/lms/assessment/web/QuestionController.java:114:    @PostMapping
backend-spring/lms-assessment-service/src/main/java/com/university/lms/assessment/web/QuestionController.java:127:    @PutMapping("/{id}")
backend-spring/lms-assessment-service/src/main/java/com/university/lms/assessment/web/QuestionController.java:141:    @DeleteMapping("/{id}")
backend-spring/lms-assessment-service/src/main/java/com/university/lms/assessment/web/QuestionController.java:154:    @PostMapping("/{id}/duplicate")
backend-spring/lms-assessment-service/src/main/java/com/university/lms/assessment/web/QuizAttemptController.java:22:@RequestMapping("/quiz-attempts")
backend-spring/lms-assessment-service/src/main/java/com/university/lms/assessment/web/QuizAttemptController.java:33:    @PostMapping("/quiz/{quizId}/start")
backend-spring/lms-assessment-service/src/main/java/com/university/lms/assessment/web/QuizAttemptController.java:50:    @PostMapping("/{attemptId}/submit")
backend-spring/lms-assessment-service/src/main/java/com/university/lms/assessment/web/QuizAttemptController.java:64:    @PostMapping("/{attemptId}/grade")
backend-spring/lms-assessment-service/src/main/java/com/university/lms/assessment/web/QuizAttemptController.java:79:    @GetMapping("/quiz/{quizId}/user")
backend-spring/lms-assessment-service/src/main/java/com/university/lms/assessment/web/QuizAttemptController.java:92:    @GetMapping("/quiz/{quizId}/user/latest")
backend-spring/lms-assessment-service/src/main/java/com/university/lms/assessment/web/QuizAttemptController.java:105:    @GetMapping("/quiz/{quizId}/user/in-progress")
backend-spring/lms-assessment-service/src/main/java/com/university/lms/assessment/web/QuizAttemptController.java:123:    @GetMapping("/quiz/{quizId}/ungraded")
backend-spring/lms-assessment-service/src/main/java/com/university/lms/assessment/web/QuizController.java:25:@RequestMapping("/quizzes")
backend-spring/lms-assessment-service/src/main/java/com/university/lms/assessment/web/QuizController.java:36:    @GetMapping("/{id}")
backend-spring/lms-assessment-service/src/main/java/com/university/lms/assessment/web/QuizController.java:45:    @GetMapping("/course/{courseId}")
backend-spring/lms-assessment-service/src/main/java/com/university/lms/assessment/web/QuizController.java:59:    @GetMapping("/course/{courseId}/list")
backend-spring/lms-assessment-service/src/main/java/com/university/lms/assessment/web/QuizController.java:68:    @PostMapping
backend-spring/lms-assessment-service/src/main/java/com/university/lms/assessment/web/QuizController.java:83:    @PutMapping("/{id}")
backend-spring/lms-assessment-service/src/main/java/com/university/lms/assessment/web/QuizController.java:97:    @DeleteMapping("/{id}")
backend-spring/lms-assessment-service/src/main/java/com/university/lms/assessment/web/QuizController.java:110:    @PostMapping("/{quizId}/questions/{questionId}")
backend-spring/lms-assessment-service/src/main/java/com/university/lms/assessment/web/QuizController.java:126:    @DeleteMapping("/{quizId}/questions/{questionId}")
backend-spring/lms-assessment-service/src/main/java/com/university/lms/assessment/web/QuizController.java:140:    @PutMapping("/{quizId}/questions/reorder")
backend-spring/lms-assessment-service/src/main/java/com/university/lms/assessment/web/AssignmentController.java:27:@RequestMapping("/assignments")
backend-spring/lms-assessment-service/src/main/java/com/university/lms/assessment/web/AssignmentController.java:38:    @GetMapping("/{id}")
backend-spring/lms-assessment-service/src/main/java/com/university/lms/assessment/web/AssignmentController.java:47:    @GetMapping("/course/{courseId}")
backend-spring/lms-assessment-service/src/main/java/com/university/lms/assessment/web/AssignmentController.java:62:    @GetMapping("/course/{courseId}/published")
backend-spring/lms-assessment-service/src/main/java/com/university/lms/assessment/web/AssignmentController.java:71:    @GetMapping("/course/{courseId}/available")
backend-spring/lms-assessment-service/src/main/java/com/university/lms/assessment/web/AssignmentController.java:80:    @GetMapping("/course/{courseId}/upcoming")
backend-spring/lms-assessment-service/src/main/java/com/university/lms/assessment/web/AssignmentController.java:89:    @GetMapping("/course/{courseId}/overdue")
backend-spring/lms-assessment-service/src/main/java/com/university/lms/assessment/web/AssignmentController.java:98:    @GetMapping("/module/{moduleId}")
backend-spring/lms-assessment-service/src/main/java/com/university/lms/assessment/web/AssignmentController.java:107:    @GetMapping("/course/{courseId}/type/{type}")
backend-spring/lms-assessment-service/src/main/java/com/university/lms/assessment/web/AssignmentController.java:122:    @GetMapping("/course/{courseId}/search")
backend-spring/lms-assessment-service/src/main/java/com/university/lms/assessment/web/AssignmentController.java:137:    @PostMapping
backend-spring/lms-assessment-service/src/main/java/com/university/lms/assessment/web/AssignmentController.java:150:    @PutMapping("/{id}")
backend-spring/lms-assessment-service/src/main/java/com/university/lms/assessment/web/AssignmentController.java:164:    @DeleteMapping("/{id}")
backend-spring/lms-assessment-service/src/main/java/com/university/lms/assessment/web/AssignmentController.java:171:    @GetMapping
backend-spring/lms-assessment-service/src/main/java/com/university/lms/assessment/web/PeerReviewController.java:16:@RequestMapping("/api/peer-reviews")
backend-spring/lms-assessment-service/src/main/java/com/university/lms/assessment/web/PeerReviewController.java:26:    @PostMapping("/assignments/{assignmentId}/rubrics")
backend-spring/lms-assessment-service/src/main/java/com/university/lms/assessment/web/PeerReviewController.java:38:    @GetMapping("/assignments/{assignmentId}/rubrics")
backend-spring/lms-assessment-service/src/main/java/com/university/lms/assessment/web/PeerReviewController.java:48:    @PostMapping("/assignments/{assignmentId}/assign")
backend-spring/lms-assessment-service/src/main/java/com/university/lms/assessment/web/PeerReviewController.java:62:    @GetMapping("/assignments/{assignmentId}")
backend-spring/lms-assessment-service/src/main/java/com/university/lms/assessment/web/PeerReviewController.java:72:    @GetMapping("/reviewer/{reviewerUserId}")
backend-spring/lms-assessment-service/src/main/java/com/university/lms/assessment/web/PeerReviewController.java:82:    @GetMapping("/reviewee/{revieweeUserId}")
backend-spring/lms-assessment-service/src/main/java/com/university/lms/assessment/web/PeerReviewController.java:92:    @PostMapping("/submit")
backend-spring/lms-assessment-service/src/main/java/com/university/lms/assessment/web/PeerReviewController.java:102:    @GetMapping("/submissions/{submissionId}/aggregate-score")
```
