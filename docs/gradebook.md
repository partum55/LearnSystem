# Gradebook

## Implemented Now

Gradebook data is owned by `learning-service` and exposed under:

- `GET /v1/courses/{courseId}/gradebook`
- `PATCH /v1/courses/{courseId}/gradebook/cells`
- `POST /v1/courses/{courseId}/gradebook/publish`
- `GET /v1/courses/{courseId}/gradebook/me`

Frontend routes:

- Course tab: `/courses/{courseId}` -> Grades tab.
- Full gradebook: `/courses/{courseId}/gradebook`.

## Course -> Grades

Current decision:

- Student: show inline `StudentGradesView`.
- Staff: show inline Gradebook Summary / Preview.
- Do not immediately redirect from the course Grades tab to the full gradebook.

## Teacher Gradebook Summary

Implemented now / active target:

- Course stats.
- Needs grading.
- Missing submissions.
- Unpublished grades.
- Module summaries.
- Assignment summaries.

Assignment summary actions:

1. Open assignment.
2. Open full gradebook filtered to the assignment.
3. Open SpeedGrader.

## Full Gradebook

Implemented now:

- `/courses/{courseId}/gradebook`.
- Excel-like table view.
- Filtered assignment mode.
- SpeedGrader mode.
- Deep links from course/assignment flows.

## AI Suggest Grade

Implemented now:

- Canonical AI task type: `SUGGEST_GRADE`.
- UI integration exists in SpeedGrader.
- AI suggestions are advisory only.

Required behavior:

- AI suggestion never auto-saves.
- AI suggestion never publishes.
- Teacher/TA must review, apply/save draft, and publish through gradebook/submission APIs.

## Planned

- Backend `.xlsx` export for the full gradebook.
- Rubrics.
- Grade history.
