# LearnSystem Frontend Refactor — Design Spec

**Date:** 2026-05-20  
**Status:** Approved  
**Scope:** `apps/web/src/`  
**Goal:** Convert the migrated legacy frontend into a modern, scalable, production-ready Next.js frontend while preserving all existing UI, routes, pages, flows, and behavior.

---

## 1. Context

The LearnSystem frontend (`apps/web`) runs Next.js 16.2.6 / React 19. It was migrated from a legacy Vite + React codebase into Next.js App Router. The migration is complete — no Vite artifacts remain. The codebase is functional and production-deployed to `app.learnsystem.app`.

**Current state:**
- 46 real pages across 40+ route segments under `app/(main)/` and `app/(auth)/`
- 50+ view components in a flat `views/` directory
- 80+ components in `components/` (shared UI mixed with domain-specific components)
- 22 API wrapper modules in `api/`
- 7 React Query hook files in `queries/`
- `features/` exists for 2 subsystems only: `authoring/` and `editor-core/`
- 3 duplicate component pairs: `Button`/`ButtonEnhanced`, `Card`/`CardEnhanced`, `Input`/`InputEnhanced`
- `courseStore` (Zustand) is marked `@deprecated` but still used — migration is out of scope
- `proxy.ts` is correctly named and wired for Next.js 16 (replaces `middleware.ts`)
- All API calls route through the Java Gateway via `NEXT_PUBLIC_API_URL`
- Supabase is auth-only in the frontend (no direct DB writes from components)

**Key dependencies:**
- Tailwind CSS 4.3.0 + CSS custom properties design system (`design-system.css`)
- Zustand 5 (authStore, uiStore — persist to localStorage)
- TanStack Query 5 (data fetching — active migration target)
- Axios (shared `api/client.ts` with Supabase JWT injection)
- Tiptap 3 (rich text editor — lives in `features/editor-core/`)
- i18next (en + uk languages)
- `@heroicons/react`, `@headlessui/react` (UI primitives)

---

## 2. Architecture Decision

**Chosen approach: Full Feature-Sliced Design (Approach A)**

All domain code moves into `features/<domain>/` folders. The top-level `views/` and `queries/` directories are eliminated. The `api/` directory is split into per-domain `api/` subfolders. `components/` becomes shared UI only.

**Why this fits the project:**
- `authoring/` and `editor-core/` already prove the feature-folder pattern works here
- With 50+ views and growing, a flat `views/` directory is the main navigability bottleneck
- Domain code is currently spread across `views/`, `api/`, `queries/`, and `components/` — feature folders co-locate it
- The `app/` routing layer is untouched; only `src/` internals move

---

## 3. Target Folder Structure

```
apps/web/src/
├── app/                          # Next.js routes — thin page.tsx wrappers only
│   ├── layout.tsx
│   ├── page.tsx
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   ├── forgot-password/page.tsx
│   │   ├── reset-password/page.tsx
│   │   └── verify-email/page.tsx
│   ├── auth/google/callback/page.tsx
│   └── (main)/
│       ├── layout.tsx
│       └── [all route segments]/page.tsx
│
├── features/
│   ├── ai/
│   │   ├── api/ai.ts
│   │   ├── components/           (from components/ai/)
│   │   ├── hooks/                (useAIQueries, useAIUsageQueries, useAIMutations, useAIStreaming)
│   │   └── index.ts
│   ├── assignments/
│   │   ├── api/assessments.ts
│   │   ├── components/           (questions/, submission/, peerReview/, modals)
│   │   ├── hooks/useAssessmentQueries.ts
│   │   ├── types/
│   │   ├── views/                (AssignmentDetail, Assignments, AssignmentPrintView, assignment-wizard/)
│   │   └── index.ts
│   ├── auth/
│   │   ├── views/                (Login, ForgotPassword, GoogleAuthCallback)
│   │   └── index.ts
│   ├── authoring/                (existing — no change)
│   ├── calendar/
│   │   ├── api/calendar.ts
│   │   ├── views/CalendarPage.tsx
│   │   └── index.ts
│   ├── courses/
│   │   ├── api/courses.ts
│   │   ├── components/           (CourseLayout, CourseSidebar, CourseMembersTab, CourseGradesTab,
│   │   │                          TeacherGradebook, CreateModuleModal, EnrollStudentsModal)
│   │   ├── hooks/useCourseQueries.ts
│   │   ├── types/
│   │   ├── views/                (CourseList, CourseDetail, CourseCreate, CourseEdit,
│   │   │                          CoursePreview, CourseArchive, course-detail/, course/resources/)
│   │   └── index.ts
│   ├── dashboard/
│   │   ├── components/           (DashboardBuilder, DashboardWidgets, DashboardCustomizer,
│   │   │                          TemplateSelection)
│   │   ├── views/                (Dashboard, DashboardCustomize)
│   │   └── index.ts
│   ├── editor-core/              (existing — no change)
│   ├── grades/
│   │   ├── api/progress.ts
│   │   ├── hooks/useProgressQueries.ts
│   │   ├── views/AllGrades.tsx
│   │   └── index.ts
│   ├── lesson/
│   │   ├── api/                  (lessons.ts, pages.ts)
│   │   ├── hooks/useLessonQueries.ts
│   │   ├── views/                (LessonBuilder, LessonPlayer, ModulePageEditor)
│   │   └── index.ts
│   ├── marketplace/
│   │   ├── api/                  (marketplace.ts, plugins.ts)
│   │   ├── views/                (MarketplaceBrowse, MarketplacePluginDetail)
│   │   └── index.ts
│   ├── profile/
│   │   ├── api/users.ts
│   │   ├── hooks/useUserQueries.ts
│   │   ├── views/                (Profile, ProfileSettings)
│   │   └── index.ts
│   ├── question-bank/
│   │   ├── views/QuestionBank.tsx
│   │   └── index.ts
│   ├── quiz/
│   │   ├── components/           (CreateQuizModal, CreateQuestionModal, PracticeQuizModal)
│   │   ├── views/                (QuizDetail, QuizResults, QuizBuilder, quiz-builder/)
│   │   └── index.ts
│   ├── virtual-lab/
│   │   ├── api/virtualLab.ts
│   │   └── index.ts
│   └── admin/
│       ├── api/                  (admin.ts, adminCourseManagement.ts, adminAnalytics.ts)
│       ├── views/                (AdminDashboard, admin-dashboard/ tabs)
│       └── index.ts
│
├── components/                   # Shared UI only — no domain logic
│   ├── Button.tsx                (was ButtonEnhanced.tsx)
│   ├── Card.tsx                  (was CardEnhanced.tsx)
│   ├── Input.tsx                 (was InputEnhanced.tsx)
│   ├── PasswordInput.tsx
│   ├── Modal.tsx
│   ├── Loading.tsx
│   ├── Layout.tsx
│   ├── Header.tsx
│   ├── Sidebar.tsx
│   ├── SettingsBar.tsx
│   ├── LanguageSwitcher.tsx
│   ├── Providers.tsx
│   ├── AuthGuard.tsx
│   ├── RootInitializer.tsx
│   ├── ResourceItem.tsx
│   ├── animation/
│   ├── common/
│   └── index.ts
│
├── api/
│   ├── client.ts                 (untouched — shared Axios instance, imported by all domain api/ files)
│   └── notifications.ts          (untouched — no feature home assigned yet)
│
├── lib/
│   ├── supabase/                 (browser.ts, server.ts — untouched)
│   └── env.ts                   (untouched)
│
├── store/
│   ├── authStore.ts              (untouched)
│   ├── uiStore.ts                (untouched)
│   ├── courseStore.ts            (untouched — migration out of scope)
│   └── notificationStore.ts     (untouched)
│
├── hooks/                        # Global reusable hooks only
│   ├── useAutoSave.ts
│   ├── useCourseDeadlines.ts
│   ├── useNetworkStatus.ts
│   ├── useTrackOpen.ts
│   ├── useUnsavedChangesWarning.ts
│   └── useWebSocket.ts
│
├── types/
│   ├── index.ts                  (shared cross-domain types — domain types extracted over time)
│   └── supabase.ts               (untouched)
│
├── utils/                        (untouched)
├── i18n/                         (untouched)
├── plugins/                      (untouched)
├── proxy.ts                      (untouched — correct Next.js 16 naming)
├── design-system.css             (untouched)
└── index.css                     (untouched)
```

---

## 4. Component Consolidation Rules

The three Enhanced component versions become canonical. The base versions are deleted.

| Old files | New file | Action |
|-----------|----------|--------|
| `Button.tsx` + `ButtonEnhanced.tsx` | `Button.tsx` | Copy Enhanced → Button, delete both originals |
| `Card.tsx` + `CardEnhanced.tsx` | `Card.tsx` | Copy Enhanced → Card, delete both originals |
| `Input.tsx` + `InputEnhanced.tsx` | `Input.tsx` | Copy Enhanced → Input, delete both originals |

Test files (`ButtonEnhanced.test.tsx`, etc.) are renamed to match the new component names. APIs are identical so no test logic changes.

---

## 5. Batch Execution Plan

All batches run sequentially. Each batch ends with a clean `tsc --noEmit` + `npm run lint` + `npm run build` before proceeding.

### Batch 1 — Component consolidation
- Rename `ButtonEnhanced` → `Button`, `CardEnhanced` → `Card`, `InputEnhanced` → `Input`
- Delete old base versions
- Update `components/index.ts` barrel
- Update all imports across codebase
- Rename test files

### Batch 2 — Feature folder scaffolding + API/hooks migration
- Create all `features/<domain>/` folder skeletons
- Move `api/<domain>.ts` files into `features/<domain>/api/` (`api/client.ts` and `api/notifications.ts` stay in `api/`)
- Move `queries/use*.ts` files into `features/<domain>/hooks/`
- Move `mutations/useAIMutations.ts` into `features/ai/hooks/`
- Update all imports

### Batch 3 — Views migration (all domains, one domain at a time within the batch)
- For each domain in sequence: move `views/<domain>/` files into `features/<domain>/views/`, update `app/**/page.tsx` imports, verify build still passes before moving to next domain
- All domains complete within this single batch; no domain left partially migrated

### Batch 4 — Feature-specific components migration
- Move domain-specific components from `components/` into `features/<domain>/components/`
- Update all imports
- Clean `components/index.ts`

### Batch 5 — Feature barrel exports
- Write `features/<domain>/index.ts` public exports for each domain
- Standardize `app/` page imports to use feature barrel paths

### Batch 6 — TypeScript quality pass
- Begin extracting domain-local types from `types/index.ts` into `features/<domain>/types/`
- Replace the ~59 pragmatic `any` in API normalization with typed interfaces where straightforward
- Leave complex union cases documented with `// TODO: type this properly`

### Batch 7 — Styling and assets audit
- Verify `design-system.css` + `index.css` still load correctly
- Check no CSS import paths broke during restructure

### Batch 8 — Dead code removal
- Delete now-empty `views/` directory
- Delete now-empty `queries/` directory
- Delete now-empty `mutations/` directory
- Confirm `components/` contains only shared UI
- Final full `tsc --noEmit` + `npm run lint` + `npm run build`

### Batch 9 — Production readiness check
- Verify all `app/` page imports resolve cleanly
- Verify no hardcoded URLs, no `VITE_*` vars, no backend secrets in frontend code
- Verify `proxy.ts` matcher covers all protected route paths
- Verify `NEXT_PUBLIC_API_URL` used consistently (no bare `localhost` in source)
- Final clean build confirms zero errors

---

## 6. What Does NOT Change

- `app/` routing structure — zero route changes, no URL changes
- `proxy.ts` — correctly named for Next.js 16, untouched
- `lib/supabase/` — both browser and server clients untouched
- `store/authStore.ts`, `store/uiStore.ts` — untouched
- `store/courseStore.ts` — deprecation migration is a separate track
- `design-system.css`, `index.css` — untouched
- All existing page UI, layouts, navigation, and user flows
- `api/client.ts` — shared Axios instance stays at `lib/` level (or `api/client.ts`, no move)
- `api/notifications.ts` — no clear domain home yet, stays in `api/`

---

## 7. Risky Areas

| Area | Risk | Mitigation |
|------|------|------------|
| Moving 50+ view files + updating all page.tsx imports | Import chain breaks build | Move per-batch, run build after each |
| Component consolidation (Button/Card/Input rename) | All imports across 253 files need update | Run `tsc --noEmit` immediately after; tests catch regressions |
| Splitting `types/index.ts` into domain types | Cross-domain type references may break | Do this last (Batch 6); leave shared types in place |
| `api/client.ts` dependency chain | All 22 API modules import from it | Keep `api/client.ts` in place; only move domain-specific modules |
| Plugin system (`plugins/`) | Unknown coupling to domain components | Leave `plugins/` untouched for this refactor |
| `courseStore` still in active use | Moves may surface hidden dependencies | Leave `courseStore.ts` untouched (out of scope) |

---

## 8. Files That Must Not Be Deleted

- `store/courseStore.ts` — still used by active views (migration out of scope)
- `api/client.ts` — shared Axios instance, imported by all 22 API modules
- `api/notifications.ts` — no feature home assigned yet
- `types/index.ts` — shared types hub; do not empty until domain types are fully extracted
- `types/supabase.ts` — auto-generated, never manually edited
- `proxy.ts` — correctly wired Next.js 16 proxy, do not rename or move
- `plugins/` — unknown plugin coupling, leave untouched

---

## 9. Files Safe to Remove (after verification)

| File/folder | When safe |
|-------------|-----------|
| `views/` | After Batch 3 confirms all views moved and `app/` imports updated |
| `queries/` | After Batch 2 confirms all hooks moved to feature folders |
| `mutations/` | After Batch 2 confirms `useAIMutations` moved to `features/ai/hooks/` |
| `Button.tsx` (base) | After Batch 1 — once Enhanced version renamed and imports updated |
| `Card.tsx` (base) | After Batch 1 — same condition |
| `Input.tsx` (base) | After Batch 1 — same condition |
| `ButtonEnhanced.tsx`, `CardEnhanced.tsx`, `InputEnhanced.tsx` | After Batch 1 rename completes |

---

## 10. Success Criteria

- `npm run build` produces zero errors
- `tsc --noEmit` produces zero type errors
- `npm run lint` produces zero errors
- All 46 routes render correctly (manually verified)
- No hardcoded URLs in `src/` (only `NEXT_PUBLIC_*` env vars)
- `components/` contains only shared UI components
- Every domain's code lives inside `features/<domain>/`
- `views/`, `queries/`, `mutations/` directories are deleted

---

## 11. Unclear / Needs Human Decision

- **`api/notifications.ts`**: No feature home assigned. Could go into a `features/notifications/` domain, but the notifications UI and store were not fully audited. Leave in `api/` for now or create a placeholder feature folder.
- **`hooks/useCourseDeadlines.ts`**: Logically belongs in `features/courses/hooks/`, but name suggests it might be used globally (e.g., dashboard widgets). Verify usages before moving.
- **`components/ResourceItem.tsx`**: Used by course resources but kept in shared `components/`. Verify if it's also used outside the courses domain before deciding whether to move it to `features/courses/components/`.
