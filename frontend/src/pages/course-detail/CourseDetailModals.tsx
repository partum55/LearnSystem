import React from 'react';
import { TFunction } from 'i18next';
import { AssignmentWizard } from '../../components/wizards/AssignmentWizard';
import { ResourceWizard } from '../../components/wizards/ResourceWizard';
import {
  AIElementGenerator,
  Button,
  CreateModuleModal,
  EnrollStudentsModal,
} from '../../components';
import { Course } from '../../types';
import { DeleteConfirmationState } from './courseDetailModel';

interface CourseDetailModalsProps {
  isInstructor: boolean;
  courseId: string;
  currentCourse: Course;
  showModuleModal: boolean;
  showAssignmentModal: boolean;
  showResourceModal: boolean;
  showEnrollModal: boolean;
  showAIModuleGenerator: boolean;
  showAIAssignmentGenerator: boolean;
  selectedModuleId: string | null;
  selectedModuleContext: string;
  deleteConfirmation: DeleteConfirmationState | null;
  onCloseModuleModal: () => void;
  onCloseAssignmentModal: () => void;
  onCloseResourceModal: () => void;
  onCloseEnrollModal: () => void;
  onCloseAIModuleGenerator: () => void;
  onCloseAIAssignmentGenerator: () => void;
  onModuleCreated: () => void;
  onAssignmentCreated: () => void;
  onResourceCreated: () => void;
  onEnrolled: () => void;
  onAIModuleGenerated: () => void;
  onAIAssignmentGenerated: () => void;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
  t: TFunction;
}

export const CourseDetailModals: React.FC<CourseDetailModalsProps> = ({
  isInstructor,
  courseId,
  currentCourse,
  showModuleModal,
  showAssignmentModal,
  showResourceModal,
  showEnrollModal,
  showAIModuleGenerator,
  showAIAssignmentGenerator,
  selectedModuleId,
  selectedModuleContext,
  deleteConfirmation,
  onCloseModuleModal,
  onCloseAssignmentModal,
  onCloseResourceModal,
  onCloseEnrollModal,
  onCloseAIModuleGenerator,
  onCloseAIAssignmentGenerator,
  onModuleCreated,
  onAssignmentCreated,
  onResourceCreated,
  onEnrolled,
  onAIModuleGenerated,
  onAIAssignmentGenerated,
  onConfirmDelete,
  onCancelDelete,
  t,
}) => (
  <>
    {isInstructor && (
      <>
        <CreateModuleModal
          isOpen={showModuleModal}
          onClose={onCloseModuleModal}
          courseId={courseId}
          onModuleCreated={onModuleCreated}
        />
        <AssignmentWizard
          isOpen={showAssignmentModal}
          onClose={onCloseAssignmentModal}
          courseId={courseId}
          moduleId={selectedModuleId || ''}
          onAssignmentCreated={onAssignmentCreated}
        />
        {selectedModuleId && (
          <ResourceWizard
            isOpen={showResourceModal}
            onClose={onCloseResourceModal}
            courseId={courseId}
            moduleId={selectedModuleId}
            onResourceCreated={onResourceCreated}
          />
        )}
        <EnrollStudentsModal
          isOpen={showEnrollModal}
          onClose={onCloseEnrollModal}
          courseId={courseId}
          onEnrolled={onEnrolled}
        />

        {showAIModuleGenerator && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4"
            style={{ background: 'rgba(0, 0, 0, 0.6)' }}
          >
            <div
              className="max-h-screen w-full max-w-3xl overflow-y-auto rounded-lg"
              style={{ background: 'var(--bg-elevated)' }}
            >
              <AIElementGenerator
                elementType="module"
                courseId={courseId}
                courseContext={`${currentCourse.code}: ${currentCourse.title} - ${currentCourse.description}`}
                onGenerated={() => onAIModuleGenerated()}
                onClose={onCloseAIModuleGenerator}
              />
            </div>
          </div>
        )}

        {showAIAssignmentGenerator && selectedModuleId && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4"
            style={{ background: 'rgba(0, 0, 0, 0.6)' }}
          >
            <div
              className="max-h-screen w-full max-w-3xl overflow-y-auto rounded-lg"
              style={{ background: 'var(--bg-elevated)' }}
            >
              <AIElementGenerator
                elementType="assignment"
                moduleId={selectedModuleId}
                courseContext={`${currentCourse.code}: ${currentCourse.title}`}
                moduleContext={selectedModuleContext}
                onGenerated={() => onAIAssignmentGenerated()}
                onClose={onCloseAIAssignmentGenerator}
              />
            </div>
          </div>
        )}
      </>
    )}

    {deleteConfirmation && (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: 'rgba(0, 0, 0, 0.6)' }}
      >
        <div
          className="w-full max-w-md rounded-lg p-6"
          style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}
        >
          <h3
            className="mb-4 text-xl font-bold"
            style={{ color: 'var(--text-primary)' }}
          >
            {t('common.deleteConfirmTitle')}
          </h3>
          <p className="mb-6" style={{ color: 'var(--text-muted)' }}>
            {t('common.deleteConfirmMessage', { title: deleteConfirmation.title })}
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={onCancelDelete}>
              {t('common.cancel')}
            </Button>
            <Button variant="danger" onClick={onConfirmDelete}>
              {t('common.delete')}
            </Button>
          </div>
        </div>
      </div>
    )}
  </>
);
