'use client';

import { useRouter } from 'next/navigation';
import { Loading } from '@/components/Loading';
import { useTeacherGradebook } from '@/features/gradebook/hooks/useGradebookQueries';
import { GradebookModuleSummary } from '@/features/gradebook/components/GradebookModuleSummary';
import { GradebookStatsCards } from '@/features/gradebook/components/GradebookStatsCards';
import { StudentGradesView } from '@/features/gradebook/components/StudentGradesView';
import type { CourseModuleDto } from '@/features/courses/api/canonical.types';
import type { StudentGradebookDto, TeacherGradebookDto } from '@/features/gradebook/api/gradebook.types';
import { EmptyState } from './EmptyState';

interface GradesPanelProps {
  courseId: string;
  isCourseStaff: boolean;
  courseRole?: string | null;
  modules: CourseModuleDto[];
  gradebook?: StudentGradebookDto;
}

export function GradesPanel({
  courseId,
  isCourseStaff,
  courseRole,
  modules,
  gradebook,
}: GradesPanelProps) {
  if (isCourseStaff) {
    return <GradebookSummaryPanel courseId={courseId} courseRole={courseRole} modules={modules} />;
  }

  if (!gradebook || !gradebook.modules || gradebook.modules.length === 0) {
    return <EmptyState framed title="No grades yet" description="Published grades will appear here after assignments are reviewed." />;
  }

  return <StudentGradesView gradebook={gradebook} />;
}

interface GradebookSummaryPanelProps {
  courseId: string;
  courseRole?: string | null;
  modules: CourseModuleDto[];
}

function GradebookSummaryPanel({
  courseId,
  courseRole,
  modules,
}: GradebookSummaryPanelProps) {
  const router = useRouter();
  const { data: teacherGradebook, isLoading, error } = useTeacherGradebook(courseId);

  const openFullGradebook = (assignmentId?: string) => {
    const params = new URLSearchParams({ view: 'grid' });
    if (assignmentId) params.set('assignmentId', assignmentId);
    router.push(`/courses/${courseId}/gradebook?${params.toString()}`);
  };

  const openSpeedGrader = (assignmentId: string) => {
    const params = new URLSearchParams({ view: 'speedgrader', assignmentId });
    router.push(`/courses/${courseId}/gradebook?${params.toString()}`);
  };

  if (isLoading) {
    return <Loading label="Loading gradebook summary..." />;
  }

  if (error || !teacherGradebook) {
    return <EmptyState framed title="Gradebook unavailable" description="The course gradebook summary could not be loaded." />;
  }

  return (
    <StaffGradebookSummary
      courseRole={courseRole}
      gradebook={teacherGradebook}
      modules={modules}
      onOpenFullGradebook={openFullGradebook}
      onOpenSpeedGrader={openSpeedGrader}
    />
  );
}

function StaffGradebookSummary({
  courseRole,
  gradebook,
  modules,
  onOpenFullGradebook,
  onOpenSpeedGrader,
}: {
  courseRole?: string | null;
  gradebook: TeacherGradebookDto;
  modules: CourseModuleDto[];
  onOpenFullGradebook: (assignmentId?: string) => void;
  onOpenSpeedGrader: (assignmentId: string) => void;
}) {
  const needsGrading = gradebook.grades.filter(
    (grade) =>
      grade.submissionId &&
      (grade.draftPoints === null || grade.draftPoints === undefined) &&
      (grade.publishedPoints === null || grade.publishedPoints === undefined)
  );

  return (
    <div className="space-y-6">
      <section className="rounded-lg border p-5" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-surface)' }}>
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <span className="badge">{courseRole ?? 'STAFF'} grade summary</span>
            <h2 className="mt-3 text-xl font-semibold">Gradebook Summary</h2>
            <p className="mt-1 max-w-2xl text-sm" style={{ color: 'var(--text-muted)' }}>
              A quick course grading overview. Open the full gradebook or SpeedGrader from assignment actions when deeper work is needed.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onOpenFullGradebook()}
            className="btn btn-secondary btn-sm"
          >
            Open full gradebook
          </button>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-faint)' }}>
          Course grade stats
        </h3>
        <GradebookStatsCards gradebook={gradebook} />
      </section>

      {needsGrading.length > 0 && (
        <section className="rounded-lg border p-4" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-surface)' }}>
          <h3 className="text-sm font-semibold">Needs grading</h3>
          <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
            {needsGrading.length} submitted item{needsGrading.length === 1 ? '' : 's'} waiting for evaluation.
          </p>
        </section>
      )}

      <section className="space-y-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-faint)' }}>
          Module summaries
        </h3>
        {modules.length === 0 || gradebook.assignments.length === 0 ? (
          <EmptyState framed title="No gradebook assignments" description="Assignment summaries will appear after modules and assignments are created." />
        ) : (
          modules.map((module) => (
            <GradebookModuleSummary
              key={module.id}
              module={module}
              gradebook={gradebook}
              onOpenFullGradebook={(assignmentId) => onOpenFullGradebook(assignmentId)}
              onOpenSpeedGrader={onOpenSpeedGrader}
            />
          ))
        )}
      </section>
    </div>
  );
}
