# LearnSystem Frontend Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate `apps/web/src/` from a mixed `views/` + `api/` + `queries/` layout into a full feature-sliced architecture where every domain owns its api, hooks, components, and views — while preserving all existing UI, routes, and behavior.

**Architecture:** `features/<domain>/` folders hold domain code (api/, components/, hooks/, views/). The `app/` routing layer is untouched — only `src/` internals move. `components/` becomes shared UI only. `api/client.ts` and `api/queryClient.ts` stay in `api/` as shared infrastructure.

**Tech Stack:** Next.js 16.2.6, React 19, TypeScript 5, Tailwind 4, Zustand 5, TanStack Query 5, Axios, Supabase Auth (`@supabase/ssr`)

**Spec:** `docs/superpowers/specs/2026-05-20-frontend-refactor-design.md`

**Working directory for all commands:** `apps/web`

---

## Critical Context

- `proxy.ts` is the correct filename for Next.js 16 middleware — do NOT rename it
- `store/courseStore.ts` is deprecated but still used — do NOT touch it in this plan
- `api/client.ts` is the shared Axios instance — stays at `api/client.ts` throughout
- `api/queryClient.ts` exports `queryClient` and `queryKeys` — stays at `api/queryClient.ts` throughout
- `api/types.ts` exports `PageResponse<T>` — stays at `api/types.ts` throughout
- When moving API modules, change `import apiClient from './client'` → `import apiClient from '@/api/client'`
- When moving query hooks, change `import { queryKeys } from '../api/queryClient'` → `import { queryKeys } from '@/api/queryClient'`
- All `app/**/page.tsx` imports use `@/views/...` — these get updated in Phase 3

---

## Phase 1 — Component Consolidation

### Task 1: Merge ButtonEnhanced → Button

**Files:**
- Overwrite: `src/components/Button.tsx`
- Delete: `src/components/ButtonEnhanced.tsx`
- Rename: `src/components/ButtonEnhanced.test.tsx` → `src/components/Button.test.tsx`

The old `Button.tsx` uses a named export (`export const Button`) and lacks `forwardRef` and the `accent`/`outline` variants. Replace it with the Enhanced version, preserving the named export so `export * from './Button'` in the barrel continues to work.

- [ ] **Step 1: Overwrite Button.tsx with Enhanced content + named export**

```tsx
// src/components/Button.tsx
"use client";
import React, { forwardRef } from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children?: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'accent' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  fullWidth = false,
  className = '',
  disabled,
  ...props
}, ref) => {
  const variantClasses: Record<string, string> = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    accent: 'btn-accent',
    outline: 'btn-outline',
    ghost: 'btn-ghost',
    danger: 'btn-danger',
  };
  const sizeClasses: Record<string, string> = {
    sm: 'btn-sm',
    md: 'btn-md',
    lg: 'btn-lg',
  };
  const classes = [
    'btn',
    variantClasses[variant],
    sizeClasses[size],
    fullWidth && 'btn-full',
    className,
  ].filter(Boolean).join(' ');

  return (
    <button
      ref={ref}
      className={classes}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && (
        <svg
          className="animate-spin -ml-1 mr-2 h-4 w-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      )}
      {children}
    </button>
  );
});

Button.displayName = 'Button';
export default Button;
```

- [ ] **Step 2: Delete ButtonEnhanced.tsx**

```bash
git rm src/components/ButtonEnhanced.tsx
```

- [ ] **Step 3: Rename and fix test file**

```bash
git mv src/components/ButtonEnhanced.test.tsx src/components/Button.test.tsx
```

Then update the import inside `Button.test.tsx`:
```tsx
// Change line 4 from:
import Button from './ButtonEnhanced';
// To:
import { Button } from './Button';
```

- [ ] **Step 4: Commit**

```bash
git add src/components/Button.tsx src/components/Button.test.tsx
git commit -m "refactor: merge ButtonEnhanced into Button with named export"
```

---

### Task 2: Merge CardEnhanced → Card

**Files:**
- Read: `src/components/CardEnhanced.tsx` (understand full export)
- Overwrite: `src/components/Card.tsx`
- Delete: `src/components/CardEnhanced.tsx`
- Rename: `src/components/CardEnhanced.test.tsx` → `src/components/Card.test.tsx`

`CardEnhanced.tsx` exports `default CardWithSections`. The barrel uses `export * from './Card'` so we need a named `Card` export.

- [ ] **Step 1: Read CardEnhanced.tsx in full**

```bash
cat src/components/CardEnhanced.tsx
```

- [ ] **Step 2: Overwrite Card.tsx**

Copy the entire content of `CardEnhanced.tsx` into `Card.tsx`, then:
- Rename the internal const from `CardWithSections` to `Card` throughout the file
- Ensure the file ends with both:
```tsx
export { Card };
export default Card;
```

- [ ] **Step 3: Delete CardEnhanced.tsx and rename test**

```bash
git rm src/components/CardEnhanced.tsx
git mv src/components/CardEnhanced.test.tsx src/components/Card.test.tsx
```

- [ ] **Step 4: Fix test import**

In `Card.test.tsx`, update the import to match the renamed component:
```tsx
import { Card } from './Card';
```

- [ ] **Step 5: Commit**

```bash
git add src/components/Card.tsx src/components/Card.test.tsx
git commit -m "refactor: merge CardEnhanced into Card with named export"
```

---

### Task 3: Merge InputEnhanced → Input

**Files:**
- Read: `src/components/InputEnhanced.tsx`
- Overwrite: `src/components/Input.tsx`
- Delete: `src/components/InputEnhanced.tsx`
- Rename: `src/components/InputEnhanced.test.tsx` → `src/components/Input.test.tsx`

`InputEnhanced.tsx` exports `export default Input`. The barrel uses `export * from './Input'` so we need a named export.

- [ ] **Step 1: Read InputEnhanced.tsx in full**

```bash
cat src/components/InputEnhanced.tsx
```

- [ ] **Step 2: Overwrite Input.tsx**

Copy the full `InputEnhanced.tsx` content into `Input.tsx`. Ensure both exports exist at the bottom:
```tsx
export { Input };
export default Input;
```

- [ ] **Step 3: Delete InputEnhanced.tsx and rename test**

```bash
git rm src/components/InputEnhanced.tsx
git mv src/components/InputEnhanced.test.tsx src/components/Input.test.tsx
```

- [ ] **Step 4: Fix test import**

In `Input.test.tsx`:
```tsx
import { Input } from './Input';
```

- [ ] **Step 5: Commit**

```bash
git add src/components/Input.tsx src/components/Input.test.tsx
git commit -m "refactor: merge InputEnhanced into Input with named export"
```

---

### Task 4: Phase 1 build verification

- [ ] **Step 1: Type check**

```bash
npx tsc --noEmit
```
Expected: 0 errors. If you see `Cannot find module './ButtonEnhanced'` or similar, check the test file imports.

- [ ] **Step 2: Lint**

```bash
npm run lint
```
Expected: 0 errors.

- [ ] **Step 3: Build**

```bash
npm run build
```
Expected: Build completes successfully with no type errors.

---

## Phase 2 — Feature Folder Scaffolding + API/Hooks Migration

### Task 5: Create all feature folder skeletons

Create the directory tree. Only `mkdir` — no files yet.

- [ ] **Step 1: Create feature directories**

```bash
mkdir -p src/features/ai/api src/features/ai/components src/features/ai/hooks
mkdir -p src/features/admin/api src/features/admin/views
mkdir -p src/features/assignments/api src/features/assignments/components src/features/assignments/hooks src/features/assignments/types src/features/assignments/views
mkdir -p src/features/auth/api src/features/auth/views
mkdir -p src/features/calendar/api src/features/calendar/views
mkdir -p src/features/courses/api src/features/courses/components src/features/courses/hooks src/features/courses/types src/features/courses/views
mkdir -p src/features/dashboard/components src/features/dashboard/views
mkdir -p src/features/grades/api src/features/grades/hooks src/features/grades/views
mkdir -p src/features/landing/views
mkdir -p src/features/lesson/api src/features/lesson/hooks src/features/lesson/views
mkdir -p src/features/marketplace/api src/features/marketplace/views
mkdir -p src/features/profile/api src/features/profile/hooks src/features/profile/views
mkdir -p src/features/question-bank/views
mkdir -p src/features/quiz/components src/features/quiz/views
mkdir -p src/features/teacher/views
mkdir -p src/features/virtual-lab/api src/features/virtual-lab/components src/features/virtual-lab/views
mkdir -p src/features/design-system/views
```

- [ ] **Step 2: Commit scaffolding**

```bash
git add src/features/
git commit -m "chore: scaffold feature domain directories"
```

---

### Task 6: Move API files into feature domains

Move each domain API file from `api/` into its `features/<domain>/api/`. `api/client.ts`, `api/queryClient.ts`, `api/types.ts`, and `api/notifications.ts` stay in `api/`.

- [ ] **Step 1: Move all domain API files**

```bash
git mv src/api/ai.ts           src/features/ai/api/ai.ts
git mv src/api/aiPlugins.ts    src/features/ai/api/aiPlugins.ts
git mv src/api/admin.ts        src/features/admin/api/admin.ts
git mv src/api/adminAnalytics.ts src/features/admin/api/adminAnalytics.ts
git mv src/api/adminCourseManagement.ts src/features/admin/api/adminCourseManagement.ts
git mv src/api/assessments.ts  src/features/assignments/api/assessments.ts
git mv src/api/peerReviews.ts  src/features/assignments/api/peerReviews.ts
git mv src/api/authRecovery.ts src/features/auth/api/authRecovery.ts
git mv src/api/calendar.ts     src/features/calendar/api/calendar.ts
git mv src/api/courses.ts      src/features/courses/api/courses.ts
git mv src/api/gradebook.ts    src/features/grades/api/gradebook.ts
git mv src/api/progress.ts     src/features/grades/api/progress.ts
git mv src/api/lessons.ts      src/features/lesson/api/lessons.ts
git mv src/api/pages.ts        src/features/lesson/api/pages.ts
git mv src/api/marketplace.ts  src/features/marketplace/api/marketplace.ts
git mv src/api/plugins.ts      src/features/marketplace/api/plugins.ts
git mv src/api/users.ts        src/features/profile/api/users.ts
git mv src/api/virtualLab.ts   src/features/virtual-lab/api/virtualLab.ts
```

- [ ] **Step 2: Fix relative imports of api/client.ts in every moved file**

Every moved file has `import apiClient from './client'` or `import apiClient, { extractErrorMessage } from './client'`. These need to become absolute `@/api/client` imports.

Run this across all moved API files:
```bash
find src/features -path "*/api/*.ts" -exec \
  sed -i "s|from './client'|from '@/api/client'|g" {} \;
find src/features -path "*/api/*.ts" -exec \
  sed -i "s|from '../client'|from '@/api/client'|g" {} \;
```

Also fix any `api/types.ts` relative imports:
```bash
find src/features -path "*/api/*.ts" -exec \
  sed -i "s|from './types'|from '@/api/types'|g" {} \;
```

- [ ] **Step 3: Verify no broken relative imports remain in moved API files**

```bash
grep -r "from '\.\./api\|from '\./client\|from '\./types\|from '\./queryClient" src/features/
```
Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add src/api/ src/features/
git commit -m "refactor: move domain API files into features/<domain>/api/"
```

---

### Task 7: Move query hook files into feature domains

- [ ] **Step 1: Move query hooks**

```bash
git mv src/queries/useAIQueries.ts          src/features/ai/hooks/useAIQueries.ts
git mv src/queries/useAIUsageQueries.ts     src/features/ai/hooks/useAIUsageQueries.ts
git mv src/mutations/useAIMutations.ts      src/features/ai/hooks/useAIMutations.ts
git mv src/queries/useAssessmentQueries.ts  src/features/assignments/hooks/useAssessmentQueries.ts
git mv src/queries/useCourseQueries.ts      src/features/courses/hooks/useCourseQueries.ts
git mv src/queries/useLessonQueries.ts      src/features/lesson/hooks/useLessonQueries.ts
git mv src/queries/useProgressQueries.ts    src/features/grades/hooks/useProgressQueries.ts
git mv src/queries/useUserQueries.ts        src/features/profile/hooks/useUserQueries.ts
```

Move the AI streaming hook (global hooks/ → ai feature):
```bash
git mv src/hooks/useAIStreaming.ts src/features/ai/hooks/useAIStreaming.ts
```

- [ ] **Step 2: Fix imports inside moved hook files**

Each hook imports from relative paths that no longer work. Update them to `@/` absolute imports:

```bash
# Fix queryClient import in all moved hooks
find src/features -path "*/hooks/*.ts" -exec \
  sed -i "s|from '../../api/queryClient'|from '@/api/queryClient'|g" {} \;
find src/features -path "*/hooks/*.ts" -exec \
  sed -i "s|from '../api/queryClient'|from '@/api/queryClient'|g" {} \;
find src/features -path "*/hooks/*.ts" -exec \
  sed -i "s|from '../../api/courses'|from '../api/courses'|g" {} \;
find src/features -path "*/hooks/*.ts" -exec \
  sed -i "s|from '../../api/assessments'|from '../api/assessments'|g" {} \;
find src/features -path "*/hooks/*.ts" -exec \
  sed -i "s|from '../../api/lessons'|from '../api/lessons'|g" {} \;
find src/features -path "*/hooks/*.ts" -exec \
  sed -i "s|from '../../api/progress'|from '../api/progress'|g" {} \;
find src/features -path "*/hooks/*.ts" -exec \
  sed -i "s|from '../../api/users'|from '../api/users'|g" {} \;
find src/features -path "*/hooks/*.ts" -exec \
  sed -i "s|from '../../api/ai'|from '../api/ai'|g" {} \;
find src/features -path "*/hooks/*.ts" -exec \
  sed -i "s|from '../types'|from '@/types'|g" {} \;
find src/features -path "*/hooks/*.ts" -exec \
  sed -i "s|from '../../types'|from '@/types'|g" {} \;
```

- [ ] **Step 3: Check for any remaining broken relative imports in hooks**

```bash
grep -rn "from '\.\." src/features/ai/hooks/ src/features/assignments/hooks/ src/features/courses/hooks/ src/features/lesson/hooks/ src/features/grades/hooks/ src/features/profile/hooks/
```

Fix any remaining manually by reading each file and correcting the path.

- [ ] **Step 4: Commit**

```bash
git add src/queries/ src/mutations/ src/hooks/useAIStreaming.ts src/features/
git commit -m "refactor: move query hooks and mutations into features/<domain>/hooks/"
```

---

### Task 8: Update all files that imported from the now-moved locations

Any file outside `features/` that imported from `api/<moved-file>` or `queries/use*` needs updating.

- [ ] **Step 1: Find broken imports**

```bash
npx tsc --noEmit 2>&1 | grep "Cannot find module" | sort -u
```

List each broken import and the file it came from. You will see patterns like:
- `Cannot find module '../api/courses'` in a view file
- `Cannot find module '../../queries/useCourseQueries'` in a component

- [ ] **Step 2: Fix each broken import**

For each broken import, update to the new `@/features/<domain>/api/` or `@/features/<domain>/hooks/` path.

Example corrections:
```ts
// Before
import { coursesApi } from '../api/courses';
// After
import { coursesApi } from '@/features/courses/api/courses';

// Before
import { useCoursesQuery } from '../../queries/useCourseQueries';
// After
import { useCoursesQuery } from '@/features/courses/hooks/useCourseQueries';

// Before
import { aiApi } from '../api/ai';
// After
import { aiApi } from '@/features/ai/api/ai';

// Before
import { useMyAIUsage } from '../../queries/useAIUsageQueries';
// After
import { useMyAIUsage } from '@/features/ai/hooks/useAIUsageQueries';
```

- [ ] **Step 3: Verify zero type errors**

```bash
npx tsc --noEmit
```
Expected: 0 errors related to missing modules.

- [ ] **Step 4: Build verification**

```bash
npm run build
```
Expected: Clean build.

- [ ] **Step 5: Commit**

```bash
git add -p
git commit -m "refactor: fix imports after API and hooks migration to features/"
```

---

## Phase 3 — Views Migration

**Pattern for each domain:** `git mv` the view files, then update the `app/**/page.tsx` import from `@/views/...` to `@/features/<domain>/views/...`. Run `npx tsc --noEmit` after each domain before moving to the next.

---

### Task 9: Migrate auth + landing views

**Page files to update:** login, register, forgot-password, reset-password, verify-email, google callback, app/page.tsx

- [ ] **Step 1: Move auth view files**

```bash
git mv src/views/Login.tsx          src/features/auth/views/Login.tsx
git mv src/views/Register.tsx       src/features/auth/views/Register.tsx
git mv src/views/ForgotPassword.tsx src/features/auth/views/ForgotPassword.tsx
git mv src/views/ResetPassword.tsx  src/features/auth/views/ResetPassword.tsx
git mv src/views/VerifyEmail.tsx    src/features/auth/views/VerifyEmail.tsx
git mv src/views/GoogleAuthCallback.tsx src/features/auth/views/GoogleAuthCallback.tsx
git mv src/views/Landing.tsx        src/features/landing/views/Landing.tsx
```

- [ ] **Step 2: Update page.tsx imports**

`src/app/(auth)/login/page.tsx`:
```tsx
import Login from '@/features/auth/views/Login';
```

`src/app/(auth)/register/page.tsx`:
```tsx
import Register from '@/features/auth/views/Register';
```

`src/app/(auth)/forgot-password/page.tsx`:
```tsx
import ForgotPassword from '@/features/auth/views/ForgotPassword';
```

`src/app/(auth)/reset-password/page.tsx`:
```tsx
import ResetPassword from '@/features/auth/views/ResetPassword';
```

`src/app/(auth)/verify-email/page.tsx`:
```tsx
import VerifyEmail from '@/features/auth/views/VerifyEmail';
```

`src/app/auth/google/callback/page.tsx`:
```tsx
import GoogleAuthCallback from '@/features/auth/views/GoogleAuthCallback';
```

`src/app/page.tsx`:
```tsx
import Landing from '@/features/landing/views/Landing';
```

- [ ] **Step 3: Type check**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/views/ src/features/ src/app/
git commit -m "refactor: migrate auth and landing views to features/"
```

---

### Task 10: Migrate dashboard views

**Page files to update:** dashboard/page.tsx, dashboard/customize/page.tsx

- [ ] **Step 1: Move files**

```bash
git mv src/views/Dashboard.tsx         src/features/dashboard/views/Dashboard.tsx
git mv src/views/DashboardCustomize.tsx src/features/dashboard/views/DashboardCustomize.tsx
```

- [ ] **Step 2: Update page.tsx imports**

`src/app/(main)/dashboard/page.tsx`:
```tsx
'use client';
import Dashboard from '@/features/dashboard/views/Dashboard';
export default function Page() { return <Dashboard />; }
```

`src/app/(main)/dashboard/customize/page.tsx`:
```tsx
'use client';
import DashboardCustomize from '@/features/dashboard/views/DashboardCustomize';
export default function Page() { return <DashboardCustomize />; }
```

- [ ] **Step 3: Type check and commit**

```bash
npx tsc --noEmit
git add src/views/ src/features/ src/app/
git commit -m "refactor: migrate dashboard views to features/"
```

---

### Task 11: Migrate courses views

**Page files to update:** courses/page.tsx, courses/[id]/page.tsx, courses/[id]/edit, courses/[id]/preview, courses/[id]/archive, courses/create, all courseId/moduleId/* pages (lesson, pages, resources), attendance checkin

- [ ] **Step 1: Move files**

```bash
git mv src/views/CourseList.tsx    src/features/courses/views/CourseList.tsx
git mv src/views/CourseDetail.tsx  src/features/courses/views/CourseDetail.tsx
git mv src/views/CourseCreate.tsx  src/features/courses/views/CourseCreate.tsx
git mv src/views/CourseEdit.tsx    src/features/courses/views/CourseEdit.tsx
git mv src/views/CoursePreview.tsx src/features/courses/views/CoursePreview.tsx
git mv src/views/CourseArchive.tsx src/features/courses/views/CourseArchive.tsx
git mv src/views/AttendanceCheckin.tsx src/features/courses/views/AttendanceCheckin.tsx
git mv src/views/ResourceEditor.tsx    src/features/courses/views/ResourceEditor.tsx
git mv src/views/course-detail         src/features/courses/views/course-detail
git mv src/views/course                src/features/courses/views/course
```

- [ ] **Step 2: Update all affected page.tsx files**

`src/app/(main)/courses/page.tsx`:
```tsx
'use client';
import CourseList from '@/features/courses/views/CourseList';
export default function Page() { return <CourseList />; }
```

`src/app/(main)/courses/[id]/page.tsx`:
```tsx
'use client';
import CourseDetail from '@/features/courses/views/CourseDetail';
export default function Page() { return <CourseDetail />; }
```

`src/app/(main)/courses/create/page.tsx`:
```tsx
'use client';
import CourseCreate from '@/features/courses/views/CourseCreate';
export default function Page() { return <CourseCreate />; }
```

`src/app/(main)/courses/[id]/edit/page.tsx`:
```tsx
'use client';
import CourseEdit from '@/features/courses/views/CourseEdit';
export default function Page() { return <CourseEdit />; }
```

`src/app/(main)/courses/[id]/preview/page.tsx`:
```tsx
'use client';
import CoursePreview from '@/features/courses/views/CoursePreview';
export default function Page() { return <CoursePreview />; }
```

`src/app/(main)/courses/[id]/archive/page.tsx`:
```tsx
'use client';
import CourseArchive from '@/features/courses/views/CourseArchive';
export default function Page() { return <CourseArchive />; }
```

`src/app/(main)/courses/[courseId]/assignments/[assignmentId]/checkin/page.tsx`:
```tsx
'use client';
import AttendanceCheckin from '@/features/courses/views/AttendanceCheckin';
export default function Page() { return <AttendanceCheckin />; }
```

`src/app/(main)/courses/[courseId]/modules/[moduleId]/resources/new/page.tsx`:
```tsx
'use client';
import ResourceEditor from '@/features/courses/views/ResourceEditor';
export default function Page() { return <ResourceEditor />; }
```

`src/app/(main)/courses/[courseId]/modules/[moduleId]/resources/[resourceId]/page.tsx`:
```tsx
'use client';
import ResourceView from '@/features/courses/views/course/resources/ResourceView';
export default function Page() { return <ResourceView />; }
```

- [ ] **Step 3: Type check and commit**

```bash
npx tsc --noEmit
git add src/views/ src/features/ src/app/
git commit -m "refactor: migrate courses views to features/"
```

---

### Task 12: Migrate assignments views

**Page files to update:** assignments/page.tsx, assignments/[id]/page.tsx, courses/.../assignments/[id]/page.tsx

- [ ] **Step 1: Move files**

```bash
git mv src/views/AssignmentDetail.tsx    src/features/assignments/views/AssignmentDetail.tsx
git mv src/views/Assignments.tsx         src/features/assignments/views/Assignments.tsx
git mv src/views/AssignmentPrintView.tsx src/features/assignments/views/AssignmentPrintView.tsx
git mv src/views/assignment-wizard       src/features/assignments/views/assignment-wizard
git mv src/views/assignment-editor       src/features/assignments/views/assignment-editor
git mv src/views/submission              src/features/assignments/views/submission
```

- [ ] **Step 2: Update page.tsx files**

`src/app/(main)/assignments/page.tsx`:
```tsx
'use client';
import Assignments from '@/features/assignments/views/Assignments';
export default function Page() { return <Assignments />; }
```

`src/app/(main)/assignments/[id]/page.tsx`:
```tsx
'use client';
import AssignmentDetail from '@/features/assignments/views/AssignmentDetail';
export default function Page() { return <AssignmentDetail />; }
```

`src/app/(main)/courses/[courseId]/modules/[moduleId]/assignments/[assignmentId]/page.tsx`:
```tsx
'use client';
import AssignmentDetail from '@/features/assignments/views/AssignmentDetail';
export default function Page() { return <AssignmentDetail />; }
```

- [ ] **Step 3: Type check and commit**

```bash
npx tsc --noEmit
git add src/views/ src/features/ src/app/
git commit -m "refactor: migrate assignments views to features/"
```

---

### Task 13: Migrate quiz views

**Page files to update:** quiz/[id]/page.tsx, quiz/[id]/results/page.tsx, quiz/[id]/take/page.tsx

- [ ] **Step 1: Move files**

```bash
git mv src/views/QuizDetail.tsx  src/features/quiz/views/QuizDetail.tsx
git mv src/views/QuizResults.tsx src/features/quiz/views/QuizResults.tsx
git mv src/views/QuizBuilder.tsx src/features/quiz/views/QuizBuilder.tsx
git mv src/views/QuizTaking.tsx  src/features/quiz/views/QuizTaking.tsx
git mv src/views/quiz-builder    src/features/quiz/views/quiz-builder
git mv src/views/quiz-taking     src/features/quiz/views/quiz-taking
```

- [ ] **Step 2: Update page.tsx files**

`src/app/(main)/quiz/[id]/page.tsx`:
```tsx
'use client';
import QuizDetail from '@/features/quiz/views/QuizDetail';
export default function Page() { return <QuizDetail />; }
```

`src/app/(main)/quiz/[id]/results/page.tsx`:
```tsx
'use client';
import QuizResults from '@/features/quiz/views/QuizResults';
export default function Page() { return <QuizResults />; }
```

`src/app/(main)/quiz/[id]/take/page.tsx`:
```tsx
'use client';
import QuizTaking from '@/features/quiz/views/QuizTaking';
export default function Page() { return <QuizTaking />; }
```

- [ ] **Step 3: Type check and commit**

```bash
npx tsc --noEmit
git add src/views/ src/features/ src/app/
git commit -m "refactor: migrate quiz views to features/"
```

---

### Task 14: Migrate lesson views — and fix the broken LessonPlayer page

The page at `courses/[courseId]/modules/[moduleId]/lessons/[lessonId]/page.tsx` imports `LessonPlayer` but returns nothing (missing `return` statement). Fix it during this migration.

- [ ] **Step 1: Move files**

```bash
git mv src/views/lesson          src/features/lesson/views/lesson
git mv src/views/ModulePageEditor.tsx src/features/lesson/views/ModulePageEditor.tsx
```

- [ ] **Step 2: Update page.tsx files**

`src/app/(main)/courses/[courseId]/modules/[moduleId]/lessons/[lessonId]/page.tsx`:
```tsx
'use client';
import { use } from 'react';
import LessonPlayer from '@/features/lesson/views/lesson/LessonPlayer';

export default function Page({ params }: { params: Promise<{ courseId: string; moduleId: string; lessonId: string }> }) {
  const resolvedParams = use(params);
  return <LessonPlayer />;
}
```

`src/app/(main)/courses/[courseId]/modules/[moduleId]/lessons/[lessonId]/edit/page.tsx`:
```tsx
'use client';
import LessonBuilder from '@/features/lesson/views/lesson/LessonBuilder';
export default function Page() { return <LessonBuilder />; }
```

`src/app/(main)/courses/[courseId]/modules/[moduleId]/lessons/new/page.tsx`:
```tsx
'use client';
import LessonBuilder from '@/features/lesson/views/lesson/LessonBuilder';
export default function Page() { return <LessonBuilder />; }
```

`src/app/(main)/courses/[courseId]/modules/[moduleId]/pages/[pageId]/edit/page.tsx`:
```tsx
'use client';
import ModulePageEditor from '@/features/lesson/views/ModulePageEditor';
export default function Page() { return <ModulePageEditor />; }
```

`src/app/(main)/courses/[courseId]/modules/[moduleId]/pages/page.tsx`:
```tsx
'use client';
import ModulePageEditor from '@/features/lesson/views/ModulePageEditor';
export default function Page() { return <ModulePageEditor />; }
```

- [ ] **Step 3: Type check and commit**

```bash
npx tsc --noEmit
git add src/views/ src/features/ src/app/
git commit -m "refactor: migrate lesson views to features/ and fix broken LessonPlayer page"
```

---

### Task 15: Migrate grades, teacher, and speed-grader views

- [ ] **Step 1: Move files**

```bash
git mv src/views/AllGrades.tsx          src/features/grades/views/AllGrades.tsx
git mv src/views/StudentGradebook.tsx   src/features/grades/views/StudentGradebook.tsx
git mv src/views/SpeedGrader.tsx        src/features/grades/views/SpeedGrader.tsx
git mv src/views/TeacherTodoDashboard.tsx src/features/teacher/views/TeacherTodoDashboard.tsx
git mv src/views/TodaySubmissions.tsx   src/features/teacher/views/TodaySubmissions.tsx
```

- [ ] **Step 2: Update page.tsx files**

`src/app/(main)/grades/page.tsx`:
```tsx
'use client';
import { AllGrades } from '@/features/grades/views/AllGrades';
export default function Page() { return <AllGrades />; }
```

`src/app/(main)/gradebook/page.tsx`:
```tsx
'use client';
import StudentGradebook from '@/features/grades/views/StudentGradebook';
export default function Page() { return <StudentGradebook />; }
```

`src/app/(main)/speed-grader/page.tsx`:
```tsx
'use client';
import SpeedGrader from '@/features/grades/views/SpeedGrader';
export default function Page() { return <SpeedGrader />; }
```

`src/app/(main)/teacher/todo/page.tsx`:
```tsx
'use client';
import TeacherTodoDashboard from '@/features/teacher/views/TeacherTodoDashboard';
export default function Page() { return <TeacherTodoDashboard />; }
```

`src/app/(main)/today/page.tsx`:
```tsx
'use client';
import TodaySubmissions from '@/features/teacher/views/TodaySubmissions';
export default function Page() { return <TodaySubmissions />; }
```

- [ ] **Step 3: Type check and commit**

```bash
npx tsc --noEmit
git add src/views/ src/features/ src/app/
git commit -m "refactor: migrate grades and teacher views to features/"
```

---

### Task 16: Migrate admin, marketplace, profile, calendar, question-bank, virtual-lab, design-system views

- [ ] **Step 1: Move files**

```bash
git mv src/views/AdminDashboard.tsx    src/features/admin/views/AdminDashboard.tsx
git mv src/views/admin-dashboard       src/features/admin/views/admin-dashboard
git mv src/views/marketplace           src/features/marketplace/views/marketplace
git mv src/views/Profile.tsx           src/features/profile/views/Profile.tsx
git mv src/views/ProfileSettings.tsx   src/features/profile/views/ProfileSettings.tsx
git mv src/views/CalendarPage.tsx      src/features/calendar/views/CalendarPage.tsx
git mv src/views/QuestionBank.tsx      src/features/question-bank/views/QuestionBank.tsx
git mv src/views/VirtualLab.tsx        src/features/virtual-lab/views/VirtualLab.tsx
git mv src/views/DesignSystemDemo.tsx  src/features/design-system/views/DesignSystemDemo.tsx
```

- [ ] **Step 2: Update page.tsx files**

`src/app/(main)/admin/page.tsx`:
```tsx
'use client';
import AdminDashboard from '@/features/admin/views/AdminDashboard';
export default function Page() { return <AdminDashboard />; }
```

`src/app/(main)/marketplace/page.tsx`:
```tsx
'use client';
import MarketplaceBrowse from '@/features/marketplace/views/marketplace/MarketplaceBrowse';
export default function Page() { return <MarketplaceBrowse />; }
```

`src/app/(main)/marketplace/[pluginId]/page.tsx`:
```tsx
'use client';
import MarketplacePluginDetail from '@/features/marketplace/views/marketplace/MarketplacePluginDetail';
export default function Page() { return <MarketplacePluginDetail />; }
```

`src/app/(main)/profile/page.tsx`:
```tsx
'use client';
import Profile from '@/features/profile/views/Profile';
export default function Page() { return <Profile />; }
```

`src/app/(main)/profile/settings/page.tsx`:
```tsx
'use client';
import ProfileSettings from '@/features/profile/views/ProfileSettings';
export default function Page() { return <ProfileSettings />; }
```

`src/app/(main)/calendar/page.tsx`:
```tsx
'use client';
import CalendarPage from '@/features/calendar/views/CalendarPage';
export default function Page() { return <CalendarPage />; }
```

`src/app/(main)/question-bank/page.tsx`:
```tsx
'use client';
import QuestionBank from '@/features/question-bank/views/QuestionBank';
export default function Page() { return <QuestionBank />; }
```

`src/app/(main)/virtual-lab/page.tsx`:
```tsx
'use client';
import VirtualLab from '@/features/virtual-lab/views/VirtualLab';
export default function Page() { return <VirtualLab />; }
```

`src/app/(main)/virtual-lab/[assignmentId]/page.tsx`:
```tsx
'use client';
import VirtualLab from '@/features/virtual-lab/views/VirtualLab';
export default function Page() { return <VirtualLab />; }
```

`src/app/(main)/design-system/page.tsx`:
```tsx
'use client';
import DesignSystemDemo from '@/features/design-system/views/DesignSystemDemo';
export default function Page() { return <DesignSystemDemo />; }
```

- [ ] **Step 3: Phase 3 full build verification**

```bash
npx tsc --noEmit
npm run lint
npm run build
```
Expected: 0 errors. The `views/` directory should now be empty.

- [ ] **Step 4: Commit**

```bash
git add src/views/ src/features/ src/app/
git commit -m "refactor: migrate remaining views to features/ — views/ directory now empty"
```

---

## Phase 4 — Feature-Specific Components Migration

### Task 17: Move courses domain components

- [ ] **Step 1: Move files**

```bash
git mv src/components/CourseLayout.tsx        src/features/courses/components/CourseLayout.tsx
git mv src/components/CourseSidebar.tsx       src/features/courses/components/CourseSidebar.tsx
git mv src/components/CourseMembersTab.tsx    src/features/courses/components/CourseMembersTab.tsx
git mv src/components/CourseGradesTab.tsx     src/features/courses/components/CourseGradesTab.tsx
git mv src/components/TeacherGradebook.tsx    src/features/courses/components/TeacherGradebook.tsx
git mv src/components/CreateModuleModal.tsx   src/features/courses/components/CreateModuleModal.tsx
git mv src/components/EnrollStudentsModal.tsx src/features/courses/components/EnrollStudentsModal.tsx
git mv src/components/AtRiskStudents.tsx      src/features/courses/components/AtRiskStudents.tsx
git mv src/components/resource-library        src/features/courses/components/resource-library
git mv src/components/seminar                 src/features/courses/components/seminar
```

- [ ] **Step 2: Fix imports**

Run type check to identify broken imports:
```bash
npx tsc --noEmit 2>&1 | grep "Cannot find module" | sort -u
```

For each broken import found, update to `@/features/courses/components/<ComponentName>`.

- [ ] **Step 3: Commit**

```bash
git add src/components/ src/features/
git commit -m "refactor: move courses domain components to features/courses/components/"
```

---

### Task 18: Move assignments and quiz components

- [ ] **Step 1: Move files**

```bash
git mv src/components/questions              src/features/assignments/components/questions
git mv src/components/submission             src/features/assignments/components/submission
git mv src/components/peerReview             src/features/assignments/components/peerReview
git mv src/components/CreateQuizModal.tsx    src/features/quiz/components/CreateQuizModal.tsx
git mv src/components/CreateQuestionModal.tsx src/features/quiz/components/CreateQuestionModal.tsx
git mv src/components/PracticeQuizModal.tsx  src/features/quiz/components/PracticeQuizModal.tsx
```

- [ ] **Step 2: Fix imports**

```bash
npx tsc --noEmit 2>&1 | grep "Cannot find module" | sort -u
```

Update broken imports to `@/features/assignments/components/...` or `@/features/quiz/components/...`.

- [ ] **Step 3: Commit**

```bash
git add src/components/ src/features/
git commit -m "refactor: move assignments and quiz components to features/"
```

---

### Task 19: Move dashboard, AI, and virtual-lab components

- [ ] **Step 1: Move files**

```bash
git mv src/components/DashboardBuilder.tsx   src/features/dashboard/components/DashboardBuilder.tsx
git mv src/components/DashboardWidgets.tsx   src/features/dashboard/components/DashboardWidgets.tsx
git mv src/components/DashboardCustomizer.tsx src/features/dashboard/components/DashboardCustomizer.tsx
git mv src/components/TemplateSelection.tsx  src/features/dashboard/components/TemplateSelection.tsx
git mv src/components/ai                     src/features/ai/components/ai
git mv src/components/ExplainButton.tsx      src/features/ai/components/ExplainButton.tsx
git mv src/components/GradingSuggestionPanel.tsx src/features/ai/components/GradingSuggestionPanel.tsx
git mv src/components/SyllabusBuilder.tsx    src/features/ai/components/SyllabusBuilder.tsx
git mv src/components/PlagiarismCheckPanel.tsx src/features/ai/components/PlagiarismCheckPanel.tsx
git mv src/components/vpl                    src/features/virtual-lab/components/vpl
git mv src/components/CodeEditor.tsx         src/features/virtual-lab/components/CodeEditor.tsx
```

- [ ] **Step 2: Move analytics component to admin**

```bash
git mv src/components/analytics src/features/admin/components/analytics
```

- [ ] **Step 3: Fix imports**

```bash
npx tsc --noEmit 2>&1 | grep "Cannot find module" | sort -u
```

Update each broken import to the new `@/features/<domain>/components/...` path.

- [ ] **Step 4: Update components/index.ts barrel**

Remove all exports for components that were moved out. The barrel should now export only:

```ts
// src/components/index.ts
export * from './Button';
export * from './Card';
export * from './Input';
export * from './PasswordInput';
export * from './Modal';
export * from './Loading';
export * from './Header';
export * from './Sidebar';
export * from './Layout';
export * from './SettingsBar';
export * from './LanguageSwitcher';
export * from './ResourceItem';
export * from './common/ErrorBoundary';
export * from './common/ConfirmModal';
export * from './common/Breadcrumbs';
```

- [ ] **Step 5: Full build verification**

```bash
npx tsc --noEmit
npm run lint
npm run build
```
Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/ src/features/
git commit -m "refactor: move domain-specific components to features/ — components/ is now shared UI only"
```

---

## Phase 5 — Feature Barrel Exports

### Task 20: Write index.ts for each feature domain

Each `features/<domain>/index.ts` re-exports the domain's public surface. Consumers should be able to do `import { CourseList } from '@/features/courses'`.

- [ ] **Step 1: Write each feature index.ts**

`src/features/auth/index.ts`:
```ts
export { default as Login } from './views/Login';
export { default as Register } from './views/Register';
export { default as ForgotPassword } from './views/ForgotPassword';
export { default as ResetPassword } from './views/ResetPassword';
export { default as VerifyEmail } from './views/VerifyEmail';
export { default as GoogleAuthCallback } from './views/GoogleAuthCallback';
```

`src/features/landing/index.ts`:
```ts
export { default as Landing } from './views/Landing';
```

`src/features/dashboard/index.ts`:
```ts
export { default as Dashboard } from './views/Dashboard';
export { default as DashboardCustomize } from './views/DashboardCustomize';
export { default as DashboardBuilder } from './components/DashboardBuilder';
export { default as DashboardWidgets } from './components/DashboardWidgets';
```

`src/features/courses/index.ts`:
```ts
export { default as CourseList } from './views/CourseList';
export { default as CourseDetail } from './views/CourseDetail';
export { default as CourseCreate } from './views/CourseCreate';
export { default as CourseEdit } from './views/CourseEdit';
export { default as CoursePreview } from './views/CoursePreview';
export { default as CourseArchive } from './views/CourseArchive';
export { coursesApi, modulesApi } from './api/courses';
// Read src/features/courses/hooks/useCourseQueries.ts and export its named hooks here
// e.g.: export { useCoursesQuery, useEnrolledCoursesQuery } from './hooks/useCourseQueries';
```

`src/features/assignments/index.ts`:
```ts
export { default as Assignments } from './views/Assignments';
export { default as AssignmentDetail } from './views/AssignmentDetail';
export { default as AssignmentPrintView } from './views/AssignmentPrintView';
```

`src/features/quiz/index.ts`:
```ts
export { default as QuizDetail } from './views/QuizDetail';
export { default as QuizResults } from './views/QuizResults';
export { default as QuizBuilder } from './views/QuizBuilder';
export { default as QuizTaking } from './views/QuizTaking';
```

`src/features/lesson/index.ts`:
```ts
export { default as LessonPlayer } from './views/lesson/LessonPlayer';
export { default as LessonBuilder } from './views/lesson/LessonBuilder';
export { default as ModulePageEditor } from './views/ModulePageEditor';
```

`src/features/grades/index.ts`:
```ts
export { AllGrades } from './views/AllGrades';
export { default as StudentGradebook } from './views/StudentGradebook';
export { default as SpeedGrader } from './views/SpeedGrader';
```

`src/features/admin/index.ts`:
```ts
export { default as AdminDashboard } from './views/AdminDashboard';
```

`src/features/marketplace/index.ts`:
```ts
export { default as MarketplaceBrowse } from './views/marketplace/MarketplaceBrowse';
export { default as MarketplacePluginDetail } from './views/marketplace/MarketplacePluginDetail';
```

`src/features/profile/index.ts`:
```ts
export { default as Profile } from './views/Profile';
export { default as ProfileSettings } from './views/ProfileSettings';
```

`src/features/calendar/index.ts`:
```ts
export { default as CalendarPage } from './views/CalendarPage';
```

`src/features/question-bank/index.ts`:
```ts
export { default as QuestionBank } from './views/QuestionBank';
```

`src/features/virtual-lab/index.ts`:
```ts
export { default as VirtualLab } from './views/VirtualLab';
```

`src/features/ai/index.ts`:
```ts
export { aiApi } from './api/ai';
export { useAIStreaming } from './hooks/useAIStreaming';
```

`src/features/teacher/index.ts`:
```ts
export { default as TeacherTodoDashboard } from './views/TeacherTodoDashboard';
export { default as TodaySubmissions } from './views/TodaySubmissions';
```

- [ ] **Step 2: Build verification**

```bash
npx tsc --noEmit
npm run build
```
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/features/
git commit -m "feat: add public barrel index.ts to all feature domains"
```

---

## Phase 6 — TypeScript Quality Pass

### Task 21: Extract domain-local types from types/index.ts

`src/types/index.ts` contains all domain types. Begin extracting the most isolated domain types. Do NOT remove anything from `types/index.ts` yet — add a re-export so existing imports still work.

- [ ] **Step 1: Create course-local types file**

Create `src/features/courses/types/index.ts` and copy the course-specific interfaces:

```ts
// src/features/courses/types/index.ts
// Course-domain type definitions. Re-exported from @/types for backwards compatibility.
export type { Course, CourseCreateData, CourseMember, Module } from '@/types';
```

- [ ] **Step 2: Create assignment-local types file**

```ts
// src/features/assignments/types/index.ts
export type { Assignment, Submission, AssignmentType } from '@/types';
```

- [ ] **Step 3: Type check**

```bash
npx tsc --noEmit
```
Expected: 0 errors. These are re-exports, not removals — `@/types` still works everywhere.

- [ ] **Step 4: Commit**

```bash
git add src/features/courses/types/ src/features/assignments/types/
git commit -m "refactor: add domain-local type files (re-exports from @/types for now)"
```

---

### Task 22: Replace easy `any` cases in API normalization

There are ~59 `any` usages. Target only the function signatures in `features/courses/api/courses.ts` and `features/assignments/api/assessments.ts` where the shape is known.

- [ ] **Step 1: Find `any` in moved API files**

```bash
grep -n ": any\|as any\|<any>" src/features/courses/api/courses.ts | head -20
grep -n ": any\|as any\|<any>" src/features/assignments/api/assessments.ts | head -20
```

- [ ] **Step 2: Replace known-shape `any` with typed interfaces**

For each case where the raw API shape is known, replace `any` with an explicit inline type. Example:

```ts
// Before
function normalizeModule(raw: any): Module {

// After
function normalizeModule(raw: {
  id: string;
  title: string;
  description?: string;
  order?: number;
}): Module {
```

For error handling `catch (err: unknown)` followed by `const error = err as any`, use:
```ts
catch (err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
```

Leave complex union cases with a `// TODO: type this properly` comment — do not force types that may be incorrect.

- [ ] **Step 3: Type check**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/features/courses/api/ src/features/assignments/api/
git commit -m "refactor: replace known-shape `any` in courses and assignments API files"
```

---

## Phase 7 — Styling and Assets Audit

### Task 23: Verify CSS and asset imports after restructure

- [ ] **Step 1: Check global CSS still loads**

```bash
grep -r "design-system.css\|index.css" src/app/ src/features/
```
Expected: `src/app/layout.tsx` imports `../index.css` or similar. Verify the relative path is still correct after no app/ changes (it should be — app/ was untouched).

- [ ] **Step 2: Check for any CSS imports with broken paths in moved feature files**

```bash
grep -rn "from '.*\.css'\|import '.*\.css'" src/features/ | grep -v "node_modules"
```

For each found import, verify the CSS file exists at that path. The `features/editor-core/block-editor.css` and `features/authoring/` CSS should be fine (those folders weren't moved). Look for anything that still references `../../components/` or `../../views/`.

- [ ] **Step 3: Run dev server briefly and spot-check**

```bash
npm run dev &
sleep 10
kill %1
```

Check the terminal output for any 404s on CSS or asset files.

- [ ] **Step 4: Commit if any paths were fixed**

```bash
git add -p
git commit -m "fix: correct CSS import paths after feature restructure"
```

---

## Phase 8 — Dead Code Removal

### Task 24: Delete emptied directories

- [ ] **Step 1: Verify views/ is empty**

```bash
find src/views -type f
```
Expected: no output. If files remain, they were missed — move them to the appropriate feature before continuing.

- [ ] **Step 2: Verify queries/ and mutations/ are empty**

```bash
find src/queries -type f
find src/mutations -type f
```
Expected: no output.

- [ ] **Step 3: Delete empty directories**

```bash
git rm -r src/views
git rm -r src/queries
git rm -r src/mutations
```

- [ ] **Step 4: Verify api/ contains only shared files**

```bash
ls src/api/
```
Expected: `client.ts`, `notifications.ts`, `queryClient.ts`, `types.ts` only. If any domain files remain, move them now.

- [ ] **Step 5: Final full verification**

```bash
npx tsc --noEmit
npm run lint
npm run build
```
Expected: 0 errors, clean build.

- [ ] **Step 6: Commit**

```bash
git add src/views src/queries src/mutations
git commit -m "chore: delete emptied views/, queries/, mutations/ directories"
```

---

## Phase 9 — Production Readiness

### Task 25: Final production checks

- [ ] **Step 1: Verify no hardcoded URLs in src/**

```bash
grep -rn "localhost:[0-9]\+\|api\.learnsystem\.app\|app\.learnsystem\.app" src/ --include="*.ts" --include="*.tsx"
```
Expected: no output (only env vars should set URLs).

- [ ] **Step 2: Verify no VITE_* variables**

```bash
grep -rn "VITE_" src/ --include="*.ts" --include="*.tsx"
```
Expected: no output.

- [ ] **Step 3: Verify no backend secrets referenced in frontend**

```bash
grep -rn "SERVICE_ROLE\|SECRET_KEY\|DB_PASSWORD\|JWT_SECRET" src/ --include="*.ts" --include="*.tsx"
```
Expected: no output.

- [ ] **Step 4: Verify proxy.ts matcher covers all protected routes**

Read `src/proxy.ts` and confirm the `isProtectedPath` check includes all main routes: `/dashboard`, `/courses`, `/assignments`, `/grades`, `/profile`, `/admin`, `/calendar`, `/quiz`, `/gradebook`, `/marketplace`, `/question-bank`, `/virtual-lab`, `/teacher`, `/today`, `/speed-grader`.

If any protected routes are missing from the matcher, add them:
```ts
const isProtectedPath =
  request.nextUrl.pathname.startsWith('/dashboard') ||
  request.nextUrl.pathname.startsWith('/courses') ||
  request.nextUrl.pathname.startsWith('/assignments') ||
  request.nextUrl.pathname.startsWith('/grades') ||
  request.nextUrl.pathname.startsWith('/gradebook') ||
  request.nextUrl.pathname.startsWith('/profile') ||
  request.nextUrl.pathname.startsWith('/admin') ||
  request.nextUrl.pathname.startsWith('/calendar') ||
  request.nextUrl.pathname.startsWith('/quiz') ||
  request.nextUrl.pathname.startsWith('/marketplace') ||
  request.nextUrl.pathname.startsWith('/question-bank') ||
  request.nextUrl.pathname.startsWith('/virtual-lab') ||
  request.nextUrl.pathname.startsWith('/teacher') ||
  request.nextUrl.pathname.startsWith('/today') ||
  request.nextUrl.pathname.startsWith('/speed-grader');
```

- [ ] **Step 5: Final clean build**

```bash
npx tsc --noEmit && npm run lint && npm run build
```
Expected: all three pass with 0 errors.

- [ ] **Step 6: Final commit**

```bash
git add src/proxy.ts
git commit -m "chore: complete frontend feature-sliced refactor — production readiness verified"
```

---

## Summary of Final Structure

After this plan completes:

```
src/
├── app/              # Routes only (page.tsx wrappers)
├── api/              # Shared: client.ts, queryClient.ts, types.ts, notifications.ts
├── features/
│   ├── ai/           # api, components, hooks
│   ├── admin/        # api, components, views
│   ├── assignments/  # api, components, hooks, types, views
│   ├── auth/         # api, views
│   ├── authoring/    # (existing, unchanged)
│   ├── calendar/     # api, views
│   ├── courses/      # api, components, hooks, types, views
│   ├── dashboard/    # components, views
│   ├── design-system/# views
│   ├── editor-core/  # (existing, unchanged)
│   ├── grades/       # api, hooks, views
│   ├── landing/      # views
│   ├── lesson/       # api, hooks, views
│   ├── marketplace/  # api, views
│   ├── profile/      # api, hooks, views
│   ├── question-bank/# views
│   ├── quiz/         # components, views
│   ├── teacher/      # views
│   └── virtual-lab/  # api, components, views
├── components/       # Shared UI: Button, Card, Input, Modal, Layout, Sidebar, etc.
├── lib/              # supabase/, env.ts
├── store/            # authStore, uiStore, courseStore (unchanged)
├── hooks/            # Global: useWebSocket, useNetworkStatus, useAutoSave, etc.
├── types/            # Cross-domain shared types
├── utils/            # Pure utilities
├── i18n/             # Translations
├── plugins/          # Plugin system
└── proxy.ts          # Next.js 16 route protection
```

## Unclear / Needs Human Decision

- **`src/api/notifications.ts`**: Not assigned to a feature domain. Could become `features/notifications/` once the notifications UI is audited. Left in `api/` for now.
- **`components/diagram/`** and **`components/embeds/`**: Used by the editor. Could move to `features/editor-core/components/` but coupling is unclear without reading all usages. Left in `components/` (shared) for now.
- **`hooks/useCourseDeadlines.ts`**: Logically course-related but may be used by dashboard widgets too. Verify usages with `grep -rn "useCourseDeadlines" src/` before deciding whether it moves to `features/courses/hooks/` or stays in global `hooks/`.
- **`components/ResourceItem.tsx`**: Possibly used outside courses. Verify with `grep -rn "ResourceItem" src/` before moving.
