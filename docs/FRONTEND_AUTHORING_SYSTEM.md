# Frontend Authoring System (Tasks & Assessments)

## 1) Component & Folder Structure

```
frontend/src/
  features/authoring/
    api/
      authoringApi.ts
    components/
      AIReviewPanel.tsx
      LatexEditor.tsx
      LatexPreview.tsx
      QuestionEditor.tsx
      QuizBuilder.tsx
      RubricEditor.tsx
      SaveStateBanner.tsx
      TaskEditor.tsx
      TaskMetadataForm.tsx
      TaskSettingsForm.tsx
      ValidationSummary.tsx
      index.ts
    hooks/
      useAuthoringValidation.ts
      useTaskDraft.ts
    utils/
      latex.ts
    types.ts
```

Design goals:
- Feature-first to keep task authoring isolated and scalable.
- All shared building blocks (editor, validation, AI review) live in `features/authoring/components`.
- API integration is centralized in `features/authoring/api/authoringApi.ts`.

## 2) Key React Components

### TaskEditor
- Orchestrates the authoring flow (metadata → settings → rubric → questions → AI review → validation → preview).
- Explicit save/validate/preview actions (no silent autosave).
- Read-only mode when user role is `STUDENT` or when a draft lock exists.

### QuizBuilder
- Dynamic question editor supporting MCQ, multi-select, numeric, open-text, LaTeX response.
- Nested option management and scoring controls.

### RubricEditor
- Criteria list with weights and LaTeX-capable explanations.
- Prevents destructive actions without confirmation.

### LaTeXEditor
- Rich text editor with inline & block LaTeX.
- Live preview and delimiter validation.
- Format toggle (Markdown, LaTeX, HTML) for explicit rendering semantics.

## 3) API Integration Examples

### Create / Update
```ts
const api = createAuthoringApi();
await api.createTask(draft);
await api.updateTask(draftId, draft);
```

### Validate
```ts
const result = await api.validateTask(draft);
```

### Preview
```ts
const html = await api.previewTask({ content: draft.metadata.description, format: draft.metadata.format });
```

## 4) State Management Approach
- **Local form state:** `useTaskDraft` maintains draft state with explicit reset and save markers.
- **Validation:** `useAuthoringValidation` performs client-side validation and LaTeX delimiter checks.
- **Server state:** `createAuthoringApi` is compatible with React Query mutations in consuming screens.

## 5) Validation Strategy
- Client-side checks for required fields, rubric criteria, and LaTeX delimiter balance.
- Explicit server-side validation call to mirror backend rules.
- Validation output never blocks save silently; errors are visible and actionable.

## 6) UX Flow Description
1. Author selects task type (assignment, quiz, question bank, lesson task, AI task).
2. Metadata and settings entered first; rubric and questions built next.
3. AI drafts can be generated, reviewed, and applied manually.
4. Validate before save; preview for rendering verification.
5. Save draft or publish explicitly.

UX safeguards:
- Read-only for unauthorized users.
- Draft locks prevent concurrent edits.
- Explicit confirmation on destructive reset.
- Save state banner shows success/failure.

## 7) Correctness & Data Integrity Guarantees
- No auto-apply of AI content: users must approve and apply drafts explicitly.
- LaTeX stored unchanged; only rendered in preview layers.
- Client validation catches common LaTeX mistakes and missing fields early.
- Server validation integrated for authoritative checks.
- No optimistic updates for grading-critical data.

## 8) LaTeX Rendering Strategy
- Client uses a LaTeX renderer (KaTeX or MathJax) via `window.katex` when present.
- Fallback rendering keeps raw LaTeX visible and safe.
- Sanitization applied after rendering to prevent XSS without corrupting LaTeX.

