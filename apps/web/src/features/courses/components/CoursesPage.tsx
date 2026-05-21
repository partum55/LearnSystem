'use client';

import Link from 'next/link';
import { useState, useMemo } from 'react';
import { useActiveCourses, useTeachingCourses } from '@/features/courses/hooks/useCourseQueries';
import { useCurrentUser } from '@/features/users/hooks/useUserQueries';
import { Loading } from '@/components/Loading';

// Helper function to generate a premium gradient based on course ID string
function getCourseGradient(courseId: string): string {
  let hash = 0;
  for (let i = 0; i < courseId.length; i++) {
    hash = courseId.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const gradients = [
    'from-blue-600 via-indigo-600 to-violet-700',
    'from-emerald-500 via-teal-600 to-cyan-700',
    'from-rose-500 via-pink-600 to-purple-700',
    'from-amber-500 via-orange-600 to-red-700',
    'from-violet-600 via-purple-600 to-fuchsia-700',
    'from-cyan-500 via-sky-600 to-blue-700',
  ];
  
  const index = Math.abs(hash) % gradients.length;
  return gradients[index];
}

export function CoursesPage() {
  const { data: currentUser, isLoading: isUserLoading, error: userError } = useCurrentUser();
  
  // Conditionally fetch active enrolled courses based on role
  const isStudentOrAdmin = currentUser?.role === 'USER' || currentUser?.role === 'ADMIN';
  const { 
    data: activeCourses, 
    isLoading: isActiveLoading, 
    error: activeError 
  } = useActiveCourses();

  // Conditionally fetch teaching courses based on role
  const isTeacherOrAdmin = currentUser?.role === 'TEACHER' || currentUser?.role === 'ADMIN';
  const { 
    data: teachingCourses, 
    isLoading: isTeachingLoading, 
    error: teachingError 
  } = useTeachingCourses();

  // Client-side search and filtering states
  const [searchTerm, setSearchTerm] = useState('');
  const [studentFilter, setStudentFilter] = useState<'ALL' | 'ACTIVE' | 'COMPLETED'>('ALL');
  const [teacherFilter, setTeacherFilter] = useState<'ALL' | 'PUBLISHED' | 'DRAFT' | 'ARCHIVED'>('ALL');
  const [activeTab, setActiveTab] = useState<'ENROLLED' | 'TEACHING'>(
    currentUser?.role === 'TEACHER' ? 'TEACHING' : 'ENROLLED'
  );
  const [showCreateTodo, setShowCreateTodo] = useState(false);

  const isLoading = isUserLoading || (isStudentOrAdmin && isActiveLoading) || (isTeacherOrAdmin && isTeachingLoading);
  const hasError = userError || (isStudentOrAdmin && activeError) || (isTeacherOrAdmin && teachingError);

  // Filtered Student Enrolled Courses
  const filteredActiveCourses = useMemo(() => {
    if (!activeCourses) return [];
    return activeCourses.filter((course) => {
      const matchesSearch =
        course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (course.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (course.teacherName || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus =
        studentFilter === 'ALL'
          ? true
          : studentFilter === 'COMPLETED'
          ? course.progress === 100
          : course.progress < 100;

      return matchesSearch && matchesStatus;
    });
  }, [activeCourses, searchTerm, studentFilter]);

  // Filtered Teacher Courses
  const filteredTeachingCourses = useMemo(() => {
    if (!teachingCourses) return [];
    return teachingCourses.filter((course) => {
      const matchesSearch =
        course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (course.description || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      const statusUpper = (course.status || '').toUpperCase();
      const matchesStatus =
        teacherFilter === 'ALL'
          ? true
          : teacherFilter === statusUpper;

      return matchesSearch && matchesStatus;
    });
  }, [teachingCourses, searchTerm, teacherFilter]);

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center space-y-4">
        <Loading label="Fetching your course catalogue" />
      </div>
    );
  }

  if (hasError || !currentUser) {
    return (
      <div className="mx-auto max-w-3xl rounded-xl border border-rose-200 bg-rose-50/50 p-6 text-rose-900 shadow-xs backdrop-blur-xs">
        <div className="flex items-start gap-4">
          <div className="rounded-lg bg-rose-100 p-2 text-rose-650">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight">Failed to Load Courses</h2>
            <p className="mt-2 text-sm text-rose-750">
              We encountered an issue retrieving your course list. The server might be temporarily offline or your token has expired.
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

  // Adjust active tab if state is out of sync with user role
  const showStudentSection = isStudentOrAdmin;
  const showTeacherSection = isTeacherOrAdmin;

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Header Banner */}
      <header className="relative overflow-hidden rounded-2xl border border-slate-200 bg-linear-to-r from-slate-900 via-slate-800 to-indigo-950 p-6 text-white shadow-md md:p-8">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-widest text-indigo-300">My Workspace</p>
            <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl bg-gradient-to-r from-indigo-200 via-indigo-100 to-white bg-clip-text text-transparent">
              My Courses
            </h1>
            <p className="max-w-xl text-sm leading-relaxed text-slate-350">
              Browse through your learning schedules, track current academic progress, or manage your active teaching portals.
            </p>
          </div>
          
          {showTeacherSection && (
            <button 
              onClick={() => setShowCreateTodo(true)}
              className="cursor-pointer self-start md:self-center flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Course
            </button>
          )}
        </div>
        
        {/* Background design blur grids */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl"></div>
        <div className="absolute bottom-0 right-0 -mb-20 mr-12 h-48 w-48 rounded-full bg-emerald-500/5 blur-3xl"></div>
      </header>

      {/* Dual Role Selector Tabs (Only if User is an ADMIN or both student/teacher features are relevant) */}
      {showStudentSection && showTeacherSection && (
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => setActiveTab('ENROLLED')}
            className={`flex items-center gap-2 border-b-2 px-6 py-3.5 text-sm font-semibold transition-all ${
              activeTab === 'ENROLLED'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
            }`}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            Enrolled Courses ({activeCourses?.length ?? 0})
          </button>
          <button
            onClick={() => setActiveTab('TEACHING')}
            className={`flex items-center gap-2 border-b-2 px-6 py-3.5 text-sm font-semibold transition-all ${
              activeTab === 'TEACHING'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
            }`}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            Teaching Portal ({teachingCourses?.length ?? 0})
          </button>
        </div>
      )}

      {/* Control Actions: Search and Filters panel */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          {/* Search bar */}
          <div className="relative w-full md:w-96">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="text"
              placeholder="Search course title, code, instructor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-slate-250 bg-slate-50 py-2.5 pl-10 pr-4 text-sm outline-hidden focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100 transition-all"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')} 
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap items-center gap-2 self-start md:self-center">
            {(!showTeacherSection || (showStudentSection && activeTab === 'ENROLLED')) && (
              <>
                <span className="text-xs font-semibold text-slate-450 uppercase tracking-wider mr-1">Progress:</span>
                {(['ALL', 'ACTIVE', 'COMPLETED'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setStudentFilter(filter)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                      studentFilter === filter
                        ? 'bg-indigo-50 text-indigo-600 ring-1 ring-indigo-200'
                        : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                    }`}
                  >
                    {filter === 'ALL' ? 'All Enrolled' : filter === 'ACTIVE' ? 'In Progress' : 'Completed'}
                  </button>
                ))}
              </>
            )}

            {(showTeacherSection && (!showStudentSection || activeTab === 'TEACHING')) && (
              <>
                <span className="text-xs font-semibold text-slate-450 uppercase tracking-wider mr-1">Status:</span>
                {(['ALL', 'PUBLISHED', 'DRAFT', 'ARCHIVED'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setTeacherFilter(filter)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                      teacherFilter === filter
                        ? 'bg-indigo-50 text-indigo-600 ring-1 ring-indigo-200'
                        : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                    }`}
                  >
                    {filter === 'ALL' ? 'All Teaching' : filter.charAt(0) + filter.slice(1).toLowerCase()}
                  </button>
                ))}
              </>
            )}
          </div>
        </div>
      </section>

      {/* Main grids depending on user role + selections */}
      <main className="space-y-8">
        {/* STUDENT VIEW */}
        {showStudentSection && (activeTab === 'ENROLLED' || !showTeacherSection) && (
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-indigo-500"></span>
              Enrolled Programs ({filteredActiveCourses.length})
            </h2>

            {filteredActiveCourses.length > 0 ? (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {filteredActiveCourses.map((course) => (
                  <Link 
                    key={course.id} 
                    href={`/courses/${course.id}`}
                    className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs transition-all hover:scale-[1.015] hover:border-slate-350 hover:shadow-md"
                  >
                    {/* Visual colored dynamic top bar gradient */}
                    <div className={`h-2.5 bg-gradient-to-r ${getCourseGradient(course.id)}`} />
                    
                    <div className="flex-1 p-5 space-y-4">
                      {/* Course status / badge */}
                      <div className="flex justify-between items-start">
                        <span className="font-mono text-xs font-bold tracking-wider text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-200/50">
                          {course.id.substring(0, 8).toUpperCase()}
                        </span>
                        
                        {course.progress === 100 ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-2xs font-semibold text-emerald-700">
                            <span className="h-1 w-1 rounded-full bg-emerald-500" />
                            Completed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-2xs font-semibold text-indigo-700">
                            <span className="h-1 w-1 rounded-full bg-indigo-500" />
                            Active
                          </span>
                        )}
                      </div>

                      {/* Course Content */}
                      <div className="space-y-1">
                        <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-650 transition-colors leading-snug">
                          {course.title}
                        </h3>
                        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                          {course.description || 'No description summary registered for this module program.'}
                        </p>
                      </div>

                      {/* Instructor block */}
                      <div className="flex items-center gap-2 border-t border-slate-100 pt-4 text-xs text-slate-500">
                        <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span>{course.teacherName || 'Faculty Instructor'}</span>
                      </div>

                      {/* Course Grade if registered */}
                      {course.grade !== null && course.grade !== undefined && (
                        <div className="rounded-lg bg-slate-50 p-2 text-center text-xs border border-slate-100">
                          <span className="text-slate-500 font-semibold">Overall Course Grade: </span>
                          <span className="font-extrabold text-indigo-600">{course.grade}%</span>
                        </div>
                      )}
                    </div>

                    {/* Progress slider bar */}
                    <div className="border-t border-slate-100 bg-slate-50/50 p-4">
                      <div className="flex justify-between text-2xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                        <span>Course progress</span>
                        <span>{course.progress}%</span>
                      </div>
                      <div className="w-full rounded-full h-2 bg-slate-200">
                        <div
                          className="h-2 rounded-full bg-indigo-600 transition-all duration-300"
                          style={{ width: `${course.progress}%` }}
                        />
                      </div>
                    </div>
                  </Link>
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
                    <h3 className="text-sm font-bold text-slate-800">No enrolled courses</h3>
                    <p className="text-xs text-slate-500">
                      We couldn't find any courses matching your search query or filters.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TEACHER VIEW */}
        {showTeacherSection && (activeTab === 'TEACHING' || !showStudentSection) && (
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
              Teaching Portals ({filteredTeachingCourses.length})
            </h2>

            {filteredTeachingCourses.length > 0 ? (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {filteredTeachingCourses.map((course) => {
                  const statusUpper = (course.status || '').toUpperCase();
                  const statusClass =
                    statusUpper === 'PUBLISHED'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : statusUpper === 'DRAFT'
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-slate-50 text-slate-600 border-slate-200';

                  return (
                    <Link 
                      key={course.id} 
                      href={`/courses/${course.id}`}
                      className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs transition-all hover:scale-[1.015] hover:border-slate-350 hover:shadow-md"
                    >
                      {/* Color accent line */}
                      <div className={`h-2.5 bg-gradient-to-r ${getCourseGradient(course.id)}`} />
                      
                      <div className="flex-1 p-5 space-y-4">
                        {/* Course stats and tags */}
                        <div className="flex justify-between items-start">
                          <span className="font-mono text-xs font-bold tracking-wider text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-200/50">
                            {course.id.substring(0, 8).toUpperCase()}
                          </span>
                          
                          <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-2xs font-bold uppercase tracking-wider ${statusClass}`}>
                            {course.status || 'DRAFT'}
                          </span>
                        </div>

                        {/* Title & Desc */}
                        <div className="space-y-1">
                          <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-650 transition-colors leading-snug">
                            {course.title}
                          </h3>
                          <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed">
                            {course.description || 'No description summary details provided for this active syllabus yet.'}
                          </p>
                        </div>
                      </div>

                      {/* Course details block */}
                      <div className="border-t border-slate-100 bg-slate-50/50 px-5 py-4 flex items-center justify-between text-xs text-slate-500">
                        <div className="flex items-center gap-1">
                          <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                          </svg>
                          <span>Manage Syllabus</span>
                        </div>
                        <span className="font-semibold text-slate-700">Course Staff Access</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/40 py-16 text-center shadow-xs">
                <div className="mx-auto max-w-xs space-y-3">
                  <div className="inline-flex rounded-full bg-slate-100 p-3 text-slate-400 border border-slate-200/50">
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-slate-800">No teaching courses</h3>
                    <p className="text-xs text-slate-500">
                      We couldn't find any courses matching your search query or filters.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* TODO Create Course Modal */}
      {showCreateTodo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <svg className="h-6 w-6 text-indigo-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Create Course Feature
            </h3>
            <p className="text-sm text-slate-550 leading-relaxed">
              The syllabus management and course creation tools will be fully activated in a future migration pass. In this MVP base, you can navigate and test all active student, teaching, quiz, and gradebook modules.
            </p>
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowCreateTodo(false)}
                className="cursor-pointer rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
