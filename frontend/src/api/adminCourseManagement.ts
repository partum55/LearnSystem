/**
 * Admin Course Management API — JSON import/export + deep entity management.
 * SUPERADMIN only endpoints for full system control.
 */
import apiClient from './client';
import { PageResponse } from './types';
import { Module, Resource } from '../types';

// ==================== TYPES ====================

export interface CourseExport {
  version: string;
  exportedAt?: string;
  course: CourseMetaExport;
  modules?: ModuleExport[];
  standaloneAssignments?: AssignmentExport[];
  quizzes?: QuizExport[];
  questionBank?: QuestionExport[];
}

export interface CourseMetaExport {
  code: string;
  titleUk: string;
  titleEn?: string;
  descriptionUk?: string;
  descriptionEn?: string;
  syllabus?: string;
  visibility?: string;
  maxStudents?: number;
  isPublished?: boolean;
}

export interface ModuleExport {
  title: string;
  description?: string;
  position?: number;
  isPublished?: boolean;
  contentMeta?: Record<string, unknown>;
  resources?: ResourceExport[];
  assignments?: AssignmentExport[];
}

export interface ResourceExport {
  title: string;
  description?: string;
  resourceType: string;
  externalUrl?: string;
  textContent?: string;
  position?: number;
  isDownloadable?: boolean;
  metadata?: Record<string, unknown>;
}

export interface AssignmentExport {
  assignmentType: string;
  title: string;
  description?: string;
  descriptionFormat?: string;
  instructions?: string;
  instructionsFormat?: string;
  maxPoints?: number;
  rubric?: Record<string, unknown>;
  dueDate?: string;
  availableFrom?: string;
  availableUntil?: string;
  allowLateSubmission?: boolean;
  latePenaltyPercent?: number;
  submissionTypes?: string[];
  allowedFileTypes?: string[];
  maxFileSize?: number;
  maxFiles?: number;
  starterCode?: string;
  programmingLanguage?: string;
  autoGradingEnabled?: boolean;
  testCases?: Record<string, unknown>[];
  tags?: string[];
  estimatedDuration?: number;
  isPublished?: boolean;
}

export interface QuizExport {
  title: string;
  description?: string;
  timeLimit?: number;
  attemptsAllowed?: number;
  shuffleQuestions?: boolean;
  shuffleAnswers?: boolean;
  passPercentage?: number;
  showCorrectAnswers?: boolean;
}

export interface QuestionExport {
  questionType: string;
  stem: string;
  options?: unknown;
  correctAnswer?: unknown;
  explanation?: string;
  points?: number;
  metadata?: Record<string, unknown>;
}

export interface ImportResult {
  success: boolean;
  message: string;
  courseId?: string;
  coursesCreated: number;
  modulesCreated: number;
  resourcesCreated: number;
  assignmentsCreated: number;
  quizzesCreated: number;
  questionsCreated: number;
  logs: string[];
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  summary: Record<string, number>;
}

// ==================== IMPORT / EXPORT API ====================

export const courseManagementApi = {
  /** Export a complete course as JSON */
  exportCourse: async (courseId: string): Promise<CourseExport> => {
    const response = await apiClient.get<CourseExport>(`/course-management/export/${courseId}`);
    return response.data;
  },

  /** Download course export as file */
  downloadCourseExport: async (courseId: string, courseCode: string): Promise<void> => {
    const data = await courseManagementApi.exportCourse(courseId);
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `course-${courseCode}-export.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  /** Import course from JSON file (multipart) */
  importCourseFile: async (file: File): Promise<ImportResult> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.upload<ImportResult>('/course-management/import', formData);
    return response.data;
  },

  /** Import course from JSON body */
  importCourseJson: async (json: string): Promise<ImportResult> => {
    const parsed = JSON.parse(json);
    const response = await apiClient.post<ImportResult>('/course-management/import/json', parsed, {
      headers: { 'Content-Type': 'application/json' },
    });
    return response.data;
  },

  /** Validate import JSON without creating anything */
  validateImport: async (json: string): Promise<ValidationResult> => {
    const parsed = JSON.parse(json);
    const response = await apiClient.post<ValidationResult>('/course-management/validate', parsed, {
      headers: { 'Content-Type': 'application/json' },
    });
    return response.data;
  },

  /** Get JSON template for import */
  getTemplate: async (): Promise<CourseExport> => {
    const response = await apiClient.get<CourseExport>('/course-management/template');
    return response.data;
  },
};

// ==================== DEEP COURSE MANAGEMENT API ====================
// These use the existing endpoints but are organized for admin use

export const adminCourseDeepApi = {
  // --- Modules ---
  getModules: async (courseId: string): Promise<Module[]> => {
    const response = await apiClient.get<Module[]>(`/courses/${courseId}/modules`);
    return response.data;
  },

  createModule: async (courseId: string, data: { title: string; description?: string; isPublished?: boolean }) => {
    const response = await apiClient.post(`/courses/${courseId}/modules`, data);
    return response.data;
  },

  updateModule: async (courseId: string, moduleId: string, data: Partial<Module>) => {
    const response = await apiClient.put(`/courses/${courseId}/modules/${moduleId}`, data);
    return response.data;
  },

  deleteModule: async (courseId: string, moduleId: string) => {
    await apiClient.delete(`/courses/${courseId}/modules/${moduleId}`);
  },

  publishModule: async (courseId: string, moduleId: string) => {
    const response = await apiClient.post(`/courses/${courseId}/modules/${moduleId}/publish`);
    return response.data;
  },

  unpublishModule: async (courseId: string, moduleId: string) => {
    const response = await apiClient.post(`/courses/${courseId}/modules/${moduleId}/unpublish`);
    return response.data;
  },

  reorderModules: async (courseId: string, moduleIds: string[]) => {
    await apiClient.put(`/courses/${courseId}/modules/reorder`, moduleIds);
  },

  // --- Resources ---
  getResources: async (courseId: string, moduleId: string): Promise<Resource[]> => {
    const response = await apiClient.get<Resource[]>(`/courses/${courseId}/modules/${moduleId}/resources`);
    return response.data;
  },

  createResource: async (courseId: string, moduleId: string, data: {
    title: string;
    description?: string;
    resourceType: string;
    externalUrl?: string;
    textContent?: string;
    isDownloadable?: boolean;
  }) => {
    const response = await apiClient.post(`/courses/${courseId}/modules/${moduleId}/resources`, data);
    return response.data;
  },

  updateResource: async (courseId: string, moduleId: string, resourceId: string, data: Partial<Resource>) => {
    const response = await apiClient.put(`/courses/${courseId}/modules/${moduleId}/resources/${resourceId}`, data);
    return response.data;
  },

  deleteResource: async (courseId: string, moduleId: string, resourceId: string) => {
    await apiClient.delete(`/courses/${courseId}/modules/${moduleId}/resources/${resourceId}`);
  },

  // --- Assignments (via gateway rewrite) ---
  getAssignments: async (courseId: string) => {
    const response = await apiClient.get<{ content?: unknown[] }>(`/assessments/assignments/course/${courseId}?size=200`);
    return response.data?.content || (response.data as unknown as unknown[]) || [];
  },

  createAssignment: async (data: Record<string, unknown>) => {
    const response = await apiClient.post('/assessments/assignments', data);
    return response.data;
  },

  updateAssignment: async (id: string, data: Record<string, unknown>) => {
    const response = await apiClient.put(`/assessments/assignments/${id}`, data);
    return response.data;
  },

  deleteAssignment: async (id: string) => {
    await apiClient.delete(`/assessments/assignments/${id}`);
  },

  publishAssignment: async (id: string) => {
    const response = await apiClient.post(`/assessments/assignments/${id}/publish`);
    return response.data;
  },

  unpublishAssignment: async (id: string) => {
    const response = await apiClient.post(`/assessments/assignments/${id}/unpublish`);
    return response.data;
  },

  archiveAssignment: async (id: string) => {
    const response = await apiClient.post(`/assessments/assignments/${id}/archive`);
    return response.data;
  },

  duplicateAssignment: async (
    id: string,
    payload?: { targetCourseId?: string; targetModuleId?: string }
  ) => {
    const response = await apiClient.post(`/assessments/assignments/${id}/duplicate`, payload || {});
    return response.data;
  },

  // --- Quizzes ---
  getQuizzes: async (courseId: string) => {
    const assignmentsResponse = await apiClient.get<{ content?: Array<Record<string, unknown>> }>(
      `/assessments/assignments/course/${courseId}?size=200`
    );
    const assignments = assignmentsResponse.data?.content || [];
    const quizIds = Array.from(
      new Set(
        assignments
          .filter((item) => String(item.assignmentType ?? item.assignment_type ?? '') === 'QUIZ')
          .map((item) => item.quizId ?? item.quiz_id)
          .filter((quizId): quizId is string => Boolean(quizId))
          .map((quizId) => String(quizId))
      )
    );
    const quizzes = await Promise.all(
      quizIds.map(async (quizId) => {
        try {
          const response = await apiClient.get(`/assessments/quizzes/${quizId}`);
          return response.data;
        } catch {
          return null;
        }
      })
    );
    return quizzes.filter((quiz): quiz is Record<string, unknown> => Boolean(quiz));
  },

  createQuiz: async (courseId: string, moduleId: string, title: string, description?: string) => {
    const assignmentResponse = await apiClient.post('/assessments/assignments', {
      courseId,
      moduleId,
      assignmentType: 'QUIZ',
      title,
      description: description || '',
      maxPoints: 100,
      isPublished: false,
      quiz: {
        title,
        description,
      },
    });
    const assignment = assignmentResponse.data as { quizId?: string; quiz_id?: string };
    const quizId = assignment.quizId || assignment.quiz_id;
    if (!quizId) {
      return assignmentResponse.data;
    }
    const quizResponse = await apiClient.get(`/assessments/quizzes/${quizId}`);
    return quizResponse.data;
  },

  updateQuiz: async (id: string, data: Record<string, unknown>) => {
    const response = await apiClient.put(`/assessments/quizzes/${id}`, data);
    return response.data;
  },

  deleteQuiz: async (id: string) => {
    await apiClient.delete(`/assessments/quizzes/${id}`);
  },

  duplicateQuiz: async (id: string, payload?: { targetCourseId?: string; targetModuleId?: string }) => {
    const response = await apiClient.post(`/assessments/quizzes/${id}/duplicate`, payload || {});
    return response.data;
  },

  addQuestionToQuiz: async (quizId: string, questionId: string) => {
    await apiClient.post(`/assessments/quizzes/${quizId}/questions/${questionId}`);
  },

  removeQuestionFromQuiz: async (quizId: string, questionId: string) => {
    await apiClient.delete(`/assessments/quizzes/${quizId}/questions/${questionId}`);
  },

  // --- Questions ---
  getQuestions: async (courseId: string) => {
    const response = await apiClient.get<{ content?: unknown[] }>(`/assessments/questions/course/${courseId}?size=200`);
    return response.data?.content || (response.data as unknown as unknown[]) || [];
  },

  createQuestion: async (data: Record<string, unknown>) => {
    const response = await apiClient.post('/assessments/questions', data);
    return response.data;
  },

  updateQuestion: async (id: string, data: Record<string, unknown>) => {
    const response = await apiClient.put(`/assessments/questions/${id}`, data);
    return response.data;
  },

  deleteQuestion: async (id: string) => {
    await apiClient.delete(`/assessments/questions/${id}`);
  },

  duplicateQuestion: async (id: string) => {
    const response = await apiClient.post(`/assessments/questions/${id}/duplicate`);
    return response.data;
  },

  // --- Members ---
  getMembers: async (courseId: string) => {
    const response = await apiClient.get<{ content?: unknown[] }>(`/courses/${courseId}/members?size=200`);
    return response.data?.content || (response.data as unknown as unknown[]) || [];
  },

  enrollUser: async (courseId: string, userId: string, role: string = 'STUDENT') => {
    const response = await apiClient.post(`/courses/${courseId}/enroll`, { userId, roleInCourse: role });
    return response.data;
  },

  unenrollUser: async (courseId: string, userId: string) => {
    await apiClient.delete(`/courses/${courseId}/enroll/${userId}`);
  },
};

export interface SisImportRowError {
  file: string;
  row?: number;
  field?: string;
  code: string;
  message: string;
}

export interface SisImportPreviewResponse {
  importId: string;
  semesterCode: string;
  status: string;
  valid: boolean;
  summary: Record<string, unknown>;
  errors: SisImportRowError[];
  warnings: string[];
}

export interface SisImportApplyResponse {
  importId: string;
  status: string;
  message: string;
  createdCourses: number;
  createdEnrollments: number;
  skippedEnrollments: number;
  rollbackExpiresAt?: string;
}

export interface SisImportRunResponse {
  id: string;
  semesterCode: string;
  status: string;
  valid: boolean;
  requestedBy: string;
  summary: Record<string, unknown>;
  errors: SisImportRowError[];
  warnings: string[];
  applyReport: Record<string, unknown>;
  appliedAt?: string;
  rollbackExpiresAt?: string;
  rolledBackAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SisAuditLogEntry {
  id: string;
  importRunId?: string;
  actorId: string;
  action: string;
  entityType: string;
  entityKey?: string;
  details: Record<string, unknown>;
  createdAt: string;
}

export interface SisBulkEnrollmentActionRequest {
  action: 'MOVE_STUDENTS' | 'CHANGE_STATUS' | 'UNENROLL';
  emails: string[];
  courseCodes: string[];
  targetCourseCode?: string;
  enrollmentStatus?: string;
}

export interface SisBulkEnrollmentActionResponse {
  action: string;
  affectedUsers: number;
  affectedEnrollments: number;
  skipped: number;
  message: string;
}

export const sisAdminOpsApi = {
  previewImport: async (payload: {
    semesterCode: string;
    studentsFile: File;
    coursesFile: File;
    groupCourseMapFile: File;
    currentEnrollmentsFile?: File;
  }): Promise<SisImportPreviewResponse> => {
    const formData = new FormData();
    formData.append('semesterCode', payload.semesterCode);
    formData.append('studentsFile', payload.studentsFile);
    formData.append('coursesFile', payload.coursesFile);
    formData.append('groupCourseMapFile', payload.groupCourseMapFile);
    if (payload.currentEnrollmentsFile) {
      formData.append('currentEnrollmentsFile', payload.currentEnrollmentsFile);
    }
    const response = await apiClient.upload<SisImportPreviewResponse>('/course-management/sis/preview', formData);
    return response.data;
  },

  applyImport: async (importId: string): Promise<SisImportApplyResponse> => {
    const response = await apiClient.post<SisImportApplyResponse>(`/course-management/sis/apply/${importId}`);
    return response.data;
  },

  rollbackImport: async (importId: string): Promise<SisImportApplyResponse> => {
    const response = await apiClient.post<SisImportApplyResponse>(`/course-management/sis/rollback/${importId}`);
    return response.data;
  },

  getImport: async (importId: string): Promise<SisImportRunResponse> => {
    const response = await apiClient.get<SisImportRunResponse>(`/course-management/sis/imports/${importId}`);
    return response.data;
  },

  listImports: async (params?: { page?: number; size?: number }): Promise<PageResponse<SisImportRunResponse>> => {
    const page = params?.page ?? 0;
    const size = params?.size ?? 20;
    const response = await apiClient.get<PageResponse<SisImportRunResponse>>(`/course-management/sis/imports?page=${page}&size=${size}`);
    return response.data;
  },

  getAuditLog: async (params?: { importId?: string; action?: string; entityType?: string; page?: number; size?: number }): Promise<PageResponse<SisAuditLogEntry>> => {
    const search = new URLSearchParams();
    if (params?.importId) search.set('importId', params.importId);
    if (params?.action) search.set('action', params.action);
    if (params?.entityType) search.set('entityType', params.entityType);
    search.set('page', String(params?.page ?? 0));
    search.set('size', String(params?.size ?? 30));
    const response = await apiClient.get<PageResponse<SisAuditLogEntry>>(`/course-management/sis/audit-log?${search.toString()}`);
    return response.data;
  },

  applyEnrollmentGroup: async (importId: string, groupCode: string) => {
    const response = await apiClient.post(`/course-management/sis/enrollment-groups/apply`, { importId, groupCode });
    return response.data;
  },

  bulkEnrollmentAction: async (payload: SisBulkEnrollmentActionRequest): Promise<SisBulkEnrollmentActionResponse> => {
    const response = await apiClient.post<SisBulkEnrollmentActionResponse>(`/course-management/sis/bulk-actions/enrollments`, payload);
    return response.data;
  },

  downloadDeanGradebook: async (params: { courseId: string; semester?: string; group?: string }): Promise<void> => {
    const search = new URLSearchParams();
    search.set('courseId', params.courseId);
    if (params.semester) search.set('semester', params.semester);
    if (params.group) search.set('group', params.group);

    const response = await apiClient.get<Blob>(
      `/course-management/gradebook/export/dean?${search.toString()}`,
      { responseType: 'blob' as const }
    );

    const disposition = (response.headers?.['content-disposition'] ?? '') as string;
    const filenameMatch = disposition.match(/filename="?([^"]+)"?/i);
    const filename = filenameMatch?.[1] || `dean-gradebook-${params.courseId}.xlsx`;

    const blob = new Blob([response.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  },
};
