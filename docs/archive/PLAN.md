# Implementation Plan — LearnSystemUCU Outstanding Work

**Date:** 2026-03-25
**Branch:** dev
**Status:** Ready for execution

## Summary

The VPL (Virtual Programming Lab) feature's 5 critical bugs have been fixed. Two new features have backend implementations but are not yet wired into the frontend:

1. **Course Analytics** — backend complete (untracked), `AnalyticsDashboard.tsx` exists but not integrated into any page
2. **VPL wizard editing gap** — `legacyToWizardData()` doesn't populate `vpl_config` for editing existing VIRTUAL_LAB assignments

---

## Phase 0: Documentation Discovery (DONE)

Exploration complete. Findings:

**Backend new files (untracked):**
- `CourseAnalyticsController.java` — `/analytics/courses/{courseId}/stats` and `/analytics/courses/{courseId}/student-progress`
- `CourseAnalyticsService.java` — full implementation using existing repos
- `CourseStatsDto.java`, `StudentProgressDto.java` — records matching frontend interfaces

**Frontend:**
- `AnalyticsDashboard.tsx` — exists at `frontend/src/components/analytics/AnalyticsDashboard.tsx`, NOT imported anywhere
- `courseDetailModel.ts:23` — `CourseDetailTabId` union type has no `'analytics'` member
- `wizardMapper.ts:188` — `legacyToWizardData()` return object missing `vpl_config`

**Gateway:** `/api/analytics/**` already routes to `LEARNING_SERVICE_URL` (learning service). No gateway changes needed.

**All dependent repo methods verified present:**
- `CourseMemberRepository.findActiveStudentUserIdsByCourseId` ✅
- `SubmissionRepository.findByAssignmentIdIn` ✅
- `Assignment.requiresSubmission()` ✅

---

## Phase 1: Fix VPL Wizard Editing Gap

**File:** `frontend/src/pages/assignment-wizard/wizardMapper.ts`
**Location:** `legacyToWizardData()` function, line ~188

**What to do:** Add `vpl_config` to the returned object:

```diff
    is_template: legacy.is_template,
    ai_drafts: [],
+   vpl_config: legacy.vpl_config ?? null,
  };
}
```

**Verification:**
- `grep -n "vpl_config" frontend/src/pages/assignment-wizard/wizardMapper.ts` should show `vpl_config` in both `legacyToWizardData` and `wizardDataToApiPayload`
- TypeScript check: `npx tsc --noEmit` passes

**Anti-pattern guard:** Do NOT add any other fields — only `vpl_config` is missing.

---

## Phase 2: Integrate AnalyticsDashboard into CourseDetail

### Step 2a — Add `'analytics'` tab type

**File:** `frontend/src/pages/course-detail/courseDetailModel.ts`

1. Add `ChartBarIcon` to the heroicons import (line 8)
2. Add `'analytics'` to the `CourseDetailTabId` union (line 23-29)
3. Add `'analytics'` to `COURSE_DETAIL_TABS` array (line 31-38)
4. Add analytics tab entry to `getCourseDetailTabs()` (line 77-84), label `'Analytics'`

### Step 2b — Wire analytics tab in CourseDetail.tsx

**File:** `frontend/src/pages/CourseDetail.tsx`

1. Import `AnalyticsDashboard` from `'../components/analytics/AnalyticsDashboard'`
2. Add tab render for `activeTab === 'analytics'`:

```tsx
{activeTab === 'analytics' && isInstructor && (
  <AnalyticsDashboard courseId={courseId} />
)}
```

3. Filter analytics tab from `tabs` for non-instructor users (students should not see it):
   - Either filter `getCourseDetailTabs()` result based on `isInstructor`
   - Or pass filtered tabs to `<CourseDetailTabs>`

**Verification:**
- `grep -n "analytics" frontend/src/pages/CourseDetail.tsx` shows import and render
- `npx tsc --noEmit` passes
- Analytics tab visible in browser for TEACHER/TA/SUPERADMIN role
- Analytics tab not visible for STUDENT role

---

## Phase 3: Backend Build Verification

Run the backend build to confirm new files compile:

```bash
cd backend-spring/lms-learning-service && mvn compile -q
```

**Verification checklist:**
- Build exits 0
- No compilation errors in `CourseAnalyticsService`, `CourseAnalyticsController`, `CourseStatsDto`, `StudentProgressDto`

**If build fails:** Check Jackson serialization of `boolean isStruggling` in `StudentProgressDto` record. Java records serialize component names directly; Jackson may serialize `boolean isStruggling` as `struggling` (stripping `is` prefix) instead of `isStruggling`. If so, either:
- Rename the record component to `struggling` and update the frontend interface, OR
- Add `@JsonProperty("isStruggling")` annotation on the record component

---

## Phase 4: Verification

```bash
# Frontend type check
cd frontend && npx tsc --noEmit

# Frontend lint
cd frontend && npm run lint

# Backend compile
cd backend-spring && mvn compile -q

# Contract tests
cd frontend && npm run test:contracts
```

**Expected:** All pass with no errors.

---

## Execution Order

1. Phase 1 (trivial, 1 line fix) → commit
2. Phase 2 (analytics integration) → commit
3. Phase 3 (backend build verify) → fix if needed
4. Phase 4 (full verification) → confirm all green
