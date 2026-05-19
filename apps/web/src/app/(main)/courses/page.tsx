'use client';

import React from 'react';
import { useCoursesQuery } from '../../../queries/useCourseQueries';
import { Button } from '../../../components';
import { AcademicCapIcon, PlusIcon } from '@heroicons/react/24/outline';

export default function CoursesPage() {
  const { data: courses, isLoading, error } = useCoursesQuery();

  if (isLoading) {
    return <div className="flex items-center justify-center py-20">Loading courses...</div>;
  }

  if (error) {
    return <div className="text-fn-error py-10">Error loading courses: {(error as Error).message}</div>;
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
            My Courses
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Manage and access your academic courses
          </p>
        </div>
        <Button size="sm" className="flex items-center gap-2">
          <PlusIcon className="h-4 w-4" />
          <span>Create Course</span>
        </Button>
      </div>

      {!courses || courses.length === 0 ? (
        <div className="text-center py-20 border rounded-lg" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-default)' }}>
          <AcademicCapIcon className="h-10 w-10 mx-auto mb-4" style={{ color: 'var(--text-faint)' }} />
          <h3 className="text-lg font-medium mb-1">No courses found</h3>
          <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>You are not enrolled in any courses yet.</p>
          <Button variant="secondary" size="sm">Explore Courses</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => (
            <div key={course.id} className="p-6 rounded-lg border flex flex-col h-full" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-default)' }}>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded" style={{ background: 'var(--bg-active)', color: 'var(--text-primary)' }}>
                    {course.code}
                  </span>
                  <span className="text-[10px] font-medium" style={{ color: 'var(--text-faint)' }}>
                    {course.academic_year}
                  </span>
                </div>
                <h3 className="text-lg font-semibold mb-2" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
                  {course.title_uk}
                </h3>
                <p className="text-sm line-clamp-2 mb-4" style={{ color: 'var(--text-muted)' }}>
                  {course.description_uk || 'No description provided.'}
                </p>
              </div>
              <div className="mt-auto pt-4 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                <a href={`/courses/${course.id}`} className="text-sm font-medium hover:underline" style={{ color: 'var(--text-primary)' }}>
                  View Course →
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
