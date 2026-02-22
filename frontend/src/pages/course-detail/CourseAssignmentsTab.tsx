import React from 'react';
import { TFunction } from 'i18next';
import { Link } from 'react-router-dom';
import { ClockIcon, PlusIcon } from '@heroicons/react/24/outline';
import { Assignment } from '../../types';
import { Button, Card, CardBody } from '../../components';

interface CourseAssignmentsTabProps {
  assignments: Assignment[];
  isInstructor: boolean;
  onOpenAssignmentModal: () => void;
  t: TFunction;
}

export const CourseAssignmentsTab: React.FC<CourseAssignmentsTabProps> = ({
  assignments,
  isInstructor,
  onOpenAssignmentModal,
  t,
}) => {
  if (!assignments || assignments.length === 0) {
    return (
      <div className="space-y-4">
        {isInstructor && (
          <div className="mb-4 flex justify-end">
            <Button onClick={onOpenAssignmentModal}>
              <PlusIcon className="mr-2 h-4 w-4" />
              {t('assignments.createAssignment')}
            </Button>
          </div>
        )}
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
      {isInstructor && (
        <div className="mb-4 flex justify-end">
          <Button onClick={onOpenAssignmentModal}>
            <PlusIcon className="mr-2 h-4 w-4" />
            {t('assignments.createAssignment')}
          </Button>
        </div>
      )}

      <div className="grid gap-4">
        {assignments.map((assignment) => (
          <Link key={assignment.id} to={`/assignments/${assignment.id}`}>
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
                        {assignment.due_date
                          ? new Date(assignment.due_date).toLocaleDateString()
                          : t('assignments.noDueDate')}
                      </span>
                      <span style={{ color: 'var(--text-muted)' }}>
                        {assignment.max_points} {t('assignments.points')}
                      </span>
                    </div>
                  </div>
                  {assignment.submission && (
                    <span className="badge badge-success">
                      {t('assignments.submitted')}
                    </span>
                  )}
                </div>
              </CardBody>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
};
