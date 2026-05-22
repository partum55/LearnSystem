# Frontend Legacy Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore the old LearnSystem UI (Header + Sidebar design, CSS variables, login two-panel) from `frontend_legacy/` into `apps/web` (Next.js), wiring every data call to the real canonical backend API with Supabase Bearer auth — no fake endpoints, no placeholder pages, no hardcoded mock data.

**Architecture:** `apps/web` is a Next.js 16 app-router project. The legacy design (CSS variables, fonts, layout, sidebar, header, login) is being migrated component-by-component. The API client already sends `Authorization: Bearer <supabase_access_token>` and targets `NEXT_PUBLIC_API_URL`. React Query handles data fetching. Role-based UI branching is driven by `/v1/users/me` and applied via the `enabled` flag to avoid cross-role API calls.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS v4, @headlessui/react, @heroicons/react, @supabase/ssr, @tanstack/react-query, axios, clsx.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `apps/web/src/api/client.ts` | Modify | Remove `NEXT_PUBLIC_LEARNING_API_URL` fallback, keep only `NEXT_PUBLIC_API_URL` |
| `apps/web/src/middleware.ts` | Create | Supabase session refresh middleware for all requests |
| `apps/web/src/app/(auth)/login/page.tsx` | Replace | Old two-panel login design ported to Next.js + Supabase |
| `apps/web/src/app/(auth)/layout.tsx` | Create | Redirect already-authenticated users away from /login |
| `apps/web/src/components/Header.tsx` | Create | Port of `frontend_legacy/src/components/Header.tsx` (simplified — no WebSocket/notifications) |
| `apps/web/src/components/Sidebar.tsx` | Create | Port of `frontend_legacy/src/components/Sidebar.tsx` (Next.js Link + pathname, role ADMIN maps to legacy SUPERADMIN) |
| `apps/web/src/components/AppShell.tsx` | Replace | Use Header + Sidebar layout matching legacy Layout.tsx pattern |
| `apps/web/src/features/dashboard/hooks/useDashboardQueries.ts` | Modify | Add `enabled` option so student dashboard only fetches for USER/ADMIN |
| `apps/web/src/features/courses/hooks/useCourseQueries.ts` | Modify | Add `enabled` option to `useTeachingCourses` |
| `apps/web/src/features/dashboard/components/DashboardPage.tsx` | Modify | Pass `enabled` based on role; remove "LMS portal Overview" text; add logout route |

---

## Task 1: Fix API Client Base URL

**Files:**
- Modify: `apps/web/src/api/client.ts:25`

The current client checks `NEXT_PUBLIC_LEARNING_API_URL` first. That env var is never set. This means prod falls through to `NEXT_PUBLIC_API_URL` anyway, but it's confusing and error-prone. Remove the dead first check.

- [ ] **Step 1: Remove `NEXT_PUBLIC_LEARNING_API_URL` from client**

In `apps/web/src/api/client.ts` line 25, change:
```typescript
let API_BASE_URL = process.env.NEXT_PUBLIC_LEARNING_API_URL || process.env.NEXT_PUBLIC_API_URL || '';
```
to:
```typescript
let API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';
```

- [ ] **Step 2: Verify no other file references `NEXT_PUBLIC_LEARNING_API_URL`**

```bash
grep -R "NEXT_PUBLIC_LEARNING_API_URL" apps/web/src/
```
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/api/client.ts
git commit -m "fix: remove dead NEXT_PUBLIC_LEARNING_API_URL fallback from API client"
```

---

## Task 2: Add Supabase Middleware

**Files:**
- Create: `apps/web/src/middleware.ts`

Next.js middleware runs on every request. The Supabase SSR middleware pattern refreshes session cookies so that server components and route handlers see a valid session. Without this, `createSupabaseServerClient()` in `route.ts` may see a stale session.

- [ ] **Step 1: Create middleware file**

Create `apps/web/src/middleware.ts`:
```typescript
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd apps/web && pnpm typecheck 2>&1 | head -30
```
Expected: no errors related to middleware.ts.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/middleware.ts
git commit -m "feat: add Supabase SSR session refresh middleware"
```

---

## Task 3: Auth Layout — Redirect Authenticated Users

**Files:**
- Create: `apps/web/src/app/(auth)/layout.tsx`

Users who are already logged in and navigate to `/login` should be redirected to `/dashboard`. This prevents the auth pages from flashing for authenticated users.

- [ ] **Step 1: Create auth layout**

Create `apps/web/src/app/(auth)/layout.tsx`:
```tsx
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { ReactNode } from 'react';

export default async function AuthLayout({ children }: { children: ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    redirect('/dashboard');
  }

  return <>{children}</>;
}
```

- [ ] **Step 2: Verify file is valid TypeScript**

```bash
cd apps/web && pnpm typecheck 2>&1 | head -20
```
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/(auth)/layout.tsx
git commit -m "feat: redirect authenticated users away from auth pages"
```

---

## Task 4: Port Login Page Design

**Files:**
- Replace: `apps/web/src/app/(auth)/login/page.tsx`

Port the visual design from `frontend_legacy/src/pages/Login.tsx`. Key adaptations:
- Replace `react-router-dom` `Link`/`useNavigate` with Next.js `Link`/`useRouter`
- Replace `useAuthStore` with Supabase `signInWithPassword` / `signInWithOAuth`
- Replace `import.meta.env.VITE_API_URL` with `process.env.NEXT_PUBLIC_API_URL`
- Remove i18n/translation — use hardcoded English strings
- Remove legacy `Input`, `Button`, `PasswordInput` component imports — inline the HTML

- [ ] **Step 1: Replace login page**

Replace `apps/web/src/app/(auth)/login/page.tsx` with:
```tsx
'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getSupabaseBrowserClient } from '@/lib/supabase/browser';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const supabase = getSupabaseBrowserClient();
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    setSubmitting(false);
    if (authError) {
      setError(authError.message);
      return;
    }
    router.push('/dashboard');
  };

  const handleGoogleLogin = async () => {
    setSubmitting(true);
    setError(null);
    const supabase = getSupabaseBrowserClient();
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    setSubmitting(false);
    if (oauthError) {
      setError(oauthError.message);
    }
  };

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg-base)', fontFamily: 'var(--font-body)' }}>
      {/* Left decorative panel */}
      <div
        className="hidden lg:flex lg:w-1/2 relative overflow-hidden items-center justify-center"
        style={{ background: 'var(--bg-surface)' }}
      >
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, var(--text-primary) 1px, transparent 0)`,
          backgroundSize: '32px 32px',
        }} />
        <div className="relative z-10 text-center px-12 max-w-md">
          <div
            className="w-16 h-16 rounded-xl flex items-center justify-center text-2xl font-bold mx-auto mb-6"
            style={{
              background: 'var(--text-primary)',
              color: 'var(--bg-base)',
              boxShadow: '0 0 40px rgba(255,255,255,0.06)',
            }}
          >
            LS
          </div>
          <h2
            className="text-3xl font-bold mb-3"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}
          >
            LearnSystem
          </h2>
          <p className="text-base" style={{ color: 'var(--text-muted)' }}>
            Your academic journey starts here
          </p>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-8">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-10 lg:hidden">
            <div
              className="w-7 h-7 rounded flex items-center justify-center text-[11px] font-bold"
              style={{ background: 'var(--text-primary)', color: 'var(--bg-base)' }}
            >
              LS
            </div>
            <span
              className="text-sm font-semibold"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}
            >
              LearnSystem
            </span>
          </div>

          <div className="mb-8">
            <h1
              className="text-2xl font-semibold mb-1.5"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}
            >
              Welcome back
            </h1>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Sign in to continue
            </p>
          </div>

          {error && (
            <div
              className="mb-4 px-3 py-2 rounded-md text-sm"
              style={{
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.15)',
                color: 'var(--fn-error)',
              }}
            >
              {error}
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label
                className="block text-sm font-medium mb-1.5"
                style={{ color: 'var(--text-secondary)' }}
              >
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full rounded-md px-3 py-2 text-sm outline-none transition-colors"
                style={{
                  background: 'var(--bg-overlay)',
                  border: '1px solid var(--border-default)',
                  color: 'var(--text-primary)',
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--border-strong)')}
                onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border-default)')}
              />
            </div>

            <div>
              <label
                className="block text-sm font-medium mb-1.5"
                style={{ color: 'var(--text-secondary)' }}
              >
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                required
                className="w-full rounded-md px-3 py-2 text-sm outline-none transition-colors"
                style={{
                  background: 'var(--bg-overlay)',
                  border: '1px solid var(--border-default)',
                  color: 'var(--text-primary)',
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--border-strong)')}
                onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border-default)')}
              />
            </div>

            <div className="flex items-center justify-end">
              <Link
                href="/forgot-password"
                className="text-sm transition-colors"
                style={{ color: 'var(--text-muted)' }}
              >
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-md py-2 text-sm font-semibold transition-colors"
              style={{
                background: 'var(--text-primary)',
                color: 'var(--bg-base)',
                opacity: submitting ? 0.7 : 1,
              }}
            >
              {submitting ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <div className="my-4 flex items-center gap-3">
            <div className="h-px flex-1" style={{ background: 'var(--border-default)' }} />
            <span className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-faint)' }}>or</span>
            <div className="h-px flex-1" style={{ background: 'var(--border-default)' }} />
          </div>

          <button
            type="button"
            disabled={submitting}
            onClick={handleGoogleLogin}
            className="w-full rounded-md py-2 text-sm font-semibold transition-colors"
            style={{
              background: 'transparent',
              border: '1px solid var(--border-default)',
              color: 'var(--text-secondary)',
            }}
          >
            Continue with Google
          </button>

          <p className="text-center mt-6 text-sm" style={{ color: 'var(--text-muted)' }}>
            Don&apos;t have an account?{' '}
            <Link href="/register" className="font-medium" style={{ color: 'var(--text-primary)' }}>
              Create account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd apps/web && pnpm typecheck 2>&1 | head -30
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/(auth)/login/page.tsx
git commit -m "feat: restore legacy two-panel login design with Supabase auth"
```

---

## Task 5: Create Header Component

**Files:**
- Create: `apps/web/src/components/Header.tsx`

Port from `frontend_legacy/src/components/Header.tsx`. Key adaptations:
- Replace `react-router-dom` `Link` with Next.js `Link`
- Replace `useAuthStore` with `useCurrentUser` (React Query) + Supabase `signOut`
- Remove WebSocket (`useWebSocket`), notifications (`useNotificationStore`), i18n — simplified version only
- Keep same CSS variables and visual structure

- [ ] **Step 1: Create Header.tsx**

Create `apps/web/src/components/Header.tsx`:
```tsx
'use client';

import Link from 'next/link';
import { Menu, Transition, MenuButton, MenuItems, MenuItem } from '@headlessui/react';
import { BellIcon, Bars3Icon } from '@heroicons/react/24/outline';
import { useCurrentUser } from '@/features/users/hooks/useUserQueries';
import { getSupabaseBrowserClient } from '@/lib/supabase/browser';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';

interface HeaderProps {
  onMenuClick?: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const { data: user } = useCurrentUser();
  const router = useRouter();
  const queryClient = useQueryClient();

  const handleLogout = async () => {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    queryClient.clear();
    router.push('/login');
  };

  return (
    <header
      className="sticky top-0 z-30 h-12 flex items-center px-4 sm:px-5"
      style={{
        background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border-default)',
        fontFamily: 'var(--font-body)',
      }}
    >
      <div className="flex justify-between items-center w-full">
        {/* Left: hamburger + logo */}
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-1.5 -ml-1.5 rounded-md"
            style={{ color: 'var(--text-muted)' }}
            aria-label="Toggle menu"
          >
            <Bars3Icon className="h-5 w-5" />
          </button>
          <Link href="/dashboard" className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold"
              style={{ background: 'var(--text-primary)', color: 'var(--bg-base)' }}
            >
              LS
            </div>
            <span
              className="text-sm font-semibold hidden sm:block"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}
            >
              LearnSystem
            </span>
          </Link>
        </div>

        {/* Right: notifications + user */}
        <div className="flex items-center gap-0.5">
          <button
            className="flex items-center justify-center w-8 h-8 rounded-md transition-colors"
            style={{ color: 'var(--text-muted)' }}
            aria-label="Notifications"
          >
            <BellIcon className="h-4 w-4" />
          </button>

          <Menu as="div" className="relative ml-1">
            <MenuButton className="flex items-center gap-2 py-1 px-1.5 rounded-md transition-colors hover:bg-white/[0.04]">
              <div
                className="w-6 h-6 rounded-md flex items-center justify-center text-[11px] font-semibold"
                style={{
                  background: 'var(--bg-overlay)',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border-default)',
                }}
              >
                {user?.displayName?.charAt(0).toUpperCase() ?? user?.email?.charAt(0).toUpperCase() ?? 'U'}
              </div>
              <span
                className="text-sm hidden md:block"
                style={{ color: 'var(--text-secondary)' }}
              >
                {user?.displayName ?? user?.email}
              </span>
            </MenuButton>
            <Transition
              enter="transition ease-out duration-100"
              enterFrom="opacity-0 -translate-y-1"
              enterTo="opacity-100 translate-y-0"
              leave="transition ease-in duration-75"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <MenuItems
                className="absolute right-0 mt-1 w-48 rounded-lg overflow-hidden focus:outline-none z-10"
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-default)',
                  boxShadow: 'var(--shadow-lg)',
                }}
              >
                <div className="px-3 py-2.5" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                    {user?.displayName ?? user?.email}
                  </p>
                  <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>
                    {user?.email}
                  </p>
                </div>
                <div className="py-0.5">
                  {[
                    { href: '/profile', label: 'Profile' },
                  ].map((item) => (
                    <MenuItem key={item.href}>
                      {({ focus }: { focus: boolean }) => (
                        <Link
                          href={item.href}
                          className="block px-3 py-2 text-sm transition-colors"
                          style={{
                            background: focus ? 'var(--bg-active)' : 'transparent',
                            color: focus ? 'var(--text-primary)' : 'var(--text-secondary)',
                          }}
                        >
                          {item.label}
                        </Link>
                      )}
                    </MenuItem>
                  ))}
                </div>
                <div style={{ borderTop: '1px solid var(--border-subtle)' }}>
                  <MenuItem>
                    {({ focus }: { focus: boolean }) => (
                      <button
                        onClick={handleLogout}
                        className="block w-full text-left px-3 py-2 text-sm transition-colors"
                        style={{
                          background: focus ? 'var(--bg-active)' : 'transparent',
                          color: 'var(--text-muted)',
                        }}
                      >
                        Sign out
                      </button>
                    )}
                  </MenuItem>
                </div>
              </MenuItems>
            </Transition>
          </Menu>
        </div>
      </div>
    </header>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd apps/web && pnpm typecheck 2>&1 | head -30
```
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/Header.tsx
git commit -m "feat: create Header component ported from legacy design"
```

---

## Task 6: Create Sidebar Component

**Files:**
- Create: `apps/web/src/components/Sidebar.tsx`

Port from `frontend_legacy/src/components/Sidebar.tsx`. Key adaptations:
- Replace `NavLink` from react-router with Next.js `Link` + `usePathname` active detection
- Replace `useAuthStore` with `useCurrentUser` (React Query)
- Role mapping: legacy `SUPERADMIN` → new `ADMIN`; legacy `TEACHER|TA|SUPERADMIN` nav items → show for `TEACHER|ADMIN`
- Remove plugin registry — not ported yet
- Remove i18n — hardcoded English labels

- [ ] **Step 1: Create Sidebar.tsx**

Create `apps/web/src/components/Sidebar.tsx`:
```tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  HomeIcon,
  AcademicCapIcon,
  DocumentTextIcon,
  ChartBarIcon,
  UserIcon,
  ClipboardDocumentListIcon,
  XMarkIcon,
  Cog6ToothIcon,
  ClipboardIcon,
} from '@heroicons/react/24/outline';
import { useCurrentUser } from '@/features/users/hooks/useUserQueries';
import clsx from 'clsx';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen = true, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { data: user } = useCurrentUser();
  const globalRole = user?.role ?? user?.globalRole;

  const isTeacher = globalRole === 'TEACHER' || globalRole === 'ADMIN';
  const isAdmin = globalRole === 'ADMIN';

  type NavItem = { name: string; href: string; icon: React.ElementType };

  const navigation: NavItem[] = [
    { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
    { name: 'Courses', href: '/courses', icon: AcademicCapIcon },
    { name: 'Assignments', href: '/assignments', icon: DocumentTextIcon },
    { name: 'Gradebook', href: '/gradebook', icon: ChartBarIcon },
    { name: 'Profile', href: '/profile', icon: UserIcon },
  ];

  if (isTeacher) {
    navigation.splice(3, 0,
      { name: 'Question Bank', href: '/question-bank', icon: ClipboardDocumentListIcon },
      { name: 'Teacher To-do', href: '/teacher/todo', icon: ClipboardIcon },
    );
  }

  if (isAdmin) {
    navigation.push({ name: 'Admin Panel', href: '/admin', icon: Cog6ToothIcon });
  }

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          style={{ background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(2px)' }}
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-50 w-56 transform transition-transform duration-200 lg:relative lg:inset-auto lg:translate-x-0 flex flex-col flex-shrink-0 self-stretch',
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
        style={{
          background: 'var(--bg-surface)',
          borderRight: '1px solid var(--border-default)',
          fontFamily: 'var(--font-body)',
        }}
      >
        {/* Mobile close button */}
        <div className="lg:hidden flex justify-end p-3">
          <button
            onClick={onClose}
            className="p-1 rounded-md"
            style={{ color: 'var(--text-muted)' }}
            aria-label="Close sidebar"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <nav className="mt-1 lg:mt-3 px-2 space-y-0.5 flex-1 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className="group flex items-center px-2.5 py-1.5 text-[13px] font-medium rounded-md transition-colors duration-100"
                style={{
                  background: isActive ? 'var(--bg-active)' : 'transparent',
                  color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
                }}
              >
                <item.icon
                  className="mr-2.5 h-4 w-4 flex-shrink-0"
                  style={{ color: isActive ? 'var(--text-primary)' : 'var(--text-faint)' }}
                />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* User info at bottom */}
        <div className="px-3 py-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          <div className="flex items-center gap-2.5">
            <div
              className="h-7 w-7 rounded-md flex items-center justify-center text-[11px] font-semibold flex-shrink-0"
              style={{
                background: 'var(--bg-overlay)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border-default)',
              }}
            >
              {user?.displayName?.charAt(0).toUpperCase() ?? user?.email?.charAt(0).toUpperCase() ?? 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                {user?.displayName ?? user?.email}
              </p>
              <p className="text-[11px] capitalize truncate" style={{ color: 'var(--text-faint)' }}>
                {(globalRole ?? 'user').toLowerCase()}
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd apps/web && pnpm typecheck 2>&1 | head -30
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/Sidebar.tsx
git commit -m "feat: create Sidebar component ported from legacy design"
```

---

## Task 7: Replace AppShell with Legacy Layout

**Files:**
- Replace: `apps/web/src/components/AppShell.tsx`

The current AppShell is a flat header. Replace it with the proper Header + Sidebar layout pattern from `frontend_legacy/src/components/Layout.tsx`.

- [ ] **Step 1: Replace AppShell.tsx**

Replace `apps/web/src/components/AppShell.tsx` with:
```tsx
'use client';

import { useState, type ReactNode } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

export function AppShell({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div
      className="h-screen flex flex-col overflow-hidden"
      style={{ background: 'var(--bg-base)' }}
    >
      <Header onMenuClick={() => setSidebarOpen(true)} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Export Header and Sidebar from components index**

Read `apps/web/src/components/index.ts`, then add:
```typescript
export { Header } from './Header';
export { Sidebar } from './Sidebar';
```

- [ ] **Step 3: Verify TypeScript**

```bash
cd apps/web && pnpm typecheck 2>&1 | head -30
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/AppShell.tsx apps/web/src/components/index.ts
git commit -m "feat: restore Header+Sidebar layout from legacy design in AppShell"
```

---

## Task 8: Fix Role-Aware Data Loading in Dashboard

**Files:**
- Modify: `apps/web/src/features/dashboard/hooks/useDashboardQueries.ts`
- Modify: `apps/web/src/features/courses/hooks/useCourseQueries.ts`
- Modify: `apps/web/src/features/dashboard/components/DashboardPage.tsx`

Currently `useStudentDashboard` and `useTeachingCourses` always fire. Add an `enabled` parameter so they only fire when the user's role warrants it.

- [ ] **Step 1: Add `enabled` to useStudentDashboard**

In `apps/web/src/features/dashboard/hooks/useDashboardQueries.ts`, replace:
```typescript
export const useStudentDashboard = () =>
  useQuery({
    queryKey: queryKeys.dashboard.student(),
    queryFn: dashboardApi.getStudentDashboard,
    staleTime: 2 * 60 * 1000,
  });
```
with:
```typescript
export const useStudentDashboard = (enabled = true) =>
  useQuery({
    queryKey: queryKeys.dashboard.student(),
    queryFn: dashboardApi.getStudentDashboard,
    staleTime: 2 * 60 * 1000,
    enabled,
  });
```

- [ ] **Step 2: Add `enabled` to useTeachingCourses**

In `apps/web/src/features/courses/hooks/useCourseQueries.ts`, replace:
```typescript
export const useTeachingCourses = () =>
  useQuery({
    queryKey: queryKeys.courses.myTeaching(),
    queryFn: canonicalCoursesApi.getMyTeaching,
  });
```
with:
```typescript
export const useTeachingCourses = (enabled = true) =>
  useQuery({
    queryKey: queryKeys.courses.myTeaching(),
    queryFn: canonicalCoursesApi.getMyTeaching,
    enabled,
  });
```

- [ ] **Step 3: Fix DashboardPage to use enabled flags**

In `apps/web/src/features/dashboard/components/DashboardPage.tsx`, replace the lines:
```typescript
  const isStudentOrAdmin = currentUser?.role === 'USER' || currentUser?.role === 'ADMIN';
  const { 
    data: studentData, 
    isLoading: isStudentLoading, 
    error: studentError 
  } = useStudentDashboard();

  // Conditionally fetch teaching courses based on role (TEACHER or ADMIN)
  const isTeacherOrAdmin = currentUser?.role === 'TEACHER' || currentUser?.role === 'ADMIN';
  const { 
    data: teachingCourses, 
    isLoading: isTeachingLoading, 
    error: teachingError 
  } = useTeachingCourses();
```
with:
```typescript
  const isStudentOrAdmin = currentUser?.role === 'USER' || currentUser?.role === 'ADMIN';
  const isTeacherOrAdmin = currentUser?.role === 'TEACHER' || currentUser?.role === 'ADMIN';

  const { 
    data: studentData, 
    isLoading: isStudentLoading, 
    error: studentError 
  } = useStudentDashboard(!!currentUser && isStudentOrAdmin);

  const { 
    data: teachingCourses, 
    isLoading: isTeachingLoading, 
    error: teachingError 
  } = useTeachingCourses(!!currentUser && isTeacherOrAdmin);
```

- [ ] **Step 4: Remove tech copy from DashboardPage — fix the "LMS portal Overview" label**

In `apps/web/src/features/dashboard/components/DashboardPage.tsx`, replace:
```tsx
          <p className="text-xs font-semibold uppercase tracking-widest text-indigo-300">LMS portal Overview</p>
```
with:
```tsx
          <p className="text-xs font-semibold uppercase tracking-widest text-indigo-300">LearnSystem</p>
```

Also replace the admin section label that contains an emoji:
```tsx
                <h3 className="text-sm font-bold text-amber-900">🛡️ Platform Administration Panel</h3>
                <p className="text-xs text-amber-755">You are signed in as an Administrator. You have system-wide permissions.</p>
```
with:
```tsx
                <h3 className="text-sm font-bold text-amber-900">Platform Administration</h3>
                <p className="text-xs text-amber-755">You have administrator access to platform settings.</p>
```

- [ ] **Step 5: Verify TypeScript**

```bash
cd apps/web && pnpm typecheck 2>&1 | head -40
```
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/features/dashboard/hooks/useDashboardQueries.ts \
        apps/web/src/features/courses/hooks/useCourseQueries.ts \
        apps/web/src/features/dashboard/components/DashboardPage.tsx
git commit -m "fix: role-aware data loading in dashboard — add enabled flags to student/teacher queries"
```

---

## Task 9: Verification Pass

Run all required checks and confirm each passes.

- [ ] **Step 1: TypeScript check**

```bash
cd apps/web && pnpm typecheck 2>&1
```
Expected: `Found 0 errors.` or `No error` message. Fix any type errors before proceeding.

- [ ] **Step 2: Check for forbidden endpoint calls**

```bash
grep -R "dashboard/student\|courses/my-teaching" apps/web/src/ --include="*.ts" --include="*.tsx"
```
Expected: these are OK — they're real endpoints that exist in the backend. This check verifies no new fake endpoints were added.

```bash
grep -R "canonical\|api/v1 surface\|learning-service\|active app now talks" apps/web/src/ apps/web/src/ --include="*.tsx" --include="*.ts" -n
```
Expected: no output — no tech migration text in user-facing components.

- [ ] **Step 3: Check for forbidden secret key usage**

```bash
grep -R "SUPABASE_SECRET_KEY\|SUPABASE_SERVICE_ROLE_KEY\|SUPABASE_DB_PASSWORD" apps/web/src/ --include="*.ts" --include="*.tsx"
```
Expected: no output.

- [ ] **Step 4: Verify Authorization header is attached**

```bash
grep -R "Authorization\|access_token\|getSession\|getUser" apps/web/src/ --include="*.ts" --include="*.tsx" -n | grep -v ".next"
```
Expected: see references in `api/client.ts` and `middleware.ts` — confirms Bearer token is being attached.

- [ ] **Step 5: Build check**

```bash
cd apps/web && pnpm build 2>&1 | tail -30
```
Expected: build succeeds with no errors.

- [ ] **Step 6: Final grep — no placeholder text in UI components**

```bash
grep -R "PlaceholderPage\|placeholder page\|fake endpoint\|TODO.*endpoint" apps/web/src/ --include="*.tsx" -n
```
Expected: `PlaceholderPage` should only appear in `apps/web/src/components/PlaceholderPage.tsx` itself, not used in any route pages. If any route page renders `<PlaceholderPage />`, that needs to be fixed.

- [ ] **Step 7: Commit verification results**

```bash
git add -A
git commit -m "chore: verification pass — all checks clean"
```

---

## Remaining Blockers (known)

1. **401 on `/v1/users/me`**: If this persists after deploy, it means the Supabase JWT is not being accepted by the Spring backend JWKS validation. The frontend is correctly attaching the Bearer token (verified in `api/client.ts`). The fix is on the backend — check that the gateway's JWKS endpoint URL points to the correct Supabase project. This is NOT a frontend issue and is outside this plan's scope.

2. **Auth state on first load**: Because `useCurrentUser` uses React Query and runs client-side, there's a brief flash before user data loads. This is acceptable behavior — the sidebar and header show a minimal state until the query resolves.

3. **Notifications**: The new Header does not have a working notification dropdown. The legacy had WebSocket polling. This can be added in a separate task once the base layout migration is stable.

4. **CoursesPage `showCreateTodo` modal**: Contains the text "The syllabus management and course creation tools will be fully activated in a future migration pass." This is visible to TEACHER/ADMIN users when they click "Create Course." It should be replaced with a real course creation form in a future task.

5. **Other auth pages** (`/register`, `/forgot-password`, `/reset-password`, `/verify-email`): These currently use the minimal unstyled Tailwind form. They need the same legacy design treatment as `/login`. Not in scope for this plan — add as a follow-up.
