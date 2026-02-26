import React from 'react';
import { TFunction } from 'i18next';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowTopRightOnSquareIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ClockIcon,
  CodeBracketIcon,
  DocumentIcon,
  DocumentTextIcon,
  FilmIcon,
  FolderIcon,
  LinkIcon,
  PencilIcon,
  PlusIcon,
  PresentationChartBarIcon,
  SparklesIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { Button, Card, CardBody, CardHeader } from '../../components';
import { Assignment, Module, Resource } from '../../types';

interface CourseModulesTabProps {
  courseId: string;
  modules: Module[];
  expandedModules: Set<string>;
  isInstructor: boolean;
  onToggleModule: (moduleId: string) => void;
  onOpenAIModuleGenerator: () => void;
  onOpenAIAssignmentGenerator: (moduleId: string, moduleContext: string) => void;
  onOpenModuleModal: () => void;
  onAddResource: (moduleId: string) => void;
  onDeleteModule: (module: Module) => void;
  onDeleteResource: (moduleId: string, resource: Resource) => void;
  onDeleteAssignment: (assignment: Assignment) => void;
  t: TFunction;
}

export const CourseModulesTab: React.FC<CourseModulesTabProps> = ({
  courseId,
  modules,
  expandedModules,
  isInstructor,
  onToggleModule,
  onOpenAIModuleGenerator,
  onOpenAIAssignmentGenerator,
  onOpenModuleModal,
  onAddResource,
  onDeleteModule,
  onDeleteResource,
  onDeleteAssignment,
  t,
}) => {
  const navigate = useNavigate();
  if (!modules || modules.length === 0) {
    return (
      <div className="space-y-4">
        {isInstructor && (
          <div className="mb-4 flex justify-end gap-3">
            <Button variant="secondary" onClick={onOpenAIModuleGenerator}>
              <SparklesIcon className="mr-2 h-4 w-4" />
              AI Generate
            </Button>
            <Button onClick={onOpenModuleModal}>
              <PlusIcon className="mr-2 h-4 w-4" />
              {t('modules.addModule')}
            </Button>
          </div>
        )}
        <Card>
          <CardBody>
            <p className="py-12 text-center" style={{ color: 'var(--text-muted)' }}>{t('modules.noModules')}</p>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {isInstructor && (
        <div className="mb-4 flex justify-end gap-3">
          <Button variant="secondary" onClick={onOpenAIModuleGenerator}>
            <SparklesIcon className="mr-2 h-4 w-4" />
            AI Generate
          </Button>
          <Button onClick={onOpenModuleModal}>
            <PlusIcon className="mr-2 h-4 w-4" />
            {t('modules.addModule')}
          </Button>
        </div>
      )}

      {modules.map((module) => (
        <Card key={module.id}>
          <CardHeader>
            <div
              className="flex cursor-pointer items-center justify-between"
              onClick={() => onToggleModule(module.id)}
            >
              <div className="flex items-center gap-2">
                {expandedModules.has(module.id) ? (
                  <ChevronDownIcon className="h-5 w-5" style={{ color: 'var(--text-muted)' }} />
                ) : (
                  <ChevronRightIcon className="h-5 w-5" style={{ color: 'var(--text-muted)' }} />
                )}
                <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{module.title}</h3>
              </div>
              {module.is_published && (
                <span className="badge badge-success">
                  <CheckCircleIcon className="mr-1 h-4 w-4" />
                  {t('common.published')}
                </span>
              )}
            </div>
          </CardHeader>

          {expandedModules.has(module.id) && (
            <CardBody>
              {module.description && (
                <p className="mb-6" style={{ color: 'var(--text-muted)' }}>{module.description}</p>
              )}

              {isInstructor && (
                <div
                  className="mb-4 flex gap-2 pb-4"
                  style={{ borderBottom: '1px solid var(--border-subtle)' }}
                >
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={(event) => {
                      event.stopPropagation();
                      onOpenAIAssignmentGenerator(module.id, `${module.title}: ${module.description || ''}`);
                    }}
                  >
                    <SparklesIcon className="mr-1 h-4 w-4" />
                    AI Assignment
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={(event) => {
                      event.stopPropagation();
                      onAddResource(module.id);
                    }}
                  >
                    <PlusIcon className="mr-1 h-4 w-4" />
                    {t('modules.addResource')}
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={(event) => {
                      event.stopPropagation();
                      navigate(`/courses/${courseId}/modules/${module.id}/assignments/new`);
                    }}
                  >
                    <PlusIcon className="mr-1 h-4 w-4" />
                    {t('assignments.addAssignment')}
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={(event) => {
                      event.stopPropagation();
                      onDeleteModule(module);
                    }}
                  >
                    <TrashIcon className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {module.resources && module.resources.length > 0 && (
                <div>
                  <div className="mb-3 flex items-center gap-2">
                    <FolderIcon className="h-5 w-5" style={{ color: 'var(--text-secondary)' }} />
                    <h4
                      className="text-sm font-semibold uppercase tracking-wider"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      {t('modules.resources')}
                    </h4>
                  </div>
                  <div className="space-y-2 pl-2">
                    {module.resources.map((resource) => {
                      const isLink = resource.resource_type === 'LINK';
                      const ResIcon = {
                        TEXT: DocumentTextIcon,
                        PDF: DocumentIcon,
                        VIDEO: FilmIcon,
                        SLIDE: PresentationChartBarIcon,
                        CODE: CodeBracketIcon,
                        LINK: LinkIcon,
                        OTHER: DocumentIcon,
                      }[resource.resource_type] || DocumentIcon;
                      return (
                      <div
                        key={resource.id}
                        className="group flex items-center gap-3 rounded-lg p-3 transition-colors"
                        style={{ cursor: 'pointer' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        <ResIcon className="h-5 w-5 flex-shrink-0" style={{ color: 'var(--text-faint)' }} />
                        <div className="min-w-0 flex-1">
                          {isLink && resource.external_url ? (
                            <a
                              href={resource.external_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1.5 truncate font-medium transition-colors"
                              style={{ color: 'var(--text-secondary)' }}
                              onClick={e => e.stopPropagation()}
                            >
                              {resource.title}
                              <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5 flex-shrink-0 opacity-60" />
                            </a>
                          ) : (
                          <Link
                            to={`/courses/${courseId}/modules/${module.id}/resources/${resource.id}`}
                            className="block truncate font-medium transition-colors"
                            style={{ color: 'var(--text-secondary)' }}
                          >
                            {resource.title}
                          </Link>
                          )}
                          {resource.description && (
                            <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>{resource.description}</p>
                          )}
                        </div>
                        <span className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-faint)' }}>
                          {resource.resource_type}
                        </span>
                        {isInstructor && (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.preventDefault();
                              onDeleteResource(module.id, resource);
                            }}
                            className="p-1 transition-colors"
                            style={{ color: 'var(--text-faint)' }}
                            onMouseEnter={e => (e.currentTarget.style.color = 'var(--fn-error)')}
                            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-faint)')}
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {module.resources &&
                module.resources.length > 0 &&
                module.assignments &&
                module.assignments.length > 0 && (
                  <div className="my-6" style={{ borderTop: '1px solid var(--border-subtle)' }} />
                )}

              {module.assignments && module.assignments.length > 0 && (
                <div>
                  <div className="mb-3 flex items-center gap-2">
                    <DocumentTextIcon className="h-5 w-5" style={{ color: 'var(--fn-success)' }} />
                    <h4
                      className="text-sm font-semibold uppercase tracking-wider"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      {t('assignments.title')}
                    </h4>
                  </div>
                  <div className="space-y-2 pl-2">
                    {module.assignments.map((assignment) => (
                      <Link key={assignment.id} to={`/courses/${courseId}/modules/${module.id}/assignments/${assignment.id}`} className="block">
                        <div
                          className="group flex items-center gap-3 rounded-lg border p-3 transition-colors"
                          style={{ borderColor: 'transparent' }}
                          onMouseEnter={e => {
                            e.currentTarget.style.background = 'var(--bg-hover)';
                            e.currentTarget.style.borderColor = 'var(--border-default)';
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.borderColor = 'transparent';
                          }}
                        >
                          <CheckCircleIcon className="h-5 w-5 flex-shrink-0" style={{ color: 'var(--fn-success)' }} />
                          <div className="min-w-0 flex-1">
                            <div className="font-medium" style={{ color: 'var(--text-primary)' }}>
                              {assignment.title}
                            </div>
                            <div className="mt-1 flex items-center gap-3 text-sm" style={{ color: 'var(--text-muted)' }}>
                              {assignment.due_date && (
                                <span className="flex items-center gap-1">
                                  <ClockIcon className="h-4 w-4" />
                                  {new Date(assignment.due_date).toLocaleDateString()}
                                </span>
                              )}
                              <span>
                                {assignment.max_points} {t('assignments.points')}
                              </span>
                            </div>
                          </div>
                          <span className="badge badge-success">
                            {t('common.published')}
                          </span>

                          {isInstructor && (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.preventDefault();
                                  navigate(`/courses/${courseId}/modules/${module.id}/assignments/${assignment.id}/edit`);
                                }}
                                className="p-1 transition-colors"
                                style={{ color: 'var(--text-faint)' }}
                                onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
                                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-faint)')}
                              >
                                <PencilIcon className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.preventDefault();
                                  onDeleteAssignment(assignment);
                                }}
                                className="p-1 transition-colors"
                                style={{ color: 'var(--text-faint)' }}
                                onMouseEnter={e => (e.currentTarget.style.color = 'var(--fn-error)')}
                                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-faint)')}
                              >
                                <TrashIcon className="h-4 w-4" />
                              </button>
                            </div>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {(!module.resources || module.resources.length === 0) &&
                (!module.assignments || module.assignments.length === 0) && (
                  <p
                    className="py-8 text-center text-sm italic"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {t('modules.noContent')}
                  </p>
                )}
            </CardBody>
          )}
        </Card>
      ))}
    </div>
  );
};
