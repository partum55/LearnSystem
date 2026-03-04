import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { TFunction } from 'i18next';
import {
  PlusIcon,
  TrashIcon,
  PencilSquareIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import { Button, Card, CardBody, Loading } from '../../components';
import { coursesApi } from '../../api/courses';
import { extractErrorMessage } from '../../api/client';
import { BlockEditor } from '../../features/editor-core/BlockEditor';
import { DocumentRenderer } from '../../features/editor-core/DocumentRenderer';
import {
  parseCanonicalDocument,
  serializeCanonicalDocument,
} from '../../features/editor-core/documentUtils';
import { CanonicalDocument } from '../../types';

/* ── Multi-page syllabus data model ── */

interface SyllabusPage {
  id: string;
  title: string;
  icon: string;
  content: string; // serialized CanonicalDocument
}

interface SyllabusData {
  version: number;
  pages: SyllabusPage[];
}

const DEFAULT_PAGES: SyllabusPage[] = [
  { id: 'aim', title: 'Aim & Objectives', icon: '🎯', content: '' },
  { id: 'schedule', title: 'Schedule', icon: '📅', content: '' },
  { id: 'grading', title: 'Grading', icon: '📊', content: '' },
  { id: 'materials', title: 'Materials', icon: '📚', content: '' },
  { id: 'policies', title: 'Policies', icon: '📋', content: '' },
];

const createSyllabusData = (): SyllabusData => ({
  version: 1,
  pages: DEFAULT_PAGES.map((p) => ({ ...p })),
});

/** Parse raw syllabus string → SyllabusData. Migrates old single-document format. */
const parseSyllabusData = (raw: string): SyllabusData => {
  if (!raw || !raw.trim()) return createSyllabusData();
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && 'version' in parsed && Array.isArray(parsed.pages)) {
      return parsed as SyllabusData;
    }
    // Legacy: old format was a CanonicalDocument stored directly.
    // Migrate it into the first page.
    const migrated = createSyllabusData();
    migrated.pages[0].content = raw;
    return migrated;
  } catch {
    // Legacy: plain text or CanonicalDocument JSON
    const migrated = createSyllabusData();
    migrated.pages[0].content = raw;
    return migrated;
  }
};

const serializeSyllabusData = (data: SyllabusData): string => JSON.stringify(data);

let pageIdCounter = Date.now();

/* ── Component ── */

interface CourseSyllabusTabProps {
  courseId: string;
  canEdit: boolean;
  initialSyllabus?: string;
  onSyllabusUpdated?: (syllabus: string) => void;
  t: TFunction;
}

export const CourseSyllabusTab: React.FC<CourseSyllabusTabProps> = ({
  courseId,
  canEdit,
  initialSyllabus: _initialSyllabus,
  onSyllabusUpdated,
  t,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [syllabusData, setSyllabusData] = useState<SyllabusData>(createSyllabusData());
  const [savedSnapshot, setSavedSnapshot] = useState('');
  const [activePageIndex, setActivePageIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editingPageTitle, setEditingPageTitle] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchSyllabus = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await coursesApi.getSyllabus(courseId);
        if (cancelled) return;
        const raw = response.data.syllabus ?? '';
        const parsed = parseSyllabusData(raw);
        setSyllabusData(parsed);
        setSavedSnapshot(serializeSyllabusData(parsed));
      } catch (fetchError) {
        if (!cancelled) setError(extractErrorMessage(fetchError));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    void fetchSyllabus();
    return () => { cancelled = true; };
  }, [courseId]);

  const currentPage = syllabusData.pages[activePageIndex] || syllabusData.pages[0];
  const isDirty = useMemo(
    () => serializeSyllabusData(syllabusData) !== savedSnapshot,
    [syllabusData, savedSnapshot],
  );

  const updatePageContent = useCallback(
    (doc: CanonicalDocument) => {
      const serialized = serializeCanonicalDocument(doc);
      setSyllabusData((prev) => ({
        ...prev,
        pages: prev.pages.map((p, idx) =>
          idx === activePageIndex ? { ...p, content: serialized } : p,
        ),
      }));
      if (success) setSuccess(null);
    },
    [activePageIndex, success],
  );

  const updatePageTitle = useCallback(
    (index: number, title: string) => {
      setSyllabusData((prev) => ({
        ...prev,
        pages: prev.pages.map((p, idx) =>
          idx === index ? { ...p, title } : p,
        ),
      }));
    },
    [],
  );

  const addPage = useCallback(() => {
    const newPage: SyllabusPage = {
      id: `page-${++pageIdCounter}`,
      title: `Page ${syllabusData.pages.length + 1}`,
      icon: '📄',
      content: '',
    };
    setSyllabusData((prev) => ({
      ...prev,
      pages: [...prev.pages, newPage],
    }));
    setActivePageIndex(syllabusData.pages.length);
  }, [syllabusData.pages.length]);

  const removePage = useCallback(
    (index: number) => {
      if (syllabusData.pages.length <= 1) return;
      setSyllabusData((prev) => ({
        ...prev,
        pages: prev.pages.filter((_, idx) => idx !== index),
      }));
      setActivePageIndex((prev) => (prev >= index && prev > 0 ? prev - 1 : prev));
    },
    [syllabusData.pages.length],
  );

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const serialized = serializeSyllabusData(syllabusData);
      const response = await coursesApi.updateSyllabus(courseId, serialized);
      const updated = response.data.syllabus ?? '';
      const parsed = parseSyllabusData(updated);
      setSyllabusData(parsed);
      setSavedSnapshot(serializeSyllabusData(parsed));
      onSyllabusUpdated?.(updated);
      setSuccess(t('courses.syllabusSaved', 'Syllabus saved.'));
    } catch (saveError) {
      setError(extractErrorMessage(saveError));
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <Loading />;

  /* ── Page navigation tabs ── */
  const renderPageTabs = (isEditable: boolean) => (
    <div className="flex items-center gap-1 overflow-x-auto pb-1" style={{ scrollbarWidth: 'thin' }}>
      {syllabusData.pages.map((page, idx) => {
        const isActive = idx === activePageIndex;
        return (
          <button
            key={page.id}
            type="button"
            onClick={() => setActivePageIndex(idx)}
            className="group flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors"
            style={{
              background: isActive ? 'var(--bg-active)' : 'transparent',
              color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
              border: isActive ? '1px solid var(--border-strong)' : '1px solid transparent',
            }}
          >
            <span>{page.icon}</span>
            {editingPageTitle === idx && isEditable ? (
              <input
                type="text"
                className="input py-0 px-1 text-sm"
                style={{ width: '120px', minWidth: '80px' }}
                value={page.title}
                autoFocus
                onChange={(e) => updatePageTitle(idx, e.target.value)}
                onBlur={() => setEditingPageTitle(null)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') setEditingPageTitle(null);
                }}
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span>{page.title}</span>
            )}
            {isEditable && isActive && (
              <span className="ml-1 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setEditingPageTitle(idx); }}
                  className="p-0.5 rounded hover:bg-[var(--bg-hover)]"
                  title={t('common.rename', 'Rename')}
                >
                  <PencilSquareIcon className="h-3.5 w-3.5" style={{ color: 'var(--text-faint)' }} />
                </button>
                {syllabusData.pages.length > 1 && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); removePage(idx); }}
                    className="p-0.5 rounded hover:bg-[var(--bg-hover)]"
                    title={t('common.delete', 'Delete')}
                  >
                    <TrashIcon className="h-3.5 w-3.5" style={{ color: 'var(--fn-error)' }} />
                  </button>
                )}
              </span>
            )}
          </button>
        );
      })}
      {isEditable && (
        <button
          type="button"
          onClick={addPage}
          className="flex items-center gap-1 rounded-lg px-2.5 py-2 text-sm transition-colors hover:bg-[var(--bg-hover)]"
          style={{ color: 'var(--text-muted)' }}
          title={t('courses.addSyllabusPage', 'Add page')}
        >
          <PlusIcon className="h-4 w-4" />
        </button>
      )}
    </div>
  );

  /* ── Prev/Next navigation for students ── */
  const renderPageNavigation = () => (
    <div className="flex items-center justify-between pt-4 mt-4" style={{ borderTop: '1px solid var(--border-default)' }}>
      <button
        type="button"
        disabled={activePageIndex === 0}
        onClick={() => setActivePageIndex((p) => p - 1)}
        className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors disabled:opacity-30 hover:bg-[var(--bg-hover)]"
        style={{ color: 'var(--text-secondary)' }}
      >
        <ChevronLeftIcon className="h-4 w-4" />
        {activePageIndex > 0 ? syllabusData.pages[activePageIndex - 1].title : t('common.previous', 'Previous')}
      </button>
      <span className="text-xs" style={{ color: 'var(--text-faint)' }}>
        {activePageIndex + 1} / {syllabusData.pages.length}
      </span>
      <button
        type="button"
        disabled={activePageIndex === syllabusData.pages.length - 1}
        onClick={() => setActivePageIndex((p) => p + 1)}
        className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors disabled:opacity-30 hover:bg-[var(--bg-hover)]"
        style={{ color: 'var(--text-secondary)' }}
      >
        {activePageIndex < syllabusData.pages.length - 1 ? syllabusData.pages[activePageIndex + 1].title : t('common.next', 'Next')}
        <ChevronRightIcon className="h-4 w-4" />
      </button>
    </div>
  );

  return (
    <div className="space-y-4">
      {error && (
        <div
          className="rounded-md px-3 py-2 text-sm"
          style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.15)', color: 'var(--fn-error)' }}
        >
          {error}
        </div>
      )}
      {success && (
        <div
          className="rounded-md px-3 py-2 text-sm"
          style={{ background: 'rgba(34, 197, 94, 0.08)', border: '1px solid rgba(34, 197, 94, 0.15)', color: 'var(--fn-success)' }}
        >
          {success}
        </div>
      )}

      {/* Page tabs */}
      <div
        className="rounded-lg p-1"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
      >
        {renderPageTabs(canEdit)}
      </div>

      {/* Active page content */}
      <Card>
        <CardBody>
          <div className="mb-3 flex items-center gap-2">
            <span className="text-xl">{currentPage.icon}</span>
            <h2
              className="text-lg font-semibold"
              style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}
            >
              {currentPage.title}
            </h2>
          </div>

          {canEdit ? (
            <>
              <BlockEditor
                key={currentPage.id}
                value={parseCanonicalDocument(currentPage.content)}
                onChange={updatePageContent}
                placeholder={t('courses.syllabusPagePlaceholder', {
                  defaultValue: 'Write content for "{{title}}"...',
                  title: currentPage.title,
                })}
              />
              <div className="mt-4 flex items-center justify-between">
                <span className="text-xs" style={{ color: 'var(--text-faint)' }}>
                  {isDirty
                    ? t('common.unsavedChanges', 'Unsaved changes')
                    : t('common.allSaved', 'All changes saved')}
                </span>
                <Button
                  onClick={handleSave}
                  isLoading={isSaving}
                  disabled={isSaving || !isDirty}
                >
                  {t('common.save', 'Save')}
                </Button>
              </div>
            </>
          ) : currentPage.content ? (
            <>
              <DocumentRenderer
                key={currentPage.id}
                document={parseCanonicalDocument(currentPage.content)}
              />
              {renderPageNavigation()}
            </>
          ) : (
            <>
              <div
                className="rounded-md p-6 text-center text-sm"
                style={{ background: 'var(--bg-surface)', color: 'var(--text-muted)', border: '1px solid var(--border-default)' }}
              >
                {t('courses.noSyllabusPage', 'This section has no content yet.')}
              </div>
              {renderPageNavigation()}
            </>
          )}
        </CardBody>
      </Card>
    </div>
  );
};
