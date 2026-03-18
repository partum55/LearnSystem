import React, { useState, useCallback, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import {
  ChevronRightIcon,
  XMarkIcon,
  ClipboardDocumentListIcon,
} from '@heroicons/react/24/outline';
import { useCourseQuery, useModulesQuery } from '../queries/useCourseQueries';
import { useAssignmentsQuery } from '../queries/useAssessmentQueries';
import { resourceTypeInfo } from '../utils/resourceIcons';
import { CollapseSection } from './animation';
import type { Module, Resource, Assignment } from '../types';

interface CourseSidebarProps {
  courseId: string;
  isOpen?: boolean;
  onClose?: () => void;
}

const readExpandedModules = (courseId: string): Set<string> | null => {
  try {
    const stored = sessionStorage.getItem(`courseSidebar_${courseId}_expanded`);
    if (!stored) return null;
    return new Set(JSON.parse(stored));
  } catch {
    return null;
  }
};

export const CourseSidebar: React.FC<CourseSidebarProps> = ({ courseId, isOpen = false, onClose }) => {
  const { t } = useTranslation();
  const location = useLocation();
  const { data: course } = useCourseQuery(courseId);
  const { data: modules, isLoading: modulesLoading } = useModulesQuery(courseId);
  const { data: assignments } = useAssignmentsQuery(courseId);

  // Persist expanded/collapsed state per course in sessionStorage
  const [expandedModules, setExpandedModules] = useState<Set<string> | null>(() =>
    readExpandedModules(courseId)
  );

  const effectiveExpandedModules = React.useMemo(() => {
    if (expandedModules) return expandedModules;
    if (!modules || modules.length === 0) return new Set<string>();
    return new Set(modules.map((m) => m.id));
  }, [expandedModules, modules]);

  const allExpanded = React.useMemo(() => {
    if (!modules || modules.length === 0) return false;
    return effectiveExpandedModules.size === modules.length;
  }, [effectiveExpandedModules, modules]);

  // Persist expanded state
  useEffect(() => {
    if (expandedModules === null) return;
    sessionStorage.setItem(
      `courseSidebar_${courseId}_expanded`,
      JSON.stringify([...expandedModules])
    );
  }, [expandedModules, courseId]);

  const toggleModule = useCallback((moduleId: string) => {
    setExpandedModules((prev) => {
      const base = prev ?? new Set((modules || []).map((m) => m.id));
      const next = new Set(base);
      if (next.has(moduleId)) {
        next.delete(moduleId);
      } else {
        next.add(moduleId);
      }
      return next;
    });
  }, [modules]);

  const toggleAll = useCallback(() => {
    if (allExpanded) {
      setExpandedModules(new Set());
    } else if (modules) {
      setExpandedModules(new Set(modules.map((m) => m.id)));
    }
  }, [allExpanded, modules]);

  // Group assignments by module
  const assignmentsByModule = React.useMemo(() => {
    const map = new Map<string, Assignment[]>();
    if (assignments) {
      for (const a of assignments) {
        if (a.module_id) {
          const list = map.get(a.module_id) || [];
          list.push(a);
          map.set(a.module_id, list);
        }
      }
    }
    return map;
  }, [assignments]);

  // Check if a path is active
  const isActive = (path: string) => location.pathname === path;

  const renderSkeleton = () => (
    <div className="px-3 py-2 space-y-3 animate-pulse">
      {[1, 2, 3].map((i) => (
        <div key={i} className="space-y-1.5">
          <div className="h-4 rounded" style={{ background: 'var(--bg-overlay)', width: '70%' }} />
          <div className="ml-4 space-y-1">
            <div className="h-3 rounded" style={{ background: 'var(--bg-overlay)', width: '85%' }} />
            <div className="h-3 rounded" style={{ background: 'var(--bg-overlay)', width: '60%' }} />
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          style={{ background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(2px)' }}
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={clsx(
          'fixed inset-y-0 right-0 z-50 w-60 transform transition-transform duration-200 lg:relative lg:inset-auto lg:translate-x-0 flex flex-col flex-shrink-0 self-stretch',
          isOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
        )}
        style={{
          background: 'var(--bg-surface)',
          borderLeft: '1px solid var(--border-default)',
          fontFamily: 'var(--font-body)',
        }}
      >
        {/* Mobile close */}
        <div className="lg:hidden flex justify-end p-3">
          <button
            onClick={onClose}
            className="p-1 rounded-md"
            style={{ color: 'var(--text-muted)' }}
            aria-label="Close course sidebar"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Course title */}
        <div className="px-3 pt-2 pb-2" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <NavLink
            to={`/courses/${courseId}`}
            className="block text-[13px] font-semibold truncate transition-colors"
            style={{
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-display)',
            }}
          >
            {course?.title || t('courseSidebar.title', 'Course Structure')}
          </NavLink>
          {modules && modules.length > 0 && (
            <button
              onClick={toggleAll}
              className="text-[10px] mt-1 transition-colors"
              style={{ color: 'var(--text-faint)' }}
            >
              {allExpanded ? 'Collapse all' : 'Expand all'}
            </button>
          )}
        </div>

        {/* Modules tree */}
        <nav className="flex-1 overflow-y-auto py-1.5">
          {modulesLoading ? (
            renderSkeleton()
          ) : !modules || modules.length === 0 ? (
            <div className="px-3 py-6 text-center">
              <p className="text-xs" style={{ color: 'var(--text-faint)' }}>
                {t('courseSidebar.noModules', 'No modules yet')}
              </p>
            </div>
          ) : (
            modules.map((mod: Module) => {
              const isExpanded = effectiveExpandedModules.has(mod.id);
              const modResources: Resource[] = mod.resources || [];
              const modAssignments = assignmentsByModule.get(mod.id) || [];

              return (
                <div key={mod.id} className="px-1.5">
                  {/* Module header */}
                  <button
                    onClick={() => toggleModule(mod.id)}
                    className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-md text-[12px] font-medium transition-colors hover:bg-white/[0.04]"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    <ChevronRightIcon
                      className={clsx(
                        'h-3 w-3 flex-shrink-0 transition-transform duration-150',
                        isExpanded && 'rotate-90'
                      )}
                      style={{ color: 'var(--text-faint)' }}
                    />
                    <span className="truncate">{mod.title}</span>
                  </button>

                  {/* Children */}
                  <CollapseSection isOpen={isExpanded}>
                    <div className="ml-3 pl-2 mb-1" style={{ borderLeft: '1px solid var(--border-subtle)' }}>
                      {/* Resources */}
                      {modResources.map((res: Resource) => {
                        const info = resourceTypeInfo[res.resource_type] || resourceTypeInfo.OTHER;
                        const Icon = info.icon;
                        const resPath = `/courses/${courseId}/modules/${mod.id}/resources/${res.id}`;
                        const active = isActive(resPath);

                        return (
                          <NavLink
                            key={res.id}
                            to={resPath}
                            onClick={onClose}
                            className="flex items-center gap-1.5 px-2 py-1 rounded text-[11px] transition-colors"
                            style={{
                              background: active ? 'var(--bg-active)' : 'transparent',
                              color: active ? 'var(--text-primary)' : 'var(--text-muted)',
                            }}
                          >
                            <Icon className="h-3 w-3 flex-shrink-0" style={{ color: active ? 'var(--text-primary)' : 'var(--text-faint)' }} />
                            <span className="truncate">{res.title}</span>
                          </NavLink>
                        );
                      })}

                      {/* Assignments */}
                      {modAssignments.map((asn: Assignment) => {
                        const asnPath = `/courses/${courseId}/modules/${mod.id}/assignments/${asn.id}`;
                        const active = isActive(asnPath);

                        return (
                          <NavLink
                            key={asn.id}
                            to={asnPath}
                            onClick={onClose}
                            className="flex items-center gap-1.5 px-2 py-1 rounded text-[11px] transition-colors"
                            style={{
                              background: active ? 'var(--bg-active)' : 'transparent',
                              color: active ? 'var(--text-primary)' : 'var(--text-muted)',
                            }}
                          >
                            <ClipboardDocumentListIcon
                              className="h-3 w-3 flex-shrink-0"
                              style={{ color: active ? 'var(--text-primary)' : 'var(--text-faint)' }}
                            />
                            <span className="truncate flex-1">{asn.title}</span>
                            {asn.due_date && (
                              <span
                                className="text-[9px] flex-shrink-0"
                                style={{ color: 'var(--text-faint)' }}
                              >
                                {new Date(asn.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                              </span>
                            )}
                          </NavLink>
                        );
                      })}

                      {modResources.length === 0 && modAssignments.length === 0 && (
                        <p className="px-2 py-1 text-[10px]" style={{ color: 'var(--text-faint)' }}>
                          Empty
                        </p>
                      )}
                    </div>
                  </CollapseSection>
                </div>
              );
            })
          )}
        </nav>
      </aside>
    </>
  );
};
