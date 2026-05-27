# Course Model

## Implemented Now

The canonical course model is:

```text
Course -> Modules -> ordered contents
                  -> learning materials
                  -> assignments
```

Module contents are presented as one vertical list. Learning materials and assignments live together in module order.

## Course Roles

- `OWNER`: full course control, including ownership-level administration and deletion/archive flows where available.
- `TEACHER`: learning management, module/material/assignment/grading operations; no ownership transfer or destructive owner-only administration.
- `TA`: operational and grading assistance; no staff/course administration.
- `STUDENT`: learner-only access.
- `ADMIN`: platform override for administrative flows.

## Course Page

Implemented now / active UX target:

- Clean course header.
- Minimal progress signal.
- No global staff tools bar.
- Tabs:
  - Overview
  - Modules
  - Grades
  - Members

## Modules

Implemented now:

- Create modules inside the Modules tab.
- Add learning material inside a specific module.
- Add assignments inside a specific module.
- Show module contents as one ordered vertical list.

The current active model uses modules, learning items, lesson pages, assignments, submissions, and grades.

## Course Preview

Planned / needs verification:

- Teacher/admin student-like preview for checking learner experience.
- Public course landing page is not planned now.

## Partially Implemented / Needs Verification

- Form assignments and quiz-like flows exist in parts of the UI/code, but remain in development.
