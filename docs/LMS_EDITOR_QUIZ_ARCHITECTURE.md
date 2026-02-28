# LMS Block Editor + Quiz Builder Architecture (MVP)

## 1) Product/UX Spec

### Editor UX
- Block-based editing with canonical JSON (`doc/content`), not Markdown-first.
- Page tree is module-scoped (`module_pages` with `parent_page_id` nesting).
- Craft-style insertion:
  - slash command palette (`/`)
  - toolbar actions
  - keyboard-first editing and Alt+Up/Down question/page ordering where applicable
- TOC generated from heading blocks (`/pages/{id}/toc`).
- Publish model: draft + published snapshot (no full revision timeline in MVP).

### Block Behaviors (MVP)
- Core blocks: paragraph, heading, bulleted/ordered list, quote, code block, inline code, table.
- Extended canonical node support in backend schema validation:
  - callout, task list/checklist, embed, citation, footnote, numbered paragraph, testCase.
- Footnotes and numbered paragraphs are normalized server-side (auto sequence/ordinal).

### Assignment UX
- Assignment template document stored separately and cloned into student submission docs.
- Student submission editor uses LITE mode (single document, no page tree).

### Quiz UX
- Separate Quiz Builder module.
- Question types supported in authoring/taking flows:
  - single choice, multiple response, short answer, numeric, matching, ordering, essay (+ true/false compatibility).
- Section/rule authoring available in quiz settings for randomized quota selection.

## 2) Canonical JSON Schema & Validation

### Root Shape
- `type = "doc"`
- `content = []`
- `version` tracked in payload.

### Node Rules
- Shared node types allowed in FULL/LITE:
  - `doc`, `text`, `paragraph`, `heading`, `bulletList`, `orderedList`, `listItem`, `hardBreak`, `blockquote`, `codeBlock`, `inlineCode`, `image`, `mathInline`, `mathBlock`.
- FULL-only node types:
  - `taskList`, `taskItem`, `callout`, `table`, `tableRow`, `tableCell`, `tableHeader`, `embed`, `citation`, `footnote`, `numberedParagraph`, `testCase`.

### Security Validation
- JSON size and block count limits.
- Table row/column caps.
- Embed allowlist by provider + host (`youtube/pdf` + configured domains).
- Backend treats JSON as canonical; rendered HTML is derived.

### Migration Strategy
- Schema version integer included in document payload.
- Normalization pass before validation/persistence for deterministic numbering.

## 3) Algorithms & Complexity

### Editor Transaction Model
- Save operation is full-document upsert (`O(n)` in node count for serialize/validate/walk).
- Undo/redo remains frontend-local in TipTap/ProseMirror stack (`O(1)` amortized per op, state-dependent memory).

### Selection/Position Mapping
- Quiz question ordering uses index list reorder API (`O(q)`).
- Attempt snapshot keeps immutable `position` per selected question.

### TOC Generation
- DFS over JSON tree and collect heading nodes.
- Time: `O(n)` nodes, Space: `O(h)` recursion + `O(k)` heading output.

### Footnote / Numbered Paragraph Renumbering
- Single DFS normalization pass with counters.
- Time: `O(n)`, Space: `O(h)` recursion.

## 4) Spring Boot Backend Architecture

### Content Modules
- `course.content.*`
  - `ModulePageService`, `DocumentValidationService`, `DocumentNormalizationService`, `PageDocumentIndexingService`
  - `ModulePageController`, `PageDocumentController`
- Assignment/submission canonical docs:
  - `course.assessment.document.*`
  - `submission.document.*`

### Assessment Modules
- Question bank + versioning:
  - `QuestionService`, `QuestionVersionService`, `QuestionVersionController`
- Quiz + sections:
  - `QuizService`, `QuizSectionService`, `QuizSectionController`
- Attempts + scoring:
  - `QuizAttemptService`, `QuizAttemptController`
- Import/export:
  - `QuizImportExportService`, `QuizImportExportController`

### REST Surface (high level)
- Documents/pages:
  - `/courses/{courseId}/modules/{moduleId}/pages`
  - `/pages/{pageId}/document`, `/pages/{pageId}/publish`, `/pages/{pageId}/toc`
- Assignment/submission docs:
  - `/assignments/{assignmentId}/template-document`
  - `/assignments/{assignmentId}/submissions/clone-template`
  - `/submissions/{submissionId}/document`
- Quiz/Question:
  - `/assessments/questions/*`, `/assessments/questions/{id}/versions/*`
  - `/assessments/quizzes/*`, `/assessments/quizzes/{id}/sections/*`
  - `/assessments/quizzes/{id}/export/*`, `/assessments/quizzes/import/*`
- Attempts:
  - `/assessments/quiz-attempts/quiz/{quizId}/start`
  - `/assessments/quiz-attempts/{attemptId}/questions|save|submit`

## 5) PostgreSQL Schema (MVP)

### Content
- `module_pages`
- `page_documents` (draft JSONB)
- `page_published_documents` (published JSONB)
- `page_citations` (derived index)
- `page_footnotes` (derived index)
- `assignment_template_documents`
- `submission_documents`

### Quiz/Question
- `question_bank` (+ `topic`, `difficulty`, `tags`, `is_archived`)
- `question_bank_versions`
- `quiz_sections`
- `quiz_section_rules`
- `quiz_attempt_questions` (frozen snapshot)
- `quiz_responses` (per-question graded response)

## 6) React Frontend Architecture

### Editor
- `features/editor-core/BlockEditor.tsx` (TipTap-based shell).
- `ModulePageEditor.tsx` for page tree, editing, TOC, publish actions.
- API client adapters:
  - `api/pages.ts` for pages/docs/template/submission docs.

### Quiz
- `QuizBuilder.tsx`:
  - metadata editing
  - question create/update/link/reorder sync
  - section/rule sync
- `QuizTaking.tsx`:
  - uses frozen attempt-question snapshots
  - submits/saves answers by `attemptQuestionId`
- `QuizResults.tsx`:
  - compatible with snapshot-keyed answer payloads.

## 7) MVP Milestones & Scope Cuts

1. Canonical document persistence + validation + publish model.
2. Module page tree + editor shell + TOC.
3. Assignment template clone + submission docs.
4. Question versioning + quiz sections + snapshot attempts.
5. Quiz taking and grading integration.
6. Import/export JSON+CSV.

Scope cuts kept:
- Real-time collaboration.
- Word-like track changes.
- PDF export (Phase 2).
- Full image processing pipeline (left as backend TODO placeholder).

## 8) Bootstrap / Run Commands

### Backend
- `cd backend-spring`
- `mvn -pl lms-learning-service test`
- `mvn -pl lms-learning-service -DskipTests compile`

### Frontend
- `cd frontend`
- `npm install`
- `npm run build`
- `npm run dev`

## 9) Testing Strategy

### Unit
- `DocumentValidationServiceTest`
- `DocumentNormalizationServiceTest`
- `QuizAttemptServiceTest` (snapshot freeze + auto-grade)

### API/Integration (recommended next)
- CRUD for pages/documents/template/submission docs.
- quiz section CRUD + import/export endpoints.
- attempt start/save/submit with snapshot consistency.

### Security (recommended next)
- paste/import sanitization tests
- embed allowlist enforcement tests
- upload MIME/extension/size validation tests
- CSP verification in deployment environment
