import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Resource, ResourceType } from '../../types';
import { resourcesApi } from '../../api/courses';
import { WizardResource } from '../../pages/assignment-wizard/wizardTypes';
import ResourceCard from './ResourceCard';

interface ResourceLibraryDrawerProps {
  courseId: string;
  moduleId: string;
  onSelect: (resources: WizardResource[]) => void;
  onClose: () => void;
}

const ALL_TYPES: ResourceType[] = ['VIDEO', 'PDF', 'SLIDE', 'LINK', 'TEXT', 'CODE', 'OTHER'];

const ResourceLibraryDrawer: React.FC<ResourceLibraryDrawerProps> = ({
  courseId,
  moduleId,
  onSelect,
  onClose,
}) => {
  const { t } = useTranslation();
  const [resources, setResources] = useState<Resource[]>([]);
  const [loadedScopeKey, setLoadedScopeKey] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<ResourceType | ''>('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const scopeKey = courseId && moduleId ? `${courseId}:${moduleId}` : null;
  const loading = scopeKey !== null && loadedScopeKey !== scopeKey;

  useEffect(() => {
    if (!scopeKey || !courseId || !moduleId) return;

    let active = true;
    resourcesApi.getAll(courseId, moduleId)
      .then((res) => {
        if (!active) return;
        const data = res.data;
        setResources(Array.isArray(data) ? data : (data as { content?: Resource[] }).content || []);
      })
      .catch(() => {
        if (!active) return;
        setResources([]);
      })
      .finally(() => {
        if (!active) return;
        setLoadedScopeKey(scopeKey);
      });

    return () => {
      active = false;
    };
  }, [courseId, moduleId, scopeKey]);

  const availableResources = scopeKey ? resources : [];

  const filtered = availableResources.filter((r) => {
    if (filterType && r.resourceType !== filterType) return false;
    if (search && !r.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const toggleResource = (resource: Resource) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(resource.id)) {
        next.delete(resource.id);
      } else {
        next.add(resource.id);
      }
      return next;
    });
  };

  const handleConfirm = () => {
    const selectedResources: WizardResource[] = availableResources
      .filter((r) => selected.has(r.id))
      .map((r) => ({
        id: r.id,
        name: r.title,
        url: r.fileUrl || r.externalUrl || '',
        type: r.resourceType,
        resource_id: r.id,
      }));
    onSelect(selectedResources);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        style={{ background: 'rgba(0,0,0,0.5)' }}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className="fixed right-0 top-0 h-full w-full max-w-lg z-50 flex flex-col"
        style={{ background: 'var(--bg-surface)', borderLeft: '1px solid var(--border-default)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4" style={{ borderBottom: '1px solid var(--border-default)' }}>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
            {t('resourceLibrary.title', 'Resource Library')}
          </h2>
          <button type="button" onClick={onClose} className="p-1 rounded transition-colors hover:bg-[var(--bg-active)]">
            <svg className="w-5 h-5" style={{ color: 'var(--text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search and filter */}
        <div className="p-4 space-y-3" style={{ borderBottom: '1px solid var(--border-default)' }}>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('common.search', 'Search...')}
            className="input w-full text-sm"
          />
          <div className="flex gap-1 flex-wrap">
            <button
              type="button"
              onClick={() => setFilterType('')}
              className="px-2.5 py-1 text-xs rounded-full transition-colors"
              style={{
                background: filterType === '' ? 'var(--text-primary)' : 'var(--bg-overlay)',
                color: filterType === '' ? 'var(--bg-base)' : 'var(--text-muted)',
              }}
            >
              {t('courses.all', 'All')}
            </button>
            {ALL_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setFilterType(type)}
                className="px-2.5 py-1 text-xs rounded-full transition-colors"
                style={{
                  background: filterType === type ? 'var(--text-primary)' : 'var(--bg-overlay)',
                  color: filterType === type ? 'var(--bg-base)' : 'var(--text-muted)',
                }}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Resource grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full" style={{ borderBottom: '2px solid var(--text-primary)' }} />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                {t('resourceLibrary.noResources', 'No resources found')}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2">
              {filtered.map((resource) => (
                <ResourceCard
                  key={resource.id}
                  resource={resource}
                  selected={selected.has(resource.id)}
                  onToggle={toggleResource}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 flex gap-3" style={{ borderTop: '1px solid var(--border-default)' }}>
          <button type="button" onClick={onClose} className="btn btn-secondary flex-1 py-2.5">
            {t('common.cancel', 'Cancel')}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={selected.size === 0}
            className="btn btn-primary flex-1 py-2.5"
          >
            {t('resourceLibrary.attach', 'Attach')} ({selected.size})
          </button>
        </div>
      </div>
    </>
  );
};

export default ResourceLibraryDrawer;
