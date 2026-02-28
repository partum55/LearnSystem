import apiClient from './client';
import { CanonicalDocument, CanonicalDocumentPayload, ModulePage, TocItem } from '../types';

type UnknownRecord = Record<string, unknown>;

const normalizeModulePage = (raw: UnknownRecord): ModulePage => ({
  id: String(raw.id ?? ''),
  module_id: String(raw.moduleId ?? raw.module_id ?? ''),
  parent_page_id: raw.parentPageId ? String(raw.parentPageId) : (raw.parent_page_id ? String(raw.parent_page_id) : undefined),
  title: String(raw.title ?? ''),
  slug: String(raw.slug ?? ''),
  position: Number(raw.position ?? 0),
  is_published: Boolean(raw.isPublished ?? raw.is_published ?? false),
  has_unpublished_changes: Boolean(raw.hasUnpublishedChanges ?? raw.has_unpublished_changes ?? false),
  created_by: String(raw.createdBy ?? raw.created_by ?? ''),
  updated_by: String(raw.updatedBy ?? raw.updated_by ?? ''),
  created_at: String(raw.createdAt ?? raw.created_at ?? ''),
  updated_at: String(raw.updatedAt ?? raw.updated_at ?? ''),
});

const normalizeDocumentPayload = (raw: UnknownRecord): CanonicalDocumentPayload => ({
  owner_id: String(raw.ownerId ?? raw.owner_id ?? ''),
  schema_version: Number(raw.schemaVersion ?? raw.schema_version ?? 1),
  document_hash: raw.documentHash ? String(raw.documentHash) : (raw.document_hash ? String(raw.document_hash) : undefined),
  document: (raw.document as CanonicalDocument) ?? { version: 1, type: 'doc', content: [] },
  updated_at: raw.updatedAt ? String(raw.updatedAt) : (raw.updated_at ? String(raw.updated_at) : undefined),
  published_snapshot: Boolean(raw.publishedSnapshot ?? raw.published_snapshot ?? false),
});

const normalizeTocItem = (raw: UnknownRecord): TocItem => ({
  level: Number(raw.level ?? 1),
  text: String(raw.text ?? ''),
  anchor: String(raw.anchor ?? ''),
});

export const modulePagesApi = {
  getAll: async (courseId: string, moduleId: string) => {
    const response = await apiClient.get<UnknownRecord[]>(`/courses/${courseId}/modules/${moduleId}/pages`);
    return {
      ...response,
      data: Array.isArray(response.data) ? response.data.map(normalizeModulePage) : [],
    };
  },

  getById: async (courseId: string, moduleId: string, pageId: string) => {
    const response = await apiClient.get<UnknownRecord>(`/courses/${courseId}/modules/${moduleId}/pages/${pageId}`);
    return { ...response, data: normalizeModulePage(response.data) };
  },

  create: async (
    courseId: string,
    moduleId: string,
    payload: { title: string; parentPageId?: string; position?: number; slug?: string }
  ) => {
    const response = await apiClient.post<UnknownRecord>(`/courses/${courseId}/modules/${moduleId}/pages`, payload);
    return { ...response, data: normalizeModulePage(response.data) };
  },

  update: async (
    courseId: string,
    moduleId: string,
    pageId: string,
    payload: { title?: string; parentPageId?: string; position?: number; slug?: string }
  ) => {
    const response = await apiClient.put<UnknownRecord>(`/courses/${courseId}/modules/${moduleId}/pages/${pageId}`, payload);
    return { ...response, data: normalizeModulePage(response.data) };
  },

  delete: (courseId: string, moduleId: string, pageId: string) =>
    apiClient.delete(`/courses/${courseId}/modules/${moduleId}/pages/${pageId}`),
};

export const pageDocumentsApi = {
  get: async (pageId: string) => {
    const response = await apiClient.get<UnknownRecord>(`/pages/${pageId}/document`);
    return { ...response, data: normalizeDocumentPayload(response.data) };
  },

  upsert: async (pageId: string, payload: { document: CanonicalDocument; schemaVersion?: number }) => {
    const response = await apiClient.put<UnknownRecord>(`/pages/${pageId}/document`, payload);
    return { ...response, data: normalizeDocumentPayload(response.data) };
  },

  publish: async (pageId: string) => {
    const response = await apiClient.post<UnknownRecord>(`/pages/${pageId}/publish`);
    return { ...response, data: normalizeModulePage(response.data) };
  },

  unpublish: async (pageId: string) => {
    const response = await apiClient.post<UnknownRecord>(`/pages/${pageId}/unpublish`);
    return { ...response, data: normalizeModulePage(response.data) };
  },

  getToc: async (pageId: string) => {
    const response = await apiClient.get<UnknownRecord[]>(`/pages/${pageId}/toc`);
    return {
      ...response,
      data: Array.isArray(response.data) ? response.data.map(normalizeTocItem) : [],
    };
  },
};

export const assignmentDocumentsApi = {
  getTemplate: async (assignmentId: string) => {
    const response = await apiClient.get<UnknownRecord>(`/assignments/${assignmentId}/template-document`);
    return { ...response, data: normalizeDocumentPayload(response.data) };
  },

  upsertTemplate: async (assignmentId: string, payload: { document: CanonicalDocument; schemaVersion?: number }) => {
    const response = await apiClient.put<UnknownRecord>(`/assignments/${assignmentId}/template-document`, payload);
    return { ...response, data: normalizeDocumentPayload(response.data) };
  },

  cloneTemplateToSubmission: (assignmentId: string) =>
    apiClient.post<{ assignmentId: string; submissionId: string }>(`/assignments/${assignmentId}/submissions/clone-template`),
};

export const submissionDocumentsApi = {
  get: async (submissionId: string) => {
    const response = await apiClient.get<UnknownRecord>(`/submissions/${submissionId}/document`);
    return { ...response, data: normalizeDocumentPayload(response.data) };
  },

  upsert: async (submissionId: string, payload: { document: CanonicalDocument; schemaVersion?: number }) => {
    const response = await apiClient.put<UnknownRecord>(`/submissions/${submissionId}/document`, payload);
    return { ...response, data: normalizeDocumentPayload(response.data) };
  },
};

export const editorMediaApi = {
  upload: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post<UnknownRecord>('/editor/media', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    return {
      ...response,
      data: {
        id: String(response.data.id ?? ''),
        url: String(response.data.url ?? ''),
        fileName: String(response.data.fileName ?? response.data.file_name ?? ''),
        contentType: String(response.data.contentType ?? response.data.content_type ?? ''),
        size: Number(response.data.size ?? 0),
      },
    };
  },
};
