import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/api/queryClient';
import { canonicalAssignmentsApi, canonicalSubmissionsApi } from '../api/assignments.api';
import type { AssignmentRequest, GradeDraftRequest, SubmissionRequest } from '../api/canonical.types';

export const useCanonicalAssignment = (assignmentId: string | undefined) =>
  useQuery({
    queryKey: queryKeys.assessments.assignmentDetail(assignmentId || ''),
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
      void queryClient.invalidateQueries({ queryKey: queryKeys.assessments.assignments(variables.courseId) });
    },
  });
};

export const useUpdateCanonicalAssignment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { assignmentId: string; request: AssignmentRequest }) =>
      canonicalAssignmentsApi.update(params.assignmentId, params.request),
    onSuccess: (assignment, variables) => {
      queryClient.setQueryData(queryKeys.assessments.assignmentDetail(variables.assignmentId), assignment);
      void queryClient.invalidateQueries({ queryKey: queryKeys.courses.modules(assignment.courseId) });
    },
  });
};

export const useAssignmentSubmissions = (assignmentId: string | undefined, page = 1, pageSize = 20) =>
  useQuery({
    queryKey: [...queryKeys.assessments.submissions(assignmentId || ''), page, pageSize],
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
        case 'file_submission':
          return canonicalSubmissionsApi.submitFile(params.assignmentId, params.request);
        case 'form':
          return canonicalSubmissionsApi.submitForm(params.assignmentId, params.request);
        case 'vpl':
          return canonicalSubmissionsApi.submitVpl(params.assignmentId, params.request);
        case 'rte_submission':
        default:
          return canonicalSubmissionsApi.submitRte(params.assignmentId, params.request);
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
