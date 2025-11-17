# Gradebook Migration Notes

## Legacy Django Module Inventory

### Models & Data Contracts
- **GradebookEntry** (`gradebook/models.py`)
  - Links `course`, `student`, optional `assignment`, and optional `submission`.
  - Core scoring fields: `score`, `max_score`, computed `percentage`, status enum (`NOT_SUBMITTED`, `SUBMITTED`, `GRADED`, `EXCUSED`, `MISSING`, `LATE`).
  - Flags and metadata: `is_late`, `is_excused`, `notes`, override block (`override_score/by/at/reason`), `graded_at`, timestamps.
  - Business logic:
    - `calculate_percentage()` auto-runs on save using override score when present.
    - `get_final_score()` returns override vs base score.
    - Unique per `(course, student, assignment)`.

- **GradebookCategory**
  - Fields: `name`, `description`, `weight` (percentage), `drop_lowest`, `position`.
  - Unique per `(course, name)`; used to drive weighted calculations.

- **CourseGradeSummary**
  - Aggregates course totals per student: `total_points_earned/possible`, `current_grade`, `letter_grade`, `category_grades` JSON, assignment counts, `final_grade`, `is_final`, timestamps.
  - Methods: `calculate_current_grade()` iterates graded entries, applies weights, updates completion metrics; `calculate_letter_grade()` maps numeric threshold to letter.

- **GradeHistory**
  - Captures before/after scores, `changed_by`, `change_reason`, `changed_at` for auditing.

### Serializers / DTO Requirements (`gradebook/serializers.py`)
- **GradebookEntrySerializer**: includes nested `student` (UserSerializer) and `assignment` (AssignmentSerializer), final score, overrides, submission link, status flags.
- **GradebookEntryUpdateSerializer**: teacher patch operations on overrides, status, notes, excused flag.
- **GradebookCategorySerializer**: mirrors entity + timestamps.
- **CourseGradeSummarySerializer**: nested `student`, overall totals, completion percentage derived.
- **GradeHistorySerializer**: history audit feed.
- **StudentGradebookViewSerializer**: composite payload of summary, entries, categories.
- **GradebookOverviewSerializer**: aggregates per-course gradebook (assignments + students matrix) for instructors.

### Views / Endpoints (`gradebook/views.py`)
- **GradebookViewSet**
  - `list/get_queryset`: teachers see their course entries, students only their own.
  - `course_gradebook(course_id)`: teacher matrix of all students vs assignments with summary details.
  - `student_gradebook(course_id)`: student-specific view structured by modules, includes unassigned assignments.
  - `all_student_grades`: student cross-course summary with completion rates.
  - `update_grade`: teacher patch to override scores (invokes summary recalculation + history).
  - `history`: fetch grade history per entry.
  - `recalculate_grades(course_id)`: recompute all student summaries for a course.

- **GradebookCategoryViewSet**
  - CRUD endpoints (list by course, create/update/delete) with teacher permissions.

- **CourseGradeSummaryViewSet**
  - Read-only list/retrieve with role-aware access.

### Signals & Background Logic (`gradebook/signals.py`)
- `create_gradebook_entries_for_assignment`: on Assignment creation (post_save) if published, create entries for each course student (bulk).
- `update_gradebook_from_submission`: on Submission save, sync GradebookEntry (status, scores, late flag, submission link) and recalc summary.
- `track_grade_changes`: pre_save on GradebookEntry logs changes into GradeHistory (uses override metadata for actor/reason).
- `update_course_grade_summary(course, student)`: helper used by signals + views to recompute summary counts + percentage; invoked after overrides and recalculations.

### Cross-Service Dependencies
- **Courses**: Course, CourseMember, Module for membership and structuring gradebooks.
- **Assessments**: Assignment metadata (title, max points, category, module, due date) and total counts.
- **Submissions**: Submission status (`SUBMITTED`, `GRADED`), grade, late flags, graded timestamps.
- **Users**: Student display info consumed in responses and audit.

### Business Rules to Preserve
1. **Auto Entry Creation**: Each published assignment results in gradebook entries for enrolled students, ensuring matrix completeness.
2. **Status Handling**: Submission events drive entry status transitions and lateness/excused flags.
3. **Override Semantics**: Manual overrides capture actor/reason/time and drive both displayed final scores and history records.
4. **Summary Calculations**: CourseGradeSummary tracks totals, letter grade, completion metrics, and assignment counts (including unpublished/excused logic).
5. **History/Audit Trail**: Every score change persists to GradeHistory for compliance.
6. **Role-Based Access**: Teacher/admin access to course-wide overviews; students limited to self context.

### Migration Implications
- Need DTOs mirroring nested student/assignment/category data, plus teacher overview matrix and student module view.
- Gradebook service must integrate with course, assessment, and submission services (Feign clients) for membership, assignments, modules, and submissions events.
- Signals translate to Spring domain events + scheduled jobs (e.g., assignment creation listener, submission graded listener, recalculation scheduler).
- Security behaviors (JWT filter, headers, rate limiting) should come from `lms-common` to ensure consistency across services.

