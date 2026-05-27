# QR Seminar Attendance

## Implemented Now

QR attendance is tied only to `SEMINAR` assignments. It is not course-level attendance.

Teacher/staff flow:

1. Open a seminar assignment.
2. Start a QR attendance session.
3. The backend returns the raw token once.
4. The UI builds a check-in link: `/seminars/check-in?token=...`.
5. The QR session is valid for 15 minutes.

Student flow:

1. Student opens `/seminars/check-in?token=...`.
2. If not logged in, the user is redirected to login and returned to check-in.
3. Backend checks token, session validity, assignment, and enrollment.
4. Success displays attendance approval and a dashboard button.

Backend endpoints:

- `POST /v1/assignments/{assignmentId}/seminar-attendance/sessions`
- `GET /v1/assignments/{assignmentId}/seminar-attendance`
- `POST /v1/seminar-attendance/check-in`
- `POST /v1/seminar-attendance/sessions/{sessionId}/close`

## Security and Behavior

Implemented now:

- Raw token is returned once when creating a session.
- Token is stored as a SHA-256 hash.
- Only enrolled students can check in.
- Duplicate check-in is success-like and treated as already approved.
- Current record status is `PRESENT`.
- Current method is `QR`.

## Planned

- Manual attendance marking.
- `PRESENT`, `LATE`, `ABSENT`, `EXCUSED` statuses.
- Rotating QR every 30-60 seconds.
