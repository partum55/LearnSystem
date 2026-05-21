'use client';

import Link from 'next/link';
import { useStudentDashboard } from '../hooks/useDashboardQueries';
import { useTeachingCourses } from '@/features/courses/hooks/useCourseQueries';
import { useCurrentUser } from '@/features/users/hooks/useUserQueries';
import { Loading } from '@/components/Loading';

export function DashboardPage() {
  const { data: currentUser, isLoading: isUserLoading, error: userError } = useCurrentUser();
  
  // Conditionally fetch student dashboard based on role (USER or ADMIN)
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

  const isLoading = isUserLoading || (isStudentOrAdmin && isStudentLoading) || (isTeacherOrAdmin && isTeachingLoading);
  const hasError = userError || (isStudentOrAdmin && studentError) || (isTeacherOrAdmin && teachingError);

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loading label="Loading your personalized dashboard..." />
      </div>
    );
  }

  if (hasError || !currentUser) {
    return (
      <div className="mx-auto max-w-4xl rounded-xl border border-red-200 bg-red-50/50 p-6 text-red-900 shadow-sm backdrop-blur-sm">
        <div className="flex items-start gap-4">
          <div className="rounded-lg bg-red-100 p-2 text-red-650">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight">Failed to Load Dashboard</h2>
            <p className="mt-2 text-sm text-red-750">
              We encountered an issue retrieving your dashboard details. The service might be temporarily offline, or your authentication session has expired.
            </p>
            <button 
              onClick={() => window.location.reload()}
              className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-red-700 transition-colors"
            >
              Retry Connection
            </button>
          </div>
        </div>
      </div>
    );
  }

  const getGreeting = () => {
    const hours = new Date().getHours();
    if (hours < 12) return 'Good Morning';
    if (hours < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const displayName = currentUser.displayName || currentUser.email;

  // Extraction of deadlines and courses
  const enrolledCourses = studentData?.activeCourses || [];
  const upcomingDeadlines = studentData?.upcomingDeadlines || [];

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Header Welcome Box */}
      <header className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-linear-to-r from-slate-900 via-slate-800 to-indigo-950 p-6 text-white shadow-md md:p-8">
        <div className="relative z-10 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-indigo-300">LMS portal Overview</p>
          <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">
            {getGreeting()}, <span className="bg-gradient-to-r from-indigo-200 via-indigo-100 to-white bg-clip-text text-transparent">{displayName}</span>!
          </h1>
          <p className="max-w-xl text-sm leading-relaxed text-slate-300">
            Welcome back to your workspace. Here is a summary of your active learning programs, teaching activities, and closest deadlines.
          </p>
        </div>
        
        {/* Abstract design elements */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl"></div>
        <div className="absolute bottom-0 right-0 -mb-20 mr-12 h-48 w-48 rounded-full bg-emerald-500/5 blur-3xl"></div>
      </header>

      {/* ADMIN CONTROLS BLOCK */}
      {currentUser.role === 'ADMIN' && (
        <section className="rounded-xl border border-amber-200/80 bg-amber-50/40 p-5 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-amber-100 p-2 text-amber-700">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-bold text-amber-900">🛡️ Platform Administration Panel</h3>
                <p className="text-xs text-amber-755">You are signed in as an Administrator. You have system-wide permissions.</p>
              </div>
            </div>
            <Link 
              href="/admin" 
              className="rounded-lg bg-amber-800 px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-amber-850 transition-colors"
            >
              Open Admin Area
            </Link>
          </div>
        </section>
      )}

      {/* METRIC BOXES (For Enrolled Students) */}
      {isStudentOrAdmin && (
        <section className="grid gap-5 sm:grid-cols-3">
          <div className="group relative rounded-xl border border-slate-200/70 bg-white p-5 shadow-xs transition-all hover:scale-[1.01] hover:border-slate-300 hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Active Courses</span>
              <span className="rounded-md bg-indigo-50 p-1.5 text-indigo-650">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </span>
            </div>
            <p className="mt-3 text-3xl font-extrabold text-slate-900">{studentData?.activeCourseCount ?? 0}</p>
            <p className="mt-1 text-xs text-slate-400">Total enrolled programs</p>
          </div>

          <div className="group relative rounded-xl border border-slate-200/70 bg-white p-5 shadow-xs transition-all hover:scale-[1.01] hover:border-slate-300 hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Upcoming Deadlines</span>
              <span className="rounded-md bg-rose-50 p-1.5 text-rose-600">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </span>
            </div>
            <p className="mt-3 text-3xl font-extrabold text-slate-900">{studentData?.upcomingDeadlineCount ?? 0}</p>
            <p className="mt-1 text-xs text-slate-400">Assignments due soon</p>
          </div>

          <div className="group relative rounded-xl border border-slate-200/70 bg-white p-5 shadow-xs transition-all hover:scale-[1.01] hover:border-slate-300 hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Pending Actions</span>
              <span className="rounded-md bg-amber-50 p-1.5 text-amber-600">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
              </span>
            </div>
            <p className="mt-3 text-3xl font-extrabold text-slate-900">{studentData?.pendingSubmissionCount ?? 0}</p>
            <p className="mt-1 text-xs text-slate-400">Submissions awaiting answers</p>
          </div>
        </section>
      )}

      {/* QUICK ACTIONS NAVIGATION LINKS */}
      <section className="rounded-xl border border-slate-200/60 bg-slate-50/50 p-5">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">⚡ Quick Actions Shortcuts</h3>
        <div className="mt-3 flex flex-wrap gap-3">
          <Link 
            href="/courses" 
            className="flex items-center gap-2 rounded-lg border border-slate-250 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors"
          >
            <svg className="h-4 w-4 text-slate-450" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
            Explore Courses Catalog
          </Link>
          <Link 
            href="/gradebook" 
            className="flex items-center gap-2 rounded-lg border border-slate-250 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors"
          >
            <svg className="h-4 w-4 text-slate-450" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            View My Grades Overview
          </Link>
          <Link 
            href="/profile" 
            className="flex items-center gap-2 rounded-lg border border-slate-250 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors"
          >
            <svg className="h-4 w-4 text-slate-450" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Account Settings
          </Link>
        </div>
      </section>

      {/* TWO COLUMN GRID LAYOUT FOR SECTIONS */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* LEFT TWO-THIRDS PANEL */}
        <div className="space-y-6 md:col-span-2">
          
          {/* TEACHER ACTIVITY BLOCK */}
          {isTeacherOrAdmin && (
            <div className="rounded-xl border border-slate-200 bg-white shadow-xs">
              <div className="border-b border-slate-100 px-5 py-4">
                <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                  My Teaching Programs
                </h2>
              </div>
              <div className="p-5">
                {teachingCourses && teachingCourses.length > 0 ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {teachingCourses.map((course) => (
                      <div key={course.id} className="group rounded-xl border border-slate-100 p-4 transition-all hover:border-slate-250 hover:bg-slate-50/50">
                        <Link href={`/courses/${course.id}`} className="block">
                          <span className="rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-750 uppercase tracking-wider">
                            {course.status}
                          </span>
                          <h3 className="mt-2 text-sm font-bold text-slate-900 group-hover:text-indigo-650 transition-colors">{course.title}</h3>
                          <p className="mt-1 text-xs text-slate-500 line-clamp-2">
                            {course.description || 'No summary instruction provided for this course module.'}
                          </p>
                        </Link>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center">
                    <svg className="mx-auto h-8 w-8 text-slate-350" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    <p className="mt-3 text-sm text-slate-500 font-medium">No teaching assignments registered yet.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STUDENT ACTIVE ENROLLMENTS PREVIEW */}
          {isStudentOrAdmin && (
            <div className="rounded-xl border border-slate-200 bg-white shadow-xs">
              <div className="border-b border-slate-100 px-5 py-4">
                <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-indigo-500"></span>
                  My Active Enrollments
                </h2>
              </div>
              <div className="divide-y divide-slate-100">
                {enrolledCourses.length > 0 ? (
                  enrolledCourses.map((course) => (
                    <div key={course.id} className="group px-5 py-4 flex items-center justify-between gap-4 transition-all hover:bg-slate-50/50">
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <Link href={`/courses/${course.id}`} className="inline-block font-bold text-slate-900 group-hover:text-indigo-650 transition-colors truncate max-w-full">
                          {course.title}
                        </Link>
                        <p className="text-xs text-slate-500">Instructor: {course.teacherName ?? 'Staff Assigned'}</p>
                        
                        {/* Progress Bar Container */}
                        <div className="flex items-center gap-3 pt-1">
                          <div className="h-1.5 w-24 rounded-full bg-slate-100 overflow-hidden">
                            <div 
                              className="h-full bg-indigo-600 rounded-full"
                              style={{ width: `${course.progress}%` }}
                            ></div>
                          </div>
                          <span className="text-[10px] font-bold text-slate-500">{course.progress}% completed</span>
                        </div>
                      </div>
                      
                      <Link 
                        href={`/courses/${course.id}`}
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-650 hover:bg-white transition-colors"
                      >
                        Enter
                      </Link>
                    </div>
                  ))
                ) : (
                  <div className="py-12 text-center">
                    <svg className="mx-auto h-10 w-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    <h4 className="mt-4 text-sm font-semibold text-slate-800">You're not enrolled in any courses</h4>
                    <p className="mt-1 text-xs text-slate-500 max-w-xs mx-auto">Access the catalogs list or contact an advisor to join active courses.</p>
                    <Link 
                      href="/courses" 
                      className="mt-4 inline-block rounded-lg bg-indigo-650 px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors"
                    >
                      Browse Available Courses
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

        {/* RIGHT ONE-THIRD COLUMN (DEADLINES & AD-HOC CONTENT) */}
        <div className="space-y-6">
          
          {/* UPCOMING DEADLINES PANEL */}
          {isStudentOrAdmin && (
            <div className="rounded-xl border border-slate-200 bg-white shadow-xs">
              <div className="border-b border-slate-100 px-5 py-4">
                <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-rose-500"></span>
                  Deadlines Agenda
                </h2>
              </div>
              <div className="p-4 space-y-3">
                {upcomingDeadlines.length > 0 ? (
                  upcomingDeadlines.slice(0, 5).map((deadline) => (
                    <div 
                      key={deadline.assignmentId} 
                      className="rounded-lg border border-slate-100 bg-slate-50/50 p-3 hover:bg-slate-50 transition-colors"
                    >
                      <Link href={`/assignments/${deadline.assignmentId}`} className="block">
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-[10px] font-bold text-slate-400 uppercase truncate max-w-[120px]">
                            {deadline.courseTitle}
                          </span>
                          <span className="rounded bg-rose-50 px-1.5 py-0.5 text-[9px] font-semibold text-rose-600 uppercase tracking-wider">
                            {deadline.type.replace('_', ' ')}
                          </span>
                        </div>
                        <h4 className="mt-1 text-xs font-bold text-slate-800 hover:text-indigo-650 transition-colors line-clamp-1">
                          {deadline.title}
                        </h4>
                        <p className="mt-1.5 text-[10px] font-medium text-rose-700 flex items-center gap-1">
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          Due: {deadline.dueDate ? new Date(deadline.dueDate).toLocaleString() : 'No schedule'}
                        </p>
                      </Link>
                    </div>
                  ))
                ) : (
                  <div className="py-8 text-center">
                    <svg className="mx-auto h-7 w-7 text-slate-350" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <p className="mt-2 text-xs text-slate-500 font-medium">All caught up! No active deadlines.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* RECENT FEEDBACK PANEL */}
          {isStudentOrAdmin && (
            <div className="rounded-xl border border-slate-200 bg-white shadow-xs">
              <div className="border-b border-slate-100 px-5 py-4">
                <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-amber-500"></span>
                  Recent Feedback
                </h2>
              </div>
              <div className="p-4">
                {/* Check if recentFeedback is provided by backend (we mock/fallback to empty feedback placeholder gracefully if not directly in DTO) */}
                <div className="py-8 text-center">
                  <svg className="mx-auto h-7 w-7 text-slate-350" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <p className="mt-2 text-xs text-slate-500 font-medium">No feedback reviews recorded yet.</p>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
