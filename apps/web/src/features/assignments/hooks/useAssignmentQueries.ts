import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/api/queryClient';
import { canonicalAssignmentsApi, canonicalSubmissionsApi } from '../api/assignments.api';
import type { AssignmentRequest, GradeDraftRequest, SubmissionRequest } from '../api/canonical.types';

export const useCanonicalAssignment = (assignmentId: string | undefined) =>
  useQuery({
    queryKey: queryKeys.assignments.detail(assignmentId || ''),
    queryFn: () => canonicalAssignmentsApi.get(assignmentId!),
    enabled: Boolean(assignmentId),
    staleTime: 60 * 1000,
  });

export const useCreateCanonicalAssignment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { courseId: string; moduleId: string; request: AssignmentRequest }) =>
      canonicalAssignmentsApi.create(params.courseId, params.moduleId, params.request),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.courses.modules(variables.courseId) });
    },
  });
};

export const useUpdateCanonicalAssignment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { assignmentId: string; request: AssignmentRequest }) =>
      canonicalAssignmentsApi.update(params.assignmentId, params.request),
    onSuccess: (assignment, variables) => {
      queryClient.setQueryData(queryKeys.assignments.detail(variables.assignmentId), assignment);
      void queryClient.invalidateQueries({ queryKey: queryKeys.courses.modules(assignment.courseId) });
    },
  });
};

export const useAssignmentSubmissions = (assignmentId: string | undefined, page = 1, pageSize = 20) =>
  useQuery({
    queryKey: [...queryKeys.assignments.submissions(assignmentId || ''), page, pageSize],
    queryFn: () => canonicalSubmissionsApi.listForAssignment(assignmentId!, page, pageSize),
    enabled: Boolean(assignmentId),
  });

export const useSubmissionReview = (submissionId: string | undefined) =>
  useQuery({
    queryKey: ['submission-review', submissionId],
    queryFn: () => canonicalSubmissionsApi.review(submissionId!),
    enabled: Boolean(submissionId),
  });

export const useSubmitAssignment = () =>
  useMutation({
    mutationFn: (params: { assignmentId: string; type: string; request: SubmissionRequest }) => {
      switch (params.type) {
        case 'FILE_SUBMISSION':
          return canonicalSubmissionsApi.submitFile(params.assignmentId, params.request);
        case 'FORM':
          return canonicalSubmissionsApi.submitForm(params.assignmentId, params.request);
        case 'VPL':
          return canonicalSubmissionsApi.submitVpl(params.assignmentId, params.request);
        case 'TEXT_SUBMISSION':
        default:
          return canonicalSubmissionsApi.submitText(params.assignmentId, params.request);
      }
    },
  });

export const useEditSubmission = () =>
  useMutation({
    mutationFn: (params: { submissionId: string; request: SubmissionRequest }) =>
      canonicalSubmissionsApi.edit(params.submissionId, params.request),
  });

export const useWithdrawSubmission = () =>
  useMutation({
    mutationFn: (submissionId: string) => canonicalSubmissionsApi.withdraw(submissionId),
  });

export const useSaveGradeDraft = () =>
  useMutation({
    mutationFn: (params: { submissionId: string; request: GradeDraftRequest }) =>
      canonicalSubmissionsApi.saveDraftGrade(params.submissionId, params.request),
  });

export const usePublishGrade = () =>
  useMutation({
    mutationFn: (submissionId: string) => canonicalSubmissionsApi.publishGrade(submissionId),
  });

export const useDeleteCanonicalAssignment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { assignmentId: string; courseId?: string }) =>
      canonicalAssignmentsApi.archive(params.assignmentId),
    onSuccess: (_data, variables) => {
      if (variables.courseId) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.courses.modules(variables.courseId) });
      }
    },
  });
};
