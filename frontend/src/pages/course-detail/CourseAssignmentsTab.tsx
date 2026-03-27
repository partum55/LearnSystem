import React, { Fragment, useEffect, useMemo, useState } from 'react';
import { TFunction } from 'i18next';
import { Link, useNavigate } from 'react-router-dom';
import { ClockIcon, PlusIcon, DocumentDuplicateIcon, BookmarkIcon, PencilIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { Menu, Transition } from '@headlessui/react';
import { Assignment, Module } from '../../types';
import { Button, Card, CardBody, Modal } from '../../components';
import { assignmentsApi } from '../../api/assessments';
import { coursesApi, modulesApi } from '../../api/courses';

interface CourseAssignmentsTabProps {
  assignments: Assignment[];
  isInstructor: boolean;
  courseId: string;
  modules: Module[];
  t: TFunction;
}

export const CourseAssignmentsTab: React.FC<CourseAssignmentsTabProps> = ({
  assignments,
  isInstructor,
  courseId,
  modules,
  t,
}) => {
  const navigate = useNavigate();
  const hasModules = modules && modules.length > 0;
  const [duplicateTarget, setDuplicateTarget] = useState<Assignment | null>(null);
  const [targetCourseId, setTargetCourseId] = useState(courseId);
  const [targetModuleId, setTargetModuleId] = useState('');
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [availableCourses, setAvailableCourses] = useState<Array<{ id: string; title: string; code: string }>>([]);
  const [availableModules, setAvailableModules] = useState<Module[]>(modules);

  const duplicateModalOpen = duplicateTarget !== null;

  useEffect(() => {
    if (!duplicateModalOpen) {
      return;
    }
    if (availableCourses.length > 0) {
      return;
    }
    void coursesApi
      .getAll()
      .then((response) => {
        const values = Array.isArray(response.data) ? response.data : [];
        setAvailableCourses(
          values.map((item) => ({
            id: String(item.id),
            title: item.title || item.titleUk || item.titleEn || 'Untitled',
            code: item.code || '',
          }))
        );
      })
      .catch(() => {
        setAvailableCourses([]);
      });
  }, [duplicateModalOpen, availableCourses.length]);

  useEffect(() => {
    if (!duplicateModalOpen) {
      return;
    }
    if (!targetCourseId) {
      setAvailableModules([]);
      setTargetModuleId('');
      return;
    }

    void modulesApi
      .getAll(targetCourseId)
      .then((response) => {
        const loaded = Array.isArray(response.data) ? response.data : [];
        setAvailableModules(loaded);

        if (!duplicateTarget) {
          return;
        }

        if (targetCourseId === duplicateTarget.courseId) {
          const preferredModuleId = duplicateTarget.moduleId || '';
          const hasPreferred = loaded.some((module) => module.id === preferredModuleId);
          if (hasPreferred) {
            setTargetModuleId(preferredModuleId);
            return;
          }
        }

        setTargetModuleId(loaded[0]?.id || '');
      })
      .catch(() => {
        setAvailableModules([]);
        setTargetModuleId('');
      });
  }, [duplicateModalOpen, duplicateTarget, targetCourseId]);

  const canDuplicate = useMemo(() => {
    if (!duplicateTarget) {
      return false;
    }
    if (duplicateTarget.assignmentType === 'QUIZ') {
      return Boolean(targetModuleId);
    }
    return true;
  }, [duplicateTarget, targetModuleId]);

  const openDuplicateModal = (assignment: Assignment) => {
    setDuplicateTarget(assignment);
    setTargetCourseId(assignment.courseId || courseId);
    setTargetModuleId(assignment.moduleId || '');
  };

  const submitDuplicate = async () => {
    if (!duplicateTarget || !canDuplicate) {
      return;
    }
    setIsDuplicating(true);
    try {
      await assignmentsApi.duplicate(duplicateTarget.id, {
        targetCourseId,
        targetModuleId: targetModuleId || undefined,
      });
      window.location.reload();
    } catch (error) {
      console.error('Failed to duplicate assignment', error);
      window.alert(t('assignment.duplicateFailed', 'Failed to duplicate assignment.'));
    } finally {
      setIsDuplicating(false);
    }
  };

  const createButton = isInstructor && (
    <div className="mb-4 flex justify-end">
      {hasModules ? (
        <Menu as="div" className="relative">
          <Menu.Button as={Fragment}>
            <Button>
              <PlusIcon className="mr-2 h-4 w-4" />
              {t('assignments.createAssignment')}
              <ChevronDownIcon className="ml-2 h-4 w-4" />
            </Button>
          </Menu.Button>
          <Transition
            as={Fragment}
            enter="transition ease-out duration-100"
            enterFrom="transform opacity-0 scale-95"
            enterTo="transform opacity-100 scale-100"
            leave="transition ease-in duration-75"
            leaveFrom="transform opacity-100 scale-100"
            leaveTo="transform opacity-0 scale-95"
          >
            <Menu.Items
              className="absolute right-0 z-10 mt-2 w-56 origin-top-right rounded-lg py-1 shadow-lg focus:outline-none"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}
            >
              <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                {t('modules.selectModule', 'Select Module')}
              </div>
              {modules.map((mod) => (
                <Menu.Item key={mod.id}>
                  {({ active }) => (
                    <button
                      type="button"
                      className="block w-full px-3 py-2 text-left text-sm transition-colors"
                      style={{
                        color: 'var(--text-primary)',
                        background: active ? 'var(--bg-hover)' : 'transparent',
                      }}
                      onClick={() => navigate(`/courses/${courseId}/modules/${mod.id}/assignments/new`)}
                    >
                      {mod.title}
                    </button>
                  )}
                </Menu.Item>
              ))}
            </Menu.Items>
          </Transition>
        </Menu>
      ) : (
        <Button disabled title={t('modules.createModuleFirst', 'Create a module first')}>
          <PlusIcon className="mr-2 h-4 w-4" />
          {t('assignments.createAssignment')}
        </Button>
      )}
    </div>
  );

  if (!assignments || assignments.length === 0) {
    return (
      <div className="space-y-4">
        {createButton}
        <Card>
          <CardBody>
            <p className="py-12 text-center" style={{ color: 'var(--text-muted)' }}>
              {t('assignments.noAssignments')}
            </p>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {createButton}

      <div className="grid gap-4">
        {assignments.map((assignment) => (
          <Link key={assignment.id} to={
            assignment.moduleId
              ? `/courses/${assignment.courseId}/modules/${assignment.moduleId}/assignments/${assignment.id}`
              : `/assignments/${assignment.id}`
          }>
            <Card hoverable>
              <CardBody>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3
                      className="mb-2 text-lg font-semibold"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {assignment.title}
                    </h3>
                    <p
                      className="mb-3 text-sm"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      {assignment.description}
                    </p>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="flex items-center" style={{ color: 'var(--text-muted)' }}>
                        <ClockIcon className="mr-1 h-4 w-4" />
                        {assignment.dueDate
                          ? new Date(assignment.dueDate).toLocaleDateString()
                          : t('assignments.noDueDate')}
                      </span>
                      <span style={{ color: 'var(--text-muted)' }}>
                        {assignment.maxPoints} {t('assignments.points')}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isInstructor && (
                      <>
                        {assignment.moduleId && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              navigate(`/courses/${assignment.courseId}/modules/${assignment.moduleId}/assignments/${assignment.id}/edit`);
                            }}
                            className="p-1.5 rounded transition-colors hover:bg-[var(--bg-active)]"
                            title={t('common.edit', 'Edit')}
                          >
                            <PencilIcon className="h-4 w-4" style={{ color: 'var(--text-muted)' }} />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            openDuplicateModal(assignment);
                          }}
                          className="p-1.5 rounded transition-colors hover:bg-[var(--bg-active)]"
                          title={t('assignment.duplicate', 'Duplicate')}
                        >
                          <DocumentDuplicateIcon className="h-4 w-4" style={{ color: 'var(--text-muted)' }} />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            void assignmentsApi.update(assignment.id, { ...assignment, is_template: true } as never)
                              .catch(() => {});
                          }}
                          className="p-1.5 rounded transition-colors hover:bg-[var(--bg-active)]"
                          title={t('templates.useAsTemplate', 'Use as Template')}
                        >
                          <BookmarkIcon className="h-4 w-4" style={{ color: 'var(--text-muted)' }} />
                        </button>
                      </>
                    )}
                    {assignment.submission && (
                      <span className="badge badge-success">
                        {t('assignments.submitted')}
                      </span>
                    )}
                  </div>
                </div>
              </CardBody>
            </Card>
          </Link>
        ))}
      </div>

      <Modal
        isOpen={duplicateModalOpen}
        onClose={() => {
          if (!isDuplicating) {
            setDuplicateTarget(null);
          }
        }}
        title={t('assignment.duplicateAssignment', 'Duplicate Assignment')}
      >
        <div className="space-y-3">
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {duplicateTarget ? duplicateTarget.title : ''}
          </p>

          <div>
            <label className="label">{t('courses.course', 'Course')}</label>
            <select
              className="input w-full"
              value={targetCourseId}
              onChange={(event) => setTargetCourseId(event.target.value)}
              disabled={isDuplicating}
            >
              {availableCourses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.code} - {course.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">{t('modules.module', 'Module')}</label>
            <select
              className="input w-full"
              value={targetModuleId}
              onChange={(event) => setTargetModuleId(event.target.value)}
              disabled={isDuplicating || availableModules.length === 0}
            >
              {availableModules.length === 0 && <option value="">{t('modules.noneAvailable', 'No modules available')}</option>}
              {availableModules.map((module) => (
                <option key={module.id} value={module.id}>
                  {module.title}
                </option>
              ))}
            </select>
            {duplicateTarget?.assignmentType === 'QUIZ' && !targetModuleId && (
              <p className="mt-1 text-xs" style={{ color: 'var(--fn-error)' }}>
                {t('assignment.quizTargetModuleRequired', 'Quiz assignments require a target module.')}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="secondary"
              onClick={() => setDuplicateTarget(null)}
              disabled={isDuplicating}
            >
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button
              onClick={() => {
                void submitDuplicate();
              }}
              disabled={!canDuplicate || isDuplicating}
            >
              {isDuplicating ? t('common.processing', 'Processing...') : t('assignment.duplicate', 'Duplicate')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
