import { useEffect, useMemo, useState } from 'react';
import { assignmentsApi } from '../api/assessments';
import { Assignment, Course } from '../types';

export interface CourseDeadlineItem {
  assignmentId: string;
  moduleId?: string;
  courseId: string;
  courseCode: string;
  courseTitle: string;
  title: string;
  dueDate: string;
  status: 'upcoming' | 'overdue';
}

interface UseCourseDeadlinesOptions {
  enabled?: boolean;
}

interface UseCourseDeadlinesResult {
  deadlines: CourseDeadlineItem[];
  isLoading: boolean;
}

const parseDate = (value: string): number => {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : Number.MAX_SAFE_INTEGER;
};

const mapAssignments = (
  assignments: Assignment[],
  course: Course,
  status: 'upcoming' | 'overdue'
): CourseDeadlineItem[] => {
  return assignments
    .filter((assignment) => Boolean(assignment.id && assignment.due_date))
    .map((assignment) => ({
      assignmentId: assignment.id,
      moduleId: assignment.module_id,
      courseId: course.id,
      courseCode: course.code,
      courseTitle: course.title,
      title: assignment.title,
      dueDate: String(assignment.due_date),
      status,
    }));
};

export const useCourseDeadlines = (
  courses: Course[],
  options: UseCourseDeadlinesOptions = {}
): UseCourseDeadlinesResult => {
  const { enabled = true } = options;
  const [deadlines, setDeadlines] = useState<CourseDeadlineItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const courseKey = useMemo(
    () =>
      (courses || [])
        .filter((course) => Boolean(course.id))
        .map((course) => `${course.id}:${course.code}:${course.title}`)
        .sort()
        .join('|'),
    [courses]
  );
  const eligibleCourses = useMemo(
    () => (courses || []).filter((course) => Boolean(course.id)),
    [courseKey]
  );

  useEffect(() => {
    if (!enabled || eligibleCourses.length === 0) {
      setDeadlines([]);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    void (async () => {
      const results = await Promise.all(
        eligibleCourses.map(async (course) => {
          const [upcoming, overdue] = await Promise.allSettled([
            assignmentsApi.getUpcoming(course.id),
            assignmentsApi.getOverdue(course.id),
          ]);

          const upcomingAssignments =
            upcoming.status === 'fulfilled' && Array.isArray(upcoming.value.data)
              ? (upcoming.value.data as Assignment[])
              : [];
          const overdueAssignments =
            overdue.status === 'fulfilled' && Array.isArray(overdue.value.data)
              ? (overdue.value.data as Assignment[])
              : [];

          return [
            ...mapAssignments(upcomingAssignments, course, 'upcoming'),
            ...mapAssignments(overdueAssignments, course, 'overdue'),
          ];
        })
      );

      if (cancelled) {
        return;
      }

      const uniqueByAssignment = new Map<string, CourseDeadlineItem>();
      results.flat().forEach((item) => {
        const existing = uniqueByAssignment.get(item.assignmentId);
        if (!existing) {
          uniqueByAssignment.set(item.assignmentId, item);
          return;
        }
        if (existing.status === 'upcoming' && item.status === 'overdue') {
          uniqueByAssignment.set(item.assignmentId, item);
        }
      });

      const sorted = Array.from(uniqueByAssignment.values()).sort(
        (a, b) => parseDate(a.dueDate) - parseDate(b.dueDate)
      );
      setDeadlines(sorted);
      setIsLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [courseKey, eligibleCourses, enabled]);

  return { deadlines, isLoading };
};

export default useCourseDeadlines;
