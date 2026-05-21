'use client';

import Link from 'next/link';
import { useState, useMemo } from 'react';
import { 
  useCourseOverview, 
  useCourseModules, 
  useCourseMembers 
} from '@/features/courses/hooks/useCourseQueries';
import { useCurrentUser } from '@/features/users/hooks/useUserQueries';
import { useStudentGradebook } from '@/features/gradebook/hooks/useGradebookQueries';
import { Loading } from '@/components/Loading';

interface CourseDetailPageProps {
  courseId: string;
}

type TabId = 'overview' | 'modules' | 'grades' | 'members';

export function CourseDetailPage({ courseId }: CourseDetailPageProps) {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [memberSearch, setMemberSearch] = useState('');
  const [todoToast, setTodoToast] = useState<string | null>(null);

  // Core canonical queries
  const { data: currentUser, isLoading: isUserLoading } = useCurrentUser();
  const { data: overview, isLoading: isOverviewLoading, error: overviewError } = useCourseOverview(courseId);
  const { data: modulesData, isLoading: isModulesLoading, error: modulesError } = useCourseModules(courseId);
  const { data: membersPage } = useCourseMembers(courseId, { size: 100 });
  const { data: gradebook } = useStudentGradebook(courseId);

  // Role validation based on course membership details
  const currentCourseMember = useMemo(() => {
    if (!membersPage?.content || !currentUser) return null;
    return membersPage.content.find((m) => m.userId === currentUser.id);
  }, [membersPage, currentUser]);

  const courseRole = currentCourseMember?.roleInCourse;
  
  const isCourseStaff = useMemo(() => {
    if (currentUser?.role === 'ADMIN') return true;
    return courseRole === 'OWNER' || courseRole === 'TEACHER' || courseRole === 'TA';
  }, [currentUser, courseRole]);

  const isForbidden = useMemo(() => {
    // If we get a 403 error on overview or member checks
    const err = overviewError as { status?: number; response?: { status?: number } } | null;
    const errStatus = err?.status || err?.response?.status;
    return errStatus === 403;
  }, [overviewError]);

  const isLoading = isUserLoading || isOverviewLoading || isModulesLoading;
  const hasError = (overviewError && !isForbidden) || modulesError;

  const showToast = (message: string) => {
    setTodoToast(message);
    setTimeout(() => setTodoToast(null), 3000);
  };

  // Filtered members list
  const filteredMembers = useMemo(() => {
    if (!membersPage?.content) return [];
    return membersPage.content.filter((m) => {
      const query = memberSearch.toLowerCase();
      return (
        (m.userName || '').toLowerCase().includes(query) ||
        (m.userEmail || '').toLowerCase().includes(query) ||
        (m.roleInCourse || '').toLowerCase().includes(query)
      );
    });
  }, [membersPage, memberSearch]);

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center space-y-4">
        <Loading label="Loading syllabus materials" />
      </div>
    );
  }

  if (isForbidden) {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-amber-200 bg-amber-50/40 p-6 text-amber-900 shadow-sm backdrop-blur-xs text-center space-y-4">
        <div className="mx-auto inline-flex rounded-full bg-amber-100 p-3 text-amber-700">
          <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0-6v4m0-4v-1m-1-4h3m-2-3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold tracking-tight">Access Restricted</h2>
          <p className="text-sm text-amber-800 leading-relaxed">
            You do not have permission to view this course. Enrolled students and authorized teaching staff only are granted entry.
          </p>
        </div>
        <Link 
          href="/courses" 
          className="inline-block rounded-lg bg-amber-800 px-5 py-2 text-xs font-semibold text-white hover:bg-amber-900 transition-colors"
        >
          Return to My Courses
        </Link>
      </div>
    );
  }

  if (hasError || !overview) {
    return (
      <div className="mx-auto max-w-3xl rounded-xl border border-rose-200 bg-rose-50/50 p-6 text-rose-900 shadow-xs backdrop-blur-xs">
        <div className="flex items-start gap-4">
          <div className="rounded-lg bg-rose-100 p-2 text-rose-650">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight">Failed to Load Course Detail</h2>
            <p className="mt-2 text-sm text-rose-750">
              We encountered an issue retrieving details for this syllabus. The connection might have dropped or your security session has expired.
            </p>
            <button 
              onClick={() => window.location.reload()}
              className="mt-4 rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-rose-700 transition-colors"
            >
              Retry Connection
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in pb-12 relative">
      {/* Toast Alert Placeholder */}
      {todoToast && (
        <div className="fixed bottom-5 right-5 z-50 rounded-xl bg-slate-900/90 text-white px-5 py-3 text-xs font-semibold shadow-lg backdrop-blur-xs flex items-center gap-2 border border-slate-700 animate-slide-in">
          <svg className="h-4 w-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{todoToast}</span>
        </div>
      )}

      {/* Course Banner Header */}
      <header className="relative overflow-hidden rounded-2xl border border-slate-200 bg-linear-to-r from-slate-900 via-slate-800 to-indigo-950 p-6 text-white shadow-md md:p-8">
        <div className="relative z-10 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded bg-indigo-500/25 border border-indigo-400/30 px-2.5 py-0.5 text-3xs font-bold uppercase tracking-widest text-indigo-300">
              Course Code: {courseId.substring(0, 8).toUpperCase()}
            </span>
            {courseRole && (
              <span className="rounded bg-emerald-500/25 border border-emerald-400/30 px-2.5 py-0.5 text-3xs font-bold uppercase tracking-widest text-emerald-300">
                Role: {courseRole}
              </span>
            )}
          </div>
          
          <div className="space-y-2">
            <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl bg-gradient-to-r from-indigo-200 via-indigo-100 to-white bg-clip-text text-transparent">
              {overview.title}
            </h1>
            <p className="max-w-3xl text-sm leading-relaxed text-slate-300">
              {overview.description || 'No detailed course description has been registered for this portal.'}
            </p>
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-2 pt-2 border-t border-slate-700/60 text-xs text-slate-350">
            <span className="flex items-center gap-1.5">
              <svg className="h-4 w-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Instructor: <strong className="text-white">{overview.teacherName || 'Faculty Instructor'}</strong>
            </span>
            <span className="flex items-center gap-1.5">
              <svg className="h-4 w-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              Modules: <strong className="text-white">{modulesData?.items?.length ?? 0}</strong>
            </span>
            {overview.progress !== undefined && (
              <span className="flex items-center gap-1.5">
                <svg className="h-4 w-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Active Completion: <strong className="text-white">{overview.progress}%</strong>
              </span>
            )}
          </div>
        </div>

        {/* Backdrop visual gradient blurs */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl"></div>
        <div className="absolute bottom-0 right-0 -mb-20 mr-12 h-48 w-48 rounded-full bg-emerald-500/5 blur-3xl"></div>
      </header>

      {/* Staff Actions Callout Banner (If user has OWNER/TEACHER/TA role or global ADMIN) */}
      {isCourseStaff && (
        <section className="rounded-xl border border-indigo-200/80 bg-indigo-50/30 p-4 shadow-2xs backdrop-blur-xs flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-indigo-100 p-2 text-indigo-700">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-xs font-bold text-indigo-950 uppercase tracking-wider">Course Staff Dashboard</h3>
              <p className="text-2xs text-indigo-850">Manage modules, learning items, assignments and members in this portal.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button 
              onClick={() => showToast('TODO: Manage modules builder will be activated in a future pass.')} 
              className="rounded-lg border border-indigo-250 bg-white px-3 py-1.5 text-2xs font-bold text-indigo-700 hover:bg-indigo-50 shadow-2xs active:scale-[0.98] transition-all"
            >
              Manage Modules
            </button>
            <button 
              onClick={() => showToast('TODO: Add learning item builder will be activated in a future pass.')} 
              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-2xs font-bold text-white hover:bg-indigo-550 shadow-2xs active:scale-[0.98] transition-all"
            >
              + Learning Item
            </button>
            <button 
              onClick={() => showToast('TODO: Add assignment builder will be activated in a future pass.')} 
              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-2xs font-bold text-white hover:bg-emerald-550 shadow-2xs active:scale-[0.98] transition-all"
            >
              + Assignment
            </button>
            <button 
              onClick={() => showToast('TODO: Open teacher gradebook dashboard will be activated in a future pass.')} 
              className="rounded-lg bg-indigo-650 px-3 py-1.5 text-2xs font-bold text-white hover:bg-indigo-600 shadow-2xs active:scale-[0.98] transition-all"
            >
              Open Gradebook
            </button>
          </div>
        </section>
      )}

      {/* Main Tabs Navigation */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 border-b-2 px-6 py-3.5 text-sm font-semibold transition-all ${
            activeTab === 'overview'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
          }`}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Overview
        </button>
        <button
          onClick={() => setActiveTab('modules')}
          className={`flex items-center gap-2 border-b-2 px-6 py-3.5 text-sm font-semibold transition-all ${
            activeTab === 'modules'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
          }`}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
          Modules ({modulesData?.items?.length ?? 0})
        </button>
        <button
          onClick={() => setActiveTab('grades')}
          className={`flex items-center gap-2 border-b-2 px-6 py-3.5 text-sm font-semibold transition-all ${
            activeTab === 'grades'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
          }`}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Grades Summary
        </button>
        <button
          onClick={() => setActiveTab('members')}
          className={`flex items-center gap-2 border-b-2 px-6 py-3.5 text-sm font-semibold transition-all ${
            activeTab === 'members'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
          }`}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          Members ({membersPage?.content?.length ?? 0})
        </button>
      </div>

      {/* Tabs panels */}
      <main className="space-y-6">
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="grid gap-6 md:grid-cols-3">
            {/* Left 2-thirds */}
            <div className="md:col-span-2 space-y-6">
              <section className="rounded-xl border border-slate-200 bg-white p-5 space-y-3 shadow-2xs">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">About Course</h3>
                <p className="text-sm text-slate-650 leading-relaxed whitespace-pre-line">
                  {overview.description || 'No summary syllabus guidelines have been provided for this course block.'}
                </p>
              </section>

              {/* Feedbacks overview */}
              <section className="rounded-xl border border-slate-200 bg-white p-5 space-y-4 shadow-2xs">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center gap-2">
                  <svg className="h-4 w-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                  </svg>
                  Recent Faculty Reviews
                </h3>

                {overview.recentFeedback && overview.recentFeedback.length > 0 ? (
                  <div className="space-y-3">
                    {overview.recentFeedback.map((fb, idx) => (
                      <div key={idx} className="rounded-lg bg-slate-50 border border-slate-100 p-3 text-xs text-slate-600 leading-relaxed italic relative">
                        <span className="absolute top-2 left-2 text-3xl text-slate-200/60 leading-none">“</span>
                        <div className="pl-5">{fb}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">No recent instructor feedback comments registered yet.</p>
                )}
              </section>
            </div>

            {/* Right 1-third */}
            <div className="space-y-6">
              {/* Upcoming deadlines */}
              <section className="rounded-xl border border-slate-200 bg-white p-5 space-y-4 shadow-2xs">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center gap-2">
                  <svg className="h-4 w-4 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Upcoming Due Dates
                </h3>

                {overview.upcomingDeadlines && overview.upcomingDeadlines.length > 0 ? (
                  <div className="space-y-3">
                    {overview.upcomingDeadlines.map((deadline) => (
                      <Link 
                        key={deadline.assignmentId}
                        href={`/assignments/${deadline.assignmentId}`}
                        className="group block rounded-lg border border-slate-100 p-3 hover:border-indigo-300 hover:bg-indigo-50/20 transition-all"
                      >
                        <span className="text-2xs font-semibold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded uppercase tracking-wider">
                          Due soon
                        </span>
                        <h4 className="mt-1 text-xs font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">
                          {deadline.title}
                        </h4>
                        <div className="mt-1.5 flex items-center gap-1.5 text-3xs text-slate-450 uppercase tracking-wider">
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 00-2 2z" />
                          </svg>
                          <span>{deadline.dueDate ? new Date(deadline.dueDate).toLocaleDateString() : 'No date'}</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="py-4 text-center">
                    <p className="text-xs text-slate-450 italic">Excellent! No closest due dates pending.</p>
                  </div>
                )}
              </section>
            </div>
          </div>
        )}

        {/* MODULES TAB */}
        {activeTab === 'modules' && (
          <div className="space-y-6">
            {modulesData?.items && modulesData.items.length > 0 ? (
              <div className="space-y-6">
                {modulesData.items.map((module) => (
                  <article key={module.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
                    {/* Module Title Bar */}
                    <div className="border-b border-slate-100 bg-slate-50/50 px-5 py-4 flex flex-col md:flex-row md:items-center justify-between gap-2">
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-mono font-bold tracking-wider text-slate-400 bg-white px-2 py-0.5 rounded border border-slate-200">
                          MODULE {module.order}
                        </span>
                        <h3 className="text-base font-bold text-slate-800 pt-1">{module.title}</h3>
                        {module.description && (
                          <p className="text-xs text-slate-500 leading-relaxed">{module.description}</p>
                        )}
                      </div>
                      
                      {isCourseStaff && (
                        <span className="self-start md:self-center inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-2xs font-bold text-indigo-700 uppercase tracking-wider">
                          {module.availabilityStatus || 'VISIBLE'}
                        </span>
                      )}
                    </div>

                    {/* Separated Content Grid */}
                    <div className="p-5 grid gap-6 md:grid-cols-2">
                      {/* Learning Items Column */}
                      <div className="space-y-3">
                        <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1.5 flex items-center gap-2">
                          <svg className="h-4.5 w-4.5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                          </svg>
                          Learning Materials ({module.learningItems.length})
                        </h4>

                        {module.learningItems.length > 0 ? (
                          <div className="divide-y divide-slate-100">
                            {module.learningItems.map((item) => {
                              // Visual helper matching items types
                              const isPdf = item.type === 'pdf';
                              const isVideo = item.type === 'video';
                              const isLink = item.type === 'link';
                              
                              let iconColor = 'text-indigo-500 bg-indigo-50';
                              if (isPdf) iconColor = 'text-rose-500 bg-rose-50';
                              else if (isVideo) iconColor = 'text-emerald-500 bg-emerald-50';
                              else if (isLink) iconColor = 'text-amber-500 bg-amber-50';

                              return (
                                <Link
                                  key={item.id}
                                  href={`/learning-items/${item.id}?courseId=${courseId}`}
                                  className="group flex items-start gap-3 py-3 hover:bg-slate-50/50 rounded-lg px-2 -mx-2 transition-colors"
                                >
                                  <div className={`rounded-lg p-2 ${iconColor} flex-shrink-0`}>
                                    {isPdf ? (
                                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                      </svg>
                                    ) : isVideo ? (
                                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                      </svg>
                                    ) : isLink ? (
                                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                      </svg>
                                    ) : (
                                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                      </svg>
                                    )}
                                  </div>
                                  <div className="space-y-0.5">
                                    <h5 className="text-xs font-bold text-slate-800 group-hover:text-indigo-650 transition-colors leading-snug">
                                      {item.title}
                                    </h5>
                                    {item.description && (
                                      <p className="text-[11px] text-slate-500 line-clamp-1">{item.description}</p>
                                    )}
                                    <span className="inline-block text-[9px] font-semibold text-slate-400 bg-slate-100 rounded px-1 uppercase mt-1">
                                      Type: {item.type}
                                    </span>
                                  </div>
                                </Link>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="py-6 text-center bg-slate-50/50 rounded-lg border border-dashed border-slate-200">
                            <p className="text-[11px] text-slate-400 italic">No learning items in this module.</p>
                          </div>
                        )}
                      </div>

                      {/* Assignments Column */}
                      <div className="space-y-3">
                        <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1.5 flex items-center gap-2">
                          <svg className="h-4.5 w-4.5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                          </svg>
                          Assignments ({module.assignments.length})
                        </h4>

                        {module.assignments.length > 0 ? (
                          <div className="divide-y divide-slate-100">
                            {module.assignments.map((assignment) => {
                              const isQuiz = assignment.type === 'quiz';
                              const isVpl = assignment.type === 'vpl';
                              
                              let typeBg = 'bg-emerald-50 text-emerald-700';
                              if (isQuiz) typeBg = 'bg-violet-50 text-violet-700';
                              else if (isVpl) typeBg = 'bg-amber-50 text-amber-700';

                              return (
                                <Link
                                  key={assignment.id}
                                  href={`/assignments/${assignment.id}`}
                                  className="group flex items-start justify-between gap-3 py-3 hover:bg-slate-50/50 rounded-lg px-2 -mx-2 transition-colors"
                                >
                                  <div className="flex gap-3">
                                    <div className={`rounded-lg p-2 ${typeBg} flex-shrink-0 h-8 w-8 flex items-center justify-center`}>
                                      {isQuiz ? (
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                      ) : isVpl ? (
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                                        </svg>
                                      ) : (
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                      )}
                                    </div>
                                    <div className="space-y-0.5">
                                      <h5 className="text-xs font-bold text-slate-800 group-hover:text-indigo-650 transition-colors leading-snug">
                                        {assignment.title}
                                      </h5>
                                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-slate-500">
                                        <span>Max: {assignment.maxPoints} pts</span>
                                        {assignment.dueDate && (
                                          <>
                                            <span className="text-slate-300">•</span>
                                            <span>Due: {new Date(assignment.dueDate).toLocaleDateString()}</span>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  
                                  {assignment.grade?.points !== undefined && assignment.grade?.points !== null ? (
                                    <span className="text-3xs font-extrabold text-indigo-700 bg-indigo-50 border border-indigo-150 px-1.5 py-0.5 rounded-full flex-shrink-0">
                                      {assignment.grade.points}/{assignment.maxPoints} pts
                                    </span>
                                  ) : (
                                    <span className="text-3xs font-bold text-slate-400 bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded-full flex-shrink-0 uppercase">
                                      {assignment.status.toLowerCase()}
                                    </span>
                                  )}
                                </Link>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="py-6 text-center bg-slate-50/50 rounded-lg border border-dashed border-slate-200">
                            <p className="text-[11px] text-slate-400 italic">No assignments in this module.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/40 py-16 text-center shadow-xs">
                <div className="mx-auto max-w-xs space-y-3">
                  <div className="inline-flex rounded-full bg-slate-100 p-3 text-slate-400 border border-slate-200/50">
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-slate-800">No modules yet</h3>
                    <p className="text-xs text-slate-500">
                      There are no active module structures registered for this course program.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* GRADES TAB */}
        {activeTab === 'grades' && (
          <div className="space-y-6">
            {!isCourseStaff ? (
              // Student Grades Summary
              <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-6 shadow-2xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">My Grades Overview</h3>
                    <p className="text-xs text-slate-400">Secure record of assignment submissions and feedback reviews in this course.</p>
                  </div>
                  {gradebook?.total && (
                    <div className="rounded-lg bg-indigo-50 border border-indigo-100 px-4 py-2 text-center">
                      <p className="text-3xs font-bold text-slate-500 uppercase tracking-wider leading-none mb-1">Total score</p>
                      <p className="text-xl font-extrabold text-indigo-700 leading-none">
                        {gradebook.total.points}/{gradebook.total.maxPoints} pts
                      </p>
                      {gradebook.total.percentage !== undefined && gradebook.total.percentage !== null && (
                        <p className="text-[10px] text-slate-450 mt-0.5">({gradebook.total.percentage}%)</p>
                      )}
                    </div>
                  )}
                </div>

                {gradebook?.modules && gradebook.modules.length > 0 ? (
                  <div className="space-y-6">
                    {gradebook.modules.map((mod) => (
                      <div key={mod.moduleId} className="space-y-3">
                        <div className="flex justify-between items-center bg-slate-50 border border-slate-100 rounded-lg px-4 py-2">
                          <h4 className="text-xs font-bold text-slate-750">{mod.title}</h4>
                          <span className="text-3xs font-mono font-bold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                            Subtotal: {mod.total.points}/{mod.total.maxPoints} pts
                          </span>
                        </div>

                        {mod.assignments.length > 0 ? (
                          <div className="overflow-x-auto rounded-lg border border-slate-150 bg-white shadow-2xs">
                            <table className="w-full text-left border-collapse">
                              <thead>
                                <tr className="bg-slate-50/50 border-b border-slate-150 text-[10px] uppercase font-bold tracking-wider text-slate-450">
                                  <th className="py-2.5 px-4">Assignment</th>
                                  <th className="py-2.5 px-4">Status</th>
                                  <th className="py-2.5 px-4 text-right">Score</th>
                                  <th className="py-2.5 px-4">Feedback Review</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 text-xs">
                                {mod.assignments.map((asg) => (
                                  <tr key={asg.assignmentId} className="hover:bg-slate-50/20">
                                    <td className="py-3 px-4 font-semibold text-slate-800">
                                      <Link href={`/assignments/${asg.assignmentId}`} className="hover:text-indigo-650 hover:underline">
                                        {asg.title}
                                      </Link>
                                    </td>
                                    <td className="py-3 px-4">
                                      <span className="inline-flex rounded px-1.5 py-0.5 text-3xs font-bold uppercase bg-slate-100 border border-slate-200 text-slate-550">
                                        {asg.status.toLowerCase()}
                                      </span>
                                    </td>
                                    <td className="py-3 px-4 text-right font-bold text-slate-800">
                                      {asg.points !== undefined && asg.points !== null ? `${asg.points}/${asg.maxPoints}` : `-/${asg.maxPoints}`}
                                    </td>
                                    <td className="py-3 px-4 text-slate-500 max-w-xs truncate italic">
                                      {asg.comment || '-'}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <p className="text-3xs text-slate-450 italic pl-4">No assignments registered in this module module gradesheet.</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-6 text-center bg-slate-50/50 rounded-lg border border-dashed border-slate-200">
                    <p className="text-xs text-slate-450 italic">No registered grade sheets available.</p>
                  </div>
                )}
              </div>
            ) : (
              // Teacher Gradebook Placeholder
              <div className="rounded-xl border border-indigo-200/80 bg-indigo-50/30 p-6 text-indigo-900 shadow-2xs backdrop-blur-xs text-center space-y-4">
                <div className="mx-auto inline-flex rounded-full bg-indigo-100 p-3 text-indigo-700">
                  <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div className="space-y-1.5 max-w-md mx-auto">
                  <h3 className="text-sm font-bold text-indigo-950 uppercase tracking-wider">Teacher Gradebook Dashboard</h3>
                  <p className="text-xs text-indigo-850">
                    The full interactive teacher Gradebook and SpeedGrader panel allows managing all course students, drafting points, and publishing grades.
                  </p>
                  <p className="text-3xs text-indigo-700 bg-white border border-indigo-150 p-2 rounded italic mt-2">
                    Note: Teacher Gradebook dashboard controls will be migrated under its own dedicated workspace pass in a future track.
                  </p>
                  <button 
                    onClick={() => showToast('TODO: Open teacher gradebook dashboard will be activated in a future pass.')} 
                    className="mt-3 inline-block rounded-lg bg-indigo-600 px-4 py-2 text-2xs font-bold text-white shadow-2xs hover:bg-indigo-700 active:scale-[0.98] transition-all"
                  >
                    Open Gradebook
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* MEMBERS TAB */}
        {activeTab === 'members' && (
          <div className="space-y-6">
            <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Course Members Catalogue</h3>
                  <p className="text-xs text-slate-400">List of enrolled students and active instruction staff in this portal.</p>
                </div>
                
                {/* Search members input */}
                <div className="relative w-full sm:w-72">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 text-slate-400">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </span>
                  <input
                    type="text"
                    placeholder="Search name, email, role..."
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                    className="w-full rounded-lg border border-slate-250 bg-slate-50 py-1.5 pl-8 pr-4 text-xs outline-hidden focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100 transition-all"
                  />
                </div>
              </div>

              {filteredMembers.length > 0 ? (
                <div className="overflow-x-auto rounded-lg border border-slate-150 bg-white shadow-2xs">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/50 border-b border-slate-150 text-[10px] uppercase font-bold tracking-wider text-slate-450">
                        <th className="py-2.5 px-4">Member Name</th>
                        <th className="py-2.5 px-4">Email Address</th>
                        <th className="py-2.5 px-4">Course Role</th>
                        <th className="py-2.5 px-4">Enrollment Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {filteredMembers.map((member) => (
                        <tr key={member.id} className="hover:bg-slate-50/20">
                          <td className="py-3 px-4 font-bold text-slate-800">
                            {member.userName || 'Course Member'}
                          </td>
                          <td className="py-3 px-4 text-slate-500">{member.userEmail || 'No email registered'}</td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex rounded px-2 py-0.5 text-3xs font-extrabold uppercase ${
                              member.roleInCourse === 'STUDENT'
                                ? 'bg-slate-100 border border-slate-200 text-slate-650'
                                : 'bg-indigo-50 border border-indigo-150 text-indigo-750'
                            }`}>
                              {member.roleInCourse}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex rounded px-2 py-0.5 text-3xs font-bold uppercase ${
                              member.enrollmentStatus === 'active'
                                ? 'bg-emerald-50 border border-emerald-150 text-emerald-700'
                                : 'bg-slate-155 text-slate-500'
                            }`}>
                              {member.enrollmentStatus}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-8 text-center bg-slate-50/50 rounded-lg border border-dashed border-slate-200">
                  <p className="text-xs text-slate-400 italic">No matching course members found.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
