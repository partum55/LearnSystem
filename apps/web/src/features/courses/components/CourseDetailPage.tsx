'use client';

import { useParams, useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { Loading } from '@/components/Loading';
import { AcademicCapIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';

// Query & Mutation Hooks
import {
  useCourseMembers,
  useCourseModules,
  useCourseOverview,
  useCreateModule,
  useUpdateModule,
  useDeleteModule,
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

// Type Interfaces
import type {
  CourseModuleDto,
  LearningItemDto,
  LearningItemRequest,
  ModuleRequest,
  AssignmentListItemDto,
} from '@/features/courses/api/canonical.types';
import type { AssignmentRequest } from '@/features/assignments/api/canonical.types';

// Modals
import { ModuleFormModal } from './ModuleFormModal';
import { LearningItemFormModal } from './LearningItemFormModal';
import { DeleteConfirmationModal } from './DeleteConfirmationModal';

// Extracted Subcomponents
import { CourseHeader } from './CourseHeader';
import { StaffToolbar } from './StaffToolbar';
import { OverviewPanel } from './OverviewPanel';
import { ModulesPanel } from './ModulesPanel';
import { GradesPanel } from './GradesPanel';
import { MembersPanel } from './MembersPanel';

// Icons for Tab Nav
import {
  BookOpenIcon,
  Squares2X2Icon,
  ChartBarIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';

type TabId = 'overview' | 'modules' | 'grades' | 'members';

const tabs: Array<{ id: TabId; label: string; icon: typeof BookOpenIcon }> = [
  { id: 'overview', label: 'Overview', icon: BookOpenIcon },
  { id: 'modules', label: 'Modules', icon: Squares2X2Icon },
  { id: 'grades', label: 'Grades', icon: ChartBarIcon },
  { id: 'members', label: 'Members', icon: UserGroupIcon },
];

const emptyModules: CourseModuleDto[] = [];
const emptyMembers: any[] = [];

function userRole(role?: string | null, globalRole?: string | null) {
  return String(globalRole ?? role ?? '').toUpperCase();
}

interface CourseDetailPageProps {
  courseId: string;
}

export function CourseDetailPage({ courseId }: CourseDetailPageProps) {
  const router = useRouter();

  // Tab State
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  // Orchestrator Modal & Edit States
  const [isModuleModalOpen, setIsModuleModalOpen] = useState(false);
  const [isLearningItemModalOpen, setIsLearningItemModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const [activeModule, setActiveModule] = useState<CourseModuleDto | null>(null);
  const [activeLearningItem, setActiveLearningItem] = useState<LearningItemDto | null>(null);
  const [activeModuleId, setActiveModuleId] = useState<string | null>(null);
  const [activeAssignment, setActiveAssignment] = useState<AssignmentListItemDto | null>(null);

  const [deleteItemId, setDeleteItemId] = useState('');
  const [deleteItemName, setDeleteItemName] = useState('');
  const [deleteItemType, setDeleteItemType] = useState<'module' | 'material' | 'assignment'>('module');

  const [todoToast, setTodoToast] = useState<string | null>(null);

  // Queries & Mutations
  const { data: currentUser, isLoading: isUserLoading } = useCurrentUser();
  const { data: overview, isLoading: isOverviewLoading, error: overviewError } = useCourseOverview(courseId);
  const { data: modulesData, isLoading: isModulesLoading, error: modulesError } = useCourseModules(courseId);
  const { data: membersPage, isLoading: isMembersLoading } = useCourseMembers(courseId, { size: 100 });
  const { data: gradebook } = useStudentGradebook(courseId);

  const createModuleMutation = useCreateModule(courseId);
  const updateModuleMutation = useUpdateModule(courseId);
  const deleteModuleMutation = useDeleteModule(courseId);

  const createLearningItemMutation = useCreateLearningItem();
  const updateLearningItemMutation = useUpdateLearningItem();
  const deleteLearningItemMutation = useDeleteLearningItem();

  const createAssignmentMutation = useCreateCanonicalAssignment();
  const updateAssignmentMutation = useUpdateCanonicalAssignment();
  const deleteAssignmentMutation = useDeleteCanonicalAssignment();

  const globalRole = userRole(currentUser?.role, currentUser?.globalRole);
  const modules = modulesData?.items ?? emptyModules;
  const members = membersPage?.content ?? emptyMembers;

  const currentCourseMember = useMemo(() => {
    if (!currentUser) return null;
    return members.find(
      (member) => String(member.userId).toLowerCase() === String(currentUser.id).toLowerCase()
    ) ?? null;
  }, [members, currentUser]);

  const courseRole = currentCourseMember?.roleInCourse;

  // Fine-grained permission flags
  const isAdmin = globalRole === 'ADMIN';
  const isOwner = String(courseRole).toUpperCase() === 'OWNER';
  const isTeacher = String(courseRole).toUpperCase() === 'TEACHER';
  const isTA = String(courseRole).toUpperCase() === 'TA';

  const canManageStudents = isAdmin || isOwner || isTeacher;
  const canManageStaff = isAdmin || isOwner;
  const canManageCourseContent = isAdmin || isOwner || isTeacher;
  const canAccessTeacherTools = isAdmin || isOwner || isTeacher || isTA;

  // Pass fine-grained permissions object to child components
  const permissions = useMemo(() => ({
    canManageStudents,
    canManageStaff,
    canManageCourseContent,
    canAccessTeacherTools,
  }), [canManageStudents, canManageStaff, canManageCourseContent, canAccessTeacherTools]);

  const isCourseStaff = canAccessTeacherTools;

  const isForbidden = useMemo(() => {
    const err = overviewError as { status?: number; response?: { status?: number } } | null;
    return (err?.status || err?.response?.status) === 403;
  }, [overviewError]);

  const isLoading = isUserLoading || isOverviewLoading || isModulesLoading || isMembersLoading;
  const hasError = (overviewError && !isForbidden) || modulesError;

  const showToast = (message: string) => {
    setTodoToast(message);
    setTimeout(() => setTodoToast(null), 3000);
  };

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

  const handleDeleteAssignment = (assignmentId: string) => {
    let foundTitle = 'Assignment';
    for (const mod of modules) {
      const item = mod.assignments.find((i) => i.id === assignmentId);
      if (item) {
        foundTitle = item.title;
        break;
      }
    }
    setDeleteItemId(assignmentId);
    setDeleteItemName(foundTitle);
    setDeleteItemType('assignment');
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    setIsDeleteModalOpen(false);
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
        <div className="fixed bottom-5 right-5 z-50 rounded-lg bg-slate-900 px-4 py-2.5 text-xs text-white shadow-lg dark:bg-slate-50 dark:text-slate-900">
          ✓ {todoToast}
        </div>
      )}

      {/* Header Info Banner */}
      <CourseHeader
        courseId={courseId}
        title={overview.title}
        description={overview.description}
        teacherName={overview.teacherName}
        moduleCount={modules.length}
        progress={overview.progress}
        courseRole={courseRole}
      />

      {/* Course Staff Tools Bar */}
      {canAccessTeacherTools && (
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

      {/* Tab bar Navigation */}
      <nav className="flex flex-wrap gap-2 border-b pb-0" style={{ borderColor: 'var(--border-default)' }}>
        {tabs.map((tab) => (
          <TabButton
            key={tab.id}
            tab={tab}
            active={activeTab === tab.id}
            count={tab.id === 'modules' ? modules.length : tab.id === 'members' ? members.length : undefined}
            onClick={() => {
              if (tab.id === 'grades' && canAccessTeacherTools) {
                router.push(`/courses/${courseId}/gradebook`);
              } else {
                setActiveTab(tab.id);
              }
            }}
          />
        ))}
      </nav>

      {/* Dynamic Tab Panes */}
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
          canManageCourseContent={canManageCourseContent}
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
          onAddModule={() => {
            setActiveModule(null);
            setIsModuleModalOpen(true);
          }}
        />
      )}

      {activeTab === 'grades' && (
        <GradesPanel
          courseId={courseId}
          isCourseStaff={canAccessTeacherTools}
          gradebook={gradebook}
        />
      )}

      {activeTab === 'members' && (
        <MembersPanel
          courseId={courseId}
          currentUser={currentUser}
          permissions={permissions}
        />
      )}

      {/* State Modal Sheets */}
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

interface TabButtonProps {
  tab: { id: TabId; label: string; icon: typeof BookOpenIcon };
  active: boolean;
  count?: number;
  onClick: () => void;
}

function TabButton({
  tab,
  active,
  count,
  onClick,
}: TabButtonProps) {
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
