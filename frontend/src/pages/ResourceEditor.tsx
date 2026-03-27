import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeftIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { CourseLayout } from '../components/CourseLayout';
import { Button, Card, CardBody, Input, Loading } from '../components';
import { extractErrorMessage } from '../api/client';
import { resourcesApi } from '../api/courses';
import { ResourceCreateData, ResourceType } from '../types';
import {
  BlockEditor,
  createEmptyDocument,
  parseCanonicalDocument,
  serializeCanonicalDocument,
} from '../features/editor-core';
import { editorMediaApi } from '../api/pages';

interface ResourceEditorFormState {
  title: string;
  description: string;
  resourceType: ResourceType;
  fileUrl: string;
  externalUrl: string;
  textContent: string;
  isDownloadable: boolean;
}

const DEFAULT_FORM: ResourceEditorFormState = {
  title: '',
  description: '',
  resourceType: 'TEXT',
  fileUrl: '',
  externalUrl: '',
  textContent: '',
  isDownloadable: true,
};

const FILE_BASED_TYPES: ResourceType[] = ['VIDEO', 'PDF', 'SLIDE', 'CODE', 'OTHER'];

const draftKey = (courseId: string, moduleId: string, resourceId?: string) =>
  `draft:resource:${courseId}:${moduleId}:${resourceId || 'new'}`;

const ResourceEditor: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { courseId, moduleId, resourceId } = useParams<{
    courseId: string;
    moduleId: string;
    resourceId?: string;
  }>();

  const [isLoading, setIsLoading] = useState(Boolean(resourceId));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveInfo, setSaveInfo] = useState<string | null>(null);
  const [formState, setFormState] = useState<ResourceEditorFormState>(DEFAULT_FORM);
  const [textDocument, setTextDocument] = useState(createEmptyDocument());
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const isEditMode = Boolean(resourceId);
  const hasContext = Boolean(courseId && moduleId);
  const isTextResource = formState.resourceType === 'TEXT';
  const isLinkResource = formState.resourceType === 'LINK';
  const isFileBasedResource = FILE_BASED_TYPES.includes(formState.resourceType);

  const pageTitle = useMemo(
    () =>
      isEditMode
        ? t('resources.editResource', 'Edit Resource')
        : t('resources.createResource', 'Create Resource'),
    [isEditMode, t]
  );

  useEffect(() => {
    if (!courseId || !moduleId) {
      return;
    }

    if (!resourceId) {
      const rawDraft = localStorage.getItem(draftKey(courseId, moduleId));
      if (!rawDraft) return;
      try {
        const parsed = JSON.parse(rawDraft) as {
          formState?: ResourceEditorFormState;
          textDocument?: ReturnType<typeof createEmptyDocument>;
        };
        if (parsed.formState) {
          setFormState({
            ...DEFAULT_FORM,
            ...parsed.formState,
          });
        }
        if (parsed.textDocument) {
          setTextDocument(parsed.textDocument);
        }
      } catch {
        // Ignore malformed local drafts
      }
      return;
    }

    let cancelled = false;
    const loadResource = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await resourcesApi.getById(courseId, moduleId, resourceId);
        if (cancelled) {
          return;
        }
        const resource = response.data;
        setFormState({
          title: resource.title || '',
          description: resource.description || '',
          resourceType: resource.resourceType,
          fileUrl: resource.fileUrl || '',
          externalUrl: resource.externalUrl || '',
          textContent: resource.textContent || '',
          isDownloadable: resource.isDownloadable ?? true,
        });
        setTextDocument(parseCanonicalDocument(resource.textContent || ''));
      } catch (loadError) {
        if (!cancelled) {
          setError(extractErrorMessage(loadError));
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadResource();
    return () => {
      cancelled = true;
    };
  }, [courseId, moduleId, resourceId]);

  useEffect(() => {
    if (!courseId || !moduleId) return;

    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }

    autosaveTimerRef.current = setTimeout(() => {
      localStorage.setItem(
        draftKey(courseId, moduleId, resourceId),
        JSON.stringify({ formState, textDocument })
      );
      setSaveInfo(`${t('common.saved', 'Saved')} · ${new Date().toLocaleTimeString()}`);
    }, 1200);

    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
    };
  }, [courseId, formState, moduleId, resourceId, t, textDocument]);

  const handleUploadMedia = async (file: File) => {
    const response = await editorMediaApi.upload(file);
    return { url: response.data.url, contentType: response.data.contentType };
  };

  const handleSubmit = async () => {
    if (!courseId || !moduleId) {
      setError('Missing course/module context');
      return;
    }
    if (!formState.title.trim()) {
      setError(t('validation.required', 'Required'));
      return;
    }

    setError(null);
    setIsSaving(true);

    const payload: ResourceCreateData = {
      courseId,
      module: moduleId,
      title: formState.title.trim(),
      description: formState.description.trim() || undefined,
      resourceType: formState.resourceType,
      fileUrl: formState.fileUrl.trim() || undefined,
      externalUrl: formState.externalUrl.trim() || undefined,
      textContent: isTextResource
        ? serializeCanonicalDocument(textDocument)
        : formState.textContent.trim() || undefined,
      isDownloadable: formState.isDownloadable,
    };

    try {
      const response = isEditMode && resourceId
        ? await resourcesApi.update(courseId, moduleId, resourceId, payload)
        : await resourcesApi.create(payload);

      localStorage.removeItem(draftKey(courseId, moduleId, resourceId));
      setSaveInfo(`${t('common.saved', 'Saved')} · ${new Date().toLocaleTimeString()}`);

      const savedResourceId = response.data.id;
      navigate(`/courses/${courseId}/modules/${moduleId}/resources/${savedResourceId}`);
    } catch (submitError) {
      setError(extractErrorMessage(submitError));
    } finally {
      setIsSaving(false);
    }
  };

  if (!hasContext) {
    return (
      <div className="p-8">
        <p style={{ color: 'var(--fn-error)' }}>Missing course/module context</p>
      </div>
    );
  }

  if (isLoading) {
    return <Loading />;
  }

  return (
    <CourseLayout courseId={courseId!}>
      <div className="mx-auto max-w-6xl space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1
              className="text-3xl font-bold"
              style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}
            >
              {pageTitle}
            </h1>
            <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
              {t('resources.craftEditorHint', 'Craft editor with block sidebar and contextual formatting.')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={() => navigate(`/courses/${courseId}`)}
            >
              <ArrowLeftIcon className="mr-1 h-4 w-4" />
              {t('common.back', 'Back')}
            </Button>
            <Button onClick={() => void handleSubmit()} isLoading={isSaving}>
              {t('common.save', 'Save')}
            </Button>
          </div>
        </div>

        {error && (
          <div
            className="rounded-md border px-3 py-2 text-sm"
            style={{
              borderColor: 'rgba(239,68,68,0.25)',
              background: 'rgba(239,68,68,0.08)',
              color: 'var(--fn-error)',
            }}
          >
            {error}
          </div>
        )}

        {saveInfo && (
          <div
            className="rounded-md border px-3 py-2 text-sm"
            style={{
              borderColor: 'rgba(34,197,94,0.2)',
              background: 'rgba(34,197,94,0.08)',
              color: 'var(--fn-success)',
            }}
          >
            <CheckCircleIcon className="mr-1 inline h-4 w-4" />
            {saveInfo}
          </div>
        )}

        <Card>
          <CardBody>
            <div className="grid gap-4 md:grid-cols-2">
              <Input
                label={t('resources.title', 'Title')}
                value={formState.title}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, title: event.target.value }))
                }
              />

              <div>
                <label className="mb-1 block text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  {t('resources.type', 'Type')}
                </label>
                <select
                  value={formState.resourceType}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      resourceType: event.target.value as ResourceType,
                    }))
                  }
                  className="input w-full"
                >
                  {(['TEXT', 'LINK', 'PDF', 'VIDEO', 'SLIDE', 'CODE', 'OTHER'] as ResourceType[]).map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-4">
              <label className="mb-1 block text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                {t('resources.description', 'Description')}
              </label>
              <textarea
                value={formState.description}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, description: event.target.value }))
                }
                rows={3}
                className="input w-full"
              />
            </div>

            {isLinkResource && (
              <div className="mt-4">
                <Input
                  label={t('resources.externalUrl', 'External URL')}
                  value={formState.externalUrl}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, externalUrl: event.target.value }))
                  }
                />
              </div>
            )}

            {isFileBasedResource && (
              <div className="mt-4">
                <Input
                  label={t('resources.fileUrl', 'File URL')}
                  value={formState.fileUrl}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, fileUrl: event.target.value }))
                  }
                  placeholder="https://..."
                />
              </div>
            )}
          </CardBody>
        </Card>

        {isTextResource && (
          <div>
            <p className="mb-2 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              {t('resources.textContent', 'Text content')}
            </p>
            <BlockEditor
              value={textDocument}
              onChange={(doc) => {
                setTextDocument(doc);
                setFormState((prev) => ({
                  ...prev,
                  textContent: serializeCanonicalDocument(doc),
                }));
              }}
              mode="full"
              placeholder={t('resources.textContentPlaceholder', 'Write content here')}
              onUploadMedia={handleUploadMedia}
            />
          </div>
        )}
      </div>
    </CourseLayout>
  );
};

export default ResourceEditor;
