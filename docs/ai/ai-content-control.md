# AI Content Control: End-to-End Guardrails

## Scope
This document defines the strict AI content contract, validation flow, preview/confirmation UX, persistence safeguards, and verification steps for AI-generated courses, lessons (modules), quizzes, and assignments.

## AI Output Schemas (Strict Contract)
JSON Schemas are the single source of truth for AI output requirements:
- Course schema: `docs/ai/schemas/course.schema.json`
- Lesson (module) schema: `docs/ai/schemas/lesson.schema.json`
- Quiz schema: `docs/ai/schemas/quiz.schema.json`
- Assignment schema: `docs/ai/schemas/assignment.schema.json`

All AI output must:
- Match required fields and types.
- Conform to size limits (max lengths and array sizes).
- Use UTF-8 text without control characters (backend sanitizer strips invalid control chars).
- Avoid additional/unrecognized fields (schema `additionalProperties: false`).

## Backend Validation & Safety
1. **AI generation → strict validation**
   - AI output is parsed into DTOs and sanitized.
   - Validation errors are returned explicitly with clear messages.
2. **Explicit DTO mapping before persistence**
   - AI DTOs are mapped into persistence DTOs (course, module, assignment, question).
   - No implicit/hidden transforms are allowed.
3. **Transactional boundaries and rollback**
   - All persistence is executed as a single workflow.
   - Any failure triggers a best-effort rollback of created resources.
4. **Defensive logging**
   - Structured logs include payload size and truncated payload samples.

## Frontend Preview & Confirmation
- AI output is displayed exactly as received (JSON preview).
- Users can edit, approve, or reject content.
- Nothing is persisted until explicit confirmation.
- Invalid JSON in the preview is blocked with clear errors.

## Database Integrity Guarantees
- Schema constraints enforce non-empty critical fields and prevent silent truncation.
- Referential integrity is enforced via foreign keys.
- JSONB and TEXT columns avoid size truncation for AI content.

## End-to-End Flow Diagram (Text)
```
AI Provider
  → lms-ai-service (parse → sanitize → validate)
    → Frontend (preview + edit)
      → User confirmation
        → lms-ai-service (re-validate + map)
          → lms-learning-service (course + assessment domains, transactional persistence)
            → Read-back verification
              → Success or explicit mismatch errors
```

## Verification Checklist
1. Generate content with AI endpoint (no save).
2. Verify JSON preview matches AI output exactly.
3. Edit JSON (if needed) and confirm.
4. Backend returns `verification.matches = true`.
5. Read back course/module/assignment/quiz details and compare to preview.
6. Confirm no partial saves exist if a failure is injected (rollback).
7. Validate DB constraints reject oversized or empty titles.
