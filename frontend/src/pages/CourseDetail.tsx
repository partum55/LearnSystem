import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Card,
  CardBody,
  CourseGradesTab,
  Header,
  Loading,
  Sidebar,
  TeacherGradebook,
} from '../components';
import { useAuthStore } from '../store/authStore';
import { useCourseStore } from '../store/courseStore';
import { Assignment, Module, Resource } from '../types';
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
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [showResourceModal, setShowResourceModal] = useState(false);
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [showAIModuleGenerator, setShowAIModuleGenerator] = useState(false);
  const [showAIAssignmentGenerator, setShowAIAssignmentGenerator] = useState(false);
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  const [selectedModuleContext, setSelectedModuleContext] = useState('');
  const [deleteConfirmation, setDeleteConfirmation] = useState<DeleteConfirmationState | null>(null);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(() => getInitialExpandedModules(id));

  const courseId = id || '';
  const isInstructor = user?.role === 'TEACHER' || user?.role === 'SUPERADMIN';
  const tabs = useMemo(() => getCourseDetailTabs(t), [t]);

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

  const handleModuleCreated = useCallback(() => {
    if (!id) {
      return;
    }
    void fetchModules(id);
  }, [fetchModules, id]);

  const handleAssignmentCreated = useCallback(() => {
    if (!id) {
      return;
    }
    void fetchAssignments(id);
    void fetchModules(id);
  }, [fetchAssignments, fetchModules, id]);

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

  const handleAddAssignment = useCallback((moduleId: string) => {
    setSelectedModuleId(moduleId);
    setShowAssignmentModal(true);
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
    }
    setShowEnrollModal(false);
  }, [fetchAssignments, fetchCourseById, fetchModules, id]);

  if (isLoadingCourse || !currentCourse) {
    return <Loading />;
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-8">
          <div className="mx-auto max-w-7xl">
            <CourseDetailHeader
              courseId={courseId}
              course={currentCourse}
              isInstructor={isInstructor}
              onOpenEnrollModal={() => setShowEnrollModal(true)}
              t={t}
            />

            <CourseDetailTabs tabs={tabs} activeTab={activeTab} onTabChange={handleTabChange} />

            {activeTab === 'modules' && (
              <CourseModulesTab
                courseId={courseId}
                modules={modules}
                expandedModules={expandedModules}
                isInstructor={isInstructor}
                onToggleModule={toggleModule}
                onOpenAIModuleGenerator={() => setShowAIModuleGenerator(true)}
                onOpenAIAssignmentGenerator={handleOpenAIAssignmentGenerator}
                onOpenModuleModal={() => setShowModuleModal(true)}
                onAddResource={handleAddResource}
                onAddAssignment={handleAddAssignment}
                onDeleteModule={requestDeleteModule}
                onDeleteResource={requestDeleteResource}
                onDeleteAssignment={requestDeleteAssignment}
                t={t}
              />
            )}

            {activeTab === 'assignments' && (
              <CourseAssignmentsTab
                assignments={assignments}
                isInstructor={isInstructor}
                onOpenAssignmentModal={() => setShowAssignmentModal(true)}
                t={t}
              />
            )}

            {activeTab === 'members' && (
              <Card>
                <CardBody>
                  <p className="py-12 text-center" style={{ color: 'var(--text-muted)' }}>
                    {t('courses.membersComingSoon')}
                  </p>
                </CardBody>
              </Card>
            )}

            {activeTab === 'grades' &&
              (isInstructor ? <TeacherGradebook courseId={courseId} /> : <CourseGradesTab courseId={courseId} />)}
          </div>
        </main>
      </div>

      <CourseDetailModals
        isInstructor={isInstructor}
        courseId={courseId}
        currentCourse={currentCourse}
        showModuleModal={showModuleModal}
        showAssignmentModal={showAssignmentModal}
        showResourceModal={showResourceModal}
        showEnrollModal={showEnrollModal}
        showAIModuleGenerator={showAIModuleGenerator}
        showAIAssignmentGenerator={showAIAssignmentGenerator}
        selectedModuleId={selectedModuleId}
        selectedModuleContext={selectedModuleContext}
        deleteConfirmation={deleteConfirmation}
        onCloseModuleModal={() => setShowModuleModal(false)}
        onCloseAssignmentModal={() => {
          setShowAssignmentModal(false);
          setSelectedModuleId(null);
        }}
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
        onAssignmentCreated={handleAssignmentCreated}
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
    </div>
  );
};

export default CourseDetail;
