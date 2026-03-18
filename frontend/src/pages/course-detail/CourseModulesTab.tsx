import React, { useEffect, useMemo, useState } from 'react';
import { TFunction } from 'i18next';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowTopRightOnSquareIcon,
  Bars3Icon,
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
import {
  DragDropContext,
  Draggable,
  DraggableProvidedDragHandleProps,
  Droppable,
  DropResult,
} from 'react-beautiful-dnd';
import { Button, Card, CardBody, CardHeader } from '../../components';
import { RichContentRenderer } from '../../components/common/RichContentRenderer';
import { submissionsApi } from '../../api/assessments';
import { topicsApi } from '../../api/courses';
import { Assignment, Module, Resource, Topic } from '../../types';

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
  onReorderModules: (moduleIds: string[]) => Promise<void>;
  onReorderResources: (moduleId: string, resourceIds: string[]) => Promise<void>;
  onEditModuleStructure: (module: Module, patch: { topic?: string; tags?: string[] }) => Promise<void>;
  t: TFunction;
}

const reorderList = <T,>(items: T[], fromIndex: number, toIndex: number): T[] => {
  const cloned = [...items];
  const [moved] = cloned.splice(fromIndex, 1);
  cloned.splice(toIndex, 0, moved);
  return cloned;
};

const resourceDroppableId = (moduleId: string) => `resources-${moduleId}`;

const extractModuleId = (droppableId: string): string | null => {
  if (!droppableId.startsWith('resources-')) {
    return null;
  }
  return droppableId.replace('resources-', '');
};

const isCompletedSubmissionStatus = (status?: string | null): boolean =>
  status === 'SUBMITTED' || status === 'GRADED';

const parseModuleMeta = (module: Module): { topic: string; tags: string[] } => {
  const meta = (module.content_meta || {}) as Record<string, unknown>;
  const topic = typeof meta.topic === 'string' ? meta.topic.trim() : '';
  const tags =
    Array.isArray(meta.tags)
      ? meta.tags.filter((item): item is string => typeof item === 'string').map((tag) => tag.trim()).filter(Boolean)
      : typeof meta.tags === 'string'
        ? meta.tags.split(',').map((tag) => tag.trim()).filter(Boolean)
        : [];
  return { topic, tags };
};

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
  onReorderModules,
  onReorderResources,
  onEditModuleStructure,
  t,
}) => {
  const navigate = useNavigate();
  const [displayModules, setDisplayModules] = useState<Module[]>(modules);
  const [isReorderingModules, setIsReorderingModules] = useState(false);
  const [reorderingResourcesModuleId, setReorderingResourcesModuleId] = useState<string | null>(null);
  const [assignmentSubmissionStatus, setAssignmentSubmissionStatus] = useState<Record<string, string | null>>({});
  const [moduleTopics, setModuleTopics] = useState<Record<string, Topic[]>>({});
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());

  useEffect(() => {
    setDisplayModules(modules);
  }, [modules]);

  const assignmentIds = useMemo(
    () =>
      Array.from(
        new Set(
          (displayModules || [])
            .flatMap((module) => module.assignments || [])
            .map((assignment) => assignment.id)
            .filter((id): id is string => Boolean(id))
        )
      ),
    [displayModules]
  );

  useEffect(() => {
    if (isInstructor || assignmentIds.length === 0) {
      setAssignmentSubmissionStatus({});
      return;
    }

    let cancelled = false;

    void (async () => {
      const results = await Promise.all(
        assignmentIds.map(async (assignmentId) => {
          try {
            const response = await submissionsApi.getMySubmission(assignmentId);
            const payload = response.data as { status?: string } | null;
            return [assignmentId, payload?.status ? String(payload.status).toUpperCase() : null] as const;
          } catch {
            return [assignmentId, null] as const;
          }
        })
      );

      if (cancelled) {
        return;
      }

      setAssignmentSubmissionStatus(
        results.reduce<Record<string, string | null>>((acc, [assignmentId, status]) => {
          acc[assignmentId] = status;
          return acc;
        }, {})
      );
    })();

    return () => {
      cancelled = true;
    };
  }, [assignmentIds, isInstructor]);

  // Fetch topics for expanded modules
  useEffect(() => {
    const expandedIds = Array.from(expandedModules);
    const missingIds = expandedIds.filter((id) => !(id in moduleTopics));
    if (missingIds.length === 0) return;

    let cancelled = false;
    void (async () => {
      const results = await Promise.all(
        missingIds.map(async (moduleId) => {
          try {
            const response = await topicsApi.getAll(courseId, moduleId);
            return [moduleId, response.data] as const;
          } catch {
            return [moduleId, [] as Topic[]] as const;
          }
        })
      );
      if (cancelled) return;
      setModuleTopics((prev) => {
        const next = { ...prev };
        for (const [moduleId, topics] of results) {
          next[moduleId] = topics;
        }
        return next;
      });
    })();
    return () => { cancelled = true; };
  }, [expandedModules, courseId]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleTopic = (topicId: string) => {
    setExpandedTopics((prev) => {
      const next = new Set(prev);
      if (next.has(topicId)) next.delete(topicId);
      else next.add(topicId);
      return next;
    });
  };

  const handleCreateTopic = async (moduleId: string) => {
    const title = window.prompt(t('modules.topicTitlePlaceholder', 'Enter topic title'));
    if (!title?.trim()) return;
    try {
      const response = await topicsApi.create(courseId, moduleId, { title: title.trim() });
      setModuleTopics((prev) => ({
        ...prev,
        [moduleId]: [...(prev[moduleId] || []), response.data],
      }));
    } catch {
      window.alert(t('modules.topicCreateFailed', 'Failed to create topic.'));
    }
  };

  const handleEditTopic = async (moduleId: string, topic: Topic) => {
    const title = window.prompt(t('modules.topicTitlePlaceholder', 'Enter topic title'), topic.title);
    if (title === null) return;
    const description = window.prompt(
      t('modules.topicDescriptionPlaceholder', 'Enter topic description (optional)'),
      topic.description || ''
    );
    if (description === null) return;
    try {
      const response = await topicsApi.update(courseId, moduleId, topic.id, {
        title: title.trim() || topic.title,
        description: description.trim() || undefined,
      });
      setModuleTopics((prev) => ({
        ...prev,
        [moduleId]: (prev[moduleId] || []).map((t) => (t.id === topic.id ? response.data : t)),
      }));
    } catch {
      window.alert(t('modules.topicUpdateFailed', 'Failed to update topic.'));
    }
  };

  const handleDeleteTopic = async (moduleId: string, topic: Topic) => {
    if (!window.confirm(t('modules.deleteTopicConfirm', { title: topic.title }))) return;
    try {
      await topicsApi.delete(courseId, moduleId, topic.id);
      setModuleTopics((prev) => ({
        ...prev,
        [moduleId]: (prev[moduleId] || []).filter((t) => t.id !== topic.id),
      }));
    } catch {
      window.alert(t('modules.topicDeleteFailed', 'Failed to delete topic.'));
    }
  };

  const handleReorderTopics = async (moduleId: string, result: DropResult) => {
    if (!result.destination || result.destination.index === result.source.index) return;
    const topics = moduleTopics[moduleId] || [];
    const reordered = reorderList(topics, result.source.index, result.destination.index);
    setModuleTopics((prev) => ({ ...prev, [moduleId]: reordered }));
    try {
      await topicsApi.reorder(courseId, moduleId, reordered.map((t) => t.id));
    } catch {
      setModuleTopics((prev) => ({ ...prev, [moduleId]: topics }));
      window.alert(t('modules.topicReorderFailed', 'Failed to reorder topics.'));
    }
  };

  const checkpointStats = useMemo(() => {
    const moduleStats = displayModules.map((module) => {
      const assignments = module.assignments || [];
      const requiredAssignments = assignments.filter((assignment) => assignment.requires_submission !== false);
      const totalAssignments = requiredAssignments.length;
      const completedAssignments = requiredAssignments.filter((assignment) => {
        const status = assignmentSubmissionStatus[assignment.id];
        if (isCompletedSubmissionStatus(status)) {
          return true;
        }
        return Boolean(assignment.submission?.submitted_at || assignment.submission?.graded_at);
      }).length;

      return {
        moduleId: module.id,
        moduleTitle: module.title,
        totalAssignments,
        completedAssignments,
        isComplete:
          totalAssignments === 0 || completedAssignments >= totalAssignments,
      };
    });

    const completedModules = moduleStats.filter((stat) => stat.isComplete).length;
    const totalModules = moduleStats.length;

    return {
      moduleStats,
      completedModules,
      totalModules,
      remainingModules: Math.max(totalModules - completedModules, 0),
    };
  }, [assignmentSubmissionStatus, displayModules]);

  const handleModuleReorder = async (result: DropResult) => {
    if (!result.destination || result.destination.index === result.source.index) {
      return;
    }

    const previous = displayModules;
    const next = reorderList(displayModules, result.source.index, result.destination.index);
    setDisplayModules(next);
    setIsReorderingModules(true);

    try {
      await onReorderModules(next.map((module) => module.id));
    } catch {
      setDisplayModules(previous);
      window.alert(t('modules.reorderFailed', 'Failed to reorder modules.'));
    } finally {
      setIsReorderingModules(false);
    }
  };

  const handleResourceReorder = async (result: DropResult) => {
    if (!result.destination || result.destination.index === result.source.index) {
      return;
    }

    if (result.source.droppableId !== result.destination.droppableId) {
      window.alert(t('modules.crossModuleReorderNotSupported', 'Moving resources between modules is not supported yet.'));
      return;
    }

    const moduleId = extractModuleId(result.source.droppableId);
    if (!moduleId) {
      return;
    }

    const targetModule = displayModules.find((module) => module.id === moduleId);
    const resources = targetModule?.resources || [];

    if (!targetModule || resources.length <= 1) {
      return;
    }

    const previous = displayModules;
    const reorderedResources = reorderList(resources, result.source.index, result.destination.index);
    const next = displayModules.map((module) =>
      module.id === moduleId
        ? {
            ...module,
            resources: reorderedResources,
          }
        : module
    );

    setDisplayModules(next);
    setReorderingResourcesModuleId(moduleId);

    try {
      await onReorderResources(moduleId, reorderedResources.map((resource) => resource.id));
    } catch {
      setDisplayModules(previous);
      window.alert(t('modules.reorderResourcesFailed', 'Failed to reorder resources.'));
    } finally {
      setReorderingResourcesModuleId(null);
    }
  };

  const handleDragEnd = async (result: DropResult) => {
    if (!isInstructor) {
      return;
    }

    if (result.type === 'MODULE') {
      await handleModuleReorder(result);
      return;
    }

    if (result.type === 'RESOURCE') {
      await handleResourceReorder(result);
      return;
    }

    if (result.type === 'TOPIC') {
      const moduleId = result.source.droppableId.replace('topics-', '');
      await handleReorderTopics(moduleId, result);
    }
  };

  const renderResource = (
    module: Module,
    resource: Resource,
    dragHandleProps?: DraggableProvidedDragHandleProps | null
  ) => {
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
        onMouseEnter={(event) => (event.currentTarget.style.background = 'var(--bg-hover)')}
        onMouseLeave={(event) => (event.currentTarget.style.background = 'transparent')}
      >
        {isInstructor && dragHandleProps && (
          <button
            type="button"
            {...dragHandleProps}
            onClick={(event) => event.stopPropagation()}
            className="cursor-grab rounded p-1 active:cursor-grabbing"
            style={{ color: 'var(--text-faint)' }}
            title={t('modules.dragToReorder', 'Drag to reorder')}
          >
            <Bars3Icon className="h-4 w-4" />
          </button>
        )}

        <ResIcon className="h-5 w-5 flex-shrink-0" style={{ color: 'var(--text-faint)' }} />
        <div className="min-w-0 flex-1">
          {isLink && resource.external_url ? (
            <a
              href={resource.external_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 truncate font-medium transition-colors"
              style={{ color: 'var(--text-secondary)' }}
              onClick={(event) => event.stopPropagation()}
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
            <RichContentRenderer content={resource.description} className="mt-1 text-sm" />
          )}
        </div>
        <span className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-faint)' }}>
          {resource.resource_type}
        </span>
        {isInstructor && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={(event) => {
                event.preventDefault();
                navigate(`/courses/${courseId}/modules/${module.id}/resources/${resource.id}/edit`);
              }}
              className="p-1 transition-colors"
              style={{ color: 'var(--text-faint)' }}
              onMouseEnter={(event) => (event.currentTarget.style.color = 'var(--text-primary)')}
              onMouseLeave={(event) => (event.currentTarget.style.color = 'var(--text-faint)')}
            >
              <PencilIcon className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={(event) => {
                event.preventDefault();
                onDeleteResource(module.id, resource);
              }}
              className="p-1 transition-colors"
              style={{ color: 'var(--text-faint)' }}
              onMouseEnter={(event) => (event.currentTarget.style.color = 'var(--fn-error)')}
              onMouseLeave={(event) => (event.currentTarget.style.color = 'var(--text-faint)')}
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderAssignmentRow = (module: Module, assignment: Assignment) => (
    <Link key={assignment.id} to={`/courses/${courseId}/modules/${module.id}/assignments/${assignment.id}`} className="block">
      <div
        className="group flex items-center gap-3 rounded-lg border p-3 transition-colors"
        style={{ borderColor: 'transparent' }}
        onMouseEnter={(event) => {
          event.currentTarget.style.background = 'var(--bg-hover)';
          event.currentTarget.style.borderColor = 'var(--border-default)';
        }}
        onMouseLeave={(event) => {
          event.currentTarget.style.background = 'transparent';
          event.currentTarget.style.borderColor = 'transparent';
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
              onMouseEnter={(event) => (event.currentTarget.style.color = 'var(--text-primary)')}
              onMouseLeave={(event) => (event.currentTarget.style.color = 'var(--text-faint)')}
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
              onMouseEnter={(event) => (event.currentTarget.style.color = 'var(--fn-error)')}
              onMouseLeave={(event) => (event.currentTarget.style.color = 'var(--text-faint)')}
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </Link>
  );

  const renderTopicsAndAssignments = (module: Module) => {
    const topics = moduleTopics[module.id] || [];
    const assignments = module.assignments || [];

    // No topics — show flat assignment list (original behavior)
    if (topics.length === 0) {
      if (assignments.length === 0) return null;
      return (
        <div>
          <div className="mb-3 flex items-center gap-2">
            <DocumentTextIcon className="h-5 w-5" style={{ color: 'var(--fn-success)' }} />
            <h4 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              {t('assignments.title')}
            </h4>
          </div>
          <div className="space-y-2 pl-2">
            {assignments.map((a) => renderAssignmentRow(module, a))}
          </div>
        </div>
      );
    }

    // Topics exist — group assignments and resources by topic
    const resources = module.resources || [];
    const uncategorized = assignments.filter((a) => !a.topic_id || !topics.some((tp) => tp.id === a.topic_id));
    const uncategorizedResources = resources.filter((r) => !r.topic_id || !topics.some((tp) => tp.id === r.topic_id));
    const assignmentsByTopic = new Map<string, Assignment[]>();
    const resourcesByTopic = new Map<string, Resource[]>();
    for (const topic of topics) {
      assignmentsByTopic.set(topic.id, assignments.filter((a) => a.topic_id === topic.id));
      resourcesByTopic.set(topic.id, resources.filter((r) => r.topic_id === topic.id));
    }

    return (
      <div>
        <div className="mb-3 flex items-center gap-2">
          <FolderIcon className="h-5 w-5" style={{ color: 'var(--text-secondary)' }} />
          <h4 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            {t('modules.topics')}
          </h4>
        </div>

        {/* Uncategorized items (no topic) */}
        {(uncategorized.length > 0 || uncategorizedResources.length > 0) && (
          <div className="mb-4 pl-2">
            <p className="mb-2 text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-faint)' }}>
              {t('modules.uncategorized', 'General')}
            </p>
            <div className="space-y-2 pl-2">
              {uncategorizedResources.map((r) => renderResource(module, r))}
              {uncategorized.map((a) => renderAssignmentRow(module, a))}
            </div>
          </div>
        )}

        {/* Topics with their assignments */}
        <Droppable droppableId={`topics-${module.id}`} type="TOPIC" isDropDisabled={!isInstructor}>
          {(provided) => (
            <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-3 pl-2">
              {topics.map((topic, index) => {
                const topicAssignments = assignmentsByTopic.get(topic.id) || [];
                const topicResources = resourcesByTopic.get(topic.id) || [];
                const topicItemCount = topicAssignments.length + topicResources.length;
                const isExpanded = expandedTopics.has(topic.id);

                return (
                  <Draggable
                    key={topic.id}
                    draggableId={`topic-${topic.id}`}
                    index={index}
                    isDragDisabled={!isInstructor}
                  >
                    {(dragProvided) => (
                      <div
                        ref={dragProvided.innerRef}
                        {...dragProvided.draggableProps}
                        style={dragProvided.draggableProps.style}
                        className="rounded-lg"
                      >
                        <div
                          className="flex cursor-pointer items-center gap-2 rounded-lg p-2 transition-colors"
                          style={{ background: 'var(--bg-elevated)' }}
                          onClick={() => toggleTopic(topic.id)}
                        >
                          {isInstructor && (
                            <button
                              type="button"
                              {...dragProvided.dragHandleProps}
                              onClick={(e) => e.stopPropagation()}
                              className="cursor-grab rounded p-0.5 active:cursor-grabbing"
                              style={{ color: 'var(--text-faint)' }}
                            >
                              <Bars3Icon className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {isExpanded ? (
                            <ChevronDownIcon className="h-4 w-4" style={{ color: 'var(--text-muted)' }} />
                          ) : (
                            <ChevronRightIcon className="h-4 w-4" style={{ color: 'var(--text-muted)' }} />
                          )}
                          <span className="flex-1 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                            {topic.title}
                          </span>
                          <span className="text-xs" style={{ color: 'var(--text-faint)' }}>
                            {topicItemCount} {topicItemCount === 1 ? 'item' : 'items'}
                          </span>
                          {isInstructor && (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  void handleEditTopic(module.id, topic);
                                }}
                                className="p-0.5 transition-colors"
                                style={{ color: 'var(--text-faint)' }}
                                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
                                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-faint)')}
                              >
                                <PencilIcon className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  void handleDeleteTopic(module.id, topic);
                                }}
                                className="p-0.5 transition-colors"
                                style={{ color: 'var(--text-faint)' }}
                                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--fn-error)')}
                                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-faint)')}
                              >
                                <TrashIcon className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                        {isExpanded && (
                          <div className="mt-1 pl-6">
                            {topic.description && (
                              <p className="mb-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                                {topic.description}
                              </p>
                            )}
                            {topicItemCount > 0 ? (
                              <div className="space-y-2">
                                {topicResources.map((r) => renderResource(module, r))}
                                {topicAssignments.map((a) => renderAssignmentRow(module, a))}
                              </div>
                            ) : (
                              <p className="py-2 text-xs italic" style={{ color: 'var(--text-faint)' }}>
                                {t('modules.noContent')}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </Draggable>
                );
              })}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </div>
    );
  };

  const renderModuleBody = (module: Module) => (
    <CardBody>
      {module.description && (
        <div className="mb-6">
          <RichContentRenderer content={module.description} />
        </div>
      )}

      {isInstructor && (
        <div
          className="mb-4 flex flex-wrap gap-2 pb-4"
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
              navigate(`/courses/${courseId}/modules/${module.id}/pages`);
            }}
          >
            <DocumentTextIcon className="mr-1 h-4 w-4" />
            Pages
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
            variant="secondary"
            size="sm"
            onClick={(event) => {
              event.stopPropagation();
              void handleCreateTopic(module.id);
            }}
          >
            <PlusIcon className="mr-1 h-4 w-4" />
            {t('modules.addTopic')}
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

      {(() => {
        const topics = moduleTopics[module.id] || [];
        const moduleLevelResources = topics.length > 0
          ? (module.resources || []).filter((r) => !r.topic_id || !topics.some((tp) => tp.id === r.topic_id))
          : (module.resources || []);
        if (moduleLevelResources.length === 0) return null;
        return (
          <div>
            <div className="mb-3 flex items-center gap-2">
              <FolderIcon className="h-5 w-5" style={{ color: 'var(--text-secondary)' }} />
              <h4
                className="text-sm font-semibold uppercase tracking-wider"
                style={{ color: 'var(--text-muted)' }}
              >
                {t('modules.resources')}
              </h4>
              {isInstructor && (
                <span className="text-xs" style={{ color: 'var(--text-faint)' }}>
                  {reorderingResourcesModuleId === module.id
                    ? t('common.saving', 'Saving...')
                    : t('modules.dragHint', 'Drag to reorder')}
                </span>
              )}
            </div>

            {isInstructor ? (
              <Droppable droppableId={resourceDroppableId(module.id)} type="RESOURCE">
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="space-y-2 rounded-lg pl-2"
                    style={{
                      background: snapshot.isDraggingOver ? 'var(--bg-hover)' : 'transparent',
                      opacity: reorderingResourcesModuleId === module.id ? 0.7 : 1,
                    }}
                  >
                    {moduleLevelResources.map((resource, index) => (
                      <Draggable
                        key={resource.id}
                        draggableId={`resource-${resource.id}`}
                        index={index}
                        isDragDisabled={Boolean(reorderingResourcesModuleId)}
                      >
                        {(dragProvided) => (
                          <div
                            ref={dragProvided.innerRef}
                            {...dragProvided.draggableProps}
                            style={dragProvided.draggableProps.style}
                          >
                            {renderResource(module, resource, dragProvided.dragHandleProps)}
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            ) : (
              <div className="space-y-2 pl-2">
                {moduleLevelResources.map((resource) => renderResource(module, resource))}
              </div>
            )}
          </div>
        );
      })()}

      {module.resources &&
        module.resources.length > 0 &&
        ((module.assignments && module.assignments.length > 0) || (moduleTopics[module.id] && moduleTopics[module.id].length > 0)) && (
          <div className="my-6" style={{ borderTop: '1px solid var(--border-subtle)' }} />
        )}

      {renderTopicsAndAssignments(module)}

      {(!module.resources || module.resources.length === 0) &&
        (!module.assignments || module.assignments.length === 0) &&
        (!moduleTopics[module.id] || moduleTopics[module.id].length === 0) && (
          <p
            className="py-8 text-center text-sm italic"
            style={{ color: 'var(--text-muted)' }}
          >
            {t('modules.noContent')}
          </p>
        )}
    </CardBody>
  );

  const renderModuleCard = (
    module: Module,
    dragHandleProps?: DraggableProvidedDragHandleProps | null,
    isDragging?: boolean
  ) => {
    const moduleMeta = parseModuleMeta(module);
    const moduleCheckpoint = checkpointStats.moduleStats.find((stat) => stat.moduleId === module.id);
    const totalAssignments = moduleCheckpoint?.totalAssignments ?? 0;
    const completedAssignments = moduleCheckpoint?.completedAssignments ?? 0;
    const checkpointLabel =
      totalAssignments === 0
        ? t('modules.checkpointNoTasks', 'No required tasks')
        : completedAssignments >= totalAssignments
          ? t('modules.checkpointDone', 'Completed')
          : completedAssignments > 0
            ? t('modules.checkpointInProgress', 'In progress')
            : t('modules.checkpointPending', 'Not started');

    return (
    <Card key={module.id}>
      <CardHeader>
        <div
          className="flex cursor-pointer items-center justify-between"
          onClick={() => onToggleModule(module.id)}
          style={{ opacity: isDragging ? 0.85 : 1 }}
        >
          <div className="flex items-center gap-2">
            {isInstructor && dragHandleProps && (
              <button
                type="button"
                {...dragHandleProps}
                onClick={(event) => event.stopPropagation()}
                className="cursor-grab rounded p-1 active:cursor-grabbing"
                style={{ color: 'var(--text-faint)' }}
                title={t('modules.dragToReorder', 'Drag to reorder')}
              >
                <Bars3Icon className="h-4 w-4" />
              </button>
            )}
            {expandedModules.has(module.id) ? (
              <ChevronDownIcon className="h-5 w-5" style={{ color: 'var(--text-muted)' }} />
            ) : (
              <ChevronRightIcon className="h-5 w-5" style={{ color: 'var(--text-muted)' }} />
            )}
            <div>
              <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{module.title}</h3>
              {(moduleMeta.topic || moduleMeta.tags.length > 0) && (
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {moduleMeta.topic && `${t('modules.moduleTopic', 'Topic')}: ${moduleMeta.topic}`}
                  {moduleMeta.topic && moduleMeta.tags.length > 0 ? ' · ' : ''}
                  {moduleMeta.tags.length > 0 && `${t('modules.moduleTags', 'Tags')}: ${moduleMeta.tags.join(', ')}`}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isInstructor && (
              <Button
                size="sm"
                variant="secondary"
                onClick={(event) => {
                  event.stopPropagation();
                  const nextTopic = window.prompt(
                    t('modules.moduleTopicPlaceholder', 'Enter module topic'),
                    moduleMeta.topic
                  );
                  if (nextTopic === null) return;
                  const nextTags = window.prompt(
                    t('modules.moduleTagsPlaceholder', 'Comma-separated tags'),
                    moduleMeta.tags.join(', ')
                  );
                  if (nextTags === null) return;

                  void onEditModuleStructure(module, {
                    topic: nextTopic.trim(),
                    tags: nextTags
                      .split(',')
                      .map((tag) => tag.trim())
                      .filter(Boolean),
                  });
                }}
              >
                <PencilIcon className="h-4 w-4 mr-1" />
                {t('modules.editStructure', 'Edit topic')}
              </Button>
            )}
            {!isInstructor && (
              <span
                className="rounded-full px-2 py-1 text-xs"
                style={{
                  background:
                    totalAssignments === 0
                      ? 'var(--bg-elevated)'
                      : completedAssignments >= totalAssignments
                        ? 'rgba(34,197,94,0.12)'
                        : completedAssignments > 0
                          ? 'rgba(245,158,11,0.12)'
                          : 'var(--bg-elevated)',
                  color:
                    totalAssignments === 0
                      ? 'var(--text-muted)'
                      : completedAssignments >= totalAssignments
                        ? 'var(--fn-success)'
                        : completedAssignments > 0
                          ? 'var(--fn-warning)'
                          : 'var(--text-muted)',
                }}
              >
                {checkpointLabel}
              </span>
            )}
            {module.is_published && (
              <span className="badge badge-success">
                <CheckCircleIcon className="mr-1 h-4 w-4" />
                {t('common.published')}
              </span>
            )}
          </div>
        </div>
      </CardHeader>

      {expandedModules.has(module.id) && renderModuleBody(module)}
    </Card>
    );
  };

  if (!displayModules || displayModules.length === 0) {
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
      {!isInstructor && checkpointStats.totalModules > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                  {t('modules.checkpointsTitle', 'Progress checkpoints')}
                </h3>
                <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {t('modules.checkpointsProgress', {
                    completed: checkpointStats.completedModules,
                    total: checkpointStats.totalModules,
                    defaultValue: '{{completed}} of {{total}} modules completed',
                  })}
                </p>
              </div>
              <span className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-faint)' }}>
                {checkpointStats.remainingModules} {t('modules.remaining', 'remaining')}
              </span>
            </div>
          </CardHeader>
          <CardBody>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {checkpointStats.moduleStats.map((stat, index) => (
                <div
                  key={stat.moduleId}
                  className="rounded-md border px-3 py-2"
                  style={{ borderColor: 'var(--border-default)', background: 'var(--bg-elevated)' }}
                >
                  <p className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-faint)' }}>
                    {t('modules.module', 'Module')} {index + 1}
                  </p>
                  <p className="mt-1 truncate text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    {stat.moduleTitle}
                  </p>
                  <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                    {stat.totalAssignments === 0
                      ? t('modules.checkpointNoTasks', 'No required tasks')
                      : `${stat.completedAssignments}/${stat.totalAssignments}`}
                  </p>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

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

      {isInstructor && (
        <p className="text-xs" style={{ color: 'var(--text-faint)' }}>
          {isReorderingModules ? t('common.saving', 'Saving...') : t('modules.dragHint', 'Drag to reorder')}
        </p>
      )}

      {isInstructor ? (
        <DragDropContext onDragEnd={(result) => void handleDragEnd(result)}>
          <Droppable droppableId="course-modules" type="MODULE">
            {(provided, snapshot) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className="space-y-4 rounded-lg"
                style={{ background: snapshot.isDraggingOver ? 'var(--bg-hover)' : 'transparent' }}
              >
                {displayModules.map((module, index) => (
                  <Draggable
                    key={module.id}
                    draggableId={`module-${module.id}`}
                    index={index}
                    isDragDisabled={isReorderingModules || Boolean(reorderingResourcesModuleId)}
                  >
                    {(dragProvided, dragSnapshot) => (
                      <div
                        ref={dragProvided.innerRef}
                        {...dragProvided.draggableProps}
                        style={{
                          ...dragProvided.draggableProps.style,
                          opacity: dragSnapshot.isDragging ? 0.9 : 1,
                        }}
                      >
                        {renderModuleCard(module, dragProvided.dragHandleProps, dragSnapshot.isDragging)}
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      ) : (
        displayModules.map((module) => renderModuleCard(module))
      )}
    </div>
  );
};

export default CourseModulesTab;
