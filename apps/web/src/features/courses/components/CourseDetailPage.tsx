'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import {
  AcademicCapIcon,
  BookOpenIcon,
  ChartBarIcon,
  ChatBubbleLeftRightIcon,
  ClockIcon,
  Cog6ToothIcon,
  DocumentTextIcon,
  MagnifyingGlassIcon,
  Squares2X2Icon,
  UserGroupIcon,
  PencilIcon,
  TrashIcon,
  PlusIcon,
  UserPlusIcon,
  EnvelopeIcon,
  ArrowUpTrayIcon,
} from '@heroicons/react/24/outline';
import { Loading } from '@/components/Loading';
import {
  useCourseMembers,
  useCourseModules,
  useCourseOverview,
  useCreateModule,
  useUpdateModule,
  useDeleteModule,
  useEnrollmentGroups,
  useCourseEnrollmentGroups,
  useEnrollGroupToCourse,
  useRemoveCourseEnrollmentGroup,
  useAddCourseMember,
  useUpdateCourseMember,
  useRemoveCourseMember,
  useBulkEnrollPreview,
  useBulkEnrollConfirm,
} from '@/features/courses/hooks/useCourseQueries';
import {
  useCreateLearningItem,
  useUpdateLearningItem,
  useDeleteLearningItem,
} from '@/features/learning-items/hooks/useLearningItemQueries';
import {
  useCreateCanonicalAssignment,
  useUpdateCanonicalAssignment,
  useDeleteCanonicalAssignment,
} from '@/features/assignments/hooks/useAssignmentQueries';
import { useStudentGradebook } from '@/features/gradebook/hooks/useGradebookQueries';
import { useCurrentUser } from '@/features/users/hooks/useUserQueries';
import type { CourseMemberDto, CourseModuleDto, LearningItemDto, LearningItemRequest, ModuleRequest, AssignmentListItemDto } from '@/features/courses/api/canonical.types';
import type { AssignmentRequest } from '@/features/assignments/api/canonical.types';
import { StudentGradesView } from '@/features/gradebook/components/StudentGradesView';
import type { StudentGradebookDto } from '@/features/gradebook/api/gradebook.types';

import { ModuleFormModal } from './ModuleFormModal';
import { LearningItemFormModal } from './LearningItemFormModal';
import { DeleteConfirmationModal } from './DeleteConfirmationModal';

interface CourseDetailPageProps {
  courseId: string;
}

type TabId = 'overview' | 'modules' | 'grades' | 'members';

const tabs: Array<{ id: TabId; label: string; icon: typeof BookOpenIcon }> = [
  { id: 'overview', label: 'Overview', icon: BookOpenIcon },
  { id: 'modules', label: 'Modules', icon: Squares2X2Icon },
  { id: 'grades', label: 'Grades', icon: ChartBarIcon },
  { id: 'members', label: 'Members', icon: UserGroupIcon },
];

const emptyModules: CourseModuleDto[] = [];
const emptyMembers: CourseMemberDto[] = [];

function userRole(role?: string | null, globalRole?: string | null) {
  return String(globalRole ?? role ?? '').toUpperCase();
}

function courseCode(courseId: string) {
  return courseId.slice(0, 8).toUpperCase();
}

function formatDate(value?: string | null) {
  if (!value) return 'No date';
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value));
}

export function CourseDetailPage({ courseId }: CourseDetailPageProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [memberSearch, setMemberSearch] = useState('');
  const [todoToast, setTodoToast] = useState<string | null>(null);

  const [activeModule, setActiveModule] = useState<CourseModuleDto | null>(null);
  const [activeModuleId, setActiveModuleId] = useState<string | null>(null);
  const [activeLearningItem, setActiveLearningItem] = useState<LearningItemDto | null>(null);
  const [activeAssignment, setActiveAssignment] = useState<any | null>(null);
  const [isModuleModalOpen, setIsModuleModalOpen] = useState(false);
  const [isLearningItemModalOpen, setIsLearningItemModalOpen] = useState(false);
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteItemName, setDeleteItemName] = useState('');
  const [deleteItemType, setDeleteItemType] = useState<'module' | 'material' | 'assignment'>('module');
  const [deleteItemId, setDeleteItemId] = useState('');

  const createModuleMutation = useCreateModule(courseId);
  const updateModuleMutation = useUpdateModule(courseId);
  const deleteModuleMutation = useDeleteModule(courseId);

  const createLearningItemMutation = useCreateLearningItem();
  const updateLearningItemMutation = useUpdateLearningItem();
  const deleteLearningItemMutation = useDeleteLearningItem();

  const createAssignmentMutation = useCreateCanonicalAssignment();
  const updateAssignmentMutation = useUpdateCanonicalAssignment();
  const deleteAssignmentMutation = useDeleteCanonicalAssignment();

  const handleModuleSubmit = async (request: ModuleRequest) => {
    if (activeModule) {
      await updateModuleMutation.mutateAsync({ moduleId: activeModule.id, request });
      showToast('Module updated successfully.');
    } else {
      await createModuleMutation.mutateAsync(request);
      showToast('Module created successfully.');
    }
  };

  const handleDeleteModule = (moduleId: string) => {
    const mod = modules.find((m) => m.id === moduleId);
    if (!mod) return;
    setDeleteItemId(moduleId);
    setDeleteItemName(mod.title);
    setDeleteItemType('module');
    setIsDeleteModalOpen(true);
  };

  const handleLearningItemSubmit = async (request: LearningItemRequest) => {
    if (activeLearningItem) {
      await updateLearningItemMutation.mutateAsync({
        learningItemId: activeLearningItem.id,
        request,
        courseId,
      });
      showToast('Learning item updated successfully.');
    } else if (activeModuleId) {
      await createLearningItemMutation.mutateAsync({
        courseId,
        moduleId: activeModuleId,
        request,
      });
      showToast('Learning item created successfully.');
    }
  };

  const handleCreateEditorItem = async (request: LearningItemRequest): Promise<string> => {
    if (!activeModuleId) throw new Error('No module selected');
    const created = await createLearningItemMutation.mutateAsync({
      courseId,
      moduleId: activeModuleId,
      request,
    });
    return (created as any).id as string;
  };

  const handleDeleteLearningItem = (learningItemId: string) => {
    let foundTitle = 'Learning Material';
    for (const mod of modules) {
      const item = mod.learningItems.find((i) => i.id === learningItemId);
      if (item) {
        foundTitle = item.title;
        break;
      }
    }
    setDeleteItemId(learningItemId);
    setDeleteItemName(foundTitle);
    setDeleteItemType('material');
    setIsDeleteModalOpen(true);
  };

  const handleAssignmentSubmit = async (request: AssignmentRequest) => {
    if (activeAssignment) {
      await updateAssignmentMutation.mutateAsync({
        assignmentId: activeAssignment.id,
        request,
      });
      showToast('Assignment updated successfully.');
    } else if (activeModuleId) {
      await createAssignmentMutation.mutateAsync({
        courseId,
        moduleId: activeModuleId,
        request,
      });
      showToast('Assignment created successfully.');
    }
  };

  const handleDeleteAssignment = (assignmentId: string) => {
    let foundTitle = 'Assignment';
    for (const mod of modules) {
      const ass = mod.assignments.find((a) => a.id === assignmentId);
      if (ass) {
        foundTitle = ass.title;
        break;
      }
    }
    setDeleteItemId(assignmentId);
    setDeleteItemName(foundTitle);
    setDeleteItemType('assignment');
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (deleteItemType === 'module') {
      await deleteModuleMutation.mutateAsync(deleteItemId);
      showToast('Module deleted successfully.');
    } else if (deleteItemType === 'material') {
      await deleteLearningItemMutation.mutateAsync({ learningItemId: deleteItemId, courseId });
      showToast('Learning item archived successfully.');
    } else if (deleteItemType === 'assignment') {
      await deleteAssignmentMutation.mutateAsync({ assignmentId: deleteItemId, courseId });
      showToast('Assignment archived successfully.');
    }
  };

  const { data: currentUser, isLoading: isUserLoading } = useCurrentUser();
  const { data: overview, isLoading: isOverviewLoading, error: overviewError } = useCourseOverview(courseId);
  const { data: modulesData, isLoading: isModulesLoading, error: modulesError } = useCourseModules(courseId);
  const { data: membersPage } = useCourseMembers(courseId, { size: 100 });
  const { data: gradebook } = useStudentGradebook(courseId);

  const globalRole = userRole(currentUser?.role, currentUser?.globalRole);
  const modules = modulesData?.items ?? emptyModules;
  const members = membersPage?.content ?? emptyMembers;

  const currentCourseMember = useMemo(() => {
    if (!currentUser) return null;
    return members.find((member) => member.userId === currentUser.id) ?? null;
  }, [members, currentUser]);

  const courseRole = currentCourseMember?.roleInCourse;
  const isCourseStaff = globalRole === 'ADMIN' || courseRole === 'OWNER' || courseRole === 'TEACHER' || courseRole === 'TA';

  const filteredMembers = useMemo(() => {
    const query = memberSearch.trim().toLowerCase();
    if (!query) return members;
    return members.filter((member) =>
      [member.userName, member.userEmail, member.roleInCourse, member.enrollmentStatus]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    );
  }, [members, memberSearch]);

  const isForbidden = useMemo(() => {
    const err = overviewError as { status?: number; response?: { status?: number } } | null;
    return (err?.status || err?.response?.status) === 403;
  }, [overviewError]);

  const isLoading = isUserLoading || isOverviewLoading || isModulesLoading;
  const hasError = (overviewError && !isForbidden) || modulesError;

  const showToast = (message: string) => {
    setTodoToast(message);
    setTimeout(() => setTodoToast(null), 3000);
  };

  if (isLoading) {
    return <Loading label="Loading course..." />;
  }

  if (isForbidden) {
    return (
      <section className="card mx-auto max-w-2xl">
        <div className="card-body text-center">
          <AcademicCapIcon className="mx-auto h-10 w-10" style={{ color: 'var(--fn-warning)' }} />
          <h1 className="mt-4 text-lg font-semibold">Access restricted</h1>
          <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>
            This course is available only to enrolled students and authorized teaching staff.
          </p>
          <Link href="/courses" className="btn btn-secondary mt-5 inline-flex">
            Return to courses
          </Link>
        </div>
      </section>
    );
  }

  if (hasError || !overview) {
    return (
      <section className="card mx-auto max-w-3xl">
        <div className="card-body">
          <h1 className="text-lg font-semibold">Failed to load course</h1>
          <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>
            The canonical course endpoints did not return a usable response.
          </p>
          <button type="button" onClick={() => window.location.reload()} className="btn btn-secondary mt-4">
            Retry
          </button>
        </div>
      </section>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-10">
      {todoToast && (
        <div
          className="fixed bottom-5 right-5 z-50 rounded-md border px-4 py-3 text-sm shadow-lg"
          style={{
            borderColor: 'var(--border-default)',
            background: 'var(--bg-surface)',
            color: 'var(--text-primary)',
          }}
        >
          {todoToast}
        </div>
      )}

      <CourseHeader
        courseId={courseId}
        title={overview.title}
        description={overview.description}
        teacherName={overview.teacherName}
        moduleCount={modules.length}
        progress={overview.progress}
        courseRole={courseRole}
      />

      {isCourseStaff && (
        <StaffToolbar
          courseId={courseId}
          onAddModule={() => {
            setActiveModule(null);
            setIsModuleModalOpen(true);
          }}
          onAddLearningItem={() => {
            if (modules.length === 0) {
              showToast('Please create a module first.');
              return;
            }
            setActiveModuleId(modules[0].id);
            setActiveLearningItem(null);
            setIsLearningItemModalOpen(true);
          }}
          onAddAssignment={() => {
            if (modules.length === 0) {
              showToast('Please create a module first.');
              return;
            }
            router.push(`/courses/${courseId}/assignment-wizard?moduleId=${modules[0].id}`);
          }}
        />
      )}

      <nav className="flex flex-wrap gap-2 border-b pb-0" style={{ borderColor: 'var(--border-default)' }}>
        {tabs.map((tab) => (
          <TabButton
            key={tab.id}
            tab={tab}
            active={activeTab === tab.id}
            count={tab.id === 'modules' ? modules.length : tab.id === 'members' ? members.length : undefined}
            onClick={() => setActiveTab(tab.id)}
          />
        ))}
      </nav>

      {activeTab === 'overview' && (
        <OverviewPanel
          description={overview.description}
          deadlines={overview.upcomingDeadlines ?? []}
          feedback={overview.recentFeedback ?? []}
        />
      )}

      {activeTab === 'modules' && (
        <ModulesPanel
          modules={modules}
          courseId={courseId}
          isCourseStaff={isCourseStaff}
          onEditModule={(mod) => {
            setActiveModule(mod);
            setIsModuleModalOpen(true);
          }}
          onDeleteModule={handleDeleteModule}
          onAddLearningItem={(moduleId) => {
            setActiveModuleId(moduleId);
            setActiveLearningItem(null);
            setIsLearningItemModalOpen(true);
          }}
          onEditLearningItem={(item, moduleId) => {
            setActiveModuleId(moduleId);
            setActiveLearningItem(item);
            setIsLearningItemModalOpen(true);
          }}
          onDeleteLearningItem={handleDeleteLearningItem}
          onAddAssignment={(moduleId) => {
            router.push(`/courses/${courseId}/assignment-wizard?moduleId=${moduleId}`);
          }}
          onEditAssignment={(assignment) => {
            router.push(`/courses/${courseId}/assignment-wizard?assignmentId=${assignment.id}`);
          }}
          onDeleteAssignment={handleDeleteAssignment}
        />
      )}

      {activeTab === 'grades' && (
        <GradesPanel courseId={courseId} isCourseStaff={isCourseStaff} gradebook={gradebook} />
      )}

      {activeTab === 'members' && (
        <MembersPanel courseId={courseId} currentUser={currentUser} userMember={currentCourseMember} />
      )}

      {isModuleModalOpen && (
        <ModuleFormModal
          isOpen={isModuleModalOpen}
          onClose={() => setIsModuleModalOpen(false)}
          onSubmit={handleModuleSubmit}
          initialData={activeModule}
          loading={createModuleMutation.isPending || updateModuleMutation.isPending}
        />
      )}

      {isLearningItemModalOpen && (
        <LearningItemFormModal
          isOpen={isLearningItemModalOpen}
          onClose={() => setIsLearningItemModalOpen(false)}
          onSubmit={handleLearningItemSubmit}
          onCreateEditorItem={handleCreateEditorItem}
          courseId={courseId}
          initialData={activeLearningItem}
          loading={createLearningItemMutation.isPending || updateLearningItemMutation.isPending}
        />
      )}



      {isDeleteModalOpen && (
        <DeleteConfirmationModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={handleConfirmDelete}
          itemName={deleteItemName}
          itemType={deleteItemType}
          loading={deleteModuleMutation.isPending || deleteLearningItemMutation.isPending || deleteAssignmentMutation.isPending}
        />
      )}
    </div>
  );
}

function CourseHeader({
  courseId,
  title,
  description,
  teacherName,
  moduleCount,
  progress,
  courseRole,
}: {
  courseId: string;
  title: string;
  description?: string | null;
  teacherName?: string | null;
  moduleCount: number;
  progress?: number | null;
  courseRole?: string | null;
}) {
  return (
    <header className="rounded-lg border p-5 md:p-6" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-surface)' }}>
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap gap-2">
            <span className="badge">Course code: {courseCode(courseId)}</span>
            {courseRole && <span className="badge">{courseRole}</span>}
          </div>
          <h1 className="mt-4 text-3xl font-semibold md:text-4xl">{title}</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6" style={{ color: 'var(--text-muted)' }}>
            {description || 'No course description has been registered yet.'}
          </p>
        </div>

        <div className="grid min-w-72 gap-2 sm:grid-cols-3 lg:min-w-[28rem]">
          <Metric label="Instructor" value={teacherName || 'Faculty'} />
          <Metric label="Modules" value={String(moduleCount)} />
          <Metric label="Progress" value={`${progress ?? 0}%`} />
        </div>
      </div>
    </header>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border px-3 py-2" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-base)' }}>
      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</p>
      <p className="mt-1 truncate text-sm font-semibold">{value}</p>
    </div>
  );
}

function StaffToolbar({
  courseId,
  onAddModule,
  onAddLearningItem,
  onAddAssignment,
}: {
  courseId: string;
  onAddModule: () => void;
  onAddLearningItem: () => void;
  onAddAssignment: () => void;
}) {
  return (
    <section className="card">
      <div className="card-body flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md" style={{ background: 'var(--bg-overlay)' }}>
            <Cog6ToothIcon className="h-5 w-5" style={{ color: 'var(--text-secondary)' }} />
          </div>
          <div>
            <h2 className="text-sm font-semibold">Course staff tools</h2>
            <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
              Manage modules, learning items, assignments and members.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn btn-secondary" onClick={onAddModule}>
            Manage modules
          </button>
          <button type="button" className="btn btn-primary" onClick={onAddLearningItem}>
            + Learning item
          </button>
          <button type="button" className="btn btn-primary" onClick={onAddAssignment}>
            + Assignment
          </button>
          <Link href={`/courses/${courseId}/gradebook`} className="btn btn-secondary">
            Open gradebook
          </Link>
        </div>
      </div>
    </section>
  );
}

function TabButton({
  tab,
  active,
  count,
  onClick,
}: {
  tab: { id: TabId; label: string; icon: typeof BookOpenIcon };
  active: boolean;
  count?: number;
  onClick: () => void;
}) {
  const Icon = tab.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors"
      style={{
        borderColor: active ? 'var(--text-primary)' : 'transparent',
        color: active ? 'var(--text-primary)' : 'var(--text-muted)',
      }}
    >
      <Icon className="h-4 w-4" />
      {tab.label}
      {count !== undefined && <span style={{ color: 'var(--text-faint)' }}>({count})</span>}
    </button>
  );
}

function OverviewPanel({
  description,
  deadlines,
  feedback,
}: {
  description?: string | null;
  deadlines: Array<{ assignmentId: string; title: string; dueDate?: string | null }>;
  feedback: string[];
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(18rem,1fr)]">
      <div className="space-y-6">
        <section className="card">
          <div className="card-header">
            <SectionTitle icon={DocumentTextIcon} title="About course" />
          </div>
          <div className="card-body">
            <p className="whitespace-pre-line text-sm leading-6" style={{ color: 'var(--text-muted)' }}>
              {description || 'No summary syllabus has been provided for this course.'}
            </p>
          </div>
        </section>

        <section className="card">
          <div className="card-header">
            <SectionTitle icon={ChatBubbleLeftRightIcon} title="Recent feedback" />
          </div>
          <div className="card-body space-y-3">
            {feedback.length > 0 ? (
              feedback.map((item, index) => (
                <p key={`${item}-${index}`} className="rounded-md border px-3 py-2 text-sm" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-base)', color: 'var(--text-muted)' }}>
                  {item}
                </p>
              ))
            ) : (
              <EmptyState title="No feedback yet" description="Recent instructor comments will appear here." />
            )}
          </div>
        </section>
      </div>

      <section className="card">
        <div className="card-header">
          <SectionTitle icon={ClockIcon} title="Upcoming due dates" />
        </div>
        <div className="card-body space-y-3">
          {deadlines.length > 0 ? (
            deadlines.map((deadline) => (
              <Link
                key={deadline.assignmentId}
                href={`/assignments/${deadline.assignmentId}`}
                className="block rounded-md border px-3 py-2 transition-colors"
                style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-base)' }}
              >
                <p className="text-sm font-medium">{deadline.title}</p>
                <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>{formatDate(deadline.dueDate)}</p>
              </Link>
            ))
          ) : (
            <EmptyState title="No close due dates" description="Assignments with upcoming deadlines will appear here." />
          )}
        </div>
      </section>
    </div>
  );
}

function ModulesPanel({
  modules,
  courseId,
  isCourseStaff,
  onEditModule,
  onDeleteModule,
  onAddLearningItem,
  onEditLearningItem,
  onDeleteLearningItem,
  onAddAssignment,
  onEditAssignment,
  onDeleteAssignment,
}: {
  modules: CourseModuleDto[];
  courseId: string;
  isCourseStaff: boolean;
  onEditModule: (module: CourseModuleDto) => void;
  onDeleteModule: (moduleId: string) => void;
  onAddLearningItem: (moduleId: string) => void;
  onEditLearningItem: (item: LearningItemDto, moduleId: string) => void;
  onDeleteLearningItem: (itemId: string) => void;
  onAddAssignment: (moduleId: string) => void;
  onEditAssignment: (assignment: AssignmentListItemDto, moduleId: string) => void;
  onDeleteAssignment: (assignmentId: string) => void;
}) {
  if (modules.length === 0) {
    return <EmptyState framed title="No modules yet" description="There are no active modules registered for this course." />;
  }

  return (
    <div className="space-y-4">
      {modules.map((module) => (
        <article key={module.id} className="card">
          <div className="card-header flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="flex items-start gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-faint)' }}>
                  Module {module.order}
                </p>
                <h2 className="mt-1 text-lg font-semibold">{module.title}</h2>
                {module.description && <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>{module.description}</p>}
              </div>
              {isCourseStaff && (
                <div className="flex gap-1 ml-4 mt-5">
                  <button
                    onClick={() => onEditModule(module)}
                    className="p-1 rounded-md text-[var(--text-secondary)] hover:bg-[var(--bg-overlay)] hover:text-[var(--text-primary)] transition cursor-pointer"
                    title="Edit Module"
                  >
                    <PencilIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => onDeleteModule(module.id)}
                    className="p-1 rounded-md text-red-500 hover:bg-red-500/10 transition cursor-pointer"
                    title="Delete Module"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
            {isCourseStaff && <span className="badge">{module.availabilityStatus || 'VISIBLE'}</span>}
          </div>

          <div className="card-body grid gap-6 lg:grid-cols-2">
            <ModuleColumn
              title="Learning materials"
              count={module.learningItems.length}
              isCourseStaff={isCourseStaff}
              onAddClick={() => onAddLearningItem(module.id)}
            >
              {module.learningItems.length > 0 ? (
                module.learningItems.map((item) => (
                  <div
                    key={item.id}
                    className="group relative flex items-center justify-between gap-2 rounded-md border px-3 py-2 transition hover:bg-[var(--bg-overlay)]"
                    style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-base)' }}
                  >
                    <Link href={`/learning-items/${item.id}?courseId=${courseId}`} className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.title}</p>
                      <p className="mt-1 line-clamp-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                        {item.description || String(item.type).toUpperCase()}
                      </p>
                    </Link>
                    {isCourseStaff && (
                      <div className="flex gap-1 shrink-0 ml-2">
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            onEditLearningItem(item, module.id);
                          }}
                          className="p-1 rounded-md text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)] transition cursor-pointer"
                          title="Edit Material"
                        >
                          <PencilIcon className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            onDeleteLearningItem(item.id);
                          }}
                          className="p-1 rounded-md text-red-500 hover:bg-red-500/10 transition cursor-pointer"
                          title="Delete Material"
                        >
                          <TrashIcon className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <EmptyState title="No learning items" description="Materials will appear here." />
              )}
            </ModuleColumn>

            <ModuleColumn
              title="Assignments"
              count={module.assignments.length}
              isCourseStaff={isCourseStaff}
              onAddClick={() => onAddAssignment(module.id)}
            >
              {module.assignments.length > 0 ? (
                module.assignments.map((assignment) => (
                  <div
                    key={assignment.id}
                    className="group relative flex items-center justify-between gap-2 rounded-md border px-3 py-2 transition hover:bg-[var(--bg-overlay)]"
                    style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-base)' }}
                  >
                    <Link href={`/assignments/${assignment.id}`} className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{assignment.title}</p>
                          <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                            {String(assignment.type).replaceAll('_', ' ')} · {assignment.maxPoints} pts
                          </p>
                        </div>
                        <span className="badge">{assignment.grade?.points ?? assignment.status}</span>
                      </div>
                    </Link>
                    {isCourseStaff && (
                      <div className="flex gap-1 shrink-0 ml-2">
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            onEditAssignment(assignment, module.id);
                          }}
                          className="p-1 rounded-md text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)] transition cursor-pointer"
                          title="Edit Assignment"
                        >
                          <PencilIcon className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            onDeleteAssignment(assignment.id);
                          }}
                          className="p-1 rounded-md text-red-500 hover:bg-red-500/10 transition cursor-pointer"
                          title="Delete Assignment"
                        >
                          <TrashIcon className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <EmptyState title="No assignments" description="Assignments will appear here." />
              )}
            </ModuleColumn>
          </div>
        </article>
      ))}
    </div>
  );
}

function ModuleColumn({
  title,
  count,
  onAddClick,
  isCourseStaff,
  children,
}: {
  title: string;
  count: number;
  onAddClick?: () => void;
  isCourseStaff?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between border-b pb-2" style={{ borderColor: 'var(--border-subtle)' }}>
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">{title}</h3>
          <span className="text-xs px-1.5 py-0.5 rounded-full bg-[var(--bg-base)] border border-[var(--border-subtle)]" style={{ color: 'var(--text-muted)' }}>{count}</span>
        </div>
        {isCourseStaff && onAddClick && (
          <button
            onClick={onAddClick}
            className="flex items-center gap-1 text-xs font-semibold text-[var(--text-primary)] hover:underline cursor-pointer"
          >
            <PlusIcon className="h-3 w-3" /> Add
          </button>
        )}
      </div>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function GradesPanel({
  courseId,
  isCourseStaff,
  gradebook,
}: {
  courseId: string;
  isCourseStaff: boolean;
  gradebook?: StudentGradebookDto;
}) {
  if (isCourseStaff) {
    return (
      <section className="card">
        <div className="card-body flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Teacher gradebook</h2>
            <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
              Review students, draft points, and publish grades from the course gradebook.
            </p>
          </div>
          <Link href={`/courses/${courseId}/gradebook`} className="btn btn-primary">
            Open gradebook
          </Link>
        </div>
      </section>
    );
  }

  if (!gradebook || !gradebook.modules || gradebook.modules.length === 0) {
    return <EmptyState framed title="No grades yet" description="Published grades will appear here after assignments are reviewed." />;
  }

  return <StudentGradesView gradebook={gradebook} />;
}

function MembersPanel({
  courseId,
  currentUser,
  userMember,
}: {
  courseId: string;
  currentUser: any;
  userMember: any;
}) {
  const { data: membersPage, isLoading: isMembersLoading } = useCourseMembers(courseId, { size: 200 });
  const members = membersPage?.content ?? [];

  const addMemberMutation = useAddCourseMember(courseId);
  const updateMemberMutation = useUpdateCourseMember(courseId);
  const removeMemberMutation = useRemoveCourseMember(courseId);

  const { data: enrolledGroups, isLoading: isGroupsLoading } = useCourseEnrollmentGroups(courseId);
  const { data: globalGroups } = useEnrollmentGroups();
  const enrollGroupMutation = useEnrollGroupToCourse(courseId);
  const removeGroupMutation = useRemoveCourseEnrollmentGroup(courseId);

  const bulkPreviewMutation = useBulkEnrollPreview(courseId);
  const bulkConfirmMutation = useBulkEnrollConfirm(courseId);

  const [search, setSearch] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isGroupOpen, setIsGroupOpen] = useState(false);
  const [isBulkOpen, setIsBulkOpen] = useState(false);

  const [addEmail, setAddEmail] = useState('');
  const [addRole, setAddRole] = useState<'TEACHER' | 'TA' | 'STUDENT'>('STUDENT');

  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [csvText, setCsvText] = useState('');
  const [bulkPreview, setBulkPreview] = useState<any | null>(null);

  // Security roles
  const isAdmin = currentUser?.globalRole === 'ADMIN' || currentUser?.role === 'ADMIN';
  const isOwner = userMember?.roleInCourse === 'OWNER';
  const isTeacher = userMember?.roleInCourse === 'TEACHER';
  const isTA = userMember?.roleInCourse === 'TA';

  const canManageAny = isAdmin || isOwner;
  const canManageStudents = canManageAny || isTeacher;

  // Split staff and students
  const staffMembers = members.filter(
    (m) => m.roleInCourse === 'OWNER' || m.roleInCourse === 'TEACHER' || m.roleInCourse === 'TA'
  );
  
  const studentMembers = members.filter((m) => m.roleInCourse === 'STUDENT');

  const filteredStudents = studentMembers.filter(
    (m) =>
      (m.userName?.toLowerCase() ?? '').includes(search.toLowerCase()) ||
      (m.userEmail?.toLowerCase() ?? '').includes(search.toLowerCase())
  );

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addEmail.trim()) return;
    try {
      await addMemberMutation.mutateAsync({
        email: addEmail.trim(),
        roleInCourse: addRole,
      } as any);
      setAddEmail('');
      setIsAddOpen(false);
      alert('Member enrolled successfully.');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to add member');
    }
  };

  const handleRoleChange = async (member: any, newRole: string) => {
    if (member.roleInCourse === 'OWNER' && !confirm('Are you sure you want to change the owner role? This will transfer ownership.')) {
      return;
    }
    try {
      await updateMemberMutation.mutateAsync({
        userId: member.userId,
        request: {
          userId: member.userId,
          roleInCourse: newRole as any,
        },
      });
      alert('Role updated successfully.');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update role');
    }
  };

  const handleRemoveMember = async (member: any) => {
    if (!confirm(`Are you sure you want to remove ${member.userName || 'this member'} from the course?`)) {
      return;
    }
    try {
      await removeMemberMutation.mutateAsync(member.userId);
      alert('Member removed successfully.');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to remove member');
    }
  };

  const handleEnrollGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroupId) return;
    try {
      await enrollGroupMutation.mutateAsync(selectedGroupId);
      setSelectedGroupId('');
      setIsGroupOpen(false);
      alert('Group enrolled successfully.');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to enroll group');
    }
  };

  const handleUnlinkGroup = async (groupId: string, groupName: string) => {
    if (!confirm(`Are you sure you want to unlink group ${groupName}? Active students enrolled via this group will remain enrolled in the course.`)) {
      return;
    }
    try {
      await removeGroupMutation.mutateAsync(groupId);
      alert('Group unlinked successfully.');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to unlink group');
    }
  };

  const handleCsvParse = async () => {
    if (!csvText.trim()) return;
    // Parse CSV
    const lines = csvText.split('\n');
    const rows: Array<{ email: string; role: string }> = [];
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const parts = trimmed.split(',');
      const email = parts[0]?.trim();
      const role = parts[1]?.trim() || 'STUDENT';
      if (email && email.includes('@')) {
        rows.push({ email, role });
      }
    }

    if (rows.length === 0) {
      alert('No valid email rows found. Format: email,role (one per line)');
      return;
    }

    try {
      const preview = await bulkPreviewMutation.mutateAsync(rows);
      setBulkPreview(preview);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to parse CSV');
    }
  };

  const handleBulkConfirm = async () => {
    if (!bulkPreview || bulkPreview.validRows.length === 0) return;
    const enrollments = bulkPreview.validRows.map((r: any) => ({
      userId: r.userId,
      role: r.role,
    }));
    try {
      await bulkConfirmMutation.mutateAsync(enrollments);
      alert(`Successfully enrolled ${enrollments.length} members.`);
      setIsBulkOpen(false);
      setCsvText('');
      setBulkPreview(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to confirm bulk enrollment');
    }
  };

  if (isMembersLoading) {
    return <Loading />;
  }

  return (
    <div className="space-y-6">
      {/* Metrics Header */}
      <section className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <div className="rounded-lg border p-3 text-center" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-surface)' }}>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Total Enrolled</p>
          <p className="text-lg font-bold mt-1">{members.length}</p>
        </div>
        <div className="rounded-lg border p-3 text-center" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-surface)' }}>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Teaching Staff</p>
          <p className="text-lg font-bold mt-1">{staffMembers.length}</p>
        </div>
        <div className="rounded-lg border p-3 text-center" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-surface)' }}>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Students</p>
          <p className="text-lg font-bold mt-1">{studentMembers.length}</p>
        </div>
        <div className="rounded-lg border p-3 text-center" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-surface)' }}>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Enrolled Groups</p>
          <p className="text-lg font-bold mt-1">{enrolledGroups?.length ?? 0}</p>
        </div>
      </section>

      {/* Action Bar */}
      {canManageStudents && (
        <section className="flex flex-wrap gap-2 justify-end">
          <button
            type="button"
            onClick={() => setIsAddOpen(true)}
            className="button text-xs py-1.5 px-3 flex items-center gap-1.5"
            style={{ background: 'var(--bg-active)', border: '1px solid var(--border-default)' }}
          >
            <UserPlusIcon className="h-4 w-4" />
            <span>Add member</span>
          </button>
          <button
            type="button"
            onClick={() => setIsBulkOpen(true)}
            className="button text-xs py-1.5 px-3 flex items-center gap-1.5"
            style={{ background: 'var(--bg-active)', border: '1px solid var(--border-default)' }}
          >
            <ArrowUpTrayIcon className="h-4 w-4" />
            <span>Bulk CSV</span>
          </button>
          <button
            type="button"
            onClick={() => setIsGroupOpen(true)}
            className="button text-xs py-1.5 px-3 flex items-center gap-1.5"
            style={{ background: 'var(--bg-active)', border: '1px solid var(--border-default)' }}
          >
            <UserGroupIcon className="h-4 w-4" />
            <span>Add group</span>
          </button>
        </section>
      )}

      {/* Course Staff Card List */}
      <section className="card">
        <div className="card-header border-b p-3" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-base)' }}>
          <h2 className="text-sm font-semibold">Course teaching staff</h2>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Owners, Teachers, and operational Teaching Assistants.</p>
        </div>
        <div className="card-body p-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {staffMembers.map((m) => (
            <div
              key={m.id}
              className="rounded-lg border p-3 flex flex-col justify-between gap-3"
              style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-surface)' }}
            >
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full font-bold text-sm flex items-center justify-center shrink-0" style={{ background: 'var(--bg-active)', color: 'var(--text-secondary)' }}>
                  {(m.userName || m.userEmail || 'CM').slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{m.userName || 'Staff Member'}</p>
                  <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{m.userEmail || 'No email'}</p>
                </div>
              </div>

              <div className="flex items-center justify-between border-t pt-2" style={{ borderColor: 'var(--border-subtle)' }}>
                <span className="badge text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ background: 'var(--bg-active)' }}>
                  {m.roleInCourse}
                </span>

                {canManageAny && (
                  <div className="flex items-center gap-2">
                    {m.roleInCourse !== 'OWNER' && (
                      <select
                        value={m.roleInCourse}
                        onChange={(e) => handleRoleChange(m, e.target.value)}
                        className="input text-[11px] py-0.5 px-1 bg-transparent border rounded"
                      >
                        <option value="TEACHER">TEACHER</option>
                        <option value="TA">TA</option>
                        <option value="STUDENT">STUDENT</option>
                      </select>
                    )}
                    {m.roleInCourse !== 'OWNER' && (
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(m)}
                        className="p-1 rounded text-red-500 hover:bg-red-500/10 transition-colors"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Students Table Section */}
      <section className="card">
        <div className="card-header flex flex-col gap-3 md:flex-row md:items-center md:justify-between border-b p-3" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-base)' }}>
          <div>
            <h2 className="text-sm font-semibold">Enrolled students</h2>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Search and manage students enrolled in the course.</p>
          </div>
          <input
            placeholder="Search students..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input text-xs max-w-xs"
          />
        </div>
        <div className="card-body p-0">
          {filteredStudents.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead style={{ background: 'var(--bg-surface)', color: 'var(--text-muted)' }}>
                  <tr className="border-b" style={{ borderColor: 'var(--border-subtle)' }}>
                    <th className="px-4 py-2 font-medium">Name</th>
                    <th className="px-4 py-2 font-medium">Email</th>
                    <th className="px-4 py-2 font-medium">Enrollment Date</th>
                    {canManageStudents && <th className="px-4 py-2 font-medium text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
                  {filteredStudents.map((s) => (
                    <tr key={s.id} className="hover:bg-hover transition-colors">
                      <td className="px-4 py-2.5 font-medium">{s.userName || 'Student'}</td>
                      <td className="px-4 py-2.5" style={{ color: 'var(--text-muted)' }}>{s.userEmail || 'No email'}</td>
                      <td className="px-4 py-2.5" style={{ color: 'var(--text-muted)' }}>{formatDate(s.addedAt)}</td>
                      {canManageStudents && (
                        <td className="px-4 py-2.5 text-right flex items-center justify-end gap-2">
                          <select
                            value={s.roleInCourse}
                            onChange={(e) => handleRoleChange(s, e.target.value)}
                            className="input text-[11px] py-0.5 px-1 bg-transparent border rounded"
                          >
                            <option value="STUDENT">STUDENT</option>
                            {canManageAny && <option value="TEACHER">TEACHER</option>}
                            {canManageAny && <option value="TA">TA</option>}
                          </select>
                          <button
                            type="button"
                            onClick={() => handleRemoveMember(s)}
                            className="p-1 rounded text-red-500 hover:bg-red-500/10 transition-colors"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
              No students found matching the query.
            </div>
          )}
        </div>
      </section>

      {/* Enrolled Groups Section */}
      <section className="card">
        <div className="card-header border-b p-3" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-base)' }}>
          <h2 className="text-sm font-semibold">Enrolled Groups</h2>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Enrollment groups linked to this course. Unlinking groups does not unenroll active students.</p>
        </div>
        <div className="card-body p-0">
          {isGroupsLoading ? (
            <Loading />
          ) : enrolledGroups && enrolledGroups.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead style={{ background: 'var(--bg-surface)', color: 'var(--text-muted)' }}>
                  <tr className="border-b" style={{ borderColor: 'var(--border-subtle)' }}>
                    <th className="px-4 py-2 font-medium">Group Name</th>
                    <th className="px-4 py-2 font-medium">Registered Members</th>
                    {canManageStudents && <th className="px-4 py-2 font-medium text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
                  {enrolledGroups.map((g) => (
                    <tr key={g.id} className="hover:bg-hover transition-colors">
                      <td className="px-4 py-2.5 font-medium">{g.name}</td>
                      <td className="px-4 py-2.5 font-medium" style={{ color: 'var(--text-muted)' }}>{g.memberCount}</td>
                      {canManageStudents && (
                        <td className="px-4 py-2.5 text-right">
                          <button
                            type="button"
                            onClick={() => handleUnlinkGroup(g.id, g.name)}
                            className="text-xs text-red-500 hover:underline inline-flex items-center gap-1.5"
                          >
                            <TrashIcon className="h-3.5 w-3.5" />
                            <span>Unlink group</span>
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
              No groups enrolled in this course yet.
            </div>
          )}
        </div>
      </section>

      {/* Add Member Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="rounded-lg border max-w-md w-full p-4 space-y-4" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-surface)' }}>
            <h3 className="text-sm font-semibold">Add course member</h3>
            <form onSubmit={handleAddMember} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold block" style={{ color: 'var(--text-secondary)' }}>User Email</label>
                <div className="relative">
                  <EnvelopeIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: 'var(--text-faint)' }} />
                  <input
                    type="email"
                    placeholder="e.g. user@university.edu"
                    value={addEmail}
                    onChange={(e) => setAddEmail(e.target.value)}
                    className="input text-xs"
                    style={{ paddingLeft: '2.5rem' }}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold block" style={{ color: 'var(--text-secondary)' }}>Course Role</label>
                <select
                  value={addRole}
                  onChange={(e) => setAddRole(e.target.value as any)}
                  className="input text-xs"
                >
                  <option value="STUDENT">STUDENT</option>
                  {canManageAny && <option value="TEACHER">TEACHER</option>}
                  {canManageAny && <option value="TA">TA</option>}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="button text-xs py-1.5 px-3"
                  style={{ background: 'transparent', border: '1px solid var(--border-default)' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addMemberMutation.isPending}
                  className="button text-xs py-1.5 px-3"
                  style={{ background: 'var(--bg-active)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                >
                  {addMemberMutation.isPending ? 'Enrolling...' : 'Enroll Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Group Modal */}
      {isGroupOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="rounded-lg border max-w-md w-full p-4 space-y-4" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-surface)' }}>
            <h3 className="text-sm font-semibold">Enroll existing group</h3>
            <form onSubmit={handleEnrollGroup} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold block" style={{ color: 'var(--text-secondary)' }}>Select Group</label>
                <select
                  value={selectedGroupId}
                  onChange={(e) => setSelectedGroupId(e.target.value)}
                  className="input text-xs"
                  required
                >
                  <option value="">-- Choose enrollment group --</option>
                  {globalGroups
                    ?.filter((g) => !enrolledGroups?.some((eg) => eg.id === g.id))
                    .map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name} ({g.memberCount} members)
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsGroupOpen(false)}
                  className="button text-xs py-1.5 px-3"
                  style={{ background: 'transparent', border: '1px solid var(--border-default)' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={enrollGroupMutation.isPending}
                  className="button text-xs py-1.5 px-3"
                  style={{ background: 'var(--bg-active)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                >
                  {enrollGroupMutation.isPending ? 'Enrolling...' : 'Enroll Group'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk CSV Modal */}
      {isBulkOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
          <div className="rounded-lg border max-w-2xl w-full p-4 space-y-4 my-8" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-surface)' }}>
            <h3 className="text-sm font-semibold">Bulk enroll students via CSV</h3>
            
            <div className="space-y-2">
              <label className="text-xs font-semibold block" style={{ color: 'var(--text-secondary)' }}>
                Format: <code className="px-1 rounded" style={{ background: 'var(--bg-active)' }}>email,role</code> (role defaults to STUDENT, OWNER is not allowed)
              </label>
              <textarea
                rows={6}
                placeholder="student1@university.edu,STUDENT&#10;student2@university.edu&#10;teacher@university.edu,TEACHER"
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                className="input text-xs font-mono py-2"
              />
              <button
                type="button"
                onClick={handleCsvParse}
                disabled={bulkPreviewMutation.isPending}
                className="button text-xs py-1.5 px-3"
                style={{ background: 'var(--bg-active)', border: '1px solid var(--border-default)' }}
              >
                {bulkPreviewMutation.isPending ? 'Validating CSV...' : 'Parse and Preview'}
              </button>
            </div>

            {/* Live Preview List */}
            {bulkPreview && (
              <div className="space-y-3">
                <h4 className="text-xs font-semibold">Enrollment preview report</h4>
                <div className="max-h-[300px] overflow-y-auto space-y-2">
                  {/* Valid Rows */}
                  {bulkPreview.validRows.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">Ready for Enrollment ({bulkPreview.validRows.length})</p>
                      <div className="divide-y rounded-md border" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-base)' }}>
                        {bulkPreview.validRows.map((r: any, idx: number) => (
                          <div key={idx} className="p-2 flex items-center justify-between text-xs gap-3">
                            <span className="font-semibold truncate">{r.userName || r.email}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{r.email}</span>
                              <span className="badge text-[10px]" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>{r.role}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Invalid Rows */}
                  {bulkPreview.invalidRows.length > 0 && (
                    <div className="space-y-1.5 pt-2">
                      <p className="text-[10px] font-bold text-red-500 uppercase tracking-wider">Invalid Rows ({bulkPreview.invalidRows.length})</p>
                      <div className="divide-y rounded-md border" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-base)' }}>
                        {bulkPreview.invalidRows.map((r: any, idx: number) => (
                          <div key={idx} className="p-2 flex items-center justify-between text-xs gap-3">
                            <span className="font-semibold truncate" style={{ color: 'var(--text-muted)' }}>{r.email}</span>
                            <div className="flex items-center gap-2">
                              <span className="badge text-[10px]" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}>
                                {r.reason === 'NOT_FOUND' ? 'User not found' :
                                 r.reason === 'DUPLICATE_IN_CSV' ? 'Duplicate in CSV' :
                                 r.reason === 'ALREADY_ENROLLED' ? 'Already enrolled' :
                                 r.reason === 'OWNER_NOT_ALLOWED' ? 'OWNER not allowed' :
                                 r.reason === 'ROLE_CONFLICT' ? 'Role conflict' : r.reason}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t flex justify-end gap-2" style={{ borderColor: 'var(--border-subtle)' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setBulkPreview(null);
                      setCsvText('');
                    }}
                    className="button text-xs py-1.5 px-3"
                    style={{ background: 'transparent', border: '1px solid var(--border-default)' }}
                  >
                    Reset
                  </button>
                  <button
                    type="button"
                    onClick={handleBulkConfirm}
                    disabled={bulkConfirmMutation.isPending || bulkPreview.validRows.length === 0}
                    className="button text-xs py-1.5 px-3"
                    style={{
                      background: bulkPreview.validRows.length > 0 ? 'var(--bg-active)' : 'transparent',
                      border: '1px solid var(--border-default)',
                      color: bulkPreview.validRows.length > 0 ? 'var(--text-primary)' : 'var(--text-faint)',
                    }}
                  >
                    {bulkConfirmMutation.isPending ? 'Enrolling...' : `Confirm Bulk Enrollment (${bulkPreview.validRows.length})`}
                  </button>
                </div>
              </div>
            )}

            {!bulkPreview && (
              <div className="flex justify-end gap-2 pt-2 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                <button
                  type="button"
                  onClick={() => setIsBulkOpen(false)}
                  className="button text-xs py-1.5 px-3"
                  style={{ background: 'transparent', border: '1px solid var(--border-default)' }}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SectionTitle({ icon: Icon, title }: { icon: typeof BookOpenIcon; title: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-5 w-5" style={{ color: 'var(--text-secondary)' }} />
      <h2 className="font-semibold">{title}</h2>
    </div>
  );
}

function EmptyState({ title, description, framed = false }: { title: string; description: string; framed?: boolean }) {
  const content = (
    <div className="py-8 text-center">
      <BookOpenIcon className="mx-auto h-8 w-8" style={{ color: 'var(--text-faint)' }} />
      <h3 className="mt-3 text-sm font-semibold">{title}</h3>
      <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>{description}</p>
    </div>
  );

  if (!framed) return content;

  return (
    <section className="card">
      <div className="card-body">{content}</div>
    </section>
  );
}
