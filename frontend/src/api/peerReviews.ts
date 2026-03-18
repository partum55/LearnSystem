import apiClient from './client';

export interface PeerReview {
  id: number;
  assignmentId: number;
  reviewerUserId: number;
  reviewerName?: string;
  revieweeUserId: number;
  revieweeName?: string;
  submissionId: number;
  isAnonymous?: boolean;
  status: string;
  overallScore?: number;
  overallFeedback?: string;
  submittedAt?: string;
  createdAt?: string;
}

export const peerReviewsApi = {
  getAssignmentReviews: async (assignmentId: string | number) => {
    const response = await apiClient.get<PeerReview[]>(`/assessments/peer-reviews/assignments/${assignmentId}`);
    return response.data || [];
  },

  getReviewerReviews: async (reviewerUserId: string | number) => {
    const response = await apiClient.get<PeerReview[]>(`/assessments/peer-reviews/reviewer/${reviewerUserId}`);
    return response.data || [];
  },

  assignReviewers: async (params: {
    assignmentId: string | number;
    submitterUserIds: Array<string | number>;
    reviewsPerSubmission?: number;
  }) => {
    const search = new URLSearchParams();
    params.submitterUserIds.forEach((id) => search.append('submitterUserIds', String(id)));
    search.set('reviewsPerSubmission', String(params.reviewsPerSubmission ?? 2));
    const response = await apiClient.post<PeerReview[]>(
      `/assessments/peer-reviews/assignments/${params.assignmentId}/assign?${search.toString()}`
    );
    return response.data || [];
  },

  submitReview: async (payload: {
    peerReviewId: number;
    overallScore?: number;
    overallFeedback?: string;
  }) => {
    const response = await apiClient.post<PeerReview>('/assessments/peer-reviews/submit', payload);
    return response.data;
  },

  getAggregateScore: async (submissionId: string | number) => {
    const response = await apiClient.get<number>(`/assessments/peer-reviews/submissions/${submissionId}/aggregate-score`);
    return Number(response.data || 0);
  },
};

export default peerReviewsApi;
