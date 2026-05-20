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
    .filter((assignment) => Boolean(assignment.id && assignment.dueDate))
    .map((assignment) => ({
      assignmentId: assignment.id,
      moduleId: assignment.moduleId,
      courseId: course.id,
      courseCode: course.code,
      courseTitle: course.title,
      title: assignment.title,
      dueDate: String(assignment.dueDate),
      status,
    }));
};

export const useCourseDeadlines = (
  courses: Course[],
  options: UseCourseDeadlinesOptions = {}
): UseCourseDeadlinesResult => {
  const { enabled = true } = options;
  const [deadlines, setDeadlines] = useState<CourseDeadlineItem[]>([]);
  const [resolvedKey, setResolvedKey] = useState('');

  const eligibleCourses = useMemo(
    () => (courses || []).filter((course) => Boolean(course.id)),
    [courses]
  );
  const courseKey = useMemo(
    () =>
      eligibleCourses
        .map((course) => `${course.id}:${course.code}:${course.title}`)
        .sort()
        .join('|'),
    [eligibleCourses]
  );
  const stableEligibleCourses = useMemo(() => eligibleCourses, [courseKey]);

  useEffect(() => {
    if (!enabled || stableEligibleCourses.length === 0) {
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const results = await Promise.all(
          stableEligibleCourses.map(async (course) => {
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
      } finally {
        if (!cancelled) {
          setResolvedKey(courseKey);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [courseKey, enabled, stableEligibleCourses]);

  if (!enabled || eligibleCourses.length === 0) {
    return { deadlines: [], isLoading: false };
  }

  const isLoading = resolvedKey !== courseKey;
  return { deadlines, isLoading };
};

export default useCourseDeadlines;
