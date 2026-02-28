import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CheckCircleIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';
import {
  CourseGradesTab,
  Loading,
  Modal,
  Button,
  TeacherGradebook,
} from '../components';
import { CourseLayout } from '../components/CourseLayout';
import { TabTransition } from '../components/animation';
import { CourseMembersTab } from '../components/CourseMembersTab';
import { announcementsApi, coursesApi, CoursePublishChecklist, modulesApi, resourcesApi } from '../api/courses';
import { extractErrorMessage } from '../api/client';
import { useAuthStore } from '../store/authStore';
import { useCourseStore } from '../store/courseStore';
import { Announcement, Assignment, Module, Resource } from '../types';
import { CourseAnnouncementsTab } from './course-detail/CourseAnnouncementsTab';
import { CourseAssignmentsTab } from './course-detail/CourseAssignmentsTab';
import { CourseDetailHeader } from './course-detail/CourseDetailHeader';
import { CourseDetailModals } from './course-detail/CourseDetailModals';
import { CourseDetailTabs } from './course-detail/CourseDetailTabs';
import { CourseModulesTab } from './course-detail/CourseModulesTab';
import {
  CourseDetailTabId,
  DeleteConfirmationState,
  getCourseDetailTabs,
  getInitialExpandedModules,
  getInitialTab,
} from './course-detail/courseDetailModel';

export const CourseDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const {
    currentCourse,
    modules,
    assignments,
    fetchCourseById,
    fetchModules,
    fetchAssignments,
    deleteModule,
    deleteResource,
    deleteAssignment,
    isLoadingCourse,
  } = useCourseStore();

  const [activeTab, setActiveTab] = useState<CourseDetailTabId>(() =>
    getInitialTab(id, searchParams.get('tab'))
  );
  const [showModuleModal, setShowModuleModal] = useState(false);
  const [showResourceModal, setShowResourceModal] = useState(false);
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [showAIModuleGenerator, setShowAIModuleGenerator] = useState(false);
  const [showAIAssignmentGenerator, setShowAIAssignmentGenerator] = useState(false);
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  const [selectedModuleContext, setSelectedModuleContext] = useState('');
  const [deleteConfirmation, setDeleteConfirmation] = useState<DeleteConfirmationState | null>(null);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(() => getInitialExpandedModules(id));
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoadingAnnouncements, setIsLoadingAnnouncements] = useState(false);
  const [isPublishActionLoading, setIsPublishActionLoading] = useState(false);
  const [publishChecklist, setPublishChecklist] = useState<CoursePublishChecklist | null>(null);
  const [showPublishChecklistModal, setShowPublishChecklistModal] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');
  const [isForcePublishing, setIsForcePublishing] = useState(false);
  const [publishChecklistError, setPublishChecklistError] = useState<string | null>(null);

  const courseId = id || '';
  const isInstructor = user?.role === 'TEACHER' || user?.role === 'SUPERADMIN';
  const isSuperAdmin = user?.role === 'SUPERADMIN';
  const tabs = useMemo(() => getCourseDetailTabs(t), [t]);

  // Merge assignments into their respective modules by module_id
  const enrichedModules = useMemo(() => {
    if (!modules || modules.length === 0) return modules;
    return modules.map((mod) => ({
      ...mod,
      assignments: (assignments || []).filter((a) => a.module_id === mod.id),
    }));
  }, [modules, assignments]);

  const handleTabChange = useCallback(
    (tab: CourseDetailTabId) => {
      setActiveTab(tab);
      setSearchParams({ tab });
      if (id) {
        sessionStorage.setItem(`course_${id}_tab`, tab);
      }
    },
    [id, setSearchParams]
  );

  useEffect(() => {
    if (!id) {
      return;
    }
    sessionStorage.setItem(`course_${id}_expanded`, JSON.stringify([...expandedModules]));
  }, [expandedModules, id]);

  useEffect(() => {
    if (!id) {
      return;
    }
    void fetchCourseById(id);
    void fetchModules(id);
    void fetchAssignments(id);
  }, [id, fetchAssignments, fetchCourseById, fetchModules]);

  const fetchAnnouncements = useCallback(async (targetCourseId: string) => {
    setIsLoadingAnnouncements(true);
    try {
      const response = await announcementsApi.getAll(targetCourseId);
      setAnnouncements(response.data);
    } catch {
      setAnnouncements([]);
    } finally {
      setIsLoadingAnnouncements(false);
    }
  }, []);

  useEffect(() => {
    if (!id) {
      return;
    }
    void fetchAnnouncements(id);
  }, [fetchAnnouncements, id]);

  const handleModuleCreated = useCallback(() => {
    if (!id) {
      return;
    }
    void fetchModules(id);
  }, [fetchModules, id]);

  const handleResourceCreated = useCallback(() => {
    if (!id) {
      return;
    }
    void fetchModules(id);
  }, [fetchModules, id]);

  const handleAddResource = useCallback((moduleId: string) => {
    setSelectedModuleId(moduleId);
    setShowResourceModal(true);
  }, []);

  const handleOpenAIAssignmentGenerator = useCallback((moduleId: string, moduleContext: string) => {
    setSelectedModuleId(moduleId);
    setSelectedModuleContext(moduleContext);
    setShowAIAssignmentGenerator(true);
  }, []);

  const toggleModule = useCallback((moduleId: string) => {
    setExpandedModules((previous) => {
      const next = new Set(previous);
      if (next.has(moduleId)) {
        next.delete(moduleId);
      } else {
        next.add(moduleId);
      }
      return next;
    });
  }, []);

  const requestDeleteModule = useCallback((module: Module) => {
    setDeleteConfirmation({
      type: 'module',
      id: module.id,
      title: module.title,
    });
  }, []);

  const requestDeleteResource = useCallback((moduleId: string, resource: Resource) => {
    setDeleteConfirmation({
      type: 'resource',
      id: resource.id,
      moduleId,
      title: resource.title,
    });
  }, []);

  const requestDeleteAssignment = useCallback((assignment: Assignment) => {
    setDeleteConfirmation({
      type: 'assignment',
      id: assignment.id,
      title: assignment.title,
    });
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!deleteConfirmation || !id) {
      return;
    }

    try {
      if (deleteConfirmation.type === 'module') {
        await deleteModule(id, deleteConfirmation.id);
        await fetchModules(id);
      } else if (deleteConfirmation.type === 'resource' && deleteConfirmation.moduleId) {
        await deleteResource(id, deleteConfirmation.moduleId, deleteConfirmation.id);
      } else if (deleteConfirmation.type === 'assignment') {
        await deleteAssignment(deleteConfirmation.id);
        await fetchAssignments(id);
        await fetchModules(id);
      }
      setDeleteConfirmation(null);
    } catch (error) {
      console.error('Failed to delete:', error);
    }
  }, [
    deleteAssignment,
    deleteConfirmation,
    deleteModule,
    deleteResource,
    fetchAssignments,
    fetchModules,
    id,
  ]);

  const handleAIModuleGenerated = useCallback(() => {
    setShowAIModuleGenerator(false);
    if (!id) {
      return;
    }
    void fetchModules(id);
  }, [fetchModules, id]);

  const handleAIAssignmentGenerated = useCallback(() => {
    setShowAIAssignmentGenerator(false);
    setSelectedModuleId(null);
    if (!id) {
      return;
    }
    void fetchAssignments(id);
    void fetchModules(id);
  }, [fetchAssignments, fetchModules, id]);

  const handleEnrolled = useCallback(() => {
    if (id) {
      void fetchCourseById(id);
      void fetchModules(id);
      void fetchAssignments(id);
      void fetchAnnouncements(id);
    }
    setShowEnrollModal(false);
  }, [fetchAnnouncements, fetchAssignments, fetchCourseById, fetchModules, id]);

  const handleCreateAnnouncement = useCallback(
    async (payload: { title: string; content: string; is_pinned?: boolean }) => {
      if (!id) {
        return;
      }
      await announcementsApi.create(id, payload);
      await fetchAnnouncements(id);
    },
    [fetchAnnouncements, id]
  );

  const handleUpdateAnnouncement = useCallback(
    async (
      announcementId: string,
      payload: Partial<{ title: string; content: string; is_pinned?: boolean }>
    ) => {
      if (!id) {
        return;
      }
      await announcementsApi.update(id, announcementId, payload);
      await fetchAnnouncements(id);
    },
    [fetchAnnouncements, id]
  );

  const handleDeleteAnnouncement = useCallback(
    async (announcementId: string) => {
      if (!id) {
        return;
      }
      await announcementsApi.delete(id, announcementId);
      await fetchAnnouncements(id);
    },
    [fetchAnnouncements, id]
  );

  const handleReorderModules = useCallback(
    async (moduleIds: string[]) => {
      if (!id) {
        return;
      }
      await modulesApi.reorder(id, moduleIds);
      await fetchModules(id);
    },
    [fetchModules, id]
  );

  const handleReorderResources = useCallback(
    async (moduleId: string, resourceIds: string[]) => {
      if (!id) {
        return;
      }
      await resourcesApi.reorder(id, moduleId, resourceIds);
      await fetchModules(id);
    },
    [fetchModules, id]
  );

  const openChecklistModal = useCallback((checklist: CoursePublishChecklist) => {
    setPublishChecklist(checklist);
    setOverrideReason('');
    setPublishChecklistError(null);
    setShowPublishChecklistModal(true);
  }, []);

  const handleTogglePublish = useCallback(async () => {
    if (!id || !currentCourse) {
      return;
    }

    setPublishChecklistError(null);
    setIsPublishActionLoading(true);

    if (currentCourse.isPublished) {
      try {
        await coursesApi.unpublish(id);
        await fetchCourseById(id);
      } catch (error) {
        window.alert(extractErrorMessage(error));
      } finally {
        setIsPublishActionLoading(false);
      }
      return;
    }

    try {
      const checklist = await coursesApi.getPublishChecklist(id);
      if (!checklist.readyToPublish) {
        openChecklistModal(checklist);
        return;
      }

      await coursesApi.publish(id);
      await fetchCourseById(id);
    } catch (error) {
      const conflictChecklist = (
        error as { response?: { status?: number; data?: { checklist?: CoursePublishChecklist } } }
      )?.response?.data?.checklist;

      if (conflictChecklist) {
        openChecklistModal(conflictChecklist);
      } else {
        window.alert(extractErrorMessage(error));
      }
    } finally {
      setIsPublishActionLoading(false);
    }
  }, [currentCourse, fetchCourseById, id, openChecklistModal]);

  const handleForcePublish = useCallback(async () => {
    if (!id || !isSuperAdmin) {
      return;
    }
    if (!overrideReason.trim()) {
      setPublishChecklistError(t('courses.publishOverrideReasonRequired', 'Override reason is required.'));
      return;
    }

    setIsForcePublishing(true);
    setPublishChecklistError(null);
    try {
      await coursesApi.publish(id, {
        forcePublish: true,
        overrideReason: overrideReason.trim(),
      });
      await fetchCourseById(id);
      setShowPublishChecklistModal(false);
      setPublishChecklist(null);
      setOverrideReason('');
    } catch (error) {
      setPublishChecklistError(extractErrorMessage(error));
    } finally {
      setIsForcePublishing(false);
    }
  }, [fetchCourseById, id, isSuperAdmin, overrideReason, t]);

  if (isLoadingCourse || !currentCourse) {
    return <Loading />;
  }

  return (
    <CourseLayout courseId={courseId}>
          <div className="mx-auto max-w-7xl">
            <CourseDetailHeader
              courseId={courseId}
              course={currentCourse}
              isInstructor={isInstructor}
              isPublishActionLoading={isPublishActionLoading}
              onOpenEnrollModal={() => setShowEnrollModal(true)}
              onTogglePublish={() => {
                void handleTogglePublish();
              }}
              t={t}
            />

            <CourseDetailTabs tabs={tabs} activeTab={activeTab} onTabChange={handleTabChange} />

            <TabTransition tabKey={activeTab}>
              {activeTab === 'modules' && (
                <CourseModulesTab
                  courseId={courseId}
                  modules={enrichedModules}
                  expandedModules={expandedModules}
                  isInstructor={isInstructor}
                  onToggleModule={toggleModule}
                  onOpenAIModuleGenerator={() => setShowAIModuleGenerator(true)}
                  onOpenAIAssignmentGenerator={handleOpenAIAssignmentGenerator}
                  onOpenModuleModal={() => setShowModuleModal(true)}
                  onAddResource={handleAddResource}
                  onDeleteModule={requestDeleteModule}
                  onDeleteResource={requestDeleteResource}
                  onDeleteAssignment={requestDeleteAssignment}
                  onReorderModules={handleReorderModules}
                  onReorderResources={handleReorderResources}
                  t={t}
                />
              )}

              {activeTab === 'announcements' && (
                <CourseAnnouncementsTab
                  announcements={announcements}
                  isInstructor={isInstructor}
                  isLoading={isLoadingAnnouncements}
                  onCreate={handleCreateAnnouncement}
                  onUpdate={handleUpdateAnnouncement}
                  onDelete={handleDeleteAnnouncement}
                  t={t}
                />
              )}

              {activeTab === 'assignments' && (
                <CourseAssignmentsTab
                  assignments={assignments}
                  isInstructor={isInstructor}
                  courseId={courseId}
                  modules={enrichedModules}
                  t={t}
                />
              )}

              {activeTab === 'members' && (
                <CourseMembersTab
                  courseId={courseId}
                  canManage={isInstructor}
                />
              )}

              {activeTab === 'grades' &&
                (isInstructor ? <TeacherGradebook courseId={courseId} /> : <CourseGradesTab courseId={courseId} />)}
            </TabTransition>
          </div>

      <CourseDetailModals
        isInstructor={isInstructor}
        courseId={courseId}
        currentCourse={currentCourse}
        showModuleModal={showModuleModal}
        showResourceModal={showResourceModal}
        showEnrollModal={showEnrollModal}
        showAIModuleGenerator={showAIModuleGenerator}
        showAIAssignmentGenerator={showAIAssignmentGenerator}
        selectedModuleId={selectedModuleId}
        selectedModuleContext={selectedModuleContext}
        deleteConfirmation={deleteConfirmation}
        onCloseModuleModal={() => setShowModuleModal(false)}
        onCloseResourceModal={() => {
          setShowResourceModal(false);
          setSelectedModuleId(null);
        }}
        onCloseEnrollModal={() => setShowEnrollModal(false)}
        onCloseAIModuleGenerator={() => setShowAIModuleGenerator(false)}
        onCloseAIAssignmentGenerator={() => {
          setShowAIAssignmentGenerator(false);
          setSelectedModuleId(null);
        }}
        onModuleCreated={handleModuleCreated}
        onResourceCreated={handleResourceCreated}
        onEnrolled={handleEnrolled}
        onAIModuleGenerated={handleAIModuleGenerated}
        onAIAssignmentGenerated={handleAIAssignmentGenerated}
        onConfirmDelete={() => {
          void confirmDelete();
        }}
        onCancelDelete={() => setDeleteConfirmation(null)}
        t={t}
      />

      <Modal
        isOpen={showPublishChecklistModal}
        onClose={() => {
          if (isForcePublishing) return;
          setShowPublishChecklistModal(false);
          setPublishChecklist(null);
          setOverrideReason('');
          setPublishChecklistError(null);
        }}
        title={t('courses.publishChecklistTitle', 'Course Publish Checklist')}
      >
        <div className="space-y-4">
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            {t('courses.publishChecklistDescription', 'Complete all required checks before publishing this course.')}
          </p>

          <div className="space-y-2">
            {(publishChecklist?.items || []).map((item) => (
              <div
                key={item.key}
                className="rounded-md p-3"
                style={{
                  border: `1px solid ${item.passed ? 'rgba(34,197,94,0.25)' : 'rgba(248,113,113,0.25)'}`,
                  background: item.passed ? 'rgba(34,197,94,0.08)' : 'rgba(248,113,113,0.08)',
                }}
              >
                <div className="flex items-start gap-2">
                  {item.passed ? (
                    <CheckCircleIcon className="mt-0.5 h-4 w-4" style={{ color: 'var(--fn-success)' }} />
                  ) : (
                    <ExclamationCircleIcon className="mt-0.5 h-4 w-4" style={{ color: 'var(--fn-error)' }} />
                  )}
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                      {item.label}
                    </p>
                    {item.details && (
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {item.details}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {!isSuperAdmin && (
            <div className="rounded-md p-3 text-sm" style={{ background: 'rgba(245,158,11,0.12)', color: 'var(--fn-warning)' }}>
              {t(
                'courses.publishChecklistTeacherBlocked',
                'Publishing is blocked until all required items pass. Force publish is available only for SUPERADMIN.'
              )}
            </div>
          )}

          {isSuperAdmin && (
            <div className="space-y-2">
              <label className="block text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                {t('courses.overrideReason', 'Override reason')}
              </label>
              <textarea
                value={overrideReason}
                onChange={(event) => setOverrideReason(event.target.value)}
                rows={3}
                className="input w-full"
                placeholder={t('courses.overrideReasonPlaceholder', 'Provide reason for force publishing')}
              />
            </div>
          )}

          {publishChecklistError && (
            <p className="text-sm" style={{ color: 'var(--fn-error)' }}>
              {publishChecklistError}
            </p>
          )}

          <div className="flex justify-end gap-3">
            <Button
              variant="secondary"
              onClick={() => {
                setShowPublishChecklistModal(false);
                setPublishChecklist(null);
                setOverrideReason('');
                setPublishChecklistError(null);
              }}
              disabled={isForcePublishing}
            >
              {t('common.close', 'Close')}
            </Button>
            {isSuperAdmin && (
              <Button
                variant="danger"
                onClick={() => {
                  void handleForcePublish();
                }}
                isLoading={isForcePublishing}
              >
                {t('courses.forcePublish', 'Force Publish')}
              </Button>
            )}
          </div>
        </div>
      </Modal>
    </CourseLayout>
  );
};

export default CourseDetail;
