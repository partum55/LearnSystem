# Security Audit Report — LearnSystemUCU

**Date:** 2026-03-03
**Branch:** `dev` (compared against `main`)
**Scope:** All modified and new files (~100+ files) across backend Spring Boot microservices, frontend React/TypeScript, Docker configs, and database migrations.
**Methodology:** Manual code review of authentication, authorization, injection, XSS, data exposure, and cryptographic concerns.

---

## Summary

| # | Severity | Title | File |
|---|----------|-------|------|
| 1 | **CRITICAL** | Stored XSS via unsanitized Mermaid SVG rendering | `frontend/src/features/editor-core/BlockEditor.tsx` |
| 2 | **HIGH** | Missing authorization on quiz import/export endpoints | `QuizImportExportController.java` |
| 3 | **HIGH** | IDOR in dean gradebook export (cross-course PII leakage) | `DeanGradebookExportController.java` |
| 4 | **MEDIUM** | Unauthenticated course data exposure via code lookup | `CourseController.java` |

---

## Remediation Priority

1. **Vuln 1 (CRITICAL)** — Fix immediately. One-line sanitization change, zero risk of regression.
2. **Vuln 2 (HIGH)** — Fix before any user-facing deployment. Add `@PreAuthorize` + course ownership checks.
3. **Vuln 3 (HIGH)** — Fix before any user-facing deployment. Add course membership verification.
4. **Vuln 4 (MEDIUM)** — Evaluate intent. If public access is deliberate, restrict returned fields. Otherwise require authentication.

---

## Detailed Findings

### Vuln 1: CRITICAL — Stored XSS via Unsanitized Mermaid SVG Rendering

**File:** `frontend/src/features/editor-core/BlockEditor.tsx:631`
**Confidence:** 9/10

**Description:**
Mermaid diagram SVG output is rendered via `dangerouslySetInnerHTML` without DOMPurify sanitization. DOMPurify *is* imported (line 22) and used elsewhere in the same file — at line 75 for imported HTML and at line 681 for LaTeX error display — but the Mermaid SVG rendering path at lines 564-566 sets `diagramSvg` directly from `mermaid.render()` output without any sanitization:

```tsx
// Line 564-568 — SVG set directly from mermaid output, no sanitization
mermaid
  .render(renderIdRef.current, code)
  .then(({ svg }) => {
    if (!disposed) {
      setDiagramSvg(svg);  // ← unsanitized
    }
  })
```

```tsx
// Line 631 — rendered into DOM unsanitized
<div className="editor-mermaid-svg" dangerouslySetInnerHTML={{ __html: diagramSvg }} />
```

**Exploit scenario:**
An attacker (e.g. a student with edit access to course content) crafts malicious Mermaid diagram code:

```
graph TD; A["<img src=x onerror=alert(document.cookie)>"]
```

When any user views the page containing this diagram, the SVG is injected unsanitized into the DOM, executing arbitrary JavaScript. This enables session hijacking via token theft from `localStorage`, which stores JWT tokens.

**Recommended fix:**
Sanitize SVG output with DOMPurify before setting state. DOMPurify is already imported:

```tsx
// Replace line 566:
setDiagramSvg(svg);

// With:
setDiagramSvg(DOMPurify.sanitize(svg, { USE_PROFILES: { svg: true } }));
```

---

### Vuln 2: HIGH — Missing Authorization on Quiz Import/Export Endpoints

**File:** `backend-spring/lms-learning-service/src/main/java/com/university/lms/course/assessment/web/QuizImportExportController.java:21-72`
**Confidence:** 8/10

**Description:**
The `QuizImportExportController` has **no `@PreAuthorize` annotations** on any of its 6 endpoints:

| Line | Endpoint | Method |
|------|----------|--------|
| 26 | `/{quizId}/export/json` | GET |
| 31 | `/{quizId}/export/csv` | GET |
| 40 | `/import/json` | POST |
| 46 | `/import/csv` | POST |
| 55 | `/import/excel` | POST |
| 64 | `/import/word` | POST |

`SecurityConfig.java` line 104 only requires `.anyRequest().authenticated()` — so any logged-in user can access these. Additionally, `QuizImportExportService` has zero calls to `ensureCanManageCourse()` or `canUserManageCourse()`, unlike other quiz operations (e.g. `duplicateQuiz()` which does verify course ownership).

**Exploit scenario:**
1. **Answer exfiltration:** Any authenticated student calls `GET /quizzes/{quizId}/export/json` to export quiz JSON including correct answers, destroying exam integrity.
2. **Unauthorized import:** Any authenticated student calls `POST /quizzes/import/json` with an arbitrary `courseId`, injecting quizzes into courses they don't manage.

**Recommended fix:**
1. Add class-level annotation:
   ```java
   @PreAuthorize("hasAnyRole('TEACHER','TA','SUPERADMIN')")
   public class QuizImportExportController {
   ```
2. Add course ownership verification in `QuizImportExportService` before export/import operations using the existing `CourseMemberRepository.canUserManageCourse()`.

---

### Vuln 3: HIGH — IDOR in Dean Gradebook Export (Cross-Course PII Leakage)

**File:** `backend-spring/lms-learning-service/src/main/java/com/university/lms/gradebook/web/DeanGradebookExportController.java:31`
**Service:** `backend-spring/lms-learning-service/src/main/java/com/university/lms/gradebook/service/DeanGradebookExportService.java:57`
**Confidence:** 9/10

**Description:**
The `@PreAuthorize("hasAnyRole('SUPERADMIN','TEACHER','TA')")` annotation at line 31 of the controller checks only the user's role, not their membership in the target course. The `actorId` is passed to `DeanGradebookExportService.export()` (line 57) but is only used for audit logging at line 97 — never for authorization. The existing `CourseMemberRepository.canUserManageCourse()` method (used by `CourseService` elsewhere) is NOT called in this service.

The exported XLSX contains sensitive student PII:
- Student IDs (line 154)
- Full names (line 155)
- Email addresses (line 156)
- Group codes (line 157)
- All individual assignment grades (lines 164-177)

**Exploit scenario:**
Teacher A (who teaches Course X only) calls:

```
GET /admin/course-management/gradebook/export/dean?courseId={Course_Y_UUID}
```

The role check passes (Teacher A has `TEACHER` role), no course membership check occurs, and Teacher A receives a full XLSX containing student emails, student IDs, names, and all grades for Course Y — a course they have no affiliation with.

**Recommended fix:**
Add course membership verification at the beginning of `DeanGradebookExportService.export()`:

```java
if (!courseMemberRepository.canUserManageCourse(courseId, actorId)) {
  throw new AccessDeniedException("You are not authorized to export grades for this course");
}
```

Or use a custom `@PreAuthorize` SpEL expression on the controller method.

---

### Vuln 4: MEDIUM — Unauthenticated Course Data Exposure via Code Lookup

**File:** `backend-spring/lms-learning-service/src/main/java/com/university/lms/course/web/CourseController.java:165-170`
**Config:** `backend-spring/lms-learning-service/src/main/java/com/university/lms/course/config/SecurityConfig.java:94`
**Confidence:** 8/10

**Description:**
The `getCourseByCode()` endpoint at line 166 has no `@PreAuthorize` annotation and is explicitly whitelisted as `.permitAll()` in `SecurityConfig.java` line 94:

```java
.requestMatchers(HttpMethod.GET, "/api/courses/code/**")
.permitAll()
```

The controller returns a full `CourseDto` object:

```java
@GetMapping("/code/{code}")
public ResponseEntity<CourseDto> getCourseByCode(@PathVariable String code) {
  CourseDto course = courseService.getCourseByCode(code);
  return ResponseEntity.ok(course);
}
```

**Exploit scenario:**
An unauthenticated attacker brute-forces common course codes (e.g. `CS-101`, `MATH-201`, `ENG-100`) to enumerate all courses and retrieve metadata including descriptions, instructor information, module structure, and enrollment details — without any authentication.

**Recommended fix:**
If public access is intentional (e.g. for course catalogs or enrollment links):
- Create a `CoursePublicDto` with limited fields (title, code, description, semester) and return that instead of the full `CourseDto`.

If public access is not intentional:
- Remove the `.permitAll()` rule from `SecurityConfig` and add `@PreAuthorize("isAuthenticated()")` to the method.

---

## Findings Excluded (Confidence < 8/10)

The following potential issues were investigated but excluded due to insufficient confidence, legitimate design decisions, or framework-level mitigations:

| Concern | Reason for exclusion |
|---------|---------------------|
| JWT tokens in query parameters (SSE endpoints) | Legitimate use case — the `EventSource` API cannot send custom headers. Standard pattern for SSE auth. |
| Bootstrap admin default credentials | Disabled by default in docker/production profiles; only active with `dev` Spring profile. |
| OAuth error message XSS in `Login.tsx` | React JSX auto-escapes string interpolation. Not using `dangerouslySetInnerHTML`. |
| JWT tokens in `localStorage` | Architectural trade-off (vs. httpOnly cookies). Not a code vulnerability per se. |
| CORS configuration | Defaults to restrictive `localhost` origins only. Production overridden via `GATEWAY_CORS_ALLOWED_ORIGINS` env var. |

---

*Generated by security audit on 2026-03-03.*
