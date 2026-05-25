import apiClient from '@/api/client';
import type { ListResponse } from '@/api/types';
import type {
  AssignmentDetailDto,
  AssignmentRequest,
  GradeDraftRequest,
  SubmissionDto,
  SubmissionListResponse,
  SubmissionRequest,
  SubmissionReviewDto,
  SeminarAttendanceSessionDto,
  SeminarAttendanceRecordDto,
  SeminarAttendanceOverviewDto,
} from './canonical.types';

export const canonicalAssignmentsApi = {
  get: (assignmentId: string) =>
    apiClient.request<AssignmentDetailDto>({ url: `/v1/assignments/${assignmentId}` }),

  create: (courseId: string, moduleId: string, request: AssignmentRequest) =>
    apiClient.request<AssignmentDetailDto>({
      method: 'POST',
      url: `/v1/courses/${courseId}/modules/${moduleId}/assignments`,
      data: request,
    }),

  update: (assignmentId: string, request: AssignmentRequest) =>
    apiClient.request<AssignmentDetailDto>({
      method: 'PATCH',
      url: `/v1/assignments/${assignmentId}`,
      data: request,
    }),

  archive: (assignmentId: string) =>
    apiClient.request<void>({ method: 'DELETE', url: `/v1/assignments/${assignmentId}` }),
};

export const canonicalSubmissionsApi = {
  submitFile: (assignmentId: string, request: SubmissionRequest) =>
    apiClient.request<SubmissionDto>({
      method: 'POST',
      url: `/v1/assignments/${assignmentId}/submissions/file`,
      data: request,
    }),

  submitText: (assignmentId: string, request: SubmissionRequest) =>
    apiClient.request<SubmissionDto>({
      method: 'POST',
      url: `/v1/assignments/${assignmentId}/submissions/text`,
      data: request,
    }),

  submitForm: (assignmentId: string, request: SubmissionRequest) =>
    apiClient.request<SubmissionDto>({
      method: 'POST',
      url: `/v1/assignments/${assignmentId}/submissions/form`,
      data: request,
    }),

  submitVpl: (assignmentId: string, request: SubmissionRequest) =>
    apiClient.request<SubmissionDto>({
      method: 'POST',
      url: `/v1/assignments/${assignmentId}/submissions/vpl`,
      data: request,
    }),

  listForAssignment: (assignmentId: string, page = 1, pageSize = 20) =>
    apiClient.request<SubmissionListResponse>({
      url: `/v1/assignments/${assignmentId}/submissions`,
      params: { page, pageSize },
    }),

  review: (submissionId: string) =>
    apiClient.request<SubmissionReviewDto>({ url: `/v1/submissions/${submissionId}/review` }),

  edit: (submissionId: string, request: SubmissionRequest) =>
    apiClient.request<SubmissionDto>({ method: 'PATCH', url: `/v1/submissions/${submissionId}`, data: request }),

  withdraw: (submissionId: string) =>
    apiClient.request<void>({ method: 'DELETE', url: `/v1/submissions/${submissionId}` }),

  saveDraftGrade: (submissionId: string, request: GradeDraftRequest) =>
    apiClient.request<SubmissionReviewDto>({
      method: 'PATCH',
      url: `/v1/submissions/${submissionId}/grade-draft`,
      data: request,
    }),

  publishGrade: (submissionId: string) =>
    apiClient.request<void>({ method: 'POST', url: `/v1/submissions/${submissionId}/publish-grade` }),
};

export type SubmissionList = ListResponse<SubmissionDto>;

export const seminarAttendanceApi = {
  createSession: (assignmentId: string) =>
    apiClient.request<SeminarAttendanceSessionDto>({
      method: 'POST',
      url: `/v1/assignments/${assignmentId}/seminar-attendance/sessions`,
    }),

  getOverview: (assignmentId: string) =>
    apiClient.request<SeminarAttendanceOverviewDto>({
      url: `/v1/assignments/${assignmentId}/seminar-attendance`,
    }),

  checkIn: (token: string) =>
    apiClient.request<SeminarAttendanceRecordDto>({
      method: 'POST',
      url: `/v1/seminar-attendance/check-in`,
      data: { token },
    }),

  closeSession: (sessionId: string) =>
    apiClient.request<void>({
      method: 'POST',
      url: `/v1/seminar-attendance/sessions/${sessionId}/close`,
    }),
};

