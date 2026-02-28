import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { BlockEditor, createEmptyDocument } from '../features/editor-core';
import { editorMediaApi, modulePagesApi, pageDocumentsApi } from '../api/pages';
import { CanonicalDocument, ModulePage, TocItem } from '../types';
import { extractErrorMessage } from '../api/client';

const ModulePageEditor: React.FC = () => {
  const { courseId, moduleId, pageId } = useParams<{
    courseId: string;
    moduleId: string;
    pageId: string;
  }>();

  const navigate = useNavigate();

  const [pages, setPages] = useState<ModulePage[]>([]);
  const [activePageId, setActivePageId] = useState<string | null>(pageId ?? null);
  const [document, setDocument] = useState<CanonicalDocument>(createEmptyDocument());
  const [schemaVersion, setSchemaVersion] = useState(1);
  const [toc, setToc] = useState<TocItem[]>([]);
  const [isLoadingPages, setIsLoadingPages] = useState(false);
  const [isLoadingDocument, setIsLoadingDocument] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const activePage = useMemo(
    () => pages.find((item) => item.id === activePageId) ?? null,
    [activePageId, pages]
  );

  const goToPage = useCallback(
    (targetPageId: string) => {
      if (!courseId || !moduleId) return;
      setActivePageId(targetPageId);
      navigate(`/courses/${courseId}/modules/${moduleId}/pages/${targetPageId}/edit`);
    },
    [courseId, moduleId, navigate]
  );

  const loadPages = useCallback(async () => {
    if (!courseId || !moduleId) {
      return;
    }

    setIsLoadingPages(true);
    setError(null);

    try {
      const response = await modulePagesApi.getAll(courseId, moduleId);
      const items = response.data;
      setPages(items);

      if (items.length === 0) {
        setActivePageId(null);
        setDocument(createEmptyDocument());
        return;
      }

      const selected = pageId ?? items[0]?.id;
      if (!selected) return;
      setActivePageId(selected);

      if (!pageId) {
        navigate(`/courses/${courseId}/modules/${moduleId}/pages/${selected}/edit`, { replace: true });
      }
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setIsLoadingPages(false);
    }
  }, [courseId, moduleId, navigate, pageId]);

  const loadDocument = useCallback(async (targetPageId: string) => {
    setIsLoadingDocument(true);
    setError(null);

    try {
      const [docResponse, tocResponse] = await Promise.all([
        pageDocumentsApi.get(targetPageId),
        pageDocumentsApi.getToc(targetPageId),
      ]);

      setDocument(docResponse.data.document ?? createEmptyDocument());
      setSchemaVersion(docResponse.data.schema_version || 1);
      setToc(tocResponse.data);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setIsLoadingDocument(false);
    }
  }, []);

  useEffect(() => {
    setActivePageId(pageId ?? null);
  }, [pageId]);

  useEffect(() => {
    void loadPages();
  }, [loadPages]);

  useEffect(() => {
    if (!activePageId) {
      return;
    }
    void loadDocument(activePageId);
  }, [activePageId, loadDocument]);

  const handleCreatePage = async () => {
    if (!courseId || !moduleId) return;

    const title = window.prompt('Page title', 'Untitled page');
    if (!title || !title.trim()) {
      return;
    }

    try {
      const response = await modulePagesApi.create(courseId, moduleId, { title: title.trim() });
      await loadPages();
      goToPage(response.data.id);
      setMessage('Page created');
    } catch (err) {
      setError(extractErrorMessage(err));
    }
  };

  const handleSave = async () => {
    if (!activePageId) {
      return;
    }

    setIsSaving(true);
    setError(null);
    setMessage(null);

    try {
      const response = await pageDocumentsApi.upsert(activePageId, {
        document,
        schemaVersion,
      });
      setSchemaVersion(response.data.schema_version || schemaVersion);
      const tocResponse = await pageDocumentsApi.getToc(activePageId);
      setToc(tocResponse.data);
      setMessage('Changes saved');
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublishToggle = async () => {
    if (!activePageId || !activePage) {
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      if (activePage.is_published) {
        await pageDocumentsApi.unpublish(activePageId);
        setMessage('Page unpublished');
      } else {
        await pageDocumentsApi.publish(activePageId);
        setMessage('Page published');
      }
      await loadPages();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  if (!courseId || !moduleId) {
    return <div className="p-6">Module context is missing.</div>;
  }

  const handleUploadMedia = async (file: File) => {
    const response = await editorMediaApi.upload(file);
    return { url: response.data.url, contentType: response.data.contentType };
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Module Page Editor</h1>
        <div className="flex gap-2">
          <button
            type="button"
            className="px-3 py-2 rounded border border-[var(--surface-border)]"
            onClick={handleCreatePage}
          >
            New Page
          </button>
          <button
            type="button"
            className="px-3 py-2 rounded bg-[var(--accent-primary)] text-white disabled:opacity-60"
            onClick={handleSave}
            disabled={isSaving || !activePageId}
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
          <button
            type="button"
            className="px-3 py-2 rounded border border-[var(--surface-border)] disabled:opacity-60"
            onClick={handlePublishToggle}
            disabled={isSaving || !activePage}
          >
            {activePage?.is_published ? 'Unpublish' : 'Publish'}
          </button>
        </div>
      </div>

      {error && <div className="p-3 rounded border border-red-500 text-red-300">{error}</div>}
      {message && <div className="p-3 rounded border border-green-500 text-green-300">{message}</div>}

      <div className="grid grid-cols-12 gap-4">
        <aside className="col-span-12 lg:col-span-3 border rounded-lg border-[var(--surface-border)] p-3">
          <div className="font-medium mb-2">Pages</div>
          {isLoadingPages && <div className="text-sm text-[var(--text-muted)]">Loading pages...</div>}
          <div className="space-y-1">
            {pages.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => goToPage(item.id)}
                className={`w-full text-left px-2 py-2 rounded ${
                  item.id === activePageId ? 'bg-[var(--surface-muted)]' : 'hover:bg-[var(--surface-muted)]'
                }`}
              >
                <div className="text-sm font-medium">{item.title}</div>
                <div className="text-xs text-[var(--text-muted)]">
                  {item.is_published ? 'Published' : 'Draft'}
                  {item.has_unpublished_changes ? ' • Unpublished changes' : ''}
                </div>
              </button>
            ))}
            {!isLoadingPages && pages.length === 0 && (
              <div className="text-sm text-[var(--text-muted)]">No pages yet.</div>
            )}
          </div>
        </aside>

        <section className="col-span-12 lg:col-span-7">
          {isLoadingDocument ? (
            <div className="border rounded-lg border-[var(--surface-border)] p-4">Loading document...</div>
          ) : (
            <BlockEditor value={document} onChange={setDocument} mode="full" onUploadMedia={handleUploadMedia} />
          )}
        </section>

        <aside className="col-span-12 lg:col-span-2 border rounded-lg border-[var(--surface-border)] p-3">
          <div className="font-medium mb-2">Table of Contents</div>
          <div className="space-y-1 text-sm">
            {toc.map((item) => (
              <div key={item.anchor} style={{ paddingLeft: `${Math.max(item.level - 1, 0) * 8}px` }}>
                {item.text}
              </div>
            ))}
            {toc.length === 0 && <div className="text-[var(--text-muted)]">No headings</div>}
          </div>
        </aside>
      </div>
    </div>
  );
};

export default ModulePageEditor;
