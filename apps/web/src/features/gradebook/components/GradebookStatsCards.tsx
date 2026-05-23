'use client';

import {
  UserGroupIcon,
  AcademicCapIcon,
  DocumentCheckIcon,
  ExclamationCircleIcon,
  PaperAirplaneIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';
import type { TeacherGradebookDto } from '../api/gradebook.types';

interface GradebookStatsCardsProps {
  gradebook: TeacherGradebookDto;
}

export function GradebookStatsCards({ gradebook }: GradebookStatsCardsProps) {
  const { students, assignments, grades } = gradebook;

  // Calculate stats based on gradebook data
  const studentCount = students.length;
  const assignmentCount = assignments.length;

  // Needs Grading: submissionId exists, but no grade (draft and published points are null/undefined)
  // or status is explicitly 'SUBMITTED' / 'LATE' while draft points are not entered.
  const needsGradingCount = grades.filter(
    (g) =>
      g.submissionId &&
      (g.draftPoints === null || g.draftPoints === undefined) &&
      (g.publishedPoints === null || g.publishedPoints === undefined)
  ).length;

  // Missing: status is explicitly 'MISSING' or a non-submitted grade past due
  const missingCount = grades.filter((g) => g.status === 'MISSING').length;

  // Unpublished: draftPoints differs from publishedPoints (pending release)
  const unpublishedCount = grades.filter(
    (g) => g.draftPoints !== null && g.draftPoints !== undefined && g.draftPoints !== g.publishedPoints
  ).length;

  // Average Grade Percentage
  const gradedScores = grades.filter(
    (g) => g.publishedPoints !== null && g.publishedPoints !== undefined
  );
  const averagePercentage =
    gradedScores.length > 0
      ? Math.round(
          (gradedScores.reduce((acc, g) => acc + (g.publishedPoints || 0), 0) /
            gradedScores.reduce((acc, g) => acc + g.maxPoints, 0)) *
            100
        )
      : 0;

  const stats = [
    {
      name: 'Students Enrolled',
      value: studentCount,
      icon: UserGroupIcon,
      color: 'text-[var(--text-primary)]',
    },
    {
      name: 'Total Assignments',
      value: assignmentCount,
      icon: AcademicCapIcon,
      color: 'text-[var(--text-primary)]',
    },
    {
      name: 'Needs Grading',
      value: needsGradingCount,
      icon: DocumentCheckIcon,
      color: needsGradingCount > 0 ? 'text-[var(--fn-warning)]' : 'text-[var(--text-secondary)]',
    },
    {
      name: 'Missing Submissions',
      value: missingCount,
      icon: ExclamationCircleIcon,
      color: missingCount > 0 ? 'text-[var(--fn-error)]' : 'text-[var(--text-secondary)]',
    },
    {
      name: 'Unpublished Grades',
      value: unpublishedCount,
      icon: PaperAirplaneIcon,
      color: unpublishedCount > 0 ? 'text-[var(--fn-warning)]' : 'text-[var(--text-secondary)]',
    },
    {
      name: 'Class Average',
      value: `${averagePercentage}%`,
      icon: ChartBarIcon,
      color: 'text-[var(--text-primary)]',
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
      {stats.map((stat) => {
        const IconComponent = stat.icon;
        return (
          <div
            key={stat.name}
            className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-4 shadow-xs flex items-center justify-between transition hover:border-[var(--border-strong)]"
          >
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-faint)] block">
                {stat.name}
              </span>
              <span className={`text-xl font-extrabold block ${stat.color}`}>{stat.value}</span>
            </div>
            <div className="rounded-lg bg-[var(--bg-base)] p-2 text-[var(--text-secondary)] border border-[var(--border-subtle)] shrink-0">
              <IconComponent className="h-4 w-4" />
            </div>
          </div>
        );
      })}
    </div>
  );
}
